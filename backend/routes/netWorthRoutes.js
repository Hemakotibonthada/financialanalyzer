/**
 * Net Worth Routes
 * API endpoints for net worth tracking and management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const NetWorthSnapshot = require('../models/NetWorthSnapshot');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/networth/snapshot
 * @desc    Create manual net worth snapshot
 * @access  Private
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshotData = {
      ...req.body,
      userId: req.user._id,
      period: req.body.period || 'manual'
    };
    
    const snapshot = await NetWorthSnapshot.create(snapshotData);
    
    logger.info(`Net worth snapshot created: ${snapshot._id} by user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Net worth snapshot created successfully',
      data: snapshot
    });
  } catch (error) {
    logger.error('Create snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create snapshot',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/networth/auto-generate
 * @desc    Auto-generate net worth from investments and loans
 * @access  Private
 */
router.post('/auto-generate', async (req, res) => {
  try {
    const { period = 'monthly' } = req.body;
    
    const snapshot = await NetWorthSnapshot.createFromCurrent(req.user._id, period);
    
    logger.info(`Auto-generated net worth snapshot: ${snapshot._id} for user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Net worth snapshot auto-generated successfully',
      data: snapshot
    });
  } catch (error) {
    logger.error('Auto-generate snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate snapshot',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/networth/latest
 * @desc    Get latest net worth snapshot
 * @access  Private
 */
router.get('/latest', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.getLatest(req.user._id);
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'No net worth data found. Create your first snapshot!'
      });
    }
    
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Get latest snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest snapshot',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/networth/history
 * @desc    Get historical net worth snapshots
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const { months = 12, period } = req.query;
    
    const snapshots = await NetWorthSnapshot.getHistory(
      req.user._id,
      parseInt(months),
      period
    );
    
    res.json({
      success: true,
      count: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/networth/trend
 * @desc    Get net worth trend analysis
 * @access  Private
 */
router.get('/trend', async (req, res) => {
  try {
    const { period = 'monthly', count = 12 } = req.query;
    
    const trend = await NetWorthSnapshot.getTrend(
      req.user._id,
      period,
      parseInt(count)
    );
    
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    logger.error('Get trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trend',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/networth/comparison
 * @desc    Get period comparison
 * @access  Private
 */
router.get('/comparison', async (req, res) => {
  try {
    const latest = await NetWorthSnapshot.getLatest(req.user._id);
    
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'No data available for comparison'
      });
    }
    
    // Get snapshot from 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthSnapshot = await NetWorthSnapshot.findOne({
      userId: req.user._id,
      date: { $lte: oneMonthAgo }
    }).sort({ date: -1 });
    
    // Get snapshot from 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearSnapshot = await NetWorthSnapshot.findOne({
      userId: req.user._id,
      date: { $lte: oneYearAgo }
    }).sort({ date: -1 });
    
    const comparison = {
      current: {
        netWorth: latest.netWorth,
        totalAssets: latest.assets.totalAssets,
        totalLiabilities: latest.liabilities.totalLiabilities,
        date: latest.date
      },
      monthAgo: monthSnapshot ? {
        netWorth: monthSnapshot.netWorth,
        totalAssets: monthSnapshot.assets.totalAssets,
        totalLiabilities: monthSnapshot.liabilities.totalLiabilities,
        date: monthSnapshot.date,
        change: {
          netWorth: latest.netWorth - monthSnapshot.netWorth,
          netWorthPercent: ((latest.netWorth - monthSnapshot.netWorth) / monthSnapshot.netWorth * 100).toFixed(2),
          assets: latest.assets.totalAssets - monthSnapshot.assets.totalAssets,
          liabilities: latest.liabilities.totalLiabilities - monthSnapshot.liabilities.totalLiabilities
        }
      } : null,
      yearAgo: yearSnapshot ? {
        netWorth: yearSnapshot.netWorth,
        totalAssets: yearSnapshot.assets.totalAssets,
        totalLiabilities: yearSnapshot.liabilities.totalLiabilities,
        date: yearSnapshot.date,
        change: {
          netWorth: latest.netWorth - yearSnapshot.netWorth,
          netWorthPercent: ((latest.netWorth - yearSnapshot.netWorth) / yearSnapshot.netWorth * 100).toFixed(2),
          assets: latest.assets.totalAssets - yearSnapshot.assets.totalAssets,
          liabilities: latest.liabilities.totalLiabilities - yearSnapshot.liabilities.totalLiabilities
        }
      } : null
    };
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    logger.error('Get comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comparison',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/networth/projections
 * @desc    Get net worth projections
 * @access  Private
 */
router.get('/projections', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    // Get recent snapshots to calculate growth rate
    const recentSnapshots = await NetWorthSnapshot.find({
      userId: req.user._id
    }).sort({ date: -1 }).limit(6);
    
    if (recentSnapshots.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 2 snapshots to calculate projections'
      });
    }
    
    // Calculate average monthly growth rate
    let totalGrowth = 0;
    for (let i = 0; i < recentSnapshots.length - 1; i++) {
      const current = recentSnapshots[i];
      const previous = recentSnapshots[i + 1];
      
      if (previous.netWorth > 0) {
        const growth = ((current.netWorth - previous.netWorth) / previous.netWorth) * 100;
        totalGrowth += growth;
      }
    }
    
    const avgMonthlyGrowth = totalGrowth / (recentSnapshots.length - 1);
    const currentNetWorth = recentSnapshots[0].netWorth;
    
    // Project future values
    const projections = [];
    const projectionMonths = parseInt(months);
    
    for (let i = 1; i <= projectionMonths; i++) {
      const projectedValue = currentNetWorth * Math.pow(1 + avgMonthlyGrowth / 100, i);
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + i);
      
      projections.push({
        month: i,
        date: projectedDate,
        projectedNetWorth: Math.round(projectedValue),
        growthRate: avgMonthlyGrowth
      });
    }
    
    res.json({
      success: true,
      data: {
        currentNetWorth,
        avgMonthlyGrowthRate: avgMonthlyGrowth.toFixed(2),
        projections
      }
    });
  } catch (error) {
    logger.error('Get projections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate projections',
      error: error.message
    });
  }
});

// ============================================================================
// ASSET & LIABILITY ITEM ROUTES
// These must be defined BEFORE the /:id catch-all route
// ============================================================================

const ASSET_FIELD_MAP = {
  savings: 'bankSavings', current: 'bankCurrent', cash: 'cash',
  stocks: 'stocks', mutual_funds: 'mutualFunds', crypto: 'crypto',
  bonds: 'bonds', gold: 'gold', fixed_deposits: 'fixedDeposits',
  ppf: 'ppf', nps: 'nps', epf: 'epf',
  real_estate: 'primaryHome', rental: 'rentalProperty', land: 'land',
  vehicles: 'vehicles', business: 'businessValue', loans_given: 'loansGiven',
  other: 'otherAssets',
};

const LIABILITY_FIELD_MAP = {
  home_loan: 'homeLoan', car_loan: 'carLoan', personal_loan: 'personalLoan',
  education_loan: 'educationLoan', business_loan: 'businessLoan',
  credit_card: 'creditCardDues', emi: 'emiOutstanding',
  personal_debt: 'personalDebts', other: 'otherLiabilities',
};

function snapshotAssetsToArray(assets) {
  if (!assets) return [];
  const items = [];
  for (const [category, field] of Object.entries(ASSET_FIELD_MAP)) {
    const value = assets[field] || 0;
    if (value > 0) {
      items.push({ _id: field, name: field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(), value, category, field });
    }
  }
  return items;
}

function snapshotLiabilitiesToArray(liabilities) {
  if (!liabilities) return [];
  const items = [];
  for (const [category, field] of Object.entries(LIABILITY_FIELD_MAP)) {
    const value = liabilities[field] || 0;
    if (value > 0) {
      items.push({ _id: field, name: field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(), value, category, field });
    }
  }
  return items;
}

/**
 * @route   GET /api/networth/assets
 * @desc    Get user assets as array items
 * @access  Private
 */
router.get('/assets', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    const items = snapshot ? snapshotAssetsToArray(snapshot.assets) : [];
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Get assets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assets', error: error.message });
  }
});

/**
 * @route   GET /api/networth/liabilities
 * @desc    Get user liabilities as array items
 * @access  Private
 */
router.get('/liabilities', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    const items = snapshot ? snapshotLiabilitiesToArray(snapshot.liabilities) : [];
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Get liabilities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch liabilities', error: error.message });
  }
});

/**
 * @route   POST /api/networth/assets
 * @desc    Add/update an asset in the latest snapshot
 * @access  Private
 */
router.post('/assets', async (req, res) => {
  try {
    const { name, value, category } = req.body;
    const field = ASSET_FIELD_MAP[category] || ASSET_FIELD_MAP[name?.toLowerCase()] || 'otherAssets';
    const amount = parseFloat(value) || 0;

    let snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    if (!snapshot) {
      snapshot = new NetWorthSnapshot({ userId: req.user._id, date: new Date(), netWorth: 0, assets: {}, liabilities: {} });
    }
    snapshot.assets[field] = (snapshot.assets[field] || 0) + amount;
    snapshot.assets.totalAssets = Object.entries(ASSET_FIELD_MAP).reduce((sum, [, f]) => sum + (snapshot.assets[f] || 0), 0);
    snapshot.netWorth = (snapshot.assets.totalAssets || 0) - (snapshot.liabilities?.totalLiabilities || 0);
    await snapshot.save();

    res.json({ success: true, data: { field, value: snapshot.assets[field] }, message: 'Asset added' });
  } catch (error) {
    logger.error('Add asset error:', error);
    res.status(500).json({ success: false, message: 'Failed to add asset', error: error.message });
  }
});

/**
 * @route   POST /api/networth/liabilities
 * @desc    Add/update a liability in the latest snapshot
 * @access  Private
 */
router.post('/liabilities', async (req, res) => {
  try {
    const { name, value, category } = req.body;
    const field = LIABILITY_FIELD_MAP[category] || LIABILITY_FIELD_MAP[name?.toLowerCase()] || 'otherLiabilities';
    const amount = parseFloat(value) || 0;

    let snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    if (!snapshot) {
      snapshot = new NetWorthSnapshot({ userId: req.user._id, date: new Date(), netWorth: 0, assets: {}, liabilities: {} });
    }
    snapshot.liabilities[field] = (snapshot.liabilities[field] || 0) + amount;
    snapshot.liabilities.totalLiabilities = Object.entries(LIABILITY_FIELD_MAP).reduce((sum, [, f]) => sum + (snapshot.liabilities[f] || 0), 0);
    snapshot.netWorth = (snapshot.assets?.totalAssets || 0) - (snapshot.liabilities.totalLiabilities || 0);
    await snapshot.save();

    res.json({ success: true, data: { field, value: snapshot.liabilities[field] }, message: 'Liability added' });
  } catch (error) {
    logger.error('Add liability error:', error);
    res.status(500).json({ success: false, message: 'Failed to add liability', error: error.message });
  }
});

/**
 * @route   PUT /api/networth/assets/:field
 * @desc    Update a specific asset field
 * @access  Private
 */
router.put('/assets/:field', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    if (!snapshot) return res.status(404).json({ success: false, message: 'No snapshot found' });

    const field = req.params.field;
    snapshot.assets[field] = parseFloat(req.body.value) || 0;
    snapshot.assets.totalAssets = Object.entries(ASSET_FIELD_MAP).reduce((sum, [, f]) => sum + (snapshot.assets[f] || 0), 0);
    snapshot.netWorth = (snapshot.assets.totalAssets || 0) - (snapshot.liabilities?.totalLiabilities || 0);
    await snapshot.save();

    res.json({ success: true, message: 'Asset updated' });
  } catch (error) {
    logger.error('Update asset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/networth/assets/:field
 * @desc    Clear a specific asset field
 * @access  Private
 */
router.delete('/assets/:field', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOne({ userId: req.user._id }).sort({ date: -1 });
    if (!snapshot) return res.status(404).json({ success: false, message: 'No snapshot found' });

    snapshot.assets[req.params.field] = 0;
    snapshot.assets.totalAssets = Object.entries(ASSET_FIELD_MAP).reduce((sum, [, f]) => sum + (snapshot.assets[f] || 0), 0);
    snapshot.netWorth = (snapshot.assets.totalAssets || 0) - (snapshot.liabilities?.totalLiabilities || 0);
    await snapshot.save();

    res.json({ success: true, message: 'Asset removed' });
  } catch (error) {
    logger.error('Delete asset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/networth/:id
 * @desc    Get specific snapshot
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'Snapshot not found'
      });
    }
    
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Get snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch snapshot',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/networth/:id
 * @desc    Update snapshot
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'Snapshot not found'
      });
    }
    
    logger.info(`Snapshot updated: ${snapshot._id}`);
    
    res.json({
      success: true,
      message: 'Snapshot updated successfully',
      data: snapshot
    });
  } catch (error) {
    logger.error('Update snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update snapshot',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/networth/:id
 * @desc    Delete snapshot
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const snapshot = await NetWorthSnapshot.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'Snapshot not found'
      });
    }
    
    logger.info(`Snapshot deleted: ${snapshot._id}`);
    
    res.json({
      success: true,
      message: 'Snapshot deleted successfully'
    });
  } catch (error) {
    logger.error('Delete snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete snapshot',
      error: error.message
    });
  }
});

module.exports = router;
