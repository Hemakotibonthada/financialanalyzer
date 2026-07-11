/**
 * Request context middleware — assigns each request a correlation id and logs
 * a structured summary (method, path, status, duration) on completion.
 * Adds `req.id` and an `X-Request-Id` response header.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

function requestContext(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = incoming || crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.id);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // Skip noisy health/static polling at info level.
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    if (level !== 'info' || !req.originalUrl.startsWith('/api/health')) {
      logger[level](
        `[req ${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`
      );
    }
  });
  next();
}

module.exports = requestContext;
