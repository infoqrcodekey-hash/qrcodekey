// ============================================
// routes/track.js - Tracking Routes
// ============================================

const express = require('express');
const router = express.Router();
const { handleScan, viewLocations, getScanInfo, activatePublic, submitFinderInfo, updateAddress } = require('../controllers/trackController');
const { scanLimiter, trackLimiter } = require('../middleware/rateLimiter');
const { validateScanLocation, validateTrackRequest } = require('../middleware/validator');
const { optionalAuth } = require('../middleware/auth');

// Public routes (No login required to scan QR)
router.get('/scan-info/:qrId', scanLimiter, getScanInfo);
router.post('/scan/:qrId', scanLimiter, validateScanLocation, handleScan);
router.post('/activate-public/:qrId', scanLimiter, activatePublic);
router.post('/finder-info/:qrId', scanLimiter, submitFinderInfo);

// Location view (Password required, login optional)
router.post('/view', trackLimiter, optionalAuth, validateTrackRequest, viewLocations);

// Update address (Password required)
router.post('/update-address', trackLimiter, updateAddress);

module.exports = router;
