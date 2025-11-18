const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticate } = require('../middleware/auth');

// Create Subscription
router.post('/', authenticate, async (req, res) => {
  try {
    const subscription = new Subscription({ ...req.body, userId: req.user._id });
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Subscriptions
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = { userId: req.user._id };
    if (category) query.category = category;
    if (status) query.status = status;
    
    const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Subscription by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Subscription
router.put('/:id', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    
    Object.assign(subscription, req.body);
    await subscription.save();
    
    res.json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Subscription
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Projected Cost
router.get('/:id/projected-cost', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    
    const costs = subscription.calculateProjectedCost();
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assess Utilization
router.post('/:id/assess-utilization', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, userId: req.user._id });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    
    subscription.assessUtilization();
    await subscription.save();
    
    res.json(subscription.utilization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Subscription Summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const summary = await Subscription.getSubscriptionSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Renewals
router.get('/alerts/renewals', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const subscriptions = await Subscription.find({
      userId: req.user._id,
      status: 'active',
      autoRenewal: true,
      'dates.renewalDate': { $lte: futureDate, $gte: new Date() }
    }).sort({ 'dates.renewalDate': 1 });
    
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Unused Subscriptions
router.get('/alerts/unused', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      userId: req.user._id,
      status: 'active'
    });
    
    const unused = subscriptions.filter(sub => {
      sub.assessUtilization();
      return sub.utilization.score < 30;
    });
    
    res.json(unused);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
