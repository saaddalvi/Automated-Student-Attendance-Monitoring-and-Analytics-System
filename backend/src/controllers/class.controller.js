const db = require('../models');

const { Class, StudentClass } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

/** Generate a random 6-character uppercase alphanumeric class code */
const generateClassCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * Generate a unique class code by checking the DB for collisions.
 * Retries up to `maxAttempts` times before giving up.
 */
const generateUniqueClassCode = async (maxAttempts = 5) => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateClassCode();
    const existing = await Class.findOne({ where: { classCode: code } });
    if (!existing) return code;
  }
  throw new Error('Unable to generate a unique class code. Please try again.');
};

// ─── POST /api/classes — Create a new class ───────────────────────────────────

const createClass = async (req, res) => {
  try {
    const { className, department, year, division } = req.body;

    // Validate required fields
    if (!className || !department || !year || !division) {
      return fail(res, 'Fields className, department, year, and division are required.');
    }

    // Generate a unique class code
    const classCode = await generateUniqueClassCode();

    // Create the class record
    const newClass = await Class.create({
      className,
      department,
      year,
      division,
      classCode,
      teacherId: req.user.id,
    });

    ok(
      res,
      { class: newClass },
      'Class created successfully.',
      201
    );
  } catch (error) {
    console.error('createClass error:', error);

    // Handle Sequelize unique-constraint violation (race condition fallback)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return fail(res, 'Duplicate class code generated. Please try again.', 409);
    }

    fail(res, error.message || 'Internal server error.', 500);
  }
};

// ─── GET /api/classes — Fetch all classes for the logged-in teacher ──────────

const getClasses = async (req, res) => {
  try {
    const classes = await Class.findAll({
      where: { teacherId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    ok(res, { classes }, 'Classes fetched successfully.');
  } catch (error) {
    console.error('getClasses error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/classes/:id — Fetch a single class by ID ──────────────────────

const getClassById = async (req, res) => {
  try {
    const cls = await Class.findOne({
      where: { id: req.params.id, teacherId: req.user.id },
      include: [{
        model: db.User,
        as: 'students',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] }, // hide join table fields
      }],
    });

    if (!cls) {
      return fail(res, 'Class not found.', 404);
    }

    ok(res, { class: cls }, 'Class fetched successfully.');
  } catch (error) {
    console.error('getClassById error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── POST /api/classes/join — Student joins a class via class code ───────────

const joinClass = async (req, res) => {
  try {
    const { classCode } = req.body;
    const studentId = req.user.id;

    if (!classCode) {
      return fail(res, 'Class code is required.');
    }

    // Find the class by code
    const classData = await Class.findOne({ where: { classCode } });
    if (!classData) {
      return fail(res, 'Invalid class code.', 404);
    }

    // Check if already joined
    const existing = await StudentClass.findOne({
      where: { studentId, classId: classData.id },
    });
    if (existing) {
      return fail(res, 'Already joined this class.', 409);
    }

    // Create enrollment
    await StudentClass.create({
      studentId,
      classId: classData.id,
    });

    ok(res, { class: classData }, 'Joined class successfully.', 201);
  } catch (error) {
    console.error('joinClass error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return fail(res, 'Already joined this class.', 409);
    }

    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/student/classes — Fetch all classes a student has joined ───────

const getStudentClasses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const classes = await Class.findAll({
      include: [
        {
          model: StudentClass,
          as: 'enrollments',
          where: { studentId },
          attributes: [],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    ok(res, { classes }, 'Student classes fetched successfully.');
  } catch (error) {
    console.error('getStudentClasses error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/classes/:classId/at-risk — Students with <75% attendance ───────
// Efficient: uses grouped count query to avoid N+1

const getAtRiskStudents = async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify class exists
    const cls = await Class.findByPk(classId);
    if (!cls) {
      return fail(res, 'Class not found.', 404);
    }

    // Total sessions (lectures) for this class
    const totalSessions = await db.Session.count({ where: { classId } });

    if (totalSessions === 0) {
      return ok(res, [], 'No sessions found for this class.');
    }

    // Get all enrolled students
    const enrolledStudents = await db.User.findAll({
      include: [{
        model: StudentClass,
        as: 'enrollments',
        where: { classId },
        attributes: [],
      }],
      attributes: ['id', 'name'],
    });

    if (enrolledStudents.length === 0) {
      return ok(res, [], 'No students enrolled in this class.');
    }

    // Batch query: count PRESENT attendance records per student for this class
    // Only count status='present' — absent records should not inflate the percentage
    const attendanceCounts = await db.Attendance.findAll({
      where: { classId, status: 'present' },
      attributes: [
        'userId',
        [db.sequelize.fn('COUNT', db.sequelize.col('Attendance.id')), 'count'],
      ],
      group: ['Attendance.user_id'],
      raw: true,
    });

    // Build a lookup: userId -> present count
    // raw:true + underscored:true means keys come back as snake_case
    const countMap = {};
    for (const row of attendanceCounts) {
      const uid = row.userId || row.user_id;
      countMap[uid] = parseInt(row.count, 10);
    }

    // Filter students with < 75% attendance
    const atRisk = enrolledStudents
      .map((student) => {
        const attended = countMap[student.id] || 0;

        const percentage =
          totalSessions > 0
            ? Math.floor((attended / totalSessions) * 100)
            : 0;

        return {
          id: student.id,
          name: student.name,
          percentage
        };
      })
      .filter((s) => s.percentage < 75)
      .sort((a, b) => a.percentage - b.percentage);

    ok(res, atRisk, 'At-risk students fetched successfully.');
  } catch (error) {
    console.error('getAtRiskStudents error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = { createClass, getClasses, getClassById, joinClass, getStudentClasses, getAtRiskStudents };
