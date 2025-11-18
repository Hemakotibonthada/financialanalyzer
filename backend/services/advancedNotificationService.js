const nodemailer = require('nodemailer');
const twilio = require('twilio');
const webpush = require('web-push');
const User = require('../models/User');

class NotificationService {
  constructor() {
    // Email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Twilio SMS client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Web Push configuration
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + process.env.EMAIL_USER,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    this.notificationQueue = [];
  }

  // Multi-channel notification sender
  async sendNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const { type, title, message, priority, channels, data, actionUrl } = notification;

      const results = {
        email: false,
        sms: false,
        push: false,
        whatsapp: false
      };

      // Check user preferences
      const preferences = user.notificationPreferences || {};
      const enabledChannels = channels || this.getDefaultChannels(type, priority);

      // Send via enabled channels
      for (const channel of enabledChannels) {
        if (preferences[channel] !== false) {
          switch (channel) {
            case 'email':
              results.email = await this.sendEmail(user, title, message, actionUrl, data);
              break;
            case 'sms':
              results.sms = await this.sendSMS(user, message);
              break;
            case 'push':
              results.push = await this.sendPushNotification(user, title, message, actionUrl, data);
              break;
            case 'whatsapp':
              results.whatsapp = await this.sendWhatsApp(user, message);
              break;
          }
        }
      }

      // Store notification in database
      await this.storeNotification(userId, {
        type,
        title,
        message,
        priority,
        channels: results,
        data,
        actionUrl,
        status: 'sent',
        sentAt: new Date()
      });

      return results;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Email notification
  async sendEmail(user, subject, html, actionUrl, data) {
    try {
      const emailTemplate = this.generateEmailTemplate(subject, html, actionUrl, data);

      await this.emailTransporter.sendMail({
        from: `${process.env.APP_NAME || 'Financial Analyzer'} <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject,
        html: emailTemplate
      });

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // SMS notification
  async sendSMS(user, message) {
    try {
      if (!this.twilioClient || !user.phone) return false;

      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone
      });

      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Push notification
  async sendPushNotification(user, title, body, url, data) {
    try {
      if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return false;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { url, ...data },
        actions: [
          { action: 'open', title: 'View' },
          { action: 'close', title: 'Dismiss' }
        ]
      });

      const results = await Promise.all(
        user.pushSubscriptions.map(subscription =>
          webpush.sendNotification(subscription, payload).catch(err => {
            console.error('Push notification error:', err);
            return null;
          })
        )
      );

      return results.some(result => result !== null);
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // WhatsApp notification (using Twilio)
  async sendWhatsApp(user, message) {
    try {
      if (!this.twilioClient || !user.phone) return false;

      await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${user.phone}`
      });

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Generate email template
  generateEmailTemplate(subject, message, actionUrl, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${process.env.APP_NAME || 'Financial Analyzer'}</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            ${actionUrl ? `<a href="${actionUrl}" class="button">View Details</a>` : ''}
            ${data ? `<div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;">${JSON.stringify(data, null, 2)}</div>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from ${process.env.APP_NAME || 'Financial Analyzer'}</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get default channels based on notification type and priority
  getDefaultChannels(type, priority) {
    if (priority === 'critical') {
      return ['email', 'sms', 'push'];
    } else if (priority === 'high') {
      return ['email', 'push'];
    } else {
      return ['email'];
    }
  }

  // Store notification in database
  async storeNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      if (!user.notifications) user.notifications = [];

      user.notifications.push(notification);

      // Keep only last 100 notifications
      if (user.notifications.length > 100) {
        user.notifications = user.notifications.slice(-100);
      }

      await user.save();
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  // Send digest email
  async sendDigestEmail(userId, frequency) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const digest = await this.generateDigest(userId, frequency);
      
      const subject = `Your ${frequency} Financial Digest`;
      const html = this.generateDigestTemplate(digest, frequency);

      await this.sendEmail(user, subject, html);
    } catch (error) {
      console.error('Error sending digest email:', error);
    }
  }

  // Generate digest content
  async generateDigest(userId, frequency) {
    const Transaction = require('../models/Transaction');
    const Budget = require('../models/Budget');
    const Debt = require('../models/Debt');

    const days = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [transactions, budgets, debts] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startDate } }),
      Budget.find({ userId }),
      Debt.find({ userId, status: 'active' })
    ]);

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const topExpenses = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      period: frequency,
      summary: {
        income: Math.round(income),
        expenses: Math.round(expenses),
        savings: Math.round(income - expenses),
        transactionCount: transactions.length
      },
      topExpenses,
      budgetAlerts: budgets.filter(b => b.spent / b.amount > 0.9),
      debtPayments: debts.reduce((sum, d) => sum + (d.emiAmount || 0), 0)
    };
  }

  // Generate digest email template
  generateDigestTemplate(digest, frequency) {
    return `
      <h2>Your ${frequency} Financial Summary</h2>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3>Income & Expenses</h3>
        <p>Income: ₹${digest.summary.income.toLocaleString()}</p>
        <p>Expenses: ₹${digest.summary.expenses.toLocaleString()}</p>
        <p>Savings: ₹${digest.summary.savings.toLocaleString()}</p>
      </div>
      <div style="margin: 20px 0;">
        <h3>Top Expenses</h3>
        <ul>
          ${digest.topExpenses.map(t => `<li>${t.description}: ₹${t.amount.toLocaleString()}</li>`).join('')}
        </ul>
      </div>
      ${digest.budgetAlerts.length > 0 ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>⚠️ Budget Alerts</h3>
          <ul>
            ${digest.budgetAlerts.map(b => `<li>${b.category}: ${Math.round(b.spent / b.amount * 100)}% used</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  // Smart alerts based on spending patterns
  async checkSmartAlerts(userId) {
    try {
      const Transaction = require('../models/Transaction');
      const Budget = require('../models/Budget');

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [thisMonthTransactions, lastMonthTransactions, budgets] = await Promise.all([
        Transaction.find({ userId, date: { $gte: startOfMonth } }),
        Transaction.find({
          userId,
          date: {
            $gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            $lt: startOfMonth
          }
        }),
        Budget.find({ userId, month: today.getMonth() + 1, year: today.getFullYear() })
      ]);

      const alerts = [];

      // Unusual spending alert
      const thisMonthSpending = thisMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const lastMonthSpending = lastMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      if (thisMonthSpending > lastMonthSpending * 1.5) {
        alerts.push({
          type: 'unusual_spending',
          title: 'Unusual Spending Detected',
          message: `Your spending this month is ${Math.round((thisMonthSpending / lastMonthSpending - 1) * 100)}% higher than last month`,
          priority: 'high'
        });
      }

      // Budget near limit alerts
      for (const budget of budgets) {
        const spent = thisMonthTransactions
          .filter(t => t.type === 'expense' && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);

        const percentUsed = (spent / budget.amount) * 100;

        if (percentUsed >= 90 && percentUsed < 100) {
          alerts.push({
            type: 'budget_warning',
            title: `Budget Alert: ${budget.category}`,
            message: `You've used ${Math.round(percentUsed)}% of your ${budget.category} budget`,
            priority: 'medium',
            data: { category: budget.category, spent, budget: budget.amount }
          });
        } else if (percentUsed >= 100) {
          alerts.push({
            type: 'budget_exceeded',
            title: `Budget Exceeded: ${budget.category}`,
            message: `You've exceeded your ${budget.category} budget by ₹${Math.round(spent - budget.amount)}`,
            priority: 'high',
            data: { category: budget.category, spent, budget: budget.amount }
          });
        }
      }

      // Send alerts
      for (const alert of alerts) {
        await this.sendNotification(userId, alert);
      }

      return alerts;
    } catch (error) {
      console.error('Error checking smart alerts:', error);
      return [];
    }
  }

  // Bill payment reminders
  async sendBillReminders(userId) {
    try {
      const Bill = require('../models/Bill');
      
      const upcomingBills = await Bill.find({
        userId,
        status: 'pending',
        dueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      });

      for (const bill of upcomingBills) {
        const daysUntilDue = Math.ceil((bill.dueDate - new Date()) / (24 * 60 * 60 * 1000));
        
        await this.sendNotification(userId, {
          type: 'bill_reminder',
          title: 'Bill Payment Reminder',
          message: `${bill.name} of ₹${bill.amount} is due in ${daysUntilDue} day(s)`,
          priority: daysUntilDue <= 2 ? 'high' : 'medium',
          data: { billId: bill._id, amount: bill.amount, dueDate: bill.dueDate },
          actionUrl: `/bills/${bill._id}`
        });
      }
    } catch (error) {
      console.error('Error sending bill reminders:', error);
    }
  }

  // Subscription renewal reminders
  async sendSubscriptionReminders(userId) {
    try {
      const Subscription = require('../models/Subscription');
      
      const renewingSubs = await Subscription.find({
        userId,
        status: 'active',
        'dates.renewalDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      for (const sub of renewingSubs) {
        await this.sendNotification(userId, {
          type: 'subscription_renewal',
          title: 'Subscription Renewal',
          message: `${sub.serviceName} will renew on ${sub.dates.renewalDate.toLocaleDateString()} for ₹${sub.pricing.amount}`,
          priority: 'medium',
          data: { subscriptionId: sub._id },
          actionUrl: `/subscriptions/${sub._id}`
        });
      }
    } catch (error) {
      console.error('Error sending subscription reminders:', error);
    }
  }

  // Debt payment reminders
  async sendDebtReminders(userId) {
    try {
      const Debt = require('../models/Debt');
      
      const activeDebts = await Debt.find({ userId, status: 'active' });

      for (const debt of activeDebts) {
        if (debt.nextPaymentDate) {
          const daysUntilPayment = Math.ceil((debt.nextPaymentDate - new Date()) / (24 * 60 * 60 * 1000));
          
          if (daysUntilPayment <= 3 && daysUntilPayment >= 0) {
            await this.sendNotification(userId, {
              type: 'debt_payment',
              title: 'Debt Payment Reminder',
              message: `${debt.debtName} payment of ₹${debt.emiAmount} is due in ${daysUntilPayment} day(s)`,
              priority: 'high',
              data: { debtId: debt._id },
              actionUrl: `/debts/${debt._id}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending debt reminders:', error);
    }
  }

  // Schedule periodic notifications
  schedulePeriodicNotifications() {
    // Daily digest at 8 AM
    const dailyDigestTime = new Date();
    dailyDigestTime.setHours(8, 0, 0, 0);
    
    // Weekly digest on Monday at 9 AM
    const weeklyDigestTime = new Date();
    weeklyDigestTime.setHours(9, 0, 0, 0);
    
    // Monthly digest on 1st at 10 AM
    const monthlyDigestTime = new Date();
    monthlyDigestTime.setDate(1);
    monthlyDigestTime.setHours(10, 0, 0, 0);

    // Check every hour for reminders
    setInterval(async () => {
      const users = await User.find({ 'notificationPreferences.enabled': true });
      
      for (const user of users) {
        await this.sendBillReminders(user._id);
        await this.sendSubscriptionReminders(user._id);
        await this.sendDebtReminders(user._id);
        await this.checkSmartAlerts(user._id);
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

module.exports = new NotificationService();
