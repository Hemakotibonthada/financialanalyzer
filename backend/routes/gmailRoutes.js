const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { authenticate } = require('../middleware/auth');
const GmailService = require('../services/gmailService');
const FinancialProfile = require('../models/FinancialProfile');
const Document = require('../models/Document');
const logger = require('../utils/logger');

/**
 * @route GET /api/gmail/auth-url
 * @desc Get Gmail OAuth authorization URL
 * @access Private
 */
router.get('/auth-url', authenticate, async (req, res) => {
  try {
    const authService = GmailService.getAuthInstance();
    const authUrl = authService.getAuthUrl();
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    logger.error('Gmail auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    });
  }
});

/**
 * @route POST /api/gmail/callback
 * @desc Handle Gmail OAuth callback
 * @access Private
 */
router.post('/callback', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // Use a temporary instance for token exchange
    const authService = GmailService.getAuthInstance();
    const tokens = await authService.getTokensFromCode(code);
    
    // Update user profile with Gmail settings
    let profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = new FinancialProfile({ userId: req.user._id });
    }

    // Create a user-specific instance to get profile info
    const userGmailService = GmailService.getUserInstance(tokens);
    
    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: userGmailService.oauth2Client });
    const userProfile = await gmail.users.getProfile({ userId: 'me' });
    
    profile.gmailSettings = {
      isConnected: true,
      email: userProfile.data.emailAddress,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      lastSync: null,
      lastFullSyncAt: null,
      initialSyncCompleted: false,
      initialSyncStartedAt: null,
      lastMessageInternalDate: null,
      lastHistoryId: null,
      totalMessagesSynced: 0,
      lastAttachmentSyncCount: 0
    };

    await profile.save();

    logger.info(`Gmail connected for user ${req.user._id}: ${userProfile.data.emailAddress}`);

    res.json({
      success: true,
      message: 'Gmail account connected successfully',
      email: userProfile.data.emailAddress
    });

  } catch (error) {
    logger.error('Gmail callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Gmail account'
    });
  }
});

/**
 * @route POST /api/gmail/disconnect
 * @desc Disconnect Gmail account
 * @access Private
 */
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    
    if (!profile || !profile.gmailSettings.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'No Gmail account connected'
      });
    }

    profile.gmailSettings = {
      isConnected: false,
      email: null,
      accessToken: null,
      refreshToken: null,
      lastSync: null,
      lastFullSyncAt: null,
      initialSyncCompleted: false,
      initialSyncStartedAt: null,
      lastMessageInternalDate: null,
      lastHistoryId: null,
      totalMessagesSynced: 0,
      lastAttachmentSyncCount: 0
    };

    await profile.save();

    logger.info(`Gmail disconnected for user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Gmail account disconnected successfully'
    });

  } catch (error) {
    logger.error('Gmail disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail account'
    });
  }
});

/**
 * @route POST /api/gmail/sync
 * @desc Sync financial documents from Gmail
 * @access Private
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    logger.info('Gmail sync endpoint called for user:', req.user._id);
    
    const { 
      maxResults = 50, 
      dateAfter = null, 
      dateBefore = null 
    } = req.body;

    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken');
    logger.info('Profile found for sync:', { found: !!profile, isConnected: profile?.gmailSettings?.isConnected });
    
    if (!profile || !profile.gmailSettings?.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Gmail account not connected'
      });
    }

    // Log the stored credentials info (safely)
    logger.info('Gmail credentials check:', {
      hasAccessToken: !!profile.gmailSettings.accessToken,
      hasRefreshToken: !!profile.gmailSettings.refreshToken,
      email: profile.gmailSettings.email
    });

    // Set credentials before performing any Gmail operations
    const credentials = {
      access_token: profile.gmailSettings.accessToken,
      refresh_token: profile.gmailSettings.refreshToken
    };
    
    const userGmailService = GmailService.getUserInstance(credentials);

    // Try using the existing access token first; only refresh if it fails
    // The access token from a fresh OAuth callback is valid for ~1 hour
    try {
      // Test the current token with a lightweight API call
      const testGmail = google.gmail({ version: 'v1', auth: userGmailService.oauth2Client });
      await testGmail.users.getProfile({ userId: 'me' });
      logger.info('Current access token is still valid');
    } catch (testError) {
      // Token expired or invalid — try to refresh
      if (profile.gmailSettings.refreshToken) {
        try {
          logger.info('Access token expired, attempting refresh');
          const { credentials: newCreds } = await userGmailService.oauth2Client.refreshToken(
            profile.gmailSettings.refreshToken
          );
          
          // Update stored tokens
          await FinancialProfile.findOneAndUpdate(
            { userId: req.user._id },
            { 
              $set: { 
                'gmailSettings.accessToken': newCreds.access_token,
                ...(newCreds.refresh_token && { 'gmailSettings.refreshToken': newCreds.refresh_token })
              }
            }
          );
          
          userGmailService.setCredentials({
            access_token: newCreds.access_token,
            refresh_token: newCreds.refresh_token || profile.gmailSettings.refreshToken
          });
          logger.info('Access token refreshed successfully');
        } catch (refreshError) {
          logger.error('Token refresh failed:', refreshError.message);
          
          // Mark Gmail as disconnected since tokens are invalid
          await FinancialProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { 'gmailSettings.isConnected': false } }
          );
          
          return res.status(401).json({
            success: false,
            message: 'Gmail session expired. Please disconnect and reconnect your Gmail account.',
            requiresReauth: true
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'No refresh token available. Please reconnect your Gmail account.',
          requiresReauth: true
        });
      }
    }

    // Perform sync
    logger.info('Starting Gmail sync operation');
    const syncResults = await userGmailService.syncFinancialDocuments(
      req.user._id,
      profile,
      { maxResults, dateAfter, dateBefore }
    );

    logger.info('Gmail sync completed successfully:', syncResults);

    res.json({
      success: true,
      message: 'Gmail sync completed',
      results: syncResults
    });

  } catch (error) {
    logger.error('Gmail sync error:', {
      message: error.message,
      code: error.code,
      requiresReauth: error.requiresReauth
    });

    // Handle token/auth errors from within the sync
    const isAuthError = error.message?.includes('invalid_grant') || 
                        error.message?.includes('Token has been expired') ||
                        error.message?.includes('Invalid Credentials') ||
                        error.code === 401 || error.code === 403 ||
                        error.code === 'GMAIL_INSUFFICIENT_SCOPE' || 
                        error.requiresReauth;

    if (isAuthError) {
      // Mark Gmail as disconnected
      try {
        await FinancialProfile.findOneAndUpdate(
          { userId: req.user._id },
          { $set: { 'gmailSettings.isConnected': false } }
        );
      } catch (_) { /* ignore */ }

      return res.status(401).json({
        success: false,
        message: 'Gmail session has expired. Please disconnect and reconnect your Gmail account from the Profile page.',
        requiresReauth: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to sync Gmail documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/gmail/status
 * @desc Get Gmail connection status and sync info
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.gmailSettings) {
      return res.json({
        success: true,
        isConnected: false,
        email: null,
        lastSync: null,
        documentsCount: 0
      });
    }

    // Count documents from Gmail
    const documentsCount = await Document.countDocuments({
      userId: req.user._id,
      source: 'gmail'
    });

    res.json({
      success: true,
      isConnected: profile.gmailSettings.isConnected,
      email: profile.gmailSettings.email,
      lastSync: profile.gmailSettings.lastSync,
      lastFullSyncAt: profile.gmailSettings.lastFullSyncAt,
      initialSyncCompleted: profile.gmailSettings.initialSyncCompleted,
      lastMessageInternalDate: profile.gmailSettings.lastMessageInternalDate,
      totalMessagesSynced: profile.gmailSettings.totalMessagesSynced,
      lastAttachmentSyncCount: profile.gmailSettings.lastAttachmentSyncCount,
      grantedScopes: profile.gmailSettings.grantedScopes || [],
      documentsCount
    });

  } catch (error) {
    logger.error('Gmail status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Gmail status'
    });
  }
});

/**
 * @route GET /api/gmail/messages
 * @desc Read latest Gmail messages and summaries
 * @access Private
 */
router.get('/messages', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken +preferences.openAIKey');

    if (!profile || !profile.gmailSettings?.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Gmail account not connected'
      });
    }

    if (!profile.gmailSettings.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No Gmail access token found. Please reconnect your account.'
      });
    }

    const credentials = {
      access_token: profile.gmailSettings.accessToken,
      refresh_token: profile.gmailSettings.refreshToken
    };

    const userGmailService = GmailService.getUserInstance(credentials);

    if (profile.gmailSettings.refreshToken) {
      try {
        const refreshed = await userGmailService.refreshAccessToken(profile.gmailSettings.refreshToken);
        if (refreshed?.access_token && refreshed.access_token !== profile.gmailSettings.accessToken) {
          profile.gmailSettings.accessToken = refreshed.access_token;
          profile.markModified('gmailSettings');
          await profile.save();
          userGmailService.setCredentials({
            access_token: refreshed.access_token,
            refresh_token: profile.gmailSettings.refreshToken
          });
        }
      } catch (refreshError) {
        logger.error('Token refresh failed during Gmail read:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Gmail access token expired. Please reconnect your account.',
          requiresReauth: true
        });
      }
    }

    const parseBoolean = (value, defaultValue) => {
      if (value === undefined) {
        return defaultValue;
      }
      if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      }
      return Boolean(value);
    };

    const toArray = (value) => {
      if (!value) {
        return undefined;
      }
      if (Array.isArray(value)) {
        return value;
      }
      return String(value).split(',').map((item) => item.trim()).filter(Boolean);
    };

    const options = {
      maxResults: req.query.maxResults ? parseInt(req.query.maxResults, 10) : undefined,
      query: req.query.q || req.query.query,
      labelIds: toArray(req.query.labelIds),
      includePublic: parseBoolean(req.query.includePublic, false),
      excludeReplies: parseBoolean(req.query.excludeReplies, true),
      includeAttachments: parseBoolean(req.query.includeAttachments, true),
      includeBody: parseBoolean(req.query.includeBody, true),
      includeHtml: parseBoolean(req.query.includeHtml, false),
      summarize: parseBoolean(req.query.summarize, true),
      persistSummary: parseBoolean(req.query.persistSummary, true),
      onlyUnread: parseBoolean(req.query.onlyUnread, false),
      useLastReadState: parseBoolean(req.query.useLastReadState, true),
      pageToken: req.query.pageToken
    };

    const aiOptions = {};
    if (req.query.model) {
      aiOptions.model = req.query.model;
    }
    if (req.query.temperature !== undefined) {
      aiOptions.temperature = Number(req.query.temperature);
    }
    if (req.query.maxTokens) {
      aiOptions.maxTokens = parseInt(req.query.maxTokens, 10);
    }
    if (Object.keys(aiOptions).length > 0) {
      options.aiOptions = aiOptions;
    }

    const results = await userGmailService.readLatestEmails(req.user._id, profile, options);

    res.json({
      success: true,
      message: 'Emails fetched successfully',
      data: results
    });
  } catch (error) {
    logger.error('Gmail messages retrieval error:', error);

    if (error.code === 'GMAIL_INSUFFICIENT_SCOPE' || error.requiresReauth) {
      return res.status(401).json({
        success: false,
        message: error.message,
        requiresReauth: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch Gmail messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/gmail/auto-sync-settings
 * @desc Update auto-sync settings
 * @access Private
 */
router.post('/auto-sync-settings', authenticate, async (req, res) => {
  try {
    const { autoFetchDocuments, fetchFrequency } = req.body;

    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.preferences.autoFetchDocuments = autoFetchDocuments;
    profile.preferences.fetchFrequency = fetchFrequency;

    await profile.save();

    res.json({
      success: true,
      message: 'Auto-sync settings updated',
      settings: {
        autoFetchDocuments: profile.preferences.autoFetchDocuments,
        fetchFrequency: profile.preferences.fetchFrequency
      }
    });

  } catch (error) {
    logger.error('Auto-sync settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update auto-sync settings'
    });
  }
});

// ============================================================================
// AUTO-SYNC SCHEDULER STATS & CONTROL
// ============================================================================

/**
 * GET /api/gmail/auto-sync-stats
 * Returns the auto-sync scheduler's statistics and status.
 */
router.get('/auto-sync-stats', authenticate, async (req, res) => {
  try {
    const gmailAutoSync = require('../services/gmailAutoSync');
    const stats = gmailAutoSync.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    logger.error('Auto-sync stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get auto-sync stats' });
  }
});

/**
 * POST /api/gmail/auto-sync-trigger
 * Manually trigger a full auto-sync run for all connected users.
 */
router.post('/auto-sync-trigger', authenticate, async (req, res) => {
  try {
    const gmailAutoSync = require('../services/gmailAutoSync');
    const results = await gmailAutoSync.syncAll();
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Auto-sync trigger error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger auto-sync' });
  }
});

// ============================================================================
// EMAIL TRANSACTION ANALYTICS
// ============================================================================

/**
 * GET /api/gmail/email-transactions
 * Retrieve email-parsed transactions with filters.
 */
router.get('/email-transactions', authenticate, async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const { type, category, paymentMethod, startDate, endDate, limit = 100, skip = 0, sort = '-date' } = req.query;

    const query = { userId: req.user._id, source: 'gmail_email' };
    if (type) query.type = type;
    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sort).skip(parseInt(skip)).limit(parseInt(limit)).lean(),
      Transaction.countDocuments(query),
    ]);

    // Compute aggregates
    const aggregates = await Transaction.aggregate([
      { $match: { userId: req.user._id, source: 'gmail_email' } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
          totalExpenses: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } },
          avgAmount: { $avg: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryBreakdown = await Transaction.aggregate([
      { $match: { userId: req.user._id, source: 'gmail_email' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const paymentMethodBreakdown = await Transaction.aggregate([
      { $match: { userId: req.user._id, source: 'gmail_email' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      transactions,
      total,
      aggregates: aggregates[0] || { totalIncome: 0, totalExpenses: 0, avgAmount: 0, count: 0 },
      categoryBreakdown,
      paymentMethodBreakdown,
    });
  } catch (error) {
    logger.error('Email transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email transactions' });
  }
});

/**
 * POST /api/gmail/retry-parse/:messageId
 * Re-parse a specific Gmail message using the enhanced parser.
 */
router.post('/retry-parse/:messageId', authenticate, async (req, res) => {
  try {
    const gmailService = require('../services/gmailService');
    const { parseEmailTransaction } = require('../services/emailTransactionParser');
    const Transaction = require('../models/Transaction');

    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile?.gmailSettings?.isConnected) {
      return res.status(400).json({ success: false, message: 'Gmail not connected' });
    }

    const credentials = {
      access_token: profile.gmailSettings.accessToken,
      refresh_token: profile.gmailSettings.refreshToken,
    };
    gmailService.setCredentials(credentials);

    const emailData = await gmailService.getEmailWithAttachments(req.params.messageId, req.user._id.toString());
    const parsedTx = parseEmailTransaction(emailData);

    if (!parsedTx) {
      return res.json({ success: true, message: 'No financial transaction detected in this email', parsed: null });
    }

    // Check for existing
    const existing = await Transaction.findOne({
      userId: req.user._id,
      'emailMetadata.gmailMessageId': req.params.messageId,
      amount: parsedTx.amount,
      type: parsedTx.type,
    });

    if (existing) {
      return res.json({ success: true, message: 'Transaction already exists', transaction: existing });
    }

    const persisted = await gmailService.persistEmailTransactions(req.user._id.toString(), emailData, parsedTx);

    res.json({
      success: true,
      message: `Parsed and saved ${persisted.count} transaction(s)`,
      result: persisted,
    });
  } catch (error) {
    logger.error('Retry parse error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/gmail/sync-history
 * Get sync history for the current user.
 */
router.get('/sync-history', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const gs = profile.gmailSettings || {};
    res.json({
      success: true,
      history: {
        lastSync: gs.lastSync,
        lastFullSync: gs.lastFullSyncAt,
        initialSyncCompleted: gs.initialSyncCompleted,
        totalMessagesSynced: gs.totalMessagesSynced || 0,
        lastAttachmentSyncCount: gs.lastAttachmentSyncCount || 0,
        lastReadAt: gs.lastReadAt,
        email: gs.email,
        isConnected: gs.isConnected,
      },
    });
  } catch (error) {
    logger.error('Sync history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sync history' });
  }
});

module.exports = router;