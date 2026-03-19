// ============================================
// routes/payment.js - Payment Routes
// ============================================

const express = require('express');
const router = express.Router();
const { getPlans, createOrder, verifyPayment, getPaymentHistory, webhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public
router.get('/plans', getPlans);
router.post('/webhook', webhook); // Razorpay server-to-server

// Protected (Login required)
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);

module.exports = router;
