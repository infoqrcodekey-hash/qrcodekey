const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.get('/monthly/:orgId', protect, ctrl.getMonthlyReport);
router.get('/summary/:orgId', protect, ctrl.getAttendanceSummary);
router.get('/member/:memberId', protect, ctrl.getMemberReport);

module.exports = router;
