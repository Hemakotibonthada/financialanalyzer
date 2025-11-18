const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Plaid = require('plaid');
const axios = require('axios');

class BankingIntegrationService {
  constructor() {
    // Plaid configuration for bank account integration
    this.plaidClient = new Plaid.PlaidApi(
      new Plaid.Configuration({
        basePath: Plaid.PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
          },
        },
      })
    );

    // Razorpay for Indian banking
    this.razorpayBaseUrl = 'https://api.razorpay.com/v1';
    this.razorpayAuth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
  }

  /**
   * Create Plaid Link Token for frontend
   */
  async createLinkToken(userId) {
    try {
      const request = {
        user: {
          client_user_id: userId.toString(),
        },
        client_name: 'Financial Analyzer',
        products: ['transactions', 'auth', 'identity'],
        country_codes: ['US', 'IN'],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
      };

      const response = await this.plaidClient.linkTokenCreate(request);
      return {
        link_token: response.data.link_token,
        expiration: response.data.expiration,
      };
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken) {
    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return {
        access_token: response.data.access_token,
        item_id: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getBalances(accessToken) {
    try {
      const response = await this.plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      return response.data.accounts.map(account => ({
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        balance: {
          current: account.balances.current,
          available: account.balances.available,
          currency: account.balances.iso_currency_code,
        },
        mask: account.mask,
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from bank
   */
  async fetchTransactions(accessToken, startDate, endDate) {
    try {
      const request = {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: 500,
          offset: 0,
        },
      };

      const response = await this.plaidClient.transactionsGet(request);
      
      return response.data.transactions.map(txn => ({
        transaction_id: txn.transaction_id,
        account_id: txn.account_id,
        date: txn.date,
        amount: txn.amount,
        name: txn.name,
        merchant_name: txn.merchant_name,
        category: txn.category,
        category_id: txn.category_id,
        payment_channel: txn.payment_channel,
        pending: txn.pending,
        location: txn.location,
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get identity information
   */
  async getIdentity(accessToken) {
    try {
      const response = await this.plaidClient.identityGet({
        access_token: accessToken,
      });

      return response.data.accounts.map(account => ({
        account_id: account.account_id,
        owners: account.owners.map(owner => ({
          names: owner.names,
          emails: owner.emails,
          phone_numbers: owner.phone_numbers,
          addresses: owner.addresses,
        })),
      }));
    } catch (error) {
      console.error('Error fetching identity:', error);
      throw error;
    }
  }

  /**
   * Remove bank connection
   */
  async removeConnection(accessToken) {
    try {
      await this.plaidClient.itemRemove({
        access_token: accessToken,
      });
      return { success: true };
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  }

  /**
   * Sync transactions automatically
   */
  async syncTransactions(accessToken, lastSyncDate) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = lastSyncDate || 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transactions = await this.fetchTransactions(accessToken, startDate, today);
      
      return {
        transactions,
        syncDate: new Date(),
        count: transactions.length,
      };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw error;
    }
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(accessToken) {
    try {
      const response = await this.plaidClient.transactionsRecurringGet({
        access_token: accessToken,
      });

      return response.data.inflow.concat(response.data.outflow).map(stream => ({
        stream_id: stream.stream_id,
        description: stream.description,
        merchant_name: stream.merchant_name,
        category: stream.category,
        frequency: stream.frequency,
        average_amount: stream.average_amount.amount,
        last_amount: stream.last_amount.amount,
        is_active: stream.is_active,
        first_date: stream.first_date,
        last_date: stream.last_date,
      }));
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      throw error;
    }
  }

  /**
   * Razorpay: Create contact
   */
  async createRazorpayContact(contactData) {
    try {
      const response = await axios.post(
        `${this.razorpayBaseUrl}/contacts`,
        {
          name: contactData.name,
          email: contactData.email,
          contact: contactData.phone,
          type: contactData.type || 'customer',
          reference_id: contactData.reference_id,
        },
        {
          headers: {
            'Authorization': `Basic ${this.razorpayAuth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating Razorpay contact:', error);
      throw error;
    }
  }

  /**
   * Razorpay: Create fund account
   */
  async createFundAccount(contactId, accountDetails) {
    try {
      const response = await axios.post(
        `${this.razorpayBaseUrl}/fund_accounts`,
        {
          contact_id: contactId,
          account_type: accountDetails.account_type || 'bank_account',
          bank_account: {
            name: accountDetails.account_holder_name,
            ifsc: accountDetails.ifsc,
            account_number: accountDetails.account_number,
          },
        },
        {
          headers: {
            'Authorization': `Basic ${this.razorpayAuth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating fund account:', error);
      throw error;
    }
  }

  /**
   * Razorpay: Create payout
   */
  async createPayout(fundAccountId, amount, currency = 'INR', purpose = 'payout') {
    try {
      const response = await axios.post(
        `${this.razorpayBaseUrl}/payouts`,
        {
          account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
          fund_account_id: fundAccountId,
          amount: amount * 100, // Convert to paise
          currency,
          mode: 'IMPS',
          purpose,
          queue_if_low_balance: true,
          reference_id: `payout_${Date.now()}`,
        },
        {
          headers: {
            'Authorization': `Basic ${this.razorpayAuth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  /**
   * Razorpay: Get payout status
   */
  async getPayoutStatus(payoutId) {
    try {
      const response = await axios.get(
        `${this.razorpayBaseUrl}/payouts/${payoutId}`,
        {
          headers: {
            'Authorization': `Basic ${this.razorpayAuth}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching payout status:', error);
      throw error;
    }
  }

  /**
   * UPI payment verification (Indian market)
   */
  async verifyUPIPayment(vpa) {
    try {
      const response = await axios.post(
        `${this.razorpayBaseUrl}/fund_accounts/validations`,
        {
          fund_account: {
            account_type: 'vpa',
            vpa: {
              address: vpa,
            },
          },
        },
        {
          headers: {
            'Authorization': `Basic ${this.razorpayAuth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        valid: response.data.results.account_status === 'active',
        details: response.data,
      };
    } catch (error) {
      console.error('Error verifying UPI payment:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get bank statement (mock for local banks)
   */
  async getBankStatement(accountId, startDate, endDate) {
    try {
      // This would integrate with actual bank APIs
      // For now, returning mock structure
      return {
        account_id: accountId,
        period: {
          start: startDate,
          end: endDate,
        },
        opening_balance: 0,
        closing_balance: 0,
        transactions: [],
        summary: {
          total_credits: 0,
          total_debits: 0,
          transaction_count: 0,
        },
      };
    } catch (error) {
      console.error('Error fetching bank statement:', error);
      throw error;
    }
  }

  /**
   * Categorize transaction automatically
   */
  categorizeTransaction(transaction) {
    const { category, merchant_name, name, amount } = transaction;

    // Use Plaid category first
    if (category && category.length > 0) {
      const primaryCategory = category[0].toLowerCase();
      
      const categoryMap = {
        'food and drink': 'Food & Dining',
        'shops': 'Shopping',
        'travel': 'Travel',
        'recreation': 'Entertainment',
        'service': 'Services',
        'payment': 'Transfer',
        'transfer': 'Transfer',
        'healthcare': 'Healthcare',
        'bank fees': 'Bank Fees',
        'interest': 'Interest',
        'community': 'Charity',
      };

      for (const [key, value] of Object.entries(categoryMap)) {
        if (primaryCategory.includes(key)) {
          return value;
        }
      }
    }

    // Fallback to merchant name or description
    const text = (merchant_name || name || '').toLowerCase();

    if (text.includes('grocery') || text.includes('supermarket')) return 'Groceries';
    if (text.includes('restaurant') || text.includes('cafe')) return 'Food & Dining';
    if (text.includes('gas') || text.includes('fuel')) return 'Transportation';
    if (text.includes('amazon') || text.includes('shopping')) return 'Shopping';
    if (text.includes('netflix') || text.includes('spotify')) return 'Entertainment';
    if (text.includes('electricity') || text.includes('water')) return 'Utilities';
    if (text.includes('rent') || text.includes('mortgage')) return 'Housing';
    if (text.includes('salary') || text.includes('payroll')) return 'Income';

    // Default
    return amount > 0 ? 'Expense' : 'Income';
  }

  /**
   * Detect duplicate transactions
   */
  detectDuplicates(transactions, existingTransactions) {
    const duplicates = [];
    const unique = [];

    transactions.forEach(txn => {
      const isDuplicate = existingTransactions.some(existing => 
        existing.amount === Math.abs(txn.amount) &&
        existing.date === new Date(txn.date).toISOString().split('T')[0] &&
        existing.description?.toLowerCase() === (txn.name || txn.merchant_name || '').toLowerCase()
      );

      if (isDuplicate) {
        duplicates.push(txn);
      } else {
        unique.push(txn);
      }
    });

    return { duplicates, unique };
  }

  /**
   * Webhook handler for Plaid
   */
  async handlePlaidWebhook(webhookType, webhookCode, itemId, data) {
    try {
      switch (webhookType) {
        case 'TRANSACTIONS':
          if (webhookCode === 'INITIAL_UPDATE' || webhookCode === 'HISTORICAL_UPDATE') {
            console.log('Transactions available:', data);
            // Trigger sync
          } else if (webhookCode === 'DEFAULT_UPDATE') {
            console.log('New transactions:', data);
            // Trigger incremental sync
          }
          break;

        case 'ITEM':
          if (webhookCode === 'ERROR') {
            console.error('Item error:', data);
            // Handle error - notify user
          } else if (webhookCode === 'PENDING_EXPIRATION') {
            console.warn('Item expiring:', data);
            // Notify user to re-authenticate
          }
          break;

        case 'AUTH':
          console.log('Auth webhook:', webhookCode);
          break;

        default:
          console.log('Unknown webhook type:', webhookType);
      }

      return { processed: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

module.exports = new BankingIntegrationService();
