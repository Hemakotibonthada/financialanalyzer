// ============================================================================
// ENTERPRISE REPORT GENERATOR — Comprehensive Financial Reports
// ============================================================================
// PDF-ready data for financial statements, portfolio summaries, tax reports,
// budget analysis, and executive dashboards.
// ============================================================================

const logger = require('../utils/logger');

// ============================================================================
// §1  REPORT TEMPLATES
// ============================================================================

const REPORT_TEMPLATES = {
  EXECUTIVE_SUMMARY: 'executive_summary',
  INCOME_EXPENSE: 'income_expense',
  NET_WORTH: 'net_worth',
  INVESTMENT_PORTFOLIO: 'investment_portfolio',
  TAX_REPORT: 'tax_report',
  BUDGET_VARIANCE: 'budget_variance',
  CASH_FLOW: 'cash_flow',
  DEBT_ANALYSIS: 'debt_analysis',
  GOAL_PROGRESS: 'goal_progress',
  CREDIT_REPORT: 'credit_report',
  CUSTOM: 'custom',
};

const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  CUSTOM: 'custom',
};

// ============================================================================
// §2  DATA AGGREGATION HELPERS
// ============================================================================

class DataAggregator {
  static groupByPeriod(transactions, period = 'monthly') {
    const groups = {};
    for (const txn of transactions) {
      const date = new Date(txn.date || txn.createdAt);
      let key;
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0]; break;
        case 'quarterly':
          key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`; break;
        case 'annual':
          key = date.getFullYear().toString(); break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(txn);
    }
    return groups;
  }

  static summarizeTransactions(transactions) {
    let totalIncome = 0, totalExpense = 0;
    const categoryBreakdown = {};
    const paymentMethods = {};

    for (const txn of transactions) {
      const amount = Math.abs(txn.amount || 0);
      if (txn.type === 'income' || txn.type === 'credit') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      const cat = txn.category || 'Uncategorized';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { income: 0, expense: 0, count: 0 };
      if (txn.type === 'income' || txn.type === 'credit') {
        categoryBreakdown[cat].income += amount;
      } else {
        categoryBreakdown[cat].expense += amount;
      }
      categoryBreakdown[cat].count++;

      const method = txn.paymentMethod || 'Unknown';
      if (!paymentMethods[method]) paymentMethods[method] = 0;
      paymentMethods[method] += amount;
    }

    return {
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      netIncome: Math.round(totalIncome - totalExpense),
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100 * 10) / 10 : 0,
      transactionCount: transactions.length,
      avgTransactionAmount: transactions.length > 0 ? Math.round((totalIncome + totalExpense) / transactions.length) : 0,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([cat, data]) => ({ category: cat, ...data, total: data.income + data.expense }))
        .sort((a, b) => b.total - a.total),
      paymentMethods: Object.entries(paymentMethods)
        .map(([method, total]) => ({ method, total: Math.round(total) }))
        .sort((a, b) => b.total - a.total),
    };
  }

  static calculateGrowthRates(periodicData) {
    const periods = Object.keys(periodicData).sort();
    const growth = [];
    for (let i = 1; i < periods.length; i++) {
      const prev = periodicData[periods[i - 1]];
      const curr = periodicData[periods[i]];
      const prevTotal = prev.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const currTotal = curr.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      growth.push({
        period: periods[i],
        previousPeriod: periods[i - 1],
        currentTotal: Math.round(currTotal),
        previousTotal: Math.round(prevTotal),
        growthRate: prevTotal > 0 ? Math.round(((currTotal - prevTotal) / prevTotal) * 100 * 10) / 10 : 0,
        absoluteChange: Math.round(currTotal - prevTotal),
      });
    }
    return growth;
  }
}

// ============================================================================
// §3  EXECUTIVE SUMMARY REPORT
// ============================================================================

class ExecutiveSummaryReport {
  generate(data) {
    const { transactions = [], budgets = [], goals = [], investments = [], debts = [], accounts = [], dateRange } = data;

    const txnSummary = DataAggregator.summarizeTransactions(transactions);
    const monthlyData = DataAggregator.groupByPeriod(transactions, 'monthly');
    const growth = DataAggregator.calculateGrowthRates(monthlyData);

    // Net worth calculation
    const totalAssets = accounts.reduce((s, a) => s + (a.balance || 0), 0) +
      investments.reduce((s, i) => s + (i.currentValue || 0), 0);
    const totalLiabilities = debts.reduce((s, d) => s + (d.remainingAmount || d.principal || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Budget adherence
    const budgetAdherence = budgets.length > 0
      ? budgets.map(b => ({
        category: b.category,
        budget: b.amount,
        spent: b.spent || 0,
        remaining: (b.amount || 0) - (b.spent || 0),
        adherence: b.amount > 0 ? Math.round(((b.amount - (b.spent || 0)) / b.amount) * 100) : 0,
        status: (b.spent || 0) > b.amount ? 'over_budget' : (b.spent || 0) > b.amount * 0.9 ? 'near_limit' : 'on_track',
      }))
      : [];

    // Goal progress
    const goalProgress = goals.map(g => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount || 0,
      progress: g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0,
      deadline: g.deadline,
      monthlyNeeded: g.deadline
        ? Math.round((g.targetAmount - (g.currentAmount || 0)) / Math.max(1, this._monthsUntil(g.deadline)))
        : null,
    }));

    // Key performance indicators
    const kpis = this._calculateKPIs(txnSummary, netWorth, budgetAdherence, goalProgress, growth);

    // Insights
    const insights = this._generateInsights(txnSummary, budgetAdherence, growth, netWorth);

    return {
      reportType: REPORT_TEMPLATES.EXECUTIVE_SUMMARY,
      generatedAt: new Date().toISOString(),
      dateRange,
      kpis,
      financialSummary: txnSummary,
      netWorth: { totalAssets: Math.round(totalAssets), totalLiabilities: Math.round(totalLiabilities), netWorth: Math.round(netWorth) },
      budgetPerformance: { budgets: budgetAdherence, overallAdherence: budgetAdherence.length > 0 ? Math.round(budgetAdherence.reduce((s, b) => s + b.adherence, 0) / budgetAdherence.length) : 100 },
      goalProgress,
      monthlyTrends: Object.entries(monthlyData).map(([period, txns]) => ({
        period,
        ...DataAggregator.summarizeTransactions(txns),
      })).sort((a, b) => a.period.localeCompare(b.period)),
      growthAnalysis: growth,
      insights,
      topCategories: txnSummary.categoryBreakdown.slice(0, 5),
    };
  }

  _calculateKPIs(summary, netWorth, budgets, goals, growth) {
    const latestGrowth = growth.length > 0 ? growth[growth.length - 1] : null;

    return [
      { name: 'Net Income', value: `₹${summary.netIncome.toLocaleString()}`, trend: summary.netIncome >= 0 ? 'positive' : 'negative', icon: 'trending_up' },
      { name: 'Savings Rate', value: `${summary.savingsRate}%`, trend: summary.savingsRate >= 20 ? 'positive' : summary.savingsRate >= 10 ? 'neutral' : 'negative', benchmark: '20%+', icon: 'savings' },
      { name: 'Net Worth', value: `₹${Math.round(netWorth).toLocaleString()}`, trend: netWorth >= 0 ? 'positive' : 'negative', icon: 'account_balance' },
      { name: 'Budget Adherence', value: `${budgets.length > 0 ? Math.round(budgets.reduce((s, b) => s + b.adherence, 0) / budgets.length) : 100}%`, trend: budgets.filter(b => b.status === 'over_budget').length === 0 ? 'positive' : 'negative', icon: 'pie_chart' },
      { name: 'Goal Progress', value: `${goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0}%`, trend: goals.filter(g => g.progress >= 50).length > goals.length / 2 ? 'positive' : 'neutral', icon: 'flag' },
      { name: 'MoM Growth', value: latestGrowth ? `${latestGrowth.growthRate}%` : 'N/A', trend: latestGrowth && latestGrowth.growthRate >= 0 ? 'positive' : 'negative', icon: 'show_chart' },
    ];
  }

  _generateInsights(summary, budgets, growth, netWorth) {
    const insights = [];

    if (summary.savingsRate < 10) {
      insights.push({ type: 'warning', title: 'Low Savings Rate', message: `Your savings rate is ${summary.savingsRate}%. Aim for at least 20% to build a healthy financial cushion.`, priority: 'high' });
    } else if (summary.savingsRate >= 30) {
      insights.push({ type: 'success', title: 'Excellent Savings Rate', message: `${summary.savingsRate}% savings rate is above average. Great financial discipline!`, priority: 'low' });
    }

    const overBudget = budgets.filter(b => b.status === 'over_budget');
    if (overBudget.length > 0) {
      insights.push({ type: 'warning', title: `${overBudget.length} Budget(s) Exceeded`, message: `Categories over budget: ${overBudget.map(b => b.category).join(', ')}`, priority: 'high' });
    }

    if (summary.categoryBreakdown.length > 0) {
      const topCategory = summary.categoryBreakdown[0];
      const percentage = summary.totalExpense > 0 ? Math.round((topCategory.expense / summary.totalExpense) * 100) : 0;
      if (percentage > 40) {
        insights.push({ type: 'info', title: 'Concentration Risk', message: `${topCategory.category} accounts for ${percentage}% of your expenses. Consider diversifying.`, priority: 'medium' });
      }
    }

    if (growth.length >= 2) {
      const recent = growth.slice(-3);
      const avgGrowth = recent.reduce((s, g) => s + g.growthRate, 0) / recent.length;
      if (avgGrowth > 15) {
        insights.push({ type: 'warning', title: 'Spending Growth Acceleration', message: `Average spending growth of ${Math.round(avgGrowth)}% over recent periods. Review discretionary expenses.`, priority: 'medium' });
      }
    }

    return insights;
  }

  _monthsUntil(date) {
    const target = new Date(date);
    const now = new Date();
    return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  }
}

// ============================================================================
// §4  INCOME & EXPENSE REPORT
// ============================================================================

class IncomeExpenseReport {
  generate(data) {
    const { transactions = [], dateRange, period = 'monthly' } = data;
    const grouped = DataAggregator.groupByPeriod(transactions, period);
    const overall = DataAggregator.summarizeTransactions(transactions);

    const periodicSummary = Object.entries(grouped)
      .map(([p, txns]) => ({ period: p, ...DataAggregator.summarizeTransactions(txns) }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Income sources analysis
    const incomeTxns = transactions.filter(t => t.type === 'income' || t.type === 'credit');
    const expenseTxns = transactions.filter(t => t.type === 'expense' || t.type === 'debit');

    const incomeSources = {};
    incomeTxns.forEach(t => {
      const src = t.category || t.source || 'Other Income';
      if (!incomeSources[src]) incomeSources[src] = { total: 0, count: 0, transactions: [] };
      incomeSources[src].total += Math.abs(t.amount);
      incomeSources[src].count++;
      incomeSources[src].transactions.push(t);
    });

    // Expense analysis by type
    const essentialCategories = new Set(['Rent', 'Groceries', 'Utilities', 'Insurance', 'Healthcare', 'EMI', 'Loan', 'Education', 'Transport', 'Fuel']);
    let essentialExpense = 0, discretionaryExpense = 0;
    expenseTxns.forEach(t => {
      if (essentialCategories.has(t.category)) essentialExpense += Math.abs(t.amount);
      else discretionaryExpense += Math.abs(t.amount);
    });

    // Daily average
    const daysCovered = dateRange
      ? Math.max(1, Math.round((new Date(dateRange.end) - new Date(dateRange.start)) / 86400000))
      : 30;

    return {
      reportType: REPORT_TEMPLATES.INCOME_EXPENSE,
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: overall,
      periodicBreakdown: periodicSummary,
      incomeSources: Object.entries(incomeSources)
        .map(([source, data]) => ({ source, total: Math.round(data.total), count: data.count, percentage: overall.totalIncome > 0 ? Math.round((data.total / overall.totalIncome) * 100 * 10) / 10 : 0 }))
        .sort((a, b) => b.total - a.total),
      expenseAnalysis: {
        essential: Math.round(essentialExpense),
        discretionary: Math.round(discretionaryExpense),
        essentialPercentage: overall.totalExpense > 0 ? Math.round((essentialExpense / overall.totalExpense) * 100 * 10) / 10 : 0,
        discretionaryPercentage: overall.totalExpense > 0 ? Math.round((discretionaryExpense / overall.totalExpense) * 100 * 10) / 10 : 0,
      },
      dailyAverage: {
        income: Math.round(overall.totalIncome / daysCovered),
        expense: Math.round(overall.totalExpense / daysCovered),
        net: Math.round(overall.netIncome / daysCovered),
      },
      categoryWise: overall.categoryBreakdown,
      topExpenses: expenseTxns.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10).map(t => ({
        date: t.date || t.createdAt,
        description: t.description || t.merchant || 'Transaction',
        category: t.category || 'Uncategorized',
        amount: Math.abs(t.amount),
      })),
      recurringDetected: this._detectRecurring(transactions),
    };
  }

  _detectRecurring(transactions) {
    const merchantCounts = {};
    transactions.forEach(t => {
      const key = `${(t.merchant || t.description || '').toLowerCase()}_${Math.abs(t.amount)}`;
      if (!merchantCounts[key]) merchantCounts[key] = { merchant: t.merchant || t.description, amount: Math.abs(t.amount), count: 0, dates: [] };
      merchantCounts[key].count++;
      merchantCounts[key].dates.push(t.date || t.createdAt);
    });

    return Object.values(merchantCounts)
      .filter(m => m.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(m => ({ merchant: m.merchant, amount: m.amount, frequency: m.count, estimatedAnnual: Math.round(m.amount * m.count * (12 / Math.max(1, m.dates.length))) }));
  }
}

// ============================================================================
// §5  INVESTMENT PORTFOLIO REPORT
// ============================================================================

class InvestmentPortfolioReport {
  generate(data) {
    const { investments = [], dateRange } = data;

    // Portfolio composition
    const assetClasses = {};
    let totalInvested = 0, totalCurrentValue = 0;

    investments.forEach(inv => {
      const cls = inv.assetClass || inv.type || 'Other';
      if (!assetClasses[cls]) assetClasses[cls] = { invested: 0, currentValue: 0, count: 0, items: [] };
      const invested = inv.investedAmount || inv.purchasePrice || 0;
      const current = inv.currentValue || inv.marketValue || invested;
      assetClasses[cls].invested += invested;
      assetClasses[cls].currentValue += current;
      assetClasses[cls].count++;
      assetClasses[cls].items.push(inv);
      totalInvested += invested;
      totalCurrentValue += current;
    });

    const totalReturn = totalCurrentValue - totalInvested;
    const totalReturnPct = totalInvested > 0 ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 100 * 10) / 10 : 0;

    // Asset allocation
    const assetAllocation = Object.entries(assetClasses).map(([cls, data]) => ({
      assetClass: cls,
      invested: Math.round(data.invested),
      currentValue: Math.round(data.currentValue),
      allocation: totalCurrentValue > 0 ? Math.round((data.currentValue / totalCurrentValue) * 100 * 10) / 10 : 0,
      return: Math.round(data.currentValue - data.invested),
      returnPercentage: data.invested > 0 ? Math.round(((data.currentValue - data.invested) / data.invested) * 100 * 10) / 10 : 0,
      holdings: data.count,
    })).sort((a, b) => b.currentValue - a.currentValue);

    // Risk analysis
    const riskProfile = this._analyzeRisk(assetAllocation);

    // Top performers
    const performers = investments
      .map(inv => {
        const invested = inv.investedAmount || inv.purchasePrice || 0;
        const current = inv.currentValue || inv.marketValue || invested;
        return {
          name: inv.name || inv.symbol || 'Unknown',
          type: inv.assetClass || inv.type || 'Other',
          invested: Math.round(invested),
          currentValue: Math.round(current),
          return: Math.round(current - invested),
          returnPercentage: invested > 0 ? Math.round(((current - invested) / invested) * 100 * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.returnPercentage - a.returnPercentage);

    // Diversification score
    const diversificationScore = this._calculateDiversification(assetAllocation);

    return {
      reportType: REPORT_TEMPLATES.INVESTMENT_PORTFOLIO,
      generatedAt: new Date().toISOString(),
      dateRange,
      portfolioSummary: {
        totalInvested: Math.round(totalInvested),
        currentValue: Math.round(totalCurrentValue),
        totalReturn: Math.round(totalReturn),
        totalReturnPercentage: totalReturnPct,
        holdingsCount: investments.length,
        assetClassCount: Object.keys(assetClasses).length,
      },
      assetAllocation,
      riskProfile,
      diversificationScore,
      topPerformers: performers.slice(0, 5),
      underPerformers: performers.slice(-5).reverse(),
      rebalancing: this._suggestRebalancing(assetAllocation, riskProfile),
    };
  }

  _analyzeRisk(allocation) {
    const riskWeights = {
      'Equity': 0.8, 'Stock': 0.8, 'Mutual Fund': 0.6,
      'Fixed Deposit': 0.1, 'FD': 0.1, 'Bonds': 0.2, 'Debt': 0.2,
      'Gold': 0.3, 'Real Estate': 0.5, 'Crypto': 0.95,
      'PPF': 0.05, 'NPS': 0.3, 'ELSS': 0.7, 'Other': 0.5,
    };

    let weightedRisk = 0, totalAllocation = 0;
    allocation.forEach(a => {
      const risk = riskWeights[a.assetClass] || 0.5;
      weightedRisk += risk * a.allocation;
      totalAllocation += a.allocation;
    });

    const riskScore = totalAllocation > 0 ? Math.round((weightedRisk / totalAllocation) * 100) : 50;
    let riskLevel;
    if (riskScore < 25) riskLevel = 'Conservative';
    else if (riskScore < 45) riskLevel = 'Moderate-Conservative';
    else if (riskScore < 55) riskLevel = 'Moderate';
    else if (riskScore < 75) riskLevel = 'Moderate-Aggressive';
    else riskLevel = 'Aggressive';

    return { riskScore, riskLevel, description: `Your portfolio risk score is ${riskScore}/100 (${riskLevel}). ${riskScore > 70 ? 'Consider adding debt instruments for balance.' : riskScore < 30 ? 'Consider equity exposure for better long-term returns.' : 'Good balance between growth and safety.'}` };
  }

  _calculateDiversification(allocation) {
    if (allocation.length <= 1) return { score: 0, level: 'Not Diversified', suggestion: 'Invest across multiple asset classes' };
    const hhi = allocation.reduce((s, a) => s + Math.pow(a.allocation / 100, 2), 0);
    const normalizedHHI = (1 - hhi) * 100;
    const score = Math.round(normalizedHHI);

    let level, suggestion;
    if (score >= 70) { level = 'Well Diversified'; suggestion = 'Great diversification. Monitor and rebalance periodically.'; }
    else if (score >= 50) { level = 'Moderately Diversified'; suggestion = 'Consider adding more asset classes or rebalancing.'; }
    else { level = 'Concentrated'; suggestion = 'High concentration risk. Spread investments across more asset classes.'; }

    return { score, level, suggestion };
  }

  _suggestRebalancing(allocation, riskProfile) {
    const suggestions = [];
    const idealAllocation = riskProfile.riskScore > 60
      ? { 'Equity': 50, 'Debt': 30, 'Gold': 10, 'Other': 10 }
      : riskProfile.riskScore > 35
        ? { 'Equity': 40, 'Debt': 40, 'Gold': 10, 'Other': 10 }
        : { 'Equity': 25, 'Debt': 50, 'Gold': 15, 'Other': 10 };

    for (const [cls, idealPct] of Object.entries(idealAllocation)) {
      const actual = allocation.find(a => a.assetClass === cls);
      const actualPct = actual ? actual.allocation : 0;
      const diff = actualPct - idealPct;
      if (Math.abs(diff) > 5) {
        suggestions.push({
          assetClass: cls,
          currentAllocation: actualPct,
          idealAllocation: idealPct,
          action: diff > 0 ? 'Reduce' : 'Increase',
          adjustmentNeeded: `${Math.abs(Math.round(diff))}%`,
        });
      }
    }

    return { needed: suggestions.length > 0, suggestions };
  }
}

// ============================================================================
// §6  DEBT ANALYSIS REPORT
// ============================================================================

class DebtAnalysisReport {
  generate(data) {
    const { debts = [], transactions = [], dateRange } = data;

    let totalDebt = 0, totalOriginal = 0, totalInterest = 0, totalEMI = 0;
    const debtDetails = debts.map(d => {
      const remaining = d.remainingAmount || d.principal || 0;
      const original = d.originalAmount || d.principal || 0;
      const interest = d.interestRate || 0;
      const emi = d.emiAmount || 0;
      const paid = original - remaining;

      totalDebt += remaining;
      totalOriginal += original;
      totalInterest += (remaining * interest) / 100;
      totalEMI += emi;

      const monthsRemaining = emi > 0 ? Math.ceil(remaining / emi) : 0;

      return {
        name: d.name || d.lender || 'Loan',
        type: d.type || 'Personal Loan',
        originalAmount: Math.round(original),
        remainingAmount: Math.round(remaining),
        interestRate: interest,
        emiAmount: Math.round(emi),
        paidPercentage: original > 0 ? Math.round((paid / original) * 100) : 0,
        monthsRemaining,
        estimatedEndDate: new Date(Date.now() + monthsRemaining * 30 * 86400000).toISOString().split('T')[0],
        totalInterestPayable: Math.round(emi * monthsRemaining - remaining),
        status: d.status || (remaining <= 0 ? 'paid' : 'active'),
      };
    }).filter(d => d.status === 'active' || d.remainingAmount > 0);

    // Debt-to-income ratio (estimate: assume monthly income is 3x monthly debt)
    const monthlyDebtPayments = totalEMI;

    // Payoff strategies
    const avalanche = [...debtDetails].sort((a, b) => b.interestRate - a.interestRate);
    const snowball = [...debtDetails].sort((a, b) => a.remainingAmount - b.remainingAmount);

    // Interest cost projection
    const interestProjection = [];
    let projRemaining = totalDebt;
    for (let month = 1; month <= 60 && projRemaining > 0; month++) {
      const monthlyInterest = (projRemaining * (totalInterest / totalDebt || 0.1)) / 12;
      const principalPaid = Math.max(0, totalEMI - monthlyInterest);
      projRemaining = Math.max(0, projRemaining - principalPaid);
      if (month % 6 === 0 || month === 1) {
        interestProjection.push({
          month,
          remainingDebt: Math.round(projRemaining),
          totalInterestPaid: Math.round(monthlyInterest * month),
        });
      }
    }

    return {
      reportType: REPORT_TEMPLATES.DEBT_ANALYSIS,
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {
        totalDebt: Math.round(totalDebt),
        totalOriginal: Math.round(totalOriginal),
        totalPaid: Math.round(totalOriginal - totalDebt),
        totalMonthlyEMI: Math.round(totalEMI),
        weightedAvgRate: debtDetails.length > 0
          ? Math.round(debtDetails.reduce((s, d) => s + d.interestRate * d.remainingAmount, 0) / Math.max(1, totalDebt) * 10) / 10
          : 0,
        activeLoans: debtDetails.filter(d => d.status === 'active').length,
      },
      debts: debtDetails,
      payoffStrategies: {
        avalanche: { name: 'Avalanche (Highest Rate First)', order: avalanche.map(d => d.name), description: 'Pay minimum on all, extra on highest-rate debt. Saves most interest.' },
        snowball: { name: 'Snowball (Smallest Balance First)', order: snowball.map(d => d.name), description: 'Pay minimum on all, extra on smallest balance. Psychological wins.' },
        recommended: avalanche[0]?.interestRate - avalanche[avalanche.length - 1]?.interestRate > 3 ? 'avalanche' : 'snowball',
      },
      interestProjection,
      debtFreeDate: debtDetails.length > 0
        ? new Date(Date.now() + Math.max(...debtDetails.map(d => d.monthsRemaining)) * 30 * 86400000).toISOString().split('T')[0]
        : 'No active debt',
    };
  }
}

// ============================================================================
// §7  CASH FLOW REPORT
// ============================================================================

class CashFlowReport {
  generate(data) {
    const { transactions = [], accounts = [], dateRange, period = 'monthly' } = data;
    const grouped = DataAggregator.groupByPeriod(transactions, period);

    const cashFlowPeriods = Object.entries(grouped)
      .map(([p, txns]) => {
        const inflow = txns.filter(t => t.type === 'income' || t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
        const outflow = txns.filter(t => t.type === 'expense' || t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
        return {
          period: p,
          inflow: Math.round(inflow),
          outflow: Math.round(outflow),
          netCashFlow: Math.round(inflow - outflow),
          transactionCount: txns.length,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    // Running balance
    let runningBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    cashFlowPeriods.forEach(p => {
      p.openingBalance = Math.round(runningBalance);
      runningBalance += p.netCashFlow;
      p.closingBalance = Math.round(runningBalance);
    });

    // Cash flow health
    const positivePeriods = cashFlowPeriods.filter(p => p.netCashFlow > 0).length;
    const totalPeriods = cashFlowPeriods.length;
    const avgNetFlow = totalPeriods > 0 ? Math.round(cashFlowPeriods.reduce((s, p) => s + p.netCashFlow, 0) / totalPeriods) : 0;

    // Volatility
    const flows = cashFlowPeriods.map(p => p.netCashFlow);
    const mean = flows.length > 0 ? flows.reduce((s, f) => s + f, 0) / flows.length : 0;
    const variance = flows.length > 0 ? flows.reduce((s, f) => s + Math.pow(f - mean, 2), 0) / flows.length : 0;
    const volatility = Math.round(Math.sqrt(variance));

    return {
      reportType: REPORT_TEMPLATES.CASH_FLOW,
      generatedAt: new Date().toISOString(),
      dateRange,
      cashFlowPeriods,
      summary: {
        totalInflow: Math.round(cashFlowPeriods.reduce((s, p) => s + p.inflow, 0)),
        totalOutflow: Math.round(cashFlowPeriods.reduce((s, p) => s + p.outflow, 0)),
        netCashFlow: Math.round(cashFlowPeriods.reduce((s, p) => s + p.netCashFlow, 0)),
        avgMonthlyNetFlow: avgNetFlow,
        positivePeriods,
        negativePeriods: totalPeriods - positivePeriods,
        cashFlowRatio: positivePeriods > 0 ? Math.round((positivePeriods / totalPeriods) * 100) : 0,
      },
      health: {
        score: Math.min(100, Math.round((positivePeriods / Math.max(1, totalPeriods)) * 80 + (avgNetFlow > 0 ? 20 : 0))),
        volatility,
        stability: volatility < avgNetFlow * 0.5 ? 'Stable' : volatility < avgNetFlow ? 'Moderate' : 'Volatile',
      },
      projections: this._projectCashFlow(cashFlowPeriods, 6),
    };
  }

  _projectCashFlow(historical, months) {
    if (historical.length < 2) return [];
    const recentFlows = historical.slice(-6).map(p => p.netCashFlow);
    const trend = recentFlows.length >= 2
      ? (recentFlows[recentFlows.length - 1] - recentFlows[0]) / recentFlows.length
      : 0;
    const avgFlow = recentFlows.reduce((s, f) => s + f, 0) / recentFlows.length;
    const lastBalance = historical[historical.length - 1]?.closingBalance || 0;

    const projections = [];
    let balance = lastBalance;
    for (let i = 1; i <= months; i++) {
      const projected = Math.round(avgFlow + trend * i);
      balance += projected;
      projections.push({
        month: i,
        projectedNetFlow: projected,
        projectedBalance: Math.round(balance),
        confidence: Math.max(50, Math.round(90 - i * 5)),
      });
    }
    return projections;
  }
}

// ============================================================================
// §8  CREDIT REPORT
// ============================================================================

class CreditReportGenerator {
  generate(data) {
    const { creditScore = {}, debts = [], transactions = [], accounts = [] } = data;

    const score = creditScore.score || creditScore.cibilScore || 0;
    const factors = this._analyzeFactors(score, debts, transactions, accounts);
    const history = this._buildCreditHistory(transactions, debts);
    const recommendations = this._getRecommendations(factors);

    return {
      reportType: REPORT_TEMPLATES.CREDIT_REPORT,
      generatedAt: new Date().toISOString(),
      creditScore: {
        score,
        rating: score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : score >= 550 ? 'Poor' : 'Very Poor',
        percentile: Math.min(99, Math.max(1, Math.round((score - 300) / 6))),
        maxScore: 900,
        change: creditScore.previousScore ? score - creditScore.previousScore : null,
      },
      factors,
      creditUtilization: this._calculateUtilization(debts, accounts),
      paymentHistory: history,
      recommendations,
      simulatedImpact: this._simulateActions(score, factors),
    };
  }

  _analyzeFactors(score, debts, transactions, accounts) {
    return [
      {
        factor: 'Payment History',
        weight: 35,
        status: score >= 700 ? 'good' : score >= 600 ? 'fair' : 'poor',
        description: 'Track record of on-time payments',
        impact: 'Highest impact on credit score',
      },
      {
        factor: 'Credit Utilization',
        weight: 30,
        status: debts.length <= 3 ? 'good' : debts.length <= 5 ? 'fair' : 'poor',
        description: 'Percentage of available credit being used',
        impact: 'Keep below 30% for best score',
      },
      {
        factor: 'Credit History Length',
        weight: 15,
        status: 'neutral',
        description: 'Average age of credit accounts',
        impact: 'Longer history generally helps',
      },
      {
        factor: 'Credit Mix',
        weight: 10,
        status: debts.length >= 2 ? 'good' : 'fair',
        description: 'Variety of credit types (cards, loans, mortgage)',
        impact: 'Mix of revolving and installment credit helps',
      },
      {
        factor: 'New Credit Inquiries',
        weight: 10,
        status: 'neutral',
        description: 'Recent hard inquiries on credit report',
        impact: 'Too many inquiries can temporarily lower score',
      },
    ];
  }

  _calculateUtilization(debts, accounts) {
    const creditCards = debts.filter(d => d.type === 'Credit Card' || d.type === 'credit_card');
    const totalLimit = creditCards.reduce((s, c) => s + (c.creditLimit || c.originalAmount || 0), 0);
    const totalUsed = creditCards.reduce((s, c) => s + (c.remainingAmount || c.currentBalance || 0), 0);
    const utilization = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

    return {
      totalCreditLimit: Math.round(totalLimit),
      totalCreditUsed: Math.round(totalUsed),
      utilizationPercentage: utilization,
      status: utilization <= 30 ? 'Optimal' : utilization <= 50 ? 'Moderate' : utilization <= 75 ? 'High' : 'Critical',
      recommendation: utilization > 30 ? `Reduce credit usage by ₹${Math.round(totalUsed - totalLimit * 0.3).toLocaleString()} to reach optimal 30%` : 'Your credit utilization is in the optimal range',
    };
  }

  _buildCreditHistory(transactions, debts) {
    const loanPayments = transactions.filter(t =>
      (t.category || '').toLowerCase().includes('emi') ||
      (t.category || '').toLowerCase().includes('loan') ||
      (t.description || '').toLowerCase().includes('emi')
    );

    return {
      totalPayments: loanPayments.length,
      onTimePayments: loanPayments.length, // Assume all tracked payments are on-time
      latePayments: 0,
      oldestAccount: debts.length > 0 ? debts.reduce((min, d) => {
        const date = d.startDate || d.createdAt;
        return date && date < min ? date : min;
      }, new Date().toISOString()) : null,
      activeAccounts: debts.filter(d => d.status === 'active' || d.remainingAmount > 0).length,
    };
  }

  _getRecommendations(factors) {
    const recs = [];
    factors.forEach(f => {
      if (f.status !== 'good') {
        switch (f.factor) {
          case 'Payment History':
            recs.push({ priority: 'high', action: 'Set up auto-pay for all EMIs and credit card bills', impact: 'Up to +50 points over 6 months' }); break;
          case 'Credit Utilization':
            recs.push({ priority: 'high', action: 'Pay down credit card balances to below 30% of limit', impact: 'Up to +30 points immediately' }); break;
          case 'Credit Mix':
            recs.push({ priority: 'medium', action: 'Consider a secured credit card or small personal loan', impact: 'Up to +15 points over 12 months' }); break;
          default:
            recs.push({ priority: 'low', action: `Improve ${f.factor.toLowerCase()}`, impact: 'Gradual improvement' });
        }
      }
    });
    return recs;
  }

  _simulateActions(currentScore, factors) {
    return [
      { action: 'Pay all bills on time for 6 months', estimatedImpact: '+30 to +50 points', newScoreRange: `${currentScore + 30} - ${currentScore + 50}` },
      { action: 'Reduce credit utilization to 20%', estimatedImpact: '+20 to +30 points', newScoreRange: `${currentScore + 20} - ${currentScore + 30}` },
      { action: 'Keep old accounts open', estimatedImpact: '+5 to +10 points', newScoreRange: `${currentScore + 5} - ${currentScore + 10}` },
      { action: 'Limit new credit inquiries', estimatedImpact: '+5 to +15 points', newScoreRange: `${currentScore + 5} - ${currentScore + 15}` },
    ];
  }
}

// ============================================================================
// §9  CUSTOM REPORT BUILDER
// ============================================================================

class CustomReportBuilder {
  build(config) {
    const {
      title = 'Custom Financial Report',
      sections = [],
      dateRange,
      data = {},
      format = 'detailed',
    } = config;

    const report = {
      title,
      reportType: REPORT_TEMPLATES.CUSTOM,
      generatedAt: new Date().toISOString(),
      dateRange,
      format,
      sections: [],
    };

    for (const section of sections) {
      switch (section) {
        case 'executive_summary':
          report.sections.push({ name: 'Executive Summary', data: new ExecutiveSummaryReport().generate(data) }); break;
        case 'income_expense':
          report.sections.push({ name: 'Income & Expense', data: new IncomeExpenseReport().generate(data) }); break;
        case 'investments':
          report.sections.push({ name: 'Investments', data: new InvestmentPortfolioReport().generate(data) }); break;
        case 'debt':
          report.sections.push({ name: 'Debt Analysis', data: new DebtAnalysisReport().generate(data) }); break;
        case 'cash_flow':
          report.sections.push({ name: 'Cash Flow', data: new CashFlowReport().generate(data) }); break;
        case 'credit':
          report.sections.push({ name: 'Credit Report', data: new CreditReportGenerator().generate(data) }); break;
        default:
          report.sections.push({ name: section, data: { message: 'Custom section — data provided as-is', raw: data[section] || {} } });
      }
    }

    return report;
  }
}

// ============================================================================
// §10  ENTERPRISE REPORT GENERATOR — Main Orchestrator
// ============================================================================

class EnterpriseReportGenerator {
  constructor() {
    this.executiveSummary = new ExecutiveSummaryReport();
    this.incomeExpense = new IncomeExpenseReport();
    this.investmentPortfolio = new InvestmentPortfolioReport();
    this.debtAnalysis = new DebtAnalysisReport();
    this.cashFlow = new CashFlowReport();
    this.creditReport = new CreditReportGenerator();
    this.customBuilder = new CustomReportBuilder();
    this.reportHistory = [];
  }

  generateReport(type, data) {
    let report;
    switch (type) {
      case REPORT_TEMPLATES.EXECUTIVE_SUMMARY:
        report = this.executiveSummary.generate(data); break;
      case REPORT_TEMPLATES.INCOME_EXPENSE:
        report = this.incomeExpense.generate(data); break;
      case REPORT_TEMPLATES.INVESTMENT_PORTFOLIO:
        report = this.investmentPortfolio.generate(data); break;
      case REPORT_TEMPLATES.DEBT_ANALYSIS:
        report = this.debtAnalysis.generate(data); break;
      case REPORT_TEMPLATES.CASH_FLOW:
        report = this.cashFlow.generate(data); break;
      case REPORT_TEMPLATES.CREDIT_REPORT:
        report = this.creditReport.generate(data); break;
      case REPORT_TEMPLATES.CUSTOM:
        report = this.customBuilder.build(data); break;
      default:
        report = this.executiveSummary.generate(data);
    }

    // Track report generation
    this.reportHistory.push({
      type,
      generatedAt: new Date().toISOString(),
      sections: report.sections?.length || 1,
    });

    return report;
  }

  generateFullReport(data) {
    return {
      title: 'Comprehensive Financial Report',
      generatedAt: new Date().toISOString(),
      executiveSummary: this.executiveSummary.generate(data),
      incomeExpense: this.incomeExpense.generate(data),
      investmentPortfolio: this.investmentPortfolio.generate(data),
      debtAnalysis: this.debtAnalysis.generate(data),
      cashFlow: this.cashFlow.generate(data),
      creditReport: this.creditReport.generate(data),
    };
  }

  getAvailableTemplates() {
    return Object.entries(REPORT_TEMPLATES).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: this._getTemplateDescription(value),
    }));
  }

  _getTemplateDescription(template) {
    const descriptions = {
      [REPORT_TEMPLATES.EXECUTIVE_SUMMARY]: 'High-level overview with KPIs, trends, and insights',
      [REPORT_TEMPLATES.INCOME_EXPENSE]: 'Detailed income and expense analysis with category breakdown',
      [REPORT_TEMPLATES.NET_WORTH]: 'Assets, liabilities, and net worth tracking',
      [REPORT_TEMPLATES.INVESTMENT_PORTFOLIO]: 'Investment performance, allocation, and risk analysis',
      [REPORT_TEMPLATES.TAX_REPORT]: 'Tax calculation, deductions, and saving opportunities',
      [REPORT_TEMPLATES.BUDGET_VARIANCE]: 'Budget vs actual spending comparison',
      [REPORT_TEMPLATES.CASH_FLOW]: 'Cash flow analysis with projections',
      [REPORT_TEMPLATES.DEBT_ANALYSIS]: 'Debt overview with payoff strategies',
      [REPORT_TEMPLATES.GOAL_PROGRESS]: 'Financial goal tracking and milestones',
      [REPORT_TEMPLATES.CREDIT_REPORT]: 'Credit score analysis and improvement recommendations',
      [REPORT_TEMPLATES.CUSTOM]: 'Build your own report with selected sections',
    };
    return descriptions[template] || 'Financial report';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const reportGenerator = new EnterpriseReportGenerator();

module.exports = {
  reportGenerator,
  EnterpriseReportGenerator,
  ExecutiveSummaryReport,
  IncomeExpenseReport,
  InvestmentPortfolioReport,
  DebtAnalysisReport,
  CashFlowReport,
  CreditReportGenerator,
  CustomReportBuilder,
  DataAggregator,
  REPORT_TEMPLATES,
  PERIOD_TYPES,
};
