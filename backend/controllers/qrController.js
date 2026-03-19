// ============================================
// controllers/qrController.js - QR Code Operations
// ============================================
// Generate, Activate, Download, List, Delete QR Codes

const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');
const qrcode = require('qrcode');

// ====== GENERATE NEW QR CODE ======
// POST /api/qr/generate
exports.generateQR = async (req, res) => {
  try {
    const { category, qrPassword, registeredName, registeredEmail, registeredPhone, message } = req.body;

    // Check QR limit
    const userQRCount = await QRCode.countDocuments({ owner: req.user._id });
    const qrLimit = req.user.getQRLimit();
    
    if (userQRCount >= qrLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your QR code limit. Please upgrade your plan`,
        currentCount: userQRCount,
        limit: qrLimit
      });
    }

    // Generate unique QR ID
    let qrId = QRCode.generateQRId();
    
    // Ensure unique
    while (await QRCode.findOne({ qrId })) {
      qrId = QRCode.generateQRId();
    }

    // Create scan URL (this URL is encoded in the QR code)
    const scanUrl = `${process.env.FRONTEND_URL}/scan/${qrId}`;

    // Generate QR Code image (Base64)
    const qrImageBase64 = await qrcode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'  // High error correction
    });

    // Save to database
    const newQR = await QRCode.create({
      qrId,
      owner: req.user._id,
      category: category || 'other',
      qrPassword,
      registeredName,
      registeredEmail,
      registeredPhone,
      message,
      qrImageUrl: qrImageBase64,
      isActive: false  // Will activate when form is submitted
    });

    res.status(201).json({
      success: true,
      message: 'QR Code generated successfully! 🎉',
      data: {
        qrId: newQR.qrId,
        scanUrl,
        qrImage: qrImageBase64,
        category: newQR.category,
        isActive: newQR.isActive,
        createdAt: newQR.createdAt
      }
    });

  } catch (error) {
    console.error('Generate QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating QR Code'
    });
  }
};

// ====== ACTIVATE QR CODE (Form Submit) ======
// PUT /api/qr/:qrId/activate
exports.activateQR = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { registeredName, registeredEmail, registeredPhone, category, message, qrPassword } = req.body;

    const qr = await QRCode.findOne({ qrId, owner: req.user._id });
    
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found'
      });
    }

    if (qr.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This QR Code is already active'
      });
    }

    // Update
    qr.registeredName = registeredName;
    qr.registeredEmail = registeredEmail;
    qr.registeredPhone = registeredPhone;
    qr.category = category;
    qr.message = message;
    qr.isActive = true;
    qr.activatedAt = new Date();
    
    // Update password (if new one provided)
    if (qrPassword) {
      qr.qrPassword = qrPassword;
    }

    await qr.save();

    // Emit socket event (real-time update)
    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('qr_activated', {
        qrId: qr.qrId,
        category: qr.category,
        activatedAt: qr.activatedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'QR Code activated! Location tracking started ✅',
      data: {
        qrId: qr.qrId,
        isActive: qr.isActive,
        category: qr.category,
        activatedAt: qr.activatedAt
      }
    });

  } catch (error) {
    console.error('Activate QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating QR Code'
    });
  }
};

// ====== GET MY QR CODES ======
// GET /api/qr/my-codes
exports.getMyQRCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [qrCodes, total] = await Promise.all([
      QRCode.find({ owner: req.user._id })
        .select('-qrPassword')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QRCode.countDocuments({ owner: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      count: qrCodes.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: qrCodes
    });

  } catch (error) {
    console.error('Get QR Codes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading QR Codes'
    });
  }
};

// ====== GET SINGLE QR CODE DETAILS ======
// GET /api/qr/:qrId
exports.getQRCode = async (req, res) => {
  try {
    const qr = await QRCode.findOne({ 
      qrId: req.params.qrId, 
      owner: req.user._id 
    }).select('-qrPassword').lean();

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found'
      });
    }

    // Also fetch recent scans
    const recentScans = await ScanLog.find({ qrCode: qr._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Analytics
    const analytics = await ScanLog.getAnalytics(qr._id);

    res.status(200).json({
      success: true,
      data: {
        ...qr,
        recentScans,
        analytics
      }
    });

  } catch (error) {
    console.error('Get QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading QR Code details'
    });
  }
};

// ====== DOWNLOAD QR CODE IMAGE ======
// GET /api/qr/:qrId/download
exports.downloadQR = async (req, res) => {
  try {
    const qr = await QRCode.findOne({ 
      qrId: req.params.qrId, 
      owner: req.user._id 
    });

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found'
      });
    }

    // Generate high quality PNG
    const scanUrl = `${process.env.FRONTEND_URL}/scan/${qr.qrId}`;
    const pngBuffer = await qrcode.toBuffer(scanUrl, {
      width: 1024,
      margin: 3,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename=QR-${qr.qrId}.png`,
      'Content-Length': pngBuffer.length
    });

    res.send(pngBuffer);

  } catch (error) {
    console.error('Download QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading QR Code'
    });
  }
};

// ====== DELETE QR CODE ======
// DELETE /api/qr/:qrId
exports.deleteQR = async (req, res) => {
  try {
    const qr = await QRCode.findOne({ 
      qrId: req.params.qrId, 
      owner: req.user._id 
    });

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found'
      });
    }

    // Delete QR and all its scan logs
    await Promise.all([
      QRCode.deleteOne({ _id: qr._id }),
      ScanLog.deleteMany({ qrCode: qr._id })
    ]);

    res.status(200).json({
      success: true,
      message: 'QR Code and all scan data deleted'
    });

  } catch (error) {
    console.error('Delete QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting QR Code'
    });
  }
};

// ====== BULK QR CODE GENERATION ======
// POST /api/qr/bulk-generate
exports.bulkGenerateQR = async (req, res) => {
  try {
    const { count = 5, category = 'other', prefix = '' } = req.body;
    const qty = Math.min(Math.max(parseInt(count) || 1, 1), 100); // max 100 at a time

    // Check plan limits
    const userQRCount = await QRCode.countDocuments({ owner: req.user._id });
    const qrLimit = req.user.getQRLimit();
    const remaining = qrLimit - userQRCount;

    if (remaining <= 0) {
      return res.status(403).json({ success: false, message: 'QR code limit reached. Please upgrade your plan.' });
    }
    const toGenerate = Math.min(qty, remaining);

    const generated = [];
    for (let i = 0; i < toGenerate; i++) {
      let qrId = prefix ? `${prefix.toUpperCase()}-${QRCode.generateQRId().replace('QR-', '')}` : QRCode.generateQRId();
      while (await QRCode.findOne({ qrId })) {
        qrId = prefix ? `${prefix.toUpperCase()}-${QRCode.generateQRId().replace('QR-', '')}` : QRCode.generateQRId();
      }
      const scanUrl = `${process.env.FRONTEND_URL}/scan/${qrId}`;
      const qrImageBase64 = await qrcode.toDataURL(scanUrl, {
        width: 400, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' }, errorCorrectionLevel: 'H'
      });
      const newQR = await QRCode.create({
        qrId, owner: req.user._id, category, qrPassword: `BulkQR-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,4)}`,
        qrImageUrl: qrImageBase64, isActive: false
      });
      generated.push({ qrId: newQR.qrId, scanUrl, qrImage: qrImageBase64, category: newQR.category });
    }

    res.status(201).json({
      success: true,
      message: `${generated.length} QR Codes generated successfully! 🎉`,
      data: { generated, count: generated.length, requested: qty, limit: toGenerate }
    });
  } catch (error) {
    console.error('Bulk Generate Error:', error);
    res.status(500).json({ success: false, message: 'Error in bulk QR generation' });
  }
};

// ====== CUSTOM QR CODE (Colors + Style) ======
// POST /api/qr/generate-custom
exports.generateCustomQR = async (req, res) => {
  try {
    const { category, qrPassword, registeredName, registeredEmail, registeredPhone, message,
      darkColor = '#1a1a2e', lightColor = '#ffffff', size = 400 } = req.body;

    const userQRCount = await QRCode.countDocuments({ owner: req.user._id });
    if (userQRCount >= req.user.getQRLimit()) {
      return res.status(403).json({ success: false, message: 'QR limit reached. Please upgrade your plan.' });
    }

    let qrId = QRCode.generateQRId();
    while (await QRCode.findOne({ qrId })) { qrId = QRCode.generateQRId(); }

    const scanUrl = `${process.env.FRONTEND_URL}/scan/${qrId}`;
    const validSize = Math.min(Math.max(parseInt(size) || 400, 200), 1000);

    // Validate hex colors
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    const dark = hexRegex.test(darkColor) ? darkColor : '#1a1a2e';
    const light = hexRegex.test(lightColor) ? lightColor : '#ffffff';

    const qrImageBase64 = await qrcode.toDataURL(scanUrl, {
      width: validSize, margin: 2,
      color: { dark, light },
      errorCorrectionLevel: 'H'
    });

    const newQR = await QRCode.create({
      qrId, owner: req.user._id, category: category || 'other',
      qrPassword, registeredName, registeredEmail, registeredPhone, message,
      qrImageUrl: qrImageBase64, isActive: false
    });

    res.status(201).json({
      success: true,
      message: 'Custom QR Code generated successfully! 🎨',
      data: { qrId: newQR.qrId, scanUrl, qrImage: qrImageBase64, category: newQR.category, isActive: false }
    });
  } catch (error) {
    console.error('Custom QR Error:', error);
    res.status(500).json({ success: false, message: 'Error in custom QR generation' });
  }
};

// ====== DEACTIVATE QR CODE ======
// PUT /api/qr/:qrId/deactivate
exports.deactivateQR = async (req, res) => {
  try {
    const qr = await QRCode.findOneAndUpdate(
      { qrId: req.params.qrId, owner: req.user._id },
      { isActive: false },
      { new: true }
    ).select('-qrPassword');

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Code not found' });
    }

    res.status(200).json({
      success: true,
      message: 'QR Code deactivated',
      data: qr
    });

  } catch (error) {
    console.error('Deactivate Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};
