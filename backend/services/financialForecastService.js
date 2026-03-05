// ============================================================
// Financial Analyzer - Financial Forecast Service
// Feature #90: AI-powered financial forecasting engine
// ============================================================

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Investment = require('../models/Investment');

class FinancialForecastService {
  /**
   * Generate comprehensive financial forecast
   */
  static async generateForecast(userId, months = 12) {
    try {
      // Get historical data
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
      const transactions = await Transaction.find({
        userId,
        date: { $gte: sixMonthsAgo },
      }).sort({ date: 1 });

      // Separate income and expenses
      const monthlyData = this._aggregateByMonth(transactions);
      
      // Calculate trends
      const incomeTrend = this._calculateTrend(monthlyData.map(m => m.income));
      const expenseTrend = this._calculateTrend(monthlyData.map(m => m.expense));
      
      // Generate forecasts
      const forecast = [];
      const lastMonthData = monthlyData[monthlyData.length - 1] || { income: 0, expense: 0 };

      // If no historical data exists, return empty forecast
      if (monthlyData.length === 0 || (lastMonthData.income === 0 && lastMonthData.expense === 0)) {
        return {
          success: true,
          historicalData: [],
          forecast: [],
          trends: { income: { slope: 0, direction: 'stable' }, expense: { slope: 0, direction: 'stable' }, savingsRate: { current: 0, projected: 0 } },
          summary: { projectedAnnualIncome: 0, projectedAnnualExpense: 0, projectedAnnualSavings: 0, avgMonthlyIncome: 0, avgMonthlyExpense: 0, avgMonthlySavings: 0 },
          message: 'No transaction history found. Add transactions to generate forecasts.'
        };
      }
      
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        const incomeGrowth = 1 + (incomeTrend.slope > 0 ? Math.min(incomeTrend.slope, 0.05) : Math.max(incomeTrend.slope, -0.02));
        const expenseGrowth = 1 + (expenseTrend.slope > 0 ? Math.min(expenseTrend.slope, 0.08) : Math.max(expenseTrend.slope, -0.03));
        
        const forecastedIncome = Math.round(lastMonthData.income * Math.pow(incomeGrowth, i));
        const forecastedExpense = Math.round(lastMonthData.expense * Math.pow(expenseGrowth, i));
        const forecastedSavings = forecastedIncome - forecastedExpense;
        
        // Add seasonal adjustments
        const month = forecastDate.getMonth();
        const seasonalFactor = this._getSeasonalFactor(month);
        
        forecast.push({
          month: forecastDate.toISOString().substring(0, 7),
          monthName: forecastDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
          income: Math.round(forecastedIncome * seasonalFactor.income),
          expense: Math.round(forecastedExpense * seasonalFactor.expense),
          savings: Math.round(forecastedSavings * seasonalFactor.income),
          confidence: Math.max(0.5, 0.95 - (i * 0.03)),
          savingsRate: Math.round(((forecastedSavings) / forecastedIncome) * 100),
        });
      }

      return {
        success: true,
        historicalData: monthlyData,
        forecast,
        trends: {
          income: incomeTrend,
          expense: expenseTrend,
          savingsRate: {
            current: monthlyData.length > 0 
              ? Math.round(((lastMonthData.income - lastMonthData.expense) / lastMonthData.income) * 100)
              : 30,
            projected: forecast.length > 0 ? forecast[forecast.length - 1].savingsRate : 30,
          },
        },
        summary: {
          projectedAnnualIncome: forecast.reduce((s, f) => s + f.income, 0),
          projectedAnnualExpense: forecast.reduce((s, f) => s + f.expense, 0),
          projectedAnnualSavings: forecast.reduce((s, f) => s + f.savings, 0),
          avgMonthlyIncome: Math.round(forecast.reduce((s, f) => s + f.income, 0) / forecast.length),
          avgMonthlyExpense: Math.round(forecast.reduce((s, f) => s + f.expense, 0) / forecast.length),
          avgMonthlySavings: Math.round(forecast.reduce((s, f) => s + f.savings, 0) / forecast.length),
        },
      };
    } catch (error) {
      console.error('Error generating forecast:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cash flow projection
   */
  static async projectCashFlow(userId, months = 6) {
    try {
      const forecast = await this.generateForecast(userId, months);
      if (!forecast.success) return forecast;

      let runningBalance = 0;
      const cashFlowProjection = forecast.forecast.map((f, i) => {
        runningBalance += f.savings;
        return {
          ...f,
          cumulativeSavings: runningBalance,
          runningBalance,
          isPositive: f.savings > 0,
        };
      });

      // Find break-even points and milestones
      const milestones = [];
      const targets = [100000, 500000, 1000000, 5000000, 10000000];
      let cumulativeSaved = 0;

      cashFlowProjection.forEach((cf, i) => {
        cumulativeSaved += cf.savings;
        targets.forEach(target => {
          if (cumulativeSaved >= target && (i === 0 || (cumulativeSaved - cf.savings) < target)) {
            milestones.push({
              target,
              label: this._formatLargeNumber(target),
              reachedIn: `${i + 1} months`,
              date: cf.monthName,
            });
          }
        });
      });

      return {
        success: true,
        cashFlowProjection,
        milestones,
        summary: {
          totalProjectedSavings: runningBalance,
          monthsToBreakEven: cashFlowProjection.findIndex(cf => cf.cumulativeSavings > 0) + 1,
          averageMonthlyCashFlow: Math.round(runningBalance / months),
        },
      };
    } catch (error) {
      console.error('Error projecting cash flow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Goal achievement forecast
   */
  static async forecastGoalAchievement(userId, goalAmount, currentSaved = 0, monthlyContribution = 0) {
    try {
      if (monthlyContribution <= 0) {
        return {
          success: true,
          achievable: false,
          message: 'Monthly contribution must be greater than 0',
        };
      }

      const remaining = goalAmount - currentSaved;
      const monthsNeeded = Math.ceil(remaining / monthlyContribution);

      // With compounding (assumed 8% annual return)
      const monthlyRate = 0.08 / 12;
      let balance = currentSaved;
      let monthsWithCompounding = 0;

      while (balance < goalAmount && monthsWithCompounding < 600) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        monthsWithCompounding++;
      }

      // Generate month-by-month projection
      const projection = [];
      balance = currentSaved;
      for (let i = 0; i < Math.min(monthsWithCompounding + 6, 120); i++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        const progress = Math.min((balance / goalAmount) * 100, 100);

        if (i % (monthsWithCompounding > 24 ? 3 : 1) === 0 || balance >= goalAmount) {
          const date = new Date();
          date.setMonth(date.getMonth() + i + 1);
          projection.push({
            month: i + 1,
            date: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            balance: Math.round(balance),
            progress: Math.round(progress * 10) / 10,
            interestEarned: Math.round(balance - currentSaved - monthlyContribution * (i + 1)),
          });
        }

        if (balance >= goalAmount) break;
      }

      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsWithCompounding);

      return {
        success: true,
        achievable: true,
        goalAmount,
        currentSaved,
        monthlyContribution,
        monthsNeeded,
        monthsWithCompounding,
        targetDate: targetDate.toISOString(),
        targetDateFormatted: targetDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalContributions: monthlyContribution * monthsWithCompounding,
        totalInterestEarned: Math.round(goalAmount - currentSaved - monthlyContribution * monthsWithCompounding),
        projection,
        scenarios: [
          {
            label: 'Conservative (6% return)',
            months: this._calculateMonthsToGoal(goalAmount, currentSaved, monthlyContribution, 0.06),
          },
          {
            label: 'Moderate (8% return)',
            months: monthsWithCompounding,
          },
          {
            label: 'Aggressive (12% return)',
            months: this._calculateMonthsToGoal(goalAmount, currentSaved, monthlyContribution, 0.12),
          },
        ],
      };
    } catch (error) {
      console.error('Error forecasting goal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retirement forecast
   */
  static async forecastRetirement(params) {
    const {
      currentAge = 30,
      retirementAge = 60,
      currentSavings = 0,
      monthlyIncome = 85000,
      monthlyExpenses = 55000,
      expectedReturn = 0.12,
      inflationRate = 0.06,
      lifeExpectancy = 85,
    } = params;

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const annualSavings = monthlySavings * 12;
    const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;

    // Calculate corpus at retirement
    let corpus = currentSavings;
    const yearlyProjection = [];

    for (let year = 0; year <= yearsToRetirement; year++) {
      yearlyProjection.push({
        age: currentAge + year,
        year: new Date().getFullYear() + year,
        corpus: Math.round(corpus),
        annualSavings: Math.round(annualSavings * Math.pow(1 + inflationRate, year)),
        phase: 'accumulation',
      });
      corpus = corpus * (1 + expectedReturn) + annualSavings * Math.pow(1 + inflationRate, year);
    }

    const corpusAtRetirement = Math.round(corpus);

    // Calculate withdrawal phase
    const monthlyExpenseAtRetirement = monthlyExpenses * Math.pow(1 + inflationRate, yearsToRetirement);
    const annualExpenseAtRetirement = monthlyExpenseAtRetirement * 12;

    let withdrawalCorpus = corpusAtRetirement;
    for (let year = 0; year <= yearsInRetirement; year++) {
      const annualExpense = annualExpenseAtRetirement * Math.pow(1 + inflationRate, year);
      yearlyProjection.push({
        age: retirementAge + year,
        year: new Date().getFullYear() + yearsToRetirement + year,
        corpus: Math.round(withdrawalCorpus),
        annualWithdrawal: Math.round(annualExpense),
        phase: 'withdrawal',
      });
      withdrawalCorpus = withdrawalCorpus * (1 + 0.07) - annualExpense; // Conservative return post-retirement
      if (withdrawalCorpus < 0) {
        withdrawalCorpus = 0;
        break;
      }
    }

    // Calculate required corpus using 4% rule
    const requiredCorpus = annualExpenseAtRetirement * 25;
    const shortfall = Math.max(0, requiredCorpus - corpusAtRetirement);
    const additionalMonthlySaving = shortfall > 0 
      ? Math.round(shortfall / (yearsToRetirement * 12 * ((Math.pow(1 + expectedReturn / 12, yearsToRetirement * 12) - 1) / (expectedReturn / 12))))
      : 0;

    return {
      success: true,
      inputs: {
        currentAge,
        retirementAge,
        currentSavings,
        monthlyIncome,
        monthlyExpenses,
        expectedReturn: `${(expectedReturn * 100).toFixed(1)}%`,
        inflationRate: `${(inflationRate * 100).toFixed(1)}%`,
      },
      results: {
        yearsToRetirement,
        corpusAtRetirement,
        requiredCorpus: Math.round(requiredCorpus),
        shortfall: Math.round(shortfall),
        isOnTrack: corpusAtRetirement >= requiredCorpus,
        monthlyExpenseAtRetirement: Math.round(monthlyExpenseAtRetirement),
        annualExpenseAtRetirement: Math.round(annualExpenseAtRetirement),
        additionalMonthlySaving,
        corpusLastsUntilAge: this._calculateCorpusDepletion(corpusAtRetirement, annualExpenseAtRetirement, inflationRate, retirementAge),
      },
      yearlyProjection,
      recommendations: this._getRetirementRecommendations(corpusAtRetirement, requiredCorpus, yearsToRetirement, monthlySavings),
    };
  }

  /**
   * Expense category forecast
   */
  static async forecastExpensesByCategory(userId, months = 6) {
    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 86400000);
      const transactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo },
        type: 'expense',
      });

      const categoryMonthly = {};
      transactions.forEach(tx => {
        const cat = tx.category || 'Other';
        const monthKey = new Date(tx.date).toISOString().substring(0, 7);
        if (!categoryMonthly[cat]) categoryMonthly[cat] = {};
        categoryMonthly[cat][monthKey] = (categoryMonthly[cat][monthKey] || 0) + tx.amount;
      });

      const categoryForecasts = {};
      for (const [category, monthlyData] of Object.entries(categoryMonthly)) {
        const amounts = Object.values(monthlyData);
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const trend = this._calculateTrend(amounts);

        const forecast = [];
        for (let i = 1; i <= months; i++) {
          const projected = Math.round(avg * Math.pow(1 + trend.slope, i));
          forecast.push({
            month: i,
            amount: Math.max(0, projected),
          });
        }

        categoryForecasts[category] = {
          historical: amounts,
          average: Math.round(avg),
          trend: trend.direction,
          trendSlope: trend.slope,
          forecast,
          projectedTotal: forecast.reduce((s, f) => s + f.amount, 0),
        };
      }

      return {
        success: true,
        categoryForecasts,
        totalProjectedExpense: Object.values(categoryForecasts).reduce((s, cf) => s + cf.projectedTotal, 0),
      };
    } catch (error) {
      console.error('Error forecasting expenses by category:', error);
      return { success: false, error: error.message };
    }
  }

  // ======================== HELPER METHODS ========================

  static _aggregateByMonth(transactions) {
    const monthMap = {};

    transactions.forEach(tx => {
      const monthKey = new Date(tx.date).toISOString().substring(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, income: 0, expense: 0, count: 0 };
      }
      if (tx.type === 'income') {
        monthMap[monthKey].income += tx.amount;
      } else {
        monthMap[monthKey].expense += tx.amount;
      }
      monthMap[monthKey].count++;
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }

  static _calculateTrend(values) {
    if (values.length < 2) return { slope: 0, direction: 'stable', r2: 0 };

    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
      sumY2 += values[i] * values[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    const normalizedSlope = avgY > 0 ? slope / avgY : 0;

    // R-squared
    const ssRes = values.reduce((s, v, i) => {
      const predicted = (sumY / n) + slope * (i - sumX / n);
      return s + Math.pow(v - predicted, 2);
    }, 0);
    const ssTot = values.reduce((s, v) => s + Math.pow(v - avgY, 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    return {
      slope: Math.round(normalizedSlope * 10000) / 10000,
      direction: normalizedSlope > 0.02 ? 'increasing' : normalizedSlope < -0.02 ? 'decreasing' : 'stable',
      r2: Math.round(r2 * 100) / 100,
      averageValue: Math.round(avgY),
    };
  }

  static _getSeasonalFactor(month) {
    // Indian seasonal spending patterns
    const factors = {
      0: { income: 1.0, expense: 0.95 },  // Jan
      1: { income: 1.0, expense: 0.9 },   // Feb
      2: { income: 1.1, expense: 1.0 },   // Mar (FY end bonuses)
      3: { income: 1.0, expense: 0.95 },  // Apr
      4: { income: 1.0, expense: 0.9 },   // May
      5: { income: 1.0, expense: 0.95 },  // Jun
      6: { income: 1.0, expense: 1.0 },   // Jul
      7: { income: 1.0, expense: 1.05 },  // Aug (festivals begin)
      8: { income: 1.0, expense: 1.1 },   // Sep
      9: { income: 1.15, expense: 1.25 }, // Oct (Diwali/festivals)
      10: { income: 1.1, expense: 1.15 }, // Nov (festivals continue)
      11: { income: 1.05, expense: 1.1 }, // Dec (year end)
    };
    return factors[month] || { income: 1.0, expense: 1.0 };
  }

  static _calculateMonthsToGoal(goalAmount, currentSaved, monthlyContribution, annualReturn) {
    const monthlyRate = annualReturn / 12;
    let balance = currentSaved;
    let months = 0;

    while (balance < goalAmount && months < 600) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      months++;
    }

    return months;
  }

  static _calculateCorpusDepletion(corpus, annualExpense, inflationRate, startAge) {
    let remaining = corpus;
    let age = startAge;

    while (remaining > 0 && age < 120) {
      const expense = annualExpense * Math.pow(1 + inflationRate, age - startAge);
      remaining = remaining * 1.07 - expense;
      age++;
    }

    return age;
  }

  static _formatLargeNumber(num) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
    return `₹${num}`;
  }

  static _getRetirementRecommendations(projected, required, yearsLeft, monthlySavings) {
    const recommendations = [];

    if (projected >= required * 1.2) {
      recommendations.push({
        type: 'positive',
        message: 'You are well on track for retirement! Consider early retirement or lifestyle upgrades.',
        icon: '🎉',
      });
    } else if (projected >= required) {
      recommendations.push({
        type: 'positive',
        message: 'You are on track for retirement. Maintain your current savings rate.',
        icon: '✅',
      });
    } else {
      const deficit = required - projected;
      recommendations.push({
        type: 'warning',
        message: `You have a retirement shortfall of ${this._formatLargeNumber(deficit)}. Consider increasing savings.`,
        icon: '⚠️',
      });
    }

    if (yearsLeft > 20) {
      recommendations.push({
        type: 'info',
        message: 'With 20+ years to retirement, you can afford higher-risk investments for better returns.',
        icon: '📈',
      });
    }

    if (monthlySavings > 0 && monthlySavings / (monthlySavings + (required / (yearsLeft * 12) || 1)) < 0.2) {
      recommendations.push({
        type: 'action',
        message: 'Try to increase your savings rate to at least 20% of income.',
        icon: '💡',
      });
    }

    recommendations.push({
      type: 'tip',
      message: 'Max out tax-saving investments (Section 80C, 80D, NPS) to optimize taxes and grow wealth.',
      icon: '🏛️',
    });

    return recommendations;
  }
}

module.exports = FinancialForecastService;
