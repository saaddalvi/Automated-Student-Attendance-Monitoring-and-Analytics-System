/**
 * Factory that returns middleware ensuring req.user has one of the allowed roles.
 *
 * Usage:
 *   router.post('/users', requireAuth, requireRole('admin'), createUser);
 *   router.post('/attendance', requireAuth, requireRole('teacher', 'admin'), markAttendance);
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, data: null, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        data: null,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
      });
      return;
    }

    next();
  };
};

module.exports = { requireRole };
