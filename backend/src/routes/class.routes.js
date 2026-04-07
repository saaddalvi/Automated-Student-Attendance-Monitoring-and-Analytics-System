const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { createClass, getClasses, getClassById, joinClass } = require('../controllers/class.controller');

const router = Router();

// All class routes require authentication
router.use(requireAuth);

// ─── Student route ────────────────────────────────────────────────────────────
router.post('/join', requireRole('student'), joinClass);

// ─── Teacher/Admin routes ─────────────────────────────────────────────────────
router.get('/', requireRole('teacher', 'admin'), getClasses);
router.get('/:id', requireRole('teacher', 'admin'), getClassById);
router.post('/', requireRole('teacher', 'admin'), createClass);

module.exports = router;
