// ============================================================================
// TAX HARVESTING ENGINE — Smart Tax-Loss/Gain Harvesting
// ============================================================================
// Identifies tax-loss harvesting opportunities, calculates capital gains
// across short-term and long-term periods, optimizes asset sales for
// tax efficiency, and generates tax-saving strategies. Indian tax rules.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);

// ============================================================================
// §1  INDIAN CAPITAL GAINS TAX CALCULATOR
// ============================================================================

class IndianCapitalGainsTax {
  constructor() {
    // FY 2025-26 rates (Budget 2024 rates)
    this.rates = {
      equity: {
        shortTerm: { rate: 0.20, holdingPeriod: 12 },   // <12 months = 20% STCG
        longTerm: { rate: 0.125, holdingPeriod: 12, exemption: 125000 }  // >12 months = 12.5% LTCG with ₹1.25L exemption
      },
      debt: {
        shortTerm: { rate: null, holdingPeriod: 36 },    // <36 months = slab rate
        longTerm: { rate: 0.20, holdingPeriod: 36, indexation: true }  // >36 months = 20% with indexation
      },
      gold: {
        shortTerm: { rate: null, holdingPeriod: 36 },
        longTerm: { rate: 0.20, holdingPeriod: 36, indexation: true }
      },
      realEstate: {
        shortTerm: { rate: null, holdingPeriod: 24 },
        longTerm: { rate: 0.125, holdingPeriod: 24, exemption: 0 }  // 12.5% without indexation from FY25
      }
    };

    // Cost Inflation Index
    this.cii = {
      '2014-15': 240, '2015-16': 254, '2016-17': 264, '2017-18': 272,
      '2018-19': 280, '2019-20': 289, '2020-21': 301, '2021-22': 317,
      '2022-23': 331, '2023-24': 348, '2024-25': 363, '2025-26': 380
    };
  }

  calculateGains(investment) {
    const {
      assetType = 'equity',
      purchaseDate, sellDate, purchasePrice, sellPrice,
      quantity = 1, purchaseFY, currentFY = '2025-26'
    } = investment;

    const buyDate = new Date(purchaseDate || Date.now());
    const saleDate = new Date(sellDate || Date.now());
    const holdingDays = Math.max(0, (saleDate - buyDate) / (1000 * 60 * 60 * 24));
    const holdingMonths = holdingDays / 30;

    const rates = this.rates[assetType] || this.rates.equity;
    const isLongTerm = holdingMonths >= rates.longTerm.holdingPeriod;

    const totalPurchase = purchasePrice * quantity;
    const totalSale = sellPrice * quantity;
    const rawGain = totalSale - totalPurchase;

    let taxableGain = rawGain;
    let indexedCost = totalPurchase;
    let taxRate = 0;
    let exemption = 0;

    if (isLongTerm) {
      // Apply indexation for debt/gold
      if (rates.longTerm.indexation && purchaseFY && this.cii[purchaseFY] && this.cii[currentFY]) {
        indexedCost = totalPurchase * (this.cii[currentFY] / this.cii[purchaseFY]);
        taxableGain = totalSale - indexedCost;
      }

      // Apply exemption
      exemption = rates.longTerm.exemption || 0;
      taxableGain = Math.max(0, taxableGain - exemption);
      taxRate = rates.longTerm.rate || 0;
    } else {
      taxRate = rates.shortTerm.rate || 0.30; // Slab rate approximation
    }

    const taxAmount = Math.max(0, taxableGain * taxRate);
    const cessAndSurcharge = taxAmount * 0.04; // 4% cess
    const totalTax = taxAmount + cessAndSurcharge;

    return {
      assetType,
      purchasePrice: totalPurchase,
      sellPrice: totalSale,
      rawGain,
      indexedCost: Math.round(indexedCost),
      taxableGain: Math.round(taxableGain),
      isLongTerm,
      holdingMonths: Math.round(holdingMonths),
      taxRate: (taxRate * 100).toFixed(1) + '%',
      exemptionUsed: exemption,
      taxAmount: Math.round(taxAmount),
      cess: Math.round(cessAndSurcharge),
      totalTax: Math.round(totalTax),
      effectiveTaxRate: totalSale > totalPurchase
        ? ((totalTax / (totalSale - totalPurchase)) * 100).toFixed(1) + '%'
        : '0%',
      netGainAfterTax: Math.round(rawGain - totalTax)
    };
  }

  calculateBulkGains(investments) {
    const results = investments.map(inv => this.calculateGains(inv));

    const stcg = results.filter(r => !r.isLongTerm);
    const ltcg = results.filter(r => r.isLongTerm);

    return {
      investments: results,
      summary: {
        totalSTCG: sum(stcg.map(r => r.taxableGain)),
        totalLTCG: sum(ltcg.map(r => r.taxableGain)),
        totalSTCGTax: sum(stcg.map(r => r.totalTax)),
        totalLTCGTax: sum(ltcg.map(r => r.totalTax)),
        totalTax: sum(results.map(r => r.totalTax)),
        totalNetGain: sum(results.map(r => r.netGainAfterTax)),
        stcgCount: stcg.length,
        ltcgCount: ltcg.length
      }
    };
  }
}

// ============================================================================
// §2  TAX-LOSS HARVESTING ANALYZER
// ============================================================================

class TaxLossHarvester {
  constructor() {
    this.taxCalc = new IndianCapitalGainsTax();
  }

  findOpportunities(portfolio) {
    const opportunities = [];
    let totalPotentialSavings = 0;

    for (const holding of portfolio) {
      const {
        name, assetType = 'equity', purchaseDate, purchasePrice,
        currentPrice, quantity = 1, purchaseFY
      } = holding;

      const unrealizedGain = (currentPrice - purchasePrice) * quantity;
      const unrealizedPercent = purchasePrice > 0
        ? ((currentPrice - purchasePrice) / purchasePrice) * 100
        : 0;

      // Only consider losses for harvesting
      if (unrealizedGain >= 0) continue;

      const loss = Math.abs(unrealizedGain);
      const buyDate = new Date(purchaseDate || Date.now());
      const holdingDays = (Date.now() - buyDate.getTime()) / (1000 * 60 * 60 * 24);
      const holdingMonths = holdingDays / 30;

      // Calculate potential tax savings
      const rates = this.taxCalc.rates[assetType] || this.taxCalc.rates.equity;
      const isLongTerm = holdingMonths >= rates.longTerm.holdingPeriod;

      const taxRate = isLongTerm
        ? (rates.longTerm.rate || 0.125)
        : (rates.shortTerm.rate || 0.20);

      const potentialSavings = loss * taxRate;

      // Determine if harvesting makes sense
      const harvestScore = this._scoreOpportunity(holding, loss, potentialSavings, holdingMonths);

      if (harvestScore > 30) {
        opportunities.push({
          name,
          assetType,
          purchasePrice: purchasePrice * quantity,
          currentValue: currentPrice * quantity,
          unrealizedLoss: Math.round(loss),
          unrealizedPercent: unrealizedPercent.toFixed(1) + '%',
          holdingMonths: Math.round(holdingMonths),
          isLongTerm,
          applicableTaxRate: (taxRate * 100).toFixed(1) + '%',
          potentialTaxSavings: Math.round(potentialSavings),
          harvestScore,
          recommendation: this._getRecommendation(harvestScore, isLongTerm, loss, holdingMonths),
          washSaleWarning: 'Reinvest after 30+ days to avoid wash sale concerns',
          alternativeInvestment: this._suggestAlternative(assetType, name)
        });

        totalPotentialSavings += potentialSavings;
      }
    }

    opportunities.sort((a, b) => b.potentialTaxSavings - a.potentialTaxSavings);

    return {
      opportunities,
      totalPotentialSavings: Math.round(totalPotentialSavings),
      opportunityCount: opportunities.length,
      bestOpportunity: opportunities[0] || null,
      strategy: this._overallStrategy(opportunities, totalPotentialSavings),
      timing: this._timingAdvice()
    };
  }

  _scoreOpportunity(holding, loss, savings, holdingMonths) {
    let score = 0;

    // Higher loss = higher score
    score += Math.min(40, loss / 5000);

    // Higher savings = higher score
    score += Math.min(30, savings / 2000);

    // Recent purchase with loss = better candidate
    if (holdingMonths < 12) score += 15;
    else if (holdingMonths < 24) score += 10;
    else score += 5;

    // Deeper percentage loss = higher priority
    const lossPct = Math.abs(holding.currentPrice - holding.purchasePrice) / (holding.purchasePrice || 1);
    if (lossPct > 0.20) score += 15;
    else if (lossPct > 0.10) score += 10;

    return Math.min(100, score);
  }

  _getRecommendation(score, isLongTerm, loss, months) {
    if (score >= 70) {
      return `Strong harvest candidate. Sell to realize ₹${loss.toLocaleString()} loss and offset gains.`;
    }
    if (score >= 50) {
      return `Consider harvesting. ${isLongTerm ? 'Long-term' : 'Short-term'} loss of ₹${loss.toLocaleString()} can offset respective gains.`;
    }
    return `Monitor. Small loss of ₹${loss.toLocaleString()} — may recover. Review in ${Math.max(1, 3 - Math.floor(months / 12))} months.`;
  }

  _suggestAlternative(assetType, name) {
    const alternatives = {
      equity: 'Similar index fund or ETF (e.g., different AMC\'s Nifty 50 fund)',
      debt: 'Similar duration debt fund from different AMC',
      gold: 'Gold ETF ↔ Sovereign Gold Bond (different instrument)',
      default: 'Comparable fund from different AMC to maintain asset allocation'
    };
    return alternatives[assetType] || alternatives.default;
  }

  _overallStrategy(opportunities, totalSavings) {
    if (opportunities.length === 0) {
      return 'No tax-loss harvesting opportunities currently. Portfolio is in gains — consider booking partial profits for tax-efficient rebalancing.';
    }
    if (totalSavings > 50000) {
      return `Significant harvesting opportunity: ₹${totalSavings.toLocaleString()} in potential tax savings across ${opportunities.length} holdings. Consider executing before financial year end.`;
    }
    return `Minor harvesting opportunity: ₹${totalSavings.toLocaleString()} savings. Execute if rebalancing portfolio anyway.`;
  }

  _timingAdvice() {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed

    if (month >= 0 && month <= 2) {
      return {
        urgency: 'high',
        message: 'FY end approaching (March 31). Last chance to harvest losses for this financial year!'
      };
    }
    if (month >= 3 && month <= 5) {
      return {
        urgency: 'low',
        message: 'Start of new FY. Good time to plan harvesting strategy for the year.'
      };
    }
    if (month >= 9 && month <= 11) {
      return {
        urgency: 'medium',
        message: 'Q3/Q4 — review portfolio for year-end tax planning.'
      };
    }
    return {
      urgency: 'low',
      message: 'Mid-year. Monitor positions and prepare for year-end harvesting.'
    };
  }
}

// ============================================================================
// §3  TAX-GAIN HARVESTING — Utilize LTCG Exemption
// ============================================================================

class TaxGainHarvester {
  constructor() {
    this.taxCalc = new IndianCapitalGainsTax();
    this.ltcgExemption = 125000; // ₹1.25L exemption per year
  }

  findGainHarvestingOpportunities(portfolio, usedExemption = 0) {
    const remainingExemption = Math.max(0, this.ltcgExemption - usedExemption);

    if (remainingExemption <= 0) {
      return {
        opportunities: [],
        message: 'LTCG exemption already fully utilized this year.',
        remainingExemption: 0
      };
    }

    const candidates = [];

    for (const holding of portfolio) {
      const {
        name, assetType = 'equity', purchaseDate,
        purchasePrice, currentPrice, quantity = 1
      } = holding;

      const unrealizedGain = (currentPrice - purchasePrice) * quantity;
      if (unrealizedGain <= 0) continue;

      const holdingMonths = (Date.now() - new Date(purchaseDate || Date.now()).getTime()) / (30 * 86400000);

      // Only equity LTCG gets the exemption
      if (assetType !== 'equity' || holdingMonths < 12) continue;

      // Calculate how much to sell to use exemption
      const gainPerUnit = currentPrice - purchasePrice;
      const unitsToSell = gainPerUnit > 0
        ? Math.min(quantity, Math.floor(remainingExemption / gainPerUnit))
        : 0;

      if (unitsToSell <= 0) continue;

      const gainFromSale = unitsToSell * gainPerUnit;
      const taxSaved = Math.min(gainFromSale, remainingExemption) * 0.125; // 12.5% LTCG saved

      candidates.push({
        name,
        holdingMonths: Math.round(holdingMonths),
        totalGain: Math.round(unrealizedGain),
        gainPercent: ((unrealizedGain / (purchasePrice * quantity)) * 100).toFixed(1) + '%',
        unitsToSell,
        totalUnits: quantity,
        gainFromPartialSale: Math.round(gainFromSale),
        taxSaved: Math.round(taxSaved),
        action: `Sell ${unitsToSell} units of ${name} to realize ₹${gainFromSale.toLocaleString()} gain tax-free`,
        rebuyNote: 'Can repurchase immediately (no wash sale rule for gain harvesting in India)'
      });
    }

    candidates.sort((a, b) => b.taxSaved - a.taxSaved);

    return {
      opportunities: candidates,
      remainingExemption,
      totalTaxSavable: sum(candidates.map(c => c.taxSaved)),
      strategy: remainingExemption >= this.ltcgExemption
        ? `You have ₹${remainingExemption.toLocaleString()} of unused LTCG exemption. Book tax-free gains before March 31!`
        : `₹${remainingExemption.toLocaleString()} exemption remaining. Optimize by partially selling gainful equity holdings.`,
      yearEndReminder: 'LTCG exemption resets on April 1. Use it or lose it!'
    };
  }
}

// ============================================================================
// §4  UNIFIED TAX HARVESTING SERVICE
// ============================================================================

class TaxHarvestingService {
  constructor() {
    this.taxCalc = new IndianCapitalGainsTax();
    this.lossHarvester = new TaxLossHarvester();
    this.gainHarvester = new TaxGainHarvester();
  }

  analyze(portfolio, config = {}) {
    const {
      usedLTCGExemption = 0,
      otherCapitalGains = 0,
      taxSlab = 0.30
    } = config;

    // Capital gains calculation
    const gainsAnalysis = this.taxCalc.calculateBulkGains(
      portfolio.filter(h => h.sellDate).map(h => ({
        assetType: h.assetType || 'equity',
        purchaseDate: h.purchaseDate,
        sellDate: h.sellDate,
        purchasePrice: h.purchasePrice,
        sellPrice: h.sellPrice || h.currentPrice,
        quantity: h.quantity || 1,
        purchaseFY: h.purchaseFY
      }))
    );

    // Tax-loss harvesting opportunities
    const lossOpportunities = this.lossHarvester.findOpportunities(
      portfolio.filter(h => !h.sellDate && h.currentPrice < h.purchasePrice)
    );

    // Tax-gain harvesting opportunities
    const gainOpportunities = this.gainHarvester.findGainHarvestingOpportunities(
      portfolio.filter(h => !h.sellDate && h.currentPrice > h.purchasePrice),
      usedLTCGExemption
    );

    // Overall tax optimization summary
    const totalPotentialSavings = (lossOpportunities.totalPotentialSavings || 0) +
      (gainOpportunities.totalTaxSavable || 0);

    return {
      capitalGains: gainsAnalysis,
      lossHarvesting: lossOpportunities,
      gainHarvesting: gainOpportunities,
      totalPotentialSavings,
      taxOptimizationScore: this._calculateOptimizationScore(lossOpportunities, gainOpportunities, usedLTCGExemption),
      actionPlan: this._generateActionPlan(lossOpportunities, gainOpportunities),
      timing: lossOpportunities.timing,
      generatedAt: new Date()
    };
  }

  _calculateOptimizationScore(loss, gain, usedExemption) {
    let score = 50;

    // Using LTCG exemption is good
    if (usedExemption >= 100000) score += 20;
    else if (usedExemption > 0) score += 10;

    // Having actionable opportunities (and acting on them) is important
    if (loss.opportunities.length > 0) score -= 15; // Opportunities not yet taken
    if (gain.opportunities.length > 0 && gain.remainingExemption > 50000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  _generateActionPlan(loss, gain) {
    const steps = [];

    if (gain.opportunities.length > 0 && gain.remainingExemption > 0) {
      steps.push({
        priority: 1,
        action: 'Book tax-free LTCG',
        detail: `Sell equity with ₹${gain.remainingExemption.toLocaleString()} in gains to use LTCG exemption. Repurchase same day.`,
        savings: gain.totalTaxSavable
      });
    }

    if (loss.opportunities.length > 0) {
      steps.push({
        priority: 2,
        action: 'Harvest tax losses',
        detail: `Sell ${loss.opportunityCount} losing positions to offset ₹${loss.totalPotentialSavings.toLocaleString()} in capital gains tax.`,
        savings: loss.totalPotentialSavings
      });
    }

    if (steps.length === 0) {
      steps.push({
        priority: 3,
        action: 'No immediate action needed',
        detail: 'Portfolio is tax-optimized. Review again before March 31.',
        savings: 0
      });
    }

    return steps;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  IndianCapitalGainsTax,
  TaxLossHarvester,
  TaxGainHarvester,
  TaxHarvestingService
};
