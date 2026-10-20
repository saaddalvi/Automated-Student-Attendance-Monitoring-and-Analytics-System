const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  getStudentDevice,
  requestDeviceReset,
  getTeacherResetRequests,
  approveResetRequest,
  rejectResetRequest,
  getTeacherIntegrityAlerts,
} = require('../controllers/device.controller');

// Student endpoints
router.get('/devices/me', requireAuth, requireRole('student'), getStudentDevice);
router.post('/device-resets', requireAuth, requireRole('student'), requestDeviceReset);

// Teacher endpoints
router.get('/device-resets', requireAuth, requireRole('teacher', 'admin'), getTeacherResetRequests);
router.patch('/device-resets/:id/approve', requireAuth, requireRole('teacher', 'admin'), approveResetRequest);
router.patch('/device-resets/:id/reject', requireAuth, requireRole('teacher', 'admin'), rejectResetRequest);
router.get('/integrity-alerts', requireAuth, requireRole('teacher', 'admin'), getTeacherIntegrityAlerts);

module.exports = router;
