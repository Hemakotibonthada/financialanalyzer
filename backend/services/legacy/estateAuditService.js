const logger = require('../../utils/logger');

class EstateAuditService {
  async record(payload) {
    try {
      const EstateAuditEvent = require('../../models/EstateAuditEvent');
      if (!payload?.action) throw new Error('Audit action is required');
      return await EstateAuditEvent.record({ occurredAt: new Date(), ...payload });
    } catch (error) {
      logger.error('Legacy Guard audit record failed:', {
        action: payload?.action,
        estateCaseId: payload?.estateCaseId,
        dormancyCaseId: payload?.dormancyCaseId,
        error: error.message
      });
      throw new Error(`Failed to record estate audit event: ${error.message}`);
    }
  }

  async getTrail(estateCaseId) {
    try {
      const EstateAuditEvent = require('../../models/EstateAuditEvent');
      return await EstateAuditEvent.find({ estateCaseId }).sort({ sequence: 1, occurredAt: 1 }).lean();
    } catch (error) {
      logger.error('Legacy Guard audit trail lookup failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to load estate audit trail: ${error.message}`);
    }
  }

  async verifyIntegrity(estateCaseId) {
    try {
      const EstateAuditEvent = require('../../models/EstateAuditEvent');
      return await EstateAuditEvent.verifyChain(estateCaseId);
    } catch (error) {
      logger.error('Legacy Guard audit integrity check failed:', { estateCaseId, error: error.message });
      throw new Error(`Failed to verify estate audit chain: ${error.message}`);
    }
  }
}

const estateAuditService = new EstateAuditService();
module.exports = estateAuditService;
module.exports.EstateAuditService = EstateAuditService;
