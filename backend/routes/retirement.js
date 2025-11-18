const express = require('express');
const router = express.Router();
const RetirementPlan = require('../models/RetirementPlan');
const { authenticate } = require('../middleware/auth');

// Create Retirement Plan
router.post('/', authenticate, async (req, res) => {
  try {
    const plan = new RetirementPlan({ ...req.body, userId: req.user._id });
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Plans
router.get('/', authenticate, async (req, res) => {
  try {
    const plans = await RetirementPlan.find({ userId: req.user._id });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Plan by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Plan
router.put('/:id', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    Object.assign(plan, req.body);
    await plan.save();
    
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Plan
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Required Corpus
router.post('/:id/calculate-corpus', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const corpus = plan.calculateRequiredCorpus();
    await plan.save();
    
    res.json(corpus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Monthly Savings Required
router.post('/:id/calculate-savings', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const savings = plan.calculateMonthlySavingsRequired();
    res.json(savings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Projections
router.post('/:id/projections', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const projections = plan.generateProjections();
    await plan.save();
    
    res.json(projections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run Scenario Analysis
router.post('/:id/scenarios', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const scenarios = plan.runScenarioAnalysis(req.body.scenarios);
    await plan.save();
    
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assess Risks
router.post('/:id/assess-risks', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const risks = plan.assessRisks();
    await plan.save();
    
    res.json(risks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Investment
router.post('/:id/investments', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    plan.investments.push(req.body);
    await plan.save();
    
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Investment
router.put('/:id/investments/:investmentId', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const investment = plan.investments.id(req.params.investmentId);
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    
    Object.assign(investment, req.body);
    await plan.save();
    
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Investment
router.delete('/:id/investments/:investmentId', authenticate, async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    plan.investments.pull(req.params.investmentId);
    await plan.save();
    
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const plans = await RetirementPlan.find({ userId: req.user._id });
    
    const summary = {
      totalPlans: plans.length,
      totalCurrentValue: plans.reduce((sum, p) => sum + (p.corpusCalculation?.currentValue || 0), 0),
      totalRequiredCorpus: plans.reduce((sum, p) => sum + (p.corpusCalculation?.requiredCorpus || 0), 0),
      averageProgress: plans.reduce((sum, p) => sum + (p.progress?.percentageAchieved || 0), 0) / plans.length,
      yearsToRetirement: plans.map(p => {
        const years = p.retirementAge - p.currentAge;
        return years > 0 ? years : 0;
      }).sort((a, b) => a - b)[0] || 0
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
