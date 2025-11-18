const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const TaxRecord = require('../models/TaxRecord');
const InsurancePolicy = require('../models/InsurancePolicy');
const Portfolio = require('../models/Portfolio');
const Debt = require('../models/Debt');
const analyticsService = require('./analyticsService');

class ReportService {
  // Comprehensive Financial Report
  async generateComprehensiveReport(userId, startDate, endDate, format = 'pdf', password = null) {
    const data = await this.gatherReportData(userId, startDate, endDate);
    
    if (format === 'pdf') {
      return this.generatePDFReport(data, password);
    } else if (format === 'excel') {
      return this.generateExcelReport(data, password);
    } else {
      return data;
    }
  }

  async gatherReportData(userId, startDate, endDate) {
    const [
      transactions,
      budgets,
      netWorth,
      cashFlow,
      debts,
      portfolios,
      financialHealth
    ] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startDate, $lte: endDate } }),
      Budget.find({ userId }),
      analyticsService.calculateNetWorth(userId),
      analyticsService.analyzeCashFlow(userId, startDate, endDate),
      Debt.find({ userId }),
      Portfolio.find({ userId }),
      analyticsService.calculateFinancialHealth(userId)
    ]);

    return {
      period: { startDate, endDate },
      summary: {
        totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        netSavings: 0,
        savingsRate: 0
      },
      netWorth,
      cashFlow,
      debts: {
        total: debts.length,
        totalOutstanding: debts.reduce((sum, d) => sum + (d.currentBalance || 0), 0),
        monthlyPayments: debts.reduce((sum, d) => sum + (d.emiAmount || 0), 0)
      },
      investments: {
        total: portfolios.length,
        totalValue: portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0),
        totalInvested: portfolios.reduce((sum, p) => sum + (p.totalInvested || 0), 0)
      },
      financialHealth,
      transactions: transactions.slice(0, 100)
    };
  }

  generatePDFReport(data, password = null) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Note: PDFKit doesn't support native password protection
      // The password will be sent via X-Document-Password header for user information
      // To add actual PDF encryption, consider using pdf-lib or hummus for post-processing

      // Title
      doc.fontSize(24).text('Financial Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${data.period.startDate.toLocaleDateString()} - ${data.period.endDate.toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Financial Health Score
      doc.fontSize(18).text('Financial Health Score');
      doc.moveDown();
      doc.fontSize(14).text(`Overall Score: ${data.financialHealth.overallScore}/100`);
      doc.moveDown();

      // Net Worth
      doc.fontSize(18).text('Net Worth Summary');
      doc.moveDown();
      doc.fontSize(12).text(`Total Assets: ₹${data.netWorth.assets.total.toLocaleString()}`);
      doc.text(`Total Liabilities: ₹${data.netWorth.liabilities.total.toLocaleString()}`);
      doc.text(`Net Worth: ₹${data.netWorth.netWorth.toLocaleString()}`);
      doc.moveDown(2);

      // Cash Flow
      doc.fontSize(18).text('Cash Flow Analysis');
      doc.moveDown();
      doc.fontSize(12).text(`Average Monthly Income: ₹${data.cashFlow.summary.averageMonthlyIncome.toLocaleString()}`);
      doc.text(`Average Monthly Expenses: ₹${data.cashFlow.summary.averageMonthlyExpenses.toLocaleString()}`);
      doc.text(`Average Net Flow: ₹${data.cashFlow.summary.averageNetFlow.toLocaleString()}`);
      doc.moveDown(2);

      // Debt Summary
      doc.fontSize(18).text('Debt Summary');
      doc.moveDown();
      doc.fontSize(12).text(`Total Outstanding: ₹${data.debts.totalOutstanding.toLocaleString()}`);
      doc.text(`Monthly Debt Payments: ₹${data.debts.monthlyPayments.toLocaleString()}`);
      doc.moveDown(2);

      // Investment Summary
      doc.fontSize(18).text('Investment Summary');
      doc.moveDown();
      doc.fontSize(12).text(`Total Portfolio Value: ₹${data.investments.totalValue.toLocaleString()}`);
      doc.text(`Total Invested: ₹${data.investments.totalInvested.toLocaleString()}`);
      doc.text(`Total Gains: ₹${(data.investments.totalValue - data.investments.totalInvested).toLocaleString()}`);
      doc.moveDown(2);

      // Recommendations
      if (data.financialHealth.recommendations.length > 0) {
        doc.addPage();
        doc.fontSize(18).text('Recommendations');
        doc.moveDown();
        
        data.financialHealth.recommendations.forEach((rec, index) => {
          doc.fontSize(12).text(`${index + 1}. ${rec.message}`);
          doc.fontSize(10).text(`   Action: ${rec.action}`);
          doc.moveDown();
        });
      }

      doc.end();
    });
  }

  async generateExcelReport(data, password = null) {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRows([
      { metric: 'Financial Health Score', value: data.financialHealth.overallScore },
      { metric: 'Net Worth', value: data.netWorth.netWorth },
      { metric: 'Total Assets', value: data.netWorth.assets.total },
      { metric: 'Total Liabilities', value: data.netWorth.liabilities.total },
      { metric: 'Avg Monthly Income', value: data.cashFlow.summary.averageMonthlyIncome },
      { metric: 'Avg Monthly Expenses', value: data.cashFlow.summary.averageMonthlyExpenses },
      { metric: 'Total Debt', value: data.debts.totalOutstanding },
      { metric: 'Monthly Debt Payments', value: data.debts.monthlyPayments },
      { metric: 'Total Investments', value: data.investments.totalValue }
    ]);

    // Transactions Sheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    transactionsSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    transactionsSheet.addRows(data.transactions.map(t => ({
      date: t.date.toLocaleDateString(),
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description
    })));

    // Cash Flow Sheet
    const cashFlowSheet = workbook.addWorksheet('Cash Flow');
    cashFlowSheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Income', key: 'income', width: 15 },
      { header: 'Expenses', key: 'expenses', width: 15 },
      { header: 'Net Flow', key: 'netFlow', width: 15 }
    ];

    cashFlowSheet.addRows(Object.entries(data.cashFlow.monthlyTrends).map(([month, values]) => ({
      month,
      income: values.income,
      expenses: values.expenses,
      netFlow: values.netFlow
    })));

    // Add password protection if provided
    if (password) {
      workbook.model.workbookProtection = {
        lockStructure: true,
        password: password
      };
    }

    return workbook.xlsx.writeBuffer();
  }

  // Tax Report
  async generateTaxReport(userId, assessmentYear) {
    const taxRecords = await TaxRecord.find({ userId, assessmentYear });
    
    if (taxRecords.length === 0) {
      throw new Error('No tax records found for the specified year');
    }

    const record = taxRecords[0];
    record.calculateTax();

    return {
      assessmentYear,
      income: record.income,
      deductions: record.deductions,
      taxCalculation: record.taxCalculation,
      optimizations: record.optimizations,
      itrFiling: record.itrFiling
    };
  }

  // Portfolio Performance Report
  async generatePortfolioReport(userId, portfolioId) {
    const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
    
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    portfolio.calculatePerformance();
    const allocation = portfolio.calculateAllocation();
    const riskAnalysis = portfolio.analyzeRisk();

    return {
      portfolio: {
        name: portfolio.portfolioName,
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalInvested,
        totalGainLoss: portfolio.totalValue - portfolio.totalInvested
      },
      performance: portfolio.performance,
      allocation,
      riskAnalysis,
      holdings: portfolio.holdings.map(h => ({
        symbol: h.symbol,
        assetType: h.assetType,
        quantity: h.quantity,
        currentValue: h.currentValue,
        investedValue: h.investedValue,
        gainLoss: h.currentValue - h.investedValue,
        returnPercent: ((h.currentValue - h.investedValue) / h.investedValue) * 100
      }))
    };
  }

  // Debt Analysis Report
  async generateDebtReport(userId) {
    const debts = await Debt.find({ userId, status: 'active' });
    
    const summary = await Debt.getDebtSummary(userId);
    const payoffPlan = await Debt.getPayoffPlan(userId, 'avalanche', 0);

    const details = debts.map(debt => {
      const stats = debt.calculateStatistics();
      return {
        name: debt.debtName,
        type: debt.debtType,
        currentBalance: debt.currentBalance,
        interestRate: debt.interestRate,
        monthlyPayment: debt.emiAmount,
        remainingMonths: stats.remainingMonths,
        totalInterest: stats.totalInterestPaid,
        payoffDate: debt.endDate
      };
    });

    return {
      summary,
      payoffPlan,
      details
    };
  }

  // Insurance Coverage Report
  async generateInsuranceReport(userId) {
    const policies = await InsurancePolicy.find({ userId });
    const coverageAnalysis = await InsurancePolicy.getCoverageAnalysis(userId);
    const expiringPolicies = await InsurancePolicy.getExpiringPolicies(userId, 90);
    const premiumsDue = await InsurancePolicy.getPremiumsDue(userId, 30);

    const policyDetails = policies.map(p => ({
      policyNumber: p.policyNumber,
      type: p.policyType,
      provider: p.provider,
      coverageAmount: p.coverageAmount,
      premiumAmount: p.premiumAmount,
      premiumFrequency: p.premiumFrequency,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      claims: p.claims.length,
      totalClaimAmount: p.claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0)
    }));

    return {
      summary: coverageAnalysis,
      policies: policyDetails,
      alerts: {
        expiringPolicies: expiringPolicies.length,
        premiumsDue: premiumsDue.length
      }
    };
  }

  // Monthly Statement
  async generateMonthlyStatement(userId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [transactions, budgetComparison] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startDate, $lte: endDate } }),
      analyticsService.compareBudgetVsActual(userId, month, year)
    ]);

    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = {};
    expenses.forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    return {
      period: { month, year },
      summary: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netSavings: Math.round(totalIncome - totalExpenses),
        savingsRate: totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 100) : 0
      },
      income: {
        total: Math.round(totalIncome),
        count: income.length,
        bySource: this.groupBy(income, 'category')
      },
      expenses: {
        total: Math.round(totalExpenses),
        count: expenses.length,
        byCategory: Object.entries(expensesByCategory)
          .map(([category, amount]) => ({
            category,
            amount: Math.round(amount),
            percentage: Math.round((amount / totalExpenses) * 100)
          }))
          .sort((a, b) => b.amount - a.amount)
      },
      budgetComparison,
      topExpenses: expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map(t => ({
          date: t.date,
          category: t.category,
          amount: t.amount,
          description: t.description
        }))
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] || 'Other';
      if (!result[group]) result[group] = 0;
      result[group] += item.amount;
      return result;
    }, {});
  }

  // Custom Report Builder
  async buildCustomReport(userId, config) {
    const { startDate, endDate, includeModules } = config;
    const report = { generatedAt: new Date() };

    if (includeModules.includes('netWorth')) {
      report.netWorth = await analyticsService.calculateNetWorth(userId);
    }

    if (includeModules.includes('cashFlow')) {
      report.cashFlow = await analyticsService.analyzeCashFlow(userId, startDate, endDate);
    }

    if (includeModules.includes('financialHealth')) {
      report.financialHealth = await analyticsService.calculateFinancialHealth(userId);
    }

    if (includeModules.includes('debts')) {
      report.debts = await this.generateDebtReport(userId);
    }

    if (includeModules.includes('investments')) {
      const portfolios = await Portfolio.find({ userId });
      report.investments = {
        portfolios: portfolios.length,
        totalValue: portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0)
      };
    }

    if (includeModules.includes('insurance')) {
      report.insurance = await this.generateInsuranceReport(userId);
    }

    if (includeModules.includes('transactions')) {
      report.transactions = await Transaction.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).limit(config.transactionLimit || 100);
    }

    return report;
  }
}

module.exports = new ReportService();
