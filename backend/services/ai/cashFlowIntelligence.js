// ============================================================================
// CASH FLOW INTELLIGENCE ENGINE — Predictive Cash Flow Management
// ============================================================================
// Implements cash flow forecasting, liquidity analysis, bill calendar,
// income pattern detection, expense timing optimization, and cash
// flow gap alerting. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1));
};

// ============================================================================
// §1  INCOME PATTERN DETECTOR
// ============================================================================

class IncomePatternDetector {
  detect(transactions) {
    const incomes = transactions
      .filter(t => t.type === 'income')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (incomes.length < 3) {
      return { patterns: [], primaryIncome: null, isStable: false };
    }

    // Group by source/description
    const sources = {};
    for (const t of incomes) {
      const source = this._normalizeSource(t.description || t.category || 'unknown');
      if (!sources[source]) sources[source] = [];
      sources[source].push({
        amount: Math.abs(t.amount || 0),
        date: new Date(t.date || Date.now()),
        dayOfMonth: new Date(t.date || Date.now()).getDate()
      });
    }

    const patterns = [];

    for (const [source, entries] of Object.entries(sources)) {
      if (entries.length < 2) continue;

      const amounts = entries.map(e => e.amount);
      const days = entries.map(e => e.dayOfMonth);
      const gaps = [];
      for (let i = 1; i < entries.length; i++) {
        gaps.push((entries[i].date - entries[i - 1].date) / (1000 * 60 * 60 * 24));
      }

      const avgAmount = mean(amounts);
      const amountCV = stdDev(amounts) / (avgAmount || 1);
      const avgGap = mean(gaps);
      const gapCV = gaps.length > 0 ? stdDev(gaps) / (avgGap || 1) : 1;

      // Determine frequency
      let frequency = 'irregular';
      if (avgGap >= 25 && avgGap <= 35 && gapCV < 0.3) frequency = 'monthly';
      else if (avgGap >= 12 && avgGap <= 18 && gapCV < 0.3) frequency = 'biweekly';
      else if (avgGap >= 5 && avgGap <= 9 && gapCV < 0.3) frequency = 'weekly';
      else if (avgGap >= 85 && avgGap <= 100 && gapCV < 0.3) frequency = 'quarterly';

      // Determine typical day
      const modeDays = {};
      for (const d of days) {
        const bin = Math.round(d / 5) * 5 || 1;
        modeDays[bin] = (modeDays[bin] || 0) + 1;
      }
      const typicalDay = parseInt(Object.entries(modeDays).sort((a, b) => b[1] - a[1])[0]?.[0]) || 1;

      // Stability
      const isStable = amountCV < 0.15 && gapCV < 0.25;

      // Next expected
      const lastEntry = entries[entries.length - 1];
      const nextExpectedDate = new Date(lastEntry.date.getTime() + avgGap * 86400000);
      const nextExpectedAmount = isStable ? avgAmount : avgAmount * (1 + (amountCV * 0.5)); // Conservative estimate

      patterns.push({
        source,
        frequency,
        avgAmount: Math.round(avgAmount),
        medianAmount: Math.round(this._median(amounts)),
        amountVariability: (amountCV * 100).toFixed(1) + '%',
        isStable,
        typicalDay,
        occurrences: entries.length,
        lastReceived: lastEntry.date,
        nextExpected: nextExpectedDate,
        nextExpectedAmount: Math.round(nextExpectedAmount),
        trend: this._detectTrend(amounts),
        reliability: isStable ? 'high' : amountCV < 0.3 ? 'medium' : 'low'
      });
    }

    // Sort by average amount
    patterns.sort((a, b) => b.avgAmount - a.avgAmount);

    // Primary income
    const primary = patterns.length > 0 ? patterns[0] : null;

    return {
      patterns,
      primaryIncome: primary,
      totalMonthlyIncome: sum(patterns.filter(p => p.frequency === 'monthly').map(p => p.avgAmount)),
      incomeSources: patterns.length,
      isStable: primary?.isStable || false,
      diversificationScore: Math.min(100, patterns.length * 25)
    };
  }

  _normalizeSource(desc) {
    return (desc || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ').slice(0, 3).join(' ') || 'unknown';
  }

  _detectTrend(amounts) {
    if (amounts.length < 3) return 'stable';
    const n = amounts.length;
    const recent = mean(amounts.slice(-Math.ceil(n / 3)));
    const older = mean(amounts.slice(0, Math.ceil(n / 3)));
    const change = older > 0 ? (recent - older) / older : 0;
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  _median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
}

// ============================================================================
// §2  RECURRING EXPENSE DETECTOR
// ============================================================================

class RecurringExpenseDetector {
  detect(transactions) {
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    if (expenses.length < 5) return { recurring: [], subscriptions: [], totalMonthly: 0 };

    // Group by merchant/description + approximate amount
    const groups = {};
    for (const t of expenses) {
      const key = this._groupKey(t);
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        amount: Math.abs(t.amount || 0),
        date: new Date(t.date || Date.now()),
        description: t.description || t.merchant || '',
        category: t.category || 'unknown'
      });
    }

    const recurring = [];
    const subscriptions = [];

    for (const [key, entries] of Object.entries(groups)) {
      if (entries.length < 2) continue;

      const amounts = entries.map(e => e.amount);
      const dates = entries.sort((a, b) => a.date - b.date);
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i].date - dates[i - 1].date) / (1000 * 60 * 60 * 24));
      }

      if (gaps.length === 0) continue;

      const avgGap = mean(gaps);
      const gapCV = stdDev(gaps) / (avgGap || 1);
      const avgAmount = mean(amounts);
      const amountCV = stdDev(amounts) / (avgAmount || 1);
      const isConsistent = gapCV < 0.35 && avgGap > 7;

      if (!isConsistent) continue;

      // Determine type
      let type = 'recurring';
      let frequency = 'irregular';
      if (avgGap >= 25 && avgGap <= 35) { frequency = 'monthly'; }
      else if (avgGap >= 85 && avgGap <= 100) { frequency = 'quarterly'; }
      else if (avgGap >= 350 && avgGap <= 380) { frequency = 'annual'; }
      else if (avgGap >= 12 && avgGap <= 18) { frequency = 'biweekly'; }

      // Check if subscription (consistent amount + consistent timing)
      const isSubscription = amountCV < 0.05 && frequency === 'monthly';

      // Next due date
      const lastDate = dates[dates.length - 1].date;
      const nextDue = new Date(lastDate.getTime() + avgGap * 86400000);
      const monthlyEquivalent = frequency === 'monthly' ? avgAmount :
                                frequency === 'quarterly' ? avgAmount / 3 :
                                frequency === 'annual' ? avgAmount / 12 :
                                frequency === 'biweekly' ? avgAmount * 2.17 : avgAmount;

      const entry = {
        description: entries[0].description,
        category: entries[0].category,
        amount: Math.round(avgAmount),
        monthlyEquivalent: Math.round(monthlyEquivalent),
        frequency,
        isSubscription,
        occurrences: entries.length,
        avgGapDays: Math.round(avgGap),
        priceConsistency: (1 - amountCV) * 100,
        timingConsistency: (1 - gapCV) * 100,
        lastDate: lastDate,
        nextDue,
        daysUntilNext: Math.max(0, Math.round((nextDue - Date.now()) / 86400000)),
        annualCost: Math.round(monthlyEquivalent * 12),
        trend: this._priceTrend(amounts)
      };

      recurring.push(entry);
      if (isSubscription) subscriptions.push(entry);
    }

    recurring.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
    subscriptions.sort((a, b) => b.amount - a.amount);

    const totalMonthly = sum(recurring.map(r => r.monthlyEquivalent));
    const totalSubs = sum(subscriptions.map(s => s.amount));

    return {
      recurring,
      subscriptions,
      totalMonthlyRecurring: Math.round(totalMonthly),
      totalMonthlySubscriptions: Math.round(totalSubs),
      totalAnnualRecurring: Math.round(totalMonthly * 12),
      upcomingNext7Days: recurring.filter(r => r.daysUntilNext <= 7),
      upcomingNext30Days: recurring.filter(r => r.daysUntilNext <= 30),
      subscriptionCount: subscriptions.length,
      priceIncreases: recurring.filter(r => r.trend === 'increasing'),
      potentialSavings: this._identifySavings(recurring, subscriptions)
    };
  }

  _groupKey(txn) {
    const desc = (txn.description || txn.merchant || '').toLowerCase()
      .replace(/[^a-z0-9]/g, '').substring(0, 20);
    const amtBucket = Math.round(Math.abs(txn.amount || 0) / 50) * 50;
    return `${desc}_${amtBucket}`;
  }

  _priceTrend(amounts) {
    if (amounts.length < 3) return 'stable';
    const recent = mean(amounts.slice(-2));
    const older = mean(amounts.slice(0, 2));
    if (recent > older * 1.05) return 'increasing';
    if (recent < older * 0.95) return 'decreasing';
    return 'stable';
  }

  _identifySavings(recurring, subscriptions) {
    const savings = [];
    for (const sub of subscriptions) {
      if (sub.occurrences > 3 && sub.amount > 100) {
        savings.push({
          item: sub.description,
          monthlyAmount: sub.amount,
          annualAmount: sub.annualCost,
          suggestion: `Review if "${sub.description}" subscription (₹${sub.amount}/mo) is still needed`
        });
      }
    }
    for (const rec of recurring) {
      if (rec.trend === 'increasing' && rec.monthlyEquivalent > 500) {
        savings.push({
          item: rec.description,
          monthlyAmount: rec.monthlyEquivalent,
          suggestion: `"${rec.description}" costs are increasing. Check for alternatives.`
        });
      }
    }
    return savings;
  }
}

// ============================================================================
// §3  CASH FLOW FORECASTER
// ============================================================================

class CashFlowForecaster {
  constructor() {
    this.incomeDetector = new IncomePatternDetector();
    this.expenseDetector = new RecurringExpenseDetector();
  }

  forecast(transactions, daysAhead = 90, initialBalance = null) {
    const incomePatterns = this.incomeDetector.detect(transactions);
    const expensePatterns = this.expenseDetector.detect(transactions);

    // Estimate initial balance
    const balance = initialBalance !== null ? initialBalance :
      this._estimateBalance(transactions);

    // Build daily forecast
    const dailyForecast = [];
    let runningBalance = balance;
    const today = new Date();

    for (let d = 0; d < daysAhead; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay();

      let dayIncome = 0;
      let dayExpense = 0;
      const events = [];

      // Project income
      for (const pattern of incomePatterns.patterns) {
        if (this._isIncomeExpected(pattern, date)) {
          dayIncome += pattern.avgAmount;
          events.push({
            type: 'income',
            source: pattern.source,
            amount: pattern.avgAmount,
            confidence: pattern.isStable ? 0.9 : 0.6
          });
        }
      }

      // Project recurring expenses
      for (const rec of expensePatterns.recurring) {
        if (this._isExpenseExpected(rec, date)) {
          dayExpense += rec.amount;
          events.push({
            type: 'expense',
            source: rec.description,
            amount: rec.amount,
            confidence: rec.priceConsistency / 100
          });
        }
      }

      // Add estimated variable spending
      const variableSpend = this._estimateVariableSpending(transactions, dayOfWeek, dayOfMonth);
      dayExpense += variableSpend;

      runningBalance = runningBalance + dayIncome - dayExpense;

      dailyForecast.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        income: Math.round(dayIncome),
        expense: Math.round(dayExpense),
        variableExpense: Math.round(variableSpend),
        netFlow: Math.round(dayIncome - dayExpense),
        balance: Math.round(runningBalance),
        events,
        isPayday: dayIncome > 0
      });
    }

    // Weekly aggregation
    const weeklyForecast = [];
    for (let w = 0; w < Math.ceil(daysAhead / 7); w++) {
      const weekDays = dailyForecast.slice(w * 7, (w + 1) * 7);
      weeklyForecast.push({
        week: w + 1,
        startDate: weekDays[0]?.date,
        endDate: weekDays[weekDays.length - 1]?.date,
        totalIncome: sum(weekDays.map(d => d.income)),
        totalExpense: sum(weekDays.map(d => d.expense)),
        netFlow: sum(weekDays.map(d => d.netFlow)),
        endBalance: weekDays[weekDays.length - 1]?.balance || 0
      });
    }

    // Monthly aggregation
    const monthlyForecast = this._aggregateMonthly(dailyForecast);

    // Risk analysis
    const liquidityRisks = this._identifyLiquidityRisks(dailyForecast);
    const cashFlowGaps = this._identifyGaps(dailyForecast, balance);

    // Summary metrics
    const totalIncome = sum(dailyForecast.map(d => d.income));
    const totalExpense = sum(dailyForecast.map(d => d.expense));
    const lowestBalance = Math.min(...dailyForecast.map(d => d.balance));
    const highestBalance = Math.max(...dailyForecast.map(d => d.balance));

    return {
      initialBalance: Math.round(balance),
      forecastDays: daysAhead,
      daily: dailyForecast,
      weekly: weeklyForecast,
      monthly: monthlyForecast,
      summary: {
        totalProjectedIncome: Math.round(totalIncome),
        totalProjectedExpenses: Math.round(totalExpense),
        netCashFlow: Math.round(totalIncome - totalExpense),
        endingBalance: Math.round(dailyForecast[dailyForecast.length - 1]?.balance || 0),
        lowestBalance: Math.round(lowestBalance),
        highestBalance: Math.round(highestBalance),
        averageDailySpending: Math.round(totalExpense / daysAhead),
        burnRate: totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) + '%' : 'N/A'
      },
      risks: liquidityRisks,
      gaps: cashFlowGaps,
      incomePatterns: incomePatterns.patterns.slice(0, 5),
      recurringExpenses: expensePatterns.recurring.slice(0, 10),
      recommendations: this._generateRecommendations(dailyForecast, liquidityRisks, cashFlowGaps)
    };
  }

  _estimateBalance(transactions) {
    const sorted = [...transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const recent30 = sorted.filter(t => {
      const d = new Date(t.date || 0);
      return (Date.now() - d.getTime()) < 30 * 86400000;
    });

    const recentIncome = sum(recent30.filter(t => t.type === 'income').map(t => Math.abs(t.amount || 0)));
    const recentExpense = sum(recent30.filter(t => t.type === 'expense').map(t => Math.abs(t.amount || 0)));

    return Math.max(0, (recentIncome - recentExpense) * 2);
  }

  _isIncomeExpected(pattern, date) {
    const dom = date.getDate();
    if (pattern.frequency === 'monthly') {
      return Math.abs(dom - pattern.typicalDay) <= 2;
    }
    if (pattern.frequency === 'biweekly') {
      return Math.abs(dom - pattern.typicalDay) <= 1 ||
             Math.abs(dom - (pattern.typicalDay + 15)) <= 1;
    }
    return false;
  }

  _isExpenseExpected(recurring, date) {
    const nextDue = new Date(recurring.nextDue);
    const diff = Math.abs(date.getTime() - nextDue.getTime()) / 86400000;

    if (diff <= 1) return true;

    // Check periodic occurrences
    if (recurring.frequency === 'monthly') {
      const dom = date.getDate();
      const expectedDom = new Date(recurring.lastDate).getDate();
      return Math.abs(dom - expectedDom) <= 1;
    }
    return false;
  }

  _estimateVariableSpending(transactions, dayOfWeek, dayOfMonth) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 14) return 1500; // Default

    // Day-of-week pattern
    const dowAmounts = {};
    for (const t of expenses) {
      const dow = new Date(t.date || 0).getDay();
      if (!dowAmounts[dow]) dowAmounts[dow] = [];
      dowAmounts[dow].push(Math.abs(t.amount || 0));
    }

    const dowAvg = (dowAmounts[dayOfWeek] || []).length > 0
      ? mean(dowAmounts[dayOfWeek]) : mean(expenses.map(t => Math.abs(t.amount || 0)));

    // Day-of-month adjustment (salary week = higher spending)
    const monthMultiplier = (dayOfMonth <= 5 || dayOfMonth >= 28) ? 1.3 : 1.0;

    // Weekend adjustment
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;

    return dowAvg * monthMultiplier * weekendMultiplier * 0.4; // Reduced for variable only
  }

  _aggregateMonthly(dailyForecast) {
    const months = {};
    for (const day of dailyForecast) {
      const monthKey = day.date.substring(0, 7);
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0, days: 0 };
      }
      months[monthKey].income += day.income;
      months[monthKey].expense += day.expense;
      months[monthKey].days++;
    }

    return Object.entries(months).map(([month, data]) => ({
      month,
      income: Math.round(data.income),
      expense: Math.round(data.expense),
      netFlow: Math.round(data.income - data.expense),
      savingsRate: data.income > 0
        ? ((data.income - data.expense) / data.income * 100).toFixed(1) + '%'
        : 'N/A'
    }));
  }

  _identifyLiquidityRisks(forecast) {
    const risks = [];

    // Negative balance days
    const negativeDays = forecast.filter(d => d.balance < 0);
    if (negativeDays.length > 0) {
      risks.push({
        severity: 'critical',
        type: 'negative_balance',
        message: `Balance goes negative on ${negativeDays.length} day(s). First: ${negativeDays[0].date}`,
        affectedDates: negativeDays.map(d => d.date).slice(0, 5),
        lowestPoint: Math.min(...negativeDays.map(d => d.balance))
      });
    }

    // Low balance periods
    const avgBalance = mean(forecast.map(d => d.balance));
    const lowThreshold = Math.max(10000, avgBalance * 0.2);
    const lowDays = forecast.filter(d => d.balance < lowThreshold && d.balance >= 0);
    if (lowDays.length > 5) {
      risks.push({
        severity: 'high',
        type: 'low_balance',
        message: `Balance below ₹${lowThreshold.toLocaleString()} for ${lowDays.length} days`,
        threshold: lowThreshold,
        periods: lowDays.length
      });
    }

    // High expense concentration (>40% monthly spend in one week)
    const weeklyExpenses = [];
    for (let w = 0; w < Math.ceil(forecast.length / 7); w++) {
      const week = forecast.slice(w * 7, (w + 1) * 7);
      weeklyExpenses.push(sum(week.map(d => d.expense)));
    }
    const totalExpense = sum(weeklyExpenses);
    for (let w = 0; w < weeklyExpenses.length; w++) {
      if (totalExpense > 0 && weeklyExpenses[w] / totalExpense > 0.4) {
        risks.push({
          severity: 'medium',
          type: 'expense_concentration',
          message: `Week ${w + 1} has ${((weeklyExpenses[w] / totalExpense) * 100).toFixed(0)}% of total expenses`,
          weekNumber: w + 1
        });
      }
    }

    return risks;
  }

  _identifyGaps(forecast, initialBalance) {
    const gaps = [];
    let inGap = false;
    let gapStart = null;

    for (const day of forecast) {
      if (day.netFlow < -initialBalance * 0.05 && !inGap) {
        inGap = true;
        gapStart = day.date;
      } else if (day.netFlow >= 0 && inGap) {
        inGap = false;
        gaps.push({
          startDate: gapStart,
          endDate: day.date,
          type: 'expense_heavy_period'
        });
      }
    }

    return gaps;
  }

  _generateRecommendations(forecast, risks, gaps) {
    const recs = [];

    if (risks.some(r => r.type === 'negative_balance')) {
      recs.push({
        priority: 'critical',
        message: 'Your balance is projected to go negative. Ensure ₹' +
          Math.abs(Math.min(...forecast.map(d => d.balance))).toLocaleString() +
          ' is available or defer non-essential expenses.'
      });
    }

    if (risks.some(r => r.type === 'low_balance')) {
      recs.push({
        priority: 'high',
        message: 'Extended low-balance periods detected. Build a buffer of at least 2 weeks\' expenses.'
      });
    }

    const totalIncome = sum(forecast.map(d => d.income));
    const totalExpense = sum(forecast.map(d => d.expense));
    if (totalExpense > totalIncome * 0.95) {
      recs.push({
        priority: 'medium',
        message: 'You\'re projected to spend 95%+ of income. Aim to reduce to 80% for healthy cash flow.'
      });
    }

    if (gaps.length > 2) {
      recs.push({
        priority: 'medium',
        message: 'Multiple cash flow gaps detected. Consider timing bill payments evenly across the month.'
      });
    }

    return recs;
  }
}

// ============================================================================
// §4  BILL CALENDAR GENERATOR
// ============================================================================

class BillCalendarGenerator {
  generate(recurringExpenses, incomePatterns, daysAhead = 60) {
    const calendar = [];
    const today = new Date();

    for (let d = 0; d < daysAhead; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const events = [];

      // Add recurring expenses
      for (const exp of recurringExpenses) {
        if (this._isDue(exp, date)) {
          events.push({
            type: 'bill',
            name: exp.description,
            amount: exp.amount,
            category: exp.category,
            isSubscription: exp.isSubscription,
            confidence: exp.timingConsistency / 100
          });
        }
      }

      // Add income events
      for (const inc of incomePatterns) {
        if (this._isIncomeDay(inc, date)) {
          events.push({
            type: 'income',
            name: inc.source,
            amount: inc.avgAmount,
            confidence: inc.isStable ? 0.9 : 0.6
          });
        }
      }

      if (events.length > 0) {
        calendar.push({
          date: dateStr,
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          events,
          totalBills: sum(events.filter(e => e.type === 'bill').map(e => e.amount)),
          totalIncome: sum(events.filter(e => e.type === 'income').map(e => e.amount)),
          netFlow: sum(events.map(e => e.type === 'income' ? e.amount : -e.amount))
        });
      }
    }

    return {
      calendar,
      totalUpcomingBills: sum(calendar.map(d => d.totalBills)),
      totalUpcomingIncome: sum(calendar.map(d => d.totalIncome)),
      heaviestDay: calendar.sort((a, b) => b.totalBills - a.totalBills)[0] || null,
      billFreeDays: daysAhead - calendar.length,
      next7Days: calendar.filter(d => {
        const diff = (new Date(d.date) - today) / 86400000;
        return diff >= 0 && diff < 7;
      })
    };
  }

  _isDue(expense, date) {
    if (!expense.nextDue) return false;
    const nextDue = new Date(expense.nextDue);
    return Math.abs(date.getTime() - nextDue.getTime()) < 86400000;
  }

  _isIncomeDay(income, date) {
    const dom = date.getDate();
    return Math.abs(dom - (income.typicalDay || 1)) <= 1;
  }
}

// ============================================================================
// §5  LIQUIDITY ANALYZER
// ============================================================================

class LiquidityAnalyzer {
  analyze(transactions, currentBalance = 0) {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 10) return { score: 50, metrics: {}, adequate: true };

    // Calculate metrics
    const amounts = expenses.map(t => Math.abs(t.amount || 0));
    const dailyTotals = {};
    for (const t of expenses) {
      const d = new Date(t.date || 0).toISOString().split('T')[0];
      dailyTotals[d] = (dailyTotals[d] || 0) + Math.abs(t.amount || 0);
    }
    const dailyValues = Object.values(dailyTotals);

    const avgDailySpend = mean(dailyValues);
    const maxDailySpend = Math.max(...dailyValues);
    const avgMonthlySpend = avgDailySpend * 30;

    // Current ratio (balance / monthly expenses)
    const currentRatio = avgMonthlySpend > 0 ? currentBalance / avgMonthlySpend : 0;

    // Days of runway
    const runwayDays = avgDailySpend > 0 ? currentBalance / avgDailySpend : 0;

    // Expense coverage months
    const coverageMonths = avgMonthlySpend > 0 ? currentBalance / avgMonthlySpend : 0;

    // Quick ratio (liquid assets / immediate obligations)
    // Simplified: balance vs upcoming 7 days of obligations
    const weeklySpend = avgDailySpend * 7;
    const quickRatio = weeklySpend > 0 ? currentBalance / weeklySpend : 10;

    // Spending volatility
    const spendVolatility = avgDailySpend > 0 ? stdDev(dailyValues) / avgDailySpend : 0;

    // Liquidity score
    let score = 50;
    if (currentRatio >= 3) score += 20;
    else if (currentRatio >= 1) score += 10;
    else if (currentRatio < 0.5) score -= 20;

    if (runwayDays >= 90) score += 15;
    else if (runwayDays >= 30) score += 5;
    else if (runwayDays < 14) score -= 15;

    if (spendVolatility < 0.5) score += 10;
    else if (spendVolatility > 1.5) score -= 10;

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      adequate: score >= 50,
      metrics: {
        currentBalance: Math.round(currentBalance),
        avgDailySpend: Math.round(avgDailySpend),
        avgMonthlySpend: Math.round(avgMonthlySpend),
        maxDailySpend: Math.round(maxDailySpend),
        currentRatio: currentRatio.toFixed(2),
        quickRatio: quickRatio.toFixed(2),
        runwayDays: Math.round(runwayDays),
        coverageMonths: coverageMonths.toFixed(1),
        spendingVolatility: (spendVolatility * 100).toFixed(0) + '%'
      },
      status: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' :
              score >= 40 ? 'Fair' : 'Critical',
      recommendations: this._getRecommendations(score, currentRatio, runwayDays, coverageMonths)
    };
  }

  _getRecommendations(score, ratio, runway, coverage) {
    const recs = [];
    if (coverage < 1) {
      recs.push('Build emergency buffer to cover at least 1 month of expenses');
    }
    if (ratio < 2) {
      recs.push('Aim for 2-3 months of expenses in liquid assets');
    }
    if (runway < 30) {
      recs.push(`Only ${Math.round(runway)} days of runway. Reduce discretionary spending.`);
    }
    if (score >= 80) {
      recs.push('Excellent liquidity. Consider investing surplus for higher returns.');
    }
    return recs;
  }
}

// ============================================================================
// §6  UNIFIED CASH FLOW INTELLIGENCE SERVICE
// ============================================================================

class CashFlowIntelligenceService {
  constructor() {
    this.forecaster = new CashFlowForecaster();
    this.billCalendar = new BillCalendarGenerator();
    this.liquidityAnalyzer = new LiquidityAnalyzer();
    this.incomeDetector = new IncomePatternDetector();
    this.expenseDetector = new RecurringExpenseDetector();
  }

  async analyze(userId, transactions, currentBalance = null) {
    // Income patterns
    const incomeAnalysis = this.incomeDetector.detect(transactions);

    // Recurring expenses
    const expenseAnalysis = this.expenseDetector.detect(transactions);

    // Cash flow forecast
    const forecast = this.forecaster.forecast(transactions, 90, currentBalance);

    // Bill calendar
    const calendar = this.billCalendar.generate(
      expenseAnalysis.recurring,
      incomeAnalysis.patterns,
      60
    );

    // Liquidity analysis
    const balance = currentBalance || forecast.initialBalance;
    const liquidity = this.liquidityAnalyzer.analyze(transactions, balance);

    return {
      incomeAnalysis,
      expenseAnalysis,
      forecast: {
        daily: forecast.daily.slice(0, 30),
        weekly: forecast.weekly,
        monthly: forecast.monthly,
        summary: forecast.summary,
        risks: forecast.risks,
        recommendations: forecast.recommendations
      },
      billCalendar: calendar,
      liquidity,
      generatedAt: new Date()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  IncomePatternDetector,
  RecurringExpenseDetector,
  CashFlowForecaster,
  BillCalendarGenerator,
  LiquidityAnalyzer,
  CashFlowIntelligenceService
};
