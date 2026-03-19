// ============================================
// models/Group.js - Group Model
// ============================================
// Groups within organizations (classrooms, departments, wards, etc.)

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: 100
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  type: {
    type: String,
    enum: ['classroom', 'department', 'ward', 'team', 'section', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  qrCode: {
    type: String,
    default: null
  },
  qrImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual: member count
groupSchema.virtual('memberCount', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'group',
  count: true
});

groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Group', groupSchema);
