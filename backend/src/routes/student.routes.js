const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { getStudentClasses } = require('../controllers/class.controller');

const router = Router();

router.use(requireAuth);
router.use(requireRole('student'));

router.get('/classes', getStudentClasses);

module.exports = router;
