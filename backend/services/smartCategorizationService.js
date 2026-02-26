// ============================================================
// Financial Analyzer - Smart Categorization Service
// Feature #89: AI-powered transaction categorization engine
// ============================================================

const Transaction = require('../models/Transaction');

// Category definitions with keywords and patterns
const CATEGORY_RULES = {
  'Groceries': {
    keywords: ['grocery', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'reliance fresh', 'more supermarket', 'nature basket', 'star bazaar', 'grofers', 'jiomart', 'flipkart grocery', 'amazon fresh', 'swiggy instamart', 'vegetables', 'fruits', 'provisions'],
    patterns: [/\b(grocery|grocer|super\s*market|mart)\b/i],
    confidence: 0.9,
    icon: '🛒',
    color: '#10B981',
    avgRange: [200, 8000],
  },
  'Food & Dining': {
    keywords: ['restaurant', 'cafe', 'zomato', 'swiggy', 'uber eats', 'dunzo', 'food', 'pizza', 'burger', 'biryani', 'mcdonalds', 'dominos', 'kfc', 'subway', 'starbucks', 'chaayos', 'haldiram', 'barbeque nation', 'dining', 'lunch', 'dinner', 'breakfast', 'snacks', 'tea', 'coffee'],
    patterns: [/\b(restaur|cafe|food|dine|eat|pizza|burger|kitchen)\b/i, /\b(zomato|swiggy)\b/i],
    confidence: 0.85,
    icon: '🍽️',
    color: '#F59E0B',
    avgRange: [50, 5000],
  },
  'Transport': {
    keywords: ['uber', 'ola', 'rapido', 'auto', 'taxi', 'bus', 'metro', 'train', 'irctc', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'fastag', 'cab', 'rickshaw', 'flight', 'airline', 'indigo', 'spicejet', 'air india', 'vistara'],
    patterns: [/\b(uber|ola|rapido|taxi|cab|auto|metro|train|flight|fuel|petrol|diesel|parking|toll)\b/i],
    confidence: 0.88,
    icon: '🚗',
    color: '#3B82F6',
    avgRange: [20, 25000],
  },
  'Shopping': {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq', 'snapdeal', 'croma', 'reliance digital', 'shopping', 'mall', 'retail', 'clothing', 'fashion', 'shoes', 'accessories', 'electronics', 'phone', 'laptop', 'appliance'],
    patterns: [/\b(amazon|flipkart|myntra|shopping|mall|store|retail|shop)\b/i],
    confidence: 0.82,
    icon: '🛍️',
    color: '#8B5CF6',
    avgRange: [100, 50000],
  },
  'Health & Medical': {
    keywords: ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical', 'clinic', 'dental', 'lab', 'test', 'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'tata 1mg', 'practo', 'health', 'gym', 'fitness', 'yoga', 'diagnostics'],
    patterns: [/\b(hospital|doctor|pharmacy|medical|clinic|health|gym|fitness)\b/i],
    confidence: 0.87,
    icon: '🏥',
    color: '#EF4444',
    avgRange: [50, 50000],
  },
  'Utilities': {
    keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'wifi', 'mobile', 'recharge', 'airtel', 'jio', 'vi', 'bsnl', 'act fiber', 'tata sky', 'dish tv', 'dth', 'postpaid', 'prepaid', 'bill payment'],
    patterns: [/\b(electric|water|gas|internet|broadband|recharge|bill|utility)\b/i],
    confidence: 0.9,
    icon: '💡',
    color: '#6366F1',
    avgRange: [100, 5000],
  },
  'Entertainment': {
    keywords: ['netflix', 'amazon prime', 'hotstar', 'youtube', 'spotify', 'apple music', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'gaming', 'steam', 'playstation', 'xbox', 'concert', 'event', 'show'],
    patterns: [/\b(netflix|hotstar|spotify|movie|cinema|gaming|concert|entertainment)\b/i],
    confidence: 0.88,
    icon: '🎬',
    color: '#EC4899',
    avgRange: [50, 5000],
  },
  'Education': {
    keywords: ['school', 'college', 'university', 'tuition', 'coaching', 'course', 'udemy', 'coursera', 'byju', 'unacademy', 'vedantu', 'book', 'stationery', 'education', 'learning', 'training', 'certification', 'exam', 'fee'],
    patterns: [/\b(school|college|university|course|tuition|education|learning|training)\b/i],
    confidence: 0.85,
    icon: '📚',
    color: '#14B8A6',
    avgRange: [100, 200000],
  },
  'Rent': {
    keywords: ['rent', 'house rent', 'flat rent', 'pg', 'paying guest', 'hostel', 'accommodation', 'lease', 'security deposit'],
    patterns: [/\b(rent|lease|accommodation|hostel|pg)\b/i],
    confidence: 0.92,
    icon: '🏠',
    color: '#D946EF',
    avgRange: [5000, 100000],
  },
  'Insurance': {
    keywords: ['insurance', 'lic', 'hdfc life', 'sbi life', 'icici prudential', 'max life', 'health insurance', 'car insurance', 'life insurance', 'term insurance', 'premium'],
    patterns: [/\b(insurance|premium|lic|policy)\b/i],
    confidence: 0.9,
    icon: '🛡️',
    color: '#F97316',
    avgRange: [500, 50000],
  },
  'Investment': {
    keywords: ['mutual fund', 'sip', 'stock', 'share', 'demat', 'zerodha', 'groww', 'upstox', 'coin', 'fd', 'fixed deposit', 'ppf', 'nps', 'gold', 'bond', 'ipo', 'etf', 'investment'],
    patterns: [/\b(mutual fund|sip|stock|share|demat|invest|fd|ppf|nps|gold|bond)\b/i],
    confidence: 0.88,
    icon: '📈',
    color: '#059669',
    avgRange: [500, 500000],
  },
  'EMI': {
    keywords: ['emi', 'loan', 'home loan', 'car loan', 'personal loan', 'education loan', 'instalment', 'bajaj finance', 'hdfc loan', 'sbi loan'],
    patterns: [/\b(emi|loan|instalment|finance)\b/i],
    confidence: 0.92,
    icon: '🏦',
    color: '#7C3AED',
    avgRange: [1000, 100000],
  },
  'Salary': {
    keywords: ['salary', 'wages', 'payroll', 'income', 'stipend', 'bonus', 'incentive', 'commission', 'honorarium'],
    patterns: [/\b(salary|wages|payroll|stipend|bonus|incentive)\b/i],
    confidence: 0.95,
    icon: '💵',
    color: '#16A34A',
    avgRange: [10000, 500000],
  },
  'Gifts & Donations': {
    keywords: ['gift', 'donation', 'charity', 'wedding', 'birthday', 'anniversary', 'festival', 'diwali', 'holi', 'eid', 'christmas', 'shagun', 'contribution'],
    patterns: [/\b(gift|donat|charit|wedding|birthday|festival)\b/i],
    confidence: 0.8,
    icon: '🎁',
    color: '#F472B6',
    avgRange: [100, 50000],
  },
  'Personal Care': {
    keywords: ['salon', 'spa', 'parlour', 'haircut', 'beauty', 'cosmetic', 'skincare', 'grooming', 'laundry', 'dry cleaning'],
    patterns: [/\b(salon|spa|parlour|beauty|cosmetic|grooming|laundry)\b/i],
    confidence: 0.83,
    icon: '💇',
    color: '#A855F7',
    avgRange: [100, 5000],
  },
  'Travel': {
    keywords: ['hotel', 'resort', 'oyo', 'makemytrip', 'goibibo', 'booking.com', 'airbnb', 'yatra', 'cleartrip', 'travel', 'holiday', 'vacation', 'tourism', 'visa', 'passport'],
    patterns: [/\b(hotel|resort|travel|holiday|vacation|tourism|booking|trip)\b/i],
    confidence: 0.85,
    icon: '✈️',
    color: '#0EA5E9',
    avgRange: [500, 200000],
  },
  'Home & Maintenance': {
    keywords: ['plumber', 'electrician', 'carpenter', 'paint', 'repair', 'maintenance', 'furniture', 'home decor', 'urban company', 'housejoy', 'cleaning', 'pest control', 'security'],
    patterns: [/\b(plumb|electric|repair|mainten|furnit|decor|clean)\b/i],
    confidence: 0.8,
    icon: '🏡',
    color: '#78716C',
    avgRange: [200, 50000],
  },
  'Taxes': {
    keywords: ['tax', 'income tax', 'gst', 'tds', 'advance tax', 'property tax', 'professional tax', 'it return'],
    patterns: [/\b(tax|gst|tds|it return)\b/i],
    confidence: 0.92,
    icon: '🏛️',
    color: '#DC2626',
    avgRange: [1000, 1000000],
  },
};

class SmartCategorizationService {
  /**
   * Categorize a transaction based on description and amount
   */
  static categorize(description, amount = 0, type = 'expense') {
    if (!description) return { category: 'Uncategorized', confidence: 0, icon: '📦', color: '#6B7280' };

    const normalizedDesc = description.toLowerCase().trim();
    const results = [];

    for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
      let score = 0;
      let matchCount = 0;

      // Keyword matching
      for (const keyword of rules.keywords) {
        if (normalizedDesc.includes(keyword.toLowerCase())) {
          score += 0.6;
          matchCount++;
          // Exact word match gets bonus
          if (new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedDesc)) {
            score += 0.2;
          }
        }
      }

      // Pattern matching
      for (const pattern of rules.patterns) {
        if (pattern.test(normalizedDesc)) {
          score += 0.4;
          matchCount++;
        }
      }

      // Amount range matching
      if (amount > 0 && rules.avgRange) {
        const [min, max] = rules.avgRange;
        if (amount >= min && amount <= max) {
          score += 0.15;
        }
      }

      // Normalize score
      const maxPossibleScore = rules.keywords.length * 0.8 + rules.patterns.length * 0.4 + 0.15;
      const normalizedScore = Math.min(score / Math.max(maxPossibleScore * 0.3, 1), 1);
      const finalConfidence = normalizedScore * rules.confidence;

      if (matchCount > 0) {
        results.push({
          category,
          confidence: Math.min(finalConfidence, 0.99),
          icon: rules.icon,
          color: rules.color,
          matchCount,
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    if (results.length > 0) {
      return {
        category: results[0].category,
        confidence: results[0].confidence,
        icon: results[0].icon,
        color: results[0].color,
        alternatives: results.slice(1, 3).map(r => ({
          category: r.category,
          confidence: r.confidence,
        })),
      };
    }

    return { category: 'Uncategorized', confidence: 0, icon: '📦', color: '#6B7280', alternatives: [] };
  }

  /**
   * Batch categorize multiple transactions
   */
  static batchCategorize(transactions) {
    return transactions.map(tx => ({
      ...tx,
      ...this.categorize(tx.description || tx.title, tx.amount, tx.type),
    }));
  }

  /**
   * Learn from user corrections
   */
  static async learnFromCorrection(userId, description, correctedCategory) {
    try {
      // Store correction for future learning
      const correction = {
        userId,
        originalDescription: description,
        correctedCategory,
        timestamp: new Date(),
      };

      // In production, this would update a ML model or rules engine
      console.log('Learning from correction:', correction);

      return { success: true, message: 'Correction recorded' };
    } catch (error) {
      console.error('Error learning from correction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get spending insights by category
   */
  static async getCategoryInsights(userId, timeRange = '30d') {
    try {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '6m': 180, '1y': 365 };
      const days = daysMap[timeRange] || 30;
      const startDate = new Date(Date.now() - days * 86400000);

      const transactions = await Transaction.find({
        userId,
        date: { $gte: startDate },
        type: 'expense',
      }).sort({ date: -1 });

      // Aggregate by category
      const categoryMap = {};
      transactions.forEach(tx => {
        const cat = tx.category || 'Uncategorized';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { total: 0, count: 0, transactions: [], trend: [] };
        }
        categoryMap[cat].total += tx.amount;
        categoryMap[cat].count++;
        categoryMap[cat].transactions.push(tx);
      });

      // Calculate trends
      const insights = Object.entries(categoryMap).map(([category, data]) => {
        const ruleInfo = CATEGORY_RULES[category] || {};
        const avgPerTransaction = data.total / data.count;
        const dailyAvg = data.total / days;
        const monthlyProjection = dailyAvg * 30;

        return {
          category,
          icon: ruleInfo.icon || '📦',
          color: ruleInfo.color || '#6B7280',
          total: data.total,
          count: data.count,
          avgPerTransaction: Math.round(avgPerTransaction),
          dailyAvg: Math.round(dailyAvg),
          monthlyProjection: Math.round(monthlyProjection),
          percentage: 0, // Will be calculated below
        };
      });

      // Calculate percentages
      const grandTotal = insights.reduce((s, i) => s + i.total, 0);
      insights.forEach(i => {
        i.percentage = grandTotal > 0 ? Math.round((i.total / grandTotal) * 100) : 0;
      });

      // Sort by total
      insights.sort((a, b) => b.total - a.total);

      return {
        success: true,
        insights,
        grandTotal,
        transactionCount: transactions.length,
        timeRange,
        topCategory: insights[0],
      };
    } catch (error) {
      console.error('Error getting category insights:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect anomalies in spending
   */
  static async detectAnomalies(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

      const recentTransactions = await Transaction.find({
        userId,
        date: { $gte: thirtyDaysAgo },
        type: 'expense',
      });

      const previousTransactions = await Transaction.find({
        userId,
        date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        type: 'expense',
      });

      // Compare spending by category
      const recentByCategory = {};
      const previousByCategory = {};

      recentTransactions.forEach(tx => {
        const cat = tx.category || 'Other';
        recentByCategory[cat] = (recentByCategory[cat] || 0) + tx.amount;
      });

      previousTransactions.forEach(tx => {
        const cat = tx.category || 'Other';
        previousByCategory[cat] = (previousByCategory[cat] || 0) + tx.amount;
      });

      const anomalies = [];

      for (const [category, amount] of Object.entries(recentByCategory)) {
        const prevAmount = previousByCategory[category] || 0;
        if (prevAmount > 0) {
          const changePercent = ((amount - prevAmount) / prevAmount) * 100;
          if (Math.abs(changePercent) > 30) {
            anomalies.push({
              category,
              currentAmount: amount,
              previousAmount: prevAmount,
              changePercent: Math.round(changePercent),
              type: changePercent > 0 ? 'increase' : 'decrease',
              severity: Math.abs(changePercent) > 50 ? 'high' : 'medium',
              icon: CATEGORY_RULES[category]?.icon || '📦',
            });
          }
        } else if (amount > 5000) {
          anomalies.push({
            category,
            currentAmount: amount,
            previousAmount: 0,
            changePercent: 100,
            type: 'new',
            severity: 'medium',
            icon: CATEGORY_RULES[category]?.icon || '📦',
          });
        }
      }

      return {
        success: true,
        anomalies: anomalies.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)),
        totalAnomalies: anomalies.length,
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all available categories
   */
  static getCategories() {
    return Object.entries(CATEGORY_RULES).map(([name, rules]) => ({
      name,
      icon: rules.icon,
      color: rules.color,
      keywordCount: rules.keywords.length,
    }));
  }

  /**
   * Suggest budget based on income and spending patterns
   */
  static suggestBudget(monthlyIncome, spendingHistory = {}) {
    const budgetRules = {
      'Rent': 0.3,
      'Groceries': 0.1,
      'Food & Dining': 0.08,
      'Transport': 0.08,
      'Utilities': 0.05,
      'Health & Medical': 0.05,
      'Entertainment': 0.05,
      'Shopping': 0.05,
      'Education': 0.05,
      'Insurance': 0.05,
      'Investment': 0.15,
      'Personal Care': 0.03,
      'Gifts & Donations': 0.02,
      'Home & Maintenance': 0.02,
      'Travel': 0.02,
    };

    const suggestions = {};
    let totalAllocated = 0;

    for (const [category, percentage] of Object.entries(budgetRules)) {
      const baseBudget = Math.round(monthlyIncome * percentage);
      const actualSpending = spendingHistory[category] || 0;
      
      // Adjust based on actual spending
      let suggestedAmount;
      if (actualSpending > 0) {
        suggestedAmount = Math.round((baseBudget + actualSpending) / 2);
      } else {
        suggestedAmount = baseBudget;
      }

      const ruleInfo = CATEGORY_RULES[category] || {};
      suggestions[category] = {
        amount: suggestedAmount,
        percentage: Math.round((suggestedAmount / monthlyIncome) * 100),
        icon: ruleInfo.icon || '📦',
        color: ruleInfo.color || '#6B7280',
        basedOn: actualSpending > 0 ? 'hybrid' : 'rule',
      };
      totalAllocated += suggestedAmount;
    }

    return {
      suggestions,
      totalAllocated,
      remaining: monthlyIncome - totalAllocated,
      savingsRate: Math.round(((monthlyIncome - totalAllocated) / monthlyIncome) * 100),
    };
  }
}

module.exports = SmartCategorizationService;
