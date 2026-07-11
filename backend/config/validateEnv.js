/**
 * Environment validation — run once at boot (after dotenv).
 *
 * In production, missing/insecure critical secrets cause a hard exit so the app
 * never runs in an unsafe state. In development, they are warnings so local dev
 * stays frictionless.
 */

const logger = require('../utils/logger');

const INSECURE_DEFAULTS = [
  'your_secure_jwt_secret_here',
  'dev-encryption-key-change-in-production',
  'change-me',
  'secret'
];

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const problems = [];
  const warnings = [];

  // Always required
  if (!process.env.MONGODB_URI) problems.push('MONGODB_URI is required');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    problems.push('JWT_SECRET must be set and at least 16 characters');
  }

  // Production-critical
  if (isProd) {
    if (!process.env.ENCRYPTION_KEY) {
      problems.push('ENCRYPTION_KEY must be set in production (no dev fallback allowed)');
    }
    if (INSECURE_DEFAULTS.includes((process.env.JWT_SECRET || '').toLowerCase())) {
      problems.push('JWT_SECRET is set to an insecure default');
    }
    if (!process.env.SESSION_SECRET) warnings.push('SESSION_SECRET is not set');
    if (!process.env.CORS_ORIGIN && !process.env.FRONTEND_URL) {
      warnings.push('CORS_ORIGIN / FRONTEND_URL not set — CORS may block the frontend');
    }
    if (process.env.SECURE_COOKIES !== 'true') {
      warnings.push('SECURE_COOKIES should be "true" in production (HTTPS)');
    }
  }

  // Optional integrations (informational)
  if (!process.env.RAZORPAY_KEY_ID) warnings.push('RAZORPAY_KEY_ID not set — billing runs in dev mode');
  if (!process.env.SENTRY_DSN) warnings.push('SENTRY_DSN not set — error tracking disabled');
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    warnings.push('EMAIL_USER / EMAIL_PASSWORD not set — verification & notification emails are logged, not sent');
  }
  if (isProd && !process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
    warnings.push('CLIENT_URL / FRONTEND_URL not set — email verification links fall back to the request host');
  }

  warnings.forEach((w) => logger.warn(`[env] ${w}`));

  if (problems.length) {
    problems.forEach((p) => logger.error(`[env] ${p}`));
    if (isProd) {
      logger.error('[env] Refusing to start in production with invalid configuration.');
      process.exit(1);
    } else {
      logger.warn('[env] Continuing in development despite the issues above.');
    }
  } else {
    logger.info('[env] Environment validation passed');
  }
}

module.exports = validateEnv;
