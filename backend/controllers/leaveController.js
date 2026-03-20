// ============================================
// controllers/leaveController.js
// ============================================
const { Leave, LeaveBalance } = require('../models/Leave');
const Member = require('../models/Member');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');

// @desc    Apply for leave
// @route   POST /api/leave/apply
exports.applyLeave = async (req, res) => {
  try {
    const { memberId, orgId, groupId, type, startDate, endDate, reason, isHalfDay, halfDayType } = req.body;

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) totalDays = 0.5;

    // Check leave balance
    const year = start.getFullYear();
    let balance = await LeaveBalance.findOne({ member: memberId, year });
    if (!balance) {
      balance = await LeaveBalance.create({ member: memberId, organization: orgId, year });
    }

    const leaveType = type === 'half_day' ? 'casual' : type;
    if (balance.balances[leaveType] && type !== 'unpaid') {
      const remaining = balance.balances[leaveType].total - balance.balances[leaveType].used;
      if (remaining < totalDays) {
        return res.status(400).json({ success: false, message: `Insufficient ${type} leave balance. Remaining: ${remaining} days` });
      }
    }

    // Check overlapping leaves
    const overlap = await Leave.findOne({
      member: memberId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    if (overlap) return res.status(400).json({ success: false, message: 'Leave dates overlap with existing leave' });

    const leave = await Leave.create({
      member: memberId,
      organization: orgId,
      group: groupId,
      type, startDate: start, endDate: end, totalDays, reason,
      appliedBy: req.user ? req.user._id : null,
      isHalfDay: isHalfDay || false,
      halfDayType: halfDayType || null
    });

    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Approve/Reject leave
// @route   PUT /api/leave/:leaveId/review
exports.reviewLeave = async (req, res) => {
  try {
    const { status, reviewNote } = req.body; // 'approved' or 'rejected'

    const leave = await Leave.findById(req.params.leaveId).populate('member', 'name');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Leave already reviewed' });

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = reviewNote || '';
    await leave.save();

    // Update balance if approved
    if (status === 'approved') {
      const year = leave.startDate.getFullYear();
      const leaveType = leave.type === 'half_day' ? 'casual' : leave.type;
      await LeaveBalance.findOneAndUpdate(
        { member: leave.member._id, year },
        { $inc: { [`balances.${leaveType}.used`]: leave.totalDays } },
        { upsert: true }
      );
    }

    // Audit log
    await AuditLog.log({
      organization: leave.organization,
      user: req.user._id,
      action: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      description: `Leave ${status} for ${leave.member.name} (${leave.type}, ${leave.totalDays} days)`,
      targetType: 'leave',
      targetId: leave._id
    });

    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel leave
// @route   PUT /api/leave/:leaveId/cancel
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.leaveId);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status === 'cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });

    // If was approved, restore balance
    if (leave.status === 'approved') {
      const year = leave.startDate.getFullYear();
      const leaveType = leave.type === 'half_day' ? 'casual' : leave.type;
      await LeaveBalance.findOneAndUpdate(
        { member: leave.member, year },
        { $inc: { [`balances.${leaveType}.used`]: -leave.totalDays } }
      );
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get leaves for org/group
// @route   GET /api/leave/org/:orgId
exports.getOrgLeaves = async (req, res) => {
  try {
    const { status, groupId, page = 1, limit = 20 } = req.query;
    const query = { organization: req.params.orgId };
    if (status) query.status = status;
    if (groupId) query.group = groupId;

    const leaves = await Leave.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('member', 'name rollNumber qrId')
      .populate('reviewedBy', 'name')
      .lean();

    const total = await Leave.countDocuments(query);
    const pendingCount = await Leave.countDocuments({ ...query, status: 'pending' });

    res.json({ success: true, data: leaves, pendingCount, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get member leave history
// @route   GET /api/leave/member/:memberId
exports.getMemberLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ member: req.params.memberId })
      .sort({ startDate: -1 })
      .populate('reviewedBy', 'name')
      .lean();
    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get leave balance
// @route   GET /api/leave/balance/:memberId
exports.getLeaveBalance = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ member: req.params.memberId, year });
    if (!balance) {
      const member = await Member.findById(req.params.memberId);
      balance = await LeaveBalance.create({
        member: req.params.memberId,
        organization: member ? member.organization : null,
        year
      });
    }
    res.json({ success: true, data: balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get leave summary for dashboard
// @route   GET /api/leave/summary/:orgId
exports.getLeaveSummary = async (req, res) => {
  try {
    const today = new Date();
    const orgId = req.params.orgId;

    const onLeaveToday = await Leave.countDocuments({
      organization: orgId, status: 'approved',
      startDate: { $lte: today }, endDate: { $gte: today }
    });

    const pendingRequests = await Leave.countDocuments({ organization: orgId, status: 'pending' });

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthlyLeaves = await Leave.countDocuments({
      organization: orgId, status: 'approved',
      startDate: { $gte: thisMonth, $lt: nextMonth }
    });

    res.json({
      success: true,
      data: { onLeaveToday, pendingRequests, monthlyLeaves }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
