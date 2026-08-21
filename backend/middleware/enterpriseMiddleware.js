// ============================================================================
// Enterprise Middleware Suite — Security, Performance, Audit, CORS, Sanitization
// ============================================================================

const logger = require('../utils/logger') || console;
const pg = require('../db/postgres');

// ============================================================================
// § 1 — Request Performance Monitor
// ============================================================================

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowThreshold = 2000; // ms
    this.history = []; // Last 1000 requests
    this.maxHistory = 1000;
  }

  startTimer(req) {
    const start = process.hrtime.bigint();
    req._perfStart = start;
    req._perfId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  endTimer(req, res) {
    if (!req._perfStart) return;

    const end = process.hrtime.bigint();
    const durationNs = Number(end - req._perfStart);
    const durationMs = durationNs / 1e6;

    const record = {
      id: req._perfId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']?.substr(0, 100),
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id || null,
    };

    // Track per-route metrics
    const routeKey = `${req.method} ${req.route?.path || req.path}`;
    if (!this.metrics.has(routeKey)) {
      this.metrics.set(routeKey, {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        minMs: Infinity,
        errors: 0,
        lastAccessed: null,
      });
    }

    const metric = this.metrics.get(routeKey);
    metric.count++;
    metric.totalMs += durationMs;
    metric.maxMs = Math.max(metric.maxMs, durationMs);
    metric.minMs = Math.min(metric.minMs, durationMs);
    metric.lastAccessed = record.timestamp;
    if (res.statusCode >= 400) metric.errors++;

    // Store in history
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Log slow requests
    if (durationMs > this.slowThreshold) {
      const logFn = typeof logger.warn === 'function' ? logger.warn : console.warn;
      logFn(`[SLOW REQUEST] ${routeKey} took ${durationMs.toFixed(2)}ms`, {
        path: record.path,
        statusCode: record.statusCode,
        userId: record.userId,
      });
    }

    return record;
  }

  getStats() {
    const stats = {};
    for (const [route, metric] of this.metrics) {
      stats[route] = {
        ...metric,
        avgMs: Math.round((metric.totalMs / metric.count) * 100) / 100,
        minMs: metric.minMs === Infinity ? 0 : Math.round(metric.minMs * 100) / 100,
        maxMs: Math.round(metric.maxMs * 100) / 100,
        errorRate: Math.round((metric.errors / metric.count) * 10000) / 100,
      };
    }
    return stats;
  }

  getRecentRequests(limit = 50) {
    return this.history.slice(-limit).reverse();
  }

  getSlowRequests(thresholdMs = 1000) {
    return this.history.filter(r => r.durationMs > thresholdMs).slice(-50).reverse();
  }

  reset() {
    this.metrics.clear();
    this.history = [];
  }
}

const perfMonitor = new PerformanceMonitor();

// Middleware
function performanceMiddleware(req, res, next) {
  perfMonitor.startTimer(req);

  const originalEnd = res.end;
  res.end = function (...args) {
    perfMonitor.endTimer(req, res);
    originalEnd.apply(this, args);
  };

  next();
}

// ============================================================================
// § 2 — Request ID & Correlation
// ============================================================================

let requestCounter = 0;

function requestIdMiddleware(req, res, next) {
  requestCounter++;
  const id = req.headers['x-request-id'] || `req-${Date.now()}-${requestCounter}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);

  // Correlation ID for distributed tracing
  req.correlationId = req.headers['x-correlation-id'] || id;
  res.setHeader('X-Correlation-ID', req.correlationId);

  next();
}

// ============================================================================
// § 3 — Security Headers
// ============================================================================

function securityHeadersMiddleware(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection (legacy but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  // Content Security Policy (non-blocking, report only)
  res.setHeader('Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;");

  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// ============================================================================
// § 4 — Input Sanitizer
// ============================================================================

const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

const SQL_PATTERNS = [
  /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE)\b/gi,
  /--\s/g,
  /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
  /\/\*[\s\S]*?\*\//g,
];

const NOSQL_PATTERNS = [
  /\$(?:gt|gte|lt|lte|ne|in|nin|regex|where|exists|type|mod|all|size|elemMatch)\b/gi,
  /\$(?:or|and|not|nor)\b/gi,
];

function sanitizeValue(value, depth = 0) {
  if (depth > 10) return value; // Prevent infinite recursion

  if (typeof value === 'string') {
    let sanitized = value;

    // Remove dangerous HTML/JS patterns
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Trim excessive whitespace
    sanitized = sanitized.replace(/\s{10,}/g, ' ');

    // Limit string length to 10KB
    if (sanitized.length > 10240) {
      sanitized = sanitized.substring(0, 10240);
    }

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      // Block MongoDB injection operators in keys
      const isNoSQLInjection = NOSQL_PATTERNS.some(p => p.test(key));
      if (isNoSQLInjection) {
        const logFn = typeof logger.warn === 'function' ? logger.warn : console.warn;
        logFn(`[SECURITY] Blocked NoSQL injection attempt in key: ${key}`);
        continue;
      }
      sanitized[key] = sanitizeValue(val, depth + 1);
    }
    return sanitized;
  }

  return value;
}

function inputSanitizerMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

// ============================================================================
// § 5 — Audit Logger
// ============================================================================

class AuditLog {
  constructor() {
    this.logs = [];
    this.maxLogs = 5000;
    this.sensitiveActions = new Set([
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE',
      'DELETE', 'EXPORT', 'ADMIN_ACTION', 'SETTINGS_CHANGE',
      'TWO_FACTOR_TOGGLE', 'API_KEY_CREATE', 'BULK_OPERATION',
    ]);
  }

  log(event) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      action: event.action || 'UNKNOWN',
      userId: event.userId || null,
      resource: event.resource || null,
      resourceId: event.resourceId || null,
      details: event.details || {},
      ip: event.ip || null,
      userAgent: event.userAgent || null,
      requestId: event.requestId || null,
      success: event.success !== false,
      severity: this.sensitiveActions.has(event.action) ? 'HIGH' : 'NORMAL',
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // The in-memory ring buffer above is per-process and lost on restart, so on
    // its own it cannot answer "who touched this account last month" - which is
    // the entire point of an audit trail in a financial application, and is
    // also what a compliance review asks for. Postgres gets a durable copy.
    //
    // Fire-and-forget: an audit write must never add latency to, or be able to
    // fail, the request that triggered it.
    pg.recordAudit({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.resource,
      entityId: entry.resourceId,
      ip: entry.ip,
      userAgent: entry.userAgent,
      details: {
        ...entry.details,
        requestId: entry.requestId,
        success: entry.success,
        severity: entry.severity
      }
    }).catch(() => {});

    // Log sensitive actions
    if (entry.severity === 'HIGH') {
      const logFn = typeof logger.info === 'function' ? logger.info : console.info;
      logFn(`[AUDIT] ${entry.action} by user ${entry.userId} on ${entry.resource}:${entry.resourceId}`, {
        ip: entry.ip,
        success: entry.success,
      });
    }

    return entry;
  }

  /**
   * Durable history from Postgres.
   *
   * `query` below stays synchronous because callers and tests depend on that,
   * so the persistent view is a separate async method rather than a change in
   * the existing contract.
   */
  async queryPersisted({ userId, action, resource, startDate, endDate, limit = 100 } = {}) {
    if (!pg.isConfigured()) return this.query({ userId, action, resource, startDate, endDate, limit });

    const conditions = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace('$?', `$${params.length}`));
    };

    if (userId) add('user_id = $?', String(userId));
    if (action) add('action = $?', action);
    if (resource) add('entity_type = $?', resource);
    if (startDate) add('created_at >= $?', new Date(startDate));
    if (endDate) add('created_at <= $?', new Date(endDate));

    params.push(Math.min(Number(limit) || 100, 1000));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await pg.query(
      `SELECT user_id, action, entity_type, entity_id, ip_address, user_agent, details, created_at
         FROM audit_log ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params
    );

    return (res?.rows || []).map((r) => ({
      timestamp: r.created_at,
      userId: r.user_id,
      action: r.action,
      resource: r.entity_type,
      resourceId: r.entity_id,
      ip: r.ip_address,
      userAgent: r.user_agent,
      details: r.details || {},
      success: r.details?.success !== false,
      severity: r.details?.severity || 'NORMAL'
    }));
  }

  query({ userId, action, resource, startDate, endDate, limit = 100 } = {}) {
    let results = [...this.logs];

    if (userId) results = results.filter(l => l.userId === userId);
    if (action) results = results.filter(l => l.action === action);
    if (resource) results = results.filter(l => l.resource === resource);
    if (startDate) results = results.filter(l => new Date(l.timestamp) >= new Date(startDate));
    if (endDate) results = results.filter(l => new Date(l.timestamp) <= new Date(endDate));

    return results.slice(-limit).reverse();
  }

  getStats() {
    const actionCounts = {};
    const userActivity = {};
    let successCount = 0;
    let failCount = 0;

    for (const log of this.logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      if (log.userId) {
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
      }
      if (log.success) successCount++;
      else failCount++;
    }

    return {
      totalEntries: this.logs.length,
      actionCounts,
      topUsers: Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count })),
      successRate: this.logs.length ? Math.round((successCount / this.logs.length) * 10000) / 100 : 100,
    };
  }

  clear() {
    this.logs = [];
  }
}

const auditLog = new AuditLog();

// Middleware that attaches audit helper to req
function auditMiddleware(req, res, next) {
  req.audit = (action, details = {}) => {
    auditLog.log({
      action,
      userId: req.user?.id || req.user?._id,
      resource: details.resource || req.baseUrl?.split('/').pop(),
      resourceId: details.resourceId || req.params?.id,
      details,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });
  };
  next();
}

// ============================================================================
// § 6 — Response Formatter
// ============================================================================

function responseFormatterMiddleware(req, res, next) {
  // Success response helper
  res.success = (data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  };

  // Error response helper
  res.error = (message = 'An error occurred', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  };

  // Paginated response helper
  res.paginated = (data, page, limit, total) => {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  };

  next();
}

// ============================================================================
// § 7 — Request Size Limiter
// ============================================================================

function requestSizeLimiter(maxSizeBytes = 10 * 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        message: `Request too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`,
      });
    }
    next();
  };
}

// ============================================================================
// § 8 — API Version Header
// ============================================================================

function apiVersionMiddleware(version = '2.0.0') {
  return (req, res, next) => {
    res.setHeader('X-API-Version', version);
    res.setHeader('X-Powered-By', 'FinancialAnalyzer Enterprise');
    next();
  };
}

// ============================================================================
// § 9 — Error Handler (Global)
// ============================================================================

function globalErrorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error
  const logFn = typeof logger.error === 'function' ? logger.error : console.error;
  logFn(`[ERROR] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`, {
    stack: err.stack,
    requestId: req.requestId,
    userId: req.user?.id,
  });

  // Audit failed requests
  if (req.audit) {
    req.audit('ERROR', {
      statusCode,
      message,
      path: req.originalUrl,
    });
  }

  // Don't leak stack traces in production
  const response = {
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal error occurred. Please try again later.'
      : message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    response.message = 'Validation failed';
    response.errors = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json(response);
  }

  if (err.name === 'CastError') {
    response.message = 'Invalid ID format';
    return res.status(400).json(response);
  }

  if (err.code === 11000) {
    response.message = 'Duplicate entry detected';
    const field = Object.keys(err.keyPattern || {})[0];
    if (field) response.message = `A record with this ${field} already exists`;
    return res.status(409).json(response);
  }

  if (err.name === 'JsonWebTokenError') {
    response.message = 'Invalid authentication token';
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    response.message = 'Authentication token has expired';
    return res.status(401).json(response);
  }

  res.status(statusCode).json(response);
}

// ============================================================================
// § 10 — Health Check Endpoint Handler
// ============================================================================

function healthCheckHandler(req, res) {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  res.status(200).json({
    status: 'healthy',
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime),
    },
    memory: {
      rss: formatBytes(memUsage.rss),
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      external: formatBytes(memUsage.external),
      usagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    performance: {
      routeStats: perfMonitor.getStats(),
      recentSlowRequests: perfMonitor.getSlowRequests(2000),
    },
    audit: auditLog.getStats(),
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ============================================================================
// § 11 — Admin Analytics Endpoint
// ============================================================================

function adminAnalyticsHandler(req, res) {
  res.status(200).json({
    success: true,
    data: {
      performance: perfMonitor.getStats(),
      recentRequests: perfMonitor.getRecentRequests(parseInt(req.query.limit) || 50),
      slowRequests: perfMonitor.getSlowRequests(parseInt(req.query.threshold) || 1000),
      audit: auditLog.getStats(),
      recentAuditLogs: auditLog.query({
        limit: parseInt(req.query.auditLimit) || 20,
        userId: req.query.userId,
        action: req.query.action,
      }),
    },
  });
}

// ============================================================================
// § 12 — Apply All Middleware
// ============================================================================

function applyEnterpriseMiddleware(app) {
  // Order matters
  app.use(requestIdMiddleware);
  app.use(apiVersionMiddleware('2.0.0'));
  app.use(securityHeadersMiddleware);
  app.use(performanceMiddleware);
  app.use(inputSanitizerMiddleware);
  app.use(responseFormatterMiddleware);
  app.use(auditMiddleware);

  // Health and admin endpoints
  app.get('/api/health', healthCheckHandler);
  app.get('/api/admin/analytics', adminAnalyticsHandler);

  return app;
}

// ============================================================================
// § 13 — Exports
// ============================================================================

module.exports = {
  // Individual middleware
  performanceMiddleware,
  requestIdMiddleware,
  securityHeadersMiddleware,
  inputSanitizerMiddleware,
  auditMiddleware,
  responseFormatterMiddleware,
  requestSizeLimiter,
  apiVersionMiddleware,
  globalErrorHandler,

  // Endpoint handlers
  healthCheckHandler,
  adminAnalyticsHandler,

  // Utilities
  perfMonitor,
  auditLog,
  sanitizeValue,

  // Aggregate
  applyEnterpriseMiddleware,
};
