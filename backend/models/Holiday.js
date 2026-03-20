const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, maxlength: 200 },
  date: { type: Date, required: true },
  endDate: { type: Date, default: null }, // for multi-day holidays
  type: {
    type: String,
    enum: ['national', 'regional', 'religious', 'company', 'optional', 'restricted'],
    default: 'company'
  },
  description: { type: String, maxlength: 500 },
  isOptional: { type: Boolean, default: false },
  applicableGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // empty = all groups
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

holidaySchema.index({ organization: 1, date: 1 });
holidaySchema.index({ organization: 1, date: 1, endDate: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
