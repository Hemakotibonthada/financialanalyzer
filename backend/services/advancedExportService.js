const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Models (lazy-loaded)
// ---------------------------------------------------------------------------

let Transaction, Budget, Goal, ExportHistory;

function loadModels() {
  if (!Transaction) {
    try {
      Transaction = require('../models/Transaction');
      Budget = require('../models/Budget');
      Goal = require('../models/Goal');
    } catch (err) {
      logger.warn('Some models could not be loaded:', err.message);
    }
  }
  if (!ExportHistory) {
    try {
      ExportHistory = require('../models/ExportHistory');
    } catch {
      logger.warn('ExportHistory model not found – history tracking disabled');
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

async function fetchTransactionsForExport(userId, filters = {}) {
  loadModels();
  if (!Transaction) return [];

  const query = { userId };

  const dateFilter = buildDateFilter(filters.startDate, filters.endDate);
  if (dateFilter) query.date = dateFilter;
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.minAmount) query.amount = { ...(query.amount || {}), $gte: filters.minAmount };
  if (filters.maxAmount) query.amount = { ...(query.amount || {}), $lte: filters.maxAmount };
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

  return Transaction.find(query)
    .sort({ date: -1 })
    .lean();
}

function escapeCSVField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCurrency(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

async function recordExport(userId, exportData) {
  try {
    loadModels();
    if (!ExportHistory) return null;

    const record = new ExportHistory({
      userId,
      ...exportData,
      createdAt: new Date(),
    });
    await record.save();
    return record.toObject();
  } catch (err) {
    logger.warn('Could not record export history:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Report templates
// ---------------------------------------------------------------------------

const TEMPLATES = {
  monthly_summary: {
    name: 'Monthly Summary',
    description: 'Income, expenses, savings, and category breakdown for a month',
    sections: ['summary', 'categories', 'transactions'],
  },
  annual_report: {
    name: 'Annual Financial Report',
    description: 'Full year overview with monthly trends',
    sections: ['summary', 'trends', 'categories', 'goals', 'transactions'],
  },
  expense_report: {
    name: 'Expense Report',
    description: 'Detailed expense listing for reimbursement',
    sections: ['summary', 'transactions'],
    filters: { type: 'expense' },
  },
  budget_report: {
    name: 'Budget vs Actual',
    description: 'Compare budgets with actual spending',
    sections: ['summary', 'budgets'],
  },
  goal_progress: {
    name: 'Goal Progress Report',
    description: 'Financial goal tracking and projections',
    sections: ['goals'],
  },
};

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Generate a filtered CSV export.
 */
async function generateCSVExport(userId, options = {}) {
  try {
    const { filters = {}, columns, includeHeaders = true } = options;
    const transactions = await fetchTransactionsForExport(userId, filters);

    const defaultColumns = ['date', 'type', 'category', 'description', 'amount', 'tags'];
    const cols = columns || defaultColumns;

    const rows = [];

    if (includeHeaders) {
      rows.push(cols.map((c) => escapeCSVField(c.charAt(0).toUpperCase() + c.slice(1))).join(','));
    }

    for (const txn of transactions) {
      const row = cols.map((col) => {
        let value = txn[col];
        if (col === 'date' && value) value = new Date(value).toISOString().split('T')[0];
        if (col === 'amount') value = Number(value || 0).toFixed(2);
        if (col === 'tags' && Array.isArray(value)) value = value.join('; ');
        return escapeCSVField(value);
      });
      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');

    await recordExport(userId, {
      format: 'csv',
      filters,
      recordCount: transactions.length,
      fileSize: Buffer.byteLength(csvContent, 'utf8'),
    });

    logger.info(`Generated CSV export for user ${userId}: ${transactions.length} records`);

    return {
      content: csvContent,
      filename: `financial_export_${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
      recordCount: transactions.length,
    };
  } catch (err) {
    logger.error('generateCSVExport error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HTML Report
// ---------------------------------------------------------------------------

/**
 * Generate a formatted HTML report.
 */
async function generateHTMLReport(userId, options = {}) {
  try {
    const {
      title = 'Financial Report',
      template = 'monthly_summary',
      filters = {},
      currency = 'INR',
    } = options;

    const transactions = await fetchTransactionsForExport(userId, filters);

    // Calculate summary
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const savings = income - expenses;

    // Category breakdown
    const categoryMap = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + (t.amount || 0);
      });
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, percentage: expenses > 0 ? ((amount / expenses) * 100).toFixed(1) : '0.0' }));

    const dateRange = filters.startDate && filters.endDate
      ? `${new Date(filters.startDate).toLocaleDateString()} – ${new Date(filters.endDate).toLocaleDateString()}`
      : 'All time';

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; color: #1a1a2e; background: #f8f9fa; }
    h1 { color: #16213e; border-bottom: 2px solid #0f3460; padding-bottom: 0.5rem; }
    h2 { color: #0f3460; margin-top: 2rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .summary-card { background: #fff; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-card .label { font-size: 0.85rem; color: #666; }
    .summary-card .value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; }
    .income { color: #27ae60; }
    .expense { color: #e74c3c; }
    .savings { color: #2980b9; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #0f3460; color: #fff; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Period: ${dateRange} &bull; Generated: ${new Date().toLocaleString()} &bull; Template: ${TEMPLATES[template]?.name || template}</p>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-card"><div class="label">Total Income</div><div class="value income">${formatCurrency(income, currency)}</div></div>
    <div class="summary-card"><div class="label">Total Expenses</div><div class="value expense">${formatCurrency(expenses, currency)}</div></div>
    <div class="summary-card"><div class="label">Net Savings</div><div class="value savings">${formatCurrency(savings, currency)}</div></div>
    <div class="summary-card"><div class="label">Transactions</div><div class="value">${transactions.length}</div></div>
  </div>

  <h2>Category Breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th>Amount</th><th>% of Expenses</th></tr></thead>
    <tbody>
      ${categories.map((c) => `<tr><td>${c.name}</td><td>${formatCurrency(c.amount, currency)}</td><td>${c.percentage}%</td></tr>`).join('\n      ')}
    </tbody>
  </table>

  <h2>Transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      ${transactions.slice(0, 200).map((t) => `<tr>
        <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
        <td>${t.type || '—'}</td>
        <td>${t.category || '—'}</td>
        <td>${t.description || '—'}</td>
        <td class="${t.type === 'income' ? 'income' : 'expense'}">${formatCurrency(t.amount || 0, currency)}</td>
      </tr>`).join('\n      ')}
      ${transactions.length > 200 ? `<tr><td colspan="5" style="text-align:center;color:#999;">...and ${transactions.length - 200} more transactions</td></tr>` : ''}
    </tbody>
  </table>

  <div class="footer">Financial Analyzer &mdash; Report generated automatically</div>
</body>
</html>`;

    await recordExport(userId, {
      format: 'html',
      template,
      filters,
      recordCount: transactions.length,
      fileSize: Buffer.byteLength(html, 'utf8'),
    });

    logger.info(`Generated HTML report for user ${userId}: ${transactions.length} records`);

    return {
      content: html,
      filename: `financial_report_${new Date().toISOString().split('T')[0]}.html`,
      mimeType: 'text/html',
      recordCount: transactions.length,
    };
  } catch (err) {
    logger.error('generateHTMLReport error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// PDF Report (generates HTML and marks as PDF-ready)
// ---------------------------------------------------------------------------

/**
 * Generate a PDF financial report.
 * Produces HTML content optimised for PDF conversion.
 * In production, pipe through puppeteer / wkhtmltopdf / a PDF service.
 */
async function generatePDFReport(userId, options = {}) {
  try {
    const htmlReport = await generateHTMLReport(userId, {
      ...options,
      title: options.title || 'Financial Report (PDF)',
    });

    // In a real implementation, convert HTML → PDF here.
    // Example with puppeteer (not included to avoid heavy deps):
    //   const browser = await puppeteer.launch();
    //   const page = await browser.newPage();
    //   await page.setContent(htmlReport.content);
    //   const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    //   await browser.close();

    const pdfContent = htmlReport.content; // placeholder – HTML content ready for conversion

    await recordExport(userId, {
      format: 'pdf',
      template: options.template || 'monthly_summary',
      filters: options.filters || {},
      recordCount: htmlReport.recordCount,
      fileSize: Buffer.byteLength(pdfContent, 'utf8'),
    });

    logger.info(`Generated PDF report for user ${userId}: ${htmlReport.recordCount} records`);

    return {
      content: pdfContent,
      filename: `financial_report_${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf',
      recordCount: htmlReport.recordCount,
      note: 'PDF conversion requires a rendering engine (e.g. puppeteer). Returning print-optimised HTML.',
    };
  } catch (err) {
    logger.error('generatePDFReport error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Excel Report
// ---------------------------------------------------------------------------

/**
 * Generate an Excel-compatible report (CSV with multiple sections).
 * For full .xlsx support, integrate a library like exceljs.
 */
async function generateExcelReport(userId, options = {}) {
  try {
    const { filters = {}, currency = 'INR' } = options;
    const transactions = await fetchTransactionsForExport(userId, filters);

    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Category breakdown
    const categoryMap = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + (t.amount || 0);
      });

    const sheets = [];

    // Sheet 1: Summary
    const summaryRows = [
      ['Financial Summary Report'],
      ['Generated', new Date().toISOString()],
      [''],
      ['Metric', 'Value'],
      ['Total Income', income.toFixed(2)],
      ['Total Expenses', expenses.toFixed(2)],
      ['Net Savings', (income - expenses).toFixed(2)],
      ['Savings Rate', income > 0 ? `${Math.round(((income - expenses) / income) * 100)}%` : '0%'],
      ['Total Transactions', transactions.length],
    ];
    sheets.push({ name: 'Summary', rows: summaryRows });

    // Sheet 2: Categories
    const catRows = [['Category', 'Total Amount', '% of Expenses']];
    Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        catRows.push([cat, amount.toFixed(2), expenses > 0 ? `${((amount / expenses) * 100).toFixed(1)}%` : '0%']);
      });
    sheets.push({ name: 'Categories', rows: catRows });

    // Sheet 3: Transactions
    const txnRows = [['Date', 'Type', 'Category', 'Description', 'Amount', 'Tags']];
    for (const txn of transactions) {
      txnRows.push([
        txn.date ? new Date(txn.date).toISOString().split('T')[0] : '',
        txn.type || '',
        txn.category || '',
        txn.description || '',
        (txn.amount || 0).toFixed(2),
        Array.isArray(txn.tags) ? txn.tags.join('; ') : '',
      ]);
    }
    sheets.push({ name: 'Transactions', rows: txnRows });

    // Convert to CSV (tab-separated for Excel compatibility)
    const csvSheets = sheets.map((sheet) => {
      const header = `--- ${sheet.name} ---`;
      const body = sheet.rows.map((row) => row.map(escapeCSVField).join('\t')).join('\n');
      return `${header}\n${body}`;
    });

    const content = csvSheets.join('\n\n');

    await recordExport(userId, {
      format: 'excel',
      filters,
      recordCount: transactions.length,
      fileSize: Buffer.byteLength(content, 'utf8'),
    });

    logger.info(`Generated Excel report for user ${userId}: ${transactions.length} records`);

    return {
      content,
      filename: `financial_report_${new Date().toISOString().split('T')[0]}.xls`,
      mimeType: 'application/vnd.ms-excel',
      recordCount: transactions.length,
      sheets: sheets.map((s) => s.name),
    };
  } catch (err) {
    logger.error('generateExcelReport error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Scheduled reports
// ---------------------------------------------------------------------------

/**
 * Schedule a recurring report.
 */
async function scheduleReport(userId, scheduleData) {
  try {
    loadModels();

    const {
      name,
      format = 'pdf',
      template = 'monthly_summary',
      filters = {},
      frequency = 'monthly', // 'weekly' | 'monthly' | 'quarterly'
      deliveryMethod = 'email', // 'email' | 'download'
      email,
      isActive = true,
    } = scheduleData;

    const schedule = {
      userId,
      name: name || `${TEMPLATES[template]?.name || template} – ${frequency}`,
      format,
      template,
      filters,
      frequency,
      deliveryMethod,
      email,
      isActive,
      nextRunAt: calculateNextRun(frequency),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In a real app, persist to a ScheduledReport model and run via cron
    logger.info(`Scheduled ${frequency} ${format} report "${schedule.name}" for user ${userId}`);

    return {
      ...schedule,
      _id: `sched_${Date.now()}`,
    };
  } catch (err) {
    logger.error('scheduleReport error:', err);
    throw err;
  }
}

function calculateNextRun(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      now.setDate(1);
      break;
    default:
      now.setMonth(now.getMonth() + 1);
  }
  now.setHours(8, 0, 0, 0); // 8 AM
  return now;
}

// ---------------------------------------------------------------------------
// Export history
// ---------------------------------------------------------------------------

/**
 * Get previous export history for a user.
 */
async function getExportHistory(userId, { page = 1, limit = 20 } = {}) {
  try {
    loadModels();
    if (!ExportHistory) {
      return { exports: [], total: 0, page, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const [exports, total] = await Promise.all([
      ExportHistory.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ExportHistory.countDocuments({ userId }),
    ]);

    return {
      exports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    logger.error('getExportHistory error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generatePDFReport,
  generateExcelReport,
  generateCSVExport,
  generateHTMLReport,
  scheduleReport,
  getExportHistory,
  TEMPLATES,
};
