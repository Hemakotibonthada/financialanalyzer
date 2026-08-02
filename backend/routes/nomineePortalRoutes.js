/**
 * Nominee Portal Routes
 * Single-purpose token-authenticated endpoints for nominees
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const estateCaseService = require('../services/legacy/estateCaseService');
const estateAuditService = require('../services/legacy/estateAuditService');
const EstateCase = require('../models/EstateCase');
const EstateDocument = require('../models/EstateDocument');
const Nominee = require('../models/Nominee');
const logger = require('../utils/logger');
const { DOCUMENT_TYPE, RELATIONSHIP, maskValue } = require('../constants/legacyConstants');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const tokenAuth = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ success: false, message: 'Nominee portal is temporarily unavailable' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;
    if (!token) return res.status(401).json({ success: false, message: 'Portal token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'nominee_portal' || !decoded.estateCaseId || !decoded.nomineeId) {
      return res.status(401).json({ success: false, message: 'Invalid nominee portal token' });
    }

    req.portal = { estateCaseId: decoded.estateCaseId, nomineeId: decoded.nomineeId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Portal token expired' });
    logger.error('Nominee portal token error:', error);
    res.status(401).json({ success: false, message: 'Invalid nominee portal token' });
  }
};

router.use(tokenAuth);

const portalActor = (req) => ({ id: req.portal.nomineeId, role: 'nominee_portal' });
const audit = (req, action, entityType, entityId, after, reason) => estateAuditService.record({
  estateCaseId: req.portal.estateCaseId,
  actorId: req.portal.nomineeId,
  actorRole: 'nominee_portal',
  action,
  entityType,
  entityId,
  after,
  reason,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
const scope = async (req) => {
  const estateCase = await EstateCase.findById(req.portal.estateCaseId).lean();
  if (!estateCase) return { estateCase: null, nominee: null };
  const nominee = await Nominee.findOne({ _id: req.portal.nomineeId, userId: estateCase.userId }).lean();
  return { estateCase, nominee };
};

/**
 * @route   GET /api/nominee-portal/case
 * @desc    Get estate case summary visible to the nominee
 * @access  Nominee portal token
 */
router.get('/case', async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    res.json({
      success: true,
      data: {
        caseNumber: estateCase.caseNumber,
        status: estateCase.status,
        priority: estateCase.priority,
        claimant: estateCase.claimant ? {
          ...estateCase.claimant,
          contact: estateCase.claimant.contact ? { ...estateCase.claimant.contact, phone: maskValue(estateCase.claimant.contact.phone), email: maskValue(estateCase.claimant.contact.email) } : estateCase.claimant.contact
        } : null,
        nominee: {
          fullName: nominee.fullName,
          relationship: nominee.relationship,
          status: nominee.status,
          sharePercentage: nominee.sharePercentage,
          contact: nominee.contact ? { ...nominee.contact, phone: maskValue(nominee.contact.phone), email: maskValue(nominee.contact.email) } : nominee.contact
        },
        totals: estateCase.totals,
        disputeFlag: estateCase.disputeFlag
      }
    });
  } catch (error) {
    logger.error('Nominee portal case error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch portal case', error: error.message });
  }
});

/**
 * @route   GET /api/nominee-portal/documents
 * @desc    Get documents requested or uploaded for the nominee portal estate case
 * @access  Nominee portal token
 */
router.get('/documents', async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    const items = await EstateDocument.find({ estateCaseId: req.portal.estateCaseId })
      .select('documentType status fileName uploadedAt reviewedAt rejectionReason issuedBy issueDate expiryDate')
      .sort({ uploadedAt: -1 })
      .lean();
    res.json({ success: true, data: { items, total: items.length, page: 1, pages: 1 } });
  } catch (error) {
    logger.error('Nominee portal documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch portal documents', error: error.message });
  }
});

/**
 * @route   POST /api/nominee-portal/documents
 * @desc    Submit document metadata from the nominee portal
 * @access  Nominee portal token
 */
router.post('/documents', [
  body('documentType').isIn(DOCUMENT_TYPE),
  body('fileName').trim().notEmpty(),
  body('filePath').trim().notEmpty(),
  body('mimeType').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('sizeBytes').optional().isInt({ min: 0 }).toInt(),
  body('checksumSha256').optional({ nullable: true }).isHash('sha256'),
  body('documentNumber').optional({ nullable: true }).trim().isLength({ max: 80 }),
  validate
], async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    const document = await EstateDocument.create({ ...req.body, estateCaseId: req.portal.estateCaseId, userId: estateCase.userId, uploadedBy: req.portal.nomineeId, uploadedByRole: 'nominee_portal', uploadedAt: new Date(), status: 'uploaded', documentNumberMasked: maskValue(req.body.documentNumber) });
    await audit(req, 'nominee_portal_document_uploaded', 'EstateDocument', document._id, document, 'Nominee uploaded document metadata');
    res.status(201).json({ success: true, message: 'Document submitted successfully', data: document });
  } catch (error) {
    logger.error('Nominee portal upload document error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit document', error: error.message });
  }
});

/**
 * @route   POST /api/nominee-portal/claimant
 * @desc    Submit or update claimant details from nominee portal
 * @access  Nominee portal token
 */
router.post('/claimant', [
  body('fullName').trim().notEmpty().withMessage('Claimant name is required'),
  body('relationship').isIn(RELATIONSHIP),
  body('contact.phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('contact.email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('contact.address.line1').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('isLegalHeir').optional().isBoolean().toBoolean(),
  body('disputeNotes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  validate
], async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    const updated = await estateCaseService.attachClaimant(req.portal.estateCaseId, { ...req.body, nomineeId: req.portal.nomineeId, actor: portalActor(req) });
    await audit(req, 'nominee_portal_claimant_submitted', 'EstateCase', req.portal.estateCaseId, updated, 'Nominee submitted claimant details');
    res.json({ success: true, message: 'Claimant details submitted successfully', data: updated });
  } catch (error) {
    logger.error('Nominee portal claimant error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit claimant details', error: error.message });
  }
});

/**
 * @route   POST /api/nominee-portal/consent
 * @desc    Record nominee portal consent for estate assistance
 * @access  Nominee portal token
 */
router.post('/consent', [
  body('given').isBoolean().toBoolean(),
  body('documentId').optional({ nullable: true }).isMongoId(),
  validate
], async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    const updated = await EstateCase.findByIdAndUpdate(req.portal.estateCaseId, {
      consent: { given: req.body.given, givenBy: req.portal.nomineeId, givenAt: new Date(), ipAddress: req.ip, documentId: req.body.documentId }
    }, { new: true, runValidators: true });
    await audit(req, 'nominee_portal_consent_recorded', 'EstateCase', req.portal.estateCaseId, updated, 'Nominee portal consent recorded');
    res.json({ success: true, message: 'Consent recorded successfully', data: updated });
  } catch (error) {
    logger.error('Nominee portal consent error:', error);
    res.status(500).json({ success: false, message: 'Failed to record consent', error: error.message });
  }
});

/**
 * @route   GET /api/nominee-portal/timeline
 * @desc    Get nominee-safe estate case timeline
 * @access  Nominee portal token
 */
router.get('/timeline', async (req, res) => {
  try {
    const { estateCase, nominee } = await scope(req);
    if (!estateCase || !nominee) return res.status(404).json({ success: false, message: 'Portal case not found' });
    const items = (estateCase.timeline || []).map((entry) => ({ at: entry.at, action: entry.action, detail: entry.detail }));
    res.json({ success: true, data: { items, total: items.length, page: 1, pages: 1 } });
  } catch (error) {
    logger.error('Nominee portal timeline error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timeline', error: error.message });
  }
});

module.exports = router;
