/**
 * Legacy Admin Routes
 * Admin and compliance endpoints for policy, analytics and audit integrity
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/supportAuth');
const estateAuditService = require('../services/legacy/estateAuditService');
const legacyReportService = require('../services/legacy/legacyReportService');
const DormancyPolicy = require('../models/DormancyPolicy');
const logger = require('../utils/logger');
const { DEFAULT_THRESHOLDS, DEFAULT_OUTREACH } = require('../constants/legacyConstants');

router.use(authenticate);
router.use(requireRole('admin', 'compliance'));

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
const policyValidators = [
  body('name').trim().notEmpty().withMessage('Policy name is required'),
  body('thresholds.watchDays').optional().isInt({ min: 1 }).toInt(),
  body('thresholds.dormantDays').optional().isInt({ min: 1 }).toInt(),
  body('thresholds.unreachableDays').optional().isInt({ min: 1 }).toInt(),
  body('thresholds.welfareCheckDays').optional().isInt({ min: 1 }).toInt(),
  body('outreach.maxAttemptsPerChannel').optional().isInt({ min: 1 }).toInt(),
  body('outreach.cooldownHours').optional().isInt({ min: 1 }).toInt(),
  body('outreach.requiredChannelsBeforeEscalation').optional().isArray({ min: 1 }),
  body('escalation.autoEscalateAfterDays').optional().isInt({ min: 1 }).toInt(),
  body('escalation.requireDualApproval').optional().isBoolean().toBoolean(),
  body('escalation.minApproverRole').optional().isIn(['estate_officer', 'compliance', 'admin']),
  body('fee.percentage').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('fee.minFeeInINR').optional().isFloat({ min: 0 }).toFloat(),
  body('fee.maxFeeInINR').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body('fee.gstPercentage').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('fee.chargeOn').optional().equals('recovered_only'),
  body('freezeOnStage').optional().isIn(['unreachable', 'welfare_check', 'deceased_suspected']),
  body('changeReason').trim().notEmpty().withMessage('Change reason is required')
];

/**
 * @route   GET /api/legacy/admin/policies
 * @desc    Get paginated dormancy policies
 * @access  Private (Admin/Compliance)
 */
router.get('/policies', async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const [items, total] = await Promise.all([
      DormancyPolicy.find({}).sort({ version: -1 }).skip(skip).limit(limit).lean(),
      DormancyPolicy.countDocuments({})
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get legacy policies error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch policies', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/policies/active
 * @desc    Get active dormancy policy
 * @access  Private (Admin/Compliance)
 */
router.get('/policies/active', async (req, res) => {
  try {
    const policy = await DormancyPolicy.getActive();
    res.json({ success: true, data: policy });
  } catch (error) {
    logger.error('Get active legacy policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active policy', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/admin/policies
 * @desc    Create a new dormant account policy version
 * @access  Private (Admin/Compliance)
 */
router.post('/policies', policyValidators, validate, async (req, res) => {
  try {
    const latest = await DormancyPolicy.findOne({}).sort({ version: -1 }).select('version').lean();
    const policy = await DormancyPolicy.create({
      name: req.body.name,
      version: (latest?.version || 0) + 1,
      isActive: false,
      thresholds: { ...DEFAULT_THRESHOLDS, ...req.body.thresholds },
      outreach: { ...DEFAULT_OUTREACH, ...req.body.outreach },
      escalation: req.body.escalation,
      fee: req.body.fee,
      freezeOnStage: req.body.freezeOnStage || 'unreachable',
      createdBy: req.user._id,
      changeReason: req.body.changeReason
    });
    await audit(req, 'legacy_policy_created', 'DormancyPolicy', policy._id, policy, req.body.changeReason);
    res.status(201).json({ success: true, message: 'Policy version created successfully', data: policy });
  } catch (error) {
    logger.error('Create legacy policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to create policy', error: error.message });
  }
});

/**
 * @route   PUT /api/legacy/admin/policies/:id
 * @desc    Create a replacement policy version from an existing policy
 * @access  Private (Admin/Compliance)
 */
router.put('/policies/:id', [param('id').isMongoId(), ...policyValidators], validate, async (req, res) => {
  try {
    const existing = await DormancyPolicy.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Policy not found' });
    const latest = await DormancyPolicy.findOne({}).sort({ version: -1 }).select('version').lean();
    const policy = await DormancyPolicy.create({
      ...existing,
      _id: undefined,
      name: req.body.name,
      version: (latest?.version || existing.version || 0) + 1,
      isActive: false,
      thresholds: { ...existing.thresholds, ...req.body.thresholds },
      outreach: { ...existing.outreach, ...req.body.outreach },
      escalation: { ...existing.escalation, ...req.body.escalation },
      fee: { ...existing.fee, ...req.body.fee },
      freezeOnStage: req.body.freezeOnStage || existing.freezeOnStage,
      createdBy: req.user._id,
      changeReason: req.body.changeReason
    });
    await audit(req, 'legacy_policy_revised', 'DormancyPolicy', policy._id, policy, req.body.changeReason);
    res.status(201).json({ success: true, message: 'Replacement policy version created successfully', data: policy });
  } catch (error) {
    logger.error('Revise legacy policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to revise policy', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/admin/policies/:id/activate
 * @desc    Activate a dormant account policy version
 * @access  Private (Admin/Compliance)
 */
router.post('/policies/:id/activate', [
  param('id').isMongoId(),
  body('reason').trim().notEmpty().withMessage('Activation reason is required'),
  validate
], async (req, res) => {
  try {
    const policy = await DormancyPolicy.activateVersion(req.params.id, req.user._id, req.body.reason);
    await audit(req, 'legacy_policy_activated', 'DormancyPolicy', req.params.id, policy, req.body.reason);
    res.json({ success: true, message: 'Policy activated successfully', data: policy });
  } catch (error) {
    logger.error('Activate legacy policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate policy', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/analytics/cases
 * @desc    Get Legacy Guard case summary analytics
 * @access  Private (Admin/Compliance)
 */
router.get('/analytics/cases', [query('from').optional().isISO8601().toDate(), query('to').optional().isISO8601().toDate(), validate], async (req, res) => {
  try {
    const data = await legacyReportService.caseSummaryReport({ ...req.query, actor: actor(req) });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Legacy case analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch case analytics', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/analytics/recovery
 * @desc    Get recovery performance analytics
 * @access  Private (Admin/Compliance)
 */
router.get('/analytics/recovery', [query('from').optional().isISO8601().toDate(), query('to').optional().isISO8601().toDate(), validate], async (req, res) => {
  try {
    const data = await legacyReportService.recoveryPerformanceReport({ ...req.query, actor: actor(req) });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Legacy recovery analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recovery analytics', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/analytics/fees
 * @desc    Get fee revenue analytics
 * @access  Private (Admin/Compliance)
 */
router.get('/analytics/fees', [query('from').optional().isISO8601().toDate(), query('to').optional().isISO8601().toDate(), validate], async (req, res) => {
  try {
    const data = await legacyReportService.feeRevenueReport({ ...req.query, actor: actor(req) });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Legacy fee analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee analytics', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/reports/export
 * @desc    Export a Legacy Guard report as CSV
 * @access  Private (Admin/Compliance)
 */
router.get('/reports/export', [
  query('type').isIn(['case_summary', 'recovery_performance', 'fee_revenue']),
  query('from').optional().isISO8601().toDate(),
  query('to').optional().isISO8601().toDate(),
  validate
], async (req, res) => {
  try {
    const csv = await legacyReportService.exportCsv(req.query.type, { ...req.query, actor: actor(req) });
    res.type('text/csv').send(csv);
  } catch (error) {
    logger.error('Legacy report export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export report', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/admin/audit/:estateCaseId/verify
 * @desc    Verify hash-chain integrity for one estate case audit trail
 * @access  Private (Admin/Compliance)
 */
router.get('/audit/:estateCaseId/verify', [param('estateCaseId').isMongoId(), validate], async (req, res) => {
  try {
    const result = await estateAuditService.verifyIntegrity(req.params.estateCaseId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Verify estate audit integrity error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify audit integrity', error: error.message });
  }
});

module.exports = router;
