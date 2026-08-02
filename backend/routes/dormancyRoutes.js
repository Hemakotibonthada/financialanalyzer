/**
 * Dormancy Routes
 * Support console endpoints for Legacy Guard dormancy cases
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireSupport, logSupportAccess } = require('../middleware/supportAuth');
const dormancyDetectionService = require('../services/legacy/dormancyDetectionService');
const dormancyEscalationService = require('../services/legacy/dormancyEscalationService');
const estateAuditService = require('../services/legacy/estateAuditService');
const DormancyCase = require('../models/DormancyCase');
const SupportInteraction = require('../models/SupportInteraction');
const logger = require('../utils/logger');
const { DORMANCY_STAGE, DORMANCY_TRIGGER, CASE_STATUS, CASE_PRIORITY, OUTREACH_CHANNEL, OUTREACH_OUTCOME, maskValue } = require('../constants/legacyConstants');

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
  dormancyCaseId: req.params.id || req.params.caseId,
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
const maskCase = (item) => {
  const row = item.toObject ? item.toObject() : { ...item };
  if (row.user) row.user = { ...row.user, email: maskValue(row.user.email), phone: maskValue(row.user.phone || row.user.phoneNumber) };
  return row;
};

/**
 * @route   GET /api/legacy/dormancy
 * @desc    Get paginated dormancy queue for support review
 * @access  Private (Support)
 */
router.get('/', [
  query('stage').optional().isIn(DORMANCY_STAGE),
  query('status').optional().isIn(CASE_STATUS),
  query('priority').optional().isIn(CASE_PRIORITY),
  query('assignedTo').optional().isMongoId(),
  validate
], async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = {};
    ['stage', 'status', 'priority', 'assignedTo'].forEach((key) => { if (req.query[key]) filters[key] = req.query[key]; });
    let result;
    if (DormancyCase.getQueue) result = await DormancyCase.getQueue({ ...filters, page, limit });
    let items = result?.items || result?.cases || (Array.isArray(result) ? result : null);
    let total = result?.total;
    if (!items) {
      [items, total] = await Promise.all([
        DormancyCase.find(filters).sort({ priority: -1, slaDueAt: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        DormancyCase.countDocuments(filters)
      ]);
    }
    res.json({ success: true, data: { items: items.map(maskCase), total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get dormancy queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dormancy queue', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/dormancy/sla-breaches
 * @desc    Get paginated dormancy cases that breached SLA
 * @access  Private (Support)
 */
router.get('/sla-breaches', async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = { slaDueAt: { $lt: new Date() }, status: { $nin: ['closed_alive', 'closed_deceased', 'closed_false_alarm', 'cancelled'] } };
    let result;
    if (DormancyCase.getSlaBreaches) result = await DormancyCase.getSlaBreaches({ page, limit });
    let items = result?.items || result?.cases || (Array.isArray(result) ? result : null);
    let total = result?.total;
    if (!items) {
      [items, total] = await Promise.all([
        DormancyCase.find(filters).sort({ slaDueAt: 1 }).skip(skip).limit(limit).lean(),
        DormancyCase.countDocuments(filters)
      ]);
    }
    res.json({ success: true, data: { items: items.map(maskCase), total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get dormancy SLA breaches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SLA breaches', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/dormancy/user/:userId/inactivity-report
 * @desc    Get inactivity classification for one user
 * @access  Private (Support)
 */
router.get('/user/:userId/inactivity-report', [param('userId').isMongoId(), validate], logSupportAccess('AccountActivityIndex'), async (req, res) => {
  try {
    const report = await dormancyDetectionService.classifyUser(req.params.userId);
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Get inactivity report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inactivity report', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/dormancy/:id
 * @desc    Get dormancy case detail with outreach timeline
 * @access  Private (Support)
 */
router.get('/:id', [param('id').isMongoId(), validate], logSupportAccess('DormancyCase'), async (req, res) => {
  try {
    const [dormancyCase, interactions] = await Promise.all([
      DormancyCase.findById(req.params.id).lean(),
      SupportInteraction.find({ caseId: req.params.id, caseType: 'dormancy' }).sort({ occurredAt: -1 }).lean()
    ]);
    if (!dormancyCase) return res.status(404).json({ success: false, message: 'Dormancy case not found' });
    res.json({ success: true, data: { case: dormancyCase, interactions } });
  } catch (error) {
    logger.error('Get dormancy case error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dormancy case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/dormancy/scan
 * @desc    Run dormancy scan with optional batch settings
 * @access  Private (Support)
 */
router.post('/scan', [
  body('batchSize').optional().isInt({ min: 1, max: 1000 }).toInt(),
  body('dryRun').optional().isBoolean().toBoolean(),
  validate
], async (req, res) => {
  try {
    const result = await dormancyDetectionService.scanForDormancy(req.body);
    await audit(req, 'dormancy_scan_requested', 'DormancyCase', null, result, 'Support initiated dormancy scan');
    res.json({ success: true, message: 'Dormancy scan completed', data: result });
  } catch (error) {
    logger.error('Dormancy scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to run dormancy scan', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/dormancy/open
 * @desc    Manually open a dormancy case for a user
 * @access  Private (Support)
 */
router.post('/open', [
  body('userId').isMongoId().withMessage('Valid userId is required'),
  body('triggers').isArray({ min: 1 }).withMessage('At least one trigger is required'),
  body('triggers.*').isIn(DORMANCY_TRIGGER),
  body('priority').optional().isIn(CASE_PRIORITY),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  validate
], async (req, res) => {
  try {
    const dormancyCase = await dormancyDetectionService.openCaseFor(req.body.userId, req.body.triggers, { priority: req.body.priority, notes: req.body.notes, actor: actor(req) });
    await audit(req, 'dormancy_case_opened', 'DormancyCase', dormancyCase?._id, dormancyCase, req.body.notes);
    res.status(201).json({ success: true, message: 'Dormancy case opened successfully', data: dormancyCase });
  } catch (error) {
    logger.error('Open dormancy case error:', error);
    res.status(500).json({ success: false, message: 'Failed to open dormancy case', error: error.message });
  }
});

/**
 * @route   PATCH /api/legacy/dormancy/:id/assign
 * @desc    Assign a dormancy case to a support agent
 * @access  Private (Support)
 */
router.patch('/:id/assign', [
  param('id').isMongoId(),
  body('assignedTo').isMongoId().withMessage('Valid assignee is required'),
  body('slaDueAt').optional({ nullable: true }).isISO8601().toDate(),
  validate
], async (req, res) => {
  try {
    const dormancyCase = await DormancyCase.findById(req.params.id);
    if (!dormancyCase) return res.status(404).json({ success: false, message: 'Dormancy case not found' });
    if (typeof dormancyCase.assign === 'function') {
      await dormancyCase.assign(req.body.assignedTo, req.user._id, req.body.slaDueAt);
    } else {
      dormancyCase.assignedTo = req.body.assignedTo;
      dormancyCase.assignedAt = new Date();
      if (req.body.slaDueAt) dormancyCase.slaDueAt = req.body.slaDueAt;
      await dormancyCase.save();
    }
    await audit(req, 'dormancy_case_assigned', 'DormancyCase', dormancyCase._id, dormancyCase, 'Case assignment updated');
    res.json({ success: true, message: 'Dormancy case assigned successfully', data: dormancyCase });
  } catch (error) {
    logger.error('Assign dormancy case error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign dormancy case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/dormancy/:id/outreach
 * @desc    Log an outreach attempt for a dormancy case
 * @access  Private (Support)
 */
router.post('/:id/outreach', [
  param('id').isMongoId(),
  body('channel').isIn(OUTREACH_CHANNEL),
  body('direction').isIn(['outbound', 'inbound']),
  body('contactedParty').isIn(['user', 'nominee', 'emergency_contact', 'other']),
  body('contactValue').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('outcome').isIn(OUTREACH_OUTCOME),
  body('durationSeconds').optional().isInt({ min: 0, max: 86400 }).toInt(),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 4000 }),
  body('recordingUrl').optional({ nullable: true }).isURL(),
  body('followUpRequired').optional().isBoolean().toBoolean(),
  body('followUpAt').optional({ nullable: true }).isISO8601().toDate(),
  body('occurredAt').optional({ nullable: true }).isISO8601().toDate(),
  validate
], async (req, res) => {
  try {
    const payload = { ...req.body, agentId: req.user._id, contactValueMasked: maskValue(req.body.contactValue), occurredAt: req.body.occurredAt || new Date() };
    delete payload.contactValue;
    const interaction = await dormancyEscalationService.recordOutreach(req.params.id, payload);
    await audit(req, 'dormancy_outreach_logged', 'SupportInteraction', interaction?._id, interaction, req.body.notes);
    res.status(201).json({ success: true, message: 'Outreach logged successfully', data: interaction });
  } catch (error) {
    logger.error('Record dormancy outreach error:', error);
    res.status(500).json({ success: false, message: 'Failed to log outreach', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/dormancy/:id/resolve-alive
 * @desc    Resolve a dormancy case after proof of life
 * @access  Private (Support)
 */
router.post('/:id/resolve-alive', [
  param('id').isMongoId(),
  body('notes').trim().notEmpty().withMessage('Resolution notes are required'),
  validate
], async (req, res) => {
  try {
    const result = await dormancyEscalationService.resolveAlive(req.params.id, actor(req), req.body.notes);
    await audit(req, 'dormancy_resolved_alive', 'DormancyCase', req.params.id, result, req.body.notes);
    res.json({ success: true, message: 'Dormancy case resolved as alive', data: result });
  } catch (error) {
    logger.error('Resolve dormancy alive error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve dormancy case', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/dormancy/:id/escalate
 * @desc    Escalate dormancy case to estate workflow
 * @access  Private (Support)
 */
router.post('/:id/escalate', [
  param('id').isMongoId(),
  body('reason').trim().notEmpty().withMessage('Escalation reason is required'),
  validate
], async (req, res) => {
  try {
    const estateCase = await dormancyEscalationService.escalateToEstate(req.params.id, actor(req), req.body.reason);
    await audit(req, 'dormancy_escalated_to_estate', 'EstateCase', estateCase?._id, estateCase, req.body.reason);
    res.json({ success: true, message: 'Dormancy case escalated to estate workflow', data: estateCase });
  } catch (error) {
    logger.error('Escalate dormancy case error:', error);
    res.status(500).json({ success: false, message: 'Failed to escalate dormancy case', error: error.message });
  }
});

module.exports = router;
