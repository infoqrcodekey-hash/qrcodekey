// ============================================
// controllers/exportController.js
// Export scan data as CSV or JSON
// ============================================

const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');

// ====== EXPORT SCAN DATA AS CSV ======
// GET /api/export/csv/:qrId?password=xxxx
exports.exportCSV = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { password } = req.query;

    // Find QR and verify password
    const qr = await QRCode.findOne({ qrId }).select('+qrPassword');
    if (!qr) return res.status(404).json({ success: false, message: 'QR Code not found' });
    if (!qr.isActive) return res.status(400).json({ success: false, message: 'QR Code is not active' });

    const isMatch = await qr.matchQRPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });

    // Get all scans
    const scans = await ScanLog.find({ qrCode: qr._id }).sort({ createdAt: -1 }).lean();

    // Build CSV
    const headers = ['Date', 'Time', 'City', 'State', 'Country', 'Latitude', 'Longitude', 'Accuracy (m)', 'Source', 'Device', 'Browser', 'OS'];
    const rows = scans.map(s => {
      const d = new Date(s.createdAt);
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleTimeString('en-US'),
        s.address?.city || 'Unknown',
        s.address?.state || 'Unknown',
        s.address?.country || 'Unknown',
        s.latitude?.toFixed(6) || 0,
        s.longitude?.toFixed(6) || 0,
        s.accuracy?.toFixed(0) || 'N/A',
        s.locationSource || 'unknown',
        s.device?.deviceType || 'unknown',
        s.device?.browser || 'unknown',
        s.device?.os || 'unknown'
      ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=QR-${qrId}-scans.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export CSV Error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// ====== EXPORT SCAN DATA AS JSON ======
// GET /api/export/json/:qrId?password=xxxx
exports.exportJSON = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { password } = req.query;

    const qr = await QRCode.findOne({ qrId }).select('+qrPassword');
    if (!qr) return res.status(404).json({ success: false, message: 'QR Code not found' });

    const isMatch = await qr.matchQRPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });

    const scans = await ScanLog.find({ qrCode: qr._id })
      .sort({ createdAt: -1 })
      .select('-ipAddress -__v')
      .lean();

    const analytics = await ScanLog.getAnalytics(qr._id);

    const report = {
      generatedAt: new Date().toISOString(),
      qrCode: {
        id: qr.qrId,
        category: qr.category,
        registeredName: qr.registeredName,
        totalScans: qr.totalScans,
        activatedAt: qr.activatedAt,
        lastKnownLocation: qr.lastKnownLocation
      },
      analytics,
      scans: scans.map(s => ({
        date: s.createdAt,
        location: { lat: s.latitude, lng: s.longitude, city: s.address?.city, country: s.address?.country },
        accuracy: s.accuracy,
        source: s.locationSource,
        device: s.device
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=QR-${qrId}-report.json`);
    res.json(report);

  } catch (error) {
    console.error('Export JSON Error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};
