/**
 * Financial Goal Routes
 * API endpoints for financial goal tracking and management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FinancialGoal = require('../models/FinancialGoal');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/goals
 * @desc    Create new financial goal
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const goalData = {
      ...req.body,
      userId: req.user._id
    };
    
    const goal = await FinancialGoal.create(goalData);
    
    logger.info(`Financial goal created: ${goal._id} by user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/goals
 * @desc    Get all goals
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    
    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    const goals = await FinancialGoal.find(query)
      .populate('linkedInvestments')
      .sort({ priority: -1, targetDate: 1 });
    
    res.json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    logger.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/goals/summary
 * @desc    Get goals summary
 * @access  Private
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await FinancialGoal.getTotalSavingsTarget(req.user._id);
    const byCategory = await FinancialGoal.getGoalsByCategory(req.user._id);
    
    res.json({
      success: true,
      data: {
        ...summary,
        byCategory
      }
    });
  } catch (error) {
    logger.error('Get goals summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/goals/upcoming
 * @desc    Get upcoming goal deadlines
 * @access  Private
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const upcoming = await FinancialGoal.getUpcomingGoals(req.user._id, parseInt(months));
    
    res.json({
      success: true,
      count: upcoming.length,
      data: upcoming
    });
  } catch (error) {
    logger.error('Get upcoming goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming goals',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/goals/:id
 * @desc    Get single goal
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('linkedInvestments');
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    res.json({
      success: true,
      data: goal
    });
  } catch (error) {
    logger.error('Get goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/goals/:id
 * @desc    Update goal
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const goal = await FinancialGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    logger.info(`Goal updated: ${goal._id}`);
    
    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete goal
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const goal = await FinancialGoal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    logger.info(`Goal deleted: ${goal._id}`);
    
    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    logger.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/goals/:id/contribute
 * @desc    Add contribution to goal
 * @access  Private
 */
router.post('/:id/contribute', async (req, res) => {
  try {
    const { amount, source, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contribution amount'
      });
    }
    
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    await goal.addContribution(amount, source, notes);
    
    logger.info(`Contribution added to goal: ${goal._id}, amount: ${amount}`);
    
    res.json({
      success: true,
      message: 'Contribution added successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Add contribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contribution',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/goals/:id/milestone
 * @desc    Add milestone to goal
 * @access  Private
 */
router.post('/:id/milestone', async (req, res) => {
  try {
    const { name, amount, date } = req.body;
    
    if (!name || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Milestone name, amount, and date are required'
      });
    }
    
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    await goal.addMilestone(name, amount, date);
    
    logger.info(`Milestone added to goal: ${goal._id}`);
    
    res.json({
      success: true,
      message: 'Milestone added successfully',
      data: goal
    });
  } catch (error) {
    logger.error('Add milestone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add milestone',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/goals/:id/project
 * @desc    Get projected completion date
 * @access  Private
 */
router.post('/:id/project', async (req, res) => {
  try {
    const goal = await FinancialGoal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    const projection = goal.projectCompletion();
    
    if (!projection) {
      return res.status(400).json({
        success: false,
        message: 'Unable to project completion. Please set monthly savings target.'
      });
    }
    
    res.json({
      success: true,
      data: projection
    });
  } catch (error) {
    logger.error('Project completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to project completion',
      error: error.message
    });
  }
});

module.exports = router;
