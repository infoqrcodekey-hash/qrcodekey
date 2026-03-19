// ============================================
// routes/admin.js - Admin Routes
// ============================================

const express = require('express');
const router = express.Router();
const { getStats, getUsers, deactivateUser, adminDeleteQR, getAllQRCodes } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes are protected + admin only
router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/deactivate', deactivateUser);
router.get('/qr-codes', getAllQRCodes);
router.delete('/qr/:qrId', adminDeleteQR);

module.exports = router;
