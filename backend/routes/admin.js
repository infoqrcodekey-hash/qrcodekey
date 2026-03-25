// =============================================
// routes/admin.js - Admin Routes
// =============================================

const express = require('express');
const router = express.Router();
const { getStats, getUsers, deactivateUser, adminDeleteQR, getAllQRCodes, getSubscriptionStats, toggleBlockUser, getNotificationStats } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes are protected + admin only
router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/deactivate', deactivateUser);
router.get('/qr-codes', getAllQRCodes);
router.delete('/qr/:qrId', adminDeleteQR);
router.get('/subscription-stats', getSubscriptionStats);
router.put('/users/:id/block', toggleBlockUser);
router.get('/notification-stats', getNotificationStats);

module.exports = router;
