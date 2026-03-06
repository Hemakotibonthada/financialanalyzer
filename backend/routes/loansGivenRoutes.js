/**
 * Loans Given Routes
 * API endpoints for tracking money lent to friends and family
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const LoanGiven = require('../models/LoanGiven');
const logger = require('../utils/logger');

/**
 * @route GET /api/loans-given
 * @desc Get all loans given by user
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, relationship } = req.query;
    const userId = req.user._id;
    
    const filters = {};
    if (status) filters.status = status;
    if (relationship) filters.relationship = relationship;
    
    const loans = await LoanGiven.getUserLoans(userId, filters);
    
    res.json({
      success: true,
      data: loans
    });
  } catch (error) {
    logger.error('Get loans given error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loans',
      error: error.message
    });
  }
});

/**
 * @route GET /api/loans-given/summary
 * @desc Get summary statistics for loans given
 * @access Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await LoanGiven.getSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get loans summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/loans-given/:id
 * @desc Get a specific loan by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const loan = await LoanGiven.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    logger.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan',
      error: error.message
    });
  }
});

/**
 * @route POST /api/loans-given
 * @desc Create a new loan given entry
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      borrowerName,
      relationship,
      amount,
      loanDate,
      expectedRepaymentDate,
      purpose,
      contactDetails,
      interestRate,
      hasInterest,
      notes,
      priority,
      tags
    } = req.body;
    
    // Validation
    if (!borrowerName || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Borrower name and valid amount are required'
      });
    }
    
    const parsedAmount = parseFloat(amount);
    const currency = req.body.currency || 'INR';
    const exchangeRate = parseFloat(req.body.exchangeRate) || 1;
    const interestType = req.body.interestType || 'none';

    const loan = new LoanGiven({
      userId: req.user._id,
      borrowerName,
      relationship: relationship || 'Friend',
      amount: parsedAmount,
      amountInINR: parsedAmount * exchangeRate,
      currency,
      exchangeRate,
      loanDate: loanDate || new Date(),
      expectedRepaymentDate,
      purpose,
      contactDetails,
      interestRate: hasInterest ? interestRate : 0,
      interestType,
      hasInterest: hasInterest || false,
      notes,
      priority: priority || 'medium',
      tags: tags || [],
      remainingAmount: parsedAmount
    });
    
    await loan.save();
    
    logger.info(`Loan given created for user ${req.user._id}: ${borrowerName} - ₹${amount}`);
    
    res.status(201).json({
      success: true,
      message: 'Loan recorded successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Create loan given error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create loan',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/loans-given/:id
 * @desc Update a loan given entry
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const loan = await LoanGiven.findOne({
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
    const allowedUpdates = [
      'borrowerName', 'relationship', 'amount', 'loanDate',
      'expectedRepaymentDate', 'purpose', 'contactDetails',
      'interestRate', 'hasInterest', 'notes', 'priority',
      'tags', 'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        loan[field] = req.body[field];
      }
    });
    
    await loan.save();
    
    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Update loan given error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loan',
      error: error.message
    });
  }
});

/**
 * @route POST /api/loans-given/:id/repayment
 * @desc Add a repayment to a loan
 * @access Private
 */
router.post('/:id/repayment', authenticate, async (req, res) => {
  try {
    const { amount, date, method, transactionId, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid repayment amount is required'
      });
    }
    
    const loan = await LoanGiven.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    if (amount > loan.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Repayment amount (₹${amount}) exceeds remaining amount (₹${loan.remainingAmount})`
      });
    }
    
    await loan.addRepayment({
      amount,
      amountInINR: amount,  // Default to same as amount (INR)
      currency: req.body.currency || 'INR',
      exchangeRate: req.body.exchangeRate || 1,
      date: date || new Date(),
      method: method || 'cash',
      transactionId,
      notes
    });
    
    logger.info(`Repayment added for loan ${req.params.id}: ₹${amount}`);
    
    res.json({
      success: true,
      message: 'Repayment added successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Add repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add repayment',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/loans-given/:id
 * @desc Delete a loan given entry
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const loan = await LoanGiven.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    logger.info(`Loan given deleted: ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Loan deleted successfully'
    });
  } catch (error) {
    logger.error('Delete loan given error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete loan',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/loans-given/:id/write-off
 * @desc Write off a loan (mark as unrecoverable)
 * @access Private
 */
router.put('/:id/write-off', authenticate, async (req, res) => {
  try {
    const loan = await LoanGiven.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    loan.status = 'written_off';
    loan.notes = loan.notes ? `${loan.notes}\n[Written off on ${new Date().toLocaleDateString()}]` : `Written off on ${new Date().toLocaleDateString()}`;
    
    await loan.save();
    
    logger.info(`Loan written off: ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Loan written off successfully',
      data: loan
    });
  } catch (error) {
    logger.error('Write off loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to write off loan',
      error: error.message
    });
  }
});

module.exports = router;
