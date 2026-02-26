// ============================================================
// Financial Analyzer - Budget Optimization Routes
// Feature #91: Budget optimization API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const BudgetOptimizationService = require('../services/budgetOptimizationService');

// POST /api/budget-optimization/optimize - Optimize budget
router.post('/optimize', auth, async (req, res) => {
  try {
    const { monthlyIncome } = req.body;
    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ success: false, error: 'monthlyIncome is required and must be positive' });
    }
    const result = await BudgetOptimizationService.optimizeBudget(req.user._id || req.user.id, monthlyIncome);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/budget-optimization/generate - Generate smart budget
router.post('/generate', auth, async (req, res) => {
  try {
    const { monthlyIncome, preferences } = req.body;
    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ success: false, error: 'monthlyIncome is required and must be positive' });
    }
    const result = BudgetOptimizationService.generateSmartBudget(monthlyIncome, preferences || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/budget-optimization/compare - Compare spending periods
router.post('/compare', auth, async (req, res) => {
  try {
    const { period1Start, period1End, period2Start, period2End } = req.body;
    const result = await BudgetOptimizationService.compareSpendingPeriods(
      req.user._id || req.user.id,
      new Date(period1Start),
      new Date(period1End),
      new Date(period2Start),
      new Date(period2End)
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/budget-optimization/rules - Get budget rule presets
router.get('/rules', auth, (req, res) => {
  res.json({ success: true, rules: BudgetOptimizationService.BUDGET_RULES });
});

// GET /api/budget-optimization/benchmarks - Get category benchmarks
router.get('/benchmarks', auth, (req, res) => {
  res.json({ success: true, benchmarks: BudgetOptimizationService.CATEGORY_BENCHMARKS });
});

module.exports = router;
