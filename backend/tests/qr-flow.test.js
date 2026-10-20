/**
 * E2E Integration Test — Device Binding, Verification & Attendance Suite
 *
 * Implements Acceptance Criteria from Device Binding & Verification Specification:
 *  1. Bind at login (FR-1, FR-2, FR-3, FR-4)
 *  2. Mismatch on scan returning 403 DEVICE_MISMATCH (FR-5)
 *  3. Duplicate device rejection & DUPLICATE_DEVICE audit logging (FR-8, FR-9)
 *  4. Device reset request submission & single-pending enforcement (FR-11, FR-12)
 *  5. Teacher authorization checks: unrelated teacher blocked (403), enrolled teacher approved (FR-13)
 *  6. Approved reset completion within 24h binding window (FR-14, FR-15)
 *  7. Full dynamic QR session attendance marking & token rotation
 *  8. Teacher integrity alerts & audit logging verification (FR-10, FR-18)
 */

const http = require('http');

const BASE = process.env.API_URL || 'http://localhost:5001';

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const r = http.request(url, { method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (!condition) { failed++; console.error(`   ✗ ${msg}`); }
  else { passed++; console.log(`   ✓ ${msg}`); }
}

async function run() {
  console.log('\n═══ FULL DEVICE BINDING & ATTENDANCE INTEGRATION TEST ═══\n');

  const ts = Date.now();
  const teacherEmail = `teacher_int_${ts}@test.com`;
  const unrelatedTeacherEmail = `unrelated_teacher_${ts}@test.com`;
  const studentEmail = `student_int_${ts}@test.com`;
  const student2Email = `student2_int_${ts}@test.com`;
  const student3Email = `student3_int_${ts}@test.com`;

  const device1 = `device_student1_${ts}`;
  const device2 = `device_student2_${ts}`;
  const device1_new = `device_student1_new_${ts}`;

  let teacherToken, unrelatedTeacherToken, studentToken, student2Token, student3Token;
  let teacherId, studentId, student2Id, student3Id;
  let classId, classCode;
  let sessionId, qrToken;

  // ─── 0. Health ──────────────────────────────────────────────────────
  console.log('0. Health check');
  const h = await req('GET', '/api/health');
  assert(h.status === 200, `Server healthy (${h.status})`);

  // ─── 1. Register users ──────────────────────────────────────────────
  console.log('\n1. Register teachers + students');

  let r = await req('POST', '/api/auth/register', { name: 'Enrolled Teacher', email: teacherEmail, password: 'pass123', role: 'teacher' });
  assert(r.status === 201, `Teacher registered (${r.status})`);
  teacherToken = r.body.data.token;
  teacherId = r.body.data.user.id;

  r = await req('POST', '/api/auth/register', { name: 'Unrelated Teacher', email: unrelatedTeacherEmail, password: 'pass123', role: 'teacher' });
  assert(r.status === 201, `Unrelated Teacher registered (${r.status})`);
  unrelatedTeacherToken = r.body.data.token;

  r = await req('POST', '/api/auth/register', { name: 'Test Student', email: studentEmail, password: 'pass123', role: 'student' });
  assert(r.status === 201, `Student 1 registered (${r.status})`);
  studentId = r.body.data.user.id;

  r = await req('POST', '/api/auth/register', { name: 'Student Two', email: student2Email, password: 'pass123', role: 'student' });
  assert(r.status === 201, `Student 2 registered (${r.status})`);
  student2Id = r.body.data.user.id;

  r = await req('POST', '/api/auth/register', { name: 'Student Three', email: student3Email, password: 'pass123', role: 'student' });
  assert(r.status === 201, `Student 3 registered (${r.status})`);
  student3Id = r.body.data.user.id;

  // ─── 1b. Device Binding at Login (FR-1, FR-2, FR-3, Acceptance Criteria 1) ──
  console.log('\n1b. Student 1 & 2 login and bind devices');
  r = await req('POST', '/api/auth/login', {
    email: studentEmail,
    password: 'pass123',
    deviceId: device1,
    signals: { userAgent: 'Mozilla/5.0 (Android; Mobile)', platform: 'Android' },
  });
  assert(r.status === 200, `Student 1 login successful (${r.status})`);
  assert(r.body.data.deviceStatus === 'bound', `Student 1 deviceStatus is bound`);
  studentToken = r.body.data.token;

  // Subsequent login from same device
  r = await req('POST', '/api/auth/login', {
    email: studentEmail,
    password: 'pass123',
    deviceId: device1,
    signals: { userAgent: 'Mozilla/5.0 (Android; Mobile)', platform: 'Android' },
  });
  assert(r.body.data.deviceStatus === 'bound', `Student 1 re-login matches bound device`);

  // Student 2 login and bind
  r = await req('POST', '/api/auth/login', {
    email: student2Email,
    password: 'pass123',
    deviceId: device2,
    signals: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS)', platform: 'iOS' },
  });
  assert(r.status === 200, `Student 2 login successful (${r.status})`);
  assert(r.body.data.deviceStatus === 'bound', `Student 2 deviceStatus is bound`);
  student2Token = r.body.data.token;

  // Check /api/devices/me
  r = await req('GET', '/api/devices/me', null, studentToken);
  assert(r.status === 200, `Student 1 fetches device record (${r.status})`);
  assert(r.body.data.device?.status === 'active', `Active device present in record`);
  assert(r.body.data.device?.label === 'Browser on Android', `Parsed device label matches`);

  // ─── 1c. Duplicate Device Detection (FR-8, FR-9, Acceptance Criteria 3) ────
  console.log('\n1c. Duplicate device detection: Student 3 tries to bind Student 1’s device');
  r = await req('POST', '/api/auth/login', {
    email: student3Email,
    password: 'pass123',
    deviceId: device1, // Already active on Student 1
    signals: { userAgent: 'Mozilla/5.0 (Android; Mobile)', platform: 'Android' },
  });
  assert(r.status === 200, `Student 3 login allowed (${r.status})`);
  assert(r.body.data.deviceStatus === 'duplicate', `Binding refused: deviceStatus is duplicate`);

  // ─── 2. Teacher creates a class ─────────────────────────────────────
  console.log('\n2. Teacher creates a class');
  r = await req('POST', '/api/classes', { className: 'Integration Test Class', department: 'CS', year: '3', division: 'A' }, teacherToken);
  assert(r.status === 201, `Class created (${r.status})`);
  classId = r.body.data.class.id;
  classCode = r.body.data.class.classCode;
  assert(!!classId, `Got classId: ${classId}`);
  assert(!!classCode, `Got classCode: ${classCode}`);

  // ─── 3. Students join the class ─────────────────────────────────────
  console.log('\n3. Students join the class');
  r = await req('POST', '/api/classes/join', { classCode }, studentToken);
  assert(r.status === 201, `Student 1 joined (${r.status})`);

  r = await req('POST', '/api/classes/join', { classCode }, student2Token);
  assert(r.status === 201, `Student 2 joined (${r.status})`);

  // ─── 4. Teacher creates session (QR) ────────────────────────────────
  console.log('\n4. Teacher creates session');
  r = await req('POST', '/api/session', { classId, lecture: 'Lecture 1', duration: 60 }, teacherToken);
  assert(r.status === 201, `Session created (${r.status})`);
  sessionId = r.body.data.session.id;
  qrToken = r.body.data.token;
  assert(!!sessionId, `Got sessionId: ${sessionId.slice(0, 8)}`);
  assert(!!qrToken, `Got token: ${qrToken.slice(0, 8)}`);
  assert(r.body.data.session.classId === classId, `Session has correct classId`);

  // ─── 5. Mismatch on Scan (FR-5, Acceptance Criteria 2) ──────────────
  console.log('\n5. Mismatch check on scan — unauthorized device blocked');
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: 'spoofed_device_xyz',
  }, studentToken);
  assert(r.status === 403, `Scan rejected with 403 (${r.status})`);
  assert(r.body.code === 'DEVICE_MISMATCH', `Error code is DEVICE_MISMATCH`);

  // ─── 5b. Valid Scan Marks Attendance (FR-3) ─────────────────────────
  console.log('\n5b. Student 1 scans with bound device');
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: device1,
  }, studentToken);
  assert(r.status === 201, `Attendance marked (${r.status})`);
  assert(r.body.data.sessionId === sessionId, 'Record has sessionId');
  assert(r.body.data.classId === classId, 'Record has classId');
  assert(r.body.data.lecture === 'Lecture 1', 'Record has lecture');

  // ─── 6. Duplicate attendance per session blocked ────────────────────
  console.log('\n6. Duplicate attendance for same session → blocked');
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: device1,
  }, studentToken);
  assert(r.status === 409, `Duplicate blocked (${r.status})`);

  // ─── 7. Teacher fetches session results ─────────────────────────────
  console.log('\n7. Teacher fetches session results');
  r = await req('GET', `/api/attendance/session/${sessionId}`, null, teacherToken);
  assert(r.status === 200, `Session results fetched (${r.status})`);
  assert(r.body.data.totalEnrolled === 2, `2 enrolled students`);
  assert(r.body.data.presentCount === 1, `1 present (student 1)`);
  assert(r.body.data.absentCount === 1, `1 absent (student 2)`);

  // ─── 8. Student 2 also scans QR ─────────────────────────────────────
  console.log('\n8. Student 2 also scans QR with their bound device');
  r = await req('POST', '/api/attendance', {
    userId: student2Id,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: device2,
  }, student2Token);
  assert(r.status === 201, `Student 2 attendance marked (${r.status})`);

  // Re-check session results — both present now
  r = await req('GET', `/api/attendance/session/${sessionId}`, null, teacherToken);
  assert(r.body.data.presentCount === 2, `Now 2 present`);
  assert(r.body.data.absentCount === 0, `0 absent`);

  // ─── 9. Device Reset Lifecycle (FR-11 to FR-16, Acceptance Criteria 4 & 6) ─
  console.log('\n9. Device Reset Lifecycle: Student 1 switches phones');

  // Student 1 logs in from new phone -> mismatch status
  r = await req('POST', '/api/auth/login', {
    email: studentEmail,
    password: 'pass123',
    deviceId: device1_new,
    signals: { userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iOS' },
  });
  assert(r.status === 200, `Login from new phone succeeds (${r.status})`);
  assert(r.body.data.deviceStatus === 'mismatch', `Device status is mismatch`);

  // Student 1 submits reset request
  r = await req('POST', '/api/device-resets', {
    reasonCode: 'replaced',
    note: 'Bought a new iPhone',
  }, studentToken);
  assert(r.status === 201, `Reset request submitted (${r.status})`);
  const resetRequestId = r.body.data.id;
  assert(!!resetRequestId, `Got resetRequestId`);

  // FR-12: Duplicate pending request blocked
  r = await req('POST', '/api/device-resets', {
    reasonCode: 'lost',
  }, studentToken);
  assert(r.status === 409, `2nd pending request blocked (${r.status})`);

  // FR-5: While reset is pending, scan returns RESET_PENDING
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: device1_new,
  }, studentToken);
  assert(r.status === 403, `Scan returns 403 during pending reset`);
  assert(r.body.code === 'RESET_PENDING', `Error code is RESET_PENDING`);

  // Acceptance Criteria 6: Unrelated teacher cannot approve
  r = await req('PATCH', `/api/device-resets/${resetRequestId}/approve`, {
    note: 'Malicious approval attempt',
  }, unrelatedTeacherToken);
  assert(r.status === 403, `Unrelated teacher blocked with 403 (${r.status})`);

  // Teacher fetches reset requests inbox
  r = await req('GET', '/api/device-resets', null, teacherToken);
  assert(r.status === 200, `Teacher fetches reset requests inbox (${r.status})`);
  assert(r.body.data.requests.length >= 1, `Requests list contains student request`);
  const foundReq = r.body.data.requests.find((x) => x.id === resetRequestId);
  assert(foundReq?.studentName === 'Test Student', `Correct student in reset inbox`);

  // Acceptance Criteria 4: Enrolled teacher approves request
  r = await req('PATCH', `/api/device-resets/${resetRequestId}/approve`, {
    note: 'Verified student identity in class',
  }, teacherToken);
  assert(r.status === 200, `Enrolled teacher approves request (${r.status})`);
  assert(r.body.data.status === 'approved', `Request status updated to approved`);

  // Acceptance Criteria 4: Student 1 logs in from new phone within 24h -> binds new device
  r = await req('POST', '/api/auth/login', {
    email: studentEmail,
    password: 'pass123',
    deviceId: device1_new,
    signals: { userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iOS' },
  });
  assert(r.status === 200, `Student 1 logs in from new phone`);
  assert(r.body.data.deviceStatus === 'bound', `New device bound successfully!`);

  // Verify student device record now shows new device and completed reset
  r = await req('GET', '/api/devices/me', null, studentToken);
  assert(r.status === 200, `Student fetches updated device status`);
  assert(r.body.data.activeReset === null, `Pending reset cleared`);

  // Old device (device1) is now revoked and rejected on scan
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId,
    token: qrToken,
    deviceId: device1,
  }, studentToken);
  assert(r.status === 403, `Old device is revoked and rejected on scan (${r.status})`);

  // ─── 10. Integrity Alerts & Audit Log (FR-10, FR-18, Acceptance Criteria 8) ─
  console.log('\n10. Teacher Integrity Alerts Panel');
  r = await req('GET', '/api/integrity-alerts', null, teacherToken);
  assert(r.status === 200, `Teacher fetches integrity alerts (${r.status})`);
  assert(r.body.data.alerts.length >= 1, `Alerts panel contains logged anomalies`);

  // ─── 11. Multiple sessions same day & Token rotation ────────────────
  console.log('\n11. Lecture 2 session & token rotation');
  r = await req('POST', '/api/session', { classId, lecture: 'Lecture 2', duration: 60 }, teacherToken);
  assert(r.status === 201, `Session 2 created (${r.status})`);
  const session2Id = r.body.data.session.id;
  const qrToken2 = r.body.data.token;

  // Student 1 attends Lecture 2 with newly bound device1_new
  r = await req('POST', '/api/attendance', {
    userId: studentId,
    status: 'present',
    sessionId: session2Id,
    token: qrToken2,
    deviceId: device1_new,
  }, studentToken);
  assert(r.status === 201, `Student 1 attends Lecture 2 with new phone (${r.status})`);

  // Token rotation
  r = await req('POST', `/api/session/${session2Id}/token`, null, teacherToken);
  assert(r.status === 200, `Token rotated (${r.status})`);
  const newToken = r.body.data.token;

  // Old token rejected
  r = await req('POST', '/api/attendance', {
    userId: student2Id,
    status: 'present',
    sessionId: session2Id,
    token: qrToken2,
    deviceId: device2,
  }, student2Token);
  assert(r.status === 400, `Old token rejected (${r.status})`);

  // New token accepted
  r = await req('POST', '/api/attendance', {
    userId: student2Id,
    status: 'present',
    sessionId: session2Id,
    token: newToken,
    deviceId: device2,
  }, student2Token);
  assert(r.status === 201, `New token accepted for student 2 (${r.status})`);

  // ─── Done ───────────────────────────────────────────────────────────
  console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
