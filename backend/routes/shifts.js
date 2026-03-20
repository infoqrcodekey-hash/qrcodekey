const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/shiftController');

router.post('/', protect, ctrl.createShift);
router.get('/:orgId', protect, ctrl.getShifts);
router.put('/:id', protect, ctrl.updateShift);
router.delete('/:id', protect, ctrl.deleteShift);
router.post('/overtime', protect, ctrl.logOvertime);
router.get('/overtime/:orgId', protect, ctrl.getOvertimeRecords);
router.put('/overtime/:id/review', protect, ctrl.reviewOvertime);

module.exports = router;
