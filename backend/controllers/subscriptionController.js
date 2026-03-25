// =============================================
// controllers/subscriptionController.js
// =============================================
// Stripe subscription management

const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Plan pricing configuration
const PLANS = {
  starter: { price: 199, notifications: 175, name: 'Starter' },
  pro: { price: 499, notifications: 500, name: 'Pro' },
  unlimited: { price: 999, notifications: 999999, name: 'Unlimited' }
};

// ====== CREATE CHECKOUT SESSION ======
// POST /api/subscription/create-checkout
exports.createCheckout = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Choose: starter, pro, or unlimited' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create or get Stripe customer
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: { userId: req.user._id.toString() }
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'QRCodeKey ' + PLANS[plan].name + ' Plan' },
          unit_amount: PLANS[plan].price,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      metadata: { userId: req.user._id.toString(), plan: plan },
      success_url: process.env.FRONTEND_URL + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.FRONTEND_URL + '/subscription/cancel'
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Create Checkout Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
};

// ====== GET SUBSCRIPTION STATUS ======
// GET /api/subscription/status
exports.getStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return res.json({
        success: true,
        hasSubscription: false,
        plan: 'free',
        notificationsUsed: 0,
        notificationLimit: 0,
        usagePercentage: 0
      });
    }

    res.json({
      success: true,
      hasSubscription: true,
      plan: subscription.plan,
      status: subscription.status,
      notificationsUsed: subscription.notificationsUsed,
      notificationLimit: subscription.notificationLimit,
      usagePercentage: subscription.getUsagePercentage(),
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysUntilReset: Math.ceil((subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (err) {
    console.error('Get Status Error:', err);
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
};

// ====== CANCEL SUBSCRIPTION ======
// POST /api/subscription/cancel
exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No active subscription found' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    subscription.cancelledAt = new Date();
    subscription.cancelReason = req.body.reason || 'User requested';
    await subscription.save();

    res.json({ success: true, message: 'Subscription will be cancelled at end of billing period' });
  } catch (err) {
    console.error('Cancel Subscription Error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};

// ====== STRIPE WEBHOOK ======
// POST /api/subscription/webhook
exports.stripeWebhook = async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.metadata.plan;
        const stripeSubId = session.subscription;

        // Get subscription details from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

        // Create subscription record
        await Subscription.create({
          user: userId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: stripeSubId,
          stripePriceId: stripeSub.items.data[0].price.id,
          plan: plan,
          status: 'active',
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          notificationLimit: Subscription.getPlanLimit(plan),
          lastPaymentAmount: session.amount_total,
          lastPaymentDate: new Date()
        });

        // Update user plan
        await User.findByIdAndUpdate(userId, {
          plan: plan,
          planExpiry: new Date(stripeSub.current_period_end * 1000)
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
        if (sub) {
          const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
          sub.status = 'active';
          sub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
          sub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
          sub.notificationsUsed = 0;
          sub.lastResetDate = new Date();
          sub.lastPaymentAmount = invoice.amount_paid;
          sub.lastPaymentDate = new Date();
          await sub.save();

          await User.findByIdAndUpdate(sub.user, {
            planExpiry: new Date(stripeSub.current_period_end * 1000)
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub = await Subscription.findOne({ stripeSubscriptionId: invoice.subscription });
        if (sub) {
          sub.status = 'past_due';
          await sub.save();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
        if (sub) {
          sub.status = 'expired';
          await sub.save();
          await User.findByIdAndUpdate(sub.user, { plan: 'free', planExpiry: null });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ====== GET PLANS ======
// GET /api/subscription/plans
exports.getPlans = async (req, res) => {
  res.json({
    success: true,
    plans: Object.entries(PLANS).map(([key, val]) => ({
      id: key,
      name: val.name,
      price: val.price / 100,
      notifications: val.notifications === 999999 ? 'Unlimited' : val.notifications,
      currency: 'USD'
    }))
  });
};
// =============================================
