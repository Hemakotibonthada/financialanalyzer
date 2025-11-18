const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const { authenticate } = require('../middleware/auth');

// Create Portfolio
router.post('/', authenticate, async (req, res) => {
  try {
    const portfolio = new Portfolio({ ...req.body, userId: req.user._id });
    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Portfolios
router.get('/', authenticate, async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id });
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Portfolio by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Portfolio
router.put('/:id', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Portfolio
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Holding
router.post('/:id/holdings', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    portfolio.holdings.push(req.body);
    await portfolio.save();
    
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Holding
router.put('/:id/holdings/:holdingId', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    const holding = portfolio.holdings.id(req.params.holdingId);
    if (!holding) return res.status(404).json({ error: 'Holding not found' });
    
    Object.assign(holding, req.body);
    await portfolio.save();
    
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Holding
router.delete('/:id/holdings/:holdingId', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    portfolio.holdings.pull(req.params.holdingId);
    await portfolio.save();
    
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Transaction
router.post('/:id/transactions', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    portfolio.transactions.push(req.body);
    await portfolio.save();
    
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Calculate Performance
router.post('/:id/performance', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    const performance = portfolio.calculatePerformance();
    await portfolio.save();
    
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Allocation
router.get('/:id/allocation', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    const allocation = portfolio.calculateAllocation();
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze Risk
router.get('/:id/risk', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    const riskAnalysis = portfolio.analyzeRisk();
    res.json(riskAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest Rebalancing
router.get('/:id/rebalancing', authenticate, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    
    const suggestions = portfolio.suggestRebalancing(req.query.targetAllocation);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Portfolio Summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id });
    
    const summary = {
      totalPortfolios: portfolios.length,
      totalValue: portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0),
      totalInvested: portfolios.reduce((sum, p) => sum + (p.totalInvested || 0), 0),
      totalGainLoss: portfolios.reduce((sum, p) => sum + ((p.totalValue || 0) - (p.totalInvested || 0)), 0),
      portfolios: portfolios.map(p => ({
        id: p._id,
        name: p.portfolioName,
        value: p.totalValue,
        returns: p.performance?.absoluteReturn
      }))
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
