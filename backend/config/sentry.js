/**
 * Env-driven error tracking (Sentry).
 *
 * Safe by design: if @sentry/node is not installed or SENTRY_DSN is unset, every
 * export is a no-op, so the app runs unchanged. Install @sentry/node and set
 * SENTRY_DSN to activate — no code changes required.
 */

const logger = require('../utils/logger');

let Sentry = null;
let enabled = false;

function init() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
    });
    enabled = true;
    logger.info('🛰️  Sentry error tracking enabled');
  } catch (e) {
    logger.warn('SENTRY_DSN set but @sentry/node not installed — skipping. Run: npm i @sentry/node');
  }
  return enabled;
}

function captureError(err, context = {}) {
  if (enabled && Sentry) {
    try {
      Sentry.captureException(err, { extra: context });
    } catch (e) { /* noop */ }
  }
}

function isEnabled() {
  return enabled;
}

module.exports = { init, captureError, isEnabled };
