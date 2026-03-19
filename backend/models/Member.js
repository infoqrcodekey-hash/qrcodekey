// ============================================
// models/Member.js - Member Model
// ============================================
// Members of groups (students, staff, patients, employees)

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Member name is required'],
    trim: true,
    maxlength: 100
  },
  rollNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
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
  role: {
    type: String,
    enum: ['student', 'teacher', 'staff', 'patient', 'employee', 'visitor', 'other'],
    default: 'other'
  },
  photo: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for fast lookups
memberSchema.index({ group: 1, isActive: 1 });
memberSchema.index({ organization: 1, isActive: 1 });

module.exports = mongoose.model('Member', memberSchema);
