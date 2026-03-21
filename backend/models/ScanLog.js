// ============================================
// models/ScanLog.js - Scan Location Log
// ============================================
// Stores location whenever someone scans a QR code
// Saves GPS coordinates, device info, IP address

const mongoose = require('mongoose');

const ScanLogSchema = new mongoose.Schema({
  // ---------- QR Reference ----------
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRCode',
    required: true,
    index: true
  },
  qrId: {
    type: String,
    required: true,
    index: true
  },

  // ---------- GPS Location ----------
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude] - MongoDB GeoJSON format
      required: true
    }
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  accuracy: {
    type: Number,  // GPS accuracy in meters
    default: null
  },
  altitude: {
    type: Number,
    default: null
  },

  // ---------- Address (Reverse Geocoded) ----------
  address: {
    full: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    state: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' },
    pincode: { type: String, default: null }
  },

  // ---------- Location Source ----------
  // IP-based location is used when GPS fails
  locationSource: {
    type: String,
    enum: ['gps', 'ip', 'wifi', 'cell', 'fallback'],
    default: 'gps'
  },
  isApproximate: {
    type: Boolean,
    default: false  // true = IP based (less accurate)
  },

  // ---------- Scanner Device Info ----------
  device: {
    userAgent: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    deviceType: { type: String, default: 'Unknown' },  // mobile, desktop, tablet
    brand: { type: String, default: 'Unknown' }
  },

  // ---------- Scanner Network Info ----------
  ipAddress: {
    type: String,
    default: null
  },
  ipLocation: {
    city: { type: String, default: null },
    country: { type: String, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  // ---------- Scan Metadata ----------
  scanDuration: {
    type: Number,  // milliseconds - how long page was open
    default: null
  },
  referrer: {
    type: String,
    default: null
  },

  // ---------- Finder Info (filled by person who scans) ----------
  finderName: {
    type: String,
    default: null,
    maxlength: 100
  },
  finderPhone: {
    type: String,
    default: null,
    maxlength: 20
  },
  finderEmail: {
    type: String,
    default: null,
    maxlength: 100
  },
  finderMessage: {
    type: String,
    default: null,
    maxlength: 500
  },
  finderSubmittedAt: {
    type: Date,
    default: null
  },

  // ---------- Notification Status ----------
  notificationSent: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  }

}, {
  timestamps: true
});

// ====== GeoSpatial Index (for nearby search) ======
ScanLogSchema.index({ location: '2dsphere' });

// ====== Compound Indexes ======
ScanLogSchema.index({ qrCode: 1, createdAt: -1 });
ScanLogSchema.index({ qrId: 1, createdAt: -1 });
ScanLogSchema.index({ createdAt: -1 });

// ====== Static: Get Recent Scans ======
ScanLogSchema.statics.getRecentScans = function(qrCodeId, limit = 50) {
  return this.find({ qrCode: qrCodeId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ====== Static: Get Scan Analytics ======
ScanLogSchema.statics.getAnalytics = async function(qrCodeId) {
  const stats = await this.aggregate([
    { $match: { qrCode: new mongoose.Types.ObjectId(qrCodeId) } },
    {
      $group: {
        _id: null,
        totalScans: { $sum: 1 },
        uniqueCities: { $addToSet: '$address.city' },
        uniqueCountries: { $addToSet: '$address.country' },
        firstScan: { $min: '$createdAt' },
        lastScan: { $max: '$createdAt' },
        avgAccuracy: { $avg: '$accuracy' }
      }
    }
  ]);

  return stats[0] || {
    totalScans: 0,
    uniqueCities: [],
    uniqueCountries: [],
    firstScan: null,
    lastScan: null,
    avgAccuracy: null
  };
};

module.exports = mongoose.model('ScanLog', ScanLogSchema);
