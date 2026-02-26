const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// In-memory sliding-window store
// ---------------------------------------------------------------------------

class SlidingWindowStore {
  constructor() {
    this.windows = new Map(); // key → { timestamps: number[] }
    this.cleanupInterval = setInterval(() => this._cleanup(), 60_000);
  }

  /**
   * Record a hit and return the current count within the window.
   */
  hit(key, windowMs) {
    const now = Date.now();
    const cutoff = now - windowMs;

    if (!this.windows.has(key)) {
      this.windows.set(key, { timestamps: [] });
    }

    const entry = this.windows.get(key);
    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    entry.timestamps.push(now);

    return entry.timestamps.length;
  }

  /**
   * Get current count without recording a new hit.
   */
  count(key, windowMs) {
    const entry = this.windows.get(key);
    if (!entry) return 0;
    const cutoff = Date.now() - windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    return entry.timestamps.length;
  }

  /**
   * Reset a specific key.
   */
  reset(key) {
    this.windows.delete(key);
  }

  /**
   * Periodic cleanup of expired entries.
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 600_000) {
        this.windows.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.windows.clear();
  }
}

const store = new SlidingWindowStore();

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

const TIERS = {
  anonymous: { maxRequests: 30, windowMs: 60_000, message: 'Too many requests. Please try again later.' },
  authenticated: { maxRequests: 100, windowMs: 60_000, message: 'Rate limit exceeded. Please slow down.' },
  premium: { maxRequests: 500, windowMs: 60_000, message: 'Rate limit exceeded for premium tier.' },
};

// ---------------------------------------------------------------------------
// Per-route presets
// ---------------------------------------------------------------------------

const ROUTE_LIMITS = {
  '/api/auth/login': { maxRequests: 5, windowMs: 60_000, message: 'Too many login attempts. Try again in a minute.' },
  '/api/auth/register': { maxRequests: 3, windowMs: 300_000, message: 'Too many registration attempts. Try again later.' },
  '/api/auth/forgot-password': { maxRequests: 3, windowMs: 300_000, message: 'Too many password reset requests.' },
  '/api/export': { maxRequests: 10, windowMs: 300_000, message: 'Export rate limit exceeded.' },
  '/api/upload': { maxRequests: 20, windowMs: 300_000, message: 'Upload rate limit exceeded.' },
};

// ---------------------------------------------------------------------------
// Skip conditions
// ---------------------------------------------------------------------------

function defaultSkipCondition(req) {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/api/health') return true;
  // Skip admin users
  if (req.user && req.user.role === 'admin') return true;
  // Skip internal / whitelisted IPs
  const ip = getClientIP(req);
  if (ip === '127.0.0.1' || ip === '::1') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function resolveUserTier(req) {
  if (!req.user) return 'anonymous';
  if (req.user.isPremium || req.user.plan === 'premium') return 'premium';
  return 'authenticated';
}

function buildKey(req, keyType) {
  const ip = getClientIP(req);
  if (keyType === 'user' && req.user) {
    return `rl:user:${req.user._id || req.user.id}:${req.path}`;
  }
  return `rl:ip:${ip}:${req.path}`;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Create a rate-limiting middleware.
 *
 * @param {Object} [options]
 * @param {number} [options.maxRequests] - Override max requests (ignores tier)
 * @param {number} [options.windowMs] - Override window in ms
 * @param {string} [options.message] - Custom rate-limit response message
 * @param {'ip'|'user'|'both'} [options.keyType] - How to identify the client
 * @param {(req) => boolean} [options.skip] - Custom skip condition
 * @param {boolean} [options.useRouteLimits] - Apply per-route presets
 * @returns {Function} Express middleware
 */
function rateLimiter(options = {}) {
  const {
    maxRequests: overrideMax,
    windowMs: overrideWindow,
    message: overrideMessage,
    keyType = 'both',
    skip = defaultSkipCondition,
    useRouteLimits = true,
  } = options;

  return (req, res, next) => {
    try {
      // Check skip conditions
      if (skip(req)) return next();

      // Determine limits
      let maxRequests, windowMs, message;

      // Priority: explicit override > route-specific > tier-based
      if (overrideMax) {
        maxRequests = overrideMax;
        windowMs = overrideWindow || 60_000;
        message = overrideMessage || 'Rate limit exceeded.';
      } else if (useRouteLimits && ROUTE_LIMITS[req.path]) {
        const routeCfg = ROUTE_LIMITS[req.path];
        maxRequests = routeCfg.maxRequests;
        windowMs = routeCfg.windowMs;
        message = routeCfg.message;
      } else {
        const tierName = resolveUserTier(req);
        const tier = TIERS[tierName];
        maxRequests = tier.maxRequests;
        windowMs = tier.windowMs;
        message = tier.message;
      }

      // Build key(s) and record hits
      const keys = [];
      if (keyType === 'both' || keyType === 'ip') keys.push(buildKey(req, 'ip'));
      if ((keyType === 'both' || keyType === 'user') && req.user) keys.push(buildKey(req, 'user'));
      if (keys.length === 0) keys.push(buildKey(req, 'ip'));

      let highestCount = 0;
      for (const key of keys) {
        const count = store.hit(key, windowMs);
        if (count > highestCount) highestCount = count;
      }

      // Set rate-limit headers
      const remaining = Math.max(maxRequests - highestCount, 0);
      const resetTime = Math.ceil((Date.now() + windowMs) / 1000);

      res.set({
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetTime),
      });

      if (highestCount > maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.set('Retry-After', String(retryAfter));

        logger.warn(`Rate limit exceeded for ${getClientIP(req)} on ${req.method} ${req.path} (${highestCount}/${maxRequests})`);

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
        });
      }

      next();
    } catch (err) {
      logger.error('Rate limiter error:', err);
      // Fail open – don't block the request on limiter errors
      next();
    }
  };
}

// ---------------------------------------------------------------------------
// Convenience presets
// ---------------------------------------------------------------------------

/** Strict limiter for auth routes. */
rateLimiter.auth = () => rateLimiter({ maxRequests: 5, windowMs: 60_000, keyType: 'ip' });

/** Relaxed limiter for general API. */
rateLimiter.api = () => rateLimiter({ useRouteLimits: true });

/** Very strict limiter for sensitive operations. */
rateLimiter.strict = () => rateLimiter({ maxRequests: 3, windowMs: 300_000 });

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = rateLimiter;
module.exports.SlidingWindowStore = SlidingWindowStore;
module.exports.TIERS = TIERS;
module.exports.ROUTE_LIMITS = ROUTE_LIMITS;
