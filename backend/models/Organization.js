// ============================================
// models/Organization.js - Organization Model
// ============================================
// Supports: Schools, Hospitals, Offices, Companies

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['school', 'hospital', 'office', 'company', 'other'],
    required: [true, 'Organization type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sharedPassword: {
    type: String,
    required: [true, 'Shared dashboard password is required']
  },
  logo: {
    type: String,
    default: null
  },
  address: {
    type: String,
    trim: true
  },
  // GPS Location for attendance validation
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  // Allowed radius for GPS validation (meters)
  allowedRadius: {
    type: Number,
    default: 100,
    min: 10,
    max: 5000
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  settings: {
    attendanceStartTime: { type: String, default: '09:00' },
    attendanceEndTime: { type: String, default: '18:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    allowLateMarking: { type: Boolean, default: true },
    autoAbsentAfter: { type: String, default: '10:00' },
    lateThreshold: { type: Number, default: 15 }, // minutes after start time = late
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] } // Mon-Fri
  },
  isActive: {
    type: Boolean,
    default: true
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Generate unique invite code before save
organizationSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Virtual: group count
organizationSchema.virtual('groupCount', {
  ref: 'Group',
  localField: '_id',
  foreignField: 'organization',
  count: true
});

organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Organization', organizationSchema);
