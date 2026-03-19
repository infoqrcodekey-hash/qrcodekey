// ============================================
// models/User.js - User Schema
// ============================================
// Stores user data
// Password hashing is automatic

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // ---------- Basic Info ----------
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    match: [/^[+]?[\d\s-]{10,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false  // Password won't be included in queries by default
  },

  // ---------- Subscription ----------
  plan: {
    type: String,
    enum: ['free', 'pro', 'business'],
    default: 'free'
  },
  planExpiry: {
    type: Date,
    default: null
  },

  // ---------- Push Notification Token ----------
  fcmToken: {
    type: String,
    default: null
  },

  // ---------- Account Status ----------
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  passwordResetToken: String,
  passwordResetExpire: Date,

  // ---------- Payment History ----------
  paymentHistory: [{
    orderId: String,
    paymentId: String,
    plan: String,
    amount: Number,
    currency: { type: String, default: 'INR' },
    status: { type: String, default: 'paid' },
    paidAt: Date
  }],

}, {
  timestamps: true  // auto-creates createdAt, updatedAt
});

// ====== Password Hash (before save) ======
UserSchema.pre('save', async function(next) {
  // Skip if password hasn't changed
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ====== Password Match Check ======
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ====== JWT Token Generate ======
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// ====== Plan Check ======
UserSchema.methods.isPremium = function() {
  if (this.plan === 'free') return false;
  if (this.planExpiry && this.planExpiry < new Date()) return false;
  return true;
};

// ====== QR Limit Check ======
UserSchema.methods.getQRLimit = function() {
  const limits = { free: 5, pro: 50, business: 999999 };
  return limits[this.plan] || 5;
};

module.exports = mongoose.model('User', UserSchema);
