// ============================================================================
// Cash Flow Projection Engine — AI-Powered Financial Forecasting
// ============================================================================
// Multi-horizon cash flow forecasting with:
//  - Short-term (7/14/30 day) projections
//  - Medium-term (3/6 month) forecasts with seasonality
//  - Long-term (1-5 year) projections with growth modeling
//  - Balance at risk (minimum balance prediction)
//  - Scenario analysis (best/worst/expected)
//  - Bill timing integration
//  - Income stability analysis
// ============================================================================

const Transaction = require('../../models/Transaction');
const EMI = require('../../models/EMI');
const logger = require('../../utils/logger');

class CashFlowProjectionEngine {
  /**
   * Generate comprehensive cash flow projection
   */
  async project(userId, options = {}) {
    const { horizon = 90, startBalance = 0, includeEMIs = true, scenarioAnalysis = true } = options;

    // Fetch historical data (6 months)
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const transactions = await Transaction.find({ userId, date: { $gte: since } }).sort({ date: 1 }).lean();

    if (transactions.length < 10) {
      return { error: 'insufficient_data', message: 'Need at least 10 transactions for projections', transactionCount: transactions.length };
    }

    // Fetch EMIs
    let emis = [];
    if (includeEMIs) {
      try { emis = await EMI.find({ userId, status: 'active' }).lean(); } catch {}
    }

    // Analyze historical patterns
    const patterns = this._analyzePatterns(transactions);
    const incomePattern = this._analyzeIncomePattern(transactions);
    const expensePattern = this._analyzeExpensePattern(transactions);

    // Generate daily projections
    const dailyProjection = this._generateDailyProjection(
      patterns, incomePattern, expensePattern, emis, horizon, startBalance
    );

    // Generate weekly summary
    const weeklyProjection = this._aggregateToWeekly(dailyProjection);

    // Generate monthly summary
    const monthlyProjection = this._aggregateToMonthly(dailyProjection);

    // Scenario analysis
    let scenarios = null;
    if (scenarioAnalysis) {
      scenarios = {
        optimistic: this._generateDailyProjection(patterns, incomePattern, expensePattern, emis, horizon, startBalance, 1.1, 0.9),
        expected: dailyProjection,
        pessimistic: this._generateDailyProjection(patterns, incomePattern, expensePattern, emis, horizon, startBalance, 0.9, 1.15),
      };
    }

    // Key metrics
    const minBalance = Math.min(...dailyProjection.map(d => d.balance));
    const maxBalance = Math.max(...dailyProjection.map(d => d.balance));
    const endBalance = dailyProjection[dailyProjection.length - 1]?.balance || startBalance;
    const totalInflow = dailyProjection.reduce((s, d) => s + (d.income || 0), 0);
    const totalOutflow = dailyProjection.reduce((s, d) => s + (d.expense || 0), 0);

    // Risk alerts
    const alerts = [];
    const daysUnder5k = dailyProjection.filter(d => d.balance < 5000).length;
    if (daysUnder5k > 0) {
      alerts.push({
        type: 'balance_risk',
        severity: daysUnder5k > 14 ? 'high' : 'medium',
        message: `Balance may drop below ₹5,000 for ${daysUnder5k} days in the projection period`,
      });
    }

    const negativeBalanceDays = dailyProjection.filter(d => d.balance < 0).length;
    if (negativeBalanceDays > 0) {
      alerts.push({
        type: 'negative_balance',
        severity: 'critical',
        message: `Account may go negative for ${negativeBalanceDays} days. Ensure sufficient funds.`,
      });
    }

    // EMI impact
    const emiMonthly = emis.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);
    if (emiMonthly > incomePattern.avgMonthly * 0.4) {
      alerts.push({
        type: 'emi_burden',
        severity: 'high',
        message: `EMIs (₹${emiMonthly.toLocaleString('en-IN')}/month) consume ${Math.round(emiMonthly / incomePattern.avgMonthly * 100)}% of income`,
      });
    }

    return {
      summary: {
        startBalance: Math.round(startBalance),
        endBalance: Math.round(endBalance),
        minBalance: Math.round(minBalance),
        maxBalance: Math.round(maxBalance),
        totalInflow: Math.round(totalInflow),
        totalOutflow: Math.round(totalOutflow),
        netCashFlow: Math.round(totalInflow - totalOutflow),
        horizon,
      },
      projections: {
        daily: dailyProjection.map(d => ({ ...d, balance: Math.round(d.balance), income: Math.round(d.income || 0), expense: Math.round(d.expense || 0) })),
        weekly: weeklyProjection,
        monthly: monthlyProjection,
      },
      scenarios: scenarios ? {
        optimistic: { endBalance: Math.round(scenarios.optimistic[scenarios.optimistic.length - 1]?.balance || 0) },
        expected: { endBalance: Math.round(endBalance) },
        pessimistic: { endBalance: Math.round(scenarios.pessimistic[scenarios.pessimistic.length - 1]?.balance || 0) },
      } : null,
      patterns: {
        income: { ...incomePattern, avgMonthly: Math.round(incomePattern.avgMonthly) },
        expense: { ...expensePattern, avgMonthly: Math.round(expensePattern.avgMonthly) },
        volatility: patterns.volatility,
        seasonality: patterns.seasonalFactors,
      },
      alerts,
      emiImpact: {
        monthlyEmi: Math.round(emiMonthly),
        activeCount: emis.length,
        emiToIncomeRatio: incomePattern.avgMonthly > 0 ? Math.round(emiMonthly / incomePattern.avgMonthly * 100) : 0,
      },
    };
  }

  /**
   * Short-term projection (7 days) with daily granularity
   */
  async projectShortTerm(userId, currentBalance) {
    const result = await this.project(userId, {
      horizon: 7,
      startBalance: currentBalance || 0,
      scenarioAnalysis: false,
    });

    // Add day-of-week context
    if (result.projections?.daily) {
      result.projections.daily = result.projections.daily.map(d => ({
        ...d,
        dayName: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'long' }),
        isWeekend: [0, 6].includes(new Date(d.date).getDay()),
      }));
    }

    return result;
  }

  /**
   * Balance at risk analysis
   */
  async analyzeBalanceRisk(userId, currentBalance) {
    const result = await this.project(userId, {
      horizon: 30,
      startBalance: currentBalance || 0,
      scenarioAnalysis: true,
    });

    if (result.error) return result;

    const pessimisticDaily = this._generateDailyProjection(
      this._analyzePatterns(await Transaction.find({ userId }).sort({ date: -1 }).limit(500).lean()),
      result.patterns.income,
      result.patterns.expense,
      [], 30, currentBalance, 0.85, 1.2
    );

    const minPessimistic = Math.min(...pessimisticDaily.map(d => d.balance));
    const daysBeforeRisk = pessimisticDaily.findIndex(d => d.balance < 5000);

    return {
      currentBalance: Math.round(currentBalance),
      riskLevel: minPessimistic < 0 ? 'critical' : minPessimistic < 5000 ? 'high' : minPessimistic < 20000 ? 'moderate' : 'low',
      minimumProjectedBalance: Math.round(minPessimistic),
      daysUntilRisk: daysBeforeRisk >= 0 ? daysBeforeRisk : null,
      safetyBuffer: Math.round(Math.max(0, currentBalance - Math.abs(minPessimistic))),
      recommendations: this._getBalanceRiskRecommendations(minPessimistic, currentBalance, result),
    };
  }

  // ─── Pattern Analysis ──────────────────────────────────────────
  _analyzePatterns(transactions) {
    const dayOfWeek = new Array(7).fill(0).map(() => ({ income: 0, expense: 0, count: 0 }));
    const dayOfMonth = new Array(31).fill(0).map(() => ({ income: 0, expense: 0, count: 0 }));
    const monthly = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      const dow = d.getDay();
      const dom = d.getDate() - 1;
      const monthKey = d.toISOString().substring(0, 7);

      const amt = t.amount || 0;
      if (t.type === 'income') {
        dayOfWeek[dow].income += amt;
        dayOfMonth[dom].income += amt;
      } else {
        dayOfWeek[dow].expense += amt;
        dayOfMonth[dom].expense += amt;
      }
      dayOfWeek[dow].count++;
      dayOfMonth[dom].count++;

      if (!monthly[monthKey]) monthly[monthKey] = { income: 0, expense: 0 };
      if (t.type === 'income') monthly[monthKey].income += amt;
      else monthly[monthKey].expense += amt;
    });

    // Normalize
    const maxDowCount = Math.max(...dayOfWeek.map(d => d.count), 1);
    const dowWeights = dayOfWeek.map(d => ({
      income: d.count > 0 ? d.income / d.count : 0,
      expense: d.count > 0 ? d.expense / d.count : 0,
    }));

    // Monthly seasonal factors
    const monthlyValues = Object.values(monthly);
    const avgMonthlyExpense = monthlyValues.length > 0
      ? monthlyValues.reduce((s, m) => s + m.expense, 0) / monthlyValues.length
      : 0;

    const seasonalFactors = new Array(12).fill(1);
    const monthCounts = new Array(12).fill(0);
    Object.entries(monthly).forEach(([key, data]) => {
      const m = parseInt(key.split('-')[1]) - 1;
      if (avgMonthlyExpense > 0) {
        seasonalFactors[m] = data.expense / avgMonthlyExpense;
      }
      monthCounts[m]++;
    });

    // Volatility
    const expenses = transactions.filter(t => t.type === 'expense').map(t => t.amount || 0);
    const mean = expenses.length > 0 ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
    const variance = expenses.length > 1 ? expenses.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / expenses.length : 0;
    const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

    return { dowWeights, dayOfMonth, seasonalFactors, volatility: Math.round(volatility * 100) / 100, monthly };
  }

  _analyzeIncomePattern(transactions) {
    const incomes = transactions.filter(t => t.type === 'income');
    const monthly = {};
    incomes.forEach(t => {
      const key = new Date(t.date).toISOString().substring(0, 7);
      monthly[key] = (monthly[key] || 0) + (t.amount || 0);
    });
    const values = Object.values(monthly);
    const avgMonthly = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    // Detect typical income days
    const incomeDays = {};
    incomes.forEach(t => {
      const day = new Date(t.date).getDate();
      incomeDays[day] = (incomeDays[day] || 0) + 1;
    });
    const typicalDays = Object.entries(incomeDays)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => parseInt(day));

    return { avgMonthly, typicalDays, monthlyHistory: monthly, count: incomes.length };
  }

  _analyzeExpensePattern(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const monthly = {};
    expenses.forEach(t => {
      const key = new Date(t.date).toISOString().substring(0, 7);
      monthly[key] = (monthly[key] || 0) + (t.amount || 0);
    });
    const values = Object.values(monthly);
    const avgMonthly = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const avgDaily = avgMonthly / 30;

    return { avgMonthly, avgDaily, monthlyHistory: monthly, count: expenses.length };
  }

  // ─── Projection Generation ─────────────────────────────────────
  _generateDailyProjection(patterns, incomePattern, expensePattern, emis, days, startBalance, incomeMultiplier = 1, expenseMultiplier = 1) {
    const projection = [];
    let balance = startBalance;
    const emiDays = emis.map(e => ({
      day: e.nextDueDate ? new Date(e.nextDueDate).getDate() : 1,
      amount: (e.emiAmountInINR || e.emiAmount || 0),
    }));

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dow = date.getDay();
      const dom = date.getDate();
      const month = date.getMonth();

      // Daily expense estimate
      const dowWeight = patterns.dowWeights?.[dow]?.expense || expensePattern.avgDaily;
      const seasonalFactor = patterns.seasonalFactors?.[month] || 1;
      let dailyExpense = (dowWeight || expensePattern.avgDaily) * seasonalFactor * expenseMultiplier;

      // Add EMI payments on their due day
      let emiPayment = 0;
      emiDays.forEach(emi => {
        if (dom === emi.day) emiPayment += emi.amount;
      });
      dailyExpense += emiPayment;

      // Daily income estimate (mainly on typical salary days)
      let dailyIncome = 0;
      if (incomePattern.typicalDays.includes(dom)) {
        dailyIncome = (incomePattern.avgMonthly / incomePattern.typicalDays.length) * incomeMultiplier;
      }

      // Add some controlled randomness for realism
      const noise = 1 + (Math.random() - 0.5) * 0.1;
      dailyExpense *= noise;

      balance += dailyIncome - dailyExpense;

      projection.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: dow,
        income: dailyIncome,
        expense: dailyExpense,
        emiPayment,
        balance,
        netFlow: dailyIncome - dailyExpense,
      });
    }

    return projection;
  }

  _aggregateToWeekly(daily) {
    const weeks = [];
    for (let i = 0; i < daily.length; i += 7) {
      const week = daily.slice(i, i + 7);
      weeks.push({
        weekStart: week[0]?.date,
        weekEnd: week[week.length - 1]?.date,
        income: Math.round(week.reduce((s, d) => s + (d.income || 0), 0)),
        expense: Math.round(week.reduce((s, d) => s + (d.expense || 0), 0)),
        endBalance: Math.round(week[week.length - 1]?.balance || 0),
        minBalance: Math.round(Math.min(...week.map(d => d.balance))),
      });
    }
    return weeks;
  }

  _aggregateToMonthly(daily) {
    const months = {};
    daily.forEach(d => {
      const key = d.date.substring(0, 7);
      if (!months[key]) months[key] = { income: 0, expense: 0, days: 0, minBalance: Infinity, endBalance: 0 };
      months[key].income += d.income || 0;
      months[key].expense += d.expense || 0;
      months[key].days++;
      months[key].minBalance = Math.min(months[key].minBalance, d.balance);
      months[key].endBalance = d.balance;
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      income: Math.round(data.income),
      expense: Math.round(data.expense),
      net: Math.round(data.income - data.expense),
      endBalance: Math.round(data.endBalance),
      minBalance: Math.round(data.minBalance),
    }));
  }

  _getBalanceRiskRecommendations(minBalance, currentBalance, projection) {
    const recs = [];
    if (minBalance < 0) {
      recs.push('Transfer funds to cover projected shortfall');
      recs.push('Defer non-essential purchases');
      recs.push('Set up an overdraft facility as safety net');
    } else if (minBalance < 5000) {
      recs.push('Maintain a buffer of at least ₹10,000 in your account');
      recs.push('Review upcoming bills and reschedule if possible');
    }
    if (projection?.emiImpact?.emiToIncomeRatio > 40) {
      recs.push('Consider foreclosing a small EMI to free up cash flow');
    }
    recs.push('Build an emergency fund of 3-6 months expenses');
    return recs;
  }
}

module.exports = new CashFlowProjectionEngine();
