const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FinancialGoal = require('../models/FinancialGoal');
const Investment = require('../models/Investment');
const Debt = require('../models/Debt');
const EMI = require('../models/EMI');
const moment = require('moment');

/**
 * Financial Health Scoring System
 * Comprehensive analysis of user's financial health with actionable insights
 */
class FinancialHealthService {
  /**
   * Calculate comprehensive financial health score
   */
  async calculateFinancialHealth(userId) {
    try {
      // Gather all financial data
      const data = await this.gatherFinancialData(userId);
      
      // Calculate individual scores
      const scores = {
        savings: await this.calculateSavingsScore(data),
        debt: await this.calculateDebtScore(data),
        budget: await this.calculateBudgetScore(data),
        investment: await this.calculateInvestmentScore(data),
        emergency: await this.calculateEmergencyFundScore(data),
        cashFlow: await this.calculateCashFlowScore(data),
        creditUtilization: await this.calculateCreditUtilizationScore(data),
        goalProgress: await this.calculateGoalProgressScore(data)
      };

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore(scores);

      // Generate health grade
      const grade = this.calculateGrade(overallScore);

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(scores, data);

      // Generate insights
      const insights = this.generateHealthInsights(scores, data);

      // Calculate financial ratios
      const ratios = this.calculateFinancialRatios(data);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(scores);

      return {
        overallScore: parseFloat(overallScore.toFixed(2)),
        grade,
        riskLevel,
        scores,
        ratios,
        recommendations,
        insights,
        strengths: this.identifyStrengths(scores),
        weaknesses: this.identifyWeaknesses(scores),
        comparison: this.generateComparison(overallScore),
        projections: this.generateProjections(data, scores),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error calculating financial health:', error);
      throw error;
    }
  }

  /**
   * Gather all financial data
   */
  async gatherFinancialData(userId) {
    const [
      transactions,
      budgets,
      goals,
      investments,
      debts,
      emis
    ] = await Promise.all([
      Transaction.find({ user: userId, date: { $gte: moment().subtract(6, 'months').toDate() } }),
      Budget.find({ user: userId }),
      FinancialGoal.find({ user: userId }),
      Investment.find({ user: userId }),
      Debt.find({ userId: userId }),
      EMI.find({ user: userId })
    ]);

    // Separate debts into loans and credit cards for compatibility
    const loans = debts.filter(d => d.debtType !== 'credit_card');
    const creditCards = debts.filter(d => d.debtType === 'credit_card');

    return {
      transactions,
      budgets,
      goals,
      investments,
      loans,
      creditCards,
      emis,
      income: this.calculateIncome(transactions),
      expenses: this.calculateExpenses(transactions)
    };
  }

  /**
   * Calculate Savings Score (0-100)
   * Based on savings rate and consistency
   */
  async calculateSavingsScore(data) {
    const { income, expenses } = data;
    
    if (income === 0) {
      return {
        score: 0,
        savingsRate: 0,
        monthlySavings: 0,
        status: 'critical',
        message: 'No income recorded'
      };
    }

    const monthlySavings = income - expenses;
    const savingsRate = (monthlySavings / income) * 100;

    let score = 0;
    let status = '';

    if (savingsRate >= 30) {
      score = 100;
      status = 'excellent';
    } else if (savingsRate >= 20) {
      score = 80;
      status = 'good';
    } else if (savingsRate >= 10) {
      score = 60;
      status = 'fair';
    } else if (savingsRate >= 5) {
      score = 40;
      status = 'poor';
    } else if (savingsRate >= 0) {
      score = 20;
      status = 'critical';
    } else {
      score = 0;
      status = 'critical';
    }

    return {
      score,
      savingsRate: parseFloat(savingsRate.toFixed(2)),
      monthlySavings: parseFloat(monthlySavings.toFixed(2)),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      status,
      message: this.getSavingsMessage(savingsRate),
      recommendation: this.getSavingsRecommendation(savingsRate)
    };
  }

  /**
   * Calculate Debt Score (0-100)
   * Lower debt = higher score
   */
  async calculateDebtScore(data) {
    const { loans, creditCards, emis, income } = data;

    const totalDebt = this.calculateTotalDebt(loans, creditCards);
    const monthlyDebtPayment = this.calculateMonthlyDebtPayment(emis, loans, creditCards);
    const debtToIncomeRatio = income > 0 ? (monthlyDebtPayment / income) * 100 : 0;

    let score = 100;
    let status = '';

    if (debtToIncomeRatio === 0) {
      score = 100;
      status = 'excellent';
    } else if (debtToIncomeRatio <= 15) {
      score = 90;
      status = 'excellent';
    } else if (debtToIncomeRatio <= 25) {
      score = 75;
      status = 'good';
    } else if (debtToIncomeRatio <= 35) {
      score = 60;
      status = 'fair';
    } else if (debtToIncomeRatio <= 50) {
      score = 40;
      status = 'poor';
    } else {
      score = 20;
      status = 'critical';
    }

    return {
      score,
      totalDebt: parseFloat(totalDebt.toFixed(2)),
      monthlyDebtPayment: parseFloat(monthlyDebtPayment.toFixed(2)),
      debtToIncomeRatio: parseFloat(debtToIncomeRatio.toFixed(2)),
      debtCount: loans.length + creditCards.length,
      status,
      message: this.getDebtMessage(debtToIncomeRatio),
      recommendation: this.getDebtRecommendation(debtToIncomeRatio, totalDebt)
    };
  }

  /**
   * Calculate Budget Score (0-100)
   * Based on budget adherence
   */
  async calculateBudgetScore(data) {
    const { budgets, transactions } = data;

    if (budgets.length === 0) {
      return {
        score: 50,
        adherenceRate: 0,
        budgetsWithinLimit: 0,
        totalBudgets: 0,
        status: 'fair',
        message: 'No budgets set. Create budgets to track spending.',
        recommendation: 'Set up budgets for major spending categories'
      };
    }

    let budgetsWithinLimit = 0;
    const budgetDetails = [];

    budgets.forEach(budget => {
      const spent = transactions
        .filter(t => t.category === budget.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const percentUsed = (spent / budget.limit) * 100;
      const isWithinLimit = spent <= budget.limit;
      
      if (isWithinLimit) budgetsWithinLimit++;

      budgetDetails.push({
        category: budget.category,
        limit: budget.limit,
        spent,
        percentUsed: parseFloat(percentUsed.toFixed(2)),
        isWithinLimit
      });
    });

    const adherenceRate = (budgetsWithinLimit / budgets.length) * 100;
    let score = adherenceRate;
    let status = '';

    if (adherenceRate >= 90) status = 'excellent';
    else if (adherenceRate >= 70) status = 'good';
    else if (adherenceRate >= 50) status = 'fair';
    else if (adherenceRate >= 30) status = 'poor';
    else status = 'critical';

    return {
      score: parseFloat(score.toFixed(2)),
      adherenceRate: parseFloat(adherenceRate.toFixed(2)),
      budgetsWithinLimit,
      totalBudgets: budgets.length,
      budgetDetails,
      status,
      message: this.getBudgetMessage(adherenceRate),
      recommendation: this.getBudgetRecommendation(adherenceRate, budgetDetails)
    };
  }

  /**
   * Calculate Investment Score (0-100)
   * Based on investment portfolio and diversification
   */
  async calculateInvestmentScore(data) {
    const { investments, income } = data;

    if (investments.length === 0) {
      return {
        score: 0,
        totalInvestments: 0,
        monthlyInvestment: 0,
        investmentToIncomeRatio: 0,
        diversificationScore: 0,
        status: 'poor',
        message: 'No investments found',
        recommendation: 'Start investing at least 15% of your income'
      };
    }

    const totalInvestments = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const monthlyInvestment = investments
      .filter(inv => inv.frequency === 'monthly')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const investmentToIncomeRatio = income > 0 ? (monthlyInvestment / income) * 100 : 0;

    // Calculate diversification
    const types = new Set(investments.map(inv => inv.type));
    const diversificationScore = Math.min((types.size / 5) * 100, 100); // Assuming 5 types is fully diversified

    let score = 0;
    if (investmentToIncomeRatio >= 20) score = 100;
    else if (investmentToIncomeRatio >= 15) score = 85;
    else if (investmentToIncomeRatio >= 10) score = 70;
    else if (investmentToIncomeRatio >= 5) score = 50;
    else score = 30;

    // Adjust for diversification
    score = (score * 0.7) + (diversificationScore * 0.3);

    let status = '';
    if (score >= 85) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    return {
      score: parseFloat(score.toFixed(2)),
      totalInvestments: parseFloat(totalInvestments.toFixed(2)),
      monthlyInvestment: parseFloat(monthlyInvestment.toFixed(2)),
      investmentToIncomeRatio: parseFloat(investmentToIncomeRatio.toFixed(2)),
      diversificationScore: parseFloat(diversificationScore.toFixed(2)),
      investmentCount: investments.length,
      assetTypes: Array.from(types),
      status,
      message: this.getInvestmentMessage(investmentToIncomeRatio),
      recommendation: this.getInvestmentRecommendation(investmentToIncomeRatio, diversificationScore)
    };
  }

  /**
   * Calculate Emergency Fund Score (0-100)
   */
  async calculateEmergencyFundScore(data) {
    const { transactions, expenses } = data;

    // Calculate liquid savings (checking + savings accounts)
    const liquidSavings = transactions
      .filter(t => t.category === 'Savings' && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthsOfExpensesCovered = expenses > 0 ? liquidSavings / expenses : 0;

    let score = 0;
    let status = '';

    if (monthsOfExpensesCovered >= 6) {
      score = 100;
      status = 'excellent';
    } else if (monthsOfExpensesCovered >= 3) {
      score = 75;
      status = 'good';
    } else if (monthsOfExpensesCovered >= 1) {
      score = 50;
      status = 'fair';
    } else if (monthsOfExpensesCovered >= 0.5) {
      score = 25;
      status = 'poor';
    } else {
      score = 0;
      status = 'critical';
    }

    const targetFund = expenses * 6;
    const shortfall = Math.max(0, targetFund - liquidSavings);

    return {
      score,
      liquidSavings: parseFloat(liquidSavings.toFixed(2)),
      monthsOfExpensesCovered: parseFloat(monthsOfExpensesCovered.toFixed(2)),
      targetFund: parseFloat(targetFund.toFixed(2)),
      shortfall: parseFloat(shortfall.toFixed(2)),
      status,
      message: this.getEmergencyFundMessage(monthsOfExpensesCovered),
      recommendation: this.getEmergencyFundRecommendation(shortfall, expenses)
    };
  }

  /**
   * Calculate Cash Flow Score (0-100)
   */
  async calculateCashFlowScore(data) {
    const { income, expenses } = data;

    const netCashFlow = income - expenses;
    const cashFlowRatio = income > 0 ? (netCashFlow / income) * 100 : 0;

    let score = 0;
    let status = '';

    if (cashFlowRatio >= 30) {
      score = 100;
      status = 'excellent';
    } else if (cashFlowRatio >= 20) {
      score = 85;
      status = 'good';
    } else if (cashFlowRatio >= 10) {
      score = 70;
      status = 'fair';
    } else if (cashFlowRatio >= 0) {
      score = 50;
      status = 'poor';
    } else {
      score = 20;
      status = 'critical';
    }

    return {
      score,
      netCashFlow: parseFloat(netCashFlow.toFixed(2)),
      cashFlowRatio: parseFloat(cashFlowRatio.toFixed(2)),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      status,
      message: this.getCashFlowMessage(cashFlowRatio),
      recommendation: this.getCashFlowRecommendation(cashFlowRatio)
    };
  }

  /**
   * Calculate Credit Utilization Score (0-100)
   */
  async calculateCreditUtilizationScore(data) {
    const { creditCards } = data;

    if (creditCards.length === 0) {
      return {
        score: 100,
        utilizationRate: 0,
        totalLimit: 0,
        totalUsed: 0,
        status: 'excellent',
        message: 'No credit cards',
        recommendation: 'Consider getting a credit card to build credit history'
      };
    }

    const totalLimit = creditCards.reduce((sum, card) => 
      sum + (card.collateral?.value || card.loanDetails?.principalAmount || 0), 0);
    const totalUsed = creditCards.reduce((sum, card) => 
      sum + (card.loanDetails?.currentBalance || 0), 0);
    const utilizationRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    let score = 0;
    let status = '';

    if (utilizationRate <= 10) {
      score = 100;
      status = 'excellent';
    } else if (utilizationRate <= 30) {
      score = 85;
      status = 'good';
    } else if (utilizationRate <= 50) {
      score = 60;
      status = 'fair';
    } else if (utilizationRate <= 70) {
      score = 40;
      status = 'poor';
    } else {
      score = 20;
      status = 'critical';
    }

    return {
      score,
      utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      totalLimit: parseFloat(totalLimit.toFixed(2)),
      totalUsed: parseFloat(totalUsed.toFixed(2)),
      availableCredit: parseFloat((totalLimit - totalUsed).toFixed(2)),
      cardCount: creditCards.length,
      status,
      message: this.getCreditUtilizationMessage(utilizationRate),
      recommendation: this.getCreditUtilizationRecommendation(utilizationRate, totalUsed)
    };
  }

  /**
   * Calculate Goal Progress Score (0-100)
   */
  async calculateGoalProgressScore(data) {
    const { goals } = data;

    if (goals.length === 0) {
      return {
        score: 50,
        averageProgress: 0,
        goalsOnTrack: 0,
        totalGoals: 0,
        status: 'fair',
        message: 'No financial goals set',
        recommendation: 'Set SMART financial goals to improve your financial health'
      };
    }

    let totalProgress = 0;
    let goalsOnTrack = 0;

    goals.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      totalProgress += progress;

      // Calculate if on track
      const startDate = moment(goal.startDate);
      const targetDate = moment(goal.targetDate);
      const today = moment();
      
      const totalDuration = targetDate.diff(startDate, 'days');
      const elapsed = today.diff(startDate, 'days');
      const expectedProgress = (elapsed / totalDuration) * 100;

      if (progress >= expectedProgress) goalsOnTrack++;
    });

    const averageProgress = totalProgress / goals.length;
    const onTrackRate = (goalsOnTrack / goals.length) * 100;

    let score = (averageProgress * 0.6) + (onTrackRate * 0.4);
    score = Math.min(score, 100);

    let status = '';
    if (score >= 80) status = 'excellent';
    else if (score >= 60) status = 'good';
    else if (score >= 40) status = 'fair';
    else status = 'poor';

    return {
      score: parseFloat(score.toFixed(2)),
      averageProgress: parseFloat(averageProgress.toFixed(2)),
      goalsOnTrack,
      totalGoals: goals.length,
      onTrackRate: parseFloat(onTrackRate.toFixed(2)),
      status,
      message: this.getGoalProgressMessage(onTrackRate),
      recommendation: this.getGoalProgressRecommendation(averageProgress, goalsOnTrack, goals.length)
    };
  }

  /**
   * Calculate overall weighted score
   */
  calculateOverallScore(scores) {
    const weights = {
      savings: 0.20,
      debt: 0.20,
      budget: 0.15,
      investment: 0.15,
      emergency: 0.10,
      cashFlow: 0.10,
      creditUtilization: 0.05,
      goalProgress: 0.05
    };

    let overallScore = 0;
    Object.keys(weights).forEach(key => {
      overallScore += scores[key].score * weights[key];
    });

    return overallScore;
  }

  /**
   * Calculate grade
   */
  calculateGrade(score) {
    if (score >= 90) return { grade: 'A+', description: 'Excellent', color: 'green' };
    if (score >= 80) return { grade: 'A', description: 'Very Good', color: 'green' };
    if (score >= 70) return { grade: 'B+', description: 'Good', color: 'blue' };
    if (score >= 60) return { grade: 'B', description: 'Above Average', color: 'blue' };
    if (score >= 50) return { grade: 'C', description: 'Average', color: 'yellow' };
    if (score >= 40) return { grade: 'D', description: 'Below Average', color: 'orange' };
    return { grade: 'F', description: 'Needs Improvement', color: 'red' };
  }

  /**
   * Determine risk level
   */
  determineRiskLevel(scores) {
    const criticalCount = Object.values(scores).filter(s => s.status === 'critical').length;
    const poorCount = Object.values(scores).filter(s => s.status === 'poor').length;

    if (criticalCount >= 2 || scores.debt.status === 'critical') {
      return { level: 'high', description: 'Immediate attention required', color: 'red' };
    } else if (criticalCount >= 1 || poorCount >= 3) {
      return { level: 'medium', description: 'Action recommended', color: 'orange' };
    } else {
      return { level: 'low', description: 'Financially stable', color: 'green' };
    }
  }

  /**
   * Calculate financial ratios
   */
  calculateFinancialRatios(data) {
    const { income, expenses, loans, creditCards } = data;

    const totalDebt = this.calculateTotalDebt(loans, creditCards);
    const netWorth = data.investments.reduce((sum, inv) => sum + inv.currentValue, 0) - totalDebt;

    return {
      savingsRate: income > 0 ? ((income - expenses) / income * 100).toFixed(2) : 0,
      debtToIncomeRatio: income > 0 ? (totalDebt / income * 100).toFixed(2) : 0,
      expenseToIncomeRatio: income > 0 ? (expenses / income * 100).toFixed(2) : 0,
      netWorth: parseFloat(netWorth.toFixed(2)),
      liquidityRatio: expenses > 0 ? (income / expenses).toFixed(2) : 0
    };
  }

  /**
   * Generate health recommendations
   */
  generateHealthRecommendations(scores, data) {
    const recommendations = [];

    // Prioritize critical areas
    Object.keys(scores).forEach(category => {
      const score = scores[category];
      if (score.status === 'critical' || score.status === 'poor') {
        recommendations.push({
          category,
          priority: score.status === 'critical' ? 'high' : 'medium',
          title: `Improve ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          message: score.recommendation,
          currentScore: score.score,
          targetScore: 80
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate health insights
   */
  generateHealthInsights(scores, data) {
    const insights = [];

    // Find strongest area
    const strongest = Object.keys(scores).reduce((a, b) => 
      scores[a].score > scores[b].score ? a : b
    );
    insights.push({
      type: 'strength',
      title: 'Your Strongest Area',
      message: `Your ${strongest} score is ${scores[strongest].score.toFixed(0)}/100 - ${scores[strongest].status}!`,
      icon: '💪'
    });

    // Find weakest area
    const weakest = Object.keys(scores).reduce((a, b) => 
      scores[a].score < scores[b].score ? a : b
    );
    insights.push({
      type: 'weakness',
      title: 'Area for Improvement',
      message: `Focus on improving your ${weakest} score (${scores[weakest].score.toFixed(0)}/100)`,
      icon: '📍'
    });

    // Overall trend
    insights.push({
      type: 'trend',
      title: 'Financial Trend',
      message: `Your overall financial health is ${this.calculateGrade(this.calculateOverallScore(scores)).description}`,
      icon: '📈'
    });

    return insights;
  }

  /**
   * Identify strengths
   */
  identifyStrengths(scores) {
    return Object.keys(scores)
      .filter(key => scores[key].score >= 80)
      .map(key => ({
        category: key,
        score: scores[key].score,
        status: scores[key].status
      }));
  }

  /**
   * Identify weaknesses
   */
  identifyWeaknesses(scores) {
    return Object.keys(scores)
      .filter(key => scores[key].score < 60)
      .map(key => ({
        category: key,
        score: scores[key].score,
        status: scores[key].status,
        recommendation: scores[key].recommendation
      }));
  }

  /**
   * Generate comparison with benchmarks
   */
  generateComparison(overallScore) {
    return {
      userScore: overallScore,
      averageScore: 65,
      topPerformerScore: 85,
      percentile: this.calculatePercentile(overallScore),
      comparison: overallScore > 65 ? 'above average' : 'below average'
    };
  }

  /**
   * Generate projections
   */
  generateProjections(data, scores) {
    const currentScore = this.calculateOverallScore(scores);
    
    return {
      threeMonths: Math.min(currentScore + 5, 100),
      sixMonths: Math.min(currentScore + 10, 100),
      oneYear: Math.min(currentScore + 20, 100),
      assumptions: [
        'Maintain current savings rate',
        'Reduce debt by 10% per quarter',
        'Increase investments by 5% quarterly'
      ]
    };
  }

  // Helper methods
  calculateIncome(transactions) {
    return transactions
      .filter(t => t.amount > 0 && t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0) / 6; // Monthly average
  }

  calculateExpenses(transactions) {
    return Math.abs(
      transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    ) / 6; // Monthly average
  }

  calculateTotalDebt(loans, creditCards) {
    const loanDebt = loans.reduce((sum, loan) => sum + (loan.loanDetails?.currentBalance || 0), 0);
    const cardDebt = creditCards.reduce((sum, card) => sum + (card.loanDetails?.currentBalance || 0), 0);
    return loanDebt + cardDebt;
  }

  calculateMonthlyDebtPayment(emis, loans, creditCards) {
    const emiPayments = emis.reduce((sum, emi) => sum + emi.amount, 0);
    const cardMinPayments = creditCards.reduce((sum, card) => 
      sum + ((card.loanDetails?.currentBalance || 0) * 0.05), 0); // Assuming 5% min payment
    return emiPayments + cardMinPayments;
  }

  calculatePercentile(score) {
    // Simple percentile calculation
    if (score >= 85) return 90;
    if (score >= 75) return 75;
    if (score >= 65) return 60;
    if (score >= 55) return 45;
    if (score >= 45) return 30;
    return 15;
  }

  // Message generators
  getSavingsMessage(rate) {
    if (rate >= 30) return 'Excellent! You\'re saving at an exceptional rate.';
    if (rate >= 20) return 'Good job! You\'re meeting the recommended savings rate.';
    if (rate >= 10) return 'You\'re saving, but there\'s room for improvement.';
    if (rate >= 5) return 'Your savings rate is below recommended levels.';
    return 'Critical: You\'re not saving enough for future goals.';
  }

  getSavingsRecommendation(rate) {
    if (rate < 20) return 'Aim to save at least 20% of your income. Start with automatic transfers.';
    return 'Great savings rate! Consider increasing investments for better returns.';
  }

  getDebtMessage(ratio) {
    if (ratio === 0) return 'Excellent! You have no debt.';
    if (ratio <= 15) return 'Your debt is well managed.';
    if (ratio <= 25) return 'Your debt level is moderate.';
    if (ratio <= 35) return 'Your debt is on the higher side.';
    return 'Critical: Your debt level needs immediate attention.';
  }

  getDebtRecommendation(ratio, totalDebt) {
    if (ratio > 35) return 'Focus on debt reduction. Consider debt consolidation or snowball method.';
    if (ratio > 25) return 'Work on reducing high-interest debt first.';
    if (ratio > 0) return 'Continue making regular payments and avoid new debt.';
    return 'Maintain your debt-free status!';
  }

  getBudgetMessage(rate) {
    if (rate >= 90) return 'Excellent budget discipline!';
    if (rate >= 70) return 'Good budget adherence.';
    if (rate >= 50) return 'Moderate budget control.';
    return 'Budget adherence needs improvement.';
  }

  getBudgetRecommendation(rate, details) {
    if (rate < 70) {
      const exceeded = details.filter(d => !d.isWithinLimit);
      return `Focus on ${exceeded.map(d => d.category).join(', ')} categories`;
    }
    return 'Keep up the good budget discipline!';
  }

  getInvestmentMessage(ratio) {
    if (ratio >= 20) return 'Excellent investment rate!';
    if (ratio >= 15) return 'Good investment habits.';
    if (ratio >= 10) return 'Fair investment level.';
    return 'You should invest more for long-term wealth.';
  }

  getInvestmentRecommendation(ratio, diversification) {
    if (ratio < 15) return 'Increase investments to at least 15% of income';
    if (diversification < 60) return 'Diversify across more asset classes';
    return 'Maintain your investment strategy';
  }

  getEmergencyFundMessage(months) {
    if (months >= 6) return 'Excellent! You have a solid emergency fund.';
    if (months >= 3) return 'Good start on your emergency fund.';
    if (months >= 1) return 'You need to build a larger emergency fund.';
    return 'Critical: You don\'t have adequate emergency savings.';
  }

  getEmergencyFundRecommendation(shortfall, expenses) {
    if (shortfall > 0) {
      const monthlySavings = Math.ceil(shortfall / 12);
      return `Save ₹${monthlySavings.toFixed(0)} monthly to build emergency fund in 1 year`;
    }
    return 'Maintain your emergency fund at 6 months of expenses';
  }

  getCashFlowMessage(ratio) {
    if (ratio >= 30) return 'Excellent cash flow management!';
    if (ratio >= 20) return 'Good positive cash flow.';
    if (ratio >= 10) return 'Moderate cash flow.';
    if (ratio >= 0) return 'Tight cash flow situation.';
    return 'Negative cash flow - you\'re spending more than earning.';
  }

  getCashFlowRecommendation(ratio) {
    if (ratio < 10) return 'Reduce expenses or increase income to improve cash flow';
    return 'Maintain positive cash flow and invest surplus';
  }

  getCreditUtilizationMessage(rate) {
    if (rate <= 10) return 'Excellent credit utilization!';
    if (rate <= 30) return 'Good credit usage.';
    if (rate <= 50) return 'Moderate credit utilization.';
    return 'High credit utilization may affect credit score.';
  }

  getCreditUtilizationRecommendation(rate, used) {
    if (rate > 30) return `Pay down ₹${(used * 0.5).toFixed(0)} to reach 30% utilization`;
    return 'Maintain low credit utilization for good credit score';
  }

  getGoalProgressMessage(rate) {
    if (rate >= 80) return 'Excellent progress on your goals!';
    if (rate >= 60) return 'Good goal progress.';
    if (rate >= 40) return 'Moderate goal progress.';
    return 'You need to accelerate towards your goals.';
  }

  getGoalProgressRecommendation(progress, onTrack, total) {
    if (onTrack < total * 0.6) {
      return 'Review and adjust goals or increase contributions';
    }
    return 'Stay consistent with your goal contributions';
  }
}

module.exports = new FinancialHealthService();
