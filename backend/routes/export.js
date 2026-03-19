// routes/export.js - Export Report Routes
const express = require('express');
const router = express.Router();
const { exportCSV, exportJSON } = require('../controllers/exportController');
const { trackLimiter } = require('../middleware/rateLimiter');

// Use POST instead of GET for security (passwords in body, not query string)
router.post('/csv/:qrId', trackLimiter, exportCSV);
router.post('/json/:qrId', trackLimiter, exportJSON);

module.exports = router;
