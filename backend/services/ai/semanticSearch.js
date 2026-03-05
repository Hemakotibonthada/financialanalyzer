// ============================================================================
// SEMANTIC FINANCIAL SEARCH — AI-Powered Search with Understanding
// ============================================================================
// Implements TF-IDF indexing, fuzzy matching, intent-aware search, semantic
// ranking, and faceted search for financial data. Enables natural language
// queries like "show me all food expenses over 500 last month".
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

const sum = (a) => a.reduce((s, v) => s + v, 0);

// ============================================================================
// §1  TF-IDF INDEX — Text Indexing for Financial Documents
// ============================================================================

class TFIDFIndex {
  constructor() {
    this.documents = new Map();
    this.idf = {};
    this.termFreq = {};
    this.totalDocs = 0;
  }

  addDocument(id, text, metadata = {}) {
    const tokens = this._tokenize(text);
    const tf = {};

    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    // Normalize TF
    const maxTF = Math.max(...Object.values(tf));
    for (const token of Object.keys(tf)) {
      tf[token] = 0.5 + 0.5 * (tf[token] / (maxTF || 1));
    }

    this.documents.set(id, { tf, tokens, metadata, text });
    this.totalDocs++;

    // Update document frequency
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      this.termFreq[token] = (this.termFreq[token] || 0) + 1;
    }
  }

  buildIndex() {
    // Compute IDF for all terms
    for (const [term, freq] of Object.entries(this.termFreq)) {
      this.idf[term] = Math.log(this.totalDocs / (1 + freq));
    }
  }

  search(query, limit = 20) {
    const queryTokens = this._tokenize(query);
    const queryTF = {};

    for (const token of queryTokens) {
      queryTF[token] = (queryTF[token] || 0) + 1;
    }

    const results = [];

    for (const [docId, doc] of this.documents) {
      let score = 0;

      for (const token of queryTokens) {
        const docTF = doc.tf[token] || 0;
        const idf = this.idf[token] || 0;
        score += docTF * idf * (queryTF[token] || 1);
      }

      if (score > 0) {
        results.push({
          id: docId,
          score,
          metadata: doc.metadata,
          snippet: this._generateSnippet(doc.text, queryTokens)
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  _tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s₹]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1)
      .filter(t => !this._isStopWord(t));
  }

  _isStopWord(word) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'from', 'by', 'as', 'it', 'this',
      'that', 'was', 'are', 'be', 'has', 'had', 'have', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them'
    ]);
    return stopWords.has(word);
  }

  _generateSnippet(text, queryTokens, maxLength = 150) {
    const lower = text.toLowerCase();
    let bestStart = 0;
    let bestScore = 0;

    for (let i = 0; i < text.length - maxLength; i += 20) {
      const window = lower.substring(i, i + maxLength);
      const score = queryTokens.filter(t => window.includes(t)).length;
      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }

    return text.substring(bestStart, bestStart + maxLength).trim() + '...';
  }
}

// ============================================================================
// §2  QUERY PARSER — Natural Language Financial Query Understanding
// ============================================================================

class FinancialQueryParser {
  constructor() {
    this.amountPatterns = [
      { regex: /(?:over|above|more than|greater than|>)\s*[₹Rs.]?\s*([\d,]+)/i, operator: 'gt' },
      { regex: /(?:under|below|less than|<)\s*[₹Rs.]?\s*([\d,]+)/i, operator: 'lt' },
      { regex: /(?:between|from)\s*[₹Rs.]?\s*([\d,]+)\s*(?:to|and|-)\s*[₹Rs.]?\s*([\d,]+)/i, operator: 'between' },
      { regex: /(?:exactly|equal to|=)\s*[₹Rs.]?\s*([\d,]+)/i, operator: 'eq' },
      { regex: /[₹Rs.]\s*([\d,]+)/i, operator: 'eq' }
    ];

    this.timePatterns = [
      { regex: /today/i, period: 'today' },
      { regex: /yesterday/i, period: 'yesterday' },
      { regex: /this week/i, period: 'this_week' },
      { regex: /last week/i, period: 'last_week' },
      { regex: /this month/i, period: 'this_month' },
      { regex: /last month/i, period: 'last_month' },
      { regex: /last (\d+) days?/i, period: 'last_n_days' },
      { regex: /last (\d+) months?/i, period: 'last_n_months' },
      { regex: /this year/i, period: 'this_year' },
      { regex: /last year/i, period: 'last_year' },
      { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i, period: 'specific_month' }
    ];

    this.categoryPatterns = {
      food: /food|restaurant|dining|groceries?|swiggy|zomato|eat|lunch|dinner|breakfast|snack/i,
      transport: /transport|uber|ola|cab|taxi|petrol|diesel|fuel|bus|train|metro|travel|flight/i,
      shopping: /shopping|amazon|flipkart|myntra|clothes|fashion|mall|store|purchase/i,
      utilities: /utilities?|electric|water|gas|phone|mobile|internet|wifi|broadband|bill/i,
      entertainment: /entertainment|movie|netflix|spotify|game|concert|show|cinema|subscription/i,
      healthcare: /health|medical|hospital|doctor|pharmacy|medicine|gym|fitness/i,
      education: /education|school|college|course|tuition|book|training/i,
      rent: /rent|housing|apartment|flat|maintenance|society/i,
      insurance: /insurance|premium|lic|cover|policy/i,
      investment: /invest|sip|mutual fund|stock|share|fd|ppf|nps|portfolio/i,
      salary: /salary|wages|income|pay|bonus|freelance/i,
      loan: /loan|emi|debt|borrow|repay|interest/i,
      transfer: /transfer|sent|paid|upi|neft|imps|rtgs/i
    };

    this.transactionTypePatterns = {
      expense: /expense|spent|spend|debit|payment|purchase|bought/i,
      income: /income|credit|received|earned|salary|refund/i,
      transfer: /transfer|sent|moved/i
    };

    this.sortPatterns = {
      highest: /highest|largest|biggest|most expensive|top|maximum/i,
      lowest: /lowest|smallest|cheapest|least|minimum/i,
      recent: /recent|latest|newest|last/i,
      oldest: /oldest|earliest|first/i
    };
  }

  parse(query) {
    const result = {
      originalQuery: query,
      intent: this._detectIntent(query),
      filters: {
        amount: this._extractAmount(query),
        timePeriod: this._extractTimePeriod(query),
        category: this._extractCategory(query),
        transactionType: this._extractTransactionType(query),
        merchant: this._extractMerchant(query)
      },
      sort: this._extractSort(query),
      limit: this._extractLimit(query),
      aggregation: this._extractAggregation(query)
    };

    return result;
  }

  _detectIntent(query) {
    const q = query.toLowerCase();

    if (/how much|total|sum|spent|spend/i.test(q)) return 'aggregate_amount';
    if (/show|list|find|search|get|display|view/i.test(q)) return 'search';
    if (/compare|vs|versus|difference/i.test(q)) return 'compare';
    if (/trend|pattern|over time|chart/i.test(q)) return 'trend';
    if (/top|highest|biggest|most/i.test(q)) return 'top_n';
    if (/average|avg|mean/i.test(q)) return 'average';
    if (/count|how many|number of/i.test(q)) return 'count';
    if (/breakdown|split|distribution|percent/i.test(q)) return 'breakdown';
    if (/forecast|predict|next month|expect/i.test(q)) return 'forecast';
    if (/budget|limit|remaining/i.test(q)) return 'budget';

    return 'search';
  }

  _extractAmount(query) {
    for (const pattern of this.amountPatterns) {
      const match = query.match(pattern.regex);
      if (match) {
        const val1 = parseFloat(match[1].replace(/,/g, ''));
        const val2 = match[2] ? parseFloat(match[2].replace(/,/g, '')) : null;
        return {
          operator: pattern.operator,
          value: val1,
          value2: val2
        };
      }
    }
    return null;
  }

  _extractTimePeriod(query) {
    for (const pattern of this.timePatterns) {
      const match = query.match(pattern.regex);
      if (match) {
        const now = new Date();
        let start, end = now;

        switch (pattern.period) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this_week':
            start = new Date(now); start.setDate(now.getDate() - now.getDay());
            break;
          case 'last_week':
            start = new Date(now); start.setDate(now.getDate() - now.getDay() - 7);
            end = new Date(now); end.setDate(now.getDate() - now.getDay());
            break;
          case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'last_n_days':
            start = new Date(now.getTime() - parseInt(match[1]) * 86400000);
            break;
          case 'last_n_months':
            start = new Date(now.getFullYear(), now.getMonth() - parseInt(match[1]), now.getDate());
            break;
          case 'this_year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last_year':
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
            break;
          default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return { label: pattern.period, start, end };
      }
    }
    return null;
  }

  _extractCategory(query) {
    for (const [category, pattern] of Object.entries(this.categoryPatterns)) {
      if (pattern.test(query)) return category;
    }
    return null;
  }

  _extractTransactionType(query) {
    for (const [type, pattern] of Object.entries(this.transactionTypePatterns)) {
      if (pattern.test(query)) return type;
    }
    return null;
  }

  _extractMerchant(query) {
    const merchants = [
      'swiggy', 'zomato', 'uber', 'ola', 'amazon', 'flipkart',
      'netflix', 'spotify', 'airtel', 'jio', 'paytm', 'phonepe',
      'myntra', 'bigbasket', 'blinkit', 'zepto', 'cred'
    ];

    const lower = query.toLowerCase();
    for (const m of merchants) {
      if (lower.includes(m)) return m;
    }
    return null;
  }

  _extractSort(query) {
    for (const [order, pattern] of Object.entries(this.sortPatterns)) {
      if (pattern.test(query)) return order;
    }
    return 'recent'; // Default sort
  }

  _extractLimit(query) {
    const match = query.match(/(?:top|first|last|show)\s*(\d+)/i);
    return match ? parseInt(match[1]) : 20;
  }

  _extractAggregation(query) {
    if (/total|sum|how much/i.test(query)) return 'sum';
    if (/average|avg|mean/i.test(query)) return 'average';
    if (/count|how many/i.test(query)) return 'count';
    if (/max|highest|biggest/i.test(query)) return 'max';
    if (/min|lowest|smallest/i.test(query)) return 'min';
    if (/breakdown|distribution|by category/i.test(query)) return 'group_by';
    return null;
  }
}

// ============================================================================
// §3  TRANSACTION SEARCH ENGINE
// ============================================================================

class TransactionSearchEngine {
  constructor() {
    this.queryParser = new FinancialQueryParser();
    this.tfidfIndex = new TFIDFIndex();
    this.indexed = false;
  }

  indexTransactions(transactions) {
    for (const txn of transactions) {
      const text = [
        txn.description || '',
        txn.merchant || '',
        txn.category || '',
        txn.type || '',
        txn.notes || '',
        `₹${Math.abs(txn.amount || 0)}`
      ].join(' ');

      this.tfidfIndex.addDocument(txn._id || txn.id || String(Math.random()), text, {
        amount: Math.abs(txn.amount || 0),
        type: txn.type,
        category: txn.category,
        date: txn.date,
        merchant: txn.merchant || txn.description
      });
    }

    this.tfidfIndex.buildIndex();
    this.indexed = true;
  }

  search(query, transactions) {
    const parsed = this.queryParser.parse(query);

    // Filter transactions based on parsed query
    let filtered = [...transactions];

    // Apply transaction type filter
    if (parsed.filters.transactionType) {
      filtered = filtered.filter(t => t.type === parsed.filters.transactionType);
    }

    // Apply category filter
    if (parsed.filters.category) {
      filtered = filtered.filter(t =>
        (t.category || '').toLowerCase().includes(parsed.filters.category)
      );
    }

    // Apply amount filter
    if (parsed.filters.amount) {
      const { operator, value, value2 } = parsed.filters.amount;
      filtered = filtered.filter(t => {
        const amt = Math.abs(t.amount || 0);
        switch (operator) {
          case 'gt': return amt > value;
          case 'lt': return amt < value;
          case 'eq': return Math.abs(amt - value) < 1;
          case 'between': return amt >= value && amt <= value2;
          default: return true;
        }
      });
    }

    // Apply time period filter
    if (parsed.filters.timePeriod) {
      const { start, end } = parsed.filters.timePeriod;
      filtered = filtered.filter(t => {
        const d = new Date(t.date || 0);
        return d >= start && d <= end;
      });
    }

    // Apply merchant filter
    if (parsed.filters.merchant) {
      filtered = filtered.filter(t =>
        (t.merchant || t.description || '').toLowerCase().includes(parsed.filters.merchant)
      );
    }

    // Apply sorting
    switch (parsed.sort) {
      case 'highest':
        filtered.sort((a, b) => Math.abs(b.amount || 0) - Math.abs(a.amount || 0));
        break;
      case 'lowest':
        filtered.sort((a, b) => Math.abs(a.amount || 0) - Math.abs(b.amount || 0));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    // Apply limit
    const limited = filtered.slice(0, parsed.limit);

    // Compute aggregation if requested
    let aggregation = null;
    if (parsed.aggregation) {
      const amounts = filtered.map(t => Math.abs(t.amount || 0));
      switch (parsed.aggregation) {
        case 'sum':
          aggregation = { type: 'sum', value: sum(amounts), label: `Total: ₹${sum(amounts).toLocaleString()}` };
          break;
        case 'average':
          aggregation = { type: 'average', value: mean(amounts), label: `Average: ₹${Math.round(mean(amounts)).toLocaleString()}` };
          break;
        case 'count':
          aggregation = { type: 'count', value: filtered.length, label: `${filtered.length} transactions` };
          break;
        case 'max':
          aggregation = { type: 'max', value: Math.max(...amounts), label: `Highest: ₹${Math.max(...amounts).toLocaleString()}` };
          break;
        case 'min':
          aggregation = { type: 'min', value: amounts.length > 0 ? Math.min(...amounts) : 0, label: `Lowest: ₹${(amounts.length > 0 ? Math.min(...amounts) : 0).toLocaleString()}` };
          break;
        case 'group_by':
          const groups = {};
          for (const t of filtered) {
            const cat = t.category || 'uncategorized';
            groups[cat] = (groups[cat] || 0) + Math.abs(t.amount || 0);
          }
          aggregation = {
            type: 'group_by',
            groups: Object.entries(groups)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => ({ category: cat, total: Math.round(total) })),
            label: `${Object.keys(groups).length} categories`
          };
          break;
      }
    }

    // Generate natural language response
    const nlResponse = this._generateNLResponse(parsed, filtered, aggregation);

    return {
      query: parsed.originalQuery,
      parsedQuery: parsed,
      results: limited.map(t => ({
        id: t._id || t.id,
        amount: Math.abs(t.amount || 0),
        type: t.type,
        category: t.category,
        description: t.description || t.merchant,
        date: t.date,
        merchant: t.merchant
      })),
      totalResults: filtered.length,
      displayed: limited.length,
      aggregation,
      naturalLanguageResponse: nlResponse,
      searchedAt: new Date()
    };
  }

  _generateNLResponse(parsed, results, aggregation) {
    const parts = [];

    if (aggregation) {
      switch (aggregation.type) {
        case 'sum':
          parts.push(`You spent a total of ₹${aggregation.value.toLocaleString()}`);
          break;
        case 'average':
          parts.push(`Average transaction is ₹${Math.round(aggregation.value).toLocaleString()}`);
          break;
        case 'count':
          parts.push(`Found ${aggregation.value} transactions`);
          break;
        case 'max':
          parts.push(`Highest transaction: ₹${aggregation.value.toLocaleString()}`);
          break;
        case 'group_by':
          parts.push(`Here's the breakdown across ${aggregation.groups.length} categories`);
          break;
      }
    } else {
      parts.push(`Found ${results.length} matching transactions`);
    }

    // Add filters context
    const context = [];
    if (parsed.filters.category) context.push(`in ${parsed.filters.category}`);
    if (parsed.filters.timePeriod) context.push(`${parsed.filters.timePeriod.label.replace(/_/g, ' ')}`);
    if (parsed.filters.merchant) context.push(`at ${parsed.filters.merchant}`);
    if (parsed.filters.amount) {
      const a = parsed.filters.amount;
      if (a.operator === 'gt') context.push(`over ₹${a.value.toLocaleString()}`);
      if (a.operator === 'lt') context.push(`under ₹${a.value.toLocaleString()}`);
    }

    if (context.length > 0) parts.push(context.join(' '));

    return parts.join(' ') + '.';
  }
}

// ============================================================================
// §4  FUZZY MATCHER
// ============================================================================

class FuzzyMatcher {
  match(query, candidates, threshold = 0.6) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const candidate of candidates) {
      const candLower = (typeof candidate === 'string' ? candidate : candidate.name || '').toLowerCase();
      const similarity = this._levenshteinSimilarity(queryLower, candLower);
      const containsMatch = candLower.includes(queryLower) || queryLower.includes(candLower);

      if (similarity >= threshold || containsMatch) {
        results.push({
          item: candidate,
          similarity,
          containsMatch,
          score: containsMatch ? 1 : similarity
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  _levenshteinSimilarity(a, b) {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - this._levenshteinDistance(a, b) / maxLen;
  }

  _levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[m][n];
  }
}

// ============================================================================
// §5  UNIFIED SEMANTIC SEARCH SERVICE
// ============================================================================

class SemanticSearchService {
  constructor() {
    this.searchEngine = new TransactionSearchEngine();
    this.fuzzyMatcher = new FuzzyMatcher();
    this.queryParser = new FinancialQueryParser();
  }

  search(query, transactions) {
    return this.searchEngine.search(query, transactions);
  }

  parseQuery(query) {
    return this.queryParser.parse(query);
  }

  fuzzySearch(query, items, threshold = 0.5) {
    return this.fuzzyMatcher.match(query, items, threshold);
  }

  getSuggestions(partialQuery) {
    const suggestions = [
      'Show me food expenses this month',
      'Total spending last week',
      'Transactions over ₹5,000',
      'Amazon purchases this year',
      'Average daily spending',
      'Highest expense last month',
      'Compare food vs transport spending',
      'Spending breakdown by category',
      'List all subscriptions',
      'EMI payments this month',
      'Salary credited last 3 months',
      'Top 10 expenses this month'
    ];

    if (!partialQuery) return suggestions.slice(0, 6);

    return this.fuzzyMatcher.match(partialQuery, suggestions, 0.3)
      .slice(0, 6)
      .map(r => r.item);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TFIDFIndex,
  FinancialQueryParser,
  TransactionSearchEngine,
  FuzzyMatcher,
  SemanticSearchService
};
