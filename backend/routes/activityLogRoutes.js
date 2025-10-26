const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   GET /api/activity-logs
 * @desc    Get user's activity logs with pagination and filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      severity,
      isSuccess,
      startDate,
      endDate
    } = req.query;

    // Build filter
    const filter = { userId: req.user._id };
    
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (severity) filter.severity = severity;
    if (isSuccess !== undefined) filter.isSuccess = isSuccess === 'true';
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-metadata.errorStack -userAgent')
        .lean(),
      ActivityLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        description: log.action.replace(/_/g, ' ')
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/activity-logs/summary
 * @desc    Get user's activity summary
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const summary = await ActivityLog.getUserActivitySummary(
      req.user._id,
      parseInt(days)
    );

    // Get total counts
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [totalLogs, failedLogs, criticalLogs] = await Promise.all([
      ActivityLog.countDocuments({
        userId: req.user._id,
        createdAt: { $gte: startDate }
      }),
      ActivityLog.countDocuments({
        userId: req.user._id,
        isSuccess: false,
        createdAt: { $gte: startDate }
      }),
      ActivityLog.countDocuments({
        userId: req.user._id,
        severity: 'critical',
        createdAt: { $gte: startDate }
      })
    ]);

    res.json({
      success: true,
      summary: {
        totalActivities: totalLogs,
        failedActivities: failedLogs,
        criticalActivities: criticalLogs,
        successRate: totalLogs > 0 ? ((totalLogs - failedLogs) / totalLogs * 100).toFixed(2) : 100,
        byAction: summary
      },
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      }
    });

  } catch (error) {
    logger.error('Get activity summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/activity-logs/recent
 * @desc    Get user's recent activities
 * @access  Private
 */
router.get('/recent', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const logs = await ActivityLog.getRecentActivities(
      req.user._id,
      parseInt(limit)
    );

    res.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        description: log.action.replace(/_/g, ' ')
      })),
      count: logs.length
    });

  } catch (error) {
    logger.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/activity-logs/failed
 * @desc    Get user's failed activities
 * @access  Private
 */
router.get('/failed', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const logs = await ActivityLog.getFailedActivities(
      req.user._id,
      parseInt(days)
    );

    res.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        description: log.action.replace(/_/g, ' ')
      })),
      count: logs.length,
      period: {
        days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Get failed activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/activity-logs
 * @desc    Clear user's activity logs (older than specified days)
 * @access  Private
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await ActivityLog.deleteMany({
      userId: req.user._id,
      createdAt: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} activity logs older than ${days} days`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Delete activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
