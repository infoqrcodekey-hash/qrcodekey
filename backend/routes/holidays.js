const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/holidayController');

router.post('/', protect, ctrl.addHoliday);
router.get('/:orgId', protect, ctrl.getHolidays);
router.get('/upcoming/:orgId', protect, ctrl.getUpcoming);
router.get('/check/:orgId', protect, ctrl.isHoliday);
router.put('/:id', protect, ctrl.updateHoliday);
router.delete('/:id', protect, ctrl.deleteHoliday);

module.exports = router;
