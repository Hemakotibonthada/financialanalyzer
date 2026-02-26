const BankAccount = require('../models/BankAccount');
const logger = require('../utils/logger');

/**
 * Bank Account Service
 * Manages multi-account tracking, balance aggregation, analytics, and transfers
 */
class BankAccountService {
  /**
   * Create a new bank account
   */
  async createAccount(userId, accountData) {
    try {
      const {
        bankName, accountNumber, accountType, balance,
        currency, color, metadata, tags
      } = accountData;

      // Check for duplicate account
      const maskedNumber = accountNumber.length > 4
        ? 'XXXX' + accountNumber.slice(-4)
        : accountNumber;

      const existing = await BankAccount.findOne({
        userId,
        accountNumber: maskedNumber
      });

      if (existing) {
        return {
          success: false,
          message: 'Account with this number already exists',
          statusCode: 400
        };
      }

      const account = new BankAccount({
        userId,
        bankName,
        accountNumber,
        accountType: accountType || 'savings',
        balance: balance || 0,
        currency: currency || 'INR',
        color: color || this._getDefaultColor(accountType),
        isActive: true,
        lastSyncedAt: new Date(),
        metadata: metadata || {},
        balanceHistory: [{ balance: balance || 0, date: new Date() }],
        tags: tags || []
      });

      await account.save();
      logger.info(`Bank account created: ${bankName} (${accountType}) for user ${userId}`);

      return {
        success: true,
        data: { account },
        message: 'Bank account added successfully'
      };
    } catch (error) {
      logger.error('Create account error:', error);
      throw error;
    }
  }

  /**
   * Get all accounts for a user
   */
  async getAccounts(userId, options = {}) {
    try {
      const { accountType, isActive, bankName } = options;
      const query = { userId };

      if (accountType) query.accountType = accountType;
      if (isActive !== undefined) query.isActive = isActive;
      if (bankName) query.bankName = new RegExp(bankName, 'i');

      const accounts = await BankAccount.find(query).sort({ isActive: -1, bankName: 1 });

      return {
        success: true,
        data: {
          accounts,
          count: accounts.length
        }
      };
    } catch (error) {
      logger.error('Get accounts error:', error);
      throw error;
    }
  }

  /**
   * Get a single account by ID
   */
  async getAccountById(userId, accountId) {
    try {
      const account = await BankAccount.findOne({ _id: accountId, userId });
      if (!account) {
        return { success: false, message: 'Account not found', statusCode: 404 };
      }

      return {
        success: true,
        data: { account }
      };
    } catch (error) {
      logger.error('Get account by ID error:', error);
      throw error;
    }
  }

  /**
   * Update a bank account
   */
  async updateAccount(userId, accountId, updateData) {
    try {
      const account = await BankAccount.findOne({ _id: accountId, userId });
      if (!account) {
        return { success: false, message: 'Account not found', statusCode: 404 };
      }

      const allowedFields = [
        'bankName', 'accountType', 'balance', 'currency', 'color',
        'isActive', 'metadata', 'tags'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          account[field] = updateData[field];
        }
      }

      // Track balance changes
      if (updateData.balance !== undefined && updateData.balance !== account.balance) {
        if (!account.balanceHistory) account.balanceHistory = [];
        account.balanceHistory.push({
          balance: updateData.balance,
          date: new Date()
        });
        // Keep last 365 entries
        if (account.balanceHistory.length > 365) {
          account.balanceHistory = account.balanceHistory.slice(-365);
        }
      }

      account.lastSyncedAt = new Date();
      await account.save();

      return {
        success: true,
        data: { account },
        message: 'Account updated successfully'
      };
    } catch (error) {
      logger.error('Update account error:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) a bank account
   */
  async deleteAccount(userId, accountId) {
    try {
      const account = await BankAccount.findOne({ _id: accountId, userId });
      if (!account) {
        return { success: false, message: 'Account not found', statusCode: 404 };
      }

      // Soft delete
      account.isActive = false;
      await account.save();

      logger.info(`Bank account deactivated: ${account.bankName} for user ${userId}`);

      return {
        success: true,
        message: 'Account deactivated successfully'
      };
    } catch (error) {
      logger.error('Delete account error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated total balance across all active accounts
   */
  async getTotalBalance(userId) {
    try {
      const accounts = await BankAccount.find({ userId, isActive: true });

      const byType = {};
      let totalBalance = 0;

      for (const account of accounts) {
        totalBalance += account.balance || 0;

        const type = account.accountType || 'other';
        if (!byType[type]) {
          byType[type] = { count: 0, total: 0, accounts: [] };
        }
        byType[type].count++;
        byType[type].total += account.balance || 0;
        byType[type].accounts.push({
          id: account._id,
          bankName: account.bankName,
          balance: account.balance,
          accountNumber: account.accountNumber
        });
      }

      // By bank
      const byBank = {};
      for (const account of accounts) {
        const bank = account.bankName;
        if (!byBank[bank]) {
          byBank[bank] = { count: 0, total: 0 };
        }
        byBank[bank].count++;
        byBank[bank].total += account.balance || 0;
      }

      return {
        success: true,
        data: {
          totalBalance,
          activeAccounts: accounts.length,
          byType,
          byBank,
          currency: 'INR'
        }
      };
    } catch (error) {
      logger.error('Get total balance error:', error);
      throw error;
    }
  }

  /**
   * Log an inter-account transfer
   */
  async transferBetweenAccounts(userId, transferData) {
    try {
      const { fromAccountId, toAccountId, amount, note } = transferData;

      if (!amount || amount <= 0) {
        return { success: false, message: 'Transfer amount must be positive', statusCode: 400 };
      }

      if (fromAccountId === toAccountId) {
        return { success: false, message: 'Cannot transfer to the same account', statusCode: 400 };
      }

      const fromAccount = await BankAccount.findOne({ _id: fromAccountId, userId, isActive: true });
      const toAccount = await BankAccount.findOne({ _id: toAccountId, userId, isActive: true });

      if (!fromAccount) {
        return { success: false, message: 'Source account not found', statusCode: 404 };
      }
      if (!toAccount) {
        return { success: false, message: 'Destination account not found', statusCode: 404 };
      }

      if (fromAccount.balance < amount) {
        return { success: false, message: 'Insufficient balance in source account', statusCode: 400 };
      }

      // Perform transfer
      fromAccount.balance = parseFloat((fromAccount.balance - amount).toFixed(2));
      toAccount.balance = parseFloat((toAccount.balance + amount).toFixed(2));

      // Update balance history
      fromAccount.balanceHistory.push({ balance: fromAccount.balance, date: new Date() });
      toAccount.balanceHistory.push({ balance: toAccount.balance, date: new Date() });

      // Trim history
      if (fromAccount.balanceHistory.length > 365) {
        fromAccount.balanceHistory = fromAccount.balanceHistory.slice(-365);
      }
      if (toAccount.balanceHistory.length > 365) {
        toAccount.balanceHistory = toAccount.balanceHistory.slice(-365);
      }

      fromAccount.lastSyncedAt = new Date();
      toAccount.lastSyncedAt = new Date();

      await Promise.all([fromAccount.save(), toAccount.save()]);

      logger.info(`Transfer of ${amount} from ${fromAccount.bankName} to ${toAccount.bankName} for user ${userId}`);

      return {
        success: true,
        data: {
          transfer: {
            from: {
              id: fromAccount._id,
              bankName: fromAccount.bankName,
              newBalance: fromAccount.balance
            },
            to: {
              id: toAccount._id,
              bankName: toAccount.bankName,
              newBalance: toAccount.balance
            },
            amount,
            note: note || '',
            date: new Date()
          }
        },
        message: `₹${amount} transferred successfully`
      };
    } catch (error) {
      logger.error('Transfer error:', error);
      throw error;
    }
  }

  /**
   * Get account analytics (spending per account, balance trends)
   */
  async getAnalytics(userId, options = {}) {
    try {
      const { period = 'monthly' } = options;
      const accounts = await BankAccount.find({ userId, isActive: true });

      if (accounts.length === 0) {
        return {
          success: true,
          data: {
            message: 'No active accounts found',
            accounts: [],
            trends: [],
            comparison: []
          }
        };
      }

      // Balance trends per account
      const trends = accounts.map(account => {
        const history = account.balanceHistory || [];
        const recentHistory = this._aggregateHistory(history, period);

        return {
          accountId: account._id,
          bankName: account.bankName,
          accountType: account.accountType,
          currentBalance: account.balance,
          trend: recentHistory,
          change: this._calculateChange(history)
        };
      });

      // Account comparison
      const comparison = accounts.map(account => ({
        accountId: account._id,
        bankName: account.bankName,
        accountType: account.accountType,
        balance: account.balance,
        color: account.color,
        percentage: 0 // Will be calculated below
      }));

      const totalBalance = comparison.reduce((sum, a) => sum + a.balance, 0);
      for (const acc of comparison) {
        acc.percentage = totalBalance > 0
          ? parseFloat(((acc.balance / totalBalance) * 100).toFixed(1))
          : 0;
      }
      comparison.sort((a, b) => b.balance - a.balance);

      // Portfolio view by type
      const portfolio = {};
      for (const account of accounts) {
        const type = account.accountType;
        if (!portfolio[type]) {
          portfolio[type] = {
            count: 0,
            totalBalance: 0,
            percentage: 0,
            accounts: []
          };
        }
        portfolio[type].count++;
        portfolio[type].totalBalance += account.balance;
        portfolio[type].accounts.push({
          id: account._id,
          bankName: account.bankName,
          balance: account.balance
        });
      }
      for (const type of Object.keys(portfolio)) {
        portfolio[type].percentage = totalBalance > 0
          ? parseFloat(((portfolio[type].totalBalance / totalBalance) * 100).toFixed(1))
          : 0;
      }

      return {
        success: true,
        data: {
          totalBalance,
          accountCount: accounts.length,
          trends,
          comparison,
          portfolio
        }
      };
    } catch (error) {
      logger.error('Get analytics error:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get default color based on account type
   */
  _getDefaultColor(accountType) {
    const colors = {
      savings: '#4F46E5',   // Indigo
      current: '#059669',   // Emerald
      FD: '#D97706',        // Amber
      RD: '#7C3AED',        // Violet
      salary: '#2563EB',    // Blue
      NRE: '#DC2626',       // Red
      NRO: '#EA580C'        // Orange
    };
    return colors[accountType] || '#6B7280'; // Gray default
  }

  /**
   * Aggregate balance history by period
   */
  _aggregateHistory(history, period = 'monthly') {
    if (!history || history.length === 0) return [];

    const now = new Date();
    let cutoffDate;

    switch (period) {
      case 'weekly':
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 90); // Last ~3 months of weeks
        break;
      case 'monthly':
        cutoffDate = new Date(now);
        cutoffDate.setMonth(cutoffDate.getMonth() - 12);
        break;
      case 'yearly':
        cutoffDate = new Date(now);
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
        break;
      default:
        cutoffDate = new Date(now);
        cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    }

    const filtered = history.filter(h => new Date(h.date) >= cutoffDate);

    // Group by period
    const grouped = {};
    for (const entry of filtered) {
      let key;
      const date = new Date(entry.date);
      switch (period) {
        case 'weekly':
          // ISO week key
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      // Keep the latest balance for each period
      if (!grouped[key] || new Date(entry.date) > new Date(grouped[key].date)) {
        grouped[key] = { date: entry.date, balance: entry.balance };
      }
    }

    return Object.entries(grouped)
      .map(([key, val]) => ({ period: key, balance: val.balance, date: val.date }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate balance change over recent history
   */
  _calculateChange(history) {
    if (!history || history.length < 2) {
      return { amount: 0, percentage: 0, direction: 'stable' };
    }

    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const oldest = sorted[0].balance || 0;
    const latest = sorted[sorted.length - 1].balance || 0;
    const changeAmount = parseFloat((latest - oldest).toFixed(2));
    const changePercentage = oldest !== 0
      ? parseFloat(((changeAmount / Math.abs(oldest)) * 100).toFixed(1))
      : 0;

    return {
      amount: changeAmount,
      percentage: changePercentage,
      direction: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'stable'
    };
  }
}

module.exports = new BankAccountService();
