const logger = require('../../utils/logger');
const {
  DEFAULT_THRESHOLDS,
  CASE_NUMBER_PREFIX,
  daysBetween,
  stageForInactiveDays,
  isStageEscalation
} = require('../../constants/legacyConstants');

class DormancyDetectionService {
  async scanForDormancy(opts = {}) {
    try {
      const preview = await this.previewScan(opts);
      const cases = [];
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      for (const change of preview.changes) {
        if (change.isEscalation) {
          const dormancyCase = await this.openCaseFor(change.userId, change.triggers, {
            stage: change.nextStage,
            daysInactive: change.inactiveDays,
            activityIndexId: change.activityIndexId,
            policyVersion: preview.policyVersion
          });
          cases.push(dormancyCase);
        }
        await AccountActivityIndex.findOneAndUpdate(
          { userId: change.userId },
          { $set: { dormancyStage: change.nextStage, consecutiveInactiveDays: change.inactiveDays || 0, stageChangedAt: change.currentStage !== change.nextStage ? new Date() : change.stageChangedAt, isFrozen: this.shouldFreeze(change.nextStage) }, $setOnInsert: { userId: change.userId, lastMeaningfulActivityAt: change.lastMeaningfulActivityAt } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      return { ...preview.summary, cases };
    } catch (error) {
      logger.error('Legacy Guard dormancy scan failed:', error);
      throw new Error(`Dormancy scan failed: ${error.message}`);
    }
  }

  async previewScan(opts = {}) {
    try {
      const User = require('../../models/User');
      const DormancyPolicy = require('../../models/DormancyPolicy');
      const policy = await DormancyPolicy.getActive().catch(() => null);
      const thresholds = opts.thresholds || policy?.thresholds || DEFAULT_THRESHOLDS;
      const batchSize = Math.min(Number(opts.batchSize) || 500, 1000);
      let lastId = opts.afterId || null;
      const changes = [];
      let scanned = 0;

      while (true) {
        const query = { isActive: { $ne: false } };
        if (lastId) query._id = { $gt: lastId };
        const users = await User.find(query).sort({ _id: 1 }).limit(batchSize).select('_id lastLogin createdAt email').lean();
        if (!users.length) break;
        for (const user of users) {
          const detail = await this.classifyUser(user._id, { user, thresholds });
          if (detail.currentStage !== detail.nextStage || detail.triggers.length) changes.push(detail);
          scanned += 1;
        }
        lastId = users[users.length - 1]._id;
        if (opts.once) break;
      }

      return {
        policyVersion: policy?.version,
        thresholds,
        changes,
        summary: this.summarizePreview(scanned, changes)
      };
    } catch (error) {
      logger.error('Legacy Guard dormancy preview failed:', error);
      throw new Error(`Dormancy preview failed: ${error.message}`);
    }
  }

  async bulkReclassify(opts = {}) {
    try {
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const preview = await this.previewScan(opts);
      let updated = 0;
      for (const change of preview.changes) {
        await AccountActivityIndex.findOneAndUpdate(
          { userId: change.userId },
          { $set: { dormancyStage: change.nextStage, consecutiveInactiveDays: change.inactiveDays || 0, stageChangedAt: new Date(), isFrozen: this.shouldFreeze(change.nextStage) }, $setOnInsert: { userId: change.userId, lastMeaningfulActivityAt: change.lastMeaningfulActivityAt } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        updated += 1;
      }
      return { ...preview.summary, updated, thresholds: preview.thresholds };
    } catch (error) {
      logger.error('Legacy Guard bulk reclassification failed:', error);
      throw new Error(`Failed to bulk reclassify dormancy: ${error.message}`);
    }
  }

  async classifyUser(userId, opts = {}) {
    try {
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const DormancyPolicy = require('../../models/DormancyPolicy');
      const policy = opts.thresholds ? null : await DormancyPolicy.getActive().catch(() => null);
      const thresholds = opts.thresholds || policy?.thresholds || DEFAULT_THRESHOLDS;
      const index = await AccountActivityIndex.findOne({ userId }).lean();
      const user = opts.user || await require('../../models/User').findById(userId).select('_id lastLogin createdAt email').lean();
      const lastMeaningfulActivityAt = index?.lastMeaningfulActivityAt || user?.lastLogin || user?.createdAt;
      const inactiveDays = daysBetween(lastMeaningfulActivityAt);
      const activityStage = stageForInactiveDays(inactiveDays, thresholds);
      const contactSignals = this.contactStalenessSignals(index);
      const nextStage = this.escalateForContactSignals(activityStage, contactSignals);
      const currentStage = index?.dormancyStage || 'active';
      return {
        userId,
        activityIndexId: index?._id,
        lastMeaningfulActivityAt,
        inactiveDays,
        currentStage,
        nextStage,
        stage: nextStage,
        isEscalation: isStageEscalation(currentStage, nextStage),
        triggers: this.triggersFor(inactiveDays, contactSignals),
        contactSignals,
        stageChangedAt: index?.stageChangedAt,
        isFrozen: Boolean(index?.isFrozen),
        supportDetail: {
          lastLoginAt: index?.lastLoginAt || user?.lastLogin,
          lastApiActivityAt: index?.lastApiActivityAt,
          lastTransactionAt: index?.lastTransactionAt,
          lastContactAttemptAt: index?.lastContactAttemptAt,
          emailBounceCount: index?.emailBounceCount || 0,
          smsFailureCount: index?.smsFailureCount || 0,
          recommendedAction: this.recommendedAction(nextStage, contactSignals)
        }
      };
    } catch (error) {
      logger.error('Legacy Guard user classification failed:', { userId, error: error.message });
      throw new Error(`Failed to classify user dormancy: ${error.message}`);
    }
  }

  async getSupportDetail(userId) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const detail = await this.classifyUser(userId);
      const openCase = await DormancyCase.findOne({ userId, status: { $nin: ['closed_alive', 'closed_deceased', 'closed_false_alarm', 'cancelled'] } }).lean();
      return { ...detail, openCase };
    } catch (error) {
      logger.error('Legacy Guard support detail failed:', { userId, error: error.message });
      throw new Error(`Failed to load dormancy support detail: ${error.message}`);
    }
  }

  async openCaseFor(userId, triggers = ['no_app_activity'], options = {}) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const stage = options.stage || 'watch';
      const openCase = await DormancyCase.findOne({ userId, status: { $nin: ['closed_alive', 'closed_deceased', 'closed_false_alarm', 'cancelled'] } });
      if (openCase) {
        if (isStageEscalation(openCase.stage, stage)) {
          const before = { stage: openCase.stage, status: openCase.status };
          openCase.stage = stage;
          openCase.status = openCase.status === 'open' ? 'in_progress' : openCase.status;
          openCase.triggers = Array.from(new Set([...(openCase.triggers || []), ...triggers]));
          openCase.daysInactiveAtDetection = options.daysInactive ?? openCase.daysInactiveAtDetection;
          this.addTimeline(openCase, null, 'stage_escalated', { stage, triggers });
          await openCase.save();
          await require('./estateAuditService').record({ dormancyCaseId: openCase._id, userId, action: 'dormancy_case_escalated', entityType: 'DormancyCase', entityId: openCase._id, before, after: { stage: openCase.stage, status: openCase.status } });
        }
        return openCase;
      }

      const caseNumber = typeof DormancyCase.generateCaseNumber === 'function' ? await DormancyCase.generateCaseNumber() : `${CASE_NUMBER_PREFIX.dormancy}-${Date.now()}`;
      const dormancyCase = await DormancyCase.create({
        caseNumber,
        userId,
        activityIndexId: options.activityIndexId,
        stage,
        status: 'open',
        priority: stage === 'welfare_check' ? 'high' : 'normal',
        triggers,
        detectedAt: new Date(),
        daysInactiveAtDetection: options.daysInactive || 0,
        slaDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        policyVersion: options.policyVersion,
        timeline: [{ at: new Date(), actor: null, action: 'opened', detail: { stage, triggers } }]
      });
      await require('./estateAuditService').record({ dormancyCaseId: dormancyCase._id, userId, action: 'dormancy_case_opened', entityType: 'DormancyCase', entityId: dormancyCase._id, after: { stage, triggers } });
      return dormancyCase;
    } catch (error) {
      logger.error('Legacy Guard open dormancy case failed:', { userId, error: error.message });
      throw new Error(`Failed to open dormancy case: ${error.message}`);
    }
  }

  contactStalenessSignals(index = {}) {
    const emailBounceCount = Number(index?.emailBounceCount || 0);
    const smsFailureCount = Number(index?.smsFailureCount || 0);
    const daysSinceContact = daysBetween(index?.lastContactAttemptAt);
    return {
      bouncedEmail: emailBounceCount >= 2,
      failedSms: smsFailureCount >= 2,
      staleContactAttempt: daysSinceContact !== null && daysSinceContact > 30,
      emailBounceCount,
      smsFailureCount,
      daysSinceContact
    };
  }

  escalateForContactSignals(stage, signals) {
    if (signals.bouncedEmail && signals.failedSms && isStageEscalation(stage, 'unreachable')) return 'unreachable';
    if ((signals.bouncedEmail || signals.failedSms) && isStageEscalation(stage, 'dormant')) return 'dormant';
    return stage;
  }

  triggersFor(inactiveDays, signals) {
    const triggers = [];
    if (inactiveDays !== null) triggers.push('no_app_activity');
    if (signals.bouncedEmail) triggers.push('bounced_email');
    if (signals.failedSms) triggers.push('failed_contact');
    return Array.from(new Set(triggers));
  }

  recommendedAction(stage, signals) {
    if (stage === 'active') return 'No action required.';
    if (signals.bouncedEmail || signals.failedSms) return 'Verify contact channels before further escalation.';
    if (stage === 'welfare_check') return 'Start welfare outreach and nominee contact per policy.';
    return 'Queue standard outreach and monitor response.';
  }

  summarizePreview(scanned, changes) {
    const byStage = changes.reduce((acc, change) => {
      acc[change.nextStage] = (acc[change.nextStage] || 0) + 1;
      return acc;
    }, {});
    return { scanned, wouldChange: changes.length, escalations: changes.filter(c => c.isEscalation).length, byStage };
  }

  shouldFreeze(stage) {
    return ['unreachable', 'welfare_check', 'deceased_suspected', 'escalated_estate'].includes(stage);
  }

  addTimeline(dormancyCase, actor, action, detail) {
    dormancyCase.timeline = dormancyCase.timeline || [];
    dormancyCase.timeline.push({ at: new Date(), actor, action, detail });
  }
}

const dormancyDetectionService = new DormancyDetectionService();
module.exports = dormancyDetectionService;
module.exports.DormancyDetectionService = DormancyDetectionService;
