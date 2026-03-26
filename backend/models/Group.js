// ============================================
// models/Group.js - Group Attendance Model
// ============================================
// Admin-controlled, location-based QR attendance groups
const mongoose = require('mongoose');

// Member sub-schema
const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  qrNumber: { type: String, required: true },
  name: { type: String, required: true },
  isPresent: { type: Boolean, default: false },
  lastScanTime: { type: Date, default: null },
  addedAt: { type: Date, default: Date.now }
});

// Group schema
const groupSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminQrNumber: { type: String, required: true, trim: true },
  adminName: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: {
    type: String,
    enum: ['school', 'college', 'office', 'factory', 'hospital', 'gym', 'coaching', 'warehouse', 'event', 'other'],
    default: 'other'
  },
  // Group fixed address - CRITICAL for attendance validation
  fixedAddress: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  // Attendance master toggle (admin controlled)
  attendanceEnabled: { type: Boolean, default: false },
  // Group members
  members: [memberSchema],
  // Active status
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for fast lookups
groupSchema.index({ admin: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ 'members.qrNumber': 1 });

module.exports = mongoose.model('Group', groupSchema);

// ============================================
// GroupScanLog - Every scan record
// ============================================
const groupScanLogSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  qrId: { type: String, required: true },
  action: { type: String, enum: ['clock_in', 'clock_out'], required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    address: { type: String, default: '' }
  },
  distanceFromGroup: { type: Number, required: true },
  isValid: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

groupScanLogSchema.index({ group: 1, member: 1, timestamp: -1 });
groupScanLogSchema.index({ group: 1, timestamp: -1 });

const GroupScanLog = mongoose.model('GroupScanLog', groupScanLogSchema);
module.exports.GroupScanLog = GroupScanLog;
