const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { CronJob } = require('cron');
const config = require('./config');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/needs', require('./routes/needs'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/matching', require('./routes/matching'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/orgs', require('./routes/orgs'));
app.use('/api/notifications', require('./routes/notifications'));

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(notFound);
app.use(errorHandler);

// ==========================================
// CRON JOBS
// ==========================================

// Batch matching every 15 minutes
const matchingJob = new CronJob('*/15 * * * *', async () => {
  console.log('⏰ Running scheduled batch matching...');
  try {
    const axios = require('axios');
    await axios.post(`http://localhost:${config.port}/api/matching/run`, {}, {
      headers: {
        // Create a system-level JWT for cron jobs
        Authorization: `Bearer ${require('jsonwebtoken').sign(
          { userId: 'system', role: 'super_admin' },
          config.jwt.secret,
          { expiresIn: '1m' }
        )}`,
      },
    });
    console.log('✅ Batch matching completed');
  } catch (err) {
    console.error('❌ Batch matching failed:', err.message);
  }
});

// Clean up expired refresh tokens daily
const cleanupJob = new CronJob('0 2 * * *', async () => {
  try {
    const db = require('./config/database');
    await db.query("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')");
    console.log('🧹 Cleaned up expired refresh tokens');
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
});

// ==========================================
// START SERVER
// ==========================================

// Create uploads directory
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Community Aid Platform API Server          ║
  ║   Port: ${config.port}                              ║
  ║   Environment: ${config.nodeEnv.padEnd(28)}║
  ╚══════════════════════════════════════════════╝
  `);

  // Start cron jobs
  if (config.nodeEnv !== 'test') {
    matchingJob.start();
    cleanupJob.start();
    console.log('⏰ Cron jobs started');
  }
});

module.exports = app;
