// ============================================
// models/FaceVerification.js - Face Verification Model
// ============================================
// Anti-proxy selfie check for attendance

const mongoose = require('mongoose');

const faceVerificationSchema = new mongoose.Schema({
  // Member whose face is being verified
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Reference photo (base64 stored during enrollment)
  referencePhoto: {
    type: String,
    default: null
  },
  // Is the member enrolled for face verification?
  isEnrolled: {
    type: Boolean,
    default: false
  },
  enrolledAt: {
    type: Date,
    default: null
  },
  // Verification attempts log
  verificationLogs: [{
    selfiePhoto: {
      type: String, // base64 image
      required: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    },
    result: {
      type: String,
      enum: ['passed', 'failed', 'pending_review', 'manual_approved', 'manual_rejected'],
      default: 'pending_review'
    },
    confidence: {
      type: Number, // 0-100 percentage match
      default: 0
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    deviceInfo: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for fast lookups
faceVerificationSchema.index({ member: 1, organization: 1 }, { unique: true });
faceVerificationSchema.index({ 'verificationLogs.result': 1 });

module.exports = mongoose.model('FaceVerification', faceVerificationSchema);
