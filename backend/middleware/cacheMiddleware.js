const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache middleware for API routes
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : cacheService.generateKey(
            'api',
            req.user?.id || 'public',
            req.originalUrl
          );

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        // SECURITY: Don't expose internal cache key to clients
        return res.json({
          ...cachedData,
          cached: true
        });
      }

      logger.debug(`Cache miss: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          cacheService.set(cacheKey, data, ttl)
            .catch(err => logger.error('Failed to cache response:', err));
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache based on patterns after successful mutations
 * @param {Array<string>} patterns - Cache key patterns to invalidate
 * @returns {Function} Express middleware
 */
const invalidateCacheMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to invalidate cache after response
    res.json = function(data) {
      // Only invalidate after successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
        Promise.all(
          patterns.map(pattern => {
            const fullPattern = pattern.includes(':userId')
              ? pattern.replace(':userId', req.user?.id || '*')
              : pattern;
            
            return cacheService.delPattern(fullPattern);
          })
        )
        .then(results => {
          const totalDeleted = results.reduce((sum, count) => sum + count, 0);
          logger.debug(`Cache invalidated: ${totalDeleted} keys deleted`);
        })
        .catch(err => logger.error('Cache invalidation error:', err));
      }
      
      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper functions for common cache operations
 */
const CacheHelpers = {
  /**
   * Cache user dashboard data
   * @param {string} userId - User ID
   * @param {Object} data - Dashboard data
   * @param {number} ttl - Time to live
   */
  cacheDashboard: async (userId, data, ttl = 300) => {
    const key = cacheService.generateKey('dashboard', userId);
    await cacheService.set(key, data, ttl);
  },

  /**
   * Get cached dashboard data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Dashboard data
   */
  getCachedDashboard: async (userId) => {
    const key = cacheService.generateKey('dashboard', userId);
    return await cacheService.get(key);
  },

  /**
   * Invalidate dashboard cache
   * @param {string} userId - User ID
   */
  invalidateDashboard: async (userId) => {
    const pattern = cacheService.generateKey('dashboard', userId, '*');
    await cacheService.delPattern(pattern);
  },

  /**
   * Cache budget data
   * @param {string} userId - User ID
   * @param {string} period - Budget period
   * @param {Object} data - Budget data
   * @param {number} ttl - Time to live
   */
  cacheBudget: async (userId, period, data, ttl = 600) => {
    const key = cacheService.generateKey('budget', userId, period);
    await cacheService.set(key, data, ttl);
  },

  /**
   * Get cached budget data
   * @param {string} userId - User ID
   * @param {string} period - Budget period
   * @returns {Promise<Object>} Budget data
   */
  getCachedBudget: async (userId, period) => {
    const key = cacheService.generateKey('budget', userId, period);
    return await cacheService.get(key);
  },

  /**
   * Invalidate budget cache
   * @param {string} userId - User ID
   */
  invalidateBudget: async (userId) => {
    const pattern = cacheService.generateKey('budget', userId, '*');
    await cacheService.delPattern(pattern);
  },

  /**
   * Cache transaction summary
   * @param {string} userId - User ID
   * @param {string} period - Time period
   * @param {Object} data - Summary data
   * @param {number} ttl - Time to live
   */
  cacheTransactionSummary: async (userId, period, data, ttl = 600) => {
    const key = cacheService.generateKey('transactions', 'summary', userId, period);
    await cacheService.set(key, data, ttl);
  },

  /**
   * Get cached transaction summary
   * @param {string} userId - User ID
   * @param {string} period - Time period
   * @returns {Promise<Object>} Summary data
   */
  getCachedTransactionSummary: async (userId, period) => {
    const key = cacheService.generateKey('transactions', 'summary', userId, period);
    return await cacheService.get(key);
  },

  /**
   * Invalidate all user caches
   * @param {string} userId - User ID
   */
  invalidateUserCache: async (userId) => {
    const patterns = [
      cacheService.generateKey('dashboard', userId, '*'),
      cacheService.generateKey('budget', userId, '*'),
      cacheService.generateKey('transactions', '*', userId, '*'),
      cacheService.generateKey('api', userId, '*')
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.delPattern(pattern))
    );
  },

  /**
   * Cache analytics data
   * @param {string} userId - User ID
   * @param {string} type - Analytics type
   * @param {Object} data - Analytics data
   * @param {number} ttl - Time to live
   */
  cacheAnalytics: async (userId, type, data, ttl = 1800) => {
    const key = cacheService.generateKey('analytics', userId, type);
    await cacheService.set(key, data, ttl);
  },

  /**
   * Get cached analytics data
   * @param {string} userId - User ID
   * @param {string} type - Analytics type
   * @returns {Promise<Object>} Analytics data
   */
  getCachedAnalytics: async (userId, type) => {
    const key = cacheService.generateKey('analytics', userId, type);
    return await cacheService.get(key);
  },

  /**
   * Invalidate analytics cache
   * @param {string} userId - User ID
   */
  invalidateAnalytics: async (userId) => {
    const pattern = cacheService.generateKey('analytics', userId, '*');
    await cacheService.delPattern(pattern);
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  CacheHelpers
};
