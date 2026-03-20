const mongoose = require('mongoose');
const crypto = require('crypto');

const visitorSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, maxlength: 100 },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  company: { type: String, maxlength: 100 },
  purpose: { type: String, required: true, maxlength: 300 },
  hostMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  hostName: { type: String, maxlength: 100 },
  // Temporary QR for visitor
  visitorQrId: { type: String, unique: true, sparse: true },
  visitorQrImage: { type: String, default: null },
  // Photo ID
  photoId: { type: String, default: null },
  selfie: { type: String, default: null },
  // Entry/Exit tracking
  checkIn: {
    time: { type: Date, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  checkOut: {
    time: { type: Date, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  status: {
    type: String,
    enum: ['pre_registered', 'checked_in', 'checked_out', 'cancelled', 'denied'],
    default: 'pre_registered'
  },
  badge: { type: String, default: null },
  vehicleNumber: { type: String, maxlength: 20 },
  itemsCarried: { type: String, maxlength: 300 },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, maxlength: 500 }
}, { timestamps: true });

visitorSchema.index({ organization: 1, createdAt: -1 });
visitorSchema.index({ organization: 1, status: 1 });
visitorSchema.index({ visitorQrId: 1 });

visitorSchema.pre('save', function(next) {
  if (!this.visitorQrId) {
    this.visitorQrId = 'VIS-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Visitor', visitorSchema);
