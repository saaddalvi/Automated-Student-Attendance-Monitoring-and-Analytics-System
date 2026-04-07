const { UniqueConstraintError, ValidationError, Op } = require('sequelize');
const db = require('../models');

const { Attendance, User, Session, SessionToken, Class, StudentClass } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

/** Returns today in YYYY-MM-DD format */
const today = () => new Date().toISOString().split('T')[0];

// ─── POST /api/attendance ─────────────────────────────────────────────────────

const markAttendance = async (req, res) => {
  try {
    const { userId, date, status, sessionId, token } = req.body;

    if (!userId || !status) {
      fail(res, 'Fields userId and status are required.');
      return;
    }

    let classId = null;
    let lecture = null;

    // ─── Token validation (if sessionId is provided) ──────────────────────
    if (sessionId) {
      const session = await Session.findByPk(sessionId);
      if (!session) {
        fail(res, 'Invalid or expired QR.');
        return;
      }

      if (!session.isActive) {
        fail(res, 'Invalid or expired QR.');
        return;
      }

      if (new Date() > new Date(session.expiresAt)) {
        await session.update({ isActive: false });
        fail(res, 'Invalid or expired QR.');
        return;
      }

      if (!token) {
        fail(res, 'Token is required for QR-based attendance.');
        return;
      }

      const sessionToken = await SessionToken.findOne({
        where: {
          sessionId,
          token,
          isValid: true,
        },
      });

      if (!sessionToken) {
        fail(res, 'Invalid or expired QR.');
        return;
      }

      if (new Date() > new Date(sessionToken.expiresAt)) {
        fail(res, 'Invalid or expired QR.');
        return;
      }

      // Extract classId and lecture from the session
      classId = session.classId;
      lecture = session.lecture;

      // Check duplicate per session (not per date)
      const existingBySession = await Attendance.findOne({
        where: { userId, sessionId },
      });
      if (existingBySession) {
        fail(res, 'Attendance already marked for this session.', 409);
        return;
      }
    } else {
      // Non-QR marking: check duplicate by date
      const attendanceDate = date || today();
      const existingByDate = await Attendance.findOne({
        where: { userId, date: attendanceDate },
      });
      if (existingByDate) {
        fail(res, `Attendance already marked for this user on ${attendanceDate}.`, 409);
        return;
      }
    }
    // ─── End token validation ─────────────────────────────────────────────

    const user = await User.findByPk(userId);
    if (!user) {
      fail(res, 'User not found.', 404);
      return;
    }

    const attendanceDate = date || today();

    const record = await Attendance.create({
      userId,
      sessionId: sessionId || null,
      classId,
      lecture,
      date: attendanceDate,
      status,
    });

    ok(res, record, 'Attendance marked successfully.', 201);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 'Duplicate attendance record.', 409);
      return;
    }
    if (error instanceof ValidationError) {
      fail(res, error.errors.map((e) => e.message).join('; '));
      return;
    }
    console.error('markAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/attendance ──────────────────────────────────────────────────────

const getAllAttendance = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.date) where.date = req.query.date;
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      limit,
      offset,
    });

    ok(res, { records: rows, total: count, page, limit }, 'Attendance records fetched successfully.');
  } catch (error) {
    console.error('getAllAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/attendance/user/:userId ─────────────────────────────────────────

const getAttendanceByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      fail(res, 'User not found.', 404);
      return;
    }

    const where = { userId };
    if (req.query.from && req.query.to) {
      where.date = { [Op.between]: [req.query.from, req.query.to] };
    } else if (req.query.from) {
      where.date = { [Op.gte]: req.query.from };
    } else if (req.query.to) {
      where.date = { [Op.lte]: req.query.to };
    }

    const records = await Attendance.findAll({ where });

    ok(res, records, `Attendance records for user ${user.name}.`);
  } catch (error) {
    console.error('getAttendanceByUser error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/attendance/session/:sessionId ───────────────────────────────────
// Returns all attendance records for a specific session (teacher view after QR expires)

const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId);
    if (!session) {
      fail(res, 'Session not found.', 404);
      return;
    }

    // Fetch all attendance records for this session
    const records = await Attendance.findAll({
      where: { sessionId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'ASC']],
    });

    // Fetch all students enrolled in this class
    const enrolledStudents = await User.findAll({
      include: [{
        model: StudentClass,
        as: 'enrollments',
        where: { classId: session.classId },
        attributes: [],
      }],
      attributes: ['id', 'name', 'email'],
    });

    // Build present/absent lists
    const presentIds = new Set(records.map((r) => r.userId));
    const present = enrolledStudents
      .filter((s) => presentIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, email: s.email, status: 'present' }));
    const absent = enrolledStudents
      .filter((s) => !presentIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, email: s.email, status: 'absent' }));

    ok(res, {
      sessionId,
      classId: session.classId,
      lecture: session.lecture,
      totalEnrolled: enrolledStudents.length,
      presentCount: present.length,
      absentCount: absent.length,
      present,
      absent,
    }, 'Session attendance fetched successfully.');
  } catch (error) {
    console.error('getSessionAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/attendance/class/:classId/me ────────────────────────────────────
// Returns the logged-in student's attendance history for a specific class

const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    // Verify class exists
    const cls = await Class.findByPk(classId);
    if (!cls) {
      fail(res, 'Class not found.', 404);
      return;
    }

    // Fetch all sessions for this class (to know total lectures)
    const sessions = await Session.findAll({
      where: { classId },
      attributes: ['id', 'lecture', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Fetch student's attendance records for this class
    const records = await Attendance.findAll({
      where: { classId, userId },
      order: [['date', 'DESC']],
    });

    // Build history: for each session, check if student attended
    const attendedSessionIds = new Set(records.map((r) => r.sessionId));
    const history = sessions.map((s) => ({
      sessionId: s.id,
      lecture: s.lecture,
      date: s.createdAt.toISOString().split('T')[0],
      status: attendedSessionIds.has(s.id) ? 'present' : 'absent',
    }));

    const totalLectures = sessions.length;
    const presentCount = history.filter((h) => h.status === 'present').length;
    const absentCount = totalLectures - presentCount;
    const percentage = totalLectures > 0 ? Math.round((presentCount / totalLectures) * 100) : 0;

    ok(res, {
      classId,
      className: cls.className,
      totalLectures,
      presentCount,
      absentCount,
      percentage,
      history,
    }, 'Class attendance fetched successfully.');
  } catch (error) {
    console.error('getClassAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/attendance/summary/me ───────────────────────────────────────────
// Returns per-class attendance summary for the logged-in student

const getStudentSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all classes the student is enrolled in
    const enrolledClasses = await Class.findAll({
      include: [{
        model: StudentClass,
        as: 'enrollments',
        where: { studentId: userId },
        attributes: [],
      }],
    });

    const summary = [];

    for (const cls of enrolledClasses) {
      // Count total sessions (lectures) for this class
      const totalSessions = await Session.count({ where: { classId: cls.id } });

      // Count how many the student attended
      const attendedCount = await Attendance.count({
        where: { classId: cls.id, userId },
      });

      const percentage = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;

      summary.push({
        classId: cls.id,
        className: cls.className,
        department: cls.department,
        year: cls.year,
        division: cls.division,
        classCode: cls.classCode,
        totalLectures: totalSessions,
        attended: attendedCount,
        percentage,
      });
    }

    // Overall stats
    const totalLectures = summary.reduce((s, c) => s + c.totalLectures, 0);
    const totalAttended = summary.reduce((s, c) => s + c.attended, 0);
    const overallPercentage = totalLectures > 0 ? Math.round((totalAttended / totalLectures) * 100) : 0;

    ok(res, {
      overall: {
        totalClasses: summary.length,
        totalLectures,
        totalAttended,
        percentage: overallPercentage,
      },
      classes: summary,
    }, 'Student attendance summary fetched successfully.');
  } catch (error) {
    console.error('getStudentSummary error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── PUT /api/attendance/:id ──────────────────────────────────────────────────

const updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      fail(res, 'Attendance record not found.', 404);
      return;
    }

    const { status, date } = req.body;
    await record.update({ status, date });

    ok(res, record, 'Attendance record updated successfully.');
  } catch (error) {
    if (error instanceof ValidationError) {
      fail(res, error.errors.map((e) => e.message).join('; '));
      return;
    }
    console.error('updateAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── DELETE /api/attendance/:id ───────────────────────────────────────────────

const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      fail(res, 'Attendance record not found.', 404);
      return;
    }

    await record.destroy();
    ok(res, null, 'Attendance record deleted successfully.');
  } catch (error) {
    console.error('deleteAttendance error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByUser,
  getSessionAttendance,
  getClassAttendance,
  getStudentSummary,
  updateAttendance,
  deleteAttendance,
};
