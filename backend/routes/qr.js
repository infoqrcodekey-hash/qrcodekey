// ============================================
// routes/qr.js - QR Code Routes
// ============================================

const express = require('express');
const router = express.Router();
const {
  generateQR, activateQR, getMyQRCodes, getQRCode,
  downloadQR, deleteQR, deactivateQR,
  bulkGenerateQR, generateCustomQR
} = require('../controllers/qrController');
const { protect } = require('../middleware/auth');
const { generateLimiter } = require('../middleware/rateLimiter');
const { validateQRCreate, validateQRActivate } = require('../middleware/validator');

// All routes are protected (Login required)
router.use(protect);

router.post('/generate', generateLimiter, validateQRCreate, generateQR);
router.post('/bulk-generate', generateLimiter, bulkGenerateQR);
router.post('/generate-custom', generateLimiter, generateCustomQR);
router.get('/my-codes', getMyQRCodes);
router.get('/:qrId', getQRCode);
router.get('/:qrId/download', downloadQR);
router.put('/:qrId/activate', validateQRActivate, activateQR);
router.put('/:qrId/deactivate', deactivateQR);
router.delete('/:qrId', deleteQR);

module.exports = router;
