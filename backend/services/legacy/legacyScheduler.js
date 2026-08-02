const logger = require('../../utils/logger');

class LegacyScheduler {
  constructor() {
    this.dormancyScanInterval = null;
    this.escalationInterval = null;
    this.slaSweepInterval = null;
    this.initialRunTimeout = null;
    this.isRunning = false;
    this.runningJobs = new Set();
    this.lastRuns = {};
    this.stats = {
      totalRuns: 0,
      totalErrors: 0,
      lastResults: {}
    };

    this.dormancyScanIntervalMs = 24 * 60 * 60 * 1000;
    this.escalationIntervalMs = 60 * 60 * 1000;
    this.slaSweepIntervalMs = 24 * 60 * 60 * 1000;
    this.initialRunDelayMs = Number(process.env.LEGACY_GUARD_INITIAL_RUN_DELAY_MS) || 5000;
  }

  start() {
    try {
      if (this.isRunning || this.dormancyScanInterval || this.escalationInterval || this.slaSweepInterval) {
        logger.warn('[LegacyGuard] Scheduler already running');
        return this.getStatus();
      }

      logger.info('[LegacyGuard] Starting scheduler with setInterval timers');
      this.isRunning = true;

      this.initialRunTimeout = setTimeout(() => {
        this.runAllJobsOnce().catch(error => logger.error('[LegacyGuard] Initial scheduled run failed:', error));
      }, this.initialRunDelayMs);
      this.unrefTimer(this.initialRunTimeout);

      this.dormancyScanInterval = setInterval(() => {
        this.safeRun('dailyDormancyScan', () => require('./dormancyDetectionService').scanForDormancy());
      }, this.dormancyScanIntervalMs);
      this.unrefTimer(this.dormancyScanInterval);

      this.escalationInterval = setInterval(() => {
        this.safeRun('hourlyEscalationLadder', () => require('./dormancyEscalationService').runEscalationLadder());
      }, this.escalationIntervalMs);
      this.unrefTimer(this.escalationInterval);

      this.slaSweepInterval = setInterval(() => {
        this.safeRun('dailySlaBreachSweep', () => this.sweepSlaBreaches());
      }, this.slaSweepIntervalMs);
      this.unrefTimer(this.slaSweepInterval);

      return this.getStatus();
    } catch (error) {
      logger.error('Legacy Guard scheduler start failed:', error);
      throw new Error(`Failed to start Legacy Guard scheduler: ${error.message}`);
    }
  }

  stop() {
    try {
      if (this.initialRunTimeout) {
        clearTimeout(this.initialRunTimeout);
        this.initialRunTimeout = null;
      }
      if (this.dormancyScanInterval) {
        clearInterval(this.dormancyScanInterval);
        this.dormancyScanInterval = null;
      }
      if (this.escalationInterval) {
        clearInterval(this.escalationInterval);
        this.escalationInterval = null;
      }
      if (this.slaSweepInterval) {
        clearInterval(this.slaSweepInterval);
        this.slaSweepInterval = null;
      }
      this.isRunning = false;
      logger.info('[LegacyGuard] Scheduler stopped');
      return this.getStatus();
    } catch (error) {
      logger.error('Legacy Guard scheduler stop failed:', error);
      throw new Error(`Failed to stop Legacy Guard scheduler: ${error.message}`);
    }
  }

  getStatus() {
    try {
      return {
        isRunning: this.isRunning,
        mechanism: 'setInterval',
        intervals: {
          dormancyScanIntervalMs: this.dormancyScanIntervalMs,
          escalationIntervalMs: this.escalationIntervalMs,
          slaSweepIntervalMs: this.slaSweepIntervalMs,
          initialRunDelayMs: this.initialRunDelayMs
        },
        activeJobs: {
          dailyDormancyScan: Boolean(this.dormancyScanInterval),
          hourlyEscalationLadder: Boolean(this.escalationInterval),
          dailySlaBreachSweep: Boolean(this.slaSweepInterval),
          initialRunPending: Boolean(this.initialRunTimeout)
        },
        runningJobs: Array.from(this.runningJobs),
        lastRuns: this.lastRuns,
        stats: this.stats
      };
    } catch (error) {
      logger.error('Legacy Guard scheduler status failed:', error);
      throw new Error(`Failed to get Legacy Guard scheduler status: ${error.message}`);
    }
  }

  async runAllJobsOnce() {
    try {
      this.initialRunTimeout = null;
      await Promise.all([
        this.safeRun('dailyDormancyScan', () => require('./dormancyDetectionService').scanForDormancy()),
        this.safeRun('hourlyEscalationLadder', () => require('./dormancyEscalationService').runEscalationLadder()),
        this.safeRun('dailySlaBreachSweep', () => this.sweepSlaBreaches())
      ]);
    } catch (error) {
      logger.error('Legacy Guard one-time startup run failed:', error);
      throw new Error(`Failed to run Legacy Guard startup jobs: ${error.message}`);
    }
  }

  async sweepSlaBreaches() {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const now = new Date();
      const [dormancyBreaches, claimBreaches] = await Promise.all([
        typeof DormancyCase.getSlaBreaches === 'function'
          ? DormancyCase.getSlaBreaches()
          : DormancyCase.find({ slaDueAt: { $lt: now }, status: { $nin: ['closed_alive', 'closed_deceased', 'closed_false_alarm', 'cancelled'] } }).lean(),
        RecoveryClaim.find({ slaDueAt: { $lt: now }, status: { $nin: ['settled', 'withdrawn'] } }).lean()
      ]);
      const result = { dormancyBreaches: dormancyBreaches.length, claimBreaches: claimBreaches.length };
      logger.warn('Legacy Guard SLA breach sweep completed:', result);
      return result;
    } catch (error) {
      logger.error('Legacy Guard SLA breach sweep failed:', error);
      throw new Error(`Failed to sweep Legacy Guard SLA breaches: ${error.message}`);
    }
  }

  async safeRun(name, fn) {
    if (this.runningJobs.has(name)) {
      logger.info(`[LegacyGuard] ${name} already in progress, skipping`);
      return null;
    }

    this.runningJobs.add(name);
    this.lastRuns[name] = { startedAt: new Date(), status: 'running' };
    this.stats.totalRuns += 1;

    try {
      logger.info(`[LegacyGuard] Scheduled job started: ${name}`);
      const result = await fn();
      this.lastRuns[name] = { ...this.lastRuns[name], finishedAt: new Date(), status: 'succeeded' };
      this.stats.lastResults[name] = result;
      logger.info(`[LegacyGuard] Scheduled job completed: ${name}`, result);
      return result;
    } catch (error) {
      this.stats.totalErrors += 1;
      this.lastRuns[name] = { ...this.lastRuns[name], finishedAt: new Date(), status: 'failed', error: error.message };
      logger.error(`[LegacyGuard] Scheduled job failed: ${name}`, error);
      return null;
    } finally {
      this.runningJobs.delete(name);
    }
  }

  unrefTimer(timer) {
    if (timer && typeof timer.unref === 'function') timer.unref();
  }
}

const legacyScheduler = new LegacyScheduler();
module.exports = legacyScheduler;
module.exports.LegacyScheduler = LegacyScheduler;
