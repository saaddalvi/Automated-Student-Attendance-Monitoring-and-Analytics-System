/**
 * E2E Integration Test — Full Attendance Flow with Real Data
 *
 * Tests:
 *  1. Register teacher + student
 *  2. Teacher creates a class
 *  3. Student joins the class
 *  4. Teacher creates a session (QR)
 *  5. Student marks attendance via QR
 *  6. GET /api/attendance/session/:sessionId — teacher results
 *  7. GET /api/attendance/class/:classId/me — student class history
 *  8. GET /api/attendance/summary/me — student dashboard summary
 *  9. Token rotation still invalidates old tokens
 * 10. Duplicate attendance per session is blocked
 * 11. Student can attend multiple sessions on same day
 */

const http = require('http');

const BASE = 'http://localhost:5000';

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (!condition) { failed++; console.error(`   ✗ ${msg}`); }
  else { passed++; console.log(`   ✓ ${msg}`); }
}

async function run() {
  console.log('\n═══ FULL ATTENDANCE INTEGRATION TEST ═══\n');

  const ts = Date.now();
  const teacherEmail = `teacher_int_${ts}@test.com`;
  const studentEmail = `student_int_${ts}@test.com`;
  const student2Email = `student2_int_${ts}@test.com`;

  let teacherToken, studentToken, student2Token;
  let teacherId, studentId, student2Id;
  let classId, classCode;
  let sessionId, qrToken;

  // ─── 0. Health ──────────────────────────────────────────────────────
  console.log('0. Health check');
  const h = await req('GET', '/api/health');
  assert(h.status === 200, `Server healthy (${h.status})`);

  // ─── 1. Register users ──────────────────────────────────────────────
  console.log('\n1. Register teacher + 2 students');
  
  let r = await req('POST', '/api/auth/register', { name: 'Test Teacher', email: teacherEmail, password: 'pass123', role: 'teacher' });
  assert(r.status === 201, `Teacher registered (${r.status})`);
  teacherToken = r.body.data.token;
  teacherId = r.body.data.user.id;

  r = await req('POST', '/api/auth/register', { name: 'Test Student', email: studentEmail, password: 'pass123', role: 'student' });
  assert(r.status === 201, `Student registered (${r.status})`);
  studentToken = r.body.data.token;
  studentId = r.body.data.user.id;

  r = await req('POST', '/api/auth/register', { name: 'Student Two', email: student2Email, password: 'pass123', role: 'student' });
  assert(r.status === 201, `Student 2 registered (${r.status})`);
  student2Token = r.body.data.token;
  student2Id = r.body.data.user.id;

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
  assert(!!sessionId, `Got sessionId: ${sessionId.slice(0,8)}`);
  assert(!!qrToken, `Got token: ${qrToken.slice(0,8)}`);
  assert(r.body.data.session.classId === classId, `Session has correct classId`);

  // ─── 5. Student 1 marks attendance via QR ───────────────────────────
  console.log('\n5. Student 1 scans QR → marks attendance');
  r = await req('POST', '/api/attendance', { userId: studentId, status: 'present', sessionId, token: qrToken }, studentToken);
  assert(r.status === 201, `Attendance marked (${r.status})`);
  assert(r.body.data.sessionId === sessionId, 'Record has sessionId');
  assert(r.body.data.classId === classId, 'Record has classId');
  assert(r.body.data.lecture === 'Lecture 1', 'Record has lecture');

  // ─── 6. Duplicate attendance per session blocked ────────────────────
  console.log('\n6. Duplicate attendance for same session → blocked');
  r = await req('POST', '/api/attendance', { userId: studentId, status: 'present', sessionId, token: qrToken }, studentToken);
  assert(r.status === 409, `Duplicate blocked (${r.status})`);

  // ─── 7. GET session attendance (teacher results) ────────────────────
  console.log('\n7. Teacher fetches session results');
  r = await req('GET', `/api/attendance/session/${sessionId}`, null, teacherToken);
  assert(r.status === 200, `Session results fetched (${r.status})`);
  assert(r.body.data.totalEnrolled === 2, `2 enrolled students`);
  assert(r.body.data.presentCount === 1, `1 present (student 1)`);
  assert(r.body.data.absentCount === 1, `1 absent (student 2)`);
  assert(r.body.data.present.length === 1, `Present list has 1 entry`);
  assert(r.body.data.present[0].name === 'Test Student', `Present student is correct`);
  assert(r.body.data.absent[0].name === 'Student Two', `Absent student is correct`);

  // ─── 8. Student 2 also marks attendance ─────────────────────────────
  console.log('\n8. Student 2 also scans QR');
  r = await req('POST', '/api/attendance', { userId: student2Id, status: 'present', sessionId, token: qrToken }, student2Token);
  assert(r.status === 201, `Student 2 attendance marked (${r.status})`);

  // Re-check session results — both present now
  r = await req('GET', `/api/attendance/session/${sessionId}`, null, teacherToken);
  assert(r.body.data.presentCount === 2, `Now 2 present`);
  assert(r.body.data.absentCount === 0, `0 absent`);

  // ─── 9. GET class attendance for student (history) ──────────────────
  console.log('\n9. Student 1 fetches class attendance history');
  r = await req('GET', `/api/attendance/class/${classId}/me`, null, studentToken);
  assert(r.status === 200, `Class attendance fetched (${r.status})`);
  assert(r.body.data.totalLectures === 1, `1 lecture`);
  assert(r.body.data.presentCount === 1, `1 present`);
  assert(r.body.data.percentage === 100, `100% attendance`);
  assert(r.body.data.history.length === 1, `1 history record`);
  assert(r.body.data.history[0].lecture === 'Lecture 1', `History has correct lecture`);
  assert(r.body.data.history[0].status === 'present', `History status is present`);

  // ─── 10. GET student summary (dashboard) ────────────────────────────
  console.log('\n10. Student 1 fetches dashboard summary');
  r = await req('GET', '/api/attendance/summary/me', null, studentToken);
  assert(r.status === 200, `Summary fetched (${r.status})`);
  assert(r.body.data.overall.totalClasses === 1, `1 class in summary`);
  assert(r.body.data.overall.totalLectures === 1, `1 total lecture`);
  assert(r.body.data.overall.percentage === 100, `100% overall`);
  assert(r.body.data.classes[0].classId === classId, `Correct classId in summary`);
  assert(r.body.data.classes[0].percentage === 100, `100% for this class`);

  // ─── 11. Multiple sessions same day (Lecture 2) ─────────────────────
  console.log('\n11. Teacher creates 2nd session (Lecture 2) — same day');
  r = await req('POST', '/api/session', { classId, lecture: 'Lecture 2', duration: 60 }, teacherToken);
  assert(r.status === 201, `Session 2 created (${r.status})`);
  const session2Id = r.body.data.session.id;
  const qrToken2 = r.body.data.token;

  // Student 1 attends Lecture 2 — should work (different session, same day)
  r = await req('POST', '/api/attendance', { userId: studentId, status: 'present', sessionId: session2Id, token: qrToken2 }, studentToken);
  assert(r.status === 201, `Student attends Lecture 2 same day (${r.status})`);

  // Check updated summary — should show 2 lectures, both attended
  r = await req('GET', '/api/attendance/summary/me', null, studentToken);
  assert(r.body.data.overall.totalLectures === 2, `2 total lectures now`);
  assert(r.body.data.overall.percentage === 100, `Still 100%`);

  // Student 2 skips Lecture 2 — check their summary
  r = await req('GET', '/api/attendance/summary/me', null, student2Token);
  assert(r.body.data.overall.totalLectures === 2, `Student 2 sees 2 lectures`);
  assert(r.body.data.overall.totalAttended === 1, `Student 2 attended 1`);
  assert(r.body.data.overall.percentage === 50, `Student 2 at 50%`);

  // ─── 12. Token rotation still works ─────────────────────────────────
  console.log('\n12. Token rotation invalidates old token');
  r = await req('POST', `/api/session/${session2Id}/token`, null, teacherToken);
  assert(r.status === 200, `Token rotated (${r.status})`);
  const newToken = r.body.data.token;

  // Old token should fail for student 2
  r = await req('POST', '/api/attendance', { userId: student2Id, status: 'present', sessionId: session2Id, token: qrToken2 }, student2Token);
  assert(r.status === 400, `Old token rejected (${r.status})`);

  // New token works
  r = await req('POST', '/api/attendance', { userId: student2Id, status: 'present', sessionId: session2Id, token: newToken }, student2Token);
  assert(r.status === 201, `New token works (${r.status})`);

  // Final summary — all 100% now
  r = await req('GET', '/api/attendance/summary/me', null, student2Token);
  assert(r.body.data.overall.percentage === 100, `Student 2 now at 100%`);

  // ─── Done ───────────────────────────────────────────────────────────
  console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
