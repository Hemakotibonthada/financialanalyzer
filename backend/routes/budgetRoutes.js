const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { budgetValidation, idValidation } = require('../middleware/validation');
const Budget = require('../models/Budget');
const logger = require('../utils/logger');

/**
 * @route   GET /api/budgets
 * @desc    Get all budgets for authenticated user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.getBudgetsWithSpending(req.user._id);
    
    res.json({
      success: true,
      data: { budgets }
    });
  } catch (error) {
    logger.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/budgets/:id
 * @desc    Get budget by ID
 * @access  Private
 */
router.get('/:id', authenticate, idValidation, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    // Calculate current spending
    await budget.calculateSpent();
    await budget.save();
    
    res.json({
      success: true,
      data: { budget }
    });
  } catch (error) {
    logger.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/budgets
 * @desc    Create new budget
 * @access  Private
 */
router.post('/', authenticate, budgetValidation, async (req, res) => {
  try {
    const { category, amount, period, alertThreshold, notifications, rollover, notes } = req.body;
    
    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category,
      period: period || 'MONTHLY',
      isActive: true
    });
    
    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: `Budget already exists for ${category} (${period || 'MONTHLY'})`
      });
    }
    
    const budget = new Budget({
      userId: req.user._id,
      category,
      amount,
      period: period || 'MONTHLY',
      alertThreshold: alertThreshold || 80,
      notifications: notifications || { email: true, push: true },
      rollover: rollover || { enabled: false, amount: 0 },
      notes
    });
    
    await budget.save();
    
    // Calculate initial spending
    await budget.calculateSpent();
    await budget.save();
    
    logger.info(`Budget created for user ${req.user._id}: ${category}`);
    
    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: { budget }
    });
  } catch (error) {
    logger.error('Create budget error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Budget already exists for this category and period'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update budget
 * @access  Private
 */
router.put('/:id', authenticate, idValidation, async (req, res) => {
  try {
    const { amount, alertThreshold, notifications, rollover, notes, isActive } = req.body;
    
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    // Update fields
    if (amount !== undefined) budget.amount = amount;
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
    if (notifications !== undefined) budget.notifications = notifications;
    if (rollover !== undefined) budget.rollover = rollover;
    if (notes !== undefined) budget.notes = notes;
    if (isActive !== undefined) budget.isActive = isActive;
    
    await budget.save();
    
    // Recalculate spending
    await budget.calculateSpent();
    await budget.save();
    
    logger.info(`Budget updated for user ${req.user._id}: ${budget.category}`);
    
    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: { budget }
    });
  } catch (error) {
    logger.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete budget
 * @access  Private
 */
router.delete('/:id', authenticate, idValidation, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    logger.info(`Budget deleted for user ${req.user._id}: ${budget.category}`);
    
    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    logger.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/budgets/alerts/check
 * @desc    Check for budget alerts
 * @access  Private
 */
router.get('/alerts/check', authenticate, async (req, res) => {
  try {
    const alerts = await Budget.checkAlerts(req.user._id);
    
    res.json({
      success: true,
      data: { 
        alerts,
        count: alerts.length,
        hasAlerts: alerts.length > 0
      }
    });
  } catch (error) {
    logger.error('Check budget alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check budget alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/budgets/:id/recalculate
 * @desc    Recalculate budget spending
 * @access  Private
 */
router.post('/:id/recalculate', authenticate, idValidation, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    await budget.calculateSpent();
    await budget.save();
    
    res.json({
      success: true,
      message: 'Budget recalculated successfully',
      data: { budget }
    });
  } catch (error) {
    logger.error('Recalculate budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/budgets/summary/overview
 * @desc    Get budget summary overview
 * @access  Private
 */
router.get('/summary/overview', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.getBudgetsWithSpending(req.user._id);
    
    const summary = {
      totalBudgets: budgets.length,
      totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
      totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
      totalRemaining: budgets.reduce((sum, b) => sum + b.remaining, 0),
      byStatus: {
        good: budgets.filter(b => b.status === 'GOOD').length,
        moderate: budgets.filter(b => b.status === 'MODERATE').length,
        warning: budgets.filter(b => b.status === 'WARNING').length,
        exceeded: budgets.filter(b => b.status === 'EXCEEDED').length
      },
      averageUsage: budgets.length > 0 
        ? Math.round(budgets.reduce((sum, b) => sum + b.percentageUsed, 0) / budgets.length)
        : 0
    };
    
    res.json({
      success: true,
      data: { summary, budgets }
    });
  } catch (error) {
    logger.error('Get budget summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
