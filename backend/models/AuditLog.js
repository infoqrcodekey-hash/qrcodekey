const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'member_added', 'member_removed', 'member_updated',
      'group_created', 'group_deleted', 'group_updated',
      'attendance_marked', 'attendance_modified', 'attendance_locked',
      'leave_approved', 'leave_rejected',
      'holiday_added', 'holiday_removed',
      'settings_changed', 'location_updated', 'password_changed',
      'org_updated', 'export_data', 'emergency_broadcast',
      'visitor_checked_in', 'visitor_checked_out',
      'shift_created', 'shift_updated', 'shift_deleted',
      'qr_generated', 'qr_bulk_generated',
      'temp_password_generated', 'report_generated'
    ],
    required: true
  },
  description: { type: String, required: true, maxlength: 500 },
  targetType: { type: String, enum: ['member', 'group', 'organization', 'attendance', 'leave', 'holiday', 'visitor', 'shift', 'qr', 'settings', 'other'], default: 'other' },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null }
}, { timestamps: true });

auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// Static helper to create log easily
auditLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
