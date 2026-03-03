// ============================================================
// Enhanced Automation Routes
// Comprehensive automation engine with 30+ trigger/action types
// ============================================================

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const AutomationRule = require('../models/AutomationRule');
let AutomationLog;
try { AutomationLog = require('../models/AutomationLog'); } catch(e) { /* optional */ }

router.use(authenticate);

// ============================================================
// IMPORTANT: Static routes BEFORE dynamic :id routes
// ============================================================

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
        totalSuccess: { $sum: { $ifNull: ['$successCount', 0] } },
        totalFailures: { $sum: { $ifNull: ['$failureCount', 0] } },
        avgPriority: { $avg: '$priority' }
      }}
    ]);

    const triggerBreakdown = await AutomationRule.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$trigger.type', count: { $sum: 1 }, executions: { $sum: '$executionCount' } } },
      { $sort: { executions: -1 } }
    ]);

    const actionBreakdown = await AutomationRule.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$action.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoryBreakdown = await AutomationRule.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: { $ifNull: ['$category', 'custom'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topRules = await AutomationRule.find({ userId: req.user._id, executionCount: { $gt: 0 } })
      .sort({ executionCount: -1 })
      .limit(5)
      .select('name trigger.type action.type executionCount successCount lastExecutedAt')
      .lean();

    res.json({
      success: true,
      data: {
        summary: stats[0] || { totalRules: 0, activeRules: 0, totalExecutions: 0, totalSuccess: 0, totalFailures: 0, avgPriority: 0 },
        triggerBreakdown,
        actionBreakdown,
        categoryBreakdown,
        topRules,
        successRate: stats[0] && stats[0].totalExecutions > 0
          ? Math.round(((stats[0].totalSuccess || 0) / stats[0].totalExecutions) * 100)
          : 100
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Execution history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, page = 1, ruleId } = req.query;

    if (AutomationLog) {
      const query = { userId: req.user._id, triggered: true };
      if (ruleId) query.ruleId = ruleId;

      const [logs, total] = await Promise.all([
        AutomationLog.find(query)
          .sort({ executedAt: -1 })
          .skip((page - 1) * parseInt(limit))
          .limit(parseInt(limit))
          .populate('ruleId', 'name trigger.type action.type')
          .lean(),
        AutomationLog.countDocuments(query)
      ]);

      return res.json({
        success: true,
        data: logs,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      });
    }

    // Fallback: get from rule execution history
    const rules = await AutomationRule.find({ userId: req.user._id, executionCount: { $gt: 0 } })
      .sort({ lastExecutedAt: -1 })
      .select('name trigger.type action.type executionCount lastExecutedAt executionHistory');
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available templates
router.get('/templates', async (req, res) => {
  try {
    const userTemplates = await AutomationRule.find({ userId: req.user._id, isTemplate: true }).lean();
    const builtInTemplates = getBuiltInTemplates();

    res.json({
      success: true,
      data: {
        builtIn: builtInTemplates,
        custom: userTemplates,
        total: builtInTemplates.length + userTemplates.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI-suggested rules
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user._id;
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find({
      userId,
      date: { $gte: new Date(Date.now() - 90 * 86400000) }
    }).sort({ date: -1 }).lean();

    const suggestions = generateAISuggestions(transactions);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get trigger & action metadata
router.get('/metadata', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        triggers: getTriggerMetadata(),
        actions: getActionMetadata(),
        categories: ['spending', 'saving', 'budgeting', 'investment', 'debt', 'alerting', 'reporting', 'organization', 'ai_powered', 'custom'],
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in', 'between', 'regex'],
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { action, ruleIds } = req.body;
    if (!action || !ruleIds || !Array.isArray(ruleIds)) {
      return res.status(400).json({ success: false, message: 'action and ruleIds array required' });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await AutomationRule.updateMany({ _id: { $in: ruleIds }, userId: req.user._id }, { $set: { isActive: true } });
        break;
      case 'deactivate':
        result = await AutomationRule.updateMany({ _id: { $in: ruleIds }, userId: req.user._id }, { $set: { isActive: false } });
        break;
      case 'delete':
        result = await AutomationRule.deleteMany({ _id: { $in: ruleIds }, userId: req.user._id });
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
    }

    res.json({ success: true, modified: result.modifiedCount || result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import rules
router.post('/import', async (req, res) => {
  try {
    const { rules } = req.body;
    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: 'rules array required' });
    }

    const imported = [];
    for (const ruleData of rules) {
      const rule = new AutomationRule({ ...ruleData, userId: req.user._id, executionCount: 0, successCount: 0, failureCount: 0 });
      await rule.save();
      imported.push(rule);
    }

    res.json({ success: true, data: imported, count: imported.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Export rules
router.get('/export', async (req, res) => {
  try {
    const rules = await AutomationRule.find({ userId: req.user._id }).lean();
    const exportData = rules.map(r => ({
      name: r.name,
      description: r.description,
      category: r.category,
      trigger: r.trigger,
      action: r.action,
      chainedActions: r.chainedActions,
      conditions: r.conditions,
      priority: r.priority,
      schedule: r.schedule,
      tags: r.tags,
      cooldownMinutes: r.cooldownMinutes,
      maxExecutionsPerDay: r.maxExecutionsPerDay,
    }));

    res.json({ success: true, data: exportData, count: exportData.length, exportedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test rule without saving
router.post('/test', async (req, res) => {
  try {
    const { rule, sampleData } = req.body;
    if (!rule || !sampleData) {
      return res.status(400).json({ success: false, message: 'Rule and sampleData are required' });
    }

    const matched = evaluateTrigger(rule.trigger || {}, sampleData);
    res.json({
      success: true,
      data: { matched, triggerType: rule.trigger?.type, action: rule.action?.type }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// CRUD Routes
// ============================================================

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
    const { active, trigger, category, search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id, isTemplate: { $ne: true } };
    if (active !== undefined) filter.isActive = active === 'true';
    if (trigger) filter['trigger.type'] = trigger;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [rules, total] = await Promise.all([
      AutomationRule.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      AutomationRule.countDocuments(filter)
    ]);

    res.json({ success: true, data: rules, count: rules.length, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// Dynamic :id routes (MUST come after static routes)
// ============================================================

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

// Duplicate rule
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await AutomationRule.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!original) return res.status(404).json({ success: false, message: 'Rule not found' });

    delete original._id;
    delete original.__v;
    original.name = `${original.name} (Copy)`;
    original.executionCount = 0;
    original.successCount = 0;
    original.failureCount = 0;
    original.executionHistory = [];
    original.lastExecutedAt = null;

    const copy = new AutomationRule(original);
    await copy.save();
    res.json({ success: true, data: copy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test rule by ID against sample data
router.post('/:id/test', async (req, res) => {
  try {
    const { sampleData } = req.body;
    const rule = await AutomationRule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const matched = evaluateTrigger(rule.trigger, sampleData || {});
    res.json({
      success: true,
      data: {
        matched,
        ruleName: rule.name,
        triggerType: rule.trigger.type,
        action: rule.action.type,
        chainedActions: (rule.chainedActions || []).map(a => a.type)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// Helper Functions
// ============================================================

function evaluateTrigger(trigger, data) {
  if (!trigger || !trigger.type) return false;
  const value = trigger.value;
  const params = trigger.params || {};

  switch (trigger.type) {
    case 'amount_above': return (data.amount || 0) > (value || 0);
    case 'amount_below': return (data.amount || 0) < (value || Infinity);
    case 'amount_between': return (data.amount || 0) >= (params.min || 0) && (data.amount || 0) <= (params.max || Infinity);
    case 'category_match': return (data.category || '').toLowerCase() === (value || '').toLowerCase();
    case 'keyword_match': return (data.description || '').toLowerCase().includes((value || '').toLowerCase());
    case 'merchant_match': return (data.merchantName || data.merchant || '').toLowerCase().includes((value || '').toLowerCase());
    case 'date_match': return new Date(data.date).getDate() === Number(value);
    case 'new_transaction': return true;
    default: return false;
  }
}

function getTriggerMetadata() {
  return [
    { type: 'amount_above', label: 'Amount Above', icon: 'TrendingUp', category: 'spending', description: 'When transaction exceeds a specified amount', params: ['threshold'] },
    { type: 'amount_below', label: 'Amount Below', icon: 'TrendingDown', category: 'spending', description: 'When transaction is below a specified amount', params: ['threshold'] },
    { type: 'amount_between', label: 'Amount Between', icon: 'ArrowLeftRight', category: 'spending', description: 'When transaction amount falls within a range', params: ['min', 'max'] },
    { type: 'category_match', label: 'Category Match', icon: 'Tag', category: 'spending', description: 'When transaction matches a category', params: ['category'] },
    { type: 'keyword_match', label: 'Keyword Match', icon: 'Search', category: 'spending', description: 'When description contains a keyword', params: ['keyword'] },
    { type: 'merchant_match', label: 'Merchant Match', icon: 'Store', category: 'spending', description: 'When merchant name matches', params: ['merchant'] },
    { type: 'recurring_pattern', label: 'Recurring Pattern', icon: 'Repeat', category: 'spending', description: 'When a recurring pattern is detected', params: ['pattern'] },
    { type: 'date_match', label: 'Date Match', icon: 'Calendar', category: 'spending', description: 'When transaction is on a specific date', params: ['dayOfMonth'] },
    { type: 'budget_threshold', label: 'Budget Threshold', icon: 'AlertTriangle', category: 'budgeting', description: 'When spending reaches X% of budget', params: ['percentage', 'category'] },
    { type: 'budget_exceeded', label: 'Budget Exceeded', icon: 'AlertOctagon', category: 'budgeting', description: 'When a budget is exceeded', params: ['category'] },
    { type: 'spending_velocity', label: 'Spending Velocity', icon: 'Zap', category: 'ai_powered', description: 'When spending rate increases significantly', params: ['threshold'] },
    { type: 'spending_spike', label: 'Spending Spike', icon: 'Activity', category: 'ai_powered', description: 'When unusual spending spike detected', params: ['sensitivity'] },
    { type: 'savings_milestone', label: 'Savings Milestone', icon: 'Trophy', category: 'saving', description: 'When savings reach a milestone', params: ['amount'] },
    { type: 'income_received', label: 'Income Received', icon: 'DollarSign', category: 'saving', description: 'When income/salary is credited', params: [] },
    { type: 'bill_due', label: 'Bill Due', icon: 'Clock', category: 'alerting', description: 'When a bill is approaching due date', params: ['daysBefore'] },
    { type: 'emi_due', label: 'EMI Due', icon: 'CreditCard', category: 'debt', description: 'When an EMI payment is due', params: ['daysBefore'] },
    { type: 'goal_progress', label: 'Goal Progress', icon: 'Target', category: 'saving', description: 'When goal progress reaches X%', params: ['percentage'] },
    { type: 'anomaly_detected', label: 'Anomaly Detected', icon: 'Shield', category: 'ai_powered', description: 'When AI detects unusual activity', params: ['sensitivity'] },
    { type: 'low_balance', label: 'Low Balance', icon: 'AlertCircle', category: 'alerting', description: 'When balance drops below threshold', params: ['threshold'] },
    { type: 'schedule', label: 'Schedule', icon: 'Clock', category: 'reporting', description: 'Run on a schedule (daily/weekly/monthly)', params: ['frequency', 'time'] },
    { type: 'new_transaction', label: 'New Transaction', icon: 'Plus', category: 'spending', description: 'On every new transaction', params: [] },
  ];
}

function getActionMetadata() {
  return [
    { type: 'auto_categorize', label: 'Auto Categorize', icon: 'Tag', description: 'Automatically assign category', params: ['targetCategory'] },
    { type: 'auto_tag', label: 'Auto Tag', icon: 'Hash', description: 'Add tags to transaction', params: ['tags'] },
    { type: 'send_notification', label: 'Send Notification', icon: 'Bell', description: 'Send in-app notification', params: ['title', 'message'] },
    { type: 'send_email', label: 'Send Email', icon: 'Mail', description: 'Send email notification', params: ['subject', 'body'] },
    { type: 'create_alert', label: 'Create Alert', icon: 'AlertTriangle', description: 'Create financial alert', params: ['severity', 'message'] },
    { type: 'auto_save', label: 'Auto Save', icon: 'PiggyBank', description: 'Transfer to savings automatically', params: ['percentage', 'amount'] },
    { type: 'auto_transfer', label: 'Auto Transfer', icon: 'ArrowRight', description: 'Transfer between accounts', params: ['fromAccount', 'toAccount', 'amount'] },
    { type: 'create_budget', label: 'Create Budget', icon: 'Wallet', description: 'Create or adjust budget', params: ['category', 'amount'] },
    { type: 'adjust_budget', label: 'Adjust Budget', icon: 'Settings', description: 'Modify existing budget', params: ['category', 'adjustment'] },
    { type: 'update_goal', label: 'Update Goal', icon: 'Target', description: 'Update financial goal progress', params: ['goalId', 'amount'] },
    { type: 'create_reminder', label: 'Create Reminder', icon: 'Clock', description: 'Create a future reminder', params: ['title', 'date'] },
    { type: 'generate_report', label: 'Generate Report', icon: 'FileText', description: 'Generate financial report', params: ['reportType'] },
    { type: 'export_data', label: 'Export Data', icon: 'Download', description: 'Export transactions/data', params: ['format', 'dateRange'] },
    { type: 'flag_review', label: 'Flag for Review', icon: 'Flag', description: 'Flag transaction for manual review', params: ['reason'] },
    { type: 'add_note', label: 'Add Note', icon: 'Edit', description: 'Add note to transaction', params: ['note'] },
    { type: 'run_analysis', label: 'Run AI Analysis', icon: 'Brain', description: 'Run AI analysis on spending', params: ['analysisType'] },
    { type: 'generate_insight', label: 'Generate Insight', icon: 'Lightbulb', description: 'Generate AI insight', params: ['type'] },
    { type: 'log_event', label: 'Log Event', icon: 'List', description: 'Log custom event', params: ['eventType', 'message'] },
  ];
}

function generateAISuggestions(transactions) {
  const suggestions = [];
  if (transactions.length === 0) return suggestions;

  const expenses = transactions.filter(t => t.type === 'debit');
  const categories = {};
  expenses.forEach(t => { categories[t.category || 'Other'] = (categories[t.category || 'Other'] || 0) + Math.abs(t.amount); });

  const amounts = expenses.map(t => Math.abs(t.amount));
  const mean = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

  if (mean > 0) {
    suggestions.push({
      name: 'High-Value Transaction Alert',
      description: `Alert when a transaction exceeds ₹${Math.round(mean * 3).toLocaleString()} (3x your average)`,
      trigger: { type: 'amount_above', value: Math.round(mean * 3) },
      action: { type: 'send_notification', config: { title: 'High Transaction Alert', message: 'Large transaction detected: ₹{{amount}}' } },
      category: 'alerting', confidence: 0.9,
      reason: `Based on your average transaction of ₹${Math.round(mean).toLocaleString()}`,
    });
  }

  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    suggestions.push({
      name: `${topCategory[0]} Budget Guard`,
      description: `Alert when ${topCategory[0]} spending exceeds threshold`,
      trigger: { type: 'budget_threshold', value: 80, params: { category: topCategory[0] } },
      action: { type: 'create_alert', config: { severity: 'warning', message: `${topCategory[0]} budget at 80%` } },
      category: 'budgeting', confidence: 0.85,
      reason: `${topCategory[0]} is your highest spending category at ₹${Math.round(topCategory[1]).toLocaleString()}`,
    });
  }

  const uncategorized = expenses.filter(t => !t.category || t.category === 'Other');
  if (uncategorized.length > 5) {
    suggestions.push({
      name: 'Auto-Categorize Transactions',
      description: `Automatically categorize ${uncategorized.length} uncategorized transactions using AI`,
      trigger: { type: 'new_transaction', value: true },
      action: { type: 'auto_categorize', config: { useAI: true } },
      category: 'ai_powered', confidence: 0.8,
      reason: `You have ${uncategorized.length} uncategorized transactions`,
    });
  }

  suggestions.push(
    { name: 'Pay Yourself First', description: 'Auto-save 20% when income is received', trigger: { type: 'income_received', value: true }, action: { type: 'auto_save', config: { percentage: 20 } }, category: 'saving', confidence: 0.9, reason: 'Building savings habit' },
    { name: 'Fraud & Anomaly Watch', description: 'AI-powered unusual spending detection', trigger: { type: 'anomaly_detected', value: true, params: { sensitivity: 'medium' } }, action: { type: 'send_notification', config: { title: '⚠️ Unusual Activity', message: 'Unusual spending pattern detected' } }, category: 'ai_powered', confidence: 0.95, reason: 'Protect against fraud' },
    { name: 'Recurring Expense Tracker', description: 'Track recurring payment patterns', trigger: { type: 'recurring_pattern', value: true }, action: { type: 'send_notification', config: { title: 'Recurring Payment', message: 'Recurring payment detected' } }, category: 'spending', confidence: 0.75, reason: 'Stay on top of recurring charges' }
  );

  return suggestions;
}

function getBuiltInTemplates() {
  return [
    { id: 'high_value_alert', name: 'High-Value Transaction Alert', description: 'Get notified for large transactions', category: 'alerting', icon: 'AlertTriangle', trigger: { type: 'amount_above', value: 5000 }, action: { type: 'send_notification', config: { title: 'High Value Alert', message: 'Transaction of ₹{{amount}} detected' } }, tags: ['popular', 'security'] },
    { id: 'auto_categorize', name: 'Smart Auto-Categorize', description: 'Auto-categorize new transactions using AI', category: 'ai_powered', icon: 'Brain', trigger: { type: 'new_transaction', value: true }, action: { type: 'auto_categorize', config: { useAI: true } }, tags: ['ai'] },
    { id: 'budget_guard', name: 'Budget Guardian', description: 'Alert when spending reaches 80% of budget', category: 'budgeting', icon: 'Shield', trigger: { type: 'budget_threshold', value: 80 }, action: { type: 'create_alert', config: { severity: 'warning', message: 'Budget threshold reached!' } }, tags: ['popular'] },
    { id: 'pay_yourself', name: 'Pay Yourself First', description: 'Auto-save 20% when salary is received', category: 'saving', icon: 'PiggyBank', trigger: { type: 'income_received', value: true }, action: { type: 'auto_save', config: { percentage: 20 } }, tags: ['saving'] },
    { id: 'emi_reminder', name: 'EMI Reminder', description: 'Remind 3 days before EMI due', category: 'debt', icon: 'Clock', trigger: { type: 'emi_due', value: 3 }, action: { type: 'send_notification', config: { title: 'EMI Due', message: 'EMI payment due in 3 days' } }, tags: ['debt'] },
    { id: 'food_tracker', name: 'Food Spending Tracker', description: 'Tag food-related expenses', category: 'spending', icon: 'Utensils', trigger: { type: 'category_match', value: 'Food & Dining' }, action: { type: 'auto_tag', config: { tags: ['food-expense'] } }, tags: ['spending'] },
    { id: 'anomaly_watch', name: 'AI Anomaly Watch', description: 'AI-powered unusual activity detection', category: 'ai_powered', icon: 'Eye', trigger: { type: 'anomaly_detected', value: true }, action: { type: 'send_notification', config: { title: 'Unusual Activity Detected', message: 'AI detected unusual spending' } }, tags: ['ai', 'security'] },
    { id: 'subscription_tracker', name: 'Subscription Tracker', description: 'Track recurring subscriptions', category: 'spending', icon: 'Repeat', trigger: { type: 'recurring_pattern', value: true }, action: { type: 'auto_tag', config: { tags: ['subscription'] } }, tags: ['spending'] },
    { id: 'low_balance', name: 'Low Balance Alert', description: 'Alert when balance drops below ₹5,000', category: 'alerting', icon: 'AlertCircle', trigger: { type: 'low_balance', value: 5000 }, action: { type: 'send_notification', config: { title: 'Low Balance', message: 'Balance below ₹5,000' } }, tags: ['alerting'] },
    { id: 'savings_milestone', name: 'Savings Milestone', description: 'Celebrate savings milestones', category: 'saving', icon: 'Trophy', trigger: { type: 'savings_milestone', value: 10000 }, action: { type: 'send_notification', config: { title: '🎉 Milestone!', message: 'Savings milestone reached!' } }, tags: ['saving'] },
    { id: 'weekend_budget', name: 'Weekend Budget Control', description: 'Track weekend spending', category: 'spending', icon: 'Calendar', trigger: { type: 'date_match', value: 0, params: { dayOfWeek: [0, 6] } }, action: { type: 'auto_tag', config: { tags: ['weekend'] } }, tags: ['spending'] },
    { id: 'goal_tracker', name: 'Goal Progress', description: 'Notify at 50%, 75%, 100% goal progress', category: 'saving', icon: 'Target', trigger: { type: 'goal_progress', value: 50 }, action: { type: 'send_notification', config: { title: 'Goal Progress', message: 'Goal {{progress}}% complete!' } }, tags: ['goals'] },
    { id: 'invest_surplus', name: 'Investment Opportunity', description: 'Alert when surplus funds available', category: 'investment', icon: 'TrendingUp', trigger: { type: 'high_balance', value: 50000 }, action: { type: 'generate_insight', config: { type: 'investment_suggestion' } }, tags: ['investment'] },
    { id: 'bill_reminder', name: 'Bill Reminder', description: 'Remind before bills are due', category: 'alerting', icon: 'Bell', trigger: { type: 'bill_due', value: 5 }, action: { type: 'send_notification', config: { title: 'Bill Due', message: 'A bill is due in 5 days' } }, tags: ['bills'] },
    { id: 'spending_velocity', name: 'Spending Velocity Alert', description: 'Alert on sharp spending increase', category: 'ai_powered', icon: 'Zap', trigger: { type: 'spending_velocity', value: 30 }, action: { type: 'create_alert', config: { severity: 'warning', message: 'Spending velocity up 30%+' } }, tags: ['ai'] },
    { id: 'monthly_report', name: 'Monthly Report', description: 'Auto-generate monthly summary', category: 'reporting', icon: 'FileText', trigger: { type: 'schedule', value: 'monthly' }, action: { type: 'generate_report', config: { reportType: 'monthly_summary' } }, tags: ['reporting'] },
    { id: 'daily_summary', name: 'Daily Summary', description: 'Daily spending digest at 8 PM', category: 'reporting', icon: 'BarChart', trigger: { type: 'schedule', value: 'daily' }, action: { type: 'generate_report', config: { reportType: 'daily_summary' } }, tags: ['reporting'] },
    { id: 'tax_deduction', name: 'Tax Deduction Tagger', description: 'Auto-tag tax-deductible expenses', category: 'organization', icon: 'FileCheck', trigger: { type: 'category_match', value: 'Insurance|Medical|Education|Charity' }, action: { type: 'auto_tag', config: { tags: ['tax-deductible'] } }, tags: ['tax'] },
    { id: 'round_up', name: 'Round-Up Savings', description: 'Round up & save the difference', category: 'saving', icon: 'Coins', trigger: { type: 'new_transaction', value: true }, action: { type: 'auto_save', config: { roundUp: 100 } }, tags: ['saving'] },
    { id: 'merchant_alert', name: 'New Merchant Alert', description: 'Alert for first-time merchants', category: 'alerting', icon: 'Store', trigger: { type: 'unusual_merchant', value: true }, action: { type: 'flag_review', config: { reason: 'First-time merchant' } }, tags: ['security'] },
  ];
}

module.exports = router;
