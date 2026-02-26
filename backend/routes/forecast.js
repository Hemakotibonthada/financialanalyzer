// ============================================================
// Financial Analyzer - Forecast Routes
// Feature #90: Financial forecasting API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const FinancialForecastService = require('../services/financialForecastService');

// GET /api/forecast - Generate financial forecast
router.get('/', auth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const result = await FinancialForecastService.generateForecast(req.user._id || req.user.id, months);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/forecast/cashflow - Cash flow projection
router.get('/cashflow', auth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await FinancialForecastService.projectCashFlow(req.user._id || req.user.id, months);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/forecast/goal - Goal achievement forecast
router.post('/goal', auth, async (req, res) => {
  try {
    const { goalAmount, currentSaved, monthlyContribution } = req.body;
    const result = await FinancialForecastService.forecastGoalAchievement(
      req.user._id || req.user.id,
      goalAmount,
      currentSaved || 0,
      monthlyContribution || 0
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/forecast/retirement - Retirement forecast
router.post('/retirement', auth, async (req, res) => {
  try {
    const result = await FinancialForecastService.forecastRetirement(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/forecast/expenses - Expense category forecast
router.get('/expenses', auth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = await FinancialForecastService.forecastExpensesByCategory(req.user._id || req.user.id, months);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
