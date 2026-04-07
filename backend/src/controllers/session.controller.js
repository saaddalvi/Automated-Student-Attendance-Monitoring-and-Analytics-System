const crypto = require('crypto');
const db = require('../models');

const { Session, SessionToken } = db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

/** Generate a cryptographically random 32-char hex token */
const generateRandomToken = () => crypto.randomBytes(16).toString('hex');

// ─── POST /api/session — Create a new attendance session ──────────────────────

const createSession = async (req, res) => {
  try {
    const { classId, courseId, lecture, duration } = req.body;
    const resolvedClassId = classId || courseId; // accept both names

    if (!resolvedClassId || !lecture || !duration) {
      return fail(res, 'Fields classId, lecture, and duration are required.');
    }

    const durationSec = parseInt(duration, 10);
    if (isNaN(durationSec) || durationSec < 10) {
      return fail(res, 'Duration must be at least 10 seconds.');
    }

    const expiresAt = new Date(Date.now() + durationSec * 1000);

    const session = await Session.create({
      classId: resolvedClassId,
      lecture,
      duration: durationSec,
      createdBy: req.user.id,
      expiresAt,
      isActive: true,
    });

    // Generate the first token
    const token = generateRandomToken();
    const tokenExpiresAt = new Date(Date.now() + 10 * 1000); // 10 seconds

    const sessionToken = await SessionToken.create({
      sessionId: session.id,
      token,
      expiresAt: tokenExpiresAt,
      isValid: true,
    });

    ok(
      res,
      {
        session: {
          id: session.id,
          classId: session.classId,
          lecture: session.lecture,
          duration: session.duration,
          expiresAt: session.expiresAt,
          isActive: session.isActive,
        },
        token: sessionToken.token,
        tokenExpiresAt: sessionToken.expiresAt,
      },
      'Session created successfully.',
      201
    );
  } catch (error) {
    console.error('createSession error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── POST /api/session/:id/token — Rotate token ──────────────────────────────

const rotateToken = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findByPk(id);
    if (!session) {
      return fail(res, 'Session not found.', 404);
    }

    if (!session.isActive) {
      return fail(res, 'Session is no longer active.');
    }

    if (new Date() > new Date(session.expiresAt)) {
      // Auto-deactivate expired session
      await session.update({ isActive: false });
      return fail(res, 'Session has expired.');
    }

    // Invalidate all existing tokens for this session
    await SessionToken.update(
      { isValid: false },
      { where: { sessionId: id, isValid: true } }
    );

    // Generate new token
    const token = generateRandomToken();
    const tokenExpiresAt = new Date(Date.now() + 10 * 1000);

    const sessionToken = await SessionToken.create({
      sessionId: id,
      token,
      expiresAt: tokenExpiresAt,
      isValid: true,
    });

    ok(res, {
      token: sessionToken.token,
      tokenExpiresAt: sessionToken.expiresAt,
    }, 'Token rotated successfully.');
  } catch (error) {
    console.error('rotateToken error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

// ─── PUT /api/session/:id/end — End a session ────────────────────────────────

const endSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findByPk(id);
    if (!session) {
      return fail(res, 'Session not found.', 404);
    }

    // Deactivate session
    await session.update({ isActive: false });

    // Invalidate all tokens
    await SessionToken.update(
      { isValid: false },
      { where: { sessionId: id, isValid: true } }
    );

    ok(res, null, 'Session ended successfully.');
  } catch (error) {
    console.error('endSession error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = { createSession, rotateToken, endSession };
