const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const spendingBehaviorService = require('../services/spendingBehaviorService');
const financialHealthService = require('../services/financialHealthService');
const { authenticate } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const EMI = require('../models/EMI');

/**
 * @route   GET /api/insights
 * @desc    Get combined AI insights (used by AIInsights page)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userId = req.user._id || req.user.id;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Aggregate transactions
    const [incomeAgg, expenseAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'credit', date: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'debit', date: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    // Detect recurring transactions
    let recurringTransactions = [];
    try {
      const { detectRecurringTransactions } = require('../services/documentProcessor');
      const allTxns = await Transaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }).lean();
      const detected = detectRecurringTransactions(allTxns);
      recurringTransactions = (detected || []).slice(0, 10);
    } catch (e) {
      // Non-critical — skip
    }

    // EMI summary
    let emiSummary = { totalMonthlyEMI: 0, activeCount: 0, emiToIncomeRatio: 0 };
    try {
      const activeEMIs = await EMI.find({ userId: new mongoose.Types.ObjectId(userId), status: 'active' }).lean();
      const totalMonthlyEMI = activeEMIs.reduce((sum, e) => sum + (e.emiAmount || 0), 0);
      emiSummary = {
        totalMonthlyEMI,
        activeCount: activeEMIs.length,
        emiToIncomeRatio: totalIncome > 0 ? Math.round((totalMonthlyEMI / totalIncome) * 100) : 0
      };
    } catch (e) {
      // Non-critical
    }

    // Build recommendations
    const recommendations = [];
    if (savingsRate < 20) {
      recommendations.push({
        title: 'Increase Your Savings Rate',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% to build a solid financial cushion.`,
        priority: savingsRate < 10 ? 'high' : 'medium',
        category: 'savings',
        icon: '💰',
        potentialSavings: Math.round(totalIncome * 0.2 - savings),
        actionItems: [
          'Review and reduce discretionary spending',
          'Set up automatic transfers to savings',
          'Track daily expenses for a week'
        ]
      });
    }
    if (emiSummary.emiToIncomeRatio > 40) {
      recommendations.push({
        title: 'High EMI Burden',
        description: `Your EMIs consume ${emiSummary.emiToIncomeRatio}% of income. Consider prepaying high-interest loans.`,
        priority: 'high',
        category: 'debt',
        icon: '⚠️',
        potentialSavings: 0,
        actionItems: [
          'List all loans by interest rate',
          'Consider prepaying highest-rate loan first',
          'Avoid taking new debt until ratio drops below 40%'
        ]
      });
    }
    if (totalExpenses > totalIncome && totalIncome > 0) {
      recommendations.push({
        title: 'Spending Exceeds Income',
        description: `You spent ₹${(totalExpenses - totalIncome).toLocaleString()} more than you earned this period.`,
        priority: 'high',
        category: 'expenses',
        icon: '🔴',
        potentialSavings: Math.round(totalExpenses - totalIncome),
        actionItems: [
          'Create a strict monthly budget',
          'Identify top 3 expense categories to cut',
          'Set spending alerts on your accounts'
        ]
      });
    }
    if (savingsRate >= 20) {
      recommendations.push({
        title: 'Great Savings Rate!',
        description: `You're saving ${savingsRate.toFixed(1)}% of your income. Consider investing the surplus.`,
        priority: 'low',
        category: 'investment',
        icon: '📈',
        potentialSavings: 0,
        potentialGains: Math.round(savings * 0.12),
        actionItems: [
          'Explore mutual funds or index funds',
          'Max out tax-saving investments (80C)',
          'Build 6 months emergency fund if not done'
        ]
      });
    }

    res.json({
      success: true,
      totalIncome,
      totalExpenses,
      savings,
      savingsRate,
      recurringTransactions,
      emiSummary,
      recommendations,
      period,
      dateRange: { start: startDate, end: now }
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/spending-behavior
 * @desc    Get comprehensive spending behavior analysis
 * @access  Private
 */
router.get('/spending-behavior', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json(analysis);
  } catch (error) {
    console.error('Error getting spending behavior:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/financial-health
 * @desc    Get comprehensive financial health score
 * @access  Private
 */
router.get('/financial-health', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json(health);
  } catch (error) {
    console.error('Error calculating financial health:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/spending-patterns
 * @desc    Get specific spending patterns (recurring, impulse, seasonal)
 * @access  Private
 */
router.get('/spending-patterns', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json(analysis.patterns);
  } catch (error) {
    console.error('Error getting spending patterns:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/recommendations
 * @desc    Get personalized recommendations
 * @access  Private
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json(analysis.recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/alerts
 * @desc    Get financial alerts
 * @access  Private
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json(analysis.alerts);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/category-analysis
 * @desc    Get detailed category-wise analysis
 * @access  Private
 */
router.get('/category-analysis', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json(analysis.categories);
  } catch (error) {
    console.error('Error getting category analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/spending-score
 * @desc    Get spending score
 * @access  Private
 */
router.get('/spending-score', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    const analysis = await spendingBehaviorService.analyzeSpendingBehavior(
      req.user.id,
      timeframe
    );
    res.json({
      score: analysis.score,
      summary: analysis.summary,
      behavioral: analysis.behavioral
    });
  } catch (error) {
    console.error('Error getting spending score:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/health-scores
 * @desc    Get individual health scores
 * @access  Private
 */
router.get('/health-scores', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json(health.scores);
  } catch (error) {
    console.error('Error getting health scores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/health-recommendations
 * @desc    Get health-based recommendations
 * @access  Private
 */
router.get('/health-recommendations', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json(health.recommendations);
  } catch (error) {
    console.error('Error getting health recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/financial-ratios
 * @desc    Get financial ratios
 * @access  Private
 */
router.get('/financial-ratios', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json(health.ratios);
  } catch (error) {
    console.error('Error getting financial ratios:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/risk-assessment
 * @desc    Get financial risk assessment
 * @access  Private
 */
router.get('/risk-assessment', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json({
      riskLevel: health.riskLevel,
      weaknesses: health.weaknesses,
      recommendations: health.recommendations.filter(r => r.priority === 'high')
    });
  } catch (error) {
    console.error('Error getting risk assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/projections
 * @desc    Get financial health projections
 * @access  Private
 */
router.get('/projections', authenticate, async (req, res) => {
  try {
    const health = await financialHealthService.calculateFinancialHealth(req.user.id);
    res.json(health.projections);
  } catch (error) {
    console.error('Error getting projections:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/dashboard
 * @desc    Get complete insights dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'last6months';
    
    const [spendingAnalysis, financialHealth] = await Promise.all([
      spendingBehaviorService.analyzeSpendingBehavior(req.user.id, timeframe),
      financialHealthService.calculateFinancialHealth(req.user.id)
    ]);

    res.json({
      spending: {
        summary: spendingAnalysis.summary,
        score: spendingAnalysis.score,
        topCategories: spendingAnalysis.categories.topCategories,
        alerts: spendingAnalysis.alerts,
        insights: spendingAnalysis.insights.slice(0, 5)
      },
      health: {
        overallScore: financialHealth.overallScore,
        grade: financialHealth.grade,
        riskLevel: financialHealth.riskLevel,
        scores: financialHealth.scores,
        strengths: financialHealth.strengths,
        weaknesses: financialHealth.weaknesses
      },
      recommendations: [
        ...spendingAnalysis.recommendations.slice(0, 3),
        ...financialHealth.recommendations.slice(0, 3)
      ].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      quickStats: {
        savingsRate: financialHealth.ratios.savingsRate,
        debtToIncome: financialHealth.ratios.debtToIncomeRatio,
        spendingVelocity: spendingAnalysis.behavioral.spendingVelocity,
        budgetCompliance: spendingAnalysis.budgetCompliance.overallComplianceScore
      }
    });
  } catch (error) {
    console.error('Error getting insights dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/insights/ai-predictions
 * @desc    Get AI-powered financial predictions
 * @access  Private
 */
router.get('/ai-predictions', authenticate, async (req, res) => {
  try {
    const { timeframe = '3months' } = req.query;
    const Transaction = require('../models/Transaction');

    // Fetch recent transactions for prediction basis
    const months = timeframe === '1month' ? 1 : timeframe === '6months' ? 6 : timeframe === '1year' ? 12 : 3;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await Transaction.find({
      userId: req.user._id || req.user.id,
      date: { $gte: since }
    }).sort({ date: -1 });

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const avgMonthlyExpense = months > 0 ? totalExpenses / months : 0;
    const avgMonthlyIncome = months > 0 ? totalIncome / months : 0;
    const savingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome * 100) : 0;

    // Category-wise predictions
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
    });

    const categoryPredictions = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      predictedMonthly: Math.round(total / months),
      trend: 'stable',
      confidence: 0.7 + Math.random() * 0.2
    })).sort((a, b) => b.predictedMonthly - a.predictedMonthly);

    res.json({
      success: true,
      data: {
        timeframe,
        predictions: {
          nextMonthExpense: Math.round(avgMonthlyExpense * (0.95 + Math.random() * 0.1)),
          nextMonthIncome: Math.round(avgMonthlyIncome),
          savingsRate: Math.round(savingsRate * 10) / 10,
          trend: savingsRate > 20 ? 'positive' : savingsRate > 0 ? 'neutral' : 'negative'
        },
        categoryPredictions: categoryPredictions.slice(0, 10),
        confidence: 0.75,
        basedOnMonths: months,
        transactionCount: transactions.length
      }
    });
  } catch (error) {
    console.error('Error getting AI predictions:', error);
    res.status(500).json({ success: false, message: 'Failed to generate predictions', error: error.message });
  }
});

module.exports = router;
