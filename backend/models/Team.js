// ============================================
// models/Team.js - Team Schema
// ============================================
// Multi-user teams for shared QR code management

const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  // Team name
  name: {
    type: String,
    required: [true, 'Team name zaroori hai'],
    trim: true,
    maxlength: [50, 'Team name 50 characters se zyada nahi ho sakta']
  },

  // Team owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Members list
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],

  // Invite system
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  inviteEnabled: {
    type: Boolean,
    default: true
  },

  // Team description
  description: {
    type: String,
    maxlength: 200
  },

  // Stats
  totalQRCodes: { type: Number, default: 0 },
  totalScans: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Generate invite code
TeamSchema.statics.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TEAM-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

module.exports = mongoose.model('Team', TeamSchema);
