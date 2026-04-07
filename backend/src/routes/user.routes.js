const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

const router = Router();

// All user management routes require authentication
router.use(requireAuth);

// Admin only — create, update, delete users
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

// Admin and teacher can list / view users
router.get('/', requireRole('admin', 'teacher'), getAllUsers);
router.get('/:id', requireRole('admin', 'teacher'), getUserById);

module.exports = router;
