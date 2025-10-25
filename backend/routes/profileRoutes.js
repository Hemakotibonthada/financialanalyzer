const express = require('express');
const router = express.Router();
const FinancialProfile = require('../models/FinancialProfile');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { isValidPAN } = require('../utils/helpers');

/**
 * @route   GET /api/profile
 * @desc    Get user's financial profile
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: { 
        profile,
        gmailConnected: profile.gmailSettings?.isConnected || false,
        gmailEmail: profile.gmailSettings?.email || null
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

/**
 * @route   POST /api/profile
 * @desc    Create or update financial profile
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      panNumber,
      phoneNumber,
      monthlyIncome,
      currency,
      preferences,
      budgetLimits,
      savingsGoal,
      customCategories
    } = req.body;

    // Validate PAN number if provided
    if (panNumber && !isValidPAN(panNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN number format'
      });
    }

    // Validate phone number if provided
    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please enter a 10-digit number.'
      });
    }

    // Find existing profile or create new
    let profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (profile) {
      // Update existing profile
      if (fullName) profile.fullName = fullName;
      if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
      if (panNumber) profile.panNumber = panNumber;
      if (phoneNumber) profile.phoneNumber = phoneNumber;
      if (monthlyIncome !== undefined) {
        profile.monthlyIncome = monthlyIncome;
        profile.incomeSource = 'manual';
        profile.lastIncomeUpdate = new Date();
      }
      if (currency) profile.currency = currency;
      if (preferences) profile.preferences = { ...profile.preferences, ...preferences };
      if (budgetLimits) profile.budgetLimits = new Map(Object.entries(budgetLimits));
      if (savingsGoal) profile.savingsGoal = savingsGoal;
      if (customCategories) profile.customCategories = customCategories;

      await profile.save();

      logger.info(`Profile updated for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile }
      });
    } else {
      // Create new profile
      profile = new FinancialProfile({
        userId: req.user._id,
        fullName,
        dateOfBirth,
        panNumber,
        phoneNumber,
        monthlyIncome,
        incomeSource: monthlyIncome ? 'manual' : 'not-set',
        lastIncomeUpdate: monthlyIncome ? new Date() : null,
        currency: currency || 'USD',
        preferences: preferences || {},
        budgetLimits: budgetLimits ? new Map(Object.entries(budgetLimits)) : new Map(),
        savingsGoal: savingsGoal || {},
        customCategories: customCategories || []
      });

      await profile.save();

      logger.info(`Profile created for user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: { profile }
      });
    }
  } catch (error) {
    logger.error('Create/Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/profile/preferences
 * @desc    Update profile preferences
 * @access  Private
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.preferences = { ...profile.preferences, ...req.body };
    await profile.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: profile.preferences }
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences'
    });
  }
});

/**
 * @route   PUT /api/profile/budget
 * @desc    Set budget limits for categories
 * @access  Private
 */
router.put('/budget', authenticate, async (req, res) => {
  try {
    const { category, limit } = req.body;

    if (!category || limit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category and limit'
      });
    }

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.budgetLimits.set(category, limit);
    await profile.save();

    res.json({
      success: true,
      message: 'Budget limit updated successfully',
      data: { budgetLimits: Object.fromEntries(profile.budgetLimits) }
    });
  } catch (error) {
    logger.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating budget limit'
    });
  }
});

/**
 * @route   PUT /api/profile/savings-goal
 * @desc    Set savings goal
 * @access  Private
 */
router.put('/savings-goal', authenticate, async (req, res) => {
  try {
    const { amount, deadline, description } = req.body;

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.savingsGoal = { amount, deadline, description };
    await profile.save();

    res.json({
      success: true,
      message: 'Savings goal updated successfully',
      data: { savingsGoal: profile.savingsGoal }
    });
  } catch (error) {
    logger.error('Update savings goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating savings goal'
    });
  }
});

/**
 * @route   POST /api/profile/categories
 * @desc    Add custom category
 * @access  Private
 */
router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, keywords, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.customCategories.push({ name, keywords: keywords || [], color: color || '#808080' });
    await profile.save();

    res.json({
      success: true,
      message: 'Custom category added successfully',
      data: { customCategories: profile.customCategories }
    });
  } catch (error) {
    logger.error('Add category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding custom category'
    });
  }
});

/**
 * @route   DELETE /api/profile/categories/:index
 * @desc    Remove custom category
 * @access  Private
 */
router.delete('/categories/:index', authenticate, async (req, res) => {
  try {
    const { index } = req.params;

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (index < 0 || index >= profile.customCategories.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category index'
      });
    }

    profile.customCategories.splice(index, 1);
    await profile.save();

    res.json({
      success: true,
      message: 'Custom category removed successfully',
      data: { customCategories: profile.customCategories }
    });
  } catch (error) {
    logger.error('Remove category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing custom category'
    });
  }
});

/**
 * @route   DELETE /api/profile
 * @desc    Delete financial profile
 * @access  Private
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOneAndDelete({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    logger.info(`Profile deleted for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    logger.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile'
    });
  }
});

/**
 * GET /api/profile/monthly-income
 * Get monthly income with source information
 */
router.get('/monthly-income', authenticate, async (req, res) => {
  try {
    const analyticsService = require('../services/analyticsService');
    const incomeData = await analyticsService.getMonthlyIncome(req.user._id);

    res.json({
      success: true,
      data: incomeData
    });
  } catch (error) {
    logger.error('Get monthly income error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly income',
      error: error.message
    });
  }
});

module.exports = router;
