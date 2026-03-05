// ============================================================================
// SMART NOTIFICATION AI — Intelligent Alert & Notification System
// ============================================================================
// Context-aware, priority-weighted notification management with optimal
// delivery timing, notification fatigue prevention, and personalized
// notification preferences learning. Runs locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// ============================================================================
// §1  NOTIFICATION PRIORITY ENGINE
// ============================================================================

class NotificationPriorityEngine {
  constructor() {
    this.priorityRules = this._buildPriorityRules();
    this.userPreferences = {};
  }

  _buildPriorityRules() {
    return [
      // Critical (P0) — Immediate attention
      { id: 'fraud_alert', priority: 0, category: 'security', title: 'Potential Fraud Detected',
        condition: (ctx) => ctx.fraudScore > 70, cooldownMinutes: 0 },
      { id: 'account_breach', priority: 0, category: 'security', title: 'Unusual Account Activity',
        condition: (ctx) => ctx.unusualLogin || ctx.passwordChanged, cooldownMinutes: 0 },
      { id: 'payment_failed', priority: 0, category: 'payment', title: 'Payment Failed',
        condition: (ctx) => ctx.paymentFailed, cooldownMinutes: 5 },

      // High (P1) — Same day action
      { id: 'emi_due_today', priority: 1, category: 'payment', title: 'EMI Due Today',
        condition: (ctx) => ctx.emiDueToday, cooldownMinutes: 60 },
      { id: 'budget_exceeded', priority: 1, category: 'budget', title: 'Budget Exceeded',
        condition: (ctx) => ctx.budgetUtilization > 1.0, cooldownMinutes: 120 },
      { id: 'large_transaction', priority: 1, category: 'transaction', title: 'Large Transaction',
        condition: (ctx) => ctx.lastTransactionAmount > (ctx.avgExpense * 5), cooldownMinutes: 10 },
      { id: 'low_balance', priority: 1, category: 'account', title: 'Low Balance Alert',
        condition: (ctx) => ctx.accountBalance < ctx.minimumBalance, cooldownMinutes: 360 },
      { id: 'credit_score_drop', priority: 1, category: 'credit', title: 'Credit Score Dropped',
        condition: (ctx) => ctx.creditScoreChange < -20, cooldownMinutes: 1440 },

      // Medium (P2) — This week action
      { id: 'emi_due_3days', priority: 2, category: 'payment', title: 'EMI Due in 3 Days',
        condition: (ctx) => ctx.emiDueIn <= 3 && ctx.emiDueIn > 0, cooldownMinutes: 1440 },
      { id: 'budget_near_limit', priority: 2, category: 'budget', title: 'Budget Nearly Exhausted',
        condition: (ctx) => ctx.budgetUtilization > 0.85 && ctx.budgetUtilization <= 1.0, cooldownMinutes: 1440 },
      { id: 'goal_milestone', priority: 2, category: 'goals', title: 'Goal Milestone Reached!',
        condition: (ctx) => ctx.goalProgressCrossed50 || ctx.goalProgressCrossed75, cooldownMinutes: 1440 },
      { id: 'subscription_renewal', priority: 2, category: 'subscription', title: 'Subscription Renewal Coming',
        condition: (ctx) => ctx.subscriptionDueIn <= 5, cooldownMinutes: 2880 },
      { id: 'investment_opportunity', priority: 2, category: 'investment', title: 'Investment Opportunity',
        condition: (ctx) => ctx.marketDipDetected, cooldownMinutes: 1440 },
      { id: 'spending_spike', priority: 2, category: 'spending', title: 'Spending Spike Detected',
        condition: (ctx) => ctx.weeklySpendingIncrease > 0.3, cooldownMinutes: 4320 },

      // Low (P3) — Informational
      { id: 'weekly_summary', priority: 3, category: 'insight', title: 'Your Weekly Summary',
        condition: (ctx) => ctx.isWeeklySummaryTime, cooldownMinutes: 10080 },
      { id: 'savings_tip', priority: 3, category: 'tip', title: 'Savings Tip',
        condition: (ctx) => ctx.savingsRate < 0.2, cooldownMinutes: 4320 },
      { id: 'new_feature', priority: 3, category: 'product', title: 'New Feature Available',
        condition: (ctx) => ctx.hasNewFeature, cooldownMinutes: 10080 },
      { id: 'market_update', priority: 3, category: 'market', title: 'Portfolio Market Update',
        condition: (ctx) => ctx.hasInvestments && ctx.isMarketHours, cooldownMinutes: 1440 },
      { id: 'achievement_unlock', priority: 3, category: 'gamification', title: 'Achievement Unlocked!',
        condition: (ctx) => ctx.newAchievement, cooldownMinutes: 1440 },
      { id: 'financial_education', priority: 3, category: 'education', title: 'Financial Tip of the Day',
        condition: (ctx) => ctx.isEducationTime, cooldownMinutes: 1440 },
    ];
  }

  evaluate(context) {
    const triggered = [];

    for (const rule of this.priorityRules) {
      try {
        if (rule.condition(context)) {
          triggered.push({
            ruleId: rule.id,
            priority: rule.priority,
            category: rule.category,
            title: rule.title,
            cooldownMinutes: rule.cooldownMinutes,
            triggeredAt: new Date()
          });
        }
      } catch (e) {
        // Skip failing rules
      }
    }

    return triggered.sort((a, b) => a.priority - b.priority);
  }

  getPriorityLabel(priority) {
    switch (priority) {
      case 0: return 'Critical';
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Info';
    }
  }
}

// ============================================================================
// §2  DELIVERY TIMING OPTIMIZER
// ============================================================================

class DeliveryTimingOptimizer {
  constructor() {
    this.userEngagement = {};
    this.optimalWindows = {};
  }

  recordEngagement(userId, hour, dayOfWeek, engaged) {
    if (!this.userEngagement[userId]) {
      this.userEngagement[userId] = {
        hourlyEngagement: new Array(24).fill(0),
        hourlySent: new Array(24).fill(0),
        dowEngagement: new Array(7).fill(0),
        dowSent: new Array(7).fill(0)
      };
    }

    this.userEngagement[userId].hourlySent[hour]++;
    this.userEngagement[userId].dowSent[dayOfWeek]++;

    if (engaged) {
      this.userEngagement[userId].hourlyEngagement[hour]++;
      this.userEngagement[userId].dowEngagement[dayOfWeek]++;
    }
  }

  getOptimalDeliveryTime(userId, priority) {
    const engagement = this.userEngagement[userId];

    // Critical notifications — deliver immediately
    if (priority === 0) return { deliverNow: true, reason: 'Critical priority' };

    // No engagement data — use defaults
    if (!engagement || sum(engagement.hourlySent) === 0) {
      return this._defaultTimings(priority);
    }

    // Calculate engagement rates by hour
    const hourlyRates = engagement.hourlyEngagement.map((eng, h) =>
      engagement.hourlySent[h] > 0 ? eng / engagement.hourlySent[h] : 0
    );

    // Find best hours
    const rankedHours = hourlyRates
      .map((rate, hour) => ({ hour, rate }))
      .filter(h => h.rate > 0)
      .sort((a, b) => b.rate - a.rate);

    if (rankedHours.length === 0) return this._defaultTimings(priority);

    const bestHour = rankedHours[0].hour;
    const now = new Date();
    const currentHour = now.getHours();

    // If current hour is optimal, deliver now (for high priority)
    if (priority <= 1 && hourlyRates[currentHour] > 0.3) {
      return { deliverNow: true, reason: 'Current time has good engagement' };
    }

    // Schedule for next optimal window
    let deliverHour = bestHour;
    if (deliverHour <= currentHour) deliverHour += 24;

    const delayHours = deliverHour - currentHour;
    const maxDelay = priority === 1 ? 6 : priority === 2 ? 24 : 48;

    return {
      deliverNow: delayHours > maxDelay,
      scheduledHour: bestHour,
      delayHours: Math.min(delayHours, maxDelay),
      engagementRate: (rankedHours[0].rate * 100).toFixed(0) + '%',
      reason: `Best engagement at ${bestHour}:00 (${(rankedHours[0].rate * 100).toFixed(0)}% open rate)`
    };
  }

  _defaultTimings(priority) {
    const now = new Date();
    const hour = now.getHours();

    // Default optimal windows
    const windows = { morning: 9, midday: 13, evening: 19 };

    if (priority <= 1) {
      // High priority: deliver within business hours or immediately
      if (hour >= 8 && hour <= 21) return { deliverNow: true, reason: 'Default: within business hours' };
      return { deliverNow: false, scheduledHour: 9, delayHours: (33 - hour) % 24, reason: 'Default: next morning' };
    }

    // Medium/Low: schedule for engagement-friendly times
    return {
      deliverNow: false,
      scheduledHour: hour < 13 ? windows.midday : windows.evening,
      delayHours: 2,
      reason: 'Default timing'
    };
  }
}

// ============================================================================
// §3  NOTIFICATION FATIGUE MANAGER
// ============================================================================

class NotificationFatigueManager {
  constructor() {
    this.userHistory = {};
    this.maxDailyNotifications = { 0: 10, 1: 5, 2: 3, 3: 2 }; // Per priority
    this.maxTotalDaily = 10;
    this.cooldowns = {};
  }

  canSend(userId, ruleId, priority) {
    if (!this.userHistory[userId]) {
      this.userHistory[userId] = { today: [], lastSent: {} };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Reset daily counter
    this.userHistory[userId].today = this.userHistory[userId].today.filter(n => {
      const nDate = new Date(n.timestamp).toISOString().split('T')[0];
      return nDate === today;
    });

    // Critical always goes through
    if (priority === 0) return { allowed: true, reason: 'Critical priority bypasses limits' };

    // Check daily total limit
    const todayCount = this.userHistory[userId].today.length;
    if (todayCount >= this.maxTotalDaily) {
      return { allowed: false, reason: `Daily limit (${this.maxTotalDaily}) reached` };
    }

    // Check per-priority limit
    const priorityCount = this.userHistory[userId].today.filter(n => n.priority === priority).length;
    const maxForPriority = this.maxDailyNotifications[priority] || 3;
    if (priorityCount >= maxForPriority) {
      return { allowed: false, reason: `Priority ${priority} daily limit (${maxForPriority}) reached` };
    }

    // Check cooldown for specific rule
    const lastSentTime = this.userHistory[userId].lastSent[ruleId];
    if (lastSentTime) {
      const cooldownKey = `${userId}_${ruleId}`;
      const cooldownMinutes = this.cooldowns[cooldownKey] || 60;
      const elapsed = (now - new Date(lastSentTime)) / (1000 * 60);
      if (elapsed < cooldownMinutes) {
        return { allowed: false, reason: `Cooldown: ${Math.round(cooldownMinutes - elapsed)} min remaining` };
      }
    }

    // Check for notification bunching (no more than 3 in 15 minutes)
    const recentCount = this.userHistory[userId].today.filter(n => {
      const elapsed = (now - new Date(n.timestamp)) / (1000 * 60);
      return elapsed < 15;
    }).length;
    if (recentCount >= 3) {
      return { allowed: false, reason: 'Too many recent notifications (3 in 15 min max)' };
    }

    return { allowed: true, reason: 'Within all limits' };
  }

  recordSent(userId, ruleId, priority, cooldownMinutes = 60) {
    if (!this.userHistory[userId]) {
      this.userHistory[userId] = { today: [], lastSent: {} };
    }

    this.userHistory[userId].today.push({
      ruleId,
      priority,
      timestamp: new Date()
    });
    this.userHistory[userId].lastSent[ruleId] = new Date();
    this.cooldowns[`${userId}_${ruleId}`] = cooldownMinutes;
  }

  getDailyStats(userId) {
    const history = this.userHistory[userId];
    if (!history) return { sent: 0, remaining: this.maxTotalDaily };

    const today = new Date().toISOString().split('T')[0];
    const todayNotifs = history.today.filter(n =>
      new Date(n.timestamp).toISOString().split('T')[0] === today
    );

    return {
      sent: todayNotifs.length,
      remaining: Math.max(0, this.maxTotalDaily - todayNotifs.length),
      byPriority: {
        critical: todayNotifs.filter(n => n.priority === 0).length,
        high: todayNotifs.filter(n => n.priority === 1).length,
        medium: todayNotifs.filter(n => n.priority === 2).length,
        low: todayNotifs.filter(n => n.priority === 3).length
      }
    };
  }
}

// ============================================================================
// §4  NOTIFICATION CONTENT GENERATOR
// ============================================================================

class NotificationContentGenerator {
  constructor() {
    this.templates = this._buildTemplates();
  }

  _buildTemplates() {
    return {
      fraud_alert: {
        title: '🚨 Suspicious Transaction Detected',
        body: (ctx) => `A transaction of ₹${(ctx.amount || 0).toLocaleString()} at "${ctx.merchant || 'unknown'}" was flagged. Risk score: ${ctx.fraudScore || 'N/A'}. Tap to review.`,
        action: 'Review Transaction',
        channel: 'push+email'
      },
      emi_due_today: {
        title: '💳 EMI Due Today',
        body: (ctx) => `Your ${ctx.loanName || 'loan'} EMI of ₹${(ctx.emiAmount || 0).toLocaleString()} is due today. Ensure sufficient balance.`,
        action: 'View Details',
        channel: 'push'
      },
      budget_exceeded: {
        title: '⚠️ Budget Exceeded',
        body: (ctx) => `${ctx.category || 'Overall'} spending has exceeded the budget by ₹${(ctx.excessAmount || 0).toLocaleString()}. You've used ${ctx.utilizationPercent || '100'}%.`,
        action: 'View Budget',
        channel: 'push'
      },
      budget_near_limit: {
        title: '📊 Budget Alert',
        body: (ctx) => `${ctx.category || 'Your'} budget is ${ctx.utilizationPercent || '85'}% used. ₹${(ctx.remaining || 0).toLocaleString()} remaining for ${ctx.daysLeft || 'rest of month'} days.`,
        action: 'View Budget',
        channel: 'push'
      },
      large_transaction: {
        title: '💰 Large Transaction',
        body: (ctx) => `₹${(ctx.amount || 0).toLocaleString()} ${ctx.type === 'credit' ? 'received' : 'spent'} at ${ctx.merchant || 'unknown'}. ${ctx.isRecurring ? 'Recurring payment.' : 'This is unusual for you.'}`,
        action: 'View Transaction',
        channel: 'push'
      },
      goal_milestone: {
        title: '🎯 Goal Milestone!',
        body: (ctx) => `You've reached ${ctx.milestone || '50'}% of your "${ctx.goalName || 'financial'}" goal! ₹${(ctx.achieved || 0).toLocaleString()} of ₹${(ctx.target || 0).toLocaleString()} complete.`,
        action: 'View Goal',
        channel: 'push'
      },
      savings_tip: {
        title: '💡 Money-Saving Tip',
        body: (ctx) => ctx.tip || 'Review your subscriptions — average Indian household wastes ₹2,000/month on unused services.',
        action: 'View Tips',
        channel: 'push'
      },
      weekly_summary: {
        title: '📊 Your Weekly Financial Summary',
        body: (ctx) => `Income: ₹${(ctx.weeklyIncome || 0).toLocaleString()} | Expenses: ₹${(ctx.weeklyExpenses || 0).toLocaleString()} | Savings: ₹${(ctx.weeklySavings || 0).toLocaleString()}`,
        action: 'View Report',
        channel: 'push+email'
      },
      spending_spike: {
        title: '📈 Spending Spike Alert',
        body: (ctx) => `Your spending this week is ${ctx.increasePercent || '30'}% higher than usual. Top increase: ${ctx.topCategory || 'shopping'}.`,
        action: 'View Analysis',
        channel: 'push'
      },
      credit_score_drop: {
        title: '📉 Credit Score Alert',
        body: (ctx) => `Your credit score dropped by ${Math.abs(ctx.creditScoreChange || 0)} points to ${ctx.currentScore || 'N/A'}. Tap to see why and how to improve.`,
        action: 'View Score',
        channel: 'push+email'
      },
      achievement_unlock: {
        title: '🏆 Achievement Unlocked!',
        body: (ctx) => `You've earned "${ctx.achievementName || 'Saver'}": ${ctx.achievementDescription || 'Great financial discipline!'}`,
        action: 'View Achievements',
        channel: 'push'
      },
      subscription_renewal: {
        title: '🔄 Subscription Renewal Soon',
        body: (ctx) => `${ctx.subscriptionName || 'A subscription'} (₹${(ctx.amount || 0).toLocaleString()}) renews in ${ctx.daysUntil || 5} days. Still using it?`,
        action: 'Manage Subscriptions',
        channel: 'push'
      },
      low_balance: {
        title: '⚠️ Low Balance Warning',
        body: (ctx) => `Your account balance is ₹${(ctx.balance || 0).toLocaleString()}, below the minimum ₹${(ctx.minimumBalance || 10000).toLocaleString()}. Upcoming debits may fail.`,
        action: 'View Account',
        channel: 'push+email'
      },
      investment_opportunity: {
        title: '📉 Market Dip — Opportunity?',
        body: (ctx) => `${ctx.market || 'Markets'} dipped ${ctx.dipPercent || '2'}%. If you have surplus, this could be a good time to increase SIP or make a lump-sum investment.`,
        action: 'View Markets',
        channel: 'push'
      },
      financial_education: {
        title: '📖 Financial Tip of the Day',
        body: (ctx) => ctx.educationTip || 'Did you know? Starting SIP at 25 vs 35 can mean 2x the corpus at retirement, thanks to compounding.',
        action: 'Learn More',
        channel: 'push'
      }
    };
  }

  generate(ruleId, context = {}) {
    const template = this.templates[ruleId];
    if (!template) return null;

    return {
      ruleId,
      title: template.title,
      body: typeof template.body === 'function' ? template.body(context) : template.body,
      action: template.action,
      channel: template.channel,
      generatedAt: new Date()
    };
  }

  generateBatch(notifications, contexts = {}) {
    return notifications.map(n =>
      this.generate(n.ruleId, { ...contexts, ...n })
    ).filter(Boolean);
  }
}

// ============================================================================
// §5  NOTIFICATION PREFERENCE LEARNER
// ============================================================================

class NotificationPreferenceLearner {
  constructor() {
    this.userActions = {};
  }

  recordAction(userId, notificationId, action) {
    if (!this.userActions[userId]) this.userActions[userId] = [];

    this.userActions[userId].push({
      notificationId,
      action, // 'opened', 'dismissed', 'clicked_action', 'muted'
      timestamp: new Date()
    });

    if (this.userActions[userId].length > 500) {
      this.userActions[userId] = this.userActions[userId].slice(-500);
    }
  }

  getPreferences(userId) {
    const actions = this.userActions[userId] || [];
    if (actions.length < 10) return { hasEnoughData: false };

    const stats = {};
    for (const a of actions) {
      const key = a.notificationId?.split('_')[0] || 'unknown';
      if (!stats[key]) stats[key] = { opened: 0, dismissed: 0, clicked: 0, muted: 0, total: 0 };
      stats[key][a.action] = (stats[key][a.action] || 0) + 1;
      stats[key].total++;
    }

    const preferences = {};
    for (const [category, s] of Object.entries(stats)) {
      const engagementRate = s.total > 0 ? (s.opened + s.clicked) / s.total : 0;
      const muteRate = s.total > 0 ? s.muted / s.total : 0;
      preferences[category] = {
        engagementRate: (engagementRate * 100).toFixed(0) + '%',
        shouldSend: engagementRate > 0.2 && muteRate < 0.5,
        frequency: muteRate > 0.3 ? 'reduce' : engagementRate > 0.5 ? 'maintain' : 'reduce_slightly'
      };
    }

    return { hasEnoughData: true, preferences, totalInteractions: actions.length };
  }
}

// ============================================================================
// §6  UNIFIED SMART NOTIFICATION SERVICE
// ============================================================================

class SmartNotificationService {
  constructor() {
    this.priorityEngine = new NotificationPriorityEngine();
    this.timingOptimizer = new DeliveryTimingOptimizer();
    this.fatigueManager = new NotificationFatigueManager();
    this.contentGenerator = new NotificationContentGenerator();
    this.preferenceLearner = new NotificationPreferenceLearner();
    this.notificationQueue = {};
    this.deliveredNotifications = [];
  }

  async processNotifications(userId, context) {
    // Step 1: Evaluate which notifications should trigger
    const triggered = this.priorityEngine.evaluate(context);

    // Step 2: Filter through fatigue manager
    const filtered = [];
    for (const notif of triggered) {
      const fatigueCheck = this.fatigueManager.canSend(userId, notif.ruleId, notif.priority);
      if (fatigueCheck.allowed) {
        filtered.push(notif);
      }
    }

    // Step 3: Check user preferences
    const prefs = this.preferenceLearner.getPreferences(userId);
    const prefFiltered = filtered.filter(n => {
      if (!prefs.hasEnoughData) return true;
      const catPref = prefs.preferences[n.category];
      return !catPref || catPref.shouldSend;
    });

    // Step 4: Determine optimal delivery timing
    const scheduled = prefFiltered.map(notif => {
      const timing = this.timingOptimizer.getOptimalDeliveryTime(userId, notif.priority);
      return { ...notif, timing };
    });

    // Step 5: Generate content
    const notifications = [];
    for (const notif of scheduled) {
      const content = this.contentGenerator.generate(notif.ruleId, context);
      if (content) {
        this.fatigueManager.recordSent(userId, notif.ruleId, notif.priority, notif.cooldownMinutes);

        const finalNotif = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          userId,
          ...content,
          priority: notif.priority,
          priorityLabel: this.priorityEngine.getPriorityLabel(notif.priority),
          category: notif.category,
          timing: notif.timing,
          deliverNow: notif.timing.deliverNow || notif.priority === 0,
          scheduledFor: notif.timing.deliverNow ? new Date() :
            new Date(Date.now() + (notif.timing.delayHours || 0) * 3600000)
        };

        notifications.push(finalNotif);
        this.deliveredNotifications.push(finalNotif);
      }
    }

    // Trim history
    if (this.deliveredNotifications.length > 1000) {
      this.deliveredNotifications = this.deliveredNotifications.slice(-1000);
    }

    return {
      notifications: notifications.sort((a, b) => a.priority - b.priority),
      immediate: notifications.filter(n => n.deliverNow),
      scheduled: notifications.filter(n => !n.deliverNow),
      suppressed: triggered.length - notifications.length,
      fatigueStats: this.fatigueManager.getDailyStats(userId)
    };
  }

  recordInteraction(userId, notificationId, action) {
    this.preferenceLearner.recordAction(userId, notificationId, action);
    this.timingOptimizer.recordEngagement(
      userId,
      new Date().getHours(),
      new Date().getDay(),
      action === 'opened' || action === 'clicked_action'
    );
  }

  getDeliveryStats(userId) {
    const userNotifs = this.deliveredNotifications.filter(n => n.userId === userId);
    return {
      total: userNotifs.length,
      byPriority: {
        critical: userNotifs.filter(n => n.priority === 0).length,
        high: userNotifs.filter(n => n.priority === 1).length,
        medium: userNotifs.filter(n => n.priority === 2).length,
        low: userNotifs.filter(n => n.priority === 3).length
      },
      byCategory: userNotifs.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {}),
      preferences: this.preferenceLearner.getPreferences(userId),
      fatigueStats: this.fatigueManager.getDailyStats(userId)
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  NotificationPriorityEngine,
  DeliveryTimingOptimizer,
  NotificationFatigueManager,
  NotificationContentGenerator,
  NotificationPreferenceLearner,
  SmartNotificationService
};
