const { UniqueConstraintError, ValidationError } = require('sequelize');
const db = require('../models');

const { User } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

// ─── POST /api/users ──────────────────────────────────────────────────────────

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      fail(res, 'Fields name, email, password and role are required.');
      return;
    }

    const user = await User.create({ name, email, password, role });

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    ok(res, userData, 'User created successfully.', 201);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 'A user with this email already exists.', 409);
      return;
    }
    if (error instanceof ValidationError) {
      fail(res, error.errors.map((e) => e.message).join('; '));
      return;
    }
    console.error('createUser error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/users ───────────────────────────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({ limit, offset, order: [['createdAt', 'DESC']] });
    ok(res, { users: rows, total: count, page, limit }, 'Users fetched successfully.');
  } catch (error) {
    console.error('getAllUsers error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: db.Attendance, as: 'attendances' }],
    });

    if (!user) {
      fail(res, 'User not found.', 404);
      return;
    }

    ok(res, user, 'User fetched successfully.');
  } catch (error) {
    console.error('getUserById error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── PUT /api/users/:id ──────────────────────────────────────────────────────

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      fail(res, 'User not found.', 404);
      return;
    }

    const { name, email, role } = req.body;
    await user.update({ name, email, role });

    ok(res, user, 'User updated successfully.');
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 'A user with this email already exists.', 409);
      return;
    }
    if (error instanceof ValidationError) {
      fail(res, error.errors.map((e) => e.message).join('; '));
      return;
    }
    console.error('updateUser error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      fail(res, 'User not found.', 404);
      return;
    }

    await user.destroy();
    ok(res, null, 'User deleted successfully.');
  } catch (error) {
    console.error('deleteUser error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser };
