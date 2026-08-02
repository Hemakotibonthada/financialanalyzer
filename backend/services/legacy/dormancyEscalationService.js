const logger = require('../../utils/logger');
const { DEFAULT_OUTREACH, PROOF_OF_LIFE_OUTCOMES, CHANNEL_FAILURE_OUTCOMES, maskValue, isStageEscalation } = require('../../constants/legacyConstants');

class DormancyEscalationService {
  async runEscalationLadder() {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const DormancyPolicy = require('../../models/DormancyPolicy');
      const policy = await DormancyPolicy.getActive().catch(() => null);
      const outreach = policy?.outreach || DEFAULT_OUTREACH;
      const now = new Date();
      const cases = await DormancyCase.find({
        status: { $in: ['open', 'in_progress', 'awaiting_user', 'awaiting_nominee'] },
        $or: [{ nextOutreachDueAt: { $lte: now } }, { nextOutreachDueAt: null }, { nextOutreachDueAt: { $exists: false } }]
      }).limit(500);

      for (const dormancyCase of cases) {
        const before = { status: dormancyCase.status, nextOutreachDueAt: dormancyCase.nextOutreachDueAt };
        dormancyCase.status = dormancyCase.status === 'open' ? 'in_progress' : dormancyCase.status;
        dormancyCase.nextOutreachDueAt = new Date(now.getTime() + (outreach.cooldownHours || 48) * 60 * 60 * 1000);
        dormancyCase.timeline = dormancyCase.timeline || [];
        dormancyCase.timeline.push({ at: now, actor: null, action: 'outreach_due_scheduled', detail: { nextOutreachDueAt: dormancyCase.nextOutreachDueAt } });
        await dormancyCase.save();
        await require('./estateAuditService').record({ dormancyCaseId: dormancyCase._id, userId: dormancyCase.userId, action: 'dormancy_outreach_scheduled', entityType: 'DormancyCase', entityId: dormancyCase._id, before, after: { status: dormancyCase.status, nextOutreachDueAt: dormancyCase.nextOutreachDueAt } });
      }
      return { processed: cases.length, scheduled: cases.length };
    } catch (error) {
      logger.error('Legacy Guard escalation ladder failed:', error);
      throw new Error(`Failed to run dormancy escalation ladder: ${error.message}`);
    }
  }

  async recordOutreach(caseId, payload = {}) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const SupportInteraction = require('../../models/SupportInteraction');
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const dormancyCase = await DormancyCase.findById(caseId);
      if (!dormancyCase) throw new Error('Dormancy case not found');

      const interaction = await SupportInteraction.create({
        caseId: dormancyCase._id,
        caseType: 'dormancy',
        userId: dormancyCase.userId,
        agentId: payload.agentId,
        channel: payload.channel,
        direction: payload.direction || 'outbound',
        attemptNumber: (dormancyCase.outreachAttempts || 0) + 1,
        contactedParty: payload.contactedParty || 'user',
        contactValueMasked: maskValue(payload.contactValue || payload.contactValueMasked),
        outcome: payload.outcome,
        durationSeconds: payload.durationSeconds,
        notes: payload.notes,
        recordingUrl: payload.recordingUrl,
        followUpRequired: Boolean(payload.followUpRequired),
        followUpAt: payload.followUpAt,
        occurredAt: payload.occurredAt || new Date()
      });

      if (PROOF_OF_LIFE_OUTCOMES.includes(payload.outcome)) {
        const resolvedCase = await this.resolveAlive(dormancyCase._id, payload.agentId, payload.notes || 'Proof of life outreach outcome');
        return { interaction, case: resolvedCase };
      }

      const before = { status: dormancyCase.status, stage: dormancyCase.stage, outreachAttempts: dormancyCase.outreachAttempts };
      dormancyCase.outreachAttempts = (dormancyCase.outreachAttempts || 0) + 1;
      dormancyCase.lastOutreachAt = interaction.occurredAt;
      dormancyCase.nextOutreachDueAt = payload.followUpAt || null;
      if (payload.outcome === 'death_reported' && isStageEscalation(dormancyCase.stage, 'deceased_suspected')) {
        dormancyCase.stage = 'deceased_suspected';
        dormancyCase.status = 'awaiting_approval';
      } else if (CHANNEL_FAILURE_OUTCOMES.includes(payload.outcome)) {
        await AccountActivityIndex.findOneAndUpdate({ userId: dormancyCase.userId }, { $inc: { emailBounceCount: payload.channel === 'email' ? 1 : 0, smsFailureCount: payload.channel === 'sms' ? 1 : 0 }, $set: { lastContactAttemptAt: new Date() } });
      }
      dormancyCase.timeline = dormancyCase.timeline || [];
      dormancyCase.timeline.push({ at: new Date(), actor: payload.agentId, action: 'outreach_recorded', detail: { channel: payload.channel, outcome: payload.outcome } });
      await dormancyCase.save();
      await require('./estateAuditService').record({ dormancyCaseId: dormancyCase._id, userId: dormancyCase.userId, actorId: payload.agentId, action: 'support_outreach_recorded', entityType: 'SupportInteraction', entityId: interaction._id, before, after: { status: dormancyCase.status, stage: dormancyCase.stage, outreachAttempts: dormancyCase.outreachAttempts } });
      return { interaction, case: dormancyCase };
    } catch (error) {
      logger.error('Legacy Guard outreach record failed:', { caseId, outcome: payload?.outcome, error: error.message });
      throw new Error(`Failed to record outreach: ${error.message}`);
    }
  }

  async escalateToEstate(caseId, actor) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const dormancyCase = await DormancyCase.findById(caseId);
      if (!dormancyCase) throw new Error('Dormancy case not found');
      if (dormancyCase.escalatedToEstateCase) return dormancyCase.escalatedToEstateCase;
      const actorId = actor?.id || actor?._id || actor;
      const estateCase = await require('./estateCaseService').initiate({ userId: dormancyCase.userId, dormancyCaseId: dormancyCase._id, actorId });
      const before = { status: dormancyCase.status, stage: dormancyCase.stage, escalatedToEstateCase: dormancyCase.escalatedToEstateCase };
      dormancyCase.status = 'closed_deceased';
      dormancyCase.stage = 'escalated_estate';
      dormancyCase.escalatedToEstateCase = estateCase._id;
      await dormancyCase.save();
      await AccountActivityIndex.findOneAndUpdate({ userId: dormancyCase.userId }, { $set: { dormancyStage: 'escalated_estate', isFrozen: true, stageChangedAt: new Date() } });
      await require('./estateAuditService').record({ dormancyCaseId: dormancyCase._id, estateCaseId: estateCase._id, userId: dormancyCase.userId, actorId, action: 'dormancy_escalated_to_estate', entityType: 'DormancyCase', entityId: dormancyCase._id, before, after: { status: dormancyCase.status, stage: dormancyCase.stage, escalatedToEstateCase: estateCase._id } });
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard estate escalation failed:', { caseId, error: error.message });
      throw new Error(`Failed to escalate dormancy case to estate: ${error.message}`);
    }
  }

  async resolveAlive(caseId, actor, notes) {
    try {
      const DormancyCase = require('../../models/DormancyCase');
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const dormancyCase = await DormancyCase.findById(caseId);
      if (!dormancyCase) throw new Error('Dormancy case not found');
      const actorId = actor?.id || actor?._id || actor;
      const before = { status: dormancyCase.status, stage: dormancyCase.stage };
      dormancyCase.status = 'closed_alive';
      dormancyCase.userResponded = true;
      dormancyCase.respondedAt = new Date();
      dormancyCase.resolution = { outcome: 'closed_alive', notes, resolvedBy: actorId, resolvedAt: new Date() };
      await dormancyCase.save();
      await AccountActivityIndex.findOneAndUpdate({ userId: dormancyCase.userId }, { $set: { dormancyStage: 'active', isFrozen: false, lastMeaningfulActivityAt: new Date(), stageChangedAt: new Date(), consecutiveInactiveDays: 0 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      await require('./estateAuditService').record({ dormancyCaseId: dormancyCase._id, userId: dormancyCase.userId, actorId, action: 'proof_of_life_resolved_alive', entityType: 'DormancyCase', entityId: dormancyCase._id, before, after: { status: dormancyCase.status, accountFrozen: false }, reason: notes });
      return dormancyCase;
    } catch (error) {
      logger.error('Legacy Guard resolve alive failed:', { caseId, error: error.message });
      throw new Error(`Failed to resolve dormancy case as alive: ${error.message}`);
    }
  }
}

const dormancyEscalationService = new DormancyEscalationService();
module.exports = dormancyEscalationService;
module.exports.DormancyEscalationService = DormancyEscalationService;
