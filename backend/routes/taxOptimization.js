// ============================================================
// Financial Analyzer - Tax Optimization Routes
// Feature #95: Tax optimization API endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TaxOptimizationService = require('../services/taxOptimizationService');

// POST /api/tax/calculate - Calculate tax under both regimes
router.post('/calculate', auth, (req, res) => {
  try {
    const result = TaxOptimizationService.calculateTax(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tax/suggestions - Get tax-saving investment suggestions
router.post('/suggestions', auth, (req, res) => {
  try {
    const result = TaxOptimizationService.suggestTaxSavingInvestments(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tax/calendar - Tax calendar with important dates
router.get('/calendar', auth, (req, res) => {
  try {
    const fy = req.query.fy || '2024-25';
    const result = TaxOptimizationService.getTaxCalendar(fy);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tax/deductions - Get all available deductions
router.get('/deductions', auth, (req, res) => {
  try {
    res.json({ success: true, deductions: TaxOptimizationService.DEDUCTION_LIMITS });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tax/slabs - Get current tax slabs
router.get('/slabs', auth, (req, res) => {
  try {
    res.json({
      success: true,
      newRegime: TaxOptimizationService.NEW_REGIME_SLABS,
      oldRegime: TaxOptimizationService.OLD_REGIME_SLABS,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
