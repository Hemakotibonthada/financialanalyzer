const logger = require('../../utils/logger');
const {
  APPROVER_ROLES,
  PRIMARY_VERIFICATION_METHODS,
  CASE_NUMBER_PREFIX,
  CLAIM_PLAYBOOKS,
  isValidEstateTransition,
  maskValue,
  roundMoney
} = require('../../constants/legacyConstants');

class EstateCaseService {
  async initiate(payload = {}) {
    try {
      const EstateCase = require('../../models/EstateCase');
      if (!payload.userId) throw new Error('userId is required');
      const existing = payload.dormancyCaseId ? await EstateCase.findOne({ dormancyCaseId: payload.dormancyCaseId, status: { $ne: 'revoked' } }) : null;
      if (existing) return existing;
      const caseNumber = typeof EstateCase.generateCaseNumber === 'function' ? await EstateCase.generateCaseNumber() : `${CASE_NUMBER_PREFIX.estate}-${Date.now()}`;
      const estateCase = await EstateCase.create({
        caseNumber,
        userId: payload.userId,
        dormancyCaseId: payload.dormancyCaseId,
        status: 'initiated',
        priority: payload.priority || 'normal',
        assignedTo: payload.assignedTo,
        slaDueAt: payload.slaDueAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        policyVersion: payload.policyVersion,
        timeline: [{ at: new Date(), actor: payload.actorId, action: 'initiated', detail: payload.reason }]
      });
      await this.audit(estateCase, payload.actorId, 'estate_case_initiated', null, { status: estateCase.status });
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard estate case initiate failed:', { userId: payload?.userId, error: error.message });
      throw new Error(`Failed to initiate estate case: ${error.message}`);
    }
  }

  async proposeDeceased(caseId, actorId, payload = {}) {
    try {
      const EstateCase = require('../../models/EstateCase');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      this.assertTransition(estateCase.status, 'verification_pending');
      const before = this.snapshot(estateCase);
      estateCase.status = 'verification_pending';
      estateCase.deceased = { ...(estateCase.deceased || {}), reportedAt: new Date(), reportedBy: actorId, reportedVia: payload.reportedVia, dateOfDeath: payload.dateOfDeath, placeOfDeath: payload.placeOfDeath, causeCategory: payload.causeCategory };
      estateCase.verification = { ...(estateCase.verification || {}), method: payload.verificationMethod, documentId: payload.documentId, notes: payload.notes };
      estateCase.approval = { proposedBy: actorId, proposedAt: new Date(), decision: 'pending' };
      this.addTimeline(estateCase, actorId, 'deceased_proposed', { method: payload.verificationMethod, documentId: payload.documentId });
      await estateCase.save();
      await this.audit(estateCase, actorId, 'deceased_marking_proposed', before, this.snapshot(estateCase), payload.notes);
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard propose deceased failed:', { caseId, actorId, error: error.message });
      throw new Error(`Failed to propose deceased marking: ${error.message}`);
    }
  }

  async approveDeceased(caseId, approverId) {
    try {
      const EstateCase = require('../../models/EstateCase');
      const User = require('../../models/User');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      if (!estateCase.approval || estateCase.approval.decision !== 'pending') throw new Error('No pending deceased proposal to approve');
      if (String(estateCase.approval.proposedBy) === String(approverId)) throw new Error('Maker-checker violation: approver must differ from proposer');
      const approver = await User.findById(approverId).select('role').lean();
      if (!approver || !APPROVER_ROLES.includes(approver.role)) throw new Error('Approver role is not permitted for deceased approval');
      const documentCheck = await this.checkVerificationDocuments(estateCase._id, estateCase.verification);
      if (!documentCheck.ready) throw new Error(`Verification documents incomplete: ${documentCheck.missing.join(', ')}`);
      this.assertTransition(estateCase.status, 'verified');
      const before = this.snapshot(estateCase);
      estateCase.status = 'verified';
      estateCase.approval.approvedBy = approverId;
      estateCase.approval.approvedAt = new Date();
      estateCase.approval.approverRole = approver.role;
      estateCase.approval.decision = 'approved';
      estateCase.verification.verifiedBy = approverId;
      estateCase.verification.verifiedAt = new Date();
      this.addTimeline(estateCase, approverId, 'deceased_approved', { role: approver.role, documentCheck });
      await estateCase.save();
      await this.audit(estateCase, approverId, 'deceased_marking_approved', before, this.snapshot(estateCase));
      const discovery = await require('./assetDiscoveryService').discoverForUser(estateCase.userId, estateCase._id);
      await this.transitionTo(estateCase._id, 'asset_discovery', approverId, 'Automatic asset discovery started after verification');
      return { estateCase: await EstateCase.findById(caseId), discovery };
    } catch (error) {
      logger.error('Legacy Guard approve deceased failed:', { caseId, approverId, error: error.message });
      throw new Error(`Failed to approve deceased marking: ${error.message}`);
    }
  }

  async rejectDeceased(caseId, actorId, reason) {
    try {
      if (!reason) throw new Error('Rejection reason is required');
      const EstateCase = require('../../models/EstateCase');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      this.assertTransition(estateCase.status, 'rejected');
      const before = this.snapshot(estateCase);
      estateCase.status = 'rejected';
      estateCase.approval = { ...(estateCase.approval || {}), decision: 'rejected', rejectionReason: reason };
      this.addTimeline(estateCase, actorId, 'deceased_rejected', { reason });
      await estateCase.save();
      await this.audit(estateCase, actorId, 'deceased_marking_rejected', before, this.snapshot(estateCase), reason);
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard reject deceased failed:', { caseId, error: error.message });
      throw new Error(`Failed to reject deceased marking: ${error.message}`);
    }
  }

  async revoke(caseId, actorId, reason) {
    try {
      if (!reason || !String(reason).trim()) throw new Error('Revocation reason is required');
      const EstateCase = require('../../models/EstateCase');
      const AccountActivityIndex = require('../../models/AccountActivityIndex');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      this.assertTransition(estateCase.status, 'revoked');
      const before = this.snapshot(estateCase);
      estateCase.status = 'revoked';
      estateCase.revocation = { revoked: true, revokedBy: actorId, revokedAt: new Date(), reason };
      estateCase.approval = { ...(estateCase.approval || {}), decision: 'rejected', rejectionReason: reason };
      estateCase.deceased = {};
      this.addTimeline(estateCase, actorId, 'revoked', { reason });
      await estateCase.save();
      await AccountActivityIndex.findOneAndUpdate({ userId: estateCase.userId }, { $set: { dormancyStage: 'active', isFrozen: false, stageChangedAt: new Date() } });
      await require('./estateNotificationService').notifyLifecycle(estateCase.userId, 'case_revoked', { caseNumber: estateCase.caseNumber, reason, recipientName: 'Customer' }).catch(err => logger.warn('Legacy Guard revoke notification failed:', err.message));
      await this.audit(estateCase, actorId, 'estate_case_revoked', before, this.snapshot(estateCase), reason);
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard revoke estate case failed:', { caseId, error: error.message });
      throw new Error(`Failed to revoke estate case: ${error.message}`);
    }
  }

  async attachClaimant(caseId, actorId, payload = {}) {
    try {
      const EstateCase = require('../../models/EstateCase');
      const Nominee = require('../../models/Nominee');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      const nominee = payload.nomineeId ? await Nominee.findById(payload.nomineeId).lean() : null;
      const before = this.snapshot(estateCase);
      const relationship = payload.relationship || nominee?.relationship;
      const isLegalHeir = payload.isLegalHeir ?? nominee?.isLegalHeir ?? false;
      const nomineeDiffersFromLegalHeir = Boolean(nominee && isLegalHeir === false);
      estateCase.claimant = {
        nomineeId: payload.nomineeId,
        fullName: payload.fullName || nominee?.fullName,
        relationship,
        contact: this.maskContact(payload.contact || nominee?.contact || {}),
        isLegalHeir,
        verifiedAt: payload.verifiedAt || new Date()
      };
      estateCase.disputeFlag = Boolean(payload.disputeFlag || nomineeDiffersFromLegalHeir || (payload.legalHeirName && payload.legalHeirName !== estateCase.claimant.fullName));
      estateCase.disputeNotes = payload.disputeNotes || (estateCase.disputeFlag ? 'Nominee and legal-heir entitlement may differ; manual legal review required.' : undefined);
      this.addTimeline(estateCase, actorId, 'claimant_attached', { nomineeId: payload.nomineeId, disputeFlag: estateCase.disputeFlag });
      await estateCase.save();
      await this.audit(estateCase, actorId, 'estate_claimant_attached', before, this.snapshot(estateCase));
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard attach claimant failed:', { caseId, error: error.message });
      throw new Error(`Failed to attach claimant: ${error.message}`);
    }
  }

  async transitionTo(caseId, nextStatus, actorId, reason) {
    try {
      const EstateCase = require('../../models/EstateCase');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      this.assertTransition(estateCase.status, nextStatus);
      const before = this.snapshot(estateCase);
      estateCase.status = nextStatus;
      this.addTimeline(estateCase, actorId, `transition_${nextStatus}`, { reason });
      await estateCase.save();
      await this.audit(estateCase, actorId, 'estate_case_transitioned', before, this.snapshot(estateCase), reason);
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard estate transition failed:', { caseId, nextStatus, error: error.message });
      throw new Error(`Failed to transition estate case: ${error.message}`);
    }
  }

  async recomputeTotals(caseId, actorId = null) {
    try {
      const EstateCase = require('../../models/EstateCase');
      const EstateAsset = require('../../models/EstateAsset');
      const SettlementFee = require('../../models/SettlementFee');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      const before = this.snapshot(estateCase);
      const assets = await EstateAsset.find({ estateCaseId: caseId }).lean();
      const fee = await SettlementFee.findOne({ estateCaseId: caseId }).lean();
      const discoveredAssetsInINR = roundMoney(assets.filter(a => a.kind === 'asset').reduce((sum, a) => sum + Number(a.estimatedValueInINR || 0), 0));
      const discoveredLiabilitiesInINR = roundMoney(assets.filter(a => a.kind === 'liability').reduce((sum, a) => sum + Number(a.estimatedValueInINR || 0), 0));
      const recoveredInINR = roundMoney(assets.filter(a => ['recovered', 'partially_recovered'].includes(a.status)).reduce((sum, a) => sum + Number(a.recoveredValueInINR || 0), 0));
      estateCase.totals = { ...(estateCase.totals || {}), discoveredAssetsInINR, discoveredLiabilitiesInINR, recoveredInINR, feeInINR: fee?.totalPayableInINR || 0, netEstateInINR: roundMoney(recoveredInINR - discoveredLiabilitiesInINR - Number(fee?.balanceInINR || 0)) };
      await estateCase.save();
      await this.audit(estateCase, actorId, 'estate_totals_recomputed', before, this.snapshot(estateCase));
      return estateCase.totals;
    } catch (error) {
      logger.error('Legacy Guard recompute totals failed:', { caseId, error: error.message });
      throw new Error(`Failed to recompute estate totals: ${error.message}`);
    }
  }

  async close(caseId, actorId, summary) {
    try {
      if (!summary) throw new Error('Closure summary is required');
      const EstateCase = require('../../models/EstateCase');
      const estateCase = await EstateCase.findById(caseId);
      if (!estateCase) throw new Error('Estate case not found');
      this.assertTransition(estateCase.status, 'closed');
      const totals = await this.recomputeTotals(caseId, actorId);
      const before = this.snapshot(estateCase);
      estateCase.status = 'closed';
      estateCase.closedAt = new Date();
      estateCase.closureSummary = typeof summary === 'string' ? summary : JSON.stringify(summary);
      this.addTimeline(estateCase, actorId, 'closed', { summary, totals });
      await estateCase.save();
      await require('./estateNotificationService').notifyLifecycle(estateCase.userId, 'case_closed', { caseNumber: estateCase.caseNumber, summary: estateCase.closureSummary, claimantName: estateCase.claimant?.fullName || 'Claimant' }).catch(err => logger.warn('Legacy Guard close notification failed:', err.message));
      await this.audit(estateCase, actorId, 'estate_case_closed', before, this.snapshot(estateCase), estateCase.closureSummary);
      return estateCase;
    } catch (error) {
      logger.error('Legacy Guard close estate case failed:', { caseId, error: error.message });
      throw new Error(`Failed to close estate case: ${error.message}`);
    }
  }

  async checkVerificationDocuments(estateCaseId, verification = {}) {
    try {
      const EstateDocument = require('../../models/EstateDocument');
      const docs = await EstateDocument.find({ estateCaseId, status: 'verified' }).lean();
      const verifiedTypes = new Set(docs.map(doc => doc.documentType));
      const required = ['death_certificate'];
      if (verification?.method && !PRIMARY_VERIFICATION_METHODS.includes(verification.method)) required.push('legal_heir_certificate');
      if (verification?.documentId) return { ready: true, required, missing: [], verifiedTypes: Array.from(verifiedTypes) };
      const missing = required.filter(type => !verifiedTypes.has(type));
      return { ready: missing.length === 0, required, missing, verifiedTypes: Array.from(verifiedTypes) };
    } catch (error) {
      logger.error('Legacy Guard verification document check failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to check verification documents: ${error.message}`);
    }
  }

  getClaimRequirements(claimType = 'generic_recovery') {
    try {
      const playbook = CLAIM_PLAYBOOKS[claimType] || CLAIM_PLAYBOOKS.generic_recovery;
      return { claimType, requiredDocuments: playbook.requiredDocuments, optionalDocuments: playbook.optionalDocuments, guidance: playbook.guidance };
    } catch (error) {
      logger.error('Legacy Guard claim requirements lookup failed:', { claimType, error: error.message });
      throw new Error(`Failed to get claim requirements: ${error.message}`);
    }
  }

  assertTransition(from, to) {
    if (!isValidEstateTransition(from, to)) throw new Error(`Invalid estate transition from ${from} to ${to}`);
  }

  addTimeline(estateCase, actor, action, detail) {
    estateCase.timeline = estateCase.timeline || [];
    estateCase.timeline.push({ at: new Date(), actor, action, detail });
  }

  maskContact(contact = {}) {
    return { ...contact, phone: maskValue(contact.phone), alternatePhone: maskValue(contact.alternatePhone), email: maskValue(contact.email) };
  }

  snapshot(estateCase) {
    const obj = typeof estateCase.toObject === 'function' ? estateCase.toObject() : { ...estateCase };
    if (obj.claimant?.contact) obj.claimant.contact = this.maskContact(obj.claimant.contact);
    return { status: obj.status, deceased: obj.deceased, verification: obj.verification, approval: obj.approval, claimant: obj.claimant, disputeFlag: obj.disputeFlag, disputeNotes: obj.disputeNotes, totals: obj.totals, revocation: obj.revocation, closedAt: obj.closedAt, closureSummary: obj.closureSummary };
  }

  async audit(estateCase, actorId, action, before, after, reason) {
    await require('./estateAuditService').record({ estateCaseId: estateCase._id, dormancyCaseId: estateCase.dormancyCaseId, userId: estateCase.userId, actorId, action, entityType: 'EstateCase', entityId: estateCase._id, before, after, reason });
  }
}

const estateCaseService = new EstateCaseService();
module.exports = estateCaseService;
module.exports.EstateCaseService = EstateCaseService;
