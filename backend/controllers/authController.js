// ============================================
// controllers/authController.js - Authentication
// ============================================
// Register, Login, Profile, Password Reset

const User = require('../models/User');

// ====== REGISTER (Create New Account) ======
// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check: Email already registered?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered. Please login'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    // Generate and send token
    sendTokenResponse(user, 201, res, 'Account created successfully! Ã°ÂÂÂ');

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account. Please try again'
    });
  }
};

// ====== LOGIN ======
// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user (include password)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Is account active?
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Send token
    sendTokenResponse(user, 200, res, 'Login successful! Ã°ÂÂÂ');

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login error. Please try again'
    });
  }
};

// ====== GET PROFILE ======
// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        planExpiry: user.planExpiry,
        role: user.role,
        isPremium: user.isPremium(),
        qrLimit: user.getQRLimit(),
        createdAt: user.createdAt,
        emailVerified: user.emailVerified || false,
        phoneVerified: user.phoneVerified || false,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading profile'
    });
  }
};

// ====== UPDATE PROFILE ======
// PUT /api/auth/me
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = { 
      name: req.body.name, 
      phone: req.body.phone,
      fcmToken: req.body.fcmToken 
    };

    // Remove empty fields
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) delete allowedFields[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, allowedFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// ====== CHANGE PASSWORD ======
// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password changed successfully');

  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// ====== LOGOUT ======
// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

// ====== DELETE ACCOUNT ======
// DELETE /api/auth/me
// Requires password confirmation
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect. Account deletion cancelled'
      });
    }

    // Get all models for deletion
    const QRCode = require('../models/QRCode');
    const ScanLog = require('../models/ScanLog');
    const Organization = require('../models/Organization');
    const Team = require('../models/Team');

    // Get all user's QR codes first (for scan log deletion)
    const userQRCodes = await QRCode.find({ owner: user._id }).select('_id');
    const qrIds = userQRCodes.map(q => q._id);

    // Delete all scan logs for user's QR codes
    await ScanLog.deleteMany({ qrCode: { $in: qrIds } });

    // Delete all user's QR codes
    await QRCode.deleteMany({ owner: user._id });

    // Delete all user's organizations
    await Organization.deleteMany({ owner: user._id });

    // Remove user from teams and delete owned teams
    await Team.deleteMany({ owner: user._id });

    // Delete the user document
    await User.findByIdAndDelete(req.user._id);

    // Clear cookie
    res.clearCookie('token');

    res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully. Your data will be permanently removed within 30 days.'
    });

  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account. Please try again'
    });
  }
};

// ====== EXPORT MY DATA (GDPR) ======
// GET /api/auth/me/export
// Returns all user data as JSON
exports.exportMyData = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get models
    const QRCode = require('../models/QRCode');
    const ScanLog = require('../models/ScanLog');
    const Organization = require('../models/Organization');
    const Team = require('../models/Team');

    // Fetch all user data
    const user = await User.findById(userId);
    const qrCodes = await QRCode.find({ owner: userId }).select('-qrPassword');
    const qrIds = qrCodes.map(q => q._id);
    const scanLogs = await ScanLog.find({ qrCode: { $in: qrIds } });
    const organizations = await Organization.find({ owner: userId }).select('-sharedPassword');
    const teams = await Team.find({ owner: userId });

    // Compile data
    const exportData = {
      exportedAt: new Date().toISOString(),
      userProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        planExpiry: user.planExpiry,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        paymentHistory: user.paymentHistory
      },
      qrCodes: qrCodes.map(qr => ({
        qrId: qr.qrId,
        category: qr.category,
        registeredName: qr.registeredName,
        registeredEmail: qr.registeredEmail,
        isActive: qr.isActive,
        totalScans: qr.totalScans,
        lastKnownLocation: qr.lastKnownLocation,
        createdAt: qr.createdAt,
        updatedAt: qr.updatedAt
      })),
      scanLogs: scanLogs.map(log => ({
        id: log._id,
        qrCode: log.qrCode,
        scanNumber: log.scanNumber,
        location: log.location,
        device: log.device,
        address: log.address,
        createdAt: log.createdAt
      })),
      organizations: organizations.map(org => ({
        id: org._id,
        name: org.name,
        type: org.type,
        description: org.description,
        inviteCode: org.inviteCode,
        createdAt: org.createdAt
      })),
      teams: teams.map(team => ({
        id: team._id,
        name: team.name,
        members: team.members?.length || 0,
        createdAt: team.createdAt
      }))
    };

    // Send as JSON download
    res.status(200)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Content-Disposition', `attachment; filename="qrcodekey-data-export-${Date.now()}.json"`)
      .json(exportData);

  } catch (error) {
    console.error('Export Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data. Please try again'
    });
  }
};

// ====== Helper: Token Response ======
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified || false,
        phoneVerified: user.phoneVerified || false
      }
    });
};

// ====== SEND EMAIL OTP ======
// POST /api/auth/send-email-otp
exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const user = await User.collection.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.otpAttempts >= 5 && user.otpExpiry && user.otpExpiry > new Date()) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Try again later.' });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await User.collection.updateOne({ email: email }, { $set: { emailOTP: otp, otpExpiry: expiry, otpAttempts: (user.otpAttempts || 0) + 1 } });
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'QRCodeKey <onboarding@resend.dev>',
        to: [email],
        subject: 'QRCodeKey - Email Verification OTP',
        html: '<h2>Your OTP Code</h2><p>Your verification code is: <strong>' + otp + '</strong></p><p>This code expires in 10 minutes.</p>'
      })
    });
    if (!emailRes.ok) {
      const errData = await emailRes.json();
      throw new Error(errData.message || 'Email send failed');
    }
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Send Email OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ====== VERIFY EMAIL OTP ======
// POST /api/auth/verify-email-otp
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const user = await User.collection.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.emailOTP || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'No OTP requested. Please request a new one.' });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }
    if (user.emailOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    await User.collection.updateOne({ email: email }, { $set: { emailVerified: true, emailOTP: null, otpExpiry: null, otpAttempts: 0 } });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify Email OTP Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ====== SEND PHONE OTP ======
// POST /api/auth/send-phone-otp
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const user = await User.findOne({ phone }).select('+phoneOTP');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.otpAttempts >= 5 && user.otpExpiry && user.otpExpiry > new Date()) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Try again later.' });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.phoneOTP = otp;
    user.otpExpiry = expiry;
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: 'QRCodeKey verification code: ' + otp,
        from: process.env.TWILIO_PHONE,
        to: phone
      });
    } else {
      console.log('[DEV] Phone OTP for ' + phone + ': ' + otp);
    }
    res.json({ success: true, message: 'OTP sent to phone' });
  } catch (err) {
    console.error('Send Phone OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ====== VERIFY PHONE OTP ======
// POST /api/auth/verify-phone-otp
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }
    const user = await User.findOne({ phone }).select('+phoneOTP');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.phoneOTP || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'No OTP requested' });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (user.phoneOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    user.phoneVerified = true;
    user.phoneOTP = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (err) {
    console.error('Verify Phone OTP Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};
