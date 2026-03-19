// ============================================
// controllers/trackController.js - Location Tracking
// ============================================
// QR Scan handler, GPS capture, Location viewing
// This is the most important controller!

const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');
const User = require('../models/User');
const UAParser = require('ua-parser-js');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const locationService = require('../services/locationService');

// ====== QR SCAN HANDLER (PUBLIC - No Auth Required) ======
// POST /api/track/scan/:qrId
// Called when someone scans a QR code
exports.handleScan = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { latitude, longitude, accuracy, altitude } = req.body;

    // ----- Step 1: Find QR Code -----
    const qr = await QRCode.findOne({ qrId });
    
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'This QR Code is not registered'
      });
    }

    if (!qr.isActive) {
      return res.status(200).json({
        success: true,
        message: 'QR Code found but not yet activated',
        data: {
          qrId: qr.qrId,
          isActive: false,
          // To show activation form
          needsActivation: true
        }
      });
    }

    // ----- Step 2: Parse Device Info -----
    const ua = new UAParser(req.headers['user-agent']);
    const device = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      browser: `${ua.getBrowser().name || 'Unknown'} ${ua.getBrowser().version || ''}`.trim(),
      os: `${ua.getOS().name || 'Unknown'} ${ua.getOS().version || ''}`.trim(),
      deviceType: ua.getDevice().type || 'desktop',
      brand: ua.getDevice().vendor || 'Unknown'
    };

    // ----- Step 3: Capture IP Address -----
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.connection?.remoteAddress 
      || req.ip 
      || 'Unknown';

    // ----- Step 4: Determine Location -----
    let finalLat = latitude;
    let finalLng = longitude;
    let locationSource = 'gps';
    let isApproximate = false;

    // GPS not available? → Use IP-based location
    if (!latitude || !longitude) {
      const ipLocation = locationService.getLocationFromIP(ipAddress);
      if (ipLocation) {
        finalLat = ipLocation.lat;
        finalLng = ipLocation.lng;
        locationSource = 'ip';
        isApproximate = true;
      } else {
        // Use last known location (fallback)
        if (qr.lastKnownLocation && qr.lastKnownLocation.latitude) {
          finalLat = qr.lastKnownLocation.latitude;
          finalLng = qr.lastKnownLocation.longitude;
          locationSource = 'fallback';
          isApproximate = true;
        } else {
          // No location found
          finalLat = 0;
          finalLng = 0;
          locationSource = 'fallback';
          isApproximate = true;
        }
      }
    }

    // ----- Step 5: IP Location (additional info) -----
    const ipLocationData = locationService.getLocationFromIP(ipAddress);

    // ----- Step 6: Reverse Geocode (find address) -----
    let address = {
      full: 'Location captured',
      city: ipLocationData?.city || 'Unknown',
      state: ipLocationData?.region || 'Unknown',
      country: ipLocationData?.country || 'Unknown',
      pincode: null
    };

    // ----- Step 7: Save Scan Log -----
    const scanLog = await ScanLog.create({
      qrCode: qr._id,
      qrId: qr.qrId,
      location: {
        type: 'Point',
        coordinates: [finalLng, finalLat]  // MongoDB: [longitude, latitude]
      },
      latitude: finalLat,
      longitude: finalLng,
      accuracy: accuracy || null,
      altitude: altitude || null,
      address,
      locationSource,
      isApproximate,
      device,
      ipAddress,
      ipLocation: ipLocationData ? {
        city: ipLocationData.city,
        country: ipLocationData.country,
        lat: ipLocationData.lat,
        lng: ipLocationData.lng
      } : null,
      referrer: req.headers.referer || null
    });

    // ----- Step 8: Update QR Code -----
    qr.totalScans += 1;
    
    // Update last known location
    // GPS location → ALWAYS update (best quality)
    // IP location → update ONLY if no GPS location exists yet
    // This ensures "last seen" location is ALWAYS available on track page
    if (locationSource === 'gps' && finalLat !== 0) {
      qr.lastKnownLocation = {
        latitude: finalLat,
        longitude: finalLng,
        address: address.full,
        city: address.city,
        country: address.country,
        accuracy: accuracy || null,
        capturedAt: new Date(),
        source: 'gps'
      };
    } else if (finalLat !== 0 && (!qr.lastKnownLocation || !qr.lastKnownLocation.latitude)) {
      // IP-based or fallback location → save if no GPS location exists
      qr.lastKnownLocation = {
        latitude: finalLat,
        longitude: finalLng,
        address: address.full,
        city: address.city,
        country: address.country,
        accuracy: null,
        capturedAt: new Date(),
        source: locationSource
      };
    } else if (finalLat !== 0 && locationSource === 'ip') {
      // Update city/country info from IP even if GPS location exists (keep GPS coords)
      qr.lastKnownLocation.city = address.city || qr.lastKnownLocation.city;
      qr.lastKnownLocation.country = address.country || qr.lastKnownLocation.country;
      qr.lastKnownLocation.capturedAt = new Date();
    }
    
    await qr.save({ validateBeforeSave: false });

    // ----- Step 9: Real-time WebSocket Notification -----
    if (req.io) {
      req.io.to(`qr_${qr.qrId}`).emit('new_scan', {
        qrId: qr.qrId,
        location: {
          lat: finalLat,
          lng: finalLng,
          city: address.city,
          country: address.country
        },
        device: device.deviceType,
        time: new Date(),
        totalScans: qr.totalScans
      });

      // Also notify the owner
      req.io.to(`user_${qr.owner}`).emit('qr_scanned', {
        qrId: qr.qrId,
        category: qr.category,
        location: address.city,
        time: new Date()
      });
    }

    // ----- Step 10: Send Notification (Premium Users) -----
    // Runs in background (won't hold response)
    if (process.env.ENABLE_NOTIFICATIONS !== 'false') {
      notificationService.sendScanNotification(qr, scanLog).catch(err => {
        console.error('Notification Error:', err.message);
      });
    }

    // ----- Step 11: Send Email Notification -----
    // Fire and forget - async in background, doesn't delay response
    // Populate owner to get email
    if (qr.notifyEmail && qr.notifyOnScan) {
      try {
        const owner = await User.findById(qr.owner);
        if (owner && owner.email) {
          // Send email asynchronously without awaiting
          emailService.sendScanNotification(
            owner.email,
            qr.qrId,
            {
              city: address.city,
              country: address.country,
              device: device,
              deviceType: device.deviceType,
              time: new Date(),
              locationSource: locationSource,
              latitude: finalLat,
              longitude: finalLng,
              category: qr.category,
              totalScans: qr.totalScans
            }
          ).catch(err => {
            console.error('Email Notification Error:', err.message);
          });
        }
      } catch (error) {
        console.error('Error sending email notification:', error.message);
        // Don't fail the scan if email fails
      }
    }

    // ----- Response -----
    res.status(200).json({
      success: true,
      message: 'Location captured successfully! ✅',
      data: {
        qrId: qr.qrId,
        category: qr.category,
        registeredName: qr.registeredName,
        message: qr.message,
        scanCount: qr.totalScans,
        locationCaptured: !isApproximate,
        locationSource
      }
    });

  } catch (error) {
    console.error('Scan Handler Error:', error);
    res.status(500).json({
      success: false,
      message: 'Scan process error. Location may still have been saved'
    });
  }
};

// ====== VIEW LOCATION (QR ID + Password) ======
// POST /api/track/view
exports.viewLocations = async (req, res) => {
  try {
    const { qrId, password } = req.body;

    // Find QR Code (include password)
    const qr = await QRCode.findOne({ qrId }).select('+qrPassword');
    
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found. Please enter a valid QR Number'
      });
    }

    if (!qr.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This QR Code is not currently active'
      });
    }

    // Verify password
    const isMatch = await qr.matchQRPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again'
      });
    }

    // Fetch scan locations
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [scans, totalScans] = await Promise.all([
      ScanLog.find({ qrCode: qr._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-ipAddress')  // Security: Hide IP address
        .lean(),
      ScanLog.countDocuments({ qrCode: qr._id })
    ]);

    // Analytics
    const analytics = await ScanLog.getAnalytics(qr._id);

    res.status(200).json({
      success: true,
      data: {
        qrInfo: {
          qrId: qr.qrId,
          category: qr.category,
          registeredName: qr.registeredName,
          totalScans: qr.totalScans,
          isActive: qr.isActive,
          activatedAt: qr.activatedAt,
          lastKnownLocation: qr.lastKnownLocation
        },
        locations: scans.map(scan => ({
          id: scan._id,
          latitude: scan.latitude,
          longitude: scan.longitude,
          accuracy: scan.accuracy,
          address: scan.address,
          locationSource: scan.locationSource,
          isApproximate: scan.isApproximate,
          device: scan.device,
          scannedAt: scan.createdAt
        })),
        analytics,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalScans / limit),
          totalScans,
          hasMore: skip + limit < totalScans
        }
      }
    });

  } catch (error) {
    console.error('View Locations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading locations'
    });
  }
};

// ====== GET SCAN FORM (QR Scan Page Data) ======
// GET /api/track/scan-info/:qrId
exports.getScanInfo = async (req, res) => {
  try {
    const qr = await QRCode.findOne({ qrId: req.params.qrId })
      .select('qrId category registeredName message isActive');
    
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        qrId: qr.qrId,
        isActive: qr.isActive,
        category: qr.category,
        registeredName: qr.registeredName,
        message: qr.message
      }
    });

  } catch (error) {
    console.error('Scan Info Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

// ====== PUBLIC QR ACTIVATION (No Auth - Phone Scan) ======
// POST /api/track/activate-public/:qrId
exports.activatePublic = async (req, res) => {
  try {
    const { qrId } = req.params;
    const { registeredName, registeredPhone, category, message, qrPassword } = req.body;

    if (!registeredName || !registeredPhone || !qrPassword) {
      return res.status(400).json({ success: false, message: 'Naam, phone aur password zaroori hain' });
    }
    if (qrPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Password kam se kam 4 characters ka hona chahiye' });
    }

    const qr = await QRCode.findOne({ qrId });
    if (!qr) return res.status(404).json({ success: false, message: 'QR Code nahi mila' });
    if (qr.isActive) return res.status(400).json({ success: false, message: 'Ye QR Code pehle se active hai' });

    qr.registeredName = registeredName;
    qr.registeredPhone = registeredPhone;
    qr.category = category || 'other';
    qr.message = message || '';
    qr.qrPassword = qrPassword;
    qr.isActive = true;
    qr.activatedAt = new Date();
    await qr.save();

    if (req.io) {
      req.io.to(`user_${qr.owner}`).emit('qr_activated', {
        qrId: qr.qrId, category: qr.category, registeredName: qr.registeredName, activatedAt: qr.activatedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'QR Code activate ho gaya! Tracking shuru ho gayi ✅',
      data: { qrId: qr.qrId, isActive: true, category: qr.category, activatedAt: qr.activatedAt }
    });
  } catch (error) {
    console.error('Public Activate Error:', error);
    res.status(500).json({ success: false, message: 'Activation mein error aaya' });
  }
};

// ====== LIVE LOCATION STREAM (WebSocket Based) ======
// This is handled by Socket.io - setup in server.js
