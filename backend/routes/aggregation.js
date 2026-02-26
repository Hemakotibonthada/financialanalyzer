// ============================================================
// Financial Analyzer - Data Aggregation Routes
// Feature #96: Aggregation & analytics API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DataAggregationService = require('../services/dataAggregationService');

// GET /api/aggregation/dashboard - Dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const result = await DataAggregationService.getDashboardData(req.user._id || req.user.id, period);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/aggregation/patterns - Spending patterns
router.get('/patterns', auth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await DataAggregationService.getSpendingPatterns(req.user._id || req.user.id, months);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/aggregation/summary - Financial summary
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await DataAggregationService.getFinancialSummary(req.user._id || req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
