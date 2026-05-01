from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

doc = Document()

# --- Styles ---
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)
style.paragraph_format.space_after = Pt(6)

for i in range(1, 4):
    h = doc.styles[f'Heading {i}']
    h.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    h.font.name = 'Calibri'

def add_table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Light Grid Accent 1'
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = h
        for p in c.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(9)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
            for p in cells[i].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

def p(text, bold=False, italic=False, size=11):
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    return para

# === TITLE PAGE ===
doc.add_paragraph()
doc.add_paragraph()
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t.add_run('AttendEase')
r.font.size = Pt(36)
r.bold = True
r.font.color.rgb = RGBColor(0x4F, 0x46, 0xE5)

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = sub.add_run('Automated Student Attendance Monitoring\nand Analytics System')
r2.font.size = Pt(16)
r2.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

doc.add_paragraph()
dt = doc.add_paragraph()
dt.alignment = WD_ALIGN_PARAGRAPH.CENTER
r3 = dt.add_run('Codebase Analysis Report\nGenerated: 2026-05-01')
r3.font.size = Pt(12)
r3.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

doc.add_page_break()

# === 1. EXECUTIVE SUMMARY ===
doc.add_heading('1. Executive Summary', level=1)
p('AttendEase is a full-stack web application for real-time student attendance tracking using rotating QR codes. Teachers create classes, start timed attendance sessions that display auto-refreshing QR codes, and students scan those codes on their phones to mark attendance. The system includes analytics features like session history, per-class attendance summaries, and at-risk student identification.')

add_table(['Metric', 'Value'], [
    ['Total source files (excl. deps)', '~72'],
    ['Lines of code (JS/TS/TSX/CSS)', '~6,883'],
    ['Backend framework', 'Express 5 + Sequelize 6'],
    ['Frontend framework', 'Next.js 16 (App Router) + React 19'],
    ['Database', 'PostgreSQL'],
    ['Styling', 'Tailwind CSS v4'],
])

# === 2. ARCHITECTURE ===
doc.add_heading('2. Architecture Overview', level=1)
p('The system follows a classic client-server architecture:')
p('• Frontend (port 3000): Next.js App Router with client-side rendering, Axios HTTP client with JWT interceptors, and TailwindCSS styling.')
p('• Backend (port 5000): Express.js REST API with Sequelize ORM, JWT authentication, role-based access control, and auto-schema sync.')
p('• Database: PostgreSQL (ams_db) with 6 tables and well-defined foreign key relationships.')

doc.add_heading('Communication Flow', level=2)
p('Frontend → (axios + JWT Bearer token) → Backend REST API → (Sequelize ORM) → PostgreSQL')

# === 3. DATABASE SCHEMA ===
doc.add_heading('3. Database Schema', level=1)

doc.add_heading('3.1 Users Table', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK, auto-generated (UUIDV4)'],
    ['name', 'STRING', 'NOT NULL, 2-100 chars'],
    ['email', 'STRING', 'NOT NULL, UNIQUE, valid email'],
    ['password', 'STRING', 'NOT NULL, min 6 chars, bcrypt hashed'],
    ['role', 'ENUM', 'student | teacher | admin (default: student)'],
    ['isActive', 'BOOLEAN', 'default: true'],
])

doc.add_heading('3.2 Classes Table', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK'],
    ['className', 'STRING', 'NOT NULL'],
    ['department', 'STRING', 'NOT NULL'],
    ['year', 'STRING', 'NOT NULL'],
    ['division', 'STRING', 'NOT NULL'],
    ['classCode', 'STRING', 'NOT NULL, UNIQUE (6-char auto-generated)'],
    ['teacherId', 'UUID', 'FK → users.id (CASCADE)'],
])

doc.add_heading('3.3 Sessions Table', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK'],
    ['classId', 'UUID', 'FK → classes.id (CASCADE)'],
    ['lecture', 'STRING', 'NOT NULL'],
    ['duration', 'INTEGER', 'NOT NULL, min 10 seconds'],
    ['createdBy', 'UUID', 'FK → users.id (CASCADE)'],
    ['expiresAt', 'DATE', 'NOT NULL'],
    ['isActive', 'BOOLEAN', 'default: true'],
])

doc.add_heading('3.4 Session Tokens Table', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK'],
    ['sessionId', 'UUID', 'FK → sessions.id (CASCADE)'],
    ['token', 'STRING(64)', 'NOT NULL, crypto random hex'],
    ['expiresAt', 'DATE', 'NOT NULL (10s TTL)'],
    ['isValid', 'BOOLEAN', 'default: true'],
])

doc.add_heading('3.5 Attendances Table', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK'],
    ['userId', 'UUID', 'FK → users.id (CASCADE)'],
    ['sessionId', 'UUID', 'FK → sessions.id (SET NULL), nullable'],
    ['classId', 'UUID', 'FK → classes.id (SET NULL), nullable'],
    ['lecture', 'STRING', 'nullable'],
    ['date', 'DATEONLY', 'NOT NULL, default NOW'],
    ['status', 'ENUM', 'present | absent | late (default: absent)'],
])
p('Indexes: user+date, user+session (unique), class+user, session')

doc.add_heading('3.6 Student Classes (Join Table)', level=2)
add_table(['Column', 'Type', 'Constraints'], [
    ['id', 'UUID', 'PK'],
    ['studentId', 'UUID', 'FK → users.id (CASCADE)'],
    ['classId', 'UUID', 'FK → classes.id (CASCADE)'],
])
p('Unique constraint on (studentId, classId)')

doc.add_heading('3.7 Relationships', level=2)
p('• User (teacher) → has many → Classes')
p('• User (student) ↔ many-to-many ↔ Classes (via StudentClasses)')
p('• User → has many → Attendances')
p('• Class → has many → Sessions → has many → SessionTokens')
p('• Class → has many → Attendances')
p('• Session → has many → Attendances')

# === 4. BACKEND API ===
doc.add_heading('4. Backend API Surface', level=1)

doc.add_heading('4.1 Authentication (/api/auth)', level=2)
add_table(['Method', 'Endpoint', 'Auth', 'Description'], [
    ['POST', '/register', 'Public', 'Create account, returns JWT + user'],
    ['POST', '/login', 'Public', 'Authenticate, returns JWT + user'],
])

doc.add_heading('4.2 Classes (/api/classes)', level=2)
add_table(['Method', 'Endpoint', 'Role', 'Description'], [
    ['GET', '/', 'teacher/admin', "List teacher's classes"],
    ['GET', '/:id', 'teacher/admin', 'Get class with enrolled students'],
    ['POST', '/', 'teacher/admin', 'Create class (auto-generates code)'],
    ['POST', '/join', 'student', 'Join class via code'],
    ['GET', '/:classId/at-risk', 'teacher/admin', 'Students with <75% attendance'],
])

doc.add_heading('4.3 Sessions (/api/session)', level=2)
add_table(['Method', 'Endpoint', 'Role', 'Description'], [
    ['POST', '/', 'teacher/admin', 'Create timed session + first token'],
    ['POST', '/:id/token', 'teacher/admin', 'Rotate QR token'],
    ['PUT', '/:id/end', 'teacher/admin', 'End session manually'],
    ['GET', '/class/:classId', 'teacher/admin', 'Session history with counts'],
])

doc.add_heading('4.4 Attendance (/api/attendance)', level=2)
add_table(['Method', 'Endpoint', 'Role', 'Description'], [
    ['POST', '/', 'any', 'Mark attendance (QR or manual)'],
    ['GET', '/', 'any', 'Paginated list with filters'],
    ['GET', '/user/:userId', 'any', "User's records with date range"],
    ['GET', '/session/:sessionId', 'teacher/admin', 'Full session results'],
    ['PUT', '/session/:sessionId', 'teacher/admin', 'Bulk update attendance'],
    ['GET', '/class/:classId/me', 'any', "Student's own class attendance"],
    ['GET', '/summary/me', 'any', 'Per-class summary for student'],
    ['PUT', '/:id', 'teacher/admin', 'Update single record'],
    ['DELETE', '/:id', 'admin', 'Delete single record'],
])

doc.add_heading('4.5 Users (/api/users)', level=2)
add_table(['Method', 'Endpoint', 'Role', 'Description'], [
    ['GET', '/', 'admin/teacher', 'Paginated user list'],
    ['GET', '/:id', 'admin/teacher', 'User with attendances'],
    ['POST', '/', 'admin', 'Create user'],
    ['PUT', '/:id', 'admin', 'Update user'],
    ['DELETE', '/:id', 'admin', 'Delete user'],
])

doc.add_heading('4.6 Student (/api/student)', level=2)
add_table(['Method', 'Endpoint', 'Role', 'Description'], [
    ['GET', '/classes', 'student', 'List enrolled classes'],
])

# === 5. SECURITY ===
doc.add_heading('5. Security Model', level=1)
add_table(['Layer', 'Implementation'], [
    ['Authentication', 'JWT (jsonwebtoken) with configurable expiry (default 1 day)'],
    ['Authorization', 'requireRole() middleware factory — accepts variadic allowed roles'],
    ['Password Security', 'bcrypt with 10 salt rounds, excluded from default query scope'],
    ['Token Rotation', 'QR tokens rotate every 10s; old tokens invalidated before new ones'],
    ['Input Validation', 'Sequelize model validators + manual checks in controllers'],
    ['CORS', 'Wide-open cors() — needs tightening for production'],
])

doc.add_heading('5.1 QR Anti-Spoofing Flow', level=2)
p('1. Teacher creates session → backend generates sessionId + first cryptographic token (32-char hex)')
p('2. QR code encodes URL: /mark-attendance?session={id}&token={token}')
p('3. Every 10 seconds, frontend calls POST /session/:id/token → old tokens invalidated, new token issued')
p('4. QR code updates on screen with new token')
p('5. Student scans QR → POST /attendance with sessionId + token')
p('6. Backend validates: session active? token valid & not expired? user not already marked?')
p('7. Old QR screenshots become invalid after 10 seconds — prevents cheating', italic=True)

# === 6. FRONTEND ===
doc.add_heading('6. Frontend Pages', level=1)
add_table(['Route', 'Role', 'Description'], [
    ['/', 'Public', 'Landing page (Navbar, Hero, Features, HowItWorks, Preview, CTA, Footer)'],
    ['/login', 'Public', 'Email/password form with role-based redirect'],
    ['/register', 'Public', 'Registration with role selector (student/teacher)'],
    ['/teacher/dashboard', 'teacher/admin', 'Class grid with codes, copy button, create CTA'],
    ['/teacher/create-class', 'teacher/admin', 'Form: className, department, year, division'],
    ['/teacher/class/[classId]', 'teacher/admin', 'Core page: QR gen, timer, results, history, at-risk'],
    ['/student/dashboard', 'student', 'Class list with attendance %, pie chart, quick actions'],
    ['/student/scan', 'student', 'Camera-based QR scanner'],
    ['/student/join-class', 'student', 'Class code input form'],
    ['/student/class/[classId]', 'student', 'Per-class attendance history'],
])

doc.add_heading('6.1 Key Components', level=2)
add_table(['Component', 'Purpose'], [
    ['AuthGuard', 'Client-side route protection with role checking'],
    ['SessionAttendanceModal', 'Modal for viewing/editing per-session attendance with toggle & bulk save'],
    ['Skeleton', 'Loading placeholder component'],
    ['ToasterProvider', 'react-hot-toast wrapper for notifications'],
    ['API Client (api.ts)', 'Axios with auto JWT attachment + 401 auto-logout'],
])

# === 7. DATA FLOW ===
doc.add_heading('7. Complete Attendance Lifecycle', level=1)
p('Step 1: Teacher opens Class Detail page, selects lecture and duration')
p('Step 2: Clicks "Generate QR Code" → POST /api/session creates session + token')
p('Step 3: QR code displayed with URL containing session ID and token')
p('Step 4: Every 10s, token rotates via POST /api/session/:id/token (old tokens invalidated)')
p('Step 5: Student scans QR with phone camera → app parses URL')
p('Step 6: App sends POST /api/attendance with userId, sessionId, token, status=present')
p('Step 7: Backend validates session active, token valid, not expired, no duplicate')
p('Step 8: On success → 201 response, attendance recorded')
p('Step 9: When timer expires → session deactivated, results fetched and displayed')
p('Step 10: Teacher can view/edit results in SessionAttendanceModal')

# === 8. CODE QUALITY ===
doc.add_heading('8. Code Quality Assessment', level=1)

doc.add_heading('8.1 Strengths', level=2)
add_table(['Area', 'Observation'], [
    ['Consistent patterns', 'All controllers follow the same ok()/fail() response helpers'],
    ['Model validation', 'Comprehensive Sequelize validators with user-friendly messages'],
    ['Security layers', 'JWT auth + role middleware + bcrypt + password scoping'],
    ['Anti-cheating', 'Cryptographic token rotation + unique constraints prevent QR reuse'],
    ['UI polish', 'Loading skeletons, empty states, error states, toast notifications'],
    ['Responsive design', 'Mobile-first layouts with backdrop-blur headers and animations'],
    ['N+1 prevention', 'At-risk students uses batch GROUP BY query'],
    ['Parallel fetching', 'Promise.allSettled for concurrent API calls with graceful failures'],
])

doc.add_heading('8.2 Issues & Recommendations', level=2)

p('CRITICAL (Pre-Production)', bold=True, size=12)
add_table(['Issue', 'Severity', 'Location', 'Detail'], [
    ['Wide-open CORS', 'HIGH', 'app.js:11', 'cors() allows any origin — whitelist frontend domain'],
    ['Weak JWT secret', 'HIGH', '.env:12', '"your_super_secret_key" — use strong random value'],
    ['sync({ alter: true })', 'HIGH', 'app.js:64', 'Can destroy data in production — use migrations'],
    ['No rate limiting', 'MEDIUM', 'app.js', 'Auth endpoints unprotected against brute force'],
    ['Client-side auth only', 'MEDIUM', 'AuthGuard.tsx', 'localStorage check — use Next.js middleware too'],
])

p('IMPORTANT (Quality)', bold=True, size=12)
add_table(['Issue', 'Severity', 'Location', 'Detail'], [
    ['N+1 in getStudentSummary', 'MEDIUM', 'attendance.controller.js:318', 'Loops classes with 2 queries each — use batch aggregation'],
    ['Hardcoded API URL', 'MEDIUM', 'api.ts:4', 'localhost:5000 — use NEXT_PUBLIC_API_URL env var'],
    ['No test infrastructure', 'MEDIUM', 'package.json', 'Only 1 test file, no runner configured'],
    ['Duplicate helpers', 'LOW', 'All controllers', 'ok()/fail() copied everywhere — extract to shared util'],
    ['Register redirect bug', 'LOW', 'register/page.tsx:46', 'Students redirected to /teacher/dashboard'],
    ['Unused "late" status', 'LOW', 'attendance.model.js:63', 'ENUM includes "late" but no logic handles it'],
])

# === 9. DEPENDENCIES ===
doc.add_heading('9. Dependency Analysis', level=1)

doc.add_heading('9.1 Backend', level=2)
add_table(['Package', 'Version', 'Purpose', 'Notes'], [
    ['express', '5.2.1', 'HTTP framework', 'v5 is pre-release — may have breaking changes'],
    ['sequelize', '6.37.8', 'ORM', 'Stable'],
    ['pg / pg-hstore', '8.20.0', 'PostgreSQL driver', 'Standard'],
    ['bcrypt', '6.0.0', 'Password hashing', 'Native module'],
    ['jsonwebtoken', '9.0.3', 'JWT auth', 'Standard'],
    ['cors', '2.8.6', 'CORS middleware', 'Needs configuration'],
    ['dotenv', '17.3.1', 'Env loading', 'Standard'],
    ['nodemon', '3.1.14', 'Dev auto-restart', 'Dev only'],
])

doc.add_heading('9.2 Frontend', level=2)
add_table(['Package', 'Version', 'Purpose'], [
    ['next', '16.1.7', 'React framework (App Router)'],
    ['react / react-dom', '19.2.3', 'UI library'],
    ['axios', '1.13.6', 'HTTP client with interceptors'],
    ['@yudiel/react-qr-scanner', '2.5.1', 'Camera-based QR scanning'],
    ['qrcode.react', '4.2.0', 'SVG QR code generation'],
    ['recharts', '3.8.0', 'Charts (pie chart on dashboard)'],
    ['lucide-react', '0.577.0', 'Icon library'],
    ['react-hot-toast', '2.6.0', 'Toast notifications'],
    ['tailwindcss', '4', 'Utility-first CSS framework'],
])

# === 10. RECOMMENDATIONS ===
doc.add_heading('10. Prioritized Recommendations', level=1)

p('Critical (Pre-Production)', bold=True, size=12)
p('1. Replace sync({ alter: true }) with Sequelize migrations — current setup will destructively modify tables in production')
p('2. Configure CORS properly — whitelist only the frontend origin')
p('3. Use strong JWT secret — generate a 256-bit random key, load from environment')
p('4. Add rate limiting — use express-rate-limit on auth endpoints')
p('5. Fix register redirect — students should go to /student/dashboard')

p('Important (Quality)', bold=True, size=12)
p('6. Use environment variables for API URL — replace hardcoded localhost:5000')
p('7. Fix N+1 in getStudentSummary — replace loop with single aggregation query')
p('8. Extract shared response helpers — move ok()/fail() to a utility file')
p('9. Add proper test infrastructure — configure Jest/Vitest')
p('10. Add server-side auth — use Next.js middleware for route protection')

p('Nice-to-Have', bold=True, size=12)
p('11. Add request validation middleware (express-validator or zod)')
p('12. Implement refresh tokens')
p('13. Add pagination to session history')
p('14. Implement or remove the "late" attendance status')
p('15. Build an admin dashboard UI')
p('16. Add WebSocket for real-time attendance count updates')

# === 11. SUMMARY ===
doc.add_heading('11. Summary', level=1)
p('AttendEase is a well-structured, feature-complete attendance system with a thoughtful anti-cheating mechanism (rotating QR tokens) and clean separation of concerns. The codebase follows consistent patterns across both frontend and backend, with good attention to UX details (loading states, error handling, responsive design).')
p('The primary areas requiring attention before any production deployment are security hardening (CORS, JWT secret, rate limiting) and database migration strategy (replacing sync({ alter: true })). The frontend could benefit from server-side authentication middleware and environment-based API configuration.')

# === SAVE ===
out = os.path.expanduser('~/Projects/AMS-ag/AttendEase_Codebase_Report.docx')
doc.save(out)
print(f'Report saved to: {out}')
