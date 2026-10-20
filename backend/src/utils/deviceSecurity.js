const crypto = require('crypto');
const db = require('../models');

const PEPPER = process.env.DEVICE_PEPPER || 'attendease_device_pepper_secret_2026';

/**
 * Generates a peppered SHA-256 hash of the device ID and browser fingerprint.
 * Binds the persistent random UUID with hardware/browser rendering signals.
 */
function hashDeviceId(deviceId, fingerprintHash = null) {
  if (!deviceId) return null;
  const input = fingerprintHash ? `${deviceId}:${fingerprintHash}${PEPPER}` : `${deviceId}${PEPPER}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Constant-time comparison of two hashes to prevent timing attacks.
 * Verifies composite (UUID + Fingerprint), with legacy UUID-only fallback.
 */
function verifyDeviceHash(deviceId, storedHash, fingerprintHash = null) {
  if (!deviceId || !storedHash) return false;

  // Try composite match first if fingerprintHash provided
  if (fingerprintHash) {
    const computedHash = hashDeviceId(deviceId, fingerprintHash);
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  // Fallback to legacy UUID-only match
  const legacyHash = hashDeviceId(deviceId, null);
  const a = Buffer.from(legacyHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Normalizes IP address strings (stripping IPv6 prefix ::ffff:).
 */
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  if (cleaned === '::1' || cleaned === 'localhost') {
    return '127.0.0.1';
  }
  return cleaned;
}

/**
 * Compares student IP to teacher IP / classroom network.
 * Supports:
 * 1. NAT Public Gateway matching (common on campus Wi-Fi where all devices share same public IP)
 * 2. Local LAN /24 Subnet matching (e.g. 192.168.1.X or 10.0.0.X)
 * 3. Loopback / local development environment matching
 */
function isSameSubnetOrNetwork(studentIp, teacherIp) {
  const sIp = normalizeIp(studentIp);
  const tIp = normalizeIp(teacherIp);

  // Exact match (NAT public IP or identical LAN IP)
  if (sIp === tIp) return true;

  // Localhost development fallback
  const isLocal = (ip) => ip === '127.0.0.1' || ip === 'localhost' || ip === '::1';
  if (isLocal(sIp) && isLocal(tIp)) return true;

  // If running in development and either is localhost, permit
  if (process.env.NODE_ENV !== 'production' && (isLocal(sIp) || isLocal(tIp))) {
    return true;
  }

  // IPv4 /24 Subnet check for private networks (192.168.x.x, 10.x.x.x, 172.16.x.x)
  const isIPv4 = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  if (isIPv4(sIp) && isIPv4(tIp)) {
    const sSubnet = sIp.split('.').slice(0, 3).join('.');
    const tSubnet = tIp.split('.').slice(0, 3).join('.');
    if (sSubnet === tSubnet) return true;
  }

  return false;
}


/**
 * Parses user-agent and platform into a human-friendly label.
 * e.g., "Chrome on Android", "Safari on iOS", "Chrome on macOS"
 */
function parseDeviceLabel(userAgent = '', platform = '') {
  let browser = 'Browser';
  let os = platform || 'Device';

  const ua = (userAgent || '').toLowerCase();

  // OS detection
  if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('linux')) os = 'Linux';

  // Browser detection
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';

  return `${browser} on ${os}`;
}

/**
 * Appends an entry to the AuditLog.
 */
async function logAuditEvent({ actorId = null, targetUserId, action, metadata = {}, ip = '127.0.0.1' }) {
  try {
    const { AuditLog } = db;
    if (!AuditLog) return;
    await AuditLog.create({
      actorId: actorId || null,
      targetUserId,
      action,
      metadata: metadata || {},
      ip: ip || '127.0.0.1',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

/**
 * Helper to get client IP from request.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

module.exports = {
  hashDeviceId,
  verifyDeviceHash,
  parseDeviceLabel,
  logAuditEvent,
  getClientIp,
  normalizeIp,
  isSameSubnetOrNetwork,
};

