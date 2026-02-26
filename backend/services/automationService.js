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
  amount_above: {
    label: 'Amount Above Threshold',
    description: 'Triggers when a transaction amount exceeds a specified value',
    params: ['threshold'],
  },
  amount_below: {
    label: 'Amount Below Threshold',
    description: 'Triggers when a transaction amount is below a specified value',
    params: ['threshold'],
  },
  category_match: {
    label: 'Category Match',
    description: 'Triggers when a transaction matches one or more categories',
    params: ['categories'],
  },
  recurring_pattern: {
    label: 'Recurring Pattern',
    description: 'Triggers for detected recurring transaction patterns',
    params: ['merchantPattern', 'frequencyDays'],
  },
  date_match: {
    label: 'Date Match',
    description: 'Triggers on specific dates or day-of-month',
    params: ['dayOfMonth', 'dayOfWeek'],
  },
};

const SUPPORTED_ACTIONS = {
  auto_categorize: {
    label: 'Auto-Categorize',
    description: 'Automatically assign a category to the transaction',
    params: ['targetCategory'],
  },
  send_notification: {
    label: 'Send Notification',
    description: 'Send a notification to the user',
    params: ['title', 'message', 'channel'],
  },
  create_budget_alert: {
    label: 'Create Budget Alert',
    description: 'Generate a budget alert when triggered',
    params: ['alertType', 'message'],
  },
  auto_tag: {
    label: 'Auto-Tag',
    description: 'Automatically add tags to the transaction',
    params: ['tags'],
  },
  auto_save: {
    label: 'Auto-Save',
    description: 'Automatically transfer a percentage to savings',
    params: ['percentage', 'savingsGoalId'],
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
function evaluateTrigger(trigger, transaction) {
  try {
    const { type, params = {} } = trigger;

    switch (type) {
      case 'amount_above':
        return transaction.amount > (params.threshold || 0);

      case 'amount_below':
        return transaction.amount < (params.threshold || Infinity);

      case 'category_match': {
        const categories = params.categories || [];
        return categories.some(
          (cat) => (transaction.category || '').toLowerCase() === cat.toLowerCase()
        );
      }

      case 'recurring_pattern': {
        const pattern = params.merchantPattern || '';
        if (!pattern) return false;
        const regex = new RegExp(pattern, 'i');
        return regex.test(transaction.description || '') || regex.test(transaction.merchant || '');
      }

      case 'date_match': {
        const txnDate = new Date(transaction.date);
        if (params.dayOfMonth && txnDate.getDate() !== params.dayOfMonth) return false;
        if (params.dayOfWeek !== undefined && txnDate.getDay() !== params.dayOfWeek) return false;
        return true;
      }

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
async function executeActions(actions, transaction, rule) {
  const results = [];

  for (const action of actions) {
    try {
      const { type, params = {} } = action;
      let result = { type, success: false, details: null };

      switch (type) {
        case 'auto_categorize':
          if (Transaction && transaction._id && params.targetCategory) {
            await Transaction.findByIdAndUpdate(transaction._id, { category: params.targetCategory });
            result = { type, success: true, details: { newCategory: params.targetCategory } };
          }
          break;

        case 'send_notification':
          // In a real app, push to notifications collection or external service
          result = {
            type,
            success: true,
            details: {
              title: params.title || 'Automation Alert',
              message: (params.message || '').replace('{{amount}}', transaction.amount).replace('{{category}}', transaction.category || ''),
              channel: params.channel || 'in_app',
            },
          };
          break;

        case 'create_budget_alert':
          result = {
            type,
            success: true,
            details: {
              alertType: params.alertType || 'warning',
              message: params.message || `Automation triggered for transaction: ${transaction.description}`,
            },
          };
          break;

        case 'auto_tag':
          if (Transaction && transaction._id && params.tags) {
            await Transaction.findByIdAndUpdate(transaction._id, {
              $addToSet: { tags: { $each: Array.isArray(params.tags) ? params.tags : [params.tags] } },
            });
            result = { type, success: true, details: { addedTags: params.tags } };
          }
          break;

        case 'auto_save': {
          const saveAmount = transaction.amount * ((params.percentage || 10) / 100);
          result = {
            type,
            success: true,
            details: {
              saveAmount: Math.round(saveAmount * 100) / 100,
              goalId: params.savingsGoalId || null,
            },
          };
          break;
        }

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
