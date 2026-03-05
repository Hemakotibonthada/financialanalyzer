/**
 * Credit Card Bill Routes
 * CRUD + Gmail sync + analytics for credit card bill tracking
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CreditCardBill = require('../models/CreditCardBill');
const BillReminder = require('../models/BillReminder');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// ============================================================
// GET /api/cc-bills — List all bills (with filters)
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, provider, card, months, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };

    if (status) filter.paymentStatus = status;
    if (provider) filter.cardProvider = provider;
    if (card) filter.cardLastFourDigits = card;
    if (months) {
      const d = new Date();
      d.setMonth(d.getMonth() - Number(months));
      filter.statementDate = { $gte: d };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bills, total] = await Promise.all([
      CreditCardBill.find(filter)
        .sort({ statementDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CreditCardBill.countDocuments(filter)
    ]);

    res.json({ success: true, data: { bills, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    logger.error('List CC bills error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/cc-bills/summary — Dashboard summary
// ============================================================
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Unpaid / upcoming bills
    const unpaidBills = await CreditCardBill.find({
      userId,
      paymentStatus: { $in: ['unpaid', 'minimum_paid', 'partial_paid', 'overdue'] }
    }).sort({ dueDate: 1 });

    const totalOutstanding = unpaidBills.reduce((s, b) => s + Math.max(0, b.totalAmount - b.amountPaid), 0);
    const totalMinDue = unpaidBills.reduce((s, b) => s + b.minimumDue, 0);
    const overdueBills = unpaidBills.filter(b => new Date(b.dueDate) < now);
    const upcomingBills = unpaidBills.filter(b => {
      const due = new Date(b.dueDate);
      return due >= now && due <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    });

    // Monthly spending trend (last 6 months)
    const monthlySpending = await CreditCardBill.getMonthlySpending(userId, 6);

    // Spending by category (last 6 months)
    const categorySpending = await CreditCardBill.getSpendingAnalytics(userId, 6);

    // Card-wise breakdown
    const cardBreakdown = await CreditCardBill.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { provider: '$cardProvider', digits: '$cardLastFourDigits' },
          totalBilled: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalInterest: { $sum: '$interestCharged' },
          avgBill: { $avg: '$totalAmount' },
          billCount: { $sum: 1 },
          latestBill: { $max: '$statementDate' },
          latestCreditLimit: { $last: '$creditLimit' }
        }
      },
      { $sort: { totalBilled: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalOutstanding,
        totalMinimumDue: totalMinDue,
        overdueCount: overdueBills.length,
        overdueAmount: overdueBills.reduce((s, b) => s + Math.max(0, b.totalAmount - b.amountPaid), 0),
        upcomingBills: upcomingBills.map(b => ({
          _id: b._id,
          cardProvider: b.cardProvider,
          cardLastFourDigits: b.cardLastFourDigits,
          totalAmount: b.totalAmount,
          minimumDue: b.minimumDue,
          dueDate: b.dueDate,
          daysUntilDue: b.daysUntilDue,
          amountPaid: b.amountPaid,
          remainingAmount: b.remainingAmount,
          paymentStatus: b.paymentStatus
        })),
        monthlySpending,
        categorySpending,
        cardBreakdown
      }
    });
  } catch (err) {
    logger.error('CC bill summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/cc-bills/cards — List distinct cards the user has
// ============================================================
router.get('/cards', authenticate, async (req, res) => {
  try {
    const cards = await CreditCardBill.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
      {
        $group: {
          _id: { provider: '$cardProvider', digits: '$cardLastFourDigits' },
          cardHolderName: { $last: '$cardHolderName' },
          cardNetwork: { $last: '$cardNetwork' },
          creditLimit: { $last: '$creditLimit' },
          billCount: { $sum: 1 },
          latestBill: { $max: '$statementDate' }
        }
      },
      { $sort: { latestBill: -1 } }
    ]);

    res.json({
      success: true,
      data: cards.map(c => ({
        cardProvider: c._id.provider,
        cardLastFourDigits: c._id.digits,
        cardHolderName: c.cardHolderName,
        cardNetwork: c.cardNetwork,
        creditLimit: c.creditLimit,
        billCount: c.billCount,
        latestBill: c.latestBill
      }))
    });
  } catch (err) {
    logger.error('CC cards list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/cc-bills — Add a bill manually
// ============================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      cardProvider, cardLastFourDigits, cardHolderName, cardNetwork,
      statementDate, billingPeriodStart, billingPeriodEnd, dueDate,
      totalAmount, minimumDue, previousBalance, paymentsReceived,
      newCharges, interestCharged, cashAdvance, feesAndCharges,
      rewardsEarned, creditLimit, availableCredit,
      spendingByCategory, notes
    } = req.body;

    // Validation
    if (!cardProvider || !cardLastFourDigits || !statementDate || !dueDate || totalAmount == null) {
      return res.status(400).json({
        success: false,
        message: 'cardProvider, cardLastFourDigits, statementDate, dueDate, and totalAmount are required'
      });
    }

    if (!/^\d{4}$/.test(cardLastFourDigits)) {
      return res.status(400).json({ success: false, message: 'cardLastFourDigits must be exactly 4 digits' });
    }

    // Check duplicate
    const existing = await CreditCardBill.findOne({
      userId: req.user._id,
      cardProvider: cardProvider.toUpperCase(),
      cardLastFourDigits,
      statementDate: new Date(statementDate)
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A bill already exists for this card and statement date',
        existingBill: existing._id
      });
    }

    const bill = new CreditCardBill({
      userId: req.user._id,
      cardProvider: cardProvider.toUpperCase(),
      cardLastFourDigits,
      cardHolderName: cardHolderName || '',
      cardNetwork: (cardNetwork || '').toLowerCase(),
      statementDate: new Date(statementDate),
      billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : undefined,
      billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : undefined,
      dueDate: new Date(dueDate),
      totalAmount: Number(totalAmount),
      minimumDue: Number(minimumDue || 0),
      previousBalance: Number(previousBalance || 0),
      paymentsReceived: Number(paymentsReceived || 0),
      newCharges: Number(newCharges || 0),
      interestCharged: Number(interestCharged || 0),
      cashAdvance: Number(cashAdvance || 0),
      feesAndCharges: Number(feesAndCharges || 0),
      rewardsEarned: Number(rewardsEarned || 0),
      creditLimit: Number(creditLimit || 0),
      availableCredit: Number(availableCredit || 0),
      spendingByCategory: spendingByCategory || [],
      notes: notes || '',
      source: 'manual'
    });

    await bill.save();

    // Auto-create a bill reminder for dueDate
    try {
      await BillReminder.findOneAndUpdate(
        {
          userId: req.user._id,
          title: `CC Bill: ${cardProvider.toUpperCase()} ****${cardLastFourDigits}`,
          dueDate: new Date(dueDate),
          status: { $in: ['pending', 'overdue'] }
        },
        {
          $setOnInsert: {
            userId: req.user._id,
            title: `CC Bill: ${cardProvider.toUpperCase()} ****${cardLastFourDigits}`,
            amount: Number(totalAmount),
            dueDate: new Date(dueDate),
            category: 'loan',
            frequency: 'monthly',
            reminderDays: 3,
            status: 'pending',
            description: `Credit card bill payment due. Min: ₹${minimumDue || 0}, Total: ₹${totalAmount}`
          }
        },
        { upsert: true, new: true }
      );
    } catch (reminderErr) {
      logger.warn('CC bill reminder upsert failed:', reminderErr.message);
    }

    logger.info(`CC bill created: ${bill._id} for user ${req.user._id}`);
    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    logger.error('Create CC bill error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate bill for this card and statement date' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// PUT /api/cc-bills/:id — Update a bill
// ============================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const bill = await CreditCardBill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const allowed = [
      'totalAmount', 'minimumDue', 'previousBalance', 'paymentsReceived',
      'newCharges', 'interestCharged', 'cashAdvance', 'feesAndCharges',
      'rewardsEarned', 'creditLimit', 'availableCredit',
      'spendingByCategory', 'notes', 'dueDate', 'cardHolderName', 'cardNetwork',
      'amountPaid', 'paymentDate', 'paymentMethod', 'paymentStatus',
      'billingPeriodStart', 'billingPeriodEnd'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (['dueDate', 'paymentDate', 'billingPeriodStart', 'billingPeriodEnd'].includes(key)) {
          bill[key] = new Date(req.body[key]);
        } else {
          bill[key] = req.body[key];
        }
      }
    }

    await bill.save();
    res.json({ success: true, data: bill });
  } catch (err) {
    logger.error('Update CC bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/cc-bills/:id/pay — Record a payment
// ============================================================
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const bill = await CreditCardBill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    bill.amountPaid = (bill.amountPaid || 0) + Number(amount);
    bill.paymentDate = new Date();
    bill.paymentMethod = paymentMethod || '';
    // paymentStatus is auto-updated by the pre-save hook

    await bill.save();

    logger.info(`CC bill payment: ₹${amount} on bill ${bill._id}`);
    res.json({ success: true, data: bill });
  } catch (err) {
    logger.error('CC bill payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// DELETE /api/cc-bills/:id — Delete a bill
// ============================================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const bill = await CreditCardBill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    res.json({ success: true, message: 'Bill deleted' });
  } catch (err) {
    logger.error('Delete CC bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/cc-bills/sync-gmail — Fetch CC bills from Gmail
// ============================================================
router.post('/sync-gmail', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user || !user.gmailAccessToken) {
      return res.status(400).json({ success: false, message: 'Gmail not connected. Please connect Gmail first.' });
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken
    });

    // Refresh if needed
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      user.gmailAccessToken = credentials.access_token;
      if (credentials.refresh_token) user.gmailRefreshToken = credentials.refresh_token;
      await user.save();
      oauth2Client.setCredentials(credentials);
    } catch (refreshErr) {
      logger.warn('Gmail token refresh warning:', refreshErr.message);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search for credit card bill/statement emails from the last 6 months
    const searchQuery = [
      '(subject:"credit card" OR subject:"card statement" OR subject:"bill generated" OR subject:"bill ready" OR subject:"amount due" OR subject:"payment due" OR subject:"statement ready")',
      '(from:icicibank OR from:hdfcbank OR from:axisbank OR from:sbicard OR from:kotak OR from:citi OR from:amex OR from:indusind OR from:yesbank OR from:sc.com)',
      'newer_than:6m'
    ].join(' ');

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 50
    });

    const messages = response.data.messages || [];
    logger.info(`Found ${messages.length} CC bill emails for user ${req.user._id}`);

    const results = { created: 0, skipped: 0, errors: 0, bills: [] };

    for (const msg of messages) {
      try {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = detail.data.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const dateStr = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

        // Extract body text
        let bodyText = '';
        const extractText = (part) => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
          if (part.mimeType === 'text/html' && part.body?.data && !bodyText) {
            const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
            bodyText += html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          }
          if (part.parts) part.parts.forEach(extractText);
        };
        extractText(detail.data.payload);

        const combined = `${subject} ${bodyText}`;

        // Identify provider
        const providerMap = {
          'icici': 'ICICI', 'hdfc': 'HDFC', 'axis': 'AXIS', 'sbi': 'SBI',
          'kotak': 'KOTAK', 'citi': 'CITI', 'amex': 'AMEX', 'american express': 'AMEX',
          'indusind': 'INDUSIND', 'yes bank': 'YES BANK', 'yesbank': 'YES BANK',
          'standard chartered': 'STANDARD CHARTERED', 'sc.com': 'STANDARD CHARTERED'
        };
        let provider = '';
        const fromLower = from.toLowerCase();
        for (const [key, val] of Object.entries(providerMap)) {
          if (fromLower.includes(key) || subject.toLowerCase().includes(key)) {
            provider = val;
            break;
          }
        }
        if (!provider) continue;

        // Extract amounts from email
        const amountPatterns = [
          /total\s*(?:amount\s*)?(?:due|payable|outstanding)[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i,
          /(?:amount|bill)\s*(?:due|payable)[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i,
          /(?:total\s*)?(?:outstanding|balance)[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i,
          /₹\s*([0-9,]+\.?\d*)\s*(?:is\s+)?(?:due|payable)/i,
          /(?:Rs\.?|INR)\s*([0-9,]+\.?\d*)\s*(?:is\s+)?(?:due|payable)/i,
          /pay\s*(?:₹|Rs\.?|INR)\s*([0-9,]+\.?\d*)/i,
          /statement\s*amount[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i
        ];

        let totalAmount = 0;
        for (const pat of amountPatterns) {
          const m = combined.match(pat);
          if (m) {
            totalAmount = parseFloat(m[1].replace(/,/g, ''));
            if (totalAmount > 0) break;
          }
        }
        if (totalAmount <= 0) { results.skipped++; continue; }

        // Extract minimum due
        let minimumDue = 0;
        const minDuePatterns = [
          /minimum\s*(?:amount\s*)?due[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i,
          /min\.?\s*(?:amount\s*)?due[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i,
          /MAD[\s:₹Rs.INR]*?([0-9,]+\.?\d*)/i
        ];
        for (const pat of minDuePatterns) {
          const m = combined.match(pat);
          if (m) { minimumDue = parseFloat(m[1].replace(/,/g, '')); break; }
        }

        // Extract card last 4 digits
        let cardDigits = '';
        const cardPatterns = [
          /card\s*(?:ending|no\.?|number)?\s*(?:with|in)?\s*[x*]*\s*(\d{4})/i,
          /[x*]{4,}\s*(\d{4})/i,
          /(\d{4})\s*(?:card)/i
        ];
        for (const pat of cardPatterns) {
          const m = combined.match(pat);
          if (m) { cardDigits = m[1]; break; }
        }
        if (!cardDigits) cardDigits = '0000';

        // Extract due date
        let dueDate = null;
        const dueDatePatterns = [
          /(?:due\s*date|payment\s*date|pay\s*(?:by|before))[\s:]*(\d{1,2}[\s/-]\w{3,9}[\s/-]\d{2,4})/i,
          /(?:due\s*date|payment\s*date)[\s:]*(\d{1,2}[\s/-]\d{1,2}[\s/-]\d{2,4})/i
        ];
        for (const pat of dueDatePatterns) {
          const m = combined.match(pat);
          if (m) {
            try { dueDate = new Date(m[1]); if (isNaN(dueDate.getTime())) dueDate = null; } catch (_) {}
            break;
          }
        }
        if (!dueDate) {
          // Default: 20 days from email date
          dueDate = new Date(dateStr);
          dueDate.setDate(dueDate.getDate() + 20);
        }

        const statementDate = new Date(dateStr);

        // Dedup check
        const existing = await CreditCardBill.findOne({
          userId: req.user._id,
          cardProvider: provider,
          cardLastFourDigits: cardDigits,
          statementDate: {
            $gte: new Date(statementDate.getFullYear(), statementDate.getMonth(), 1),
            $lt: new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, 1)
          }
        });

        if (existing) { results.skipped++; continue; }

        const bill = new CreditCardBill({
          userId: req.user._id,
          cardProvider: provider,
          cardLastFourDigits: cardDigits,
          statementDate,
          dueDate,
          totalAmount,
          minimumDue,
          source: 'gmail',
          gmailMessageId: msg.id,
          extractionConfidence: 0.7,
          notes: `Auto-extracted from: "${subject}"`
        });

        await bill.save();
        results.created++;
        results.bills.push({
          _id: bill._id,
          cardProvider: provider,
          cardLastFourDigits: cardDigits,
          totalAmount,
          minimumDue,
          dueDate,
          statementDate
        });

      } catch (msgErr) {
        logger.warn(`Error processing CC bill email ${msg.id}:`, msgErr.message);
        results.errors++;
      }
    }

    logger.info(`CC bill Gmail sync: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`);
    res.json({ success: true, data: results });

  } catch (err) {
    logger.error('CC bill Gmail sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/cc-bills/analytics/spending — Spending analytics
// ============================================================
router.get('/analytics/spending', authenticate, async (req, res) => {
  try {
    const months = Number(req.query.months) || 6;
    const [monthlySpending, categorySpending] = await Promise.all([
      CreditCardBill.getMonthlySpending(req.user._id, months),
      CreditCardBill.getSpendingAnalytics(req.user._id, months)
    ]);

    res.json({
      success: true,
      data: { monthlySpending, categorySpending }
    });
  } catch (err) {
    logger.error('CC spending analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/cc-bills/:id — Get a single bill (MUST be last GET)
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bill = await CreditCardBill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    res.json({ success: true, data: bill });
  } catch (err) {
    logger.error('Get CC bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
