const express = require('express');
const router = express.Router();
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

    // Check if access token needs refresh
    if (profile.gmailSettings.refreshToken) {
      try {
        logger.info('Attempting to refresh access token');
        const newTokens = await userGmailService.refreshAccessToken(profile.gmailSettings.refreshToken);
        profile.gmailSettings.accessToken = newTokens.access_token;
        await profile.save();
        logger.info('Access token refreshed successfully');
        
        // Update credentials with new token
        userGmailService.setCredentials({
          access_token: newTokens.access_token,
          refresh_token: profile.gmailSettings.refreshToken
        });
      } catch (refreshError) {
        logger.error('Token refresh failed:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Gmail access token expired. Please reconnect your account.',
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
      requiresReauth: error.requiresReauth,
      stack: error.stack
    });

    if (error.code === 'GMAIL_INSUFFICIENT_SCOPE' || error.requiresReauth) {
      return res.status(401).json({
        success: false,
        message: error.message,
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

module.exports = router;