// =============================================
// models/Subscription.js - Subscription Schema
// =============================================
// Tracks user subscription plans and notification usage
// Linked to Stripe for payment processing

const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  // ---------- User Reference ----------
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ---------- Stripe Info ----------
  stripeCustomerId: {
    type: String,
    index: true
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePriceId: {
    type: String
  },

  // ---------- Plan Details ----------
  plan: {
    type: String,
    enum: ['starter', 'pro', 'unlimited'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'expired'],
    default: 'active'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },

  // ---------- Notification Limits ----------
  notificationLimit: {
    type: Number,
    required: true
  },
  notificationsUsed: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },

  // ---------- Payment History ----------
  lastPaymentAmount: {
    type: Number
  },
  lastPaymentDate: {
    type: Date
  },
  currency: {
    type: String,
    default: 'usd'
  },

  // ---------- Cancellation ----------
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String
  }
}, {
  timestamps: true
});

// ====== Get plan notification limit ======
SubscriptionSchema.statics.getPlanLimit = function(plan) {
  const limits = {
    starter: 175,
    pro: 500,
    unlimited: 999999
  };
  return limits[plan] || 0;
};

// ====== Check if can send notification ======
SubscriptionSchema.methods.canSendNotification = function() {
  if (this.status !== 'active') return false;
  if (this.currentPeriodEnd < new Date()) return false;
  if (this.plan === 'unlimited') return true;
  return this.notificationsUsed < this.notificationLimit;
};

// ====== Increment notification count ======
SubscriptionSchema.methods.incrementNotification = async function() {
  this.notificationsUsed += 1;
  return this.save();
};

// ====== Reset monthly count ======
SubscriptionSchema.methods.resetMonthlyCount = async function() {
  this.notificationsUsed = 0;
  this.lastResetDate = new Date();
  return this.save();
};

// ====== Get usage percentage ======
SubscriptionSchema.methods.getUsagePercentage = function() {
  if (this.plan === 'unlimited') return 0;
  return Math.round((this.notificationsUsed / this.notificationLimit) * 100);
};

// ====== Indexes ======
SubscriptionSchema.index({ user: 1, status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
// =============================================
