const express = require('express');
const router = express.Router();
const PersonalLoan = require('../models/PersonalLoan');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route GET /api/personal-loans
 * @desc Get all personal loans (borrowed from friends/family)
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;
    
    const filter = { userId };
    if (status) {
      filter.status = status;
    }
    
    const loans = await PersonalLoan.find(filter).sort({ loanTakenDate: -1 });
    
    res.json({
      success: true,
      count: loans.length,
      loans
    });
  } catch (error) {
    logger.error('Get personal loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal loans',
      error: error.message
    });
  }
});

/**
 * @route GET /api/personal-loans/summary
 * @desc Get summary statistics for personal loans
 * @access Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await PersonalLoan.getSummary(userId);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Get personal loans summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/personal-loans/:id
 * @desc Get specific personal loan
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const loan = await PersonalLoan.findOne({ _id: req.params.id, userId });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Personal loan not found'
      });
    }
    
    res.json({
      success: true,
      loan
    });
  } catch (error) {
    logger.error('Get personal loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal loan',
      error: error.message
    });
  }
});

/**
 * @route POST /api/personal-loans
 * @desc Create new personal loan
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const loanData = {
      userId,
      ...req.body
    };
    
    // Validate required fields
    if (!loanData.lenderName || !loanData.principalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Lender name and principal amount are required'
      });
    }
    
    const loan = new PersonalLoan(loanData);
    await loan.save();
    
    logger.info(`Personal loan created for user ${userId}: ₹${loan.principalAmount} from ${loan.lenderName}`);
    
    res.status(201).json({
      success: true,
      message: 'Personal loan created successfully',
      loan
    });
  } catch (error) {
    logger.error('Create personal loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create personal loan',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/personal-loans/:id
 * @desc Update personal loan
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const loan = await PersonalLoan.findOne({ _id: req.params.id, userId });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Personal loan not found'
      });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'lenderName', 'relationship', 'principalAmount', 'loanTakenDate', 'repaymentDate',
      'interestRate', 'interestType', 'purpose', 'contactDetails', 'notes', 'priority', 'tags'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        loan[field] = req.body[field];
      }
    });
    
    await loan.save();
    
    res.json({
      success: true,
      message: 'Personal loan updated successfully',
      loan
    });
  } catch (error) {
    logger.error('Update personal loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal loan',
      error: error.message
    });
  }
});

/**
 * @route POST /api/personal-loans/:id/repayment
 * @desc Add repayment to personal loan
 * @access Private
 */
router.post('/:id/repayment', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid repayment amount is required'
      });
    }
    
    const loan = await PersonalLoan.findOne({ _id: req.params.id, userId });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Personal loan not found'
      });
    }
    
    const outstandingBeforePayment = loan.outstandingAmount;
    
    if (amount > outstandingBeforePayment) {
      return res.status(400).json({
        success: false,
        message: `Repayment amount cannot exceed outstanding amount of ₹${outstandingBeforePayment.toFixed(2)}`
      });
    }
    
    await loan.addRepayment(amount);
    
    logger.info(`Repayment of ₹${amount} added to personal loan ${loan._id}`);
    
    res.json({
      success: true,
      message: loan.status === 'repaid' 
        ? 'Loan fully repaid!' 
        : 'Repayment added successfully',
      loan
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
 * @route DELETE /api/personal-loans/:id
 * @desc Delete personal loan
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const loan = await PersonalLoan.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Personal loan not found'
      });
    }
    
    logger.info(`Personal loan deleted: ${loan._id}`);
    
    res.json({
      success: true,
      message: 'Personal loan deleted successfully'
    });
  } catch (error) {
    logger.error('Delete personal loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete personal loan',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/personal-loans/:id/mark-repaid
 * @desc Mark loan as fully repaid
 * @access Private
 */
router.put('/:id/mark-repaid', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const loan = await PersonalLoan.findOne({ _id: req.params.id, userId });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Personal loan not found'
      });
    }
    
    // Mark as fully repaid
    loan.totalRepaid = loan.principalAmount + loan.currentInterest;
    loan.status = 'repaid';
    loan.repaymentDate = new Date();
    
    if (req.body.notes) {
      loan.notes = loan.notes 
        ? `${loan.notes}\n\nMarked as repaid: ${req.body.notes}`
        : `Marked as repaid: ${req.body.notes}`;
    }
    
    await loan.save();
    
    logger.info(`Personal loan marked as repaid: ${loan._id}`);
    
    res.json({
      success: true,
      message: 'Loan marked as repaid successfully',
      loan
    });
  } catch (error) {
    logger.error('Mark repaid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark loan as repaid',
      error: error.message
    });
  }
});

module.exports = router;
