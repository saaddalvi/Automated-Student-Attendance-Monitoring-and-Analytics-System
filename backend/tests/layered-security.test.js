/**
 * Integration & Unit Test Suite for Multi-Layer Security:
 * - Layer 1: Persistent UUID
 * - Layer 2: Browser Fingerprint (Canvas/WebGL/Hardware signals hash)
 * - Layer 3: WebAuthn Challenge & Registration Options
 * - Layer 4: Classroom Network / IP Subnet Verification
 */

const {
  hashDeviceId,
  verifyDeviceHash,
  normalizeIp,
  isSameSubnetOrNetwork,
} = require('../src/utils/deviceSecurity');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function runTests() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('       TESTING 4-LAYER ANTI-PROXY DEFENSE SYSTEM        ');
  console.log('════════════════════════════════════════════════════════\n');

  // ─── Layer 2: Fingerprint Hashing & Verification Tests ───────
  console.log('--- Layer 2: Browser Fingerprinting Tests ---');
  const uuid = 'c28fd8e2-8956-4c22-b5e1-0c46b53cb123';
  const phoneFingerprint = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const friendFingerprint = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  const storedHash = hashDeviceId(uuid, phoneFingerprint);
  assert(typeof storedHash === 'string' && storedHash.length === 64, 'Generated 64-char SHA-256 composite hash');

  // Legitimate student device match
  const isMatch = verifyDeviceHash(uuid, storedHash, phoneFingerprint);
  assert(isMatch === true, 'Legitimate device with correct UUID + Fingerprint matches');

  // Copy-paste attack: friend copied UUID to another browser with different fingerprint
  const isAttackMatch = verifyDeviceHash(uuid, storedHash, friendFingerprint);
  assert(isAttackMatch === false, 'Blocked UUID copy-paste: different browser fingerprint rejected!');

  // Missing or corrupted fingerprint
  const isMissingMatch = verifyDeviceHash(uuid, storedHash, null);
  assert(isMissingMatch === false, 'Blocked request when browser fingerprint is missing or altered');

  // Backward compatibility with legacy devices (bound without fingerprint)
  const legacyStoredHash = hashDeviceId(uuid, null);
  const isLegacyMatch = verifyDeviceHash(uuid, legacyStoredHash, phoneFingerprint);
  assert(isLegacyMatch === true, 'Backward compatible: legacy registered device still verifies cleanly');

  // ─── Layer 4: Classroom Network / IP Subnet Tests ────────────
  console.log('\n--- Layer 4: Classroom Network (IP / Subnet) Tests ---');
  assert(normalizeIp('::ffff:192.168.1.50') === '192.168.1.50', 'IPv4-mapped IPv6 normalized correctly');
  assert(normalizeIp('::1') === '127.0.0.1', 'IPv6 loopback normalized to 127.0.0.1');

  // Campus NAT: Teacher and student share same public IP
  const campusPublicIp = '203.0.113.195';
  assert(
    isSameSubnetOrNetwork(campusPublicIp, campusPublicIp) === true,
    'Campus NAT Gateway: Teacher and Student sharing same public IP match'
  );

  // Classroom LAN: Teacher on 192.168.1.10 and Student on 192.168.1.45 (same /24)
  assert(
    isSameSubnetOrNetwork('192.168.1.45', '192.168.1.10') === true,
    'Classroom LAN: Same /24 subnet (192.168.1.x) matches'
  );

  // Remote Proxy: Friend at home on mobile network (157.34.12.5) while Teacher is on classroom network (203.0.113.195)
  assert(
    isSameSubnetOrNetwork('157.34.12.5', '203.0.113.195') === false,
    'Remote Proxy Blocked: Student on home broadband / mobile network rejected when teacher is in classroom'
  );

  // ─── Layer 3: WebAuthn Functions ──────────────────────────────
  console.log('\n--- Layer 3: WebAuthn Module Tests ---');
  const {
    generateRegistrationOptions,
    generateAuthenticationOptions,
  } = require('@simplewebauthn/server');

  const regOptions = await generateRegistrationOptions({
    rpName: 'AttendEase',
    rpID: 'localhost',
    userID: Buffer.from('test-user-id'),
    userName: 'student@test.com',
    attestationType: 'none',
  });
  assert(typeof regOptions.challenge === 'string' && regOptions.challenge.length > 20, 'WebAuthn registration challenge generated successfully');

  const authOptions = await generateAuthenticationOptions({
    rpID: 'localhost',
  });
  assert(typeof authOptions.challenge === 'string' && authOptions.challenge.length > 20, 'WebAuthn authentication challenge generated successfully');

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`Tests finished: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
