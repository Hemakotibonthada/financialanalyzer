/**
 * Billing service — Razorpay integration with a safe dev fallback.
 *
 * If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured, the service runs
 * in "dev mode": no real gateway calls are made, and the billing routes expose a
 * dev-activate path so the subscription flow is testable without live keys.
 *
 * Env:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { getPlan } = require('../config/plans');

let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  logger.warn('razorpay package not available; billing runs in dev mode');
}

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const configured = !!(Razorpay && KEY_ID && KEY_SECRET);

let client = null;
if (configured) {
  client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  logger.info('💳 Razorpay billing configured');
} else {
  logger.warn('💳 Billing in DEV mode (no Razorpay keys) — use /api/billing/dev-activate to simulate upgrades');
}

function isConfigured() {
  return configured;
}

function priceFor(planId, cycle) {
  const plan = getPlan(planId);
  return cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
}

/**
 * Create a Razorpay order for a one-time plan purchase (period).
 * Returns the data the frontend checkout needs.
 */
async function createOrder({ planId, cycle, userId }) {
  const amount = priceFor(planId, cycle);
  if (!amount || amount <= 0) {
    throw new Error('Selected plan is free or has no price');
  }
  if (!configured) {
    // Dev mode: return a synthetic order so the UI flow can proceed.
    return {
      devMode: true,
      orderId: `dev_order_${Date.now()}`,
      amount,
      currency: 'INR',
      keyId: 'dev',
      planId,
      cycle
    };
  }
  const order = await client.orders.create({
    amount,
    currency: 'INR',
    receipt: `sub_${userId}_${Date.now()}`,
    notes: { userId: String(userId), planId, cycle }
  });
  return {
    devMode: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: KEY_ID,
    planId,
    cycle
  };
}

/** Verify Razorpay checkout signature (order_id|payment_id). */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!configured) return true; // dev mode
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

/** Verify a Razorpay webhook using the raw request body. */
function verifyWebhookSignature(rawBody, signature) {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch (e) {
    return false;
  }
}

module.exports = {
  isConfigured,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  priceFor
};
