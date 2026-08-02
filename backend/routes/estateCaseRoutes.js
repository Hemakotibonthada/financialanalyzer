/**
 * Estate Case Routes
 * Support workbench endpoints for Legacy Guard estate cases
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireSupport, requireRole, requireDifferentActor, logSupportAccess } = require('../middleware/supportAuth');
const estateCaseService = require('../services/legacy/estateCaseService');
const assetDiscoveryService = require('../services/legacy/assetDiscoveryService');
const estateAuditService = require('../services/legacy/estateAuditService');
const EstateCase = require('../models/EstateCase');
const EstateAsset = require('../models/EstateAsset');
const EstateDocument = require('../models/EstateDocument');
const Nominee = require('../models/Nominee');
const logger = require('../utils/logger');
const { APPROVER_ROLES, ESTATE_STATUS, CASE_PRIORITY, VERIFICATION_METHOD, DOCUMENT_TYPE, ASSET_CATEGORY, LIABILITY_CATEGORY, ASSET_STATUS, RELATIONSHIP, maskValue } = require('../constants/legacyConstants');

router.use(authenticate);
router.use(requireSupport);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};
const pagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};
const actor = (req) => ({ id: req.user._id, role: req.user.role, name: req.user.name });
const audit = (req, action, entityType, entityId, after, reason) => estateAuditService.record({
  estateCaseId: req.params.id || req.params.estateCaseId,
  userId: after?.userId || req.body.userId,
  actorId: req.user._id,
  actorRole: req.user.role,
  action,
  entityType,
  entityId,
  after,
  reason,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
const getProposerId = async (req) => {
  const estateCase = await EstateCase.findById(req.params.id).select('approval.proposedBy').lean();
  return estateCase?.approval?.proposedBy;
};
const maskListCase = (item) => {
  const row = item.toObject ? item.toObject() : { ...item };
  if (row.claimant?.contact) {
    row.claimant = { ...row.claimant, contact: { ...row.claimant.contact, phone: maskValue(row.claimant.contact.phone), email: maskValue(row.claimant.contact.email) } };
  }
  return row;
};

/**
 * @route   GET /api/legacy/estate
 * @desc    Get paginated estate cases
 * @access  Private (Support)
 */
router.get('/', [
  query('status').optional().isIn(ESTATE_STATUS),
  query('priority').optional().isIn(CASE_PRIORITY),
  query('assignedTo').optional().isMongoId(),
  query('userId').optional().isMongoId(),
  validate
], async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = {};
    ['status', 'priority', 'assignedTo', 'userId'].forEach((key) => { if (req.query[key]) filters[key] = req.query[key]; });
    const [items, total] = await Promise.all([
      EstateCase.find(filters).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      EstateCase.countDocuments(filters)
    ]);
    res.json({ success: true, data: { items: items.map(maskListCase), total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get estate cases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estate cases', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/estate/:id
 * @desc    Get estate case detail
 * @access  Private (Support)
 */
router.get('/:id', [param('id').isMongoId(), validate], logSupportAccess('EstateCase'), async (req, res) => {
  try {
    const estateCase = await EstateCase.findById(req.params.id).lean();
    if (!estateCase) return res.status(404).json({ success: false, message: 'Estate case not found' });
    res.json({ success: true, data: estateCase });
  } catch (error) {
    logger.error('Get estate case error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estate case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate
 * @desc    Initiate an estate case
 * @access  Private (Support)
 */
router.post('/', [
  body('userId').isMongoId().withMessage('Valid userId is required'),
  body('dormancyCaseId').optional({ nullable: true }).isMongoId(),
  body('priority').optional().isIn(CASE_PRIORITY),
  body('reason').trim().notEmpty().withMessage('Initiation reason is required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.initiate({ ...req.body, actor: actor(req) });
    await audit(req, 'estate_case_initiated', 'EstateCase', estateCase?._id, estateCase, req.body.reason);
    res.status(201).json({ success: true, message: 'Estate case initiated successfully', data: estateCase });
  } catch (error) {
    logger.error('Initiate estate case error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate estate case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/propose-deceased
 * @desc    Propose deceased marking for maker-checker approval
 * @access  Private (Support)
 */
router.post('/:id/propose-deceased', [
  param('id').isMongoId(),
  body('reportedVia').trim().notEmpty().withMessage('Report source is required'),
  body('dateOfDeath').optional({ nullable: true }).isISO8601().toDate(),
  body('placeOfDeath').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('causeCategory').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('verificationMethod').isIn(VERIFICATION_METHOD),
  body('documentId').optional({ nullable: true }).isMongoId(),
  body('notes').trim().notEmpty().withMessage('Proposal notes are required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.proposeDeceased(req.params.id, { ...req.body, actor: actor(req) });
    await audit(req, 'deceased_marking_proposed', 'EstateCase', req.params.id, estateCase, req.body.notes);
    res.json({ success: true, message: 'Deceased marking proposed for approval', data: estateCase });
  } catch (error) {
    logger.error('Propose deceased error:', error);
    res.status(500).json({ success: false, message: 'Failed to propose deceased marking', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/approve-deceased
 * @desc    Approve deceased marking using maker-checker control
 * @access  Private (Estate Approver)
 */
router.post('/:id/approve-deceased', requireRole(...APPROVER_ROLES), requireDifferentActor(getProposerId), [
  param('id').isMongoId(),
  body('notes').trim().notEmpty().withMessage('Approval notes are required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.approveDeceased(req.params.id, { ...req.body, actor: actor(req) });
    await audit(req, 'deceased_marking_approved', 'EstateCase', req.params.id, estateCase, req.body.notes);
    res.json({ success: true, message: 'Deceased marking approved', data: estateCase });
  } catch (error) {
    logger.error('Approve deceased error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve deceased marking', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/reject-deceased
 * @desc    Reject a proposed deceased marking
 * @access  Private (Estate Approver)
 */
router.post('/:id/reject-deceased', requireRole(...APPROVER_ROLES), [
  param('id').isMongoId(),
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.rejectDeceased(req.params.id, { ...req.body, actor: actor(req) });
    await audit(req, 'deceased_marking_rejected', 'EstateCase', req.params.id, estateCase, req.body.reason);
    res.json({ success: true, message: 'Deceased marking rejected', data: estateCase });
  } catch (error) {
    logger.error('Reject deceased error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject deceased marking', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/revoke
 * @desc    Revoke deceased marking for false alarm or correction
 * @access  Private (Support)
 */
router.post('/:id/revoke', [
  param('id').isMongoId(),
  body('reason').trim().notEmpty().withMessage('Revocation reason is required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.revoke(req.params.id, actor(req), req.body.reason);
    await audit(req, 'estate_case_revoked', 'EstateCase', req.params.id, estateCase, req.body.reason);
    res.json({ success: true, message: 'Estate case revoked successfully', data: estateCase });
  } catch (error) {
    logger.error('Revoke estate case error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke estate case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/claimant
 * @desc    Attach or update claimant details on an estate case
 * @access  Private (Support)
 */
router.post('/:id/claimant', [
  param('id').isMongoId(),
  body('nomineeId').optional({ nullable: true }).isMongoId(),
  body('fullName').trim().notEmpty().withMessage('Claimant name is required'),
  body('relationship').isIn(RELATIONSHIP),
  body('contact.phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('contact.email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('isLegalHeir').optional().isBoolean().toBoolean(),
  body('disputeNotes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  validate
], async (req, res) => {
  try {
    if (req.body.nomineeId) {
      const estateCase = await EstateCase.findById(req.params.id).select('userId').lean();
      const nominee = await Nominee.findOne({ _id: req.body.nomineeId, userId: estateCase?.userId }).select('_id').lean();
      if (!nominee) return res.status(400).json({ success: false, message: 'Nominee does not belong to the estate user' });
    }
    const estateCase = await estateCaseService.attachClaimant(req.params.id, { ...req.body, actor: actor(req) });
    await audit(req, 'estate_claimant_attached', 'EstateCase', req.params.id, estateCase, 'Claimant details updated');
    res.json({ success: true, message: 'Claimant attached successfully', data: estateCase });
  } catch (error) {
    logger.error('Attach claimant error:', error);
    res.status(500).json({ success: false, message: 'Failed to attach claimant', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/discover-assets
 * @desc    Discover assets and liabilities for an estate case
 * @access  Private (Support)
 */
router.post('/:id/discover-assets', [
  param('id').isMongoId(),
  body('force').optional().isBoolean().toBoolean(),
  validate
], async (req, res) => {
  try {
    const estateCase = await EstateCase.findById(req.params.id).select('userId').lean();
    if (!estateCase) return res.status(404).json({ success: false, message: 'Estate case not found' });
    const result = await assetDiscoveryService.discoverForUser(estateCase.userId, req.params.id, { force: req.body.force, actor: actor(req) });
    await audit(req, 'estate_assets_discovered', 'EstateCase', req.params.id, result, 'Asset discovery run');
    res.json({ success: true, message: 'Asset discovery completed', data: result });
  } catch (error) {
    logger.error('Discover estate assets error:', error);
    res.status(500).json({ success: false, message: 'Failed to discover assets', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/estate/:id/assets
 * @desc    Get paginated estate assets and liabilities
 * @access  Private (Support)
 */
router.get('/:id/assets', [
  param('id').isMongoId(),
  query('kind').optional().isIn(['asset', 'liability']),
  query('category').optional().isIn([...ASSET_CATEGORY, ...LIABILITY_CATEGORY]),
  query('status').optional().isIn(ASSET_STATUS),
  validate
], logSupportAccess('EstateAsset'), async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = { estateCaseId: req.params.id };
    ['kind', 'category', 'status'].forEach((key) => { if (req.query[key]) filters[key] = req.query[key]; });
    const [items, total] = await Promise.all([
      EstateAsset.find(filters).sort({ kind: 1, estimatedValueInINR: -1 }).skip(skip).limit(limit).lean(),
      EstateAsset.countDocuments(filters)
    ]);
    res.json({
      success: true,
      data: {
        items: items.map((asset) => ({ ...asset, counterparty: asset.counterparty ? { ...asset.counterparty, phone: maskValue(asset.counterparty.phone), email: maskValue(asset.counterparty.email) } : asset.counterparty })),
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get estate assets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estate assets', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/documents
 * @desc    Add document metadata to an estate case
 * @access  Private (Support)
 */
router.post('/:id/documents', [
  param('id').isMongoId(),
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
    const estateCase = await EstateCase.findById(req.params.id).select('userId').lean();
    if (!estateCase) return res.status(404).json({ success: false, message: 'Estate case not found' });
    const document = await EstateDocument.create({ ...req.body, estateCaseId: req.params.id, userId: estateCase.userId, uploadedBy: req.user._id, uploadedByRole: req.user.role, uploadedAt: new Date(), status: 'uploaded', documentNumberMasked: maskValue(req.body.documentNumber) });
    await audit(req, 'estate_document_uploaded', 'EstateDocument', document._id, document, 'Document metadata recorded');
    res.status(201).json({ success: true, message: 'Document recorded successfully', data: document });
  } catch (error) {
    logger.error('Create estate document error:', error);
    res.status(500).json({ success: false, message: 'Failed to record document', error: error.message });
  }
});

/**
 * @route   PATCH /api/legacy/estate/:id/documents/:documentId/review
 * @desc    Review an estate document
 * @access  Private (Support)
 */
router.patch('/:id/documents/:documentId/review', [
  param('id').isMongoId(),
  param('documentId').isMongoId(),
  body('status').isIn(['under_review', 'verified', 'rejected', 'expired']),
  body('rejectionReason').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  validate
], async (req, res) => {
  try {
    const document = await EstateDocument.findOne({ _id: req.params.documentId, estateCaseId: req.params.id });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    document.status = req.body.status;
    document.reviewedBy = req.user._id;
    document.reviewedAt = new Date();
    document.rejectionReason = req.body.rejectionReason;
    await document.save();
    await audit(req, 'estate_document_reviewed', 'EstateDocument', document._id, document, req.body.rejectionReason || 'Document reviewed');
    res.json({ success: true, message: 'Document reviewed successfully', data: document });
  } catch (error) {
    logger.error('Review estate document error:', error);
    res.status(500).json({ success: false, message: 'Failed to review document', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/estate/:id/timeline
 * @desc    Get estate case timeline
 * @access  Private (Support)
 */
router.get('/:id/timeline', [param('id').isMongoId(), validate], logSupportAccess('EstateCaseTimeline'), async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const estateCase = await EstateCase.findById(req.params.id).select('timeline').lean();
    if (!estateCase) return res.status(404).json({ success: false, message: 'Estate case not found' });
    const total = estateCase.timeline?.length || 0;
    const items = (estateCase.timeline || []).slice(skip, skip + limit);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get estate timeline error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch estate timeline', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/estate/:id/audit-trail
 * @desc    Get estate case audit trail
 * @access  Private (Support)
 */
router.get('/:id/audit-trail', [param('id').isMongoId(), validate], logSupportAccess('EstateAuditEvent'), async (req, res) => {
  try {
    const { page, limit } = pagination(req);
    const trail = await estateAuditService.getTrail(req.params.id, { page, limit });
    const items = trail.items || trail.events || trail;
    const total = trail.total === undefined ? items.length : trail.total;
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get estate audit trail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit trail', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/estate/:id/close
 * @desc    Close an estate case
 * @access  Private (Support)
 */
router.post('/:id/close', [
  param('id').isMongoId(),
  body('closureSummary').trim().notEmpty().withMessage('Closure summary is required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await estateCaseService.close(req.params.id, actor(req), req.body.closureSummary);
    await audit(req, 'estate_case_closed', 'EstateCase', req.params.id, estateCase, req.body.closureSummary);
    res.json({ success: true, message: 'Estate case closed successfully', data: estateCase });
  } catch (error) {
    logger.error('Close estate case error:', error);
    res.status(500).json({ success: false, message: 'Failed to close estate case', error: error.message });
  }
});

module.exports = router;
