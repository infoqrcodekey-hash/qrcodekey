// ============================================
// models/QRCode.js - QR Code Schema
// ============================================
// Stores data for each QR Code
// Tracks owner, category, activation status, scan count

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const QRCodeSchema = new mongoose.Schema({
  // ---------- QR Identity ----------
  qrId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true  // For fast lookup
  },
  
  // ---------- Owner (who created the QR) ----------
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ---------- Registration Info (Form Data) ----------
  registeredName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  registeredEmail: {
    type: String,
    lowercase: true
  },
  registeredPhone: {
    type: String
  },
  category: {
    type: String,
    enum: ['child', 'car', 'vehicle', 'bag', 'pet', 'key', 'luggage', 'document', 'other'],
    default: 'other'
  },
  message: {
    type: String,
    maxlength: 500
  },
  registeredAddress: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // ---------- QR Password (to view location) ----------
  qrPassword: {
    type: String,
    required: [true, 'QR Password is required'],
    select: false
  },

  // ---------- Status ----------
  isActive: {
    type: Boolean,
    default: false
  },
  activatedAt: {
    type: Date,
    default: null
  },
  // ---------- Notification Settings ----------
  notificationsEnabled: {
    type: Boolean,
    default: false
  },

  // ---------- QR Image ----------
  qrImageUrl: {
    type: String,
    default: null
  },

  // ---------- Scan Stats ----------
  totalScans: {
    type: Number,
    default: 0
  },

  // ---------- Last Known Location ----------
  // Used when GPS error occurs
  lastKnownLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: null },
    accuracy: { type: Number, default: null },
    capturedAt: { type: Date, default: null },
    source: { 
      type: String, 
      enum: ['gps', 'ip', 'wifi', 'cell', 'manual'],
      default: 'gps'
    }
  },

  // ---------- Notification Settings ----------
  notifyOnScan: {
    type: Boolean,
    default: true
  },
  notifyEmail: {
    type: Boolean,
    default: true
  },
  notifySMS: {
    type: Boolean,
    default: false
  },
  notifyPush: {
    type: Boolean,
    default: true
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ====== Virtual: Scan Logs Reference ======
QRCodeSchema.virtual('scanLogs', {
  ref: 'ScanLog',
  localField: '_id',
  foreignField: 'qrCode',
  justOne: false
});

// ====== Password Hash ======
QRCodeSchema.pre('save', async function(next) {
  if (!this.isModified('qrPassword')) return next();
  const salt = await bcrypt.genSalt(10);
  this.qrPassword = await bcrypt.hash(this.qrPassword, salt);
  next();
});

// ====== Password Match ======
QRCodeSchema.methods.matchQRPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.qrPassword);
};

// ====== Generate Unique QR ID ======
QRCodeSchema.statics.generateQRId = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `QR-${timestamp}-${random}`;
};

// ====== Indexes for Performance ======
QRCodeSchema.index({ owner: 1, createdAt: -1 });
QRCodeSchema.index({ qrId: 1 });
QRCodeSchema.index({ isActive: 1 });

module.exports = mongoose.model('QRCode', QRCodeSchema);
