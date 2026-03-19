// routes/otp.js - Forgot Password / OTP Routes
const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, resetPassword } = require('../controllers/otpController');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/send', authLimiter, sendOTP);
router.post('/verify', authLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
