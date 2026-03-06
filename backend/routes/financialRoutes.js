const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const FinancialAnalysis = require('../models/FinancialAnalysis');
const FinancialProfile = require('../models/FinancialProfile');
const Transaction = require('../models/Transaction');
const Document = require('../models/Document');
const BillReminder = require('../models/BillReminder');
const EMI = require('../models/EMI');
const CreditCardBill = require('../models/CreditCardBill');
const Investment = require('../models/Investment');
const LoanGiven = require('../models/LoanGiven');
const { authenticate } = require('../middleware/auth');
const { invalidateCacheMiddleware, cacheMiddleware } = require('../middleware/cacheMiddleware');
const { processMultipleDocuments, categorizeTransaction, detectRecurringTransactions } = require('../services/documentProcessor');
const { performFinancialAnalysis } = require('../services/financialAIService');
const gmailService = require('../services/gmailService');
const cibilService = require('../services/cibilService');
const websocketService = require('../services/websocketService');
const currencyService = require('../services/currencyService');
const TransactionFilterService = require('../services/transactionFilterService');
const { getUserDocumentPassword } = require('../utils/documentPasswordGenerator');
const User = require('../models/User');
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
      limit = 10000, // Increase default limit to support all transactions
      category,
      type,
      source,
      paymentMethod,
      startDate,
      endDate,
      search,
      sort
    } = req.query;

    // Build filter
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    const sortOrder = sort ? sort : '-date';

    const transactions = await Transaction.find(filter)
      .populate('documentId', 'originalFileName category')
      .sort(sortOrder)
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
        _id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        merchantName: t.merchantName,
        paymentMethod: t.paymentMethod,
        source: t.source,
        confidence: t.confidence,
        isVerified: t.isVerified,
        isRecurring: t.isRecurring,
        tags: t.tags,
        ai_category: t.ai_category,
        emailMetadata: t.emailMetadata,
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

// ── Transaction CRUD (POST/PUT/DELETE) ──────────────────────────────────
router.post('/transactions', authenticate, async (req, res) => {
  try {
    const txn = await Transaction.create({ ...req.body, userId: req.user._id, amount: parseFloat(req.body.amount) });
    res.status(201).json({ success: true, data: txn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/transactions/:id', authenticate, async (req, res) => {
  try {
    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: txn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/transactions/:id', authenticate, async (req, res) => {
  try {
    const txn = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Cleanup: remove future-dated + duplicate transactions ───────────────
router.post('/transactions/cleanup', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Delete future-dated transactions
    const futureResult = await Transaction.deleteMany({
      userId,
      date: { $gt: tomorrow }
    });

    // 2. Find and remove duplicates (same amount + date + description)
    const pipeline = [
      { $match: { userId } },
      { $group: {
        _id: { amount: '$amount', date: '$date', description: '$description' },
        ids: { $push: '$_id' },
        count: { $sum: 1 }
      }},
      { $match: { count: { $gt: 1 } } }
    ];
    const duplicates = await Transaction.aggregate(pipeline);
    let dupCount = 0;
    for (const dup of duplicates) {
      // Keep the first, delete the rest
      const idsToDelete = dup.ids.slice(1);
      await Transaction.deleteMany({ _id: { $in: idsToDelete } });
      dupCount += idsToDelete.length;
    }

    res.json({
      success: true,
      data: {
        futureDeleted: futureResult.deletedCount,
        duplicatesRemoved: dupCount,
        total: futureResult.deletedCount + dupCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Income endpoint ─────────────────────────────────────────────────────
router.get('/income', authenticate, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const since = new Date();
    since.setMonth(since.getMonth() - parseInt(months));
    
    const incomeTransactions = await Transaction.find({
      userId: req.user._id,
      type: { $in: ['credit', 'income'] },
      date: { $gte: since }
    }).sort({ date: -1 }).lean();

    // Group by month
    const monthly = {};
    for (const txn of incomeTransactions) {
      const key = new Date(txn.date).toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { month: key, total: 0, transactions: [] };
      monthly[key].total += Math.abs(txn.amount || 0);
      monthly[key].transactions.push(txn);
    }

    const totalIncome = incomeTransactions.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const sources = {};
    for (const txn of incomeTransactions) {
      const src = txn.category || txn.merchantName || 'Other';
      sources[src] = (sources[src] || 0) + Math.abs(txn.amount || 0);
    }

    res.json({
      success: true,
      data: {
        transactions: incomeTransactions,
        totalIncome,
        monthlyBreakdown: Object.values(monthly).sort((a, b) => b.month.localeCompare(a.month)),
        sources: Object.entries(sources).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
        count: incomeTransactions.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Credit Card CRUD ────────────────────────────────────────────────────
router.post('/credit-cards', authenticate, async (req, res) => {
  try {
    const CreditCardBill = require('../models/CreditCardBill');
    const card = await CreditCardBill.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/credit-cards/:id/payment', authenticate, async (req, res) => {
  try {
    const CreditCardBill = require('../models/CreditCardBill');
    const card = await CreditCardBill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $inc: { amountPaid: req.body.amount, balance: -req.body.amount } },
      { new: true }
    );
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Splits redirect ─────────────────────────────────────────────────────
router.get('/splits', authenticate, async (req, res) => {
  try {
    const SplitExpense = require('../models/SplitExpense');
    const Group = require('../models/Group');
    const [groups, expenses] = await Promise.all([
      Group.find({ members: req.user._id }).lean(),
      SplitExpense.find({ $or: [{ paidBy: req.user._id }, { 'shares.user': req.user._id }] }).sort('-date').limit(50).lean()
    ]);
    res.json({ success: true, data: { groups, expenses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/financial/transactions/filters
 * @desc Get available filter values for transactions
 * @access Private
 */
router.get('/transactions/filters', authenticate, async (req, res) => {
  try {
    const filters = await TransactionFilterService.getAvailableFilters(
      Transaction,
      req.user._id.toString()
    );

    res.json({
      success: true,
      filters
    });
  } catch (error) {
    logger.error('Get transaction filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filter options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/financial/transactions/analytics
 * @desc Get transaction analytics with grouping
 * @access Private
 */
router.get('/transactions/analytics', authenticate, async (req, res) => {
  try {
    const pipeline = TransactionFilterService.buildAnalyticsPipeline(
      req.user._id,
      req.query
    );

    const results = await Transaction.aggregate(pipeline);

    res.json({
      success: true,
      data: results,
      groupBy: req.query.groupBy || 'none',
      count: results.length
    });
  } catch (error) {
    logger.error('Transaction analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
 * @route   GET /api/financial/monthly-trends-report
 * @desc    Get comprehensive monthly trends report with analytics
 * @access  Private
 */
router.get('/monthly-trends-report', authenticate, async (req, res) => {
  try {
    const { months = 12, startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = { userId: req.user._id };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(months));
      dateFilter.date = { $gte: start };
    }

    // Get all transactions
    const transactions = await Transaction.find(dateFilter).sort({ date: 1 });

    // Monthly aggregation
    const monthlyData = await Transaction.aggregate([
      { $match: dateFilter },
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

    // Process data by month
    const monthlyTrends = {};
    monthlyData.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          month: monthKey,
          year: item._id.year,
          monthNum: item._id.month,
          income: 0,
          expenses: 0,
          net: 0,
          savingsRate: 0,
          transactionCount: 0,
          categories: {},
          topExpenseCategory: '',
          topExpenseAmount: 0
        };
      }

      const trend = monthlyTrends[monthKey];
      
      if (item._id.type === 'credit') {
        trend.income += item.totalAmount;
      } else if (item._id.type === 'debit') {
        trend.expenses += item.totalAmount;
        
        // Track category expenses
        const cat = item._id.category || 'Uncategorized';
        trend.categories[cat] = (trend.categories[cat] || 0) + item.totalAmount;
        
        // Track top expense category
        if (item.totalAmount > trend.topExpenseAmount) {
          trend.topExpenseAmount = item.totalAmount;
          trend.topExpenseCategory = cat;
        }
      }
      
      trend.transactionCount += item.count;
    });

    // Calculate derived metrics
    const trendsArray = Object.values(monthlyTrends).map(trend => {
      trend.net = trend.income - trend.expenses;
      trend.savingsRate = trend.income > 0 ? ((trend.net / trend.income) * 100).toFixed(2) : 0;
      return trend;
    });

    // Calculate overall statistics
    const totalIncome = trendsArray.reduce((sum, t) => sum + t.income, 0);
    const totalExpenses = trendsArray.reduce((sum, t) => sum + t.expenses, 0);
    const avgMonthlyIncome = trendsArray.length > 0 ? totalIncome / trendsArray.length : 0;
    const avgMonthlyExpenses = trendsArray.length > 0 ? totalExpenses / trendsArray.length : 0;
    const avgSavingsRate = trendsArray.length > 0 
      ? trendsArray.reduce((sum, t) => sum + parseFloat(t.savingsRate), 0) / trendsArray.length 
      : 0;

    // Get category breakdown across all months
    const categoryTotals = {};
    trendsArray.forEach(trend => {
      Object.entries(trend.categories).forEach(([cat, amount]) => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      });
    });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: ((amount / totalExpenses) * 100).toFixed(2)
      }));

    // Trend analysis
    const firstMonth = trendsArray[0];
    const lastMonth = trendsArray[trendsArray.length - 1];
    const incomeGrowth = firstMonth && firstMonth.income > 0 
      ? (((lastMonth.income - firstMonth.income) / firstMonth.income) * 100).toFixed(2)
      : 0;
    const expenseGrowth = firstMonth && firstMonth.expenses > 0
      ? (((lastMonth.expenses - firstMonth.expenses) / firstMonth.expenses) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        monthlyTrends: trendsArray,
        summary: {
          totalIncome,
          totalExpenses,
          totalNet: totalIncome - totalExpenses,
          avgMonthlyIncome,
          avgMonthlyExpenses,
          avgSavingsRate: parseFloat(avgSavingsRate.toFixed(2)),
          totalTransactions: transactions.length,
          monthsAnalyzed: trendsArray.length
        },
        categoryBreakdown: topCategories,
        trendAnalysis: {
          incomeGrowth: parseFloat(incomeGrowth),
          expenseGrowth: parseFloat(expenseGrowth),
          savingsTrend: lastMonth && firstMonth 
            ? parseFloat(lastMonth.savingsRate) - parseFloat(firstMonth.savingsRate)
            : 0
        },
        dateRange: {
          start: startDate || (new Date(Date.now() - (months * 30 * 24 * 60 * 60 * 1000))).toISOString().split('T')[0],
          end: endDate || new Date().toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    logger.error('Monthly trends report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly trends report'
    });
  }
});

/**
 * @route   GET /api/financial/monthly-trends-report/export/pdf
 * @desc    Export monthly trends report as PDF
 * @access  Private
 */
router.get('/monthly-trends-report/export/pdf', authenticate, async (req, res) => {
  try {
    const { months = 12, startDate, endDate } = req.query;
    const userId = req.user._id;

    logger.info(`Exporting Monthly Trends PDF for user: ${userId}`);

    // Generate password from user info
    const password = await getUserDocumentPassword(userId, User, FinancialProfile);

    // Calculate date range
    let dateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(months));
      dateFilter.date = { $gte: start };
    }

    // Get monthly data
    const monthlyData = await Transaction.aggregate([
      { $match: dateFilter },
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

    // Process data
    const monthlyTrends = {};
    monthlyData.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          transactionCount: 0,
          categories: {}
        };
      }

      const trend = monthlyTrends[monthKey];
      
      if (item._id.type === 'credit') {
        trend.income += item.totalAmount;
      } else if (item._id.type === 'debit') {
        trend.expenses += item.totalAmount;
        const cat = item._id.category || 'Uncategorized';
        trend.categories[cat] = (trend.categories[cat] || 0) + item.totalAmount;
      }
      
      trend.transactionCount += item.count;
    });

    const trendsArray = Object.values(monthlyTrends).map(trend => {
      trend.net = trend.income - trend.expenses;
      trend.savingsRate = trend.income > 0 ? ((trend.net / trend.income) * 100).toFixed(2) : 0;
      return trend;
    });

    // Calculate statistics
    const totalIncome = trendsArray.reduce((sum, t) => sum + t.income, 0);
    const totalExpenses = trendsArray.reduce((sum, t) => sum + t.expenses, 0);
    const avgMonthlyIncome = trendsArray.length > 0 ? totalIncome / trendsArray.length : 0;
    const avgMonthlyExpenses = trendsArray.length > 0 ? totalExpenses / trendsArray.length : 0;

    // Generate charts
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' });

    // Chart 1: Income vs Expenses Line Chart
    const lineChartConfig = {
      type: 'line',
      data: {
        labels: trendsArray.map(t => t.month),
        datasets: [
          {
            label: 'Income',
            data: trendsArray.map(t => t.income),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4
          },
          {
            label: 'Expenses',
            data: trendsArray.map(t => t.expenses),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Monthly Income vs Expenses Trend', font: { size: 16 } },
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    // Chart 2: Savings Rate Bar Chart
    const savingsChartConfig = {
      type: 'bar',
      data: {
        labels: trendsArray.map(t => t.month),
        datasets: [{
          label: 'Savings Rate (%)',
          data: trendsArray.map(t => parseFloat(t.savingsRate)),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Monthly Savings Rate', font: { size: 16 } },
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Percentage (%)' } }
        }
      }
    };

    // Chart 3: Net Savings Bar Chart
    const netChartConfig = {
      type: 'bar',
      data: {
        labels: trendsArray.map(t => t.month),
        datasets: [{
          label: 'Net Savings',
          data: trendsArray.map(t => t.net),
          backgroundColor: trendsArray.map(t => t.net >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
          borderColor: trendsArray.map(t => t.net >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'),
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Monthly Net Savings', font: { size: 16 } },
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    const [chart1, chart2, chart3] = await Promise.all([
      chartJSNodeCanvas.renderToBuffer(lineChartConfig),
      chartJSNodeCanvas.renderToBuffer(savingsChartConfig),
      chartJSNodeCanvas.renderToBuffer(netChartConfig)
    ]);

    // Create PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly_Trends_Report_${Date.now()}.pdf`);
    res.setHeader('X-Document-Password', password);
    
    // Note: PDFKit doesn't support native password protection
    // The password is sent via header for user information

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('MONTHLY TRENDS REPORT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Period: ${startDate || 'Last ' + months + ' months'} to ${endDate || 'Today'}`);
    doc.moveDown();

    // Summary Section
    doc.fontSize(14).font('Helvetica-Bold').text('SUMMARY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Income: ${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Total Expenses: ${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Total Net: ${(totalIncome - totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Average Monthly Income: ${avgMonthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Average Monthly Expenses: ${avgMonthlyExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Months Analyzed: ${trendsArray.length}`);
    doc.moveDown(2);

    // Charts
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('VISUALIZATION CHARTS', { align: 'center' });
    doc.moveDown();
    doc.image(chart1, 50, doc.y, { width: 500 });
    
    doc.addPage();
    doc.image(chart2, 50, 50, { width: 500 });
    doc.moveDown(20);
    doc.image(chart3, 50, doc.y + 20, { width: 500 });

    // Monthly Details
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('MONTHLY BREAKDOWN', { underline: true });
    doc.moveDown();
    
    trendsArray.forEach((trend, idx) => {
      if (idx > 0 && idx % 3 === 0) doc.addPage();
      
      doc.fontSize(12).font('Helvetica-Bold').text(`Month: ${trend.month}`);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Income: ${trend.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      doc.text(`Expenses: ${trend.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      doc.text(`Net: ${trend.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      doc.text(`Savings Rate: ${trend.savingsRate}%`);
      doc.text(`Transactions: ${trend.transactionCount}`);
      doc.moveDown();
    });

    doc.end();

  } catch (error) {
    logger.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF report'
      });
    }
  }
});

/**
 * @route   GET /api/financial/monthly-trends-report/export/excel
 * @desc    Export monthly trends report as Excel
 * @access  Private
 */
router.get('/monthly-trends-report/export/excel', authenticate, async (req, res) => {
  try {
    const { months = 12, startDate, endDate } = req.query;
    const userId = req.user._id;

    logger.info(`Exporting Monthly Trends Excel for user: ${userId}`);

    // Calculate date range
    let dateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(months));
      dateFilter.date = { $gte: start };
    }

    // Get monthly data
    const monthlyData = await Transaction.aggregate([
      { $match: dateFilter },
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

    // Process data
    const monthlyTrends = {};
    const categoryTotals = {};
    
    monthlyData.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          transactionCount: 0,
          categories: {}
        };
      }

      const trend = monthlyTrends[monthKey];
      
      if (item._id.type === 'credit') {
        trend.income += item.totalAmount;
      } else if (item._id.type === 'debit') {
        trend.expenses += item.totalAmount;
        const cat = item._id.category || 'Uncategorized';
        trend.categories[cat] = (trend.categories[cat] || 0) + item.totalAmount;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.totalAmount;
      }
      
      trend.transactionCount += item.count;
    });

    const trendsArray = Object.values(monthlyTrends).map(trend => {
      trend.net = trend.income - trend.expenses;
      trend.savingsRate = trend.income > 0 ? ((trend.net / trend.income) * 100).toFixed(2) : 0;
      return trend;
    });

    // Calculate statistics
    const totalIncome = trendsArray.reduce((sum, t) => sum + t.income, 0);
    const totalExpenses = trendsArray.reduce((sum, t) => sum + t.expenses, 0);

    // Create Excel workbook
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: 'Period', value: `${startDate || 'Last ' + months + ' months'} to ${endDate || 'Today'}` },
      { metric: 'Total Income', value: totalIncome },
      { metric: 'Total Expenses', value: totalExpenses },
      { metric: 'Total Net', value: totalIncome - totalExpenses },
      { metric: 'Average Monthly Income', value: totalIncome / trendsArray.length },
      { metric: 'Average Monthly Expenses', value: totalExpenses / trendsArray.length },
      { metric: 'Months Analyzed', value: trendsArray.length }
    ]);

    summarySheet.getColumn('value').numFmt = '#,##0.00';
    summarySheet.getRow(1).font = { bold: true };

    // Sheet 2: Monthly Trends
    const trendsSheet = workbook.addWorksheet('Monthly Trends');
    trendsSheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Income', key: 'income', width: 15 },
      { header: 'Expenses', key: 'expenses', width: 15 },
      { header: 'Net', key: 'net', width: 15 },
      { header: 'Savings Rate (%)', key: 'savingsRate', width: 18 },
      { header: 'Transactions', key: 'transactionCount', width: 15 }
    ];

    trendsArray.forEach(trend => {
      trendsSheet.addRow({
        month: trend.month,
        income: trend.income,
        expenses: trend.expenses,
        net: trend.net,
        savingsRate: parseFloat(trend.savingsRate),
        transactionCount: trend.transactionCount
      });
    });

    trendsSheet.getColumn('income').numFmt = '#,##0.00';
    trendsSheet.getColumn('expenses').numFmt = '#,##0.00';
    trendsSheet.getColumn('net').numFmt = '#,##0.00';
    trendsSheet.getColumn('savingsRate').numFmt = '0.00';
    trendsSheet.getRow(1).font = { bold: true };

    // Sheet 3: Category Breakdown
    const categorySheet = workbook.addWorksheet('Category Breakdown');
    categorySheet.columns = [
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Total Amount', key: 'amount', width: 20 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, amount]) => {
        categorySheet.addRow({
          category,
          amount,
          percentage: ((amount / totalExpenses) * 100).toFixed(2)
        });
      });

    categorySheet.getColumn('amount').numFmt = '#,##0.00';
    categorySheet.getColumn('percentage').numFmt = '0.00';
    categorySheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly_Trends_Report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error('Excel export error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export Excel report'
      });
    }
  }
});

/**
 * @route   GET /api/financial/monthly-trends-report/export/csv
 * @desc    Export monthly trends report as CSV
 * @access  Private
 */
router.get('/monthly-trends-report/export/csv', authenticate, async (req, res) => {
  try {
    const { months = 12, startDate, endDate } = req.query;
    const userId = req.user._id;

    logger.info(`Exporting Monthly Trends CSV for user: ${userId}`);

    // Calculate date range
    let dateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
      const start = new Date();
      start.setMonth(start.getMonth() - parseInt(months));
      dateFilter.date = { $gte: start };
    }

    // Get monthly data
    const monthlyData = await Transaction.aggregate([
      { $match: dateFilter },
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
            type: '$type'
          },
          totalAmount: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Process data
    const monthlyTrends = {};
    
    monthlyData.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          transactionCount: 0
        };
      }

      const trend = monthlyTrends[monthKey];
      
      if (item._id.type === 'credit') {
        trend.income += item.totalAmount;
      } else if (item._id.type === 'debit') {
        trend.expenses += item.totalAmount;
      }
      
      trend.transactionCount += item.count;
    });

    const trendsArray = Object.values(monthlyTrends).map(trend => {
      trend.net = trend.income - trend.expenses;
      trend.savingsRate = trend.income > 0 ? ((trend.net / trend.income) * 100).toFixed(2) : 0;
      return trend;
    });

    // Generate CSV
    const csvRows = [
      ['Month', 'Income', 'Expenses', 'Net', 'Savings Rate (%)', 'Transactions']
    ];

    trendsArray.forEach(trend => {
      csvRows.push([
        trend.month,
        trend.income.toFixed(2),
        trend.expenses.toFixed(2),
        trend.net.toFixed(2),
        trend.savingsRate,
        trend.transactionCount
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly_Trends_Report_${Date.now()}.csv`);
    res.send(csvContent);

  } catch (error) {
    logger.error('CSV export error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export CSV report'
      });
    }
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

    // Use the stored (encrypted) PAN number from the user's profile
    // The panNumber stored in creditScore should be the full PAN
    const panNumber = profile.panNumber || profile.creditScore.panNumber;
    
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

    // Fetch real loan data from Debt model
    const Debt = require('../models/Debt');
    const userLoans = await Debt.find({ userId: req.user._id }).lean().catch(() => []);
    const realLoans = userLoans.map(loan => ({
      id: loan._id,
      type: loan.debtType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Loan',
      provider: loan.creditor?.name || 'Unknown',
      principalAmount: loan.loanDetails?.principalAmount || 0,
      outstandingAmount: loan.loanDetails?.currentBalance || 0,
      emi: loan.loanDetails?.emi || 0,
      interestRate: loan.loanDetails?.interestRate || 0,
      tenure: loan.loanDetails?.tenure || 0,
      remainingTenure: loan.loanDetails?.remainingTenure || 0,
      status: loan.loanDetails?.currentBalance > 0 ? 'Active' : 'Closed',
      disbursementDate: loan.loanDetails?.startDate,
      lastPaymentDate: loan.paymentHistory?.length > 0 ? loan.paymentHistory[loan.paymentHistory.length - 1].date : null,
      nextDueDate: loan.loanDetails?.maturityDate
    }));

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
      
      // Loans (real data from Debt model)
      loans: realLoans,
      loanSummary: {
        totalLoans: realLoans.length,
        totalPrincipal: realLoans.reduce((sum, loan) => sum + loan.principalAmount, 0),
        totalOutstanding: realLoans.reduce((sum, loan) => sum + loan.outstandingAmount, 0),
        totalEMI: realLoans.reduce((sum, loan) => sum + loan.emi, 0),
        activeLoans: realLoans.filter(loan => loan.status === 'Active').length
      },
      
      // Historical data
      history: generateHistoricalScores(),
      
      // Factors and recommendations
      factors: profile.creditScore.factors || [],
      recommendations: profile.creditScore.recommendations || [],
      
      // Account summary
      accounts: profile.creditScore.accounts || {
        total: (profile.creditScore.creditCards?.length || 0) + realLoans.length,
        open: (profile.creditScore.creditCards?.length || 0) + realLoans.filter(l => l.status === 'Active').length,
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
 * @route   GET /api/financial/summary
 * @desc    Get financial summary (income, expenses, savings, net worth)
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Comprehensive aggregation from ALL data sources
    const [
      currentIncome, currentExpense, lastIncome, lastExpense,
      activeEMIs, currentMonthCCBills, paidBillReminders,
      activeInvestments, currentMonthInvestments,
      loanRepayments, investmentDividends, profile
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId, type: 'credit', date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId, type: 'debit', date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId, type: 'credit', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId, type: 'debit', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // EMI: active EMIs
      EMI.find({ userId, status: 'active' }).lean().catch(() => []),
      // CC Bills: paid this month
      CreditCardBill.find({
        userId,
        paymentStatus: { $in: ['full_paid', 'partial_paid', 'minimum_paid'] },
        paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean().catch(() => []),
      // Bill Reminders: paid this month
      BillReminder.find({
        userId, isPaid: true,
        paidDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean().catch(() => []),
      // Active investments for portfolio value
      Investment.find({ userId, status: 'active' }).lean().catch(() => []),
      // New investments this month
      Investment.find({
        userId,
        purchaseDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean().catch(() => []),
      // Loan repayments received this month
      LoanGiven.find({
        userId,
        'repayments.date': { $gte: startOfMonth, $lte: endOfMonth }
      }).lean().catch(() => []),
      // Dividends this month
      Investment.find({
        userId,
        'dividends.date': { $gte: startOfMonth, $lte: endOfMonth }
      }).lean().catch(() => []),
      // Profile for monthly income
      FinancialProfile.findOne({ userId }).lean().catch(() => null)
    ]);

    // -- Comprehensive Expense --
    let totalExpense = currentExpense[0]?.total || 0;
    const emiTotal = activeEMIs.reduce((s, e) => s + (e.emiAmountInINR || e.emiAmount || 0), 0);
    const ccTotal = currentMonthCCBills.reduce((s, b) => s + (b.amountPaid || 0), 0);
    const billTotal = paidBillReminders.reduce((s, b) => s + (b.paidAmount || b.amount || 0), 0);
    totalExpense += emiTotal + ccTotal + billTotal;

    // -- Comprehensive Income --
    let totalIncome = currentIncome[0]?.total || 0;
    // Add profile monthly income if no salary credits found
    if (totalIncome === 0 && profile?.monthlyIncome) {
      totalIncome = profile.monthlyIncome;
    }
    const repaymentIncome = loanRepayments.reduce((sum, loan) => {
      return sum + (loan.repayments || [])
        .filter(r => new Date(r.date) >= startOfMonth && new Date(r.date) <= endOfMonth)
        .reduce((s, r) => s + (r.amountInINR || r.amount || 0), 0);
    }, 0);
    const dividendIncome = investmentDividends.reduce((sum, inv) => {
      return sum + (inv.dividends || [])
        .filter(d => new Date(d.date) >= startOfMonth && new Date(d.date) <= endOfMonth)
        .reduce((s, d) => s + (d.amount || 0), 0);
    }, 0);
    totalIncome += repaymentIncome + dividendIncome;

    // -- Investment total --
    const investmentTotal = currentMonthInvestments.reduce((s, i) => s + (i.totalInvestedAmount || 0), 0);
    const portfolioValue = activeInvestments.reduce((s, i) => s + (i.currentValue || i.totalInvestedAmount || 0), 0);

    const prevIncome = lastIncome[0]?.total || 0;
    const prevExpense = lastExpense[0]?.total || 0;

    const incomeGrowth = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0;
    const expenseGrowth = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0;
    const currentSavings = totalIncome - totalExpense;
    const prevSavings = prevIncome - prevExpense;
    const savingsGrowth = prevSavings > 0 ? Math.round(((currentSavings - prevSavings) / prevSavings) * 100) : 0;

    // Net worth from portfolio + profile
    let netWorth = portfolioValue;
    let totalAssets = portfolioValue;
    let totalLiabilities = 0;
    try {
      if (profile) {
        totalAssets += (profile.assets?.savings || 0) + (profile.assets?.investments || 0) + (profile.assets?.property || 0) + (profile.assets?.other || 0);
        totalLiabilities = (profile.liabilities?.loans || 0) + (profile.liabilities?.creditCards || 0) + (profile.liabilities?.other || 0);
      }
      // Add EMI outstanding as liabilities
      const emiLiabilities = activeEMIs.reduce((s, e) => s + ((e.emiAmountInINR || e.emiAmount || 0) * (e.remainingInstallments || 0)), 0);
      totalLiabilities += emiLiabilities;
      netWorth = totalAssets - totalLiabilities;
    } catch (e) {
      // Non-critical
    }

    res.json({
      success: true,
      totalIncome,
      totalExpense,
      incomeGrowth,
      expenseGrowth,
      savingsGrowth,
      netWorth,
      netWorthGrowth: 0,
      totalAssets,
      totalLiabilities,
      portfolioValue,
      totalActiveEMIs: activeEMIs.length,
      monthlyInvestments: investmentTotal,
      spendingBreakdown: {
        transactions: currentExpense[0]?.total || 0,
        emiPayments: emiTotal,
        creditCardBills: ccTotal,
        billReminders: billTotal
      }
    });
  } catch (error) {
    logger.error('Financial summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/financial/quick-expense
 * @desc    Add a quick expense entry
 * @access  Private
 */
router.post('/quick-expense', authenticate, invalidateCacheMiddleware([
  'dashboard:*',
  'budget:*',
  'transactions:*',
  'analytics:*',
  'api::userId:*'
]), async (req, res) => {
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

    const symbol = (currencyService.getCurrencySymbol && currencyService.getCurrencySymbol(expenseCurrency)) || expenseCurrency;
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
      message: error.message || 'Failed to add expense'
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
      .limit(500);

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t => 
        t.description?.toLowerCase().includes(searchLower) ||
        t.merchant?.toLowerCase().includes(searchLower)
      );
    }

    // Calculate category-wise totals
    const categoryTotals = {};
    let grandTotal = 0;
    transactions.forEach(t => {
      const cat = t.category || t.ai_category || 'other';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { count: 0, total: 0 };
      }
      categoryTotals[cat].count += 1;
      categoryTotals[cat].total += t.amount;
      grandTotal += t.amount;
    });

    // Calculate daily totals for sparkline
    const dailyMap = {};
    transactions.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + t.amount;
    });
    const dailyTotals = Object.entries(dailyMap)
      .map(([date, total]) => ({ date, total: Math.round(total) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find highest spending day
    const highestDay = dailyTotals.reduce((max, d) => d.total > (max?.total || 0) ? d : max, null);

    res.json({
      success: true,
      expenses: transactions,
      summary: {
        totalCount: transactions.length,
        grandTotal: Math.round(grandTotal),
        avgPerTransaction: transactions.length > 0 ? Math.round(grandTotal / transactions.length) : 0,
        categoryTotals,
        dailyTotals,
        highestSpendingDay: highestDay,
        dateRange: { start: startDate?.toISOString(), end: now.toISOString(), label: range }
      }
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
    const { description, amount, category, currency } = req.body;

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

    // Check for duplicate template
    const exists = profile.expenseTemplates.some(
      t => t.description.toLowerCase() === description.toLowerCase() && t.category === category
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A template with this description and category already exists'
      });
    }

    // Add new template
    const template = {
      _id: new mongoose.Types.ObjectId(),
      description,
      amount: parseFloat(amount),
      category,
      currency: currency || 'INR',
      usageCount: 0,
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
 * Update expense template
 * @route   PUT /api/financial/expense-template/:id
 * @access  Private
 */
router.put('/expense-template/:id', authenticate, async (req, res) => {
  try {
    const { description, amount, category, currency } = req.body;
    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile || !profile.expenseTemplates) {
      return res.status(404).json({ success: false, message: 'No templates found' });
    }

    const template = profile.expenseTemplates.id(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (description) template.description = description;
    if (amount) template.amount = parseFloat(amount);
    if (category) template.category = category;
    if (currency) template.currency = currency;

    await profile.save();

    res.json({ success: true, message: 'Template updated', template });
  } catch (error) {
    logger.error('Update expense template error:', error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

/**
 * Track template usage (called when a template is used to create an expense)
 * @route   POST /api/financial/expense-template/:id/use
 * @access  Private
 */
router.post('/expense-template/:id/use', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile || !profile.expenseTemplates) {
      return res.status(404).json({ success: false, message: 'No templates found' });
    }

    const template = profile.expenseTemplates.id(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    template.usageCount = (template.usageCount || 0) + 1;
    template.lastUsedAt = new Date();
    await profile.save();

    res.json({ success: true, template });
  } catch (error) {
    logger.error('Track template usage error:', error);
    res.status(500).json({ success: false, message: 'Failed to track usage' });
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
