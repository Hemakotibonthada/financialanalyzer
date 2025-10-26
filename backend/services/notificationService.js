const Notification = require('../models/Notification');
const BillReminder = require('../models/BillReminder');
const EMI = require('../models/EMI');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

/**
 * Notification Service
 * Handles creation, delivery, and management of notifications
 */
class NotificationService {
  /**
   * Create a notification
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async createNotification(userId, notificationData) {
    try {
      return await Notification.createNotification(userId, notificationData);
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create bill reminder notification
   * @param {string} userId - User ID
   * @param {Object} bill - Bill reminder object
   * @returns {Promise<Object>} Created notification
   */
  static async createBillReminder(userId, bill) {
    const daysUntilDue = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    let priority = 'medium';
    if (daysUntilDue <= 1) priority = 'urgent';
    else if (daysUntilDue <= 3) priority = 'high';

    return this.createNotification(userId, {
      type: 'bill_reminder',
      title: `Bill Due: ${bill.name}`,
      message: `Your bill "${bill.name}" of ${bill.amount} ${bill.currency || 'USD'} is due in ${daysUntilDue} day(s)`,
      priority,
      category: 'reminder',
      relatedResource: {
        resourceType: 'bill',
        resourceId: bill._id
      },
      data: {
        billId: bill._id,
        amount: bill.amount,
        dueDate: bill.dueDate,
        daysUntilDue
      },
      actions: [
        {
          label: 'Mark as Paid',
          action: 'mark_paid',
          primary: true
        },
        {
          label: 'View Bill',
          action: 'view_bill',
          url: `/bills/${bill._id}`
        }
      ]
    });
  }

  /**
   * Create EMI reminder notification
   * @param {string} userId - User ID
   * @param {Object} emi - EMI object
   * @returns {Promise<Object>} Created notification
   */
  static async createEMIReminder(userId, emi) {
    const daysUntilDue = Math.ceil((new Date(emi.nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    let priority = 'medium';
    if (daysUntilDue <= 1) priority = 'urgent';
    else if (daysUntilDue <= 3) priority = 'high';

    return this.createNotification(userId, {
      type: 'emi_reminder',
      title: `EMI Due: ${emi.lender || emi.loanType}`,
      message: `Your EMI payment of ${emi.emiAmount} is due in ${daysUntilDue} day(s)`,
      priority,
      category: 'reminder',
      relatedResource: {
        resourceType: 'emi',
        resourceId: emi._id
      },
      data: {
        emiId: emi._id,
        amount: emi.emiAmount,
        dueDate: emi.nextPaymentDate,
        daysUntilDue
      },
      actions: [
        {
          label: 'View EMI',
          action: 'view_emi',
          url: `/emis/${emi._id}`,
          primary: true
        }
      ]
    });
  }

  /**
   * Create budget alert notification
   * @param {string} userId - User ID
   * @param {Object} budget - Budget object
   * @param {number} percentUsed - Percentage of budget used
   * @returns {Promise<Object>} Created notification
   */
  static async createBudgetAlert(userId, budget, percentUsed) {
    let priority = 'low';
    let type = 'info';
    
    if (percentUsed >= 100) {
      priority = 'urgent';
      type = 'error';
    } else if (percentUsed >= 90) {
      priority = 'high';
      type = 'warning';
    } else if (percentUsed >= 75) {
      priority = 'medium';
      type = 'warning';
    }

    return this.createNotification(userId, {
      type: 'budget_alert',
      title: `Budget Alert: ${budget.category}`,
      message: `You've used ${percentUsed.toFixed(1)}% of your ${budget.category} budget (${budget.spent} / ${budget.limit})`,
      priority,
      category: 'alert',
      relatedResource: {
        resourceType: 'budget',
        resourceId: budget._id
      },
      data: {
        budgetId: budget._id,
        category: budget.category,
        limit: budget.limit,
        spent: budget.spent,
        percentUsed
      },
      actions: [
        {
          label: 'View Budget',
          action: 'view_budget',
          url: `/budgets/${budget._id}`,
          primary: true
        }
      ]
    });
  }

  /**
   * Create transaction alert notification
   * @param {string} userId - User ID
   * @param {Object} transaction - Transaction object
   * @param {string} reason - Alert reason
   * @returns {Promise<Object>} Created notification
   */
  static async createTransactionAlert(userId, transaction, reason) {
    let priority = 'medium';
    if (transaction.amount > 10000) priority = 'high';

    return this.createNotification(userId, {
      type: 'transaction_alert',
      title: 'Transaction Alert',
      message: `${reason}: ${transaction.description} - ${transaction.amount} ${transaction.currency || 'USD'}`,
      priority,
      category: 'alert',
      relatedResource: {
        resourceType: 'transaction',
        resourceId: transaction._id
      },
      data: {
        transactionId: transaction._id,
        amount: transaction.amount,
        description: transaction.description,
        reason
      },
      actions: [
        {
          label: 'View Transaction',
          action: 'view_transaction',
          url: `/transactions/${transaction._id}`,
          primary: true
        }
      ]
    });
  }

  /**
   * Create document processed notification
   * @param {string} userId - User ID
   * @param {Object} document - Document object
   * @param {number} transactionsCount - Number of transactions extracted
   * @returns {Promise<Object>} Created notification
   */
  static async createDocumentProcessed(userId, document, transactionsCount) {
    return this.createNotification(userId, {
      type: 'document_processed',
      title: 'Document Processed',
      message: `${document.filename} has been processed. ${transactionsCount} transaction(s) extracted.`,
      priority: 'medium',
      category: 'update',
      relatedResource: {
        resourceType: 'document',
        resourceId: document._id
      },
      data: {
        documentId: document._id,
        filename: document.filename,
        transactionsCount
      },
      actions: [
        {
          label: 'View Transactions',
          action: 'view_transactions',
          url: `/documents/${document._id}/transactions`,
          primary: true
        }
      ]
    });
  }

  /**
   * Create CIBIL update notification
   * @param {string} userId - User ID
   * @param {Object} cibilData - CIBIL data
   * @returns {Promise<Object>} Created notification
   */
  static async createCibilUpdate(userId, cibilData) {
    const scoreDiff = cibilData.currentScore - (cibilData.previousScore || cibilData.currentScore);
    const trend = scoreDiff > 0 ? 'increased' : scoreDiff < 0 ? 'decreased' : 'unchanged';
    
    return this.createNotification(userId, {
      type: 'cibil_update',
      title: 'CIBIL Score Updated',
      message: `Your CIBIL score has ${trend} to ${cibilData.currentScore}${scoreDiff !== 0 ? ` (${scoreDiff > 0 ? '+' : ''}${scoreDiff})` : ''}`,
      priority: Math.abs(scoreDiff) > 20 ? 'high' : 'medium',
      category: 'update',
      data: {
        currentScore: cibilData.currentScore,
        previousScore: cibilData.previousScore,
        scoreDiff,
        trend
      },
      actions: [
        {
          label: 'View Details',
          action: 'view_cibil',
          url: '/cibil',
          primary: true
        }
      ]
    });
  }

  /**
   * Create security alert notification
   * @param {string} userId - User ID
   * @param {string} message - Alert message
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  static async createSecurityAlert(userId, message, data = {}) {
    return this.createNotification(userId, {
      type: 'security_alert',
      title: 'Security Alert',
      message,
      priority: 'urgent',
      category: 'security',
      data,
      actions: [
        {
          label: 'Review Activity',
          action: 'review_activity',
          url: '/activity-logs',
          primary: true
        }
      ]
    });
  }

  /**
   * Check and send due reminders
   * Scheduled task to check for upcoming bills and EMIs
   * @param {number} daysBefore - Days before due date to send reminder
   */
  static async sendDueReminders(daysBefore = 3) {
    try {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + daysBefore);
      reminderDate.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(reminderDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check bills
      const dueBills = await BillReminder.find({
        dueDate: {
          $gte: reminderDate,
          $lte: endOfDay
        },
        status: { $ne: 'paid' }
      });

      for (const bill of dueBills) {
        await this.createBillReminder(bill.userId, bill);
      }

      // Check EMIs
      const dueEMIs = await EMI.find({
        nextPaymentDate: {
          $gte: reminderDate,
          $lte: endOfDay
        },
        status: 'active'
      });

      for (const emi of dueEMIs) {
        await this.createEMIReminder(emi.userId, emi);
      }

      return {
        billReminders: dueBills.length,
        emiReminders: dueEMIs.length
      };
    } catch (error) {
      console.error('Failed to send due reminders:', error);
      throw error;
    }
  }

  /**
   * Check budgets and send alerts
   * Scheduled task to check budget usage
   */
  static async checkBudgets() {
    try {
      const budgets = await Budget.find({ status: 'active' });
      let alertsSent = 0;

      for (const budget of budgets) {
        const percentUsed = (budget.spent / budget.limit) * 100;
        
        // Send alert at 75%, 90%, and 100%
        if (percentUsed >= 75) {
          const lastAlert = budget.lastAlertAt;
          const now = new Date();
          
          // Don't send duplicate alerts within 24 hours
          if (!lastAlert || (now - lastAlert) > 24 * 60 * 60 * 1000) {
            await this.createBudgetAlert(budget.userId, budget, percentUsed);
            
            // Update last alert time
            budget.lastAlertAt = now;
            await budget.save();
            alertsSent++;
          }
        }
      }

      return { alertsSent };
    } catch (error) {
      console.error('Failed to check budgets:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications and metadata
   */
  static async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type,
      priority,
      isRead,
      isArchived = false
    } = options;

    const query = { userId, isArchived };
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead;

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.getUnreadCount(userId)
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      unreadCount
    };
  }
}

module.exports = NotificationService;
