const { SUPPORT_ROLES } = require('../constants/legacyConstants');
const logger = require('../utils/logger');

const getUserId = (user) => user?._id?.toString?.() || user?.id?.toString?.();

const requireRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.flat().filter(Boolean);

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient role for Legacy Guard access'
    });
  }

  next();
};

const requireSupport = requireRole(...SUPPORT_ROLES);

const requireDifferentActor = (getProposerId) => async (req, res, next) => {
  try {
    const proposerId = await getProposerId(req);
    const actorId = getUserId(req.user);

    if (proposerId && actorId && proposerId.toString() === actorId.toString()) {
      return res.status(409).json({
        success: false,
        message: 'Maker-checker violation: a different authorized actor must approve this action'
      });
    }

    next();
  } catch (error) {
    logger.error('Maker-checker guard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify maker-checker guard',
      error: error.message
    });
  }
};

/**
 * Resolve the account holder whose data is being read.
 *
 * EstateAuditEvent.userId is required (it is the whole point of a PII-access
 * record: *whose* data was read). Most support routes only carry a case id in
 * the path, so fall back to looking the subject up from the case itself.
 * Returns null when it genuinely cannot be determined.
 */
const resolveSubjectUserId = async (req) => {
  const direct = req.params.userId || req.query.userId || req.body?.userId;
  if (direct) return direct;

  const estateCaseId = req.params.estateCaseId || req.params.id;
  const dormancyCaseId = req.params.caseId;

  try {
    if (dormancyCaseId) {
      const DormancyCase = require('../models/DormancyCase');
      const found = await DormancyCase.findById(dormancyCaseId).select('userId').lean();
      if (found?.userId) return found.userId;
    }

    if (estateCaseId) {
      const EstateCase = require('../models/EstateCase');
      const estate = await EstateCase.findById(estateCaseId).select('userId').lean();
      if (estate?.userId) return estate.userId;

      const DormancyCase = require('../models/DormancyCase');
      const dormancy = await DormancyCase.findById(estateCaseId).select('userId').lean();
      if (dormancy?.userId) return dormancy.userId;
    }
  } catch (error) {
    logger.warn('Could not resolve subject user for PII audit:', error.message);
  }

  return null;
};

const logSupportAccess = (resourceType) => async (req, res, next) => {
  res.on('finish', async () => {
    if (!req.user || res.statusCode >= 400) return;

    try {
      const subjectUserId = await resolveSubjectUserId(req);

      // Without a subject the audit row cannot be written. Surface it loudly
      // rather than dropping the record, since an unaudited PII read is
      // exactly what this middleware exists to prevent.
      if (!subjectUserId) {
        logger.warn(
          `PII access audit skipped: no subject user resolved for ${req.method} ${req.originalUrl} by actor ${req.user._id}`
        );
        return;
      }

      const EstateAuditEvent = require('../models/EstateAuditEvent');
      await EstateAuditEvent.record({
        estateCaseId: req.params.estateCaseId || req.params.id,
        dormancyCaseId: req.params.caseId,
        userId: subjectUserId,
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'support_pii_read',
        entityType: resourceType,
        entityId: req.params.id || req.params.caseId || req.params.estateCaseId,
        reason: 'Support user read Legacy Guard PII',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        after: {
          method: req.method,
          path: req.originalUrl
        }
      });
    } catch (error) {
      logger.error('Support access audit error:', error);
    }
  });

  next();
};

module.exports = {
  requireSupport,
  requireRole,
  requireDifferentActor,
  logSupportAccess
};
