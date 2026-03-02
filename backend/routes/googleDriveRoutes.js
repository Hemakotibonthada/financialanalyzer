/**
 * @fileoverview Google Drive Routes
 * API endpoints for Google Drive backup/restore/sync operations.
 * @module routes/googleDriveRoutes
 */

const express = require('express');
const router = express.Router();
const googleDriveService = require('../services/googleDriveService');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/drive/status
 * Check if Google Drive integration is configured.
 */
router.get('/status', auth, async (req, res) => {
  try {
    const configured = googleDriveService.isConfigured;

    // Check if user has stored Drive tokens
    const mongoose = require('mongoose');
    const FinancialProfile = mongoose.models.FinancialProfile;
    let connected = false;
    let backupInfo = null;

    if (configured && FinancialProfile) {
      const profile = await FinancialProfile.findOne({ userId: req.user._id || req.user.id });
      if (profile?.driveSettings?.connected && profile?.driveSettings?.accessToken) {
        connected = true;
        // Try to get backup info
        try {
          const result = await googleDriveService.getBackupStatus({
            access_token: profile.driveSettings.accessToken,
            refresh_token: profile.driveSettings.refreshToken,
          });
          if (result.success) backupInfo = result.backup;
        } catch (err) {
          logger.warn(`Drive status check failed: ${err.message}`);
        }
      }
    }

    res.json({
      configured,
      connected,
      backup: backupInfo,
    });
  } catch (error) {
    logger.error(`Drive status error: ${error.message}`);
    res.status(500).json({ error: 'Failed to check Drive status.' });
  }
});

/**
 * GET /api/drive/auth-url
 * Get Google OAuth URL for Drive authorization.
 */
router.get('/auth-url', auth, async (req, res) => {
  try {
    const { url, scopes } = googleDriveService.getAuthUrl();
    res.json({ url, scopes });
  } catch (error) {
    logger.error(`Drive auth URL error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/drive/callback
 * OAuth callback handler - exchanges code for tokens and redirects to frontend.
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?drive_error=no_code`);
    }

    const tokens = await googleDriveService.exchangeCode(code);
    const tokenData = Buffer.from(JSON.stringify(tokens)).toString('base64');

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?drive_tokens=${tokenData}&drive_success=true`);
  } catch (error) {
    logger.error(`Drive callback error: ${error.message}`);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?drive_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/drive/save-tokens
 * Save Drive OAuth tokens to user profile.
 */
router.post('/save-tokens', auth, async (req, res) => {
  try {
    const { tokens } = req.body;
    if (!tokens || !tokens.access_token) {
      return res.status(400).json({ error: 'Invalid tokens.' });
    }

    const mongoose = require('mongoose');
    const FinancialProfile = mongoose.models.FinancialProfile;
    if (!FinancialProfile) {
      return res.status(500).json({ error: 'FinancialProfile model not found.' });
    }

    await FinancialProfile.findOneAndUpdate(
      { userId: req.user._id || req.user.id },
      {
        $set: {
          'driveSettings.accessToken': tokens.access_token,
          'driveSettings.refreshToken': tokens.refresh_token || null,
          'driveSettings.tokenExpiry': tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          'driveSettings.connected': true,
          'driveSettings.connectedAt': new Date(),
          'driveSettings.scope': tokens.scope || '',
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Google Drive connected successfully.' });
  } catch (error) {
    logger.error(`Drive save-tokens error: ${error.message}`);
    res.status(500).json({ error: 'Failed to save Drive tokens.' });
  }
});

/**
 * POST /api/drive/disconnect
 * Disconnect Google Drive integration.
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const FinancialProfile = mongoose.models.FinancialProfile;
    if (!FinancialProfile) {
      return res.status(500).json({ error: 'FinancialProfile model not found.' });
    }

    await FinancialProfile.findOneAndUpdate(
      { userId: req.user._id || req.user.id },
      {
        $set: {
          'driveSettings.connected': false,
          'driveSettings.accessToken': null,
          'driveSettings.refreshToken': null,
          'driveSettings.tokenExpiry': null,
        },
      }
    );

    res.json({ success: true, message: 'Google Drive disconnected.' });
  } catch (error) {
    logger.error(`Drive disconnect error: ${error.message}`);
    res.status(500).json({ error: 'Failed to disconnect Drive.' });
  }
});

/**
 * POST /api/drive/backup
 * Backup all user financial data to Google Drive.
 */
router.post('/backup', auth, async (req, res) => {
  try {
    const tokens = await _getUserDriveTokens(req.user._id || req.user.id);
    if (!tokens) {
      return res.status(401).json({ error: 'Google Drive not connected. Please connect first.' });
    }

    const result = await googleDriveService.backupData(req.user._id || req.user.id, tokens);

    if (result.success) {
      // Update last backup time
      const mongoose = require('mongoose');
      const FinancialProfile = mongoose.models.FinancialProfile;
      if (FinancialProfile) {
        await FinancialProfile.findOneAndUpdate(
          { userId: req.user._id || req.user.id },
          { $set: { 'driveSettings.lastBackup': new Date() } }
        );
      }
    }

    res.json(result);
  } catch (error) {
    logger.error(`Drive backup error: ${error.message}`);
    res.status(500).json({ error: 'Failed to backup data.' });
  }
});

/**
 * POST /api/drive/restore
 * Restore user financial data from Google Drive backup.
 */
router.post('/restore', auth, async (req, res) => {
  try {
    const tokens = await _getUserDriveTokens(req.user._id || req.user.id);
    if (!tokens) {
      return res.status(401).json({ error: 'Google Drive not connected. Please connect first.' });
    }

    const result = await googleDriveService.restoreData(req.user._id || req.user.id, tokens);

    if (result.success) {
      const mongoose = require('mongoose');
      const FinancialProfile = mongoose.models.FinancialProfile;
      if (FinancialProfile) {
        await FinancialProfile.findOneAndUpdate(
          { userId: req.user._id || req.user.id },
          { $set: { 'driveSettings.lastRestore': new Date() } }
        );
      }
    }

    res.json(result);
  } catch (error) {
    logger.error(`Drive restore error: ${error.message}`);
    res.status(500).json({ error: 'Failed to restore data.' });
  }
});

/**
 * DELETE /api/drive/backup
 * Delete backup from Google Drive.
 */
router.delete('/backup', auth, async (req, res) => {
  try {
    const tokens = await _getUserDriveTokens(req.user._id || req.user.id);
    if (!tokens) {
      return res.status(401).json({ error: 'Google Drive not connected.' });
    }

    const result = await googleDriveService.deleteBackup(tokens);
    res.json(result);
  } catch (error) {
    logger.error(`Drive delete error: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete backup.' });
  }
});

/**
 * Helper: Get user's stored Drive tokens from their profile.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function _getUserDriveTokens(userId) {
  try {
    const mongoose = require('mongoose');
    const FinancialProfile = mongoose.models.FinancialProfile;
    if (!FinancialProfile) return null;

    const profile = await FinancialProfile.findOne({ userId });
    if (!profile?.driveSettings?.connected || !profile?.driveSettings?.accessToken) {
      return null;
    }

    return {
      access_token: profile.driveSettings.accessToken,
      refresh_token: profile.driveSettings.refreshToken,
    };
  } catch (err) {
    logger.error(`Get Drive tokens error: ${err.message}`);
    return null;
  }
}

module.exports = router;
