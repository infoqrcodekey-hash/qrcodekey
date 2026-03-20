const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: ['clock_in', 'clock_out', 'absent', 'late', 'leave_request', 'leave_approved', 'leave_rejected', 'emergency', 'visitor', 'overtime', 'holiday', 'shift_change', 'report_ready'],
    required: true
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  // Who should see this
  recipients: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    phone: String,
    read: { type: Boolean, default: false },
    readAt: Date
  }],
  // Delivery channels
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  // Delivery status
  delivery: {
    email: { sent: { type: Boolean, default: false }, sentAt: Date, error: String },
    sms: { sent: { type: Boolean, default: false }, sentAt: Date, error: String },
    push: { sent: { type: Boolean, default: false }, sentAt: Date, error: String }
  },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ organization: 1, createdAt: -1 });
notificationSchema.index({ 'recipients.userId': 1, 'recipients.read': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
