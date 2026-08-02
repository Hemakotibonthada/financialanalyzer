/**
 * Recovery Claim Routes
 * Estate recovery claim orchestration endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireSupport, logSupportAccess } = require('../middleware/supportAuth');
const recoveryOrchestrationService = require('../services/legacy/recoveryOrchestrationService');
const estateAuditService = require('../services/legacy/estateAuditService');
const RecoveryClaim = require('../models/RecoveryClaim');
const EstateAsset = require('../models/EstateAsset');
const logger = require('../utils/logger');
const { CLAIM_STATUS, CLAIM_TYPE, OUTREACH_CHANNEL, maskValue } = require('../constants/legacyConstants');

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
  estateCaseId: after?.estateCaseId || req.body.estateCaseId,
  userId: after?.userId,
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
const maskClaim = (claim) => {
  const item = claim.toObject ? claim.toObject() : { ...claim };
  if (item.institution) item.institution = { ...item.institution, phone: maskValue(item.institution.phone), email: maskValue(item.institution.email) };
  return item;
};

/**
 * @route   GET /api/legacy/claims
 * @desc    Get paginated recovery claims
 * @access  Private (Support)
 */
router.get('/', [
  query('estateCaseId').optional().isMongoId(),
  query('estateAssetId').optional().isMongoId(),
  query('status').optional().isIn(CLAIM_STATUS),
  query('claimType').optional().isIn(CLAIM_TYPE),
  query('assignedTo').optional().isMongoId(),
  validate
], async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = {};
    ['estateCaseId', 'estateAssetId', 'status', 'claimType', 'assignedTo'].forEach((key) => { if (req.query[key]) filters[key] = req.query[key]; });
    const [items, total] = await Promise.all([
      RecoveryClaim.find(filters).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      RecoveryClaim.countDocuments(filters)
    ]);
    res.json({ success: true, data: { items: items.map(maskClaim), total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get recovery claims error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recovery claims', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/claims/playbooks/:claimType
 * @desc    Get playbook for a claim type
 * @access  Private (Support)
 */
router.get('/playbooks/:claimType', [param('claimType').isIn(CLAIM_TYPE), validate], async (req, res) => {
  try {
    const playbook = await recoveryOrchestrationService.getPlaybook(req.params.claimType);
    res.json({ success: true, data: playbook });
  } catch (error) {
    logger.error('Get claim playbook error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claim playbook', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/claims/:id
 * @desc    Get recovery claim detail
 * @access  Private (Support)
 */
router.get('/:id', [param('id').isMongoId(), validate], logSupportAccess('RecoveryClaim'), async (req, res) => {
  try {
    const claim = await RecoveryClaim.findById(req.params.id).lean();
    if (!claim) return res.status(404).json({ success: false, message: 'Recovery claim not found' });
    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('Get recovery claim error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recovery claim', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/claims
 * @desc    Create a recovery claim for an estate asset
 * @access  Private (Support)
 */
router.post('/', [
  body('estateCaseId').isMongoId().withMessage('Valid estateCaseId is required'),
  body('estateAssetId').isMongoId().withMessage('Valid estateAssetId is required'),
  body('claimType').isIn(CLAIM_TYPE),
  body('institution.name').trim().notEmpty().withMessage('Institution name is required'),
  body('institution.phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('institution.email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('institution.referenceNumber').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('claimedAmountInINR').isFloat({ min: 0 }).toFloat(),
  body('expectedSettlementDate').optional({ nullable: true }).isISO8601().toDate(),
  body('assignedTo').optional({ nullable: true }).isMongoId(),
  body('documents').optional().isArray(),
  body('documents.*').optional().isMongoId(),
  validate
], async (req, res) => {
  try {
    const asset = await EstateAsset.findOne({ _id: req.body.estateAssetId, estateCaseId: req.body.estateCaseId }).select('_id').lean();
    if (!asset) return res.status(400).json({ success: false, message: 'Asset does not belong to the estate case' });
    const claim = await recoveryOrchestrationService.createClaim({ ...req.body, actor: actor(req) });
    await audit(req, 'recovery_claim_created', 'RecoveryClaim', claim?._id, claim, 'Recovery claim created');
    res.status(201).json({ success: true, message: 'Recovery claim created successfully', data: claim });
  } catch (error) {
    logger.error('Create recovery claim error:', error);
    res.status(500).json({ success: false, message: 'Failed to create recovery claim', error: error.message });
  }
});

/**
 * @route   PATCH /api/legacy/claims/:id/transition
 * @desc    Transition a recovery claim to a new status
 * @access  Private (Support)
 */
router.patch('/:id/transition', [
  param('id').isMongoId(),
  body('status').isIn(CLAIM_STATUS),
  body('note').trim().notEmpty().withMessage('Transition note is required'),
  validate
], async (req, res) => {
  try {
    const claim = await recoveryOrchestrationService.transitionClaim(req.params.id, req.body.status, actor(req), req.body.note, req.body);
    await audit(req, 'recovery_claim_transitioned', 'RecoveryClaim', req.params.id, claim, req.body.note);
    res.json({ success: true, message: 'Recovery claim transitioned successfully', data: claim });
  } catch (error) {
    logger.error('Transition recovery claim error:', error);
    res.status(500).json({ success: false, message: 'Failed to transition recovery claim', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/claims/:id/correspondence
 * @desc    Add correspondence to a recovery claim
 * @access  Private (Support)
 */
router.post('/:id/correspondence', [
  param('id').isMongoId(),
  body('direction').isIn(['inbound', 'outbound']),
  body('channel').isIn(OUTREACH_CHANNEL),
  body('summary').trim().notEmpty().withMessage('Summary is required'),
  body('at').optional({ nullable: true }).isISO8601().toDate(),
  validate
], async (req, res) => {
  try {
    const claim = await RecoveryClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Recovery claim not found' });
    const correspondence = { at: req.body.at || new Date(), direction: req.body.direction, channel: req.body.channel, summary: req.body.summary, byUser: req.user._id };
    if (typeof claim.addCorrespondence === 'function') await claim.addCorrespondence(correspondence);
    else {
      claim.correspondence = claim.correspondence || [];
      claim.correspondence.push(correspondence);
      await claim.save();
    }
    await audit(req, 'recovery_claim_correspondence_added', 'RecoveryClaim', claim._id, correspondence, req.body.summary);
    res.status(201).json({ success: true, message: 'Correspondence added successfully', data: claim });
  } catch (error) {
    logger.error('Add claim correspondence error:', error);
    res.status(500).json({ success: false, message: 'Failed to add correspondence', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/claims/:id/settlement
 * @desc    Record settlement received for a recovery claim
 * @access  Private (Support)
 */
router.post('/:id/settlement', [
  param('id').isMongoId(),
  body('receivedAmountInINR').isFloat({ min: 0 }).toFloat(),
  body('receivedAt').optional({ nullable: true }).isISO8601().toDate(),
  body('reference').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('note').trim().notEmpty().withMessage('Settlement note is required'),
  validate
], async (req, res) => {
  try {
    const claim = await recoveryOrchestrationService.recordSettlement(req.params.id, { ...req.body, actor: actor(req) });
    await audit(req, 'recovery_claim_settlement_recorded', 'RecoveryClaim', req.params.id, claim, req.body.note);
    res.json({ success: true, message: 'Claim settlement recorded successfully', data: claim });
  } catch (error) {
    logger.error('Record claim settlement error:', error);
    res.status(500).json({ success: false, message: 'Failed to record claim settlement', error: error.message });
  }
});

module.exports = router;
