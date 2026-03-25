const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createCheckout,
  getStatus,
  cancelSubscription,
  stripeWebhook,
  getPlans
} = require('../controllers/subscriptionController');

// ====== Public Routes ======
// Get available plans (no auth needed)
router.get('/plans', getPlans);

// Stripe webhook (must use raw body, no auth)
// Note: This route should be registered BEFORE express.json() middleware
// in server.js using: app.post('/api/subscription/webhook', express.raw({type: 'application/json'}), stripeWebhook)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ====== Protected Routes (login required) ======
router.post('/create-checkout', protect, createCheckout);
router.get('/status', protect, getStatus);
router.post('/cancel', protect, cancelSubscription);

module.exports = router;
