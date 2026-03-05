const BillReminder = require('../models/BillReminder');
const User = require('../models/User');
const logger = require('../utils/logger');
const websocketService = require('./websocketService');
const notificationService = require('./notificationService');

class BillReminderService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Initialize bill reminder automation
   */
  async initialize() {
    logger.info('🔔 Initializing Bill Reminder Service...');
    
    // Check bills every hour
    this.checkInterval = setInterval(() => {
      this.processReminders();
    }, 60 * 60 * 1000); // 1 hour
    
    // Run immediately on startup
    await this.processReminders();
    
    this.isRunning = true;
    logger.info('✅ Bill Reminder Service initialized');
  }

  /**
   * Stop the service
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('🛑 Bill Reminder Service stopped');
  }

  /**
   * Process all pending reminders
   */
  async processReminders() {
    if (!this.isRunning && this.checkInterval) {
      return;
    }

    try {
      logger.info('🔄 Processing bill reminders...');
      
      const now = new Date();
      
      // Find all bills that need reminders
      const bills = await BillReminder.find({
        status: { $in: ['pending', 'awaiting_approval'] },
        dueDate: { $exists: true }
      }).populate('userId');
      
      for (const bill of bills) {
        try {
          await this.processBill(bill, now);
        } catch (error) {
          logger.error(`Error processing bill ${bill._id}:`, error);
        }
      }
      
      logger.info(`✅ Processed ${bills.length} bill reminders`);
    } catch (error) {
      logger.error('Bill reminder processing error:', error);
    }
  }

  /**
   * Process individual bill
   */
  async processBill(bill, now = new Date()) {
    const dueDate = new Date(bill.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    // Check if bill is overdue
    if (daysUntilDue < 0 && bill.status === 'pending') {
      bill.status = 'overdue';
      await bill.save();
      await this.sendOverdueNotification(bill);
      return;
    }
    
    // Check if reminder should be sent
    if (daysUntilDue <= bill.reminderDays) {
      const lastSent = bill.lastNotificationSent;
      const hoursSinceLastSent = lastSent 
        ? (now - new Date(lastSent)) / (1000 * 60 * 60)
        : Infinity;
      
      // Send reminder if not sent in last 24 hours
      if (hoursSinceLastSent >= 24) {
        await this.sendReminder(bill, daysUntilDue);
        bill.lastNotificationSent = now;
        await bill.save();
      }
    }
    
    // Check if auto-payment approval is needed
    if (bill.autoPayEnabled && bill.requiresApproval && daysUntilDue <= 2) {
      if (bill.approvalStatus === 'not_required') {
        await this.requestApproval(bill);
      }
    }
    
    // Auto-pay if approved and due
    if (bill.autoPayEnabled && bill.approvalStatus === 'approved' && daysUntilDue <= 0) {
      await this.processAutoPayment(bill);
    }
  }

  /**
   * Send reminder notification
   */
  async sendReminder(bill, daysUntilDue) {
    const user = bill.userId;
    
    const message = daysUntilDue === 0
      ? `Bill due today: ${bill.title} - ₹${bill.amount}`
      : daysUntilDue === 1
      ? `Bill due tomorrow: ${bill.title} - ₹${bill.amount}`
      : `Bill due in ${daysUntilDue} days: ${bill.title} - ₹${bill.amount}`;
    
    // WebSocket notification
    websocketService.sendNotification(user._id || user, {
      type: 'bill_reminder',
      title: 'Bill Reminder',
      message,
      data: { 
        billId: bill._id,
        daysUntilDue,
        amount: bill.amount,
        category: bill.category
      }
    });
    
    // Email notification if enabled
    if (bill.reminderSettings?.emailReminder && user.email) {
      try {
        // Use advancedNotificationService if available, otherwise skip email
        const advNotification = require('./advancedNotificationService');
        if (advNotification && typeof advNotification.sendEmail === 'function') {
          await advNotification.sendEmail(user, `Bill Reminder: ${bill.title}`, this.generateReminderEmail(bill, daysUntilDue));
        } else {
          logger.info(`Email reminder skipped for bill ${bill._id} — email service not configured`);
        }
      } catch (err) {
        logger.warn(`Email send failed for bill ${bill._id}: ${err.message}`);
      }
    }
    
    logger.info(`Reminder sent for bill ${bill._id} to user ${user._id || user}`);
  }

  /**
   * Send overdue notification
   */
  async sendOverdueNotification(bill) {
    const user = bill.userId;
    const daysOverdue = Math.ceil((new Date() - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24));
    
    websocketService.sendNotification(user._id || user, {
      type: 'bill_overdue',
      title: '⚠️ Overdue Bill',
      message: `${bill.title} is ${daysOverdue} day(s) overdue - ₹${bill.amount}`,
      data: { 
        billId: bill._id,
        daysOverdue,
        amount: bill.amount
      },
      priority: 'high'
    });
    
    logger.info(`Overdue notification sent for bill ${bill._id}`);
  }

  /**
   * Request approval for auto-payment
   */
  async requestApproval(bill) {
    try {
      await bill.requestApproval(bill.userId);
      
      const user = bill.userId;
      
      websocketService.sendNotification(user._id || user, {
        type: 'approval_required',
        title: '✋ Approval Required',
        message: `Please approve payment for ${bill.title} - ₹${bill.amount}`,
        data: { 
          billId: bill._id,
          amount: bill.amount,
          dueDate: bill.dueDate
        },
        priority: 'high',
        requiresAction: true
      });
      
      logger.info(`Approval requested for bill ${bill._id}`);
    } catch (error) {
      logger.error(`Failed to request approval for bill ${bill._id}:`, error);
    }
  }

  /**
   * Process auto-payment (simulation for now)
   */
  async processAutoPayment(bill) {
    try {
      logger.info(`Processing auto-payment for bill ${bill._id}`);
      
      // In a real implementation, this would integrate with payment gateways
      // For now, we'll just mark it as paid
      
      const paymentDetails = {
        amount: bill.amount,
        paymentMethod: bill.paymentMethod || 'auto',
        transactionId: `AUTO-${Date.now()}`,
        notes: 'Automatic payment processed',
        paidDate: new Date()
      };
      
      await bill.markAsPaid(paymentDetails);
      
      // Create recurring bill if applicable
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
      
      // Send success notification
      const user = bill.userId;
      websocketService.sendNotification(user._id || user, {
        type: 'payment_success',
        title: '✅ Payment Successful',
        message: `${bill.title} paid automatically - ₹${bill.amount}`,
        data: { 
          billId: bill._id,
          amount: bill.amount,
          transactionId: paymentDetails.transactionId
        }
      });
      
      logger.info(`Auto-payment completed for bill ${bill._id}`);
    } catch (error) {
      logger.error(`Auto-payment failed for bill ${bill._id}:`, error);
      
      // Send failure notification
      const user = bill.userId;
      websocketService.sendNotification(user._id || user, {
        type: 'payment_failed',
        title: '❌ Payment Failed',
        message: `Auto-payment failed for ${bill.title}. Please pay manually.`,
        data: { 
          billId: bill._id,
          error: error.message
        },
        priority: 'high'
      });
    }
  }

  /**
   * Generate reminder email HTML
   */
  generateReminderEmail(bill, daysUntilDue) {
    const dueText = daysUntilDue === 0
      ? 'due today'
      : daysUntilDue === 1
      ? 'due tomorrow'
      : `due in ${daysUntilDue} days`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .bill-details {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .amount {
              font-size: 32px;
              font-weight: bold;
              color: #667eea;
              margin: 10px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💡 Bill Reminder</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a reminder that your bill is <strong>${dueText}</strong>:</p>
              
              <div class="bill-details">
                <h2>${bill.title}</h2>
                <p><strong>Category:</strong> ${bill.category}</p>
                <p><strong>Due Date:</strong> ${new Date(bill.dueDate).toLocaleDateString()}</p>
                <div class="amount">₹${bill.amount.toLocaleString()}</div>
                ${bill.vendor?.name ? `<p><strong>Vendor:</strong> ${bill.vendor.name}</p>` : ''}
                ${bill.description ? `<p>${bill.description}</p>` : ''}
              </div>
              
              ${bill.autoPayEnabled ? `
                <p>✅ <strong>Auto-payment is enabled</strong> for this bill.</p>
                ${bill.requiresApproval ? `<p>⚠️ <strong>Approval required</strong> before payment is processed.</p>` : ''}
              ` : `
                <p>Please log in to your Financial Analyzer account to make the payment.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/bill-reminders" class="button">
                  View Bill Details
                </a>
              `}
              
              <div class="footer">
                <p>This is an automated reminder from Financial Analyzer</p>
                <p>© ${new Date().getFullYear()} Financial Analyzer. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get bills summary for user
   */
  async getBillsSummary(userId) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const [dueSoon, overdue, awaitingApproval, total] = await Promise.all([
      BillReminder.countDocuments({
        userId,
        dueDate: { $gte: now, $lte: nextWeek },
        status: { $in: ['pending', 'awaiting_approval'] }
      }),
      BillReminder.countDocuments({
        userId,
        dueDate: { $lt: now },
        status: { $in: ['pending', 'overdue', 'awaiting_approval'] }
      }),
      BillReminder.countDocuments({
        userId,
        status: 'awaiting_approval'
      }),
      BillReminder.countDocuments({ userId })
    ]);
    
    return {
      dueSoon,
      overdue,
      awaitingApproval,
      total
    };
  }
}

// Create singleton instance
const billReminderService = new BillReminderService();

module.exports = billReminderService;
