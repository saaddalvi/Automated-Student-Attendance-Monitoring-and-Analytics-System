const { UniqueConstraintError, ValidationError } = require('sequelize');
const { generateToken } = require('../utils/jwt');
const db = require('../models');

const { User } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

// ─── POST /api/auth/register ──────────────────────────────────────────────────

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      fail(res, 'Fields name, email and password are required.');
      return;
    }

    const user = await User.create({ name, email, password, role });

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    const token = generateToken({ id: user.id, role: user.role });

    ok(res, { user: userData, token }, 'User registered successfully.', 201);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 'A user with this email already exists.', 409);
      return;
    }
    if (error instanceof ValidationError) {
      fail(res, error.errors.map((e) => e.message).join('; '));
      return;
    }
    console.error('register error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      fail(res, 'Email and password are required.');
      return;
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user) {
      fail(res, 'Invalid email or password.', 401);
      return;
    }

    if (!user.isActive) {
      fail(res, 'Account is deactivated. Contact an administrator.', 403);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      fail(res, 'Invalid email or password.', 401);
      return;
    }

    const token = generateToken({ id: user.id, role: user.role });
    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };

    ok(res, { user: userData, token }, 'Login successful.');
  } catch (error) {
    console.error('login error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = { register, login };
