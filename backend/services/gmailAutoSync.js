// ============================================================================
// GMAIL AUTO-SYNC SCHEDULER
// Periodically syncs Gmail for all connected users, extracting transactions
// from financial emails (bank alerts, CC charges, NEFT/RTGS/IMPS, salary, etc.)
// ============================================================================
const logger = require('../utils/logger');
const FinancialProfile = require('../models/FinancialProfile');
const gmailService = require('./gmailService');

class GmailAutoSyncScheduler {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      totalUsersProcessed: 0,
      totalTransactionsCreated: 0,
      totalErrors: 0,
      lastRunDuration: 0,
      lastRunResults: null,
    };

    // Default: every 30 minutes
    this.intervalMs = parseInt(process.env.GMAIL_AUTO_SYNC_INTERVAL_MS, 10) || 30 * 60 * 1000;
    this.enabled = process.env.GMAIL_AUTO_SYNC_ENABLED !== 'false';
    this.maxConcurrent = parseInt(process.env.GMAIL_AUTO_SYNC_MAX_CONCURRENT, 10) || 5;
    this.syncWindowDays = parseInt(process.env.GMAIL_AUTO_SYNC_WINDOW_DAYS, 10) || 7;
  }

  /**
   * Start the auto-sync scheduler
   */
  start() {
    if (!this.enabled) {
      logger.info('[GmailAutoSync] Auto-sync is disabled via environment variable');
      return;
    }

    if (this.intervalHandle) {
      logger.warn('[GmailAutoSync] Scheduler already running');
      return;
    }

    logger.info(`[GmailAutoSync] Starting scheduler (interval: ${this.intervalMs / 1000}s, maxConcurrent: ${this.maxConcurrent})`);

    // Run immediately on start, then at intervals
    this._runSync().catch(err => logger.error('[GmailAutoSync] Initial sync failed:', err));

    this.intervalHandle = setInterval(() => {
      this._runSync().catch(err => logger.error('[GmailAutoSync] Scheduled sync failed:', err));
    }, this.intervalMs);
  }

  /**
   * Stop the auto-sync scheduler
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('[GmailAutoSync] Scheduler stopped');
    }
  }

  /**
   * Set the sync interval (in milliseconds)
   */
  setInterval(ms) {
    this.intervalMs = Math.max(60000, ms); // Minimum 1 minute
    if (this.intervalHandle) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      intervalMs: this.intervalMs,
      enabled: this.enabled,
      nextRun: this.lastRun ? new Date(this.lastRun.getTime() + this.intervalMs) : null,
    };
  }

  /**
   * Main sync runner — finds all connected users and syncs their Gmail
   */
  async _runSync() {
    if (this.isRunning) {
      logger.info('[GmailAutoSync] Sync already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.lastRun = new Date();
    this.stats.totalRuns++;

    const runResults = {
      usersFound: 0,
      usersProcessed: 0,
      usersFailed: 0,
      totalUpiTransactions: 0,
      totalEmailTransactions: 0,
      totalAttachments: 0,
      errors: [],
    };

    try {
      // Find all users with Gmail connected
      const connectedProfiles = await FinancialProfile.find({
        'gmailSettings.isConnected': true,
        'gmailSettings.accessToken': { $exists: true, $ne: null },
        'gmailSettings.refreshToken': { $exists: true, $ne: null },
      }).select('userId gmailSettings.lastSync gmailSettings.email gmailSettings.initialSyncCompleted').lean();

      runResults.usersFound = connectedProfiles.length;
      logger.info(`[GmailAutoSync] Found ${connectedProfiles.length} connected users`);

      if (connectedProfiles.length === 0) {
        this.stats.lastRunResults = runResults;
        this.stats.lastRunDuration = Date.now() - startTime;
        this.isRunning = false;
        return runResults;
      }

      // Sort by last sync time (oldest first) to prioritize stale data
      connectedProfiles.sort((a, b) => {
        const aSync = a.gmailSettings?.lastSync ? new Date(a.gmailSettings.lastSync).getTime() : 0;
        const bSync = b.gmailSettings?.lastSync ? new Date(b.gmailSettings.lastSync).getTime() : 0;
        return aSync - bSync;
      });

      // Process in batches to avoid overwhelming the API
      const batches = [];
      for (let i = 0; i < connectedProfiles.length; i += this.maxConcurrent) {
        batches.push(connectedProfiles.slice(i, i + this.maxConcurrent));
      }

      for (const batch of batches) {
        const promises = batch.map(profile => this._syncUser(profile, runResults));
        await Promise.allSettled(promises);
      }

      this.stats.totalUsersProcessed += runResults.usersProcessed;
      this.stats.totalTransactionsCreated += runResults.totalUpiTransactions + runResults.totalEmailTransactions;
      this.stats.totalErrors += runResults.usersFailed;

    } catch (error) {
      logger.error('[GmailAutoSync] Fatal sync error:', error);
      runResults.errors.push({ type: 'fatal', message: error.message });
    } finally {
      this.stats.lastRunDuration = Date.now() - startTime;
      this.stats.lastRunResults = runResults;
      this.isRunning = false;

      logger.info(`[GmailAutoSync] Sync completed in ${this.stats.lastRunDuration}ms:`, {
        usersProcessed: runResults.usersProcessed,
        usersFailed: runResults.usersFailed,
        upiTransactions: runResults.totalUpiTransactions,
        emailTransactions: runResults.totalEmailTransactions,
        attachments: runResults.totalAttachments,
      });
    }

    return runResults;
  }

  /**
   * Sync a single user's Gmail
   */
  async _syncUser(profile, runResults) {
    const userId = profile.userId;
    const userEmail = profile.gmailSettings?.email || 'unknown';

    try {
      logger.info(`[GmailAutoSync] Syncing user ${userId} (${userEmail})`);

      const dateAfter = new Date(Date.now() - this.syncWindowDays * 24 * 60 * 60 * 1000);

      const syncResult = await gmailService.syncFinancialDocuments(userId, {
        dateAfter,
        maxResults: 50, // Limit per-user to avoid rate limits
      });

      runResults.usersProcessed++;
      runResults.totalUpiTransactions += syncResult.upiTransactionsCreated || 0;
      runResults.totalEmailTransactions += syncResult.emailTransactionsCreated || 0;
      runResults.totalAttachments += syncResult.downloadedAttachments || 0;

      logger.info(`[GmailAutoSync] User ${userId} synced successfully:`, {
        processed: syncResult.processedEmails,
        upi: syncResult.upiTransactionsCreated,
        email: syncResult.emailTransactionsCreated,
        attachments: syncResult.downloadedAttachments,
      });

    } catch (error) {
      runResults.usersFailed++;
      runResults.errors.push({
        userId,
        email: userEmail,
        message: error.message,
        code: error.code,
      });

      // If token is expired/revoked, mark user as disconnected
      if (error.code === 401 || error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired or revoked')) {
        try {
          await FinancialProfile.updateOne(
            { userId },
            {
              $set: {
                'gmailSettings.isConnected': false,
                'gmailSettings.disconnectedAt': new Date(),
                'gmailSettings.disconnectReason': 'token_expired_auto_sync',
              },
            }
          );
          logger.warn(`[GmailAutoSync] Disconnected user ${userId} due to expired/revoked token`);
        } catch (updateErr) {
          logger.error(`[GmailAutoSync] Failed to disconnect user ${userId}:`, updateErr);
        }
      }

      logger.error(`[GmailAutoSync] Failed to sync user ${userId}: ${error.message}`);
    }
  }

  /**
   * Manually trigger a sync for a specific user
   */
  async syncUser(userId, options = {}) {
    const dateAfter = options.dateAfter || new Date(Date.now() - this.syncWindowDays * 24 * 60 * 60 * 1000);
    return gmailService.syncFinancialDocuments(userId, {
      dateAfter,
      maxResults: options.maxResults || 100,
      forceResync: options.forceResync || false,
      ...options,
    });
  }

  /**
   * Manually trigger sync for all connected users
   */
  async syncAll() {
    return this._runSync();
  }
}

// Singleton
const gmailAutoSync = new GmailAutoSyncScheduler();

module.exports = gmailAutoSync;
