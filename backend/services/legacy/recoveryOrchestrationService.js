const logger = require('../../utils/logger');
const {
  CLAIM_PLAYBOOKS,
  CATEGORY_TO_CLAIM_TYPE,
  CASE_NUMBER_PREFIX,
  isValidClaimTransition,
  roundMoney
} = require('../../constants/legacyConstants');

class RecoveryOrchestrationService {
  async createClaim(payload = {}) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const EstateAsset = require('../../models/EstateAsset');
      const asset = await EstateAsset.findById(payload.estateAssetId).lean();
      if (!asset) throw new Error('Estate asset not found');
      const claimType = payload.claimType || CATEGORY_TO_CLAIM_TYPE[asset.category] || 'generic_recovery';
      const playbook = this.getPlaybook(claimType);
      const existing = await RecoveryClaim.findOne({ estateAssetId: asset._id, status: { $nin: ['withdrawn', 'settled'] } });
      if (existing) return existing;
      const claimNumber = await this.generateClaimNumber(RecoveryClaim);
      const claim = await RecoveryClaim.create({
        claimNumber,
        estateCaseId: asset.estateCaseId,
        estateAssetId: asset._id,
        userId: asset.userId,
        claimType,
        status: 'draft',
        institution: payload.institution || { name: asset.institution },
        claimedAmountInINR: roundMoney(payload.claimedAmountInINR || asset.estimatedValueInINR || 0),
        assignedTo: payload.assignedTo,
        documents: payload.documents || [],
        slaDueAt: new Date(Date.now() + playbook.slaDays * 24 * 60 * 60 * 1000),
        timeline: [{ at: new Date(), action: 'created', byUser: payload.actorId, note: playbook.label }]
      });
      await EstateAsset.findByIdAndUpdate(asset._id, { $set: { status: 'claim_initiated' } });
      await require('./estateAuditService').record({ estateCaseId: asset.estateCaseId, userId: asset.userId, actorId: payload.actorId, action: 'recovery_claim_created', entityType: 'RecoveryClaim', entityId: claim._id, after: { claimType, status: claim.status, requiredDocuments: playbook.requiredDocuments } });
      return claim;
    } catch (error) {
      logger.error('Legacy Guard claim create failed:', { estateAssetId: payload?.estateAssetId, error: error.message });
      throw new Error(`Failed to create recovery claim: ${error.message}`);
    }
  }

  async createClaimsForEstate(estateCaseId, actorId, options = {}) {
    try {
      const EstateAsset = require('../../models/EstateAsset');
      const assets = await EstateAsset.find({ estateCaseId, kind: 'asset', status: { $in: options.includeVerifiedOnly ? ['verified'] : ['discovered', 'verified'] } }).lean();
      const created = [];
      const skipped = [];
      for (const asset of assets) {
        try {
          created.push(await this.createClaim({ estateAssetId: asset._id, actorId, assignedTo: options.assignedTo }));
        } catch (error) {
          skipped.push({ estateAssetId: asset._id, reason: error.message });
        }
      }
      return { estateCaseId, created, skipped, count: created.length };
    } catch (error) {
      logger.error('Legacy Guard bulk claim creation failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to create claims for estate: ${error.message}`);
    }
  }

  async transitionClaim(claimId, nextStatus, actor, note) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const claim = await RecoveryClaim.findById(claimId);
      if (!claim) throw new Error('Recovery claim not found');
      if (!isValidClaimTransition(claim.status, nextStatus)) throw new Error(`Invalid claim transition from ${claim.status} to ${nextStatus}`);
      if (nextStatus === 'submitted') {
        const checklist = await this.getDocumentChecklist(claimId);
        if (!checklist.ready) throw new Error(`Cannot submit claim; missing documents: ${checklist.missing.join(', ')}`);
      }
      const before = this.claimSnapshot(claim);
      if (typeof claim.transitionTo === 'function') await claim.transitionTo(nextStatus, actor, note);
      else {
        claim.status = nextStatus;
        const now = new Date();
        if (nextStatus === 'submitted') claim.submittedAt = now;
        if (nextStatus === 'acknowledged') claim.acknowledgedAt = now;
        if (['approved', 'rejected'].includes(nextStatus)) claim.decisionAt = now;
        if (nextStatus === 'settled') claim.settledAt = now;
        this.addTimeline(claim, `transition_${nextStatus}`, actor, note);
        await claim.save();
      }
      await require('./estateAuditService').record({ estateCaseId: claim.estateCaseId, userId: claim.userId, actorId: actor, action: 'recovery_claim_transitioned', entityType: 'RecoveryClaim', entityId: claim._id, before, after: this.claimSnapshot(claim), reason: note });
      return claim;
    } catch (error) {
      logger.error('Legacy Guard claim transition failed:', { claimId, nextStatus, error: error.message });
      throw new Error(`Failed to transition recovery claim: ${error.message}`);
    }
  }

  async recordSettlement(claimId, payload = {}) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const EstateAsset = require('../../models/EstateAsset');
      const claim = await RecoveryClaim.findById(claimId);
      if (!claim) throw new Error('Recovery claim not found');
      const before = this.claimSnapshot(claim);
      claim.approvedAmountInINR = roundMoney(payload.approvedAmountInINR ?? claim.approvedAmountInINR ?? payload.receivedAmountInINR);
      claim.receivedAmountInINR = roundMoney(payload.receivedAmountInINR);
      claim.settledAt = payload.settledAt || new Date();
      if (claim.status !== 'settled') {
        if (!isValidClaimTransition(claim.status, 'settled')) throw new Error(`Invalid claim transition from ${claim.status} to settled`);
        claim.status = 'settled';
      }
      this.addTimeline(claim, 'settlement_recorded', payload.actorId, payload.note);
      await claim.save();
      await EstateAsset.findByIdAndUpdate(claim.estateAssetId, { $set: { recoveredValueInINR: claim.receivedAmountInINR, status: claim.receivedAmountInINR >= claim.claimedAmountInINR ? 'recovered' : 'partially_recovered' } });
      await require('./estateNotificationService').notifyLifecycle(claim.userId, 'claim_settled', { amount: claim.receivedAmountInINR, assetTitle: payload.assetTitle || 'asset', caseNumber: payload.caseNumber, claimantName: payload.claimantName || 'Claimant' }).catch(err => logger.warn('Legacy Guard claim settlement notification failed:', err.message));
      await require('./estateAuditService').record({ estateCaseId: claim.estateCaseId, userId: claim.userId, actorId: payload.actorId, action: 'recovery_claim_settled', entityType: 'RecoveryClaim', entityId: claim._id, before, after: this.claimSnapshot(claim), reason: payload.note });
      return claim;
    } catch (error) {
      logger.error('Legacy Guard settlement record failed:', { claimId, error: error.message });
      throw new Error(`Failed to record recovery settlement: ${error.message}`);
    }
  }

  async getDocumentChecklist(claimId) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const EstateDocument = require('../../models/EstateDocument');
      const claim = await RecoveryClaim.findById(claimId).lean();
      if (!claim) throw new Error('Recovery claim not found');
      const playbook = this.getPlaybook(claim.claimType);
      const docs = await EstateDocument.find({ _id: { $in: claim.documents || [] } }).lean();
      const verifiedTypes = new Set(docs.filter(doc => doc.status === 'verified').map(doc => doc.documentType));
      const missing = playbook.requiredDocuments.filter(type => !verifiedTypes.has(type));
      return { claimId, claimType: claim.claimType, required: playbook.requiredDocuments, optional: playbook.optionalDocuments, verified: Array.from(verifiedTypes), missing, ready: missing.length === 0, completionPercent: playbook.requiredDocuments.length ? roundMoney(((playbook.requiredDocuments.length - missing.length) / playbook.requiredDocuments.length) * 100) : 100 };
    } catch (error) {
      logger.error('Legacy Guard claim checklist failed:', { claimId, error: error.message });
      throw new Error(`Failed to build claim document checklist: ${error.message}`);
    }
  }

  async detectSlaBreaches(filters = {}) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const now = new Date();
      return await RecoveryClaim.find({ ...filters, slaDueAt: { $lt: now }, status: { $nin: ['settled', 'withdrawn'] } }).sort({ slaDueAt: 1 }).lean();
    } catch (error) {
      logger.error('Legacy Guard claim SLA breach detection failed:', error);
      throw new Error(`Failed to detect claim SLA breaches: ${error.message}`);
    }
  }

  async addCorrespondence(claimId, payload = {}) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const claim = await RecoveryClaim.findById(claimId);
      if (!claim) throw new Error('Recovery claim not found');
      const entry = { at: payload.at || new Date(), direction: payload.direction, channel: payload.channel, summary: payload.summary, byUser: payload.byUser, threadId: payload.threadId || `thread-${claimId}` };
      if (typeof claim.addCorrespondence === 'function') await claim.addCorrespondence(entry);
      else {
        claim.correspondence = claim.correspondence || [];
        claim.correspondence.push(entry);
        this.addTimeline(claim, 'correspondence_added', payload.byUser, payload.summary);
        await claim.save();
      }
      await require('./estateAuditService').record({ estateCaseId: claim.estateCaseId, userId: claim.userId, actorId: payload.byUser, action: 'recovery_claim_correspondence_added', entityType: 'RecoveryClaim', entityId: claim._id, after: { direction: payload.direction, channel: payload.channel, threadId: entry.threadId } });
      return claim;
    } catch (error) {
      logger.error('Legacy Guard claim correspondence failed:', { claimId, error: error.message });
      throw new Error(`Failed to add claim correspondence: ${error.message}`);
    }
  }

  async getCorrespondenceThread(claimId, threadId = null) {
    try {
      const RecoveryClaim = require('../../models/RecoveryClaim');
      const claim = await RecoveryClaim.findById(claimId).lean();
      if (!claim) throw new Error('Recovery claim not found');
      const entries = (claim.correspondence || []).filter(entry => !threadId || entry.threadId === threadId).sort((a, b) => new Date(a.at) - new Date(b.at));
      return { claimId, threadId, entries };
    } catch (error) {
      logger.error('Legacy Guard claim correspondence thread failed:', { claimId, error: error.message });
      throw new Error(`Failed to get claim correspondence thread: ${error.message}`);
    }
  }

  getPlaybook(claimType) {
    try {
      const playbook = CLAIM_PLAYBOOKS[claimType] || CLAIM_PLAYBOOKS.generic_recovery;
      return { claimType: CLAIM_PLAYBOOKS[claimType] ? claimType : 'generic_recovery', ...playbook };
    } catch (error) {
      logger.error('Legacy Guard playbook lookup failed:', { claimType, error: error.message });
      throw new Error(`Failed to get claim playbook: ${error.message}`);
    }
  }

  async generateClaimNumber(RecoveryClaim) {
    if (typeof RecoveryClaim.generateClaimNumber === 'function') return RecoveryClaim.generateClaimNumber();
    return `${CASE_NUMBER_PREFIX.claim}-${Date.now()}`;
  }

  addTimeline(claim, action, actor, note) {
    claim.timeline = claim.timeline || [];
    claim.timeline.push({ at: new Date(), action, byUser: actor, note });
  }

  claimSnapshot(claim) {
    return { status: claim.status, claimType: claim.claimType, claimedAmountInINR: claim.claimedAmountInINR, approvedAmountInINR: claim.approvedAmountInINR, receivedAmountInINR: claim.receivedAmountInINR, submittedAt: claim.submittedAt, settledAt: claim.settledAt, slaDueAt: claim.slaDueAt };
  }
}

const recoveryOrchestrationService = new RecoveryOrchestrationService();
module.exports = recoveryOrchestrationService;
module.exports.RecoveryOrchestrationService = RecoveryOrchestrationService;
