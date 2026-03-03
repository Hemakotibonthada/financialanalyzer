// ============================================================
// AI Engine API Routes
// Comprehensive endpoints for local AI engine
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const localAIEngine = require('../services/localAIEngine');

// ============================================================
// Dashboard - Complete AI overview in one call
// ============================================================

/**
 * @route   GET /api/ai/dashboard
 * @desc    Get complete AI dashboard with all insights
 * @access  Private
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await localAIEngine.getAIDashboard(userId);
    res.json(result);
  } catch (error) {
    console.error('AI Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Health Score
// ============================================================

/**
 * @route   GET /api/ai/health-score
 * @desc    Get financial health score (0-100)
 * @access  Private
 */
router.get('/health-score', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const score = await localAIEngine.health.calculateHealthScore(userId);
    res.json({ success: true, ...score });
  } catch (error) {
    console.error('Health score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Recommendations
// ============================================================

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get AI-powered personalized recommendations
 * @access  Private
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await localAIEngine.recommendations.generateRecommendations(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Forecasting
// ============================================================

/**
 * @route   GET /api/ai/forecast/spending
 * @desc    Get spending forecast
 * @access  Private
 */
router.get('/forecast/spending', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const days = parseInt(req.query.days) || 30;
    const result = await localAIEngine.forecast.generateSpendingForecast(userId, days);
    res.json(result);
  } catch (error) {
    console.error('Spending forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai/forecast/income
 * @desc    Get income prediction
 * @access  Private
 */
router.get('/forecast/income', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const months = parseInt(req.query.months) || 3;
    const result = await localAIEngine.forecast.predictIncome(userId, months);
    res.json(result);
  } catch (error) {
    console.error('Income forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai/forecast/savings
 * @desc    Get savings potential analysis
 * @access  Private
 */
router.get('/forecast/savings', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await localAIEngine.forecast.analyzeSavingsPotential(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Savings analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Anomalies
// ============================================================

/**
 * @route   GET /api/ai/anomalies
 * @desc    Detect spending anomalies
 * @access  Private
 */
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await localAIEngine.anomaly.detectAnomalies(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Insights
// ============================================================

/**
 * @route   GET /api/ai/insights
 * @desc    Get AI-generated insights
 * @access  Private
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const period = req.query.period || 'month';
    const result = await localAIEngine.insights.generateInsights(userId, period);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Pattern Analysis
// ============================================================

/**
 * @route   GET /api/ai/patterns/recurring
 * @desc    Detect recurring transaction patterns
 * @access  Private
 */
router.get('/patterns/recurring', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find({
      userId,
      date: { $gte: new Date(Date.now() - 180 * 86400000) },
      type: 'debit'
    }).lean();

    const patterns = localAIEngine.patterns.detectRecurringPatterns(transactions);
    res.json({ success: true, patterns, count: patterns.length });
  } catch (error) {
    console.error('Pattern detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai/patterns/merchants
 * @desc    Merchant affinity analysis
 * @access  Private
 */
router.get('/patterns/merchants', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find({
      userId,
      date: { $gte: new Date(Date.now() - 180 * 86400000) }
    }).lean();

    const merchants = localAIEngine.patterns.analyzeMerchantAffinity(transactions);
    res.json({ success: true, merchants: merchants.slice(0, 30) });
  } catch (error) {
    console.error('Merchant analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/ai/patterns/velocity
 * @desc    Spending velocity analysis
 * @access  Private
 */
router.get('/patterns/velocity', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const Transaction = require('../models/Transaction');
    const days = parseInt(req.query.days) || 7;
    const transactions = await Transaction.find({
      userId,
      date: { $gte: new Date(Date.now() - 60 * 86400000) },
      type: 'debit'
    }).lean();

    const velocity = localAIEngine.patterns.detectVelocityChanges(transactions, days);
    res.json({ success: true, ...velocity });
  } catch (error) {
    console.error('Velocity analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Model Training
// ============================================================

/**
 * @route   POST /api/ai/train
 * @desc    Train all AI models for the user
 * @access  Private
 */
router.post('/train', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await localAIEngine.trainModels(userId);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Model training error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/ai/categorize
 * @desc    Auto-categorize a transaction
 * @access  Private
 */
router.post('/categorize', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { description, amount, merchantName } = req.body;
    const result = await localAIEngine.categorize(userId, description, amount, merchantName);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
