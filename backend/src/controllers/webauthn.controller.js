const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const db = require('../models');
const { logAuditEvent, getClientIp } = require('../utils/deviceSecurity');

const { User, Device } = db;

// In-memory challenge store with TTL (5 minutes)
const challenges = new Map();

const cleanExpiredChallenges = () => {
  const now = Date.now();
  for (const [key, val] of challenges.entries()) {
    if (val.expiresAt < now) challenges.delete(key);
  }
};
setInterval(cleanExpiredChallenges, 60_000);

const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

const getRpConfig = (req) => {
  const host = req.hostname || 'localhost';
  const rpID = process.env.RP_ID || (host === 'localhost' ? 'localhost' : host);
  const origin =
    process.env.APP_ORIGIN ||
    req.headers.origin ||
    `http://${host}:${process.env.FRONTEND_PORT || 3000}`;
  return { rpName: 'AttendEase Attendance', rpID, origin };
};

// ─── POST /api/webauthn/register/options ─────────────────────────────────────────

const getRegistrationOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return fail(res, 'User not found.', 404);

    const activeDevice = await Device.findOne({
      where: { userId, status: 'active' },
    });
    if (!activeDevice) {
      return fail(res, 'No active device bound. Please log in from your primary device first.', 400);
    }

    const { rpName, rpID } = getRpConfig(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    challenges.set(`reg_${userId}`, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    ok(res, options, 'Registration options generated.');
  } catch (error) {
    console.error('getRegistrationOptions error:', error);
    fail(res, error.message || 'Failed to generate registration options.', 500);
  }
};

// ─── POST /api/webauthn/register/verify ──────────────────────────────────────────

const verifyRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return fail(res, 'User not found.', 404);

    const activeDevice = await Device.findOne({
      where: { userId, status: 'active' },
    });
    if (!activeDevice) return fail(res, 'No active device found.', 400);

    const challengeEntry = challenges.get(`reg_${userId}`);
    if (!challengeEntry || challengeEntry.expiresAt < Date.now()) {
      challenges.delete(`reg_${userId}`);
      return fail(res, 'Registration session expired. Please try again.', 400);
    }

    const { rpID, origin } = getRpConfig(req);
    const { response } = req.body;

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    challenges.delete(`reg_${userId}`);

    if (!verification.verified || !verification.registrationInfo) {
      return fail(res, 'Passkey verification failed.', 400);
    }

    const { credential } = verification.registrationInfo;

    // Update active device with WebAuthn credentials
    await activeDevice.update({
      hasWebAuthn: true,
      webauthnCredentialId: credential.id,
      webauthnPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      webauthnCounter: credential.counter,
      webauthnTransports: credential.transports || [],
    });

    await logAuditEvent({
      actorId: userId,
      targetUserId: userId,
      action: 'WEBAUTHN_REGISTERED',
      metadata: {
        credentialId: credential.id,
        deviceId: activeDevice.id,
      },
      ip: getClientIp(req),
    });

    ok(res, { verified: true }, 'Biometric passkey registered successfully!');
  } catch (error) {
    console.error('verifyRegistration error:', error);
    fail(res, error.message || 'Failed to verify registration.', 500);
  }
};

// ─── POST /api/webauthn/auth/options ─────────────────────────────────────────────

const getAuthenticationOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeDevice = await Device.findOne({
      where: { userId, status: 'active' },
    });

    if (!activeDevice || !activeDevice.hasWebAuthn) {
      return fail(res, 'Biometric passkey not registered on this device.', 400);
    }

    const { rpID } = getRpConfig(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: activeDevice.webauthnCredentialId,
          transports: activeDevice.webauthnTransports || undefined,
        },
      ],
      userVerification: 'preferred',
    });

    challenges.set(`auth_${userId}`, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    ok(res, options, 'Authentication options generated.');
  } catch (error) {
    console.error('getAuthenticationOptions error:', error);
    fail(res, error.message || 'Failed to generate authentication options.', 500);
  }
};

// ─── POST /api/webauthn/auth/verify ─────────────────────────────────────────────

const verifyAuthentication = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeDevice = await Device.findOne({
      where: { userId, status: 'active' },
    });

    if (!activeDevice || !activeDevice.hasWebAuthn) {
      return fail(res, 'Biometric passkey not registered on this device.', 400);
    }

    const challengeEntry = challenges.get(`auth_${userId}`);
    if (!challengeEntry || challengeEntry.expiresAt < Date.now()) {
      challenges.delete(`auth_${userId}`);
      return fail(res, 'Authentication challenge expired. Please retry.', 400);
    }

    const { rpID, origin } = getRpConfig(req);
    const { response } = req.body;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: activeDevice.webauthnCredentialId,
        publicKey: Buffer.from(activeDevice.webauthnPublicKey, 'base64url'),
        counter: Number(activeDevice.webauthnCounter || 0),
        transports: activeDevice.webauthnTransports || undefined,
      },
      requireUserVerification: false,
    });

    challenges.delete(`auth_${userId}`);

    if (!verification.verified || !verification.authenticationInfo) {
      return fail(res, 'Biometric verification failed.', 400);
    }

    // Update counter
    await activeDevice.update({
      webauthnCounter: verification.authenticationInfo.newCounter,
      lastSeenAt: new Date(),
    });

    await logAuditEvent({
      actorId: userId,
      targetUserId: userId,
      action: 'WEBAUTHN_VERIFIED',
      metadata: { deviceId: activeDevice.id },
      ip: getClientIp(req),
    });

    ok(res, { verified: true }, 'Biometric verification successful.');
  } catch (error) {
    console.error('verifyAuthentication error:', error);
    fail(res, error.message || 'Failed to verify biometric signature.', 500);
  }
};

/**
 * Direct verification helper used by markAttendance
 */
async function verifyWebAuthnAssertionDirect({ userId, req, assertionResponse }) {
  const activeDevice = await Device.findOne({
    where: { userId, status: 'active' },
  });

  if (!activeDevice || !activeDevice.hasWebAuthn) {
    return { verified: false, reason: 'Device does not have WebAuthn enabled' };
  }

  const challengeEntry = challenges.get(`auth_${userId}`);
  if (!challengeEntry || challengeEntry.expiresAt < Date.now()) {
    challenges.delete(`auth_${userId}`);
    return { verified: false, reason: 'Challenge expired or missing' };
  }

  const { rpID, origin } = getRpConfig(req);

  try {
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: challengeEntry.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: activeDevice.webauthnCredentialId,
        publicKey: Buffer.from(activeDevice.webauthnPublicKey, 'base64url'),
        counter: Number(activeDevice.webauthnCounter || 0),
        transports: activeDevice.webauthnTransports || undefined,
      },
      requireUserVerification: false,
    });

    challenges.delete(`auth_${userId}`);

    if (verification.verified && verification.authenticationInfo) {
      await activeDevice.update({
        webauthnCounter: verification.authenticationInfo.newCounter,
        lastSeenAt: new Date(),
      });
      return { verified: true };
    }
  } catch (err) {
    console.error('verifyWebAuthnAssertionDirect error:', err.message);
    return { verified: false, reason: err.message };
  }

  return { verified: false, reason: 'Signature invalid' };
}

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  verifyWebAuthnAssertionDirect,
};
