const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/leaveController');

router.post('/apply', protect, ctrl.applyLeave);
router.put('/:leaveId/review', protect, ctrl.reviewLeave);
router.put('/:leaveId/cancel', protect, ctrl.cancelLeave);
router.get('/org/:orgId', protect, ctrl.getOrgLeaves);
router.get('/member/:memberId', protect, ctrl.getMemberLeaves);
router.get('/balance/:memberId', protect, ctrl.getLeaveBalance);
router.get('/summary/:orgId', protect, ctrl.getLeaveSummary);

module.exports = router;
