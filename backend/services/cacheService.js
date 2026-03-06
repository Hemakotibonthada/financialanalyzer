const logger = require('../utils/logger');

/**
 * Cache Service
 * Provides in-memory caching with optional Redis support
 * Falls back to in-memory cache if Redis is not available
 */
class CacheService {
  constructor() {
    this.inMemoryCache = new Map();
    this.redis = null;
    this.useRedis = false;
    this.defaultTTL = 300; // 5 minutes default TTL
    this._redisWarningLogged = false; // Only log Redis warnings once
  }

  /**
   * Initialize Redis connection
   * @param {Object} redisConfig - Redis configuration
   */
  async initialize(redisConfig = {}) {
    try {
      // Try to load redis module
      const redis = require('redis');
      
      const config = {
        socket: {
          host: redisConfig.host || process.env.REDIS_HOST || 'localhost',
          port: redisConfig.port || process.env.REDIS_PORT || 6379,
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              if (!this._redisWarningLogged) {
                logger.info('Redis not available — using in-memory cache (this is normal without Redis installed)');
                this._redisWarningLogged = true;
              }
              return false; // Stop retrying
            }
            return Math.min(retries * 100, 3000);
          }
        },
        password: redisConfig.password || process.env.REDIS_PASSWORD,
        database: redisConfig.db || process.env.REDIS_DB || 0
      };

      this.redis = redis.createClient(config);

      this.redis.on('error', (err) => {
        if (!this._redisWarningLogged) {
          logger.debug('Redis unavailable, using in-memory cache');
        }
        this.useRedis = false;
      });

      this.redis.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.useRedis = true;
      });

      this.redis.on('ready', () => {
        logger.info('✅ Redis is ready');
        this.useRedis = true;
      });

      this.redis.on('end', () => {
        this.useRedis = false;
      });

      // Connect with timeout
      await Promise.race([
        this.redis.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);
    } catch (error) {
      if (!this._redisWarningLogged) {
        logger.info('Redis not installed — using in-memory cache (this is fine for development)');
        this._redisWarningLogged = true;
      }
      this.useRedis = false;
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      }

      // Fallback to in-memory cache
      const cached = this.inMemoryCache.get(key);
      if (!cached) return null;

      // Check if expired
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        this.inMemoryCache.delete(key);
        return null;
      }

      return cached.value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    try {
      const expiryTime = ttl || this.defaultTTL;

      if (this.useRedis && this.redis) {
        await this.redis.setEx(key, expiryTime, JSON.stringify(value));
        return true;
      }

      // Fallback to in-memory cache
      this.inMemoryCache.set(key, {
        value,
        expiresAt: Date.now() + (expiryTime * 1000)
      });

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(key);
        return true;
      }

      // Fallback to in-memory cache
      this.inMemoryCache.delete(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., "user:123:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          return keys.length;
        }
        return 0;
      }

      // Fallback to in-memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      let count = 0;
      
      for (const key of this.inMemoryCache.keys()) {
        if (regex.test(key)) {
          this.inMemoryCache.delete(key);
          count++;
        }
      }

      return count;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      }

      // Fallback to in-memory cache
      const cached = this.inMemoryCache.get(key);
      if (!cached) return false;

      // Check if expired
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        this.inMemoryCache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Increment value in cache
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>} New value
   */
  async incr(key, amount = 1) {
    try {
      if (this.useRedis && this.redis) {
        if (amount === 1) {
          return await this.redis.incr(key);
        } else {
          return await this.redis.incrBy(key, amount);
        }
      }

      // Fallback to in-memory cache
      const current = await this.get(key) || 0;
      const newValue = current + amount;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = null) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch data
      const data = await fetchFn();
      
      // Store in cache
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }

      return data;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      // If caching fails, still return the fetched data
      try {
        return await fetchFn();
      } catch (fetchError) {
        throw fetchError;
      }
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.flushDb();
        return true;
      }

      // Fallback to in-memory cache
      this.inMemoryCache.clear();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    try {
      if (this.useRedis && this.redis) {
        const info = await this.redis.info('stats');
        return {
          type: 'redis',
          connected: this.useRedis,
          info
        };
      }

      // In-memory cache stats
      return {
        type: 'in-memory',
        connected: true,
        size: this.inMemoryCache.size,
        keys: Array.from(this.inMemoryCache.keys())
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        type: 'unknown',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Generate cache key
   * @param {string} prefix - Key prefix
   * @param  {...any} parts - Key parts
   * @returns {string} Cache key
   */
  generateKey(prefix, ...parts) {
    return [prefix, ...parts].join(':');
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
