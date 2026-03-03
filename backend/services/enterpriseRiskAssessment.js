// ============================================================================
// ENTERPRISE RISK ASSESSMENT SERVICE — Comprehensive Financial Risk Analysis
// ============================================================================
// Multi-dimensional risk scoring engine with Monte Carlo simulation,
// stress testing, and personalized risk mitigation strategies.
// ============================================================================

const logger = require('../utils/logger');

const model = (name) => {
  try { return require(`../models/${name}`); } catch { return null; }
};

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY);
const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const stdDev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============================================================================
// §1  RISK SCORING DIMENSIONS
// ============================================================================

const RISK_DIMENSIONS = {
  INCOME_STABILITY: {
    weight: 0.20,
    name: 'Income Stability',
    description: 'Consistency and reliability of income sources',
    icon: 'trending-up',
  },
  EXPENSE_CONTROL: {
    weight: 0.15,
    name: 'Expense Control',
    description: 'Ability to manage and control spending',
    icon: 'shield',
  },
  DEBT_HEALTH: {
    weight: 0.20,
    name: 'Debt Health',
    description: 'Debt levels, interest rates, and payment history',
    icon: 'credit-card',
  },
  SAVINGS_ADEQUACY: {
    weight: 0.15,
    name: 'Savings Adequacy',
    description: 'Emergency fund and savings buffer',
    icon: 'piggy-bank',
  },
  INVESTMENT_RISK: {
    weight: 0.10,
    name: 'Investment Risk',
    description: 'Portfolio diversification and allocation',
    icon: 'bar-chart',
  },
  INSURANCE_COVERAGE: {
    weight: 0.10,
    name: 'Insurance Coverage',
    description: 'Adequacy of insurance protection',
    icon: 'umbrella',
  },
  FINANCIAL_PLANNING: {
    weight: 0.10,
    name: 'Financial Planning',
    description: 'Goal setting, budgeting, and forward planning',
    icon: 'target',
  },
};

// ============================================================================
// §2  INCOME RISK ANALYZER
// ============================================================================

class IncomeRiskAnalyzer {
  analyze(transactions) {
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);
    if (incomes.length < 3) return { score: 50, details: 'Insufficient income data', factors: [] };

    const monthlyIncome = {};
    incomes.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthlyIncome[key] = (monthlyIncome[key] || 0) + Math.abs(t.amount);
    });
    const values = Object.values(monthlyIncome);

    // Coefficient of variation (lower = more stable)
    const cv = values.length > 1 ? stdDev(values) / mean(values) : 0;

    // Income source diversification  
    const sources = {};
    incomes.forEach(t => {
      const src = t.category || t.source || 'Salary';
      sources[src] = (sources[src] || 0) + Math.abs(t.amount);
    });
    const totalIncome = sum(Object.values(sources));
    const sourceShares = Object.values(sources).map(v => v / totalIncome);
    const concentration = sum(sourceShares.map(s => s ** 2)); // Herfindahl index

    // Trend analysis
    const trend = this._analyzeTrend(values);

    // Growth rate
    const growthRate = values.length >= 2 ? (values[values.length - 1] - values[0]) / values[0] : 0;

    // Score calculation
    let score = 50;
    if (cv < 0.1) score += 25; else if (cv < 0.2) score += 15; else if (cv < 0.3) score += 5; else score -= 15;
    if (concentration < 0.5) score += 15; else if (concentration < 0.7) score += 5; else score -= 10;
    if (trend === 'growing') score += 10; else if (trend === 'declining') score -= 15;
    if (growthRate > 0.1) score += 5;

    const factors = [];
    if (cv > 0.3) factors.push({ type: 'risk', message: `Income variability is high (${Math.round(cv * 100)}%)`, severity: 'high' });
    if (concentration > 0.8) factors.push({ type: 'risk', message: 'Income is concentrated in a single source', severity: 'medium' });
    if (trend === 'declining') factors.push({ type: 'risk', message: 'Income trend is declining', severity: 'high' });
    if (cv < 0.15) factors.push({ type: 'strength', message: 'Very stable and predictable income', severity: 'positive' });
    if (Object.keys(sources).length > 2) factors.push({ type: 'strength', message: `${Object.keys(sources).length} diversified income sources`, severity: 'positive' });

    return {
      score: clamp(score, 0, 100),
      variability: Math.round(cv * 100),
      diversification: Math.round((1 - concentration) * 100),
      trend,
      growthRate: Math.round(growthRate * 100),
      monthlyAverage: Math.round(mean(values)),
      sources: Object.entries(sources).map(([name, amount]) => ({
        name, amount: Math.round(amount), percentage: Math.round((amount / totalIncome) * 100),
      })),
      factors,
    };
  }

  _analyzeTrend(values) {
    if (values.length < 3) return 'stable';
    const recent = mean(values.slice(-3));
    const older = mean(values.slice(0, Math.min(3, values.length)));
    const change = older ? (recent - older) / older : 0;
    if (change > 0.1) return 'growing';
    if (change < -0.1) return 'declining';
    return 'stable';
  }
}

// ============================================================================
// §3  EXPENSE RISK ANALYZER
// ============================================================================

class ExpenseRiskAnalyzer {
  analyze(transactions, budgets = []) {
    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
    if (expenses.length < 5) return { score: 50, details: 'Insufficient expense data', factors: [] };

    const monthlyExpense = {};
    expenses.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthlyExpense[key] = (monthlyExpense[key] || 0) + Math.abs(t.amount);
    });
    const values = Object.values(monthlyExpense);
    const expenseCV = values.length > 1 ? stdDev(values) / mean(values) : 0;

    // Essential vs. non-essential ratio
    const essentialCategories = ['Rent', 'Bills', 'Groceries', 'Healthcare', 'Insurance', 'EMI', 'Education'];
    const nonEssentialCategories = ['Shopping', 'Entertainment', 'Travel', 'Food', 'Subscriptions'];
    
    let essentialSpend = 0, nonEssentialSpend = 0;
    expenses.forEach(t => {
      const amount = Math.abs(t.amount);
      if (essentialCategories.includes(t.category)) essentialSpend += amount;
      else if (nonEssentialCategories.includes(t.category)) nonEssentialSpend += amount;
    });
    const essentialRatio = essentialSpend / (essentialSpend + nonEssentialSpend || 1);

    // Budget adherence
    let budgetScore = 50;
    if (budgets.length > 0) {
      const categorySpend = {};
      expenses.forEach(t => {
        const cat = t.category || 'Other';
        categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(t.amount);
      });
      let adherent = 0;
      budgets.forEach(b => {
        const spent = categorySpend[b.category] || 0;
        if (spent <= (b.limit || b.amount || Infinity)) adherent++;
      });
      budgetScore = Math.round((adherent / budgets.length) * 100);
    }

    // Spending growth rate
    const growthRate = values.length >= 3 ? 
      (mean(values.slice(-2)) - mean(values.slice(0, 2))) / mean(values.slice(0, 2)) : 0;

    // Score
    let score = 50;
    if (expenseCV < 0.15) score += 15; else if (expenseCV > 0.3) score -= 10;
    if (essentialRatio > 0.5 && essentialRatio < 0.8) score += 10;
    if (budgetScore > 70) score += 15; else if (budgetScore < 40) score -= 10;
    if (growthRate < 0) score += 10; else if (growthRate > 0.15) score -= 15;

    const factors = [];
    if (expenseCV > 0.3) factors.push({ type: 'risk', message: 'Highly variable spending pattern', severity: 'medium' });
    if (nonEssentialSpend > essentialSpend) factors.push({ type: 'risk', message: 'Non-essential spending exceeds essentials', severity: 'medium' });
    if (budgetScore > 80) factors.push({ type: 'strength', message: 'Excellent budget discipline', severity: 'positive' });
    if (growthRate > 0.15) factors.push({ type: 'risk', message: `Spending growing at ${Math.round(growthRate * 100)}%`, severity: 'high' });

    return {
      score: clamp(score, 0, 100),
      variability: Math.round(expenseCV * 100),
      essentialRatio: Math.round(essentialRatio * 100),
      budgetAdherence: budgetScore,
      growthRate: Math.round(growthRate * 100),
      monthlyAverage: Math.round(mean(values)),
      factors,
    };
  }
}

// ============================================================================
// §4  DEBT RISK ANALYZER
// ============================================================================

class DebtRiskAnalyzer {
  analyze(debts, emis, transactions) {
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);
    const monthlyIncome = this._getMonthlyAvg(incomes);

    if (debts.length === 0 && emis.length === 0) {
      return {
        score: 95,
        details: 'No outstanding debts',
        dti: 0,
        factors: [{ type: 'strength', message: 'Debt-free status', severity: 'positive' }],
      };
    }

    const totalDebt = sum(debts.map(d => d.currentBalance || d.balance || d.amount || 0));
    const totalEMI = sum(emis.map(e => e.monthlyPayment || e.emi || e.amount || 0));
    const monthlyDebtPayment = totalEMI + sum(debts.map(d => d.monthlyPayment || 0));

    // Debt-to-income ratio
    const dti = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : 0;

    // Interest rate analysis
    const rates = [...debts.map(d => d.interestRate || 0), ...emis.map(e => e.interestRate || 0)].filter(r => r > 0);
    const avgRate = mean(rates);
    const highRateDebts = debts.filter(d => (d.interestRate || 0) > 15).length + 
                          emis.filter(e => (e.interestRate || 0) > 15).length;

    // Payment history
    const overdue = debts.filter(d => d.status === 'overdue' || d.daysOverdue > 0).length +
                    emis.filter(e => e.status === 'overdue' || e.daysOverdue > 0).length;

    // Debt diversity
    const debtTypes = new Set([...debts.map(d => d.type || d.category), ...emis.map(e => e.type || e.category)]);

    // Score calculation
    let score = 70;
    if (dti < 0.2) score += 20; else if (dti < 0.3) score += 10; else if (dti > 0.4) score -= 25; else if (dti > 0.5) score -= 40;
    if (avgRate > 15) score -= 10; else if (avgRate < 8) score += 10;
    if (overdue > 0) score -= overdue * 15;
    if (highRateDebts > 0) score -= highRateDebts * 5;

    const factors = [];
    if (dti > 0.4) factors.push({ type: 'risk', message: `Debt-to-income ratio is ${Math.round(dti * 100)}% (should be < 40%)`, severity: 'critical' });
    else if (dti > 0.3) factors.push({ type: 'risk', message: `DTI of ${Math.round(dti * 100)}% is approaching dangerous levels`, severity: 'high' });
    if (overdue > 0) factors.push({ type: 'risk', message: `${overdue} payment(s) are overdue`, severity: 'critical' });
    if (highRateDebts > 0) factors.push({ type: 'risk', message: `${highRateDebts} high-interest loan(s) above 15%`, severity: 'medium' });
    if (dti < 0.2 && debts.length > 0) factors.push({ type: 'strength', message: 'Manageable debt-to-income ratio', severity: 'positive' });
    if (overdue === 0 && debts.length > 0) factors.push({ type: 'strength', message: 'All payments are current', severity: 'positive' });

    // Repayment timeline
    const timeline = this._calculateRepaymentTimeline(debts, emis);

    return {
      score: clamp(score, 0, 100),
      dti: Math.round(dti * 100),
      totalDebt: Math.round(totalDebt),
      monthlyPayment: Math.round(monthlyDebtPayment),
      averageRate: Math.round(avgRate * 10) / 10,
      overdueCount: overdue,
      highRateCount: highRateDebts,
      debtTypes: debtTypes.size,
      timeline,
      factors,
      recommendations: this._generateDebtRecommendations(dti, overdue, highRateDebts, debts, emis),
    };
  }

  _getMonthlyAvg(transactions) {
    const monthly = {};
    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
    });
    const values = Object.values(monthly);
    return values.length ? mean(values) : 0;
  }

  _calculateRepaymentTimeline(debts, emis) {
    const items = [];

    debts.forEach(d => {
      const balance = d.currentBalance || d.balance || d.amount || 0;
      const payment = d.monthlyPayment || d.emi || 0;
      const rate = (d.interestRate || 0) / 100 / 12;
      
      let months = 0;
      if (payment > 0 && rate > 0) {
        months = Math.ceil(-Math.log(1 - (rate * balance) / payment) / Math.log(1 + rate));
      } else if (payment > 0) {
        months = Math.ceil(balance / payment);
      }

      items.push({
        name: d.name || d.type || 'Loan',
        balance: Math.round(balance),
        monthlyPayment: Math.round(payment),
        interestRate: d.interestRate || 0,
        monthsRemaining: months || 0,
        estimatedEndDate: months ? new Date(Date.now() + months * 30 * DAY).toISOString().split('T')[0] : null,
        totalInterest: payment > 0 ? Math.round(payment * months - balance) : 0,
      });
    });

    emis.forEach(e => {
      const remaining = e.remainingPayments || e.remainingMonths || 0;
      items.push({
        name: e.name || e.loanType || 'EMI',
        balance: Math.round(e.outstandingAmount || e.remainingAmount || 0),
        monthlyPayment: Math.round(e.monthlyPayment || e.emi || e.amount || 0),
        interestRate: e.interestRate || 0,
        monthsRemaining: remaining,
        estimatedEndDate: remaining ? new Date(Date.now() + remaining * 30 * DAY).toISOString().split('T')[0] : null,
      });
    });

    return items.sort((a, b) => a.interestRate - b.interestRate).reverse();
  }

  _generateDebtRecommendations(dti, overdue, highRate, debts, emis) {
    const recs = [];

    if (overdue > 0) {
      recs.push({
        priority: 'critical',
        action: 'Clear Overdue Payments Immediately',
        detail: 'Overdue payments damage credit score and incur penalties. Prioritize clearing these first.',
      });
    }

    if (highRate > 0) {
      const highRateItems = [...debts, ...emis]
        .filter(d => (d.interestRate || 0) > 15)
        .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

      recs.push({
        priority: 'high',
        action: 'Refinance High-Interest Debt',
        detail: `Consider refinancing ${highRateItems[0]?.name || 'high-rate loans'} at ${highRateItems[0]?.interestRate}% interest. Could save significantly on interest.`,
      });
    }

    if (dti > 0.3) {
      recs.push({
        priority: 'high',
        action: 'Reduce Debt-to-Income Ratio',
        detail: `Your DTI of ${Math.round(dti * 100)}% limits financial flexibility. Use avalanche method to pay off high-interest debt first.`,
      });
    }

    // Snowball vs Avalanche recommendation
    if (debts.length + emis.length > 2) {
      const allDebts = [...debts, ...emis].filter(d => (d.currentBalance || d.balance || d.amount || 0) > 0);
      const smallestFirst = [...allDebts].sort((a, b) => 
        (a.currentBalance || a.balance || a.amount || 0) - (b.currentBalance || b.balance || b.amount || 0)
      );
      const highestRateFirst = [...allDebts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

      recs.push({
        priority: 'medium',
        action: 'Debt Payoff Strategy',
        detail: `Avalanche method: Pay off ${highestRateFirst[0]?.name || 'highest rate loan'} first to save on interest. Snowball method: Pay off ${smallestFirst[0]?.name || 'smallest loan'} first for quick wins.`,
        strategies: {
          avalanche: highestRateFirst.map(d => d.name || 'Loan').slice(0, 3),
          snowball: smallestFirst.map(d => d.name || 'Loan').slice(0, 3),
        },
      });
    }

    return recs;
  }
}

// ============================================================================
// §5  SAVINGS RISK ANALYZER
// ============================================================================

class SavingsRiskAnalyzer {
  analyze(transactions) {
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);
    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);

    const monthlyIncome = {};
    const monthlyExpense = {};

    incomes.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthlyIncome[key] = (monthlyIncome[key] || 0) + Math.abs(t.amount);
    });

    expenses.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthlyExpense[key] = (monthlyExpense[key] || 0) + Math.abs(t.amount);
    });

    const months = Object.keys(monthlyIncome);
    const savingsRates = months.map(m => {
      const income = monthlyIncome[m] || 0;
      const expense = monthlyExpense[m] || 0;
      return income > 0 ? (income - expense) / income : 0;
    });

    const avgSavingRate = mean(savingsRates);
    const avgMonthlyExpense = mean(Object.values(monthlyExpense));
    const totalSavings = sum(months.map(m => (monthlyIncome[m] || 0) - (monthlyExpense[m] || 0)));

    // Emergency fund adequacy (6 months of expenses)
    const emergencyFundMonths = avgMonthlyExpense > 0 ? Math.max(0, totalSavings) / avgMonthlyExpense : 0;

    // Savings consistency
    const savingsCV = savingsRates.length > 1 ? stdDev(savingsRates) / Math.abs(mean(savingsRates) || 1) : 0;

    // Score
    let score = 30;
    if (avgSavingRate > 0.3) score += 30; else if (avgSavingRate > 0.2) score += 20; else if (avgSavingRate > 0.1) score += 10; else if (avgSavingRate < 0) score -= 20;
    if (emergencyFundMonths >= 6) score += 25; else if (emergencyFundMonths >= 3) score += 15; else if (emergencyFundMonths < 1) score -= 15;
    if (savingsCV < 0.3) score += 10; else if (savingsCV > 0.8) score -= 10;

    const factors = [];
    if (avgSavingRate < 0.1) factors.push({ type: 'risk', message: `Savings rate is only ${Math.round(avgSavingRate * 100)}% — aim for 20%+`, severity: 'high' });
    if (emergencyFundMonths < 3) factors.push({ type: 'risk', message: `Only ${emergencyFundMonths.toFixed(1)} months of emergency fund — need 6 months`, severity: 'critical' });
    if (avgSavingRate > 0.25) factors.push({ type: 'strength', message: `Strong savings rate of ${Math.round(avgSavingRate * 100)}%`, severity: 'positive' });
    if (emergencyFundMonths >= 6) factors.push({ type: 'strength', message: 'Fully funded emergency reserve', severity: 'positive' });

    return {
      score: clamp(score, 0, 100),
      savingRate: Math.round(avgSavingRate * 100),
      emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
      consistency: Math.round((1 - Math.min(savingsCV, 1)) * 100),
      monthlyAvgSavings: Math.round(avgSavingRate * mean(Object.values(monthlyIncome))),
      factors,
    };
  }
}

// ============================================================================
// §6  INVESTMENT RISK ANALYZER
// ============================================================================

class InvestmentRiskAnalyzer {
  analyze(investments) {
    if (!investments.length) return { score: 40, details: 'No investments tracked', factors: [{ type: 'risk', message: 'No investment portfolio tracked', severity: 'medium' }] };

    const totalValue = sum(investments.map(i => i.currentValue || i.value || i.amount || 0));
    const totalInvested = sum(investments.map(i => i.investedAmount || i.amount || 0));
    const overallReturn = totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0;

    // Asset allocation analysis
    const allocation = {};
    investments.forEach(i => {
      const type = i.type || i.category || 'Other';
      allocation[type] = (allocation[type] || 0) + (i.currentValue || i.value || i.amount || 0);
    });

    // Diversification score (Herfindahl)
    const shares = Object.values(allocation).map(v => v / totalValue);
    const herfindahl = sum(shares.map(s => s ** 2));
    const diversificationScore = Math.round((1 - herfindahl) * 100);

    // Risk categorization
    const riskCategories = {
      high: ['stocks', 'equity', 'crypto', 'cryptocurrency', 'options', 'futures'],
      medium: ['mutual_fund', 'mutual fund', 'etf', 'balanced', 'hybrid', 'real estate', 'gold'],
      low: ['fixed_deposit', 'fixed deposit', 'fd', 'ppf', 'nps', 'bonds', 'rd', 'savings'],
    };

    let highRiskPct = 0, mediumRiskPct = 0, lowRiskPct = 0;
    investments.forEach(i => {
      const type = (i.type || i.category || '').toLowerCase();
      const val = i.currentValue || i.value || i.amount || 0;
      const pct = val / totalValue;
      if (riskCategories.high.some(r => type.includes(r))) highRiskPct += pct;
      else if (riskCategories.low.some(r => type.includes(r))) lowRiskPct += pct;
      else mediumRiskPct += pct;
    });

    // Score
    let score = 50;
    if (diversificationScore > 60) score += 15; else if (diversificationScore < 30) score -= 10;
    if (overallReturn > 0.1) score += 10; else if (overallReturn < -0.05) score -= 15;
    if (highRiskPct > 0.6) score -= 10; // Over-exposed to risk
    if (lowRiskPct > 0.8) score -= 5; // Under-diversified (too conservative)
    if (highRiskPct > 0.2 && highRiskPct < 0.5 && lowRiskPct > 0.2) score += 15; // Good balance

    const factors = [];
    if (diversificationScore < 30) factors.push({ type: 'risk', message: 'Portfolio is poorly diversified', severity: 'high' });
    if (highRiskPct > 0.6) factors.push({ type: 'risk', message: `${Math.round(highRiskPct * 100)}% in high-risk assets`, severity: 'medium' });
    if (overallReturn > 0.15) factors.push({ type: 'strength', message: `Portfolio return of ${Math.round(overallReturn * 100)}%`, severity: 'positive' });
    if (diversificationScore > 60) factors.push({ type: 'strength', message: 'Well-diversified portfolio', severity: 'positive' });

    return {
      score: clamp(score, 0, 100),
      totalValue: Math.round(totalValue),
      totalInvested: Math.round(totalInvested),
      overallReturn: Math.round(overallReturn * 100),
      diversificationScore,
      allocation: Object.entries(allocation).map(([type, value]) => ({
        type, value: Math.round(value), percentage: Math.round((value / totalValue) * 100),
      })),
      riskBreakdown: {
        highRisk: Math.round(highRiskPct * 100),
        mediumRisk: Math.round(mediumRiskPct * 100),
        lowRisk: Math.round(lowRiskPct * 100),
      },
      factors,
    };
  }
}

// ============================================================================
// §7  INSURANCE RISK ANALYZER
// ============================================================================

class InsuranceRiskAnalyzer {
  analyze(transactions, profile = {}) {
    const monthlyIncome = this._getMonthlyIncome(transactions);
    const age = profile.age || 30;
    const dependents = profile.dependents || 0;
    const hasHealthInsurance = profile.hasHealthInsurance || false;
    const hasLifeInsurance = profile.hasLifeInsurance || false;
    const hasVehicleInsurance = profile.hasVehicleInsurance !== false;

    let score = 50;
    const factors = [];

    // Life insurance check
    if (!hasLifeInsurance && dependents > 0) {
      score -= 25;
      factors.push({
        type: 'risk',
        message: `No life insurance with ${dependents} dependent(s) — critical coverage gap`,
        severity: 'critical',
        recommendation: `Get term insurance of ₹${Math.round(monthlyIncome * 12 * 10).toLocaleString()} (10x annual income)`,
      });
    } else if (hasLifeInsurance) {
      score += 15;
      factors.push({ type: 'strength', message: 'Life insurance is in place', severity: 'positive' });
    }

    // Health insurance check
    if (!hasHealthInsurance) {
      score -= 20;
      factors.push({
        type: 'risk',
        message: 'No health insurance — medical emergencies can wipe out savings',
        severity: 'critical',
        recommendation: 'Get family floater health insurance of at least ₹10,00,000 sum insured',
      });
    } else {
      score += 15;
      factors.push({ type: 'strength', message: 'Health insurance coverage exists', severity: 'positive' });
    }

    // Age-based risk
    if (age > 40 && !hasLifeInsurance) {
      score -= 10;
      factors.push({ type: 'risk', message: 'Age above 40 without adequate life coverage increases family risk', severity: 'high' });
    }

    return {
      score: clamp(score, 0, 100),
      coverageGaps: factors.filter(f => f.type === 'risk').map(f => f.message),
      recommendedCoverage: {
        life: Math.round(monthlyIncome * 12 * 10),
        health: 1000000,
        criticalIllness: 2500000,
      },
      factors,
    };
  }

  _getMonthlyIncome(transactions) {
    const incomes = transactions.filter(t => t.type === 'income' || t.amount > 0);
    const monthly = {};
    incomes.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
    });
    return mean(Object.values(monthly)) || 50000;
  }
}

// ============================================================================
// §8  PLANNING RISK ANALYZER
// ============================================================================

class PlanningRiskAnalyzer {
  analyze(goals, budgets) {
    let score = 50;
    const factors = [];

    // Goals assessment
    if (goals.length === 0) {
      score -= 15;
      factors.push({ type: 'risk', message: 'No financial goals set — planning is essential for wealth building', severity: 'medium' });
    } else {
      score += 10;
      const activeGoals = goals.filter(g => g.status !== 'completed');
      factors.push({ type: 'strength', message: `${activeGoals.length} active financial goals being tracked`, severity: 'positive' });

      // Goal progress
      const onTrack = goals.filter(g => {
        if (!g.deadline) return true;
        const remaining = new Date(g.deadline) - new Date();
        const monthsLeft = remaining / (30 * DAY);
        const needed = g.targetAmount - (g.currentAmount || 0);
        return monthsLeft > 0 && (needed / monthsLeft) < (g.monthlyContribution || needed);
      });
      if (onTrack.length / goals.length > 0.7) score += 10;
    }

    // Budget assessment
    if (budgets.length === 0) {
      score -= 10;
      factors.push({ type: 'risk', message: 'No budgets set — creates blind spots in spending', severity: 'medium' });
    } else {
      score += 10;
      factors.push({ type: 'strength', message: `${budgets.length} budget categories being tracked`, severity: 'positive' });
    }

    // Retirement planning
    const retirementGoal = goals.find(g => (g.category || '').toLowerCase().includes('retirement'));
    if (!retirementGoal) {
      score -= 10;
      factors.push({ type: 'risk', message: 'No retirement goal set — start early for compound growth', severity: 'medium' });
    }

    // Emergency fund goal
    const emergencyGoal = goals.find(g => (g.name || '').toLowerCase().includes('emergency'));
    if (!emergencyGoal) {
      factors.push({ type: 'risk', message: 'No emergency fund goal — consider creating one', severity: 'low' });
    }

    return {
      score: clamp(score, 0, 100),
      goalsCount: goals.length,
      budgetsCount: budgets.length,
      hasRetirementPlan: !!retirementGoal,
      hasEmergencyGoal: !!emergencyGoal,
      factors,
    };
  }
}

// ============================================================================
// §9  MONTE CARLO SIMULATOR
// ============================================================================

class MonteCarloSimulator {
  simulate(params) {
    const {
      currentSavings = 0,
      monthlyIncome = 50000,
      monthlyExpense = 35000,
      annualReturn = 0.08,
      returnVolatility = 0.15,
      inflationRate = 0.06,
      yearsToProject = 20,
      simulations = 1000,
    } = params;

    const results = [];
    const monthlySavings = monthlyIncome - monthlyExpense;
    const monthlyReturn = annualReturn / 12;
    const monthlyVol = returnVolatility / Math.sqrt(12);
    const monthlyInflation = inflationRate / 12;

    for (let sim = 0; sim < simulations; sim++) {
      let wealth = currentSavings;
      let adjustedSavings = monthlySavings;
      const trajectory = [wealth];

      for (let month = 0; month < yearsToProject * 12; month++) {
        // Random return with normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const monthReturn = monthlyReturn + z * monthlyVol;

        // Apply return and add savings
        wealth = wealth * (1 + monthReturn) + adjustedSavings;
        adjustedSavings *= (1 + monthlyInflation); // Increase savings with inflation

        if (month % 12 === 11) trajectory.push(Math.round(wealth));
      }

      results.push({ finalWealth: Math.round(wealth), trajectory });
    }

    // Analyze results
    const finalValues = results.map(r => r.finalWealth).sort((a, b) => a - b);

    return {
      median: finalValues[Math.floor(finalValues.length * 0.5)],
      percentile10: finalValues[Math.floor(finalValues.length * 0.1)],
      percentile25: finalValues[Math.floor(finalValues.length * 0.25)],
      percentile75: finalValues[Math.floor(finalValues.length * 0.75)],
      percentile90: finalValues[Math.floor(finalValues.length * 0.9)],
      best: finalValues[finalValues.length - 1],
      worst: finalValues[0],
      mean: Math.round(mean(finalValues)),
      successRate: Math.round((finalValues.filter(v => v > 0).length / simulations) * 100),
      projectionYears: yearsToProject,
      simulations,
      sampleTrajectories: results.slice(0, 5).map(r => r.trajectory),
      distribution: this._buildDistribution(finalValues),
    };
  }

  _buildDistribution(values) {
    const bins = 20;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const distribution = Array(bins).fill(0);
    
    values.forEach(v => {
      const bin = Math.min(Math.floor((v - min) / binSize), bins - 1);
      distribution[bin]++;
    });

    return distribution.map((count, i) => ({
      rangeStart: Math.round(min + i * binSize),
      rangeEnd: Math.round(min + (i + 1) * binSize),
      count,
      percentage: Math.round((count / values.length) * 100),
    }));
  }
}

// ============================================================================
// §10  STRESS TEST ENGINE
// ============================================================================

class StressTestEngine {
  runStressTests(financialData) {
    const {
      monthlyIncome = 50000,
      monthlyExpense = 35000,
      totalDebt = 0,
      monthlyDebtPayment = 0,
      savings = 0,
      investments = 0,
    } = financialData;

    const scenarios = [];

    // Scenario 1: Job Loss
    scenarios.push(this._simulateJobLoss(monthlyExpense, monthlyDebtPayment, savings));

    // Scenario 2: Medical Emergency
    scenarios.push(this._simulateMedicalEmergency(monthlyIncome, savings, investments));

    // Scenario 3: Interest Rate Hike
    scenarios.push(this._simulateRateHike(totalDebt, monthlyDebtPayment, monthlyIncome));

    // Scenario 4: Income Reduction (30%)
    scenarios.push(this._simulateIncomeReduction(monthlyIncome, monthlyExpense, monthlyDebtPayment));

    // Scenario 5: Market Crash
    scenarios.push(this._simulateMarketCrash(investments, savings, monthlyIncome));

    // Scenario 6: Inflation Spike
    scenarios.push(this._simulateInflationSpike(monthlyExpense, monthlyIncome));

    // Overall resilience score
    const avgImpact = mean(scenarios.map(s => s.impact));
    const resilience = clamp(100 - avgImpact, 0, 100);

    return {
      scenarios,
      overallResilience: Math.round(resilience),
      riskLevel: resilience > 70 ? 'low' : resilience > 40 ? 'moderate' : 'high',
      topVulnerability: scenarios.sort((a, b) => b.impact - a.impact)[0]?.name || 'None',
      recommendations: this._getResilienceRecommendations(scenarios, financialData),
    };
  }

  _simulateJobLoss(monthlyExpense, monthlyDebt, savings) {
    const monthlyBurn = monthlyExpense + monthlyDebt;
    const survivalMonths = savings > 0 ? savings / monthlyBurn : 0;

    return {
      name: 'Job Loss (6 months)',
      description: 'Complete loss of primary income for 6 months',
      survivalMonths: Math.round(survivalMonths * 10) / 10,
      totalImpact: Math.round(monthlyBurn * 6),
      canSurvive: survivalMonths >= 6,
      impact: survivalMonths >= 6 ? 20 : survivalMonths >= 3 ? 50 : 80,
      severity: survivalMonths >= 6 ? 'manageable' : survivalMonths >= 3 ? 'challenging' : 'critical',
      actions: survivalMonths < 6 ? [
        `Build emergency fund of ₹${Math.round(monthlyBurn * 6).toLocaleString()}`,
        'Consider income protection insurance',
        'Diversify income sources',
      ] : ['Emergency fund is adequate for this scenario'],
    };
  }

  _simulateMedicalEmergency(monthlyIncome, savings, investments) {
    const emergencyCost = 500000; // ₹5 lakhs medical emergency
    const totalLiquid = savings + investments * 0.5; // Only 50% of investments are liquid
    const canCover = totalLiquid >= emergencyCost;
    const deficit = Math.max(0, emergencyCost - totalLiquid);

    return {
      name: 'Medical Emergency (₹5L)',
      description: 'Unexpected medical expense of ₹5,00,000',
      emergencyCost,
      liquidAssets: Math.round(totalLiquid),
      deficit: Math.round(deficit),
      canCover,
      impact: canCover ? 25 : deficit > monthlyIncome * 6 ? 85 : 55,
      severity: canCover ? 'manageable' : 'critical',
      actions: canCover ? ['Health insurance with adequate coverage is recommended'] :
        [`Need additional ₹${deficit.toLocaleString()} in liquid reserves`, 'Get comprehensive health insurance with ₹10L+ coverage'],
    };
  }

  _simulateRateHike(totalDebt, monthlyDebt, monthlyIncome) {
    const rateHike = 0.02; // 2% interest rate increase
    const newMonthlyPayment = monthlyDebt * 1.12; // Approximate 12% increase in EMI
    const additionalBurden = newMonthlyPayment - monthlyDebt;
    const newDTI = monthlyIncome > 0 ? newMonthlyPayment / monthlyIncome : 0;

    return {
      name: 'Interest Rate Hike (+2%)',
      description: 'RBI rate hike of 200 basis points affecting floating rate loans',
      currentPayment: Math.round(monthlyDebt),
      newPayment: Math.round(newMonthlyPayment),
      additionalBurden: Math.round(additionalBurden),
      newDTI: Math.round(newDTI * 100),
      impact: newDTI > 0.5 ? 70 : newDTI > 0.4 ? 50 : 20,
      severity: newDTI > 0.5 ? 'critical' : newDTI > 0.4 ? 'challenging' : 'manageable',
      actions: totalDebt > 0 ? [
        'Consider converting floating rate to fixed rate',
        'Build a rate hike buffer in savings',
        additionalBurden > 0 ? `Prepare for additional ₹${Math.round(additionalBurden).toLocaleString()}/month burden` : '',
      ].filter(Boolean) : ['No debt exposure to interest rate changes'],
    };
  }

  _simulateIncomeReduction(income, expense, debtPayment) {
    const reducedIncome = income * 0.7;
    const totalObligations = expense + debtPayment;
    const gap = totalObligations - reducedIncome;

    return {
      name: 'Income Reduction (30%)',
      description: 'Salary cut or reduced business income by 30%',
      currentIncome: Math.round(income),
      reducedIncome: Math.round(reducedIncome),
      totalObligations: Math.round(totalObligations),
      monthlyGap: Math.round(Math.max(0, gap)),
      impact: gap > 0 ? (gap / income > 0.2 ? 75 : 50) : 15,
      severity: gap > 0 ? 'challenging' : 'manageable',
      actions: gap > 0 ? [
        `Need to cut expenses by ₹${Math.round(gap).toLocaleString()}/month`,
        'Identify non-essential expenses to eliminate',
        'Look for supplementary income sources',
      ] : ['Current expense level can absorb a 30% income reduction'],
    };
  }

  _simulateMarketCrash(investments, savings, monthlyIncome) {
    const crashLoss = investments * 0.35; // 35% market correction
    const remainingInvestments = investments * 0.65;
    const totalRemaining = remainingInvestments + savings;
    const monthsOfIncome = totalRemaining / (monthlyIncome || 1);

    return {
      name: 'Market Crash (-35%)',
      description: 'Stock market correction of 35% affecting equity investments',
      investmentValue: Math.round(investments),
      estimatedLoss: Math.round(crashLoss),
      remainingValue: Math.round(remainingInvestments),
      impact: crashLoss > monthlyIncome * 12 ? 65 : crashLoss > monthlyIncome * 6 ? 40 : 20,
      severity: crashLoss > monthlyIncome * 12 ? 'challenging' : 'manageable',
      actions: investments > 0 ? [
        'Maintain diversified portfolio across asset classes',
        'Keep 20-30% in debt instruments for stability',
        'Avoid panic selling — markets historically recover',
        `Loss of ₹${Math.round(crashLoss).toLocaleString()} would be temporary with long-term horizon`,
      ] : ['No significant equity exposure — minimal market risk'],
    };
  }

  _simulateInflationSpike(monthlyExpense, monthlyIncome) {
    const inflationIncrease = 0.08; // 8% inflation
    const newExpense = monthlyExpense * (1 + inflationIncrease);
    const additionalBurden = newExpense - monthlyExpense;
    const newSavings = monthlyIncome - newExpense;

    return {
      name: 'Inflation Spike (8%)',
      description: 'Annual inflation rate jumps to 8%',
      currentExpense: Math.round(monthlyExpense),
      inflatedExpense: Math.round(newExpense),
      additionalBurden: Math.round(additionalBurden),
      newMonthlySavings: Math.round(newSavings),
      impact: newSavings < 0 ? 70 : newSavings < monthlyIncome * 0.1 ? 45 : 20,
      severity: newSavings < 0 ? 'critical' : 'manageable',
      actions: [
        'Invest in inflation-beating instruments (equity, gold)',
        `Budget for additional ₹${Math.round(additionalBurden).toLocaleString()}/month in expenses`,
        'Consider inflation-indexed bonds (IIBs)',
      ],
    };
  }

  _getResilienceRecommendations(scenarios, data) {
    const critical = scenarios.filter(s => s.severity === 'critical');
    const recs = [];

    if (critical.length > 0) {
      recs.push({
        priority: 'critical',
        title: `Vulnerable to ${critical.length} Critical Scenario(s)`,
        description: `You would face critical impact from: ${critical.map(s => s.name).join(', ')}`,
        actions: critical.flatMap(s => s.actions).slice(0, 5),
      });
    }

    if (data.savings < data.monthlyExpense * 6) {
      recs.push({
        priority: 'high',
        title: 'Build Emergency Fund',
        description: `Target: ₹${Math.round(data.monthlyExpense * 6).toLocaleString()} (6 months of expenses)`,
        current: Math.round(data.savings),
        needed: Math.round(data.monthlyExpense * 6 - data.savings),
      });
    }

    return recs;
  }
}

// ============================================================================
// §11  ENTERPRISE RISK ASSESSMENT SERVICE — Main Orchestrator
// ============================================================================

class EnterpriseRiskAssessmentService {
  constructor() {
    this.incomeAnalyzer = new IncomeRiskAnalyzer();
    this.expenseAnalyzer = new ExpenseRiskAnalyzer();
    this.debtAnalyzer = new DebtRiskAnalyzer();
    this.savingsAnalyzer = new SavingsRiskAnalyzer();
    this.investmentAnalyzer = new InvestmentRiskAnalyzer();
    this.insuranceAnalyzer = new InsuranceRiskAnalyzer();
    this.planningAnalyzer = new PlanningRiskAnalyzer();
    this.monteCarlo = new MonteCarloSimulator();
    this.stressTest = new StressTestEngine();
  }

  async assessRisk(userId, options = {}) {
    try {
      const Transaction = model('Transaction');
      const Budget = model('Budget');
      const Debt = model('Debt');
      const EMI = model('EMI');
      const Investment = model('Investment');
      const FinancialGoal = model('FinancialGoal');

      const transactions = Transaction ? await Transaction.find({ userId, date: { $gte: ago(365) } }).sort({ date: 1 }).lean() : [];
      const budgets = Budget ? await Budget.find({ userId }).lean() : [];
      const debts = Debt ? await Debt.find({ userId }).lean() : [];
      const emis = EMI ? await EMI.find({ userId }).lean() : [];
      const investments = Investment ? await Investment.find({ userId }).lean() : [];
      const goals = FinancialGoal ? await FinancialGoal.find({ userId }).lean() : [];

      // Run all dimension analyses
      const dimensions = {
        incomeStability: this.incomeAnalyzer.analyze(transactions),
        expenseControl: this.expenseAnalyzer.analyze(transactions, budgets),
        debtHealth: this.debtAnalyzer.analyze(debts, emis, transactions),
        savingsAdequacy: this.savingsAnalyzer.analyze(transactions),
        investmentRisk: this.investmentAnalyzer.analyze(investments),
        insuranceCoverage: this.insuranceAnalyzer.analyze(transactions, options),
        financialPlanning: this.planningAnalyzer.analyze(goals, budgets),
      };

      // Calculate overall score
      const dimensionScores = {
        INCOME_STABILITY: dimensions.incomeStability.score,
        EXPENSE_CONTROL: dimensions.expenseControl.score,
        DEBT_HEALTH: dimensions.debtHealth.score,
        SAVINGS_ADEQUACY: dimensions.savingsAdequacy.score,
        INVESTMENT_RISK: dimensions.investmentRisk.score,
        INSURANCE_COVERAGE: dimensions.insuranceCoverage.score,
        FINANCIAL_PLANNING: dimensions.financialPlanning.score,
      };

      const overallScore = Math.round(
        Object.entries(RISK_DIMENSIONS).reduce((total, [key, dim]) => {
          return total + (dimensionScores[key] || 50) * dim.weight;
        }, 0)
      );

      // Determine risk level
      const riskLevel = overallScore >= 80 ? 'low' : overallScore >= 60 ? 'moderate' : overallScore >= 40 ? 'elevated' : 'high';

      // Collect all factors
      const allFactors = [
        ...dimensions.incomeStability.factors || [],
        ...dimensions.expenseControl.factors || [],
        ...dimensions.debtHealth.factors || [],
        ...dimensions.savingsAdequacy.factors || [],
        ...dimensions.investmentRisk.factors || [],
        ...dimensions.insuranceCoverage.factors || [],
        ...dimensions.financialPlanning.factors || [],
      ];

      const risks = allFactors.filter(f => f.type === 'risk');
      const strengths = allFactors.filter(f => f.type === 'strength');

      // Generate action items
      const actionItems = this._prioritizeActions(risks, dimensions);

      // Run Monte Carlo simulation if requested
      let monteCarloResults = null;
      if (options.runMonteCarlo !== false) {
        const monthlyIncome = dimensions.incomeStability.monthlyAverage || 50000;
        const monthlyExpense = dimensions.expenseControl.monthlyAverage || 35000;
        monteCarloResults = this.monteCarlo.simulate({
          currentSavings: dimensions.savingsAdequacy.monthlyAvgSavings * 12 || 0,
          monthlyIncome,
          monthlyExpense,
          simulations: 500,
        });
      }

      // Run stress tests if requested
      let stressTestResults = null;
      if (options.runStressTests !== false) {
        stressTestResults = this.stressTest.runStressTests({
          monthlyIncome: dimensions.incomeStability.monthlyAverage || 50000,
          monthlyExpense: dimensions.expenseControl.monthlyAverage || 35000,
          totalDebt: dimensions.debtHealth.totalDebt || 0,
          monthlyDebtPayment: dimensions.debtHealth.monthlyPayment || 0,
          savings: (dimensions.savingsAdequacy.monthlyAvgSavings || 0) * 12,
          investments: dimensions.investmentRisk.totalValue || 0,
        });
      }

      return {
        success: true,
        overallScore,
        riskLevel,
        dimensions: Object.entries(RISK_DIMENSIONS).map(([key, dim]) => ({
          key,
          name: dim.name,
          description: dim.description,
          weight: dim.weight,
          score: dimensionScores[key] || 50,
          icon: dim.icon,
          details: dimensions[this._toCamelCase(key)] || {},
        })),
        risks: risks.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
        }),
        strengths,
        actionItems,
        monteCarlo: monteCarloResults,
        stressTests: stressTestResults,
        assessedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Risk assessment failed:', error);
      return { success: false, error: error.message };
    }
  }

  _toCamelCase(str) {
    return str.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  _prioritizeActions(risks, dimensions) {
    const actions = [];

    const criticalRisks = risks.filter(r => r.severity === 'critical');
    const highRisks = risks.filter(r => r.severity === 'high');

    criticalRisks.forEach(r => {
      actions.push({ priority: 'immediate', action: r.message, category: 'critical', impact: 'high' });
    });

    highRisks.forEach(r => {
      actions.push({ priority: 'short_term', action: r.message, category: 'high', impact: 'medium' });
    });

    // Add structural recommendations
    if (dimensions.savingsAdequacy.score < 50) {
      actions.push({
        priority: 'short_term',
        action: 'Build emergency fund to cover 6 months of expenses',
        category: 'savings',
        impact: 'high',
        targetAmount: Math.round((dimensions.expenseControl.monthlyAverage || 35000) * 6),
      });
    }

    if (dimensions.investmentRisk.score < 50) {
      actions.push({
        priority: 'medium_term',
        action: 'Diversify investment portfolio across asset classes',
        category: 'investment',
        impact: 'medium',
      });
    }

    if (dimensions.financialPlanning.score < 50) {
      actions.push({
        priority: 'medium_term',
        action: 'Set up financial goals and budgets for better planning',
        category: 'planning',
        impact: 'medium',
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { immediate: 0, short_term: 1, medium_term: 2, long_term: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const riskAssessmentService = new EnterpriseRiskAssessmentService();

module.exports = {
  riskAssessmentService,
  EnterpriseRiskAssessmentService,
  IncomeRiskAnalyzer,
  ExpenseRiskAnalyzer,
  DebtRiskAnalyzer,
  SavingsRiskAnalyzer,
  InvestmentRiskAnalyzer,
  InsuranceRiskAnalyzer,
  PlanningRiskAnalyzer,
  MonteCarloSimulator,
  StressTestEngine,
  RISK_DIMENSIONS,
};
