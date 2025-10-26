const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isLenderOrAdmin } = require('../middleware/authorization');
const Lender = require('../models/Lender');
const LenderLoan = require('../models/LenderLoan');
const LenderPayment = require('../models/LenderPayment');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);
router.use(isLenderOrAdmin);

// @route   GET /api/lenders/dashboard
// @desc    Get lender dashboard data
// @access  Lender, Admin
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all lenders for this user
    let lenders = await Lender.find({ userId });
    
    // If no lender profile exists, create one automatically
    if (lenders.length === 0 && req.user.role === 'lender') {
      logger.info(`Auto-creating lender profile for user ${userId}`);
      const newLender = await Lender.create({
        userId: userId,
        lenderName: req.user.name,
        contactEmail: req.user.email,
        contactPhone: req.user.phoneNumber || '',
        lenderType: 'Individual',
        status: 'Active'
      });
      lenders = [newLender];
      logger.info(`Lender profile created: ${newLender._id}`);
    }
    
    // Aggregate statistics
    const stats = {
      totalLenders: lenders.length,
      activeLenders: lenders.filter(l => l.status === 'Active').length,
      totalAmountLent: lenders.reduce((sum, l) => sum + l.totalAmountLent, 0),
      totalOutstanding: lenders.reduce((sum, l) => sum + l.totalOutstanding, 0),
      totalInterestEarned: lenders.reduce((sum, l) => sum + l.totalInterestEarned, 0),
      totalInterestPending: lenders.reduce((sum, l) => sum + l.totalInterestPending, 0),
      totalRepaid: lenders.reduce((sum, l) => sum + l.totalRepaid, 0),
      activeLoanCount: lenders.reduce((sum, l) => sum + l.activeLoanCount, 0),
      completedLoanCount: lenders.reduce((sum, l) => sum + l.completedLoanCount, 0),
      defaultedLoanCount: lenders.reduce((sum, l) => sum + l.defaultedLoanCount, 0)
    };
    
    // Calculate derived metrics
    stats.totalLoanCount = stats.activeLoanCount + stats.completedLoanCount + stats.defaultedLoanCount;
    stats.collectionRate = stats.totalAmountLent > 0 ? 
      ((stats.totalRepaid / stats.totalAmountLent) * 100).toFixed(2) : 0;
    stats.defaultRate = stats.totalLoanCount > 0 ? 
      ((stats.defaultedLoanCount / stats.totalLoanCount) * 100).toFixed(2) : 0;
    stats.roi = stats.totalAmountLent > 0 ? 
      ((stats.totalInterestEarned / stats.totalAmountLent) * 100).toFixed(2) : 0;
    
    // Get recent loans
    const recentLoans = await LenderLoan.find({ userId })
      .populate('lenderId', 'lenderName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get overdue loans
    const overdueLoans = await LenderLoan.find({ 
      userId, 
      status: 'Active',
      isOverdue: true 
    })
      .populate('lenderId', 'lenderName')
      .sort({ overdueDays: -1 })
      .limit(10);
    
    // Get upcoming EMIs (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingEMIs = await LenderLoan.find({
      userId,
      status: 'Active',
      nextEmiDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    })
      .populate('lenderId', 'lenderName')
      .sort({ nextEmiDate: 1 })
      .limit(20);
    
    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const payments = await LenderPayment.find({
      userId,
      paymentDate: { $gte: sixMonthsAgo },
      status: 'Completed'
    }).sort({ paymentDate: 1 });
    
    const monthlyTrends = {};
    payments.forEach(payment => {
      const month = payment.paymentDate.toISOString().substring(0, 7);
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          totalCollected: 0,
          principalCollected: 0,
          interestCollected: 0,
          paymentCount: 0
        };
      }
      monthlyTrends[month].totalCollected += payment.amount;
      monthlyTrends[month].principalCollected += payment.principalAmount;
      monthlyTrends[month].interestCollected += payment.interestAmount;
      monthlyTrends[month].paymentCount += 1;
    });
    
    // Lender-wise distribution
    const lenderDistribution = lenders.map(lender => ({
      lenderId: lender._id,
      lenderName: lender.lenderName,
      activeLoans: lender.activeLoanCount,
      totalOutstanding: lender.totalOutstanding,
      interestEarned: lender.totalInterestEarned,
      roi: lender.roi
    }));
    
    res.json({
      success: true,
      data: {
        stats,
        lenders,
        recentLoans,
        overdueLoans,
        upcomingEMIs,
        monthlyTrends,
        lenderDistribution
      }
    });
  } catch (error) {
    logger.error('Error fetching lender dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/lenders
// @desc    Get all lenders for user
// @access  Lender, Admin
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, type, search } = req.query;
    
    const query = { userId };
    
    if (status) query.status = status;
    if (type) query.lenderType = type;
    if (search) {
      query.$or = [
        { lenderName: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
        { contactPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const lenders = await Lender.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: lenders.length,
      data: lenders
    });
  } catch (error) {
    logger.error('Error fetching lenders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lenders',
      error: error.message
    });
  }
});

// @route   GET /api/lenders/:id
// @desc    Get single lender
// @access  Lender, Admin
router.get('/:id', async (req, res) => {
  try {
    const lender = await Lender.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lender) {
      return res.status(404).json({
        success: false,
        message: 'Lender not found'
      });
    }
    
    // Get associated loans
    const loans = await LenderLoan.find({ 
      lenderId: lender._id,
      userId: req.user._id
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        lender,
        loans
      }
    });
  } catch (error) {
    logger.error('Error fetching lender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lender',
      error: error.message
    });
  }
});

// @route   POST /api/lenders
// @desc    Create new lender
// @access  Lender, Admin
router.post('/', async (req, res) => {
  try {
    const lenderData = {
      ...req.body,
      userId: req.user._id
    };
    
    const lender = await Lender.create(lenderData);
    
    logger.info(`Lender created: ${lender._id} by user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Lender created successfully',
      data: lender
    });
  } catch (error) {
    logger.error('Error creating lender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lender',
      error: error.message
    });
  }
});

// @route   PUT /api/lenders/:id
// @desc    Update lender
// @access  Lender, Admin
router.put('/:id', async (req, res) => {
  try {
    const lender = await Lender.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!lender) {
      return res.status(404).json({
        success: false,
        message: 'Lender not found'
      });
    }
    
    logger.info(`Lender updated: ${lender._id}`);
    
    res.json({
      success: true,
      message: 'Lender updated successfully',
      data: lender
    });
  } catch (error) {
    logger.error('Error updating lender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lender',
      error: error.message
    });
  }
});

// @route   DELETE /api/lenders/:id
// @desc    Delete lender
// @access  Lender, Admin
router.delete('/:id', async (req, res) => {
  try {
    // Check if lender has active loans
    const activeLoans = await LenderLoan.countDocuments({
      lenderId: req.params.id,
      userId: req.user._id,
      status: 'Active'
    });
    
    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete lender with ${activeLoans} active loans`
      });
    }
    
    const lender = await Lender.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lender) {
      return res.status(404).json({
        success: false,
        message: 'Lender not found'
      });
    }
    
    logger.info(`Lender deleted: ${lender._id}`);
    
    res.json({
      success: true,
      message: 'Lender deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting lender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lender',
      error: error.message
    });
  }
});

// @route   POST /api/lenders/:id/refresh-stats
// @desc    Refresh lender statistics
// @access  Lender, Admin
router.post('/:id/refresh-stats', async (req, res) => {
  try {
    const lender = await Lender.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!lender) {
      return res.status(404).json({
        success: false,
        message: 'Lender not found'
      });
    }
    
    await lender.updateStatistics();
    
    res.json({
      success: true,
      message: 'Statistics updated successfully',
      data: lender
    });
  } catch (error) {
    logger.error('Error refreshing lender stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh statistics',
      error: error.message
    });
  }
});

module.exports = router;
