// ============================================================================
// NLP ENGINE — Natural Language Processing for Financial Data
// ============================================================================
// Sentiment analysis, text classification, named entity recognition,
// financial term extraction, and conversational AI — all running locally
// with no external API dependencies.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §0  TOKENIZER & TEXT PREPROCESSING
// ============================================================================

class Tokenizer {
  constructor() {
    this.stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'had', 'have',
      'has', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'must',
      'am', 'are', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
      'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
      'what', 'how', 'when', 'where', 'who', 'whom', 'why', 'if', 'then',
      'so', 'just', 'very', 'too', 'also', 'than', 'such', 'both',
      'each', 'any', 'all', 'some', 'few', 'many', 'much', 'more',
      'most', 'other', 'only', 'same', 'here', 'there', 'now', 'then',
    ]);

    // Financial-specific stop words to keep
    this.keepWords = new Set([
      'buy', 'sell', 'spend', 'save', 'invest', 'pay', 'earn', 'owe',
      'debt', 'loan', 'credit', 'debit', 'income', 'expense', 'budget',
      'profit', 'loss', 'tax', 'emi', 'interest', 'stock', 'fund',
      'insurance', 'premium', 'claim', 'refund', 'deposit', 'withdraw',
    ]);
  }

  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s₹$€£¥]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  removeStopWords(tokens) {
    return tokens.filter(t => !this.stopWords.has(t) || this.keepWords.has(t));
  }

  stem(word) {
    // Simple Porter-like stemming
    let w = word.toLowerCase();
    const suffixes = ['ation', 'ment', 'ness', 'ence', 'ance', 'ible', 'able', 'ious', 'ical', 'ful', 'less', 'ity', 'ing', 'tion', 'sion', 'ous', 'ive', 'ize', 'ise', 'est', 'ely', 'ery', 'ly', 'ed', 'er', 'es', 's'];
    for (const suffix of suffixes) {
      if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
        w = w.slice(0, -suffix.length);
        break;
      }
    }
    return w;
  }

  process(text) {
    const tokens = this.tokenize(text);
    const filtered = this.removeStopWords(tokens);
    return filtered.map(t => this.stem(t));
  }

  ngrams(tokens, n = 2) {
    const result = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      result.push(tokens.slice(i, i + n).join('_'));
    }
    return result;
  }
}

// ============================================================================
// §1  TF-IDF VECTORIZER
// ============================================================================

class TFIDFVectorizer {
  constructor(config = {}) {
    this.maxFeatures = config.maxFeatures || 1000;
    this.minDf = config.minDf || 2;
    this.maxDf = config.maxDf || 0.95;
    this.useNgrams = config.useNgrams || false;
    this.ngramRange = config.ngramRange || [1, 2];
    this.vocabulary = {};
    this.idf = {};
    this.tokenizer = new Tokenizer();
  }

  _extractTokens(text) {
    const tokens = this.tokenizer.process(text);
    if (this.useNgrams) {
      const unigrams = tokens;
      const bigrams = this.tokenizer.ngrams(tokens, 2);
      return [...unigrams, ...bigrams];
    }
    return tokens;
  }

  fit(documents) {
    const df = {}; // document frequency
    const n = documents.length;

    for (const doc of documents) {
      const tokens = new Set(this._extractTokens(doc));
      for (const token of tokens) {
        df[token] = (df[token] || 0) + 1;
      }
    }

    // Filter by document frequency
    const filtered = Object.entries(df)
      .filter(([, freq]) => freq >= this.minDf && freq / n <= this.maxDf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFeatures);

    this.vocabulary = {};
    filtered.forEach(([token], idx) => { this.vocabulary[token] = idx; });

    // Compute IDF
    this.idf = {};
    for (const [token, freq] of Object.entries(df)) {
      if (this.vocabulary[token] !== undefined) {
        this.idf[token] = Math.log((n + 1) / (freq + 1)) + 1;
      }
    }

    return this;
  }

  transform(documents) {
    const vocabSize = Object.keys(this.vocabulary).length;
    return documents.map(doc => {
      const tokens = this._extractTokens(doc);
      const tf = {};
      for (const token of tokens) {
        if (this.vocabulary[token] !== undefined) {
          tf[token] = (tf[token] || 0) + 1;
        }
      }

      const vector = new Array(vocabSize).fill(0);
      const maxTf = Object.values(tf).length > 0 ? Math.max(...Object.values(tf)) : 1;

      for (const [token, freq] of Object.entries(tf)) {
        const idx = this.vocabulary[token];
        if (idx !== undefined) {
          vector[idx] = (freq / maxTf) * (this.idf[token] || 1);
        }
      }

      // L2 normalize
      const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
      if (norm > 0) {
        for (let i = 0; i < vector.length; i++) vector[i] /= norm;
      }

      return vector;
    });
  }

  fitTransform(documents) {
    this.fit(documents);
    return this.transform(documents);
  }

  serialize() {
    return { vocabulary: this.vocabulary, idf: this.idf, maxFeatures: this.maxFeatures };
  }

  static deserialize(obj) {
    const v = new TFIDFVectorizer({ maxFeatures: obj.maxFeatures });
    v.vocabulary = obj.vocabulary || {};
    v.idf = obj.idf || {};
    return v;
  }
}

// ============================================================================
// §2  SENTIMENT ANALYZER
// ============================================================================

class SentimentAnalyzer {
  constructor() {
    this.tokenizer = new Tokenizer();

    // Financial sentiment lexicon
    this.positiveWords = new Map([
      ['profit', 0.8], ['gain', 0.7], ['growth', 0.7], ['increase', 0.6],
      ['rise', 0.6], ['bull', 0.7], ['bullish', 0.8], ['surge', 0.8],
      ['rally', 0.7], ['recover', 0.6], ['recovery', 0.6], ['boom', 0.8],
      ['outperform', 0.7], ['upgrade', 0.6], ['dividend', 0.5], ['bonus', 0.6],
      ['save', 0.5], ['saving', 0.5], ['saved', 0.5], ['earn', 0.6],
      ['earned', 0.6], ['earning', 0.6], ['income', 0.4], ['credit', 0.3],
      ['reward', 0.5], ['cashback', 0.5], ['refund', 0.5], ['appreciation', 0.6],
      ['surplus', 0.6], ['achieve', 0.5], ['goal', 0.3], ['milestone', 0.5],
      ['success', 0.7], ['excellent', 0.7], ['great', 0.6], ['good', 0.5],
      ['positive', 0.5], ['improve', 0.5], ['improved', 0.5], ['stable', 0.4],
      ['strong', 0.5], ['strength', 0.5], ['opportunity', 0.5], ['invest', 0.3],
      ['diversify', 0.4], ['optimize', 0.4], ['efficient', 0.4], ['return', 0.3],
    ]);

    this.negativeWords = new Map([
      ['loss', -0.8], ['lose', -0.7], ['lost', -0.7], ['decline', -0.6],
      ['decrease', -0.6], ['fall', -0.5], ['bear', -0.6], ['bearish', -0.8],
      ['crash', -0.9], ['crisis', -0.8], ['recession', -0.8], ['default', -0.8],
      ['bankruptcy', -0.9], ['debt', -0.5], ['owe', -0.4], ['penalty', -0.6],
      ['fine', -0.5], ['fraud', -0.9], ['scam', -0.9], ['risk', -0.4],
      ['risky', -0.5], ['volatile', -0.5], ['downgrade', -0.6], ['inflation', -0.5],
      ['expense', -0.3], ['spend', -0.2], ['spent', -0.2], ['overdue', -0.6],
      ['late', -0.4], ['missed', -0.5], ['overspend', -0.7], ['overdraft', -0.6],
      ['insufficient', -0.5], ['negative', -0.5], ['poor', -0.6], ['bad', -0.5],
      ['worst', -0.8], ['terrible', -0.8], ['danger', -0.6], ['warning', -0.5],
      ['alert', -0.3], ['concern', -0.4], ['worry', -0.5], ['stress', -0.5],
      ['struggle', -0.5], ['burden', -0.5], ['charge', -0.3], ['fee', -0.3],
      ['tax', -0.2], ['interest', -0.2], ['emi', -0.2], ['loan', -0.2],
    ]);

    this.intensifiers = new Map([
      ['very', 1.5], ['extremely', 2.0], ['highly', 1.5], ['really', 1.3],
      ['significantly', 1.5], ['substantially', 1.5], ['dramatically', 1.8],
      ['slightly', 0.5], ['somewhat', 0.7], ['marginally', 0.5], ['barely', 0.3],
    ]);

    this.negators = new Set([
      'not', 'no', 'never', 'neither', 'nobody', 'nothing',
      'nowhere', 'nor', "don't", "doesn't", "didn't", "won't",
      "wouldn't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't",
    ]);
  }

  analyze(text) {
    if (!text) return { score: 0, sentiment: 'neutral', confidence: 0, details: {} };

    const tokens = this.tokenizer.tokenize(text);
    let totalScore = 0;
    let wordCount = 0;
    const details = { positive: [], negative: [], neutral: [] };
    let isNegated = false;
    let intensifier = 1;

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];

      // Check for negators
      if (this.negators.has(word)) {
        isNegated = true;
        continue;
      }

      // Check for intensifiers
      if (this.intensifiers.has(word)) {
        intensifier = this.intensifiers.get(word);
        continue;
      }

      let score = 0;
      if (this.positiveWords.has(word)) {
        score = this.positiveWords.get(word) * intensifier;
        if (isNegated) score = -score * 0.7;
        details.positive.push({ word, score });
      } else if (this.negativeWords.has(word)) {
        score = this.negativeWords.get(word) * intensifier;
        if (isNegated) score = -score * 0.7;
        details.negative.push({ word, score });
      }

      if (score !== 0) {
        totalScore += score;
        wordCount++;
      }

      // Reset modifiers
      isNegated = false;
      intensifier = 1;
    }

    const normalizedScore = wordCount > 0 ? totalScore / wordCount : 0;
    const clampedScore = Math.max(-1, Math.min(1, normalizedScore));

    let sentiment = 'neutral';
    if (clampedScore > 0.1) sentiment = 'positive';
    else if (clampedScore < -0.1) sentiment = 'negative';

    const confidence = Math.min(1, wordCount > 0 ? Math.abs(clampedScore) * Math.min(wordCount / 3, 1) : 0);

    return {
      score: clampedScore,
      sentiment,
      confidence,
      details,
      wordCount: tokens.length,
      sentimentWords: wordCount,
    };
  }

  analyzeBatch(texts) {
    return texts.map(text => this.analyze(text));
  }

  // Analyze financial transaction descriptions
  analyzeTransactions(transactions) {
    const results = {
      overall: { positive: 0, negative: 0, neutral: 0, avgScore: 0 },
      byCategory: {},
      timeline: [],
      insights: [],
    };

    const scores = [];

    for (const t of transactions) {
      const analysis = this.analyze(t.description || t.merchant || '');
      const category = t.category || 'other';

      scores.push(analysis.score);
      results.overall[analysis.sentiment]++;

      if (!results.byCategory[category]) {
        results.byCategory[category] = { scores: [], count: 0 };
      }
      results.byCategory[category].scores.push(analysis.score);
      results.byCategory[category].count++;

      // Monthly timeline
      const month = new Date(t.date).toISOString().slice(0, 7);
      let monthEntry = results.timeline.find(e => e.month === month);
      if (!monthEntry) {
        monthEntry = { month, scores: [], count: 0 };
        results.timeline.push(monthEntry);
      }
      monthEntry.scores.push(analysis.score);
      monthEntry.count++;
    }

    results.overall.avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Compute category averages
    for (const [cat, data] of Object.entries(results.byCategory)) {
      data.avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      data.sentiment = data.avgScore > 0.1 ? 'positive' : data.avgScore < -0.1 ? 'negative' : 'neutral';
      delete data.scores;
    }

    // Timeline averages
    for (const entry of results.timeline) {
      entry.avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
      delete entry.scores;
    }
    results.timeline.sort((a, b) => a.month.localeCompare(b.month));

    // Generate insights
    if (results.overall.avgScore < -0.2) {
      results.insights.push({
        type: 'warning',
        message: 'Overall financial sentiment is negative. Many transactions have stress-related descriptions.',
      });
    }
    if (results.overall.positive > results.overall.negative * 2) {
      results.insights.push({
        type: 'positive',
        message: 'Financial sentiment is predominantly positive with strong earning patterns.',
      });
    }

    const negativeCategories = Object.entries(results.byCategory)
      .filter(([, data]) => data.sentiment === 'negative')
      .map(([cat]) => cat);
    if (negativeCategories.length > 0) {
      results.insights.push({
        type: 'info',
        message: `Categories with negative sentiment: ${negativeCategories.join(', ')}. Consider reviewing these spending areas.`,
      });
    }

    return results;
  }
}

// ============================================================================
// §3  NAMED ENTITY RECOGNITION (Financial)
// ============================================================================

class FinancialNER {
  constructor() {
    this.patterns = {
      // Currency amounts
      amount: [
        /₹\s*[\d,]+(?:\.\d{1,2})?/g,
        /rs\.?\s*[\d,]+(?:\.\d{1,2})?/gi,
        /inr\s*[\d,]+(?:\.\d{1,2})?/gi,
        /\$\s*[\d,]+(?:\.\d{1,2})?/g,
        /€\s*[\d,]+(?:\.\d{1,2})?/g,
        /£\s*[\d,]+(?:\.\d{1,2})?/g,
      ],
      // Dates
      date: [
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
        /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}/gi,
        /\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi,
      ],
      // Account numbers
      account: [
        /a\/c\s*(?:no\.?\s*)?[\d\*X]+/gi,
        /account\s*(?:no\.?\s*)?[\d\*X]+/gi,
        /\b\d{4}[\s\*]+\d{4}[\s\*]+\d{4}[\s\*]+\d{4}\b/g, // Card numbers
        /xx+\s*\d{4}/gi, // Masked account
      ],
      // UPI IDs
      upi: [
        /[\w.-]+@[\w]+/g,
      ],
      // Bank names
      bank: [
        /\b(?:sbi|hdfc|icici|axis|kotak|yes\s*bank|pnb|bob|canara|union|idbi|bandhan|rbl|indusind|federal|south\s*indian|karur\s*vysya|city\s*union|indian\s*overseas|central\s*bank|uco|dena|syndicate|allahabad|vijaya|andhra|corporation)\b/gi,
      ],
      // Percentages
      percentage: [
        /\d+(?:\.\d+)?%/g,
        /\d+(?:\.\d+)?\s*(?:percent|per\s*cent)/gi,
      ],
      // Financial instruments
      instrument: [
        /\b(?:nifty|sensex|mutual\s*fund|fixed\s*deposit|fd|rd|ppf|epf|nps|elss|sip|ulip|etf|ncd|bonds?|debentures?|t-bills?)\b/gi,
      ],
      // Company/Stock names (Indian)
      company: [
        /\b(?:reliance|tcs|infosys|hdfc\s*bank|wipro|hcl|bharti\s*airtel|adani|bajaj|maruti|asian\s*paints|titan|ultratech|nestle|hindustan\s*unilever|itc|sun\s*pharma|tata|mahindra|larsen|godrej|vedanta|coal\s*india|ongc|ntpc|powergrid|gail|bhel|sail)\b/gi,
      ],
    };
  }

  extract(text) {
    if (!text) return { entities: [], summary: {} };

    const entities = [];
    const summary = {};

    for (const [type, patterns] of Object.entries(this.patterns)) {
      summary[type] = [];
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
          const entity = {
            type,
            value: match[0].trim(),
            start: match.index,
            end: match.index + match[0].length,
          };
          entities.push(entity);
          summary[type].push(entity.value);
        }
      }
      // Deduplicate
      summary[type] = [...new Set(summary[type])];
    }

    return { entities: entities.sort((a, b) => a.start - b.start), summary };
  }

  extractFromTransaction(transaction) {
    const text = [transaction.description, transaction.merchant, transaction.notes].filter(Boolean).join(' ');
    const result = this.extract(text);

    // Enhanced extraction
    result.merchant = this._extractMerchant(transaction);
    result.transactionType = this._classifyTransactionType(text);

    return result;
  }

  _extractMerchant(transaction) {
    const desc = (transaction.description || '').toLowerCase();
    const patterns = [
      /(?:paid\s+to|payment\s+to|transfer\s+to|sent\s+to)\s+(.+?)(?:\s+via|\s+through|\s+ref|$)/i,
      /(?:received\s+from|credit\s+from|from)\s+(.+?)(?:\s+via|\s+through|\s+ref|$)/i,
      /(?:at|@)\s+(.+?)(?:\s+on|\s+for|\s+ref|$)/i,
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern);
      if (match) return match[1].trim();
    }

    return transaction.merchant || null;
  }

  _classifyTransactionType(text) {
    const lower = text.toLowerCase();
    const typePatterns = {
      salary: /salary|wages|payroll|stipend/,
      emi: /emi|equated\s*monthly|installment/,
      rent: /rent|lease|accommodation/,
      utility: /electricity|water|gas|internet|broadband|wifi|phone\s*bill/,
      grocery: /grocery|supermarket|bigbasket|grofers|blinkit|zepto|swiggy\s*instamart/,
      food: /restaurant|cafe|coffee|zomato|swiggy|uber\s*eats|food\s*delivery/,
      transport: /uber|ola|metro|fuel|petrol|diesel|parking|toll/,
      shopping: /amazon|flipkart|myntra|ajio|shopping|mall|store/,
      medical: /hospital|doctor|pharmacy|medical|health|diagnostic/,
      insurance: /insurance|premium|lic|policy/,
      investment: /mutual\s*fund|sip|stock|share|investment|fd|fixed\s*deposit/,
      subscription: /netflix|spotify|prime|subscription|membership/,
      transfer: /transfer|neft|rtgs|imps|upi/,
      atm: /atm|cash\s*withdrawal/,
      refund: /refund|reversal|cashback/,
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(lower)) return type;
    }
    return 'other';
  }
}

// ============================================================================
// §4  FINANCIAL QUERY UNDERSTANDING
// ============================================================================

class QueryUnderstanding {
  constructor() {
    this.tokenizer = new Tokenizer();
    this.sentimentAnalyzer = new SentimentAnalyzer();

    this.intentPatterns = {
      spending_query: {
        patterns: [/how\s+much.*(?:spend|spent|expense)/i, /spending.*(?:last|this|previous)/i, /expense.*(?:summary|breakdown|analysis)/i, /total\s+(?:spend|expense)/i],
        slots: ['timeframe', 'category', 'amount'],
      },
      income_query: {
        patterns: [/how\s+much.*(?:earn|income|salary)/i, /income.*(?:last|this|previous)/i, /salary.*(?:credited|received)/i],
        slots: ['timeframe', 'source'],
      },
      budget_query: {
        patterns: [/budget.*(?:status|remaining|left|exceeded)/i, /how.*(?:budget|within\s+budget)/i, /over\s*budget/i],
        slots: ['category', 'timeframe'],
      },
      savings_query: {
        patterns: [/how\s+much.*(?:save|saving)/i, /savings?\s+(?:rate|amount|goal)/i],
        slots: ['timeframe', 'goal'],
      },
      investment_query: {
        patterns: [/(?:investment|portfolio|stock|mutual\s+fund).*(?:performance|return|value)/i, /how.*(?:invest|portfolio)/i],
        slots: ['instrument', 'timeframe'],
      },
      forecast_query: {
        patterns: [/(?:predict|forecast|expect|project).*(?:spend|income|expense)/i, /next\s+month.*(?:spend|expense)/i, /future.*(?:expense|spending)/i],
        slots: ['timeframe', 'category'],
      },
      advice_query: {
        patterns: [/(?:suggest|recommend|advice|tip|should\s+i)/i, /how\s+(?:to|can\s+i).*(?:save|reduce|improve|invest)/i, /what\s+should/i],
        slots: ['topic', 'goal'],
      },
      comparison_query: {
        patterns: [/compare.*(?:month|week|year|period)/i, /(?:vs|versus|compared\s+to)/i, /(?:more|less)\s+than.*(?:last|previous)/i],
        slots: ['timeframe1', 'timeframe2', 'metric'],
      },
      anomaly_query: {
        patterns: [/(?:unusual|suspicious|unexpected|abnormal|anomal)/i, /large.*(?:transaction|payment|charge)/i, /(?:fraud|scam)/i],
        slots: ['timeframe', 'category'],
      },
      goal_query: {
        patterns: [/(?:goal|target).*(?:progress|status|track)/i, /how\s+(?:close|far).*goal/i, /when.*(?:reach|achieve).*goal/i],
        slots: ['goalName', 'timeframe'],
      },
      debt_query: {
        patterns: [/(?:debt|loan|emi|outstanding).*(?:total|remaining|status)/i, /how\s+much.*(?:owe|debt)/i, /when.*(?:payoff|paid\s+off|free).*(?:debt|loan)/i],
        slots: ['loanType', 'timeframe'],
      },
      health_query: {
        patterns: [/financial\s+health/i, /(?:score|rating|assessment)/i, /how.*(?:financial|doing\s+financially)/i],
        slots: [],
      },
    };

    this.timePatterns = {
      'this month': () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() }),
      'last month': () => {
        const d = new Date();
        return { start: new Date(d.getFullYear(), d.getMonth() - 1, 1), end: new Date(d.getFullYear(), d.getMonth(), 0) };
      },
      'this week': () => {
        const d = new Date();
        const day = d.getDay();
        return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day), end: d };
      },
      'last week': () => {
        const d = new Date();
        const day = d.getDay();
        return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day - 7), end: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day - 1) };
      },
      'this year': () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }),
      'last year': () => ({ start: new Date(new Date().getFullYear() - 1, 0, 1), end: new Date(new Date().getFullYear() - 1, 11, 31) }),
      'today': () => {
        const d = new Date();
        return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: d };
      },
      'yesterday': () => {
        const d = new Date();
        const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
        return { start: y, end: y };
      },
      'last 30 days': () => ({ start: new Date(Date.now() - 30 * 86400000), end: new Date() }),
      'last 90 days': () => ({ start: new Date(Date.now() - 90 * 86400000), end: new Date() }),
      'last 6 months': () => ({ start: new Date(Date.now() - 180 * 86400000), end: new Date() }),
    };
  }

  understand(query) {
    const lower = query.toLowerCase().trim();

    // Detect intent
    let matchedIntent = 'general_query';
    let maxPatternMatches = 0;

    for (const [intent, config] of Object.entries(this.intentPatterns)) {
      const matches = config.patterns.filter(p => p.test(lower)).length;
      if (matches > maxPatternMatches) {
        maxPatternMatches = matches;
        matchedIntent = intent;
      }
    }

    // Extract timeframe
    let timeframe = null;
    for (const [pattern, resolver] of Object.entries(this.timePatterns)) {
      if (lower.includes(pattern)) {
        timeframe = { label: pattern, ...resolver() };
        break;
      }
    }

    // Extract amounts
    const amountMatch = lower.match(/₹?\s*([\d,]+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    // Extract categories
    const categoryKeywords = [
      'food', 'grocery', 'transport', 'shopping', 'entertainment',
      'health', 'education', 'utilities', 'rent', 'salary', 'investment',
      'insurance', 'emi', 'subscription', 'travel',
    ];
    const category = categoryKeywords.find(cat => lower.includes(cat)) || null;

    // Sentiment
    const sentiment = this.sentimentAnalyzer.analyze(query);

    return {
      intent: matchedIntent,
      confidence: Math.min(1, maxPatternMatches * 0.5),
      timeframe,
      amount,
      category,
      sentiment: sentiment.sentiment,
      slots: {
        timeframe,
        amount,
        category,
        originalQuery: query,
      },
    };
  }

  generateResponse(intent, data) {
    const templates = {
      spending_query: [
        `Your total spending is ₹${data.total?.toLocaleString('en-IN') || '0'}. ${data.topCategory ? `Highest spending in ${data.topCategory}.` : ''}`,
        `You've spent ₹${data.total?.toLocaleString('en-IN') || '0'} across ${data.categoryCount || 0} categories.`,
      ],
      income_query: [
        `Your total income is ₹${data.total?.toLocaleString('en-IN') || '0'}. ${data.trend || ''}`,
      ],
      budget_query: [
        `${data.overBudget || 0} categories are over budget. ${data.remaining ? `₹${data.remaining.toLocaleString('en-IN')} remaining overall.` : ''}`,
      ],
      savings_query: [
        `Your savings rate is ${data.rate ? (data.rate * 100).toFixed(1) : '0'}%. ${data.suggestion || ''}`,
      ],
      health_query: [
        `Your financial health score is ${data.score || 0}/100 (${data.grade || 'N/A'}). ${data.topRecommendation || ''}`,
      ],
      forecast_query: [
        `Projected spending next month: ₹${data.forecast?.toLocaleString('en-IN') || 'N/A'}. ${data.trend || ''}`,
      ],
      general_query: [
        `I can help with spending analysis, budget tracking, investment insights, and financial planning. What would you like to know?`,
      ],
    };

    const responses = templates[intent] || templates.general_query;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// ============================================================================
// §5  TEXT SUMMARIZER (Extractive)
// ============================================================================

class TextSummarizer {
  constructor() {
    this.tokenizer = new Tokenizer();
  }

  summarize(text, numSentences = 3) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= numSentences) return text;

    // Score sentences
    const wordFreq = {};
    const allTokens = this.tokenizer.process(text);
    for (const token of allTokens) {
      wordFreq[token] = (wordFreq[token] || 0) + 1;
    }

    const maxFreq = Math.max(...Object.values(wordFreq), 1);
    for (const word of Object.keys(wordFreq)) {
      wordFreq[word] /= maxFreq;
    }

    const scores = sentences.map((sentence, index) => {
      const tokens = this.tokenizer.process(sentence);
      let score = tokens.reduce((s, t) => s + (wordFreq[t] || 0), 0);
      // Boost first/last sentences
      if (index === 0) score *= 1.5;
      if (index === sentences.length - 1) score *= 1.2;
      // Penalize very short sentences
      if (tokens.length < 3) score *= 0.5;
      return { sentence: sentence.trim(), score, index };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence)
      .join(' ');
  }

  // Summarize financial data into natural language
  summarizeFinancialData(data) {
    const parts = [];

    if (data.income && data.expenses) {
      const savings = data.income - data.expenses;
      parts.push(`Total income was ₹${data.income.toLocaleString('en-IN')} and expenses were ₹${data.expenses.toLocaleString('en-IN')}, resulting in ${savings >= 0 ? 'savings' : 'a deficit'} of ₹${Math.abs(savings).toLocaleString('en-IN')}.`);
    }

    if (data.topCategories) {
      const cats = data.topCategories.slice(0, 3).map(c => `${c.name} (₹${c.amount.toLocaleString('en-IN')})`);
      parts.push(`Top spending categories: ${cats.join(', ')}.`);
    }

    if (data.healthScore) {
      const grade = data.healthScore >= 80 ? 'excellent' : data.healthScore >= 60 ? 'good' : data.healthScore >= 40 ? 'fair' : 'needs improvement';
      parts.push(`Financial health score is ${data.healthScore}/100 (${grade}).`);
    }

    if (data.anomalies?.length) {
      parts.push(`${data.anomalies.length} unusual transactions detected that need review.`);
    }

    if (data.recommendations?.length) {
      parts.push(`Key recommendation: ${data.recommendations[0].message}`);
    }

    return parts.join(' ');
  }
}

// ============================================================================
// §6  CONVERSATIONAL CONTEXT MANAGER
// ============================================================================

class ConversationManager {
  constructor() {
    this.sessions = new Map();
    this.maxHistory = 20;
  }

  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        history: [],
        context: {},
        lastActive: Date.now(),
      });
    }
    const session = this.sessions.get(userId);
    session.lastActive = Date.now();
    return session;
  }

  addMessage(userId, role, content, metadata = {}) {
    const session = this.getSession(userId);
    session.history.push({
      role, // 'user' or 'assistant'
      content,
      timestamp: Date.now(),
      ...metadata,
    });

    // Trim history
    if (session.history.length > this.maxHistory) {
      session.history = session.history.slice(-this.maxHistory);
    }
  }

  updateContext(userId, updates) {
    const session = this.getSession(userId);
    Object.assign(session.context, updates);
  }

  getContext(userId) {
    return this.getSession(userId).context;
  }

  getHistory(userId, limit = 10) {
    return this.getSession(userId).history.slice(-limit);
  }

  // Cleanup stale sessions (>1 hour)
  cleanup() {
    const cutoff = Date.now() - 3600000;
    for (const [userId, session] of this.sessions) {
      if (session.lastActive < cutoff) {
        this.sessions.delete(userId);
      }
    }
  }
}

// ============================================================================
// §7  EXPORTS
// ============================================================================

module.exports = {
  Tokenizer,
  TFIDFVectorizer,
  SentimentAnalyzer,
  FinancialNER,
  QueryUnderstanding,
  TextSummarizer,
  ConversationManager,
};
