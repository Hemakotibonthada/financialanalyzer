// ============================================================================
// AI PREMIUM ROUTES — Cash Flow, Subscriptions, Tax Harvesting
// ============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const model = (name) => {
  try { return require(`../models/${name}`); } catch { return null; }
};

// ============================================================================
// §1  CASH FLOW INTELLIGENCE
// ============================================================================

router.get('/cashflow/analyze', authenticate, async (req, res) => {
  try {
    const { CashFlowIntelligenceService } = require('../services/ai/cashFlowIntelligence');
    const service = new CashFlowIntelligenceService();
    const userId = req.user._id;
    const balance = req.query.balance ? parseFloat(req.query.balance) : null;

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId }).sort({ date: -1 }).limit(500).lean()
      : [];

    const result = await service.analyze(userId.toString(), transactions, balance);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Cash flow analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cashflow/forecast', authenticate, async (req, res) => {
  try {
    const { CashFlowForecaster } = require('../services/ai/cashFlowIntelligence');
    const forecaster = new CashFlowForecaster();
    const days = parseInt(req.query.days) || 90;
    const balance = req.query.balance ? parseFloat(req.query.balance) : null;

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(500).lean()
      : [];

    const result = forecaster.forecast(transactions, days, balance);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cashflow/income-patterns', authenticate, async (req, res) => {
  try {
    const { IncomePatternDetector } = require('../services/ai/cashFlowIntelligence');
    const detector = new IncomePatternDetector();

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(500).lean()
      : [];

    const result = detector.detect(transactions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cashflow/recurring', authenticate, async (req, res) => {
  try {
    const { RecurringExpenseDetector } = require('../services/ai/cashFlowIntelligence');
    const detector = new RecurringExpenseDetector();

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(500).lean()
      : [];

    const result = detector.detect(transactions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cashflow/liquidity', authenticate, async (req, res) => {
  try {
    const { LiquidityAnalyzer } = require('../services/ai/cashFlowIntelligence');
    const analyzer = new LiquidityAnalyzer();
    const balance = parseFloat(req.query.balance) || 100000;

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id, type: 'expense' }).sort({ date: -1 }).limit(300).lean()
      : [];

    const result = analyzer.analyze(transactions, balance);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §2  SUBSCRIPTION MANAGER
// ============================================================================

router.get('/subscriptions/analyze', authenticate, async (req, res) => {
  try {
    const { SubscriptionManagerService } = require('../services/ai/subscriptionManagerAI');
    const service = new SubscriptionManagerService();

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id, type: 'expense' }).sort({ date: -1 }).limit(1000).lean()
      : [];

    const result = service.analyze(transactions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/subscriptions/detect', authenticate, async (req, res) => {
  try {
    const { SubscriptionDetector } = require('../services/ai/subscriptionManagerAI');
    const detector = new SubscriptionDetector();

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id, type: 'expense' }).sort({ date: -1 }).limit(1000).lean()
      : [];

    const result = detector.detect(transactions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/subscriptions/optimize', authenticate, async (req, res) => {
  try {
    const { SubscriptionDetector, SubscriptionOptimizer } = require('../services/ai/subscriptionManagerAI');
    const detector = new SubscriptionDetector();
    const optimizer = new SubscriptionOptimizer();

    const Transaction = model('Transaction');
    const transactions = Transaction
      ? await Transaction.find({ userId: req.user._id, type: 'expense' }).sort({ date: -1 }).limit(1000).lean()
      : [];

    const subscriptions = detector.detect(transactions);
    const result = optimizer.optimize(subscriptions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// §3  TAX HARVESTING
// ============================================================================

router.post('/tax-harvesting/analyze', authenticate, async (req, res) => {
  try {
    const { TaxHarvestingService } = require('../services/ai/taxHarvestingEngine');
    const service = new TaxHarvestingService();

    const portfolio = req.body.portfolio || [];
    const config = req.body.config || {};

    // If no portfolio supplied, try to build from user's investments
    if (portfolio.length === 0) {
      const Investment = model('Investment');
      if (Investment) {
        const investments = await Investment.find({ userId: req.user._id }).lean();
        for (const inv of investments) {
          portfolio.push({
            name: inv.name || inv.symbol,
            assetType: (inv.type || 'equity').toLowerCase().includes('debt') ? 'debt' :
                       (inv.type || '').toLowerCase().includes('gold') ? 'gold' : 'equity',
            purchaseDate: inv.purchaseDate || inv.createdAt,
            purchasePrice: inv.purchasePrice || (inv.investedAmount || 0) / (inv.quantity || 1),
            currentPrice: inv.currentPrice || (inv.currentValue || 0) / (inv.quantity || 1),
            quantity: inv.quantity || 1,
            purchaseFY: inv.purchaseFY || '2023-24'
          });
        }
      }
    }

    const result = service.analyze(portfolio, config);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/tax-harvesting/calculate-gains', authenticate, async (req, res) => {
  try {
    const { IndianCapitalGainsTax } = require('../services/ai/taxHarvestingEngine');
    const calc = new IndianCapitalGainsTax();
    const result = req.body.investments
      ? calc.calculateBulkGains(req.body.investments)
      : calc.calculateGains(req.body.investment || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/tax-harvesting/loss-opportunities', authenticate, async (req, res) => {
  try {
    const { TaxLossHarvester } = require('../services/ai/taxHarvestingEngine');
    const harvester = new TaxLossHarvester();
    const result = harvester.findOpportunities(req.body.portfolio || []);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/tax-harvesting/gain-opportunities', authenticate, async (req, res) => {
  try {
    const { TaxGainHarvester } = require('../services/ai/taxHarvestingEngine');
    const harvester = new TaxGainHarvester();
    const result = harvester.findGainHarvestingOpportunities(
      req.body.portfolio || [],
      req.body.usedExemption || 0
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
