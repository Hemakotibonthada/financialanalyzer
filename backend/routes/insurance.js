const express = require('express');
const router = express.Router();
const InsurancePolicy = require('../models/InsurancePolicy');
const { authenticate } = require('../middleware/auth');

// Create Insurance Policy
router.post('/', authenticate, async (req, res) => {
  try {
    const policy = new InsurancePolicy({ ...req.body, userId: req.user._id });
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Policies
router.get('/', authenticate, async (req, res) => {
  try {
    const { policyType, status } = req.query;
    const query = { userId: req.user._id };
    if (policyType) query.policyType = policyType;
    if (status) query.status = status;
    
    const policies = await InsurancePolicy.find(query).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Policy by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Policy
router.put('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Policy
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Premium Payment
router.post('/:id/premiums', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.recordPremiumPayment(req.body.amount, req.body.paymentDate, req.body.paymentMethod);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// File Claim
router.post('/:id/claims', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.fileClaim(req.body);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Claim Status
router.put('/:id/claims/:claimId', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.updateClaimStatus(req.params.claimId, req.body.status, req.body.settlementAmount, req.body.notes);
    await policy.save();
    
    res.json(policy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Calculate Returns
router.get('/:id/returns', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    const returns = policy.calculateReturns();
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assess Risk
router.post('/:id/risk-assessment', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    await policy.assessRisk();
    await policy.save();
    
    res.json(policy.riskAssessment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Expiring Policies
router.get('/alerts/expiring', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const policies = await InsurancePolicy.getExpiringPolicies(req.user._id, days);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Premiums Due
router.get('/alerts/premiums-due', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const policies = await InsurancePolicy.getPremiumsDue(req.user._id, days);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Coverage Analysis
router.get('/analysis/coverage', authenticate, async (req, res) => {
  try {
    const analysis = await InsurancePolicy.getCoverageAnalysis(req.user._id);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
