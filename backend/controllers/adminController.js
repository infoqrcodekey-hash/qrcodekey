// ============================================
// controllers/adminController.js - Admin Dashboard
// ============================================
// Admin: Users manage, Analytics, QR manage

const User = require('../models/User');
const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');

// ====== DASHBOARD STATS ======
// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalQRCodes,
      activeQRCodes,
      totalScans,
      premiumUsers,
      recentUsers,
      recentScans
    ] = await Promise.all([
      User.countDocuments(),
      QRCode.countDocuments(),
      QRCode.countDocuments({ isActive: true }),
      ScanLog.countDocuments(),
      User.countDocuments({ plan: { $ne: 'free' } }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email plan createdAt').lean(),
      ScanLog.find().sort({ createdAt: -1 }).limit(10)
        .select('qrId address.city device.deviceType createdAt').lean()
    ]);

    // Revenue estimate
    const proUsers = await User.countDocuments({ plan: 'pro' });
    const businessUsers = await User.countDocuments({ plan: 'business' });
    const estimatedRevenue = (proUsers * 299) + (businessUsers * 999);

    // Scans per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyScans = await ScanLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category distribution
    const categoryStats = await QRCode.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalQRCodes,
          activeQRCodes,
          totalScans,
          premiumUsers,
          estimatedRevenue: `$${estimatedRevenue}`
        },
        charts: {
          dailyScans,
          categoryStats
        },
        recent: {
          users: recentUsers,
          scans: recentScans
        }
      }
    });

  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Error loading stats' });
  }
};

// ====== LIST ALL USERS ======
// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query)
    ]);

    // Get QR count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const qrCount = await QRCode.countDocuments({ owner: user._id });
        const scanCount = await ScanLog.countDocuments({
          qrCode: { $in: await QRCode.find({ owner: user._id }).distinct('_id') }
        });
        return { ...user, qrCount, scanCount };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithStats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ success: false, message: 'Error loading users' });
  }
};

// ====== DEACTIVATE USER ======
// PUT /api/admin/users/:id/deactivate
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `${user.name}'s account has been deactivated`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// ====== ADMIN: DELETE QR CODE ======
// DELETE /api/admin/qr/:qrId
exports.adminDeleteQR = async (req, res) => {
  try {
    const qr = await QRCode.findOne({ qrId: req.params.qrId });
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Code not found' });
    }

    await Promise.all([
      QRCode.deleteOne({ _id: qr._id }),
      ScanLog.deleteMany({ qrCode: qr._id })
    ]);

    res.status(200).json({
      success: true,
      message: `QR ${qr.qrId} has been deleted`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// ====== ALL QR CODES (Admin View) ======
// GET /api/admin/qr-codes
exports.getAllQRCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [qrCodes, total] = await Promise.all([
      QRCode.find()
        .populate('owner', 'name email plan')
        .select('-qrPassword')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      QRCode.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: qrCodes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// ====== SUBSCRIPTION ANALYTICS (Admin) ======
// GET /api/admin/subscription-stats
exports.getSubscriptionStats = async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    
    const [activeCount, totalRevenue, planBreakdown] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$lastPaymentAmount' } } }
      ]),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ])
    ]);

    const plans = {};
    planBreakdown.forEach(p => { plans[p._id] = p.count; });

    res.status(200).json({
      success: true,
      data: {
        activeSubscriptions: activeCount,
        monthlyRevenue: totalRevenue[0]?.total || 0,
        planBreakdown: plans,
        starter: plans.starter || 0,
        pro: plans.pro || 0,
        unlimited: plans.unlimited || 0
      }
    });
  } catch (error) {
    console.error('Admin subscription stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription stats' });
  }
};

// ====== BLOCK/UNBLOCK USER (Admin) ======
// PUT /api/admin/users/:id/block
exports.toggleBlockUser = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: user.isBlocked ? 'User blocked' : 'User unblocked',
      isBlocked: user.isBlocked
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// ====== NOTIFICATION ANALYTICS (Admin) ======
// GET /api/admin/notification-stats
exports.getNotificationStats = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const Subscription = require('../models/Subscription');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalNotifications, todayCount, monthCount, totalUsage] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ createdAt: { $gte: today } }),
      Notification.countDocuments({ createdAt: { $gte: thisMonth } }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalUsed: { $sum: '$notificationsUsed' }, totalLimit: { $sum: '$notificationLimit' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalNotifications,
        todayCount,
        monthCount,
        totalUsed: totalUsage[0]?.totalUsed || 0,
        totalLimit: totalUsage[0]?.totalLimit || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get notification stats' });
  }
};
