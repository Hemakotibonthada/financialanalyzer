// ============================================================================
// Financial Insights Routes — Deep financial analytics API
// ============================================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const financialInsightsService = require('../services/financialInsightsService');
const logger = require('../utils/logger');

// GET /api/financial-insights/dashboard — Full comprehensive insights
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const insights = await financialInsightsService.getComprehensiveInsights(req.user._id);
    res.json({ success: true, ...insights });
  } catch (error) {
    logger.error('Financial insights dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial-insights/trends
router.get('/trends', authenticate, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const result = await financialInsightsService.getMonthlyTrends(req.user._id, months);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Monthly trends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial-insights/categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await financialInsightsService.getCategoryInsights(req.user._id, months);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Category insights error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial-insights/ratios
router.get('/ratios', authenticate, async (req, res) => {
  try {
    const result = await financialInsightsService.getFinancialRatios(req.user._id);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Financial ratios error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial-insights/velocity
router.get('/velocity', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await financialInsightsService.getSpendingVelocity(req.user._id, days);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Spending velocity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial-insights/merchants
router.get('/merchants', authenticate, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await financialInsightsService.getMerchantAnalysis(req.user._id, months);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Merchant analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
