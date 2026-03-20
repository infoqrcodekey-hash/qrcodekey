// ============================================
// controllers/auditLogController.js
// ============================================
const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs for organization
// @route   GET /api/audit/:orgId
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    const query = { organization: req.params.orgId };

    if (action) query.action = action;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true, data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get audit log summary (action counts)
// @route   GET /api/audit/:orgId/summary
exports.getAuditSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const summary = await AuditLog.aggregate([
      { $match: { organization: new require('mongoose').Types.ObjectId(req.params.orgId), createdAt: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalActions = summary.reduce((acc, s) => acc + s.count, 0);

    // Get most active users
    const activeUsers = await AuditLog.aggregate([
      { $match: { organization: new require('mongoose').Types.ObjectId(req.params.orgId), createdAt: { $gte: since } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      { $project: { count: 1, name: '$userInfo.name', email: '$userInfo.email' } }
    ]);

    res.json({ success: true, data: { summary, totalActions, activeUsers, period: `${days} days` } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
