// ============================================
// models/Attendance.js - Attendance Model
// ============================================
// QR-based attendance tracking for groups

const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'absent'
  },
  markedAt: {
    type: Date,
    default: null
  },
  markedBy: {
    type: String,
    enum: ['qr_scan', 'manual', 'auto_absent'],
    default: 'manual'
  },
  note: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  records: [attendanceRecordSchema],
  sessionQrCode: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  summary: {
    total: { type: Number, default: 0 },
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    excused: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index: one attendance per group per date
attendanceSchema.index({ group: 1, date: 1 }, { unique: true });
attendanceSchema.index({ organization: 1, date: 1 });

// Method: Calculate summary
attendanceSchema.methods.calculateSummary = function() {
  const records = this.records;
  this.summary = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
