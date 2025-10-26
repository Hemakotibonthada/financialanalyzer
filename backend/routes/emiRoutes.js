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
    const [overview, allEMIs, upcomingData] = await Promise.all([
      emiAnalyticsService.getEMIOverview(userId),
      EMI.find(dateFilter).sort({ startDate: -1 }),
      emiAnalyticsService.getUpcomingPayments(userId, 36) // Get 36 months of upcoming payments
    ]);

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

    // Calculate provider map (used in both charts and summary)
    const providerMap = {};
    allEMIs.forEach(emi => {
      const provider = emi.cardProvider || 'Unknown';
      if (!providerMap[provider]) {
        providerMap[provider] = { count: 0, principal: 0, outstanding: 0 };
      }
      providerMap[provider].count++;
      providerMap[provider].principal += emi.principalAmount || 0;
      providerMap[provider].outstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
    });

    // Generate charts
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });

    // Chart 1: EMI Status Distribution (Pie Chart)
    const statusChartConfig = {
      type: 'pie',
      data: {
        labels: ['Active', 'Completed', 'Foreclosed'],
        datasets: [{
          data: [activeEMIs.length, completedEMIs.length, foreClosedEMIs.length],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'EMI Status Distribution',
            font: { size: 18 }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    // Chart 2: Provider-wise Distribution (Bar Chart)
    const providerChartConfig = {
      type: 'bar',
      data: {
        labels: Object.keys(providerMap),
        datasets: [{
          label: 'Number of EMIs',
          data: Object.values(providerMap).map(p => p.count || 0),
          backgroundColor: '#4CAF50'
        }, {
          label: 'Outstanding Amount',
          data: Object.values(providerMap).map(p => p.outstanding || 0),
          backgroundColor: '#2196F3'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Provider-wise EMI Distribution',
            font: { size: 18 }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    // Chart 3: Monthly Payment Trend (Line Chart)
    const paymentsByMonth = {};
    filteredUpcoming.slice(0, 12 * 6).forEach(payment => { // Next 6 months
      const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      if (!paymentsByMonth[monthKey]) {
        paymentsByMonth[monthKey] = 0;
      }
      paymentsByMonth[monthKey] += payment.amount || 0;
    });

    const monthlyChartConfig = {
      type: 'line',
      data: {
        labels: Object.keys(paymentsByMonth).slice(0, 12),
        datasets: [{
          label: 'Monthly EMI Payments',
          data: Object.values(paymentsByMonth).slice(0, 12),
          borderColor: '#FF5722',
          backgroundColor: 'rgba(255, 87, 34, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Upcoming Monthly Payment Trend',
            font: { size: 18 }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    // Generate chart images
    const [statusChartImage, providerChartImage, monthlyChartImage] = await Promise.all([
      chartJSNodeCanvas.renderToBuffer(statusChartConfig),
      chartJSNodeCanvas.renderToBuffer(providerChartConfig),
      chartJSNodeCanvas.renderToBuffer(monthlyChartConfig)
    ]);

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
    doc.text(`Total EMIs: ${allEMIs.length}`);
    doc.text(`Active EMIs: ${activeEMIs.length}`);
    doc.text(`Completed EMIs: ${completedEMIs.length}`);
    doc.text(`Foreclosed EMIs: ${foreClosedEMIs.length}`);
    doc.moveDown(0.5);
    doc.text(`Total Monthly EMI: ${(overview?.totalMonthlyEMI || 0).toLocaleString('en-IN')}`);
    doc.text(`Total Outstanding: ${(overview?.totalOutstanding || 0).toLocaleString('en-IN')}`);
    doc.text(`Total Principal: ${(overview?.totalPrincipal || 0).toLocaleString('en-IN')}`);
    doc.text(`Average Interest Rate: ${(overview?.averageInterestRate || 0).toFixed(2)}%`);
    doc.moveDown(2);
    
    // Add Status Distribution Chart
    doc.fontSize(12).font('Courier-Bold').text('EMI STATUS DISTRIBUTION', { underline: true });
    doc.moveDown(0.5);
    doc.image(statusChartImage, {
      fit: [500, 300],
      align: 'center'
    });
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
    
    // Add Provider Distribution Chart
    if (Object.keys(providerMap).length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Courier-Bold').text('PROVIDER-WISE DISTRIBUTION', { underline: true });
      doc.moveDown(0.5);
      doc.image(providerChartImage, {
        fit: [500, 300],
        align: 'center'
      });
      doc.moveDown(2);
    }
    
    // Upcoming Payments Section
    if (filteredUpcoming.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('UPCOMING PAYMENTS SCHEDULE', { underline: true });
      doc.moveDown(0.5);
      
      // Add Monthly Trend Chart
      doc.image(monthlyChartImage, {
        fit: [500, 300],
        align: 'center'
      });
      doc.moveDown(2);
      
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

      Object.entries(upcomingByMonth).slice(0, 12).forEach(([month, payments]) => {
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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    pdfContent += '╚════════════════════════════════════════════════════════════════════════════════╝\n\n';
    pdfContent += `📅 Generated: ${new Date().toLocaleString()}\n`;
    pdfContent += `📊 Date Range: ${startDate || 'All'} to ${endDate || 'All'}\n`;
    pdfContent += `👤 User ID: ${userId}\n\n`;
    
    pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
    pdfContent += '                              OVERVIEW SUMMARY\n';
    pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n\n';
    pdfContent += `📊 Total EMIs: ${allEMIs.length}\n`;
    pdfContent += `✅ Active EMIs: ${activeEMIs.length}\n`;
    pdfContent += `✔️  Completed EMIs: ${completedEMIs.length}\n`;
    pdfContent += `🔒 Foreclosed EMIs: ${foreClosedEMIs.length}\n\n`;
    pdfContent += `💰 Total Monthly EMI: ₹${(overview?.totalMonthlyEMI || 0).toLocaleString('en-IN')}\n`;
    pdfContent += `📈 Total Outstanding: ₹${(overview?.totalOutstanding || 0).toLocaleString('en-IN')}\n`;
    pdfContent += `💵 Total Principal: ₹${(overview?.totalPrincipal || 0).toLocaleString('en-IN')}\n`;
    pdfContent += `📊 Average Interest Rate: ${(overview?.averageInterestRate || 0).toFixed(2)}%\n\n`;
    
    // Active EMIs Section
    if (activeEMIs.length > 0) {
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
      pdfContent += '                              ACTIVE EMIs\n';
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n\n';
      activeEMIs.forEach((emi, index) => {
        pdfContent += `${index + 1}. ${emi.merchantName || 'Unknown Merchant'}\n`;
        pdfContent += `   └─ Card: ${emi.cardProvider} ****${emi.cardLastFourDigits || 'N/A'}\n`;
        pdfContent += `   └─ Product: ${emi.productDescription || 'N/A'}\n`;
        pdfContent += `   └─ Principal: ₹${(emi.principalAmount || 0).toLocaleString('en-IN')}\n`;
        pdfContent += `   └─ Interest Rate: ${emi.interestRate || 0}%\n`;
        pdfContent += `   └─ EMI Amount: ₹${(emi.emiAmount || 0).toLocaleString('en-IN')}\n`;
        pdfContent += `   └─ Tenure: ${emi.remainingInstallments || 0}/${emi.totalTenure || 0} remaining\n`;
        pdfContent += `   └─ Start Date: ${new Date(emi.startDate).toLocaleDateString('en-IN')}\n`;
        pdfContent += `   └─ Outstanding: ₹${((emi.emiAmount || 0) * (emi.remainingInstallments || 0)).toLocaleString('en-IN')}\n\n`;
      });
    }

    // Upcoming Payments Section
    if (filteredUpcoming.length > 0) {
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
      pdfContent += '                           UPCOMING PAYMENTS SCHEDULE\n';
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n\n';
      
      // Group by month
      const paymentsByMonth = {};
      filteredUpcoming.forEach(payment => {
        const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
        if (!paymentsByMonth[monthKey]) {
          paymentsByMonth[monthKey] = [];
        }
        paymentsByMonth[monthKey].push(payment);
      });

      Object.entries(paymentsByMonth).forEach(([month, payments]) => {
        const monthTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        pdfContent += `📅 ${month} - Total: ₹${monthTotal.toLocaleString('en-IN')} (${payments.length} payments)\n`;
        pdfContent += '─'.repeat(80) + '\n';
        payments.forEach((payment, idx) => {
          pdfContent += `   ${idx + 1}. ${new Date(payment.dueDate).toLocaleDateString('en-IN')} - ${payment.merchantName || 'N/A'}\n`;
          pdfContent += `      Amount: ₹${(payment.amount || 0).toLocaleString('en-IN')} | `;
          pdfContent += `Card: ${payment.cardProvider || 'N/A'} | `;
          pdfContent += `Installment: ${payment.installmentNumber || 0}/${payment.totalTenure || 0}\n`;
        });
        pdfContent += '\n';
      });
    }

    // Completed EMIs Section
    if (completedEMIs.length > 0) {
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
      pdfContent += '                            COMPLETED EMIs\n';
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n\n';
      completedEMIs.forEach((emi, index) => {
        pdfContent += `${index + 1}. ${emi.merchantName || 'Unknown'} - ${emi.cardProvider}\n`;
        pdfContent += `   Principal: ₹${(emi.principalAmount || 0).toLocaleString('en-IN')} | `;
        pdfContent += `Total Paid: ₹${((emi.emiAmount || 0) * (emi.totalTenure || 0)).toLocaleString('en-IN')}\n`;
        pdfContent += `   Period: ${new Date(emi.startDate).toLocaleDateString('en-IN')} to ${new Date(emi.endDate || emi.startDate).toLocaleDateString('en-IN')}\n\n`;
      });
    }

    // Provider-wise Summary
    if (allEMIs.length > 0) {
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
      pdfContent += '                         PROVIDER-WISE BREAKDOWN\n';
      pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n\n';
      
      const providerMap = {};
      allEMIs.forEach(emi => {
        const provider = emi.cardProvider || 'Unknown';
        if (!providerMap[provider]) {
          providerMap[provider] = { count: 0, totalAmount: 0, totalPrincipal: 0 };
        }
        providerMap[provider].count++;
        providerMap[provider].totalAmount += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
        providerMap[provider].totalPrincipal += (emi.principalAmount || 0);
      });

      Object.entries(providerMap).forEach(([provider, data]) => {
        pdfContent += `🏦 ${provider}:\n`;
        pdfContent += `   EMIs: ${data.count} | Principal: ₹${data.totalPrincipal.toLocaleString('en-IN')} | `;
        pdfContent += `Outstanding: ₹${data.totalAmount.toLocaleString('en-IN')}\n\n`;
      });
    }

    pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';
    pdfContent += '                           END OF REPORT\n';
    pdfContent += '═══════════════════════════════════════════════════════════════════════════════\n';

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
    doc.text(`Total EMIs: ${allEMIs.length}`);
    doc.text(`Active EMIs: ${activeEMIs.length}`);
    doc.text(`Completed EMIs: ${completedEMIs.length}`);
    doc.text(`Foreclosed EMIs: ${foreClosedEMIs.length}`);
    doc.moveDown(0.5);
    doc.text(`Total Monthly EMI: ₹${(overview?.totalMonthlyEMI || 0).toLocaleString('en-IN')}`);
    doc.text(`Total Outstanding: ₹${(overview?.totalOutstanding || 0).toLocaleString('en-IN')}`);
    doc.text(`Total Principal: ₹${(overview?.totalPrincipal || 0).toLocaleString('en-IN')}`);
    doc.text(`Average Interest Rate: ${(overview?.averageInterestRate || 0).toFixed(2)}%`);
    doc.moveDown();
    
    // Active EMIs Section
    if (activeEMIs.length > 0) {
      doc.fontSize(14).font('Courier-Bold').text('ACTIVE EMIs', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');
      activeEMIs.forEach((emi, index) => {
        doc.text(`${index + 1}. ${emi.merchantName || 'Unknown Merchant'}`);
        doc.text(`   Card: ${emi.cardProvider} ****${emi.cardLastFourDigits || 'N/A'}`, { indent: 10 });
        doc.text(`   Product: ${emi.productDescription || 'N/A'}`, { indent: 10 });
        doc.text(`   Principal: ₹${(emi.principalAmount || 0).toLocaleString('en-IN')} | Interest: ${emi.interestRate || 0}%`, { indent: 10 });
        doc.text(`   EMI: ₹${(emi.emiAmount || 0).toLocaleString('en-IN')} | Tenure: ${emi.remainingInstallments || 0}/${emi.totalTenure || 0}`, { indent: 10 });
        doc.text(`   Outstanding: ₹${((emi.emiAmount || 0) * (emi.remainingInstallments || 0)).toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }
    
    // Upcoming Payments Section
    if (filteredUpcoming.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('UPCOMING PAYMENTS SCHEDULE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');
      
      // Group by month
      const paymentsByMonth = {};
      filteredUpcoming.forEach(payment => {
        const monthKey = new Date(payment.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
        if (!paymentsByMonth[monthKey]) {
          paymentsByMonth[monthKey] = [];
        }
        paymentsByMonth[monthKey].push(payment);
      });

      Object.entries(paymentsByMonth).slice(0, 12).forEach(([month, payments]) => {
        const monthTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        doc.fontSize(11).font('Courier-Bold').text(`${month} - Total: ₹${monthTotal.toLocaleString('en-IN')}`);
        doc.fontSize(9).font('Courier');
        payments.slice(0, 10).forEach((payment, idx) => {
          doc.text(`  ${new Date(payment.dueDate).toLocaleDateString('en-IN')} - ${payment.merchantName || 'N/A'}`);
          doc.text(`    Amount: ₹${(payment.amount || 0).toLocaleString('en-IN')} | ${payment.cardProvider || 'N/A'} | ${payment.installmentNumber || 0}/${payment.totalTenure || 0}`, { indent: 10 });
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
        doc.text(`   Principal: ₹${(emi.principalAmount || 0).toLocaleString('en-IN')} | Total Paid: ₹${((emi.emiAmount || 0) * (emi.totalTenure || 0)).toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
      doc.moveDown();
    }

    // Provider Summary
    if (allEMIs.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Courier-Bold').text('PROVIDER-WISE BREAKDOWN', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Courier');

      Object.entries(providerMap).forEach(([provider, data]) => {
        doc.text(`${provider}`);
        doc.text(`  EMIs: ${data.count || 0} | Principal: ${(data.principal || 0).toLocaleString('en-IN')} | Outstanding: ${(data.outstanding || 0).toLocaleString('en-IN')}`, { indent: 10 });
        doc.moveDown(0.3);
      });
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    logger.error('Export PDF error:', error);
    // Check if response has already been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF report',
        error: error.message
      });
    }
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

    const providerMap = {};
    allEMIs.forEach(emi => {
      const provider = emi.cardProvider || 'Unknown';
      if (!providerMap[provider]) {
        providerMap[provider] = { count: 0, active: 0, totalPrincipal: 0, totalOutstanding: 0 };
      }
      providerMap[provider].count++;
      if (emi.status === 'active') providerMap[provider].active++;
      providerMap[provider].totalPrincipal += (emi.principalAmount || 0);
      providerMap[provider].totalOutstanding += (emi.emiAmount || 0) * (emi.remainingInstallments || 0);
    });

    Object.entries(providerMap).forEach(([provider, data]) => {
      providerSheet.addRow({
        provider,
        count: data.count,
        active: data.active,
        principal: data.totalPrincipal,
        outstanding: data.totalOutstanding
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

module.exports = router;
