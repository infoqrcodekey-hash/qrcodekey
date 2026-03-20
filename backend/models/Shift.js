const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, maxlength: 100 },
  code: { type: String, required: true, maxlength: 20 },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "18:00"
  graceMinutes: { type: Number, default: 15 },
  // Break time
  breakStart: { type: String, default: null },  // "13:00"
  breakEnd: { type: String, default: null },     // "14:00"
  breakDuration: { type: Number, default: 60 },  // minutes
  // Working hours
  totalHours: { type: Number, default: 8 },
  // Overtime settings
  overtimeEnabled: { type: Boolean, default: true },
  overtimeAfterMinutes: { type: Number, default: 30 }, // after shift end
  maxOvertimeHours: { type: Number, default: 4 },
  // Days
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  // Night shift handling
  isNightShift: { type: Boolean, default: false }, // crosses midnight
  // Assigned groups/members
  assignedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  // Color for UI
  color: { type: String, default: '#6366f1' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

shiftSchema.index({ organization: 1, isActive: 1 });
shiftSchema.index({ organization: 1, code: 1 }, { unique: true });

// Overtime log
const overtimeSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
  date: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  actualEnd: { type: Date, required: true },
  overtimeMinutes: { type: Number, required: true },
  overtimeHours: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  note: { type: String, maxlength: 300 }
}, { timestamps: true });

overtimeSchema.index({ member: 1, date: 1 });
overtimeSchema.index({ organization: 1, date: 1 });

const Shift = mongoose.model('Shift', shiftSchema);
const Overtime = mongoose.model('Overtime', overtimeSchema);

module.exports = { Shift, Overtime };
