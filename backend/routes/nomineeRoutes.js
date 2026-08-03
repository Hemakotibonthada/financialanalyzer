/**
 * Nominee Routes
 * API endpoints for users to manage their own Legacy Guard nominees
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const nomineeService = require('../services/legacy/nomineeService');
const Nominee = require('../models/Nominee');
const logger = require('../utils/logger');
const { RELATIONSHIP, NOMINEE_STATUS, ID_PROOF_TYPE, maskValue } = require('../constants/legacyConstants');

router.use(authenticate);

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

// Auditing lives in nomineeService, which is the single place every caller
// (routes, schedulers, other services) goes through. Auditing here as well
// produced two identical audit events per write.

const maskNominee = (nominee) => {
  if (!nominee) return nominee;
  const item = nominee.toObject ? nominee.toObject() : { ...nominee };
  if (item.contact) {
    item.contact = {
      ...item.contact,
      phone: maskValue(item.contact.phone),
      alternatePhone: maskValue(item.contact.alternatePhone),
      email: maskValue(item.contact.email)
    };
  }
  if (item.guardian) {
    item.guardian = {
      ...item.guardian,
      phone: maskValue(item.guardian.phone),
      email: maskValue(item.guardian.email)
    };
  }
  if (item.identification) {
    item.identification = {
      type: item.identification.type,
      maskedNumber: item.identification.maskedNumber || maskValue(item.identification.numberEncrypted)
    };
  }
  return item;
};

const nomineeValidators = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('relationship').isIn(RELATIONSHIP).withMessage('Invalid relationship'),
  body('sharePercentage').isFloat({ min: 0, max: 100 }).toFloat(),
  body('isPrimary').optional().isBoolean().toBoolean(),
  body('dateOfBirth').optional({ nullable: true }).isISO8601().toDate(),
  body('guardian.name').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('guardian.relationship').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('guardian.phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('guardian.email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('contact.phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('contact.alternatePhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('contact.email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('contact.address.line1').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('contact.address.line2').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('contact.address.city').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('contact.address.state').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('contact.address.pincode').optional({ nullable: true }).trim().isLength({ max: 12 }),
  body('contact.address.country').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('identification.type').optional({ nullable: true }).isIn(ID_PROOF_TYPE),
  body('identification.number').optional({ nullable: true }).trim().isLength({ min: 4, max: 64 }),
  body('canInitiateClaim').optional().isBoolean().toBoolean(),
  body('isLegalHeir').optional().isBoolean().toBoolean(),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('isActive').optional().isBoolean().toBoolean()
];

/**
 * @route   GET /api/nominees
 * @desc    Get paginated nominees for the authenticated user
 * @access  Private
 */
router.get('/', [
  query('status').optional().isIn(NOMINEE_STATUS),
  query('relationship').optional().isIn(RELATIONSHIP),
  validate
], async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);
    const filters = { userId: req.user._id };
    if (req.query.status) filters.status = req.query.status;
    if (req.query.relationship) filters.relationship = req.query.relationship;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';

    let result;
    if (nomineeService.list) result = await nomineeService.list(req.user._id, { ...req.query, page, limit });
    let items = result?.items || result?.nominees || (Array.isArray(result) ? result : null);
    let total = result?.total;
    if (!items) {
      [items, total] = await Promise.all([
        Nominee.find(filters).sort({ isPrimary: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Nominee.countDocuments(filters)
      ]);
    }

    res.json({
      success: true,
      data: { items: items.map(maskNominee), total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get nominees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nominees', error: error.message });
  }
});

/**
 * @route   GET /api/nominees/share-validation
 * @desc    Validate that active nominee shares add up to 100 percent
 * @access  Private
 */
router.get('/share-validation', async (req, res) => {
  try {
    const result = await nomineeService.validateShareTotals(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Validate nominee shares error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate nominee shares', error: error.message });
  }
});

/**
 * @route   GET /api/nominees/:id
 * @desc    Get one nominee owned by the authenticated user
 * @access  Private
 */
router.get('/:id', [param('id').isMongoId(), validate], async (req, res) => {
  try {
    const nominee = await Nominee.findOne({ _id: req.params.id, userId: req.user._id });
    if (!nominee) return res.status(404).json({ success: false, message: 'Nominee not found' });
    res.json({ success: true, data: nominee });
  } catch (error) {
    logger.error('Get nominee error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nominee', error: error.message });
  }
});

/**
 * @route   POST /api/nominees
 * @desc    Create a nominee for the authenticated user
 * @access  Private
 */
router.post('/', nomineeValidators, validate, async (req, res) => {
  try {
    const nominee = await nomineeService.create(req.user._id, req.body, req.user);
    res.status(201).json({ success: true, message: 'Nominee created successfully', data: nominee });
  } catch (error) {
    logger.error('Create nominee error:', error);
    res.status(500).json({ success: false, message: 'Failed to create nominee', error: error.message });
  }
});

/**
 * @route   PUT /api/nominees/:id
 * @desc    Update a nominee owned by the authenticated user
 * @access  Private
 */
router.put('/:id', [param('id').isMongoId(), ...nomineeValidators], validate, async (req, res) => {
  try {
    const existing = await Nominee.findOne({ _id: req.params.id, userId: req.user._id }).select('_id');
    if (!existing) return res.status(404).json({ success: false, message: 'Nominee not found' });
    const nominee = await nomineeService.update(req.params.id, req.user._id, req.body, req.user);
    res.json({ success: true, message: 'Nominee updated successfully', data: nominee });
  } catch (error) {
    logger.error('Update nominee error:', error);
    res.status(500).json({ success: false, message: 'Failed to update nominee', error: error.message });
  }
});

/**
 * @route   PATCH /api/nominees/rebalance
 * @desc    Rebalance active nominee share percentages for the authenticated user
 * @access  Private
 */
router.patch('/rebalance', [
  body('shares').isObject().withMessage('shares map is required'),
  body('shares.*').isFloat({ min: 0, max: 100 }).toFloat(),
  validate
], async (req, res) => {
  try {
    const nomineeIds = Object.keys(req.body.shares);
    const ownedCount = await Nominee.countDocuments({ _id: { $in: nomineeIds }, userId: req.user._id });
    if (ownedCount !== nomineeIds.length) {
      return res.status(403).json({ success: false, message: 'Cannot rebalance nominees owned by another user' });
    }
    const result = await nomineeService.rebalanceShares(req.user._id, req.body.shares);
    res.json({ success: true, message: 'Nominee shares rebalanced successfully', data: result });
  } catch (error) {
    logger.error('Rebalance nominee shares error:', error);
    res.status(500).json({ success: false, message: 'Failed to rebalance nominee shares', error: error.message });
  }
});

/**
 * @route   DELETE /api/nominees/:id
 * @desc    Remove a nominee owned by the authenticated user
 * @access  Private
 */
router.delete('/:id', [param('id').isMongoId(), validate], async (req, res) => {
  try {
    const existing = await Nominee.findOne({ _id: req.params.id, userId: req.user._id }).select('_id');
    if (!existing) return res.status(404).json({ success: false, message: 'Nominee not found' });
    await nomineeService.remove(req.params.id, req.user._id, req.user);
    res.json({ success: true, message: 'Nominee removed successfully' });
  } catch (error) {
    logger.error('Remove nominee error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove nominee', error: error.message });
  }
});

module.exports = router;
