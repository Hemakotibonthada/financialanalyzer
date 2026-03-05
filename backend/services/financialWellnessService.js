/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  FINANCIAL WELLNESS SERVICE - Health Score & Wellness Analysis Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class FinancialWellnessService {
  constructor() {
    this.pillarWeights = {
      spending: 0.20,
      savings: 0.20,
      debt: 0.20,
      investment: 0.15,
      protection: 0.10,
      planning: 0.15
    };
  }

  /**
   * Calculate comprehensive financial wellness score
   */
  async calculateWellnessScore(userId) {
    try {
      const [transactions, debts, investments, insurance, goals, netWorth] = await Promise.allSettled([
        this._getTransactions(userId, 365),
        this._getDebts(userId),
        this._getInvestments(userId),
        this._getInsurance(userId),
        this._getGoals(userId),
        this._getNetWorth(userId)
      ]);

      const txns = transactions.status === 'fulfilled' ? transactions.value : [];
      const debtList = debts.status === 'fulfilled' ? debts.value : [];
      const investList = investments.status === 'fulfilled' ? investments.value : [];
      const insuranceList = insurance.status === 'fulfilled' ? insurance.value : [];
      const goalList = goals.status === 'fulfilled' ? goals.value : [];
      const nwData = netWorth.status === 'fulfilled' ? netWorth.value : {};

      // Calculate individual pillar scores
      const spendingScore = this._calculateSpendingScore(txns);
      const savingsScore = this._calculateSavingsScore(txns, nwData);
      const debtScore = this._calculateDebtScore(debtList, txns);
      const investmentScore = this._calculateInvestmentScore(investList);
      const protectionScore = this._calculateProtectionScore(insuranceList, nwData, txns);
      const planningScore = this._calculatePlanningScore(goalList, nwData);

      const pillarScores = {
        spending: spendingScore.score,
        savings: savingsScore.score,
        debt: debtScore.score,
        investment: investmentScore.score,
        protection: protectionScore.score,
        planning: planningScore.score
      };

      // Weighted overall score
      const overallScore = Math.round(
        Object.entries(pillarScores).reduce((sum, [key, score]) => {
          return sum + score * (this.pillarWeights[key] || 0);
        }, 0)
      );

      // Generate action items
      const actionItems = this._generateActionItems(pillarScores, {
        spending: spendingScore, savings: savingsScore, debt: debtScore,
        investment: investmentScore, protection: protectionScore, planning: planningScore
      });

      // Get previous score for comparison
      const previousScore = await this._getPreviousScore(userId);

      return {
        overallScore,
        previousScore,
        pillarScores,
        pillarDetails: {
          spending: spendingScore.details || [],
          savings: savingsScore.details || [],
          debt: debtScore.details || [],
          investment: investmentScore.details || [],
          protection: protectionScore.details || [],
          planning: planningScore.details || []
        },
        spending: spendingScore.data || null,
        savings: savingsScore.data || null,
        debt: debtScore.data || null,
        investment: investmentScore.data || null,
        protection: protectionScore.data || null,
        planning: planningScore.data || null,
        actionItems
      };
    } catch (error) {
      logger.error('Wellness score calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate spending health score
   */
  _calculateSpendingScore(transactions) {
    if (!transactions || transactions.length === 0) {
      return { score: 50, details: ['No spending data available'], data: null };
    }

    let score = 50; // Base score
    const details = [];

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Category analysis
    const categoryBreakdown = {};
    const monthlySpending = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { amount: 0, count: 0 };
      categoryBreakdown[cat].amount += t.amount || 0;
      categoryBreakdown[cat].count++;

      const monthKey = new Date(t.date).toISOString().substring(0, 7);
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + (t.amount || 0);
    });

    // Add percentage to breakdown
    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdown[cat].percentage = expenses > 0 ? (categoryBreakdown[cat].amount / expenses) * 100 : 0;
      categoryBreakdown[cat].trend = 0;
    });

    // 50/30/20 analysis
    const necessityCategories = ['rent', 'utilities', 'groceries', 'insurance', 'healthcare', 'transportation', 'emi', 'loan_payment'];
    const savingsCategories = ['savings', 'investment', 'retirement'];
    
    let needsAmount = 0, wantsAmount = 0, savingsAmount = 0;
    Object.entries(categoryBreakdown).forEach(([cat, data]) => {
      if (necessityCategories.includes(cat.toLowerCase())) needsAmount += data.amount;
      else if (savingsCategories.includes(cat.toLowerCase())) savingsAmount += data.amount;
      else wantsAmount += data.amount;
    });

    const totalSpending = needsAmount + wantsAmount + savingsAmount;
    const needsPct = totalSpending > 0 ? (needsAmount / totalSpending) * 100 : 0;
    const wantsPct = totalSpending > 0 ? (wantsAmount / totalSpending) * 100 : 0;
    const savingsPct = totalSpending > 0 ? (savingsAmount / totalSpending) * 100 : 0;

    // Score adjustments
    if (needsPct <= 55) score += 10;
    else if (needsPct > 65) score -= 10;
    
    if (wantsPct <= 35) score += 10;
    else if (wantsPct > 45) score -= 10;

    // Spending consistency
    const monthlyValues = Object.values(monthlySpending);
    if (monthlyValues.length >= 3) {
      const avg = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
      const variance = monthlyValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / monthlyValues.length;
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
      if (cv < 0.15) { score += 10; details.push('Very consistent spending patterns'); }
      else if (cv < 0.3) { score += 5; details.push('Moderately consistent spending'); }
      else { score -= 5; details.push('Spending varies significantly month to month'); }
    }

    // Expense to income ratio
    const months = Math.max(1, Math.ceil(transactions.length > 0 ? 
      (new Date(Math.max(...transactions.map(t => new Date(t.date).getTime()))) - 
       new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())))) / (30 * 24 * 60 * 60 * 1000) : 1));
    const avgMonthlyIncome = income / months;
    const avgMonthlyExpenses = expenses / months;
    const avgDailySpend = expenses / Math.max(1, months * 30);

    if (avgMonthlyIncome > 0 && avgMonthlyExpenses / avgMonthlyIncome < 0.7) {
      score += 10;
      details.push('Good expense-to-income ratio');
    } else if (avgMonthlyIncome > 0 && avgMonthlyExpenses / avgMonthlyIncome > 0.9) {
      score -= 10;
      details.push('Expenses too close to income');
    }

    // Impulse spending estimation
    const lateNightTxns = transactions.filter(t => {
      const hour = new Date(t.date).getHours();
      return t.type === 'expense' && (hour >= 22 || hour <= 4);
    }).length;
    const impulseScore = Math.min(100, (lateNightTxns / Math.max(1, transactions.filter(t => t.type === 'expense').length)) * 300);

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        categoryBreakdown,
        needsVsWants: { needs: needsPct, wants: wantsPct, savings: savingsPct },
        avgDailySpend,
        impulseSpendingScore: impulseScore,
        monthlySpending,
        avgMonthlyExpenses,
        avgMonthlyIncome
      }
    };
  }

  /**
   * Calculate savings health score
   */
  _calculateSavingsScore(transactions, netWorthData) {
    let score = 50;
    const details = [];

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t => new Date(t.date).toISOString().substring(0, 7))).size);

    const monthlyIncome = income / months;
    const monthlyExpenses = expenses / months;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    // Savings rate scoring
    if (savingsRate >= 30) { score += 25; details.push('Excellent savings rate'); }
    else if (savingsRate >= 20) { score += 15; details.push('Good savings rate'); }
    else if (savingsRate >= 10) { score += 5; details.push('Moderate savings rate'); }
    else if (savingsRate > 0) { score -= 5; details.push('Low savings rate'); }
    else { score -= 15; details.push('Negative savings - spending exceeds income'); }

    // Emergency fund
    const cashAssets = netWorthData?.cashAssets || 0;
    const emergencyFundMonths = monthlyExpenses > 0 ? cashAssets / monthlyExpenses : 0;
    
    if (emergencyFundMonths >= 12) { score += 15; details.push('Strong emergency fund'); }
    else if (emergencyFundMonths >= 6) { score += 10; details.push('Adequate emergency fund'); }
    else if (emergencyFundMonths >= 3) { score += 5; details.push('Building emergency fund'); }
    else { score -= 10; details.push('Need to build emergency fund'); }

    // Savings consistency
    const monthlySavingsData = {};
    transactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().substring(0, 7);
      if (!monthlySavingsData[monthKey]) monthlySavingsData[monthKey] = { income: 0, expenses: 0 };
      if (t.type === 'income') monthlySavingsData[monthKey].income += t.amount || 0;
      else monthlySavingsData[monthKey].expenses += t.amount || 0;
    });

    const monthlySavingsValues = Object.values(monthlySavingsData).map(m => m.income - m.expenses);
    const positiveSavingsMonths = monthlySavingsValues.filter(s => s > 0).length;
    const consistencyScore = monthlySavingsValues.length > 0 ? (positiveSavingsMonths / monthlySavingsValues.length) * 100 : 0;

    if (consistencyScore >= 90) score += 10;
    else if (consistencyScore >= 70) score += 5;

    // Build savings trend
    const savingsTrend = Object.entries(monthlySavingsData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' }),
        amount: data.income - data.expenses
      }));

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        savingsRate,
        monthlySavings,
        monthlyIncome,
        emergencyFundMonths,
        consistencyScore,
        savingsTrend,
        hasAutomatedSavings: false // Would need to check recurring transactions
      }
    };
  }

  /**
   * Calculate debt health score
   */
  _calculateDebtScore(debts, transactions) {
    if (!debts || debts.length === 0) {
      return { score: 90, details: ['No debts - great!'], data: { totalDebt: 0, dti: 0, debts: [] } };
    }

    let score = 50;
    const details = [];

    const totalDebt = debts.reduce((s, d) => s + (d.currentBalance || d.amount || 0), 0);
    const monthlyPayments = debts.reduce((s, d) => s + (d.monthlyPayment || d.emiAmount || 0), 0);
    const avgInterestRate = debts.length > 0 ? debts.reduce((s, d) => s + (d.interestRate || 0), 0) / debts.length : 0;

    // Monthly income calculation
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t => new Date(t.date).toISOString().substring(0, 7))).size);
    const monthlyIncome = income / months;

    // Debt-to-income ratio
    const dti = monthlyIncome > 0 ? (monthlyPayments / monthlyIncome) * 100 : 0;

    if (dti === 0) { score += 30; details.push('Zero debt obligations'); }
    else if (dti < 20) { score += 20; details.push('Low debt-to-income ratio'); }
    else if (dti < 36) { score += 10; details.push('Manageable debt level'); }
    else if (dti < 50) { score -= 10; details.push('Debt-to-income ratio is concerning'); }
    else { score -= 20; details.push('High debt-to-income ratio'); }

    // High interest debt check
    const highInterestDebts = debts.filter(d => (d.interestRate || 0) > 15);
    if (highInterestDebts.length > 0) {
      score -= highInterestDebts.length * 5;
      details.push(`${highInterestDebts.length} high-interest debts (>15%)`);
    }

    // Credit card debt check
    const ccDebt = debts.filter(d => d.type === 'credit_card' || d.category === 'creditCard');
    if (ccDebt.length > 0) {
      score -= 10;
      details.push('Carrying credit card balance');
    }

    // Payoff strategy
    const payoffStrategy = this._getOptimalPayoffStrategy(debts, monthlyIncome);

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        totalDebt,
        dti,
        avgInterestRate,
        monthlyPayments,
        debts: debts.map(d => ({
          name: d.name || d.description || 'Unnamed Debt',
          balance: d.currentBalance || d.amount || 0,
          interestRate: d.interestRate || 0,
          monthlyPayment: d.monthlyPayment || d.emiAmount || 0,
          type: d.type || d.category || 'other'
        })),
        payoffStrategy
      }
    };
  }

  /**
   * Get optimal debt payoff strategy
   */
  _getOptimalPayoffStrategy(debts, monthlyIncome) {
    if (!debts || debts.length === 0) return null;

    // Avalanche method (highest interest first)
    const sortedByInterest = [...debts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
    const totalDebt = debts.reduce((s, d) => s + (d.currentBalance || d.amount || 0), 0);
    const monthlyPayments = debts.reduce((s, d) => s + (d.monthlyPayment || d.emiAmount || 0), 0);

    // Estimate payoff time and interest saved
    const avgRate = debts.reduce((s, d) => s + (d.interestRate || 0), 0) / debts.length;
    const monthsToPayoff = monthlyPayments > 0 ? Math.ceil(totalDebt / monthlyPayments * (1 + avgRate / 1200)) : 0;
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + monthsToPayoff);

    // Interest saved by using avalanche vs minimum payments
    const interestSaved = totalDebt * (avgRate / 100) * 0.15; // Rough estimate

    return {
      name: 'Avalanche Method',
      description: 'Pay minimum on all debts, then put extra towards the highest interest rate debt first. This saves the most money on interest.',
      estimatedDate: estimatedDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      interestSaved: Math.round(interestSaved),
      order: sortedByInterest.map(d => d.name || 'Unnamed')
    };
  }

  /**
   * Calculate investment health score
   */
  _calculateInvestmentScore(investments) {
    if (!investments || investments.length === 0) {
      return { score: 30, details: ['No investments found'], data: null };
    }

    let score = 40;
    const details = [];

    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || i.purchasePrice || 0), 0);
    const totalCurrent = investments.reduce((s, i) => s + (i.currentValue || i.marketValue || 0), 0);
    const portfolioValue = totalCurrent;

    // Returns
    const overallReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
    if (overallReturn >= 15) { score += 20; details.push('Excellent investment returns'); }
    else if (overallReturn >= 10) { score += 15; details.push('Good investment returns'); }
    else if (overallReturn >= 5) { score += 10; details.push('Moderate returns'); }
    else if (overallReturn >= 0) { score += 5; details.push('Positive but low returns'); }
    else { score -= 10; details.push('Negative returns'); }

    // Diversification
    const types = new Set(investments.map(i => i.type || i.category || 'other'));
    if (types.size >= 5) { score += 15; details.push('Well diversified portfolio'); }
    else if (types.size >= 3) { score += 10; details.push('Moderately diversified'); }
    else { score += 5; details.push('Consider diversifying more'); }

    // Asset mix calculation
    const assetMix = {};
    investments.forEach(i => {
      const type = i.type || i.category || 'other';
      assetMix[type] = (assetMix[type] || 0) + (i.currentValue || i.marketValue || 0);
    });
    // Convert to percentages
    Object.keys(assetMix).forEach(key => {
      assetMix[key] = totalCurrent > 0 ? Math.round((assetMix[key] / totalCurrent) * 100) : 0;
    });

    // Risk profile
    const equityPct = (assetMix.stocks || 0) + (assetMix.equity || 0) + (assetMix.mutual_fund || 0);
    let riskLabel = 'Balanced';
    let riskScore = 50;
    if (equityPct > 80) { riskLabel = 'Aggressive'; riskScore = 85; }
    else if (equityPct > 60) { riskLabel = 'Growth'; riskScore = 70; }
    else if (equityPct > 40) { riskLabel = 'Balanced'; riskScore = 50; }
    else if (equityPct > 20) { riskLabel = 'Conservative'; riskScore = 30; }
    else { riskLabel = 'Very Conservative'; riskScore = 15; }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        portfolioValue,
        xirr: overallReturn,
        diversificationScore: types.size * 15,
        assetMix,
        riskProfile: { label: riskLabel, score: riskScore },
        benchmarkComparison: {
          'Your Portfolio': overallReturn,
          'Nifty 50': 12.5,
          'Sensex': 12.0,
          'FD Rate': 7.0
        }
      }
    };
  }

  /**
   * Calculate financial protection score
   */
  _calculateProtectionScore(insurance, netWorthData, transactions) {
    let score = 30;
    const details = [];

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const months = Math.max(1, new Set(transactions.map(t => new Date(t.date).toISOString().substring(0, 7))).size);
    const annualIncome = (income / months) * 12;

    // Life insurance check
    const lifeInsurance = insurance.filter(i => i.type === 'term' || i.type === 'life');
    const lifeCover = lifeInsurance.reduce((s, i) => s + (i.coverAmount || i.sumAssured || 0), 0);
    const lifeCoverMultiple = annualIncome > 0 ? lifeCover / annualIncome : 0;

    if (lifeCoverMultiple >= 15) { score += 20; details.push('Excellent life cover'); }
    else if (lifeCoverMultiple >= 10) { score += 15; details.push('Good life cover'); }
    else if (lifeCoverMultiple >= 5) { score += 10; details.push('Adequate life cover'); }
    else if (lifeInsurance.length > 0) { score += 5; details.push('Insufficient life cover'); }
    else { details.push('No life insurance'); }

    // Health insurance check
    const healthInsurance = insurance.filter(i => i.type === 'health');
    const healthCover = healthInsurance.reduce((s, i) => s + (i.coverAmount || i.sumAssured || 0), 0);

    if (healthCover >= 1000000) { score += 15; details.push('Good health cover'); }
    else if (healthCover >= 500000) { score += 10; details.push('Basic health cover'); }
    else if (healthInsurance.length > 0) { score += 5; }
    else { details.push('No health insurance'); }

    // Emergency fund
    const monthlyExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) / months;
    const emergencyFund = netWorthData?.cashAssets || 0;
    const emergencyFundMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;

    if (emergencyFundMonths >= 6) score += 15;
    else if (emergencyFundMonths >= 3) score += 10;
    else score += 5;

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        lifeCoverMultiple,
        healthCover,
        emergencyFundMonths,
        hasTermLife: lifeInsurance.length > 0,
        hasHealthInsurance: healthInsurance.length > 0,
        hasCriticalIllness: insurance.some(i => i.type === 'critical_illness'),
        hasAccidentCover: insurance.some(i => i.type === 'accident'),
        hasHomeInsurance: insurance.some(i => i.type === 'home'),
        hasWill: false, // Would need separate data
        hasLiabilityCoverage: false
      }
    };
  }

  /**
   * Calculate planning health score
   */
  _calculatePlanningScore(goals, netWorthData) {
    if (!goals || goals.length === 0) {
      return { score: 30, details: ['No financial goals set'], data: { retirementCorpus: 0, retirementTarget: 0, goals: [] } };
    }

    let score = 40;
    const details = [];

    // Goal progress
    const goalsWithProgress = goals.map(g => {
      const progress = g.targetAmount > 0 ? ((g.currentAmount || 0) / g.targetAmount) * 100 : 0;
      return { name: g.name, target: g.targetAmount, current: g.currentAmount || 0, progress };
    });

    const avgProgress = goalsWithProgress.reduce((s, g) => s + g.progress, 0) / goalsWithProgress.length;
    if (avgProgress >= 75) { score += 20; details.push('On track with most goals'); }
    else if (avgProgress >= 50) { score += 10; details.push('Making progress on goals'); }
    else { score += 5; details.push('Goals need more attention'); }

    // Retirement planning
    const retirementGoal = goals.find(g => g.category === 'retirement' || g.name?.toLowerCase().includes('retirement'));
    const retirementCorpus = retirementGoal?.currentAmount || 0;
    const retirementTarget = retirementGoal?.targetAmount || 0;

    if (retirementGoal) {
      const retirementProgress = retirementTarget > 0 ? (retirementCorpus / retirementTarget) * 100 : 0;
      if (retirementProgress >= 50) { score += 15; details.push('Good retirement progress'); }
      else if (retirementProgress >= 25) { score += 10; details.push('Building retirement corpus'); }
      else { score += 5; details.push('Need to accelerate retirement savings'); }
    }

    // Number of active goals
    if (goals.length >= 5) score += 10;
    else if (goals.length >= 3) score += 5;

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      details,
      data: {
        retirementCorpus,
        retirementTarget,
        yearsToRetirement: 30, // Default
        goals: goalsWithProgress
      }
    };
  }

  /**
   * Generate personalized action items
   */
  _generateActionItems(pillarScores, pillarData) {
    const actions = [];

    // Spending actions
    if (pillarScores.spending < 60) {
      actions.push({
        pillar: 'spending',
        priority: 'high',
        title: 'Review discretionary spending',
        description: 'Identify and reduce non-essential expenses to improve your spending health.',
        impact: 'Could save 10-20% of monthly expenses'
      });
    }

    // Savings actions
    if (pillarScores.savings < 60) {
      actions.push({
        pillar: 'savings',
        priority: 'high',
        title: 'Increase savings rate',
        description: 'Set up automatic savings of at least 20% of income.',
        impact: 'Build financial security faster'
      });
    }
    if (pillarData.savings?.data?.emergencyFundMonths < 6) {
      actions.push({
        pillar: 'savings',
        priority: 'high',
        title: 'Build emergency fund',
        description: 'Save 6 months of expenses in liquid assets.',
        impact: 'Financial security for unexpected events'
      });
    }

    // Debt actions
    if (pillarScores.debt < 60) {
      actions.push({
        pillar: 'debt',
        priority: 'high',
        title: 'Create debt payoff plan',
        description: 'Use the avalanche method to pay off high-interest debt first.',
        impact: 'Save money on interest payments'
      });
    }

    // Investment actions
    if (pillarScores.investment < 60) {
      actions.push({
        pillar: 'investment',
        priority: 'medium',
        title: 'Diversify investments',
        description: 'Spread investments across stocks, bonds, and other asset classes.',
        impact: 'Reduce risk and improve returns'
      });
    }

    // Protection actions
    if (pillarScores.protection < 60) {
      if (!pillarData.protection?.data?.hasTermLife) {
        actions.push({
          pillar: 'protection',
          priority: 'high',
          title: 'Get term life insurance',
          description: 'Cover at least 10x annual income with term insurance.',
          impact: 'Protect your family financially'
        });
      }
      if (!pillarData.protection?.data?.hasHealthInsurance) {
        actions.push({
          pillar: 'protection',
          priority: 'high',
          title: 'Get health insurance',
          description: 'A health cover of at least ₹10 lakhs is recommended.',
          impact: 'Protect against medical emergencies'
        });
      }
    }

    // Planning actions
    if (pillarScores.planning < 60) {
      actions.push({
        pillar: 'planning',
        priority: 'medium',
        title: 'Set financial goals',
        description: 'Define specific, measurable financial goals with target dates.',
        impact: 'Stay focused on long-term objectives'
      });
    }

    return actions.sort((a, b) => {
      const prio = { high: 3, medium: 2, low: 1 };
      return (prio[b.priority] || 0) - (prio[a.priority] || 0);
    });
  }

  async _getPreviousScore(userId) {
    // Return 0 if no history available
    return 0;
  }

  // Helper methods
  async _getTransactions(userId, days) {
    try {
      const Transaction = mongoose.model('Transaction');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return await Transaction.find({ userId, date: { $gte: cutoff } }).lean();
    } catch { return []; }
  }

  async _getDebts(userId) {
    try {
      const models = ['Debt', 'PersonalLoan', 'EMI'];
      const results = [];
      for (const modelName of models) {
        try {
          const Model = mongoose.model(modelName);
          const items = await Model.find({ userId, status: { $ne: 'paid' } }).lean();
          results.push(...items);
        } catch { /* model might not exist */ }
      }
      return results;
    } catch { return []; }
  }

  async _getInvestments(userId) {
    try {
      const Investment = mongoose.model('Investment');
      return await Investment.find({ userId }).lean();
    } catch { return []; }
  }

  async _getInsurance(userId) {
    try {
      const InsurancePolicy = mongoose.model('InsurancePolicy');
      return await InsurancePolicy.find({ userId }).lean();
    } catch { return []; }
  }

  async _getGoals(userId) {
    try {
      const FinancialGoal = mongoose.model('FinancialGoal');
      return await FinancialGoal.find({ userId }).lean();
    } catch { return []; }
  }

  async _getNetWorth(userId) {
    try {
      const NetWorthSnapshot = mongoose.model('NetWorthSnapshot');
      const latest = await NetWorthSnapshot.findOne({ userId }).sort({ date: -1 }).lean();
      const cashAssets = (latest?.assets || [])
        .filter(a => a.category === 'cash' || a.isLiquid)
        .reduce((s, a) => s + (a.currentValue || 0), 0);
      return { ...latest, cashAssets };
    } catch { return {}; }
  }
}

module.exports = new FinancialWellnessService();
