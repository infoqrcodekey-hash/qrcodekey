// routes/export.js - Export Report Routes
const express = require('express');
const router = express.Router();
const { exportCSV, exportJSON } = require('../controllers/exportController');
const { trackLimiter } = require('../middleware/rateLimiter');

router.get('/csv/:qrId', trackLimiter, exportCSV);
router.get('/json/:qrId', trackLimiter, exportJSON);

module.exports = router;
