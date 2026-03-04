// ============================================================================
// Transaction Enrichment Engine — AI-Powered Transaction Enhancement
// ============================================================================
// Automatically enriches raw transactions with:
//  - Smart category detection (Naive Bayes + rules)
//  - Merchant normalization & logo mapping
//  - Duplicate detection
//  - Recurring pattern identification
//  - Sentiment tagging (necessity vs luxury)
//  - Tax deductibility flagging
//  - Budget impact analysis
// ============================================================================

const Transaction = require('../../models/Transaction');
const logger = require('../../utils/logger');
const { getPipeline } = require('./selfLearningPipeline');

// ─── Merchant Normalization Rules ───────────────────────────────────
const MERCHANT_ALIASES = {
  'swiggy': { normalized: 'Swiggy', category: 'food', type: 'delivery' },
  'zomato': { normalized: 'Zomato', category: 'food', type: 'delivery' },
  'uber eats': { normalized: 'Uber Eats', category: 'food', type: 'delivery' },
  'uber': { normalized: 'Uber', category: 'transport', type: 'ride' },
  'ola': { normalized: 'Ola', category: 'transport', type: 'ride' },
  'rapido': { normalized: 'Rapido', category: 'transport', type: 'ride' },
  'amazon': { normalized: 'Amazon', category: 'shopping', type: 'ecommerce' },
  'flipkart': { normalized: 'Flipkart', category: 'shopping', type: 'ecommerce' },
  'myntra': { normalized: 'Myntra', category: 'shopping', type: 'fashion' },
  'meesho': { normalized: 'Meesho', category: 'shopping', type: 'ecommerce' },
  'netflix': { normalized: 'Netflix', category: 'entertainment', type: 'subscription' },
  'spotify': { normalized: 'Spotify', category: 'entertainment', type: 'subscription' },
  'hotstar': { normalized: 'Disney+ Hotstar', category: 'entertainment', type: 'subscription' },
  'youtube': { normalized: 'YouTube Premium', category: 'entertainment', type: 'subscription' },
  'jio': { normalized: 'Jio', category: 'utilities', type: 'telecom' },
  'airtel': { normalized: 'Airtel', category: 'utilities', type: 'telecom' },
  'vi ': { normalized: 'Vi (Vodafone Idea)', category: 'utilities', type: 'telecom' },
  'bsnl': { normalized: 'BSNL', category: 'utilities', type: 'telecom' },
  'zerodha': { normalized: 'Zerodha', category: 'investment', type: 'brokerage' },
  'groww': { normalized: 'Groww', category: 'investment', type: 'brokerage' },
  'gpay': { normalized: 'Google Pay', category: 'transfer', type: 'upi' },
  'phonepe': { normalized: 'PhonePe', category: 'transfer', type: 'upi' },
  'paytm': { normalized: 'Paytm', category: 'transfer', type: 'upi' },
  'hdfc': { normalized: 'HDFC Bank', category: 'banking', type: 'bank' },
  'icici': { normalized: 'ICICI Bank', category: 'banking', type: 'bank' },
  'sbi': { normalized: 'SBI', category: 'banking', type: 'bank' },
  'axis': { normalized: 'Axis Bank', category: 'banking', type: 'bank' },
  'kotak': { normalized: 'Kotak Mahindra Bank', category: 'banking', type: 'bank' },
  'bigbasket': { normalized: 'BigBasket', category: 'groceries', type: 'delivery' },
  'blinkit': { normalized: 'Blinkit', category: 'groceries', type: 'delivery' },
  'dunzo': { normalized: 'Dunzo', category: 'groceries', type: 'delivery' },
  'zepto': { normalized: 'Zepto', category: 'groceries', type: 'delivery' },
  'dmart': { normalized: 'DMart', category: 'groceries', type: 'retail' },
  'reliance': { normalized: 'Reliance', category: 'shopping', type: 'retail' },
  'dominos': { normalized: "Domino's", category: 'food', type: 'delivery' },
  'mcdonald': { normalized: "McDonald's", category: 'food', type: 'restaurant' },
  'kfc': { normalized: 'KFC', category: 'food', type: 'restaurant' },
  'starbucks': { normalized: 'Starbucks', category: 'food', type: 'cafe' },
  'irctc': { normalized: 'IRCTC', category: 'transport', type: 'railway' },
  'makemytrip': { normalized: 'MakeMyTrip', category: 'travel', type: 'booking' },
  'goibibo': { normalized: 'Goibibo', category: 'travel', type: 'booking' },
  'lic': { normalized: 'LIC', category: 'insurance', type: 'life' },
  'practo': { normalized: 'Practo', category: 'healthcare', type: 'consultation' },
  'pharmeasy': { normalized: 'PharmEasy', category: 'healthcare', type: 'pharmacy' },
  'apollo': { normalized: 'Apollo Pharmacy', category: 'healthcare', type: 'pharmacy' },
  'electricity': { normalized: 'Electricity Bill', category: 'utilities', type: 'power' },
  'water bill': { normalized: 'Water Bill', category: 'utilities', type: 'water' },
  'gas bill': { normalized: 'Gas Bill', category: 'utilities', type: 'gas' },
};

// ─── Necessity vs Luxury Classification ─────────────────────────────
const NECESSITY_MAP = {
  groceries: 'necessity',
  rent: 'necessity',
  utilities: 'necessity',
  healthcare: 'necessity',
  education: 'necessity',
  insurance: 'necessity',
  transport: 'mixed',
  food: 'mixed',
  shopping: 'luxury',
  entertainment: 'luxury',
  travel: 'luxury',
  gift: 'luxury',
  dining: 'luxury',
};

// ─── Tax Deductible Categories ──────────────────────────────────────
const TAX_DEDUCTIBLE = {
  insurance: { section: '80C/80D', limit: 150000 },
  investment: { section: '80C', limit: 150000 },
  education: { section: '80E', limit: null },
  healthcare: { section: '80D', limit: 75000 },
  rent: { section: 'HRA/80GG', limit: null },
  donation: { section: '80G', limit: null },
};

class TransactionEnrichmentEngine {
  /**
   * Enrich a single transaction with AI-powered metadata
   */
  async enrich(transaction, userId) {
    const desc = (transaction.description || '').toLowerCase();
    const enriched = { ...transaction };

    // 1. Merchant normalization
    const merchantInfo = this._normalizeMerchant(desc);
    if (merchantInfo) {
      enriched.merchantNormalized = merchantInfo.normalized;
      enriched.merchantType = merchantInfo.type;
      if (!enriched.category || enriched.category === 'other') {
        enriched.category = merchantInfo.category;
      }
    }

    // 2. AI categorization (if no category or 'other')
    if (!enriched.category || enriched.category === 'other' || enriched.category === 'uncategorized') {
      const pipeline = getPipeline(userId);
      const prediction = pipeline.categorize(desc, transaction.amount);
      if (prediction.confidence > 0.5) {
        enriched.category = prediction.label;
        enriched.categoryConfidence = prediction.confidence;
        enriched.categorizationMethod = 'ai';
      }
    }

    // 3. Necessity classification
    enriched.necessityType = NECESSITY_MAP[enriched.category?.toLowerCase()] || 'other';

    // 4. Tax deductibility
    const taxInfo = TAX_DEDUCTIBLE[enriched.category?.toLowerCase()];
    if (taxInfo && transaction.type === 'expense') {
      enriched.isTaxDeductible = true;
      enriched.taxSection = taxInfo.section;
      enriched.taxLimit = taxInfo.limit;
    } else {
      enriched.isTaxDeductible = false;
    }

    // 5. Anomaly check
    const pipeline = getPipeline(userId);
    const anomaly = pipeline.checkAnomaly({
      amount: transaction.amount,
      category: enriched.category,
    });
    if (anomaly.isAnomaly) {
      enriched.isAnomalous = true;
      enriched.anomalyScore = anomaly.zScore;
      enriched.anomalySeverity = anomaly.severity;
      enriched.anomalyMessage = anomaly.message;
    }

    // 6. Recurring detection
    enriched.isRecurring = this._detectRecurring(desc);

    // 7. Tags generation
    enriched.autoTags = this._generateTags(enriched);

    return enriched;
  }

  /**
   * Bulk enrich transactions
   */
  async enrichBatch(transactions, userId) {
    const results = [];
    for (const txn of transactions) {
      results.push(await this.enrich(txn, userId));
    }
    return results;
  }

  /**
   * Detect duplicate transactions
   */
  async detectDuplicates(userId, transaction) {
    const window = 3 * 24 * 60 * 60 * 1000; // 3 days
    const txnDate = new Date(transaction.date || Date.now());

    const candidates = await Transaction.find({
      userId,
      amount: transaction.amount,
      date: {
        $gte: new Date(txnDate.getTime() - window),
        $lte: new Date(txnDate.getTime() + window),
      },
    }).lean();

    const duplicates = candidates.filter(c => {
      const descSimilarity = this._stringSimilarity(
        (c.description || '').toLowerCase(),
        (transaction.description || '').toLowerCase()
      );
      return descSimilarity > 0.6 && c._id?.toString() !== transaction._id?.toString();
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      duplicates: duplicates.map(d => ({
        _id: d._id,
        amount: d.amount,
        description: d.description,
        date: d.date,
        similarity: this._stringSimilarity(
          (d.description || '').toLowerCase(),
          (transaction.description || '').toLowerCase()
        ),
      })),
    };
  }

  /**
   * Get enrichment analytics for a user
   */
  async getEnrichmentStats(userId) {
    const transactions = await Transaction.find({ userId }).limit(1000).lean();

    const stats = {
      total: transactions.length,
      categorized: transactions.filter(t => t.category && t.category !== 'other').length,
      uncategorized: transactions.filter(t => !t.category || t.category === 'other').length,
      aiCategorized: transactions.filter(t => t.categorizationMethod === 'ai').length,
      anomalous: transactions.filter(t => t.isAnomalous).length,
      recurring: transactions.filter(t => t.isRecurring).length,
      taxDeductible: transactions.filter(t => t.isTaxDeductible).length,
      necessityBreakdown: { necessity: 0, luxury: 0, mixed: 0, other: 0 },
      merchantCoverage: 0,
    };

    transactions.forEach(t => {
      const necessity = t.necessityType || NECESSITY_MAP[t.category?.toLowerCase()] || 'other';
      stats.necessityBreakdown[necessity] = (stats.necessityBreakdown[necessity] || 0) + 1;
    });

    const withMerchant = transactions.filter(t => t.merchantNormalized);
    stats.merchantCoverage = transactions.length > 0
      ? Math.round(withMerchant.length / transactions.length * 100)
      : 0;

    stats.categorizationRate = transactions.length > 0
      ? Math.round(stats.categorized / transactions.length * 100)
      : 0;

    return stats;
  }

  // ─── Private helpers ────────────────────────────────────────────
  _normalizeMerchant(description) {
    for (const [key, info] of Object.entries(MERCHANT_ALIASES)) {
      if (description.includes(key)) return info;
    }
    return null;
  }

  _detectRecurring(description) {
    const recurringKeywords = [
      'subscription', 'monthly', 'recurring', 'emi', 'premium',
      'rent', 'salary', 'sip', 'insurance', 'membership',
      'netflix', 'spotify', 'hotstar', 'youtube', 'gym',
      'electricity', 'water', 'gas', 'internet', 'mobile',
    ];
    return recurringKeywords.some(kw => description.includes(kw));
  }

  _generateTags(transaction) {
    const tags = [];
    if (transaction.category) tags.push(transaction.category);
    if (transaction.necessityType) tags.push(transaction.necessityType);
    if (transaction.isRecurring) tags.push('recurring');
    if (transaction.isTaxDeductible) tags.push('tax-deductible');
    if (transaction.isAnomalous) tags.push('anomaly');
    if (transaction.merchantType) tags.push(transaction.merchantType);
    if ((transaction.amount || 0) > 10000) tags.push('high-value');
    return [...new Set(tags)];
  }

  _stringSimilarity(a, b) {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;

    // Simple Levenshtein-based similarity
    const matrix = [];
    for (let i = 0; i <= shorter.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= longer.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        if (shorter[i - 1] === longer[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return 1 - matrix[shorter.length][longer.length] / longer.length;
  }
}

module.exports = new TransactionEnrichmentEngine();
