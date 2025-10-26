const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const { CacheHelpers } = require('../middleware/cacheMiddleware');
const { query, body, validationResult } = require('express-validator');

/**
 * @route   GET /api/cache/stats
 * @desc    Get cache statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics'
    });
  }
});

/**
 * @route   GET /api/cache/get/:key
 * @desc    Get cached value by key
 * @access  Private
 */
router.get('/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await cacheService.get(key);

    if (value === null) {
      return res.status(404).json({
        success: false,
        message: 'Cache key not found'
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('Cache get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache value'
    });
  }
});

/**
 * @route   POST /api/cache/set
 * @desc    Set cache value
 * @access  Private
 */
router.post(
  '/set',
  [
    body('key').notEmpty().withMessage('Key is required'),
    body('value').exists().withMessage('Value is required'),
    body('ttl').optional().isInt({ min: 1 }).toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { key, value, ttl } = req.body;
      await cacheService.set(key, value, ttl);

      res.json({
        success: true,
        message: 'Cache value set successfully'
      });
    } catch (error) {
      console.error('Cache set error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set cache value'
      });
    }
  }
);

/**
 * @route   DELETE /api/cache/delete/:key
 * @desc    Delete cache key
 * @access  Private
 */
router.delete('/delete/:key', async (req, res) => {
  try {
    const { key } = req.params;
    await cacheService.del(key);

    res.json({
      success: true,
      message: 'Cache key deleted successfully'
    });
  } catch (error) {
    console.error('Cache delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache key'
    });
  }
});

/**
 * @route   DELETE /api/cache/pattern/:pattern
 * @desc    Delete cache keys matching pattern
 * @access  Private
 */
router.delete('/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const count = await cacheService.delPattern(pattern);

    res.json({
      success: true,
      data: {
        deletedCount: count
      },
      message: `${count} cache keys deleted`
    });
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache keys'
    });
  }
});

/**
 * @route   POST /api/cache/clear
 * @desc    Clear all cache
 * @access  Private (Admin only)
 */
router.post('/clear', async (req, res) => {
  try {
    await cacheService.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

/**
 * @route   DELETE /api/cache/user
 * @desc    Invalidate all cache for current user
 * @access  Private
 */
router.delete('/user', async (req, res) => {
  try {
    const userId = req.user.id;
    await CacheHelpers.invalidateUserCache(userId);

    res.json({
      success: true,
      message: 'User cache invalidated successfully'
    });
  } catch (error) {
    console.error('User cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate user cache'
    });
  }
});

/**
 * @route   DELETE /api/cache/dashboard
 * @desc    Invalidate dashboard cache
 * @access  Private
 */
router.delete('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    await CacheHelpers.invalidateDashboard(userId);

    res.json({
      success: true,
      message: 'Dashboard cache invalidated'
    });
  } catch (error) {
    console.error('Dashboard cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate dashboard cache'
    });
  }
});

/**
 * @route   DELETE /api/cache/budget
 * @desc    Invalidate budget cache
 * @access  Private
 */
router.delete('/budget', async (req, res) => {
  try {
    const userId = req.user.id;
    await CacheHelpers.invalidateBudget(userId);

    res.json({
      success: true,
      message: 'Budget cache invalidated'
    });
  } catch (error) {
    console.error('Budget cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate budget cache'
    });
  }
});

/**
 * @route   DELETE /api/cache/analytics
 * @desc    Invalidate analytics cache
 * @access  Private
 */
router.delete('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    await CacheHelpers.invalidateAnalytics(userId);

    res.json({
      success: true,
      message: 'Analytics cache invalidated'
    });
  } catch (error) {
    console.error('Analytics cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate analytics cache'
    });
  }
});

module.exports = router;
