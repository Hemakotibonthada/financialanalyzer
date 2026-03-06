// ============================================================================
// Gmail Financial Report Generator — Comprehensive Financial Reporting
// ============================================================================
// Generates detailed financial reports from Gmail-synced email data.
// Supports monthly/annual summaries, tax reports, spending pattern analysis,
// bank reconciliation, and custom date-range reports.
// All amounts use INR formatting (Lakh/Crore notation).
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const GmailEmail = require('../../models/GmailEmail');
const Transaction = require('../../models/Transaction');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Indian financial year starts April 1 */
const FY_START_MONTH = 3; // 0-indexed: April

/** Tax deduction sections under the Income Tax Act, 1961 */
const TAX_SECTIONS = {
  '80C': {
    label: 'Section 80C — Investments & Savings',
    limit: 150000,
    keywords: ['ppf', 'public provident fund', 'elss', 'equity linked', 'lic', 'life insurance',
      'nsc', 'national savings', 'sukanya', 'tax saver', 'tuition fee', 'home loan principal',
      'epf', 'provident fund', 'nps tier 1', 'ulip', '5 year fd', 'five year fd'],
  },
  '80D': {
    label: 'Section 80D — Health Insurance',
    limit: 75000, // self + parents (senior citizen)
    keywords: ['health insurance', 'mediclaim', 'medical insurance', 'star health',
      'care health', 'niva bupa', 'hdfc ergo health', 'preventive health checkup'],
  },
  '80E': {
    label: 'Section 80E — Education Loan Interest',
    limit: Infinity,
    keywords: ['education loan', 'student loan interest'],
  },
  '24': {
    label: 'Section 24 — Home Loan Interest',
    limit: 200000,
    keywords: ['home loan interest', 'housing loan interest', 'mortgage interest'],
  },
  '80G': {
    label: 'Section 80G — Donations',
    limit: Infinity,
    keywords: ['donation', 'charitable', 'pm cares', 'chief minister relief'],
  },
  '80TTA': {
    label: 'Section 80TTA — Savings Interest',
    limit: 10000,
    keywords: ['savings account interest', 'interest credited'],
  },
};

/** Categories for spending classification */
const SPENDING_CATEGORIES = [
  'food', 'groceries', 'dining', 'transport', 'fuel', 'utilities', 'electricity',
  'water', 'gas', 'internet', 'mobile', 'rent', 'emi', 'loan', 'insurance',
  'health', 'medical', 'education', 'shopping', 'clothing', 'entertainment',
  'travel', 'subscriptions', 'investment', 'transfer', 'salary', 'other',
];

/** Day names for pattern analysis */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Month names for display */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Report Cache ─────────────────────────────────────────────────────────────

/**
 * In-memory report cache with TTL support.
 * Prevents redundant DB queries for recently generated reports.
 */
class ReportCache {
  constructor(ttlMs = 3600000) {
    /** @type {Map<string, {data: Object, expiresAt: number}>} */
    this._cache = new Map();
    /** @type {number} Cache entry TTL in milliseconds (default: 1 hour) */
    this._ttl = ttlMs;
    /** @type {number} Maximum cache entries before eviction */
    this._maxEntries = 200;
  }

  /**
   * Generate a deterministic cache key from parameters.
   * @param {string} reportType - The report type identifier
   * @param {string} userId - User ObjectId
   * @param  {...any} params - Additional key components
   * @returns {string} Cache key
   */
  key(reportType, userId, ...params) {
    return `${reportType}:${userId}:${params.join(':')}`;
  }

  /**
   * Retrieve a cached report if it exists and has not expired.
   * @param {string} cacheKey
   * @returns {Object|null} Cached report data or null
   */
  get(cacheKey) {
    const entry = this._cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(cacheKey);
      return null;
    }
    logger.debug(`[ReportCache] Cache HIT for key: ${cacheKey}`);
    return entry.data;
  }

  /**
   * Store a report in cache.
   * @param {string} cacheKey
   * @param {Object} data - Report data to cache
   */
  set(cacheKey, data) {
    // Evict oldest entries if cache is full
    if (this._cache.size >= this._maxEntries) {
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }
    this._cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this._ttl,
    });
    logger.debug(`[ReportCache] Cache SET for key: ${cacheKey}`);
  }

  /**
   * Invalidate all cache entries for a specific user.
   * @param {string} userId
   */
  invalidateUser(userId) {
    let count = 0;
    for (const key of this._cache.keys()) {
      if (key.includes(userId)) {
        this._cache.delete(key);
        count++;
      }
    }
    logger.debug(`[ReportCache] Invalidated ${count} entries for user ${userId}`);
  }

  /** Clear the entire cache */
  clear() {
    this._cache.clear();
    logger.debug('[ReportCache] Cache cleared');
  }
}

// ─── Formatting Utilities ─────────────────────────────────────────────────────

/**
 * Format an amount in Indian Rupee notation.
 * Uses Lakh (L) and Crore (Cr) suffixes for large amounts.
 *
 * @param {number} amount - The numeric amount
 * @param {boolean} [short=false] - Use abbreviated format (e.g. 1.5L, 2.3Cr)
 * @returns {string} Formatted currency string
 *
 * @example
 * formatCurrency(1500)      // '₹1,500.00'
 * formatCurrency(150000)    // '₹1,50,000.00'
 * formatCurrency(150000, true) // '₹1.50L'
 * formatCurrency(12500000, true) // '₹1.25Cr'
 */
function formatCurrency(amount, short = false) {
  if (amount == null || isNaN(amount)) return '₹0.00';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (short) {
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
    return `${sign}₹${abs.toFixed(2)}`;
  }

  // Full Indian number formatting: 1,23,45,678.00
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let formatted = '';
  const digits = intPart.split('');
  const len = digits.length;

  if (len <= 3) {
    formatted = intPart;
  } else {
    // Last 3 digits
    formatted = digits.slice(len - 3).join('');
    let remaining = digits.slice(0, len - 3);
    // Group remaining digits in pairs from right
    while (remaining.length > 0) {
      const group = remaining.splice(-2).join('');
      formatted = group + ',' + formatted;
    }
  }

  return `${sign}₹${formatted}.${decPart}`;
}

/**
 * Format a Date object into Indian date format (DD-MMM-YYYY).
 *
 * @param {Date|string} date - The date to format
 * @param {boolean} [includeTime=false] - Whether to include HH:MM
 * @returns {string} Formatted date string
 *
 * @example
 * formatDate(new Date('2025-04-15')) // '15-Apr-2025'
 * formatDate(new Date('2025-04-15T10:30:00'), true) // '15-Apr-2025 10:30'
 */
function formatDate(date, includeTime = false) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const year = d.getFullYear();

  let result = `${day}-${mon}-${year}`;
  if (includeTime) {
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    result += ` ${hrs}:${mins}`;
  }
  return result;
}

/**
 * Calculate growth rate between two values.
 *
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {{ rate: number, direction: string, formatted: string }}
 *
 * @example
 * calculateGrowthRate(12000, 10000) // { rate: 20, direction: 'up', formatted: '+20.00%' }
 */
function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) {
    return { rate: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat', formatted: 'N/A (no prior data)' };
  }
  const rate = ((current - previous) / Math.abs(previous)) * 100;
  const direction = rate > 0 ? 'up' : rate < 0 ? 'down' : 'flat';
  const formatted = `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
  return { rate, direction, formatted };
}

/**
 * Determine the Indian Financial Year for a given date.
 *
 * @param {Date} date
 * @returns {{ label: string, startDate: Date, endDate: Date }}
 */
function getFinancialYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();

  const fyStart = month >= FY_START_MONTH ? year : year - 1;
  const fyEnd = fyStart + 1;

  return {
    label: `FY ${fyStart}-${String(fyEnd).slice(2)}`,
    startDate: new Date(fyStart, FY_START_MONTH, 1),
    endDate: new Date(fyEnd, FY_START_MONTH, 0, 23, 59, 59, 999),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASS: GmailReportGenerator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive financial report generator that produces detailed reports
 * from Gmail-synced email data and linked transactions.
 *
 * Features:
 * - Monthly/Annual financial summaries
 * - Tax report generation (Indian ITR sections)
 * - Custom date-range reports with period comparison
 * - Bank reconciliation
 * - Spending pattern / ML-driven insights
 * - Report caching with 1-hour TTL
 *
 * @class
 */
class GmailReportGenerator {
  /**
   * Create a new GmailReportGenerator instance.
   * @param {Object} [options={}]
   * @param {number} [options.cacheTTL=3600000] - Cache TTL in ms (default: 1h)
   */
  constructor(options = {}) {
    /** @type {ReportCache} */
    this.cache = new ReportCache(options.cacheTTL || 3600000);

    /** @type {Map<string, Object>} Stored report metadata */
    this.reportMetadata = new Map();

    logger.info('[GmailReportGenerator] Initialized');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Monthly Financial Report
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a comprehensive monthly financial report.
   *
   * Includes: income vs expense breakdown, category-wise spending,
   * bank-wise summary, UPI analysis, credit card tracking, EMI payments,
   * top merchants, day-of-week patterns, and running balance estimation.
   *
   * @param {string} userId - User ObjectId
   * @param {number} year - Report year (e.g. 2025)
   * @param {number} month - Report month (1-12)
   * @returns {Promise<Object>} Monthly report object
   */
  async generateMonthlyReport(userId, year, month) {
    const timerLabel = `MonthlyReport:${userId}:${year}-${month}`;
    const startTime = Date.now();
    logger.info(`[MonthlyReport] Generating for user=${userId}, period=${year}-${String(month).padStart(2, '0')}`);

    // Check cache
    const cacheKey = this.cache.key('monthly', userId, year, month);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Date boundaries for the requested month
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Previous month boundaries for comparison
      const prevStart = new Date(year, month - 2, 1, 0, 0, 0, 0);
      const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

      // Fetch transactions and emails in parallel
      const [transactions, emails, prevTransactions] = await Promise.all([
        Transaction.find({
          userId,
          date: { $gte: startDate, $lte: endDate },
        }).lean(),
        GmailEmail.find({
          userId,
          date: { $gte: startDate, $lte: endDate },
          emailType: { $nin: ['promotional', 'unclassified'] },
        }).lean(),
        Transaction.find({
          userId,
          date: { $gte: prevStart, $lte: prevEnd },
        }).lean(),
      ]);

      logger.info(`[MonthlyReport] Found ${transactions.length} transactions, ${emails.length} emails for ${year}-${month}`);

      // ── Income vs Expense Breakdown ──
      const incomeExpense = this._calculateIncomeExpense(transactions);

      // ── Category-wise Spending ──
      const categoryBreakdown = this._calculateCategoryBreakdown(transactions);

      // ── Bank-wise Transaction Summary ──
      const bankSummary = this._calculateBankSummary(transactions, emails);

      // ── UPI Payment Analysis ──
      const upiAnalysis = this._analyzeUPIPayments(transactions, emails);

      // ── Credit Card Spend Tracking ──
      const creditCardAnalysis = this._analyzeCreditCardSpending(transactions, emails);

      // ── EMI / Loan Payment Tracking ──
      const emiTracking = this._trackEMIPayments(transactions, emails);

      // ── Top Merchants by Spend ──
      const topMerchants = this._getTopMerchants(transactions, 15);

      // ── Day-of-Week Spending Patterns ──
      const dayOfWeekPatterns = this._analyzeDayOfWeekPatterns(transactions);

      // ── Running Balance Estimation ──
      const runningBalance = this._estimateRunningBalance(transactions, startDate, endDate);

      // ── Month-over-Month Comparison ──
      const prevIncomeExpense = this._calculateIncomeExpense(prevTransactions);
      const momComparison = {
        income: calculateGrowthRate(incomeExpense.totalIncome, prevIncomeExpense.totalIncome),
        expense: calculateGrowthRate(incomeExpense.totalExpense, prevIncomeExpense.totalExpense),
        savings: calculateGrowthRate(incomeExpense.netSavings, prevIncomeExpense.netSavings),
        transactionCount: calculateGrowthRate(transactions.length, prevTransactions.length),
      };

      const report = {
        reportType: 'monthly',
        userId,
        period: {
          year,
          month,
          monthName: MONTH_NAMES[month - 1],
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          daysInMonth: endDate.getDate(),
        },
        summary: {
          totalTransactions: transactions.length,
          totalEmails: emails.length,
          ...incomeExpense,
          formatted: {
            totalIncome: formatCurrency(incomeExpense.totalIncome),
            totalExpense: formatCurrency(incomeExpense.totalExpense),
            netSavings: formatCurrency(incomeExpense.netSavings),
            savingsRate: `${incomeExpense.savingsRate.toFixed(1)}%`,
            avgDailySpend: formatCurrency(incomeExpense.totalExpense / endDate.getDate()),
          },
        },
        comparison: momComparison,
        categoryBreakdown,
        bankSummary,
        upiAnalysis,
        creditCardAnalysis,
        emiTracking,
        topMerchants,
        dayOfWeekPatterns,
        runningBalance,
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      // Cache the result
      this.cache.set(cacheKey, report);
      this._storeReportMetadata('monthly', userId, report);

      logger.info(`[MonthlyReport] Completed in ${Date.now() - startTime}ms`);
      return report;
    } catch (error) {
      logger.error(`[MonthlyReport] Failed for user=${userId}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Custom Date Range Report
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a report for an arbitrary date range with optional filters.
   *
   * @param {string} userId - User ObjectId
   * @param {Date|string} startDate - Range start (inclusive)
   * @param {Date|string} endDate - Range end (inclusive)
   * @param {Object} [options={}]
   * @param {string} [options.bank] - Filter by bank name
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.type] - Filter by transaction type (debit/credit)
   * @param {boolean} [options.comparePrevious=false] - Include comparison with previous equal-length period
   * @param {boolean} [options.includeTrends=false] - Include trend analysis
   * @returns {Promise<Object>} Custom report object
   */
  async generateCustomReport(userId, startDate, endDate, options = {}) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const startTime = Date.now();
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    logger.info(`[CustomReport] Generating for user=${userId}, range=${formatDate(start)} to ${formatDate(end)} (${periodDays} days)`);

    const cacheKey = this.cache.key('custom', userId, start.toISOString(), end.toISOString(), JSON.stringify(options));
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Build query filters
      const txQuery = { userId, date: { $gte: start, $lte: end } };
      if (options.category) txQuery.category = options.category;
      if (options.type) txQuery.type = options.type;

      const emailQuery = { userId, date: { $gte: start, $lte: end } };
      if (options.bank) {
        emailQuery.senderInstitution = { $regex: new RegExp(options.bank, 'i') };
      }

      const [transactions, emails] = await Promise.all([
        Transaction.find(txQuery).lean(),
        GmailEmail.find(emailQuery).lean(),
      ]);

      // Apply bank filter on transactions by matching accountNumber / source
      let filteredTx = transactions;
      if (options.bank) {
        filteredTx = transactions.filter(tx => {
          const bankMatch = (tx.description || '').toLowerCase().includes(options.bank.toLowerCase());
          const acctMatch = (tx.accountNumber || '').toLowerCase().includes(options.bank.toLowerCase());
          return bankMatch || acctMatch;
        });
        // If strict bank filter returned nothing, fall back to full set
        if (filteredTx.length === 0) filteredTx = transactions;
      }

      const incomeExpense = this._calculateIncomeExpense(filteredTx);
      const categoryBreakdown = this._calculateCategoryBreakdown(filteredTx);
      const topMerchants = this._getTopMerchants(filteredTx, 10);

      // ── Previous Period Comparison ──
      let comparison = null;
      if (options.comparePrevious) {
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - (end - start));
        prevStart.setHours(0, 0, 0, 0);

        const prevTx = await Transaction.find({
          userId,
          date: { $gte: prevStart, $lte: prevEnd },
        }).lean();

        const prevIE = this._calculateIncomeExpense(prevTx);
        comparison = {
          previousPeriod: { start: formatDate(prevStart), end: formatDate(prevEnd) },
          income: calculateGrowthRate(incomeExpense.totalIncome, prevIE.totalIncome),
          expense: calculateGrowthRate(incomeExpense.totalExpense, prevIE.totalExpense),
          savings: calculateGrowthRate(incomeExpense.netSavings, prevIE.netSavings),
          txCount: calculateGrowthRate(filteredTx.length, prevTx.length),
        };
      }

      // ── Trend Analysis ──
      let trendAnalysis = null;
      if (options.includeTrends) {
        trendAnalysis = this._calculateTrendAnalysis(filteredTx, start, end, periodDays);
      }

      const report = {
        reportType: 'custom',
        userId,
        period: {
          startDate: formatDate(start),
          endDate: formatDate(end),
          totalDays: periodDays,
        },
        filters: {
          bank: options.bank || 'All',
          category: options.category || 'All',
          type: options.type || 'All',
        },
        summary: {
          totalTransactions: filteredTx.length,
          totalEmails: emails.length,
          ...incomeExpense,
          formatted: {
            totalIncome: formatCurrency(incomeExpense.totalIncome),
            totalExpense: formatCurrency(incomeExpense.totalExpense),
            netSavings: formatCurrency(incomeExpense.netSavings),
            avgDailySpend: formatCurrency(incomeExpense.totalExpense / Math.max(periodDays, 1)),
          },
        },
        categoryBreakdown,
        topMerchants,
        comparison,
        trendAnalysis,
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      this.cache.set(cacheKey, report);
      this._storeReportMetadata('custom', userId, report);

      logger.info(`[CustomReport] Completed in ${Date.now() - startTime}ms`);
      return report;
    } catch (error) {
      logger.error(`[CustomReport] Failed for user=${userId}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Annual Financial Summary
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a comprehensive annual financial report.
   *
   * Includes: monthly comparison data, tax-relevant transactions,
   * investment income, insurance premiums, and overall savings rate.
   *
   * @param {string} userId - User ObjectId
   * @param {number} year - Calendar year (e.g. 2025)
   * @returns {Promise<Object>} Annual report object
   */
  async generateAnnualReport(userId, year) {
    const startTime = Date.now();
    logger.info(`[AnnualReport] Generating for user=${userId}, year=${year}`);

    const cacheKey = this.cache.key('annual', userId, year);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

      const [allTransactions, allEmails] = await Promise.all([
        Transaction.find({ userId, date: { $gte: yearStart, $lte: yearEnd } }).lean(),
        GmailEmail.find({ userId, date: { $gte: yearStart, $lte: yearEnd } }).lean(),
      ]);

      logger.info(`[AnnualReport] Processing ${allTransactions.length} transactions for year ${year}`);

      // ── Monthly Comparison Data ──
      const monthlyData = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(year, m, 1);
        const mEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
        const monthTx = allTransactions.filter(tx => {
          const d = new Date(tx.date);
          return d >= mStart && d <= mEnd;
        });
        const ie = this._calculateIncomeExpense(monthTx);
        monthlyData.push({
          month: m + 1,
          monthName: MONTH_NAMES[m],
          transactionCount: monthTx.length,
          ...ie,
          formatted: {
            income: formatCurrency(ie.totalIncome, true),
            expense: formatCurrency(ie.totalExpense, true),
            savings: formatCurrency(ie.netSavings, true),
          },
        });
      }

      // ── Tax-Relevant Transactions ──
      const taxRelevant = this._identifyTaxRelevantTransactions(allTransactions, allEmails);

      // ── Investment Income Summary ──
      const investmentSummary = this._calculateInvestmentSummary(allTransactions, allEmails);

      // ── Insurance Premium Tracking ──
      const insuranceSummary = this._trackInsurancePremiums(allTransactions, allEmails);

      // ── Overall Savings Rate ──
      const annualIE = this._calculateIncomeExpense(allTransactions);
      const savingsRate = annualIE.totalIncome > 0
        ? ((annualIE.netSavings / annualIE.totalIncome) * 100)
        : 0;

      // ── Category-wise Annual Breakdown ──
      const categoryBreakdown = this._calculateCategoryBreakdown(allTransactions);

      // ── Year-over-Year Comparison ──
      const prevYearStart = new Date(year - 1, 0, 1);
      const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      const prevYearTx = await Transaction.find({
        userId,
        date: { $gte: prevYearStart, $lte: prevYearEnd },
      }).lean();
      const prevIE = this._calculateIncomeExpense(prevYearTx);

      const yoyComparison = {
        income: calculateGrowthRate(annualIE.totalIncome, prevIE.totalIncome),
        expense: calculateGrowthRate(annualIE.totalExpense, prevIE.totalExpense),
        savings: calculateGrowthRate(annualIE.netSavings, prevIE.netSavings),
        transactionVolume: calculateGrowthRate(allTransactions.length, prevYearTx.length),
      };

      // ── Highest & Lowest Spend Months ──
      const sortedByExpense = [...monthlyData].sort((a, b) => b.totalExpense - a.totalExpense);
      const highestSpendMonth = sortedByExpense[0] || null;
      const lowestSpendMonth = sortedByExpense[sortedByExpense.length - 1] || null;

      const report = {
        reportType: 'annual',
        userId,
        year,
        summary: {
          totalTransactions: allTransactions.length,
          totalEmails: allEmails.length,
          ...annualIE,
          savingsRate: `${savingsRate.toFixed(1)}%`,
          formatted: {
            totalIncome: formatCurrency(annualIE.totalIncome),
            totalExpense: formatCurrency(annualIE.totalExpense),
            netSavings: formatCurrency(annualIE.netSavings),
            avgMonthlyIncome: formatCurrency(annualIE.totalIncome / 12),
            avgMonthlyExpense: formatCurrency(annualIE.totalExpense / 12),
          },
        },
        monthlyData,
        yoyComparison,
        highlights: {
          highestSpendMonth: highestSpendMonth
            ? { month: highestSpendMonth.monthName, amount: formatCurrency(highestSpendMonth.totalExpense) }
            : null,
          lowestSpendMonth: lowestSpendMonth
            ? { month: lowestSpendMonth.monthName, amount: formatCurrency(lowestSpendMonth.totalExpense) }
            : null,
          bestSavingsMonth: [...monthlyData].sort((a, b) => b.netSavings - a.netSavings)[0] || null,
        },
        categoryBreakdown,
        taxRelevant,
        investmentSummary,
        insuranceSummary,
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      this.cache.set(cacheKey, report);
      this._storeReportMetadata('annual', userId, report);

      logger.info(`[AnnualReport] Completed in ${Date.now() - startTime}ms`);
      return report;
    } catch (error) {
      logger.error(`[AnnualReport] Failed for user=${userId}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Bank Reconciliation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reconcile Gmail email alerts with recorded transactions.
   *
   * Identifies missing transactions, duplicates, and balance mismatches.
   *
   * @param {string} userId - User ObjectId
   * @param {{ startDate: Date|string, endDate: Date|string }} period
   * @returns {Promise<Object>} Reconciliation report
   */
  async reconcileWithBankStatements(userId, period) {
    const startTime = Date.now();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    end.setHours(23, 59, 59, 999);

    logger.info(`[BankReconciliation] Starting for user=${userId}, ${formatDate(start)} to ${formatDate(end)}`);

    const cacheKey = this.cache.key('reconciliation', userId, start.toISOString(), end.toISOString());
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const [transactions, emails] = await Promise.all([
        Transaction.find({ userId, date: { $gte: start, $lte: end } }).lean(),
        GmailEmail.find({
          userId,
          date: { $gte: start, $lte: end },
          emailType: { $in: [
            'bank_transaction_alert', 'credit_card_alert', 'upi_payment',
            'salary_credit', 'bill_payment', 'loan_emi',
          ] },
        }).lean(),
      ]);

      logger.info(`[BankReconciliation] Comparing ${transactions.length} transactions with ${emails.length} email alerts`);

      // ── Match emails to transactions ──
      const matched = [];
      const unmatchedEmails = [];
      const unmatchedTransactions = [];
      const possibleDuplicates = [];

      const txUsed = new Set();

      for (const email of emails) {
        const emailAmount = email.primaryAmount;
        const emailDate = new Date(email.date);
        if (!emailAmount) {
          unmatchedEmails.push({
            emailId: email._id,
            subject: email.subject,
            date: formatDate(email.date),
            reason: 'No amount extracted from email',
          });
          continue;
        }

        // Find matching transaction: same amount within ±1 day tolerance
        let bestMatch = null;
        let bestScore = 0;

        for (let i = 0; i < transactions.length; i++) {
          if (txUsed.has(i)) continue;
          const tx = transactions[i];
          const txDate = new Date(tx.date);
          const dayDiff = Math.abs(txDate - emailDate) / (1000 * 60 * 60 * 24);
          const amountDiff = Math.abs(tx.amount - emailAmount);
          const amountMatch = amountDiff < 0.01 || (amountDiff / emailAmount) < 0.005;

          if (amountMatch && dayDiff <= 1) {
            const score = (1 - dayDiff) * 50 + (amountMatch ? 50 : 0);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = { index: i, tx };
            }
          }
        }

        if (bestMatch) {
          txUsed.add(bestMatch.index);
          matched.push({
            emailId: email._id,
            transactionId: bestMatch.tx._id,
            amount: emailAmount,
            formattedAmount: formatCurrency(emailAmount),
            emailDate: formatDate(email.date),
            txDate: formatDate(bestMatch.tx.date),
            matchConfidence: `${Math.min(bestScore, 100).toFixed(0)}%`,
            emailSubject: email.subject,
            txDescription: bestMatch.tx.description,
          });
        } else {
          unmatchedEmails.push({
            emailId: email._id,
            subject: email.subject,
            date: formatDate(email.date),
            amount: formatCurrency(emailAmount),
            amountType: email.primaryAmountType,
            sender: email.from?.email,
            reason: 'No matching transaction found',
          });
        }
      }

      // Transactions not matched to any email
      for (let i = 0; i < transactions.length; i++) {
        if (!txUsed.has(i)) {
          const tx = transactions[i];
          unmatchedTransactions.push({
            transactionId: tx._id,
            description: tx.description,
            amount: formatCurrency(tx.amount),
            date: formatDate(tx.date),
            type: tx.type,
            source: tx.source,
          });
        }
      }

      // ── Detect Duplicate Transactions ──
      const txByAmount = new Map();
      for (const tx of transactions) {
        const key = `${tx.amount.toFixed(2)}:${tx.type}`;
        if (!txByAmount.has(key)) txByAmount.set(key, []);
        txByAmount.get(key).push(tx);
      }

      for (const [, txGroup] of txByAmount) {
        if (txGroup.length < 2) continue;
        for (let i = 0; i < txGroup.length; i++) {
          for (let j = i + 1; j < txGroup.length; j++) {
            const dayDiff = Math.abs(new Date(txGroup[i].date) - new Date(txGroup[j].date)) / (1000 * 60 * 60 * 24);
            if (dayDiff <= 1) {
              possibleDuplicates.push({
                transaction1: {
                  id: txGroup[i]._id,
                  description: txGroup[i].description,
                  date: formatDate(txGroup[i].date),
                  amount: formatCurrency(txGroup[i].amount),
                },
                transaction2: {
                  id: txGroup[j]._id,
                  description: txGroup[j].description,
                  date: formatDate(txGroup[j].date),
                  amount: formatCurrency(txGroup[j].amount),
                },
                daysBetween: dayDiff.toFixed(1),
                likelihood: dayDiff < 0.1 ? 'High' : 'Medium',
              });
            }
          }
        }
      }

      // ── Balance Verification ──
      const balanceVerification = this._verifyBalances(transactions, emails);

      const report = {
        reportType: 'bankReconciliation',
        userId,
        period: { startDate: formatDate(start), endDate: formatDate(end) },
        summary: {
          totalEmails: emails.length,
          totalTransactions: transactions.length,
          matched: matched.length,
          unmatchedEmails: unmatchedEmails.length,
          unmatchedTransactions: unmatchedTransactions.length,
          possibleDuplicates: possibleDuplicates.length,
          matchRate: emails.length > 0
            ? `${((matched.length / emails.length) * 100).toFixed(1)}%`
            : 'N/A',
        },
        matched,
        unmatchedEmails,
        unmatchedTransactions,
        possibleDuplicates,
        balanceVerification,
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      this.cache.set(cacheKey, report);
      this._storeReportMetadata('bankReconciliation', userId, report);

      logger.info(`[BankReconciliation] Completed in ${Date.now() - startTime}ms — matched=${matched.length}, unmatched emails=${unmatchedEmails.length}`);
      return report;
    } catch (error) {
      logger.error(`[BankReconciliation] Failed: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Spending Pattern Report
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze spending patterns over multiple months.
   *
   * Includes recurring payment detection, subscription tracking,
   * merchant loyalty, spending velocity, weekend vs weekday analysis,
   * and salary cycle correlation.
   *
   * @param {string} userId - User ObjectId
   * @param {number} [months=6] - Number of months to analyze
   * @returns {Promise<Object>} Spending pattern report
   */
  async analyzeSpendingPatterns(userId, months = 6) {
    const startTime = Date.now();
    logger.info(`[SpendingPatterns] Analyzing ${months} months for user=${userId}`);

    const cacheKey = this.cache.key('patterns', userId, months);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - months);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [transactions, emails] = await Promise.all([
        Transaction.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean(),
        GmailEmail.find({ userId, date: { $gte: start, $lte: end } }).lean(),
      ]);

      logger.info(`[SpendingPatterns] Processing ${transactions.length} transactions over ${months} months`);

      // ── Recurring Payment Detection ──
      const recurringPayments = this._detectRecurringPayments(transactions);

      // ── Subscription Tracking from Emails ──
      const subscriptions = this._trackSubscriptions(transactions, emails);

      // ── Merchant Loyalty Analysis ──
      const merchantLoyalty = this._analyzeMerchantLoyalty(transactions);

      // ── Spending Velocity Trends ──
      const spendingVelocity = this._calculateSpendingVelocity(transactions, months);

      // ── Weekend vs Weekday Analysis ──
      const weekendWeekday = this._analyzeWeekendVsWeekday(transactions);

      // ── Salary Cycle Correlation ──
      const salaryCycle = this._analyzeSalaryCycle(transactions);

      // ── Spending Anomalies ──
      const anomalies = this._detectSpendingAnomalies(transactions);

      const report = {
        reportType: 'spendingPatterns',
        userId,
        analysisWindow: {
          months,
          startDate: formatDate(start),
          endDate: formatDate(end),
          totalTransactions: transactions.length,
        },
        recurringPayments,
        subscriptions,
        merchantLoyalty,
        spendingVelocity,
        weekendWeekday,
        salaryCycle,
        anomalies,
        insights: this._generateSpendingInsights({
          recurringPayments,
          subscriptions,
          merchantLoyalty,
          weekendWeekday,
          salaryCycle,
          anomalies,
        }),
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      this.cache.set(cacheKey, report);
      this._storeReportMetadata('spendingPatterns', userId, report);

      logger.info(`[SpendingPatterns] Completed in ${Date.now() - startTime}ms`);
      return report;
    } catch (error) {
      logger.error(`[SpendingPatterns] Failed: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Tax Report
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a tax filing helper report for an Indian Financial Year.
   *
   * Identifies potential deductions under Sections 80C, 80D, 80E, 24, 80G, 80TTA.
   * Tracks TDS certificates, HRA-related payments, and capital gains.
   *
   * @param {string} userId - User ObjectId
   * @param {string} financialYear - e.g. '2024-25' (April 2024 to March 2025)
   * @returns {Promise<Object>} Tax report
   */
  async generateTaxReport(userId, financialYear) {
    const startTime = Date.now();
    logger.info(`[TaxReport] Generating for user=${userId}, FY=${financialYear}`);

    const cacheKey = this.cache.key('tax', userId, financialYear);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Parse financial year string
      const [fyStartYear] = financialYear.split('-').map(Number);
      const fyStart = new Date(fyStartYear, 3, 1, 0, 0, 0, 0); // April 1
      const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // March 31

      const [transactions, emails] = await Promise.all([
        Transaction.find({ userId, date: { $gte: fyStart, $lte: fyEnd } }).lean(),
        GmailEmail.find({ userId, date: { $gte: fyStart, $lte: fyEnd } }).lean(),
      ]);

      logger.info(`[TaxReport] Processing ${transactions.length} tx and ${emails.length} emails for FY ${financialYear}`);

      // ── Income Summary ──
      const incomeSummary = this._calculateIncomeSummary(transactions, emails);

      // ── Section-wise Deductions ──
      const deductions = {};
      for (const [section, config] of Object.entries(TAX_SECTIONS)) {
        deductions[section] = this._findSectionDeductions(section, config, transactions, emails);
      }

      // ── HRA Rent Receipts Detection ──
      const hraAnalysis = this._detectHRARentPayments(transactions, emails);

      // ── Capital Gains from Stocks / Mutual Funds ──
      const capitalGains = this._estimateCapitalGains(transactions, emails);

      // ── TDS Certificates Tracking ──
      const tdsCertificates = this._trackTDSCertificates(emails);

      // ── Total Deductions Summary ──
      let totalClaimable = 0;
      for (const [section, data] of Object.entries(deductions)) {
        const sectionConfig = TAX_SECTIONS[section];
        const eligible = Math.min(data.totalAmount, sectionConfig.limit);
        deductions[section].eligibleAmount = eligible;
        deductions[section].formattedEligible = formatCurrency(eligible);
        deductions[section].limit = sectionConfig.limit === Infinity ? 'No limit' : formatCurrency(sectionConfig.limit);
        totalClaimable += eligible;
      }

      const report = {
        reportType: 'tax',
        userId,
        financialYear,
        period: {
          startDate: formatDate(fyStart),
          endDate: formatDate(fyEnd),
        },
        incomeSummary,
        deductions,
        totalDeductions: {
          amount: totalClaimable,
          formatted: formatCurrency(totalClaimable),
        },
        hraAnalysis,
        capitalGains,
        tdsCertificates,
        estimatedTaxSaved: {
          at30Percent: formatCurrency(totalClaimable * 0.3),
          at20Percent: formatCurrency(totalClaimable * 0.2),
          at5Percent: formatCurrency(totalClaimable * 0.05),
        },
        disclaimer: 'This is an automated estimate. Please consult a certified CA for accurate tax filing.',
        generatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      };

      this.cache.set(cacheKey, report);
      this._storeReportMetadata('tax', userId, report);

      logger.info(`[TaxReport] Completed in ${Date.now() - startTime}ms — total deductions: ${formatCurrency(totalClaimable)}`);
      return report;
    } catch (error) {
      logger.error(`[TaxReport] Failed: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Income / Expense Calculation ────────────────────────────────────────

  /**
   * Calculate income vs expense totals from a set of transactions.
   * @param {Array} transactions
   * @returns {{ totalIncome: number, totalExpense: number, netSavings: number, savingsRate: number }}
   * @private
   */
  _calculateIncomeExpense(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'credit') {
        totalIncome += Math.abs(tx.amount);
      } else if (tx.type === 'debit') {
        totalExpense += Math.abs(tx.amount);
      }
      // 'transfer' type is excluded from both
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return { totalIncome, totalExpense, netSavings, savingsRate };
  }

  // ── Category Breakdown ──────────────────────────────────────────────────

  /**
   * Break down spending by category.
   * @param {Array} transactions
   * @returns {Array<Object>} Sorted category breakdown
   * @private
   */
  _calculateCategoryBreakdown(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    const totalExpense = debitTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const categoryMap = new Map();
    for (const tx of debitTx) {
      const cat = (tx.category || 'other').toLowerCase();
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { category: cat, totalAmount: 0, count: 0, transactions: [] });
      }
      const entry = categoryMap.get(cat);
      entry.totalAmount += Math.abs(tx.amount);
      entry.count++;
    }

    const breakdown = Array.from(categoryMap.values())
      .map(entry => ({
        ...entry,
        percentage: totalExpense > 0 ? ((entry.totalAmount / totalExpense) * 100).toFixed(1) + '%' : '0%',
        formattedAmount: formatCurrency(entry.totalAmount),
        avgTransaction: formatCurrency(entry.count > 0 ? entry.totalAmount / entry.count : 0),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return breakdown;
  }

  // ── Bank Summary ────────────────────────────────────────────────────────

  /**
   * Summarize transactions per bank / financial institution.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Array<Object>} Bank-wise summary
   * @private
   */
  _calculateBankSummary(transactions, emails) {
    const bankMap = new Map();

    // From email sender institutions
    for (const email of emails) {
      const bank = email.senderInstitution || 'Unknown';
      if (!bankMap.has(bank)) {
        bankMap.set(bank, { bank, emailCount: 0, debitTotal: 0, creditTotal: 0, transactionCount: 0 });
      }
      bankMap.get(bank).emailCount++;
      if (email.primaryAmount) {
        const amount = Math.abs(email.primaryAmount);
        if (email.primaryAmountType === 'debit') {
          bankMap.get(bank).debitTotal += amount;
        } else if (email.primaryAmountType === 'credit') {
          bankMap.get(bank).creditTotal += amount;
        }
        bankMap.get(bank).transactionCount++;
      }
    }

    // Supplement with transaction data where source is gmail-related
    for (const tx of transactions) {
      if (tx.source === 'gmail_email' || tx.source === 'gmail_attachment') {
        const bank = this._extractBankName(tx.description) || 'Unknown';
        if (!bankMap.has(bank)) {
          bankMap.set(bank, { bank, emailCount: 0, debitTotal: 0, creditTotal: 0, transactionCount: 0 });
        }
        const entry = bankMap.get(bank);
        entry.transactionCount++;
        if (tx.type === 'debit') entry.debitTotal += Math.abs(tx.amount);
        else if (tx.type === 'credit') entry.creditTotal += Math.abs(tx.amount);
      }
    }

    return Array.from(bankMap.values())
      .map(entry => ({
        ...entry,
        netFlow: entry.creditTotal - entry.debitTotal,
        formattedDebit: formatCurrency(entry.debitTotal),
        formattedCredit: formatCurrency(entry.creditTotal),
        formattedNet: formatCurrency(entry.creditTotal - entry.debitTotal),
      }))
      .sort((a, b) => b.transactionCount - a.transactionCount);
  }

  // ── UPI Payment Analysis ────────────────────────────────────────────────

  /**
   * Analyze UPI payment patterns from transactions and emails.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} UPI analysis summary
   * @private
   */
  _analyzeUPIPayments(transactions, emails) {
    const upiTx = transactions.filter(tx =>
      tx.paymentMethod && ['upi', 'UPI'].includes(tx.paymentMethod)
    );
    const upiEmails = emails.filter(e =>
      e.emailType === 'upi_payment' || e.emailType === 'upi_collection'
    );

    const appUsage = new Map();
    for (const email of upiEmails) {
      const app = email.upiDetails?.app || 'Unknown UPI App';
      if (!appUsage.has(app)) appUsage.set(app, { count: 0, totalAmount: 0 });
      const entry = appUsage.get(app);
      entry.count++;
      if (email.primaryAmount) entry.totalAmount += Math.abs(email.primaryAmount);
    }

    const totalUPIAmount = upiTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const avgUPIAmount = upiTx.length > 0 ? totalUPIAmount / upiTx.length : 0;

    return {
      totalUPITransactions: upiTx.length,
      totalUPIEmails: upiEmails.length,
      totalAmount: totalUPIAmount,
      formattedTotal: formatCurrency(totalUPIAmount),
      averageAmount: formatCurrency(avgUPIAmount),
      appBreakdown: Array.from(appUsage.entries())
        .map(([app, data]) => ({
          app,
          count: data.count,
          totalAmount: formatCurrency(data.totalAmount),
        }))
        .sort((a, b) => b.count - a.count),
      percentageOfTotal: transactions.length > 0
        ? `${((upiTx.length / transactions.length) * 100).toFixed(1)}%`
        : '0%',
    };
  }

  // ── Credit Card Spend Tracking ──────────────────────────────────────────

  /**
   * Track credit card spending from transactions and emails.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Credit card analysis
   * @private
   */
  _analyzeCreditCardSpending(transactions, emails) {
    const ccTx = transactions.filter(tx =>
      tx.paymentMethod && ['card', 'Card'].includes(tx.paymentMethod)
    );
    const ccEmails = emails.filter(e =>
      e.emailType === 'credit_card_alert' || e.emailType === 'credit_card_statement'
    );

    // Group by card (last 4 digits)
    const cardMap = new Map();
    for (const email of ccEmails) {
      const card = email.bankDetails?.cardLast4 || 'Unknown';
      const cardType = email.bankDetails?.cardType || 'unknown';
      const bank = email.senderInstitution || 'Unknown Bank';
      const key = `${bank}-${card}`;
      if (!cardMap.has(key)) {
        cardMap.set(key, { card, cardType, bank, totalSpend: 0, count: 0, maxSpend: 0 });
      }
      const entry = cardMap.get(key);
      entry.count++;
      if (email.primaryAmount) {
        const amt = Math.abs(email.primaryAmount);
        entry.totalSpend += amt;
        entry.maxSpend = Math.max(entry.maxSpend, amt);
      }
    }

    const totalCCSpend = ccTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      totalCCTransactions: ccTx.length,
      totalAlerts: ccEmails.length,
      totalSpend: formatCurrency(totalCCSpend),
      cardBreakdown: Array.from(cardMap.values())
        .map(entry => ({
          ...entry,
          formattedSpend: formatCurrency(entry.totalSpend),
          formattedMax: formatCurrency(entry.maxSpend),
          avgSpend: formatCurrency(entry.count > 0 ? entry.totalSpend / entry.count : 0),
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend),
    };
  }

  // ── EMI / Loan Payment Tracking ─────────────────────────────────────────

  /**
   * Track EMI and loan payments.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} EMI tracking summary
   * @private
   */
  _trackEMIPayments(transactions, emails) {
    const emiKeywords = ['emi', 'equated monthly', 'loan repayment', 'instalment', 'installment'];
    const emiTx = transactions.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'emi' || tx.category === 'loan' ||
        emiKeywords.some(kw => desc.includes(kw));
    });

    const emiEmails = emails.filter(e =>
      e.emailType === 'loan_emi' || e.emailType === 'loan_statement'
    );

    const loanMap = new Map();
    for (const tx of emiTx) {
      const desc = (tx.description || '').substring(0, 50);
      const key = tx.merchantName || desc;
      if (!loanMap.has(key)) {
        loanMap.set(key, { lender: key, payments: [], totalPaid: 0 });
      }
      const entry = loanMap.get(key);
      entry.payments.push({
        date: formatDate(tx.date),
        amount: formatCurrency(tx.amount),
        rawAmount: tx.amount,
      });
      entry.totalPaid += Math.abs(tx.amount);
    }

    return {
      totalEMIPayments: emiTx.length,
      totalEMIAmount: formatCurrency(emiTx.reduce((s, tx) => s + Math.abs(tx.amount), 0)),
      emiAlerts: emiEmails.length,
      loans: Array.from(loanMap.values())
        .map(entry => ({
          ...entry,
          formattedTotal: formatCurrency(entry.totalPaid),
          paymentCount: entry.payments.length,
          avgEMI: formatCurrency(entry.payments.length > 0 ? entry.totalPaid / entry.payments.length : 0),
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid),
    };
  }

  // ── Top Merchants ──────────────────────────────────────────────────────

  /**
   * Get top merchants by total spend amount.
   * @param {Array} transactions
   * @param {number} limit
   * @returns {Array} Top merchants
   * @private
   */
  _getTopMerchants(transactions, limit = 10) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    const merchantMap = new Map();

    for (const tx of debitTx) {
      const merchant = tx.merchantName || tx.description?.substring(0, 40) || 'Unknown';
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, { merchant, totalSpend: 0, count: 0, lastDate: null });
      }
      const entry = merchantMap.get(merchant);
      entry.totalSpend += Math.abs(tx.amount);
      entry.count++;
      const txDate = new Date(tx.date);
      if (!entry.lastDate || txDate > entry.lastDate) entry.lastDate = txDate;
    }

    return Array.from(merchantMap.values())
      .map(entry => ({
        ...entry,
        formattedSpend: formatCurrency(entry.totalSpend),
        avgSpend: formatCurrency(entry.count > 0 ? entry.totalSpend / entry.count : 0),
        lastTransaction: formatDate(entry.lastDate),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
  }

  // ── Day-of-Week Patterns ───────────────────────────────────────────────

  /**
   * Analyze spending patterns by day of the week.
   * @param {Array} transactions
   * @returns {Array} Day-of-week breakdown
   * @private
   */
  _analyzeDayOfWeekPatterns(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    const dayData = DAY_NAMES.map(() => ({ totalSpend: 0, count: 0 }));

    for (const tx of debitTx) {
      const day = new Date(tx.date).getDay();
      dayData[day].totalSpend += Math.abs(tx.amount);
      dayData[day].count++;
    }

    const maxSpend = Math.max(...dayData.map(d => d.totalSpend), 1);

    return DAY_NAMES.map((name, i) => ({
      day: name,
      dayIndex: i,
      isWeekend: i === 0 || i === 6,
      totalSpend: dayData[i].totalSpend,
      formattedSpend: formatCurrency(dayData[i].totalSpend),
      transactionCount: dayData[i].count,
      avgSpend: formatCurrency(dayData[i].count > 0 ? dayData[i].totalSpend / dayData[i].count : 0),
      relativeIntensity: ((dayData[i].totalSpend / maxSpend) * 100).toFixed(0) + '%',
    }));
  }

  // ── Running Balance Estimation ─────────────────────────────────────────

  /**
   * Estimate a running balance over the reporting period.
   * @param {Array} transactions
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Array} Daily balance estimates
   * @private
   */
  _estimateRunningBalance(transactions, startDate, endDate) {
    // Sort by date ascending
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const dailyMap = new Map();

    // Initialize all days in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = current.toISOString().split('T')[0];
      dailyMap.set(key, { date: key, credits: 0, debits: 0, netChange: 0, balance: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Accumulate transactions
    for (const tx of sorted) {
      const key = new Date(tx.date).toISOString().split('T')[0];
      const entry = dailyMap.get(key);
      if (!entry) continue;
      const amount = Math.abs(tx.amount);
      if (tx.type === 'credit') {
        entry.credits += amount;
      } else if (tx.type === 'debit') {
        entry.debits += amount;
      }
      entry.netChange = entry.credits - entry.debits;
    }

    // Calculate running balance
    const balanceData = [];
    for (const [date, entry] of dailyMap) {
      runningBalance += entry.netChange;
      balanceData.push({
        date: formatDate(new Date(date)),
        rawDate: date,
        credits: formatCurrency(entry.credits),
        debits: formatCurrency(entry.debits),
        netChange: formatCurrency(entry.netChange),
        estimatedBalance: formatCurrency(runningBalance),
        rawBalance: runningBalance,
      });
    }

    return balanceData;
  }

  // ── Trend Analysis ─────────────────────────────────────────────────────

  /**
   * Calculate daily/weekly trends within a date range.
   * @param {Array} transactions
   * @param {Date} start
   * @param {Date} end
   * @param {number} periodDays
   * @returns {Object} Trend analysis data
   * @private
   */
  _calculateTrendAnalysis(transactions, start, end, periodDays) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');

    // Split period into weeks
    const weeklyData = [];
    let weekStart = new Date(start);
    let weekNum = 1;

    while (weekStart < end) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());

      const weekTx = debitTx.filter(tx => {
        const d = new Date(tx.date);
        return d >= weekStart && d <= weekEnd;
      });

      const weekTotal = weekTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);
      weeklyData.push({
        week: weekNum,
        startDate: formatDate(weekStart),
        endDate: formatDate(weekEnd),
        totalSpend: weekTotal,
        formattedSpend: formatCurrency(weekTotal),
        txCount: weekTx.length,
      });

      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() + 1);
      weekNum++;
    }

    // Moving average (3-day)
    const dailySpend = new Map();
    for (const tx of debitTx) {
      const key = new Date(tx.date).toISOString().split('T')[0];
      dailySpend.set(key, (dailySpend.get(key) || 0) + Math.abs(tx.amount));
    }

    const sortedDays = Array.from(dailySpend.entries()).sort();
    const movingAvg = [];
    for (let i = 2; i < sortedDays.length; i++) {
      const avg = (sortedDays[i][1] + sortedDays[i - 1][1] + sortedDays[i - 2][1]) / 3;
      movingAvg.push({
        date: sortedDays[i][0],
        movingAverage: avg,
        formattedMA: formatCurrency(avg),
      });
    }

    // Overall trend direction
    let trendDirection = 'stable';
    if (weeklyData.length >= 2) {
      const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2));
      const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2));
      const firstAvg = firstHalf.reduce((s, w) => s + w.totalSpend, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, w) => s + w.totalSpend, 0) / secondHalf.length;
      const change = ((secondAvg - firstAvg) / Math.max(firstAvg, 1)) * 100;
      if (change > 10) trendDirection = 'increasing';
      else if (change < -10) trendDirection = 'decreasing';
    }

    return {
      trendDirection,
      weeklyData,
      movingAverage: movingAvg,
      periodDays,
    };
  }

  // ── Recurring Payment Detection ─────────────────────────────────────────

  /**
   * Detect recurring payments by analyzing transaction patterns.
   * @param {Array} transactions
   * @returns {Array} Detected recurring payments
   * @private
   */
  _detectRecurringPayments(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');

    // Group by merchant/description + approximate amount
    const groups = new Map();
    for (const tx of debitTx) {
      const key = (tx.merchantName || tx.description?.substring(0, 30) || '').toLowerCase().trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tx);
    }

    const recurring = [];

    for (const [merchant, txList] of groups) {
      if (txList.length < 2) continue;

      // Sort by date
      const sorted = txList.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate intervals between consecutive transactions
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }

      if (intervals.length === 0) continue;

      const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;
      const stdDev = Math.sqrt(intervals.reduce((s, d) => s + Math.pow(d - avgInterval, 2), 0) / intervals.length);

      // Determine frequency
      let frequency = 'irregular';
      let confidence = 0;

      if (avgInterval >= 25 && avgInterval <= 35 && stdDev < 5) {
        frequency = 'monthly';
        confidence = Math.max(0, 1 - (stdDev / 10));
      } else if (avgInterval >= 85 && avgInterval <= 100 && stdDev < 10) {
        frequency = 'quarterly';
        confidence = Math.max(0, 1 - (stdDev / 20));
      } else if (avgInterval >= 5 && avgInterval <= 9 && stdDev < 2) {
        frequency = 'weekly';
        confidence = Math.max(0, 1 - (stdDev / 5));
      } else if (avgInterval >= 350 && avgInterval <= 380 && stdDev < 15) {
        frequency = 'yearly';
        confidence = Math.max(0, 1 - (stdDev / 30));
      }

      if (confidence < 0.3 && frequency === 'irregular') continue;

      // Calculate amount consistency
      const amounts = sorted.map(tx => Math.abs(tx.amount));
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const amountStdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length);
      const amountConsistency = avgAmount > 0 ? 1 - (amountStdDev / avgAmount) : 0;

      recurring.push({
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        frequency,
        confidence: `${(confidence * 100).toFixed(0)}%`,
        occurrences: sorted.length,
        avgAmount: formatCurrency(avgAmount),
        rawAvgAmount: avgAmount,
        amountConsistency: `${(amountConsistency * 100).toFixed(0)}%`,
        avgIntervalDays: Math.round(avgInterval),
        lastPayment: formatDate(sorted[sorted.length - 1].date),
        nextExpectedDate: this._estimateNextDate(sorted[sorted.length - 1].date, avgInterval),
        annualCost: formatCurrency(this._estimateAnnualCost(avgAmount, frequency)),
      });
    }

    return recurring.sort((a, b) => b.rawAvgAmount - a.rawAvgAmount);
  }

  // ── Subscription Tracking ──────────────────────────────────────────────

  /**
   * Track subscriptions from email patterns and recurring transactions.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Subscription summary
   * @private
   */
  _trackSubscriptions(transactions, emails) {
    const subscriptionKeywords = [
      'subscription', 'renewal', 'recurring', 'auto-debit', 'auto debit',
      'netflix', 'prime', 'hotstar', 'spotify', 'youtube premium', 'apple music',
      'jio', 'airtel', 'vi prepaid', 'bsnl', 'swiggy one', 'zomato pro',
      'linkedin premium', 'microsoft 365', 'google one', 'icloud',
      'amazon prime', 'zee5', 'sonyliv', 'gym', 'membership',
    ];

    const subEmails = emails.filter(email => {
      const text = ((email.subject || '') + ' ' + (email.snippet || '')).toLowerCase();
      return subscriptionKeywords.some(kw => text.includes(kw));
    });

    const subTx = transactions.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      return tx.isRecurring || subscriptionKeywords.some(kw => desc.includes(kw));
    });

    // Group subscriptions by name
    const subMap = new Map();
    for (const tx of subTx) {
      const name = tx.merchantName || tx.description?.substring(0, 30) || 'Unknown';
      if (!subMap.has(name)) {
        subMap.set(name, { name, payments: [], totalPaid: 0 });
      }
      const entry = subMap.get(name);
      entry.payments.push({ date: formatDate(tx.date), amount: tx.amount });
      entry.totalPaid += Math.abs(tx.amount);
    }

    const subscriptions = Array.from(subMap.values())
      .map(entry => ({
        ...entry,
        formattedTotal: formatCurrency(entry.totalPaid),
        paymentCount: entry.payments.length,
        avgMonthly: formatCurrency(entry.payments.length > 0 ? entry.totalPaid / entry.payments.length : 0),
        status: 'active', // Simplified — a full impl would check recency
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);

    const totalMonthly = subscriptions.reduce((s, sub) =>
      s + (sub.payments.length > 0 ? sub.totalPaid / sub.payments.length : 0), 0);

    return {
      detectedSubscriptions: subscriptions.length,
      subscriptions,
      totalMonthlyEstimate: formatCurrency(totalMonthly),
      totalAnnualEstimate: formatCurrency(totalMonthly * 12),
      relatedEmails: subEmails.length,
    };
  }

  // ── Merchant Loyalty Analysis ──────────────────────────────────────────

  /**
   * Analyze merchant loyalty and spending concentration.
   * @param {Array} transactions
   * @returns {Object} Merchant loyalty data
   * @private
   */
  _analyzeMerchantLoyalty(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    const merchantMap = new Map();

    for (const tx of debitTx) {
      const merchant = tx.merchantName || 'Unknown';
      if (merchant === 'Unknown') continue;
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, { totalSpend: 0, visits: 0, firstVisit: null, lastVisit: null });
      }
      const entry = merchantMap.get(merchant);
      entry.totalSpend += Math.abs(tx.amount);
      entry.visits++;
      const d = new Date(tx.date);
      if (!entry.firstVisit || d < entry.firstVisit) entry.firstVisit = d;
      if (!entry.lastVisit || d > entry.lastVisit) entry.lastVisit = d;
    }

    const totalSpend = debitTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const loyalMerchants = Array.from(merchantMap.entries())
      .filter(([, data]) => data.visits >= 3)
      .map(([merchant, data]) => {
        const spanDays = data.lastVisit && data.firstVisit
          ? (data.lastVisit - data.firstVisit) / (1000 * 60 * 60 * 24) : 0;
        return {
          merchant,
          visits: data.visits,
          totalSpend: data.totalSpend,
          formattedSpend: formatCurrency(data.totalSpend),
          shareOfWallet: totalSpend > 0 ? `${((data.totalSpend / totalSpend) * 100).toFixed(1)}%` : '0%',
          avgSpend: formatCurrency(data.totalSpend / data.visits),
          frequencyDays: data.visits > 1 ? Math.round(spanDays / (data.visits - 1)) : 0,
          firstVisit: formatDate(data.firstVisit),
          lastVisit: formatDate(data.lastVisit),
          loyaltyScore: Math.min(10, Math.round(data.visits * (data.totalSpend / Math.max(totalSpend, 1)) * 100)),
        };
      })
      .sort((a, b) => b.loyaltyScore - a.loyaltyScore);

    // Concentration analysis — top 5 merchants' share
    const sortedBySpend = Array.from(merchantMap.entries())
      .sort((a, b) => b[1].totalSpend - a[1].totalSpend);
    const top5Spend = sortedBySpend.slice(0, 5).reduce((s, [, d]) => s + d.totalSpend, 0);
    const concentrationRatio = totalSpend > 0 ? ((top5Spend / totalSpend) * 100).toFixed(1) + '%' : '0%';

    return {
      uniqueMerchants: merchantMap.size,
      loyalMerchants,
      concentrationRatio,
      diversificationScore: merchantMap.size > 0 ? Math.min(10, Math.round(merchantMap.size / 5)) : 0,
    };
  }

  // ── Spending Velocity ──────────────────────────────────────────────────

  /**
   * Calculate monthly spending velocity and acceleration.
   * @param {Array} transactions
   * @param {number} months
   * @returns {Object} Spending velocity trends
   * @private
   */
  _calculateSpendingVelocity(transactions, months) {
    const monthlySpend = new Map();
    const debitTx = transactions.filter(tx => tx.type === 'debit');

    for (const tx of debitTx) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySpend.set(key, (monthlySpend.get(key) || 0) + Math.abs(tx.amount));
    }

    const sorted = Array.from(monthlySpend.entries()).sort();
    const velocityData = sorted.map(([month, spend], idx) => {
      const prevSpend = idx > 0 ? sorted[idx - 1][1] : spend;
      const velocity = prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : 0;
      return {
        month,
        spend,
        formattedSpend: formatCurrency(spend),
        velocityPct: `${velocity >= 0 ? '+' : ''}${velocity.toFixed(1)}%`,
        rawVelocity: velocity,
      };
    });

    // Overall trend
    const avgVelocity = velocityData.length > 1
      ? velocityData.slice(1).reduce((s, v) => s + v.rawVelocity, 0) / (velocityData.length - 1)
      : 0;

    return {
      monthlyVelocity: velocityData,
      avgMonthlyVelocity: `${avgVelocity >= 0 ? '+' : ''}${avgVelocity.toFixed(1)}%`,
      trend: avgVelocity > 5 ? 'increasing' : avgVelocity < -5 ? 'decreasing' : 'stable',
      totalMonths: sorted.length,
    };
  }

  // ── Weekend vs Weekday Analysis ────────────────────────────────────────

  /**
   * Compare weekend and weekday spending patterns.
   * @param {Array} transactions
   * @returns {Object} Weekend vs weekday comparison
   * @private
   */
  _analyzeWeekendVsWeekday(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');

    let weekdaySpend = 0, weekendSpend = 0;
    let weekdayCount = 0, weekendCount = 0;
    const weekdayCategories = new Map();
    const weekendCategories = new Map();

    for (const tx of debitTx) {
      const day = new Date(tx.date).getDay();
      const isWeekend = day === 0 || day === 6;
      const amount = Math.abs(tx.amount);
      const cat = tx.category || 'other';

      if (isWeekend) {
        weekendSpend += amount;
        weekendCount++;
        weekendCategories.set(cat, (weekendCategories.get(cat) || 0) + amount);
      } else {
        weekdaySpend += amount;
        weekdayCount++;
        weekdayCategories.set(cat, (weekdayCategories.get(cat) || 0) + amount);
      }
    }

    // Top categories per segment
    const getTopCategories = (catMap, limit = 5) => {
      return Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([cat, amount]) => ({ category: cat, amount: formatCurrency(amount) }));
    };

    return {
      weekday: {
        totalSpend: formatCurrency(weekdaySpend),
        avgPerDay: formatCurrency(weekdayCount > 0 ? weekdaySpend / weekdayCount : 0),
        transactionCount: weekdayCount,
        topCategories: getTopCategories(weekdayCategories),
      },
      weekend: {
        totalSpend: formatCurrency(weekendSpend),
        avgPerDay: formatCurrency(weekendCount > 0 ? weekendSpend / weekendCount : 0),
        transactionCount: weekendCount,
        topCategories: getTopCategories(weekendCategories),
      },
      comparison: {
        weekendPremium: weekdaySpend > 0
          ? `${((weekendSpend / Math.max(weekdaySpend, 1) - 1) * 100).toFixed(1)}%`
          : 'N/A',
        weekendShare: `${((weekendSpend / Math.max(weekendSpend + weekdaySpend, 1)) * 100).toFixed(1)}%`,
      },
    };
  }

  // ── Salary Cycle Correlation ───────────────────────────────────────────

  /**
   * Detect salary credit patterns and post-salary spending spikes.
   * @param {Array} transactions
   * @returns {Object} Salary cycle analysis
   * @private
   */
  _analyzeSalaryCycle(transactions) {
    // Identify salary credits
    const salaryKeywords = ['salary', 'payroll', 'wages', 'stipend', 'neft salary', 'monthly pay'];
    const salaryTx = transactions.filter(tx => {
      if (tx.type !== 'credit') return false;
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'salary' || salaryKeywords.some(kw => desc.includes(kw));
    });

    if (salaryTx.length === 0) {
      return {
        detected: false,
        message: 'No salary credits detected in the analysis period',
        salaryCredits: [],
      };
    }

    // Determine typical salary day
    const salaryDays = salaryTx.map(tx => new Date(tx.date).getDate());
    const dayFreq = {};
    for (const day of salaryDays) {
      dayFreq[day] = (dayFreq[day] || 0) + 1;
    }
    const typicalDay = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // Analyze post-salary spending (7 days after salary)
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    let postSalarySpend = 0;
    let postSalaryCount = 0;
    let totalSpend = debitTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    for (const sal of salaryTx) {
      const salDate = new Date(sal.date);
      const windowEnd = new Date(salDate);
      windowEnd.setDate(windowEnd.getDate() + 7);

      const postTx = debitTx.filter(tx => {
        const d = new Date(tx.date);
        return d >= salDate && d <= windowEnd;
      });

      postSalarySpend += postTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);
      postSalaryCount += postTx.length;
    }

    const avgSalary = salaryTx.reduce((s, tx) => s + Math.abs(tx.amount), 0) / salaryTx.length;

    return {
      detected: true,
      typicalSalaryDay: typicalDay,
      salaryCredits: salaryTx.map(tx => ({
        date: formatDate(tx.date),
        amount: formatCurrency(tx.amount),
        rawAmount: tx.amount,
      })),
      avgSalary: formatCurrency(avgSalary),
      postSalarySpending: {
        totalSpend: formatCurrency(postSalarySpend),
        transactionCount: postSalaryCount,
        shareOfMonthly: totalSpend > 0
          ? `${((postSalarySpend / totalSpend) * 100).toFixed(1)}%`
          : '0%',
        observation: postSalarySpend / Math.max(totalSpend, 1) > 0.4
          ? 'High post-salary spending detected — consider budgeting'
          : 'Post-salary spending appears moderate',
      },
    };
  }

  // ── Spending Anomalies ─────────────────────────────────────────────────

  /**
   * Detect spending anomalies using statistical methods.
   * Flags transactions exceeding 2 standard deviations from the mean.
   * @param {Array} transactions
   * @returns {Array} Detected anomalies
   * @private
   */
  _detectSpendingAnomalies(transactions) {
    const debitTx = transactions.filter(tx => tx.type === 'debit');
    if (debitTx.length < 5) return [];

    const amounts = debitTx.map(tx => Math.abs(tx.amount));
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2 * stdDev;

    const anomalies = debitTx
      .filter(tx => Math.abs(tx.amount) > threshold)
      .map(tx => ({
        transactionId: tx._id,
        description: tx.description,
        amount: formatCurrency(tx.amount),
        rawAmount: Math.abs(tx.amount),
        date: formatDate(tx.date),
        category: tx.category,
        zScore: ((Math.abs(tx.amount) - mean) / Math.max(stdDev, 1)).toFixed(2),
        severity: Math.abs(tx.amount) > mean + 3 * stdDev ? 'High' : 'Medium',
      }))
      .sort((a, b) => b.rawAmount - a.rawAmount);

    return anomalies;
  }

  // ── Spending Insights Generation ───────────────────────────────────────

  /**
   * Generate human-readable insights from spending analysis.
   * @param {Object} analysisData
   * @returns {Array<string>} List of insight strings
   * @private
   */
  _generateSpendingInsights(analysisData) {
    const insights = [];

    // Recurring payment insights
    if (analysisData.recurringPayments.length > 0) {
      const totalMonthly = analysisData.recurringPayments
        .filter(r => r.frequency === 'monthly')
        .reduce((s, r) => s + r.rawAvgAmount, 0);
      insights.push(`You have ${analysisData.recurringPayments.length} recurring payments totalling ~${formatCurrency(totalMonthly)}/month.`);
    }

    // Subscription insights
    if (analysisData.subscriptions?.detectedSubscriptions > 0) {
      insights.push(`${analysisData.subscriptions.detectedSubscriptions} active subscriptions detected, estimated at ${analysisData.subscriptions.totalMonthlyEstimate}/month.`);
    }

    // Weekend spending insight
    if (analysisData.weekendWeekday) {
      const wkndPremium = parseFloat(analysisData.weekendWeekday.comparison.weekendPremium);
      if (!isNaN(wkndPremium) && wkndPremium > 20) {
        insights.push(`Weekend spending is ${wkndPremium.toFixed(0)}% higher than weekday spending — consider setting weekend budgets.`);
      }
    }

    // Salary cycle insight
    if (analysisData.salaryCycle?.detected) {
      insights.push(`Salary typically credited on day ${analysisData.salaryCycle.typicalSalaryDay} of each month.`);
      if (analysisData.salaryCycle.postSalarySpending) {
        insights.push(analysisData.salaryCycle.postSalarySpending.observation);
      }
    }

    // Anomaly insights
    if (analysisData.anomalies?.length > 0) {
      insights.push(`${analysisData.anomalies.length} unusual spending transaction(s) detected. Review flagged items.`);
    }

    // Merchant loyalty
    if (analysisData.merchantLoyalty?.loyalMerchants?.length > 0) {
      const top = analysisData.merchantLoyalty.loyalMerchants[0];
      insights.push(`Most visited merchant: ${top.merchant} (${top.visits} visits, ${top.formattedSpend} total).`);
    }

    return insights;
  }

  // ── Tax-Related Helpers ────────────────────────────────────────────────

  /**
   * Identify tax-relevant transactions (80C, 80D, etc.).
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Tax-relevant breakdown
   * @private
   */
  _identifyTaxRelevantTransactions(transactions, emails) {
    const taxRelated = {
      investments: [],
      insurance: [],
      loanInterest: [],
      donations: [],
      others: [],
    };

    const investmentKeywords = ['ppf', 'elss', 'mutual fund', 'sip', 'nps', 'fd', 'fixed deposit',
      'stock', 'equity', 'bond', 'debenture'];
    const insuranceKeywords = ['lic', 'insurance', 'premium', 'policy', 'mediclaim'];
    const loanKeywords = ['home loan', 'housing loan', 'mortgage', 'education loan'];
    const donationKeywords = ['donation', 'charitable', 'ngo'];

    for (const tx of transactions) {
      if (tx.type !== 'debit') continue;
      const desc = (tx.description || '').toLowerCase();
      const cat = (tx.category || '').toLowerCase();

      if (investmentKeywords.some(kw => desc.includes(kw)) || cat === 'investment') {
        taxRelated.investments.push({
          date: formatDate(tx.date),
          description: tx.description,
          amount: formatCurrency(tx.amount),
          rawAmount: Math.abs(tx.amount),
        });
      } else if (insuranceKeywords.some(kw => desc.includes(kw)) || cat === 'insurance') {
        taxRelated.insurance.push({
          date: formatDate(tx.date),
          description: tx.description,
          amount: formatCurrency(tx.amount),
          rawAmount: Math.abs(tx.amount),
        });
      } else if (loanKeywords.some(kw => desc.includes(kw))) {
        taxRelated.loanInterest.push({
          date: formatDate(tx.date),
          description: tx.description,
          amount: formatCurrency(tx.amount),
          rawAmount: Math.abs(tx.amount),
        });
      } else if (donationKeywords.some(kw => desc.includes(kw))) {
        taxRelated.donations.push({
          date: formatDate(tx.date),
          description: tx.description,
          amount: formatCurrency(tx.amount),
          rawAmount: Math.abs(tx.amount),
        });
      }
    }

    // Also check emails for tax-related documents
    const taxEmails = emails.filter(e =>
      e.emailType === 'tax_document' || e.emailType === 'investment_statement'
    );
    taxRelated.taxDocumentEmails = taxEmails.length;

    return taxRelated;
  }

  /**
   * Find deductions qualifying under a specific tax section.
   * @param {string} section - Tax section code
   * @param {Object} config - Section configuration with keywords and limit
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Section deduction details
   * @private
   */
  _findSectionDeductions(section, config, transactions, emails) {
    const qualifying = [];
    let totalAmount = 0;

    for (const tx of transactions) {
      if (tx.type !== 'debit') continue;
      const desc = (tx.description || '').toLowerCase();
      const cat = (tx.category || '').toLowerCase();
      const merchant = (tx.merchantName || '').toLowerCase();
      const searchText = `${desc} ${cat} ${merchant}`;

      if (config.keywords.some(kw => searchText.includes(kw))) {
        const amount = Math.abs(tx.amount);
        qualifying.push({
          date: formatDate(tx.date),
          description: tx.description,
          merchant: tx.merchantName,
          amount,
          formattedAmount: formatCurrency(amount),
          paymentMethod: tx.paymentMethod,
        });
        totalAmount += amount;
      }
    }

    // Also search emails for proof/documentation
    const relatedEmails = emails.filter(email => {
      const text = ((email.subject || '') + ' ' + (email.snippet || '')).toLowerCase();
      return config.keywords.some(kw => text.includes(kw));
    });

    return {
      section,
      label: config.label,
      totalAmount,
      formattedTotal: formatCurrency(totalAmount),
      transactionCount: qualifying.length,
      transactions: qualifying,
      supportingEmails: relatedEmails.length,
    };
  }

  // ── Income Summary for Tax ─────────────────────────────────────────────

  /**
   * Calculate income summary for tax purposes.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Income summary
   * @private
   */
  _calculateIncomeSummary(transactions, emails) {
    const incomeTx = transactions.filter(tx => tx.type === 'credit');

    const salary = incomeTx.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'salary' || ['salary', 'payroll', 'wages'].some(kw => desc.includes(kw));
    });

    const investmentIncome = incomeTx.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'investment' || ['dividend', 'interest', 'maturity', 'redemption'].some(kw => desc.includes(kw));
    });

    const otherIncome = incomeTx.filter(tx =>
      !salary.includes(tx) && !investmentIncome.includes(tx)
    );

    const sum = (arr) => arr.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    return {
      totalIncome: formatCurrency(sum(incomeTx)),
      salaryIncome: {
        total: formatCurrency(sum(salary)),
        count: salary.length,
        monthly: salary.length > 0 ? formatCurrency(sum(salary) / salary.length) : '₹0.00',
      },
      investmentIncome: {
        total: formatCurrency(sum(investmentIncome)),
        count: investmentIncome.length,
        breakdown: investmentIncome.map(tx => ({
          date: formatDate(tx.date),
          description: tx.description,
          amount: formatCurrency(tx.amount),
        })),
      },
      otherIncome: {
        total: formatCurrency(sum(otherIncome)),
        count: otherIncome.length,
      },
      salarySlipEmails: emails.filter(e => e.emailType === 'salary_slip').length,
    };
  }

  // ── Investment Summary ─────────────────────────────────────────────────

  /**
   * Summarize investment activity for the period.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Investment summary
   * @private
   */
  _calculateInvestmentSummary(transactions, emails) {
    const investKeywords = ['sip', 'mutual fund', 'mf', 'elss', 'ppf', 'nps', 'stock',
      'share', 'demat', 'zerodha', 'groww', 'upstox', 'kuvera', 'paytm money',
      'fd', 'fixed deposit', 'rd', 'recurring deposit', 'gold', 'sgb', 'bond'];

    const investTx = transactions.filter(tx => {
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'investment' || investKeywords.some(kw => desc.includes(kw));
    });

    const invested = investTx.filter(tx => tx.type === 'debit');
    const returns = investTx.filter(tx => tx.type === 'credit');

    const totalInvested = invested.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const totalReturns = returns.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    // Group by investment type
    const typeMap = new Map();
    for (const tx of invested) {
      const desc = (tx.description || '').toLowerCase();
      let invType = 'Other';
      if (desc.includes('sip') || desc.includes('mutual fund')) invType = 'Mutual Funds / SIP';
      else if (desc.includes('ppf')) invType = 'PPF';
      else if (desc.includes('nps')) invType = 'NPS';
      else if (desc.includes('fd') || desc.includes('fixed deposit')) invType = 'Fixed Deposits';
      else if (desc.includes('stock') || desc.includes('share') || desc.includes('equity')) invType = 'Stocks / Equity';
      else if (desc.includes('gold') || desc.includes('sgb')) invType = 'Gold / SGB';
      else if (desc.includes('elss')) invType = 'ELSS';

      if (!typeMap.has(invType)) typeMap.set(invType, { total: 0, count: 0 });
      typeMap.get(invType).total += Math.abs(tx.amount);
      typeMap.get(invType).count++;
    }

    return {
      totalInvested: formatCurrency(totalInvested),
      totalReturns: formatCurrency(totalReturns),
      netInvestment: formatCurrency(totalInvested - totalReturns),
      investmentCount: invested.length,
      returnCount: returns.length,
      byType: Array.from(typeMap.entries())
        .map(([type, data]) => ({
          type,
          total: formatCurrency(data.total),
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count),
      investmentEmails: emails.filter(e =>
        e.emailType === 'investment_alert' || e.emailType === 'investment_statement'
      ).length,
    };
  }

  // ── Insurance Premium Tracking ─────────────────────────────────────────

  /**
   * Track insurance premium payments for the period.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Insurance summary
   * @private
   */
  _trackInsurancePremiums(transactions, emails) {
    const insKeywords = ['insurance', 'premium', 'lic', 'policy', 'mediclaim',
      'star health', 'hdfc ergo', 'icici lombard', 'bajaj allianz', 'care health',
      'max life', 'sbi life', 'term plan', 'endowment', 'ulip'];

    const insTx = transactions.filter(tx => {
      if (tx.type !== 'debit') return false;
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'insurance' || insKeywords.some(kw => desc.includes(kw));
    });

    const insEmails = emails.filter(e =>
      e.emailType === 'insurance_premium' || e.emailType === 'insurance_policy'
    );

    // Group by insurer
    const insurerMap = new Map();
    for (const tx of insTx) {
      const insurer = tx.merchantName || this._extractInsurer(tx.description) || 'Unknown Insurer';
      if (!insurerMap.has(insurer)) {
        insurerMap.set(insurer, { totalPaid: 0, payments: [] });
      }
      const entry = insurerMap.get(insurer);
      entry.totalPaid += Math.abs(tx.amount);
      entry.payments.push({ date: formatDate(tx.date), amount: formatCurrency(tx.amount) });
    }

    const totalPremiums = insTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    return {
      totalPremiumsPaid: formatCurrency(totalPremiums),
      paymentCount: insTx.length,
      insuranceEmails: insEmails.length,
      byInsurer: Array.from(insurerMap.entries())
        .map(([insurer, data]) => ({
          insurer,
          totalPaid: formatCurrency(data.totalPaid),
          payments: data.payments,
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid),
      taxDeductible80C: formatCurrency(Math.min(totalPremiums * 0.7, 150000)), // approx life
      taxDeductible80D: formatCurrency(Math.min(totalPremiums * 0.3, 75000)),  // approx health
    };
  }

  // ── HRA / Rent Detection ───────────────────────────────────────────────

  /**
   * Detect HRA-eligible rent payments from transactions and emails.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} HRA analysis
   * @private
   */
  _detectHRARentPayments(transactions, emails) {
    const rentKeywords = ['rent', 'house rent', 'monthly rent', 'hra', 'landlord', 'accommodation'];

    const rentTx = transactions.filter(tx => {
      if (tx.type !== 'debit') return false;
      const desc = (tx.description || '').toLowerCase();
      return tx.category === 'rent' || rentKeywords.some(kw => desc.includes(kw));
    });

    const rentEmails = emails.filter(email => {
      const text = ((email.subject || '') + ' ' + (email.snippet || '')).toLowerCase();
      return rentKeywords.some(kw => text.includes(kw));
    });

    const totalRent = rentTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const monthlyRent = rentTx.length > 0 ? totalRent / rentTx.length : 0;

    return {
      detected: rentTx.length > 0,
      totalRentPaid: formatCurrency(totalRent),
      monthlyRent: formatCurrency(monthlyRent),
      paymentCount: rentTx.length,
      rentReceipts: rentEmails.length,
      payments: rentTx.map(tx => ({
        date: formatDate(tx.date),
        amount: formatCurrency(tx.amount),
        description: tx.description,
      })),
      hraExemptionNote: 'Minimum of: (a) Actual HRA received, (b) Rent paid minus 10% of salary, (c) 50%/40% of salary',
    };
  }

  // ── Capital Gains Estimation ───────────────────────────────────────────

  /**
   * Estimate capital gains from investment-related transactions.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Capital gains summary
   * @private
   */
  _estimateCapitalGains(transactions, emails) {
    const saleKeywords = ['sold', 'redeemed', 'redemption', 'maturity', 'profit', 'capital gain',
      'units sold', 'shares sold'];

    const saleTx = transactions.filter(tx => {
      if (tx.type !== 'credit') return false;
      const desc = (tx.description || '').toLowerCase();
      return saleKeywords.some(kw => desc.includes(kw));
    });

    const totalProceeds = saleTx.reduce((s, tx) => s + Math.abs(tx.amount), 0);

    return {
      potentialSaleProceeds: formatCurrency(totalProceeds),
      saleTransactions: saleTx.length,
      transactions: saleTx.map(tx => ({
        date: formatDate(tx.date),
        description: tx.description,
        amount: formatCurrency(tx.amount),
      })),
      note: 'Capital gains require purchase cost basis for accurate calculation. Consult your CA.',
      relatedEmails: emails.filter(e => {
        const text = ((e.subject || '') + ' ' + (e.snippet || '')).toLowerCase();
        return saleKeywords.some(kw => text.includes(kw));
      }).length,
    };
  }

  // ── TDS Certificates Tracking ──────────────────────────────────────────

  /**
   * Track TDS (Tax Deducted at Source) certificates from emails.
   * @param {Array} emails
   * @returns {Object} TDS tracking data
   * @private
   */
  _trackTDSCertificates(emails) {
    const tdsKeywords = ['tds', 'form 16', 'form 26as', 'tax deducted', 'tax certificate',
      'certificate of deduction', '26as', 'annual information statement', 'ais'];

    const tdsEmails = emails.filter(email => {
      const text = ((email.subject || '') + ' ' + (email.bodyText || '') + ' ' + (email.snippet || '')).toLowerCase();
      return tdsKeywords.some(kw => text.includes(kw));
    });

    return {
      certificatesFound: tdsEmails.length,
      certificates: tdsEmails.map(email => ({
        subject: email.subject,
        from: email.from?.email,
        date: formatDate(email.date),
        institution: email.senderInstitution || 'Unknown',
        hasAttachment: (email.attachments || []).length > 0,
      })),
      reminder: tdsEmails.length === 0
        ? 'No TDS certificates found. Ensure your employer/banks have sent Form 16/16A.'
        : `${tdsEmails.length} TDS-related email(s) found. Verify with Form 26AS on TRACES.`,
    };
  }

  // ── Balance Verification ───────────────────────────────────────────────

  /**
   * Cross-check balance information from emails against transaction totals.
   * @param {Array} transactions
   * @param {Array} emails
   * @returns {Object} Balance verification result
   * @private
   */
  _verifyBalances(transactions, emails) {
    // Find emails with balance information
    const balanceEmails = emails.filter(e =>
      e.bankDetails?.availableBalance != null || e.bankDetails?.currentBalance != null
    );

    if (balanceEmails.length === 0) {
      return { available: false, message: 'No balance information found in emails' };
    }

    // Get latest balance from emails, grouped by account
    const accountBalances = new Map();
    for (const email of balanceEmails) {
      const acct = email.bankDetails?.accountNumber || email.senderInstitution || 'Unknown';
      const existing = accountBalances.get(acct);
      if (!existing || new Date(email.date) > new Date(existing.date)) {
        accountBalances.set(acct, {
          account: acct,
          bank: email.senderInstitution,
          reportedBalance: email.bankDetails?.availableBalance || email.bankDetails?.currentBalance,
          date: email.date,
        });
      }
    }

    return {
      available: true,
      accountBalances: Array.from(accountBalances.values()).map(ab => ({
        account: ab.account,
        bank: ab.bank,
        reportedBalance: formatCurrency(ab.reportedBalance),
        asOfDate: formatDate(ab.date),
      })),
      note: 'Reported balances are from email alerts and may not reflect real-time balances.',
    };
  }

  // ── Utility Helpers ────────────────────────────────────────────────────

  /**
   * Extract bank name from a transaction description.
   * @param {string} description
   * @returns {string|null} Detected bank name or null
   * @private
   */
  _extractBankName(description) {
    if (!description) return null;
    const desc = description.toLowerCase();
    const banks = [
      { pattern: 'hdfc', name: 'HDFC Bank' },
      { pattern: 'icici', name: 'ICICI Bank' },
      { pattern: 'sbi', name: 'SBI' },
      { pattern: 'axis', name: 'Axis Bank' },
      { pattern: 'kotak', name: 'Kotak Mahindra Bank' },
      { pattern: 'yes bank', name: 'Yes Bank' },
      { pattern: 'indusind', name: 'IndusInd Bank' },
      { pattern: 'bob', name: 'Bank of Baroda' },
      { pattern: 'pnb', name: 'Punjab National Bank' },
      { pattern: 'canara', name: 'Canara Bank' },
      { pattern: 'union bank', name: 'Union Bank' },
      { pattern: 'idbi', name: 'IDBI Bank' },
      { pattern: 'federal', name: 'Federal Bank' },
      { pattern: 'rbl', name: 'RBL Bank' },
      { pattern: 'idfc', name: 'IDFC First Bank' },
      { pattern: 'bandhan', name: 'Bandhan Bank' },
      { pattern: 'paytm payments', name: 'Paytm Payments Bank' },
      { pattern: 'airtel payments', name: 'Airtel Payments Bank' },
    ];

    for (const { pattern, name } of banks) {
      if (desc.includes(pattern)) return name;
    }
    return null;
  }

  /**
   * Extract insurer name from a payment description.
   * @param {string} description
   * @returns {string|null} Detected insurer or null
   * @private
   */
  _extractInsurer(description) {
    if (!description) return null;
    const desc = description.toLowerCase();
    const insurers = [
      { pattern: 'lic', name: 'LIC' },
      { pattern: 'star health', name: 'Star Health' },
      { pattern: 'hdfc ergo', name: 'HDFC Ergo' },
      { pattern: 'icici lombard', name: 'ICICI Lombard' },
      { pattern: 'bajaj allianz', name: 'Bajaj Allianz' },
      { pattern: 'care health', name: 'Care Health' },
      { pattern: 'niva bupa', name: 'Niva Bupa' },
      { pattern: 'max life', name: 'Max Life' },
      { pattern: 'sbi life', name: 'SBI Life' },
      { pattern: 'tata aia', name: 'Tata AIA' },
      { pattern: 'hdfc life', name: 'HDFC Life' },
    ];
    for (const { pattern, name } of insurers) {
      if (desc.includes(pattern)) return name;
    }
    return null;
  }

  /**
   * Estimate the next expected date for a recurring payment.
   * @param {Date|string} lastDate
   * @param {number} avgIntervalDays
   * @returns {string} Formatted expected date
   * @private
   */
  _estimateNextDate(lastDate, avgIntervalDays) {
    const next = new Date(lastDate);
    next.setDate(next.getDate() + Math.round(avgIntervalDays));
    return formatDate(next);
  }

  /**
   * Estimate annual cost for a recurring payment based on frequency.
   * @param {number} avgAmount
   * @param {string} frequency
   * @returns {number} Estimated annual cost
   * @private
   */
  _estimateAnnualCost(avgAmount, frequency) {
    const multipliers = {
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      yearly: 1,
      irregular: 6, // assume ~6 times a year
    };
    return avgAmount * (multipliers[frequency] || 1);
  }

  /**
   * Store report metadata for later retrieval and audit.
   * @param {string} reportType
   * @param {string} userId
   * @param {Object} report
   * @private
   */
  _storeReportMetadata(reportType, userId, report) {
    const metaKey = `${reportType}:${userId}:${Date.now()}`;
    this.reportMetadata.set(metaKey, {
      reportType,
      userId,
      generatedAt: report.generatedAt,
      processingTimeMs: report.processingTimeMs,
      period: report.period,
    });

    // Keep only last 100 entries
    if (this.reportMetadata.size > 100) {
      const oldest = this.reportMetadata.keys().next().value;
      this.reportMetadata.delete(oldest);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT FORMATTING & OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate structured JSON output for a report.
   * Adds metadata, version, and status wrapper.
   *
   * @param {Object} report - Any generated report object
   * @returns {Object} Structured JSON with envelope
   */
  generateReportJSON(report) {
    return {
      success: true,
      version: '1.0.0',
      generatedBy: 'GmailReportGenerator',
      timestamp: new Date().toISOString(),
      data: report,
    };
  }

  /**
   * Generate an HTML template for a report (email or PDF rendering).
   *
   * @param {Object} report - Any generated report object
   * @returns {string} HTML string
   */
  generateReportHTML(report) {
    const reportType = report.reportType || 'Report';
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Financial Report`;

    let periodStr = '';
    if (report.period) {
      periodStr = report.period.startDate
        ? `${report.period.startDate} — ${report.period.endDate}`
        : report.period.monthName
          ? `${report.period.monthName} ${report.period.year}`
          : `Year ${report.year || ''}`;
    }

    const summaryRows = [];
    if (report.summary) {
      const s = report.summary;
      if (s.formatted) {
        for (const [key, value] of Object.entries(s.formatted)) {
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, c => c.toUpperCase())
            .trim();
          summaryRows.push(`<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${label}</td><td style="padding:8px;border:1px solid #ddd;">${value}</td></tr>`);
        }
      }
    }

    // Category breakdown table
    let categoryTableHTML = '';
    if (report.categoryBreakdown && report.categoryBreakdown.length > 0) {
      const rows = report.categoryBreakdown.slice(0, 10).map(cat =>
        `<tr>
          <td style="padding:6px;border:1px solid #eee;">${cat.category}</td>
          <td style="padding:6px;border:1px solid #eee;">${cat.formattedAmount}</td>
          <td style="padding:6px;border:1px solid #eee;">${cat.percentage}</td>
          <td style="padding:6px;border:1px solid #eee;">${cat.count}</td>
        </tr>`
      ).join('\n');

      categoryTableHTML = `
        <h3 style="color:#1a5276;margin-top:24px;">Category Breakdown</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Category</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Amount</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">%</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Count</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    // Top merchants table
    let merchantTableHTML = '';
    if (report.topMerchants && report.topMerchants.length > 0) {
      const rows = report.topMerchants.slice(0, 10).map(m =>
        `<tr>
          <td style="padding:6px;border:1px solid #eee;">${m.merchant}</td>
          <td style="padding:6px;border:1px solid #eee;">${m.formattedSpend}</td>
          <td style="padding:6px;border:1px solid #eee;">${m.count}</td>
        </tr>`
      ).join('\n');

      merchantTableHTML = `
        <h3 style="color:#1a5276;margin-top:24px;">Top Merchants</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Merchant</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Total Spend</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Visits</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; }
    h1 { color: #1a5276; border-bottom: 3px solid #2980b9; padding-bottom: 8px; }
    h2 { color: #2c3e50; margin-top: 20px; }
    .report-meta { color: #666; font-size: 13px; margin-bottom: 20px; }
    .summary-box { background: #eaf2f8; border-left: 4px solid #2980b9; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .disclaimer { background: #fef9e7; border-left: 4px solid #f1c40f; padding: 12px; margin: 20px 0; font-size: 13px; }
    table { margin-top: 8px; }
    footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="report-meta">
    <strong>Period:</strong> ${periodStr}<br>
    <strong>Generated:</strong> ${report.generatedAt || new Date().toISOString()}<br>
    <strong>Processing Time:</strong> ${report.processingTimeMs || 0}ms
  </div>

  <div class="summary-box">
    <h2>Summary</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <tbody>${summaryRows.join('\n')}</tbody>
    </table>
  </div>

  ${categoryTableHTML}
  ${merchantTableHTML}

  ${report.disclaimer ? `<div class="disclaimer">${report.disclaimer}</div>` : ''}

  <footer>
    Generated by FinancialAnalyzer — Gmail Report Generator v1.0.0<br>
    This report is for informational purposes only.
  </footer>
</body>
</html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE & METADATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Invalidate all cached reports for a user.
   * Call this when new transactions or emails are synced.
   *
   * @param {string} userId
   */
  invalidateUserCache(userId) {
    this.cache.invalidateUser(userId);
    logger.info(`[GmailReportGenerator] Cache invalidated for user=${userId}`);
  }

  /**
   * Get stored metadata for all generated reports.
   * @param {string} [userId] - Optional filter by user
   * @returns {Array<Object>} Report metadata entries
   */
  getReportHistory(userId) {
    const entries = Array.from(this.reportMetadata.entries())
      .map(([key, meta]) => ({ key, ...meta }));

    if (userId) {
      return entries.filter(e => e.userId === userId);
    }
    return entries;
  }

  /**
   * Clear all internal state (cache + metadata).
   * Useful for testing or memory management.
   */
  reset() {
    this.cache.clear();
    this.reportMetadata.clear();
    logger.info('[GmailReportGenerator] Reset — all cache and metadata cleared');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = GmailReportGenerator;

// Also export utility functions for external use
module.exports.formatCurrency = formatCurrency;
module.exports.formatDate = formatDate;
module.exports.calculateGrowthRate = calculateGrowthRate;
module.exports.getFinancialYear = getFinancialYear;
