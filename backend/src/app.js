require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./models');
const { testConnection } = require('./config/database');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowed = ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.0.102:3000'];
    // Allow localtunnel URLs and requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowed.includes(origin) || origin.endsWith('.loca.lt')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for dev
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({
      status: 'ok',
      message: 'Server is running and database is connected.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server is running but database connection failed.',
      error: error.message,
    });
  }
});

// ─── Feature Routers ──────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const sessionRoutes = require('./routes/session.routes');
const classRoutes = require('./routes/class.routes');
const studentRoutes = require('./routes/student.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/student', studentRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

testConnection().then(async () => {
  // Sync models → creates tables if they don't exist
  await db.sequelize.sync({ alter: true });
  console.log('Database tables synced.');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

module.exports = app;
