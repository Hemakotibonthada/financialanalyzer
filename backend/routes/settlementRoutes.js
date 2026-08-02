/**
 * Settlement Routes
 * Fee computation, invoice and payment endpoints for Legacy Guard settlements
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireSupport, requireRole, logSupportAccess } = require('../middleware/supportAuth');
const settlementFeeService = require('../services/legacy/settlementFeeService');
const estateAuditService = require('../services/legacy/estateAuditService');
const SettlementFee = require('../models/SettlementFee');
const logger = require('../utils/logger');
const { FEE_STATUS } = require('../constants/legacyConstants');

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
  estateCaseId: req.params.estateCaseId || after?.estateCaseId,
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

/**
 * @route   GET /api/legacy/settlement
 * @desc    Get paginated settlement fees
 * @access  Private (Support)
 */
router.get('/', [
  query('estateCaseId').optional().isMongoId(),
  query('status').optional().isIn(FEE_STATUS),
  validate
], async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = {};
    if (req.query.estateCaseId) filters.estateCaseId = req.query.estateCaseId;
    if (req.query.status) filters.status = req.query.status;
    const [items, total] = await Promise.all([
      SettlementFee.find(filters).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      SettlementFee.countDocuments(filters)
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get settlement fees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settlement fees', error: error.message });
  }
});

/**
 * @route   GET /api/legacy/settlement/:estateCaseId/statement
 * @desc    Get settlement statement for an estate case
 * @access  Private (Support)
 */
router.get('/:estateCaseId/statement', [param('estateCaseId').isMongoId(), validate], logSupportAccess('SettlementStatement'), async (req, res) => {
  try {
    const statement = await settlementFeeService.getStatement(req.params.estateCaseId);
    res.json({ success: true, data: statement });
  } catch (error) {
    logger.error('Get settlement statement error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settlement statement', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/settlement/:estateCaseId/compute
 * @desc    Compute 1 percent success fee on recovered amount only
 * @access  Private (Support)
 */
router.post('/:estateCaseId/compute', [param('estateCaseId').isMongoId(), validate], async (req, res) => {
  try {
    const fee = await settlementFeeService.computeFee(req.params.estateCaseId);
    await audit(req, 'settlement_fee_computed', 'SettlementFee', fee?._id, fee, 'Success fee computed on recovered amount');
    res.json({ success: true, message: 'Settlement fee computed successfully', data: fee });
  } catch (error) {
    logger.error('Compute settlement fee error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute settlement fee', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/settlement/:estateCaseId/invoice
 * @desc    Issue invoice for an estate settlement fee
 * @access  Private (Support)
 */
router.post('/:estateCaseId/invoice', [
  param('estateCaseId').isMongoId(),
  body('dueAt').optional({ nullable: true }).isISO8601().toDate(),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  validate
], async (req, res) => {
  try {
    const invoice = await settlementFeeService.issueInvoice(req.params.estateCaseId, { ...req.body, actor: actor(req) });
    await audit(req, 'settlement_invoice_issued', 'SettlementFee', invoice?._id, invoice, req.body.notes || 'Invoice issued');
    res.status(201).json({ success: true, message: 'Settlement invoice issued successfully', data: invoice });
  } catch (error) {
    logger.error('Issue settlement invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to issue invoice', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/settlement/:estateCaseId/payments
 * @desc    Record payment against a settlement invoice
 * @access  Private (Support)
 */
router.post('/:estateCaseId/payments', [
  param('estateCaseId').isMongoId(),
  body('amountInINR').isFloat({ min: 0.01 }).toFloat(),
  body('method').trim().notEmpty().withMessage('Payment method is required'),
  body('reference').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('receivedAt').optional({ nullable: true }).isISO8601().toDate(),
  validate
], async (req, res) => {
  try {
    const fee = await settlementFeeService.recordPayment(req.params.estateCaseId, { ...req.body, recordedBy: req.user._id, actor: actor(req) });
    await audit(req, 'settlement_payment_recorded', 'SettlementFee', fee?._id, fee, 'Settlement payment recorded');
    res.json({ success: true, message: 'Settlement payment recorded successfully', data: fee });
  } catch (error) {
    logger.error('Record settlement payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
  }
});

/**
 * @route   POST /api/legacy/settlement/:estateCaseId/waiver
 * @desc    Waive a settlement fee with compliance or admin approval
 * @access  Private (Compliance/Admin)
 */
router.post('/:estateCaseId/waiver', requireRole('compliance', 'admin'), [
  param('estateCaseId').isMongoId(),
  body('reason').trim().notEmpty().withMessage('Waiver reason is required'),
  validate
], async (req, res) => {
  try {
    const fee = await settlementFeeService.waive(req.params.estateCaseId, { reason: req.body.reason, approvedBy: req.user._id, actor: actor(req) });
    await audit(req, 'settlement_fee_waived', 'SettlementFee', fee?._id, fee, req.body.reason);
    res.json({ success: true, message: 'Settlement fee waived successfully', data: fee });
  } catch (error) {
    logger.error('Waive settlement fee error:', error);
    res.status(500).json({ success: false, message: 'Failed to waive settlement fee', error: error.message });
  }
});

module.exports = router;
