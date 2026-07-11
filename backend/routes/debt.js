const express = require('express');
const router = express.Router();
const Debt = require('../models/Debt');
const { authenticate } = require('../middleware/auth');
const { enforceLimit } = require('../middleware/entitlements');

// Create Debt
router.post('/', authenticate, async (req, res) => {
  try {
    // Enforce free-tier debt limit (unlimited on Pro/Premium/admin)
    const activeCount = await Debt.countDocuments({ userId: req.user._id, status: 'active' });
    if (!enforceLimit(req, res, 'maxDebts', activeCount)) return;

    const debt = new Debt({ ...req.body, userId: req.user._id });
    await debt.save();
    res.status(201).json(debt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Debts
router.get('/', authenticate, async (req, res) => {
  try {
    const { debtType, status } = req.query;
    const query = { userId: req.user._id };
    if (debtType) query.debtType = debtType;
    if (status) query.status = status;
    
    const debts = await Debt.find(query).sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Debt by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Debt
router.put('/:id', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    Object.assign(debt, req.body);
    await debt.save();
    
    res.json(debt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Debt
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    res.json({ message: 'Debt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Statistics
router.get('/:id/statistics', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    const stats = debt.calculateStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Payment
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    await debt.recordPayment(req.body.amount, req.body.paymentDate, req.body.principal, req.body.interest);
    await debt.save();
    
    res.json(debt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Record Prepayment
router.post('/:id/prepayments', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    await debt.recordPrepayment(req.body.amount, req.body.paymentDate);
    await debt.save();
    
    res.json(debt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate Amortization Schedule
router.get('/:id/amortization', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    const schedule = debt.generateAmortizationSchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Payoff With Extra Payment
router.post('/:id/payoff-calculator', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    const payoff = debt.calculatePayoffWithExtra(req.body.extraMonthlyPayment);
    res.json(payoff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze Refinance Opportunity
router.post('/:id/refinance-analysis', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    const analysis = debt.analyzeRefinanceOpportunity(req.body.newInterestRate, req.body.newTerm, req.body.closingCosts);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assess Credit Impact
router.get('/:id/credit-impact', authenticate, async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    
    const impact = debt.assessCreditImpact();
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Debt Summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const summary = await Debt.getDebtSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Payoff Plan
router.get('/dashboard/payoff-plan', authenticate, async (req, res) => {
  try {
    const method = req.query.method || 'avalanche';
    const extraMonthly = parseFloat(req.query.extraMonthly) || 0;
    const plan = await Debt.getPayoffPlan(req.user._id, method, extraMonthly);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === Advanced Debt Management Routes ===
const debtManagementService = require('../services/debtManagementService');

/**
 * @route   GET /api/debt/analysis
 * @desc    Get comprehensive debt analysis with all payoff strategies
 * @access  Private
 */
router.get('/analysis', authenticate, async (req, res) => {
  try {
    const extraPayment = parseFloat(req.query.extraPayment) || 0;
    const analysis = await debtManagementService.analyzeDebts(req.user._id, extraPayment);
    res.json(analysis);
  } catch (error) {
    console.error('Error getting debt analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/debt/payoff-comparison
 * @desc    Compare payoff strategies with different extra payment amounts
 * @access  Private
 */
router.get('/payoff-comparison', authenticate, async (req, res) => {
  try {
    const extraPayments = req.query.amounts 
      ? req.query.amounts.split(',').map(a => parseFloat(a))
      : [0, 500, 1000, 2000, 5000];
    
    const comparison = await debtManagementService.calculatePayoffComparison(
      req.user._id,
      extraPayments
    );
    res.json(comparison);
  } catch (error) {
    console.error('Error getting payoff comparison:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/debt/snowball
 * @desc    Calculate snowball method payoff plan
 * @access  Private
 */
router.post('/snowball', authenticate, async (req, res) => {
  try {
    const { extraPayment } = req.body;
    const analysis = await debtManagementService.analyzeDebts(
      req.user._id,
      extraPayment || 0
    );
    res.json({
      strategy: analysis.strategies.snowball,
      debtFreeDate: analysis.debtFreeDates.snowball,
      savings: analysis.comparison.strategies[1]
    });
  } catch (error) {
    console.error('Error calculating snowball method:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/debt/avalanche
 * @desc    Calculate avalanche method payoff plan
 * @access  Private
 */
router.post('/avalanche', authenticate, async (req, res) => {
  try {
    const { extraPayment } = req.body;
    const analysis = await debtManagementService.analyzeDebts(
      req.user._id,
      extraPayment || 0
    );
    res.json({
      strategy: analysis.strategies.avalanche,
      debtFreeDate: analysis.debtFreeDates.avalanche,
      savings: analysis.comparison.strategies[2]
    });
  } catch (error) {
    console.error('Error calculating avalanche method:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/debt/current-situation
 * @desc    Get current debt situation summary
 * @access  Private
 */
router.get('/current-situation', authenticate, async (req, res) => {
  try {
    const analysis = await debtManagementService.analyzeDebts(req.user._id, 0);
    res.json({
      situation: analysis.currentSituation,
      debts: analysis.allDebts
    });
  } catch (error) {
    console.error('Error getting current situation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/debt/recommendations
 * @desc    Get debt management recommendations
 * @access  Private
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const analysis = await debtManagementService.analyzeDebts(req.user._id, 0);
    res.json(analysis.recommendations);
  } catch (error) {
    console.error('Error getting debt recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/debt/projections
 * @desc    Get debt payoff projections
 * @access  Private
 */
router.get('/projections', authenticate, async (req, res) => {
  try {
    const extraPayment = parseFloat(req.query.extraPayment) || 0;
    const analysis = await debtManagementService.analyzeDebts(req.user._id, extraPayment);
    res.json(analysis.projections);
  } catch (error) {
    console.error('Error getting debt projections:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/debt/debt-free-calculator
 * @desc    Calculate when user will be debt-free with given strategy
 * @access  Private
 */
router.get('/debt-free-calculator', authenticate, async (req, res) => {
  try {
    const extraPayment = parseFloat(req.query.extraPayment) || 0;
    const method = req.query.method || 'avalanche';
    
    const analysis = await debtManagementService.analyzeDebts(req.user._id, extraPayment);
    const strategy = analysis.strategies[method];
    const debtFreeDate = analysis.debtFreeDates[method];

    res.json({
      method,
      extraPayment,
      monthsToPayoff: strategy.monthsToPayoff,
      debtFreeDate: debtFreeDate.date,
      totalInterestPaid: strategy.totalInterestPaid,
      totalPaid: strategy.totalPaid,
      monthlySavings: analysis.comparison.potentialSavings / strategy.monthsToPayoff
    });
  } catch (error) {
    console.error('Error calculating debt-free date:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
