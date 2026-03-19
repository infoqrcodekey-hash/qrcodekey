// ============================================
// routes/analytics.js - Analytics Routes
// ============================================

const express = require('express');
const router = express.Router();
const { getAnalyticsDashboard } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

// All analytics routes are protected (Login required)
router.use(protect);

// GET analytics dashboard
router.get('/dashboard', getAnalyticsDashboard);

module.exports = router;
