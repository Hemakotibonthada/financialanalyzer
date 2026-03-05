// ============================================================================
// AI DATA PIPELINE — Unified Data Processing & Feature Store
// ============================================================================
// Centralized pipeline for transaction processing, feature extraction,
// model training data preparation, batch processing, and real-time
// streaming. Orchestrates data flow across all AI modules.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// ============================================================================
// §1  DATA PREPROCESSOR — Clean & Normalize Financial Data
// ============================================================================

class FinancialDataPreprocessor {
  process(transactions) {
    if (!transactions || transactions.length === 0) return { processed: [], stats: {} };

    const processed = transactions.map(t => this._processTransaction(t)).filter(Boolean);
    const stats = this._computeStats(processed);

    return { processed, stats };
  }

  _processTransaction(txn) {
    if (!txn) return null;

    const amount = Math.abs(parseFloat(txn.amount) || 0);
    if (amount === 0) return null;

    const date = new Date(txn.date || Date.now());
    if (isNaN(date.getTime())) return null;

    return {
      id: txn._id || txn.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      amount,
      type: this._normalizeType(txn.type),
      category: this._normalizeCategory(txn.category),
      description: (txn.description || txn.merchant || '').trim().substring(0, 200),
      merchant: this._extractMerchant(txn.description || txn.merchant || ''),
      date: date.toISOString(),
      // Temporal features
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      hour: date.getHours(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isMonthStart: date.getDate() <= 5,
      isMonthEnd: date.getDate() >= 25,
      // Amount features
      amountLog: Math.log1p(amount),
      amountBucket: this._getAmountBucket(amount),
      // Text features
      descLength: (txn.description || '').length,
      hasUPI: /upi/i.test(txn.description || ''),
      hasCard: /card|pos/i.test(txn.description || ''),
      hasOnline: /online|net|web/i.test(txn.description || ''),
      // Original reference
      _original: txn
    };
  }

  _normalizeType(type) {
    if (!type) return 'unknown';
    const t = type.toLowerCase().trim();
    if (t.includes('income') || t.includes('credit') || t.includes('salary')) return 'income';
    if (t.includes('expense') || t.includes('debit') || t.includes('payment')) return 'expense';
    if (t.includes('transfer')) return 'transfer';
    return t;
  }

  _normalizeCategory(category) {
    if (!category) return 'uncategorized';
    return category.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  }

  _extractMerchant(description) {
    return (description || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ').slice(0, 3).join(' ') || 'unknown';
  }

  _getAmountBucket(amount) {
    if (amount < 100) return 'micro';
    if (amount < 500) return 'small';
    if (amount < 2000) return 'medium';
    if (amount < 10000) return 'large';
    if (amount < 50000) return 'very_large';
    return 'huge';
  }

  _computeStats(processed) {
    const amounts = processed.map(t => t.amount);
    const incomes = processed.filter(t => t.type === 'income').map(t => t.amount);
    const expenses = processed.filter(t => t.type === 'expense').map(t => t.amount);

    return {
      totalTransactions: processed.length,
      totalAmount: sum(amounts),
      avgAmount: mean(amounts),
      totalIncome: sum(incomes),
      totalExpenses: sum(expenses),
      netFlow: sum(incomes) - sum(expenses),
      categories: [...new Set(processed.map(t => t.category))].length,
      merchants: [...new Set(processed.map(t => t.merchant))].length,
      dateRange: processed.length > 0 ? {
        from: processed.reduce((min, t) => t.date < min ? t.date : min, processed[0].date),
        to: processed.reduce((max, t) => t.date > max ? t.date : max, processed[0].date)
      } : null,
      typeCounts: {
        income: incomes.length,
        expense: expenses.length,
        transfer: processed.filter(t => t.type === 'transfer').length,
        unknown: processed.filter(t => t.type === 'unknown').length
      }
    };
  }
}

// ============================================================================
// §2  FEATURE STORE — Compute & Cache Financial Features
// ============================================================================

class FinancialFeatureStore {
  constructor() {
    this.userFeatures = {};
    this.featureDefinitions = this._defineFeatures();
  }

  _defineFeatures() {
    return {
      // Income features
      'monthly_income': { description: 'Average monthly income', group: 'income' },
      'income_stability': { description: 'Income coefficient of variation', group: 'income' },
      'income_sources': { description: 'Number of income sources', group: 'income' },
      'income_growth': { description: 'Income trend (MoM)', group: 'income' },

      // Expense features
      'monthly_expense': { description: 'Average monthly expense', group: 'expense' },
      'expense_volatility': { description: 'Expense variation', group: 'expense' },
      'daily_avg_spend': { description: 'Average daily spending', group: 'expense' },
      'max_single_expense': { description: 'Largest single expense', group: 'expense' },

      // Savings features
      'savings_rate': { description: 'Savings as % of income', group: 'savings' },
      'savings_trend': { description: 'Savings rate trend', group: 'savings' },

      // Category features
      'food_pct': { description: 'Food spending %', group: 'category' },
      'transport_pct': { description: 'Transport spending %', group: 'category' },
      'shopping_pct': { description: 'Shopping spending %', group: 'category' },
      'entertainment_pct': { description: 'Entertainment spending %', group: 'category' },
      'utilities_pct': { description: 'Utilities spending %', group: 'category' },
      'category_diversity': { description: 'Number of spending categories', group: 'category' },

      // Behavioral features
      'weekend_spend_ratio': { description: 'Weekend vs weekday spending', group: 'behavior' },
      'late_night_txn_ratio': { description: 'Late night transaction ratio', group: 'behavior' },
      'avg_transactions_per_day': { description: 'Transaction frequency', group: 'behavior' },
      'impulse_score': { description: 'Impulsive spending tendency', group: 'behavior' },
      'round_number_ratio': { description: 'Round number transaction ratio', group: 'behavior' },

      // Time features
      'peak_spending_hour': { description: 'Hour with most spending', group: 'time' },
      'peak_spending_day': { description: 'Day of week with most spending', group: 'time' },
      'salary_day': { description: 'Typical salary credit day', group: 'time' },

      // Risk features
      'debt_to_income': { description: 'EMI to income ratio', group: 'risk' },
      'emergency_fund_months': { description: 'Months of emergency fund', group: 'risk' },
      'credit_utilization': { description: 'Credit card utilization', group: 'risk' }
    };
  }

  computeFeatures(userId, processedTransactions) {
    const expenses = processedTransactions.filter(t => t.type === 'expense');
    const incomes = processedTransactions.filter(t => t.type === 'income');
    const amounts = expenses.map(t => t.amount);
    const incAmounts = incomes.map(t => t.amount);

    // Determine time span
    const dates = processedTransactions.map(t => new Date(t.date));
    const monthSpan = dates.length >= 2
      ? Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (30 * 86400000))
      : 1;

    const features = {};

    // Income features
    features.monthly_income = sum(incAmounts) / monthSpan;
    features.income_stability = incAmounts.length > 1
      ? 1 - (this._stdDev(incAmounts) / (mean(incAmounts) || 1))
      : 0;
    features.income_sources = new Set(incomes.map(t => t.merchant)).size;
    features.income_growth = this._computeGrowth(incomes);

    // Expense features
    features.monthly_expense = sum(amounts) / monthSpan;
    features.expense_volatility = amounts.length > 1
      ? this._stdDev(amounts) / (mean(amounts) || 1)
      : 0;
    features.daily_avg_spend = sum(amounts) / Math.max(1, monthSpan * 30);
    features.max_single_expense = amounts.length > 0 ? Math.max(...amounts) : 0;

    // Savings
    features.savings_rate = features.monthly_income > 0
      ? (features.monthly_income - features.monthly_expense) / features.monthly_income
      : 0;
    features.savings_trend = 0; // Simplified

    // Category percentages
    const totalExpense = sum(amounts);
    const categoryTotals = {};
    for (const t of expenses) {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
    features.food_pct = (categoryTotals.food || 0) / (totalExpense || 1);
    features.transport_pct = (categoryTotals.transport || 0) / (totalExpense || 1);
    features.shopping_pct = (categoryTotals.shopping || 0) / (totalExpense || 1);
    features.entertainment_pct = (categoryTotals.entertainment || 0) / (totalExpense || 1);
    features.utilities_pct = ((categoryTotals.utilities || 0) + (categoryTotals.utility || 0)) / (totalExpense || 1);
    features.category_diversity = Object.keys(categoryTotals).length;

    // Behavioral features
    const weekendTxns = expenses.filter(t => t.isWeekend);
    features.weekend_spend_ratio = expenses.length > 0
      ? weekendTxns.length / expenses.length
      : 0;

    const lateNightTxns = expenses.filter(t => t.hour >= 22 || t.hour < 5);
    features.late_night_txn_ratio = expenses.length > 0
      ? lateNightTxns.length / expenses.length
      : 0;

    features.avg_transactions_per_day = processedTransactions.length / Math.max(1, monthSpan * 30);

    const roundTxns = amounts.filter(a => a % 100 === 0 || a % 500 === 0);
    features.round_number_ratio = amounts.length > 0 ? roundTxns.length / amounts.length : 0;

    features.impulse_score = features.late_night_txn_ratio * 50 +
      (features.entertainment_pct + features.shopping_pct) * 30 +
      features.round_number_ratio * 20;

    // Time features
    const hourSpend = new Array(24).fill(0);
    for (const t of expenses) hourSpend[t.hour] += t.amount;
    features.peak_spending_hour = hourSpend.indexOf(Math.max(...hourSpend));

    const dowSpend = new Array(7).fill(0);
    for (const t of expenses) dowSpend[t.dayOfWeek] += t.amount;
    features.peak_spending_day = dowSpend.indexOf(Math.max(...dowSpend));

    const salaryDays = incomes.map(t => t.dayOfMonth);
    features.salary_day = salaryDays.length > 0
      ? salaryDays.sort((a, b) =>
          salaryDays.filter(v => v === b).length - salaryDays.filter(v => v === a).length
        )[0]
      : 0;

    // Risk features (defaults — need loan data for actual values)
    features.debt_to_income = 0;
    features.emergency_fund_months = features.savings_rate > 0
      ? features.savings_rate * 6
      : 0;
    features.credit_utilization = 0;

    // Cache
    this.userFeatures[userId] = {
      features,
      computedAt: new Date(),
      transactionCount: processedTransactions.length,
      monthSpan
    };

    return features;
  }

  getFeatures(userId) {
    return this.userFeatures[userId] || null;
  }

  getFeatureVector(userId) {
    const data = this.userFeatures[userId];
    if (!data) return null;

    return Object.keys(this.featureDefinitions).map(key =>
      data.features[key] || 0
    );
  }

  getFeatureNames() {
    return Object.keys(this.featureDefinitions);
  }

  _stdDev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(sum(arr.map(v => (v - m) ** 2)) / (arr.length - 1));
  }

  _computeGrowth(transactions) {
    if (transactions.length < 4) return 0;
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const half = Math.floor(sorted.length / 2);
    const firstHalf = mean(sorted.slice(0, half).map(t => t.amount));
    const secondHalf = mean(sorted.slice(half).map(t => t.amount));
    return firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : 0;
  }
}

// ============================================================================
// §3  BATCH PROCESSOR — Process Multiple AI Tasks in Parallel
// ============================================================================

class AIBatchProcessor {
  constructor() {
    this.queue = [];
    this.results = {};
    this.processing = false;
  }

  addTask(taskId, taskFn, priority = 5) {
    this.queue.push({ taskId, taskFn, priority, addedAt: Date.now() });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  async processAll() {
    if (this.processing) return this.results;
    this.processing = true;

    const startTime = Date.now();

    for (const task of this.queue) {
      try {
        const taskStart = Date.now();
        const result = await task.taskFn();
        this.results[task.taskId] = {
          success: true,
          data: result,
          duration: Date.now() - taskStart
        };
      } catch (error) {
        this.results[task.taskId] = {
          success: false,
          error: error.message,
          duration: 0
        };
      }
    }

    this.processing = false;
    const totalDuration = Date.now() - startTime;

    return {
      results: this.results,
      tasksProcessed: this.queue.length,
      totalDuration,
      avgDuration: this.queue.length > 0 ? Math.round(totalDuration / this.queue.length) : 0,
      failures: Object.values(this.results).filter(r => !r.success).length
    };
  }

  clear() {
    this.queue = [];
    this.results = {};
  }
}

// ============================================================================
// §4  DATA QUALITY CHECKER
// ============================================================================

class DataQualityChecker {
  check(transactions) {
    if (!transactions || transactions.length === 0) {
      return { score: 0, issues: ['No transaction data'], recommendation: 'Import transactions to get started' };
    }

    const issues = [];
    let score = 100;

    // Check for missing fields
    const missingAmount = transactions.filter(t => !t.amount || t.amount === 0);
    if (missingAmount.length > 0) {
      score -= 15;
      issues.push(`${missingAmount.length} transactions with missing/zero amounts`);
    }

    // Check for missing dates
    const missingDate = transactions.filter(t => !t.date);
    if (missingDate.length > 0) {
      score -= 15;
      issues.push(`${missingDate.length} transactions without dates`);
    }

    // Check for missing categories
    const uncategorized = transactions.filter(t => !t.category || t.category === 'uncategorized');
    const uncatRatio = uncategorized.length / transactions.length;
    if (uncatRatio > 0.3) {
      score -= 20;
      issues.push(`${(uncatRatio * 100).toFixed(0)}% of transactions are uncategorized`);
    }

    // Check for duplicates
    const duplicates = this._findDuplicates(transactions);
    if (duplicates > 0) {
      score -= 10;
      issues.push(`${duplicates} potential duplicate transactions`);
    }

    // Check for sufficient history
    if (transactions.length < 30) {
      score -= 10;
      issues.push('Less than 30 transactions — AI models need more data');
    }

    // Check date span
    const dates = transactions.filter(t => t.date).map(t => new Date(t.date));
    if (dates.length >= 2) {
      const span = (Math.max(...dates) - Math.min(...dates)) / (30 * 86400000);
      if (span < 1) {
        score -= 10;
        issues.push('Less than 1 month of data — limited AI accuracy');
      }
    }

    // Check for negative amounts that should be positive
    const negativeExpenses = transactions.filter(t =>
      t.type === 'expense' && (t.amount || 0) < 0
    );
    if (negativeExpenses.length > 0) {
      score -= 5;
      issues.push(`${negativeExpenses.length} expenses with negative amounts (should be positive)`);
    }

    // Check type distribution
    const typeCount = {};
    for (const t of transactions) {
      typeCount[t.type || 'unknown'] = (typeCount[t.type || 'unknown'] || 0) + 1;
    }
    if (!typeCount.income || typeCount.income === 0) {
      score -= 10;
      issues.push('No income transactions found — savings rate cannot be calculated');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      rating: score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Poor' : 'Critical',
      issues,
      totalTransactions: transactions.length,
      typeCounts: typeCount,
      recommendation: score >= 80
        ? 'Data quality is good for AI analysis.'
        : `Fix ${issues.length} issues to improve AI accuracy.`,
      aiReadiness: score >= 60
    };
  }

  _findDuplicates(transactions) {
    const seen = new Set();
    let dupes = 0;

    for (const t of transactions) {
      const key = `${t.amount}_${t.date}_${(t.description || '').substring(0, 20)}`;
      if (seen.has(key)) dupes++;
      seen.add(key);
    }

    return dupes;
  }
}

// ============================================================================
// §5  UNIFIED AI DATA PIPELINE SERVICE
// ============================================================================

class AIDataPipelineService {
  constructor() {
    this.preprocessor = new FinancialDataPreprocessor();
    this.featureStore = new FinancialFeatureStore();
    this.batchProcessor = new AIBatchProcessor();
    this.qualityChecker = new DataQualityChecker();
    this.pipelineHistory = [];
  }

  async runPipeline(userId, rawTransactions) {
    const startTime = Date.now();
    const pipeline = {
      userId,
      startedAt: new Date(),
      steps: []
    };

    // Step 1: Quality Check
    const quality = this.qualityChecker.check(rawTransactions);
    pipeline.steps.push({ name: 'quality_check', ...quality, duration: Date.now() - startTime });

    // Step 2: Preprocess
    const { processed, stats } = this.preprocessor.process(rawTransactions);
    pipeline.steps.push({
      name: 'preprocessing',
      transactionsProcessed: processed.length,
      stats,
      duration: Date.now() - startTime
    });

    // Step 3: Feature Extraction
    const features = this.featureStore.computeFeatures(userId, processed);
    pipeline.steps.push({
      name: 'feature_extraction',
      featuresComputed: Object.keys(features).length,
      duration: Date.now() - startTime
    });

    // Step 4: Summary
    pipeline.totalDuration = Date.now() - startTime;
    pipeline.success = true;
    pipeline.outputSummary = {
      processedTransactions: processed.length,
      dataQualityScore: quality.score,
      featuresExtracted: Object.keys(features).length,
      aiReady: quality.aiReadiness
    };

    this.pipelineHistory.push(pipeline);
    if (this.pipelineHistory.length > 50) this.pipelineHistory.shift();

    return {
      pipeline,
      processedData: processed,
      features,
      quality,
      stats
    };
  }

  getFeatures(userId) {
    return this.featureStore.getFeatures(userId);
  }

  getFeatureVector(userId) {
    return this.featureStore.getFeatureVector(userId);
  }

  checkDataQuality(transactions) {
    return this.qualityChecker.check(transactions);
  }

  getPipelineHistory() {
    return this.pipelineHistory;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FinancialDataPreprocessor,
  FinancialFeatureStore,
  AIBatchProcessor,
  DataQualityChecker,
  AIDataPipelineService
};
