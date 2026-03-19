// ============================================
// controllers/analyticsController.js - Analytics
// ============================================
// Dashboard analytics for QR codes
// Provides comprehensive scan data, trends, and insights

const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');
const mongoose = require('mongoose');

// Helper: Get date string in YYYY-MM-DD format
const getDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Get date N days ago
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ====== GET ANALYTICS DASHBOARD ======
// GET /api/analytics/dashboard
// Protected route - requires authentication
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // ===== OVERVIEW STATS =====
    const totalQRQuery = await QRCode.countDocuments({ owner: userId });
    const activeQRQuery = await QRCode.countDocuments({ owner: userId, isActive: true });
    const inactiveQRQuery = totalQRQuery - activeQRQuery;

    // Get total scans from all user's QR codes
    const allUserQRs = await QRCode.find({ owner: userId }, '_id');
    const qrIds = allUserQRs.map(qr => qr._id);

    const totalScansQuery = await ScanLog.countDocuments({ qrCode: { $in: qrIds } });

    // Today's scans
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayScansQuery = await ScanLog.countDocuments({
      qrCode: { $in: qrIds },
      createdAt: { $gte: todayStart }
    });

    // This week's scans (last 7 days)
    const weekScansQuery = await ScanLog.countDocuments({
      qrCode: { $in: qrIds },
      createdAt: { $gte: getDaysAgo(7) }
    });

    // This month's scans (last 30 days)
    const monthScansQuery = await ScanLog.countDocuments({
      qrCode: { $in: qrIds },
      createdAt: { $gte: getDaysAgo(30) }
    });

    // ===== SCAN TREND (Last 30 days) =====
    const thirtyDaysAgo = getDaysAgo(30);

    const scanTrendData = await ScanLog.aggregate([
      {
        $match: {
          qrCode: { $in: qrIds },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing dates with 0
    const scanTrend = [];
    for (let i = 0; i < 30; i++) {
      const date = getDaysAgo(30 - i);
      const dateStr = getDateString(date);
      const found = scanTrendData.find(item => item._id === dateStr);
      scanTrend.push({
        date: dateStr,
        count: found ? found.count : 0
      });
    }

    // ===== TOP LOCATIONS (Cities) =====
    const topLocations = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: {
            city: '$address.city',
            country: '$address.country'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          country: '$_id.country',
          count: 1
        }
      }
    ]);

    // ===== DEVICE BREAKDOWN =====
    const deviceBreakdown = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: '$device.deviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    const deviceBreakdownFormatted = {
      mobile: 0,
      desktop: 0,
      tablet: 0
    };

    deviceBreakdown.forEach(item => {
      const deviceType = (item._id || 'unknown').toLowerCase();
      if (deviceType === 'mobile') deviceBreakdownFormatted.mobile += item.count;
      else if (deviceType === 'desktop') deviceBreakdownFormatted.desktop += item.count;
      else if (deviceType === 'tablet') deviceBreakdownFormatted.tablet += item.count;
    });

    // ===== BROWSER BREAKDOWN (Top 5) =====
    const browserBreakdown = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: '$device.browser',
          count: { $sum: 1 }
        }
      },
      {
        $match: { _id: { $ne: 'Unknown' } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          browser: '$_id',
          count: 1
        }
      }
    ]);

    // ===== OS BREAKDOWN (Top 5) =====
    const osBreakdown = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: '$device.os',
          count: { $sum: 1 }
        }
      },
      {
        $match: { _id: { $ne: 'Unknown' } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          os: '$_id',
          count: 1
        }
      }
    ]);

    // ===== CATEGORY DISTRIBUTION =====
    const categoryDistribution = await QRCode.aggregate([
      {
        $match: { owner: new mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1
        }
      }
    ]);

    // ===== HOURLY DISTRIBUTION =====
    const hourlyDistribution = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: {
            $hour: '$createdAt'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in all 24 hours with 0 if missing
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      const found = hourlyDistribution.find(item => item._id === hour);
      hourlyData.push({
        hour,
        count: found ? found.count : 0
      });
    }

    // ===== COUNTRY DISTRIBUTION (Top 10) =====
    const countryDistribution = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $group: {
          _id: '$address.country',
          count: { $sum: 1 }
        }
      },
      {
        $match: { _id: { $ne: 'Unknown' } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          country: '$_id',
          count: 1
        }
      }
    ]);

    // ===== RECENT ACTIVITY (Last 10 scans) =====
    const recentActivity = await ScanLog.aggregate([
      {
        $match: { qrCode: { $in: qrIds } }
      },
      {
        $lookup: {
          from: 'qrcodes',
          localField: 'qrCode',
          foreignField: '_id',
          as: 'qrCodeData'
        }
      },
      {
        $unwind: '$qrCodeData'
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          qrId: 1,
          location: {
            city: '$address.city',
            country: '$address.country',
            latitude: '$latitude',
            longitude: '$longitude'
          },
          device: {
            browser: '$device.browser',
            os: '$device.os',
            deviceType: '$device.deviceType'
          },
          qrCodeCategory: '$qrCodeData.category',
          createdAt: 1
        }
      }
    ]);

    // ===== RESPONSE =====
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalQR: totalQRQuery,
          activeQR: activeQRQuery,
          inactiveQR: inactiveQRQuery,
          totalScans: totalScansQuery,
          todayScans: todayScansQuery,
          weekScans: weekScansQuery,
          monthScans: monthScansQuery
        },
        scanTrend,
        topLocations,
        deviceBreakdown: deviceBreakdownFormatted,
        browserBreakdown,
        osBreakdown,
        categoryDistribution,
        hourlyDistribution: hourlyData,
        countryDistribution,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Analytics Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics dashboard',
      error: error.message
    });
  }
};
