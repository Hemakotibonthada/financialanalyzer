// ============================================================================
// Enterprise Data Export Engine — CSV, JSON, PDF-ready, Scheduled Exports
// ============================================================================

const path = require('path');
const fs = require('fs');

// ============================================================================
// § 1 — CSV Generator
// ============================================================================

class CSVGenerator {
  /**
   * Convert array of objects to CSV string
   */
  static generate(data, options = {}) {
    if (!data || data.length === 0) return '';

    const {
      columns = null, // Array of { key, label, formatter }
      delimiter = ',',
      includeHeader = true,
      dateFormat = 'ISO',
      currencySymbol = '₹',
    } = options;

    // Determine columns
    const cols = columns || Object.keys(data[0]).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    }));

    const rows = [];

    // Header
    if (includeHeader) {
      rows.push(cols.map(c => CSVGenerator.escape(c.label || c.key, delimiter)).join(delimiter));
    }

    // Data rows
    for (const item of data) {
      const row = cols.map(col => {
        let value = CSVGenerator.getNestedValue(item, col.key);

        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value, item);
        } else {
          value = CSVGenerator.formatValue(value, { dateFormat, currencySymbol, type: col.type });
        }

        return CSVGenerator.escape(String(value ?? ''), delimiter);
      });
      rows.push(row.join(delimiter));
    }

    return rows.join('\n');
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  static formatValue(value, options = {}) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      return options.dateFormat === 'ISO'
        ? value.toISOString()
        : value.toLocaleDateString('en-IN');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  }

  static escape(value, delimiter = ',') {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

// ============================================================================
// § 2 — JSON Exporter (structured)
// ============================================================================

class JSONExporter {
  static generate(data, options = {}) {
    const {
      pretty = true,
      includeMetadata = true,
      fields = null, // Whitelist of fields to include
    } = options;

    // Filter fields if specified
    let exportData = data;
    if (fields && Array.isArray(data)) {
      exportData = data.map(item => {
        const filtered = {};
        for (const field of fields) {
          const value = CSVGenerator.getNestedValue(item, field);
          if (value !== undefined) {
            filtered[field] = value;
          }
        }
        return filtered;
      });
    }

    const output = {
      ...(includeMetadata && {
        metadata: {
          exportDate: new Date().toISOString(),
          recordCount: Array.isArray(exportData) ? exportData.length : 1,
          application: 'FinancialAnalyzer Enterprise',
          version: '2.0.0',
        },
      }),
      data: exportData,
    };

    return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  }
}

// ============================================================================
// § 3 — Transaction Export Templates
// ============================================================================

const EXPORT_TEMPLATES = {
  transactions: {
    label: 'Transactions',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'merchant', label: 'Merchant' },
      { key: 'tags', label: 'Tags', formatter: (v) => (Array.isArray(v) ? v.join(', ') : v || '') },
      { key: 'notes', label: 'Notes' },
    ],
  },

  monthlyReport: {
    label: 'Monthly Report',
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'totalIncome', label: 'Total Income', type: 'currency' },
      { key: 'totalExpense', label: 'Total Expense', type: 'currency' },
      { key: 'savings', label: 'Savings', type: 'currency' },
      { key: 'savingsRate', label: 'Savings Rate (%)', type: 'percent' },
      { key: 'transactionCount', label: 'Transactions' },
      { key: 'topCategory', label: 'Top Category' },
      { key: 'avgDailySpend', label: 'Avg Daily Spend', type: 'currency' },
    ],
  },

  budgets: {
    label: 'Budget Report',
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'budgetLimit', label: 'Budget Limit', type: 'currency' },
      { key: 'spent', label: 'Spent', type: 'currency' },
      { key: 'remaining', label: 'Remaining', type: 'currency' },
      { key: 'percentage', label: 'Usage (%)', type: 'percent' },
      { key: 'status', label: 'Status' },
    ],
  },

  goals: {
    label: 'Financial Goals',
    columns: [
      { key: 'name', label: 'Goal Name' },
      { key: 'category', label: 'Category' },
      { key: 'targetAmount', label: 'Target', type: 'currency' },
      { key: 'currentAmount', label: 'Current', type: 'currency' },
      { key: 'progress', label: 'Progress (%)', type: 'percent' },
      { key: 'deadline', label: 'Deadline', type: 'date' },
      { key: 'monthlySavings', label: 'Monthly Savings', type: 'currency' },
      { key: 'status', label: 'Status' },
    ],
  },

  emiSchedule: {
    label: 'EMI Schedule',
    columns: [
      { key: 'loanName', label: 'Loan Name' },
      { key: 'lender', label: 'Lender' },
      { key: 'emiAmount', label: 'EMI Amount', type: 'currency' },
      { key: 'principal', label: 'Principal', type: 'currency' },
      { key: 'interest', label: 'Interest', type: 'currency' },
      { key: 'balance', label: 'Outstanding', type: 'currency' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },

  investments: {
    label: 'Investment Portfolio',
    columns: [
      { key: 'name', label: 'Investment Name' },
      { key: 'type', label: 'Type' },
      { key: 'investedAmount', label: 'Invested', type: 'currency' },
      { key: 'currentValue', label: 'Current Value', type: 'currency' },
      { key: 'returns', label: 'Returns', type: 'currency' },
      { key: 'returnPercent', label: 'Return (%)', type: 'percent' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'allocation', label: 'Allocation (%)' },
    ],
  },

  taxReport: {
    label: 'Tax Report',
    columns: [
      { key: 'section', label: 'Section' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'limit', label: 'Limit', type: 'currency' },
      { key: 'utilized', label: 'Utilized', type: 'currency' },
      { key: 'remaining', label: 'Remaining', type: 'currency' },
    ],
  },

  creditCards: {
    label: 'Credit Card Statement',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'cardName', label: 'Card' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'rewardPoints', label: 'Reward Points' },
    ],
  },
};

// ============================================================================
// § 4 — Export Job Manager
// ============================================================================

class ExportJobManager {
  constructor() {
    this.jobs = new Map();
    this.completedJobs = [];
    this.maxCompleted = 50;
  }

  createJob(userId, type, format, options = {}) {
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    const job = {
      id: jobId,
      userId,
      type,
      format,
      options,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      result: null,
      fileSize: 0,
    };

    this.jobs.set(jobId, job);
    return job;
  }

  updateProgress(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      job.status = 'processing';
    }
  }

  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      job.result = result;
      job.fileSize = result ? Buffer.byteLength(result, 'utf8') : 0;

      this.completedJobs.push({ ...job, result: null }); // Don't store full result in history
      if (this.completedJobs.length > this.maxCompleted) {
        this.completedJobs = this.completedJobs.slice(-this.maxCompleted);
      }
    }
    return job;
  }

  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date().toISOString();
    }
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getUserJobs(userId) {
    return Array.from(this.jobs.values())
      .filter(j => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  cleanup(maxAgeMs = 3600000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, job] of this.jobs) {
      if (new Date(job.createdAt).getTime() < cutoff && job.status !== 'processing') {
        this.jobs.delete(id);
      }
    }
  }
}

// ============================================================================
// § 5 — Data Aggregator (prepares data for export)
// ============================================================================

class DataAggregator {
  /**
   * Aggregate transactions into monthly summaries
   */
  static monthlyAggregation(transactions) {
    const months = {};

    for (const txn of transactions) {
      const date = new Date(txn.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          totalIncome: 0,
          totalExpense: 0,
          savings: 0,
          savingsRate: 0,
          transactionCount: 0,
          categories: {},
          topCategory: '',
          avgDailySpend: 0,
        };
      }

      const m = months[monthKey];
      m.transactionCount++;

      if (txn.type === 'income' || txn.type === 'credit') {
        m.totalIncome += Math.abs(txn.amount);
      } else {
        m.totalExpense += Math.abs(txn.amount);
        const cat = txn.category || 'Uncategorized';
        m.categories[cat] = (m.categories[cat] || 0) + Math.abs(txn.amount);
      }
    }

    // Calculate derived fields
    for (const m of Object.values(months)) {
      m.savings = m.totalIncome - m.totalExpense;
      m.savingsRate = m.totalIncome > 0
        ? Math.round((m.savings / m.totalIncome) * 10000) / 100
        : 0;

      // Top category
      const topCat = Object.entries(m.categories).sort((a, b) => b[1] - a[1])[0];
      m.topCategory = topCat ? topCat[0] : 'N/A';

      // Avg daily spend (assume 30 days)
      m.avgDailySpend = Math.round(m.totalExpense / 30);

      // Round currency values
      m.totalIncome = Math.round(m.totalIncome);
      m.totalExpense = Math.round(m.totalExpense);
      m.savings = Math.round(m.savings);
      m.avgDailySpend = Math.round(m.avgDailySpend);

      // Remove categories object from export
      delete m.categories;
    }

    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Aggregate by category
   */
  static categoryAggregation(transactions) {
    const categories = {};

    for (const txn of transactions) {
      if (txn.type === 'income' || txn.type === 'credit') continue;
      const cat = txn.category || 'Uncategorized';
      if (!categories[cat]) {
        categories[cat] = { category: cat, total: 0, count: 0, avgAmount: 0, maxAmount: 0 };
      }
      const amount = Math.abs(txn.amount);
      categories[cat].total += amount;
      categories[cat].count++;
      categories[cat].maxAmount = Math.max(categories[cat].maxAmount, amount);
    }

    for (const c of Object.values(categories)) {
      c.avgAmount = Math.round(c.total / c.count);
      c.total = Math.round(c.total);
      c.maxAmount = Math.round(c.maxAmount);
    }

    return Object.values(categories).sort((a, b) => b.total - a.total);
  }

  /**
   * Aggregate by merchant
   */
  static merchantAggregation(transactions) {
    const merchants = {};

    for (const txn of transactions) {
      const merchant = txn.merchant || txn.description?.split(' ')[0] || 'Unknown';
      if (!merchants[merchant]) {
        merchants[merchant] = {
          merchant,
          totalSpent: 0,
          count: 0,
          avgAmount: 0,
          lastTransaction: null,
          categories: new Set(),
        };
      }
      const m = merchants[merchant];
      m.totalSpent += Math.abs(txn.amount);
      m.count++;
      m.lastTransaction = txn.date;
      if (txn.category) m.categories.add(txn.category);
    }

    for (const m of Object.values(merchants)) {
      m.avgAmount = Math.round(m.totalSpent / m.count);
      m.totalSpent = Math.round(m.totalSpent);
      m.categories = Array.from(m.categories).join(', ');
    }

    return Object.values(merchants).sort((a, b) => b.totalSpent - a.totalSpent);
  }
}

// ============================================================================
// § 6 — Main Export Engine
// ============================================================================

class ExportEngine {
  constructor() {
    this.jobManager = new ExportJobManager();
    this.templates = EXPORT_TEMPLATES;
  }

  /**
   * Execute an export job
   */
  async executeExport(userId, type, format, data, options = {}) {
    const job = this.jobManager.createJob(userId, type, format, options);

    try {
      this.jobManager.updateProgress(job.id, 10);

      // Get template
      const template = this.templates[type];

      // Apply aggregation if needed
      let exportData = data;
      if (options.aggregate === 'monthly') {
        exportData = DataAggregator.monthlyAggregation(data);
      } else if (options.aggregate === 'category') {
        exportData = DataAggregator.categoryAggregation(data);
      } else if (options.aggregate === 'merchant') {
        exportData = DataAggregator.merchantAggregation(data);
      }

      this.jobManager.updateProgress(job.id, 40);

      // Apply date filters
      if (options.startDate || options.endDate) {
        exportData = exportData.filter(item => {
          const date = new Date(item.date || item.createdAt);
          if (options.startDate && date < new Date(options.startDate)) return false;
          if (options.endDate && date > new Date(options.endDate)) return false;
          return true;
        });
      }

      this.jobManager.updateProgress(job.id, 60);

      // Generate output
      let result;
      if (format === 'csv') {
        result = CSVGenerator.generate(exportData, {
          columns: template?.columns,
          ...options,
        });
      } else if (format === 'json') {
        result = JSONExporter.generate(exportData, {
          fields: template?.columns?.map(c => c.key),
          ...options,
        });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      this.jobManager.updateProgress(job.id, 90);

      // Complete the job
      this.jobManager.completeJob(job.id, result);

      return {
        jobId: job.id,
        status: 'completed',
        format,
        type,
        recordCount: exportData.length,
        fileSize: Buffer.byteLength(result, 'utf8'),
        data: result,
      };
    } catch (error) {
      this.jobManager.failJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Save export to file
   */
  async saveToFile(exportResult, outputDir = './exports') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = exportResult.format === 'csv' ? 'csv' : 'json';
    const filename = `${exportResult.type}_${timestamp}.${ext}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, exportResult.data, 'utf8');

    return {
      filename,
      filepath,
      size: exportResult.fileSize,
    };
  }

  /**
   * Get available export templates
   */
  getTemplates() {
    return Object.entries(this.templates).map(([key, template]) => ({
      id: key,
      label: template.label,
      columns: template.columns.map(c => c.label || c.key),
    }));
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return this.jobManager.getJob(jobId);
  }

  /**
   * Get user's export history
   */
  getUserExportHistory(userId) {
    return this.jobManager.getUserJobs(userId);
  }
}

// ============================================================================
// § 7 — Export Routes Handler
// ============================================================================

function createExportRoutes(exportEngine) {
  const express = require('express');
  const router = express.Router();

  // Get available templates
  router.get('/templates', (req, res) => {
    res.json({ success: true, data: exportEngine.getTemplates() });
  });

  // Export transactions
  router.post('/transactions', async (req, res) => {
    try {
      const { format = 'csv', startDate, endDate, aggregate } = req.body;
      const userId = req.user?.id || req.user?._id;

      // Fetch transactions (using the Transaction model)
      let Transaction;
      try { Transaction = require('../models/Transaction'); } catch { /* ignore */ }

      let transactions = [];
      if (Transaction) {
        const query = { user: userId };
        if (startDate) query.date = { ...(query.date || {}), $gte: new Date(startDate) };
        if (endDate) query.date = { ...(query.date || {}), $lte: new Date(endDate) };
        transactions = await Transaction.find(query).sort({ date: -1 }).lean();
      }

      const result = await exportEngine.executeExport(
        userId, 'transactions', format, transactions,
        { startDate, endDate, aggregate }
      );

      // Set appropriate headers for download
      const ext = format === 'csv' ? 'csv' : 'json';
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="transactions_export.${ext}"`);
      res.send(result.data);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export monthly report
  router.post('/monthly-report', async (req, res) => {
    try {
      const { format = 'csv', months = 12 } = req.body;
      const userId = req.user?.id || req.user?._id;

      let Transaction;
      try { Transaction = require('../models/Transaction'); } catch { /* ignore */ }

      let transactions = [];
      if (Transaction) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        transactions = await Transaction.find({
          user: userId,
          date: { $gte: startDate },
        }).sort({ date: -1 }).lean();
      }

      const result = await exportEngine.executeExport(
        userId, 'monthlyReport', format, transactions,
        { aggregate: 'monthly' }
      );

      const ext = format === 'csv' ? 'csv' : 'json';
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="monthly_report.${ext}"`);
      res.send(result.data);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export budget report
  router.post('/budgets', async (req, res) => {
    try {
      const { format = 'csv' } = req.body;
      const userId = req.user?.id || req.user?._id;

      let Budget;
      try { Budget = require('../models/Budget'); } catch { /* ignore */ }

      let budgets = [];
      if (Budget) {
        budgets = await Budget.find({ user: userId }).lean();
      }

      const result = await exportEngine.executeExport(userId, 'budgets', format, budgets);

      const ext = format === 'csv' ? 'csv' : 'json';
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="budget_report.${ext}"`);
      res.send(result.data);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export goals
  router.post('/goals', async (req, res) => {
    try {
      const { format = 'csv' } = req.body;
      const userId = req.user?.id || req.user?._id;

      let Goal;
      try { Goal = require('../models/Goal'); } catch { /* ignore */ }

      let goals = [];
      if (Goal) {
        goals = await Goal.find({ user: userId }).lean();
      }

      const result = await exportEngine.executeExport(userId, 'goals', format, goals);

      const ext = format === 'csv' ? 'csv' : 'json';
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="goals_export.${ext}"`);
      res.send(result.data);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get export history
  router.get('/history', (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const history = exportEngine.getUserExportHistory(userId);
    res.json({ success: true, data: history });
  });

  // Get job status
  router.get('/status/:jobId', (req, res) => {
    const job = exportEngine.getJobStatus(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Export job not found' });
    }
    res.json({ success: true, data: job });
  });

  return router;
}

// ============================================================================
// § 8 — Singleton & Exports
// ============================================================================

const exportEngine = new ExportEngine();

module.exports = {
  exportEngine,
  ExportEngine,
  CSVGenerator,
  JSONExporter,
  DataAggregator,
  ExportJobManager,
  EXPORT_TEMPLATES,
  createExportRoutes,
};
