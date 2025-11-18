const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const bankingService = require('../services/bankingIntegrationService');
const Transaction = require('../models/Transaction');

/**
 * @route   POST /api/banking/link-token
 * @desc    Create Plaid link token
 * @access  Private
 */
router.post('/link-token', authenticate, async (req, res) => {
  try {
    const linkToken = await bankingService.createLinkToken(req.user.userId);
    res.json(linkToken);
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

/**
 * @route   POST /api/banking/exchange-token
 * @desc    Exchange public token for access token
 * @access  Private
 */
router.post('/exchange-token', authenticate, async (req, res) => {
  try {
    const { public_token } = req.body;
    
    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    const tokens = await bankingService.exchangePublicToken(public_token);
    
    // Store access token securely (encrypt in production)
    // For now, return to client to store
    res.json(tokens);
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

/**
 * @route   GET /api/banking/balances
 * @desc    Get account balances
 * @access  Private
 */
router.get('/balances', authenticate, async (req, res) => {
  try {
    const { access_token } = req.query;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const balances = await bankingService.getBalances(access_token);
    res.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

/**
 * @route   POST /api/banking/sync-transactions
 * @desc    Sync transactions from bank
 * @access  Private
 */
router.post('/sync-transactions', authenticate, async (req, res) => {
  try {
    const { access_token, start_date, end_date } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const startDate = start_date || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const transactions = await bankingService.fetchTransactions(
      access_token,
      startDate,
      endDate
    );

    // Get existing transactions to detect duplicates
    const existingTransactions = await Transaction.find({
      userId: req.user.userId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    // Detect and filter duplicates
    const { unique, duplicates } = bankingService.detectDuplicates(
      transactions,
      existingTransactions
    );

    // Save unique transactions
    const savedTransactions = [];
    for (const txn of unique) {
      const transaction = new Transaction({
        userId: req.user.userId,
        amount: Math.abs(txn.amount),
        type: txn.amount < 0 ? 'expense' : 'income',
        category: bankingService.categorizeTransaction(txn),
        description: txn.merchant_name || txn.name,
        date: new Date(txn.date),
        paymentMethod: txn.payment_channel,
        bankTransactionId: txn.transaction_id,
        bankAccountId: txn.account_id,
        pending: txn.pending,
        location: txn.location,
      });

      await transaction.save();
      savedTransactions.push(transaction);
    }

    res.json({
      synced: savedTransactions.length,
      duplicates: duplicates.length,
      total: transactions.length,
      transactions: savedTransactions,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

/**
 * @route   GET /api/banking/identity
 * @desc    Get account identity information
 * @access  Private
 */
router.get('/identity', authenticate, async (req, res) => {
  try {
    const { access_token } = req.query;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const identity = await bankingService.getIdentity(access_token);
    res.json(identity);
  } catch (error) {
    console.error('Error fetching identity:', error);
    res.status(500).json({ error: 'Failed to fetch identity' });
  }
});

/**
 * @route   GET /api/banking/recurring
 * @desc    Get recurring transactions
 * @access  Private
 */
router.get('/recurring', authenticate, async (req, res) => {
  try {
    const { access_token } = req.query;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const recurring = await bankingService.getRecurringTransactions(access_token);
    res.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
});

/**
 * @route   DELETE /api/banking/connection
 * @desc    Remove bank connection
 * @access  Private
 */
router.delete('/connection', authenticate, async (req, res) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const result = await bankingService.removeConnection(access_token);
    res.json(result);
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

/**
 * @route   POST /api/banking/razorpay/contact
 * @desc    Create Razorpay contact
 * @access  Private
 */
router.post('/razorpay/contact', authenticate, async (req, res) => {
  try {
    const { name, email, phone, type } = req.body;
    
    const contact = await bankingService.createRazorpayContact({
      name,
      email,
      phone,
      type,
      reference_id: req.user.userId,
    });

    res.json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * @route   POST /api/banking/razorpay/fund-account
 * @desc    Create Razorpay fund account
 * @access  Private
 */
router.post('/razorpay/fund-account', authenticate, async (req, res) => {
  try {
    const { contact_id, account_holder_name, ifsc, account_number } = req.body;
    
    const fundAccount = await bankingService.createFundAccount(contact_id, {
      account_holder_name,
      ifsc,
      account_number,
    });

    res.json(fundAccount);
  } catch (error) {
    console.error('Error creating fund account:', error);
    res.status(500).json({ error: 'Failed to create fund account' });
  }
});

/**
 * @route   POST /api/banking/razorpay/payout
 * @desc    Create Razorpay payout
 * @access  Private
 */
router.post('/razorpay/payout', authenticate, async (req, res) => {
  try {
    const { fund_account_id, amount, currency, purpose } = req.body;
    
    const payout = await bankingService.createPayout(
      fund_account_id,
      amount,
      currency,
      purpose
    );

    res.json(payout);
  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

/**
 * @route   GET /api/banking/razorpay/payout/:id
 * @desc    Get payout status
 * @access  Private
 */
router.get('/razorpay/payout/:id', authenticate, async (req, res) => {
  try {
    const status = await bankingService.getPayoutStatus(req.params.id);
    res.json(status);
  } catch (error) {
    console.error('Error fetching payout status:', error);
    res.status(500).json({ error: 'Failed to fetch payout status' });
  }
});

/**
 * @route   POST /api/banking/verify-upi
 * @desc    Verify UPI ID
 * @access  Private
 */
router.post('/verify-upi', authenticate, async (req, res) => {
  try {
    const { vpa } = req.body;
    
    if (!vpa) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }

    const verification = await bankingService.verifyUPIPayment(vpa);
    res.json(verification);
  } catch (error) {
    console.error('Error verifying UPI:', error);
    res.status(500).json({ error: 'Failed to verify UPI' });
  }
});

/**
 * @route   POST /api/banking/webhook/plaid
 * @desc    Plaid webhook handler
 * @access  Public (webhook)
 */
router.post('/webhook/plaid', async (req, res) => {
  try {
    const { webhook_type, webhook_code, item_id, ...data } = req.body;
    
    await bankingService.handlePlaidWebhook(
      webhook_type,
      webhook_code,
      item_id,
      data
    );

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
