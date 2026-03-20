// ============================================
// controllers/visitorController.js
// ============================================
const Visitor = require('../models/Visitor');
const AuditLog = require('../models/AuditLog');

// @desc    Register a visitor
// @route   POST /api/visitors
exports.registerVisitor = async (req, res) => {
  try {
    const { orgId, name, phone, email, company, purpose, hostMember, hostName, vehicleNumber, itemsCarried, notes } = req.body;

    const visitor = await Visitor.create({
      organization: orgId, name, phone, email, company, purpose,
      hostMember, hostName, vehicleNumber, itemsCarried, notes,
      registeredBy: req.user._id,
      status: 'pre_registered'
    });

    await AuditLog.log({
      organization: orgId, user: req.user._id,
      action: 'visitor_checked_in',
      description: `Visitor registered: ${name} - ${purpose}`,
      targetType: 'visitor', targetId: visitor._id
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Check in visitor
// @route   PUT /api/visitors/:id/check-in
exports.checkInVisitor = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    visitor.status = 'checked_in';
    visitor.checkIn = { time: new Date(), lat, lng };
    await visitor.save();

    // Emit real-time
    if (req.io) {
      req.io.to(`org_${visitor.organization}`).emit('visitor_checkin', {
        visitorName: visitor.name, purpose: visitor.purpose, time: visitor.checkIn.time
      });
    }

    res.json({ success: true, data: visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Check out visitor
// @route   PUT /api/visitors/:id/check-out
exports.checkOutVisitor = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    visitor.status = 'checked_out';
    visitor.checkOut = { time: new Date(), lat, lng };
    await visitor.save();

    await AuditLog.log({
      organization: visitor.organization, user: req.user._id,
      action: 'visitor_checked_out',
      description: `Visitor checked out: ${visitor.name}`,
      targetType: 'visitor', targetId: visitor._id
    });

    res.json({ success: true, data: visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get today's visitors
// @route   GET /api/visitors/today/:orgId
exports.getTodayVisitors = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const visitors = await Visitor.find({
      organization: req.params.orgId,
      createdAt: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 }).populate('hostMember', 'name').lean();

    const stats = {
      total: visitors.length,
      checkedIn: visitors.filter(v => v.status === 'checked_in').length,
      checkedOut: visitors.filter(v => v.status === 'checked_out').length,
      preRegistered: visitors.filter(v => v.status === 'pre_registered').length
    };

    res.json({ success: true, data: visitors, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get visitor history
// @route   GET /api/visitors/history/:orgId
exports.getVisitorHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, search } = req.query;
    const query = { organization: req.params.orgId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } }
      ];
    }

    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('hostMember', 'name')
      .lean();

    const total = await Visitor.countDocuments(query);

    res.json({ success: true, data: visitors, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Scan visitor QR
// @route   POST /api/visitors/scan
exports.scanVisitorQR = async (req, res) => {
  try {
    const { visitorQrId } = req.body;
    const visitor = await Visitor.findOne({ visitorQrId }).populate('hostMember', 'name');
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    // Auto check-in or check-out
    if (visitor.status === 'pre_registered') {
      visitor.status = 'checked_in';
      visitor.checkIn = { time: new Date() };
      await visitor.save();
      return res.json({ success: true, data: visitor, action: 'checked_in' });
    } else if (visitor.status === 'checked_in') {
      visitor.status = 'checked_out';
      visitor.checkOut = { time: new Date() };
      await visitor.save();
      return res.json({ success: true, data: visitor, action: 'checked_out' });
    }

    res.json({ success: true, data: visitor, action: 'already_checked_out' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
