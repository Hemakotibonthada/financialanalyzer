const backupService = require('./backupService');
const logger = require('../utils/logger');

class BackupScheduler {
  constructor() {
    this.intervalId = null;
    this.checkIntervalMs = 60 * 60 * 1000; // Check every hour
    this.isRunning = false;
  }

  /**
   * Start the scheduler — checks every hour for due backups
   */
  start() {
    if (this.intervalId) {
      logger.info('Backup scheduler already running');
      return;
    }

    logger.info('Starting backup scheduler (checking every hour)');

    // Run immediately on start
    this._runCheck();

    // Then check every hour
    this.intervalId = setInterval(() => {
      this._runCheck();
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Run a check for due backups
   */
  async _runCheck() {
    if (this.isRunning) {
      logger.info('Backup check already in progress, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const results = await backupService.runScheduledBackups();
      if (results.length > 0) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger.info(`Scheduled backup check: ${successful} successful, ${failed} failed out of ${results.length} due`);
      }
    } catch (error) {
      logger.error('Backup scheduler error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new BackupScheduler();
