// ============================================
// controllers/otpController.js
// Forgot Password + OTP Verification via Email
// ============================================

const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// In-memory OTP store (use Redis in production for scale)
const otpStore = new Map();

// Email transporter
let transporter;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
} catch (err) {
  console.warn('Email not configured for OTP');
}

// Generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ====== SEND OTP ======
// POST /api/otp/send
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), { otp, expiry, attempts: 0 });

    // Send email
    if (transporter && process.env.SMTP_USER) {
      await transporter.sendMail({
        from: `"QR Tracker" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Password Reset OTP - QR Tracker',
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; background: #f8f9fa; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Password Reset OTP</h1>
            </div>
            <div style="padding: 24px; text-align: center;">
              <p style="font-size: 14px; color: #555;">Your OTP is:</p>
              <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #6366f1; margin: 16px 0; font-family: monospace;">
                ${otp}
              </div>
              <p style="font-size: 12px; color: #888;">Valid for 10 minutes. Do not share this code.</p>
            </div>
          </div>
        `
      });
    }

    // For development: log OTP (remove in production!)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 OTP for ${email}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      // Remove this in production:
      ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: 'Error sending OTP' });
  }
};

// ====== VERIFY OTP ======
// POST /api/otp/verify
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const stored = otpStore.get(email.toLowerCase());
    if (!stored) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    // Check expiry
    if (Date.now() > stored.expiry) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
    }

    // Verify OTP
    stored.attempts++;
    if (stored.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: `Wrong OTP. ${5 - stored.attempts} attempts remaining.` });
    }

    // OTP verified! Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store reset token in OTP store
    otpStore.set(`reset_${email.toLowerCase()}`, { token: resetToken, expiry: tokenExpiry });
    otpStore.delete(email.toLowerCase()); // Remove used OTP

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Verification error' });
  }
};

// ====== RESET PASSWORD ======
// POST /api/otp/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Verify reset token
    const stored = otpStore.get(`reset_${email.toLowerCase()}`);
    if (!stored || stored.token !== resetToken) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (Date.now() > stored.expiry) {
      otpStore.delete(`reset_${email.toLowerCase()}`);
      return res.status(400).json({ success: false, message: 'Reset token expired' });
    }

    // Update password
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword; // Will be auto-hashed by pre-save hook
    await user.save();

    // Cleanup
    otpStore.delete(`reset_${email.toLowerCase()}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful! Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Password reset error' });
  }
};
