/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  LOCAL AI ROUTES - Chat & Intelligence API (works offline, Ollama optional)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const localAI = require('../services/localAIEngineV2');
const logger = require('../utils/logger');

/**
 * @route POST /api/local-ai/chat
 * @desc Chat with the local AI financial assistant
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // Gather user context
    const mongoose = require('mongoose');
    const userId = req.user._id;
    let context = { userName: req.user.name, history: history || [] };

    try {
      // Get borrowing portfolio
      const PersonalLoan = mongoose.model('PersonalLoan');
      const loans = await PersonalLoan.find({ userId }).lean();
      const activeLoans = loans.filter(l => l.status === 'active');
      context.portfolio = {
        totalBorrowed: loans.reduce((s, l) => s + (l.principalAmount || 0), 0),
        totalOutstanding: activeLoans.reduce((s, l) => s + (l.outstandingAmount || l.principalAmount - (l.totalRepaid || 0)), 0),
        totalRepaid: loans.reduce((s, l) => s + (l.totalRepaid || 0), 0),
        activeLoans: activeLoans.length,
        monthlyIncome: 0,
        monthlyExpenses: 0
      };

      // Get income/expense estimates
      const Transaction = mongoose.model('Transaction');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const txns = await Transaction.find({ userId, date: { $gte: cutoff } }).lean();
      context.transactions = txns;
      const months = Math.max(1, new Set(txns.map(t => new Date(t.date).toISOString().substring(0, 7))).size);
      context.portfolio.monthlyIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0) / months;
      context.portfolio.monthlyExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) / months;
    } catch (ctxErr) {
      logger.debug('Context gathering failed (non-fatal):', ctxErr.message);
    }

    const result = await localAI.chat(message, context);

    res.json({
      success: true,
      data: {
        message: result.response,
        source: result.source,
        model: result.model,
        intent: result.intent,
        confidence: result.confidence
      }
    });
  } catch (error) {
    logger.error('Local AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI processing failed', error: error.message });
  }
});

/**
 * @route GET /api/local-ai/status
 * @desc Get AI engine status (Ollama availability, model info)
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await localAI.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get AI status' });
  }
});

/**
 * @route POST /api/local-ai/categorize
 * @desc AI-powered transaction categorization
 */
router.post('/categorize', authenticate, async (req, res) => {
  try {
    const { description, amount } = req.body;
    const result = localAI.categorizeTransaction(description, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Categorization failed' });
  }
});

/**
 * @route POST /api/local-ai/alert
 * @desc Generate smart notification text
 */
router.post('/alert', authenticate, async (req, res) => {
  try {
    const { type, data } = req.body;
    const text = localAI.generateAlert(type, data || {});
    res.json({ success: true, data: { text } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Alert generation failed' });
  }
});

module.exports = router;
