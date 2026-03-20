const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/auditLogController');

router.get('/:orgId', protect, ctrl.getAuditLogs);
router.get('/:orgId/summary', protect, ctrl.getAuditSummary);

module.exports = router;
