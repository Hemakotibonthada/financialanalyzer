const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isLenderOrAdmin } = require('../middleware/authorization');
const LenderPayment = require('../models/LenderPayment');
const LenderLoan = require('../models/LenderLoan');
const Lender = require('../models/Lender');
const logger = require('../utils/logger');

// Apply authentication
router.use(authenticate);
router.use(isLenderOrAdmin);

// @route   GET /api/lender-payments
// @desc    Get all payments
// @access  Lender, Admin
router.get('/', async (req, res) => {
  try {
    const { loanId, lenderId, status, startDate, endDate } = req.query;
    
    const query = { userId: req.user._id };
    
    if (loanId) query.loanId = loanId;
    if (lenderId) query.lenderId = lenderId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    const payments = await LenderPayment.find(query)
      .populate('lenderId', 'lenderName')
      .populate('loanId', 'loanNumber borrowerName')
      .sort({ paymentDate: -1 });
    
    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

// @route   POST /api/lender-payments
// @desc    Record new payment
// @access  Lender, Admin
router.post('/', async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user._id
    };
    
    // Generate payment number
    paymentData.paymentNumber = await LenderPayment.generatePaymentNumber();
    
    // Create payment
    const payment = await LenderPayment.create(paymentData);
    
    // Update loan
    await payment.updateLoan();
    
    logger.info(`Payment recorded: ${payment.paymentNumber} for loan: ${payment.loanId}`);
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    logger.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
});

// @route   GET /api/lender-payments/:id
// @desc    Get single payment
// @access  Lender, Admin
router.get('/:id', async (req, res) => {
  try {
    const payment = await LenderPayment.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('lenderId', 'lenderName')
      .populate('loanId', 'loanNumber borrowerName borrowerPhone');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
});

// @route   PUT /api/lender-payments/:id
// @desc    Update payment
// @access  Lender, Admin
router.put('/:id', async (req, res) => {
  try {
    const payment = await LenderPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    logger.info(`Payment updated: ${payment.paymentNumber}`);
    
    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    logger.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
});

// @route   DELETE /api/lender-payments/:id
// @desc    Delete payment
// @access  Lender, Admin
router.delete('/:id', async (req, res) => {
  try {
    const payment = await LenderPayment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Reverse the loan update
    const loan = await LenderLoan.findById(payment.loanId);
    if (loan) {
      loan.amountRepaid -= payment.amount;
      loan.principalPaid -= payment.principalAmount;
      loan.interestPaid -= payment.interestAmount;
      loan.outstandingAmount = loan.totalPayable - loan.amountRepaid;
      loan.totalEmisPaid = Math.max(0, loan.totalEmisPaid - 1);
      loan.totalEmisRemaining = loan.tenure - loan.totalEmisPaid;
      
      if (loan.totalEmisRemaining > 0) {
        loan.status = 'Active';
      }
      
      await loan.save();
      
      // Update lender stats
      const lender = await Lender.findById(payment.lenderId);
      if (lender) {
        await lender.updateStatistics();
      }
    }
    
    await payment.deleteOne();
    
    logger.info(`Payment deleted: ${payment.paymentNumber}`);
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment',
      error: error.message
    });
  }
});

module.exports = router;
