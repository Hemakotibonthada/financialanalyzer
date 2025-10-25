/**
 * EMI Routes
 * API endpoints for EMI tracking and analytics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EMI = require('../models/EMI');
const User = require('../models/User');
const FinancialProfile = require('../models/FinancialProfile');
const logger = require('../utils/logger');
const CreditCardStatementService = require('../services/creditCardStatementService');
const EMIExtractionService = require('../services/emiExtractionService');
const EMIAnalyticsService = require('../services/emiAnalyticsService');

// Initialize services
const emiExtractionService = new EMIExtractionService();
const emiAnalyticsService = new EMIAnalyticsService();

/**
 * @route GET /api/emi/overview
 * @desc Get comprehensive EMI overview
 * @access Private
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching EMI overview for user: ${req.user._id}`);
    
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
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
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
      'notes',
      'tags',
      'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        emi[field] = updates[field];
      }
    });
    
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
    const emiStartDate = new Date(startDate);
    const endDate = new Date(emiStartDate);
    if (repaymentType === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + finalTotalTenure);
    }
    // For ON_REQUEST, end date is not applicable (no fixed tenure)
    
    const nextDueDate = repaymentType === 'MONTHLY' ? (() => {
      const date = new Date(emiStartDate);
      date.setMonth(date.getMonth() + 1);
      return date;
    })() : null; // No next due date for ON_REQUEST type
    
    // Calculate payment schedule (only for MONTHLY type)
    const paymentHistory = [];
    if (repaymentType === 'MONTHLY') {
      const monthlyInterest = (interestRate || 0) / 12 / 100;
      
      for (let i = 1; i <= finalTotalTenure; i++) {
        const dueDate = new Date(emiStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        // Calculate principal and interest for this installment
        const outstandingPrincipal = principalAmount - ((i - 1) * (principalAmount / finalTotalTenure));
        const interestPaid = outstandingPrincipal * monthlyInterest;
        const principalPaid = finalEmiAmount - interestPaid;
        
        paymentHistory.push({
          installmentNumber: i,
          dueDate: dueDate,
          amount: finalEmiAmount,
          principalPaid: Math.max(0, principalPaid),
          interestPaid: Math.max(0, interestPaid),
          status: 'upcoming'
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
    
    const emi = new EMI({
      userId: req.user._id,
      cardProvider: finalCardProvider,
      cardLastFourDigits,
      cardHolderName,
      merchantName,
      productDescription: productDescription || (repaymentType === 'ON_REQUEST' ? 'Personal Loan' : 'Manual Entry'),
      principalAmount: parseFloat(principalAmount),
      interestRate: parseFloat(interestRate) || 0,
      processingFee: parseFloat(processingFee) || 0,
      emiAmount: finalEmiAmount,
      totalTenure: finalTotalTenure,
      paidInstallments: 0,
      remainingInstallments: finalTotalTenure,
      repaymentType: repaymentType || 'MONTHLY', // Add repayment type field
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
      'cardHolderName', 'interestRate'
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

module.exports = router;
