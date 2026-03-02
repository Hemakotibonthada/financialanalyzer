/**
 * @fileoverview Google Drive Storage Service
 * Enables users to backup/restore/sync their financial data to/from Google Drive.
 * Uses the same Google OAuth client as Gmail integration.
 * Stores data as JSON files in a dedicated "FinancialAnalyzer" folder on the user's Drive.
 * @module services/googleDriveService
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');

const DRIVE_FOLDER_NAME = 'FinancialAnalyzer';
const BACKUP_FILE_NAME = 'financial_data_backup.json';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Manage files created by this app
];

class GoogleDriveService {
  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
    this.isConfigured = !!(this.clientId && this.clientSecret && this.redirectUri);

    if (this.isConfigured) {
      this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    }
  }

  /**
   * Generate OAuth2 authorization URL for Google Drive access.
   * @returns {{ url: string, scopes: string[] }}
   */
  getAuthUrl() {
    if (!this.isConfigured) {
      throw new Error('Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_DRIVE_REDIRECT_URI in .env');
    }

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });

    return { url, scopes: SCOPES };
  }

  /**
   * Exchange authorization code for tokens.
   * @param {string} code - Authorization code from OAuth callback.
   * @returns {Promise<Object>} Token data (access_token, refresh_token, etc.)
   */
  async exchangeCode(code) {
    if (!this.isConfigured) throw new Error('Google Drive not configured.');
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Create a Drive client with user tokens.
   * @param {Object} tokens - { access_token, refresh_token }
   * @returns {Object} Google Drive API client
   */
  _getDriveClient(tokens) {
    const auth = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    auth.setCredentials(tokens);
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Find or create the FinancialAnalyzer folder on the user's Drive.
   * @param {Object} drive - Drive API client
   * @returns {Promise<string>} Folder ID
   */
  async _getOrCreateFolder(drive) {
    // Search for existing folder
    const res = await drive.files.list({
      q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create new folder
    const folder = await drive.files.create({
      resource: {
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return folder.data.id;
  }

  /**
   * Find existing backup file in the folder.
   * @param {Object} drive - Drive API client
   * @param {string} folderId - Parent folder ID
   * @returns {Promise<string|null>} File ID or null
   */
  async _findBackupFile(drive, folderId) {
    const res = await drive.files.list({
      q: `name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime, size)',
      spaces: 'drive',
    });

    return res.data.files && res.data.files.length > 0 ? res.data.files[0] : null;
  }

  /**
   * Backup user's financial data to Google Drive.
   * Collects data from all relevant MongoDB collections for the user.
   * @param {string} userId - User ID
   * @param {Object} tokens - Google OAuth tokens
   * @returns {Promise<{ success: boolean, fileId?: string, error?: string }>}
   */
  async backupData(userId, tokens) {
    try {
      if (!this.isConfigured) throw new Error('Google Drive not configured.');

      const drive = this._getDriveClient(tokens);
      const folderId = await this._getOrCreateFolder(drive);

      // Collect user data from all models
      const data = await this._collectUserData(userId);
      data._meta = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        userId: userId.toString(),
        app: 'FinancialAnalyzer',
      };

      const jsonContent = JSON.stringify(data, null, 2);
      const existingFile = await this._findBackupFile(drive, folderId);

      let fileId;
      if (existingFile) {
        // Update existing file
        const res = await drive.files.update({
          fileId: existingFile.id,
          media: {
            mimeType: 'application/json',
            body: jsonContent,
          },
          fields: 'id, modifiedTime, size',
        });
        fileId = res.data.id;
        logger.info(`Google Drive backup updated for user ${userId}: ${fileId}`);
      } else {
        // Create new file
        const res = await drive.files.create({
          resource: {
            name: BACKUP_FILE_NAME,
            parents: [folderId],
            mimeType: 'application/json',
          },
          media: {
            mimeType: 'application/json',
            body: jsonContent,
          },
          fields: 'id, modifiedTime, size',
        });
        fileId = res.data.id;
        logger.info(`Google Drive backup created for user ${userId}: ${fileId}`);
      }

      return { success: true, fileId, backedUpAt: new Date().toISOString() };
    } catch (error) {
      logger.error(`Google Drive backup error for user ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore user's financial data from Google Drive backup.
   * @param {string} userId - User ID
   * @param {Object} tokens - Google OAuth tokens
   * @returns {Promise<{ success: boolean, restoredAt?: string, collections?: Object, error?: string }>}
   */
  async restoreData(userId, tokens) {
    try {
      if (!this.isConfigured) throw new Error('Google Drive not configured.');

      const drive = this._getDriveClient(tokens);
      const folderId = await this._getOrCreateFolder(drive);
      const backupFile = await this._findBackupFile(drive, folderId);

      if (!backupFile) {
        return { success: false, error: 'No backup found on Google Drive. Please create a backup first.' };
      }

      // Download file content
      const res = await drive.files.get({
        fileId: backupFile.id,
        alt: 'media',
      });

      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

      if (!data._meta || data._meta.app !== 'FinancialAnalyzer') {
        return { success: false, error: 'Invalid backup file format.' };
      }

      // Restore data to MongoDB
      const result = await this._restoreUserData(userId, data);

      logger.info(`Google Drive restore completed for user ${userId}: ${JSON.stringify(result)}`);
      return {
        success: true,
        restoredAt: new Date().toISOString(),
        backupDate: data._meta.exportedAt,
        collections: result,
      };
    } catch (error) {
      logger.error(`Google Drive restore error for user ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get backup status/info from Google Drive.
   * @param {Object} tokens - Google OAuth tokens
   * @returns {Promise<{ success: boolean, backup?: Object, error?: string }>}
   */
  async getBackupStatus(tokens) {
    try {
      if (!this.isConfigured) throw new Error('Google Drive not configured.');

      const drive = this._getDriveClient(tokens);
      const folderId = await this._getOrCreateFolder(drive);
      const backupFile = await this._findBackupFile(drive, folderId);

      if (!backupFile) {
        return { success: true, backup: null, message: 'No backup found.' };
      }

      return {
        success: true,
        backup: {
          fileId: backupFile.id,
          fileName: backupFile.name,
          lastModified: backupFile.modifiedTime,
          size: backupFile.size,
        },
      };
    } catch (error) {
      logger.error(`Google Drive status error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete backup from Google Drive.
   * @param {Object} tokens - Google OAuth tokens
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteBackup(tokens) {
    try {
      if (!this.isConfigured) throw new Error('Google Drive not configured.');

      const drive = this._getDriveClient(tokens);
      const folderId = await this._getOrCreateFolder(drive);
      const backupFile = await this._findBackupFile(drive, folderId);

      if (!backupFile) {
        return { success: true, message: 'No backup to delete.' };
      }

      await drive.files.delete({ fileId: backupFile.id });
      logger.info(`Google Drive backup deleted: ${backupFile.id}`);
      return { success: true, message: 'Backup deleted successfully.' };
    } catch (error) {
      logger.error(`Google Drive delete error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Collect all user financial data from MongoDB for backup.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async _collectUserData(userId) {
    const mongoose = require('mongoose');
    const data = {};

    // List of collections to backup with their model names
    const collections = [
      'Transaction', 'Budget', 'BillReminder', 'Investment',
      'Debt', 'SavingsGoal', 'EMI', 'CreditCard',
      'FinancialProfile', 'Todo', 'Note',
    ];

    for (const modelName of collections) {
      try {
        const Model = mongoose.models[modelName];
        if (Model) {
          const docs = await Model.find({ userId }).lean();
          if (docs.length > 0) {
            // Remove MongoDB internal fields for clean export
            data[modelName] = docs.map(doc => {
              const clean = { ...doc };
              delete clean.__v;
              return clean;
            });
          }
        }
      } catch (err) {
        logger.warn(`Skipping collection ${modelName}: ${err.message}`);
      }
    }

    return data;
  }

  /**
   * Restore user data from backup into MongoDB.
   * Uses upsert to avoid duplicates.
   * @param {string} userId
   * @param {Object} data - Backup data
   * @returns {Promise<Object>} Summary of restored collections
   */
  async _restoreUserData(userId, data) {
    const mongoose = require('mongoose');
    const result = {};

    for (const [modelName, docs] of Object.entries(data)) {
      if (modelName === '_meta') continue;
      try {
        const Model = mongoose.models[modelName];
        if (!Model || !Array.isArray(docs)) continue;

        let restored = 0;
        for (const doc of docs) {
          const docData = { ...doc, userId };
          delete docData._id; // Let MongoDB assign new _id if needed

          if (doc._id) {
            // Try to upsert by original _id to prevent duplicates
            await Model.findOneAndUpdate(
              { _id: doc._id, userId },
              docData,
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          } else {
            await Model.create(docData);
          }
          restored++;
        }
        result[modelName] = restored;
      } catch (err) {
        logger.warn(`Error restoring ${modelName}: ${err.message}`);
        result[modelName] = `error: ${err.message}`;
      }
    }

    return result;
  }
}

module.exports = new GoogleDriveService();
