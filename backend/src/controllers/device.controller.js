const { Op } = require('sequelize');
const db = require('../models');
const { logAuditEvent, getClientIp } = require('../utils/deviceSecurity');

const { User, Class, StudentClass, Device, DeviceResetRequest, AuditLog } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

/**
 * Lazily expires requests:
 * - Pending requests older than 7 days -> expired
 * - Approved requests older than 24h -> expired
 */
async function lazilyExpireRequests(whereClause = {}) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Pending requests older than 7 days
    const expiredPending = await DeviceResetRequest.findAll({
      where: {
        ...whereClause,
        status: 'pending',
        createdAt: { [Op.lt]: sevenDaysAgo },
      },
    });

    for (const req of expiredPending) {
      await req.update({ status: 'expired' });
      await logAuditEvent({
        actorId: null,
        targetUserId: req.studentId,
        action: 'RESET_EXPIRED',
        metadata: { requestId: req.id, reason: 'Pending request exceeded 7 days' },
      });
    }

    // 2. Approved requests where binding window (24h) has expired
    const expiredApproved = await DeviceResetRequest.findAll({
      where: {
        ...whereClause,
        status: 'approved',
        bindingExpiresAt: { [Op.lt]: now },
      },
    });

    for (const req of expiredApproved) {
      await req.update({ status: 'expired' });
      await logAuditEvent({
        actorId: null,
        targetUserId: req.studentId,
        action: 'RESET_EXPIRED',
        metadata: { requestId: req.id, reason: 'Binding window exceeded 24 hours' },
      });
    }
  } catch (err) {
    console.error('lazilyExpireRequests error:', err.message);
  }
}

// ─── GET /api/devices/me (Student) ────────────────────────────────────────────

const getStudentDevice = async (req, res) => {
  try {
    const studentId = req.user.id;
    await lazilyExpireRequests({ studentId });

    // Active device
    const activeDevice = await Device.findOne({
      where: { userId: studentId, status: 'active' },
      attributes: ['id', 'label', 'status', 'boundAt', 'lastSeenAt', 'hasWebAuthn'],
    });

    // Latest active reset request (pending or approved)
    const activeReset = await DeviceResetRequest.findOne({
      where: {
        studentId,
        status: { [Op.in]: ['pending', 'approved'] },
      },
      order: [['createdAt', 'DESC']],
    });

    ok(res, {
      device: activeDevice || null,
      activeReset: activeReset || null,
    });
  } catch (error) {
    console.error('getStudentDevice error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── POST /api/device-resets (Student) ─────────────────────────────────────────

const requestDeviceReset = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { reasonCode, note } = req.body;

    const validReasons = ['lost', 'replaced', 'factory_reset', 'other'];
    if (!reasonCode || !validReasons.includes(reasonCode)) {
      fail(res, `reasonCode must be one of: ${validReasons.join(', ')}.`);
      return;
    }

    await lazilyExpireRequests({ studentId });

    // FR-12: Only one pending request per student may exist
    const existingPending = await DeviceResetRequest.findOne({
      where: { studentId, status: 'pending' },
    });
    if (existingPending) {
      fail(res, 'You already have a pending device reset request.', 409);
      return;
    }

    // Rate limiting: Max 3 reset requests per hour per student
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequestsCount = await DeviceResetRequest.count({
      where: {
        studentId,
        createdAt: { [Op.gte]: oneHourAgo },
      },
    });
    if (recentRequestsCount >= 3) {
      fail(res, 'Rate limit exceeded: maximum 3 reset requests per hour.', 429);
      return;
    }

    const resetRequest = await DeviceResetRequest.create({
      studentId,
      reasonCode,
      note: note || null,
      status: 'pending',
    });

    await logAuditEvent({
      actorId: studentId,
      targetUserId: studentId,
      action: 'RESET_REQUESTED',
      metadata: { requestId: resetRequest.id, reasonCode, note: note || '' },
      ip: getClientIp(req),
    });

    ok(res, resetRequest, 'Device reset request submitted successfully.', 201);
  } catch (error) {
    console.error('requestDeviceReset error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/device-resets (Teacher) ─────────────────────────────────────────

const getTeacherResetRequests = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { status } = req.query;

    await lazilyExpireRequests();

    // 1. Get classes taught by this teacher
    const teacherClasses = await Class.findAll({
      where: { teacherId },
      attributes: ['id', 'className', 'department', 'year', 'division'],
    });
    const classIds = teacherClasses.map((c) => c.id);

    if (classIds.length === 0) {
      ok(res, { requests: [] });
      return;
    }

    // 2. Get all students enrolled in these classes
    const enrollments = await StudentClass.findAll({
      where: { classId: { [Op.in]: classIds } },
      attributes: ['studentId', 'classId'],
    });

    const enrolledStudentIds = [...new Set(enrollments.map((e) => e.studentId))];
    if (enrolledStudentIds.length === 0) {
      ok(res, { requests: [] });
      return;
    }

    // Map studentId to class names
    const classMap = {};
    teacherClasses.forEach((c) => {
      classMap[c.id] = c.className;
    });

    const studentClassesMap = {};
    enrollments.forEach((e) => {
      if (!studentClassesMap[e.studentId]) studentClassesMap[e.studentId] = [];
      studentClassesMap[e.studentId].push(classMap[e.classId]);
    });

    // 3. Query reset requests
    const where = {
      studentId: { [Op.in]: enrolledStudentIds },
    };
    if (status) {
      where.status = status;
    }

    const requests = await DeviceResetRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Add prior resets count and enrolled class names
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const priorCount = await DeviceResetRequest.count({
          where: {
            studentId: r.studentId,
            status: { [Op.in]: ['completed', 'approved'] },
            id: { [Op.ne]: r.id },
          },
        });

        return {
          id: r.id,
          studentId: r.studentId,
          studentName: r.student?.name || 'Unknown',
          studentEmail: r.student?.email || '',
          classNames: studentClassesMap[r.studentId] || [],
          reasonCode: r.reasonCode,
          note: r.note,
          status: r.status,
          reviewedBy: r.reviewer?.name || null,
          reviewNote: r.reviewNote,
          reviewedAt: r.reviewedAt,
          bindingExpiresAt: r.bindingExpiresAt,
          createdAt: r.createdAt,
          priorResetsCount: priorCount,
        };
      })
    );

    ok(res, { requests: enriched });
  } catch (error) {
    console.error('getTeacherResetRequests error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── Helper: Check Teacher Teaches Student ────────────────────────────────────

async function teacherTeachesStudent(teacherId, studentId) {
  const teacherClasses = await Class.findAll({
    where: { teacherId },
    attributes: ['id'],
  });
  const classIds = teacherClasses.map((c) => c.id);
  if (classIds.length === 0) return false;

  const enrollment = await StudentClass.findOne({
    where: {
      studentId,
      classId: { [Op.in]: classIds },
    },
  });
  return !!enrollment;
}

// ─── PATCH /api/device-resets/:id/approve (Teacher) ───────────────────────────

const approveResetRequest = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { note } = req.body;

    await lazilyExpireRequests();

    const request = await DeviceResetRequest.findByPk(id);
    if (!request) {
      fail(res, 'Reset request not found.', 404);
      return;
    }

    // Teacher authorization: Must teach the student
    const isAuthorized = await teacherTeachesStudent(teacherId, request.studentId);
    if (!isAuthorized) {
      fail(res, 'You are not authorized to review requests for this student.', 403);
      return;
    }

    if (request.status !== 'pending') {
      fail(res, `Request cannot be approved because it is already ${request.status}.`, 409);
      return;
    }

    // FR-14 / FR-15: Student has 24 hours to bind a new device by logging in from it.
    const bindingExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await request.update({
      status: 'approved',
      reviewedBy: teacherId,
      reviewNote: note || null,
      reviewedAt: new Date(),
      bindingExpiresAt,
    });

    await logAuditEvent({
      actorId: teacherId,
      targetUserId: request.studentId,
      action: 'RESET_APPROVED',
      metadata: { requestId: request.id, note: note || '', bindingExpiresAt },
      ip: getClientIp(req),
    });

    ok(res, request, 'Device reset request approved. Student has 24 hours to bind their new device.');
  } catch (error) {
    console.error('approveResetRequest error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── PATCH /api/device-resets/:id/reject (Teacher) ────────────────────────────

const rejectResetRequest = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { note } = req.body;

    await lazilyExpireRequests();

    const request = await DeviceResetRequest.findByPk(id);
    if (!request) {
      fail(res, 'Reset request not found.', 404);
      return;
    }

    const isAuthorized = await teacherTeachesStudent(teacherId, request.studentId);
    if (!isAuthorized) {
      fail(res, 'You are not authorized to review requests for this student.', 403);
      return;
    }

    if (request.status !== 'pending') {
      fail(res, `Request cannot be rejected because it is already ${request.status}.`, 409);
      return;
    }

    await request.update({
      status: 'rejected',
      reviewedBy: teacherId,
      reviewNote: note || null,
      reviewedAt: new Date(),
    });

    await logAuditEvent({
      actorId: teacherId,
      targetUserId: request.studentId,
      action: 'RESET_REJECTED',
      metadata: { requestId: request.id, note: note || '' },
      ip: getClientIp(req),
    });

    ok(res, request, 'Device reset request rejected.');
  } catch (error) {
    console.error('rejectResetRequest error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/integrity-alerts (Teacher) ──────────────────────────────────────

const getTeacherIntegrityAlerts = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Get classes taught by teacher
    const teacherClasses = await Class.findAll({
      where: { teacherId },
      attributes: ['id', 'className'],
    });
    const classIds = teacherClasses.map((c) => c.id);

    if (classIds.length === 0) {
      ok(res, { alerts: [] });
      return;
    }

    // 2. Get enrolled student IDs
    const enrollments = await StudentClass.findAll({
      where: { classId: { [Op.in]: classIds } },
      attributes: ['studentId', 'classId'],
    });
    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];

    if (studentIds.length === 0) {
      ok(res, { alerts: [] });
      return;
    }

    const classMap = {};
    teacherClasses.forEach((c) => (classMap[c.id] = c.className));
    const studentClassesMap = {};
    enrollments.forEach((e) => {
      if (!studentClassesMap[e.studentId]) studentClassesMap[e.studentId] = [];
      studentClassesMap[e.studentId].push(classMap[e.classId]);
    });

    // 3. Fetch DUPLICATE_DEVICE and DEVICE_MISMATCH events for these students
    const logs = await AuditLog.findAll({
      where: {
        targetUserId: { [Op.in]: studentIds },
        action: { [Op.in]: ['DUPLICATE_DEVICE', 'DEVICE_MISMATCH'] },
      },
      include: [
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const alerts = logs.map((log) => ({
      id: log.id,
      action: log.action,
      studentId: log.targetUserId,
      studentName: log.targetUser?.name || 'Unknown',
      studentEmail: log.targetUser?.email || '',
      classNames: studentClassesMap[log.targetUserId] || [],
      metadata: log.metadata,
      ip: log.ip,
      createdAt: log.createdAt,
    }));

    ok(res, { alerts });
  } catch (error) {
    console.error('getTeacherIntegrityAlerts error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = {
  getStudentDevice,
  requestDeviceReset,
  getTeacherResetRequests,
  approveResetRequest,
  rejectResetRequest,
  getTeacherIntegrityAlerts,
};
