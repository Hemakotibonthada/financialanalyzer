// ============================================================================
// Predictive Alert System — Proactive Financial Intelligence
// ============================================================================
// Generates proactive alerts before problems occur:
//  - Bill payment prediction (avoid late fees)
//  - Budget overshoot early warning
//  - Cash flow crunch prediction
//  - Unusual spending velocity detection
//  - Income gap detection
//  - EMI failure risk assessment
//  - Savings goal drift alert
//  - Subscription creep warning
// ============================================================================

const Transaction = require('../../models/Transaction');
const EMI = require('../../models/EMI');
const BillReminder = require('../../models/BillReminder');
const logger = require('../../utils/logger');

class PredictiveAlertSystem {
  /**
   * Generate all predictive alerts for a user
   */
  async generateAlerts(userId) {
    const alerts = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [transactions, emis, bills] = await Promise.all([
      Transaction.find({ userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }).lean(),
      EMI.find({ userId, status: 'active' }).lean().catch(() => []),
      BillReminder.find({ userId, status: { $in: ['pending', 'overdue'] } }).lean().catch(() => []),
    ]);

    // 1. Spending velocity alert
    alerts.push(...this._velocityAlert(transactions));

    // 2. Budget overshoot prediction
    alerts.push(...this._budgetOvershootPrediction(transactions, now));

    // 3. Cash crunch prediction
    alerts.push(...this._cashCrunchPrediction(transactions, emis, now));

    // 4. Bill payment reminders
    alerts.push(...this._billAlerts(bills, now));

    // 5. EMI risk assessment
    alerts.push(...this._emiRiskAlerts(emis, transactions));

    // 6. Income gap detection
    alerts.push(...this._incomeGapAlert(transactions));

    // 7. Subscription creep
    alerts.push(...this._subscriptionCreepAlert(transactions));

    // 8. Savings drift
    alerts.push(...this._savingsDriftAlert(transactions));

    // Sort by severity and freshness
    const priorityMap = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    alerts.sort((a, b) => (priorityMap[b.severity] || 0) - (priorityMap[a.severity] || 0));

    return {
      alerts: alerts.slice(0, 20),
      totalAlerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      generatedAt: now,
    };
  }

  // ─── Spending Velocity ──────────────────────────────────────────
  _velocityAlert(transactions) {
    const alerts = [];
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 7) return alerts;

    // Calculate daily spending
    const dailyMap = {};
    expenses.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + (t.amount || 0);
    });

    const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
    if (daily.length < 7) return alerts;

    const allValues = daily.map(([, v]) => v);
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const last3 = allValues.slice(-3);
    const recentAvg = last3.reduce((a, b) => a + b, 0) / last3.length;

    if (recentAvg > avg * 1.5 && avg > 100) {
      alerts.push({
        type: 'spending_velocity',
        severity: recentAvg > avg * 2 ? 'high' : 'medium',
        title: '🚀 Spending Acceleration Detected',
        message: `Your daily spending has increased to ₹${Math.round(recentAvg).toLocaleString('en-IN')}/day (avg: ₹${Math.round(avg).toLocaleString('en-IN')}/day). ${recentAvg > avg * 2 ? 'This is 2x your normal rate!' : 'Monitor closely.'}`,
        data: { recentAvg: Math.round(recentAvg), historicalAvg: Math.round(avg) },
        actionable: true,
        action: 'Review recent transactions and set daily spending alerts',
      });
    }

    return alerts;
  }

  // ─── Budget Overshoot Prediction ────────────────────────────────
  _budgetOvershootPrediction(transactions, now) {
    const alerts = [];
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const monthProgress = dayOfMonth / daysInMonth;

    const expenses = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalSpentThisMonth = expenses.reduce((s, t) => s + (t.amount || 0), 0);

    // Category-wise prediction
    const catSpent = {};
    expenses.forEach(t => {
      const cat = t.category || 'other';
      catSpent[cat] = (catSpent[cat] || 0) + (t.amount || 0);
    });

    // Project to end of month based on current pace
    const projectedTotal = monthProgress > 0 ? totalSpentThisMonth / monthProgress : 0;
    const dailyRate = dayOfMonth > 0 ? totalSpentThisMonth / dayOfMonth : 0;
    const projectedRemaining = dailyRate * daysRemaining;

    if (dayOfMonth >= 15 && monthProgress > 0) {
      // Check pace relative to typical monthly spend
      const prevMonthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && (d.getMonth() === (now.getMonth() - 1 + 12) % 12 || (d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear()));
      });
      const lastMonthTotal = prevMonthExpenses.reduce((s, t) => s + (t.amount || 0), 0);

      if (lastMonthTotal > 0 && projectedTotal > lastMonthTotal * 1.2) {
        alerts.push({
          type: 'budget_overshoot',
          severity: projectedTotal > lastMonthTotal * 1.5 ? 'high' : 'medium',
          title: '📊 Budget Overshoot Warning',
          message: `At current pace, you'll spend ₹${Math.round(projectedTotal).toLocaleString('en-IN')} this month (${Math.round((projectedTotal / lastMonthTotal - 1) * 100)}% more than last month's ₹${Math.round(lastMonthTotal).toLocaleString('en-IN')}).`,
          data: { projected: Math.round(projectedTotal), lastMonth: Math.round(lastMonthTotal), daysRemaining },
          actionable: true,
          action: `Limit spending to ₹${Math.round((lastMonthTotal - totalSpentThisMonth) / Math.max(1, daysRemaining)).toLocaleString('en-IN')}/day for remaining ${daysRemaining} days`,
        });
      }
    }

    return alerts;
  }

  // ─── Cash Crunch Prediction ─────────────────────────────────────
  _cashCrunchPrediction(transactions, emis, now) {
    const alerts = [];
    const income = transactions.filter(t => t.type === 'income');
    const monthlyIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense');
    const monthlyExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);
    const monthlyEmi = emis.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);

    const totalOutflow = monthlyExpense + monthlyEmi;
    const cashFlowGap = monthlyIncome - totalOutflow;

    if (cashFlowGap < 0) {
      alerts.push({
        type: 'cash_crunch',
        severity: 'critical',
        title: '🚨 Cash Flow Deficit Detected',
        message: `Your monthly outflow (₹${Math.round(totalOutflow).toLocaleString('en-IN')}) exceeds income (₹${Math.round(monthlyIncome).toLocaleString('en-IN')}) by ₹${Math.round(Math.abs(cashFlowGap)).toLocaleString('en-IN')}.`,
        data: { income: Math.round(monthlyIncome), outflow: Math.round(totalOutflow), gap: Math.round(cashFlowGap) },
        actionable: true,
        action: 'Immediately review and cut non-essential expenses. Consider additional income sources.',
      });
    } else if (cashFlowGap < monthlyIncome * 0.05 && monthlyIncome > 0) {
      alerts.push({
        type: 'thin_margin',
        severity: 'high',
        title: '⚠️ Very Thin Cash Flow Margin',
        message: `Only ₹${Math.round(cashFlowGap).toLocaleString('en-IN')} surplus (${Math.round(cashFlowGap / monthlyIncome * 100)}% of income). Any unexpected expense could cause a deficit.`,
        actionable: true,
        action: 'Build a ₹5,000-10,000 buffer by reducing discretionary spending.',
      });
    }

    return alerts;
  }

  // ─── Bill Payment Alerts ────────────────────────────────────────
  _billAlerts(bills, now) {
    const alerts = [];

    bills.forEach(bill => {
      const dueDate = new Date(bill.dueDate);
      const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        alerts.push({
          type: 'bill_overdue',
          severity: 'critical',
          title: `🔴 Overdue: ${bill.title || bill.name || 'Bill'}`,
          message: `₹${(bill.amount || 0).toLocaleString('en-IN')} was due ${Math.abs(daysUntil)} days ago. Pay immediately to avoid late fees.`,
          actionable: true,
        });
      } else if (daysUntil <= 3) {
        alerts.push({
          type: 'bill_due_soon',
          severity: 'high',
          title: `📅 Due ${daysUntil === 0 ? 'Today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}: ${bill.title || bill.name || 'Bill'}`,
          message: `₹${(bill.amount || 0).toLocaleString('en-IN')} payment due. Ensure sufficient balance.`,
          actionable: true,
        });
      } else if (daysUntil <= 7) {
        alerts.push({
          type: 'bill_upcoming',
          severity: 'medium',
          title: `📋 Upcoming: ${bill.title || bill.name || 'Bill'}`,
          message: `₹${(bill.amount || 0).toLocaleString('en-IN')} due in ${daysUntil} days.`,
          actionable: false,
        });
      }
    });

    return alerts;
  }

  // ─── EMI Risk Assessment ────────────────────────────────────────
  _emiRiskAlerts(emis, transactions) {
    const alerts = [];
    if (emis.length === 0) return alerts;

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalEmi = emis.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);
    const emiRatio = income > 0 ? (totalEmi / income * 100) : 0;

    if (emiRatio > 50) {
      alerts.push({
        type: 'emi_burden_critical',
        severity: 'critical',
        title: '🚨 EMI Burden Critical',
        message: `EMIs consume ${Math.round(emiRatio)}% of your income (₹${Math.round(totalEmi).toLocaleString('en-IN')} out of ₹${Math.round(income).toLocaleString('en-IN')}). Maximum recommended is 40%.`,
        actionable: true,
        action: 'Consider foreclosing smallest EMIs or consolidating at lower rates.',
      });
    } else if (emiRatio > 40) {
      alerts.push({
        type: 'emi_burden_high',
        severity: 'high',
        title: '⚠️ EMI Burden Approaching Limit',
        message: `EMIs are ${Math.round(emiRatio)}% of income. Avoid taking new loans.`,
        actionable: true,
      });
    }

    // Upcoming EMI deductions in next 7 days
    const now = new Date();
    emis.forEach(emi => {
      if (emi.nextDueDate) {
        const dueDate = new Date(emi.nextDueDate);
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 3) {
          alerts.push({
            type: 'emi_due',
            severity: 'medium',
            title: `💳 EMI Due ${daysUntil === 0 ? 'Today' : `in ${daysUntil} days`}`,
            message: `${emi.merchantName || emi.cardProvider}: ₹${(emi.emiAmountInINR || emi.emiAmount || 0).toLocaleString('en-IN')}. Ensure bank balance.`,
          });
        }
      }
    });

    return alerts;
  }

  // ─── Income Gap Detection ───────────────────────────────────────
  _incomeGapAlert(transactions) {
    const alerts = [];
    const income = transactions.filter(t => t.type === 'income');
    if (income.length === 0) return alerts;

    // Check if expected income arrived
    const now = new Date();
    const dayOfMonth = now.getDate();

    // If past 5th and no income this month
    if (dayOfMonth > 7) {
      const thisMonthIncome = income.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      if (thisMonthIncome.length === 0) {
        alerts.push({
          type: 'income_gap',
          severity: 'high',
          title: '💰 No Income Recorded This Month',
          message: `It's day ${dayOfMonth} and no income has been recorded. If you've received your salary, add the transaction. If delayed, plan expenses carefully.`,
          actionable: true,
          action: 'Add income transaction or contact your employer about salary delay.',
        });
      }
    }

    return alerts;
  }

  // ─── Subscription Creep ─────────────────────────────────────────
  _subscriptionCreepAlert(transactions) {
    const alerts = [];
    const subKeywords = ['netflix', 'spotify', 'hotstar', 'youtube', 'amazon prime', 'subscription', 'membership', 'premium', 'gym', 'plan'];
    const subs = transactions.filter(t =>
      t.type === 'expense' && subKeywords.some(kw => (t.description || '').toLowerCase().includes(kw))
    );

    if (subs.length >= 5) {
      const totalSub = subs.reduce((s, t) => s + (t.amount || 0), 0);
      const uniqueSubs = new Set(subs.map(t => (t.description || '').toLowerCase().substring(0, 20))).size;

      if (uniqueSubs >= 4) {
        alerts.push({
          type: 'subscription_creep',
          severity: 'medium',
          title: '📱 Subscription Creep Detected',
          message: `You have ${uniqueSubs}+ subscriptions totaling ~₹${Math.round(totalSub).toLocaleString('en-IN')}/month. Review and cancel unused ones.`,
          data: { count: uniqueSubs, total: Math.round(totalSub) },
          actionable: true,
          action: 'Audit each subscription — cancel any not used in the last 2 weeks.',
        });
      }
    }

    return alerts;
  }

  // ─── Savings Drift Alert ────────────────────────────────────────
  _savingsDriftAlert(transactions) {
    const alerts = [];
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;

    if (savingsRate < 5 && income > 0) {
      alerts.push({
        type: 'savings_drift',
        severity: 'high',
        title: '📉 Savings Rate Dangerously Low',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. You need at least 20% for financial security. You're saving only ₹${Math.round(income - expense).toLocaleString('en-IN')}/month.`,
        actionable: true,
        action: 'Set up automatic transfer of 20% of income to a separate savings account.',
      });
    } else if (savingsRate < 15 && income > 0) {
      alerts.push({
        type: 'savings_low',
        severity: 'medium',
        title: '💡 Room to Improve Savings',
        message: `Savings rate: ${savingsRate.toFixed(1)}%. Target: 20%+. Increase savings by ₹${Math.round(income * 0.2 - (income - expense)).toLocaleString('en-IN')}/month.`,
        actionable: true,
      });
    }

    return alerts;
  }
}

module.exports = new PredictiveAlertSystem();
