/**
 * Investment Routes
 * API endpoints for investment portfolio management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Investment = require('../models/Investment');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/investments
 * @desc    Add new investment
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const investmentData = {
      ...req.body,
      userId: req.user._id
    };
    
    const investment = await Investment.create(investmentData);
    
    logger.info(`Investment created: ${investment._id} by user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Investment added successfully',
      data: investment
    });
  } catch (error) {
    logger.error('Create investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create investment',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments
 * @desc    Get all investments
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, sortBy = 'purchaseDate', order = 'desc' } = req.query;
    
    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;
    
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    const investments = await Investment.find(query).sort(sortOptions);
    
    res.json({
      success: true,
      count: investments.length,
      data: investments
    });
  } catch (error) {
    logger.error('Get investments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investments',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments/portfolio
 * @desc    Get portfolio summary
 * @access  Private
 */
router.get('/portfolio', async (req, res) => {
  try {
    const summary = await Investment.getPortfolioSummary(req.user._id);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get portfolio summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments/performance
 * @desc    Get performance metrics
 * @access  Private
 */
router.get('/performance', async (req, res) => {
  try {
    const investments = await Investment.find({ 
      userId: req.user._id, 
      status: 'active' 
    });
    
    const performance = {
      totalInvested: 0,
      currentValue: 0,
      absoluteReturn: 0,
      percentageReturn: 0,
      totalDividends: 0,
      xirr: 0,
      cagr: 0,
      byType: {}
    };
    
    investments.forEach(inv => {
      performance.totalInvested += inv.totalInvestedAmount;
      performance.currentValue += inv.currentValue || 0;
      performance.totalDividends += inv.totalDividendsReceived || 0;
      
      // Group by type
      if (!performance.byType[inv.type]) {
        performance.byType[inv.type] = {
          invested: 0,
          current: 0,
          return: 0,
          count: 0
        };
      }
      
      performance.byType[inv.type].invested += inv.totalInvestedAmount;
      performance.byType[inv.type].current += inv.currentValue || 0;
      performance.byType[inv.type].count++;
    });
    
    performance.absoluteReturn = performance.currentValue - performance.totalInvested;
    performance.percentageReturn = performance.totalInvested > 0
      ? ((performance.absoluteReturn / performance.totalInvested) * 100).toFixed(2)
      : 0;
    
    // Calculate returns by type
    Object.keys(performance.byType).forEach(type => {
      const data = performance.byType[type];
      data.return = data.invested > 0
        ? ((data.current - data.invested) / data.invested * 100).toFixed(2)
        : 0;
    });
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments/maturities
 * @desc    Get upcoming maturities
 * @access  Private
 */
router.get('/maturities', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const maturities = await Investment.getUpcomingMaturities(req.user._id, parseInt(days));
    
    res.json({
      success: true,
      count: maturities.length,
      data: maturities
    });
  } catch (error) {
    logger.error('Get maturities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming maturities',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments/:id
 * @desc    Get single investment
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    res.json({
      success: true,
      data: investment
    });
  } catch (error) {
    logger.error('Get investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/investments/:id
 * @desc    Update investment
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    logger.info(`Investment updated: ${investment._id}`);
    
    res.json({
      success: true,
      message: 'Investment updated successfully',
      data: investment
    });
  } catch (error) {
    logger.error('Update investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update investment',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/investments/:id
 * @desc    Delete investment
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    logger.info(`Investment deleted: ${investment._id}`);
    
    res.json({
      success: true,
      message: 'Investment deleted successfully'
    });
  } catch (error) {
    logger.error('Delete investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete investment',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/investments/:id/transaction
 * @desc    Record buy/sell/dividend transaction
 * @access  Private
 */
router.post('/:id/transaction', async (req, res) => {
  try {
    const { type, quantity, price, notes } = req.body;
    
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    if (type === 'dividend') {
      await investment.recordDividend(quantity, notes);
    } else {
      await investment.recordTransaction(type, quantity, price, notes);
    }
    
    logger.info(`Transaction recorded for investment: ${investment._id}, type: ${type}`);
    
    res.json({
      success: true,
      message: 'Transaction recorded successfully',
      data: investment
    });
  } catch (error) {
    logger.error('Record transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record transaction',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/investments/:id/price
 * @desc    Update current price
 * @access  Private
 */
router.put('/:id/price', async (req, res) => {
  try {
    const { currentPrice } = req.body;
    
    if (!currentPrice || currentPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price value'
      });
    }
    
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }
    
    await investment.updateCurrentValue(currentPrice);
    
    logger.info(`Price updated for investment: ${investment._id}`);
    
    res.json({
      success: true,
      message: 'Price updated successfully',
      data: investment
    });
  } catch (error) {
    logger.error('Update price error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update price',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/investments/sync-prices
 * @desc    Sync prices from external APIs (placeholder for future implementation)
 * @access  Private
 */
router.post('/sync-prices', async (req, res) => {
  try {
    // Placeholder for price sync implementation
    // Will integrate with Alpha Vantage, Yahoo Finance, CoinGecko APIs
    
    const investments = await Investment.find({
      userId: req.user._id,
      status: 'active',
      autoSync: true
    });
    
    res.json({
      success: true,
      message: 'Price sync feature coming soon',
      data: {
        synced: 0,
        total: investments.length
      }
    });
  } catch (error) {
    logger.error('Sync prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync prices',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/investments/analytics/allocation
 * @desc    Get asset allocation breakdown
 * @access  Private
 */
router.get('/analytics/allocation', async (req, res) => {
  try {
    const investments = await Investment.find({
      userId: req.user._id,
      status: 'active'
    });
    
    const allocation = {
      total: 0,
      byType: {},
      byRisk: {},
      byCategory: {}
    };
    
    investments.forEach(inv => {
      const value = inv.currentValue || 0;
      allocation.total += value;
      
      // By type
      allocation.byType[inv.type] = (allocation.byType[inv.type] || 0) + value;
      
      // By risk
      allocation.byRisk[inv.riskLevel] = (allocation.byRisk[inv.riskLevel] || 0) + value;
      
      // By category
      if (inv.category) {
        allocation.byCategory[inv.category] = (allocation.byCategory[inv.category] || 0) + value;
      }
    });
    
    // Convert to percentages
    Object.keys(allocation.byType).forEach(key => {
      allocation.byType[key] = {
        value: allocation.byType[key],
        percentage: ((allocation.byType[key] / allocation.total) * 100).toFixed(2)
      };
    });
    
    Object.keys(allocation.byRisk).forEach(key => {
      allocation.byRisk[key] = {
        value: allocation.byRisk[key],
        percentage: ((allocation.byRisk[key] / allocation.total) * 100).toFixed(2)
      };
    });
    
    Object.keys(allocation.byCategory).forEach(key => {
      allocation.byCategory[key] = {
        value: allocation.byCategory[key],
        percentage: ((allocation.byCategory[key] / allocation.total) * 100).toFixed(2)
      };
    });
    
    res.json({
      success: true,
      data: allocation
    });
  } catch (error) {
    logger.error('Get allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset allocation',
      error: error.message
    });
  }
});

module.exports = router;
