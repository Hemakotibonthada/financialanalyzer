const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isLenderOrAdmin } = require('../middleware/authorization');
const LenderLoan = require('../models/LenderLoan');
const Lender = require('../models/Lender');
const logger = require('../utils/logger');

// Apply authentication
router.use(authenticate);
router.use(isLenderOrAdmin);

// @route   GET /api/lender-loans
// @desc    Get all loans
// @access  Lender, Admin
router.get('/', async (req, res) => {
  try {
    const { status, lenderId, search, sortBy, order } = req.query;
    
    const query = { userId: req.user._id };
    
    if (status) query.status = status;
    if (lenderId) query.lenderId = lenderId;
    if (search) {
      query.$or = [
        { borrowerName: { $regex: search, $options: 'i' } },
        { loanNumber: { $regex: search, $options: 'i' } },
        { borrowerPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const sortField = sortBy || 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const loans = await LenderLoan.find(query)
      .populate('lenderId', 'lenderName lenderType')
      .sort({ [sortField]: sortOrder });
    
    res.json({
      success: true,
      count: loans.length,
      data: loans
    });
  } catch (error) {
    logger.error('Error fetching loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loans',
      error: error.message
    });
  }
});

// @route   GET /api/lender-loans/:id
// @desc    Get single loan
// @access  Lender, Admin
router.get('/:id', async (req, res) => {
  try {
    const loan = await LenderLoan.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('lenderId');
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Get payment history
    const LenderPayment = require('../models/LenderPayment');
    const payments = await LenderPayment.find({ 
      loanId: loan._id 
    }).sort({ paymentDate: -1 });
    
    res.json({
      success: true,
      data: {
        loan,
        payments
      }
    });
  } catch (error) {
    logger.error('Error fetching loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan',
      error: error.message
    });
  }
});

// @route   POST /api/lender-loans
// @desc    Create new loan
// @access  Lender, Admin
router.post('/', async (req, res) => {
  try {
    const loanData = {
      ...req.body,
      userId: req.user._id
    };
    
    // Generate loan number
    loanData.loanNumber = await LenderLoan.generateLoanNumber();
    
    // Create loan
    const loan = new LenderLoan(loanData);
    
    // Calculate EMI
    loan.calculateEMI();
    
    // Calculate maturity date
    const maturityDate = new Date(loan.disbursementDate);
    maturityDate.setMonth(maturityDate.getMonth() + loan.tenure);
    loan.maturityDate = maturityDate;
    
    // Set next EMI date
    loan.nextEmiDate = loan.firstEmiDate;
    loan.nextEmiAmount = loan.emi;
    
    // Set initial outstanding
    loan.outstandingAmount = loan.totalPayable;
    loan.principalDue = loan.principalAmount;
    loan.interestDue = loan.totalInterest;
    loan.totalEmisRemaining = loan.tenure;
    
    await loan.save();
    
    // Update lender statistics
    const lender = await Lender.findById(loan.lenderId);
    if (lender) {
      await lender.updateStatistics();
    }
    
    logger.info(`Loan created: ${loan.loanNumber} by user: ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Error creating loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create loan',
      error: error.message
    });
  }
});

// @route   PUT /api/lender-loans/:id
// @desc    Update loan
// @access  Lender, Admin
router.put('/:id', async (req, res) => {
  try {
    const loan = await LenderLoan.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Update fields
    Object.assign(loan, req.body);
    
    // Recalculate EMI if principal or interest changed
    if (req.body.principalAmount || req.body.interestRate || req.body.tenure) {
      loan.calculateEMI();
    }
    
    await loan.save();
    
    // Update lender statistics
    const lender = await Lender.findById(loan.lenderId);
    if (lender) {
      await lender.updateStatistics();
    }
    
    logger.info(`Loan updated: ${loan.loanNumber}`);
    
    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Error updating loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loan',
      error: error.message
    });
  }
});

// @route   PUT /api/lender-loans/:id/status
// @desc    Update loan status
// @access  Lender, Admin
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Active', 'Completed', 'Defaulted', 'Foreclosed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const loan = await LenderLoan.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    loan.status = status;
    await loan.save();
    
    // Update lender statistics
    const lender = await Lender.findById(loan.lenderId);
    if (lender) {
      await lender.updateStatistics();
    }
    
    logger.info(`Loan status updated: ${loan.loanNumber} to ${status}`);
    
    res.json({
      success: true,
      message: 'Loan status updated successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Error updating loan status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loan status',
      error: error.message
    });
  }
});

// @route   DELETE /api/lender-loans/:id
// @desc    Delete loan
// @access  Lender, Admin
router.delete('/:id', async (req, res) => {
  try {
    const loan = await LenderLoan.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Check if loan has payments
    const LenderPayment = require('../models/LenderPayment');
    const paymentCount = await LenderPayment.countDocuments({ loanId: loan._id });
    
    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete loan with ${paymentCount} payments. Mark as completed instead.`
      });
    }
    
    const lenderId = loan.lenderId;
    await loan.deleteOne();
    
    // Update lender statistics
    const lender = await Lender.findById(lenderId);
    if (lender) {
      await lender.updateStatistics();
    }
    
    logger.info(`Loan deleted: ${loan.loanNumber}`);
    
    res.json({
      success: true,
      message: 'Loan deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete loan',
      error: error.message
    });
  }
});

// @route   GET /api/lender-loans/:id/schedule
// @desc    Get loan EMI schedule
// @access  Lender, Admin
router.get('/:id/schedule', async (req, res) => {
  try {
    const loan = await LenderLoan.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Generate EMI schedule
    const schedule = [];
    let remainingPrincipal = loan.principalAmount;
    const monthlyRate = loan.interestRate / (12 * 100);
    
    for (let i = 1; i <= loan.tenure; i++) {
      const emiDate = new Date(loan.firstEmiDate);
      emiDate.setMonth(emiDate.getMonth() + (i - 1));
      
      let interest, principal;
      
      if (loan.interestType === 'Flat') {
        interest = (loan.principalAmount * loan.interestRate * (1/12)) / 100;
        principal = loan.emi - interest;
      } else {
        interest = remainingPrincipal * monthlyRate;
        principal = loan.emi - interest;
      }
      
      remainingPrincipal -= principal;
      
      schedule.push({
        emiNumber: i,
        emiDate,
        emiAmount: loan.emi,
        principal: Math.round(principal),
        interest: Math.round(interest),
        remainingPrincipal: Math.max(0, Math.round(remainingPrincipal)),
        isPaid: i <= loan.totalEmisPaid
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Error generating EMI schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate EMI schedule',
      error: error.message
    });
  }
});

module.exports = router;
