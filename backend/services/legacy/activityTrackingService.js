const logger = require('../../utils/logger');
const { DEFAULT_THRESHOLDS, daysBetween, stageForInactiveDays } = require('../../constants/legacyConstants');

const SIGNAL_FIELD = Object.freeze({
  login: 'lastLoginAt',
  api: 'lastApiActivityAt',
  api_activity: 'lastApiActivityAt',
  transaction: 'lastTransactionAt',
  document: 'lastDocumentAt',
  gmail_sync: 'lastGmailSyncAt'
});

class ActivityTrackingService {
  async touch(userId, signal = 'api_activity') {
    try {
      if (!userId) return null;
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const now = new Date();
      const field = SIGNAL_FIELD[signal] || 'lastApiActivityAt';
      const update = {
        $set: {
          [field]: now,
          lastMeaningfulActivityAt: now,
          dormancyStage: 'active',
          stageChangedAt: now,
          isFrozen: false,
          consecutiveInactiveDays: 0
        },
        $setOnInsert: { userId }
      };
      if (signal === 'login') {
        update.$inc = { loginCount30d: 1, loginCount90d: 1, loginCount365d: 1 };
      }
      // ActivityLog has a 90-day TTL and self-deletes; AccountActivityIndex is the durable rollup dormancy detection depends on.
      return await AccountActivityIndex.findOneAndUpdate({ userId }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error) {
      logger.warn('Legacy Guard activity touch failed; request path continues:', { userId, signal, error: error.message });
      return null;
    }
  }

  async recomputeAll(batchSize = 500) {
    try {
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const User = require('../../models/User');
      const DormancyPolicy = require('../../models/DormancyPolicy');
      const policy = await DormancyPolicy.getActive().catch(() => null);
      const thresholds = policy?.thresholds || DEFAULT_THRESHOLDS;
      const safeBatchSize = Math.min(Math.max(Number(batchSize) || 500, 1), 1000);
      let lastId = null;
      const summary = { processed: 0, created: 0, updated: 0, byStage: {}, errors: [] };

      while (true) {
        const query = lastId ? { _id: { $gt: lastId } } : {};
        const users = await User.find(query).sort({ _id: 1 }).limit(safeBatchSize).select('_id lastLogin createdAt').lean();
        if (!users.length) break;
        for (const user of users) {
          try {
            const result = await this.recomputeUser(user._id, { user, thresholds });
            summary.processed += 1;
            summary[result.created ? 'created' : 'updated'] += 1;
            summary.byStage[result.dormancyStage] = (summary.byStage[result.dormancyStage] || 0) + 1;
          } catch (error) {
            summary.errors.push({ userId: user._id, error: error.message });
            logger.warn('Legacy Guard user activity recompute failed:', { userId: user._id, error: error.message });
          }
        }
        lastId = users[users.length - 1]._id;
      }
      return summary;
    } catch (error) {
      logger.error('Legacy Guard activity recompute failed:', error);
      throw new Error(`Failed to recompute activity indexes: ${error.message}`);
    }
  }

  async recomputeUser(userId, opts = {}) {
    try {
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const user = opts.user || await require('../../models/User').findById(userId).select('_id lastLogin createdAt').lean();
      const existing = await AccountActivityIndex.findOne({ userId }).lean();
      const lastActivity = this.maxDate([existing?.lastLoginAt, existing?.lastApiActivityAt, existing?.lastTransactionAt, existing?.lastDocumentAt, existing?.lastGmailSyncAt, user?.lastLogin, user?.createdAt]);
      const inactiveDays = daysBetween(lastActivity);
      const dormancyStage = stageForInactiveDays(inactiveDays, opts.thresholds || DEFAULT_THRESHOLDS);
      const counters = await this.computeRollingLoginCounters(userId);
      const updated = await AccountActivityIndex.findOneAndUpdate(
        { userId },
        { $set: { ...counters, lastMeaningfulActivityAt: lastActivity, consecutiveInactiveDays: inactiveDays || 0, dormancyStage, isFrozen: ['unreachable', 'welfare_check', 'deceased_suspected', 'escalated_estate'].includes(dormancyStage) }, $setOnInsert: { userId, stageChangedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return { userId, created: !existing, dormancyStage: updated.dormancyStage, inactiveDays: updated.consecutiveInactiveDays, counters };
    } catch (error) {
      logger.error('Legacy Guard recompute user activity failed:', { userId, error: error.message });
      throw new Error(`Failed to recompute user activity: ${error.message}`);
    }
  }

  async getInactivityReport(userId) {
    try {
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const index = await AccountActivityIndex.findOne({ userId }).lean();
      if (!index) return { userId, lastMeaningfulActivityAt: null, inactiveDays: null, dormancyStage: 'active', isFrozen: false, counters: { loginCount30d: 0, loginCount90d: 0, loginCount365d: 0 } };
      return {
        userId,
        lastMeaningfulActivityAt: index.lastMeaningfulActivityAt,
        inactiveDays: daysBetween(index.lastMeaningfulActivityAt),
        dormancyStage: index.dormancyStage,
        isFrozen: Boolean(index.isFrozen),
        lastContactAttemptAt: index.lastContactAttemptAt || null,
        counters: { loginCount30d: index.loginCount30d || 0, loginCount90d: index.loginCount90d || 0, loginCount365d: index.loginCount365d || 0 },
        contactHealth: { emailBounceCount: index.emailBounceCount || 0, smsFailureCount: index.smsFailureCount || 0 }
      };
    } catch (error) {
      logger.error('Legacy Guard inactivity report failed:', { userId, error: error.message });
      throw new Error(`Failed to get inactivity report: ${error.message}`);
    }
  }

  async computeRollingLoginCounters(userId) {
    try {
      const ActivityLog = require('../../models/ActivityLog');
      const now = new Date();
      const since365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const rows = await ActivityLog.aggregate([
        { $match: { userId: this.toObjectId(userId), action: 'login', createdAt: { $gte: since365 }, isSuccess: { $ne: false } } },
        { $group: { _id: null, loginCount30d: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] } }, loginCount90d: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)] }, 1, 0] } }, loginCount365d: { $sum: 1 } } }
      ]).catch(error => {
        logger.warn('Legacy Guard rolling login counter aggregation failed:', { userId, error: error.message });
        return [];
      });
      const counters = rows[0] || {};
      return { loginCount30d: counters.loginCount30d || 0, loginCount90d: counters.loginCount90d || 0, loginCount365d: counters.loginCount365d || 0 };
    } catch (error) {
      logger.error('Legacy Guard rolling counters failed:', { userId, error: error.message });
      throw new Error(`Failed to compute rolling login counters: ${error.message}`);
    }
  }

  maxDate(values = []) {
    const dates = values.filter(Boolean).map(value => new Date(value)).filter(date => !Number.isNaN(date.getTime()));
    return dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null;
  }

  toObjectId(value) {
    const mongoose = require('mongoose');
    return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
  }
}

const activityTrackingService = new ActivityTrackingService();
module.exports = activityTrackingService;
module.exports.ActivityTrackingService = ActivityTrackingService;
