// ============================================================================
// Financial Data Export Service — Enterprise data export engine
// ============================================================================
// Supports: CSV, JSON, PDF-ready data export for transactions, budgets,
// investments, reports, and complete financial snapshots.
// ============================================================================

const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const EMI = require('../models/EMI');
const Investment = require('../models/Investment');
const FinancialGoal = require('../models/FinancialGoal');
const BankAccount = require('../models/BankAccount');
const InsurancePolicy = require('../models/InsurancePolicy');
const Subscription = require('../models/Subscription');
const Debt = require('../models/Debt');
const mongoose = require('mongoose');

// ─── CSV Helper ─────────────────────────────────────────────────────
function toCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// ─── Date Range Helper ──────────────────────────────────────────────
function parseDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  return { start, end };
}

// ─── Export Transactions ────────────────────────────────────────────
async function exportTransactions(userId, options = {}) {
  const { format = 'csv', startDate, endDate, category, type } = options;
  const { start, end } = parseDateRange(startDate, endDate);

  const query = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: start, $lte: end },
  };
  if (category) query.category = category;
  if (type) query.type = type;

  const transactions = await Transaction.find(query).sort({ date: -1 }).lean();

  if (format === 'json') {
    return { data: transactions, count: transactions.length, format: 'json' };
  }

  // CSV
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Merchant', 'PaymentMode', 'Tags', 'Notes'];
  const rows = transactions.map(t => ({
    Date: new Date(t.date).toLocaleDateString('en-IN'),
    Description: t.description || '',
    Amount: t.amount || 0,
    Type: t.type || '',
    Category: t.category || '',
    Merchant: t.merchant || '',
    PaymentMode: t.paymentMode || '',
    Tags: (t.tags || []).join('; '),
    Notes: t.notes || '',
  }));

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: `transactions_${start.toISOString().slice(0, 10)}_to_${end.toISOString().slice(0, 10)}.csv` };
}

// ─── Export Budgets ─────────────────────────────────────────────────
async function exportBudgets(userId, options = {}) {
  const { format = 'csv' } = options;
  const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  if (format === 'json') return { data: budgets, count: budgets.length, format: 'json' };

  const headers = ['Category', 'BudgetAmount', 'SpentAmount', 'Remaining', 'PercentUsed', 'Period', 'IsActive'];
  const rows = budgets.map(b => ({
    Category: b.category || '',
    BudgetAmount: b.amount || 0,
    SpentAmount: b.spent || 0,
    Remaining: (b.amount || 0) - (b.spent || 0),
    PercentUsed: b.amount > 0 ? ((b.spent || 0) / b.amount * 100).toFixed(1) : '0',
    Period: b.period || 'monthly',
    IsActive: b.isActive ? 'Yes' : 'No',
  }));

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: 'budgets.csv' };
}

// ─── Export EMIs ────────────────────────────────────────────────────
async function exportEMIs(userId, options = {}) {
  const { format = 'csv' } = options;
  const emis = await EMI.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  if (format === 'json') return { data: emis, count: emis.length, format: 'json' };

  const headers = ['LoanName', 'LoanAmount', 'EMIAmount', 'InterestRate', 'Tenure', 'RemainingTenure', 'StartDate', 'Status', 'TotalPaid', 'RemainingAmount'];
  const rows = emis.map(e => ({
    LoanName: e.loanName || e.name || '',
    LoanAmount: e.loanAmount || e.principalAmount || 0,
    EMIAmount: e.emiAmount || 0,
    InterestRate: e.interestRate || 0,
    Tenure: e.tenure || e.totalInstallments || 0,
    RemainingTenure: e.remainingTenure || e.remainingInstallments || 0,
    StartDate: e.startDate ? new Date(e.startDate).toLocaleDateString('en-IN') : '',
    Status: e.status || '',
    TotalPaid: e.totalPaid || 0,
    RemainingAmount: e.remainingAmount || 0,
  }));

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: 'emis.csv' };
}

// ─── Export Investments ─────────────────────────────────────────────
async function exportInvestments(userId, options = {}) {
  const { format = 'csv' } = options;
  const investments = await Investment.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  if (format === 'json') return { data: investments, count: investments.length, format: 'json' };

  const headers = ['Name', 'Type', 'InvestedAmount', 'CurrentValue', 'Returns', 'ReturnPercent', 'PurchaseDate', 'Platform', 'Status'];
  const rows = investments.map(inv => {
    const invested = inv.totalInvestedAmount || inv.investedAmount || 0;
    const current = inv.currentValue || 0;
    const returns = current - invested;
    return {
      Name: inv.name || '',
      Type: inv.type || inv.investmentType || '',
      InvestedAmount: invested,
      CurrentValue: current,
      Returns: returns,
      ReturnPercent: invested > 0 ? ((returns / invested) * 100).toFixed(2) : '0',
      PurchaseDate: inv.purchaseDate ? new Date(inv.purchaseDate).toLocaleDateString('en-IN') : '',
      Platform: inv.platform || '',
      Status: inv.status || 'active',
    };
  });

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: 'investments.csv' };
}

// ─── Export Goals ───────────────────────────────────────────────────
async function exportGoals(userId, options = {}) {
  const { format = 'csv' } = options;
  const goals = await FinancialGoal.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  if (format === 'json') return { data: goals, count: goals.length, format: 'json' };

  const headers = ['Name', 'TargetAmount', 'CurrentAmount', 'Progress', 'Deadline', 'Category', 'Priority', 'Status'];
  const rows = goals.map(g => ({
    Name: g.name || '',
    TargetAmount: g.targetAmount || 0,
    CurrentAmount: g.currentAmount || g.savedAmount || 0,
    Progress: g.targetAmount > 0 ? (((g.currentAmount || g.savedAmount || 0) / g.targetAmount) * 100).toFixed(1) : '0',
    Deadline: g.deadline ? new Date(g.deadline).toLocaleDateString('en-IN') : '',
    Category: g.category || '',
    Priority: g.priority || '',
    Status: g.status || 'active',
  }));

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: 'financial_goals.csv' };
}

// ─── Export Complete Snapshot ────────────────────────────────────────
async function exportCompleteSnapshot(userId, options = {}) {
  const { startDate, endDate } = options;

  try {
    const [transactions, budgets, emis, investments, goals, accounts, insurance, subscriptions, debts] = await Promise.all([
      exportTransactions(userId, { format: 'json', startDate, endDate }),
      exportBudgets(userId, { format: 'json' }),
      exportEMIs(userId, { format: 'json' }),
      exportInvestments(userId, { format: 'json' }),
      exportGoals(userId, { format: 'json' }),
      BankAccount.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
      InsurancePolicy.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
      Subscription.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
      Debt.find({ userId: new mongoose.Types.ObjectId(userId) }).lean().catch(() => []),
    ]);

    // Calculate summary statistics
    const txns = transactions.data || [];
    const totalIncome = txns.filter(t => t.type === 'credit' || t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = txns.filter(t => t.type === 'debit' || t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const totalInvested = (investments.data || []).reduce((s, i) => s + (i.totalInvestedAmount || i.investedAmount || 0), 0);
    const totalCurrentValue = (investments.data || []).reduce((s, i) => s + (i.currentValue || 0), 0);
    const totalDebt = (debts || []).reduce((s, d) => s + (d.amount || d.totalAmount || 0), 0);
    const totalAccountBalance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);

    const snapshot = {
      exportDate: new Date().toISOString(),
      userId,
      summary: {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0,
        totalInvested,
        totalCurrentValue,
        investmentReturns: totalCurrentValue - totalInvested,
        totalDebt,
        totalAccountBalance,
        netWorth: totalAccountBalance + totalCurrentValue - totalDebt,
      },
      counts: {
        transactions: transactions.count,
        budgets: budgets.count,
        emis: emis.count,
        investments: investments.count,
        goals: goals.count,
        bankAccounts: accounts.length,
        insurancePolicies: insurance.length,
        subscriptions: subscriptions.length,
        debts: debts.length,
      },
      data: {
        transactions: transactions.data,
        budgets: budgets.data,
        emis: emis.data,
        investments: investments.data,
        goals: goals.data,
        bankAccounts: accounts,
        insurancePolicies: insurance,
        subscriptions,
        debts,
      },
    };

    return snapshot;
  } catch (error) {
    logger.error(`Complete snapshot export error: ${error.message}`);
    throw error;
  }
}

// ─── Export Category Spending Report ────────────────────────────────
async function exportCategoryReport(userId, options = {}) {
  const { startDate, endDate, format = 'csv' } = options;
  const { start, end } = parseDateRange(startDate, endDate);

  const agg = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ['debit', 'expense'] },
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const grandTotal = agg.reduce((s, c) => s + c.totalAmount, 0);

  if (format === 'json') return { data: agg, grandTotal, format: 'json' };

  const headers = ['Category', 'TotalAmount', 'TransactionCount', 'AvgAmount', 'MaxAmount', 'MinAmount', 'PercentOfTotal'];
  const rows = agg.map(c => ({
    Category: c._id || 'Uncategorized',
    TotalAmount: c.totalAmount.toFixed(2),
    TransactionCount: c.count,
    AvgAmount: c.avgAmount.toFixed(2),
    MaxAmount: c.maxAmount.toFixed(2),
    MinAmount: c.minAmount.toFixed(2),
    PercentOfTotal: grandTotal > 0 ? ((c.totalAmount / grandTotal) * 100).toFixed(1) : '0',
  }));

  return { data: toCSV(headers, rows), count: rows.length, format: 'csv', filename: `category_report_${start.toISOString().slice(0, 10)}_to_${end.toISOString().slice(0, 10)}.csv` };
}

module.exports = {
  exportTransactions,
  exportBudgets,
  exportEMIs,
  exportInvestments,
  exportGoals,
  exportCompleteSnapshot,
  exportCategoryReport,
  toCSV,
};
