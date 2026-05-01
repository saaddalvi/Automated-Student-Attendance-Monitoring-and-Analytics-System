const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createSession,
  rotateToken,
  endSession,
  getSessionsByClass,
} = require('../controllers/session.controller');

const router = Router();

// All session routes require authentication + teacher/admin role
router.use(requireAuth);
router.use(requireRole('teacher', 'admin'));

router.post('/', createSession);
router.post('/:id/token', rotateToken);
router.put('/:id/end', endSession);
router.get('/class/:classId', getSessionsByClass);

module.exports = router;
