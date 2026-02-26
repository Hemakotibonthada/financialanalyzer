const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const goalTrackingService = require('../services/goalTrackingService');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/goals/statistics
 * @desc    Get goal statistics dashboard
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = await goalTrackingService.getStatistics(req.user._id);
    res.json(result);
  } catch (error) {
    logger.error('Get goal statistics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/goals
 * @desc    Create a new financial goal
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const result = await goalTrackingService.createGoal(req.user._id, req.body);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Create goal route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/goals
 * @desc    Get all goals for authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const result = await goalTrackingService.getGoals(req.user._id, {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      sortBy: req.query.sortBy,
      order: req.query.order ? parseInt(req.query.order) : -1
    });

    res.json(result);
  } catch (error) {
    logger.error('Get goals route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/goals/:id
 * @desc    Get a single goal by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await goalTrackingService.getGoalById(req.user._id, req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Get goal route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/goals/:id
 * @desc    Update a goal
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const result = await goalTrackingService.updateGoal(req.user._id, req.params.id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Update goal route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete a goal
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await goalTrackingService.deleteGoal(req.user._id, req.params.id);

    if (!result.success) {
      return res.status(result.statusCode || 404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Delete goal route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/goals/:id/milestones
 * @desc    Add a milestone to a goal
 * @access  Private
 */
router.post('/:id/milestones', async (req, res) => {
  try {
    const result = await goalTrackingService.addMilestone(req.user._id, req.params.id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Add milestone route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add milestone',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PATCH /api/goals/:id/progress
 * @desc    Update goal progress (add contribution)
 * @access  Private
 */
router.patch('/:id/progress', async (req, res) => {
  try {
    const result = await goalTrackingService.updateProgress(req.user._id, req.params.id, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Update progress route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
