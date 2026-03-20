// ============================================
// controllers/holidayController.js
// ============================================
const Holiday = require('../models/Holiday');
const AuditLog = require('../models/AuditLog');

// @desc    Add holiday
// @route   POST /api/holidays
exports.addHoliday = async (req, res) => {
  try {
    const { orgId, name, date, endDate, type, description, isOptional, applicableGroups } = req.body;

    const holiday = await Holiday.create({
      organization: orgId,
      name, date, endDate: endDate || date,
      type: type || 'company',
      description, isOptional: isOptional || false,
      applicableGroups: applicableGroups || [],
      createdBy: req.user._id
    });

    await AuditLog.log({
      organization: orgId, user: req.user._id,
      action: 'holiday_added',
      description: `Added holiday: ${name} on ${new Date(date).toLocaleDateString()}`,
      targetType: 'holiday', targetId: holiday._id
    });

    res.status(201).json({ success: true, data: holiday });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all holidays for org
// @route   GET /api/holidays/:orgId
exports.getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const query = { organization: req.params.orgId, isActive: true };

    if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      query.date = { $gte: start, $lte: end };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 }).lean();
    res.json({ success: true, data: holidays, total: holidays.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update holiday
// @route   PUT /api/holidays/:id
exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
    res.json({ success: true, data: holiday });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

    await AuditLog.log({
      organization: holiday.organization, user: req.user._id,
      action: 'holiday_removed',
      description: `Removed holiday: ${holiday.name}`,
      targetType: 'holiday', targetId: holiday._id
    });

    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Check if date is holiday
// @route   GET /api/holidays/check/:orgId
exports.isHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = new Date(date);

    const holiday = await Holiday.findOne({
      organization: req.params.orgId,
      isActive: true,
      date: { $lte: checkDate },
      $or: [
        { endDate: { $gte: checkDate } },
        { endDate: null, date: { $eq: checkDate } }
      ]
    });

    res.json({ success: true, isHoliday: !!holiday, holiday: holiday || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get upcoming holidays
// @route   GET /api/holidays/upcoming/:orgId
exports.getUpcoming = async (req, res) => {
  try {
    const holidays = await Holiday.find({
      organization: req.params.orgId,
      isActive: true,
      date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(10).lean();

    res.json({ success: true, data: holidays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
