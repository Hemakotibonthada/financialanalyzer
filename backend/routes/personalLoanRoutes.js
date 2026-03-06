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
 * @route GET /api/personal-loans/lenders
 * @desc Get lender-level aggregated view (people I can borrow from)
 * @access Private
 */
router.get('/lenders', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const allLoans = await PersonalLoan.find({ userId }).sort({ loanTakenDate: -1 });

    // Aggregate by lender name (case-insensitive)
    const lenderMap = {};
    allLoans.forEach(loan => {
      const key = loan.lenderName.trim().toLowerCase();
      if (!lenderMap[key]) {
        lenderMap[key] = {
          lenderName: loan.lenderName,
          relationship: loan.relationship,
          contactDetails: loan.contactDetails || {},
          loans: [],
          totalBorrowed: 0,
          totalRepaid: 0,
          totalOutstanding: 0,
          totalInterestAccrued: 0,
          activeLoansCount: 0,
          repaidLoansCount: 0,
          firstLoanDate: loan.loanTakenDate,
          lastLoanDate: loan.loanTakenDate,
          lastRepaymentDate: null,
          priority: loan.priority
        };
      }
      const lender = lenderMap[key];
      lender.loans.push(loan);
      lender.totalBorrowed += loan.principalAmount || 0;
      lender.totalRepaid += loan.totalRepaid || 0;
      lender.totalOutstanding += loan.outstandingAmount || 0;
      lender.totalInterestAccrued += loan.currentInterest || 0;

      if (loan.status === 'active') lender.activeLoansCount++;
      else lender.repaidLoansCount++;

      // Track date boundaries
      if (new Date(loan.loanTakenDate) < new Date(lender.firstLoanDate)) {
        lender.firstLoanDate = loan.loanTakenDate;
      }
      if (new Date(loan.loanTakenDate) > new Date(lender.lastLoanDate)) {
        lender.lastLoanDate = loan.loanTakenDate;
      }
      if (loan.repaymentDate) {
        if (!lender.lastRepaymentDate || new Date(loan.repaymentDate) > new Date(lender.lastRepaymentDate)) {
          lender.lastRepaymentDate = loan.repaymentDate;
        }
      }

      // Update contact details if current loan has them
      if (loan.contactDetails?.phone) lender.contactDetails.phone = loan.contactDetails.phone;
      if (loan.contactDetails?.email) lender.contactDetails.email = loan.contactDetails.email;

      // Escalate priority
      const prioOrder = { low: 0, medium: 1, high: 2, urgent: 3 };
      if (prioOrder[loan.priority] > prioOrder[lender.priority]) lender.priority = loan.priority;
    });

    const lenders = Object.values(lenderMap).map(l => ({
      ...l,
      currentStatus: l.activeLoansCount > 0 ? 'has_active_loans' : 'all_repaid',
      totalTransactions: l.loans.length,
      trustScore: Math.min(100, Math.round(
        (l.repaidLoansCount / Math.max(1, l.loans.length)) * 60 +
        (l.totalRepaid / Math.max(1, l.totalBorrowed)) * 40
      )),
      // Remove full loan objects from response to keep it light
      loans: l.loans.map(ln => ({
        _id: ln._id,
        principalAmount: ln.principalAmount,
        loanTakenDate: ln.loanTakenDate,
        repaymentDate: ln.repaymentDate,
        status: ln.status,
        totalRepaid: ln.totalRepaid,
        outstandingAmount: ln.outstandingAmount,
        currentInterest: ln.currentInterest,
        interestRate: ln.interestRate,
        interestType: ln.interestType,
        purpose: ln.purpose,
        priority: ln.priority,
        daysSinceTaken: ln.daysSinceTaken
      }))
    }));

    // Sort: active first, then by outstanding amount descending
    lenders.sort((a, b) => {
      if (a.activeLoansCount > 0 && b.activeLoansCount === 0) return -1;
      if (a.activeLoansCount === 0 && b.activeLoansCount > 0) return 1;
      return b.totalOutstanding - a.totalOutstanding;
    });

    res.json({
      success: true,
      count: lenders.length,
      lenders
    });
  } catch (error) {
    logger.error('Get lenders summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lenders summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/personal-loans/history/:lenderName
 * @desc Get all loan history with a specific lender
 * @access Private
 */
router.get('/history/:lenderName', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const lenderName = decodeURIComponent(req.params.lenderName);
    
    const loans = await PersonalLoan.find({
      userId,
      lenderName: { $regex: new RegExp(`^${lenderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).sort({ loanTakenDate: -1 });

    const totalBorrowed = loans.reduce((s, l) => s + (l.principalAmount || 0), 0);
    const totalRepaid = loans.reduce((s, l) => s + (l.totalRepaid || 0), 0);
    const totalOutstanding = loans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);
    const totalInterest = loans.reduce((s, l) => s + (l.currentInterest || 0), 0);

    res.json({
      success: true,
      lenderName: loans[0]?.lenderName || lenderName,
      relationship: loans[0]?.relationship || 'Other',
      contactDetails: loans[0]?.contactDetails || {},
      count: loans.length,
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      totalInterest,
      loans
    });
  } catch (error) {
    logger.error('Get lender history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lender history',
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
      'lenderName', 'relationship', 'interestRate', 'interestType',
      'purpose', 'contactDetails', 'notes', 'priority', 'tags'
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
    
    // If this loan is linked to an EMI, update the EMI too
    if (loan.linkedEmiId) {
      try {
        const EMI = require('../models/EMI');
        const linkedEmi = await EMI.findById(loan.linkedEmiId);
        if (linkedEmi) {
          // Mark next upcoming installment as paid
          const nextUnpaid = linkedEmi.paymentHistory?.find(p => p.status === 'upcoming' || p.status === 'pending');
          if (nextUnpaid) {
            nextUnpaid.status = 'paid';
            nextUnpaid.paidDate = new Date();
            nextUnpaid.amount = amount;
          }
          linkedEmi.paidInstallments = (linkedEmi.paidInstallments || 0) + 1;
          linkedEmi.remainingInstallments = Math.max(0, linkedEmi.totalTenure - linkedEmi.paidInstallments);
          
          if (linkedEmi.remainingInstallments === 0) {
            linkedEmi.status = 'completed';
          }
          
          await linkedEmi.save();
          logger.info(`Linked EMI ${loan.linkedEmiId} updated after personal loan repayment`);
        }
      } catch (emiErr) {
        logger.warn('Failed to update linked EMI:', emiErr.message);
      }
    }
    
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
