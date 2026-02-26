const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const splitExpenseService = require('../services/splitExpenseService');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/split-expenses/groups
 * @desc    Create a new expense-splitting group
 * @access  Private
 */
router.post('/groups', async (req, res) => {
  try {
    const result = await splitExpenseService.createGroup(req.user._id, {
      ...req.body,
      creatorName: req.user.name,
      creatorEmail: req.user.email
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Create group route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/split-expenses/groups
 * @desc    Get all groups for authenticated user
 * @access  Private
 */
router.get('/groups', async (req, res) => {
  try {
    const result = await splitExpenseService.getUserGroups(req.user._id);
    res.json(result);
  } catch (error) {
    logger.error('Get groups route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/split-expenses/groups/:id/members
 * @desc    Add a member to a group
 * @access  Private
 */
router.post('/groups/:id/members', async (req, res) => {
  try {
    const result = await splitExpenseService.addMember(req.params.id, req.user._id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Add member route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/split-expenses/groups/:id/members/:memberId
 * @desc    Remove a member from a group
 * @access  Private
 */
router.delete('/groups/:id/members/:memberId', async (req, res) => {
  try {
    const result = await splitExpenseService.removeMember(req.params.id, req.user._id, req.params.memberId);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Remove member route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/split-expenses/groups/:id/expenses
 * @desc    Add an expense to a group
 * @access  Private
 */
router.post('/groups/:id/expenses', async (req, res) => {
  try {
    const result = await splitExpenseService.addExpense(req.params.id, req.user._id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Add expense route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add expense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/split-expenses/groups/:id/expenses
 * @desc    Get all expenses for a group
 * @access  Private
 */
router.get('/groups/:id/expenses', async (req, res) => {
  try {
    const result = await splitExpenseService.getGroupExpenses(req.params.id, req.user._id, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      category: req.query.category,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Get expenses route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/split-expenses/groups/:id/balances
 * @desc    Get balances for all members in a group
 * @access  Private
 */
router.get('/groups/:id/balances', async (req, res) => {
  try {
    const result = await splitExpenseService.getBalances(req.params.id, req.user._id);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Get balances route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balances',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/split-expenses/groups/:id/settlements
 * @desc    Get settlement suggestions for a group
 * @access  Private
 */
router.get('/groups/:id/settlements', async (req, res) => {
  try {
    const result = await splitExpenseService.getSettlements(req.params.id, req.user._id);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Get settlements route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate settlements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/split-expenses/groups/:id/expenses/:expenseId
 * @desc    Delete an expense from a group
 * @access  Private
 */
router.delete('/groups/:id/expenses/:expenseId', async (req, res) => {
  try {
    const result = await splitExpenseService.deleteExpense(
      req.params.id,
      req.params.expenseId,
      req.user._id
    );

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Delete expense route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
