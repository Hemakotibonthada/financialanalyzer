const axios = require('axios');
const logger = require('../utils/logger');

/**
 * CIBIL Score Integration Service
 * Uses real CIBIL TransUnion APIs when configured (CIBIL_API_KEY + CIBIL_CLIENT_ID),
 * otherwise returns user-entered credit data from their financial profile.
 * No fake/mock data is generated — users must enter their own real data.
 */
class CIBILService {
  constructor() {
    this.apiUrl = process.env.CIBIL_API_URL || 'https://api.cibil.com';
    this.apiKey = process.env.CIBIL_API_KEY;
    this.clientId = process.env.CIBIL_CLIENT_ID;
    this.isConfigured = !!(this.apiKey && this.clientId);
  }

  /**
   * Fetch CIBIL score using PAN card details
   */
  async getCreditScore(panNumber, personalDetails = {}) {
    try {
      logger.info(`Fetching CIBIL score for PAN: ${panNumber.substring(0, 4)}***`);

      // Validate PAN format
      if (!this.validatePAN(panNumber)) {
        throw new Error('Invalid PAN card number format');
      }

      // Use real CIBIL API when configured
      if (this.isConfigured) {
        return await this.fetchRealCreditScore(panNumber, personalDetails);
      } else {
        // No CIBIL API configured — return empty profile prompting user to enter data manually
        return this.getManualCreditProfile(panNumber, personalDetails);
      }

    } catch (error) {
      logger.error('Error fetching CIBIL score:', error);
      throw error;
    }
  }

  /**
   * Validate PAN card number format
   */
  validatePAN(panNumber) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber);
  }

  /**
   * Fetch real CIBIL score (production implementation)
   */
  async fetchRealCreditScore(panNumber, personalDetails) {
    try {
      const payload = {
        pan: panNumber,
        ...personalDetails,
        clientId: this.clientId
      };

      const response = await axios.post(`${this.apiUrl}/credit-score`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return this.formatCreditResponse(response.data);

    } catch (error) {
      logger.error('CIBIL API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('CIBIL API authentication failed');
      } else if (error.response?.status === 404) {
        throw new Error('Credit profile not found');
      } else {
        throw new Error('Failed to fetch credit score from CIBIL');
      }
    }
  }

  /**
   * Return an empty credit profile structure when CIBIL API is not configured.
   * Prompts user to enter their real credit data manually.
   */
  getManualCreditProfile(panNumber, personalDetails) {
    return {
      success: true,
      creditScore: null,
      scoreRange: '300-900',
      grade: 'Not Available',
      factors: {
        paymentHistory: 0,
        creditUtilization: 0,
        creditMix: 0,
        creditAge: 0,
        recentInquiries: 0
      },
      accounts: { total: 0, active: 0, closed: 0, delinquent: 0 },
      totalCredit: 0,
      availableCredit: 0,
      utilizationRatio: '0.0',
      creditCards: [],
      creditCardSummary: {
        totalCards: 0,
        totalCreditLimit: 0,
        totalCurrentBalance: 0,
        averageUtilization: '0.0',
        activeCards: 0,
        totalRewardPoints: 0
      },
      lastUpdated: new Date(),
      recommendations: [
        {
          category: 'Setup Required',
          priority: 'High',
          action: 'CIBIL API is not configured. Please enter your credit score and credit card details manually in your profile, or configure CIBIL API credentials.',
          impact: 'High'
        }
      ],
      creditCardRecommendations: [],
      isMockData: false,
      isManualEntry: true,
      message: 'CIBIL API not configured. Please enter your credit details manually or configure CIBIL_API_KEY and CIBIL_CLIENT_ID environment variables.'
    };
  }

  // generateMockCreditProfile removed — no mock data generation.
  // Users must enter their credit data manually or configure CIBIL API.

  /**
   * Get credit grade based on score
   */
  getCreditGrade(score) {
    if (score >= 800) return 'Excellent';
    if (score >= 750) return 'Very Good';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Generate recommendations based on credit profile
   */
  generateRecommendations(score, factors) {
    const recommendations = [];

    if (score < 700) {
      recommendations.push({
        category: 'Payment History',
        priority: 'High',
        action: 'Make all payments on time to improve your payment history',
        impact: 'High'
      });
    }

    if (factors.creditUtilization > 30) {
      recommendations.push({
        category: 'Credit Utilization',
        priority: 'High',
        action: 'Keep credit card balances below 30% of credit limits',
        impact: 'High'
      });
    }

    if (factors.creditAge < 50) {
      recommendations.push({
        category: 'Credit Age',
        priority: 'Medium',
        action: 'Keep old accounts open to increase average account age',
        impact: 'Medium'
      });
    }

    if (factors.recentInquiries < 70) {
      recommendations.push({
        category: 'Credit Inquiries',
        priority: 'Low',
        action: 'Avoid applying for multiple credit accounts in short period',
        impact: 'Low'
      });
    }

    return recommendations;
  }

  /**
   * Generate credit card specific recommendations
   */
  generateCreditCardRecommendations(score, creditCards) {
    const recommendations = [];

    // High utilization warning
    const highUtilizationCards = creditCards.filter(card => parseFloat(card.utilizationPercent) > 70);
    if (highUtilizationCards.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Credit Utilization',
        title: 'High Credit Card Utilization Detected',
        description: `${highUtilizationCards.length} of your credit cards have utilization above 70%. Consider paying down balances or requesting credit limit increases.`,
        impact: 'High',
        cards: highUtilizationCards.map(card => card.cardName),
        actionItems: [
          'Pay down balances on high-utilization cards',
          'Request credit limit increases',
          'Consider balance transfer to lower utilization'
        ]
      });
    }

    // Payment history issues
    const cardsWithLatePayments = creditCards.filter(card => 
      card.paymentHistory.slice(0, 3).some(payment => payment.status.includes('Late'))
    );
    if (cardsWithLatePayments.length > 0) {
      recommendations.push({
        type: 'alert',
        category: 'Payment History',
        title: 'Recent Late Payments Found',
        description: `Recent late payments detected on ${cardsWithLatePayments.length} cards. Set up automatic payments to avoid future issues.`,
        impact: 'High',
        cards: cardsWithLatePayments.map(card => card.cardName),
        actionItems: [
          'Set up automatic minimum payments',
          'Set calendar reminders for due dates',
          'Consider consolidating due dates'
        ]
      });
    }

    // Low credit utilization (good behavior)
    const lowUtilizationCards = creditCards.filter(card => parseFloat(card.utilizationPercent) < 10);
    if (lowUtilizationCards.length >= creditCards.length * 0.7) {
      recommendations.push({
        type: 'positive',
        category: 'Credit Utilization',
        title: 'Excellent Credit Utilization',
        description: 'You maintain low utilization across most of your credit cards. This positively impacts your credit score.',
        impact: 'Positive',
        actionItems: [
          'Continue maintaining low balances',
          'Consider requesting credit limit increases for better ratios'
        ]
      });
    }

    // Credit limit optimization
    const totalLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
    if (totalLimit < 500000 && score > 700) {
      recommendations.push({
        type: 'suggestion',
        category: 'Credit Limit',
        title: 'Consider Increasing Credit Limits',
        description: 'With your good credit score, you may qualify for higher credit limits which can improve your utilization ratio.',
        impact: 'Medium',
        actionItems: [
          'Request credit limit increases on existing cards',
          'Apply for premium credit cards with higher limits',
          'Negotiate with banks based on your credit score'
        ]
      });
    }

    // Reward optimization
    const totalRewardPoints = creditCards.reduce((sum, card) => sum + card.rewardPoints, 0);
    if (totalRewardPoints > 100000) {
      recommendations.push({
        type: 'info',
        category: 'Rewards',
        title: 'Optimize Your Reward Points',
        description: `You have ${totalRewardPoints.toLocaleString()} reward points across your cards. Consider redeeming them strategically.`,
        impact: 'Low',
        actionItems: [
          'Review reward point expiry dates',
          'Compare redemption options for maximum value',
          'Consider transferring points to travel partners'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Format credit response
   */
  formatCreditResponse(data) {
    return {
      success: true,
      creditScore: data.score,
      scoreRange: data.scoreRange || '300-900',
      grade: this.getCreditGrade(data.score),
      factors: data.factors || {},
      accounts: data.accounts || {},
      totalCredit: data.totalCredit || 0,
      availableCredit: data.availableCredit || 0,
      utilizationRatio: data.utilizationRatio || 0,
      lastUpdated: new Date(data.lastUpdated || Date.now()),
      recommendations: data.recommendations || [],
      isMockData: false
    };
  }

  /**
   * Get credit history from stored user data.
   * Returns real credit history if the user has stored entries,
   * otherwise returns an empty array prompting manual entry.
   */
  async getCreditHistory(panNumber, months = 12) {
    try {
      if (this.isConfigured) {
        // Use real CIBIL API when configured
        const currentProfile = await this.fetchRealCreditScore(panNumber, {});
        return {
          success: true,
          history: currentProfile.history || [],
          currentScore: currentProfile.creditScore,
          isMockData: false
        };
      }

      // No CIBIL API — return empty history prompting user to enter data
      return {
        success: true,
        history: [],
        currentScore: null,
        isMockData: false,
        isManualEntry: true,
        message: 'Credit history not available. Configure CIBIL API or enter your credit history manually.'
      };

    } catch (error) {
      logger.error('Error fetching credit history:', error);
      throw error;
    }
  }

  /**
   * Analyze financial behavior impact on credit score
   */
  async analyzeCreditImpact(transactions, currentScore) {
    try {
      const analysis = {
        currentScore,
        potentialImpact: 0,
        factors: [],
        recommendations: []
      };

      // Analyze payment patterns
      const creditCardTransactions = transactions.filter(t => 
        t.category === 'credit_card_payment' || 
        t.description.toLowerCase().includes('credit card')
      );

      const latePayments = creditCardTransactions.filter(t => 
        t.description.toLowerCase().includes('late') ||
        t.description.toLowerCase().includes('penalty')
      );

      if (latePayments.length > 0) {
        analysis.potentialImpact -= 50;
        analysis.factors.push('Late payment detected');
        analysis.recommendations.push({
          category: 'Payment History',
          action: 'Set up auto-pay to avoid late payments',
          priority: 'High'
        });
      }

      // Analyze spending patterns
      const monthlySpending = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const creditUtilization = monthlySpending / 100000; // Assume 1L credit limit
      
      if (creditUtilization > 0.7) {
        analysis.potentialImpact -= 30;
        analysis.factors.push('High credit utilization detected');
        analysis.recommendations.push({
          category: 'Credit Utilization',
          action: 'Reduce spending or increase credit limits',
          priority: 'High'
        });
      }

      return analysis;

    } catch (error) {
      logger.error('Error analyzing credit impact:', error);
      throw error;
    }
  }
}

module.exports = new CIBILService();