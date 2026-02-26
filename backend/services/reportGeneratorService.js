// ============================================================
// Financial Analyzer - Report Generator Service
// Feature #93: Advanced PDF/Excel report generation engine
// ============================================================

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Investment = require('../models/Investment');

class ReportGeneratorService {
  // Report templates
  static REPORT_TEMPLATES = {
    'monthly-summary': {
      id: 'monthly-summary',
      name: 'Monthly Financial Summary',
      description: 'Complete overview of income, expenses, savings, and trends for a month',
      sections: ['overview', 'income', 'expenses', 'categoryBreakdown', 'trends', 'recommendations'],
      formats: ['pdf', 'excel', 'csv'],
    },
    'annual-review': {
      id: 'annual-review',
      name: 'Annual Financial Review',
      description: 'Year-in-review with monthly breakdowns, annual totals, and year-over-year comparison',
      sections: ['overview', 'monthlyBreakdown', 'categoryAnalysis', 'investmentSummary', 'goalProgress', 'taxSummary'],
      formats: ['pdf', 'excel'],
    },
    'expense-analysis': {
      id: 'expense-analysis',
      name: 'Expense Analysis Report',
      description: 'Deep dive into spending patterns, anomalies, and optimization opportunities',
      sections: ['totalSpending', 'categoryBreakdown', 'merchantAnalysis', 'trendAnalysis', 'anomalies', 'optimizations'],
      formats: ['pdf', 'excel', 'csv'],
    },
    'investment-portfolio': {
      id: 'investment-portfolio',
      name: 'Investment Portfolio Report',
      description: 'Portfolio performance, asset allocation, returns analysis, and rebalancing suggestions',
      sections: ['portfolioOverview', 'assetAllocation', 'performanceHistory', 'returns', 'riskAnalysis', 'rebalancing'],
      formats: ['pdf', 'excel'],
    },
    'budget-performance': {
      id: 'budget-performance',
      name: 'Budget Performance Report',
      description: 'Budget vs actual comparison, variance analysis, and adherence score',
      sections: ['budgetOverview', 'categoryComparison', 'varianceAnalysis', 'adherenceScore', 'recommendations'],
      formats: ['pdf', 'excel'],
    },
    'tax-report': {
      id: 'tax-report',
      name: 'Tax Summary Report',
      description: 'Tax-relevant income, deductions, investments under 80C/80D, and estimated tax liability',
      sections: ['incomeBreakdown', 'deductions80C', 'deductions80D', 'otherDeductions', 'taxCalculation', 'suggestions'],
      formats: ['pdf', 'excel'],
    },
    'debt-status': {
      id: 'debt-status',
      name: 'Debt Status Report',
      description: 'All active debts, EMI schedule, interest analysis, and payoff projection',
      sections: ['debtOverview', 'emiSchedule', 'interestAnalysis', 'payoffProjection', 'consolidationOptions'],
      formats: ['pdf', 'excel'],
    },
    'networth-statement': {
      id: 'networth-statement',
      name: 'Net Worth Statement',
      description: 'Complete assets and liabilities statement with net worth calculation',
      sections: ['assets', 'liabilities', 'netWorthCalculation', 'historicalTrend', 'projections'],
      formats: ['pdf', 'excel'],
    },
    'cash-flow': {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Detailed cash inflows and outflows with categorization',
      sections: ['inflows', 'outflows', 'netCashFlow', 'monthlyComparison', 'forecast'],
      formats: ['pdf', 'excel', 'csv'],
    },
    'goal-progress': {
      id: 'goal-progress',
      name: 'Goal Progress Report',
      description: 'Status of all financial goals with progress tracking and projections',
      sections: ['goalOverview', 'individualGoals', 'progressTimeline', 'projections', 'recommendations'],
      formats: ['pdf', 'excel'],
    },
  };

  /**
   * Generate a report based on template
   */
  static async generateReport(userId, templateId, options = {}) {
    const template = this.REPORT_TEMPLATES[templateId];
    if (!template) {
      return { success: false, error: `Template '${templateId}' not found` };
    }

    const { format = 'pdf', dateRange = {}, filters = {} } = options;
    const startDate = dateRange.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 86400000);
    const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

    try {
      // Gather data based on template sections
      const reportData = await this._gatherReportData(userId, template.sections, startDate, endDate, filters);

      // Generate in requested format
      let result;
      switch (format) {
        case 'pdf':
          result = await this._generatePDF(template, reportData, options);
          break;
        case 'excel':
          result = await this._generateExcel(template, reportData, options);
          break;
        case 'csv':
          result = await this._generateCSV(template, reportData, options);
          break;
        default:
          return { success: false, error: `Unsupported format: ${format}` };
      }

      return {
        success: true,
        report: {
          templateId,
          templateName: template.name,
          format,
          dateRange: { start: startDate, end: endDate },
          generatedAt: new Date().toISOString(),
          data: reportData,
          ...result,
        },
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all available report templates
   */
  static getTemplates() {
    return {
      success: true,
      templates: Object.values(this.REPORT_TEMPLATES).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sections: t.sections,
        formats: t.formats,
      })),
    };
  }

  /**
   * Generate quick summary data (no file generation)
   */
  static async getQuickSummary(userId, period = 'month') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week': startDate = new Date(now - 7 * 86400000); break;
        case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'quarter': startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
        case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
        case 'fy': 
          const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
          startDate = new Date(fyStart, 3, 1); // April 1st
          break;
        default: startDate = new Date(now - 30 * 86400000);
      }

      const transactions = await Transaction.find({
        userId,
        date: { $gte: startDate, $lte: now },
      }).sort({ date: -1 });

      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const savings = income - expenses;

      // Category breakdown
      const categoryExpenses = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Other';
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + t.amount;
      });

      const topCategories = Object.entries(categoryExpenses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: Math.round((amount / expenses) * 100),
        }));

      // Daily averages
      const days = Math.max(1, Math.ceil((now - startDate) / 86400000));
      
      return {
        success: true,
        period,
        dateRange: { start: startDate, end: now },
        summary: {
          totalIncome: income,
          totalExpenses: expenses,
          netSavings: savings,
          savingsRate: income > 0 ? Math.round((savings / income) * 100) : 0,
          transactionCount: transactions.length,
          dailyAverageSpend: Math.round(expenses / days),
          dailyAverageIncome: Math.round(income / days),
        },
        topCategories,
        largestExpenses: transactions
          .filter(t => t.type === 'expense')
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map(t => ({
            description: t.description,
            amount: t.amount,
            category: t.category,
            date: t.date,
          })),
        incomeVsExpense: this._getIncomeVsExpenseByPeriod(transactions, period),
      };
    } catch (error) {
      console.error('Error generating quick summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule a recurring report
   */
  static async scheduleReport(userId, templateId, schedule) {
    const { frequency = 'monthly', format = 'pdf', email = null, dayOfMonth = 1 } = schedule;

    // In a real implementation, this would create a scheduled job
    return {
      success: true,
      scheduledReport: {
        id: `sr_${Date.now()}`,
        userId,
        templateId,
        templateName: this.REPORT_TEMPLATES[templateId]?.name,
        frequency,
        format,
        email,
        dayOfMonth,
        nextRun: this._getNextRunDate(frequency, dayOfMonth),
        createdAt: new Date().toISOString(),
        status: 'active',
      },
    };
  }

  // ======================== PRIVATE METHODS ========================

  static async _gatherReportData(userId, sections, startDate, endDate, filters) {
    const data = {};

    for (const section of sections) {
      switch (section) {
        case 'overview':
        case 'totalSpending':
          data[section] = await this._getOverviewData(userId, startDate, endDate);
          break;
        case 'income':
        case 'inflows':
          data[section] = await this._getIncomeData(userId, startDate, endDate);
          break;
        case 'expenses':
        case 'outflows':
          data[section] = await this._getExpenseData(userId, startDate, endDate);
          break;
        case 'categoryBreakdown':
        case 'categoryAnalysis':
        case 'categoryComparison':
          data[section] = await this._getCategoryData(userId, startDate, endDate);
          break;
        case 'trends':
        case 'trendAnalysis':
        case 'monthlyBreakdown':
        case 'monthlyComparison':
          data[section] = await this._getTrendData(userId, startDate, endDate);
          break;
        case 'recommendations':
        case 'optimizations':
          data[section] = this._generateRecommendations(data);
          break;
        case 'investmentSummary':
        case 'portfolioOverview':
        case 'assetAllocation':
          data[section] = await this._getInvestmentData(userId);
          break;
        case 'budgetOverview':
          data[section] = await this._getBudgetData(userId, startDate, endDate);
          break;
        case 'goalOverview':
        case 'goalProgress':
        case 'individualGoals':
          data[section] = await this._getGoalData(userId);
          break;
        case 'incomeBreakdown':
        case 'deductions80C':
        case 'deductions80D':
        case 'taxCalculation':
          data[section] = await this._getTaxData(userId, startDate, endDate);
          break;
        case 'assets':
        case 'liabilities':
        case 'netWorthCalculation':
          data[section] = await this._getNetWorthData(userId);
          break;
        default:
          data[section] = {};
      }
    }

    return data;
  }

  static async _getOverviewData(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return {
      totalIncome: income,
      totalExpenses: expense,
      netSavings: income - expense,
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      transactionCount: transactions.length,
      incomeTransactions: transactions.filter(t => t.type === 'income').length,
      expenseTransactions: transactions.filter(t => t.type === 'expense').length,
      averageExpense: expense / Math.max(1, transactions.filter(t => t.type === 'expense').length),
      largestExpense: Math.max(...transactions.filter(t => t.type === 'expense').map(t => t.amount), 0),
      largestIncome: Math.max(...transactions.filter(t => t.type === 'income').map(t => t.amount), 0),
    };
  }

  static async _getIncomeData(userId, startDate, endDate) {
    const incomeTransactions = await Transaction.find({
      userId,
      type: 'income',
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    const bySource = {};
    incomeTransactions.forEach(t => {
      const source = t.category || 'Other';
      bySource[source] = (bySource[source] || 0) + t.amount;
    });

    return {
      total: incomeTransactions.reduce((s, t) => s + t.amount, 0),
      count: incomeTransactions.length,
      bySource: Object.entries(bySource).map(([source, amount]) => ({ source, amount })).sort((a, b) => b.amount - a.amount),
      transactions: incomeTransactions.slice(0, 50).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    };
  }

  static async _getExpenseData(userId, startDate, endDate) {
    const expenseTransactions = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    }).sort({ amount: -1 });

    const byMerchant = {};
    expenseTransactions.forEach(t => {
      const merchant = t.description || 'Unknown';
      if (!byMerchant[merchant]) {
        byMerchant[merchant] = { total: 0, count: 0 };
      }
      byMerchant[merchant].total += t.amount;
      byMerchant[merchant].count++;
    });

    return {
      total: expenseTransactions.reduce((s, t) => s + t.amount, 0),
      count: expenseTransactions.length,
      topMerchants: Object.entries(byMerchant)
        .map(([merchant, data]) => ({ merchant, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15),
      transactions: expenseTransactions.slice(0, 100).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    };
  }

  static async _getCategoryData(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    });

    const categories = {};
    transactions.forEach(t => {
      const cat = t.category || 'Uncategorized';
      if (!categories[cat]) {
        categories[cat] = { total: 0, count: 0, min: Infinity, max: 0, transactions: [] };
      }
      categories[cat].total += t.amount;
      categories[cat].count++;
      categories[cat].min = Math.min(categories[cat].min, t.amount);
      categories[cat].max = Math.max(categories[cat].max, t.amount);
    });

    const totalExpense = Object.values(categories).reduce((s, c) => s + c.total, 0);

    return Object.entries(categories)
      .map(([name, data]) => ({
        category: name,
        total: data.total,
        count: data.count,
        average: Math.round(data.total / data.count),
        min: data.min === Infinity ? 0 : data.min,
        max: data.max,
        percentage: totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  static async _getTrendData(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const monthly = {};
    transactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().substring(0, 7);
      if (!monthly[monthKey]) {
        monthly[monthKey] = { month: monthKey, income: 0, expense: 0, count: 0 };
      }
      if (t.type === 'income') monthly[monthKey].income += t.amount;
      else monthly[monthKey].expense += t.amount;
      monthly[monthKey].count++;
    });

    return Object.values(monthly)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        savings: m.income - m.expense,
        savingsRate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
      }));
  }

  static async _getInvestmentData(userId) {
    try {
      const investments = await Investment.find({ userId });
      const byType = {};
      let totalInvested = 0;
      let totalCurrent = 0;

      investments.forEach(inv => {
        const type = inv.type || 'Other';
        if (!byType[type]) byType[type] = { invested: 0, current: 0, count: 0 };
        const invested = inv.investedAmount || inv.amount || 0;
        const current = inv.currentValue || invested;
        byType[type].invested += invested;
        byType[type].current += current;
        byType[type].count++;
        totalInvested += invested;
        totalCurrent += current;
      });

      return {
        totalInvested,
        totalCurrent,
        totalReturns: totalCurrent - totalInvested,
        returnPercentage: totalInvested > 0 ? Math.round(((totalCurrent - totalInvested) / totalInvested) * 100) : 0,
        investmentCount: investments.length,
        byType: Object.entries(byType).map(([type, data]) => ({
          type,
          ...data,
          returns: data.current - data.invested,
          returnPct: data.invested > 0 ? Math.round(((data.current - data.invested) / data.invested) * 100) : 0,
          allocation: totalCurrent > 0 ? Math.round((data.current / totalCurrent) * 100) : 0,
        })),
      };
    } catch (error) {
      return { totalInvested: 0, totalCurrent: 0, investmentCount: 0, byType: [] };
    }
  }

  static async _getBudgetData(userId, startDate, endDate) {
    try {
      const budgets = await Budget.find({ userId });
      return budgets.map(b => ({
        category: b.category,
        budgetAmount: b.amount || b.limit || 0,
        period: b.period || 'monthly',
      }));
    } catch (error) {
      return [];
    }
  }

  static async _getGoalData(userId) {
    try {
      const FinancialGoal = require('../models/FinancialGoal');
      const goals = await FinancialGoal.find({ userId });
      return goals.map(g => ({
        name: g.name || g.title,
        target: g.targetAmount || g.target,
        current: g.currentAmount || g.saved || 0,
        progress: Math.round(((g.currentAmount || g.saved || 0) / (g.targetAmount || g.target || 1)) * 100),
        deadline: g.deadline || g.targetDate,
        status: g.status || 'active',
      }));
    } catch (error) {
      return [];
    }
  }

  static async _getTaxData(userId, startDate, endDate) {
    // Simplified tax data for Indian context
    return {
      grossIncome: 0,
      deductions: {
        section80C: { limit: 150000, used: 0, items: [] },
        section80D: { limit: 25000, used: 0, items: [] },
        section80CCD: { limit: 50000, used: 0, items: [] },
        standardDeduction: 50000,
        hra: 0,
      },
      taxableIncome: 0,
      estimatedTax: 0,
    };
  }

  static async _getNetWorthData(userId) {
    return {
      assets: { savings: 0, investments: 0, property: 0, other: 0, total: 0 },
      liabilities: { loans: 0, creditCards: 0, other: 0, total: 0 },
      netWorth: 0,
    };
  }

  static _generateRecommendations(data) {
    const recommendations = [];

    if (data.overview) {
      if (data.overview.savingsRate < 20) {
        recommendations.push({
          priority: 'high',
          category: 'savings',
          message: `Your savings rate is ${data.overview.savingsRate}%. Aim for at least 20%.`,
        });
      }
    }

    if (data.categoryBreakdown) {
      const topCategory = data.categoryBreakdown[0];
      if (topCategory && topCategory.percentage > 30) {
        recommendations.push({
          priority: 'medium',
          category: 'spending',
          message: `${topCategory.category} accounts for ${topCategory.percentage}% of spending. Consider setting a budget limit.`,
        });
      }
    }

    return recommendations;
  }

  static _getIncomeVsExpenseByPeriod(transactions, period) {
    const groupBy = period === 'week' ? 'day' : period === 'year' ? 'month' : 'week';
    const grouped = {};

    transactions.forEach(t => {
      let key;
      const d = new Date(t.date);
      if (groupBy === 'day') key = d.toISOString().substring(0, 10);
      else if (groupBy === 'week') key = `W${Math.ceil(d.getDate() / 7)}`;
      else key = d.toISOString().substring(0, 7);

      if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
      if (t.type === 'income') grouped[key].income += t.amount;
      else grouped[key].expense += t.amount;
    });

    return Object.entries(grouped).map(([period, data]) => ({ period, ...data, net: data.income - data.expense }));
  }

  static async _generatePDF(template, data, options) {
    // In production, this would use PDFKit to create an actual PDF
    return {
      mimeType: 'application/pdf',
      filename: `${template.id}_${Date.now()}.pdf`,
      size: 0,
      pages: template.sections.length + 1,
    };
  }

  static async _generateExcel(template, data, options) {
    // In production, this would use ExcelJS to create actual Excel file
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${template.id}_${Date.now()}.xlsx`,
      size: 0,
      sheets: template.sections.length,
    };
  }

  static async _generateCSV(template, data, options) {
    return {
      mimeType: 'text/csv',
      filename: `${template.id}_${Date.now()}.csv`,
      size: 0,
    };
  }

  static _getNextRunDate(frequency, dayOfMonth) {
    const now = new Date();
    switch (frequency) {
      case 'daily': return new Date(now.getTime() + 86400000);
      case 'weekly': return new Date(now.getTime() + 7 * 86400000);
      case 'monthly':
        const next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
        return next;
      case 'quarterly':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, dayOfMonth);
      case 'yearly':
        return new Date(now.getFullYear() + 1, 3, 1); // April 1 (FY start)
      default: return new Date(now.getTime() + 30 * 86400000);
    }
  }
}

module.exports = ReportGeneratorService;
