const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
// Resolves to Cloudflare R2 when the R2_* variables are set, otherwise GCP.
// Both backends expose the same interface, so nothing below this line changes.
const gcpStorage = require('../services/storageProvider');
const BankAccount = require('../models/BankAccount');
const Transaction = require('../models/Transaction');
const FinancialProfile = require('../models/FinancialProfile');
const EMI = require('../models/EMI');
const FinancialGoal = require('../models/FinancialGoal');
const Budget = require('../models/Budget');
const BillReminder = require('../models/BillReminder');
const Investment = require('../models/Investment');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────
//  STATUS & STATS
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gcp-storage/status
 * @desc    Check GCP Storage availability and config
 * @access  Private
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: gcpStorage.isAvailable(),
      bucket: gcpStorage.bucketName || null,
      projectId: process.env.GCP_PROJECT_ID || null,
    },
  });
});

/**
 * @route   GET /api/gcp-storage/stats
 * @desc    Get storage usage statistics for the current user
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const stats = await gcpStorage.getStorageStats(req.user._id.toString());
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('GCP storage stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  ACCOUNT BACKUPS
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/gcp-storage/backup/accounts
 * @desc    Backup all bank accounts to GCP Storage
 * @access  Private
 */
router.post('/backup/accounts', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const accounts = await BankAccount.find({ userId: req.user._id });
    const result = await gcpStorage.backupAccounts(req.user._id.toString(), accounts);

    res.json({
      success: true,
      message: `Backed up ${accounts.length} accounts to GCP Storage`,
      data: result,
    });
  } catch (error) {
    logger.error('Account backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gcp-storage/backup/accounts/latest
 * @desc    Get the latest account backup from GCP Storage
 * @access  Private
 */
router.get('/backup/accounts/latest', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const data = await gcpStorage.downloadJSON(`${req.user._id}/accounts/latest.json`);
    if (!data) {
      return res.status(404).json({ success: false, message: 'No account backup found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Account backup download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  TRANSACTION BACKUPS
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/gcp-storage/backup/transactions
 * @desc    Backup transactions to GCP Storage (with optional date range)
 * @access  Private
 */
router.post('/backup/transactions', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const { startDate, endDate } = req.body;
    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
    const result = await gcpStorage.backupTransactions(
      req.user._id.toString(),
      transactions,
      { startDate, endDate }
    );

    res.json({
      success: true,
      message: `Backed up ${transactions.length} transactions to GCP Storage`,
      data: result,
    });
  } catch (error) {
    logger.error('Transaction backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  PROFILE BACKUPS
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/gcp-storage/backup/profile
 * @desc    Backup financial profile to GCP Storage
 * @access  Private
 */
router.post('/backup/profile', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const profile = await FinancialProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) {
      return res.status(404).json({ success: false, message: 'No financial profile found' });
    }

    const result = await gcpStorage.backupProfile(req.user._id.toString(), profile);
    res.json({
      success: true,
      message: 'Financial profile backed up to GCP Storage',
      data: result,
    });
  } catch (error) {
    logger.error('Profile backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  FULL BACKUP & RESTORE
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/gcp-storage/backup/full
 * @desc    Full backup of all user financial data to GCP Storage
 * @access  Private
 */
router.post('/backup/full', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    // Fetch all user data in parallel
    const userId = req.user._id;
    const [accounts, transactions, profile, emis, goals, budgets, billReminders, investments] =
      await Promise.all([
        BankAccount.find({ userId }).lean(),
        Transaction.find({ userId }).sort({ date: -1 }).lean(),
        FinancialProfile.findOne({ userId }).lean(),
        EMI.find({ userId }).lean().catch(() => []),
        FinancialGoal.find({ userId }).lean().catch(() => []),
        Budget.find({ userId }).lean().catch(() => []),
        BillReminder.find({ userId }).lean().catch(() => []),
        Investment.find({ userId }).lean().catch(() => []),
      ]);

    const result = await gcpStorage.fullBackup(userId.toString(), {
      accounts, transactions, profile, emis, goals, budgets, billReminders, investments,
    });

    res.json({
      success: true,
      message: 'Full backup completed to GCP Storage',
      data: result,
    });
  } catch (error) {
    logger.error('Full backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gcp-storage/backup/full/latest
 * @desc    Get the latest full backup from GCP Storage
 * @access  Private
 */
router.get('/backup/full/latest', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const data = await gcpStorage.getFullBackup(req.user._id.toString());
    if (!data) {
      return res.status(404).json({ success: false, message: 'No full backup found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Full backup download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/gcp-storage/restore/full
 * @desc    Restore all data from a GCP Storage backup
 * @access  Private
 */
router.post('/restore/full', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const { fileName } = req.body;
    const backup = await gcpStorage.getFullBackup(
      req.user._id.toString(),
      fileName || 'latest.json'
    );

    if (!backup || !backup.data) {
      return res.status(404).json({ success: false, message: 'Backup not found or empty' });
    }

    const userId = req.user._id;
    const restored = { accounts: 0, transactions: 0, emis: 0, goals: 0 };

    // Restore accounts (upsert by accountNumber)
    if (backup.data.accounts?.length) {
      for (const acc of backup.data.accounts) {
        await BankAccount.findOneAndUpdate(
          { userId, accountNumber: acc.accountNumber },
          { ...acc, userId, _id: undefined },
          { upsert: true, new: true }
        );
        restored.accounts++;
      }
    }

    // Restore transactions (skip duplicates by date + description + amount)
    if (backup.data.transactions?.length) {
      for (const tx of backup.data.transactions) {
        const exists = await Transaction.findOne({
          userId,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
        });
        if (!exists) {
          await Transaction.create({ ...tx, userId, _id: undefined });
          restored.transactions++;
        }
      }
    }

    // Restore profile (merge)
    if (backup.data.profile) {
      await FinancialProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            monthlyIncome: backup.data.profile.monthlyIncome,
            savingsGoal: backup.data.profile.savingsGoal,
            budgetLimits: backup.data.profile.budgetLimits,
            customCategories: backup.data.profile.customCategories,
          },
        },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: 'Data restored from GCP Storage backup',
      data: {
        backupDate: backup.createdAt,
        restored,
      },
    });
  } catch (error) {
    logger.error('Restore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  BACKUP HISTORY
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gcp-storage/backups
 * @desc    List all backups for the current user
 * @access  Private
 */
router.get('/backups', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const backups = await gcpStorage.listBackups(req.user._id.toString());
    res.json({ success: true, data: backups });
  } catch (error) {
    logger.error('List backups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/gcp-storage/backups/:fileName
 * @desc    Delete a specific backup file
 * @access  Private
 */
router.delete('/backups/:fileName', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const filePath = `${req.user._id}/backups/${req.params.fileName}`;
    const deleted = await gcpStorage.deleteFile(filePath);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    logger.error('Delete backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  DOCUMENT STORAGE
// ─────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gcp-storage/documents
 * @desc    List all documents stored in GCP for the user
 * @access  Private
 */
router.get('/documents', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const files = await gcpStorage.listFiles(`${req.user._id}/documents/`, 200);
    res.json({ success: true, data: files });
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gcp-storage/documents/:fileName/url
 * @desc    Get a signed URL for a document
 * @access  Private
 */
router.get('/documents/:fileName/url', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const filePath = `${req.user._id}/documents/${req.params.fileName}`;
    const url = await gcpStorage.getSignedUrl(filePath, 30);
    res.json({ success: true, data: { url, expiresIn: '30 minutes' } });
  } catch (error) {
    logger.error('Signed URL error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/gcp-storage/data
 * @desc    Delete all user data from GCP Storage (GDPR)
 * @access  Private
 */
router.delete('/data', async (req, res) => {
  try {
    if (!gcpStorage.isAvailable()) {
      return res.status(503).json({ success: false, message: 'GCP Storage is not configured' });
    }

    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_MY_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Send { "confirm": "DELETE_ALL_MY_DATA" } to proceed',
      });
    }

    const result = await gcpStorage.deleteAllUserData(req.user._id.toString());
    res.json({
      success: true,
      message: `Deleted ${result.deleted} files from GCP Storage`,
      data: result,
    });
  } catch (error) {
    logger.error('Delete all data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
