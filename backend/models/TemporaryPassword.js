// ============================================
// models/TemporaryPassword.js - Temporary Viewer Access
// ============================================
// Allows parents/managers read-only attendance access

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const temporaryPasswordSchema = new mongoose.Schema({
  // Hashed password
  password: {
    type: String,
    required: true,
    select: false
  },
  // Plain text hint (last 4 chars for identification)
  passwordHint: {
    type: String,
    default: null
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  // Optional: limit to specific member
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  // Who generated this password
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Access level (always read-only for viewers)
  accessLevel: {
    type: String,
    enum: ['read-only'],
    default: 'read-only'
  },
  // Label for identification (e.g., "Rahul's Parent")
  label: {
    type: String,
    trim: true,
    maxlength: 100
  },
  // Expiry
  expiresAt: {
    type: Date,
    required: true
  },
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// TTL index for auto-deletion after expiry
temporaryPasswordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // cleanup 24h after expiry
temporaryPasswordSchema.index({ organization: 1, group: 1 });
temporaryPasswordSchema.index({ generatedBy: 1 });

// Hash password before save
temporaryPasswordSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
temporaryPasswordSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static: Generate a random 6-digit password
temporaryPasswordSchema.statics.generatePassword = function() {
  return crypto.randomInt(100000, 999999).toString();
};

// Check if expired
temporaryPasswordSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('TemporaryPassword', temporaryPasswordSchema);
