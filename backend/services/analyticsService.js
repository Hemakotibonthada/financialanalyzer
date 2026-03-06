const Analysis = require('../models/Analysis');
const Transaction = require('../models/Transaction');
const FinancialProfile = require('../models/FinancialProfile');
const EMI = require('../models/EMI');
const CreditCardBill = require('../models/CreditCardBill');
const Investment = require('../models/Investment');
const BillReminder = require('../models/BillReminder');
const LoanGiven = require('../models/LoanGiven');
const logger = require('../utils/logger');

/**
 * Advanced Financial Analytics Service
 * Generates comprehensive financial insights and chart data
 */
class AnalyticsService {
  
  /**
   * Generate comprehensive financial dashboard data
   */
  async generateDashboard(userId) {
    try {
      logger.info(`Generating dashboard for user ${userId}`);

      // Current month boundaries for comprehensive aggregation
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [
        profile,
        recentAnalyses,
        monthlyTrends,
        categoryBreakdown,
        spendingPatterns,
        budgetAnalysis,
        savingsGoals,
        recurringTransactions,
        financialHealth,
        monthlyIncomeData,
        // Comprehensive data from all models
        activeEMIs,
        currentMonthCCBills,
        paidBillReminders,
        activeInvestments,
        currentMonthInvestmentPurchases,
        loanRepayments,
        investmentDividends
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getRecentAnalyses(userId, 10),
        this.getMonthlyTrends(userId, 12),
        this.getCategoryBreakdown(userId, 6),
        this.getSpendingPatterns(userId),
        this.getBudgetAnalysis(userId),
        this.getSavingsGoals(userId),
        this.getRecurringTransactions(userId),
        this.calculateFinancialHealth(userId),
        this.getMonthlyIncome(userId),
        // EMI: active EMIs (monthly installment amounts count as spending)
        EMI.find({ userId, status: 'active' }).lean().catch(err => {
          logger.warn('Failed to fetch EMIs for dashboard:', err.message);
          return [];
        }),
        // Credit Card Bills: bills paid this month count as spending
        CreditCardBill.find({
          userId,
          paymentStatus: { $in: ['full_paid', 'partial_paid', 'minimum_paid'] },
          paymentDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).lean().catch(err => {
          logger.warn('Failed to fetch CC bills for dashboard:', err.message);
          return [];
        }),
        // Bill Reminders: paid this month count as spending
        BillReminder.find({
          userId,
          isPaid: true,
          paidDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).lean().catch(err => {
          logger.warn('Failed to fetch bill reminders for dashboard:', err.message);
          return [];
        }),
        // Investments: active investments for total portfolio value
        Investment.find({ userId, status: 'active' }).lean().catch(err => {
          logger.warn('Failed to fetch investments for dashboard:', err.message);
          return [];
        }),
        // Investments: purchases made this month
        Investment.find({
          userId,
          purchaseDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).lean().catch(err => {
          logger.warn('Failed to fetch investment purchases for dashboard:', err.message);
          return [];
        }),
        // Loan Given: repayments received this month (income)
        LoanGiven.find({
          userId,
          'repayments.date': { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).lean().catch(err => {
          logger.warn('Failed to fetch loan repayments for dashboard:', err.message);
          return [];
        }),
        // Investment dividends received this month (income)
        Investment.find({
          userId,
          'dividends.date': { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).lean().catch(err => {
          logger.warn('Failed to fetch investment dividends for dashboard:', err.message);
          return [];
        })
      ]);

      // --- Comprehensive Monthly Spending ---
      // Start with Transaction-based spending from getMonthlyTrends
      let comprehensiveSpending = monthlyTrends.currentMonth?.totalSpending || 0;

      // Add active EMI monthly installments
      const emiMonthlyTotal = activeEMIs.reduce((sum, emi) => {
        return sum + (emi.emiAmountInINR || emi.emiAmount || 0);
      }, 0);
      comprehensiveSpending += emiMonthlyTotal;

      // Add credit card bill payments made this month
      const ccBillTotal = currentMonthCCBills.reduce((sum, bill) => {
        return sum + (bill.amountPaid || 0);
      }, 0);
      comprehensiveSpending += ccBillTotal;

      // Add paid bill reminders this month
      const billReminderTotal = paidBillReminders.reduce((sum, bill) => {
        return sum + (bill.paidAmount || bill.amount || 0);
      }, 0);
      comprehensiveSpending += billReminderTotal;

      // --- Comprehensive Monthly Investments ---
      // Start with Transaction-based investments from getMonthlyTrends
      let comprehensiveInvestments = monthlyTrends.currentMonth?.totalInvestments || 0;

      // Add investment purchases made this month (avoid double counting with transactions)
      const investmentPurchaseTotal = currentMonthInvestmentPurchases.reduce((sum, inv) => {
        return sum + (inv.totalInvestedAmount || 0);
      }, 0);
      comprehensiveInvestments += investmentPurchaseTotal;

      // Add active SIP amounts (monthly recurring investments)
      const sipMonthlyTotal = activeInvestments
        .filter(inv => inv.isSIP && inv.sipAmount)
        .reduce((sum, inv) => sum + (inv.sipAmount || 0), 0);
      // Only add SIP if no investment purchases were found for this month (to avoid double counting)
      if (investmentPurchaseTotal === 0) {
        comprehensiveInvestments += sipMonthlyTotal;
      }

      // --- Comprehensive Monthly Income ---
      // Use the higher of: getMonthlyIncome (salary-focused) vs getMonthlyTrends totalIncome (all credits + profile)
      // getMonthlyTrends.totalIncome already includes: profile.monthlyIncome + non-salary credits
      // getMonthlyIncome returns: detected salary average OR profile.monthlyIncome
      const trendsIncome = monthlyTrends.currentMonth?.totalIncome || 0;
      const salaryIncome = monthlyIncomeData.amount || 0;
      // Use trends income as base since it includes all credit transactions + profile income
      // This avoids double-counting profile income which is already in trendsIncome
      let comprehensiveIncome = Math.max(trendsIncome, salaryIncome);

      // Add loan repayments received this month
      const loanRepaymentIncome = loanRepayments.reduce((sum, loan) => {
        const monthlyRepayments = (loan.repayments || []).filter(r => {
          const repDate = new Date(r.date);
          return repDate >= currentMonthStart && repDate <= currentMonthEnd;
        });
        return sum + monthlyRepayments.reduce((s, r) => s + (r.amountInINR || r.amount || 0), 0);
      }, 0);
      comprehensiveIncome += loanRepaymentIncome;

      // Add dividends received this month
      const dividendIncome = investmentDividends.reduce((sum, inv) => {
        const monthlyDividends = (inv.dividends || []).filter(d => {
          const divDate = new Date(d.date);
          return divDate >= currentMonthStart && divDate <= currentMonthEnd;
        });
        return sum + monthlyDividends.reduce((s, d) => s + (d.amount || 0), 0);
      }, 0);
      comprehensiveIncome += dividendIncome;

      logger.info(`Dashboard comprehensive data for user ${userId}: ` +
        `Spending: ₹${comprehensiveSpending} (Txn: ${monthlyTrends.currentMonth?.totalSpending || 0}, ` +
        `EMI: ${emiMonthlyTotal}, CC: ${ccBillTotal}, Bills: ${billReminderTotal}), ` +
        `Investments: ₹${comprehensiveInvestments} (Txn: ${monthlyTrends.currentMonth?.totalInvestments || 0}, ` +
        `Purchases: ${investmentPurchaseTotal}, SIP: ${sipMonthlyTotal}), ` +
        `Income: ₹${comprehensiveIncome} (TrendsIncome: ${trendsIncome}, Salary: ${salaryIncome}, ` +
        `LoanRepay: ${loanRepaymentIncome}, Dividends: ${dividendIncome})`
      );

      const dashboard = {
        profile,
        summary: {
          totalAnalyses: recentAnalyses.length,
          lastSyncDate: profile?.gmailSettings?.lastSync || null,
          financialHealthScore: financialHealth.score,
          // Comprehensive values from ALL sources
          monthlySpending: comprehensiveSpending,
          monthlyInvestments: comprehensiveInvestments,
          monthlyIncome: comprehensiveIncome,
          incomeSource: monthlyIncomeData.source,
          lastSalaryDate: monthlyIncomeData.lastSalaryDate,
          // Breakdown details for transparency
          spendingBreakdown: {
            transactions: monthlyTrends.currentMonth?.totalSpending || 0,
            emiPayments: emiMonthlyTotal,
            creditCardBills: ccBillTotal,
            billReminders: billReminderTotal
          },
          investmentBreakdown: {
            transactions: monthlyTrends.currentMonth?.totalInvestments || 0,
            newPurchases: investmentPurchaseTotal,
            sipContributions: sipMonthlyTotal
          },
          incomeBreakdown: {
            salary: salaryIncome,
            otherCredits: trendsIncome > salaryIncome ? trendsIncome - salaryIncome : 0,
            loanRepayments: loanRepaymentIncome,
            dividends: dividendIncome
          },
          // Additional portfolio info
          totalActiveEMIs: activeEMIs.length,
          totalActiveInvestments: activeInvestments.length,
          portfolioValue: activeInvestments.reduce((sum, inv) => sum + (inv.currentValue || inv.totalInvestedAmount || 0), 0)
        },
        charts: {
          monthlyTrends,
          categoryBreakdown,
          spendingPatterns,
          budgetAnalysis,
          financialHealth
        },
        insights: {
          recurringTransactions,
          savingsGoals,
          recommendations: await this.generateRecommendations(userId, financialHealth)
        },
        recentActivity: recentAnalyses
      };

      logger.info(`Dashboard generated successfully for user ${userId}`);
      return dashboard;

    } catch (error) {
      logger.error(`Error generating dashboard for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user financial profile
   */
  async getUserProfile(userId) {
    return await FinancialProfile.findOne({ userId }).lean();
  }

  /**
   * Get recent financial analyses
   */
  async getRecentAnalyses(userId, limit = 10) {
    return await Analysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Generate monthly spending trends for charts
   */
  async getMonthlyTrends(userId, monthsBack = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get profile for monthly income data
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlyIncome = profile?.monthlyIncome || 0;
    
    logger.info(`Monthly income from profile for user ${userId}: ${monthlyIncome}`);

    // Get all transactions directly from Transaction collection
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Group by month
    const monthlyData = {};
    
    // Initialize all months with profile income
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date(endDate);
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().substring(0, 7); // YYYY-MM
      
      monthlyData[month] = {
        month,
        totalSpending: 0,
        totalIncome: monthlyIncome, // Set default monthly income from profile
        totalInvestments: 0,
        transactionCount: 0,
        categories: {},
        hasTransactions: false // Track if month has any transactions
      };
    }

    // Helper to format a Date to local YYYY-MM and YYYY-MM-DD (avoid UTC ISO shifts)
    const formatLocalMonth = (d) => {
      const dt = new Date(d);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}`;
    };
    const formatLocalDay = (d) => {
      const dt = new Date(d);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    transactions.forEach(transaction => {
      const month = formatLocalMonth(transaction.date); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalSpending: 0,
          totalIncome: monthlyIncome, // Set default monthly income from profile
          totalInvestments: 0,
          transactionCount: 0,
          categories: {},
          hasTransactions: false
        };
      }

      // Mark this month as having real transaction data
      monthlyData[month].hasTransactions = true;

      // Investment category - count in BOTH spending and investments
      const category = transaction.category || transaction.ai_category || 'other';
      const isInvestment = category.toLowerCase() === 'investment';

      if (transaction.type === 'credit') {
        // For credits that look like salary, don't double count with profile income
        const isSalaryCredit = transaction.category?.toLowerCase().includes('salary') ||
                              transaction.ai_category?.toLowerCase().includes('salary') ||
                              transaction.description?.toLowerCase().includes('salary');
        
        if (!isSalaryCredit) {
          // Only add non-salary credits to income (since salary is from profile)
          monthlyData[month].totalIncome += Math.abs(transaction.amount || 0);
        }
      } else if (isInvestment) {
        // Investments count as both spending (money going out) and investments (asset building)
        const amount = Math.abs(transaction.amount || 0);
        monthlyData[month].totalInvestments += amount;
        monthlyData[month].totalSpending += amount; // Also add to spending
      } else {
        monthlyData[month].totalSpending += Math.abs(transaction.amount || 0);
      }
      
      monthlyData[month].transactionCount += 1;

      // Aggregate categories
      monthlyData[month].categories[category] = 
        (monthlyData[month].categories[category] || 0) + 1;
    });

  // Sort by month and fill gaps
  const sortedMonths = Object.keys(monthlyData).sort();
    const trends = [];
    
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (monthsBack - 1 - i));
  const monthKey = date.toISOString().substring(0, 7);
      
      trends.push(monthlyData[monthKey] || {
        month: monthKey,
        totalSpending: 0,
        totalIncome: 0,
        totalInvestments: 0,
        transactionCount: 0,
        categories: {}
      });
    }

    const validTrends = trends.filter(t => t.totalIncome > 0 || t.totalSpending > 0);
    
    // Build daily breakdown for the most recent month (endDate month) so frontend can render daily charts
    const currentMonthKey = formatLocalMonth(endDate); // YYYY-MM
    const dailyMap = {};
    try {
      const [year, month] = currentMonthKey.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      // initialize days
      for (let d = 1; d <= lastDay; d++) {
        const dayKey = `${currentMonthKey}-${String(d).padStart(2, '0')}`; // YYYY-MM-DD
        dailyMap[dayKey] = {
          date: dayKey,
          totalSpending: 0,
          totalIncome: 0,
          totalInvestments: 0,
          transactionCount: 0
        };
      }

      // Aggregate transactions into daily map
      transactions.forEach(transaction => {
        const tKey = formatLocalDay(transaction.date); // YYYY-MM-DD using local date
        if (!tKey.startsWith(currentMonthKey)) return; // only current month

        if (!dailyMap[tKey]) {
          dailyMap[tKey] = {
            date: tKey,
            totalSpending: 0,
            totalIncome: 0,
            totalInvestments: 0,
            transactionCount: 0
          };
        }

        const category = transaction.category || transaction.ai_category || 'other';
        const isInvestment = category.toLowerCase() === 'investment';

        if (transaction.type === 'credit') {
          const isSalaryCredit = (transaction.category || '').toLowerCase().includes('salary') ||
                                 (transaction.ai_category || '').toLowerCase().includes('salary') ||
                                 (transaction.description || '').toLowerCase().includes('salary');
          if (!isSalaryCredit) {
            dailyMap[tKey].totalIncome += Math.abs(transaction.amount || 0);
          }
        } else if (isInvestment) {
          const amount = Math.abs(transaction.amount || 0);
          dailyMap[tKey].totalInvestments += amount;
          dailyMap[tKey].totalSpending += amount;
        } else {
          dailyMap[tKey].totalSpending += Math.abs(transaction.amount || 0);
        }

          dailyMap[tKey].transactionCount += 1;
      });
    } catch (e) {
      // ignore daily breakdown errors; don't fail the whole request
      logger.warn('Failed to build daily breakdown for monthly trends:', e.message || e);
    }

    const dailyTrends = Object.keys(dailyMap).sort().map(k => dailyMap[k]);

    return {
      trends: validTrends, // Only include months with actual data
      currentMonth: validTrends[validTrends.length - 1] || { totalSpending: 0, totalIncome: 0, totalInvestments: 0 },
      previousMonth: validTrends[validTrends.length - 2] || { totalSpending: 0, totalIncome: 0, totalInvestments: 0 },
      summary: {
        totalMonths: validTrends.length,
        averageSpending: validTrends.length > 0 ? validTrends.reduce((sum, t) => sum + (t.totalSpending || 0), 0) / validTrends.length : 0,
        averageIncome: validTrends.length > 0 ? validTrends.reduce((sum, t) => sum + (t.totalIncome || 0), 0) / validTrends.length : 0,
        averageInvestments: validTrends.length > 0 ? validTrends.reduce((sum, t) => sum + (t.totalInvestments || 0), 0) / validTrends.length : 0,
        spendingTrend: this.calculateTrend(validTrends.map(t => t.totalSpending || 0)),
        incomeTrend: this.calculateTrend(validTrends.map(t => t.totalIncome || 0))
      }
      ,
      // include daily breakdown for the latest month so frontend can render daily charts when user selects a single month
      dailyTrends
    };
  }

  /**
   * Generate category breakdown for pie/donut charts
   */
  async getCategoryBreakdown(userId, monthsBack = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get transactions directly (now including all categories including investments)
    const transactions = await Transaction.find({
      userId,
      type: 'debit',
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const categoryTotals = {};
    let grandTotal = 0;

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount || 0);
      const category = transaction.category || transaction.ai_category || 'other';

      // Include all categories including investment
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      grandTotal += amount;
    });

    // Convert to chart format
    const chartData = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / grandTotal) * 100 * 100) / 100,
        color: this.getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      chartData,
      summary: {
        totalCategories: chartData.length,
        totalAmount: grandTotal,
        topCategory: chartData[0]?.category || 'No data',
        diversificationIndex: this.calculateDiversificationIndex(chartData)
      }
    };
  }

  /**
   * Analyze spending patterns and habits
   */
  async getSpendingPatterns(userId) {
    const analyses = await Analysis.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
    }).lean();

    // Analyze by day of week
    const dayOfWeekSpending = Array(7).fill(0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Analyze by time of day (if available)
    const hourlySpending = Array(24).fill(0);
    
    // Analyze by merchant types
    const merchantTypes = {};
    
    analyses.forEach(analysis => {
      const date = new Date(analysis.createdAt);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      dayOfWeekSpending[dayOfWeek] += (analysis.results?.totalAmount || 0);
      hourlySpending[hour] += (analysis.results?.totalAmount || 0);

      // Merchant analysis (from metadata if available)
      if (analysis.metadata && analysis.metadata.emailMetadata) {
        const sender = analysis.metadata.emailMetadata.from;
        const merchantType = this.classifyMerchant(sender);
        merchantTypes[merchantType] = (merchantTypes[merchantType] || 0) + 1;
      }
    });

    return {
      dayOfWeek: {
        data: dayOfWeekSpending.map((amount, index) => ({
          day: dayNames[index],
          amount,
          dayIndex: index
        })),
        peakDay: dayNames[dayOfWeekSpending.indexOf(Math.max(...dayOfWeekSpending))],
        weekdayTotal: dayOfWeekSpending.slice(1, 6).reduce((a, b) => a + b, 0),
        weekendTotal: dayOfWeekSpending[0] + dayOfWeekSpending[6]
      },
      hourly: {
        data: hourlySpending.map((amount, hour) => ({ hour, amount })),
        peakHour: hourlySpending.indexOf(Math.max(...hourlySpending))
      },
      merchants: Object.entries(merchantTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Generate budget analysis and tracking
   */
  async getBudgetAnalysis(userId) {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlySpending = await this.getMonthlyTrends(userId, 1);
    
    if (!profile || !profile.budgetLimits || Object.keys(profile.budgetLimits).length === 0) {
      return {
        hasBudget: false,
        message: 'No budget set',
        recommendation: 'Set monthly budget limits for better financial tracking'
      };
    }

    const currentSpending = monthlySpending.currentMonth?.totalSpending || 0;
    const budgetCategories = [];
    let totalBudget = 0;
    let totalSpent = 0;

    // Analyze by category budgets
    const categoryPromises = [];
    const entries = Object.entries(profile.budgetLimits);
    
    for (const [category, limit] of entries) {
      categoryPromises.push(
        this.getCategorySpending(userId, category, 1).then(categorySpending => {
          totalBudget += limit;
          totalSpent += categorySpending;

          return {
            category,
            budget: limit,
            spent: categorySpending,
            remaining: limit - categorySpending,
            percentUsed: Math.round((categorySpending / limit) * 100),
            status: this.getBudgetStatus(categorySpending, limit)
          };
        })
      );
    }

    const budgetCategoriesResult = await Promise.all(categoryPromises);
    budgetCategories.push(...budgetCategoriesResult);

    return {
      hasBudget: true,
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      overallStatus: this.getBudgetStatus(totalSpent, totalBudget),
      categories: budgetCategories.sort((a, b) => b.percentUsed - a.percentUsed),
      projectedMonthEnd: this.projectMonthEndSpending(currentSpending),
      alerts: this.generateBudgetAlerts(budgetCategories)
    };
  }

  /**
   * Track savings goals progress
   */
  async getSavingsGoals(userId) {
    const profile = await FinancialProfile.findOne({ userId }).lean();
    const monthlyTrends = await this.getMonthlyTrends(userId, 12);
    
    if (!profile || !profile.savingsGoals || profile.savingsGoals.length === 0) {
      return {
        hasGoals: false,
        recommendation: 'Set savings goals to track your financial progress'
      };
    }

    const avgMonthlySavings = this.calculateAverageSavings(monthlyTrends.trends);
    
    const goalsProgress = profile.savingsGoals.map(goal => {
      const monthsToGoal = goal.targetDate ? 
        Math.max(0, (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : null;
      
      const requiredMonthlySavings = monthsToGoal ? 
        (goal.targetAmount - goal.currentAmount) / monthsToGoal : null;

      return {
        ...goal,
        progressPercentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
        monthsRemaining: monthsToGoal,
        requiredMonthlySavings,
        onTrack: requiredMonthlySavings ? avgMonthlySavings >= requiredMonthlySavings : null,
        projectedCompletionDate: this.projectGoalCompletion(goal, avgMonthlySavings)
      };
    });

    return {
      hasGoals: true,
      goals: goalsProgress,
      totalTargetAmount: profile.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: profile.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
      avgMonthlySavings,
      recommendations: this.generateSavingsRecommendations(goalsProgress, avgMonthlySavings)
    };
  }

  /**
   * Identify recurring transactions and subscriptions
   */
  async getRecurringTransactions(userId) {
    const analyses = await Analysis.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } // Last 6 months
    }).lean();

    // Group similar transactions
    const transactionGroups = {};
    
    analyses.forEach(analysis => {
      if (analysis.results && analysis.results.categories) {
        const amount = analysis.results?.totalAmount || 0;
        const category = analysis.results.categories[0]; // Primary category
        const date = new Date(analysis.createdAt);
        
        // Create grouping key based on amount and category
        const key = `${category}_${Math.round(amount)}`;
        
        if (!transactionGroups[key]) {
          transactionGroups[key] = {
            category,
            amount,
            occurrences: [],
            description: `${category} - $${amount}`
          };
        }
        
        transactionGroups[key].occurrences.push(date);
      }
    });

    // Identify recurring patterns
    const recurringTransactions = [];
    
    Object.values(transactionGroups).forEach(group => {
      if (group.occurrences.length >= 3) { // At least 3 occurrences
        group.occurrences.sort((a, b) => a - b);
        
        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < group.occurrences.length; i++) {
          const days = Math.round((group.occurrences[i] - group.occurrences[i-1]) / (1000 * 60 * 60 * 24));
          intervals.push(days);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = this.calculateVariance(intervals);
        
        // Consider it recurring if interval variance is low
        if (intervalVariance < 10) { // Less than 10 days variance
          recurringTransactions.push({
            ...group,
            frequency: this.determineFrequency(avgInterval),
            avgInterval: Math.round(avgInterval),
            reliability: Math.max(0, 100 - intervalVariance * 2), // Reliability score
            nextExpectedDate: new Date(group.occurrences[group.occurrences.length - 1].getTime() + avgInterval * 24 * 60 * 60 * 1000),
            monthlyImpact: this.calculateMonthlyImpact(group.amount, avgInterval)
          });
        }
      }
    });

    return recurringTransactions.sort((a, b) => b.monthlyImpact - a.monthlyImpact);
  }

  /**
   * Calculate financial health score
   */
  async calculateFinancialHealth(userId) {
    try {
      const profile = await FinancialProfile.findOne({ userId }).lean();
      const monthlyTrends = await this.getMonthlyTrends(userId, 6);
      const budgetAnalysis = await this.getBudgetAnalysis(userId);
      const monthlyIncomeData = await this.getMonthlyIncome(userId);
      
      logger.info(`📊 Calculating health for user ${userId}:`, {
        income: monthlyIncomeData.amount,
        trendCount: monthlyTrends.trends?.length,
        budgetStatus: budgetAnalysis.status
      });
      
      let score = 0;
      const factors = [];

      // Income stability (25 points)
      const incomeStability = this.assessIncomeStability(monthlyTrends.trends, monthlyIncomeData.amount);
      score += incomeStability.score;
      factors.push(incomeStability);
      logger.info(`  💰 Income Stability: ${incomeStability.score} points`);

      // Spending discipline (25 points)
      const spendingDiscipline = this.assessSpendingDiscipline(budgetAnalysis, monthlyTrends);
      score += spendingDiscipline.score;
      factors.push(spendingDiscipline);
      logger.info(`  📊 Spending Discipline: ${spendingDiscipline.score} points`);

      // Savings rate (25 points)
      const savingsRate = this.assessSavingsRate(monthlyTrends.trends, monthlyIncomeData.amount);
      score += savingsRate.score;
      factors.push(savingsRate);
      logger.info(`  💵 Savings Rate: ${savingsRate.score} points`);

      // Financial awareness & tracking (25 points)
      const awareness = this.assessFinancialAwareness(userId, profile, monthlyTrends);
      score += awareness.score;
      factors.push(awareness);
      logger.info(`  📱 Financial Awareness: ${awareness.score} points`);

      // EMI burden assessment (deducts from score if high) - NEW
      const emiBurden = await this.assessEMIBurden(userId, monthlyIncomeData.amount);
      score += emiBurden.score; // Can be negative if burden is too high
      factors.push(emiBurden);
      logger.info(`  💳 EMI Burden: ${emiBurden.score} points`);

      // Ensure score is between 0 and 100
      const finalScore = Math.min(100, Math.max(0, Math.round(score)));
      logger.info(`  ✅ Final Health Score: ${finalScore}/100 (Grade ${this.getHealthGrade(finalScore)})`);

      return {
        score: finalScore,
        grade: this.getHealthGrade(finalScore),
        factors,
        recommendations: this.generateHealthRecommendations(factors, finalScore)
      };
    } catch (error) {
      logger.error(`Error calculating financial health for user ${userId}:`, error);
      // Return default health data
      return {
        score: 50,
        grade: 'C',
        factors: [
          { factor: 'Income Stability', score: 12, description: 'Unable to calculate - insufficient data' },
          { factor: 'Spending Discipline', score: 12, description: 'Unable to calculate - insufficient data' },
          { factor: 'Savings Rate', score: 13, description: 'Unable to calculate - insufficient data' },
          { factor: 'Financial Awareness', score: 13, description: 'Active financial tracking' }
        ],
        recommendations: ['Continue tracking your finances regularly', 'Set up budget categories for better insights']
      };
    }
  }

  /**
   * Generate personalized financial recommendations
   */
  async generateRecommendations(userId, financialHealth) {
    const recommendations = [];
    
    // Based on financial health score
    if (financialHealth.score < 50) {
      recommendations.push({
        type: 'urgent',
        title: 'Improve Financial Health',
        description: 'Focus on budgeting and reducing unnecessary expenses',
        priority: 'high',
        action: 'Create and follow a monthly budget'
      });
    }

    // Budget-based recommendations
    const budgetAnalysis = await this.getBudgetAnalysis(userId);
    if (budgetAnalysis.hasBudget && budgetAnalysis.overallStatus === 'over') {
      recommendations.push({
        type: 'budget',
        title: 'Budget Exceeded',
        description: `You've exceeded your budget by $${Math.abs(budgetAnalysis.totalRemaining)}`,
        priority: 'high',
        action: 'Review and adjust spending categories'
      });
    }

    // Savings recommendations
    const savingsGoals = await this.getSavingsGoals(userId);
    if (savingsGoals.hasGoals) {
      const offTrackGoals = savingsGoals.goals.filter(g => g.onTrack === false);
      if (offTrackGoals.length > 0) {
        recommendations.push({
          type: 'savings',
          title: 'Savings Goals Behind Schedule',
          description: `${offTrackGoals.length} savings goals are behind schedule`,
          priority: 'medium',
          action: 'Increase monthly savings or adjust goal timelines'
        });
      }
    }

    // Recurring transaction insights
    const recurringTransactions = await this.getRecurringTransactions(userId);
    const highImpactSubscriptions = recurringTransactions.filter(t => t.monthlyImpact > 100);
    if (highImpactSubscriptions.length > 0) {
      recommendations.push({
        type: 'subscriptions',
        title: 'Review High-Cost Subscriptions',
        description: `You have ${highImpactSubscriptions.length} recurring charges over $100/month`,
        priority: 'medium',
        action: 'Review and cancel unused subscriptions'
      });
    }

    return recommendations;
  }

  // Helper methods
  calculateTrend(values) {
    if (values.length < 2) return 0;
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    return recent - older;
  }

  getCategoryColor(category) {
    const colors = {
      'Food & Dining': '#FF6B6B',
      'Transportation': '#4ECDC4',
      'Shopping': '#45B7D1',
      'Entertainment': '#96CEB4',
      'Utilities': '#FFEAA7',
      'Healthcare': '#DDA0DD',
      'Education': '#98D8C8',
      'Insurance': '#F7DC6F',
      'Investment': '#BB8FCE',
      'Rent': '#85C1E9',
      'EMI': '#FF8C94',
      'Loan': '#FFA07A',
      'Groceries': '#90EE90',
      'Bills': '#FFB6C1',
      'Travel': '#87CEEB',
      'Fuel': '#FFD700',
      'Subscriptions': '#DDA0DD',
      'Other': '#BDC3C7'
    };
    return colors[category] || '#BDC3C7';
  }

  calculateDiversificationIndex(chartData) {
    if (chartData.length === 0) return 0;
    // Shannon diversity index adapted for financial categories
    const total = chartData.reduce((sum, item) => sum + item.amount, 0);
    let diversity = 0;
    
    chartData.forEach(item => {
      const proportion = item.amount / total;
      if (proportion > 0) {
        diversity -= proportion * Math.log2(proportion);
      }
    });
    
    return Math.round(diversity * 100) / 100;
  }

  classifyMerchant(email) {
    const domain = email.toLowerCase();
    if (domain.includes('amazon') || domain.includes('flipkart')) return 'E-commerce';
    if (domain.includes('bank') || domain.includes('hdfc') || domain.includes('sbi')) return 'Banking';
    if (domain.includes('swiggy') || domain.includes('zomato')) return 'Food Delivery';
    if (domain.includes('uber') || domain.includes('ola')) return 'Transportation';
    if (domain.includes('netflix') || domain.includes('spotify')) return 'Entertainment';
    return 'Other';
  }

  getBudgetStatus(spent, budget) {
    const percentage = (spent / budget) * 100;
    if (percentage <= 70) return 'good';
    if (percentage <= 90) return 'warning';
    if (percentage <= 100) return 'critical';
    return 'over';
  }

  async getCategorySpending(userId, category, monthsBack) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const transactions = await Transaction.find({
      userId,
      type: 'debit',
      date: { $gte: startDate, $lte: endDate },
      $or: [
        { category: category },
        { ai_category: category }
      ]
    }).lean();

    return transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount || 0), 0);
  }

  projectMonthEndSpending(currentSpending) {
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const daysPassed = currentDate.getDate();
    
    return Math.round((currentSpending / daysPassed) * daysInMonth);
  }

  generateBudgetAlerts(budgetCategories) {
    return budgetCategories
      .filter(cat => cat.status === 'critical' || cat.status === 'over')
      .map(cat => ({
        category: cat.category,
        message: cat.status === 'over' ? 
          `Budget exceeded by $${Math.abs(cat.remaining)}` : 
          `Approaching budget limit (${cat.percentUsed}% used)`,
        severity: cat.status
      }));
  }

  calculateAverageSavings(monthlyTrends) {
    const savingsData = monthlyTrends.map(month => 
      Math.max(0, month.totalIncome - month.totalSpending)
    );
    return savingsData.reduce((sum, savings) => sum + savings, 0) / savingsData.length;
  }

  projectGoalCompletion(goal, avgMonthlySavings) {
    if (avgMonthlySavings <= 0) return null;
    
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const monthsToComplete = Math.ceil(remainingAmount / avgMonthlySavings);
    
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToComplete);
    
    return completionDate;
  }

  generateSavingsRecommendations(goals, avgMonthlySavings) {
    const recommendations = [];
    
    const behindGoals = goals.filter(g => g.onTrack === false);
    if (behindGoals.length > 0) {
      recommendations.push('Increase monthly savings to stay on track with your goals');
    }
    
    if (avgMonthlySavings < 500) {
      recommendations.push('Aim to save at least $500 per month for financial security');
    }
    
    const shortTermGoals = goals.filter(g => g.monthsRemaining && g.monthsRemaining < 12);
    if (shortTermGoals.length > 0) {
      recommendations.push('Focus on short-term goals that are achievable within a year');
    }
    
    return recommendations;
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  determineFrequency(avgInterval) {
    if (avgInterval <= 7) return 'Weekly';
    if (avgInterval <= 35) return 'Monthly';
    if (avgInterval <= 95) return 'Quarterly';
    return 'Irregular';
  }

  calculateMonthlyImpact(amount, intervalDays) {
    return Math.round((amount * 30) / intervalDays);
  }

  assessIncomeStability(trends, monthlyIncome = 0) {
    const incomes = trends.map(t => t.totalIncome).filter(i => i > 0);
    
    // If we have profile income but no transaction incomes, use profile income
    if (incomes.length === 0 && monthlyIncome > 0) {
      return { 
        factor: 'Income Stability', 
        score: 20, 
        description: `Monthly income: ₹${Math.round(monthlyIncome).toLocaleString('en-IN')}`
      };
    }
    
    if (incomes.length < 2) {
      return { 
        factor: 'Income Stability', 
        score: 15, 
        description: 'Limited income history - continue tracking'
      };
    }
    
    const variance = this.calculateVariance(incomes);
    const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    let score = 25;
    let description = 'Very stable income';
    
    if (coefficientOfVariation > 0.5) {
      score = 10;
      description = 'High income variability - consider stabilizing income sources';
    } else if (coefficientOfVariation > 0.3) {
      score = 15;
      description = 'Moderate income fluctuations';
    } else if (coefficientOfVariation > 0.15) {
      score = 20;
      description = 'Fairly stable income with minor fluctuations';
    }
    
    return {
      factor: 'Income Stability',
      score,
      description: `${description} (CV: ${(coefficientOfVariation * 100).toFixed(1)}%)`
    };
  }

  assessSpendingDiscipline(budgetAnalysis, monthlyTrends) {
    if (!budgetAnalysis.hasBudget) {
      // Give partial credit if spending is consistent even without budget
      const expenses = monthlyTrends.trends.map(t => t.totalSpending).filter(e => e > 0);
      if (expenses.length >= 3) {
        const variance = this.calculateVariance(expenses);
        const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length;
        const cv = Math.sqrt(variance) / mean;
        
        if (cv < 0.2) {
          return { 
            factor: 'Spending Discipline', 
            score: 18, 
            description: 'Consistent spending pattern - set budgets for better control'
          };
        }
      }
      
      return { 
        factor: 'Spending Discipline', 
        score: 12, 
        description: 'Set monthly budgets to improve spending control'
      };
    }
    
    let score = 25;
    let description = 'Excellent budget adherence';
    
    if (budgetAnalysis.overallStatus === 'over') {
      score = 8;
      description = 'Over budget - review and cut unnecessary expenses';
    } else if (budgetAnalysis.overallStatus === 'critical') {
      score = 15;
      description = 'Near budget limit - careful monitoring needed';
    } else if (budgetAnalysis.overallStatus === 'warning') {
      score = 20;
      description = 'Good budget adherence - watch for overspending';
    }
    
    // Bonus points for having multiple budget categories
    const categoryCount = budgetAnalysis.categories?.length || 0;
    if (categoryCount >= 5 && score >= 20) {
      score = Math.min(25, score + 2);
      description += ' with detailed category tracking';
    }
    
    return {
      factor: 'Spending Discipline',
      score,
      description
    };
  }

  assessSavingsRate(trends, monthlyIncome = 0) {
    // Calculate savings rate from trends (including investments as savings)
    const recentTrends = trends.slice(-3); // Last 3 months
    let totalIncome = 0;
    let totalSpending = 0;
    let totalInvestments = 0;
    
    recentTrends.forEach(t => {
      totalIncome += t.totalIncome;
      totalSpending += t.totalSpending;
      totalInvestments += (t.totalInvestments || 0);
    });
    
    // If no income in transactions, use profile income
    if (totalIncome === 0 && monthlyIncome > 0) {
      totalIncome = monthlyIncome * recentTrends.length;
    }
    
    if (totalIncome === 0) {
      return { 
        factor: 'Savings Rate', 
        score: 10, 
        description: 'Track income to calculate savings rate'
      };
    }
    
    // Savings = Income - Spending + Investments (investments are treated as savings)
    const totalSavings = totalIncome - totalSpending + totalInvestments;
    const savingsRate = Math.max(0, totalSavings / totalIncome);
    
    let score = 5;
    let description = 'Very low savings - aim for at least 10%';
    
    if (savingsRate >= 0.5) {
      score = 25;
      description = `Exceptional ${Math.round(savingsRate * 100)}% savings rate!`;
    } else if (savingsRate >= 0.3) {
      score = 23;
      description = `Excellent ${Math.round(savingsRate * 100)}% savings discipline`;
    } else if (savingsRate >= 0.2) {
      score = 20;
      description = `Great ${Math.round(savingsRate * 100)}% savings rate - keep it up!`;
    } else if (savingsRate >= 0.15) {
      score = 17;
      description = `Good ${Math.round(savingsRate * 100)}% savings habit`;
    } else if (savingsRate >= 0.1) {
      score = 14;
      description = `Acceptable ${Math.round(savingsRate * 100)}% savings - try to increase`;
    } else if (savingsRate >= 0.05) {
      score = 10;
      description = `Low ${Math.round(savingsRate * 100)}% savings rate - increase to 20%`;
    }
    
    if (totalInvestments > 0) {
      description += ` (includes ₹${totalInvestments.toFixed(0)} in investments)`;
    }
    
    return {
      factor: 'Savings Rate',
      score,
      description: `${description} (${Math.round(savingsRate * 100)}%)`
    };
  }

  assessFinancialAwareness(userId, profile, monthlyTrends) {
    let score = 0;
    const indicators = [];
    
    // Has budget set (5 points)
    if (profile?.budgetLimits && profile.budgetLimits.size > 0) {
      score += 5;
      indicators.push('budgets');
    }
    
    // Has savings goal (5 points)
    if (profile?.savingsGoal?.amount > 0) {
      score += 5;
      indicators.push('savings goals');
    }
    
    // Regular transaction tracking (5 points)
    const recentMonthsWithData = monthlyTrends.trends.slice(-3).filter(t => t.transactionCount > 0).length;
    if (recentMonthsWithData >= 2) {
      score += 5;
      indicators.push('active tracking');
    }
    
    // Multiple transaction categories (5 points)
    const uniqueCategories = new Set();
    monthlyTrends.trends.forEach(t => {
      Object.keys(t.categories || {}).forEach(cat => uniqueCategories.add(cat));
    });
    if (uniqueCategories.size >= 3) {
      score += 5;
      indicators.push('categorized spending');
    }
    
    // Has profile information (5 points)
    if (profile?.currency && profile?.name) {
      score += 5;
      indicators.push('complete profile');
    }
    
    const description = indicators.length > 0 
      ? `Good financial awareness: ${indicators.join(', ')}`
      : 'Set up budgets and goals to improve awareness';
    
    return {
      factor: 'Financial Awareness',
      score: Math.max(10, score), // Minimum 10 points for using the app
      description
    };
  }

  async assessEMIBurden(userId, monthlyIncome) {
    try {
      const activeEMIs = await EMI.find({ 
        userId, 
        status: 'active',
        remainingInstallments: { $gt: 0 }
      });

      if (activeEMIs.length === 0) {
        return {
          factor: 'EMI Burden',
          score: 5, // Bonus points for debt-free
          description: '🎉 No active EMIs - Debt-free!'
        };
      }

      const monthlyEMIBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      const emiCount = activeEMIs.length;
      
      if (!monthlyIncome || monthlyIncome === 0) {
        return {
          factor: 'EMI Burden',
          score: 0,
          description: `${emiCount} active EMIs totaling ₹${monthlyEMIBurden.toLocaleString()}/month (set income to see impact)`
        };
      }

      const emiBurdenRatio = monthlyEMIBurden / monthlyIncome;
      const burdenPercentage = Math.round(emiBurdenRatio * 100);

      let score = 0;
      let status = '';

      if (emiBurdenRatio < 0.15) {
        score = 5; // Bonus points
        status = '✅ Excellent';
      } else if (emiBurdenRatio < 0.25) {
        score = 0; // Neutral
        status = '👍 Good';
      } else if (emiBurdenRatio < 0.40) {
        score = -5; // Penalty
        status = '⚠️ Moderate';
      } else {
        score = -10; // Heavy penalty
        status = '🚨 High burden';
      }

      return {
        factor: 'EMI Burden',
        score,
        description: `${status} - ${emiCount} active EMIs, ₹${monthlyEMIBurden.toLocaleString()}/month (${burdenPercentage}% of income)`
      };
    } catch (error) {
      logger.error('Error assessing EMI burden:', error);
      return {
        factor: 'EMI Burden',
        score: 0,
        description: 'Unable to calculate EMI burden'
      };
    }
  }

  getHealthGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  generateHealthRecommendations(factors, overallScore) {
    const recommendations = [];
    
    // Score-based recommendations
    if (overallScore < 40) {
      recommendations.push('🚨 Critical: Immediate action needed - Review your financial situation carefully');
    } else if (overallScore < 60) {
      recommendations.push('⚠️ Focus on improving key financial habits for better health');
    } else if (overallScore < 80) {
      recommendations.push('👍 Good progress! Small improvements can boost your score significantly');
    } else {
      recommendations.push('🌟 Excellent financial health! Maintain your current habits');
    }
    
    // Factor-specific recommendations
    factors.forEach(factor => {
      if (factor.score < 15) {
        switch (factor.factor) {
          case 'Income Stability':
            recommendations.push('💰 Stabilize income: Consider diversifying income sources or negotiating steady contracts');
            break;
          case 'Spending Discipline':
            recommendations.push('📊 Create detailed monthly budgets for each expense category');
            break;
          case 'Savings Rate':
            recommendations.push('💵 Target 20% savings rate - automate savings transfers on payday');
            break;
          case 'Financial Awareness':
            recommendations.push('📱 Set up budgets, goals, and track transactions regularly');
            break;
          case 'EMI Burden':
            if (factor.description.includes('High burden') || factor.description.includes('Moderate')) {
              recommendations.push('💳 Reduce EMI burden: Consider foreclosing high-interest EMIs or avoid new loans');
            }
            break;
        }
      } else if (factor.score < 20) {
        switch (factor.factor) {
          case 'Savings Rate':
            recommendations.push('💪 Increase your savings rate to 25-30% for long-term wealth building');
            break;
          case 'Spending Discipline':
            recommendations.push('🎯 Fine-tune your budget - eliminate one unnecessary subscription this month');
            break;
        }
      }
      
      // Special case for negative EMI scores
      if (factor.factor === 'EMI Burden' && factor.score < 0) {
        recommendations.push('🚨 EMI Alert: Your EMI burden is impacting financial health - prioritize paying off high-interest EMIs');
      }
    });
    
    // Always add actionable tips
    if (recommendations.length < 3) {
      recommendations.push('📈 Track all expenses for better insights into spending patterns');
      recommendations.push('🎯 Set specific financial goals with deadlines');
    }
    
    return recommendations;
  }

  /**
   * Calculate and update monthly income from salary transactions or profile
   * Priority: 1) Most recent salary transaction, 2) Average of recent salary transactions, 3) Profile setting
   */
  async getMonthlyIncome(userId) {
    try {
      const profile = await FinancialProfile.findOne({ userId });
      
      // Check for salary transactions in the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const salaryTransactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo },
        $or: [
          { category: 'Salary' },
          { category: 'salary' },
          { ai_category: 'Salary' },
          { ai_category: 'salary' },
          { 
            description: { 
              $regex: /salary|payslip|payroll|wage|income from employment|pay credit/i 
            }
          }
        ]
      }).sort({ date: -1 }).lean();

      if (salaryTransactions.length > 0) {
        // Use the LATEST salary transaction amount (reflects most recent salary/raise)
        const latestSalary = Math.abs(salaryTransactions[0].amount);
        // Also compute average for comparison
        const salaryAmounts = salaryTransactions.map(t => Math.abs(t.amount));
        const averageSalary = salaryAmounts.reduce((sum, amt) => sum + amt, 0) / salaryAmounts.length;
        
        // Use latest salary as the primary value (captures raises), round to nearest 100
        const calculatedIncome = Math.round(latestSalary / 100) * 100;
        
        // DO NOT auto-update profile monthlyIncome from email/transaction data.
        // Income should only be set manually by the user in Profile settings.
        // This prevents incorrect values from promotional emails or misclassified transactions.
        
        return {
          amount: calculatedIncome,
          source: 'salary-transactions',
          transactionCount: salaryTransactions.length,
          lastSalaryDate: salaryTransactions[0].date
        };
      }

      // Fall back to profile setting
      if (profile && profile.monthlyIncome) {
        return {
          amount: profile.monthlyIncome,
          source: 'profile-setting',
          transactionCount: 0,
          lastSalaryDate: null
        };
      }

      // No income data available
      return {
        amount: 0,
        source: 'not-set',
        transactionCount: 0,
        lastSalaryDate: null
      };

    } catch (error) {
      logger.error('Error calculating monthly income:', error);
      return {
        amount: 0,
        source: 'error',
        transactionCount: 0,
        lastSalaryDate: null
      };
    }
  }
}

module.exports = new AnalyticsService();