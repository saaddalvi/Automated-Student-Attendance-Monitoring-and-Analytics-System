const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  markAttendance,
  getAllAttendance,
  getAttendanceByUser,
  getSessionAttendance,
  getClassAttendance,
  getStudentSummary,
  updateAttendance,
  deleteAttendance,
} = require('../controllers/attendance.controller');

const router = Router();

// All attendance routes require authentication
router.use(requireAuth);

// Any authenticated user can mark attendance (students via QR scan, teachers manually)
// Token validation in the controller ensures only valid QR scans succeed
router.post('/', markAttendance);
router.put('/:id', requireRole('teacher', 'admin'), updateAttendance);
router.delete('/:id', requireRole('admin'), deleteAttendance);

// Teacher/admin — view attendance for a specific session (after QR expires)
router.get('/session/:sessionId', requireRole('teacher', 'admin'), getSessionAttendance);

// Student — own attendance for a specific class
router.get('/class/:classId/me', getClassAttendance);

// Student — per-class attendance summary
router.get('/summary/me', getStudentSummary);

// All authenticated users can view attendance
router.get('/', getAllAttendance);
router.get('/user/:userId', getAttendanceByUser);

module.exports = router;
