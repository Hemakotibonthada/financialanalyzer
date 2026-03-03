// ============================================================================
// Enterprise Notification Engine — Intelligent Alert & Notification System
// ============================================================================
// Provides smart notifications based on financial patterns, anomalies, goals,
// budgets, security events, and AI-driven insights with priority management.
// ============================================================================

const EventEmitter = require('events');

// ============================================================================
// § 1 — Notification Priority & Category System
// ============================================================================

const PRIORITY = {
  CRITICAL: 5,   // Security breaches, overdrafts, severe anomalies
  HIGH: 4,       // Budget exceeded, large transactions, goal deadlines
  MEDIUM: 3,     // Recurring payment reminders, weekly summaries
  LOW: 2,        // Tips, daily insights, market updates
  INFO: 1,       // System messages, feature announcements
};

const CATEGORY = {
  SECURITY: 'security',
  TRANSACTION: 'transaction',
  BUDGET: 'budget',
  GOAL: 'goal',
  INVESTMENT: 'investment',
  DEBT: 'debt',
  ANOMALY: 'anomaly',
  INSIGHT: 'insight',
  REMINDER: 'reminder',
  SYSTEM: 'system',
  AI_RECOMMENDATION: 'ai_recommendation',
  MARKET: 'market',
};

const CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  WEBSOCKET: 'websocket',
};

// ============================================================================
// § 2 — Notification Templates
// ============================================================================

const TEMPLATES = {
  // Transaction alerts
  LARGE_EXPENSE: {
    title: 'Large Expense Detected',
    body: 'A transaction of ₹{amount} was recorded at {merchant}. This is {comparison} your average spending.',
    category: CATEGORY.TRANSACTION,
    priority: PRIORITY.HIGH,
    icon: '💸',
  },
  UNUSUAL_MERCHANT: {
    title: 'New Merchant Transaction',
    body: 'First-time transaction of ₹{amount} at {merchant}. Verify this is legitimate.',
    category: CATEGORY.TRANSACTION,
    priority: PRIORITY.MEDIUM,
    icon: '🏪',
  },
  DUPLICATE_TRANSACTION: {
    title: 'Possible Duplicate Transaction',
    body: 'Two similar transactions of ₹{amount} detected within {timeframe}. Please verify.',
    category: CATEGORY.ANOMALY,
    priority: PRIORITY.HIGH,
    icon: '⚠️',
  },

  // Budget alerts
  BUDGET_WARNING: {
    title: 'Budget Warning: {category}',
    body: 'You\'ve spent {percent}% of your {category} budget (₹{spent}/₹{limit}). {remaining} days left.',
    category: CATEGORY.BUDGET,
    priority: PRIORITY.MEDIUM,
    icon: '📊',
  },
  BUDGET_EXCEEDED: {
    title: 'Budget Exceeded: {category}',
    body: 'Your {category} spending (₹{spent}) has exceeded the budget of ₹{limit} by {overAmount}.',
    category: CATEGORY.BUDGET,
    priority: PRIORITY.HIGH,
    icon: '🚨',
  },
  BUDGET_ON_TRACK: {
    title: 'Budget On Track',
    body: 'Great news! All your budgets are within limits. You\'re on track to save ₹{savingsProjection} this month.',
    category: CATEGORY.BUDGET,
    priority: PRIORITY.LOW,
    icon: '✅',
  },

  // Goal alerts
  GOAL_MILESTONE: {
    title: 'Goal Milestone Reached! 🎉',
    body: 'You\'ve reached {percent}% of your "{goalName}" goal! ₹{saved} of ₹{target} saved.',
    category: CATEGORY.GOAL,
    priority: PRIORITY.MEDIUM,
    icon: '🎯',
  },
  GOAL_AT_RISK: {
    title: 'Goal At Risk: {goalName}',
    body: 'You need to save ₹{dailyRequired}/day to reach your "{goalName}" goal by {deadline}.',
    category: CATEGORY.GOAL,
    priority: PRIORITY.HIGH,
    icon: '⚡',
  },
  GOAL_COMPLETED: {
    title: 'Goal Completed! 🏆',
    body: 'Congratulations! You\'ve reached your "{goalName}" goal of ₹{target}!',
    category: CATEGORY.GOAL,
    priority: PRIORITY.HIGH,
    icon: '🏆',
  },

  // Investment alerts
  PORTFOLIO_CHANGE: {
    title: 'Portfolio Alert',
    body: 'Your portfolio value changed by {changePercent}% today. Current value: ₹{currentValue}.',
    category: CATEGORY.INVESTMENT,
    priority: PRIORITY.MEDIUM,
    icon: '📈',
  },
  INVESTMENT_OPPORTUNITY: {
    title: 'Investment Opportunity',
    body: '{recommendation}. Based on your risk profile and current market conditions.',
    category: CATEGORY.INVESTMENT,
    priority: PRIORITY.LOW,
    icon: '💡',
  },

  // Debt alerts
  EMI_DUE: {
    title: 'EMI Payment Due',
    body: 'Your {loanType} EMI of ₹{amount} is due on {dueDate}. Ensure sufficient balance.',
    category: CATEGORY.DEBT,
    priority: PRIORITY.HIGH,
    icon: '📅',
  },
  DEBT_MILESTONE: {
    title: 'Debt Reduction Milestone',
    body: 'You\'ve paid off {percent}% of your {loanType}! Outstanding: ₹{remaining}.',
    category: CATEGORY.DEBT,
    priority: PRIORITY.MEDIUM,
    icon: '🎊',
  },

  // AI insights
  AI_WEEKLY_SUMMARY: {
    title: 'Weekly Financial Summary',
    body: 'Income: ₹{income} | Expenses: ₹{expenses} | Savings: ₹{savings}. {insight}',
    category: CATEGORY.INSIGHT,
    priority: PRIORITY.LOW,
    icon: '📋',
  },
  AI_SAVING_TIP: {
    title: 'Smart Saving Tip',
    body: '{tip}. Potential savings: ₹{amount}/month.',
    category: CATEGORY.AI_RECOMMENDATION,
    priority: PRIORITY.LOW,
    icon: '🤖',
  },
  AI_ANOMALY: {
    title: 'Spending Anomaly Detected',
    body: 'Unusual pattern: {description}. This deviates {deviation}% from your normal behavior.',
    category: CATEGORY.ANOMALY,
    priority: PRIORITY.HIGH,
    icon: '🔍',
  },

  // Security
  LOGIN_NEW_DEVICE: {
    title: 'New Device Login',
    body: 'Your account was accessed from a new device ({device}) at {time}. If this wasn\'t you, secure your account.',
    category: CATEGORY.SECURITY,
    priority: PRIORITY.CRITICAL,
    icon: '🔐',
  },
  PASSWORD_CHANGED: {
    title: 'Password Changed',
    body: 'Your password was changed at {time}. If you didn\'t make this change, contact support immediately.',
    category: CATEGORY.SECURITY,
    priority: PRIORITY.CRITICAL,
    icon: '🔑',
  },

  // Reminders
  BILL_REMINDER: {
    title: 'Bill Payment Reminder',
    body: '{billName} payment of ₹{amount} is due in {daysLeft} days ({dueDate}).',
    category: CATEGORY.REMINDER,
    priority: PRIORITY.MEDIUM,
    icon: '🔔',
  },
  SUBSCRIPTION_RENEWAL: {
    title: 'Subscription Renewal',
    body: '{serviceName} subscription of ₹{amount}/{period} will renew on {renewalDate}.',
    category: CATEGORY.REMINDER,
    priority: PRIORITY.LOW,
    icon: '🔄',
  },
};

// ============================================================================
// § 3 — Template Renderer
// ============================================================================

function renderTemplate(templateKey, variables = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) return null;

  let title = template.title;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
    body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
  });

  return {
    title,
    body,
    category: template.category,
    priority: template.priority,
    icon: template.icon,
    templateKey,
  };
}

// ============================================================================
// § 4 — Notification Rules Engine
// ============================================================================

class NotificationRulesEngine {
  constructor() {
    this.rules = [];
    this._initializeDefaultRules();
  }

  _initializeDefaultRules() {
    // Rule: Large transaction (> 2x average)
    this.addRule({
      name: 'large_transaction',
      condition: (ctx) => {
        if (ctx.event !== 'transaction_created') return false;
        const avgSpend = ctx.userStats?.averageDailySpend || 5000;
        return ctx.transaction?.amount > avgSpend * 2;
      },
      action: (ctx) => renderTemplate('LARGE_EXPENSE', {
        amount: formatINR(ctx.transaction.amount),
        merchant: ctx.transaction.merchant || ctx.transaction.description || 'Unknown',
        comparison: ctx.transaction.amount > (ctx.userStats?.averageDailySpend || 5000) * 3 ? 'much higher than' : 'above',
      }),
    });

    // Rule: Budget threshold crossed (80%)
    this.addRule({
      name: 'budget_warning',
      condition: (ctx) => {
        if (ctx.event !== 'budget_check') return false;
        return ctx.budgetUtilization >= 80 && ctx.budgetUtilization < 100;
      },
      action: (ctx) => renderTemplate('BUDGET_WARNING', {
        category: ctx.budgetCategory,
        percent: Math.round(ctx.budgetUtilization),
        spent: formatINR(ctx.budgetSpent),
        limit: formatINR(ctx.budgetLimit),
        remaining: ctx.daysRemaining || '?',
      }),
    });

    // Rule: Budget exceeded
    this.addRule({
      name: 'budget_exceeded',
      condition: (ctx) => {
        if (ctx.event !== 'budget_check') return false;
        return ctx.budgetUtilization >= 100;
      },
      action: (ctx) => renderTemplate('BUDGET_EXCEEDED', {
        category: ctx.budgetCategory,
        spent: formatINR(ctx.budgetSpent),
        limit: formatINR(ctx.budgetLimit),
        overAmount: formatINR(ctx.budgetSpent - ctx.budgetLimit),
      }),
    });

    // Rule: Goal milestone (25%, 50%, 75%, 100%)
    this.addRule({
      name: 'goal_milestone',
      condition: (ctx) => {
        if (ctx.event !== 'goal_progress') return false;
        const milestones = [25, 50, 75, 100];
        const percent = (ctx.goalSaved / ctx.goalTarget) * 100;
        return milestones.some(m => percent >= m && ctx.previousPercent < m);
      },
      action: (ctx) => {
        const percent = Math.round((ctx.goalSaved / ctx.goalTarget) * 100);
        if (percent >= 100) {
          return renderTemplate('GOAL_COMPLETED', {
            goalName: ctx.goalName,
            target: formatINR(ctx.goalTarget),
          });
        }
        return renderTemplate('GOAL_MILESTONE', {
          percent,
          goalName: ctx.goalName,
          saved: formatINR(ctx.goalSaved),
          target: formatINR(ctx.goalTarget),
        });
      },
    });

    // Rule: EMI due in 3 days
    this.addRule({
      name: 'emi_due_soon',
      condition: (ctx) => {
        if (ctx.event !== 'emi_check') return false;
        const daysUntilDue = Math.ceil((new Date(ctx.emiDueDate) - new Date()) / 86400000);
        return daysUntilDue <= 3 && daysUntilDue >= 0;
      },
      action: (ctx) => renderTemplate('EMI_DUE', {
        loanType: ctx.emiType || 'Loan',
        amount: formatINR(ctx.emiAmount),
        dueDate: new Date(ctx.emiDueDate).toLocaleDateString('en-IN'),
      }),
    });

    // Rule: AI anomaly detection
    this.addRule({
      name: 'ai_anomaly',
      condition: (ctx) => ctx.event === 'anomaly_detected',
      action: (ctx) => renderTemplate('AI_ANOMALY', {
        description: ctx.anomalyDescription,
        deviation: Math.round(ctx.anomalyDeviation),
      }),
    });
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  evaluate(context) {
    const notifications = [];
    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          const notification = rule.action(context);
          if (notification) {
            notifications.push({
              ...notification,
              ruleTriggered: rule.name,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error(`Rule ${rule.name} evaluation error:`, err.message);
      }
    }
    return notifications;
  }
}

// ============================================================================
// § 5 — Notification Queue & Deduplication
// ============================================================================

class NotificationQueue {
  constructor(maxSize = 1000) {
    this.queue = new Map();
    this.maxSize = maxSize;
    this.dedupeWindow = 3600000; // 1 hour deduplication window
  }

  _generateKey(notification, userId) {
    return `${userId}:${notification.templateKey || notification.category}:${notification.title}`;
  }

  enqueue(userId, notification) {
    const key = this._generateKey(notification, userId);
    const now = Date.now();

    // Deduplication check
    if (this.queue.has(key)) {
      const existing = this.queue.get(key);
      if (now - existing.timestamp < this.dedupeWindow) {
        return false; // Duplicate within window, skip
      }
    }

    // Max size management (FIFO eviction)
    if (this.queue.size >= this.maxSize) {
      const firstKey = this.queue.keys().next().value;
      this.queue.delete(firstKey);
    }

    this.queue.set(key, {
      ...notification,
      userId,
      id: `notif_${now}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      dismissed: false,
      timestamp: now,
      createdAt: new Date(now).toISOString(),
    });

    return true;
  }

  getForUser(userId, options = {}) {
    const { limit = 50, unreadOnly = false, category = null, priority = null } = options;
    const notifications = [];

    for (const [, notif] of this.queue) {
      if (notif.userId !== userId) continue;
      if (unreadOnly && notif.read) continue;
      if (category && notif.category !== category) continue;
      if (priority && notif.priority < priority) continue;
      notifications.push(notif);
    }

    // Sort by priority (desc) then timestamp (desc)
    notifications.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.timestamp - a.timestamp;
    });

    return notifications.slice(0, limit);
  }

  markRead(notificationId) {
    for (const [key, notif] of this.queue) {
      if (notif.id === notificationId) {
        notif.read = true;
        notif.readAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  markAllRead(userId) {
    let count = 0;
    for (const [, notif] of this.queue) {
      if (notif.userId === userId && !notif.read) {
        notif.read = true;
        notif.readAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  dismiss(notificationId) {
    for (const [key, notif] of this.queue) {
      if (notif.id === notificationId) {
        notif.dismissed = true;
        return true;
      }
    }
    return false;
  }

  getUnreadCount(userId) {
    let count = 0;
    for (const [, notif] of this.queue) {
      if (notif.userId === userId && !notif.read && !notif.dismissed) count++;
    }
    return count;
  }

  cleanup(maxAgeMs = 7 * 24 * 3600000) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [key, notif] of this.queue) {
      if (notif.timestamp < cutoff) {
        this.queue.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

// ============================================================================
// § 6 — Preference Manager
// ============================================================================

class PreferenceManager {
  constructor() {
    this.preferences = new Map();
  }

  getDefaults() {
    return {
      channels: {
        [CHANNEL.IN_APP]: true,
        [CHANNEL.EMAIL]: true,
        [CHANNEL.PUSH]: true,
        [CHANNEL.SMS]: false,
        [CHANNEL.WEBSOCKET]: true,
      },
      categories: {
        [CATEGORY.SECURITY]: { enabled: true, minPriority: PRIORITY.INFO },
        [CATEGORY.TRANSACTION]: { enabled: true, minPriority: PRIORITY.MEDIUM },
        [CATEGORY.BUDGET]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.GOAL]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.INVESTMENT]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.DEBT]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.ANOMALY]: { enabled: true, minPriority: PRIORITY.MEDIUM },
        [CATEGORY.INSIGHT]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.REMINDER]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.SYSTEM]: { enabled: true, minPriority: PRIORITY.INFO },
        [CATEGORY.AI_RECOMMENDATION]: { enabled: true, minPriority: PRIORITY.LOW },
        [CATEGORY.MARKET]: { enabled: true, minPriority: PRIORITY.LOW },
      },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      digestMode: { enabled: false, frequency: 'daily', time: '08:00' },
      maxPerHour: 10,
    };
  }

  get(userId) {
    return this.preferences.get(userId) || this.getDefaults();
  }

  set(userId, prefs) {
    const current = this.get(userId);
    this.preferences.set(userId, { ...current, ...prefs });
  }

  shouldDeliver(userId, notification) {
    const prefs = this.get(userId);

    // Category check
    const catPref = prefs.categories[notification.category];
    if (catPref && !catPref.enabled) return false;
    if (catPref && notification.priority < catPref.minPriority) return false;

    // Quiet hours check (critical/security always goes through)
    if (prefs.quietHours.enabled && notification.priority < PRIORITY.CRITICAL) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { start, end } = prefs.quietHours;
      if (start < end) {
        if (currentTime >= start && currentTime <= end) return false;
      } else {
        if (currentTime >= start || currentTime <= end) return false;
      }
    }

    return true;
  }

  getChannels(userId, notification) {
    const prefs = this.get(userId);
    const channels = [];

    // Security and critical always get all channels
    if (notification.priority >= PRIORITY.CRITICAL) {
      return Object.values(CHANNEL);
    }

    Object.entries(prefs.channels).forEach(([channel, enabled]) => {
      if (enabled) channels.push(channel);
    });

    return channels;
  }
}

// ============================================================================
// § 7 — Smart Notification Generator
// ============================================================================

class SmartNotificationGenerator {
  constructor() {
    this.rulesEngine = new NotificationRulesEngine();
  }

  // Generate daily financial summary notification
  generateDailySummary(financialData) {
    const { income = 0, expenses = 0, transactionCount = 0 } = financialData;
    const savings = income - expenses;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

    return renderTemplate('AI_WEEKLY_SUMMARY', {
      income: formatINR(income),
      expenses: formatINR(expenses),
      savings: formatINR(savings),
      insight: savings > 0
        ? `Savings rate: ${savingsRate}%. Keep it up!`
        : `Net negative by ₹${formatINR(Math.abs(savings))}. Consider reviewing expenses.`,
    });
  }

  // Generate smart saving tips based on spending patterns
  generateSavingTips(spendingAnalysis) {
    const tips = [];
    const { categoryBreakdown = {}, averages = {} } = spendingAnalysis;

    // Find categories above threshold
    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      const avg = averages[category] || 0;
      if (data.total > avg * 1.5 && data.total > 1000) {
        tips.push(renderTemplate('AI_SAVING_TIP', {
          tip: `Your ${category} spending is ${Math.round(((data.total - avg) / avg) * 100)}% above average. Consider setting a budget`,
          amount: formatINR(Math.round((data.total - avg) * 0.3)),
        }));
      }
    });

    return tips;
  }

  // Generate bill and subscription reminders
  generateBillReminders(bills) {
    const now = new Date();
    const notifications = [];

    (bills || []).forEach(bill => {
      const dueDate = new Date(bill.dueDate || bill.nextDue);
      const daysLeft = Math.ceil((dueDate - now) / 86400000);

      if (daysLeft >= 0 && daysLeft <= 7) {
        notifications.push(renderTemplate('BILL_REMINDER', {
          billName: bill.name || bill.description,
          amount: formatINR(bill.amount),
          daysLeft,
          dueDate: dueDate.toLocaleDateString('en-IN'),
        }));
      }
    });

    return notifications;
  }

  // Evaluate transaction-triggered rules
  evaluateTransaction(transaction, userStats) {
    return this.rulesEngine.evaluate({
      event: 'transaction_created',
      transaction,
      userStats,
    });
  }

  // Evaluate budget rules
  evaluateBudgets(budgets) {
    const notifications = [];
    (budgets || []).forEach(budget => {
      const utilization = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - new Date().getDate();

      const results = this.rulesEngine.evaluate({
        event: 'budget_check',
        budgetCategory: budget.category,
        budgetUtilization: utilization,
        budgetSpent: budget.spent,
        budgetLimit: budget.limit,
        daysRemaining,
      });
      notifications.push(...results);
    });
    return notifications;
  }

  // Evaluate goal progress rules
  evaluateGoals(goals, previousProgress = {}) {
    const notifications = [];
    (goals || []).forEach(goal => {
      const results = this.rulesEngine.evaluate({
        event: 'goal_progress',
        goalName: goal.name,
        goalSaved: goal.currentAmount || goal.saved || 0,
        goalTarget: goal.targetAmount || goal.target,
        previousPercent: previousProgress[goal._id] || 0,
      });
      notifications.push(...results);
    });
    return notifications;
  }
}

// ============================================================================
// § 8 — Main Notification Engine
// ============================================================================

class EnterpriseNotificationEngine extends EventEmitter {
  constructor() {
    super();
    this.queue = new NotificationQueue();
    this.preferences = new PreferenceManager();
    this.generator = new SmartNotificationGenerator();
    this.deliveryLog = [];
    this.setMaxListeners(50);
  }

  // Send a notification to a user
  async send(userId, notification) {
    // Preference check
    if (!this.preferences.shouldDeliver(userId, notification)) {
      return { delivered: false, reason: 'filtered_by_preferences' };
    }

    // Dedup check via queue
    const enqueued = this.queue.enqueue(userId, notification);
    if (!enqueued) {
      return { delivered: false, reason: 'duplicate' };
    }

    // Get delivery channels
    const channels = this.preferences.getChannels(userId, notification);

    // Emit for real-time delivery
    this.emit('notification', { userId, notification, channels });

    // Log delivery
    this.deliveryLog.push({
      userId,
      notificationId: notification.id,
      channels,
      timestamp: new Date().toISOString(),
    });

    // Trim log
    if (this.deliveryLog.length > 10000) {
      this.deliveryLog = this.deliveryLog.slice(-5000);
    }

    return { delivered: true, channels, id: notification.id };
  }

  // Send multiple notifications
  async sendBatch(userId, notifications) {
    const results = [];
    for (const notif of notifications) {
      results.push(await this.send(userId, notif));
    }
    return results;
  }

  // Get notifications for a user
  getNotifications(userId, options = {}) {
    return this.queue.getForUser(userId, options);
  }

  // Get unread count
  getUnreadCount(userId) {
    return this.queue.getUnreadCount(userId);
  }

  // Mark notification as read
  markRead(notificationId) {
    return this.queue.markRead(notificationId);
  }

  // Mark all as read
  markAllRead(userId) {
    return this.queue.markAllRead(userId);
  }

  // Dismiss notification
  dismiss(notificationId) {
    return this.queue.dismiss(notificationId);
  }

  // Update user preferences
  updatePreferences(userId, prefs) {
    this.preferences.set(userId, prefs);
    return this.preferences.get(userId);
  }

  // Get user preferences
  getPreferences(userId) {
    return this.preferences.get(userId);
  }

  // Process a new transaction for notification triggers
  async processTransaction(userId, transaction, userStats) {
    const notifications = this.generator.evaluateTransaction(transaction, userStats);
    return this.sendBatch(userId, notifications);
  }

  // Run daily notification checks
  async runDailyChecks(userId, financialData) {
    const allNotifications = [];

    // Daily summary
    const summary = this.generator.generateDailySummary(financialData);
    if (summary) allNotifications.push(summary);

    // Budget checks
    if (financialData.budgets) {
      const budgetNotifs = this.generator.evaluateBudgets(financialData.budgets);
      allNotifications.push(...budgetNotifs);
    }

    // Goal progress
    if (financialData.goals) {
      const goalNotifs = this.generator.evaluateGoals(financialData.goals, financialData.previousGoalProgress);
      allNotifications.push(...goalNotifs);
    }

    // Bill reminders
    if (financialData.bills) {
      const billNotifs = this.generator.generateBillReminders(financialData.bills);
      allNotifications.push(...billNotifs);
    }

    // Saving tips
    if (financialData.spendingAnalysis) {
      const tips = this.generator.generateSavingTips(financialData.spendingAnalysis);
      allNotifications.push(...tips);
    }

    return this.sendBatch(userId, allNotifications);
  }

  // Cleanup old notifications
  cleanup() {
    return this.queue.cleanup();
  }

  // Get engine stats
  getStats() {
    return {
      totalInQueue: this.queue.queue.size,
      deliveryLogSize: this.deliveryLog.length,
      preferencesCount: this.preferences.preferences.size,
      rulesCount: this.generator.rulesEngine.rules.length,
    };
  }
}

// ============================================================================
// § 9 — Helper Functions
// ============================================================================

function formatINR(amount) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

// ============================================================================
// § 10 — Singleton Export
// ============================================================================

const notificationEngine = new EnterpriseNotificationEngine();

module.exports = {
  notificationEngine,
  EnterpriseNotificationEngine,
  NotificationRulesEngine,
  NotificationQueue,
  PreferenceManager,
  SmartNotificationGenerator,
  renderTemplate,
  TEMPLATES,
  PRIORITY,
  CATEGORY,
  CHANNEL,
};
