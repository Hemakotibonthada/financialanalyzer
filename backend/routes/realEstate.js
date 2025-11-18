const express = require('express');
const router = express.Router();
const RealEstate = require('../models/RealEstate');
const { authenticate } = require('../middleware/auth');

// Create Property
router.post('/', authenticate, async (req, res) => {
  try {
    const property = new RealEstate({ ...req.body, userId: req.user._id });
    await property.save();
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Properties
router.get('/', authenticate, async (req, res) => {
  try {
    const { propertyType, status } = req.query;
    const query = { userId: req.user._id };
    if (propertyType) query.propertyType = propertyType;
    if (status) query.status = status;
    
    const properties = await RealEstate.find(query).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Property by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Property
router.put('/:id', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    Object.assign(property, req.body);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Property
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Returns
router.get('/:id/returns', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    const returns = property.calculateReturns();
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record Rent Payment
router.post('/:id/rent', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    await property.recordRentPayment(req.body.amount, req.body.month, req.body.paymentDate);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Record Expense
router.post('/:id/expenses', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    await property.recordExpense(req.body);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Record Mortgage Payment
router.post('/:id/mortgage', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    await property.recordMortgagePayment(req.body.amount, req.body.paymentDate, req.body.principal, req.body.interest);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Valuate Property
router.post('/:id/valuation', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    await property.valuateProperty(req.body.currentValue, req.body.valuationMethod, req.body.valuedBy);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Portfolio Summary
router.get('/portfolio/summary', authenticate, async (req, res) => {
  try {
    const summary = await RealEstate.getPortfolioSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Upcoming Rent Payments
router.get('/alerts/rent', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const payments = await RealEstate.getUpcomingRentPayments(req.user._id, days);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Tenant
router.post('/:id/tenants', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    property.tenants.push(req.body);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Tenant
router.put('/:id/tenants/:tenantId', authenticate, async (req, res) => {
  try {
    const property = await RealEstate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    const tenant = property.tenants.id(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    Object.assign(tenant, req.body);
    await property.save();
    
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
