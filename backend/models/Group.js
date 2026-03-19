// ============================================
// models/Group.js - Group Model
// ============================================
// Groups within organizations (classrooms, departments, wards, etc.)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  // Master password for group attendance viewing
  masterPassword: {
    type: String,
    select: false
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  department: {
    type: String,
    trim: true,
    default: null
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

// Hash master password before save
groupSchema.pre('save', async function(next) {
  if (!this.isModified('masterPassword') || !this.masterPassword) return next();
  const salt = await bcrypt.genSalt(10);
  this.masterPassword = await bcrypt.hash(this.masterPassword, salt);
  next();
});

// Match master password
groupSchema.methods.matchMasterPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.masterPassword);
};

module.exports = mongoose.model('Group', groupSchema);
