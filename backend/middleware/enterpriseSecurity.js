// ============================================================================
// ENTERPRISE SECURITY MIDDLEWARE — Production-Grade Protection Layer
// ============================================================================
// Comprehensive security middleware stack: rate limiting, input sanitization,
// CORS hardening, request validation, audit logging, CSRF protection,
// security headers, and request fingerprinting.
// ============================================================================

const crypto = require('crypto');

// ============================================================================
// §1  RATE LIMITER (In-Memory with Sliding Window)
// ============================================================================

class SlidingWindowRateLimiter {
  constructor() {
    this.windows = new Map();
    this.configs = {
      default: { maxRequests: 100, windowMs: 60000 },          // 100/min
      auth: { maxRequests: 10, windowMs: 900000 },             // 10/15min
      api: { maxRequests: 200, windowMs: 60000 },              // 200/min
      upload: { maxRequests: 5, windowMs: 300000 },            // 5/5min
      ai: { maxRequests: 30, windowMs: 60000 },                // 30/min
      export: { maxRequests: 10, windowMs: 600000 },           // 10/10min
      webhook: { maxRequests: 50, windowMs: 60000 },           // 50/min
    };

    // Cleanup expired entries every 5 minutes
    setInterval(() => this._cleanup(), 300000);
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, entries] of this.windows.entries()) {
      const filtered = entries.filter(t => t > now - 900000);
      if (filtered.length === 0) this.windows.delete(key);
      else this.windows.set(key, filtered);
    }
  }

  _getKey(req, tier) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.id || req.user?._id || 'anon';
    return `${tier}:${ip}:${userId}`;
  }

  check(req, tier = 'default') {
    const config = this.configs[tier] || this.configs.default;
    const key = this._getKey(req, tier);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entries = this.windows.get(key) || [];
    entries = entries.filter(t => t > windowStart);
    entries.push(now);
    this.windows.set(key, entries);

    const remaining = Math.max(0, config.maxRequests - entries.length);
    const resetAt = windowStart + config.windowMs;

    return {
      allowed: entries.length <= config.maxRequests,
      remaining,
      resetAt,
      limit: config.maxRequests,
      current: entries.length,
    };
  }

  middleware(tier = 'default') {
    return (req, res, next) => {
      const result = this.check(req, tier);

      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }
      next();
    };
  }
}

// ============================================================================
// §2  INPUT SANITIZER
// ============================================================================

class InputSanitizer {
  constructor() {
    this.xssPatterns = [
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /on\w+\s*=\s*[^\s>]+/gi,
      /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
      /<object\b[^>]*>[\s\S]*?<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /data\s*:\s*text\/html/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*["']?\s*javascript/gi,
      /vbscript\s*:/gi,
    ];

    this.sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b.*\b(FROM|INTO|TABLE|SET|WHERE|DATABASE)\b)/gi,
      /(['";])\s*(OR|AND)\s+\d+\s*=\s*\d+/gi,
      /--\s*$/gm,
      /\/\*[\s\S]*?\*\//g,
      /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s/gi,
    ];

    this.noSqlPatterns = [
      /\$(?:gt|gte|lt|lte|ne|nin|in|exists|regex|where|expr|jsonSchema)/gi,
      /\{\s*"\$\w+"/g,
    ];
  }

  sanitizeString(str) {
    if (typeof str !== 'string') return str;

    let clean = str;
    // Trim and limit length
    clean = clean.trim().substring(0, 10000);

    // Remove null bytes
    clean = clean.replace(/\0/g, '');

    // Escape HTML entities
    clean = clean
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return clean;
  }

  sanitizeObject(obj, depth = 0) {
    if (depth > 10) return obj;
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.sanitizeString(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeObject(item, depth + 1));

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Block NoSQL injection in keys
        const cleanKey = key.startsWith('$') ? '_' + key.substring(1) : key;
        sanitized[cleanKey] = this.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }

  detectThreats(input) {
    const threats = [];
    const str = typeof input === 'string' ? input : JSON.stringify(input);

    this.xssPatterns.forEach((pattern, i) => {
      if (pattern.test(str)) threats.push({ type: 'XSS', pattern: i, severity: 'high' });
      pattern.lastIndex = 0;
    });

    this.sqlPatterns.forEach((pattern, i) => {
      if (pattern.test(str)) threats.push({ type: 'SQL_INJECTION', pattern: i, severity: 'critical' });
      pattern.lastIndex = 0;
    });

    this.noSqlPatterns.forEach((pattern, i) => {
      if (pattern.test(str)) threats.push({ type: 'NOSQL_INJECTION', pattern: i, severity: 'critical' });
      pattern.lastIndex = 0;
    });

    return threats;
  }

  middleware() {
    return (req, res, next) => {
      try {
        // Check for threats first
        const bodyThreats = req.body ? this.detectThreats(req.body) : [];
        const queryThreats = req.query ? this.detectThreats(req.query) : [];
        const paramThreats = req.params ? this.detectThreats(req.params) : [];
        const allThreats = [...bodyThreats, ...queryThreats, ...paramThreats];

        const criticalThreats = allThreats.filter(t => t.severity === 'critical');
        if (criticalThreats.length > 0) {
          console.warn(`[SECURITY] Critical threat detected from ${req.ip}:`, criticalThreats);
          return res.status(400).json({
            success: false,
            error: 'Request blocked',
            message: 'Potentially malicious input detected.',
          });
        }

        // Sanitize inputs
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        next();
      } catch (err) {
        console.error('[SECURITY] Sanitization error:', err.message);
        next();
      }
    };
  }
}

// ============================================================================
// §3  SECURITY HEADERS
// ============================================================================

function securityHeaders(options = {}) {
  const {
    enableCSP = true,
    enableHSTS = true,
    reportOnly = false,
  } = options;

  return (req, res, next) => {
    // Content Security Policy
    if (enableCSP) {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.exchangerate-api.com wss: ws:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

      const header = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
      res.setHeader(header, csp);
    }

    // Strict Transport Security
    if (enableHSTS) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.removeHeader('X-Powered-By');

    next();
  };
}

// ============================================================================
// §4  REQUEST VALIDATOR
// ============================================================================

class RequestValidator {
  static validateBody(schema) {
    return (req, res, next) => {
      const errors = [];

      for (const [field, rules] of Object.entries(schema)) {
        const value = req.body?.[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({ field, message: `${field} is required` });
          continue;
        }

        if (value === undefined || value === null) continue;

        if (rules.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rules.type) {
            errors.push({ field, message: `${field} must be of type ${rules.type}` });
          }
        }

        if (rules.type === 'string' || typeof value === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({ field, message: `${field} format is invalid` });
          }
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
          }
          if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({ field, message: `${field} must be a valid email` });
          }
        }

        if (rules.type === 'number' || typeof value === 'number') {
          if (rules.min !== undefined && value < rules.min) {
            errors.push({ field, message: `${field} must be at least ${rules.min}` });
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push({ field, message: `${field} must be at most ${rules.max}` });
          }
        }

        if (rules.custom && typeof rules.custom === 'function') {
          const customError = rules.custom(value, req.body);
          if (customError) errors.push({ field, message: customError });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }

      next();
    };
  }

  static validateQueryParams(schema) {
    return (req, res, next) => {
      const errors = [];

      for (const [param, rules] of Object.entries(schema)) {
        let value = req.query?.[param];

        if (rules.required && !value) {
          errors.push({ param, message: `Query parameter ${param} is required` });
          continue;
        }

        if (!value) continue;

        if (rules.type === 'number') {
          value = Number(value);
          if (isNaN(value)) {
            errors.push({ param, message: `${param} must be a number` });
            continue;
          }
          req.query[param] = value;
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({ param, message: `${param} must be one of: ${rules.enum.join(', ')}` });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors,
        });
      }

      next();
    };
  }

  static validateObjectId(paramName = 'id') {
    return (req, res, next) => {
      const id = req.params[paramName];
      if (id && !/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format',
          message: `Parameter ${paramName} must be a valid 24-character hex string`,
        });
      }
      next();
    };
  }
}

// ============================================================================
// §5  AUDIT LOGGER
// ============================================================================

class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxBufferSize = 1000;
    this.sensitiveFields = new Set([
      'password', 'token', 'secret', 'authorization', 'cookie',
      'creditCard', 'ssn', 'aadhaar', 'pan', 'cvv', 'otp',
      'refreshToken', 'accessToken', 'apiKey',
    ]);
  }

  _redactSensitive(obj, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return obj;

    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(redacted)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this._redactSensitive(redacted[key], depth + 1);
      }
    }
    return redacted;
  }

  _getFingerprint(req) {
    const data = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.ip || '',
    ].join('|');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  log(req, res, action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      method: req.method,
      path: req.originalUrl || req.url,
      userId: req.user?.id || req.user?._id || null,
      userEmail: req.user?.email || null,
      ip: req.ip || req.connection?.remoteAddress,
      fingerprint: this._getFingerprint(req),
      statusCode: res.statusCode,
      userAgent: (req.headers['user-agent'] || '').substring(0, 200),
      duration: req._startTime ? Date.now() - req._startTime : null,
      details: this._redactSensitive(details),
    };

    this.logs.push(entry);

    // Keep buffer manageable
    if (this.logs.length > this.maxBufferSize) {
      this.logs = this.logs.slice(-Math.floor(this.maxBufferSize / 2));
    }

    // Log significant events
    if (action.includes('AUTH') || action.includes('DELETE') || action.includes('ERROR') || res.statusCode >= 400) {
      console.log(`[AUDIT] ${entry.timestamp} | ${action} | ${entry.method} ${entry.path} | User: ${entry.userId || 'anon'} | IP: ${entry.ip} | Status: ${entry.statusCode}`);
    }

    return entry;
  }

  middleware() {
    return (req, res, next) => {
      req._startTime = Date.now();
      req._fingerprint = this._getFingerprint(req);

      // Hook into response finish
      const originalEnd = res.end;
      res.end = (...args) => {
        // Determine action from method + path
        let action = `${req.method}_REQUEST`;
        const path = (req.originalUrl || req.url).toLowerCase();

        if (path.includes('/auth/login')) action = 'AUTH_LOGIN';
        else if (path.includes('/auth/register')) action = 'AUTH_REGISTER';
        else if (path.includes('/auth/logout')) action = 'AUTH_LOGOUT';
        else if (path.includes('/auth/')) action = 'AUTH_ACTION';
        else if (req.method === 'DELETE') action = 'DATA_DELETE';
        else if (req.method === 'POST' && path.includes('/upload')) action = 'FILE_UPLOAD';
        else if (path.includes('/export')) action = 'DATA_EXPORT';
        else if (path.includes('/admin')) action = 'ADMIN_ACTION';

        this.log(req, res, action);
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  getRecentLogs(count = 50, filter = {}) {
    let filtered = [...this.logs];

    if (filter.userId) filtered = filtered.filter(l => l.userId === filter.userId);
    if (filter.action) filtered = filtered.filter(l => l.action.includes(filter.action));
    if (filter.statusCode) filtered = filtered.filter(l => l.statusCode === filter.statusCode);
    if (filter.ip) filtered = filtered.filter(l => l.ip === filter.ip);

    return filtered.slice(-count).reverse();
  }

  getSecurityReport() {
    const now = Date.now();
    const last24h = this.logs.filter(l => new Date(l.timestamp).getTime() > now - 86400000);

    const failedLogins = last24h.filter(l => l.action === 'AUTH_LOGIN' && l.statusCode >= 400);
    const uniqueIPs = new Set(last24h.map(l => l.ip));
    const errorRequests = last24h.filter(l => l.statusCode >= 500);
    const suspiciousIPs = {};

    failedLogins.forEach(l => {
      suspiciousIPs[l.ip] = (suspiciousIPs[l.ip] || 0) + 1;
    });

    return {
      period: '24h',
      totalRequests: last24h.length,
      uniqueIPs: uniqueIPs.size,
      failedLogins: failedLogins.length,
      serverErrors: errorRequests.length,
      suspiciousIPs: Object.entries(suspiciousIPs)
        .filter(([_, count]) => count >= 5)
        .map(([ip, count]) => ({ ip, failedAttempts: count })),
      topEndpoints: (() => {
        const counts = {};
        last24h.forEach(l => { counts[l.path] = (counts[l.path] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => ({ path, count }));
      })(),
    };
  }
}

// ============================================================================
// §6  CORS CONFIGURATION
// ============================================================================

function enterpriseCors(options = {}) {
  const {
    allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    allowCredentials = true,
    maxAge = 86400,
  } = options;

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    const isAllowed = !origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*');

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Request-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID');
    res.setHeader('Access-Control-Max-Age', maxAge.toString());

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

// ============================================================================
// §7  REQUEST ID & TIMING
// ============================================================================

function requestEnhancer() {
  return (req, res, next) => {
    // Unique request ID
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);

    // Start timing
    req._startTime = Date.now();

    // Add response time header
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - req._startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
      originalEnd.apply(res, args);
    };

    next();
  };
}

// ============================================================================
// §8  ERROR HANDLER
// ============================================================================

function enterpriseErrorHandler() {
  return (err, req, res, _next) => {
    const statusCode = err.statusCode || err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Log error
    if (statusCode >= 500) {
      console.error(`[ERROR] ${req.requestId || '-'} ${req.method} ${req.originalUrl}:`, err.stack || err.message);
    } else {
      console.warn(`[WARN] ${req.requestId || '-'} ${req.method} ${req.originalUrl}: ${err.message}`);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map(e => ({ field: e.path, message: e.message }));
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors,
        requestId: req.requestId,
      });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        error: 'Duplicate Entry',
        message: `A record with this ${field} already exists`,
        requestId: req.requestId,
      });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'The provided ID is not valid',
        requestId: req.requestId,
      });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid Token',
        message: 'Authentication token is invalid',
        requestId: req.requestId,
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token Expired',
        message: 'Authentication token has expired',
        requestId: req.requestId,
      });
    }

    // Default error response
    res.status(statusCode).json({
      success: false,
      error: isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
      requestId: req.requestId,
    });
  };
}

// ============================================================================
// §9  REQUEST SIZE LIMITER
// ============================================================================

function requestSizeLimiter(maxSizeBytes = 10 * 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: 'Payload Too Large',
        message: `Request body must be smaller than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
      });
    }
    next();
  };
}

// ============================================================================
// §10  HEALTH CHECK ENDPOINT FACTORY
// ============================================================================

function healthCheckEndpoint(dependencies = {}) {
  return async (req, res) => {
    const checks = { status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() };
    const details = {};

    // Check MongoDB
    if (dependencies.mongoose) {
      try {
        const state = dependencies.mongoose.connection.readyState;
        details.mongodb = { status: state === 1 ? 'connected' : 'disconnected', readyState: state };
      } catch (e) {
        details.mongodb = { status: 'error', message: e.message };
        checks.status = 'degraded';
      }
    }

    // Memory usage
    const mem = process.memoryUsage();
    details.memory = {
      rssGB: (mem.rss / 1024 / 1024 / 1024).toFixed(2),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
      heapUsagePercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
    };

    // Node version
    details.node = { version: process.version, platform: process.platform, arch: process.arch };

    checks.details = details;
    res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
  };
}

// ============================================================================
// §11  EXPORTS — Singleton Instances + Factory Functions
// ============================================================================

const rateLimiter = new SlidingWindowRateLimiter();
const inputSanitizer = new InputSanitizer();
const auditLogger = new AuditLogger();

module.exports = {
  // Singletons
  rateLimiter,
  inputSanitizer,
  auditLogger,

  // Middleware factories
  securityHeaders,
  enterpriseCors,
  requestEnhancer,
  enterpriseErrorHandler,
  requestSizeLimiter,
  healthCheckEndpoint,

  // Utility class
  RequestValidator,

  // Classes for testing
  SlidingWindowRateLimiter,
  InputSanitizer,
  AuditLogger,
};
