// ============================================================================
// Scheduled Jobs Service — Automated financial maintenance & analysis
// ============================================================================
// Handles: recurring budget resets, subscription renewals, EMI due reminders,
// stale data cleanup, automated AI model retraining, and health score updates.
// ============================================================================

const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Models
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const EMI = require('../models/EMI');
const Subscription = require('../models/Subscription');
const FinancialGoal = require('../models/FinancialGoal');

// Services
let smartNotificationService, localAIEngine;
try { smartNotificationService = require('./smartNotificationService'); } catch (e) { logger.warn('smartNotificationService not available'); }
try { localAIEngine = require('./localAIEngine'); } catch (e) { logger.warn('localAIEngine not available'); }

// ─── Job Registry ───────────────────────────────────────────────────
const jobRegistry = new Map();
const jobHistory = [];

function registerJob(name, handler, intervalMs, description = '') {
  jobRegistry.set(name, { handler, intervalMs, description, lastRun: null, nextRun: null, status: 'idle', runCount: 0, errors: 0, timer: null });
}

// ─── Generic Runner ─────────────────────────────────────────────────
async function runJob(name) {
  const job = jobRegistry.get(name);
  if (!job) throw new Error(`Job "${name}" not found`);
  if (job.status === 'running') { logger.warn(`Job "${name}" is already running, skipping`); return; }

  job.status = 'running';
  const startTime = Date.now();
  try {
    const result = await job.handler();
    job.lastRun = new Date();
    job.runCount++;
    job.status = 'idle';
    const elapsed = Date.now() - startTime;
    logger.info(`Job "${name}" completed in ${elapsed}ms`);
    jobHistory.push({ name, status: 'success', startTime: new Date(startTime), duration: elapsed, result: result || {} });
    if (jobHistory.length > 500) jobHistory.splice(0, jobHistory.length - 500);
    return result;
  } catch (error) {
    job.errors++;
    job.status = 'error';
    logger.error(`Job "${name}" failed: ${error.message}`);
    jobHistory.push({ name, status: 'error', startTime: new Date(startTime), duration: Date.now() - startTime, error: error.message });
    throw error;
  }
}

// ─── Budget Reset Job ───────────────────────────────────────────────
async function resetMonthlyBudgets() {
  const now = new Date();
  if (now.getDate() !== 1) return { skipped: true, reason: 'Not the first day of month' };

  const budgets = await Budget.find({ period: 'monthly', isActive: true });
  let resetCount = 0;

  for (const budget of budgets) {
    const previousSpent = budget.spent || 0;
    budget.spent = 0;
    budget.previousMonthSpent = previousSpent;
    budget.lastResetDate = now;
    await budget.save();
    resetCount++;

    if (smartNotificationService && previousSpent > 0) {
      await smartNotificationService.createNotification(budget.userId, 'SYSTEM_UPDATE', {
        title: 'Monthly Budget Reset',
        message: `Your ${budget.category} budget has been reset. Last month you spent ₹${previousSpent.toLocaleString('en-IN')} of ₹${budget.amount.toLocaleString('en-IN')}`,
        data: { category: budget.category, previousSpent, budget: budget.amount },
      });
    }
  }

  return { resetCount, month: now.toISOString().slice(0, 7) };
}

// ─── EMI Due Reminder Job ───────────────────────────────────────────
async function sendEMIDueReminders() {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 86400000);

  const emis = await EMI.find({
    status: { $in: ['active', 'Active'] },
    nextDueDate: { $gte: now, $lte: fiveDaysLater },
  });

  let reminderCount = 0;

  for (const emi of emis) {
    const daysUntilDue = Math.ceil((new Date(emi.nextDueDate) - now) / 86400000);
    const urgency = daysUntilDue <= 1 ? 'critical' : daysUntilDue <= 3 ? 'high' : 'medium';

    if (smartNotificationService) {
      await smartNotificationService.createNotification(emi.userId, 'EMI_DUE', {
        title: `EMI Due${daysUntilDue <= 1 ? ' Tomorrow!' : ` in ${daysUntilDue} days`}`,
        message: `${emi.loanName || emi.name}: ₹${(emi.emiAmount || 0).toLocaleString('en-IN')} due on ${new Date(emi.nextDueDate).toLocaleDateString('en-IN')}`,
        priority: urgency,
        data: { emiId: emi._id, amount: emi.emiAmount, dueDate: emi.nextDueDate },
      });
      reminderCount++;
    }
  }

  return { reminderCount, emisChecked: emis.length };
}

// ─── Subscription Renewal Check ─────────────────────────────────────
async function checkSubscriptionRenewals() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);

  const subs = await Subscription.find({
    status: { $in: ['active', 'Active'] },
    nextBillingDate: { $gte: now, $lte: sevenDaysLater },
  }).catch(() => []);

  let reminderCount = 0;

  for (const sub of subs) {
    const daysUntil = Math.ceil((new Date(sub.nextBillingDate) - now) / 86400000);

    if (smartNotificationService) {
      await smartNotificationService.createNotification(sub.userId, 'SUBSCRIPTION_RENEWAL', {
        title: `Subscription Renewing${daysUntil <= 2 ? ' Soon!' : ''}`,
        message: `${sub.name}: ₹${(sub.amount || 0).toLocaleString('en-IN')} will be charged on ${new Date(sub.nextBillingDate).toLocaleDateString('en-IN')}`,
        priority: daysUntil <= 2 ? 'high' : 'medium',
        data: { subscriptionId: sub._id, amount: sub.amount, renewalDate: sub.nextBillingDate },
      });
      reminderCount++;
    }
  }

  return { reminderCount, subsChecked: subs.length };
}

// ─── Goal Progress Check ────────────────────────────────────────────
async function checkGoalMilestones() {
  const goals = await FinancialGoal.find({ status: { $in: ['active', 'Active', 'in_progress'] } });
  let notificationCount = 0;

  for (const goal of goals) {
    const current = goal.currentAmount || goal.savedAmount || 0;
    const target = goal.targetAmount || 0;
    if (target <= 0) continue;

    const progress = (current / target) * 100;
    const milestones = [25, 50, 75, 90, 100];

    for (const milestone of milestones) {
      const prevProgress = goal.lastNotifiedProgress || 0;
      if (progress >= milestone && prevProgress < milestone) {
        if (smartNotificationService) {
          const type = milestone === 100 ? 'GOAL_ACHIEVED' : 'GOAL_MILESTONE';
          await smartNotificationService.createNotification(goal.userId, type, {
            title: milestone === 100 ? `🎉 Goal Achieved: ${goal.name}!` : `Goal Milestone: ${goal.name}`,
            message: milestone === 100
              ? `You've reached your goal of ₹${target.toLocaleString('en-IN')}!`
              : `${milestone}% complete — ₹${current.toLocaleString('en-IN')} of ₹${target.toLocaleString('en-IN')}`,
            priority: milestone >= 90 ? 'high' : 'medium',
            data: { goalId: goal._id, progress, milestone },
          });
          notificationCount++;
        }
        goal.lastNotifiedProgress = milestone;
        await goal.save();
        break; // Only one milestone notification per check
      }
    }
  }

  return { goalsChecked: goals.length, notificationCount };
}

// ─── AI Model Retraining Job ────────────────────────────────────────
async function retrainAIModels() {
  if (!localAIEngine) return { skipped: true, reason: 'localAIEngine not available' };

  // Get all unique user IDs with recent transactions
  const recentUsers = await Transaction.distinct('userId', {
    date: { $gte: new Date(Date.now() - 30 * 86400000) },
  });

  let trainedCount = 0;
  const results = [];

  for (const uid of recentUsers.slice(0, 50)) { // Limit to 50 users per run
    try {
      const result = await localAIEngine.trainModels(uid.toString());
      trainedCount++;
      results.push({ userId: uid.toString(), success: true });
    } catch (error) {
      results.push({ userId: uid.toString(), success: false, error: error.message });
    }
  }

  return { trainedCount, totalUsers: recentUsers.length, results: results.slice(0, 10) };
}

// ─── Stale Data Cleanup ────────────────────────────────────────────
async function cleanupStaleData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  let cleaned = {};

  // Clean old read notifications
  try {
    const Notification = mongoose.models.Notification;
    if (Notification) {
      const result = await Notification.deleteMany({ read: true, createdAt: { $lt: thirtyDaysAgo } });
      cleaned.oldNotifications = result.deletedCount || 0;
    }
  } catch (e) { cleaned.oldNotifications = 0; }

  // Clean old automation logs
  try {
    const AutomationLog = mongoose.models.AutomationLog;
    if (AutomationLog) {
      const result = await AutomationLog.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
      cleaned.oldAutomationLogs = result.deletedCount || 0;
    }
  } catch (e) { cleaned.oldAutomationLogs = 0; }

  // Clean expired sessions
  try {
    const Session = mongoose.models.Session;
    if (Session) {
      const result = await Session.deleteMany({ expires: { $lt: new Date() } });
      cleaned.expiredSessions = result.deletedCount || 0;
    }
  } catch (e) { cleaned.expiredSessions = 0; }

  return cleaned;
}

// ─── Budget Overspend Alerts ────────────────────────────────────────
async function checkBudgetOverspend() {
  const budgets = await Budget.find({ isActive: true });
  let alertCount = 0;

  for (const budget of budgets) {
    const spent = budget.spent || 0;
    const amount = budget.amount || 0;
    if (amount <= 0) continue;

    const percent = (spent / amount) * 100;

    if (percent >= 100 && (!budget.lastAlertType || budget.lastAlertType !== 'exceeded')) {
      if (smartNotificationService) {
        await smartNotificationService.createNotification(budget.userId, 'BUDGET_EXCEEDED', {
          title: `Budget Exceeded: ${budget.category}`,
          message: `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${amount.toLocaleString('en-IN')} ${budget.category} budget (${percent.toFixed(0)}%)`,
          priority: 'critical',
          data: { category: budget.category, spent, budget: amount, percent },
        });
        alertCount++;
        budget.lastAlertType = 'exceeded';
        await budget.save();
      }
    } else if (percent >= 80 && percent < 100 && (!budget.lastAlertType || budget.lastAlertType !== 'threshold')) {
      if (smartNotificationService) {
        await smartNotificationService.createNotification(budget.userId, 'BUDGET_THRESHOLD', {
          title: `Budget Warning: ${budget.category}`,
          message: `You've used ${percent.toFixed(0)}% of your ${budget.category} budget. ₹${(amount - spent).toLocaleString('en-IN')} remaining`,
          priority: 'high',
          data: { category: budget.category, spent, budget: amount, percent },
        });
        alertCount++;
        budget.lastAlertType = 'threshold';
        await budget.save();
      }
    }
  }

  return { budgetsChecked: budgets.length, alertCount };
}

// ─── Register All Jobs ──────────────────────────────────────────────
registerJob('budget-reset', resetMonthlyBudgets, 24 * 3600000, 'Reset monthly budgets on the 1st');
registerJob('emi-reminders', sendEMIDueReminders, 12 * 3600000, 'Send EMI due date reminders');
registerJob('subscription-renewals', checkSubscriptionRenewals, 24 * 3600000, 'Check upcoming subscription renewals');
registerJob('goal-milestones', checkGoalMilestones, 6 * 3600000, 'Check and notify goal milestones');
registerJob('budget-overspend', checkBudgetOverspend, 3600000, 'Check budget overspend alerts');
registerJob('ai-retrain', retrainAIModels, 7 * 24 * 3600000, 'Retrain AI models weekly');
registerJob('cleanup', cleanupStaleData, 24 * 3600000, 'Cleanup stale data daily');

// ─── Scheduler ──────────────────────────────────────────────────────
function startAllJobs() {
  for (const [name, job] of jobRegistry) {
    if (job.timer) clearInterval(job.timer);
    job.timer = setInterval(() => runJob(name).catch(() => {}), job.intervalMs);
    job.nextRun = new Date(Date.now() + job.intervalMs);
    logger.info(`Scheduled job "${name}" to run every ${(job.intervalMs / 3600000).toFixed(1)}h`);
  }
  logger.info(`All ${jobRegistry.size} jobs scheduled`);
}

function stopAllJobs() {
  for (const [name, job] of jobRegistry) {
    if (job.timer) { clearInterval(job.timer); job.timer = null; }
    job.status = 'stopped';
  }
  logger.info('All jobs stopped');
}

function getJobStatus() {
  const jobs = {};
  for (const [name, job] of jobRegistry) {
    jobs[name] = {
      description: job.description,
      status: job.status,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      errors: job.errors,
      intervalHours: (job.intervalMs / 3600000).toFixed(1),
    };
  }
  return { jobs, totalJobs: jobRegistry.size, history: jobHistory.slice(-20) };
}

module.exports = {
  registerJob,
  runJob,
  startAllJobs,
  stopAllJobs,
  getJobStatus,
  resetMonthlyBudgets,
  sendEMIDueReminders,
  checkSubscriptionRenewals,
  checkGoalMilestones,
  checkBudgetOverspend,
  retrainAIModels,
  cleanupStaleData,
};
