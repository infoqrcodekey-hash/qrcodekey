const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  type: {
    type: String,
    enum: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'half_day', 'work_from_home', 'other'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true, min: 0.5 },
  reason: { type: String, required: true, maxlength: 500 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, maxlength: 500 },
  // Supporting document
  attachment: { type: String, default: null },
  // Auto-calculate half days
  isHalfDay: { type: Boolean, default: false },
  halfDayType: { type: String, enum: ['first_half', 'second_half'], default: null }
}, { timestamps: true });

leaveSchema.index({ member: 1, startDate: 1 });
leaveSchema.index({ organization: 1, status: 1 });
leaveSchema.index({ group: 1, startDate: 1, endDate: 1 });

// Leave Balance sub-schema
const leaveBalanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  year: { type: Number, required: true },
  balances: {
    sick: { total: { type: Number, default: 12 }, used: { type: Number, default: 0 } },
    casual: { total: { type: Number, default: 12 }, used: { type: Number, default: 0 } },
    earned: { total: { type: Number, default: 15 }, used: { type: Number, default: 0 } },
    maternity: { total: { type: Number, default: 180 }, used: { type: Number, default: 0 } },
    paternity: { total: { type: Number, default: 15 }, used: { type: Number, default: 0 } },
    unpaid: { total: { type: Number, default: 365 }, used: { type: Number, default: 0 } }
  }
}, { timestamps: true });

leaveBalanceSchema.index({ member: 1, year: 1 }, { unique: true });

const Leave = mongoose.model('Leave', leaveSchema);
const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = { Leave, LeaveBalance };
