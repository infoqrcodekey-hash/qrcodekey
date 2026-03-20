// ============================================
// controllers/shiftController.js
// ============================================
const { Shift, Overtime } = require('../models/Shift');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const AuditLog = require('../models/AuditLog');

// @desc    Create shift
// @route   POST /api/shifts
exports.createShift = async (req, res) => {
  try {
    const { orgId, name, code, startTime, endTime, graceMinutes, breakStart, breakEnd, breakDuration,
            totalHours, overtimeEnabled, overtimeAfterMinutes, maxOvertimeHours, workingDays,
            isNightShift, assignedGroups, assignedMembers, color } = req.body;

    const shift = await Shift.create({
      organization: orgId, name, code, startTime, endTime,
      graceMinutes: graceMinutes || 15,
      breakStart, breakEnd, breakDuration: breakDuration || 60,
      totalHours: totalHours || 8,
      overtimeEnabled: overtimeEnabled !== false,
      overtimeAfterMinutes: overtimeAfterMinutes || 30,
      maxOvertimeHours: maxOvertimeHours || 4,
      workingDays: workingDays || [1, 2, 3, 4, 5],
      isNightShift: isNightShift || false,
      assignedGroups: assignedGroups || [],
      assignedMembers: assignedMembers || [],
      color: color || '#6366f1',
      createdBy: req.user._id
    });

    await AuditLog.log({
      organization: orgId, user: req.user._id,
      action: 'shift_created',
      description: `Created shift: ${name} (${startTime}-${endTime})`,
      targetType: 'shift', targetId: shift._id
    });

    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all shifts for org
// @route   GET /api/shifts/:orgId
exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ organization: req.params.orgId, isActive: true })
      .populate('assignedGroups', 'name')
      .sort({ startTime: 1 }).lean();
    res.json({ success: true, data: shifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    await AuditLog.log({
      organization: shift.organization, user: req.user._id,
      action: 'shift_updated',
      description: `Updated shift: ${shift.name}`,
      targetType: 'shift', targetId: shift._id
    });

    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete shift
// @route   DELETE /api/shifts/:id
exports.deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    shift.isActive = false;
    await shift.save();

    await AuditLog.log({
      organization: shift.organization, user: req.user._id,
      action: 'shift_deleted',
      description: `Deleted shift: ${shift.name}`,
      targetType: 'shift', targetId: shift._id
    });

    res.json({ success: true, message: 'Shift deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Log overtime
// @route   POST /api/shifts/overtime
exports.logOvertime = async (req, res) => {
  try {
    const { memberId, orgId, shiftId, date, scheduledEnd, actualEnd, note } = req.body;

    const scheduled = new Date(scheduledEnd);
    const actual = new Date(actualEnd);
    const diffMs = actual - scheduled;
    const overtimeMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const overtimeHours = parseFloat((overtimeMinutes / 60).toFixed(2));

    if (overtimeMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'No overtime detected' });
    }

    const overtime = await Overtime.create({
      member: memberId, organization: orgId, shift: shiftId,
      date: new Date(date), scheduledEnd: scheduled, actualEnd: actual,
      overtimeMinutes, overtimeHours, note
    });

    res.status(201).json({ success: true, data: overtime });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get overtime records
// @route   GET /api/shifts/overtime/:orgId
exports.getOvertimeRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, memberId, startDate, endDate, status } = req.query;
    const query = { organization: req.params.orgId };
    if (memberId) query.member = memberId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Overtime.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('member', 'name rollNumber')
      .populate('shift', 'name code')
      .lean();

    const total = await Overtime.countDocuments(query);

    // Total overtime hours this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyOvertime = await Overtime.aggregate([
      { $match: { organization: new require('mongoose').Types.ObjectId(req.params.orgId), date: { $gte: monthStart }, status: 'approved' } },
      { $group: { _id: null, totalHours: { $sum: '$overtimeHours' }, totalMinutes: { $sum: '$overtimeMinutes' } } }
    ]);

    res.json({
      success: true, data: records,
      monthlyOvertime: monthlyOvertime[0] || { totalHours: 0, totalMinutes: 0 },
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Approve/Reject overtime
// @route   PUT /api/shifts/overtime/:id/review
exports.reviewOvertime = async (req, res) => {
  try {
    const { status } = req.body;
    const overtime = await Overtime.findByIdAndUpdate(
      req.params.id,
      { status, approvedBy: req.user._id },
      { new: true }
    ).populate('member', 'name');

    if (!overtime) return res.status(404).json({ success: false, message: 'Overtime record not found' });
    res.json({ success: true, data: overtime });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
