const express = require('express');
const router = express.Router();
const spendingBehaviorService = require('../services/spendingBehaviorService');
const financialHealthService = require('../services/financialHealthService');
const { authenticate } = require('../middleware/auth');

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

module.exports = router;
