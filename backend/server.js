// ============================================
// server.js - Main Entry Point
// ============================================
// QR Code Tracking System - Production Server
// Express + Socket.io + MongoDB

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// ====== Startup Validation ======
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`❌ Missing critical environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// ====== App Initialize ======
const app = express();
const server = http.createServer(app);

// ====== HTTPS Redirect Middleware (Production) ======
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// ====== Socket.io Setup (Real-time) ======
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ====== Database Connect ======
connectDB();

// ====== Security Middleware ======
// Helmet: Secures HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    }
  }
}));

// CORS: Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB injection protection
app.use(mongoSanitize());

// HTTP Parameter Pollution protection
app.use(hpp());

// Compression (reduces response size)
app.use(compression());

// ====== Body Parsing ======
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====== Logging ======
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ====== Rate Limiting ======
app.use('/api/', generalLimiter);

// ====== Add Socket.io to Request ======
// So controllers can emit socket events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ====== Health Check ======
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QR Tracking System Running! ✅',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

// ====== API Routes ======
app.use('/api/auth', require('./routes/auth'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/track', require('./routes/track'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/export', require('./routes/export'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/org', require('./routes/organization'));
app.use('/api/attendance-scan', require('./routes/attendanceScan'));

// ====== Static Files (Production) ======
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // React SPA: Send all unknown routes to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// ====== 404 Handler ======
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found`
  });
});

// ====== Global Error Handler ======
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ============================================
// SOCKET.IO - Real-time Events
// ============================================
io.on('connection', (socket) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔌 Socket connected: ${socket.id}`);
  }

  // User joins their room (personal notifications)
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  // Join QR Code room (live tracking)
  socket.on('join_qr_tracking', (qrId) => {
    socket.join(`qr_${qrId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Tracking room joined: qr_${qrId}`);
    }
  });

  // Join organization attendance room
  socket.on('join_org_attendance', (orgId) => {
    socket.join(`org_${orgId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 Attendance room joined: org_${orgId}`);
    }
  });

  // Leave organization attendance room
  socket.on('leave_org_attendance', (orgId) => {
    socket.leave(`org_${orgId}`);
  });

  // Leave QR tracking room
  socket.on('leave_qr_tracking', (qrId) => {
    socket.leave(`qr_${qrId}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚪 Left tracking room: qr_${qrId}`);
    }
  });

  // Live location update (from scanner side)
  socket.on('location_update', (data) => {
    const { qrId, latitude, longitude, accuracy } = data;

    // Send to all watchers of that QR
    io.to(`qr_${qrId}`).emit('live_location', {
      qrId,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date()
    });
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    }
  });
});

// ============================================
// CRON JOBS - Scheduled Tasks
// ============================================
const setupCronJobs = () => {
  try {
    const { CronJob } = require('cron');

    // Daily at 2 AM: Check expired plans
    new CronJob('0 2 * * *', async () => {
      console.log('⏰ Running plan expiry check...');
      const User = require('./models/User');
      const expired = await User.updateMany(
        { planExpiry: { $lt: new Date() }, plan: { $ne: 'free' } },
        { plan: 'free', planExpiry: null }
      );
      console.log(`📋 ${expired.modifiedCount} plans expired and reset to free`);
    }, null, true, 'Asia/Kolkata');

    // Every 6 hours: Report inactive QR codes
    new CronJob('0 */6 * * *', async () => {
      const QRCode = require('./models/QRCode');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactive = await QRCode.countDocuments({
        isActive: true,
        updatedAt: { $lt: thirtyDaysAgo }
      });
      if (inactive > 0) {
        console.log(`⚠️ ${inactive} QR codes inactive for 30+ days`);
      }
    }, null, true, 'Asia/Kolkata');

    // Daily at 11 PM: Auto-mark absent for members who didn't scan
    new CronJob('0 23 * * *', async () => {
      console.log('⏰ Running auto-absent marking...');
      const Attendance = require('./models/Attendance');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAttendances = await Attendance.find({ date: today });
      let marked = 0;
      for (const att of todayAttendances) {
        for (const record of att.records) {
          if (!record.clockIn || !record.clockIn.time) {
            record.status = 'absent';
            record.markedBy = 'auto_absent';
            marked++;
          } else if (!record.clockOut || !record.clockOut.time) {
            record.status = 'half-day';
            marked++;
          }
        }
        att.calculateSummary();
        await att.save();
      }
      console.log(`📋 Auto-marked ${marked} attendance records`);
    }, null, true, 'Asia/Kolkata');

    console.log('⏰ Cron jobs scheduled');
  } catch (err) {
    console.warn('⚠️ Cron setup skipped:', err.message);
  }
};

// ====== Start Server ======
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🚀 QR Tracking System - Running!       ║');
  console.log(`║   📡 Port: ${PORT}                          ║`);
  console.log(`║   🌍 Env: ${(process.env.NODE_ENV || 'development').padEnd(16)}         ║`);
  console.log('║   🔌 WebSocket: Ready                    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  setupCronJobs();
});

// ====== Graceful Shutdown ======
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('💤 Server closed');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
});
