const { UniqueConstraintError, ValidationError, Op } = require('sequelize');
const { generateToken } = require('../utils/jwt');
const db = require('../models');
const {
  hashDeviceId,
  verifyDeviceHash,
  parseDeviceLabel,
  logAuditEvent,
  getClientIp,
} = require('../utils/deviceSecurity');

const { User, Device, DeviceResetRequest } = db;

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
    const { email, password, deviceId, signals, fingerprintHash } = req.body;

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
    const ip = getClientIp(req);

    // If user is a teacher or admin, device binding does not apply
    if (user.role !== 'student') {
      ok(res, { user: userData, token, deviceStatus: 'bound' }, 'Login successful.');
      return;
    }

    // ─── Student Device Binding Logic ─────────────────────────────────────────
    const userAgent = signals?.userAgent || req.headers['user-agent'] || '';
    const platform = signals?.platform || '';
    const label = parseDeviceLabel(userAgent, platform);
    const submittedFingerprint = fingerprintHash || signals?.fingerprintHash || null;
    const submittedHash = hashDeviceId(deviceId, submittedFingerprint);

    // 1. Lazy evaluation of reset requests
    const now = new Date();
    const approvedReset = await DeviceResetRequest.findOne({
      where: {
        studentId: user.id,
        status: 'approved',
        bindingExpiresAt: { [Op.gt]: now },
      },
      order: [['createdAt', 'DESC']],
    });

    // Check if there was an approved request that expired
    const expiredApproved = await DeviceResetRequest.findAll({
      where: {
        studentId: user.id,
        status: 'approved',
        bindingExpiresAt: { [Op.lte]: now },
      },
    });
    for (const exp of expiredApproved) {
      await exp.update({ status: 'expired' });
      await logAuditEvent({
        actorId: null,
        targetUserId: user.id,
        action: 'RESET_EXPIRED',
        metadata: { requestId: exp.id },
        ip,
      });
    }

    // 2. If student has an active approved reset request within 24h
    if (approvedReset && submittedHash) {
      // Check if device is active on another student's account
      const duplicateOnOther = await Device.findOne({
        where: {
          deviceHash: submittedHash,
          status: 'active',
          userId: { [Op.ne]: user.id },
        },
      });

      if (duplicateOnOther) {
        // Refuse bind and log DUPLICATE_DEVICE against both
        await logAuditEvent({
          actorId: user.id,
          targetUserId: user.id,
          action: 'DUPLICATE_DEVICE',
          metadata: { otherUserId: duplicateOnOther.userId, label, ip },
          ip,
        });
        await logAuditEvent({
          actorId: user.id,
          targetUserId: duplicateOnOther.userId,
          action: 'DUPLICATE_DEVICE',
          metadata: { attemptedByUserId: user.id, label, ip },
          ip,
        });

        ok(
          res,
          { user: userData, token, deviceStatus: 'duplicate' },
          'This device is already active on another account.',
          200
        );
        return;
      }

      // Clean bind: revoke old active device(s)
      const oldDevices = await Device.findAll({
        where: { userId: user.id, status: 'active' },
      });
      for (const oldDev of oldDevices) {
        await oldDev.update({ status: 'revoked', revokedAt: now });
        await logAuditEvent({
          actorId: user.id,
          targetUserId: user.id,
          action: 'DEVICE_REVOKED',
          metadata: { deviceId: oldDev.id, reason: 'Replaced via approved reset' },
          ip,
        });
      }

      // Create new active device
      const newDevice = await Device.create({
        userId: user.id,
        deviceHash: submittedHash,
        label,
        signalsJson: { ...(signals || {}), fingerprintHash: submittedFingerprint },
        status: 'active',
        boundAt: now,
        lastSeenAt: now,
      });

      // Complete reset request
      await approvedReset.update({ status: 'completed' });

      await logAuditEvent({
        actorId: user.id,
        targetUserId: user.id,
        action: 'DEVICE_BOUND',
        metadata: { deviceId: newDevice.id, label, source: 'approved_reset_completion' },
        ip,
      });

      ok(res, { user: userData, token, deviceStatus: 'bound' }, 'Login successful. New device bound.');
      return;
    }

    // 3. Normal binding check (no approved reset request)
    const activeDevice = await Device.findOne({
      where: { userId: user.id, status: 'active' },
    });

    if (!activeDevice) {
      // First-time login: bind device if deviceId provided
      if (!submittedHash) {
        ok(res, { user: userData, token, deviceStatus: 'mismatch' }, 'Device ID not provided.');
        return;
      }

      // Check if device is active on another student's account
      const duplicateOnOther = await Device.findOne({
        where: {
          deviceHash: submittedHash,
          status: 'active',
          userId: { [Op.ne]: user.id },
        },
      });

      if (duplicateOnOther) {
        // Refuse bind and log DUPLICATE_DEVICE against both accounts
        await logAuditEvent({
          actorId: user.id,
          targetUserId: user.id,
          action: 'DUPLICATE_DEVICE',
          metadata: { otherUserId: duplicateOnOther.userId, label },
          ip,
        });
        await logAuditEvent({
          actorId: user.id,
          targetUserId: duplicateOnOther.userId,
          action: 'DUPLICATE_DEVICE',
          metadata: { attemptedByUserId: user.id, label },
          ip,
        });

        ok(
          res,
          { user: userData, token, deviceStatus: 'duplicate' },
          'This device is already active on another account.',
          200
        );
        return;
      }

      // Bind this device to the student
      const newDev = await Device.create({
        userId: user.id,
        deviceHash: submittedHash,
        label,
        signalsJson: { ...(signals || {}), fingerprintHash: submittedFingerprint },
        status: 'active',
        boundAt: now,
        lastSeenAt: now,
      });

      await logAuditEvent({
        actorId: user.id,
        targetUserId: user.id,
        action: 'DEVICE_BOUND',
        metadata: { deviceId: newDev.id, label, source: 'initial_login_bind' },
        ip,
      });

      ok(res, { user: userData, token, deviceStatus: 'bound' }, 'Login successful. Device bound.');
      return;
    }

    // 4. Student has an active device: check match
    if (submittedHash && verifyDeviceHash(deviceId, activeDevice.deviceHash, submittedFingerprint)) {
      // Matched: update lastSeenAt
      await activeDevice.update({ lastSeenAt: now });
      ok(res, { user: userData, token, deviceStatus: 'bound' }, 'Login successful.');
      return;
    }

    // 5. Mismatch: login still succeeds, but return deviceStatus: "mismatch"
    await logAuditEvent({
      actorId: user.id,
      targetUserId: user.id,
      action: 'DEVICE_MISMATCH',
      metadata: {
        submittedLabel: label,
        activeDeviceLabel: activeDevice.label,
        signals: signals || {},
      },
      ip,
    });

    ok(
      res,
      { user: userData, token, deviceStatus: 'mismatch' },
      'Login successful, but this device is not bound to your account.'
    );
  } catch (error) {
    console.error('login error:', error);
    fail(res, 'Internal server error.', 500);
  }
};

module.exports = { register, login };
