const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const AutomationRule = require('../models/AutomationRule');

router.use(authenticate);

// Create automation rule
router.post('/', async (req, res) => {
  try {
    const rule = new AutomationRule({ ...req.body, userId: req.user._id });
    await rule.save();
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// List all rules for user
router.get('/', async (req, res) => {
  try {
    const { active, trigger } = req.query;
    const filter = { userId: req.user._id };
    if (active !== undefined) filter.isActive = active === 'true';
    if (trigger) filter['trigger.type'] = trigger;

    const rules = await AutomationRule.find(filter).sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, data: rules, count: rules.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get rule by ID
router.get('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update rule
router.put('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete rule
router.delete('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle rule active/inactive
router.patch('/:id/toggle', async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Execution history
router.get('/history', async (req, res) => {
  try {
    const rules = await AutomationRule.find({ userId: req.user._id, executionCount: { $gt: 0 } })
      .sort({ lastExecutedAt: -1 })
      .select('name trigger.type action.type executionCount lastExecutedAt');
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Automation statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await AutomationRule.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        totalRules: { $sum: 1 },
        activeRules: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalExecutions: { $sum: '$executionCount' },
        avgPriority: { $avg: '$priority' }
      }}
    ]);
    const triggerBreakdown = await AutomationRule.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$trigger.type', count: { $sum: 1 } } }
    ]);
    res.json({
      success: true,
      data: {
        summary: stats[0] || { totalRules: 0, activeRules: 0, totalExecutions: 0, avgPriority: 0 },
        triggerBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test rule against sample data
router.post('/test', async (req, res) => {
  try {
    const { rule, sampleData } = req.body;
    if (!rule || !sampleData) {
      return res.status(400).json({ success: false, message: 'Rule and sampleData are required' });
    }
    let matched = false;
    const triggerType = rule.trigger?.type;
    const triggerValue = rule.trigger?.value;

    if (triggerType === 'amount_above') matched = sampleData.amount > triggerValue;
    else if (triggerType === 'amount_below') matched = sampleData.amount < triggerValue;
    else if (triggerType === 'category_match') matched = sampleData.category === triggerValue;
    else if (triggerType === 'keyword_match') matched = sampleData.description?.toLowerCase().includes(triggerValue?.toLowerCase());
    else if (triggerType === 'date_match') matched = new Date(sampleData.date).getDate() === Number(triggerValue);

    res.json({ success: true, data: { matched, triggerType, action: rule.action?.type } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
