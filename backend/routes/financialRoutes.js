const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const FinancialAnalysis = require('../models/FinancialAnalysis');
const FinancialProfile = require('../models/FinancialProfile');
const Transaction = require('../models/Transaction');
const Document = require('../models/Document');
const BillReminder = require('../models/BillReminder');
const { authenticate } = require('../middleware/auth');
const { processMultipleDocuments, categorizeTransaction, detectRecurringTransactions } = require('../services/documentProcessor');
const { performFinancialAnalysis } = require('../services/financialAIService');
const gmailService = require('../services/gmailService');
const cibilService = require('../services/cibilService');
const websocketService = require('../services/websocketService');
const currencyService = require('../services/currencyService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
/**
 * @route POST /api/financial/analyze-all
 * @desc Analyze all user transactions and generate comprehensive insights
 * @access Private
 */
router.post('/analyze-all', authenticate, async (req, res) => {
  try {
    logger.info('Analyze-all endpoint called for user:', req.user._id);
    const { analysisType = 'spending_analysis', dateRange, syncGmail = true } = req.body;

    // Get user profile
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    logger.info('Profile lookup result:', { 
      found: !!profile, 
      userId: req.user._id,
      hasGmailSettings: !!profile?.gmailSettings,
      gmailConnected: profile?.gmailSettings?.isConnected,
      gmailEmail: profile?.gmailSettings?.email
    });
    
    if (!profile) {
      logger.warn('No profile found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile first'
      });
    }

    // Build date filter
    const dateFilter = {};
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    
    if (dateRange) {
      if (dateRange.startDate) dateFilter.$gte = startDate;
      if (dateRange.endDate) dateFilter.$lte = endDate;
    } else {
      // Default to last 3 months
      dateFilter.$gte = startDate;
    }

    logger.info('Analysis date range:', { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(),
      syncGmail 
    });

    // Step 1: Sync Gmail if requested and connected
    let gmailSyncResults = null;
    const isFirstSync = !profile.gmailSettings?.lastSync;

    logger.info('Gmail sync decision:', {
      syncGmailRequested: syncGmail,
      gmailConnected: profile.gmailSettings?.isConnected,
      hasAccessToken: !!profile.gmailSettings?.accessToken,
      isFirstSync,
      willAttemptSync: syncGmail && profile.gmailSettings?.isConnected
    });
    
    if (syncGmail) {
      if (profile.gmailSettings?.isConnected && profile.gmailSettings?.accessToken) {
        try {
          logger.info(`Starting Gmail sync for analysis... (First sync: ${isFirstSync})`);
          
          // For the first sync, look back further in time and check more emails
          const syncOptions = {
            dateAfter: isFirstSync ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) : startDate, // 1 year for first sync
            dateBefore: endDate,
            maxResults: isFirstSync ? 500 : 100 // More emails for first sync
          };

          gmailSyncResults = await gmailService.syncForAnalysis(req.user._id, profile, syncOptions);
          
          logger.info('Gmail sync completed:', {
            totalEmails: gmailSyncResults.totalEmails,
            downloadedFiles: gmailSyncResults.downloadedFiles?.length || 0,
            errors: gmailSyncResults.errors?.length || 0
          });
        } catch (gmailError) {
          logger.warn('Gmail sync failed, continuing with existing data:', gmailError.message);
          gmailSyncResults = {
            error: gmailError.message,
            code: gmailError.code,
            requiresReauth: !!gmailError.requiresReauth
          };
        }
      } else {
        logger.info('Gmail sync requested but Gmail not properly connected:', {
          hasGmailSettings: !!profile.gmailSettings,
          isConnected: profile.gmailSettings?.isConnected,
          hasAccessToken: !!profile.gmailSettings?.accessToken
        });
        gmailSyncResults = { error: 'Gmail not properly connected. Please reconnect Gmail in Profile settings.' };
      }
    } else {
      logger.info('Gmail sync not requested');
    }

    // Step 2: Get all user transactions (including newly synced ones)
    const transactions = await Transaction.find({
      userId: req.user._id,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    }).sort({ date: -1 });

    logger.info('Transactions found for analysis:', transactions.length);
    
    // If no existing transactions, provide detailed guidance
    if (transactions.length === 0) {
      let errorMessage = 'No financial transactions found for analysis.';
      let suggestions = [];
      
      if (!profile.gmailSettings?.isConnected) {
        suggestions.push('1. Connect your Gmail account in the Profile page to automatically import financial emails');
        suggestions.push('2. Upload financial documents (PDFs, Excel files) manually');
        errorMessage += ' To get started, please connect Gmail or upload financial documents.';
      } else if (gmailSyncResults?.error) {
        suggestions.push(`Gmail sync failed: ${gmailSyncResults.error}`);
        if (gmailSyncResults.requiresReauth) {
          suggestions.push('Disconnect and reconnect Gmail in the Profile page to refresh permissions.');
        } else {
          suggestions.push('Please check your Gmail connection in the Profile page');
        }
        suggestions.push('Alternatively, upload financial documents manually');
      } else if (!syncGmail) {
        suggestions.push('Enable Gmail sync in the analysis options');
        suggestions.push('Or upload financial documents manually');
      } else {
        suggestions.push('No financial emails found in the selected date range');
        suggestions.push('Try expanding the date range or uploading documents manually');
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        suggestions: suggestions,
        details: {
          gmailConnected: profile.gmailSettings?.isConnected || false,
          gmailEmail: profile.gmailSettings?.email || null,
          gmailSyncAttempted: !!gmailSyncResults,
          gmailSyncError: gmailSyncResults?.error || null,
          gmailSyncRequiresReauth: gmailSyncResults?.requiresReauth || false,
          gmailGrantedScopes: profile.gmailSettings?.grantedScopes || [],
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      });
    }

    // Get processed documents for this analysis
    const documents = await Document.find({
      userId: req.user._id,
      isProcessed: true
    });

    logger.info(`Starting comprehensive analysis for user ${req.user._id}: ${transactions.length} transactions`);

    // Create analysis record
    const analysis = new Analysis({
      userId: req.user._id,
      analysisType,
      period: {
        startDate: startDate,
        endDate: endDate
      },
      documentsAnalyzed: documents.map(d => d._id),
      transactionsAnalyzed: transactions.length,
      aiProvider: profile.preferences?.aiProvider || 'ollama',
      aiModel: profile.preferences?.aiProvider === 'openai' ? 'gpt-4-turbo-preview' : (process.env.OLLAMA_MODEL || 'llama3.1:8b'),
      status: 'processing',
      metadata: {
        gmailSync: gmailSyncResults ? {
          attempted: true,
          successful: !gmailSyncResults.error,
          totalEmails: gmailSyncResults.totalEmails || 0,
          downloadedFiles: gmailSyncResults.downloadedFiles?.length || 0,
          runDate: gmailSyncResults.runDate,
          errors: gmailSyncResults.errors?.length || 0
        } : { attempted: false }
      }
    });

    await analysis.save();

    // Emit analysis started notification
    websocketService.emitAnalysisProgress(req.user._id, analysis._id, 0, 'Starting comprehensive analysis...');

    // Perform analysis asynchronously
    performComprehensiveAnalysis(analysis._id, transactions, profile, gmailSyncResults, req.user._id)
      .then(() => {
        logger.info(`Analysis completed for user ${req.user._id}: ${analysis._id}`);
        websocketService.emitAnalysisComplete(req.user._id, analysis._id, analysis);
      })
      .catch(error => {
        logger.error(`Analysis failed for user ${req.user._id}:`, error);
        websocketService.emitError(req.user._id, error, 'Financial Analysis');
      });

    res.status(202).json({
      success: true,
      message: 'Financial analysis started successfully',
      analysisId: analysis._id,
      transactionsFound: transactions.length,
      gmailSync: gmailSyncResults ? {
        totalEmails: gmailSyncResults.totalEmails || 0,
        downloadedFiles: gmailSyncResults.downloadedFiles?.length || 0,
        runDate: gmailSyncResults.runDate?.toISOString(),
        successful: !gmailSyncResults.error
      } : null,
      status: 'processing'
    });

  } catch (error) {
    logger.error('Analysis initiation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Failed to start financial analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Perform comprehensive financial analysis
 */
async function performComprehensiveAnalysis(analysisId, transactions, profile, gmailSyncResults = null, userId) {
  try {
    const analysis = await Analysis.findById(analysisId);
    const startTime = Date.now();

    // Emit progress updates
    websocketService.emitAnalysisProgress(userId, analysisId, 10, 'Processing transactions...');

    // Perform the analysis
    const results = await performFinancialAnalysis(transactions, profile);
    
    websocketService.emitAnalysisProgress(userId, analysisId, 70, 'Generating insights...');

    // Calculate period summary
    const debits = transactions.filter(t => t.type === 'debit');
    const credits = transactions.filter(t => t.type === 'credit');
    const totalIncome = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netSavings = totalIncome - totalExpenses;

    // Calculate category breakdown
    const categoryBreakdown = [];
    const categoryTotals = {};
    debits.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });

    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, amount]) => {
        const categoryTransactions = debits.filter(t => t.category === category);
        categoryBreakdown.push({
          category,
          amount,
          percentage: (amount / totalExpenses) * 100,
          transactionCount: categoryTransactions.length,
          trend: 'stable' // Could be enhanced with historical data
        });
      });

    // Convert AI insights to our format
    const insights = [];
    if (results.aiInsights.keyFindings) {
      results.aiInsights.keyFindings.forEach((finding, index) => {
        insights.push({
          type: index === 0 ? 'trend' : 'suggestion',
          title: `Key Finding ${index + 1}`,
          description: finding,
          impact: 'medium',
          actionable: true
        });
      });
    }

    // Convert AI recommendations
    const recommendations = [];
    if (results.aiInsights.recommendations) {
      results.aiInsights.recommendations.forEach(rec => {
        recommendations.push({
          category: rec.category || 'general',
          currentSpending: rec.currentSpending || 0,
          recommendedSpending: rec.recommendedSpending || 0,
          potentialSavings: rec.potentialSavings || 0,
          reasoning: rec.description || rec.reasoning || 'AI recommendation',
          priority: rec.impact === 'high' ? 'high' : rec.impact === 'low' ? 'low' : 'medium',
          timeframe: rec.timeframe || 'medium_term'
        });
      });
    }

    // Future projections
    const futureProjections = {
      nextMonthPrediction: {
        expectedIncome: totalIncome,
        expectedExpenses: totalExpenses,
        projectedSavings: netSavings
      },
      yearEndProjection: {
        totalIncome: totalIncome * 4, // Extrapolate quarterly to yearly
        totalExpenses: totalExpenses * 4,
        totalSavings: netSavings * 4
      },
      goalProgress: {
        savingsGoalProgress: profile.savingsGoal?.amount ? (netSavings / profile.savingsGoal.amount) * 100 : 0,
        budgetAdherence: results.financialHealthScore?.components?.budgetCompliance || 75,
        spendingEfficiency: results.financialHealthScore?.components?.spendingControl || 75
      }
    };

    // Update analysis with results
    analysis.summary = {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
    };
    analysis.categoryBreakdown = categoryBreakdown;
    analysis.insights = insights;
    analysis.recommendations = recommendations;
    analysis.futureProjections = futureProjections;
    analysis.confidence = 0.8; // Could be enhanced based on data quality
    analysis.processingTime = Date.now() - startTime;
    analysis.status = 'completed';

    // Add Gmail sync information if available
    if (gmailSyncResults && !gmailSyncResults.error) {
      analysis.metadata = analysis.metadata || {};
      analysis.metadata.gmailSync = {
        ...analysis.metadata.gmailSync,
        downloadedFiles: gmailSyncResults.downloadedFiles || [],
        folderPath: gmailSyncResults.runDate ? 
          `uploads/financial/${gmailSyncResults.runDate.toISOString().split('T')[0]}` : null
      };
    }

    await analysis.save();

    // Update profile statistics
    profile.statistics.totalAnalyses = (profile.statistics.totalAnalyses || 0) + 1;
    profile.statistics.lastAnalysisDate = new Date();
    if (totalExpenses > 0) {
      profile.statistics.averageMonthlySpending = 
        ((profile.statistics.averageMonthlySpending || 0) + totalExpenses) / 2;
    }
    await profile.save();

  } catch (error) {
    logger.error(`Analysis processing error for ${analysisId}:`, error);
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'failed',
      error: error.message
    });
  }
}

router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { title, description, dateRange } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one file'
      });
    }

    // Get user profile
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create a financial profile first'
      });
    }

    logger.info(`Starting analysis for user: ${req.user.email}, files: ${req.files.length}`);

    // Process documents
    const { transactions, results } = await processMultipleDocuments(req.files);

    if (transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No transactions found in uploaded documents'
      });
    }

    // Categorize transactions
    const categorizedTransactions = transactions.map(t => ({
      ...t,
      category: categorizeTransaction(t.description, profile.customCategories),
      type: t.type || (t.amount < 0 ? 'debit' : 'credit'),
      amount: Math.abs(t.amount)
    }));

    // Detect recurring transactions
    const recurringTransactions = detectRecurringTransactions(categorizedTransactions);

    // Mark recurring in main transactions
    recurringTransactions.forEach(recurring => {
      categorizedTransactions.forEach(t => {
        if (t.description === recurring.description && Math.abs(t.amount - recurring.amount) < 0.01) {
          t.isRecurring = true;
          t.recurringPattern = {
            frequency: recurring.frequency,
            nextDate: new Date(new Date(t.date).getTime() + recurring.averageInterval * 24 * 60 * 60 * 1000)
          };
        }
      });
    });

    // Create analysis document
    const analysis = new FinancialAnalysis({
      userId: req.user._id,
      profileId: profile._id,
      title: title || `Financial Analysis - ${new Date().toLocaleDateString()}`,
      description: description || 'Automated financial analysis',
      dateRange: dateRange ? JSON.parse(dateRange) : {
        start: new Date(Math.min(...transactions.map(t => new Date(t.date)))),
        end: new Date(Math.max(...transactions.map(t => new Date(t.date))))
      },
      sourceFiles: req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
        path: f.path
      })),
      transactions: categorizedTransactions,
      processingStatus: 'processing'
    });

    await analysis.save();

    // Perform analysis asynchronously
    performFinancialAnalysis(categorizedTransactions, profile)
      .then(async (analysisResults) => {
        analysis.analysis = analysisResults.analysis;
        analysis.financialHealthScore = analysisResults.financialHealthScore;
        analysis.budgetComparison = analysisResults.budgetComparison;
        analysis.aiInsights = analysisResults.aiInsights;
        analysis.suggestions = analysisResults.aiInsights.suggestions || [];
        analysis.processingStatus = 'completed';
        analysis.aiModel = {
          provider: profile.preferences.aiProvider || 'ollama',
          model: profile.preferences.aiProvider === 'openai' ? 'gpt-4-turbo-preview' : 'llama3.1:8b',
          version: '1.0'
        };

        await analysis.save();

        // Update profile statistics
        profile.statistics.totalAnalyses = (profile.statistics.totalAnalyses || 0) + 1;
        profile.statistics.totalTransactions = (profile.statistics.totalTransactions || 0) + categorizedTransactions.length;
        profile.statistics.lastAnalysisDate = new Date();
        await profile.save();

        logger.info(`Analysis completed for ${req.user.email}: ${analysis._id}`);
      })
      .catch(async (error) => {
        logger.error('Analysis processing error:', error);
        analysis.processingStatus = 'failed';
        analysis.metadata.error = error.message;
        await analysis.save();
      });

    res.status(202).json({
      success: true,
      message: 'Documents uploaded successfully. Analysis in progress.',
      data: {
        analysisId: analysis._id,
        transactionsFound: transactions.length,
        filesProcessed: req.files.length,
        status: 'processing'
      }
    });
  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/financial/transactions
 * @desc Get user transactions with filtering and pagination
 * @access Private
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      type,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    const transactions = await Transaction.find(filter)
      .populate('documentId', 'originalFileName category')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(filter);

    // Calculate summary stats
    const debits = transactions.filter(t => t.type === 'debit');
    const credits = transactions.filter(t => t.type === 'credit');
    const totalExpenses = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = credits.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        merchantName: t.merchantName,
        confidence: t.confidence,
        isVerified: t.isVerified,
        isRecurring: t.isRecurring,
        document: t.documentId ? {
          name: t.documentId.originalFileName,
          category: t.documentId.category
        } : null
      })),
      summary: {
        totalTransactions: total,
        totalExpenses,
        totalIncome,
        netAmount: totalIncome - totalExpenses
      },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions'
    });
  }
});

/**
 * @route GET /api/financial/analytics/spending-by-category
 * @desc Get spending breakdown by category
 * @access Private
 */
router.get('/analytics/spending-by-category', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const matchFilter = {
      userId: req.user._id,
      type: 'debit'
    };

    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    }

    const categoryData = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
          avgAmount: { $avg: { $abs: '$amount' } }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const total = categoryData.reduce((sum, item) => sum + item.totalAmount, 0);

    const result = categoryData.map(item => ({
      category: item._id,
      amount: item.totalAmount,
      count: item.count,
      avgAmount: item.avgAmount,
      percentage: total > 0 ? (item.totalAmount / total) * 100 : 0
    }));

    res.json({
      success: true,
      data: result,
      totalSpending: total
    });

  } catch (error) {
    logger.error('Spending by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending by category'
    });
  }
});

/**
 * @route GET /api/financial/analytics/monthly-trends
 * @desc Get monthly income and expense trends
 * @access Private
 */
router.get('/analytics/monthly-trends', authenticate, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const trends = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $addFields: {
          // Convert date to Date object if it's a string
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
            type: '$type'
          },
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'credit'] }, '$totalAmount', 0]
            }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'debit'] }, '$totalAmount', 0]
            }
          },
          transactionCount: { $sum: '$count' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const result = trends.map(trend => ({
      month: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
      income: trend.income,
      expenses: trend.expenses,
      net: trend.income - trend.expenses,
      transactionCount: trend.transactionCount
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Monthly trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly trends'
    });
  }
});

/**
 * @route   GET /api/financial/reports
 * @desc    Get all financial analysis reports (combines Analysis and FinancialAnalysis models)
 * @access  Private
 */
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Get Analysis records (new format)
    const analysisQuery = { userId: req.user._id };
    if (status) analysisQuery.status = status;

    const analysisReports = await Analysis.find(analysisQuery)
      .sort({ createdAt: -1 })
      .select('-categoryBreakdown -insights -recommendations -futureProjections');

    // Get FinancialAnalysis records (legacy format)
    const financialQuery = { userId: req.user._id };
    if (status) {
      // Map status values for FinancialAnalysis
      financialQuery.processingStatus = status === 'completed' ? 'completed' : 
                                       status === 'processing' ? 'processing' : 
                                       status === 'failed' ? 'failed' : status;
    }

    const financialReports = await FinancialAnalysis.find(financialQuery)
      .sort({ createdAt: -1 })
      .select('title processingStatus createdAt dateRange');

    // Combine and normalize reports
    const allReports = [
      ...analysisReports.map(report => ({
        _id: report._id,
        title: report.analysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        processingStatus: report.status,
        status: report.status,
        createdAt: report.createdAt,
        type: 'analysis'
      })),
      ...financialReports.map(report => ({
        _id: report._id,
        title: report.title,
        processingStatus: report.processingStatus,
        status: report.processingStatus,
        createdAt: report.createdAt,
        type: 'financial_analysis'
      }))
    ];

    // Sort by creation date and paginate
    allReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedReports = allReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        totalPages: Math.ceil(allReports.length / limit),
        currentPage: parseInt(page),
        total: allReports.length
      }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
});

/**
 * @route   GET /api/financial/reports/:id
 * @desc    Get specific financial analysis report (handles both Analysis and FinancialAnalysis models)
 * @access  Private
 */
router.get('/reports/:id', authenticate, async (req, res) => {
  try {
    // First try to find in Analysis collection (new format)
    let report = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (report) {
      return res.json({
        success: true,
        data: { 
          report: {
            _id: report._id,
            title: report.analysisType,
            status: report.status,
            createdAt: report.createdAt,
            summary: report.summary,
            categoryBreakdown: report.categoryBreakdown,
            insights: report.insights,
            recommendations: report.recommendations,
            futureProjections: report.futureProjections,
            analysisType: report.analysisType,
            processingStatus: report.status,
            confidence: report.confidence,
            processingTime: report.processingTime
          }
        }
      });
    }

    // Fallback to FinancialAnalysis collection (legacy format)
    report = await FinancialAnalysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report'
    });
  }
});

/**
 * @route   GET /api/financial/reports/:id/status
 * @desc    Get analysis status
 * @access  Private
 */
router.get('/reports/:id/status', authenticate, async (req, res) => {
  try {
    const report = await FinancialAnalysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('processingStatus metadata createdAt');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: {
        status: report.processingStatus,
        createdAt: report.createdAt,
        error: report.metadata?.error
      }
    });
  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching status'
    });
  }
});

/**
 * @route   DELETE /api/financial/reports/:id
 * @desc    Delete financial analysis report
 * @access  Private
 */
router.delete('/reports/:id', authenticate, async (req, res) => {
  try {
    const report = await FinancialAnalysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Delete associated files
    for (const file of report.sourceFiles) {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        logger.warn(`Failed to delete file: ${file.path}`);
      }
    }

    await report.deleteOne();

    logger.info(`Report deleted: ${req.params.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report'
    });
  }
});

/**
 * @route   GET /api/financial/charts/:reportId
 * @desc    Get chart data for specific report
 * @access  Private
 */
router.get('/charts/:reportId', authenticate, async (req, res) => {
  try {
    const report = await FinancialAnalysis.findOne({
      _id: req.params.reportId,
      userId: req.user._id
    }).select('charts analysis');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Generate charts if not exists
    if (!report.charts || report.charts.length === 0) {
      const charts = generateCharts(report.analysis);
      report.charts = charts;
      await report.save();
    }

    res.json({
      success: true,
      data: { charts: report.charts }
    });
  } catch (error) {
    logger.error('Get charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching charts'
    });
  }
});

/**
 * @route   GET /api/financial/insights/:reportId
 * @desc    Get AI insights for specific report
 * @access  Private
 */
router.get('/insights/:reportId', authenticate, async (req, res) => {
  try {
    const report = await FinancialAnalysis.findOne({
      _id: req.params.reportId,
      userId: req.user._id
    }).select('aiInsights suggestions financialHealthScore');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: {
        insights: report.aiInsights,
        suggestions: report.suggestions,
        healthScore: report.financialHealthScore
      }
    });
  } catch (error) {
    logger.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insights'
    });
  }
});

/**
 * @route   GET /api/financial/health-score
 * @desc    Get current financial health score
 * @access  Private
 */
router.get('/health-score', authenticate, async (req, res) => {
  try {
    // Try to get the latest completed Analysis first
    const latestAnalysis = await Analysis.findOne({
      userId: req.user._id,
      status: 'completed'
    })
      .sort({ createdAt: -1 });

    if (latestAnalysis) {
      const overallScore = latestAnalysis.getOverallScore();
      return res.json({
        success: true,
        data: {
          healthScore: {
            overall: overallScore,
            components: {
              savingsRate: Math.round(latestAnalysis.summary.savingsRate || 0),
              budgetAdherence: Math.round(latestAnalysis.futureProjections?.goalProgress?.budgetAdherence || 0),
              spendingEfficiency: Math.round(latestAnalysis.futureProjections?.goalProgress?.spendingEfficiency || 0)
            },
            summary: latestAnalysis.summary,
            lastUpdated: latestAnalysis.createdAt
          },
          calculatedAt: latestAnalysis.createdAt
        }
      });
    }

    // Fallback to FinancialAnalysis if no Analysis found
    const latestReport = await FinancialAnalysis.findOne({
      userId: req.user._id,
      processingStatus: 'completed'
    })
      .sort({ createdAt: -1 })
      .select('financialHealthScore createdAt');

    if (latestReport && latestReport.financialHealthScore) {
      return res.json({
        success: true,
        data: {
          healthScore: latestReport.financialHealthScore,
          calculatedAt: latestReport.createdAt
        }
      });
    }

    // If no analysis is found, return a default response
    res.json({
      success: true,
      data: {
        healthScore: {
          overall: 0,
          components: {
            savingsRate: 0,
            budgetAdherence: 0,
            spendingEfficiency: 0
          },
          summary: {
            totalIncome: 0,
            totalExpenses: 0,
            netSavings: 0,
            savingsRate: 0
          },
          lastUpdated: null
        },
        calculatedAt: null,
        message: 'No analysis data available. Please upload some financial documents to get started.'
      }
    });
  } catch (error) {
    logger.error('Get health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching health score'
    });
  }
});

/**
 * @route   GET /api/financial/export/:reportId
 * @desc    Export report data
 * @access  Private
 */
router.get('/export/:reportId', authenticate, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const report = await FinancialAnalysis.findOne({
      _id: req.params.reportId,
      userId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (format === 'json') {
      res.json({
        success: true,
        data: report
      });
    } else if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${report._id}.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format. Supported: json, csv'
      });
    }
  } catch (error) {
    logger.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report'
    });
  }
});

/**
 * Helper: Generate charts from analysis data
 */
function generateCharts(analysis) {
  const charts = [];

  // Spending by category - Pie Chart
  if (analysis.topCategories && analysis.topCategories.length > 0) {
    charts.push({
      type: 'pie',
      title: 'Spending by Category',
      data: {
        labels: analysis.topCategories.map(c => c.category),
        datasets: [{
          data: analysis.topCategories.map(c => c.amount),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }]
      }
    });
  }

  // Monthly trends - Line Chart
  if (analysis.monthlyTrends && analysis.monthlyTrends.length > 0) {
    charts.push({
      type: 'line',
      title: 'Monthly Income vs Expenses',
      data: {
        labels: analysis.monthlyTrends.map(m => m.month),
        datasets: [
          {
            label: 'Income',
            data: analysis.monthlyTrends.map(m => m.income),
            borderColor: '#4BC0C0',
            backgroundColor: 'rgba(75, 192, 192, 0.2)'
          },
          {
            label: 'Expenses',
            data: analysis.monthlyTrends.map(m => m.expenses),
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.2)'
          }
        ]
      }
    });
  }

  return charts;
}

/**
 * Helper: Get all downloaded files from Gmail sync run
 */
async function getDownloadedFilesFromRun(runDate) {
  try {
    const runDateStr = runDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const folderPath = path.join(process.cwd(), 'uploads', 'financial', runDateStr);
    
    const files = await fs.readdir(folderPath).catch(() => []);
    return files.map(filename => ({
      filename,
      path: path.join(folderPath, filename),
      runDate: runDateStr
    }));
  } catch (error) {
    logger.warn('Error reading downloaded files:', error.message);
    return [];
  }
}

/**
 * Helper: Generate CSV from report
 */
function generateCSV(report) {
  let csv = 'Date,Description,Amount,Category,Type,Merchant\n';
  
  report.transactions.forEach(t => {
    csv += `${t.date},${t.description},${t.amount},${t.category},${t.type},${t.merchant || ''}\n`;
  });
  
  return csv;
}

/**
 * @route   GET /api/financial/reports/:id/files
 * @desc    Get downloaded files information for a specific analysis
 * @access  Private
 */
router.get('/reports/:id/files', authenticate, async (req, res) => {
  try {
    const report = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Analysis report not found'
      });
    }

    const gmailSync = report.metadata?.gmailSync;
    if (!gmailSync || !gmailSync.runDate) {
      return res.json({
        success: true,
        data: {
          hasGmailSync: false,
          downloadedFiles: [],
          folderPath: null
        }
      });
    }

    // Get actual files from the folder
    const downloadedFiles = await getDownloadedFilesFromRun(gmailSync.runDate);

    res.json({
      success: true,
      data: {
        hasGmailSync: true,
        gmailSync: {
          attempted: gmailSync.attempted,
          successful: gmailSync.successful,
          totalEmails: gmailSync.totalEmails,
          downloadedFilesCount: gmailSync.downloadedFiles,
          runDate: gmailSync.runDate,
          folderPath: gmailSync.folderPath
        },
        downloadedFiles,
        folderPath: gmailSync.folderPath
      }
    });

  } catch (error) {
    logger.error('Get analysis files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analysis files'
    });
  }
});

/**
 * @route   GET /api/financial/debug-profile
 * @desc    Debug profile and Gmail connection status
 * @access  Private
 */
router.get('/debug-profile-raw', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    res.json({
      success: true,
      data: {
        profile: profile ? {
          _id: profile._id,
          fullName: profile.fullName,
          panNumber: profile.panNumber,
          dateOfBirth: profile.dateOfBirth,
          phoneNumber: profile.phoneNumber,
          allFields: Object.keys(profile.toObject())
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/debug-profile', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    
    res.json({
      success: true,
      debug: {
        userId: req.user._id,
        profileExists: !!profile,
        profile: profile ? {
          id: profile._id,
          fullName: profile.fullName,
          hasGmailSettings: !!profile.gmailSettings,
          gmailSettings: profile.gmailSettings ? {
            isConnected: profile.gmailSettings.isConnected,
            email: profile.gmailSettings.email,
            hasAccessToken: !!profile.gmailSettings.accessToken,
            hasRefreshToken: !!profile.gmailSettings.refreshToken,
            lastSync: profile.gmailSettings.lastSync
          } : null
        } : null
      }
    });
    
  } catch (error) {
    logger.error('Debug profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/financial/test-gmail-sync
 * @desc    Test Gmail sync functionality
 * @access  Private
 */
router.post('/test-gmail-sync', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    
    if (!profile || !profile.gmailSettings?.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected'
      });
    }

    const testDate = new Date();
    const startDate = new Date(testDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const results = await gmailService.syncForAnalysis(req.user._id, profile, {
      dateAfter: startDate,
      dateBefore: testDate,
      maxResults: 10
    });

    res.json({
      success: true,
      message: 'Test Gmail sync completed',
      results: {
        runDate: results.runDate,
        totalEmails: results.totalEmails,
        downloadedFiles: results.downloadedFiles,
        folderPath: `uploads/financial/${results.runDate.toISOString().split('T')[0]}`,
        errors: results.errors
      }
    });

  } catch (error) {
    logger.error('Test Gmail sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Test Gmail sync failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/financial/credit-score
 * @desc    Fetch CIBIL credit score using existing profile data
 * @access  Private
 */
router.post('/credit-score', authenticate, async (req, res) => {
  try {
    logger.info(`Credit score request for user: ${req.user._id}`);
    
    // Get user's financial profile
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Financial profile not found. Please complete your profile first.'
      });
    }

    // Check if required details are available in profile
    if (!profile.panNumber) {
      return res.status(400).json({
        success: false,
        message: 'PAN number not found in your profile. Please update your profile with PAN details.'
      });
    }

    if (!profile.fullName || !profile.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Required profile details missing. Please complete your profile with name and phone number.'
      });
    }

    // Check monthly limit - allow fetch only once per 30 days (disabled in development)
    if (process.env.NODE_ENV === 'production' && profile.creditScore?.lastUpdated) {
      const lastUpdate = new Date(profile.creditScore.lastUpdated);
      const now = new Date();
      const daysSinceLastFetch = (now - lastUpdate) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastFetch < 30) {
        const nextFetchDate = new Date(lastUpdate.getTime() + 30 * 24 * 60 * 60 * 1000);
        return res.status(429).json({
          success: false,
          message: `Credit score can only be fetched once per month. Next fetch available on ${nextFetchDate.toLocaleDateString()}`,
          nextFetchDate: nextFetchDate.toISOString(),
          daysSinceLastFetch: Math.floor(daysSinceLastFetch)
        });
      }
    }

    // Prepare personal details from existing profile
    const personalDetails = {
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth,
      phoneNumber: profile.phoneNumber,
      monthlyIncome: profile.monthlyIncome
    };

    // Fetch credit score using profile data
    const creditProfile = await cibilService.getCreditScore(profile.panNumber, personalDetails);
    
    // DEBUG: Log what we got from service
    logger.info('Credit profile from service:', {
      hasCreditCards: !!creditProfile.creditCards,
      creditCardsLength: creditProfile.creditCards?.length || 0,
      totalCredit: creditProfile.totalCredit,
      availableCredit: creditProfile.availableCredit
    });
    
    // Save credit score to user profile
    profile.creditScore = {
      score: creditProfile.creditScore,
      grade: creditProfile.grade,
      lastUpdated: new Date(),
      panNumber: profile.panNumber.substring(0, 4) + '***', // Store masked PAN
      factors: creditProfile.factors,
      recommendations: creditProfile.recommendations,
      accounts: creditProfile.accounts,
      totalCreditLimit: creditProfile.totalCredit,
      totalCredit: creditProfile.totalCredit, // Include for compatibility
      availableCredit: creditProfile.availableCredit, // Include for compatibility
      utilizationRatio: creditProfile.utilizationRatio, // Include for compatibility
      creditUtilization: parseFloat(creditProfile.utilizationRatio),
      percentile: creditProfile.percentile || Math.floor(Math.random() * 20) + 70, // Generate if not provided
      creditCards: creditProfile.creditCards || [],
      creditCardSummary: creditProfile.creditCardSummary || {},
      creditCardRecommendations: creditProfile.creditCardRecommendations || [],
      isMockData: creditProfile.isMockData // Pass through the flag
    };
    await profile.save();

    // Return the saved credit score data from profile (matches frontend expectations)
    res.json({
      success: true,
      data: profile.creditScore, // Return credit score object directly
      rawData: creditProfile, // Keep original for reference
      message: creditProfile.message || 'Credit score fetched successfully using your profile data'
    });

  } catch (error) {
    logger.error('Credit score fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch credit score',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/financial/credit-cards
 * @desc    Get detailed credit cards information
 * @access  Private
 */
router.get('/credit-cards', authenticate, async (req, res) => {
  try {
    logger.info(`Credit cards request for user: ${req.user._id}`);
    
    // Get user's financial profile
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile || !profile.creditScore || !profile.creditScore.creditCards) {
      return res.status(404).json({
        success: false,
        message: 'No credit card data found. Please fetch your credit score first.'
      });
    }

    res.json({
      success: true,
      data: {
        creditCards: profile.creditScore.creditCards,
        summary: profile.creditScore.creditCardSummary,
        recommendations: profile.creditScore.creditCardRecommendations,
        lastUpdated: profile.creditScore.lastUpdated
      }
    });

  } catch (error) {
    logger.error('Credit cards fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit card data',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/financial/credit-history
 * @desc    Get credit score history
 * @access  Private
 */
router.get('/credit-history', authenticate, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile?.creditScore?.panNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please fetch your credit score first'
      });
    }

    // Reconstruct PAN from masked version (this is a simplified approach)
    // In production, you'd need a more secure way to handle PAN storage
    const panNumber = profile.creditScore.panNumber.replace('***', '1234F'); // Mock completion
    
    const history = await cibilService.getCreditHistory(panNumber, parseInt(months));
    
    res.json({
      success: true,
      data: history,
      message: 'Credit history fetched successfully'
    });

  } catch (error) {
    logger.error('Credit history fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/financial/credit-detail
 * @desc    Get comprehensive credit report with all details
 * @access  Private
 */
router.get('/credit-detail', authenticate, async (req, res) => {
  try {
    logger.info(`Comprehensive credit detail request for user: ${req.user._id}`);
    
    // Get user's financial profile
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.creditScore) {
      return res.status(404).json({
        success: false,
        message: 'No credit score data found. Please fetch your credit score first.'
      });
    }

    // Use real credit history if available, otherwise generate
    const generateHistoricalScores = () => {
      // If user has real credit history, use it
      if (profile.creditScore.creditHistory && profile.creditScore.creditHistory.length > 0) {
        return profile.creditScore.creditHistory;
      }
      
      // Otherwise generate based on current score
      const history = [];
      const currentScore = profile.creditScore.score;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        // For users who never missed payments, keep score more stable
        const variance = Math.floor(Math.random() * 20) - 10; // +/- 10 points for stable users
        const score = Math.max(700, Math.min(900, currentScore + variance));
        
        history.push({
          month: months[monthIndex],
          score: score,
          inquiries: 0, // No inquiries for stable users
          accounts: profile.creditScore.creditCards?.length || 0,
          utilization: parseFloat(profile.creditScore.creditUtilization || 0).toFixed(1)
        });
      }
      
      return history;
    };

    // Mock loan data (will be enhanced when loan module is added)
    const mockLoans = [
      {
        id: 'LOAN001',
        type: 'Home Loan',
        provider: 'HDFC Bank',
        principalAmount: 5000000,
        outstandingAmount: 3550000,
        emi: 42500,
        interestRate: 8.5,
        tenure: 240, // months
        remainingTenure: 168,
        status: 'Active',
        disbursementDate: new Date(2020, 3, 15),
        lastPaymentDate: new Date(2025, 2, 5),
        nextDueDate: new Date(2025, 3, 5)
      },
      {
        id: 'LOAN002',
        type: 'Personal Loan',
        provider: 'ICICI Bank',
        principalAmount: 300000,
        outstandingAmount: 125000,
        emi: 8500,
        interestRate: 11.5,
        tenure: 36,
        remainingTenure: 15,
        status: 'Active',
        disbursementDate: new Date(2023, 7, 20),
        lastPaymentDate: new Date(2025, 2, 10),
        nextDueDate: new Date(2025, 3, 10)
      }
    ];

    // Compile comprehensive data
    const comprehensiveData = {
      // Basic credit score info
      score: profile.creditScore.score,
      grade: profile.creditScore.grade,
      lastUpdated: profile.creditScore.lastUpdated,
      
      // Credit limits
      totalCredit: profile.creditScore.totalCreditLimit,
      availableCredit: profile.creditScore.totalCreditLimit * (1 - profile.creditScore.creditUtilization / 100),
      utilizationRatio: profile.creditScore.creditUtilization,
      
      // Credit cards
      creditCards: profile.creditScore.creditCards || [],
      creditCardSummary: profile.creditScore.creditCardSummary || {},
      creditCardRecommendations: profile.creditScore.creditCardRecommendations || [],
      
      // Loans
      loans: mockLoans,
      loanSummary: {
        totalLoans: mockLoans.length,
        totalPrincipal: mockLoans.reduce((sum, loan) => sum + loan.principalAmount, 0),
        totalOutstanding: mockLoans.reduce((sum, loan) => sum + loan.outstandingAmount, 0),
        totalEMI: mockLoans.reduce((sum, loan) => sum + loan.emi, 0),
        activeLoans: mockLoans.filter(loan => loan.status === 'Active').length
      },
      
      // Historical data
      history: generateHistoricalScores(),
      
      // Factors and recommendations
      factors: profile.creditScore.factors || [],
      recommendations: profile.creditScore.recommendations || [],
      
      // Account summary
      accounts: profile.creditScore.accounts || {
        total: (profile.creditScore.creditCards?.length || 0) + mockLoans.length,
        open: (profile.creditScore.creditCards?.length || 0) + mockLoans.filter(l => l.status === 'Active').length,
        closed: 0
      },
      
      // Additional insights
      percentile: profile.creditScore.percentile || 75,
      panNumber: profile.panNumber
    };

    res.json({
      success: true,
      data: comprehensiveData,
      message: 'Comprehensive credit report fetched successfully'
    });

  } catch (error) {
    logger.error('Comprehensive credit detail fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive credit details',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/financial/credit-impact
 * @desc    Analyze financial behavior impact on credit score
 * @access  Private
 */
router.post('/credit-impact', authenticate, async (req, res) => {
  try {
    const { dateRange } = req.body;
    
    // Get user transactions
    const dateFilter = {};
    if (dateRange?.startDate) dateFilter.$gte = new Date(dateRange.startDate);
    if (dateRange?.endDate) dateFilter.$lte = new Date(dateRange.endDate);

    const transactions = await Transaction.find({
      userId: req.user._id,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    });

    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    const currentScore = profile?.creditScore?.score || 700; // Default if not available

    const impactAnalysis = await cibilService.analyzeCreditImpact(transactions, currentScore);
    
    res.json({
      success: true,
      data: impactAnalysis,
      message: 'Credit impact analysis completed'
    });

  } catch (error) {
    logger.error('Credit impact analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze credit impact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/financial/profile-status
 * @desc    Check user profile status for credit score eligibility
 * @access  Private
 */
router.get('/profile-status', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    logger.info(`Profile status check for user ${req.user._id}:`, {
      hasProfile: !!profile,
      fullName: profile?.fullName || 'missing',
      panNumber: profile?.panNumber ? 'present' : 'missing',
      dateOfBirth: profile?.dateOfBirth ? 'present' : 'missing',
      phoneNumber: profile?.phoneNumber || 'missing'
    });
    
    if (!profile) {
      return res.json({
        success: true,
        data: {
          hasProfile: false,
          canFetchCreditScore: false,
          missingFields: ['All profile fields required'],
          message: 'Please complete your profile first'
        }
      });
    }

    const missingFields = [];
    if (!profile.fullName) missingFields.push('Full Name');
    if (!profile.panNumber) missingFields.push('PAN Number');
    if (!profile.dateOfBirth) missingFields.push('Date of Birth');
    if (!profile.phoneNumber) missingFields.push('Phone Number');

    const canFetchCreditScore = missingFields.length === 0;

    res.json({
      success: true,
      data: {
        hasProfile: true,
        canFetchCreditScore,
        missingFields,
        hasCreditScore: !!profile.creditScore?.score,
        lastCreditUpdate: profile.creditScore?.lastUpdated,
        message: canFetchCreditScore ? 
          'Ready to fetch credit score' : 
          `Missing required fields: ${missingFields.join(', ')}`
      }
    });
  } catch (error) {
    logger.error('Profile status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check profile status'
    });
  }
});

/**
 * @route   GET /api/financial/test
 * @desc    Test endpoint for connectivity
 * @access  Public
 */
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'Financial API is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/financial/quick-expense
 * @desc    Add a quick expense entry
 * @access  Private
 */
router.post('/quick-expense', authenticate, async (req, res) => {
  try {
    const { description, amount, category, date, currency } = req.body;

    // Validate input
    if (!description || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid description and amount are required'
      });
    }

    const expenseDate = date ? new Date(date) : new Date();
    const expenseCurrency = currency || 'INR';

    // Create transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      description: description.trim(),
      amount: Math.abs(parseFloat(amount)),
      currency: expenseCurrency,
      type: 'debit',
      category: category || 'other',
      date: expenseDate,
      source: 'quick_entry',
      paymentMethod: 'cash',
      merchant: null,
      ai_category: category || 'other',
      ai_confidence: 1.0,
      tags: ['quick_entry', 'manual']
    });

    const symbol = currencyService.getCurrencySymbol(expenseCurrency);
    logger.info(`Quick expense added for user ${req.user._id}: ${description} - ${symbol}${amount}`);

    // Check budget limits and send alert if exceeded
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (profile && profile.budgetLimits) {
      const categoryBudget = profile.budgetLimits.get(category);
      if (categoryBudget) {
        // Get category spending for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlySpending = await Transaction.aggregate([
          {
            $match: {
              userId: req.user._id,
              type: 'debit',
              $or: [{ category }, { ai_category: category }],
              date: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]);

        const spent = monthlySpending[0]?.total || 0;
        const percentUsed = (spent / categoryBudget) * 100;

        // Send budget alert data
        let budgetAlert = null;
        if (percentUsed >= 100) {
          budgetAlert = {
            type: 'exceeded',
            category,
            spent,
            budget: categoryBudget,
            percentUsed: Math.round(percentUsed)
          };
        } else if (percentUsed >= 80) {
          budgetAlert = {
            type: 'warning',
            category,
            spent,
            budget: categoryBudget,
            percentUsed: Math.round(percentUsed)
          };
        }

        if (budgetAlert) {
          res.json({
            success: true,
            message: 'Expense added successfully',
            data: {
              transaction: {
                _id: transaction._id,
                description: transaction.description,
                amount: transaction.amount,
                category: transaction.category,
                date: transaction.date
              },
              budgetAlert
            }
          });
          return;
        }
      }
    }

    res.json({
      success: true,
      message: 'Expense added successfully',
      data: {
        transaction: {
          _id: transaction._id,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date
        }
      }
    });
  } catch (error) {
    logger.error('Quick expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add expense'
    });
  }
});

/**
 * @route   GET /api/financial/quick-expenses
 * @desc    Get quick expenses for a specific date
 * @access  Private
 */
router.get('/quick-expenses', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expenses = await Transaction.find({
      userId: req.user._id,
      source: 'quick_entry',
      type: 'debit',
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .sort({ date: -1 })
    .select('description amount category date');

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,
      data: {
        expenses,
        total,
        date: targetDate.toISOString().split('T')[0],
        count: expenses.length
      }
    });
  } catch (error) {
    logger.error('Get quick expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load expenses'
    });
  }
});

/**
 * @route   DELETE /api/financial/quick-expense/:id
 * @desc    Delete a quick expense entry
 * @access  Private
 */
router.delete('/quick-expense/:id', authenticate, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
      source: 'quick_entry'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await transaction.deleteOne();

    logger.info(`Quick expense deleted for user ${req.user._id}: ${transaction.description}`);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    logger.error('Delete quick expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense'
    });
  }
});

/**
 * Get expense history with filters
 * @route   GET /api/financial/expense-history
 * @access  Private
 */
router.get('/expense-history', authenticate, async (req, res) => {
  try {
    const { search, category, range = 'month' } = req.query;
    
    // Build query
    const query = {
      userId: req.user._id,
      type: 'debit'
    };

    // Add category filter
    if (category) {
      query.$or = [
        { category },
        { ai_category: category }
      ];
    }

    // Add date range filter
    const now = new Date();
    let startDate;
    
    switch(range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = null;
    }

    if (startDate) {
      query.date = { $gte: startDate };
    }

    // Get transactions
    let transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(500); // Limit to 500 most recent

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t => 
        t.description?.toLowerCase().includes(searchLower) ||
        t.merchant?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      expenses: transactions
    });
  } catch (error) {
    logger.error('Get expense history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense history'
    });
  }
});

/**
 * Get expense templates
 * @route   GET /api/financial/expense-templates
 * @access  Private
 */
router.get('/expense-templates', authenticate, async (req, res) => {
  try {
    // For now, we'll store templates in user's profile as metadata
    // In production, you might want a separate ExpenseTemplate model
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    const templates = profile?.expenseTemplates || [];
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error('Get expense templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

/**
 * Save expense template
 * @route   POST /api/financial/expense-template
 * @access  Private
 */
router.post('/expense-template', authenticate, async (req, res) => {
  try {
    const { description, amount, category } = req.body;

    if (!description || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Description, amount, and category are required'
      });
    }

    // Find or create profile
    let profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new FinancialProfile({ userId: req.user._id });
    }

    // Initialize templates array if not exists
    if (!profile.expenseTemplates) {
      profile.expenseTemplates = [];
    }

    // Add new template
    const template = {
      _id: new mongoose.Types.ObjectId(),
      description,
      amount,
      category,
      createdAt: new Date()
    };

    profile.expenseTemplates.push(template);
    await profile.save();

    res.json({
      success: true,
      message: 'Template saved successfully',
      template
    });
  } catch (error) {
    logger.error('Save expense template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save template'
    });
  }
});

/**
 * Delete expense template
 * @route   DELETE /api/financial/expense-template/:id
 * @access  Private
 */
router.delete('/expense-template/:id', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.expenseTemplates) {
      return res.status(404).json({
        success: false,
        message: 'No templates found'
      });
    }

    // Remove template by ID
    profile.expenseTemplates = profile.expenseTemplates.filter(
      t => t._id.toString() !== req.params.id
    );

    await profile.save();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Delete expense template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

/**
 * Export expenses to CSV
 * @route   GET /api/financial/export-expenses
 * @access  Private
 */
router.get('/export-expenses', authenticate, async (req, res) => {
  try {
    const { category, range = 'all' } = req.query;
    
    // Build query
    const query = {
      userId: req.user._id,
      type: 'debit'
    };

    // Add category filter
    if (category) {
      query.$or = [
        { category },
        { ai_category: category }
      ];
    }

    // Add date range filter
    const now = new Date();
    let startDate;
    
    switch(range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = null;
    }

    if (startDate) {
      query.date = { $gte: startDate };
    }

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ date: -1 });

    // Generate CSV
    const csvHeader = 'Date,Description,Category,Amount,Payment Method,Merchant\n';
    const csvRows = transactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('en-IN');
      const desc = (t.description || '').replace(/,/g, ';'); // Replace commas to avoid CSV issues
      const cat = t.category || t.ai_category || 'other';
      const amount = t.amount;
      const payment = t.paymentMethod || 'cash';
      const merchant = (t.merchant || '').replace(/,/g, ';');
      
      return `${date},"${desc}",${cat},${amount},${payment},"${merchant}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Export expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses'
    });
  }
});

/**
 * Get all bill reminders
 * @route   GET /api/financial/bill-reminders
 * @access  Private
 */
router.get('/bill-reminders', authenticate, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    
    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    // Get upcoming bills (due in next 7 days)
    if (upcoming === 'true') {
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      query.dueDate = { $gte: now, $lte: next7Days };
      query.status = { $in: ['pending', 'overdue'] };
    }
    
    const bills = await BillReminder.find(query)
      .sort({ dueDate: 1 });
    
    res.json({
      success: true,
      bills
    });
  } catch (error) {
    logger.error('Get bill reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill reminders'
    });
  }
});

/**
 * Create bill reminder
 * @route   POST /api/financial/bill-reminder
 * @access  Private
 */
router.post('/bill-reminder', authenticate, async (req, res) => {
  try {
    const { title, description, amount, category, dueDate, frequency, reminderDays, autoCreateExpense } = req.body;
    
    if (!title || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, amount, and due date are required'
      });
    }
    
    const bill = new BillReminder({
      userId: req.user._id,
      title,
      description,
      amount,
      category: category || 'bills',
      dueDate: new Date(dueDate),
      frequency: frequency || 'once',
      reminderDays: reminderDays || 3,
      autoCreateExpense: autoCreateExpense || false
    });
    
    // Calculate next due date for recurring bills
    if (frequency !== 'once') {
      bill.nextDueDate = bill.calculateNextDueDate();
    }
    
    await bill.save();
    
    logger.info(`Bill reminder created for user ${req.user._id}: ${title}`);
    
    res.json({
      success: true,
      message: 'Bill reminder created successfully',
      bill
    });
  } catch (error) {
    logger.error('Create bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill reminder'
    });
  }
});

/**
 * Update bill reminder
 * @route   PUT /api/financial/bill-reminder/:id
 * @access  Private
 */
router.put('/bill-reminder/:id', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    const { title, description, amount, category, dueDate, frequency, reminderDays, autoCreateExpense, notes } = req.body;
    
    if (title) bill.title = title;
    if (description !== undefined) bill.description = description;
    if (amount) bill.amount = amount;
    if (category) bill.category = category;
    if (dueDate) bill.dueDate = new Date(dueDate);
    if (frequency) bill.frequency = frequency;
    if (reminderDays !== undefined) bill.reminderDays = reminderDays;
    if (autoCreateExpense !== undefined) bill.autoCreateExpense = autoCreateExpense;
    if (notes !== undefined) bill.notes = notes;
    
    // Recalculate next due date if frequency changed
    if (frequency && frequency !== 'once') {
      bill.nextDueDate = bill.calculateNextDueDate();
    }
    
    await bill.save();
    
    res.json({
      success: true,
      message: 'Bill reminder updated successfully',
      bill
    });
  } catch (error) {
    logger.error('Update bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill reminder'
    });
  }
});

/**
 * Mark bill as paid
 * @route   POST /api/financial/bill-reminder/:id/pay
 * @access  Private
 */
router.post('/bill-reminder/:id/pay', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    const { paidAmount, paidDate, notes } = req.body;
    
    bill.isPaid = true;
    bill.status = 'paid';
    bill.paidAmount = paidAmount || bill.amount;
    bill.paidDate = paidDate ? new Date(paidDate) : new Date();
    if (notes) bill.notes = notes;
    
    await bill.save();
    
    // Create expense transaction if enabled
    if (bill.autoCreateExpense) {
      const transaction = new Transaction({
        userId: req.user._id,
        type: 'debit',
        source: 'bill_payment',
        description: bill.title,
        amount: bill.paidAmount,
        category: bill.category,
        date: bill.paidDate,
        paymentMethod: 'cash'
      });
      
      await transaction.save();
    }
    
    // Create next recurring bill if applicable
    if (bill.frequency !== 'once') {
      const nextBill = new BillReminder({
        userId: bill.userId,
        title: bill.title,
        description: bill.description,
        amount: bill.amount,
        category: bill.category,
        dueDate: bill.nextDueDate || bill.calculateNextDueDate(),
        frequency: bill.frequency,
        reminderDays: bill.reminderDays,
        autoCreateExpense: bill.autoCreateExpense
      });
      
      nextBill.nextDueDate = nextBill.calculateNextDueDate();
      await nextBill.save();
    }
    
    res.json({
      success: true,
      message: 'Bill marked as paid',
      bill
    });
  } catch (error) {
    logger.error('Mark bill paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark bill as paid'
    });
  }
});

/**
 * Delete bill reminder
 * @route   DELETE /api/financial/bill-reminder/:id
 * @access  Private
 */
router.delete('/bill-reminder/:id', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bill reminder deleted successfully'
    });
  } catch (error) {
    logger.error('Delete bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill reminder'
    });
  }
});

/**
 * Get upcoming bill notifications
 * @route   GET /api/financial/bill-notifications
 * @access  Private
 */
router.get('/bill-notifications', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    // Find bills that need notification
    const bills = await BillReminder.find({
      userId: req.user._id,
      status: { $in: ['pending', 'overdue'] }
    });
    
    const notifications = [];
    
    bills.forEach(bill => {
      const daysUntilDue = Math.ceil((bill.dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Overdue bills
      if (daysUntilDue < 0) {
        notifications.push({
          billId: bill._id,
          type: 'overdue',
          title: bill.title,
          amount: bill.amount,
          daysOverdue: Math.abs(daysUntilDue),
          severity: 'high'
        });
      }
      // Bills due today
      else if (daysUntilDue === 0) {
        notifications.push({
          billId: bill._id,
          type: 'due-today',
          title: bill.title,
          amount: bill.amount,
          severity: 'high'
        });
      }
      // Upcoming bills within reminder period
      else if (daysUntilDue <= bill.reminderDays) {
        notifications.push({
          billId: bill._id,
          type: 'upcoming',
          title: bill.title,
          amount: bill.amount,
          daysUntilDue,
          severity: 'medium'
        });
      }
    });
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    logger.error('Get bill notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill notifications'
    });
  }
});

/**
 * Get supported currencies
 * @route   GET /api/financial/currencies
 * @access  Public
 */
router.get('/currencies', (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    res.json({
      success: true,
      currencies
    });
  } catch (error) {
    logger.error('Get currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currencies'
    });
  }
});

/**
 * Get current exchange rates
 * @route   GET /api/financial/exchange-rates
 * @access  Public
 */
router.get('/exchange-rates', (req, res) => {
  try {
    const ratesData = currencyService.getExchangeRates();
    res.json({
      success: true,
      ...ratesData
    });
  } catch (error) {
    logger.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates'
    });
  }
});

/**
 * Convert currency amount
 * @route   POST /api/financial/convert-currency
 * @access  Public
 */
router.post('/convert-currency', (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Amount, from currency, and to currency are required'
      });
    }
    
    const convertedAmount = currencyService.convertCurrency(
      parseFloat(amount),
      from,
      to
    );
    
    res.json({
      success: true,
      originalAmount: parseFloat(amount),
      originalCurrency: from,
      convertedAmount,
      convertedCurrency: to,
      rate: convertedAmount / parseFloat(amount)
    });
  } catch (error) {
    logger.error('Convert currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency'
    });
  }
});

/**
 * Get user's expenses in different currency
 * @route   GET /api/financial/expenses-in-currency/:currency
 * @access  Private
 */
router.get('/expenses-in-currency/:currency', authenticate, async (req, res) => {
  try {
    const { currency } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = {
      userId: req.user._id,
      type: 'debit'
    };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const expenses = await Transaction.find(query).sort({ date: -1 });
    
    // Convert all expenses to target currency
    const convertedExpenses = expenses.map(expense => {
      const originalAmount = expense.amount;
      const originalCurrency = expense.currency || 'USD';
      const convertedAmount = currencyService.convertCurrency(
        originalAmount,
        originalCurrency,
        currency
      );
      
      return {
        _id: expense._id,
        description: expense.description,
        originalAmount,
        originalCurrency,
        convertedAmount,
        convertedCurrency: currency,
        category: expense.category,
        date: expense.date
      };
    });
    
    const total = convertedExpenses.reduce((sum, exp) => sum + exp.convertedAmount, 0);
    
    res.json({
      success: true,
      expenses: convertedExpenses,
      total,
      currency
    });
  } catch (error) {
    logger.error('Get expenses in currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses in target currency'
    });
  }
});

/**
 * @route GET /api/financial/analytics/document-summary
 * @desc Get comprehensive summary of ALL documents and transactions for a user
 * @desc This endpoint aggregates data across ALL uploaded and processed documents
 * @access Private
 */
router.get('/analytics/document-summary', authenticate, async (req, res) => {
  try {
    logger.info(`Fetching document summary for user: ${req.user._id}`);

    // Get all completed documents for the user with extractedData
    const documents = await Document.find({
      userId: req.user._id,
      processingStatus: 'completed'
    }).select('_id originalFileName createdAt transactionCount extractedData');

    logger.info(`Found ${documents.length} completed documents`);

    // Get ALL transactions for the user (no date filter)
    const allTransactions = await Transaction.find({
      userId: req.user._id
    });

    logger.info(`Found ${allTransactions.length} total transactions`);

    // Calculate comprehensive aggregations
    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionsByDocument = {};
    let transactionsByCategory = {};
    let transactionsByMonth = {};

    allTransactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      
      // Income vs Expenses
      if (transaction.type === 'credit') {
        totalIncome += amount;
      } else if (transaction.type === 'debit') {
        totalExpenses += amount;
      }

      // By document
      const docId = transaction.documentId?.toString() || 'unknown';
      if (!transactionsByDocument[docId]) {
        transactionsByDocument[docId] = {
          count: 0,
          income: 0,
          expenses: 0,
          transactions: []
        };
      }
      transactionsByDocument[docId].count++;
      transactionsByDocument[docId].transactions.push(transaction._id);
      if (transaction.type === 'credit') {
        transactionsByDocument[docId].income += amount;
      } else {
        transactionsByDocument[docId].expenses += amount;
      }

      // By category
      const category = transaction.category || 'uncategorized';
      if (!transactionsByCategory[category]) {
        transactionsByCategory[category] = { count: 0, amount: 0 };
      }
      transactionsByCategory[category].count++;
      transactionsByCategory[category].amount += amount;

      // By month
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!transactionsByMonth[monthKey]) {
        transactionsByMonth[monthKey] = {
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0
        };
      }
      transactionsByMonth[monthKey].transactionCount++;
      if (transaction.type === 'credit') {
        transactionsByMonth[monthKey].income += amount;
      } else {
        transactionsByMonth[monthKey].expenses += amount;
      }
      transactionsByMonth[monthKey].net = transactionsByMonth[monthKey].income - transactionsByMonth[monthKey].expenses;
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

    // Format document details
    const documentDetails = documents.map(doc => {
      const docStats = transactionsByDocument[doc._id.toString()] || {
        count: 0,
        income: 0,
        expenses: 0
      };
      
      return {
        documentId: doc._id,
        fileName: doc.originalFileName,
        uploadDate: doc.createdAt,
        transactionCount: docStats.count,
        totalIncome: docStats.income,
        totalExpenses: docStats.expenses,
        netFlow: docStats.income - docStats.expenses
      };
    });

    // Sort categories by amount
    const topCategories = Object.entries(transactionsByCategory)
      .map(([category, data]) => ({
        category,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Sort months chronologically
    const monthlyData = Object.entries(transactionsByMonth)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate date range from statement periods in documents
    let earliestDate = null;
    let latestDate = null;
    
    // First, try to get date range from statement periods in document metadata
    const statementPeriods = documents
      .filter(doc => doc.extractedData && doc.extractedData.statementPeriod)
      .map(doc => doc.extractedData.statementPeriod);
    
    if (statementPeriods.length > 0) {
      logger.info(`Found ${statementPeriods.length} documents with statement periods`);
      
      const startDates = statementPeriods
        .map(sp => new Date(sp.startDate))
        .filter(d => !isNaN(d.getTime()));
      
      const endDates = statementPeriods
        .map(sp => new Date(sp.endDate))
        .filter(d => !isNaN(d.getTime()));
      
      if (startDates.length > 0 && endDates.length > 0) {
        earliestDate = new Date(Math.min(...startDates));
        latestDate = new Date(Math.max(...endDates));
        
        logger.info(`Date range from statement periods: ${earliestDate.toISOString()} to ${latestDate.toISOString()}`);
      }
    }
    
    // Fallback to transaction dates if no statement periods found
    if (!earliestDate || !latestDate) {
      if (allTransactions.length > 0) {
        logger.info('No statement periods found, using transaction dates');
        const now = new Date();
        const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
        const oneYearAhead = new Date(now.getFullYear() + 1, 11, 31);
        
        // Filter valid dates
        const validDates = allTransactions
          .map(t => new Date(t.date))
          .filter(d => !isNaN(d.getTime()) && d >= threeYearsAgo && d <= oneYearAhead);
        
        if (validDates.length > 0) {
          earliestDate = new Date(Math.min(...validDates));
          latestDate = new Date(Math.max(...validDates));
          
          // Additional validation: if range is > 3 years, log warning
          const daysDiff = (latestDate - earliestDate) / (1000 * 60 * 60 * 24);
          if (daysDiff > 1095) { // More than 3 years
            logger.warn(`Date range is ${Math.round(daysDiff)} days (${(daysDiff/365).toFixed(1)} years), which seems unrealistic.`);
            logger.warn(`Earliest: ${earliestDate.toISOString()}, Latest: ${latestDate.toISOString()}`);
            // Cap to 1 year from earliest for display
            latestDate = new Date(earliestDate.getTime() + (365 * 24 * 60 * 60 * 1000));
            logger.info(`Capped date range to 1 year for display: ${earliestDate.toISOString()} to ${latestDate.toISOString()}`);
          }
        }
      }
    }

    const summary = {
      overview: {
        totalDocuments: documents.length,
        totalTransactions: allTransactions.length,
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        averageTransactionValue: allTransactions.length > 0 ? (totalIncome + totalExpenses) / allTransactions.length : 0
      },
      documents: documentDetails,
      categories: topCategories,
      monthlyTrends: monthlyData,
      dateRange: {
        earliest: earliestDate ? earliestDate.toISOString() : null,
        latest: latestDate ? latestDate.toISOString() : null
      }
    };

    logger.info(`Document summary generated: ${documents.length} documents, ${allTransactions.length} transactions, ₹${totalIncome} income, ₹${totalExpenses} expenses`);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Document summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate document summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
