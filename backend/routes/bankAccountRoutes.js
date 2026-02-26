const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const bankAccountService = require('../services/bankAccountService');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/bank-accounts/total-balance
 * @desc    Get aggregated total balance across all accounts
 * @access  Private
 */
router.get('/total-balance', async (req, res) => {
  try {
    const result = await bankAccountService.getTotalBalance(req.user._id);
    res.json(result);
  } catch (error) {
    logger.error('Get total balance route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch total balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/bank-accounts/analytics
 * @desc    Get account analytics (trends, comparison, portfolio)
 * @access  Private
 */
router.get('/analytics', async (req, res) => {
  try {
    const result = await bankAccountService.getAnalytics(req.user._id, {
      period: req.query.period || 'monthly'
    });

    res.json(result);
  } catch (error) {
    logger.error('Get analytics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/bank-accounts/transfer
 * @desc    Transfer between own accounts
 * @access  Private
 */
router.post('/transfer', async (req, res) => {
  try {
    const result = await bankAccountService.transferBetweenAccounts(req.user._id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Transfer route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer between accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/bank-accounts
 * @desc    Add a new bank account
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const result = await bankAccountService.createAccount(req.user._id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Create account route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bank account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/bank-accounts
 * @desc    Get all bank accounts for user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const result = await bankAccountService.getAccounts(req.user._id, {
      accountType: req.query.accountType,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      bankName: req.query.bankName
    });

    res.json(result);
  } catch (error) {
    logger.error('Get accounts route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/bank-accounts/:id
 * @desc    Get a single bank account
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await bankAccountService.getAccountById(req.user._id, req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Get account route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/bank-accounts/:id
 * @desc    Update a bank account
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const result = await bankAccountService.updateAccount(req.user._id, req.params.id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Update account route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/bank-accounts/:id
 * @desc    Delete (deactivate) a bank account
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await bankAccountService.deleteAccount(req.user._id, req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Delete account route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
