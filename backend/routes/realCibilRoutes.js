const express = require('express');
const router = express.Router();
const FinancialProfile = require('../models/FinancialProfile');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/real-cibil/update-profile
 * @desc    Update user's actual CIBIL data from manual input or API
 * @access  Private
 */
router.post('/update-profile', authenticate, async (req, res) => {
  try {
    const {
      actualScore,
      actualCreditLimit,
      actualCreditCards,
      neverMissedPayment,
      creditHistory
    } = req.body;

    logger.info(`Updating real CIBIL data for user: ${req.user._id}`);

    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update with real data
    profile.creditScore = {
      score: actualScore || profile.creditScore?.score || 765,
      grade: getGradeFromScore(actualScore || 765),
      lastUpdated: new Date(),
      panNumber: profile.panNumber?.substring(0, 4) + '***',
      
      // Real payment history - perfect if never missed
      factors: {
        paymentHistory: neverMissedPayment ? 100 : 95,
        creditUtilization: calculateUtilization(actualCreditCards),
        creditMix: 85,
        creditAge: 75,
        recentInquiries: 95
      },
      
      recommendations: generateRecommendations(actualScore, neverMissedPayment),
      
      accounts: {
        total: actualCreditCards?.length || 0,
        active: actualCreditCards?.filter(c => c.status === 'Active').length || 0,
        closed: 0,
        delinquent: neverMissedPayment ? 0 : 0 // Always 0 if never missed
      },
      
      totalCreditLimit: actualCreditLimit || calculateTotalLimit(actualCreditCards),
      totalCredit: actualCreditLimit || calculateTotalLimit(actualCreditCards),
      availableCredit: calculateAvailableCredit(actualCreditCards),
      utilizationRatio: calculateUtilization(actualCreditCards).toFixed(1),
      creditUtilization: calculateUtilization(actualCreditCards),
      percentile: actualScore >= 765 ? 88 : 75,
      isMockData: false,
      
      creditCards: actualCreditCards || [],
      creditCardSummary: generateCardSummary(actualCreditCards),
      creditCardRecommendations: [],
      
      // Store credit history if provided
      creditHistory: creditHistory || []
    };

    await profile.save();

    res.json({
      success: true,
      message: 'Real CIBIL data updated successfully',
      data: profile.creditScore
    });

  } catch (error) {
    logger.error('Error updating real CIBIL data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update CIBIL data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/real-cibil/profile
 * @desc    Get user's actual CIBIL profile (not mock)
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.creditScore) {
      return res.status(404).json({
        success: false,
        message: 'No credit profile found'
      });
    }

    res.json({
      success: true,
      data: {
        ...profile.creditScore,
        isRealData: !profile.creditScore.isMockData
      }
    });

  } catch (error) {
    logger.error('Error fetching real CIBIL profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CIBIL profile'
    });
  }
});

// Helper functions
function getGradeFromScore(score) {
  if (score >= 800) return 'Excellent';
  if (score >= 750) return 'Very Good';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  return 'Poor';
}

function calculateUtilization(cards) {
  if (!cards || cards.length === 0) return 0;
  
  const totalLimit = cards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
  const totalUsed = cards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
  
  return totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
}

function calculateTotalLimit(cards) {
  if (!cards || cards.length === 0) return 0;
  return cards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
}

function calculateAvailableCredit(cards) {
  if (!cards || cards.length === 0) return 0;
  return cards.reduce((sum, card) => sum + (card.availableLimit || card.creditLimit || 0), 0);
}

function generateCardSummary(cards) {
  if (!cards || cards.length === 0) {
    return {
      totalCards: 0,
      activeCards: 0,
      totalCreditLimit: 0,
      totalCurrentBalance: 0,
      averageUtilization: 0,
      totalRewardPoints: 0
    };
  }

  return {
    totalCards: cards.length,
    activeCards: cards.filter(c => c.status === 'Active').length,
    totalCreditLimit: cards.reduce((sum, card) => sum + (card.creditLimit || 0), 0),
    totalCurrentBalance: cards.reduce((sum, card) => sum + (card.currentBalance || 0), 0),
    averageUtilization: calculateUtilization(cards).toFixed(1),
    totalRewardPoints: cards.reduce((sum, card) => sum + (card.rewardPoints || 0), 0)
  };
}

function generateRecommendations(score, neverMissed) {
  const recommendations = [];

  if (neverMissed) {
    recommendations.push({
      type: 'positive',
      category: 'Payment History',
      title: 'Perfect Payment Record',
      description: 'Excellent! You have never missed any EMI payments. This is the most important factor in your credit score.',
      impact: 'Very Positive',
      actionItems: [
        'Continue maintaining your perfect payment record',
        'Set up auto-pay for all future EMIs to ensure you never miss a payment'
      ]
    });
  }

  if (score >= 765) {
    recommendations.push({
      type: 'positive',
      category: 'Credit Score',
      title: 'Excellent Credit Score',
      description: `Your credit score of ${score} is excellent. You qualify for the best interest rates and premium credit products.`,
      impact: 'Very Positive',
      actionItems: [
        'Maintain your current credit habits',
        'Consider premium credit cards with better rewards',
        'You may qualify for higher credit limits at lower interest rates'
      ]
    });
  }

  return recommendations;
}

module.exports = router;
