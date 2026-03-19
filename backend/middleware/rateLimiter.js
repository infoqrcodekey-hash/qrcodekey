// ============================================
// middleware/rateLimiter.js - Rate Limiting
// ============================================
// Protection against brute force attacks and abuse
// Different limits for different routes

const rateLimit = require('express-rate-limit');

// ====== General API Limit ======
// 100 requests per 15 minutes
exports.generalLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====== Auth Limit (Login/Register) ======
// 10 attempts per 15 minutes (brute force protection)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====== QR Scan Limit ======
// 30 scans per minute (per IP)
exports.scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many scans. Please try again in 1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====== QR Generate Limit ======
// 20 QR codes per hour
exports.generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Maximum 20 QR codes per hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====== Track Limit ======
// 20 track requests per 5 minutes
exports.trackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many track requests. Try again in 5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
