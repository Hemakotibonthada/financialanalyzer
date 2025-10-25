/**
 * EMI Analytics Service
 * Provides analytics, calculations, and insights for EMI data
 */

const EMI = require('../models/EMI');
const logger = require('../utils/logger');

class EMIAnalyticsService {
  /**
   * Get comprehensive EMI overview for a user
   */
  async getEMIOverview(userId) {
    try {
      const activeEMIs = await EMI.find({
        userId,
        status: 'active',
        remainingInstallments: { $gt: 0 }
      }).sort({ nextDueDate: 1 });

      const completedEMIs = await EMI.find({
        userId,
        status: 'completed'
      });

      // Calculate totals
      const totalActiveEMIs = activeEMIs.length;
      const totalCompletedEMIs = completedEMIs.length;
      
      const totalOutstanding = activeEMIs.reduce((sum, emi) => {
        return sum + (emi.emiAmount * emi.remainingInstallments);
      }, 0);

      const totalPrincipalOutstanding = activeEMIs.reduce((sum, emi) => {
        const totalPrincipal = emi.principalAmount;
        const principalPerEMI = totalPrincipal / emi.totalTenure;
        return sum + (principalPerEMI * emi.remainingInstallments);
      }, 0);

      const totalInterestOutstanding = totalOutstanding - totalPrincipalOutstanding;

      const monthlyBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);

      const totalAmountPaid = completedEMIs.reduce((sum, emi) => {
        return sum + (emi.emiAmount * emi.totalTenure);
      }, 0) + activeEMIs.reduce((sum, emi) => {
        return sum + (emi.emiAmount * emi.paidInstallments);
      }, 0);

      return {
        overview: {
          totalActiveEMIs,
          totalCompletedEMIs,
          totalOutstanding,
          totalPrincipalOutstanding,
          totalInterestOutstanding,
          monthlyBurden,
          totalAmountPaid
        },
        activeEMIs: activeEMIs.map(emi => this.formatEMIData(emi)),
        completedEMIs: completedEMIs.map(emi => this.formatEMIData(emi))
      };
    } catch (error) {
      logger.error('Error getting EMI overview:', error);
      throw error;
    }
  }

  /**
   * Get upcoming EMI payments for specified period
   */
  async getUpcomingPayments(userId, months = 12) {
    try {
      const currentDate = new Date();
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + months);

      const activeEMIs = await EMI.find({
        userId,
        status: 'active',
        remainingInstallments: { $gt: 0 }
      }).sort({ nextDueDate: 1 });

      const upcomingPayments = [];
      const monthlyBreakdown = {};

      // Initialize monthly breakdown
      for (let i = 0; i < months; i++) {
        const month = new Date(currentDate);
        month.setMonth(month.getMonth() + i);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        monthlyBreakdown[monthKey] = {
          month: month.getMonth() + 1,
          year: month.getFullYear(),
          totalAmount: 0,
          emiCount: 0,
          emis: []
        };
      }

      // Calculate upcoming payments for each EMI
      for (const emi of activeEMIs) {
        const emiUpcoming = emi.getUpcomingPayments(months);
        
        for (const payment of emiUpcoming) {
          const dueDate = new Date(payment.dueDate);
          const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
          
          const paymentData = {
            emiId: emi._id,
            merchantName: emi.merchantName,
            cardProvider: emi.cardProvider,
            cardLastFourDigits: emi.cardLastFourDigits,
            amount: payment.amount,
            dueDate: payment.dueDate,
            installmentNumber: payment.installmentNumber,
            totalTenure: emi.totalTenure,
            status: payment.status,
            interestRate: emi.interestRate
          };

          upcomingPayments.push(paymentData);

          // Add to monthly breakdown
          if (monthlyBreakdown[monthKey]) {
            monthlyBreakdown[monthKey].totalAmount += payment.amount;
            monthlyBreakdown[monthKey].emiCount++;
            monthlyBreakdown[monthKey].emis.push(paymentData);
          }
        }
      }

      return {
        upcomingPayments: upcomingPayments.sort((a, b) => 
          new Date(a.dueDate) - new Date(b.dueDate)
        ),
        monthlyBreakdown: Object.values(monthlyBreakdown).sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        })
      };
    } catch (error) {
      logger.error('Error getting upcoming payments:', error);
      throw error;
    }
  }

  /**
   * Get EMI distribution by card provider
   */
  async getEMIsByProvider(userId) {
    try {
      const activeEMIs = await EMI.find({
        userId,
        status: 'active'
      });

      const byProvider = {};

      for (const emi of activeEMIs) {
        const provider = emi.cardProvider;
        
        if (!byProvider[provider]) {
          byProvider[provider] = {
            provider,
            count: 0,
            totalOutstanding: 0,
            monthlyBurden: 0,
            emis: []
          };
        }

        byProvider[provider].count++;
        byProvider[provider].totalOutstanding += emi.emiAmount * emi.remainingInstallments;
        byProvider[provider].monthlyBurden += emi.emiAmount;
        byProvider[provider].emis.push(this.formatEMIData(emi));
      }

      return Object.values(byProvider).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    } catch (error) {
      logger.error('Error getting EMIs by provider:', error);
      throw error;
    }
  }

  /**
   * Get EMI distribution by merchant/category
   */
  async getEMIsByMerchant(userId) {
    try {
      const activeEMIs = await EMI.find({
        userId,
        status: 'active'
      });

      const byMerchant = {};

      for (const emi of activeEMIs) {
        const merchant = emi.merchantName;
        
        if (!byMerchant[merchant]) {
          byMerchant[merchant] = {
            merchant,
            count: 0,
            totalOutstanding: 0,
            monthlyBurden: 0,
            emis: []
          };
        }

        byMerchant[merchant].count++;
        byMerchant[merchant].totalOutstanding += emi.emiAmount * emi.remainingInstallments;
        byMerchant[merchant].monthlyBurden += emi.emiAmount;
        byMerchant[merchant].emis.push(this.formatEMIData(emi));
      }

      return Object.values(byMerchant).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    } catch (error) {
      logger.error('Error getting EMIs by merchant:', error);
      throw error;
    }
  }

  /**
   * Get EMI timeline/calendar view
   */
  async getEMITimeline(userId, startDate = null, endDate = null) {
    try {
      if (!startDate) {
        startDate = new Date();
      }
      
      if (!endDate) {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const activeEMIs = await EMI.find({
        userId,
        status: 'active',
        $or: [
          { startDate: { $lte: endDate } },
          { endDate: { $gte: startDate } }
        ]
      });

      const timeline = [];

      for (const emi of activeEMIs) {
        // Calculate all installments within the date range
        const installmentStart = Math.max(0, emi.paidInstallments);
        const installmentEnd = Math.min(
          emi.totalTenure,
          emi.paidInstallments + Math.ceil((endDate - startDate) / (30 * 24 * 60 * 60 * 1000))
        );

        for (let i = installmentStart; i < installmentEnd; i++) {
          const dueDate = new Date(emi.startDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);

          if (dueDate >= startDate && dueDate <= endDate) {
            timeline.push({
              emiId: emi._id,
              merchantName: emi.merchantName,
              cardProvider: emi.cardProvider,
              amount: emi.emiAmount,
              dueDate,
              installmentNumber: i + 1,
              totalTenure: emi.totalTenure,
              status: i < emi.paidInstallments ? 'paid' : 'upcoming'
            });
          }
        }
      }

      return timeline.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } catch (error) {
      logger.error('Error getting EMI timeline:', error);
      throw error;
    }
  }

  /**
   * Get statistics for charts
   */
  async getChartData(userId) {
    try {
      const activeEMIs = await EMI.find({
        userId,
        status: 'active'
      });

      // Pie chart data - Distribution by provider
      const providerData = {};
      activeEMIs.forEach(emi => {
        const provider = emi.cardProvider;
        providerData[provider] = (providerData[provider] || 0) + (emi.emiAmount * emi.remainingInstallments);
      });

      const pieChartData = Object.entries(providerData).map(([name, value]) => ({
        name,
        value: Math.round(value)
      }));

      // Bar chart data - Monthly burden for next 12 months
      const upcomingData = await this.getUpcomingPayments(userId, 12);
      const barChartData = upcomingData.monthlyBreakdown.map(month => ({
        month: `${this.getMonthName(month.month)} ${month.year}`,
        amount: Math.round(month.totalAmount),
        count: month.emiCount
      }));

      // Line chart data - EMI completion timeline
      const lineChartData = activeEMIs.map(emi => {
        const monthsRemaining = emi.remainingInstallments;
        const completionDate = new Date(emi.nextDueDate);
        completionDate.setMonth(completionDate.getMonth() + monthsRemaining - 1);
        
        return {
          name: emi.merchantName.substring(0, 20),
          startDate: emi.startDate,
          endDate: completionDate,
          progress: emi.completionPercentage,
          remaining: emi.remainingAmount
        };
      }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

      // Stacked bar chart - Principal vs Interest
      const stackedData = activeEMIs.map(emi => {
        const totalAmount = emi.emiAmount * emi.remainingInstallments;
        const principalAmount = emi.principalAmount * (emi.remainingInstallments / emi.totalTenure);
        const interestAmount = totalAmount - principalAmount;
        
        return {
          name: `${emi.cardProvider} ${emi.cardLastFourDigits}`,
          principal: Math.round(principalAmount),
          interest: Math.round(interestAmount),
          total: Math.round(totalAmount)
        };
      });

      // Merchant comparison data
      const merchantData = {};
      activeEMIs.forEach(emi => {
        const merchant = emi.merchantName;
        if (!merchantData[merchant]) {
          merchantData[merchant] = {
            name: merchant,
            totalAmount: 0,
            emiCount: 0,
            avgInterestRate: 0,
            totalInterestRates: 0
          };
        }
        merchantData[merchant].totalAmount += emi.emiAmount * emi.remainingInstallments;
        merchantData[merchant].emiCount += 1;
        merchantData[merchant].totalInterestRates += emi.interestRate || 0;
        merchantData[merchant].avgInterestRate = merchantData[merchant].totalInterestRates / merchantData[merchant].emiCount;
      });

      const merchantChartData = Object.values(merchantData)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map(m => ({
          name: m.name.substring(0, 20),
          amount: Math.round(m.totalAmount),
          count: m.emiCount,
          rate: parseFloat(m.avgInterestRate.toFixed(2))
        }));

      // Interest rate distribution
      const rateDistribution = activeEMIs.reduce((acc, emi) => {
        const rate = Math.floor(emi.interestRate || 0);
        const rateRange = `${rate}-${rate + 1}%`;
        acc[rateRange] = (acc[rateRange] || 0) + 1;
        return acc;
      }, {});

      const rateDistributionData = Object.entries(rateDistribution).map(([range, count]) => ({
        range,
        count
      }));

      return {
        pieChart: pieChartData,
        barChart: barChartData,
        lineChart: lineChartData,
        stackedBarChart: stackedData,
        merchantChart: merchantChartData,
        rateDistribution: rateDistributionData
      };
    } catch (error) {
      logger.error('Error getting chart data:', error);
      throw error;
    }
  }

  /**
   * Calculate potential savings with foreclosure
   */
  async calculateForeclosureSavings(userId, emiId) {
    try {
      const emi = await EMI.findOne({ _id: emiId, userId });
      
      if (!emi) {
        throw new Error('EMI not found');
      }

      const remainingAmount = emi.emiAmount * emi.remainingInstallments;
      const principalRemaining = emi.principalAmount * (emi.remainingInstallments / emi.totalTenure);
      const interestRemaining = remainingAmount - principalRemaining;
      
      // Typical foreclosure charges: 2-5% of outstanding principal
      const foreclosureCharge = principalRemaining * 0.03;
      const totalForeclosureAmount = principalRemaining + foreclosureCharge;
      
      const savings = remainingAmount - totalForeclosureAmount;
      const savingsPercentage = (savings / remainingAmount) * 100;

      return {
        emiDetails: {
          merchantName: emi.merchantName,
          cardProvider: emi.cardProvider,
          remainingInstallments: emi.remainingInstallments,
          emiAmount: emi.emiAmount
        },
        currentScenario: {
          totalRemaining: remainingAmount,
          principalRemaining,
          interestRemaining
        },
        foreclosureScenario: {
          principalAmount: principalRemaining,
          foreclosureCharge,
          totalAmount: totalForeclosureAmount
        },
        savings: {
          amount: savings,
          percentage: savingsPercentage
        },
        recommendation: savings > 0 ? 'Foreclosure recommended' : 'Continue with EMI'
      };
    } catch (error) {
      logger.error('Error calculating foreclosure savings:', error);
      throw error;
    }
  }

  /**
   * Get EMI insights and recommendations
   */
  async getEMIInsights(userId) {
    try {
      const activeEMIs = await EMI.find({
        userId,
        status: 'active'
      }).sort({ interestRate: -1 });

      const insights = [];

      // High interest rate EMIs
      const highInterestEMIs = activeEMIs.filter(emi => emi.interestRate > 15);
      if (highInterestEMIs.length > 0) {
        insights.push({
          type: 'high_interest',
          severity: 'warning',
          title: 'High Interest EMIs Detected',
          description: `You have ${highInterestEMIs.length} EMI(s) with interest rate above 15%. Consider foreclosure to save on interest.`,
          emis: highInterestEMIs.map(emi => emi._id),
          action: 'Review and consider foreclosure'
        });
      }

      // High monthly burden
      const monthlyBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      if (monthlyBurden > 50000) {
        insights.push({
          type: 'high_burden',
          severity: 'info',
          title: 'High Monthly EMI Burden',
          description: `Your monthly EMI burden is ₹${monthlyBurden.toLocaleString('en-IN')}. Consider consolidating EMIs for better cash flow.`,
          action: 'Consider debt consolidation'
        });
      }

      // Near completion EMIs
      const nearCompletionEMIs = activeEMIs.filter(emi => emi.remainingInstallments <= 3);
      if (nearCompletionEMIs.length > 0) {
        insights.push({
          type: 'near_completion',
          severity: 'success',
          title: 'EMIs Nearing Completion',
          description: `${nearCompletionEMIs.length} EMI(s) will be completed in the next 3 months. Your monthly burden will reduce by ₹${nearCompletionEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0).toLocaleString('en-IN')}.`,
          emis: nearCompletionEMIs.map(emi => emi._id),
          action: 'Plan for increased cash flow'
        });
      }

      // Multiple EMIs from same provider
      const providerCounts = {};
      activeEMIs.forEach(emi => {
        providerCounts[emi.cardProvider] = (providerCounts[emi.cardProvider] || 0) + 1;
      });
      
      Object.entries(providerCounts).forEach(([provider, count]) => {
        if (count >= 3) {
          insights.push({
            type: 'multiple_emis',
            severity: 'info',
            title: `Multiple EMIs with ${provider}`,
            description: `You have ${count} active EMIs with ${provider}. Contact them for potential consolidation offers.`,
            action: 'Check for consolidation options'
          });
        }
      });

      return insights;
    } catch (error) {
      logger.error('Error getting EMI insights:', error);
      throw error;
    }
  }

  /**
   * Format EMI data for API response
   */
  formatEMIData(emi) {
    return {
      id: emi._id,
      merchantName: emi.merchantName,
      productDescription: emi.productDescription,
      cardProvider: emi.cardProvider,
      cardLastFourDigits: emi.cardLastFourDigits,
      emiAmount: emi.emiAmount,
      totalTenure: emi.totalTenure,
      paidInstallments: emi.paidInstallments,
      remainingInstallments: emi.remainingInstallments,
      remainingAmount: emi.remainingAmount,
      completionPercentage: emi.completionPercentage,
      interestRate: emi.interestRate,
      principalAmount: emi.principalAmount,
      nextDueDate: emi.nextDueDate,
      startDate: emi.startDate,
      endDate: emi.endDate,
      status: emi.status,
      createdAt: emi.createdAt
    };
  }

  /**
   * Helper to get month name
   */
  getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }
}

module.exports = EMIAnalyticsService;
