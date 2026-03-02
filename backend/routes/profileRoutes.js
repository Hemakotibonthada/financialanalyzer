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
      // Return a default empty profile pre-filled with the user's name
      // so the frontend can show the form without errors
      return res.json({
        success: true,
        isNew: true,
        data: { 
          profile: {
            fullName: req.user.name || '',
            dateOfBirth: '',
            panNumber: '',
            phoneNumber: '',
            monthlyIncome: '',
            currency: 'INR',
            preferences: {},
            budgetLimits: {},
            savingsGoal: {},
            customCategories: []
          },
          gmailConnected: false,
          gmailEmail: null
        }
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
      // Create new profile — use user's name as fallback for fullName
      const profileFullName = fullName || req.user.name || 'User';
      profile = new FinancialProfile({
        userId: req.user._id,
        fullName: profileFullName,
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
    
    // Return proper validation error messages
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }
    
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
 * @route   PUT /api/profile/debt-freedom/emergency-fund
 * @desc    Update emergency fund status (stored in profile.preferences.debtFreedom.emergencyFund)
 * @access  Private
 */
router.put('/debt-freedom/emergency-fund', authenticate, async (req, res) => {
  try {
    const { currentAmount, goalAmount } = req.body || {};

    if (currentAmount !== undefined && (typeof currentAmount !== 'number' || Number.isNaN(currentAmount) || currentAmount < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currentAmount'
      });
    }

    if (goalAmount !== undefined && (typeof goalAmount !== 'number' || Number.isNaN(goalAmount) || goalAmount < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goalAmount'
      });
    }

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (!profile.preferences) profile.preferences = {};
    if (!profile.preferences.debtFreedom) profile.preferences.debtFreedom = {};
    if (!profile.preferences.debtFreedom.emergencyFund) profile.preferences.debtFreedom.emergencyFund = {};

    if (currentAmount !== undefined) profile.preferences.debtFreedom.emergencyFund.currentAmount = currentAmount;
    if (goalAmount !== undefined) profile.preferences.debtFreedom.emergencyFund.goalAmount = goalAmount;
    profile.preferences.debtFreedom.emergencyFund.updatedAt = new Date();

    await profile.save();

    return res.json({
      success: true,
      message: 'Emergency fund updated successfully',
      data: {
        emergencyFund: profile.preferences.debtFreedom.emergencyFund
      }
    });
  } catch (error) {
    logger.error('Update emergency fund error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating emergency fund'
    });
  }
});

/**
 * @route   POST /api/profile/debt-freedom/emergency-fund/contribution
 * @desc    Add a monthly contribution to emergency fund and update currentAmount
 * @access  Private
 */
router.post('/debt-freedom/emergency-fund/contribution', authenticate, async (req, res) => {
  try {
    const { amount, note } = req.body || {};

    if (amount === undefined || typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Contribution amount must be a positive number'
      });
    }

    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (!profile.preferences) profile.preferences = {};
    if (!profile.preferences.debtFreedom) profile.preferences.debtFreedom = {};
    if (!profile.preferences.debtFreedom.emergencyFund) profile.preferences.debtFreedom.emergencyFund = {};
    if (!profile.preferences.debtFreedom.emergencyFund.contributions) profile.preferences.debtFreedom.emergencyFund.contributions = [];

    profile.preferences.debtFreedom.emergencyFund.currentAmount =
      (profile.preferences.debtFreedom.emergencyFund.currentAmount || 0) + amount;

    profile.preferences.debtFreedom.emergencyFund.contributions.push({
      amount,
      note: note || undefined,
      date: new Date()
    });

    if (profile.preferences.debtFreedom.emergencyFund.contributions.length > 120) {
      profile.preferences.debtFreedom.emergencyFund.contributions.shift();
    }

    profile.preferences.debtFreedom.emergencyFund.updatedAt = new Date();
    await profile.save();

    return res.json({
      success: true,
      message: 'Contribution added and emergency fund updated',
      data: {
        emergencyFund: profile.preferences.debtFreedom.emergencyFund
      }
    });
  } catch (error) {
    logger.error('Add emergency fund contribution error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding contribution'
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
