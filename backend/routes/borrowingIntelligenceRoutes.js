/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  BORROWING INTELLIGENCE ROUTES - AI-Powered Loan Analysis API
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const borrowingAI = require('../services/borrowingIntelligenceService');
const logger = require('../utils/logger');

/**
 * @route GET /api/borrowing-intelligence/analytics
 * @desc Get comprehensive AI-powered borrowing analytics
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const data = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Borrowing intelligence analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
  }
});

/**
 * @route GET /api/borrowing-intelligence/health-score
 * @desc Get borrowing health score
 */
router.get('/health-score', authenticate, async (req, res) => {
  try {
    const data = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data: data.healthScore });
  } catch (error) {
    logger.error('Health score error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate health score', error: error.message });
  }
});

/**
 * @route GET /api/borrowing-intelligence/predictions
 * @desc Get AI predictions for borrowing
 */
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const analytics = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data: { predictions: analytics.predictions, timeline: analytics.timeline, capacity: analytics.capacity } });
  } catch (error) {
    logger.error('Predictions error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate predictions', error: error.message });
  }
});

/**
 * @route GET /api/borrowing-intelligence/recommendations
 * @desc Get AI-powered recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const analytics = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data: analytics.recommendations });
  } catch (error) {
    logger.error('Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recommendations', error: error.message });
  }
});

/**
 * @route GET /api/borrowing-intelligence/insights
 * @desc Get natural language insights
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const analytics = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data: analytics.insights });
  } catch (error) {
    logger.error('Insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate insights', error: error.message });
  }
});

/**
 * @route GET /api/borrowing-intelligence/risk
 * @desc Get risk assessment
 */
router.get('/risk', authenticate, async (req, res) => {
  try {
    const analytics = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({ success: true, data: analytics.riskAssessment });
  } catch (error) {
    logger.error('Risk assessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to assess risk', error: error.message });
  }
});

/**
 * @route POST /api/borrowing-intelligence/train
 * @desc Trigger manual model training
 */
router.post('/train', authenticate, async (req, res) => {
  try {
    const analytics = await borrowingAI.getComprehensiveAnalytics(req.user._id);
    res.json({
      success: true,
      message: 'Model trained successfully',
      data: analytics.modelInfo
    });
  } catch (error) {
    logger.error('Training error:', error);
    res.status(500).json({ success: false, message: 'Failed to train model', error: error.message });
  }
});

module.exports = router;
