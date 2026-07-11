/**
 * Billing & subscription routes.
 *
 *  GET  /api/billing/plans        - public plan catalogue
 *  GET  /api/billing/me           - current user's subscription + entitlements
 *  POST /api/billing/checkout     - create a payment order for a plan
 *  POST /api/billing/verify       - verify checkout payment & activate plan
 *  POST /api/billing/webhook      - Razorpay webhook (raw body, signature verified)
 *  POST /api/billing/cancel       - cancel at period end
 *  POST /api/billing/dev-activate - DEV ONLY: simulate an upgrade (no gateway)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const auth = require('../middleware/auth');
const authenticate = auth.authenticate;
const User = require('../models/User');
const billing = require('../services/billingService');
const { publicPlans, getPlan } = require('../config/plans');
const { planContext } = require('../middleware/entitlements');

function invalidate(userId) {
  try {
    if (typeof auth.invalidateUserCache === 'function') auth.invalidateUserCache(userId);
  } catch (e) { /* noop */ }
}

function periodEnd(cycle) {
  const d = new Date();
  d.setDate(d.getDate() + (cycle === 'yearly' ? 365 : 30));
  return d;
}

async function activatePlan(userId, planId, cycle, provider, ids = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.subscription = {
    plan: planId,
    status: 'active',
    billingCycle: cycle,
    provider,
    customerId: ids.customerId || user.subscription?.customerId,
    subscriptionId: ids.subscriptionId || user.subscription?.subscriptionId,
    currentPeriodEnd: periodEnd(cycle),
    trialEndsAt: user.subscription?.trialEndsAt,
    cancelAtPeriodEnd: false,
    updatedAt: new Date()
  };
  await user.save();
  invalidate(String(userId));
  logger.info(`Subscription activated: user=${userId} plan=${planId} cycle=${cycle} provider=${provider}`);
  return user.subscription;
}

// Public plan catalogue
router.get('/plans', (req, res) => {
  res.json({ success: true, data: { plans: publicPlans(), billingConfigured: billing.isConfigured() } });
});

// Current subscription + entitlements
router.get('/me', authenticate, (req, res) => {
  const ctx = planContext(req.user);
  res.json({
    success: true,
    data: {
      subscription: req.user.subscription || { plan: 'free', status: 'active' },
      plan: { id: ctx.id, name: getPlan(ctx.id).name },
      limits: ctx.limits,
      billingConfigured: billing.isConfigured()
    }
  });
});

// Create a payment order for a plan
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { planId, cycle = 'monthly' } = req.body;
    if (!['pro', 'premium'].includes(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    const order = await billing.createOrder({ planId, cycle, userId: req.user._id });
    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('Checkout failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Checkout failed' });
  }
});

// Verify checkout payment and activate the plan
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId, cycle = 'monthly' } = req.body;
    const ok = billing.verifyPaymentSignature({ orderId, paymentId, signature });
    if (!ok) return res.status(400).json({ success: false, message: 'Payment verification failed' });
    const subscription = await activatePlan(req.user._id, planId, cycle, billing.isConfigured() ? 'razorpay' : 'manual', {
      subscriptionId: paymentId
    });
    res.json({ success: true, data: { subscription } });
  } catch (err) {
    logger.error('Payment verify failed:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// Razorpay webhook (raw body required for signature verification)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const raw = req.rawBody || JSON.stringify(req.body);
    if (!billing.verifyWebhookSignature(raw, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
    const event = req.body;
    const entity = event?.payload?.payment?.entity || event?.payload?.order?.entity || {};
    const notes = entity.notes || {};
    if (['payment.captured', 'order.paid'].includes(event.event) && notes.userId && notes.planId) {
      await activatePlan(notes.userId, notes.planId, notes.cycle || 'monthly', 'razorpay', {
        customerId: entity.customer_id,
        subscriptionId: entity.id
      });
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook error:', err);
    res.status(500).json({ success: false });
  }
});

// Cancel at period end (keeps access until currentPeriodEnd)
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.subscription || user.subscription.plan === 'free') {
      return res.status(400).json({ success: false, message: 'No active paid subscription' });
    }
    user.subscription.cancelAtPeriodEnd = true;
    user.subscription.updatedAt = new Date();
    await user.save();
    invalidate(String(req.user._id));
    res.json({ success: true, data: { subscription: user.subscription } });
  } catch (err) {
    logger.error('Cancel failed:', err);
    res.status(500).json({ success: false, message: 'Cancel failed' });
  }
});

// DEV ONLY: simulate an upgrade without a real gateway
router.post('/dev-activate', authenticate, async (req, res) => {
  if (process.env.NODE_ENV === 'production' && billing.isConfigured()) {
    return res.status(403).json({ success: false, message: 'Not available in production' });
  }
  try {
    const { planId = 'pro', cycle = 'monthly' } = req.body;
    if (!['free', 'pro', 'premium'].includes(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    const subscription = await activatePlan(req.user._id, planId, planId === 'free' ? 'none' : cycle, 'manual');
    res.json({ success: true, data: { subscription }, devMode: true });
  } catch (err) {
    logger.error('Dev activate failed:', err);
    res.status(500).json({ success: false, message: 'Dev activate failed' });
  }
});

module.exports = router;
