// ============================================
// controllers/paymentController.js
// Razorpay Payment Gateway - Subscription System
// ============================================

const crypto = require('crypto');
const User = require('../models/User');

// Plan configuration
const PLANS = {
  pro: {
    name: 'Pro Plan',
    price: 29900, // ₹299 in paise (Razorpay uses paise)
    duration: 30, // days
    qrLimit: 50,
    features: ['50 QR Codes', 'Email + Push Notifications', 'Priority Support']
  },
  business: {
    name: 'Business Plan',
    price: 99900, // ₹999 in paise
    duration: 30,
    qrLimit: 999999,
    features: ['Unlimited QR Codes', 'Email + SMS + Push', 'API Access', 'Priority Support']
  }
};

// ====== GET PLANS ======
// GET /api/payment/plans
exports.getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.entries(PLANS).map(([id, plan]) => ({
      id,
      ...plan,
      priceDisplay: `₹${plan.price / 100}/month`
    }))
  });
};

// ====== CREATE ORDER ======
// POST /api/payment/create-order
exports.createOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!PLANS[planId]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const plan = PLANS[planId];

    // Initialize Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.price,
      currency: 'INR',
      receipt: `order_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id.toString(),
        planId: planId,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

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

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.duration);

    const user = await User.findByIdAndUpdate(req.user.id, {
      plan: planId,
      planExpiry: expiry,
      $push: {
        paymentHistory: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          plan: planId,
          amount: plan.price / 100,
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

      if (userId && planId && PLANS[planId]) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + PLANS[planId].duration);

        await User.findByIdAndUpdate(userId, {
          plan: planId,
          planExpiry: expiry
        });
        console.log(`✅ Webhook: Plan ${planId} activated for user ${userId}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).json({ success: true }); // Always return 200 to Razorpay
  }
};
