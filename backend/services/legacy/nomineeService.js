const logger = require('../../utils/logger');
const { maskValue, daysBetween } = require('../../constants/legacyConstants');

class NomineeService {
  async list(userId, filters = {}) {
    try {
      const Nominee = require('../../models/Nominee');
      const query = { userId };
      if (!filters.includeInactive) query.isActive = { $ne: false };
      return await Nominee.find(query).sort({ isPrimary: -1, createdAt: 1 }).lean();
    } catch (error) {
      logger.error('Legacy Guard nominee list failed:', { userId, error: error.message });
      throw new Error(`Failed to list nominees: ${error.message}`);
    }
  }

  async create(userId, payload, actorId = userId) {
    try {
      this.validateMinorGuardian(payload);
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.create({ ...payload, userId });
      await this.validateShareTotals(userId);
      await this.audit(userId, actorId, 'nominee_created', nominee._id, null, this.redactNominee(nominee));
      logger.info('Legacy Guard nominee created:', { userId, nomineeId: nominee._id, phone: maskValue(payload?.contact?.phone), email: maskValue(payload?.contact?.email) });
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee create failed:', { userId, error: error.message });
      throw new Error(`Failed to create nominee: ${error.message}`);
    }
  }

  async update(nomineeId, payload, actorId) {
    try {
      this.validateMinorGuardian(payload);
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.findById(nomineeId);
      if (!nominee) throw new Error('Nominee not found');
      const before = this.redactNominee(nominee);
      Object.assign(nominee, payload);
      await nominee.save();
      await this.validateShareTotals(nominee.userId);
      await this.audit(nominee.userId, actorId, 'nominee_updated', nominee._id, before, this.redactNominee(nominee));
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee update failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to update nominee: ${error.message}`);
    }
  }

  async remove(nomineeId, actorId, reason = 'Removed by user') {
    try {
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.findById(nomineeId);
      if (!nominee) throw new Error('Nominee not found');
      const before = this.redactNominee(nominee);
      nominee.isActive = false;
      nominee.status = 'inactive';
      nominee.notes = [nominee.notes, reason].filter(Boolean).join('\n');
      await nominee.save();
      await this.validateShareTotals(nominee.userId);
      await this.audit(nominee.userId, actorId, 'nominee_removed', nominee._id, before, this.redactNominee(nominee), reason);
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee remove failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to remove nominee: ${error.message}`);
    }
  }

  async verify(nomineeId, actor) {
    try {
      const Nominee = require('../../models/Nominee');
      const actorId = actor?.id || actor?._id || actor;
      const nominee = await Nominee.findById(nomineeId);
      if (!nominee) throw new Error('Nominee not found');
      this.validateMinorGuardian(nominee);
      if (!nominee.contact?.phone && !nominee.contact?.email) throw new Error('Nominee must have phone or email before verification');
      const before = this.redactNominee(nominee);
      nominee.status = 'verified';
      nominee.verifiedBy = actorId;
      nominee.verifiedAt = new Date();
      await nominee.save();
      await this.audit(nominee.userId, actorId, 'nominee_verified', nominee._id, before, this.redactNominee(nominee));
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee verify failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to verify nominee: ${error.message}`);
    }
  }

  async startVerification(nomineeId, actorId, note) {
    try {
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.findById(nomineeId);
      if (!nominee) throw new Error('Nominee not found');
      const before = this.redactNominee(nominee);
      nominee.status = 'pending_verification';
      nominee.notes = [nominee.notes, note].filter(Boolean).join('\n');
      await nominee.save();
      await this.audit(nominee.userId, actorId, 'nominee_verification_started', nominee._id, before, this.redactNominee(nominee), note);
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee verification start failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to start nominee verification: ${error.message}`);
    }
  }

  async rejectVerification(nomineeId, actorId, reason) {
    try {
      if (!reason) throw new Error('Rejection reason is required');
      const Nominee = require('../../models/Nominee');
      const nominee = await Nominee.findById(nomineeId);
      if (!nominee) throw new Error('Nominee not found');
      const before = this.redactNominee(nominee);
      nominee.status = 'rejected';
      nominee.notes = [nominee.notes, reason].filter(Boolean).join('\n');
      await nominee.save();
      await this.audit(nominee.userId, actorId, 'nominee_verification_rejected', nominee._id, before, this.redactNominee(nominee), reason);
      return nominee;
    } catch (error) {
      logger.error('Legacy Guard nominee verification reject failed:', { nomineeId, error: error.message });
      throw new Error(`Failed to reject nominee verification: ${error.message}`);
    }
  }

  async validateShareTotals(userId) {
    try {
      const Nominee = require('../../models/Nominee');
      if (typeof Nominee.validateShares === 'function') return await Nominee.validateShares(userId);
      const nominees = await Nominee.find({ userId, isActive: { $ne: false }, status: { $nin: ['inactive', 'superseded'] } }).lean();
      const total = nominees.reduce((sum, nominee) => sum + Number(nominee.sharePercentage || 0), 0);
      if (nominees.length && Math.round(total * 100) / 100 !== 100) throw new Error(`Active nominee shares must total 100%; current total is ${total}`);
      return { valid: true, total, nomineeCount: nominees.length };
    } catch (error) {
      logger.error('Legacy Guard nominee share validation failed:', { userId, error: error.message });
      throw new Error(`Failed to validate nominee shares: ${error.message}`);
    }
  }

  async rebalanceShares(userId, map, actorId = userId) {
    try {
      const Nominee = require('../../models/Nominee');
      const entries = Object.entries(map || {});
      const total = entries.reduce((sum, [, share]) => sum + Number(share || 0), 0);
      if (Math.round(total * 100) / 100 !== 100) throw new Error('Rebalanced nominee shares must total 100%');
      const nominees = await Nominee.find({ userId, _id: { $in: entries.map(([id]) => id) } });
      const before = nominees.map(n => this.redactNominee(n));
      for (const [id, sharePercentage] of entries) await Nominee.updateOne({ _id: id, userId }, { $set: { sharePercentage } });
      await this.validateShareTotals(userId);
      const after = await this.list(userId);
      await this.audit(userId, actorId, 'nominee_shares_rebalanced', null, before, after);
      return after;
    } catch (error) {
      logger.error('Legacy Guard nominee rebalance failed:', { userId, error: error.message });
      throw new Error(`Failed to rebalance nominee shares: ${error.message}`);
    }
  }

  async autoRebalanceEqual(userId, actorId = userId) {
    try {
      const nominees = await this.list(userId);
      if (!nominees.length) throw new Error('No active nominees to rebalance');
      const base = Math.floor((100 / nominees.length) * 100) / 100;
      let remaining = 100;
      const map = {};
      nominees.forEach((nominee, index) => {
        const share = index === nominees.length - 1 ? remaining : base;
        map[nominee._id] = share;
        remaining = Math.round((remaining - share) * 100) / 100;
      });
      return this.rebalanceShares(userId, map, actorId);
    } catch (error) {
      logger.error('Legacy Guard nominee equal rebalance failed:', { userId, error: error.message });
      throw new Error(`Failed to equally rebalance nominee shares: ${error.message}`);
    }
  }

  async getLegacyReadinessScore(userId) {
    try {
      const nominees = await this.list(userId, { includeInactive: false });
      const shareTotal = nominees.reduce((sum, nominee) => sum + Number(nominee.sharePercentage || 0), 0);
      const verifiedCount = nominees.filter(n => n.status === 'verified').length;
      const docsUploaded = nominees.reduce((sum, n) => sum + (Array.isArray(n.documents) ? n.documents.length : 0), 0);
      const freshContacts = nominees.filter(n => this.hasFreshContact(n)).length;
      const minorsWithoutGuardian = nominees.filter(n => this.isMinor(n) && !this.hasGuardian(n));
      const checks = {
        nomineesPresent: nominees.length > 0,
        sharesTotal100: Math.round(shareTotal * 100) / 100 === 100,
        allVerified: nominees.length > 0 && verifiedCount === nominees.length,
        documentsUploaded: docsUploaded > 0,
        contactsFresh: nominees.length > 0 && freshContacts === nominees.length,
        guardiansValid: minorsWithoutGuardian.length === 0
      };
      const weights = { nomineesPresent: 20, sharesTotal100: 25, allVerified: 20, documentsUploaded: 15, contactsFresh: 10, guardiansValid: 10 };
      const score = Object.entries(checks).reduce((sum, [key, ok]) => sum + (ok ? weights[key] : 0), 0);
      return { userId, score, grade: this.grade(score), checks, nomineeCount: nominees.length, shareTotal, verifiedCount, docsUploaded, issues: this.readinessIssues(checks, minorsWithoutGuardian) };
    } catch (error) {
      logger.error('Legacy Guard readiness score failed:', { userId, error: error.message });
      throw new Error(`Failed to compute legacy readiness score: ${error.message}`);
    }
  }

  validateMinorGuardian(payload = {}) {
    if (!this.isMinor(payload)) return;
    if (!this.hasGuardian(payload)) throw new Error('Minor nominee requires guardian name and phone or email');
  }

  isMinor(nominee = {}) {
    if (nominee.isMinor) return true;
    if (!nominee.dateOfBirth) return false;
    return daysBetween(nominee.dateOfBirth) < 18 * 365;
  }

  hasGuardian(nominee = {}) {
    return Boolean(nominee.guardian?.name && (nominee.guardian?.phone || nominee.guardian?.email));
  }

  hasFreshContact(nominee = {}) {
    if (!nominee.contact?.phone && !nominee.contact?.email) return false;
    const lastVerified = nominee.verifiedAt || nominee.updatedAt || nominee.createdAt;
    const ageDays = daysBetween(lastVerified);
    return ageDays === null || ageDays <= 365;
  }

  readinessIssues(checks, minorsWithoutGuardian) {
    const issues = [];
    if (!checks.nomineesPresent) issues.push('Add at least one nominee.');
    if (!checks.sharesTotal100) issues.push('Nominee shares must total 100%.');
    if (!checks.allVerified) issues.push('Complete nominee verification.');
    if (!checks.documentsUploaded) issues.push('Upload supporting identity/contact documents.');
    if (!checks.contactsFresh) issues.push('Refresh nominee contact details.');
    if (!checks.guardiansValid) issues.push(`${minorsWithoutGuardian.length} minor nominee(s) need guardian details.`);
    return issues;
  }

  grade(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'partial';
    return 'incomplete';
  }

  redactNominee(nominee) {
    const obj = typeof nominee.toObject === 'function' ? nominee.toObject() : { ...nominee };
    if (obj.contact) obj.contact = { ...obj.contact, phone: maskValue(obj.contact.phone), alternatePhone: maskValue(obj.contact.alternatePhone), email: maskValue(obj.contact.email) };
    if (obj.guardian) obj.guardian = { ...obj.guardian, phone: maskValue(obj.guardian.phone), email: maskValue(obj.guardian.email) };
    if (obj.identification) obj.identification = { ...obj.identification, numberEncrypted: undefined, maskedNumber: maskValue(obj.identification.maskedNumber || obj.identification.numberEncrypted) };
    return obj;
  }

  async audit(userId, actorId, action, entityId, before, after, reason) {
    await require('./estateAuditService').record({ userId, actorId, action, entityType: 'Nominee', entityId, before, after, reason });
  }
}

const nomineeService = new NomineeService();
module.exports = nomineeService;
module.exports.NomineeService = NomineeService;
