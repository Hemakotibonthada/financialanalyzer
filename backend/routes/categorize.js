// ============================================================
// Financial Analyzer - Smart Categorization Routes
// Feature #89: AI categorization API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SmartCategorizationService = require('../services/smartCategorizationService');

// POST /api/categorize - Categorize a single transaction
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, error: 'description is required' });
    }
    const result = await SmartCategorizationService.categorize(description, amount || 0);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/categorize/batch - Batch categorize transactions
router.post('/batch', auth, async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ success: false, error: 'transactions array is required' });
    }
    const results = await SmartCategorizationService.batchCategorize(transactions);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/categorize/learn - Learn from user correction
router.post('/learn', auth, async (req, res) => {
  try {
    const { description, correctCategory } = req.body;
    if (!description || !correctCategory) {
      return res.status(400).json({ success: false, error: 'description and correctCategory are required' });
    }
    const result = await SmartCategorizationService.learnFromCorrection(description, correctCategory);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categorize/categories - Get all categories
router.get('/categories', auth, (req, res) => {
  try {
    const categories = SmartCategorizationService.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categorize/insights - Get category insights
router.get('/insights', auth, async (req, res) => {
  try {
    const result = await SmartCategorizationService.getCategoryInsights(req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categorize/anomalies - Detect spending anomalies
router.get('/anomalies', auth, async (req, res) => {
  try {
    const result = await SmartCategorizationService.detectAnomalies(req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/categorize/suggest-budget - Suggest budget allocation
router.post('/suggest-budget', auth, async (req, res) => {
  try {
    const { monthlyIncome } = req.body;
    if (!monthlyIncome) {
      return res.status(400).json({ success: false, error: 'monthlyIncome is required' });
    }
    const result = await SmartCategorizationService.suggestBudget(req.user._id || req.user.id, monthlyIncome);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
