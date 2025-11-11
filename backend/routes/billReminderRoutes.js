const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const BillReminder = require('../models/BillReminder');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const websocketService = require('../services/websocketService');

/**
 * @route   GET /api/bill-reminders
 * @desc    Get all bill reminders for user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, frequency, startDate, endDate } = req.query;
    
    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (frequency) {
      query.frequency = frequency;
    }
    
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }
    
    const bills = await BillReminder.find(query)
      .sort({ dueDate: 1 })
      .lean();
    
    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    logger.error('Get bill reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill reminders',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bill-reminders/dashboard
 * @desc    Get bill reminder dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get bills due soon (next 7 days)
    const billsDueSoon = await BillReminder.getBillsDueSoon(userId, 7);
    
    // Get overdue bills
    const overdueBills = await BillReminder.getOverdueBills(userId);
    
    // Get bills awaiting approval
    const awaitingApproval = await BillReminder.find({
      userId,
      status: 'awaiting_approval'
    }).sort({ dueDate: 1 });
    
    // Get paid bills this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const paidThisMonth = await BillReminder.find({
      userId,
      status: 'paid',
      paidDate: { $gte: startOfMonth }
    });
    
    // Calculate total amounts
    const totalDueSoon = billsDueSoon.reduce((sum, bill) => sum + bill.amount, 0);
    const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalPaidThisMonth = paidThisMonth.reduce((sum, bill) => sum + (bill.paidAmount || bill.amount), 0);
    
    // Get statistics by category
    const allBills = await BillReminder.find({ userId });
    const categoryStats = allBills.reduce((acc, bill) => {
      if (!acc[bill.category]) {
        acc[bill.category] = {
          count: 0,
          totalAmount: 0,
          paid: 0,
          pending: 0
        };
      }
      acc[bill.category].count++;
      acc[bill.category].totalAmount += bill.amount;
      if (bill.status === 'paid') {
        acc[bill.category].paid++;
      } else if (bill.status === 'pending' || bill.status === 'awaiting_approval') {
        acc[bill.category].pending++;
      }
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        billsDueSoon,
        overdueBills,
        awaitingApproval,
        paidThisMonth,
        statistics: {
          totalDueSoon,
          totalOverdue,
          totalPaidThisMonth,
          categoryStats
        }
      }
    });
  } catch (error) {
    logger.error('Get bill dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/bill-reminders/:id
 * @desc    Get single bill reminder
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    logger.error('Get bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill reminder',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders
 * @desc    Create new bill reminder
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const billData = {
      ...req.body,
      userId: req.user._id
    };
    
    const bill = new BillReminder(billData);
    
    // Calculate next due date if recurring
    if (bill.frequency !== 'once') {
      bill.nextDueDate = bill.calculateNextDueDate();
    }
    
    await bill.save();
    
    // Send notification
    websocketService.emitNotification(req.user._id, {
      type: 'bill_created',
      title: 'Bill Reminder Created',
      message: `New bill reminder created: ${bill.title}`,
      action: { billId: bill._id }
    });
    
    logger.info(`Bill reminder created: ${bill._id} for user ${req.user._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Bill reminder created successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Create bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill reminder',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/bill-reminders/:id
 * @desc    Update bill reminder
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    // Update fields
    Object.assign(bill, req.body);
    
    // Recalculate next due date if frequency changed
    if (bill.frequency !== 'once') {
      bill.nextDueDate = bill.calculateNextDueDate();
    }
    
    await bill.save();
    
    res.json({
      success: true,
      message: 'Bill reminder updated successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Update bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill reminder',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/bill-reminders/:id
 * @desc    Delete bill reminder
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    logger.info(`Bill reminder deleted: ${bill._id}`);
    
    res.json({
      success: true,
      message: 'Bill reminder deleted successfully'
    });
  } catch (error) {
    logger.error('Delete bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill reminder',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders/:id/request-approval
 * @desc    Request approval for auto-payment
 * @access  Private
 */
router.post('/:id/request-approval', authenticate, async (req, res) => {
  try {
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await bill.requestApproval(req.user._id);
    
    // Send notification
    websocketService.emitNotification(req.user._id, {
      title: 'Payment Approval Requested',
      message: `Approval requested for ${bill.title} - ₹${bill.amount}`,
      level: 'info',
      action: { billId: bill._id }
    });
    
    res.json({
      success: true,
      message: 'Approval requested successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Request approval error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders/:id/approve
 * @desc    Approve bill payment
 * @access  Private
 */
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const { note } = req.body;
    
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await bill.approvePayment(req.user._id, note);
    
    // Send notification
    websocketService.emitNotification(req.user._id, {
      title: 'Payment Approved',
      message: `Payment approved for ${bill.title} - ₹${bill.amount}`,
      level: 'success',
      action: { billId: bill._id }
    });
    
    logger.info(`Bill payment approved: ${bill._id}`);
    
    res.json({
      success: true,
      message: 'Payment approved successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Approve payment error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders/:id/reject
 * @desc    Reject bill payment
 * @access  Private
 */
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const { note } = req.body;
    
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await bill.rejectPayment(req.user._id, note);
    
    // Send notification
    websocketService.emitNotification(req.user._id, {
      title: 'Payment Rejected',
      message: `Payment rejected for ${bill.title}`,
      level: 'warning',
      action: { billId: bill._id }
    });
    
    res.json({
      success: true,
      message: 'Payment rejected successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Reject payment error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders/:id/mark-paid
 * @desc    Mark bill as paid
 * @access  Private
 */
router.post('/:id/mark-paid', authenticate, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, notes, paidDate } = req.body;
    
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    const paymentDetails = {
      amount: amount || bill.amount,
      paymentMethod: paymentMethod || bill.paymentMethod,
      transactionId,
      notes,
      paidDate: paidDate || new Date()
    };
    
    await bill.markAsPaid(paymentDetails);
    
    // Create expense transaction if enabled
    if (bill.autoCreateExpense) {
      const transaction = new Transaction({
        userId: req.user._id,
        date: paymentDetails.paidDate,
        description: bill.title,
        amount: paymentDetails.amount,
        type: 'debit',
        category: bill.category,
        paymentMethod: paymentDetails.paymentMethod,
        source: 'bill_reminder',
        merchantName: bill.vendor?.name,
        notes: `Bill payment: ${bill.title}`,
        referenceNumber: transactionId
      });
      
      await transaction.save();
    }
    
    // If recurring, create next bill
    if (bill.frequency !== 'once' && bill.nextDueDate) {
      const nextBill = new BillReminder({
        userId: bill.userId,
        title: bill.title,
        description: bill.description,
        amount: bill.amount,
        category: bill.category,
        dueDate: bill.nextDueDate,
        frequency: bill.frequency,
        reminderDays: bill.reminderDays,
        autoPayEnabled: bill.autoPayEnabled,
        requiresApproval: bill.requiresApproval,
        paymentMethod: bill.paymentMethod,
        vendor: bill.vendor,
        reminderSettings: bill.reminderSettings,
        tags: bill.tags
      });
      
      nextBill.nextDueDate = nextBill.calculateNextDueDate();
      await nextBill.save();
      
      logger.info(`Next recurring bill created: ${nextBill._id}`);
    }
    
    // Send notification
    websocketService.emitNotification(req.user._id, {
      title: 'Bill Paid',
      message: `${bill.title} marked as paid - ₹${paymentDetails.amount}`,
      level: 'success',
      action: { billId: bill._id }
    });
    
    logger.info(`Bill marked as paid: ${bill._id}`);
    
    res.json({
      success: true,
      message: 'Bill marked as paid successfully',
      data: bill
    });
  } catch (error) {
    logger.error('Mark paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark bill as paid',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/bill-reminders/:id/snooze
 * @desc    Snooze bill reminder
 * @access  Private
 */
router.post('/:id/snooze', authenticate, async (req, res) => {
  try {
    const { days } = req.body;
    
    const bill = await BillReminder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    const newDueDate = new Date(bill.dueDate);
    newDueDate.setDate(newDueDate.getDate() + (days || 1));
    bill.dueDate = newDueDate;
    
    await bill.save();
    
    res.json({
      success: true,
      message: `Bill snoozed for ${days} day(s)`,
      data: bill
    });
  } catch (error) {
    logger.error('Snooze bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to snooze bill',
      error: error.message
    });
  }
});

module.exports = router;
