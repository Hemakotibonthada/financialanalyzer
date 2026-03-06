/**
 * EMI Routes
 * API endpoints for EMI tracking and analytics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EMI = require('../models/EMI');
const User = require('../models/User');
const BankAccount = require('../models/BankAccount');
const FinancialProfile = require('../models/FinancialProfile');
const BillReminder = require('../models/BillReminder');
const PersonalLoan = require('../models/PersonalLoan');
const Transaction = require('../models/Transaction');
const { CacheHelpers } = require('../middleware/cacheMiddleware');
const logger = require('../utils/logger');
const NotificationService = require('../services/notificationService');
const CreditCardStatementService = require('../services/creditCardStatementService');
const EMIExtractionService = require('../services/emiExtractionService');
const EMIAnalyticsService = require('../services/emiAnalyticsService');

// Initialize services
const emiExtractionService = new EMIExtractionService();
const emiAnalyticsService = new EMIAnalyticsService();

async function upsertEmiBillReminder({ userId, emi, dueDate, reminderDays, frequency = 'monthly' }) {
  const normalizedDueDate = dueDate ? new Date(dueDate) : null;
  if (!normalizedDueDate || Number.isNaN(normalizedDueDate.getTime())) {
    return { status: 'skipped', reason: 'invalid_due_date' };
  }

  const title = `EMI Due: ${emi.merchantName}`;
  const description = `Auto reminder for EMI ${emi._id}`;

  const existing = await BillReminder.findOne({
    userId,
    title,
    dueDate: normalizedDueDate,
    status: { $in: ['pending', 'overdue'] }
  });

  if (existing) {
    let changed = false;
    if (typeof reminderDays === 'number' && existing.reminderDays !== reminderDays) {
      existing.reminderDays = reminderDays;
      changed = true;
    }
    if (frequency && existing.frequency !== frequency) {
      existing.frequency = frequency;
      changed = true;
    }
    if (changed) await existing.save();
    return { status: 'updated', billReminderId: existing._id };
  }

  const bill = new BillReminder({
    userId,
    title,
    description,
    amount: emi.emiAmount || 0,
    category: 'loan',
    dueDate: normalizedDueDate,
    frequency,
    reminderDays: typeof reminderDays === 'number' ? reminderDays : 7,
    autoCreateExpense: false,
    notes: `Linked EMI: ${emi._id}`
  });

  await bill.save();
  return { status: 'created', billReminderId: bill._id };
}

/**
 * @route GET /api/emi/overview
 * @desc Get comprehensive EMI overview
 * @access Private
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMI overview for user: ${req.user._id}`);
    
    // Auto-mark past-due installments as paid
    // If EMI start date has passed and no installments are marked paid yet, mark them
    const now = new Date();
    const activeEMIs = await EMI.find({ userId: req.user._id, status: 'active', repaymentType: 'MONTHLY' });
    
    for (const emi of activeEMIs) {
      if (!emi.startDate) continue;
      const startDate = new Date(emi.startDate);
      
      // Calculate how many installments should be paid by now
      // startDate = first EMI paid date, so if now > startDate, at least 1 is paid
      const monthsElapsed = Math.floor(
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) +
        (now.getDate() >= startDate.getDate() ? 1 : 0)
      );
      const shouldBePaid = Math.min(Math.max(0, monthsElapsed), emi.totalTenure);
      
      if (shouldBePaid > (emi.paidInstallments || 0)) {
        // Auto-mark past installments as paid
        const newPaid = shouldBePaid;
        if (emi.paymentHistory && emi.paymentHistory.length > 0) {
          for (let i = 0; i < emi.paymentHistory.length; i++) {
            if (i < newPaid && emi.paymentHistory[i].status !== 'paid') {
              emi.paymentHistory[i].status = 'paid';
              emi.paymentHistory[i].paidDate = emi.paymentHistory[i].dueDate || now;
            }
          }
        }
        emi.paidInstallments = newPaid;
        emi.remainingInstallments = Math.max(0, emi.totalTenure - newPaid);
        
        // Update next due date
        if (emi.remainingInstallments > 0) {
          const nextDue = new Date(startDate);
          nextDue.setMonth(nextDue.getMonth() + newPaid);
          emi.nextDueDate = nextDue;
        }
        
        // Mark as completed if all paid
        if (emi.remainingInstallments === 0) {
          emi.status = 'completed';
        }
        
        await emi.save();
        logger.info(`Auto-marked ${newPaid - (emi.paidInstallments || 0)} installments as paid for EMI ${emi._id}`);
      }
    }
    
    const overview = await emiAnalyticsService.getEMIOverview(req.user._id);
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Get EMI overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI overview',
      error: error.message
    });
  }
});

/**
 * Debt Freedom Automation Endpoints
 * Used by the EMI Tracker "Debt Freedom Plan" tab.
 */

/**
 * @route POST /api/emi/one-click-prepay
 * @desc Create a lightweight prepayment intent + notification
 * @access Private
 */
router.post('/one-click-prepay', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emiId, amount } = req.body || {};

    if (!emiId) {
      return res.status(400).json({
        success: false,
        message: 'emiId is required'
      });
    }

    const emi = await EMI.findOne({ _id: emiId, userId });
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }

    if (emi.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active EMIs can be prepaid'
      });
    }

    const remainingAmount = emi.emiAmount * emi.remainingInstallments;
    const normalizedAmount = Math.max(0, Number(amount || 0));
    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number'
      });
    }

    const cappedAmount = Math.min(normalizedAmount, remainingAmount);

    await NotificationService.createNotification(userId, {
      type: 'success',
      title: 'Prepayment planned',
      message: `Prepayment intent recorded for ${emi.merchantName}: ₹${Math.round(cappedAmount).toLocaleString()}.`,
      priority: 'medium',
      category: 'finance',
      relatedResource: {
        resourceType: 'emi',
        resourceId: emi._id
      },
      data: {
        emiId: emi._id,
        merchantName: emi.merchantName,
        amount: cappedAmount,
        remainingAmount
      }
    });

    return res.json({
      success: true,
      message: 'Prepayment intent recorded',
      data: { emiId: emi._id, amount: cappedAmount }
    });
  } catch (error) {
    logger.error('One-click prepay error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record prepayment intent',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/auto-sweep
 * @desc Store auto-sweep preference for debt freedom automation
 * @access Private
 */
router.post('/auto-sweep', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { sweepPercentage = 20 } = req.body || {};
    const pct = Number(sweepPercentage);

    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        message: 'sweepPercentage must be between 1 and 100'
      });
    }

    const profile = await FinancialProfile.findOne({ userId });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'Financial profile not found. Please complete your profile first.'
      });
    }

    profile.preferences = profile.preferences || {};
    profile.preferences.debtFreedom = profile.preferences.debtFreedom || {};
    profile.preferences.debtFreedom.autoSweep = {
      enabled: true,
      sweepPercentage: pct,
      updatedAt: new Date()
    };
    await profile.save();

    await NotificationService.createNotification(userId, {
      type: 'info',
      title: 'Auto-sweep enabled',
      message: `Auto-sweep enabled: ${pct}% of surplus will be suggested towards your priority EMI.`,
      priority: 'low',
      category: 'finance',
      data: { sweepPercentage: pct }
    });

    return res.json({
      success: true,
      message: 'Auto-sweep preference saved',
      data: { sweepPercentage: pct }
    });
  } catch (error) {
    logger.error('Auto-sweep setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save auto-sweep preference',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/late-fee-shield
 * @desc Enable "late-fee shield" by creating/updating EMI bill reminders
 * @access Private
 */
router.post('/late-fee-shield', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { notifyDaysBefore = 5 } = req.body || {};
    const days = Number(notifyDaysBefore);
    if (!Number.isFinite(days) || days < 0 || days > 31) {
      return res.status(400).json({
        success: false,
        message: 'notifyDaysBefore must be between 0 and 31'
      });
    }

    const profile = await FinancialProfile.findOne({ userId });
    if (profile) {
      profile.preferences = profile.preferences || {};
      profile.preferences.debtFreedom = profile.preferences.debtFreedom || {};
      profile.preferences.debtFreedom.lateFeeShield = {
        enabled: true,
        notifyDaysBefore: days,
        updatedAt: new Date()
      };
      await profile.save();
    }

    const activeEmis = await EMI.find({ userId, status: 'active' });
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const emi of activeEmis) {
      if (!emi.nextDueDate) {
        skipped += 1;
        continue;
      }
      const frequency = emi.repaymentType === 'ON_REQUEST' ? 'once' : 'monthly';
      const result = await upsertEmiBillReminder({
        userId,
        emi,
        dueDate: emi.nextDueDate,
        reminderDays: days,
        frequency
      });
      if (result.status === 'created') created += 1;
      else if (result.status === 'updated') updated += 1;
      else skipped += 1;
    }

    await NotificationService.createNotification(userId, {
      type: 'success',
      title: 'Late-fee shield armed',
      message: `EMI reminders updated. You will be notified ${days} day(s) before due dates.`,
      priority: 'medium',
      category: 'reminder',
      data: { notifyDaysBefore: days, created, updated, skipped }
    });

    return res.json({
      success: true,
      message: 'Late-fee shield enabled',
      data: { notifyDaysBefore: days, created, updated, skipped }
    });
  } catch (error) {
    logger.error('Late-fee shield error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enable late-fee shield',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/reminders/pre-due
 * @desc Create an EMI bill reminder (defaults to 7 days before due)
 * @access Private
 */
router.post('/reminders/pre-due', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emiId, daysUntilDue } = req.body || {};

    if (!emiId) {
      return res.status(400).json({
        success: false,
        message: 'emiId is required'
      });
    }

    const emi = await EMI.findOne({ _id: emiId, userId });
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }

    let dueDate = emi.nextDueDate;
    if (!dueDate) {
      const deltaDays = Math.max(1, Number(daysUntilDue || 7));
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + deltaDays);
    }

    const frequency = emi.repaymentType === 'ON_REQUEST' ? 'once' : 'monthly';
    const result = await upsertEmiBillReminder({
      userId,
      emi,
      dueDate,
      reminderDays: 7,
      frequency
    });

    return res.json({
      success: true,
      message: 'Pre-due reminder scheduled',
      data: { status: result.status, billReminderId: result.billReminderId || null }
    });
  } catch (error) {
    logger.error('Schedule pre-due reminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule reminder',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/monthly-trends
 * @desc Get comprehensive monthly trends including income, expenses, EMI, investments, savings, loans
 * @access Private
 * @note Income: Profile settings + Bank statements (credit transactions)
 * @note Spending/Investments: Combined from EMI Tracker + Expense Tracker
 */
router.get('/monthly-trends', authenticate, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user._id;
    
    logger.info(`Fetching EMI monthly trends for user: ${userId}, months: ${months}`);
    
    const Transaction = require('../models/Transaction');
    const FinancialProfile = require('../models/FinancialProfile');
    const mongoose = require('mongoose');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Get financial profile for monthly income
    const profile = await FinancialProfile.findOne({ userId });
    const profileMonthlyIncome = profile?.monthlyIncome || 0;
    
    // Get all EMIs for the user
    const allEMIs = await EMI.find({ userId }).sort({ startDate: 1 });
    
    // Cast userId to ObjectId for aggregation pipeline
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get all transactions for the user in the date range (Bank statements + Expense Tracker)
    let transactions = [];
    try {
      transactions = await Transaction.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: startDate, $lte: endDate }
          }
        },
      {
        $addFields: {
          dateObj: {
            $cond: {
              if: { $eq: [{ $type: '$date' }, 'string'] },
              then: { $dateFromString: { dateString: '$date' } },
              else: '$date'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateObj' },
            month: { $month: '$dateObj' },
            type: '$type',
            category: '$category',
            source: '$source' // Track source: quick_entry (Expense Tracker) vs bank statement
          },
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    } catch (aggErr) {
      logger.warn('Transaction aggregation failed, continuing with empty data:', aggErr.message);
    }
    
    // Process monthly data
    const monthlyData = {};
    const monthsArray = [];
    
    // Generate month array
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthsArray.push(monthKey);
      
      monthlyData[monthKey] = {
        month: monthKey,
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
        monthName: date.toLocaleString('default', { month: 'short' }),
        income: profileMonthlyIncome, // Initialize with profile income
        incomeFromBankStatements: 0, // Track bank statement credits
        incomeFromProfile: profileMonthlyIncome,
        spendings: 0,
        spendingsFromBankStatements: 0, // Track bank statement debits
        spendingsFromExpenseTracker: 0, // Track manual expenses
        investments: 0,
        investmentsFromBankStatements: 0,
        investmentsFromExpenseTracker: 0,
        emiPayments: 0,
        loanPayments: 0,
        savings: 0,
        netSavings: 0,
        savingsRate: 0,
        monthlyCommitments: 0,
        transactionCount: 0,
        categories: {}
      };
    }
    
    // Process transaction data
    transactions.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        const data = monthlyData[monthKey];
        const category = item._id.category || 'Uncategorized';
        const source = item._id.source || 'unknown';
        const isFromExpenseTracker = source === 'quick_entry' || source === 'manual';
        
        if (item._id.type === 'credit') {
          // Income from bank statements (credits)
          data.incomeFromBankStatements += item.totalAmount;
          // Total income = profile income + bank statement credits
          data.income = data.incomeFromProfile + data.incomeFromBankStatements;
        } else if (item._id.type === 'debit') {
          // Categorize spending based on category and source
          if (category.toLowerCase().includes('investment') || 
              category.toLowerCase().includes('mutual fund') || 
              category.toLowerCase().includes('stock') ||
              category.toLowerCase().includes('sip')) {
            // Investments
            if (isFromExpenseTracker) {
              data.investmentsFromExpenseTracker += item.totalAmount;
            } else {
              data.investmentsFromBankStatements += item.totalAmount;
            }
            data.investments += item.totalAmount;
          } else if (category.toLowerCase().includes('emi') || 
                     category.toLowerCase().includes('installment')) {
            // EMI Payments
            data.emiPayments += item.totalAmount;
          } else if (category.toLowerCase().includes('loan')) {
            // Loan Payments
            data.loanPayments += item.totalAmount;
          } else if (category.toLowerCase().includes('saving') || 
                     category.toLowerCase().includes('deposit') ||
                     category.toLowerCase().includes('fd') ||
                     category.toLowerCase().includes('fixed deposit')) {
            // Savings
            data.savings += item.totalAmount;
          } else {
            // Regular spending
            if (isFromExpenseTracker) {
              data.spendingsFromExpenseTracker += item.totalAmount;
            } else {
              data.spendingsFromBankStatements += item.totalAmount;
            }
            data.spendings += item.totalAmount;
          }
          
          // Track categories
          data.categories[category] = (data.categories[category] || 0) + item.totalAmount;
        }
        
        data.transactionCount += item.count;
      }
    });
    
    // Process EMI data for each month
    allEMIs.forEach(emi => {
      if (emi.status !== 'active' && emi.status !== 'completed') return;
      
      const emiStartDate = new Date(emi.startDate);
      
      monthsArray.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthDate = new Date(year, month - 1, 1);
        
        // Check if EMI is active in this month
        const monthsSinceStart = (monthDate.getFullYear() - emiStartDate.getFullYear()) * 12 
                                + (monthDate.getMonth() - emiStartDate.getMonth());
        
        if (monthsSinceStart >= 0 && monthsSinceStart < emi.totalTenure) {
          if (emi.status === 'active' || (emi.status === 'completed' && monthsSinceStart < emi.totalTenure)) {
            monthlyData[monthKey].emiPayments += emi.emiAmount || 0;
            monthlyData[monthKey].monthlyCommitments += emi.emiAmount || 0;
          }
        }
      });
    });
    
    // Calculate derived metrics for each month
    const trendsArray = monthsArray.map(monthKey => {
      const data = monthlyData[monthKey];
      
      // Calculate net savings (income - all expenses including EMI)
      data.netSavings = data.income - (data.spendings + data.emiPayments + data.loanPayments + data.investments);
      
      // Calculate savings rate
      if (data.income > 0) {
        data.savingsRate = ((data.netSavings / data.income) * 100).toFixed(2);
      }
      
      // Total monthly commitments (EMI + Loan payments)
      data.monthlyCommitments = data.emiPayments + data.loanPayments;
      
      return data;
    });
    
    // Calculate summary statistics
    const totalIncome = trendsArray.reduce((sum, t) => sum + t.income, 0);
    const totalSpendings = trendsArray.reduce((sum, t) => sum + t.spendings, 0);
    const totalEMI = trendsArray.reduce((sum, t) => sum + t.emiPayments, 0);
    const totalInvestments = trendsArray.reduce((sum, t) => sum + t.investments, 0);
    const totalLoans = trendsArray.reduce((sum, t) => sum + t.loanPayments, 0);
    const totalSavings = trendsArray.reduce((sum, t) => sum + t.savings, 0);
    const totalNetSavings = trendsArray.reduce((sum, t) => sum + t.netSavings, 0);
    const totalCommitments = trendsArray.reduce((sum, t) => sum + t.monthlyCommitments, 0);
    
    const avgMonthlyIncome = trendsArray.length > 0 ? totalIncome / trendsArray.length : 0;
    const avgMonthlySpendings = trendsArray.length > 0 ? totalSpendings / trendsArray.length : 0;
    const avgMonthlyEMI = trendsArray.length > 0 ? totalEMI / trendsArray.length : 0;
    const avgMonthlyInvestments = trendsArray.length > 0 ? totalInvestments / trendsArray.length : 0;
    const avgMonthlyCommitments = trendsArray.length > 0 ? totalCommitments / trendsArray.length : 0;
    const avgSavingsRate = trendsArray.length > 0 
      ? trendsArray.reduce((sum, t) => sum + parseFloat(t.savingsRate), 0) / trendsArray.length 
      : 0;
    
    // Calculate month-over-month changes
    let spendingChange = 0;
    let incomeChange = 0;
    if (trendsArray.length >= 2) {
      const currentMonth = trendsArray[trendsArray.length - 1];
      const previousMonth = trendsArray[trendsArray.length - 2];
      
      if (previousMonth.spendings > 0) {
        spendingChange = ((currentMonth.spendings - previousMonth.spendings) / previousMonth.spendings) * 100;
      }
      if (previousMonth.income > 0) {
        incomeChange = ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100;
      }
    }
    
    // Find best and worst months
    const sortedByNet = [...trendsArray].sort((a, b) => b.netSavings - a.netSavings);
    const bestMonth = sortedByNet[0];
    const worstMonth = sortedByNet[sortedByNet.length - 1];
    
    // Calculate consistency score (lower variation = higher consistency)
    const avgIncome = trendsArray.reduce((sum, t) => sum + t.income, 0) / trendsArray.length;
    const variance = trendsArray.reduce((sum, t) => sum + Math.pow(t.income - avgIncome, 2), 0) / trendsArray.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = avgIncome > 0 ? Math.max(0, 100 - (stdDev / avgIncome * 100)) : 0;
    
    res.json({
      success: true,
      data: {
        monthlyTrends: trendsArray,
        summary: {
          totalIncome,
          totalSpendings,
          totalEMI,
          totalInvestments,
          totalLoans,
          totalSavings,
          totalNetSavings,
          totalCommitments,
          avgMonthlyIncome,
          avgMonthlySpendings,
          avgMonthlyEMI,
          avgMonthlyInvestments,
          avgMonthlyCommitments,
          avgSavingsRate: parseFloat(avgSavingsRate.toFixed(2)),
          monthsAnalyzed: trendsArray.length
        },
        analysis: {
          spendingChange: parseFloat(spendingChange.toFixed(2)),
          incomeChange: parseFloat(incomeChange.toFixed(2)),
          difference: totalIncome - (totalSpendings + totalEMI + totalInvestments + totalLoans),
          bestMonth: bestMonth ? bestMonth.month : null,
          worstMonth: worstMonth ? worstMonth.month : null,
          consistencyScore: parseFloat(consistencyScore.toFixed(2))
        },
        currentEMIStatus: {
          activeEMIs: allEMIs.filter(e => e.status === 'active').length,
          totalOutstanding: allEMIs.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.emiAmount * e.remainingInstallments), 0),
          monthlyBurden: allEMIs.filter(e => e.status === 'active').reduce((sum, e) => sum + e.emiAmount, 0)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get EMI monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI monthly trends',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/monthly-trends/export
 * @desc Export monthly trends report to PDF or Excel
 * @access Private
 */
router.get('/monthly-trends/export', authenticate, async (req, res) => {
  try {
    const { months = 6, format = 'pdf' } = req.query;
    const userId = req.user._id;
    
    logger.info(`Exporting monthly trends report for user: ${userId}, format: ${format}`);
    
    const Transaction = require('../models/Transaction');
    const PDFDocument = require('pdfkit');
    const ExcelJS = require('exceljs');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Get financial profile
    const profile = await FinancialProfile.findOne({ userId });
    const profileMonthlyIncome = profile?.monthlyIncome || 0;
    
    // Get all EMIs
    const allEMIs = await EMI.find({ userId }).sort({ startDate: 1 });
    
    // Get all transactions
    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          dateObj: {
            $cond: {
              if: { $eq: [{ $type: '$date' }, 'string'] },
              then: { $dateFromString: { dateString: '$date' } },
              else: '$date'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateObj' },
            month: { $month: '$dateObj' },
            type: '$type',
            category: '$category',
            source: '$source'
          },
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Process monthly data (same logic as monthly-trends route)
    const monthlyData = {};
    const monthsArray = [];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthsArray.push(monthKey);
      
      monthlyData[monthKey] = {
        month: monthKey,
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
        monthName: date.toLocaleString('default', { month: 'short' }),
        income: profileMonthlyIncome,
        incomeFromBankStatements: 0,
        incomeFromProfile: profileMonthlyIncome,
        spendings: 0,
        spendingsFromBankStatements: 0,
        spendingsFromExpenseTracker: 0,
        investments: 0,
        investmentsFromBankStatements: 0,
        investmentsFromExpenseTracker: 0,
        emiPayments: 0,
        loanPayments: 0,
        savings: 0,
        netSavings: 0,
        savingsRate: 0,
        monthlyCommitments: 0,
        transactionCount: 0,
        categories: {}
      };
    }
    
    // Process transactions
    transactions.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        const data = monthlyData[monthKey];
        const category = item._id.category || 'Uncategorized';
        const source = item._id.source || 'unknown';
        const isFromExpenseTracker = source === 'quick_entry' || source === 'manual';
        
        if (item._id.type === 'credit') {
          data.incomeFromBankStatements += item.totalAmount;
          data.income = data.incomeFromProfile + data.incomeFromBankStatements;
        } else if (item._id.type === 'debit') {
          if (category.toLowerCase().includes('investment') || 
              category.toLowerCase().includes('mutual fund') || 
              category.toLowerCase().includes('stock') ||
              category.toLowerCase().includes('sip')) {
            if (isFromExpenseTracker) {
              data.investmentsFromExpenseTracker += item.totalAmount;
            } else {
              data.investmentsFromBankStatements += item.totalAmount;
            }
            data.investments += item.totalAmount;
          } else if (category.toLowerCase().includes('emi') || 
                     category.toLowerCase().includes('installment')) {
            data.emiPayments += item.totalAmount;
          } else if (category.toLowerCase().includes('loan')) {
            data.loanPayments += item.totalAmount;
          } else if (category.toLowerCase().includes('saving') || 
                     category.toLowerCase().includes('deposit') ||
                     category.toLowerCase().includes('fd') ||
                     category.toLowerCase().includes('fixed deposit')) {
            data.savings += item.totalAmount;
          } else {
            if (isFromExpenseTracker) {
              data.spendingsFromExpenseTracker += item.totalAmount;
            } else {
              data.spendingsFromBankStatements += item.totalAmount;
            }
            data.spendings += item.totalAmount;
          }
          data.categories[category] = (data.categories[category] || 0) + item.totalAmount;
        }
        data.transactionCount += item.count;
      }
    });
    
    // Process EMI data
    allEMIs.forEach(emi => {
      if (emi.status !== 'active' && emi.status !== 'completed') return;
      
      const emiStartDate = new Date(emi.startDate);
      
      monthsArray.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthDate = new Date(year, month - 1, 1);
        
        const monthsSinceStart = (monthDate.getFullYear() - emiStartDate.getFullYear()) * 12 
                                + (monthDate.getMonth() - emiStartDate.getMonth());
        
        if (monthsSinceStart >= 0 && monthsSinceStart < emi.totalTenure) {
          if (emi.status === 'active' || (emi.status === 'completed' && monthsSinceStart < emi.totalTenure)) {
            monthlyData[monthKey].emiPayments += emi.emiAmount || 0;
            monthlyData[monthKey].monthlyCommitments += emi.emiAmount || 0;
          }
        }
      });
    });
    
    // Calculate derived metrics
    const trendsArray = monthsArray.map(monthKey => {
      const data = monthlyData[monthKey];
      data.netSavings = data.income - (data.spendings + data.emiPayments + data.loanPayments + data.investments);
      if (data.income > 0) {
        data.savingsRate = ((data.netSavings / data.income) * 100).toFixed(2);
      }
      data.monthlyCommitments = data.emiPayments + data.loanPayments;
      return data;
    });
    
    // Calculate summary statistics
    const totalIncome = trendsArray.reduce((sum, t) => sum + t.income, 0);
    const totalSpendings = trendsArray.reduce((sum, t) => sum + t.spendings, 0);
    const totalEMI = trendsArray.reduce((sum, t) => sum + t.emiPayments, 0);
    const totalInvestments = trendsArray.reduce((sum, t) => sum + t.investments, 0);
    const totalLoans = trendsArray.reduce((sum, t) => sum + t.loanPayments, 0);
    const totalNetSavings = trendsArray.reduce((sum, t) => sum + t.netSavings, 0);
    const totalCommitments = trendsArray.reduce((sum, t) => sum + t.monthlyCommitments, 0);
    
    const avgMonthlyIncome = trendsArray.length > 0 ? totalIncome / trendsArray.length : 0;
    const avgMonthlySpendings = trendsArray.length > 0 ? totalSpendings / trendsArray.length : 0;
    const avgMonthlyEMI = trendsArray.length > 0 ? totalEMI / trendsArray.length : 0;
    const avgMonthlyInvestments = trendsArray.length > 0 ? totalInvestments / trendsArray.length : 0;
    const avgMonthlyCommitments = trendsArray.length > 0 ? totalCommitments / trendsArray.length : 0;
    const avgSavingsRate = trendsArray.length > 0 
      ? trendsArray.reduce((sum, t) => sum + parseFloat(t.savingsRate), 0) / trendsArray.length 
      : 0;
    
    // Export based on format
    if (format === 'excel') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Monthly Trends');
      
      // Add title
      worksheet.mergeCells('A1:K1');
      const titleRow = worksheet.getCell('A1');
      titleRow.value = 'Monthly Trends Report';
      titleRow.font = { size: 16, bold: true };
      titleRow.alignment = { horizontal: 'center' };
      
      // Add metadata
      worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
      worksheet.getCell('A3').value = `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
      worksheet.getCell('A4').value = `User: ${profile?.fullName || 'Unknown'}`;
      
      // Add summary section
      worksheet.getCell('A6').value = 'Summary Statistics';
      worksheet.getCell('A6').font = { bold: true, size: 14 };
      
      const summaryData = [
        ['Total Income', `₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Spending', `₹${totalSpendings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total EMI Payments', `₹${totalEMI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Investments', `₹${totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Loan Payments', `₹${totalLoans.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Net Savings', `₹${totalNetSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Income', `₹${avgMonthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Spending', `₹${avgMonthlySpendings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Investments', `₹${avgMonthlyInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Savings Rate', `${avgSavingsRate.toFixed(2)}%`]
      ];
      
      summaryData.forEach((row, index) => {
        worksheet.getCell(`A${7 + index}`).value = row[0];
        worksheet.getCell(`B${7 + index}`).value = row[1];
        worksheet.getCell(`A${7 + index}`).font = { bold: true };
      });
      
      // Add monthly data table
      const dataStartRow = 19;
      worksheet.getCell(`A${dataStartRow}`).value = 'Monthly Breakdown';
      worksheet.getCell(`A${dataStartRow}`).font = { bold: true, size: 14 };
      
      // Headers
      const headers = ['Month', 'Income', 'Spendings', 'EMI', 'Investments', 'Loans', 'Commitments', 'Net Savings', 'Savings %', 'Transactions'];
      const headerRow = worksheet.getRow(dataStartRow + 1);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      
      // Data rows
      trendsArray.forEach((trend, index) => {
        const row = worksheet.getRow(dataStartRow + 2 + index);
        row.values = [
          `${trend.monthName} ${trend.year}`,
          trend.income,
          trend.spendings,
          trend.emiPayments,
          trend.investments,
          trend.loanPayments,
          trend.monthlyCommitments,
          trend.netSavings,
          `${trend.savingsRate}%`,
          trend.transactionCount
        ];
        
        // Format currency cells
        for (let col = 2; col <= 8; col++) {
          row.getCell(col).numFmt = '₹#,##0.00';
        }
      });
      
      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });
      
      // Add Chart Sheet
      const chartSheet = workbook.addWorksheet('Visual Chart');
      
      // Add chart title
      chartSheet.mergeCells('A1:J1');
      const chartTitle = chartSheet.getCell('A1');
      chartTitle.value = 'Monthly Financial Trends - Visual Representation';
      chartTitle.font = { size: 16, bold: true };
      chartTitle.alignment = { horizontal: 'center' };
      
      // Add chart data for visualization
      chartSheet.getCell('A3').value = 'Month';
      chartSheet.getCell('B3').value = 'Income';
      chartSheet.getCell('C3').value = 'Spending';
      chartSheet.getCell('D3').value = 'Investments';
      chartSheet.getCell('E3').value = 'Net Savings';
      
      // Style headers
      ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
        chartSheet.getCell(cell).font = { bold: true };
        chartSheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        chartSheet.getCell(cell).font.color = { argb: 'FFFFFFFF' };
      });
      
      // Add data
      trendsArray.forEach((trend, index) => {
        const row = 4 + index;
        chartSheet.getCell(`A${row}`).value = `${trend.monthName} ${trend.year}`;
        chartSheet.getCell(`B${row}`).value = trend.income;
        chartSheet.getCell(`C${row}`).value = trend.spendings;
        chartSheet.getCell(`D${row}`).value = trend.investments;
        chartSheet.getCell(`E${row}`).value = trend.netSavings;
        
        // Format currency
        ['B', 'C', 'D', 'E'].forEach(col => {
          chartSheet.getCell(`${col}${row}`).numFmt = '₹#,##0.00';
        });
      });
      
      // Add Excel chart
      chartSheet.addImage(workbook.addImage({
        base64: '',
        extension: 'png',
      }), {
        tl: { col: 0, row: 4 + trendsArray.length + 1 },
        ext: { width: 600, height: 400 }
      });
      
      // Add a line chart using Excel's built-in charting
      const chartData = trendsArray.map((trend, index) => ({
        month: `${trend.monthName} ${trend.year}`,
        income: trend.income,
        spending: trend.spendings,
        investments: trend.investments,
        netSavings: trend.netSavings
      }));
      
      // Add visual representation with colored cells
      const chartStartRow = 4 + trendsArray.length + 3;
      chartSheet.getCell(`A${chartStartRow}`).value = 'Visual Bar Representation';
      chartSheet.getCell(`A${chartStartRow}`).font = { bold: true, size: 14 };
      
      chartSheet.getCell(`A${chartStartRow + 1}`).value = 'Month';
      chartSheet.getCell(`B${chartStartRow + 1}`).value = 'Income (₹)';
      chartSheet.getCell(`C${chartStartRow + 1}`).value = 'Spending (₹)';
      chartSheet.getCell(`D${chartStartRow + 1}`).value = 'Investments (₹)';
      chartSheet.getCell(`E${chartStartRow + 1}`).value = 'Net Savings (₹)';
      
      trendsArray.forEach((trend, index) => {
        const row = chartStartRow + 2 + index;
        chartSheet.getCell(`A${row}`).value = `${trend.monthName}`;
        
        // Create bar chart effect with colored cells
        const maxValue = Math.max(trend.income, trend.spendings, trend.investments, Math.abs(trend.netSavings));
        
        // Income bar (green)
        chartSheet.getCell(`B${row}`).value = trend.income;
        chartSheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' }
        };
        
        // Spending bar (red)
        chartSheet.getCell(`C${row}`).value = trend.spendings;
        chartSheet.getCell(`C${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF44336' }
        };
        
        // Investments bar (purple)
        chartSheet.getCell(`D${row}`).value = trend.investments;
        chartSheet.getCell(`D${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF9C27B0' }
        };
        
        // Net Savings bar (blue)
        chartSheet.getCell(`E${row}`).value = trend.netSavings;
        chartSheet.getCell(`E${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2196F3' }
        };
        
        // Format all as currency with white text
        ['B', 'C', 'D', 'E'].forEach(col => {
          chartSheet.getCell(`${col}${row}`).numFmt = '₹#,##0';
          chartSheet.getCell(`${col}${row}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          chartSheet.getCell(`${col}${row}`).alignment = { horizontal: 'center' };
        });
      });
      
      // Auto-fit chart sheet columns
      chartSheet.columns.forEach((column) => {
        column.width = 18;
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly-trends-${Date.now()}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
      
    } else {
      // Create PDF with charts
      const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly-trends-${Date.now()}.pdf`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('Monthly Trends Report', { align: 'center' });
      doc.moveDown();
      
      // Metadata
      doc.fontSize(10).font('Helvetica')
        .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
        .text(`Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`, { align: 'right' })
        .text(`User: ${profile?.fullName || 'Unknown'}`, { align: 'right' });
      
      doc.moveDown(2);
      
      // Summary section
      doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica');
      const summaryItems = [
        ['Total Income:', `₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Spending:', `₹${totalSpendings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total EMI Payments:', `₹${totalEMI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Investments:', `₹${totalInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Loan Payments:', `₹${totalLoans.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Total Net Savings:', `₹${totalNetSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Income:', `₹${avgMonthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Spending:', `₹${avgMonthlySpendings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Monthly Investments:', `₹${avgMonthlyInvestments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Avg Savings Rate:', `${avgSavingsRate.toFixed(2)}%`]
      ];
      
      summaryItems.forEach(([label, value]) => {
        doc.text(`${label} ${value}`, { continued: false });
      });
      
      doc.moveDown(2);
      
      // Generate chart image
      try {
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
          width: 500, 
          height: 300,
          backgroundColour: 'white'
        });
        
        // Prepare chart data
        const chartLabels = trendsArray.map(t => `${t.monthName} ${t.year}`);
        const incomeData = trendsArray.map(t => t.income);
        const spendingData = trendsArray.map(t => t.spendings);
        const investmentData = trendsArray.map(t => t.investments);
        const netSavingsData = trendsArray.map(t => t.netSavings);
        
        // Chart configuration
        const configuration = {
          type: 'line',
          data: {
            labels: chartLabels,
            datasets: [
              {
                label: 'Income',
                data: incomeData,
                borderColor: 'rgba(76, 175, 80, 1)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
              },
              {
                label: 'Spending',
                data: spendingData,
                borderColor: 'rgba(244, 67, 54, 1)',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
              },
              {
                label: 'Investments',
                data: investmentData,
                borderColor: 'rgba(156, 39, 176, 1)',
                backgroundColor: 'rgba(156, 39, 176, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
              },
              {
                label: 'Net Savings',
                data: netSavingsData,
                borderColor: 'rgba(33, 150, 243, 1)',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5]
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Monthly Financial Trends',
                font: {
                  size: 16,
                  weight: 'bold'
                }
              },
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  padding: 15
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '₹' + (value / 1000).toFixed(0) + 'K';
                  }
                },
                title: {
                  display: true,
                  text: 'Amount (₹)'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Month'
                }
              }
            }
          }
        };
        
        // Render chart to buffer
        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        
        // Add chart to PDF
        doc.fontSize(14).font('Helvetica-Bold').text('Visual Trends Chart');
        doc.moveDown(0.5);
        
        const chartWidth = 500;
        const chartHeight = 300;
        const pageWidth = doc.page.width - 100; // Account for margins
        const scaleFactor = pageWidth / chartWidth;
        
        doc.image(imageBuffer, {
          fit: [pageWidth, chartHeight * scaleFactor],
          align: 'center'
        });
        
        doc.moveDown(2);
      } catch (chartError) {
        logger.warn('Could not generate chart for PDF:', chartError);
        // Continue without chart
      }
      
      // Monthly breakdown table
      doc.fontSize(14).font('Helvetica-Bold').text('Monthly Breakdown');
      doc.moveDown(0.5);
      
      // Table headers
      const tableTop = doc.y;
      const colWidths = [60, 70, 70, 60, 70, 60, 50, 50];
      const headers = ['Month', 'Income', 'Spending', 'EMI', 'Investment', 'Loans', 'Net Savings', 'Rate'];
      
      doc.fontSize(9).font('Helvetica-Bold');
      let xPos = 50;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });
      
      doc.moveDown(0.3);
      
      // Table rows
      doc.fontSize(8).font('Helvetica');
      trendsArray.forEach((trend, index) => {
        const yPos = doc.y;
        xPos = 50;
        
        const rowData = [
          `${trend.monthName} ${trend.year}`,
          `₹${(trend.income / 1000).toFixed(0)}K`,
          `₹${(trend.spendings / 1000).toFixed(0)}K`,
          `₹${(trend.emiPayments / 1000).toFixed(0)}K`,
          `₹${(trend.investments / 1000).toFixed(0)}K`,
          `₹${(trend.loanPayments / 1000).toFixed(0)}K`,
          `₹${(trend.netSavings / 1000).toFixed(0)}K`,
          `${trend.savingsRate}%`
        ];
        
        rowData.forEach((data, i) => {
          doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        doc.moveDown(0.3);
        
        // Add new page if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // Footer
      doc.fontSize(8).font('Helvetica').text(
        'Financial Analyzer - Monthly Trends Report',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
      
      // Finalize PDF
      doc.end();
    }
    
  } catch (error) {
    logger.error('Export monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export monthly trends',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/upcoming
 * @desc Get upcoming EMI payments
 * @access Private
 */
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    logger.info(`Fetching upcoming EMIs for ${months} months`);
    
    const upcomingData = await emiAnalyticsService.getUpcomingPayments(
      req.user._id,
      parseInt(months)
    );
    
    res.json({
      success: true,
      data: upcomingData
    });
  } catch (error) {
    logger.error('Get upcoming EMIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming EMIs',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/by-provider
 * @desc Get EMIs grouped by card provider
 * @access Private
 */
router.get('/by-provider', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMIs by provider for user: ${req.user._id}`);
    
    const providerData = await emiAnalyticsService.getEMIsByProvider(req.user._id);
    
    res.json({
      success: true,
      data: providerData
    });
  } catch (error) {
    logger.error('Get EMIs by provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMIs by provider',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/by-merchant
 * @desc Get EMIs grouped by merchant
 * @access Private
 */
router.get('/by-merchant', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMIs by merchant for user: ${req.user._id}`);
    
    const merchantData = await emiAnalyticsService.getEMIsByMerchant(req.user._id);
    
    res.json({
      success: true,
      data: merchantData
    });
  } catch (error) {
    logger.error('Get EMIs by merchant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMIs by merchant',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/timeline
 * @desc Get EMI payment timeline
 * @access Private
 */
router.get('/timeline', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    logger.info(`Fetching EMI timeline`);
    
    const timeline = await emiAnalyticsService.getEMITimeline(
      req.user._id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    logger.error('Get EMI timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI timeline',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/charts
 * @desc Get data for EMI charts and visualizations
 * @access Private
 */
router.get('/charts', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMI chart data`);
    
    const chartData = await emiAnalyticsService.getChartData(req.user._id);
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    logger.error('Get EMI chart data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI chart data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/insights
 * @desc Get EMI insights and recommendations
 * @access Private
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMI insights`);
    
    const insights = await emiAnalyticsService.getEMIInsights(req.user._id);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Get EMI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI insights',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/:id
 * @desc Get details of a specific EMI
 * @access Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Skip if id is not a valid ObjectId — let named routes handle it
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next();
    }
    
    logger.info(`Fetching EMI details: ${id}`);
    
    const emi = await EMI.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    res.json({
      success: true,
      data: emiAnalyticsService.formatEMIData(emi)
    });
  } catch (error) {
    logger.error('Get EMI details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI details',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/sync-statements
 * @desc Sync credit card statements from Gmail and extract EMIs
 * @access Private
 */
router.post('/sync-statements', authenticate, async (req, res) => {
  try {
    logger.info(`Starting credit card statement sync for user: ${req.user._id}`);
    
    // Get user's Gmail tokens from FinancialProfile
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.gmailSettings || !profile.gmailSettings.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect Gmail first.'
      });
    }

    // Get tokens (need to include the select: false fields)
    const profileWithTokens = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    
    if (!profileWithTokens.gmailSettings.accessToken || !profileWithTokens.gmailSettings.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail tokens not found. Please reconnect Gmail.'
      });
    }

    // Initialize credit card statement service
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    // Set credentials from profile
    oauth2Client.setCredentials({
      access_token: profileWithTokens.gmailSettings.accessToken,
      refresh_token: profileWithTokens.gmailSettings.refreshToken,
      scope: profileWithTokens.gmailSettings.grantedScopes?.join(' ') || ''
    });
    
    const ccStatementService = new CreditCardStatementService(oauth2Client);
    
    // Fetch statements
    const { maxResults = 50 } = req.body;
    const statements = await ccStatementService.fetchCreditCardStatements(
      req.user._id,
      maxResults
    );
    
    logger.info(`Found ${statements.length} credit card statements`);
    
    // Extract EMIs from each statement
    const extractionResults = [];
    
    for (const statement of statements) {
      for (const attachment of statement.attachments) {
        try {
          logger.info(`Extracting EMIs from: ${attachment.filename}`);
          
          const result = await emiExtractionService.extractEMIsFromStatement(
            attachment.documentId,
            req.user._id,
            attachment.password
          );
          
          extractionResults.push({
            document: attachment.filename,
            provider: statement.provider,
            emisExtracted: result.count,
            success: true
          });
        } catch (error) {
          logger.error(`Error extracting from ${attachment.filename}:`, error);
          extractionResults.push({
            document: attachment.filename,
            provider: statement.provider,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    const totalEMIsExtracted = extractionResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.emisExtracted, 0);
    
    logger.info(`Total EMIs extracted: ${totalEMIsExtracted}`);
    
    res.json({
      success: true,
      message: `Successfully synced ${statements.length} statements and extracted ${totalEMIsExtracted} EMIs`,
      data: {
        statementsProcessed: statements.length,
        emisExtracted: totalEMIsExtracted,
        details: extractionResults
      }
    });
  } catch (error) {
    logger.error('Sync statements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync credit card statements',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/extract/:documentId
 * @desc Extract EMIs from a specific document
 * @access Private
 */
router.post('/extract/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { password } = req.body;
    
    logger.info(`Extracting EMIs from document: ${documentId}`);
    
    const result = await emiExtractionService.extractEMIsFromStatement(
      documentId,
      req.user._id,
      password
    );
    
    res.json({
      success: true,
      message: `Successfully extracted ${result.count} EMIs`,
      data: result
    });
  } catch (error) {
    logger.error('Extract EMIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract EMIs from document',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/foreclosure/:emiId
 * @desc Calculate foreclosure savings for an EMI
 * @access Private
 */
router.get('/foreclosure/:emiId', authenticate, async (req, res) => {
  try {
    const { emiId } = req.params;
    
    logger.info(`Calculating foreclosure savings for EMI: ${emiId}`);
    
    const foreclosureData = await emiAnalyticsService.calculateForeclosureSavings(
      req.user._id,
      emiId
    );
    
    res.json({
      success: true,
      data: foreclosureData
    });
  } catch (error) {
    logger.error('Calculate foreclosure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate foreclosure savings',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/emi/:id
 * @desc Update EMI details
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    logger.info(`Updating EMI: ${id}`);
    
    const emi = await EMI.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    // Allow updating specific fields
    const allowedUpdates = [
      'merchantName',
      'productDescription',
      'emiAmount',
      'interestRate',
      'interestType',
      'totalTenure',
      'repaymentType',
      'notes',
      'tags',
      'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        emi[field] = updates[field];
      }
    });

    // Recalculate INR amounts if emi amount changed
    const exchangeRate = emi.exchangeRate || 1;
    if (updates.emiAmount !== undefined) {
      emi.emiAmountInINR = parseFloat(updates.emiAmount) * exchangeRate;
    }
    if (updates.totalTenure !== undefined) {
      emi.remainingInstallments = parseInt(updates.totalTenure) - (emi.paidInstallments || 0);
    }
    
    await emi.save();
    
    res.json({
      success: true,
      message: 'EMI updated successfully',
      data: emiAnalyticsService.formatEMIData(emi)
    });
  } catch (error) {
    logger.error('Update EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update EMI',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/emi/:id
 * @desc Delete an EMI record
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting EMI: ${id}`);
    
    const emi = await EMI.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    res.json({
      success: true,
      message: 'EMI deleted successfully'
    });
  } catch (error) {
    logger.error('Delete EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete EMI',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/:id/mark-paid
 * @desc Mark an EMI installment as paid
 * @access Private
 */
router.post('/:id/mark-paid', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentNumber, paidDate, amount } = req.body;
    
    logger.info(`Marking EMI ${id} installment ${installmentNumber} as paid`);
    
    const emi = await EMI.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    // Calculate principal and interest portions
    const totalAmount = amount || emi.emiAmount;
    const totalPrincipal = emi.principalAmount;
    const principalPerInstallment = totalPrincipal / emi.totalTenure;
    const interestPerInstallment = totalAmount - principalPerInstallment;
    
    // Add payment to history
    const payment = {
      installmentNumber: installmentNumber || emi.paidInstallments + 1,
      dueDate: emi.nextDueDate,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      amount: totalAmount,
      principalPaid: principalPerInstallment,
      interestPaid: interestPerInstallment,
      status: 'paid'
    };
    
    await emi.addPayment(payment);

    // Create a corresponding transaction so this EMI payment shows up in monthly spending
    try {
      const paidDateObj = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      const startOfDay = new Date(paidDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(paidDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await Transaction.findOne({
        userId: req.user._id,
        amount: payment.amount,
        date: { $gte: startOfDay, $lte: endOfDay },
        category: { $regex: /emi/i }
      });

      if (!existing) {
        await Transaction.create({
          userId: req.user._id,
          date: payment.paidDate,
          description: `EMI payment - ${emi.merchantName}`,
          amount: Math.abs(payment.amount),
          currency: 'INR',
          type: 'debit',
          category: 'EMI',
          merchantName: emi.merchantName,
          source: 'manual',
          referenceNumber: emi._id.toString()
        });

        // Invalidate dashboard / analytics caches for this user so UI reflects new transaction
        try {
          await CacheHelpers.invalidateUserCache(req.user._id);
        } catch (ciErr) {
          logger.warn('Failed to invalidate cache after EMI transaction creation:', ciErr);
        }
      }
    } catch (txErr) {
      logger.warn('Failed to create transaction for EMI payment:', txErr);
    }

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: emiAnalyticsService.formatEMIData(emi)
    });
  } catch (error) {
    logger.error('Mark EMI paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark EMI as paid',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/statistics/summary
 * @desc Get overall EMI statistics
 * @access Private
 */
router.get('/statistics/summary', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMI statistics summary`);
    
    const activeCount = await EMI.countDocuments({
      userId: req.user._id,
      status: 'active'
    });
    
    const completedCount = await EMI.countDocuments({
      userId: req.user._id,
      status: 'completed'
    });
    
    const activeEMIs = await EMI.find({
      userId: req.user._id,
      status: 'active'
    });
    
    const totalOutstanding = activeEMIs.reduce((sum, emi) => {
      return sum + (emi.emiAmount * emi.remainingInstallments);
    }, 0);
    
    const monthlyBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
    
    const avgInterestRate = activeEMIs.length > 0
      ? activeEMIs.reduce((sum, emi) => sum + emi.interestRate, 0) / activeEMIs.length
      : 0;
    
    res.json({
      success: true,
      data: {
        activeEMIs: activeCount,
        completedEMIs: completedCount,
        totalOutstanding: Math.round(totalOutstanding),
        monthlyBurden: Math.round(monthlyBurden),
        averageInterestRate: avgInterestRate.toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Get statistics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/manual
 * @desc Create EMI manually
 * @access Private
 */
router.post('/manual', authenticate, async (req, res) => {
  try {
    logger.info(`Creating manual EMI for user: ${req.user._id}`);
    
    const {
      cardProvider,
      customProviderName,
      cardLastFourDigits,
      cardHolderName,
      merchantName,
      productDescription,
      principalAmount,
      interestRate,
      interestType, // 'percentage' or 'flat' (rupees)
      processingFee,
      emiAmount,
      totalTenure,
      repaymentType, // MONTHLY or ON_REQUEST
      startDate,
      notes,
      tags
    } = req.body;
    
    // Validation - different based on repayment type
    if (!cardProvider || !cardLastFourDigits || !cardHolderName || !merchantName || 
        !principalAmount || !startDate || !repaymentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Additional validation for MONTHLY repayment type
    if (repaymentType === 'MONTHLY' && (!emiAmount || !totalTenure)) {
      return res.status(400).json({
        success: false,
        message: 'EMI amount and tenure are required for monthly repayment type'
      });
    }

    // Validate custom provider name when OTHER is selected
    if (cardProvider === 'OTHER' && !customProviderName) {
      return res.status(400).json({
        success: false,
        message: 'Provider name is required when selecting OTHER'
      });
    }
    
    // Validate card last four digits
    if (!/^\d{4}$/.test(cardLastFourDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Card last four digits must be exactly 4 digits'
      });
    }
    
    // For ON_REQUEST type, set default values for EMI amount and tenure
    const finalEmiAmount = repaymentType === 'ON_REQUEST' ? principalAmount : parseFloat(emiAmount);
    const finalTotalTenure = repaymentType === 'ON_REQUEST' ? 1 : parseInt(totalTenure);
    
    // Calculate dates
    // startDate = date of FIRST EMI payment (not contract date)
    const emiStartDate = new Date(startDate);
    const endDate = new Date(emiStartDate);
    if (repaymentType === 'MONTHLY') {
      // Last payment is at startDate + (tenure - 1) months
      endDate.setMonth(endDate.getMonth() + finalTotalTenure - 1);
    }
    // For ON_REQUEST, end date is not applicable (no fixed tenure)
    
    const nextDueDate = repaymentType === 'MONTHLY' ? (() => {
      const now = new Date();
      // First payment is at startDate, subsequent payments monthly
      // Find the next future due date
      for (let i = 0; i < finalTotalTenure; i++) {
        const dueDate = new Date(emiStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        if (dueDate > now) return dueDate;
      }
      // All installments are past — return last one
      const lastDate = new Date(emiStartDate);
      lastDate.setMonth(lastDate.getMonth() + finalTotalTenure - 1);
      return lastDate;
    })() : null; // No next due date for ON_REQUEST type
    
    // For older EMIs, calculate how many installments are already past
    const now = new Date();
    const monthsElapsedSinceStart = repaymentType === 'MONTHLY' ? Math.max(0, Math.floor(
      (now.getFullYear() - emiStartDate.getFullYear()) * 12 +
      (now.getMonth() - emiStartDate.getMonth())
    )) : 0;
    const autoPaidInstallments = Math.min(monthsElapsedSinceStart, finalTotalTenure);
    const autoRemainingInstallments = finalTotalTenure - autoPaidInstallments;
    
    // Calculate payment schedule (only for MONTHLY type)
    const paymentHistory = [];
    const finalInterestType = interestType || 'percentage';
    if (repaymentType === 'MONTHLY') {
      // For flat interest: interestRate is total flat amount in rupees
      // For percentage interest: interestRate is annual percentage
      const monthlyInterest = finalInterestType === 'flat' ? 0 : (interestRate || 0) / 12 / 100;
      const flatInterestPerMonth = finalInterestType === 'flat' ? (parseFloat(interestRate) || 0) / finalTotalTenure : 0;
      
      for (let i = 0; i < finalTotalTenure; i++) {
        // First installment (i=0) is at emiStartDate itself
        const dueDate = new Date(emiStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        // Calculate principal and interest for this installment
        const outstandingPrincipal = principalAmount - (i * (principalAmount / finalTotalTenure));
        const interestPaid = finalInterestType === 'flat' ? flatInterestPerMonth : (outstandingPrincipal * monthlyInterest);
        const principalPaid = finalEmiAmount - interestPaid;
        
        // Auto-mark past installments as paid for older EMIs
        const isPast = i < autoPaidInstallments;
        
        paymentHistory.push({
          installmentNumber: i + 1,
          dueDate: dueDate,
          amount: finalEmiAmount,
          principalPaid: Math.max(0, principalPaid),
          interestPaid: Math.max(0, interestPaid),
          status: isPast ? 'paid' : 'upcoming',
          ...(isPast ? { paidDate: dueDate } : {})
        });
      }
    } else {
      // For ON_REQUEST type, create a single entry
      paymentHistory.push({
        installmentNumber: 1,
        dueDate: null, // No fixed due date
        amount: principalAmount,
        principalPaid: principalAmount,
        interestPaid: 0,
        status: 'upcoming'
      });
    }
    
    // Create EMI record
    // Use custom provider name if OTHER is selected, otherwise use the selected provider
    const finalCardProvider = cardProvider === 'OTHER' && customProviderName 
      ? customProviderName.toUpperCase() 
      : cardProvider.toUpperCase();
    
    // Currency conversion: default to INR with exchange rate 1
    const currency = req.body.currency || 'INR';
    const exchangeRate = parseFloat(req.body.exchangeRate) || 1;
    const parsedPrincipal = parseFloat(principalAmount);
    const parsedProcessingFee = parseFloat(processingFee) || 0;

    const emi = new EMI({
      userId: req.user._id,
      cardProvider: finalCardProvider,
      cardLastFourDigits,
      cardHolderName,
      merchantName,
      productDescription: productDescription || (repaymentType === 'ON_REQUEST' ? 'Personal Loan' : 'Manual Entry'),
      principalAmount: parsedPrincipal,
      principalAmountInINR: parsedPrincipal * exchangeRate,
      currency,
      exchangeRate,
      interestRate: parseFloat(interestRate) || 0,
      interestType: finalInterestType,
      processingFee: parsedProcessingFee,
      processingFeeInINR: parsedProcessingFee * exchangeRate,
      emiAmount: finalEmiAmount,
      emiAmountInINR: finalEmiAmount * exchangeRate,
      totalTenure: finalTotalTenure,
      paidInstallments: autoPaidInstallments,
      remainingInstallments: autoRemainingInstallments,
      repaymentType: repaymentType || 'MONTHLY',
      startDate: emiStartDate,
      endDate: repaymentType === 'MONTHLY' ? endDate : null,
      nextDueDate: nextDueDate,
      paymentHistory: paymentHistory,
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: notes || (repaymentType === 'ON_REQUEST' ? 'Personal loan - pay back anytime when requested' : ''),
      tags: tags || []
    });
    
    await emi.save();
    
    logger.info(`Manual EMI created successfully: ${emi._id}`);
    
    res.status(201).json({
      success: true,
      message: 'EMI created successfully',
      data: emi
    });
  } catch (error) {
    logger.error('Create manual EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create EMI',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/emi/:id
 * @desc Update EMI details
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Updating EMI: ${id}`);
    
    const emi = await EMI.findOne({ _id: id, userId: req.user._id });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'merchantName', 'productDescription', 'notes', 'tags',
      'cardHolderName', 'interestRate', 'interestType', 'repaymentType'
    ];
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        emi[key] = req.body[key];
      }
    });
    
    await emi.save();
    
    res.json({
      success: true,
      message: 'EMI updated successfully',
      data: emi
    });
  } catch (error) {
    logger.error('Update EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update EMI',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/emi/:id
 * @desc Delete EMI
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting EMI: ${id}`);
    
    const emi = await EMI.findOne({ _id: id, userId: req.user._id });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    await EMI.deleteOne({ _id: id });
    
    res.json({
      success: true,
      message: 'EMI deleted successfully'
    });
  } catch (error) {
    logger.error('Delete EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete EMI',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/:id/mark-paid
 * @desc Mark an installment as paid
 * @access Private
 */
router.post('/:id/mark-paid', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentNumber, paidDate } = req.body;
    
    logger.info(`Marking installment ${installmentNumber} as paid for EMI: ${id}`);
    
    const emi = await EMI.findOne({ _id: id, userId: req.user._id });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    // Find the payment in history
    const payment = emi.paymentHistory.find(p => p.installmentNumber === parseInt(installmentNumber));
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already marked as paid'
      });
    }
    
    // Update payment status
    payment.status = 'paid';
    payment.paidDate = paidDate ? new Date(paidDate) : new Date();
    
    // Update EMI counters
    emi.paidInstallments = emi.paymentHistory.filter(p => p.status === 'paid').length;
    emi.remainingInstallments = emi.totalTenure - emi.paidInstallments;
    
    // Update next due date
    if (emi.remainingInstallments > 0) {
      const nextUnpaid = emi.paymentHistory.find(p => p.status !== 'paid');
      if (nextUnpaid) {
        emi.nextDueDate = nextUnpaid.dueDate;
      }
    } else {
      emi.status = 'completed';
    }
    
    await emi.save();
    // Create a corresponding transaction so this EMI payment shows up in monthly spending
    try {
      const paidDateObj = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      const startOfDay = new Date(paidDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(paidDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await Transaction.findOne({
        userId: req.user._id,
        amount: payment.amount,
        date: { $gte: startOfDay, $lte: endOfDay },
        category: { $regex: /emi/i }
      });

      if (!existing) {
        await Transaction.create({
          userId: req.user._id,
          date: payment.paidDate,
          description: `EMI payment - ${emi.merchantName}`,
          amount: Math.abs(payment.amount),
          currency: 'INR',
          type: 'debit',
          category: 'EMI',
          merchantName: emi.merchantName,
          source: 'manual',
          referenceNumber: emi._id.toString()
        });

        try {
          await CacheHelpers.invalidateUserCache(req.user._id);
        } catch (ciErr) {
          logger.warn('Failed to invalidate cache after EMI transaction creation:', ciErr);
        }
      }
    } catch (txErr) {
      logger.warn('Failed to create transaction for EMI payment:', txErr);
    }

    res.json({
      success: true,
      message: 'Payment marked as paid',
      data: emi
    });
  } catch (error) {
    logger.error('Mark payment as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payment as paid',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/:id/foreclose
 * @desc Foreclose an EMI
 * @access Private
 */
router.post('/:id/foreclose', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { foreclosureDate, foreclosureAmount } = req.body;
    
    logger.info(`Foreclosing EMI: ${id}`);
    
    const emi = await EMI.findOne({ _id: id, userId: req.user._id });
    
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }
    
    if (emi.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active EMIs can be foreclosed'
      });
    }
    
    // Update EMI status
    emi.status = 'foreclosed';
    emi.foreclosureAmount = foreclosureAmount || (emi.emiAmount * emi.remainingInstallments);
    emi.remainingInstallments = 0;
    
    // Mark all remaining payments as cancelled
    emi.paymentHistory.forEach(payment => {
      if (payment.status === 'upcoming' || payment.status === 'pending') {
        payment.status = 'cancelled';
      }
    });
    
    await emi.save();
    
    res.json({
      success: true,
      message: 'EMI foreclosed successfully',
      data: emi
    });
  } catch (error) {
    logger.error('Foreclose EMI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to foreclose EMI',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/:id/convert-to-loan
 * @desc Convert EMI to Personal Loan — keeps EMI active AND creates PersonalLoan record
 * @access Private
 */
router.post('/:id/convert-to-loan', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const emi = await EMI.findOne({ _id: id, userId: req.user._id });
    
    if (!emi) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }
    if (emi.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active EMIs can be converted' });
    }

    // 1. Mark EMI as ON_REQUEST but keep it active
    emi.repaymentType = 'ON_REQUEST';
    emi.convertedToLoan = true;
    emi.convertedAt = new Date();
    await emi.save();

    // 2. Create a linked PersonalLoan record
    const PersonalLoan = require('../models/PersonalLoan');
    
    // Check if already linked
    let loan = await PersonalLoan.findOne({ userId: req.user._id, linkedEmiId: emi._id });
    
    if (!loan) {
      const outstanding = (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      loan = await PersonalLoan.create({
        userId: req.user._id,
        lenderName: emi.cardProvider || emi.merchantName || 'EMI Provider',
        principalAmount: emi.principalAmount || outstanding,
        outstandingAmount: outstanding,
        interestRate: emi.interestRate || 0,
        loanTakenDate: emi.startDate || new Date(),
        purpose: `Converted from EMI: ${emi.merchantName || emi.productDescription || 'EMI'}`,
        relationship: 'bank',
        status: 'active',
        linkedEmiId: emi._id,
        notes: `Auto-created from EMI conversion. Original tenure: ${emi.totalTenure} months, Paid: ${emi.paidInstallments}`,
        repayments: emi.paymentHistory?.filter(p => p.status === 'paid').map((p, i) => ({
          amount: p.amount || emi.emiAmount,
          amountInINR: p.amount || emi.emiAmount,
          date: p.paidDate || p.dueDate,
          method: 'bank_transfer',
          notes: `EMI installment ${p.installmentNumber || i + 1}`
        })) || []
      });
    }

    logger.info(`EMI ${id} converted to Personal Loan ${loan._id} for user ${req.user._id}`);

    res.json({
      success: true,
      message: 'EMI converted to Personal Loan successfully',
      data: { emi, personalLoan: loan }
    });
  } catch (error) {
    logger.error('Convert to loan error:', error);
    res.status(500).json({ success: false, message: 'Failed to convert EMI', error: error.message });
  }
});

/**
 * @route GET /api/emi/export/pdf
 * @desc Export EMI report as PDF
 * @access Private
 */
router.get('/export/pdf', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    logger.info(`Exporting EMI PDF report for user: ${userId}, Date range: ${startDate} to ${endDate}`);
    
    // Build date filter
    const dateFilter = { userId };
    if (startDate) {
      dateFilter.startDate = { $gte: new Date(startDate) };
    }
    
    // Fetch all required data
    const Transaction = require('../models/Transaction');
    const [overview, allEMIs, upcomingData, personalLoans, personalLoansSummary] = await Promise.all([
      emiAnalyticsService.getEMIOverview(userId),
      EMI.find(dateFilter).sort({ startDate: -1 }),
      emiAnalyticsService.getUpcomingPayments(userId, 36), // Get 36 months of upcoming payments
      PersonalLoan.find({ userId }).sort({ loanTakenDate: -1 }),
      PersonalLoan.getSummary(userId)
    ]);
    
    logger.info(`Personal Loans fetched: ${personalLoans ? personalLoans.length : 0}, Summary: ${JSON.stringify(personalLoansSummary)}`);

    // Extract upcoming payments array from the returned object
    const upcomingPayments = upcomingData.upcomingPayments || [];
    
    // Filter upcoming payments by end date
    const filteredUpcoming = upcomingPayments.filter(payment => {
      if (!endDate) return true;
      return new Date(payment.dueDate) <= new Date(endDate);
    });

    // Group EMIs by status
    const activeEMIs = allEMIs.filter(e => e.status === 'active');
    const completedEMIs = allEMIs.filter(e => e.status === 'completed');
    const foreClosedEMIs = allEMIs.filter(e => e.status === 'foreclosed');

    // Calculate overview statistics directly from EMI data
    const calculatedOverview = {
      totalMonthlyEMI: activeEMIs.reduce((sum, emi) => sum + (emi.emiAmount || 0), 0),
      totalOutstanding: activeEMIs.reduce((sum, emi) => sum + ((emi.emiAmount || 0) * (emi.remainingInstallments || 0)), 0),
      totalPrincipal: allEMIs.reduce((sum, emi) => sum + (emi.principalAmount || 0), 0),
      averageInterestRate: allEMIs.length > 0 
        ? allEMIs.reduce((sum, emi) => sum + (emi.interestRate || 0), 0) / allEMIs.length 
        : 0,
      totalEMIs: allEMIs.length,
      activeCount: activeEMIs.length,
      completedCount: completedEMIs.length,
      foreClosedCount: foreClosedEMIs.length
    };

    // Calculate provider map (used in both charts and summary)
    const providerMap = {};
    const merchantMap = {};
    allEMIs.forEach(emi => {
      const provider = emi.cardProvider || 'Unknown';
      if (!providerMap[provider]) {
        providerMap[provider] = { count: 0, principal: 0, outstanding: 0, totalEMI: 0, activeCount: 0 };
      }
      providerMap[provider].count++;
      providerMap[provider].principal += emi.principalAmount || 0;
      providerMap[provider].outstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      providerMap[provider].totalEMI += emi.emiAmount || 0;
      if (emi.status === 'active') providerMap[provider].activeCount++;

      // Merchant mapping
      const merchant = emi.merchantName || 'Unknown';
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = { outstanding: 0, count: 0 };
      }
      merchantMap[merchant].outstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      merchantMap[merchant].count++;
    });

    // Calculate monthly burden with count
    const monthlyBurdenMap = {};
    const emiCountByMonth = {};
    filteredUpcoming.forEach(payment => {
      const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      monthlyBurdenMap[monthKey] = (monthlyBurdenMap[monthKey] || 0) + (payment.amount || 0);
      emiCountByMonth[monthKey] = (emiCountByMonth[monthKey] || 0) + 1;
    });

    // Calculate principal vs interest
    let totalPrincipal = 0;
    let totalInterest = 0;
    activeEMIs.forEach(emi => {
      totalPrincipal += emi.principalAmount || 0;
      const totalPayable = (emi.emiAmount || 0) * (emi.totalTenure || 0);
      totalInterest += totalPayable - (emi.principalAmount || 0);
    });

    // EMI completion progress
    const completionProgress = allEMIs.map(emi => ({
      name: `${emi.merchantName || 'Unknown'} (${emi.cardProvider})`,
      completed: ((emi.totalTenure - emi.remainingInstallments) / emi.totalTenure * 100) || 0,
      remaining: (emi.remainingInstallments / emi.totalTenure * 100) || 0
    })).slice(0, 10);

    // Top merchants by outstanding
    const topMerchants = Object.entries(merchantMap)
      .sort((a, b) => b[1].outstanding - a[1].outstanding)
      .slice(0, 10);

    // Interest rate distribution
    const interestRateRanges = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20%+': 0 };
    allEMIs.forEach(emi => {
      const rate = emi.interestRate || 0;
      if (rate <= 5) interestRateRanges['0-5%']++;
      else if (rate <= 10) interestRateRanges['5-10%']++;
      else if (rate <= 15) interestRateRanges['10-15%']++;
      else if (rate <= 20) interestRateRanges['15-20%']++;
      else interestRateRanges['20%+']++;
    });

    // Fetch Monthly Trends Data (Income, Spending, Investments, Savings)
    logger.info('Fetching monthly trends data for comprehensive chart...');
    const profileData = await FinancialProfile.findOne({ userId });
    const profileMonthlyIncome = profileData?.monthlyIncome || 0;
    
    // Calculate date range for trends (last 6 months)
    const trendsEndDate = new Date();
    const trendsStartDate = new Date();
    trendsStartDate.setMonth(trendsStartDate.getMonth() - 6);
    
    // Get all transactions for monthly trends
    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: trendsStartDate, $lte: trendsEndDate }
        }
      },
      {
        $addFields: {
          dateObj: {
            $cond: {
              if: { $eq: [{ $type: '$date' }, 'string'] },
              then: { $dateFromString: { dateString: '$date' } },
              else: '$date'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateObj' },
            month: { $month: '$dateObj' },
            type: '$type',
            category: '$category'
          },
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Process monthly trends data
    const monthlyTrendsData = {};
    const trendsMonthsArray = [];
    
    // Generate months array
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendsMonthsArray.push(monthKey);
      monthlyTrendsData[monthKey] = {
        income: profileMonthlyIncome,
        spendings: 0,
        emiPayments: 0,
        investments: 0,
        loanPayments: 0
      };
    }
    
    // Process transactions
    transactions.forEach(item => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthlyTrendsData[monthKey]) return;
      
      const type = item._id.type;
      const category = item._id.category;
      const amount = item.totalAmount || 0;
      
      if (type === 'credit') {
        monthlyTrendsData[monthKey].income += amount;
      } else if (type === 'debit') {
        if (category === 'investment') {
          monthlyTrendsData[monthKey].investments += amount;
        } else if (category === 'loan_payment') {
          monthlyTrendsData[monthKey].loanPayments += amount;
        } else {
          monthlyTrendsData[monthKey].spendings += amount;
        }
      }
    });
    
    // Process EMI data for trends
    allEMIs.forEach(emi => {
      if (emi.status !== 'active') return;
      const emiStart = new Date(emi.startDate);
      
      trendsMonthsArray.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthDate = new Date(year, month - 1, 1);
        
        if (monthDate >= emiStart && emi.remainingInstallments > 0) {
          monthlyTrendsData[monthKey].emiPayments += emi.emiAmount || 0;
        }
      });
    });
    
    // Prepare chart data arrays
    const trendsLabels = trendsMonthsArray.map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    });
    
    const incomeData = trendsMonthsArray.map(key => monthlyTrendsData[key].income);
    const spendingsData = trendsMonthsArray.map(key => monthlyTrendsData[key].spendings);
    const investmentsData = trendsMonthsArray.map(key => monthlyTrendsData[key].investments);
    const netSavingsData = trendsMonthsArray.map(key => 
      monthlyTrendsData[key].income - monthlyTrendsData[key].spendings - monthlyTrendsData[key].investments
    );
    
    logger.info(`Monthly trends data processed: ${trendsLabels.length} months`);

    // Generate charts
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });

    // Chart 0: Financial Monthly Trends (Income, Spending, Investments, Net Savings)
    const financialMonthlyTrendsConfig = {
      type: 'line',
      data: {
        labels: trendsLabels,
        datasets: [{
          label: 'Income',
          data: incomeData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }, {
          label: 'Spending',
          data: spendingsData,
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }, {
          label: 'Investments',
          data: investmentsData,
          borderColor: '#A855F7',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }, {
          label: 'Net Savings',
          data: netSavingsData,
          borderColor: '#3B82F6',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 5]
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Financial Monthly Trends',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (value >= 100000) return '₹' + (value / 100000).toFixed(0) + 'L';
                if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'k';
                return '₹' + value;
              }
            }
          }
        }
      }
    };

    // Chart 1: EMI Monthly Trends (Line + Bar Combo)
    const monthlyTrendsConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(monthlyBurdenMap).slice(0, 12),
        datasets: [{
          type: 'line',
          label: 'Payment Amount',
          data: Object.values(monthlyBurdenMap).slice(0, 12),
          borderColor: '#FF5722',
          backgroundColor: 'rgba(255, 87, 34, 0.1)',
          yAxisID: 'y',
          tension: 0.4
        }, {
          type: 'bar',
          label: 'EMI Count',
          data: Object.values(emiCountByMonth).slice(0, 12),
          backgroundColor: '#2196F3',
          yAxisID: 'y1'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'EMI Monthly Trends',
            font: { size: 18 }
          }
        },
        scales: {
          y: { type: 'linear', position: 'left', beginAtZero: true },
          y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
        }
      }
    };

    // Chart 2: Card Provider 360° Comparison (Radar)
    const provider360Config = {
      type: 'radar',
      data: {
        labels: ['Total EMIs', 'Active EMIs', 'Total Principal', 'Outstanding', 'Monthly EMI'],
        datasets: Object.entries(providerMap).slice(0, 5).map(([ provider, data], index) => ({
          label: provider,
          data: [
            data.count,
            data.activeCount,
            data.principal / 10000, // Scale down for visibility
            data.outstanding / 10000,
            data.totalEMI / 1000
          ],
          backgroundColor: [`rgba(76, 175, 80, 0.2)`, `rgba(33, 150, 243, 0.2)`, `rgba(255, 152, 0, 0.2)`, `rgba(156, 39, 176, 0.2)`, `rgba(244, 67, 54, 0.2)`][index],
          borderColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][index]
        }))
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Card Provider 360° Comparison',
            font: { size: 18 }
          }
        },
        scales: {
          r: { beginAtZero: true }
        }
      }
    };

    // Chart 3: EMI Distribution by Card Provider (Doughnut)
    const providerDistributionConfig = {
      type: 'doughnut',
      data: {
        labels: Object.keys(providerMap),
        datasets: [{
          data: Object.values(providerMap).map(p => p.count),
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFEB3B']
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'EMI Distribution by Card Provider',
            font: { size: 18 }
          },
          legend: { position: 'right' }
        }
      }
    };

    // Chart 4: Monthly EMI Burden (Bar)
    const monthlyBurdenConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(monthlyBurdenMap).slice(0, 12),
        datasets: [{
          label: 'Monthly EMI Amount',
          data: Object.values(monthlyBurdenMap).slice(0, 12),
          backgroundColor: '#FF5722'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Monthly EMI Burden',
            font: { size: 18 }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    // Chart 5: Payment Trend Analysis (Area Line)
    const paymentTrendConfig = {
      type: 'line',
      data: {
        labels: Object.keys(monthlyBurdenMap).slice(0, 12),
        datasets: [{
          label: 'Payment Trend',
          data: Object.values(monthlyBurdenMap).slice(0, 12),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.3)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Payment Trend Analysis',
            font: { size: 18 }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    // Chart 6: Monthly Burden with EMI Count (Grouped Bar)
    const burdenCountConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(monthlyBurdenMap).slice(0, 12),
        datasets: [{
          label: 'Payment Amount',
          data: Object.values(monthlyBurdenMap).slice(0, 12),
          backgroundColor: '#2196F3'
        }, {
          label: 'EMI Count',
          data: Object.values(emiCountByMonth).slice(0, 12).map(c => c * 5000), // Scale for visibility
          backgroundColor: '#FF9800'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Monthly Burden with EMI Count',
            font: { size: 18 }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    // Chart 7: Principal vs Interest Breakdown (Pie)
    const principalInterestConfig = {
      type: 'pie',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [{
          data: [totalPrincipal, totalInterest],
          backgroundColor: ['#4CAF50', '#FF5722']
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Principal vs Interest Breakdown',
            font: { size: 18 }
          }
        }
      }
    };

    // Chart 8: EMI Completion Progress (Stacked Bar)
    const completionProgressConfig = {
      type: 'bar',
      data: {
        labels: completionProgress.map(e => e.name.substring(0, 20)),
        datasets: [{
          label: 'Completed %',
          data: completionProgress.map(e => e.completed),
          backgroundColor: '#4CAF50'
        }, {
          label: 'Remaining %',
          data: completionProgress.map(e => e.remaining),
          backgroundColor: '#FF9800'
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'EMI Completion Progress',
            font: { size: 18 }
          }
        },
        scales: {
          x: { stacked: true, max: 100 },
          y: { stacked: true }
        }
      }
    };

    // Chart 9: Principal vs Interest Scatter Analysis
    const scatterData = activeEMIs.slice(0, 20).map(emi => ({
      x: emi.principalAmount || 0,
      y: ((emi.emiAmount || 0) * (emi.totalTenure || 0)) - (emi.principalAmount || 0)
    }));

    const scatterConfig = {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Principal vs Interest',
          data: scatterData,
          backgroundColor: '#2196F3'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Principal vs Interest Scatter Analysis',
            font: { size: 18 }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Principal Amount' } },
          y: { title: { display: true, text: 'Interest Amount' } }
        }
      }
    };

    // Chart 10: Top Merchants by Outstanding Amount (Horizontal Bar)
    const topMerchantsConfig = {
      type: 'bar',
      data: {
        labels: topMerchants.map(m => m[0].substring(0, 25)),
        datasets: [{
          label: 'Outstanding Amount',
          data: topMerchants.map(m => m[1].outstanding),
          backgroundColor: '#9C27B0'
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Top Merchants by Outstanding Amount',
            font: { size: 18 }
          }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    };

    // Chart 11: Interest Rate Distribution (Bar)
    const interestRateConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(interestRateRanges),
        datasets: [{
          label: 'Number of EMIs',
          data: Object.values(interestRateRanges),
          backgroundColor: '#FF5722'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Interest Rate Distribution',
            font: { size: 18 }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    // Chart 12: EMI Progress Overview (Mixed)
    const progressOverviewConfig = {
      type: 'bar',
      data: {
        labels: ['Active', 'Completed', 'Foreclosed'],
        datasets: [{
          type: 'bar',
          label: 'Count',
          data: [activeEMIs.length, completedEMIs.length, foreClosedEMIs.length],
          backgroundColor: '#4CAF50',
          yAxisID: 'y'
        }, {
          type: 'line',
          label: 'Total Outstanding',
          data: [
            activeEMIs.reduce((sum, emi) => sum + ((emi.emiAmount || 0) * (emi.remainingInstallments || 0)), 0),
            0,
            0
          ],
          borderColor: '#FF5722',
          yAxisID: 'y1'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'EMI Progress Overview',
            font: { size: 18 }
          }
        },
        scales: {
          y: { type: 'linear', position: 'left', beginAtZero: true },
          y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
        }
      }
    };

    // Generate all chart images
    logger.info('Starting chart generation for EMI export PDF...');
    const [
      chart0, chart1, chart2, chart3, chart4, chart5, chart6,
      chart7, chart8, chart9, chart10, chart11, chart12
    ] = await Promise.all([
      chartJSNodeCanvas.renderToBuffer(financialMonthlyTrendsConfig),
      chartJSNodeCanvas.renderToBuffer(monthlyTrendsConfig),
      chartJSNodeCanvas.renderToBuffer(provider360Config),
      chartJSNodeCanvas.renderToBuffer(providerDistributionConfig),
      chartJSNodeCanvas.renderToBuffer(monthlyBurdenConfig),
      chartJSNodeCanvas.renderToBuffer(paymentTrendConfig),
      chartJSNodeCanvas.renderToBuffer(burdenCountConfig),
      chartJSNodeCanvas.renderToBuffer(principalInterestConfig),
      chartJSNodeCanvas.renderToBuffer(completionProgressConfig),
      chartJSNodeCanvas.renderToBuffer(scatterConfig),
      chartJSNodeCanvas.renderToBuffer(topMerchantsConfig),
      chartJSNodeCanvas.renderToBuffer(interestRateConfig),
      chartJSNodeCanvas.renderToBuffer(progressOverviewConfig)
    ]);
    logger.info('All 13 charts generated successfully!');
    logger.info(`Chart sizes: ${[chart0, chart1, chart2, chart3, chart4, chart5, chart6, chart7, chart8, chart9, chart10, chart11, chart12].map(c => c.length).join(', ')} bytes`);

    // Generate proper PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=EMI_Report_${startDate || 'All'}_to_${endDate || 'All'}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content
    doc.fontSize(16).font('Courier-Bold').text('EMI TRACKER COMPREHENSIVE REPORT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Courier').text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`);
    doc.text(`User ID: ${userId}`);
    doc.moveDown();
    
    // Overview Section
    doc.fontSize(14).font('Courier-Bold').text('OVERVIEW SUMMARY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Courier');
    doc.text(`Total EMIs: ${calculatedOverview.totalEMIs}`);
    doc.text(`Active EMIs: ${calculatedOverview.activeCount}`);
    doc.text(`Completed EMIs: ${calculatedOverview.completedCount}`);
    doc.text(`Foreclosed EMIs: ${calculatedOverview.foreClosedCount}`);
    doc.moveDown(0.5);
    doc.text(`Total Monthly EMI: ${calculatedOverview.totalMonthlyEMI.toLocaleString('en-IN')}`);
    doc.text(`Total Outstanding (EMI): ${calculatedOverview.totalOutstanding.toLocaleString('en-IN')}`);
    if (personalLoansSummary && personalLoansSummary.totalOutstanding > 0) {
      doc.text(`Personal Loans Outstanding: ${personalLoansSummary.totalOutstanding.toLocaleString('en-IN')}`);
      doc.text(`Combined Outstanding: ${(calculatedOverview.totalOutstanding + personalLoansSummary.totalOutstanding).toLocaleString('en-IN')}`, { underline: true });
    }
    doc.text(`Total Principal: ${calculatedOverview.totalPrincipal.toLocaleString('en-IN')}`);
    doc.text(`Average Interest Rate: ${calculatedOverview.averageInterestRate.toFixed(2)}%`);
    doc.moveDown(2);
    
    // CHARTS SECTION - All 13 comprehensive charts
    logger.info('Embedding charts in PDF...');
    
    // Chart 0: Financial Monthly Trends (Income, Spending, Investments, Net Savings)
    doc.addPage();
    doc.fontSize(14).font('Courier-Bold').text('FINANCIAL MONTHLY TRENDS', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Courier').text('Income, Spending, Investments & Net Savings (Last 6 Months)', { align: 'center' });
    doc.moveDown(0.5);
    doc.image(chart0, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 0 (Financial Monthly Trends) embedded');
    
    // Add data table for Financial Monthly Trends
    doc.fontSize(10).font('Courier-Bold').text('Monthly Values:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Month'.padEnd(15) + 'Income'.padEnd(15) + 'Spending'.padEnd(15) + 'Investments'.padEnd(15) + 'Net Savings');
    doc.text('-'.repeat(75));
    trendsLabels.forEach((label, index) => {
      const income = incomeData[index] || 0;
      const spending = spendingsData[index] || 0;
      const investment = investmentsData[index] || 0;
      const netSaving = netSavingsData[index] || 0;
      doc.text(
        label.padEnd(15) + 
        `${(income/1000).toFixed(0)}k`.padEnd(15) + 
        `${(spending/1000).toFixed(0)}k`.padEnd(15) + 
        `${(investment/1000).toFixed(0)}k`.padEnd(15) + 
        `${(netSaving/1000).toFixed(0)}k`
      );
    });
    doc.moveDown(1);
    
    // Chart 1: EMI Monthly Trends
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('EMI MONTHLY TRENDS', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart1, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 1 embedded');
    
    // Add data table for EMI Monthly Trends
    doc.fontSize(10).font('Courier-Bold').text('Monthly Payment Data:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    const monthlyBurdenEntries = Object.entries(monthlyBurdenMap).slice(0, 12);
    doc.text('Month'.padEnd(20) + 'Payment Amount'.padEnd(20) + 'EMI Count');
    doc.text('-'.repeat(60));
    monthlyBurdenEntries.forEach(([month, amount]) => {
      const count = emiCountByMonth[month] || 0;
      doc.text(
        month.padEnd(20) + 
        `${amount.toLocaleString('en-IN')}`.padEnd(20) + 
        count.toString()
      );
    });
    doc.moveDown(1);
    
    // Chart 2: Card Provider 360° Comparison
    doc.fontSize(12).font('Courier-Bold').text('CARD PROVIDER 360° COMPARISON', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart2, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 2 embedded');
    
    // Chart 3: EMI Distribution by Card Provider
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('EMI DISTRIBUTION BY CARD PROVIDER', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart3, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 3 embedded');
    
    // Add data table for Provider Distribution
    doc.fontSize(10).font('Courier-Bold').text('Provider Distribution Data:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Provider'.padEnd(25) + 'EMI Count'.padEnd(15) + 'Outstanding');
    doc.text('-'.repeat(55));
    Object.entries(providerMap).forEach(([provider, data]) => {
      doc.text(
        provider.substring(0, 24).padEnd(25) + 
        data.count.toString().padEnd(15) + 
        `${data.outstanding.toLocaleString('en-IN')}`
      );
    });
    doc.moveDown(1);
    
    // Chart 4: Monthly EMI Burden
    doc.fontSize(12).font('Courier-Bold').text('MONTHLY EMI BURDEN', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart4, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 4 embedded');
    
    // Chart 5: Payment Trend Analysis
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('PAYMENT TREND ANALYSIS', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart5, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 5 embedded');
    doc.moveDown(2);
    
    // Chart 6: Monthly Burden with EMI Count
    doc.fontSize(12).font('Courier-Bold').text('MONTHLY BURDEN WITH EMI COUNT', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart6, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 6 embedded');
    
    // Chart 7: Principal vs Interest Breakdown
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('PRINCIPAL VS INTEREST BREAKDOWN', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart7, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 7 embedded');
    
    // Add data table for Principal vs Interest
    doc.fontSize(10).font('Courier-Bold').text('Principal vs Interest Data:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Type'.padEnd(25) + 'Amount'.padEnd(20) + 'Percentage');
    doc.text('-'.repeat(60));
    const totalAmount = totalPrincipal + totalInterest;
    doc.text(
      'Principal'.padEnd(25) + 
      `${totalPrincipal.toLocaleString('en-IN')}`.padEnd(20) + 
      `${((totalPrincipal / totalAmount) * 100).toFixed(1)}%`
    );
    doc.text(
      'Interest'.padEnd(25) + 
      `${totalInterest.toLocaleString('en-IN')}`.padEnd(20) + 
      `${((totalInterest / totalAmount) * 100).toFixed(1)}%`
    );
    doc.text(
      'Total Payable'.padEnd(25) + 
      `${totalAmount.toLocaleString('en-IN')}`.padEnd(20) + 
      '100.0%'
    );
    doc.moveDown(1);
    
    // Chart 8: EMI Completion Progress
    doc.fontSize(12).font('Courier-Bold').text('EMI COMPLETION PROGRESS', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart8, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 8 embedded');
    
    // Chart 9: Principal vs Interest Scatter Analysis
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('PRINCIPAL VS INTEREST SCATTER ANALYSIS', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart9, { fit: [500, 300], align: 'center' });
    doc.moveDown(2);
    logger.info('Chart 9 embedded');
    
    // Chart 10: Top Merchants by Outstanding Amount
    doc.fontSize(12).font('Courier-Bold').text('TOP MERCHANTS BY OUTSTANDING AMOUNT', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart10, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 10 embedded');
    
    // Add data table for Top Merchants
    doc.fontSize(10).font('Courier-Bold').text('Top Merchants Data:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Rank'.padEnd(8) + 'Merchant'.padEnd(30) + 'Outstanding Amount');
    doc.text('-'.repeat(60));
    topMerchants.forEach(([merchant, data], index) => {
      doc.text(
        `${index + 1}.`.padEnd(8) + 
        merchant.substring(0, 29).padEnd(30) + 
        `${data.outstanding.toLocaleString('en-IN')}`
      );
    });
    doc.moveDown(1);
    
    // Chart 11: Interest Rate Distribution
    doc.addPage();
    doc.fontSize(12).font('Courier-Bold').text('INTEREST RATE DISTRIBUTION', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart11, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 11 embedded');
    
    // Add data table for Interest Rate Distribution
    doc.fontSize(10).font('Courier-Bold').text('Interest Rate Distribution Data:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Interest Rate Range'.padEnd(25) + 'Number of EMIs');
    doc.text('-'.repeat(50));
    Object.entries(interestRateRanges).forEach(([range, count]) => {
      doc.text(range.padEnd(25) + count.toString());
    });
    doc.moveDown(1);
    
    // Chart 12: EMI Progress Overview
    doc.fontSize(12).font('Courier-Bold').text('EMI PROGRESS OVERVIEW', { underline: true });
    doc.moveDown(0.5);
    doc.image(chart12, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    logger.info('Chart 12 embedded');
    
    // Add data table for EMI Progress Overview
    doc.fontSize(10).font('Courier-Bold').text('EMI Status Summary:', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Courier');
    doc.text('Status'.padEnd(20) + 'Count'.padEnd(15) + 'Outstanding Amount');
    doc.text('-'.repeat(60));
    doc.text(
      'Active'.padEnd(20) + 
      calculatedOverview.activeCount.toString().padEnd(15) + 
      `${calculatedOverview.totalOutstanding.toLocaleString('en-IN')}`
    );
    doc.text(
      'Completed'.padEnd(20) + 
      calculatedOverview.completedCount.toString().padEnd(15) + 
      '0'
    );
    doc.text(
      'Foreclosed'.padEnd(20) + 
      calculatedOverview.foreClosedCount.toString().padEnd(15) + 
      '0'
    );
    doc.text(
      'Total'.padEnd(20) + 
      calculatedOverview.totalEMIs.toString().padEnd(15) + 
      `${calculatedOverview.totalOutstanding.toLocaleString('en-IN')}`
    );
    logger.info('All 13 charts embedded in PDF successfully!');
    doc.moveDown(2);
    
    // Active EMIs Section
    if (activeEMIs.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('ACTIVE EMIs', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');
      activeEMIs.forEach((emi, index) => {
        doc.text(`${index + 1}. ${emi.merchantName || 'Unknown Merchant'}`);
        doc.text(`   Card: ${emi.cardProvider} ****${emi.cardLastFourDigits || 'N/A'}`, { indent: 10 });
        doc.text(`   Product: ${emi.productDescription || 'N/A'}`, { indent: 10 });
        doc.text(`   Principal: ${(emi.principalAmount || 0).toLocaleString('en-IN')} | Interest: ${emi.interestRate || 0}%`, { indent: 10 });
        doc.text(`   EMI: ${(emi.emiAmount || 0).toLocaleString('en-IN')} | Tenure: ${emi.remainingInstallments || 0}/${emi.totalTenure || 0}`, { indent: 10 });
        doc.text(`   Outstanding: ${((emi.emiAmount || 0) * (emi.remainingInstallments || 0)).toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }
    
    // Upcoming Payments Details Section
    if (filteredUpcoming.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('UPCOMING PAYMENTS SCHEDULE - DETAILED', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Courier');
      
      // Group by month
      const upcomingByMonth = {};
      filteredUpcoming.forEach(payment => {
        const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
        if (!upcomingByMonth[monthKey]) {
          upcomingByMonth[monthKey] = [];
        }
        upcomingByMonth[monthKey].push(payment);
      });

      Object.entries(upcomingByMonth).slice(0, 6).forEach(([month, payments]) => {
        const monthTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        doc.fontSize(11).font('Courier-Bold').text(`${month} - Total: ${monthTotal.toLocaleString('en-IN')}`);
        doc.fontSize(9).font('Courier');
        payments.slice(0, 10).forEach((payment, idx) => {
          doc.text(`  ${new Date(payment.dueDate).toLocaleDateString('en-IN')} - ${payment.merchantName || 'N/A'}`);
          doc.text(`    Amount: ${(payment.amount || 0).toLocaleString('en-IN')} | ${payment.cardProvider || 'N/A'} | ${payment.installmentNumber || 0}/${payment.totalTenure || 0}`, { indent: 10 });
        });
        if (payments.length > 10) {
          doc.text(`  ... and ${payments.length - 10} more payments`);
        }
        doc.moveDown(0.5);
      });
    }
    
    // Completed EMIs Section
    if (completedEMIs.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('COMPLETED EMIs', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');
      completedEMIs.forEach((emi, index) => {
        doc.text(`${index + 1}. ${emi.merchantName || 'Unknown'} - ${emi.cardProvider}`);
        doc.text(`   Principal: ${(emi.principalAmount || 0).toLocaleString('en-IN')} | Total Paid: ${((emi.emiAmount || 0) * (emi.totalTenure || 0)).toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }

    // Personal Loans Section
    logger.info(`Checking personal loans for PDF: ${personalLoans ? personalLoans.length : 'null'}`);
    if (personalLoans && personalLoans.length > 0) {
      logger.info('Adding Personal Loans section to PDF...');
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('PERSONAL LOANS (BORROWED)', { underline: true });
      doc.moveDown(0.5);
      
      // Personal Loans Summary
      doc.fontSize(11).font('Courier-Bold').text('Summary:');
      doc.fontSize(9).font('Courier');
      doc.text(`  Total Borrowed: ${personalLoansSummary.totalBorrowed.toLocaleString('en-IN')}`, { indent: 10 });
      doc.text(`  Total Outstanding: ${personalLoansSummary.totalOutstanding.toLocaleString('en-IN')}`, { indent: 10 });
      doc.text(`  Current Interest Accrued: ${personalLoansSummary.totalInterest.toLocaleString('en-IN')}`, { indent: 10 });
      doc.text(`  Active Loans: ${personalLoansSummary.activeCount}`, { indent: 10 });
      doc.moveDown(1);
      
      // Active Personal Loans
      const activePersonalLoans = personalLoans.filter(loan => loan.status === 'active');
      if (activePersonalLoans.length > 0) {
        doc.fontSize(11).font('Courier-Bold').text('Active Loans:');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Courier');
        
        activePersonalLoans.forEach((loan, index) => {
          doc.text(`${index + 1}. ${loan.lenderName} (${loan.relationship || 'N/A'})`);
          doc.text(`   Principal: ${loan.principalAmount.toLocaleString('en-IN')}`, { indent: 10 });
          doc.text(`   Borrowed On: ${new Date(loan.loanTakenDate).toLocaleDateString('en-IN')}`, { indent: 10 });
          doc.text(`   Days Since: ${loan.daysSinceTaken} days`, { indent: 10 });
          if (loan.interestType === 'fixed' && loan.interestRate > 0) {
            doc.text(`   Interest Rate: ${loan.interestRate}% per annum`, { indent: 10 });
            doc.text(`   Current Interest: ${loan.currentInterest.toLocaleString('en-IN')}`, { indent: 10 });
          }
          doc.text(`   Total Repaid: ${loan.totalRepaid.toLocaleString('en-IN')}`, { indent: 10 });
          doc.text(`   Outstanding: ${loan.outstandingAmount.toLocaleString('en-IN')}`, { indent: 10 });
          if (loan.priority) {
            doc.text(`   Priority: ${loan.priority.toUpperCase()}`, { indent: 10 });
          }
          if (loan.purpose) {
            doc.text(`   Purpose: ${loan.purpose}`, { indent: 10 });
          }
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);
      }
      
      // Repaid Personal Loans
      const repaidPersonalLoans = personalLoans.filter(loan => loan.status === 'repaid');
      if (repaidPersonalLoans.length > 0) {
        doc.fontSize(11).font('Courier-Bold').text(`Repaid Loans (${repaidPersonalLoans.length}):`);
        doc.moveDown(0.3);
        doc.fontSize(9).font('Courier');
        
        repaidPersonalLoans.forEach((loan, index) => {
          doc.text(`${index + 1}. ${loan.lenderName} - ${loan.principalAmount.toLocaleString('en-IN')} (Repaid: ${loan.totalRepaid.toLocaleString('en-IN')})`);
          doc.moveDown(0.2);
        });
      }
      doc.moveDown();
      logger.info('Personal Loans section added to PDF successfully!');
    } else {
      logger.info('No personal loans to add to PDF');
    }

    // Provider Summary
    if (allEMIs.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('PROVIDER-WISE BREAKDOWN', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');

      Object.entries(providerMap).forEach(([provider, data]) => {
        doc.text(`${provider}`);
        doc.text(`  EMIs: ${data.count} | Principal: ${data.principal.toLocaleString('en-IN')} | Outstanding: ${data.outstanding.toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    logger.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/export/excel
 * @desc Export EMI report as Excel
 * @access Private
 */
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    logger.info(`Exporting EMI Excel report for user: ${userId}, Date range: ${startDate} to ${endDate}`);
    
    const ExcelJS = require('exceljs');
    
    // Build date filter
    const dateFilter = { userId };
    if (startDate) {
      dateFilter.startDate = { $gte: new Date(startDate) };
    }
    
    // Fetch all required data
    const [overview, allEMIs, upcomingData] = await Promise.all([
      emiAnalyticsService.getEMIOverview(userId),
      EMI.find(dateFilter).sort({ startDate: -1 }),
      emiAnalyticsService.getUpcomingPayments(userId, 36)
    ]);

    // Extract upcoming payments array from the returned object
    const upcomingPayments = upcomingData.upcomingPayments || [];

    // Filter upcoming payments by end date
    const filteredUpcoming = upcomingPayments.filter(payment => {
      if (!endDate) return true;
      return new Date(payment.dueDate) <= new Date(endDate);
    });

    // ============= CHART GENERATION =============
    // Prepare data for charts
    const activeEMIs = allEMIs.filter(emi => emi.status === 'active');
    
    // Provider-wise data
    const providerMap = {};
    allEMIs.forEach(emi => {
      const provider = emi.cardProvider || 'Unknown';
      if (!providerMap[provider]) {
        providerMap[provider] = { 
          count: 0, 
          totalPrincipal: 0, 
          totalOutstanding: 0,
          avgInterestRate: 0,
          totalInterest: 0
        };
      }
      providerMap[provider].count++;
      providerMap[provider].totalPrincipal += (emi.principalAmount || 0);
      providerMap[provider].totalOutstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      providerMap[provider].totalInterest += (emi.interestRate || 0);
    });

    // Calculate average interest rates
    Object.keys(providerMap).forEach(provider => {
      providerMap[provider].avgInterestRate = providerMap[provider].totalInterest / providerMap[provider].count;
    });

    // Merchant-wise data
    const merchantMap = {};
    allEMIs.forEach(emi => {
      const merchant = emi.merchantName || 'Unknown';
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = { count: 0, principal: 0, outstanding: 0 };
      }
      merchantMap[merchant].count++;
      merchantMap[merchant].principal += (emi.principalAmount || 0);
      merchantMap[merchant].outstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
    });

    // Monthly burden data
    const monthlyBurdenMap = {};
    const emiCountByMonth = {};
    filteredUpcoming.forEach(payment => {
      const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      monthlyBurdenMap[monthKey] = (monthlyBurdenMap[monthKey] || 0) + (payment.amount || 0);
      emiCountByMonth[monthKey] = (emiCountByMonth[monthKey] || 0) + 1;
    });

    // EMI completion progress
    const completionProgress = allEMIs.map(emi => ({
      name: `${emi.merchantName || 'Unknown'} (${emi.cardProvider})`,
      completed: ((emi.totalTenure - emi.remainingInstallments) / emi.totalTenure * 100) || 0,
      remaining: (emi.remainingInstallments / emi.totalTenure * 100) || 0
    })).slice(0, 10);

    // Top merchants by outstanding
    const topMerchants = Object.entries(merchantMap)
      .sort((a, b) => b[1].outstanding - a[1].outstanding)
      .slice(0, 10);

    // Interest rate distribution
    const interestRateRanges = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20%+': 0 };
    allEMIs.forEach(emi => {
      const rate = emi.interestRate || 0;
      if (rate <= 5) interestRateRanges['0-5%']++;
      else if (rate <= 10) interestRateRanges['5-10%']++;
      else if (rate <= 15) interestRateRanges['10-15%']++;
      else if (rate <= 20) interestRateRanges['15-20%']++;
      else interestRateRanges['20%+']++;
    });

    // Generate charts
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });

    // Chart 1: EMI Monthly Trends
    const chart1Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: Object.keys(monthlyBurdenMap).slice(0, 12),
        datasets: [{
          type: 'line',
          label: 'Payment Amount (₹)',
          data: Object.values(monthlyBurdenMap).slice(0, 12),
          borderColor: '#FF5722',
          backgroundColor: 'rgba(255, 87, 34, 0.1)',
          yAxisID: 'y',
          tension: 0.4
        }, {
          type: 'bar',
          label: 'EMI Count',
          data: Object.values(emiCountByMonth).slice(0, 12),
          backgroundColor: '#2196F3',
          yAxisID: 'y1'
        }]
      },
      options: {
        plugins: { title: { display: true, text: 'EMI Monthly Trends', font: { size: 16 } } },
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Amount (₹)' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Count' }, grid: { drawOnChartArea: false } }
        }
      }
    });

    // Chart 2: Provider Comparison (Radar)
    const chart2Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'radar',
      data: {
        labels: Object.keys(providerMap),
        datasets: [
          { label: 'EMI Count', data: Object.values(providerMap).map(p => p.count), backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgb(255, 99, 132)' },
          { label: 'Avg Interest Rate (%)', data: Object.values(providerMap).map(p => p.avgInterestRate), backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgb(54, 162, 235)' }
        ]
      },
      options: { plugins: { title: { display: true, text: 'Card Provider 360° Comparison', font: { size: 16 } } } }
    });

    // Chart 3: Provider Distribution (Doughnut)
    const chart3Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'doughnut',
      data: {
        labels: Object.keys(providerMap),
        datasets: [{
          data: Object.values(providerMap).map(p => p.count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: { plugins: { title: { display: true, text: 'EMI Distribution by Provider', font: { size: 16 } } } }
    });

    // Chart 4: Top Merchants (Horizontal Bar)
    const chart4Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: topMerchants.map(([name]) => name),
        datasets: [{
          label: 'Outstanding Amount (₹)',
          data: topMerchants.map(([, data]) => data.outstanding),
          backgroundColor: '#FF6384'
        }]
      },
      options: { 
        indexAxis: 'y',
        plugins: { title: { display: true, text: 'Top Merchants by Outstanding', font: { size: 16 } } }
      }
    });

    // Chart 5: Interest Rate Distribution
    const chart5Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: Object.keys(interestRateRanges),
        datasets: [{
          label: 'Number of EMIs',
          data: Object.values(interestRateRanges),
          backgroundColor: '#4BC0C0'
        }]
      },
      options: { plugins: { title: { display: true, text: 'Interest Rate Distribution', font: { size: 16 } } } }
    });

    // Chart 6: Principal vs Interest (Pie)
    const totalPrincipal = allEMIs.reduce((sum, emi) => sum + (emi.principalAmount || 0), 0);
    const totalInterest = allEMIs.reduce((sum, emi) => sum + ((emi.emiAmount || 0) * (emi.totalTenure || 0) - (emi.principalAmount || 0)), 0);
    const chart6Buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'pie',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [{
          data: [totalPrincipal, totalInterest],
          backgroundColor: ['#36A2EB', '#FF6384']
        }]
      },
      options: { plugins: { title: { display: true, text: 'Principal vs Interest Breakdown', font: { size: 16 } } } }
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Financial Analyzer';
    workbook.created = new Date();

    // Sheet 1: Overview
    const overviewSheet = workbook.addWorksheet('Overview', {
      views: [{ showGridLines: false }]
    });
    overviewSheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 25 }
    ];
    
    overviewSheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: 'Date Range', value: `${startDate || 'All'} to ${endDate || 'All'}` },
      { metric: '', value: '' },
      { metric: 'Total EMIs', value: allEMIs.length },
      { metric: 'Active EMIs', value: allEMIs.filter(e => e.status === 'active').length },
      { metric: 'Completed EMIs', value: allEMIs.filter(e => e.status === 'completed').length },
      { metric: 'Foreclosed EMIs', value: allEMIs.filter(e => e.status === 'foreclosed').length },
      { metric: '', value: '' },
      { metric: 'Total Monthly EMI', value: `₹${(overview?.totalMonthlyEMI || 0).toLocaleString('en-IN')}` },
      { metric: 'Total Outstanding', value: `₹${(overview?.totalOutstanding || 0).toLocaleString('en-IN')}` },
      { metric: 'Total Principal', value: `₹${(overview?.totalPrincipal || 0).toLocaleString('en-IN')}` },
      { metric: 'Average Interest Rate', value: `${(overview?.averageInterestRate || 0).toFixed(2)}%` }
    ]);

    // Style overview sheet
    overviewSheet.getRow(1).font = { bold: true, size: 14 };
    overviewSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    overviewSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    overviewSheet.getRow(1).height = 25;

    // Sheet 2: All EMIs
    const emisSheet = workbook.addWorksheet('All EMIs');
    emisSheet.columns = [
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Card Provider', key: 'cardProvider', width: 20 },
      { header: 'Card Number', key: 'cardNumber', width: 15 },
      { header: 'Merchant', key: 'merchant', width: 25 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Principal', key: 'principal', width: 15 },
      { header: 'Interest Rate', key: 'interestRate', width: 12 },
      { header: 'EMI Amount', key: 'emiAmount', width: 15 },
      { header: 'Total Tenure', key: 'totalTenure', width: 12 },
      { header: 'Remaining', key: 'remaining', width: 12 },
      { header: 'Outstanding', key: 'outstanding', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Repayment Type', key: 'repaymentType', width: 15 }
    ];

    allEMIs.forEach(emi => {
      const outstanding = (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      emisSheet.addRow({
        status: (emi.status || 'unknown').toUpperCase(),
        cardProvider: emi.cardProvider || 'N/A',
        cardNumber: `****${emi.cardLastFourDigits || 'N/A'}`,
        merchant: emi.merchantName || 'N/A',
        product: emi.productDescription || 'N/A',
        principal: (emi.principalAmount || 0),
        interestRate: `${emi.interestRate || 0}%`,
        emiAmount: (emi.emiAmount || 0),
        totalTenure: emi.totalTenure || 0,
        remaining: emi.remainingInstallments || 0,
        outstanding: outstanding,
        startDate: new Date(emi.startDate).toLocaleDateString('en-IN'),
        repaymentType: emi.repaymentType || 'MONTHLY'
      });
    });

    // Style EMIs sheet header
    emisSheet.getRow(1).font = { bold: true, size: 12 };
    emisSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    emisSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    emisSheet.getRow(1).height = 22;

    // Format currency columns
    emisSheet.getColumn('principal').numFmt = '#,##0.00';
    emisSheet.getColumn('emiAmount').numFmt = '#,##0.00';
    emisSheet.getColumn('outstanding').numFmt = '#,##0.00';

    // Sheet 3: Upcoming Payments
    const upcomingSheet = workbook.addWorksheet('Upcoming Payments');
    upcomingSheet.columns = [
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Card Provider', key: 'cardProvider', width: 20 },
      { header: 'Merchant', key: 'merchant', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Installment', key: 'installment', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    filteredUpcoming.forEach(payment => {
      const dueDate = new Date(payment.dueDate);
      upcomingSheet.addRow({
        dueDate: dueDate.toLocaleDateString('en-IN'),
        month: dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }),
        cardProvider: payment.cardProvider || 'N/A',
        merchant: payment.merchantName || 'N/A',
        amount: payment.amount || 0,
        installment: `${payment.installmentNumber || 0}/${payment.totalTenure || 0}`,
        status: payment.status || 'upcoming'
      });
    });

    // Style upcoming sheet header
    upcomingSheet.getRow(1).font = { bold: true, size: 12 };
    upcomingSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    upcomingSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    upcomingSheet.getRow(1).height = 22;
    upcomingSheet.getColumn('amount').numFmt = '#,##0.00';

    // Sheet 4: Provider Summary
    const providerSheet = workbook.addWorksheet('Provider Summary');
    providerSheet.columns = [
      { header: 'Provider', key: 'provider', width: 25 },
      { header: 'Total EMIs', key: 'count', width: 15 },
      { header: 'Active EMIs', key: 'active', width: 15 },
      { header: 'Total Principal', key: 'principal', width: 18 },
      { header: 'Total Outstanding', key: 'outstanding', width: 18 }
    ];

    // Reuse providerMap from chart generation, but recalculate with active count
    Object.keys(providerMap).forEach(provider => {
      // Count active EMIs for this provider
      const providerActiveCount = allEMIs.filter(emi => 
        (emi.cardProvider || 'Unknown') === provider && emi.status === 'active'
      ).length;
      
      providerSheet.addRow({
        provider,
        count: providerMap[provider].count,
        active: providerActiveCount,
        principal: providerMap[provider].totalPrincipal,
        outstanding: providerMap[provider].totalOutstanding
      });
    });

    // Style provider sheet
    providerSheet.getRow(1).font = { bold: true, size: 12 };
    providerSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9966FF' }
    };
    providerSheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
    providerSheet.getRow(1).height = 22;
    providerSheet.getColumn('principal').numFmt = '#,##0.00';
    providerSheet.getColumn('outstanding').numFmt = '#,##0.00';

    // Sheet 5: Charts
    const chartsSheet = workbook.addWorksheet('Charts');
    
    // Add chart images to the workbook
    const chart1Id = workbook.addImage({
      buffer: chart1Buffer,
      extension: 'png',
    });
    const chart2Id = workbook.addImage({
      buffer: chart2Buffer,
      extension: 'png',
    });
    const chart3Id = workbook.addImage({
      buffer: chart3Buffer,
      extension: 'png',
    });
    const chart4Id = workbook.addImage({
      buffer: chart4Buffer,
      extension: 'png',
    });
    const chart5Id = workbook.addImage({
      buffer: chart5Buffer,
      extension: 'png',
    });
    const chart6Id = workbook.addImage({
      buffer: chart6Buffer,
      extension: 'png',
    });

    // Add title
    chartsSheet.mergeCells('A1:J1');
    chartsSheet.getCell('A1').value = 'EMI ANALYTICS CHARTS';
    chartsSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    chartsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    chartsSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    chartsSheet.getRow(1).height = 30;

    // Embed chart images in the Charts sheet
    chartsSheet.addImage(chart1Id, {
      tl: { col: 0, row: 2 },
      ext: { width: 600, height: 300 }
    });

    chartsSheet.addImage(chart2Id, {
      tl: { col: 0, row: 22 },
      ext: { width: 600, height: 300 }
    });

    chartsSheet.addImage(chart3Id, {
      tl: { col: 0, row: 42 },
      ext: { width: 600, height: 300 }
    });

    chartsSheet.addImage(chart4Id, {
      tl: { col: 0, row: 62 },
      ext: { width: 600, height: 300 }
    });

    chartsSheet.addImage(chart5Id, {
      tl: { col: 0, row: 82 },
      ext: { width: 600, height: 300 }
    });

    chartsSheet.addImage(chart6Id, {
      tl: { col: 0, row: 102 },
      ext: { width: 600, height: 300 }
    });

    // Generate Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=EMI_Report_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emi/export/csv
 * @desc Export EMI report as CSV
 * @access Private
 */
router.get('/export/csv', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    logger.info(`Exporting EMI CSV report for user: ${userId}, Date range: ${startDate} to ${endDate}`);
    
    // Build date filter
    const dateFilter = { userId };
    if (startDate) {
      dateFilter.startDate = { $gte: new Date(startDate) };
    }
    
    // Fetch all EMIs
    const allEMIs = await EMI.find(dateFilter).sort({ startDate: -1 });

    // Create CSV content with comprehensive data
    let csvContent = 'Status,Card Provider,Card Number,Merchant,Product,Principal,Interest Rate,EMI Amount,Total Tenure,Remaining,Outstanding,Start Date,Repayment Type\n';
    
    allEMIs.forEach(emi => {
      const outstanding = (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
      const row = [
        (emi.status || 'unknown').toUpperCase(),
        emi.cardProvider || 'N/A',
        `****${emi.cardLastFourDigits || 'N/A'}`,
        (emi.merchantName || 'N/A').replace(/,/g, ';'),
        (emi.productDescription || 'N/A').replace(/,/g, ';'), // Replace commas to avoid CSV issues
        emi.principalAmount || 0,
        emi.interestRate || 0,
        emi.emiAmount || 0,
        emi.totalTenure || 0,
        emi.remainingInstallments || 0,
        outstanding,
        new Date(emi.startDate).toLocaleDateString(),
        emi.repaymentType || 'MONTHLY'
      ];
      csvContent += row.join(',') + '\n';
    });

    // Set response headers
    const filename = startDate && endDate 
      ? `EMI_Report_${startDate}_to_${endDate}.csv`
      : `EMI_Report_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(csvContent);

  } catch (error) {
    logger.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV report',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emi/balance-transfer-request
 * @desc Request balance transfer for an EMI
 * @access Private
 */
router.post('/balance-transfer-request', authenticate, async (req, res) => {
  try {
    const { emiId, provider, offerRate, processingFee, currentRate, remainingAmount, remainingInstallments } = req.body;

    if (!emiId || !provider || !offerRate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: emiId, provider, offerRate'
      });
    }

    // Find the EMI
    const emi = await EMI.findById(emiId);
    if (!emi) {
      return res.status(404).json({
        success: false,
        message: 'EMI not found'
      });
    }

    // Verify ownership
    if (emi.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Calculate potential savings
    const monthlySavings = Math.max(0, ((currentRate - offerRate) / currentRate) * (emi.emiAmount || 0) * 0.35);
    const totalSavings = monthlySavings * (remainingInstallments || emi.remainingInstallments || 0) - (processingFee || 0);

    // Store the request in user's profile or create a notification
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (profile) {
      if (!profile.preferences) profile.preferences = {};
      if (!profile.preferences.debtFreedom) profile.preferences.debtFreedom = {};
      if (!profile.preferences.debtFreedom.balanceTransferRequests) {
        profile.preferences.debtFreedom.balanceTransferRequests = [];
      }

      profile.preferences.debtFreedom.balanceTransferRequests.push({
        emiId,
        emiName: emi.merchantName,
        provider,
        offerRate,
        processingFee: processingFee || 0,
        currentRate: currentRate || emi.interestRate,
        remainingAmount: remainingAmount || emi.remainingAmount,
        remainingInstallments: remainingInstallments || emi.remainingInstallments,
        monthlySavings,
        totalSavings,
        requestDate: new Date(),
        status: 'pending'
      });

      // Keep only last 50 requests
      if (profile.preferences.debtFreedom.balanceTransferRequests.length > 50) {
        profile.preferences.debtFreedom.balanceTransferRequests = 
          profile.preferences.debtFreedom.balanceTransferRequests.slice(-50);
      }

      await profile.save();
    }

    // Send notification
    try {
      await NotificationService.create({
        userId: req.user._id,
        title: '🔄 Balance Transfer Request Sent',
        message: `Your request for ${provider} balance transfer on ${emi.merchantName} has been submitted. Potential savings: ₹${Math.round(totalSavings).toLocaleString()}`,
        type: 'balance_transfer',
        priority: 'medium'
      });
    } catch (notifError) {
      logger.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: `Balance transfer request sent to ${provider}`,
      data: {
        monthlySavings: Math.round(monthlySavings),
        totalSavings: Math.round(totalSavings),
        processingFee: processingFee || 0,
        netBenefit: Math.round(totalSavings)
      }
    });

  } catch (error) {
    logger.error('Balance transfer request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process balance transfer request',
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ─── Bank Deduction & Balance Management ─────────────────────────
// ═══════════════════════════════════════════════════════════════════

/**
 * @route GET /api/emi/bank-deduction-summary
 * @desc Get all active EMIs mapped to their deduction bank accounts
 *       with expected balances needed on each deduction date
 * @access Private
 */
router.get('/bank-deduction-summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch active EMIs and user bank accounts in parallel
    const [emis, bankAccounts] = await Promise.all([
      EMI.find({ userId, status: 'active', remainingInstallments: { $gt: 0 } })
        .sort({ nextDueDate: 1 })
        .lean(),
      BankAccount.find({ userId, isActive: true })
        .sort({ bankName: 1 })
        .lean()
    ]);

    const bankMap = {};
    bankAccounts.forEach(b => {
      bankMap[b._id.toString()] = b;
    });

    // Build per-EMI deduction info
    const emiDeductions = emis.map(emi => {
      const bankId = emi.deductionBankAccountId?.toString();
      const bank = bankId ? bankMap[bankId] : null;
      const deductionDate = emi.deductionDay || (emi.nextDueDate ? new Date(emi.nextDueDate).getDate() : null);

      return {
        _id: emi._id,
        merchantName: emi.merchantName,
        productDescription: emi.productDescription,
        cardProvider: emi.cardProvider,
        cardLastFourDigits: emi.cardLastFourDigits,
        emiAmount: emi.emiAmountInINR || emi.emiAmount,
        currency: emi.currency || 'INR',
        remainingInstallments: emi.remainingInstallments,
        totalTenure: emi.totalTenure,
        paidInstallments: emi.paidInstallments,
        nextDueDate: emi.nextDueDate,
        deductionDay: deductionDate,
        autoDebitEnabled: emi.autoDebitEnabled || false,
        minimumBalanceRequired: emi.minimumBalanceRequired || 0,
        deductionBank: bank ? {
          _id: bank._id,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountType: bank.accountType,
          currentBalance: bank.balance,
          color: bank.color,
          displayName: `${bank.bankName} - ${bank.accountType} (${bank.accountNumber})`
        } : (emi.deductionBankName ? {
          bankName: emi.deductionBankName,
          accountNumber: emi.deductionAccountNumber || '----',
          displayName: `${emi.deductionBankName} (${emi.deductionAccountNumber || '----'})`
        } : null)
      };
    });

    // Aggregate per-bank totals for the upcoming month
    const bankTotals = {};
    emiDeductions.forEach(ed => {
      const key = ed.deductionBank?._id?.toString() || ed.deductionBank?.bankName || 'unassigned';
      if (!bankTotals[key]) {
        bankTotals[key] = {
          bank: ed.deductionBank,
          totalEmiAmount: 0,
          emiCount: 0,
          emis: []
        };
      }
      bankTotals[key].totalEmiAmount += ed.emiAmount;
      bankTotals[key].emiCount += 1;
      bankTotals[key].emis.push({
        _id: ed._id,
        merchantName: ed.merchantName,
        emiAmount: ed.emiAmount,
        deductionDay: ed.deductionDay,
        autoDebitEnabled: ed.autoDebitEnabled
      });
    });

    // Compute expected balance & shortfall for each bank
    const bankSummaries = Object.values(bankTotals).map(bt => {
      const currentBalance = bt.bank?.currentBalance ?? null;
      const totalNeeded = bt.totalEmiAmount + (bt.emis.reduce((s, e) => s + (e.minimumBalanceRequired || 0), 0));
      const shortfall = currentBalance !== null ? Math.max(0, totalNeeded - currentBalance) : null;
      const sufficient = currentBalance !== null ? currentBalance >= totalNeeded : null;

      return {
        ...bt,
        totalNeeded,
        currentBalance,
        shortfall,
        sufficient
      };
    });

    res.json({
      success: true,
      data: {
        emiDeductions,
        bankSummaries,
        bankAccounts: bankAccounts.map(b => ({
          _id: b._id,
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountType: b.accountType,
          balance: b.balance,
          color: b.color,
          displayName: `${b.bankName} - ${b.accountType} (${b.accountNumber})`
        })),
        totalMonthlyEmi: emiDeductions.reduce((s, e) => s + e.emiAmount, 0),
        unassignedCount: emiDeductions.filter(e => !e.deductionBank).length
      }
    });
  } catch (error) {
    logger.error('Bank deduction summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bank deduction summary', error: error.message });
  }
});

/**
 * @route PATCH /api/emi/:id/bank-deduction
 * @desc Assign / update a bank account for EMI deduction
 * @access Private
 */
router.patch('/:id/bank-deduction', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOne({ _id: req.params.id, userId: req.user._id });
    if (!emi) return res.status(404).json({ success: false, message: 'EMI not found' });

    const { bankAccountId, deductionDay, autoDebitEnabled, minimumBalanceRequired, deductionBankName, deductionAccountNumber } = req.body;

    if (bankAccountId) {
      const bank = await BankAccount.findOne({ _id: bankAccountId, userId: req.user._id, isActive: true });
      if (!bank) return res.status(404).json({ success: false, message: 'Bank account not found' });
      emi.deductionBankAccountId = bank._id;
      emi.deductionBankName = bank.bankName;
      emi.deductionAccountNumber = bank.accountNumber;
    } else if (deductionBankName) {
      // Allow manual bank name entry when no linked account
      emi.deductionBankAccountId = undefined;
      emi.deductionBankName = deductionBankName;
      emi.deductionAccountNumber = deductionAccountNumber || '';
    }

    if (deductionDay !== undefined) emi.deductionDay = deductionDay;
    if (autoDebitEnabled !== undefined) emi.autoDebitEnabled = autoDebitEnabled;
    if (minimumBalanceRequired !== undefined) emi.minimumBalanceRequired = minimumBalanceRequired;

    await emi.save();

    res.json({
      success: true,
      message: 'Bank deduction details updated',
      data: {
        _id: emi._id,
        deductionBankAccountId: emi.deductionBankAccountId,
        deductionBankName: emi.deductionBankName,
        deductionAccountNumber: emi.deductionAccountNumber,
        deductionDay: emi.deductionDay,
        autoDebitEnabled: emi.autoDebitEnabled,
        minimumBalanceRequired: emi.minimumBalanceRequired
      }
    });
  } catch (error) {
    logger.error('Bank deduction update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bank deduction', error: error.message });
  }
});

/**
 * @route PATCH /api/emi/bulk-assign-bank
 * @desc Bulk-assign a bank account to multiple EMIs at once
 * @access Private
 */
router.patch('/bulk-assign-bank', authenticate, async (req, res) => {
  try {
    const { emiIds, bankAccountId, deductionDay, autoDebitEnabled, minimumBalanceRequired } = req.body;
    if (!Array.isArray(emiIds) || emiIds.length === 0) {
      return res.status(400).json({ success: false, message: 'emiIds array required' });
    }

    const bank = await BankAccount.findOne({ _id: bankAccountId, userId: req.user._id, isActive: true });
    if (!bank) return res.status(404).json({ success: false, message: 'Bank account not found' });

    const updateFields = {
      deductionBankAccountId: bank._id,
      deductionBankName: bank.bankName,
      deductionAccountNumber: bank.accountNumber
    };
    if (deductionDay) updateFields.deductionDay = deductionDay;
    if (autoDebitEnabled !== undefined) updateFields.autoDebitEnabled = autoDebitEnabled;
    if (minimumBalanceRequired !== undefined) updateFields.minimumBalanceRequired = minimumBalanceRequired;

    const result = await EMI.updateMany(
      { _id: { $in: emiIds }, userId: req.user._id, status: 'active' },
      { $set: updateFields }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} EMIs`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    logger.error('Bulk assign bank error:', error);
    res.status(500).json({ success: false, message: 'Bulk assign failed', error: error.message });
  }
});

module.exports = router;
