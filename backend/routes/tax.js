const express = require('express');
const router = express.Router();
const TaxRecord = require('../models/TaxRecord');
const { authenticate } = require('../middleware/auth');

// Create Tax Record
router.post('/', authenticate, async (req, res) => {
  try {
    const taxRecord = new TaxRecord({ ...req.body, userId: req.user._id });
    await taxRecord.save();
    res.status(201).json(taxRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Tax Records
router.get('/', authenticate, async (req, res) => {
  try {
    const { assessmentYear, status } = req.query;
    const query = { userId: req.user._id };
    if (assessmentYear) query.assessmentYear = assessmentYear;
    if (status) query['itrFiling.status'] = status;
    
    const records = await TaxRecord.find(query).sort({ assessmentYear: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tax Record by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Tax Record
router.put('/:id', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    
    Object.assign(record, req.body);
    await record.save();
    
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Tax Record
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    res.json({ message: 'Tax record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Tax
router.post('/:id/calculate', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    
    const taxCalculation = record.calculateTax();
    await record.save();
    
    res.json(taxCalculation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Optimizations
router.post('/:id/optimize', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    
    const optimizations = record.generateOptimizations();
    await record.save();
    
    res.json(optimizations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare Tax Regimes
router.post('/:id/compare-regimes', authenticate, async (req, res) => {
  try {
    const record = await TaxRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Tax record not found' });
    
    const currentRegime = record.calculateTax();
    const otherRegime = record.calculateOtherRegimeTax();
    
    res.json({
      currentRegime: {
        regime: record.taxRegime,
        totalTax: currentRegime.totalTax
      },
      otherRegime: {
        regime: record.taxRegime === 'old' ? 'new' : 'old',
        totalTax: otherRegime.totalTax
      },
      savings: Math.abs(currentRegime.totalTax - otherRegime.totalTax),
      recommendation: currentRegime.totalTax < otherRegime.totalTax ? record.taxRegime : (record.taxRegime === 'old' ? 'new' : 'old')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tax Summary
router.get('/summary/:assessmentYear', authenticate, async (req, res) => {
  try {
    const records = await TaxRecord.find({
      userId: req.user._id,
      assessmentYear: req.params.assessmentYear
    });
    
    if (records.length === 0) {
      return res.status(404).json({ error: 'No tax records found for this year' });
    }
    
    const summary = {
      totalIncome: records.reduce((sum, r) => sum + r.income.total, 0),
      totalDeductions: records.reduce((sum, r) => sum + r.deductions.total, 0),
      totalTax: records.reduce((sum, r) => sum + (r.taxCalculation?.totalTax || 0), 0),
      records: records.length
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
