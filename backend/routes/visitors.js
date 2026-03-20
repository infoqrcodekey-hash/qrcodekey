const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/visitorController');

router.post('/', protect, ctrl.registerVisitor);
router.put('/:id/check-in', protect, ctrl.checkInVisitor);
router.put('/:id/check-out', protect, ctrl.checkOutVisitor);
router.get('/today/:orgId', protect, ctrl.getTodayVisitors);
router.get('/history/:orgId', protect, ctrl.getVisitorHistory);
router.post('/scan', protect, ctrl.scanVisitorQR);

module.exports = router;
