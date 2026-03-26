// ============================================
// controllers/paymentController.js
// Razorpay Payment Gateway - Subscription System
// ============================================

const crypto = require('crypto');
const User = require('../models/User');

// Plan configuration - Notification Subscription Plans
// USD pricing: Starter $1.99, Pro $4.99, Unlimited $9.99
// Razorpay uses INR (paise) — converted at approx ₹83/USD
const PLANS = {
  starter: {
    name: 'Starter Plan',
    monthly: { price: 16500, duration: 30 },    // ~$1.99 = ₹82
    yearly: { price: 158500, duration: 365 },    // ~$19.10 = ₹788 (20% off)
    notifyQRLimit: 175,
    features: ['175 Notification Credits', 'Email + Push Alerts', 'GPS Location in Alert']
  },
  pro: {
    name: 'Pro Plan',
    monthly: { price: 41400, duration: 30 },    // ~$4.99 = ₹414
    yearly: { price: 347700, duration: 365 },   // ~$41.90 = ₹3477 (30% off)
    notifyQRLimit: 500,
    features: ['500 Notification Credits', 'Email + SMS + Push Alerts', 'Priority Support']
  },
  unlimited: {
    name: 'Unlimited Plan',
    monthly: { price: 82900, duration: 30 },   // ~$14.99 = ₹1244
    yearly: { price: 497900, duration: 365 },   // ~$89.99 = ₹7469 (50% off)
    notifyQRLimit: 999999,
    features: ['Unlimited Notification Credits', 'Email + SMS + Push', 'API Access', 'Dedicated Support']
  }
};

// ====== GET PLANS ======
// GET /api/payment/plans
exports.getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      monthlyPrice: plan.monthly.price / 100,
      yearlyPrice: plan.yearly.price / 100,
      notifyQRLimit: plan.notifyQRLimit,
      features: plan.features
    }))
  });
};

// ====== CREATE ORDER ======
// POST /api/payment/create-order
exports.createOrder = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body;

    if (!PLANS[planId]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const plan = PLANS[planId];
    const billing = billingCycle === 'yearly' ? plan.yearly : plan.monthly;

    // Initialize Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: billing.price,
      currency: 'INR',
      receipt: `order_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id.toString(),
        planId: planId,
        billingCycle: billingCycle,
        userName: req.user.name,
        userEmail: req.user.email
      }
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planName: plan.name,
        billingCycle,
        keyId: process.env.RAZORPAY_KEY_ID,
        user: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || ''
        }
      }
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ success: false, message: 'Error creating payment order' });
  }
};

// ====== VERIFY PAYMENT ======
// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle = 'monthly' } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Payment verified! Update user plan
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const billing = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + billing.duration);

    const user = await User.findByIdAndUpdate(req.user.id, {
      plan: planId,
      billingCycle: billingCycle,
      planExpiry: expiry,
      $push: {
        paymentHistory: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          plan: planId,
          amount: billing.price / 100,
          currency: 'INR',
          status: 'paid',
          paidAt: new Date()
        }
      }
    }, { new: true });

    res.status(200).json({
      success: true,
      message: `${plan.name} activated successfully! 🎉`,
      data: {
        plan: user.plan,
        billingCycle: user.billingCycle,
        planExpiry: user.planExpiry,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
};

// ====== PAYMENT HISTORY ======
// GET /api/payment/history
exports.getPaymentHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentHistory plan planExpiry');
    res.status(200).json({
      success: true,
      data: {
        currentPlan: user.plan,
        planExpiry: user.planExpiry,
        history: user.paymentHistory || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error loading payment history' });
  }
};

// ====== RAZORPAY WEBHOOK (Server-to-Server) ======
// POST /api/payment/webhook
exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const generated = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== generated) {
        return res.status(400).json({ success: false });
      }
    }

    const event = req.body.event;
    const payment = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && payment) {
      const userId = payment.notes?.userId;
      const planId = payment.notes?.planId;
      const billingCycle = payment.notes?.billingCycle || 'monthly';

      if (userId && planId && PLANS[planId]) {
        const billing = billingCycle === 'yearly' ? PLANS[planId].yearly : PLANS[planId].monthly;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + billing.duration);

        await User.findByIdAndUpdate(userId, {
          plan: planId,
          billingCycle: billingCycle,
          planExpiry: expiry
        });
        console.log(`✅ Webhook: Plan ${planId} (${billingCycle}) activated for user ${userId}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).json({ success: true }); // Always return 200 to Razorpay
  }
};
