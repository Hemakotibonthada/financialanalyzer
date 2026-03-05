/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  EXPENSE INTELLIGENCE ROUTES - Smart Expense Analysis API Endpoints
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const expenseService = require('../services/expenseIntelligenceService');
const logger = require('../utils/logger');

// Full spending analysis
router.get('/analyze', authenticate, async (req, res) => {
  try {
    const { days = 90, granularity = 'monthly' } = req.query;
    const data = await expenseService.analyzeSpending(req.user._id, {
      days: parseInt(days),
      granularity
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Expense analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze expenses', error: error.message });
  }
});

// Budget comparison
router.get('/budget-comparison', authenticate, async (req, res) => {
  try {
    const { month } = req.query;
    const data = await expenseService.getBudgetComparison(req.user._id, month);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Budget comparison error:', error);
    res.status(500).json({ success: false, message: 'Failed to get budget comparison', error: error.message });
  }
});

// Category breakdown
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analysis = await expenseService.analyzeSpending(req.user._id, { days: parseInt(days) });
    res.json({ success: true, data: analysis.summary?.categoryBreakdown || {} });
  } catch (error) {
    logger.error('Category breakdown error:', error);
    res.status(500).json({ success: false, message: 'Failed to get categories', error: error.message });
  }
});

// Anomaly detection
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const analysis = await expenseService.analyzeSpending(req.user._id, { days: parseInt(days) });
    res.json({ success: true, data: analysis.anomalies || [] });
  } catch (error) {
    logger.error('Anomaly detection error:', error);
    res.status(500).json({ success: false, message: 'Failed to detect anomalies', error: error.message });
  }
});

// Savings opportunities
router.get('/savings-opportunities', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const analysis = await expenseService.analyzeSpending(req.user._id, { days: parseInt(days) });
    res.json({ success: true, data: analysis.savingsOpportunities || [] });
  } catch (error) {
    logger.error('Savings opportunities error:', error);
    res.status(500).json({ success: false, message: 'Failed to find savings opportunities', error: error.message });
  }
});

// Merchant analysis
router.get('/merchants', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const analysis = await expenseService.analyzeSpending(req.user._id, { days: parseInt(days) });
    res.json({ success: true, data: analysis.merchantAnalysis || [] });
  } catch (error) {
    logger.error('Merchant analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze merchants', error: error.message });
  }
});

// Spending patterns
router.get('/patterns', authenticate, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const analysis = await expenseService.analyzeSpending(req.user._id, { days: parseInt(days) });
    res.json({ success: true, data: { patterns: analysis.patterns || [], dayOfWeek: analysis.dayOfWeekAnalysis || [], timeOfDay: analysis.timeOfDayAnalysis || [] } });
  } catch (error) {
    logger.error('Spending patterns error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze patterns', error: error.message });
  }
});

module.exports = router;
