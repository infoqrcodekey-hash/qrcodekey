const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', protect, ctrl.getNotifications);
router.get('/unread-count', protect, ctrl.getUnreadCount);
router.get('/settings/:orgId', protect, ctrl.getSettings);
router.put('/:id/read', protect, ctrl.markAsRead);
router.put('/read-all', protect, ctrl.markAllAsRead);
router.post('/emergency', protect, ctrl.sendEmergencyBroadcast);
router.delete('/:id', protect, ctrl.deleteNotification);

module.exports = router;
