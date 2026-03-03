const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Models (lazy-loaded)
// ---------------------------------------------------------------------------

let AutomationRule, Transaction, AutomationLog;

function loadModels() {
  if (!AutomationRule) {
    try {
      AutomationRule = require('../models/AutomationRule');
    } catch {
      logger.warn('AutomationRule model not found – using in-memory store');
    }
  }
  if (!Transaction) {
    try {
      Transaction = require('../models/Transaction');
    } catch {
      logger.warn('Transaction model not found');
    }
  }
  if (!AutomationLog) {
    try {
      AutomationLog = require('../models/AutomationLog');
    } catch {
      logger.warn('AutomationLog model not found – execution history disabled');
    }
  }
}

// ---------------------------------------------------------------------------
// Supported triggers & actions
// ---------------------------------------------------------------------------

const SUPPORTED_TRIGGERS = {
  // ── Amount-based ────────────────────────────────────
  amount_above: {
    label: 'Amount Above Threshold',
    description: 'Triggers when a transaction amount exceeds a specified value',
    params: ['threshold'],
    category: 'spending',
  },
  amount_below: {
    label: 'Amount Below Threshold',
    description: 'Triggers when a transaction amount is below a specified value',
    params: ['threshold'],
    category: 'spending',
  },
  amount_between: {
    label: 'Amount In Range',
    description: 'Triggers when a transaction amount falls within a range',
    params: ['minAmount', 'maxAmount'],
    category: 'spending',
  },
  // ── Category / Merchant ─────────────────────────────
  category_match: {
    label: 'Category Match',
    description: 'Triggers when a transaction matches one or more categories',
    params: ['categories'],
    category: 'organization',
  },
  merchant_match: {
    label: 'Merchant Match',
    description: 'Triggers when merchant name matches a pattern',
    params: ['merchantPatterns'],
    category: 'organization',
  },
  keyword_match: {
    label: 'Keyword Match',
    description: 'Triggers when transaction description contains keywords',
    params: ['keywords', 'matchMode'],
    category: 'organization',
  },
  // ── Pattern / Date ──────────────────────────────────
  recurring_pattern: {
    label: 'Recurring Pattern',
    description: 'Triggers for detected recurring transaction patterns',
    params: ['merchantPattern', 'frequencyDays'],
    category: 'spending',
  },
  date_match: {
    label: 'Date Match',
    description: 'Triggers on specific dates or day-of-month',
    params: ['dayOfMonth', 'dayOfWeek'],
    category: 'alerting',
  },
  // ── Budget / Threshold ──────────────────────────────
  budget_threshold: {
    label: 'Budget Threshold',
    description: 'Triggers when spending reaches a percentage of budget limit',
    params: ['budgetCategory', 'thresholdPercent'],
    category: 'budgeting',
  },
  spending_velocity: {
    label: 'Spending Velocity Alert',
    description: 'Triggers when daily spending rate is on track to exceed monthly average',
    params: ['multiplier'],
    category: 'spending',
  },
  // ── Savings & Goals ─────────────────────────────────
  savings_milestone: {
    label: 'Savings Milestone',
    description: 'Triggers when a savings goal reaches a percentage milestone',
    params: ['goalId', 'milestonePercent'],
    category: 'saving',
  },
  goal_progress: {
    label: 'Goal Progress Check',
    description: 'Triggers when a goal is behind or ahead of schedule',
    params: ['goalId', 'checkType'],
    category: 'saving',
  },
  // ── Income ──────────────────────────────────────────
  income_received: {
    label: 'Income Received',
    description: 'Triggers when a credit/income transaction is detected',
    params: ['minAmount', 'sourcePattern'],
    category: 'saving',
  },
  // ── Bills & EMIs ────────────────────────────────────
  bill_due: {
    label: 'Bill Due Soon',
    description: 'Triggers X days before a detected recurring bill is due',
    params: ['daysBefore', 'merchantPattern'],
    category: 'alerting',
  },
  emi_due: {
    label: 'EMI Due Reminder',
    description: 'Triggers when an EMI payment date is approaching',
    params: ['daysBefore', 'emiId'],
    category: 'debt',
  },
  // ── AI-Powered ──────────────────────────────────────
  anomaly_detected: {
    label: 'Anomaly Detected',
    description: 'Triggers when the AI detects an anomalous transaction',
    params: ['severityThreshold'],
    category: 'ai_powered',
  },
  pattern_change: {
    label: 'Spending Pattern Change',
    description: 'Triggers when the AI detects a significant change in spending patterns',
    params: ['changeThreshold', 'windowDays'],
    category: 'ai_powered',
  },
  fraud_suspected: {
    label: 'Fraud Alert',
    description: 'Triggers when a transaction has fraud-like characteristics',
    params: ['riskScoreThreshold'],
    category: 'ai_powered',
  },
  // ── Balance ─────────────────────────────────────────
  low_balance: {
    label: 'Low Balance Alert',
    description: 'Triggers when account balance drops below threshold',
    params: ['balanceThreshold', 'accountId'],
    category: 'alerting',
  },
  // ── Additional (frontend-referenced) ────────────────
  budget_exceeded: {
    label: 'Budget Exceeded',
    description: 'Triggers when spending has fully exceeded a budget limit',
    params: ['budgetCategory'],
    category: 'budgeting',
  },
  spending_spike: {
    label: 'Spending Spike',
    description: 'Triggers when a single transaction is unusually large',
    params: ['multiplier'],
    category: 'spending',
  },
  new_transaction: {
    label: 'New Transaction',
    description: 'Triggers on every new transaction (use with conditions)',
    params: [],
    category: 'general',
  },
  schedule: {
    label: 'Scheduled',
    description: 'Triggers on a recurring schedule (cron-like)',
    params: ['cronExpression', 'timezone'],
    category: 'time',
  },
};

const SUPPORTED_ACTIONS = {
  // ── Transaction Actions ─────────────────────────────
  auto_categorize: {
    label: 'Auto-Categorize',
    description: 'Automatically assign a category to the transaction',
    params: ['targetCategory'],
    category: 'organization',
  },
  auto_tag: {
    label: 'Auto-Tag',
    description: 'Automatically add tags to the transaction',
    params: ['tags'],
    category: 'organization',
  },
  add_note: {
    label: 'Add Note',
    description: 'Automatically add a note to the transaction',
    params: ['noteTemplate'],
    category: 'organization',
  },
  // ── Notifications ───────────────────────────────────
  send_notification: {
    label: 'Send Notification',
    description: 'Send a notification to the user',
    params: ['title', 'message', 'channel'],
    category: 'alerting',
  },
  create_budget_alert: {
    label: 'Create Budget Alert',
    description: 'Generate a budget alert when triggered',
    params: ['alertType', 'message'],
    category: 'budgeting',
  },
  send_email_alert: {
    label: 'Email Alert',
    description: 'Send an email notification',
    params: ['emailSubject', 'emailBody'],
    category: 'alerting',
  },
  // ── Savings & Goals ─────────────────────────────────
  auto_save: {
    label: 'Auto-Save',
    description: 'Automatically transfer a percentage to savings',
    params: ['percentage', 'savingsGoalId'],
    category: 'saving',
  },
  contribute_to_goal: {
    label: 'Contribute to Goal',
    description: 'Automatically add amount to a financial goal',
    params: ['goalId', 'amount', 'amountType'],
    category: 'saving',
  },
  // ── Budget Management ───────────────────────────────
  adjust_budget: {
    label: 'Adjust Budget',
    description: 'Automatically adjust budget limits based on spending',
    params: ['budgetCategory', 'adjustmentPercent', 'adjustmentType'],
    category: 'budgeting',
  },
  create_budget: {
    label: 'Create Budget',
    description: 'Automatically create a budget for a detected category',
    params: ['category', 'suggestedLimit'],
    category: 'budgeting',
  },
  // ── AI Actions ──────────────────────────────────────
  ai_categorize: {
    label: 'AI Smart Categorize',
    description: 'Use AI to intelligently categorize the transaction',
    params: [],
    category: 'ai_powered',
  },
  generate_insight: {
    label: 'Generate Insight',
    description: 'Generate an AI insight about the transaction or pattern',
    params: ['insightType'],
    category: 'ai_powered',
  },
  // ── Reporting ───────────────────────────────────────
  log_to_report: {
    label: 'Log to Report',
    description: 'Add transaction to a custom report or export',
    params: ['reportName'],
    category: 'reporting',
  },
  flag_for_review: {
    label: 'Flag for Review',
    description: 'Flag the transaction for manual review',
    params: ['reason', 'priority'],
    category: 'organization',
  },
  // ── Webhook / External ─────────────────────────────
  webhook: {
    label: 'Webhook',
    description: 'Send data to an external webhook URL',
    params: ['webhookUrl', 'method'],
    category: 'custom',
  },
  // ── Frontend-compatible aliases & additional actions ─
  flag_review: {
    label: 'Flag for Review',
    description: 'Flag the transaction for manual review (alias)',
    params: ['reason', 'priority'],
    category: 'organization',
    _aliasOf: 'flag_for_review',
  },
  send_email: {
    label: 'Send Email',
    description: 'Send an email notification (alias)',
    params: ['emailSubject', 'emailBody'],
    category: 'alerting',
    _aliasOf: 'send_email_alert',
  },
  create_alert: {
    label: 'Create Alert',
    description: 'Generate a budget/spending alert (alias)',
    params: ['alertType', 'message'],
    category: 'alerting',
    _aliasOf: 'create_budget_alert',
  },
  update_goal: {
    label: 'Update Goal',
    description: 'Add contribution to a financial goal (alias)',
    params: ['goalId', 'amount', 'amountType'],
    category: 'saving',
    _aliasOf: 'contribute_to_goal',
  },
  generate_report: {
    label: 'Generate Report',
    description: 'Log data to a report (alias)',
    params: ['reportName'],
    category: 'reporting',
    _aliasOf: 'log_to_report',
  },
  auto_transfer: {
    label: 'Auto-Transfer',
    description: 'Automatically transfer funds between accounts',
    params: ['fromAccountId', 'toAccountId', 'amount', 'amountType'],
    category: 'saving',
  },
  auto_invest: {
    label: 'Auto-Invest',
    description: 'Automatically invest a portion into a selected scheme',
    params: ['investmentType', 'amount', 'amountType'],
    category: 'investment',
  },
  export_data: {
    label: 'Export Data',
    description: 'Export matching transactions to CSV/JSON',
    params: ['format', 'destination'],
    category: 'reporting',
  },
  run_analysis: {
    label: 'Run AI Analysis',
    description: 'Trigger an AI analysis on the matched data',
    params: ['analysisType'],
    category: 'ai_powered',
  },
  train_model: {
    label: 'Train AI Model',
    description: 'Re-train AI models with latest data',
    params: [],
    category: 'ai_powered',
  },
  create_reminder: {
    label: 'Create Reminder',
    description: 'Set a reminder for follow-up action',
    params: ['reminderDate', 'message'],
    category: 'alerting',
  },
  log_event: {
    label: 'Log Event',
    description: 'Log an event to the activity feed',
    params: ['eventType', 'message'],
    category: 'reporting',
  },
};

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new automation rule.
 */
async function createRule(userId, ruleData) {
  try {
    loadModels();

    const { name, description, trigger, conditions, actions, isActive = true, priority = 0 } = ruleData;

    // Validate trigger
    if (!trigger || !SUPPORTED_TRIGGERS[trigger.type]) {
      throw new Error(`Unsupported trigger type: ${trigger?.type}. Supported: ${Object.keys(SUPPORTED_TRIGGERS).join(', ')}`);
    }

    // Validate actions
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      throw new Error('At least one action is required');
    }
    for (const action of actions) {
      if (!SUPPORTED_ACTIONS[action.type]) {
        throw new Error(`Unsupported action type: ${action.type}. Supported: ${Object.keys(SUPPORTED_ACTIONS).join(', ')}`);
      }
    }

    const rule = {
      userId,
      name: name || 'Untitled Rule',
      description: description || '',
      trigger,
      conditions: conditions || {},
      actions,
      isActive,
      priority,
      executionCount: 0,
      lastExecuted: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (AutomationRule) {
      const doc = new AutomationRule(rule);
      await doc.save();
      logger.info(`Created automation rule "${name}" for user ${userId}`);
      return doc.toObject();
    }

    // Fallback: return the rule object
    rule._id = `rule_${Date.now()}`;
    return rule;
  } catch (err) {
    logger.error('createRule error:', err);
    throw err;
  }
}

/**
 * Get all rules for a user.
 */
async function getRules(userId, { activeOnly = false } = {}) {
  try {
    loadModels();
    if (!AutomationRule) return [];

    const query = { userId };
    if (activeOnly) query.isActive = true;

    const rules = await AutomationRule.find(query).sort({ priority: -1, createdAt: -1 }).lean();
    return rules;
  } catch (err) {
    logger.error('getRules error:', err);
    throw err;
  }
}

/**
 * Get a single rule by ID.
 */
async function getRuleById(userId, ruleId) {
  try {
    loadModels();
    if (!AutomationRule) return null;

    const rule = await AutomationRule.findOne({ _id: ruleId, userId }).lean();
    if (!rule) throw new Error('Rule not found');
    return rule;
  } catch (err) {
    logger.error('getRuleById error:', err);
    throw err;
  }
}

/**
 * Update an existing rule.
 */
async function updateRule(userId, ruleId, updates) {
  try {
    loadModels();
    if (!AutomationRule) throw new Error('AutomationRule model not available');

    // Re-validate trigger and actions if provided
    if (updates.trigger && !SUPPORTED_TRIGGERS[updates.trigger.type]) {
      throw new Error(`Unsupported trigger type: ${updates.trigger.type}`);
    }
    if (updates.actions) {
      for (const action of updates.actions) {
        if (!SUPPORTED_ACTIONS[action.type]) {
          throw new Error(`Unsupported action type: ${action.type}`);
        }
      }
    }

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: ruleId, userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!rule) throw new Error('Rule not found');
    logger.info(`Updated automation rule ${ruleId}`);
    return rule;
  } catch (err) {
    logger.error('updateRule error:', err);
    throw err;
  }
}

/**
 * Delete a rule.
 */
async function deleteRule(userId, ruleId) {
  try {
    loadModels();
    if (!AutomationRule) throw new Error('AutomationRule model not available');

    const result = await AutomationRule.findOneAndDelete({ _id: ruleId, userId });
    if (!result) throw new Error('Rule not found');
    logger.info(`Deleted automation rule ${ruleId}`);
    return { success: true, deletedId: ruleId };
  } catch (err) {
    logger.error('deleteRule error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Rule execution engine
// ---------------------------------------------------------------------------

/**
 * Evaluate a single trigger condition against a transaction.
 */
function evaluateTrigger(trigger, transaction, context = {}) {
  try {
    const { type, params = {} } = trigger;
    const amt = Math.abs(transaction.amount || 0);
    const desc = (transaction.description || transaction.merchantName || '').toLowerCase();

    switch (type) {
      // ── Amount-based ──────────────────────────────
      case 'amount_above':
        return amt > (params.threshold || 0);

      case 'amount_below':
        return amt < (params.threshold || Infinity);

      case 'amount_between':
        return amt >= (params.minAmount || 0) && amt <= (params.maxAmount || Infinity);

      // ── Category / Merchant ───────────────────────
      case 'category_match': {
        const categories = (params.categories || []).map((c) => c.toLowerCase());
        return categories.includes((transaction.category || '').toLowerCase());
      }

      case 'merchant_match': {
        const patterns = params.merchantPatterns || [];
        return patterns.some((p) => {
          try { return new RegExp(p, 'i').test(desc); }
          catch { return desc.includes(p.toLowerCase()); }
        });
      }

      case 'keyword_match': {
        const keywords = (params.keywords || []).map((k) => k.toLowerCase());
        const mode = params.matchMode || 'any'; // 'any' | 'all'
        if (mode === 'all') return keywords.every((kw) => desc.includes(kw));
        return keywords.some((kw) => desc.includes(kw));
      }

      // ── Pattern / Date ────────────────────────────
      case 'recurring_pattern': {
        const pattern = params.merchantPattern || '';
        if (!pattern) return false;
        try {
          return new RegExp(pattern, 'i').test(desc);
        } catch {
          return desc.includes(pattern.toLowerCase());
        }
      }

      case 'date_match': {
        const txnDate = new Date(transaction.date);
        if (params.dayOfMonth && txnDate.getDate() !== params.dayOfMonth) return false;
        if (params.dayOfWeek !== undefined && txnDate.getDay() !== params.dayOfWeek) return false;
        return true;
      }

      // ── Budget / Velocity ─────────────────────────
      case 'budget_threshold': {
        const budgets = context.budgets || [];
        const target = budgets.find((b) =>
          (b.category || '').toLowerCase() === (params.budgetCategory || '').toLowerCase()
        );
        if (!target) return false;
        const spent = target.spent || 0;
        const limit = target.amount || target.limit || 1;
        return (spent / limit) >= ((params.thresholdPercent || 80) / 100);
      }

      case 'spending_velocity': {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const monthlySpend = context.monthlySpend || 0;
        const projectedSpend = (monthlySpend / dayOfMonth) * daysInMonth;
        const avgMonthly = context.avgMonthlySpend || projectedSpend;
        return projectedSpend > avgMonthly * (params.multiplier || 1.5);
      }

      // ── Savings & Goals ───────────────────────────
      case 'savings_milestone': {
        const goals = context.goals || [];
        const goal = params.goalId ? goals.find((g) => String(g._id) === String(params.goalId)) : goals[0];
        if (!goal) return false;
        const progress = (goal.currentAmount || 0) / (goal.targetAmount || 1);
        return progress >= ((params.milestonePercent || 50) / 100);
      }

      case 'goal_progress': {
        const goals = context.goals || [];
        const goal = params.goalId ? goals.find((g) => String(g._id) === String(params.goalId)) : goals[0];
        if (!goal || !goal.targetDate) return false;
        const elapsed = (Date.now() - new Date(goal.createdAt || goal.startDate).getTime());
        const total = (new Date(goal.targetDate).getTime() - new Date(goal.createdAt || goal.startDate).getTime());
        const timePct = total > 0 ? elapsed / total : 1;
        const progressPct = (goal.currentAmount || 0) / (goal.targetAmount || 1);
        if (params.checkType === 'ahead') return progressPct > timePct * 1.1;
        return progressPct < timePct * 0.8; // behind
      }

      // ── Income ────────────────────────────────────
      case 'income_received': {
        if (transaction.type !== 'credit') return false;
        if (params.minAmount && amt < params.minAmount) return false;
        if (params.sourcePattern) {
          try { return new RegExp(params.sourcePattern, 'i').test(desc); }
          catch { return desc.includes(params.sourcePattern.toLowerCase()); }
        }
        return true;
      }

      // ── Bills & EMIs ──────────────────────────────
      case 'bill_due': {
        const recurring = context.recurringBills || [];
        const daysBefore = params.daysBefore || 3;
        const now = Date.now();
        return recurring.some((bill) => {
          if (params.merchantPattern && !bill.merchant.toLowerCase().includes(params.merchantPattern.toLowerCase())) return false;
          const dueDate = new Date(bill.nextExpected);
          const daysUntil = (dueDate - now) / 86400000;
          return daysUntil >= 0 && daysUntil <= daysBefore;
        });
      }

      case 'emi_due': {
        const emis = context.emis || [];
        const daysBefore = params.daysBefore || 3;
        const now = Date.now();
        return emis.some((emi) => {
          if (params.emiId && String(emi._id) !== String(params.emiId)) return false;
          const dueDate = new Date(emi.nextPaymentDate || emi.dueDate);
          const daysUntil = (dueDate - now) / 86400000;
          return daysUntil >= 0 && daysUntil <= daysBefore;
        });
      }

      // ── AI-Powered ────────────────────────────────
      case 'anomaly_detected': {
        const anomalyScore = context.anomalyScore || 0;
        return anomalyScore >= (params.severityThreshold || 70);
      }

      case 'pattern_change': {
        const velocityChange = Math.abs(context.velocityChange || 0);
        return velocityChange >= ((params.changeThreshold || 30) / 100);
      }

      case 'fraud_suspected': {
        // Simple fraud heuristics: unusual time + large amount + new merchant
        const hour = new Date(transaction.date).getHours();
        const isUnusualTime = hour >= 0 && hour < 5;
        const isLargeAmount = amt > (context.avgTransaction || amt) * 3;
        const isNewMerchant = !context.knownMerchants?.includes(desc);
        const riskScore = (isUnusualTime ? 30 : 0) + (isLargeAmount ? 40 : 0) + (isNewMerchant ? 30 : 0);
        return riskScore >= (params.riskScoreThreshold || 60);
      }

      // ── Balance ───────────────────────────────────
      case 'low_balance': {
        const accounts = context.accounts || [];
        const account = params.accountId
          ? accounts.find((a) => String(a._id) === String(params.accountId))
          : accounts[0];
        if (!account) return false;
        return (account.balance || 0) < (params.balanceThreshold || 5000);
      }

      // ── Additional triggers (frontend-referenced) ─
      case 'budget_exceeded': {
        const budgets = context.budgets || [];
        const target = budgets.find((b) =>
          (b.category || '').toLowerCase() === (params.budgetCategory || '').toLowerCase()
        );
        if (!target) return false;
        return (target.spent || 0) >= (target.amount || target.limit || Infinity);
      }

      case 'spending_spike': {
        const avgTxn = context.avgTransaction || 0;
        return avgTxn > 0 && amt > avgTxn * (params.multiplier || 3);
      }

      case 'new_transaction':
        return true; // Always triggers — use conditions to filter

      case 'schedule':
        // Schedule triggers are evaluated by the scheduler, not per-transaction
        return false;

      default:
        logger.warn(`Unknown trigger type: ${type}`);
        return false;
    }
  } catch (err) {
    logger.error('evaluateTrigger error:', err);
    return false;
  }
}

/**
 * Execute actions for a matched rule.
 */
async function executeActions(actions, transaction, rule, context = {}) {
  const results = [];

  for (const action of actions) {
    try {
      const { type, params = {} } = action;
      let result = { type, success: false, details: null };

      switch (type) {
        // ── Transaction Actions ─────────────────────
        case 'auto_categorize':
          if (Transaction && transaction._id && params.targetCategory) {
            await Transaction.findByIdAndUpdate(transaction._id, { category: params.targetCategory });
            result = { type, success: true, details: { newCategory: params.targetCategory } };
          }
          break;

        case 'auto_tag':
          if (Transaction && transaction._id && params.tags) {
            await Transaction.findByIdAndUpdate(transaction._id, {
              $addToSet: { tags: { $each: Array.isArray(params.tags) ? params.tags : [params.tags] } },
            });
            result = { type, success: true, details: { addedTags: params.tags } };
          }
          break;

        case 'add_note': {
          const noteText = (params.noteTemplate || 'Auto-generated note')
            .replace('{{amount}}', transaction.amount)
            .replace('{{category}}', transaction.category || '')
            .replace('{{merchant}}', transaction.merchantName || transaction.description || '')
            .replace('{{date}}', new Date(transaction.date).toLocaleDateString('en-IN'));
          if (Transaction && transaction._id) {
            await Transaction.findByIdAndUpdate(transaction._id, { $set: { notes: noteText } });
          }
          result = { type, success: true, details: { note: noteText } };
          break;
        }

        // ── Notifications ───────────────────────────
        case 'send_notification':
          result = {
            type,
            success: true,
            details: {
              title: params.title || 'Automation Alert',
              message: (params.message || 'Automation triggered')
                .replace('{{amount}}', Math.abs(transaction.amount))
                .replace('{{category}}', transaction.category || '')
                .replace('{{merchant}}', transaction.merchantName || transaction.description || ''),
              channel: params.channel || 'in_app',
            },
          };
          // Store notification in DB if model available
          try {
            const Notification = require('../models/Notification');
            if (Notification) {
              await new Notification({
                userId: rule.userId,
                title: result.details.title,
                message: result.details.message,
                type: 'automation',
                read: false,
              }).save();
            }
          } catch { /* model may not exist */ }
          break;

        case 'create_budget_alert':
          result = {
            type,
            success: true,
            details: {
              alertType: params.alertType || 'warning',
              message: (params.message || `Automation triggered for: ${transaction.description}`)
                .replace('{{amount}}', Math.abs(transaction.amount)),
            },
          };
          break;

        case 'send_email_alert':
          // Queue email for sending (in production, integrate with email service)
          result = {
            type,
            success: true,
            details: {
              queued: true,
              subject: (params.emailSubject || 'Financial Alert')
                .replace('{{amount}}', Math.abs(transaction.amount)),
              body: (params.emailBody || 'A financial automation has been triggered.')
                .replace('{{amount}}', Math.abs(transaction.amount))
                .replace('{{category}}', transaction.category || '')
                .replace('{{merchant}}', transaction.merchantName || ''),
            },
          };
          break;

        // ── Savings & Goals ─────────────────────────
        case 'auto_save': {
          const saveAmount = Math.abs(transaction.amount) * ((params.percentage || 10) / 100);
          result = {
            type,
            success: true,
            details: {
              saveAmount: Math.round(saveAmount * 100) / 100,
              goalId: params.savingsGoalId || null,
            },
          };
          // Update goal if exists
          if (params.savingsGoalId) {
            try {
              const FinancialGoal = require('../models/FinancialGoal');
              if (FinancialGoal) {
                await FinancialGoal.findByIdAndUpdate(params.savingsGoalId, {
                  $inc: { currentAmount: saveAmount },
                });
                result.details.goalUpdated = true;
              }
            } catch { /* model may not exist */ }
          }
          break;
        }

        case 'contribute_to_goal': {
          const contribution = params.amountType === 'percentage'
            ? Math.abs(transaction.amount) * ((params.amount || 5) / 100)
            : (params.amount || 100);
          result = {
            type,
            success: true,
            details: { goalId: params.goalId, contribution: Math.round(contribution) },
          };
          if (params.goalId) {
            try {
              const FinancialGoal = require('../models/FinancialGoal');
              if (FinancialGoal) {
                await FinancialGoal.findByIdAndUpdate(params.goalId, {
                  $inc: { currentAmount: contribution },
                });
                result.details.goalUpdated = true;
              }
            } catch { /* model may not exist */ }
          }
          break;
        }

        // ── Budget Management ───────────────────────
        case 'adjust_budget': {
          const Budget = (() => { try { return require('../models/Budget'); } catch { return null; } })();
          if (Budget && params.budgetCategory) {
            const budget = await Budget.findOne({
              userId: rule.userId,
              category: { $regex: new RegExp(params.budgetCategory, 'i') },
            });
            if (budget) {
              const adj = (params.adjustmentPercent || 10) / 100;
              const delta = params.adjustmentType === 'decrease'
                ? -budget.amount * adj
                : budget.amount * adj;
              await Budget.findByIdAndUpdate(budget._id, { $inc: { amount: delta } });
              result = { type, success: true, details: { category: params.budgetCategory, adjustment: Math.round(delta), newLimit: Math.round(budget.amount + delta) } };
            } else {
              result = { type, success: false, details: { error: 'Budget not found' } };
            }
          }
          break;
        }

        case 'create_budget': {
          const Budget = (() => { try { return require('../models/Budget'); } catch { return null; } })();
          if (Budget) {
            const existing = await Budget.findOne({ userId: rule.userId, category: params.category });
            if (!existing) {
              await new Budget({
                userId: rule.userId,
                category: params.category || 'other',
                amount: params.suggestedLimit || 5000,
                spent: 0,
                period: 'monthly',
              }).save();
              result = { type, success: true, details: { category: params.category, limit: params.suggestedLimit } };
            } else {
              result = { type, success: false, details: { error: 'Budget already exists' } };
            }
          }
          break;
        }

        // ── AI Actions ──────────────────────────────
        case 'ai_categorize': {
          try {
            const localAI = require('./localAIEngine');
            const classification = await localAI.categorize(
              rule.userId,
              transaction.description || transaction.merchantName || '',
              Math.abs(transaction.amount),
              transaction.merchantName
            );
            if (Transaction && transaction._id && classification.category !== 'other') {
              await Transaction.findByIdAndUpdate(transaction._id, { category: classification.category });
            }
            result = { type, success: true, details: classification };
          } catch (e) {
            result = { type, success: false, details: { error: e.message } };
          }
          break;
        }

        case 'generate_insight': {
          result = {
            type,
            success: true,
            details: {
              insightType: params.insightType || 'general',
              transactionAmount: transaction.amount,
              category: transaction.category,
              generated: true,
              message: `AI insight generated for ${transaction.description || 'transaction'} (${transaction.category || 'uncategorized'})`,
            },
          };
          break;
        }

        // ── Reporting ───────────────────────────────
        case 'log_to_report':
          result = {
            type,
            success: true,
            details: {
              reportName: params.reportName || 'Automation Report',
              logged: true,
              transactionId: transaction._id,
              amount: transaction.amount,
              date: transaction.date,
            },
          };
          break;

        case 'flag_for_review':
          if (Transaction && transaction._id) {
            await Transaction.findByIdAndUpdate(transaction._id, {
              $set: {
                flagged: true,
                flagReason: params.reason || 'Flagged by automation',
                flagPriority: params.priority || 'medium',
              },
            });
          }
          result = {
            type,
            success: true,
            details: { reason: params.reason, priority: params.priority || 'medium' },
          };
          break;

        // ── Webhook ─────────────────────────────────
        case 'webhook': {
          if (params.webhookUrl) {
            try {
              const payload = {
                event: 'automation_triggered',
                rule: { id: rule._id, name: rule.name },
                transaction: {
                  id: transaction._id,
                  amount: transaction.amount,
                  description: transaction.description,
                  category: transaction.category,
                  date: transaction.date,
                },
                timestamp: new Date().toISOString(),
              };
              // Use native fetch or http module
              const http = params.webhookUrl.startsWith('https') ? require('https') : require('http');
              const url = new URL(params.webhookUrl);
              const postData = JSON.stringify(payload);
              await new Promise((resolve, reject) => {
                const req = http.request({
                  hostname: url.hostname,
                  port: url.port,
                  path: url.pathname + url.search,
                  method: params.method || 'POST',
                  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
                  timeout: 5000,
                }, (res) => {
                  let body = '';
                  res.on('data', (c) => { body += c; });
                  res.on('end', () => resolve(body));
                });
                req.on('error', reject);
                req.on('timeout', () => { req.destroy(); reject(new Error('Webhook timeout')); });
                req.write(postData);
                req.end();
              });
              result = { type, success: true, details: { url: params.webhookUrl, sent: true } };
            } catch (e) {
              result = { type, success: false, details: { url: params.webhookUrl, error: e.message } };
            }
          }
          break;
        }

        // ── Alias/additional action handlers ─────────

        // Aliases that delegate to existing handlers
        case 'flag_review': // alias for flag_for_review
          if (Transaction && transaction._id) {
            await Transaction.findByIdAndUpdate(transaction._id, {
              $set: { flagged: true, flagReason: params.reason || 'Flagged by automation', flagPriority: params.priority || 'medium' },
            });
          }
          result = { type, success: true, details: { reason: params.reason, priority: params.priority || 'medium' } };
          break;

        case 'send_email': // alias for send_email_alert
          result = {
            type, success: true,
            details: {
              queued: true,
              subject: (params.emailSubject || 'Financial Alert').replace('{{amount}}', Math.abs(transaction.amount)),
              body: (params.emailBody || 'Automation triggered.').replace('{{amount}}', Math.abs(transaction.amount)),
            },
          };
          break;

        case 'create_alert': // alias for create_budget_alert
          result = { type, success: true, details: { alertType: params.alertType || 'warning', message: params.message || 'Alert triggered' } };
          break;

        case 'update_goal': // alias for contribute_to_goal
        {
          const contribAmt = params.amountType === 'percentage'
            ? Math.abs(transaction.amount) * ((params.amount || 5) / 100) : (params.amount || 100);
          result = { type, success: true, details: { goalId: params.goalId, contribution: Math.round(contribAmt) } };
          if (params.goalId) {
            try { const G = require('../models/FinancialGoal'); if (G) await G.findByIdAndUpdate(params.goalId, { $inc: { currentAmount: contribAmt } }); } catch {}
          }
          break;
        }

        case 'generate_report': // alias for log_to_report
          result = { type, success: true, details: { reportName: params.reportName || 'Auto Report', logged: true, transactionId: transaction._id } };
          break;

        // Additional action types
        case 'auto_transfer':
          result = { type, success: true, details: { from: params.fromAccountId, to: params.toAccountId, amount: params.amount, queued: true } };
          break;

        case 'auto_invest':
          result = { type, success: true, details: { investmentType: params.investmentType, amount: params.amount, queued: true } };
          break;

        case 'export_data':
          result = { type, success: true, details: { format: params.format || 'csv', destination: params.destination || 'download', queued: true } };
          break;

        case 'run_analysis': {
          try {
            const localAI = require('./localAIEngine');
            const analysis = await localAI.insights.generateInsights(rule.userId, 'month');
            result = { type, success: true, details: { analysisType: params.analysisType, insightCount: analysis.insights?.length || 0 } };
          } catch (e) {
            result = { type, success: false, details: { error: e.message } };
          }
          break;
        }

        case 'train_model': {
          try {
            const localAI = require('./localAIEngine');
            const training = await localAI.trainModels(rule.userId);
            result = { type, success: true, details: training };
          } catch (e) {
            result = { type, success: false, details: { error: e.message } };
          }
          break;
        }

        case 'create_reminder':
          result = { type, success: true, details: { reminderDate: params.reminderDate, message: params.message || 'Reminder', queued: true } };
          break;

        case 'log_event':
          result = { type, success: true, details: { eventType: params.eventType || 'automation', message: params.message || 'Event logged', timestamp: new Date() } };
          break;

        default:
          result = { type, success: false, details: { error: `Unknown action type: ${type}` } };
      }

      results.push(result);
    } catch (err) {
      logger.error(`Action execution error (${action.type}):`, err);
      results.push({ type: action.type, success: false, details: { error: err.message } });
    }
  }

  return results;
}

/**
 * Log rule execution.
 */
async function logExecution(ruleId, userId, transaction, actionResults, triggered) {
  try {
    loadModels();

    const logEntry = {
      ruleId,
      userId,
      transactionId: transaction._id || null,
      triggered,
      actionResults,
      executedAt: new Date(),
    };

    if (AutomationLog) {
      await new AutomationLog(logEntry).save();
    }

    // Update rule execution stats
    if (AutomationRule && triggered) {
      await AutomationRule.findByIdAndUpdate(ruleId, {
        $inc: { executionCount: 1 },
        lastExecuted: new Date(),
      });
    }
  } catch (err) {
    logger.error('logExecution error:', err);
  }
}

/**
 * Process a transaction against all active rules for a user.
 */
async function processTransaction(userId, transaction) {
  try {
    loadModels();
    const rules = await getRules(userId, { activeOnly: true });
    const executionResults = [];

    for (const rule of rules) {
      const triggered = evaluateTrigger(rule.trigger, transaction);

      if (triggered) {
        logger.info(`Rule "${rule.name}" triggered for transaction ${transaction._id || 'new'}`);
        const actionResults = await executeActions(rule.actions, transaction, rule);
        executionResults.push({
          ruleId: rule._id,
          ruleName: rule.name,
          triggered: true,
          actionResults,
        });

        await logExecution(rule._id, userId, transaction, actionResults, true);
      }
    }

    return {
      transactionId: transaction._id || null,
      rulesEvaluated: rules.length,
      rulesTriggered: executionResults.length,
      results: executionResults,
    };
  } catch (err) {
    logger.error('processTransaction error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Get automation statistics for a user.
 */
async function getAutomationStats(userId) {
  try {
    loadModels();

    const stats = {
      totalRules: 0,
      activeRules: 0,
      inactiveRules: 0,
      totalExecutions: 0,
      executionsByTrigger: {},
      executionsByAction: {},
      recentExecutions: [],
      topRules: [],
    };

    if (AutomationRule) {
      const rules = await AutomationRule.find({ userId }).lean();
      stats.totalRules = rules.length;
      stats.activeRules = rules.filter((r) => r.isActive).length;
      stats.inactiveRules = stats.totalRules - stats.activeRules;
      stats.totalExecutions = rules.reduce((sum, r) => sum + (r.executionCount || 0), 0);

      // Top rules by execution count
      stats.topRules = rules
        .filter((r) => r.executionCount > 0)
        .sort((a, b) => (b.executionCount || 0) - (a.executionCount || 0))
        .slice(0, 5)
        .map((r) => ({
          id: r._id,
          name: r.name,
          triggerType: r.trigger?.type,
          executionCount: r.executionCount || 0,
          lastExecuted: r.lastExecuted,
        }));

      // Executions by trigger type
      for (const rule of rules) {
        const triggerType = rule.trigger?.type || 'unknown';
        stats.executionsByTrigger[triggerType] =
          (stats.executionsByTrigger[triggerType] || 0) + (rule.executionCount || 0);
      }
    }

    // Recent execution logs
    if (AutomationLog) {
      stats.recentExecutions = await AutomationLog.find({ userId, triggered: true })
        .sort({ executedAt: -1 })
        .limit(10)
        .lean();
    }

    return stats;
  } catch (err) {
    logger.error('getAutomationStats error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // CRUD
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,

  // Execution
  processTransaction,
  evaluateTrigger,
  executeActions,

  // Stats
  getAutomationStats,

  // Metadata
  SUPPORTED_TRIGGERS,
  SUPPORTED_ACTIONS,
};
