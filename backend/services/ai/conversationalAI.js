// ============================================================================
// ADVANCED CONVERSATIONAL AI ENGINE — Context-Aware Financial Chatbot
// ============================================================================
// Multi-turn conversation management with memory, intent classification,
// entity extraction, context tracking, and financial domain knowledge.
// Runs entirely locally without external API dependencies.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

// ============================================================================
// §1  CONVERSATION MEMORY — Long-Term & Short-Term Memory Management
// ============================================================================

class ConversationMemory {
  constructor(config = {}) {
    this.shortTermMemory = [];    // Recent messages
    this.longTermMemory = {};     // Indexed topic memories
    this.entityMemory = {};       // Extracted entities
    this.preferenceMemory = {};   // User preferences
    this.maxShortTerm = config.maxShortTerm || 20;
    this.maxLongTerm = config.maxLongTerm || 100;
    this.summaryInterval = config.summaryInterval || 10;
    this.messageCount = 0;
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
      entities: metadata.entities || [],
      intent: metadata.intent || null
    };

    this.shortTermMemory.push(message);
    this.messageCount++;

    // Trim short-term memory
    if (this.shortTermMemory.length > this.maxShortTerm) {
      const removed = this.shortTermMemory.shift();
      this._archiveToLongTerm(removed);
    }

    // Update entity memory
    if (metadata.entities) {
      for (const entity of metadata.entities) {
        if (!this.entityMemory[entity.type]) this.entityMemory[entity.type] = [];
        this.entityMemory[entity.type].push({
          value: entity.value,
          timestamp: new Date(),
          context: content.substring(0, 100)
        });
        // Keep last 20 per type
        if (this.entityMemory[entity.type].length > 20) {
          this.entityMemory[entity.type].shift();
        }
      }
    }

    return message;
  }

  _archiveToLongTerm(message) {
    const topic = message.intent || 'general';
    if (!this.longTermMemory[topic]) this.longTermMemory[topic] = [];
    this.longTermMemory[topic].push({
      content: message.content.substring(0, 200),
      timestamp: message.timestamp,
      entities: message.entities
    });

    // Trim long-term memory per topic
    if (this.longTermMemory[topic].length > this.maxLongTerm) {
      this.longTermMemory[topic].shift();
    }
  }

  getRecentContext(n = 5) {
    return this.shortTermMemory.slice(-n);
  }

  getContextForTopic(topic) {
    return this.longTermMemory[topic] || [];
  }

  getEntities(type = null) {
    if (type) return this.entityMemory[type] || [];
    return this.entityMemory;
  }

  getLastMentioned(entityType) {
    const entities = this.entityMemory[entityType] || [];
    return entities.length > 0 ? entities[entities.length - 1] : null;
  }

  setPreference(key, value) {
    this.preferenceMemory[key] = { value, updatedAt: new Date() };
  }

  getPreference(key) {
    return this.preferenceMemory[key]?.value;
  }

  summarize() {
    const topics = Object.keys(this.longTermMemory);
    const entityTypes = Object.keys(this.entityMemory);

    return {
      totalMessages: this.messageCount,
      shortTermMessages: this.shortTermMemory.length,
      topicsDiscussed: topics,
      entityTypes,
      recentTopics: this.shortTermMemory
        .filter(m => m.intent)
        .map(m => m.intent)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(-5),
      preferences: Object.fromEntries(
        Object.entries(this.preferenceMemory).map(([k, v]) => [k, v.value])
      )
    };
  }

  clear() {
    this.shortTermMemory = [];
    this.longTermMemory = {};
    this.entityMemory = {};
    this.messageCount = 0;
  }

  serialize() {
    return {
      shortTermMemory: this.shortTermMemory.slice(-10),
      longTermMemory: this.longTermMemory,
      entityMemory: this.entityMemory,
      preferenceMemory: this.preferenceMemory,
      messageCount: this.messageCount
    };
  }

  deserialize(data) {
    this.shortTermMemory = data.shortTermMemory || [];
    this.longTermMemory = data.longTermMemory || {};
    this.entityMemory = data.entityMemory || {};
    this.preferenceMemory = data.preferenceMemory || {};
    this.messageCount = data.messageCount || 0;
  }
}

// ============================================================================
// §2  INTENT CLASSIFIER — Financial Domain Intent Recognition
// ============================================================================

class FinancialIntentClassifier {
  constructor() {
    this.intents = {
      // Spending queries
      spending_query: {
        patterns: [
          /how much.*(spend|spent|spending)/i,
          /what.*(spend|spent|expense)/i,
          /show.*(expense|spending|transaction)/i,
          /my (expense|spending)/i,
          /total.*(spend|expense)/i,
          /expense.*breakdown/i,
          /spending.*categor/i
        ],
        slots: ['category', 'time_period', 'merchant']
      },

      // Budget queries
      budget_query: {
        patterns: [
          /budget/i,
          /how much.*(left|remaining)/i,
          /budget.*(status|report|overview)/i,
          /am i.*over.?budget/i,
          /set.*budget/i,
          /budget.*categor/i
        ],
        slots: ['category', 'amount', 'time_period']
      },

      // Savings queries
      savings_query: {
        patterns: [
          /how much.*(saved?|saving)/i,
          /saving.*(rate|tips|advice)/i,
          /emergency fund/i,
          /how (can|to) save/i,
          /savings.*(goal|target)/i,
          /put aside/i
        ],
        slots: ['amount', 'time_period', 'goal']
      },

      // Investment queries
      investment_query: {
        patterns: [
          /invest/i,
          /portfolio/i,
          /stock|mutual fund|sip/i,
          /return.*(invest|portfolio)/i,
          /where.*(invest|put.*money)/i,
          /asset.*allocat/i,
          /nifty|sensex|nps|ppf/i
        ],
        slots: ['asset_class', 'amount', 'risk_level', 'time_horizon']
      },

      // Loan/Debt queries
      loan_query: {
        patterns: [
          /loan/i,
          /emi/i,
          /debt/i,
          /borrow/i,
          /interest rate/i,
          /repay/i,
          /outstanding/i,
          /prepay/i,
          /credit card.*(bill|payment|due)/i
        ],
        slots: ['loan_type', 'amount', 'interest_rate', 'tenure']
      },

      // Tax queries
      tax_query: {
        patterns: [
          /tax/i,
          /80[cCdD]/i,
          /deduction/i,
          /income tax/i,
          /itr/i,
          /tax.*(save|saving|plan)/i,
          /new.*regime|old.*regime/i
        ],
        slots: ['tax_section', 'amount', 'tax_year']
      },

      // Financial health
      health_query: {
        patterns: [
          /financial.*(health|score|status)/i,
          /how.*doing.*financ/i,
          /financial.*checkup/i,
          /money.*health/i,
          /cibil|credit.*score/i
        ],
        slots: []
      },

      // Goal tracking
      goal_query: {
        patterns: [
          /goal/i,
          /target/i,
          /saving.*for/i,
          /when.*(achieve|reach)/i,
          /progress/i,
          /how (close|far)/i
        ],
        slots: ['goal_name', 'target_amount', 'deadline']
      },

      // Forecast/Prediction
      forecast_query: {
        patterns: [
          /forecast/i,
          /predict/i,
          /next month/i,
          /project/i,
          /expect.*(spend|income|expense)/i,
          /cash.*flow/i,
          /trend/i
        ],
        slots: ['category', 'time_period', 'metric']
      },

      // Anomaly detection
      anomaly_query: {
        patterns: [
          /anomal/i,
          /unusual/i,
          /suspicious/i,
          /fraud/i,
          /unexpected/i,
          /weird.*transaction/i,
          /strange.*charge/i
        ],
        slots: ['time_period']
      },

      // Insurance
      insurance_query: {
        patterns: [
          /insurance/i,
          /term.*plan/i,
          /health.*cover/i,
          /premium/i,
          /claim/i,
          /medical.*(insurance|cover)/i
        ],
        slots: ['insurance_type', 'cover_amount']
      },

      // Comparison
      comparison_query: {
        patterns: [
          /compare/i,
          /vs|versus/i,
          /difference between/i,
          /better.*(option|choice)/i,
          /which.*is.*better/i
        ],
        slots: ['item_a', 'item_b', 'metric']
      },

      // Help/Advice
      advice_query: {
        patterns: [
          /advice|advise/i,
          /recommend/i,
          /suggest/i,
          /tip|tips/i,
          /help.*with/i,
          /what.*should.*i/i,
          /best.*way/i,
          /how.*improv/i
        ],
        slots: ['topic']
      },

      // Greeting
      greeting: {
        patterns: [
          /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste)/i,
          /^(howdy|sup|what's up)/i
        ],
        slots: []
      },

      // Thank you
      gratitude: {
        patterns: [
          /thank/i,
          /thanks/i,
          /appreciate/i,
          /helpful/i
        ],
        slots: []
      },

      // Report generation
      report_query: {
        patterns: [
          /report/i,
          /summary/i,
          /overview/i,
          /dashboard/i,
          /monthly.*report/i,
          /weekly.*summary/i
        ],
        slots: ['report_type', 'time_period']
      }
    };

    // Custom trained patterns
    this.learnedPatterns = {};
    this.confidenceThreshold = 0.1;
  }

  classify(text) {
    const normalizedText = text.toLowerCase().trim();
    const scores = {};

    for (const [intent, config] of Object.entries(this.intents)) {
      let score = 0;
      let matchCount = 0;

      for (const pattern of config.patterns) {
        if (pattern.test(normalizedText)) {
          score += 1;
          matchCount++;
        }
      }

      // Check learned patterns
      const learned = this.learnedPatterns[intent] || [];
      for (const lp of learned) {
        if (normalizedText.includes(lp.pattern.toLowerCase())) {
          score += lp.weight || 0.5;
          matchCount++;
        }
      }

      if (matchCount > 0) {
        scores[intent] = score / Math.max(config.patterns.length, 1);
      }
    }

    // Sort by score
    const ranked = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0 || ranked[0][1] < this.confidenceThreshold) {
      return {
        intent: 'unknown',
        confidence: 0,
        allIntents: [],
        slots: {}
      };
    }

    const topIntent = ranked[0][0];
    const slots = this._extractSlots(normalizedText, this.intents[topIntent]?.slots || []);

    return {
      intent: topIntent,
      confidence: Math.min(ranked[0][1], 1),
      allIntents: ranked.slice(0, 3).map(([intent, score]) => ({ intent, score })),
      slots
    };
  }

  _extractSlots(text, slotTypes) {
    const slots = {};

    for (const slotType of slotTypes) {
      const value = this._extractSlotValue(text, slotType);
      if (value) slots[slotType] = value;
    }

    return slots;
  }

  _extractSlotValue(text, slotType) {
    switch (slotType) {
      case 'category':
        return this._extractCategory(text);
      case 'time_period':
        return this._extractTimePeriod(text);
      case 'amount':
        return this._extractAmount(text);
      case 'merchant':
        return this._extractMerchant(text);
      case 'risk_level':
        return this._extractRiskLevel(text);
      case 'loan_type':
        return this._extractLoanType(text);
      case 'goal_name':
        return this._extractGoalName(text);
      default:
        return null;
    }
  }

  _extractCategory(text) {
    const categories = {
      food: /food|restaurant|dining|groceries|swiggy|zomato|eat/i,
      transport: /transport|uber|ola|cab|taxi|fuel|petrol|diesel/i,
      shopping: /shopping|amazon|flipkart|myntra|clothes|fashion/i,
      utilities: /utility|utilit|electric|water|gas|phone|internet|wifi|broadband/i,
      entertainment: /entertainment|movie|netflix|spotify|game|subscription/i,
      healthcare: /health|medical|hospital|doctor|pharmacy|medicine|gym/i,
      education: /education|school|college|course|tuition|book/i,
      rent: /rent|housing|apartment|flat/i,
      insurance: /insurance|premium|cover/i,
      investment: /invest|sip|mutual fund|stock|fd|ppf/i
    };

    for (const [cat, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) return cat;
    }
    return null;
  }

  _extractTimePeriod(text) {
    if (/today/i.test(text)) return 'today';
    if (/yesterday/i.test(text)) return 'yesterday';
    if (/this week/i.test(text)) return 'this_week';
    if (/last week/i.test(text)) return 'last_week';
    if (/this month/i.test(text)) return 'this_month';
    if (/last month/i.test(text)) return 'last_month';
    if (/this year/i.test(text)) return 'this_year';
    if (/last year/i.test(text)) return 'last_year';
    if (/last (\d+) day/i.test(text)) return `last_${RegExp.$1}_days`;
    if (/last (\d+) month/i.test(text)) return `last_${RegExp.$1}_months`;
    if (/(\w+ \d{4})/i.test(text)) return RegExp.$1;
    return null;
  }

  _extractAmount(text) {
    const patterns = [
      /₹\s*([\d,]+(?:\.\d+)?)/,
      /rs\.?\s*([\d,]+(?:\.\d+)?)/i,
      /inr\s*([\d,]+(?:\.\d+)?)/i,
      /([\d,]+(?:\.\d+)?)\s*(?:rupee|rs|₹|inr)/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|l)/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:crore|cr)/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        if (/lakh|lac/i.test(text)) amount *= 100000;
        if (/crore|cr/i.test(text)) amount *= 10000000;
        if (/k|thousand/i.test(text)) amount *= 1000;
        return amount;
      }
    }
    return null;
  }

  _extractMerchant(text) {
    const merchants = [
      'amazon', 'flipkart', 'swiggy', 'zomato', 'uber', 'ola',
      'netflix', 'spotify', 'airtel', 'jio', 'bsnl', 'vodafone',
      'myntra', 'ajio', 'paytm', 'phonepe', 'gpay', 'cred',
      'bigbasket', 'blinkit', 'zepto', 'dmart', 'reliance'
    ];

    for (const merchant of merchants) {
      if (text.toLowerCase().includes(merchant)) return merchant;
    }
    return null;
  }

  _extractRiskLevel(text) {
    if (/aggressive|high risk/i.test(text)) return 'aggressive';
    if (/moderate|medium risk|balanced/i.test(text)) return 'moderate';
    if (/conservative|low risk|safe/i.test(text)) return 'conservative';
    return null;
  }

  _extractLoanType(text) {
    if (/home loan|housing loan|mortgage/i.test(text)) return 'home_loan';
    if (/personal loan/i.test(text)) return 'personal_loan';
    if (/car loan|auto loan|vehicle loan/i.test(text)) return 'car_loan';
    if (/education loan|student loan/i.test(text)) return 'education_loan';
    if (/gold loan/i.test(text)) return 'gold_loan';
    if (/credit card/i.test(text)) return 'credit_card';
    return null;
  }

  _extractGoalName(text) {
    const goalPatterns = [
      { pattern: /buy.*house|home/i, goal: 'Buy House' },
      { pattern: /buy.*car|vehicle/i, goal: 'Buy Car' },
      { pattern: /vacation|travel|trip/i, goal: 'Vacation' },
      { pattern: /wedding|marriage/i, goal: 'Wedding' },
      { pattern: /retire|retirement/i, goal: 'Retirement' },
      { pattern: /education|college|university/i, goal: 'Education' },
      { pattern: /emergency|rainy day/i, goal: 'Emergency Fund' },
      { pattern: /child|kid|baby/i, goal: 'Child Planning' }
    ];

    for (const { pattern, goal } of goalPatterns) {
      if (pattern.test(text)) return goal;
    }
    return null;
  }

  // Learn from user interactions
  learn(text, correctIntent) {
    if (!this.learnedPatterns[correctIntent]) {
      this.learnedPatterns[correctIntent] = [];
    }

    // Extract key phrases
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const phrases = [];
    for (let i = 0; i < words.length; i++) {
      phrases.push(words[i]);
      if (i < words.length - 1) phrases.push(`${words[i]} ${words[i + 1]}`);
    }

    for (const phrase of phrases) {
      const existing = this.learnedPatterns[correctIntent].find(p => p.pattern === phrase);
      if (existing) {
        existing.weight = Math.min(existing.weight + 0.1, 1.0);
      } else {
        this.learnedPatterns[correctIntent].push({ pattern: phrase, weight: 0.3 });
      }
    }
  }
}

// ============================================================================
// §3  FINANCIAL ENTITY EXTRACTOR — Named Entity Recognition for Finance
// ============================================================================

class FinancialEntityExtractor {
  constructor() {
    this.patterns = {
      money: [
        { regex: /₹\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k|thousand)?/gi, type: 'MONEY' },
        { regex: /(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k|thousand)?/gi, type: 'MONEY' },
        { regex: /([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs|₹|inr)/gi, type: 'MONEY' }
      ],
      percentage: [
        { regex: /([\d.]+)\s*%/g, type: 'PERCENTAGE' },
        { regex: /([\d.]+)\s*percent/gi, type: 'PERCENTAGE' }
      ],
      date: [
        { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g, type: 'DATE' },
        { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,2},?\s*\d{0,4}/gi, type: 'DATE' },
        { regex: /(today|yesterday|tomorrow|last\s+(?:week|month|year)|this\s+(?:week|month|year)|next\s+(?:week|month|year))/gi, type: 'RELATIVE_DATE' }
      ],
      duration: [
        { regex: /(\d+)\s*(year|month|week|day)s?/gi, type: 'DURATION' }
      ],
      financialProduct: [
        { regex: /(?:mutual fund|sip|elss|ppf|nps|epf|fd|fixed deposit|recurring deposit|rd|nsc|kvp|scss)/gi, type: 'FINANCIAL_PRODUCT' },
        { regex: /(?:term insurance|health insurance|motor insurance|ulip|endowment)/gi, type: 'INSURANCE_PRODUCT' },
        { regex: /(?:nifty 50|sensex|bank nifty|gold etf|silver etf)/gi, type: 'MARKET_INDEX' }
      ],
      bank: [
        { regex: /(?:sbi|hdfc|icici|axis|kotak|yes bank|indusind|bob|pnb|canara|union bank|idbi|rbl|federal bank|bandhan)/gi, type: 'BANK' }
      ],
      upi: [
        { regex: /[\w.]+@(?:upi|paytm|ybl|oksbi|okhdfcbank|okicici|axl|ibl)/gi, type: 'UPI_ID' }
      ],
      taxSection: [
        { regex: /(?:section\s*)?80[cCdDeEgG](?:\(\d+[bB]?\))?/g, type: 'TAX_SECTION' },
        { regex: /(?:section\s*)?24\(?[bB]?\)?/g, type: 'TAX_SECTION' },
        { regex: /(?:section\s*)?10\(\d+\)/g, type: 'TAX_SECTION' }
      ]
    };
  }

  extract(text) {
    const entities = [];

    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const { regex, type } of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          entities.push({
            type,
            value: match[0].trim(),
            parsed: this._parseValue(type, match),
            position: match.index,
            length: match[0].length,
            category
          });
        }
      }
    }

    // Deduplicate overlapping entities
    return this._deduplicateEntities(entities);
  }

  _parseValue(type, match) {
    switch (type) {
      case 'MONEY': {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const multiplier = (match[2] || '').toLowerCase();
        if (multiplier === 'lakh' || multiplier === 'lac') amount *= 100000;
        if (multiplier === 'crore' || multiplier === 'cr') amount *= 10000000;
        if (multiplier === 'k' || multiplier === 'thousand') amount *= 1000;
        return { amount, currency: 'INR' };
      }
      case 'PERCENTAGE':
        return { value: parseFloat(match[1]) };
      case 'DURATION':
        return { value: parseInt(match[1]), unit: match[2].toLowerCase() };
      default:
        return { raw: match[0] };
    }
  }

  _deduplicateEntities(entities) {
    return entities.filter((entity, idx) => {
      for (let i = 0; i < idx; i++) {
        const other = entities[i];
        if (entity.position >= other.position &&
            entity.position < other.position + other.length) {
          return false;
        }
      }
      return true;
    });
  }
}

// ============================================================================
// §4  DIALOG STATE TRACKER — Maintain Conversation State
// ============================================================================

class DialogStateTracker {
  constructor() {
    this.state = {
      currentIntent: null,
      slots: {},
      confirmationPending: false,
      awaitingSlot: null,
      context: {},
      turnCount: 0,
      lastUpdated: null
    };
    this.stateHistory = [];
  }

  update(intent, slots = {}, entities = []) {
    const previousState = { ...this.state };
    this.stateHistory.push(previousState);
    if (this.stateHistory.length > 20) this.stateHistory.shift();

    // Update intent (keep previous if new is unknown)
    if (intent.intent !== 'unknown') {
      this.state.currentIntent = intent.intent;
    }

    // Merge slots
    for (const [key, value] of Object.entries(slots)) {
      if (value !== null && value !== undefined) {
        this.state.slots[key] = value;
      }
    }

    // Update from entities
    for (const entity of entities) {
      switch (entity.type) {
        case 'MONEY':
          this.state.slots.amount = entity.parsed?.amount;
          break;
        case 'PERCENTAGE':
          this.state.slots.percentage = entity.parsed?.value;
          break;
        case 'RELATIVE_DATE':
        case 'DATE':
          this.state.slots.time_period = entity.value;
          break;
        case 'DURATION':
          this.state.slots.duration = entity.parsed;
          break;
        case 'FINANCIAL_PRODUCT':
          this.state.slots.product = entity.value;
          break;
      }
    }

    this.state.turnCount++;
    this.state.lastUpdated = new Date();

    return this.state;
  }

  getState() { return { ...this.state }; }

  getSlot(name) { return this.state.slots[name]; }

  setSlot(name, value) { this.state.slots[name] = value; }

  getMissingSlots(requiredSlots) {
    return requiredSlots.filter(slot => !this.state.slots[slot]);
  }

  reset() {
    this.state = {
      currentIntent: null,
      slots: {},
      confirmationPending: false,
      awaitingSlot: null,
      context: {},
      turnCount: 0,
      lastUpdated: null
    };
  }

  isFollowUp() {
    return this.state.turnCount > 1 && this.state.currentIntent !== null;
  }
}

// ============================================================================
// §5  RESPONSE GENERATOR — Generate Contextual Financial Responses
// ============================================================================

class FinancialResponseGenerator {
  constructor() {
    this.greetings = [
      'Hello! I\'m your AI financial assistant. How can I help you manage your money today?',
      'Hi there! Ready to help with your finances. What would you like to know?',
      'Hey! Let\'s work on your financial goals. What\'s on your mind?',
      'Welcome back! How can I help you with your finances today?',
      'Namaste! Your AI financial advisor is here. What can I assist you with?'
    ];

    this.gratitudeResponses = [
      'You\'re welcome! Feel free to ask anything about your finances anytime.',
      'Glad I could help! Don\'t hesitate to ask more questions.',
      'Happy to assist! Let me know if you need anything else.',
      'You\'re welcome! Remember, small financial habits make a big difference.'
    ];

    this.unknownResponses = [
      'I\'m not sure I understood that. Could you rephrase? I can help with spending analysis, budgets, investments, loans, taxes, and financial planning.',
      'I didn\'t quite catch that. Try asking about your spending, budget, investments, or financial goals!',
      'Let me help you better. You can ask me about: spending analysis, budget tracking, investment advice, loan management, tax planning, or financial health scores.'
    ];

    this.followUpPrompts = {
      spending_query: 'Would you like to see a breakdown by category, or compare with previous months?',
      budget_query: 'Want me to suggest optimizations to your budget?',
      savings_query: 'Shall I project how much you could save in the next 6 months?',
      investment_query: 'Would you like personalized investment recommendations based on your risk profile?',
      loan_query: 'Want me to calculate the optimal prepayment strategy?',
      tax_query: 'Should I calculate potential tax savings for you?',
      forecast_query: 'Want me to extend the forecast or focus on a specific category?',
      anomaly_query: 'Would you like me to set up alerts for similar anomalies?'
    };
  }

  generateGreeting() {
    return this.greetings[Math.floor(Math.random() * this.greetings.length)];
  }

  generateGratitudeResponse() {
    return this.gratitudeResponses[Math.floor(Math.random() * this.gratitudeResponses.length)];
  }

  generateUnknownResponse() {
    return this.unknownResponses[Math.floor(Math.random() * this.unknownResponses.length)];
  }

  generateFollowUp(intent) {
    return this.followUpPrompts[intent] || 'Is there anything else you\'d like to know?';
  }

  generateSpendingResponse(data) {
    const { total, breakdown, timePeriod, category, comparison } = data;

    let response = '';

    if (category) {
      response = `Your **${category}** spending`;
      if (timePeriod) response += ` for ${this._formatTimePeriod(timePeriod)}`;
      response += ` is **₹${total.toLocaleString()}**`;

      if (comparison?.previous) {
        const change = ((total - comparison.previous) / comparison.previous) * 100;
        response += change > 0
          ? ` (↑ ${change.toFixed(1)}% from previous period)`
          : ` (↓ ${Math.abs(change).toFixed(1)}% from previous period)`;
      }
    } else {
      response = `Your total spending`;
      if (timePeriod) response += ` for ${this._formatTimePeriod(timePeriod)}`;
      response += ` is **₹${total.toLocaleString()}**\n\n`;

      if (breakdown && Object.keys(breakdown).length > 0) {
        response += '📊 **Category Breakdown:**\n';
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        for (const [cat, amount] of sorted.slice(0, 8)) {
          const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
          response += `• ${cat}: ₹${amount.toLocaleString()} (${pct}%)\n`;
        }
      }
    }

    return response;
  }

  generateBudgetResponse(data) {
    const { budgets, summary } = data;

    let response = '📋 **Budget Status:**\n\n';

    if (summary) {
      response += `Total Budget: ₹${summary.totalBudget?.toLocaleString() || 0}\n`;
      response += `Total Spent: ₹${summary.totalSpent?.toLocaleString() || 0}\n`;
      response += `Remaining: ₹${(summary.totalBudget - summary.totalSpent)?.toLocaleString() || 0}\n\n`;
    }

    if (budgets && budgets.length > 0) {
      for (const b of budgets.slice(0, 8)) {
        const utilization = b.limit > 0 ? (b.spent / b.limit * 100).toFixed(0) : 0;
        const icon = utilization > 90 ? '🔴' : utilization > 70 ? '🟡' : '🟢';
        response += `${icon} **${b.category}**: ₹${b.spent?.toLocaleString() || 0} / ₹${b.limit?.toLocaleString() || 0} (${utilization}%)\n`;
      }
    } else {
      response += 'No budgets configured yet. Would you like me to help set up a budget?';
    }

    return response;
  }

  generateInvestmentResponse(data) {
    const { portfolio, recommendations, riskProfile } = data;

    let response = '📈 **Investment Overview:**\n\n';

    if (portfolio) {
      response += `Portfolio Value: ₹${portfolio.totalValue?.toLocaleString() || 0}\n`;
      response += `Total Invested: ₹${portfolio.totalInvested?.toLocaleString() || 0}\n`;
      const returns = portfolio.totalInvested > 0
        ? ((portfolio.totalValue - portfolio.totalInvested) / portfolio.totalInvested * 100).toFixed(1)
        : 0;
      response += `Returns: ${returns}%\n\n`;

      if (portfolio.holdings?.length > 0) {
        response += '**Holdings:**\n';
        for (const h of portfolio.holdings.slice(0, 5)) {
          response += `• ${h.name}: ₹${h.value?.toLocaleString() || 0} (${h.returnPercent?.toFixed(1) || 0}%)\n`;
        }
      }
    }

    if (recommendations?.length > 0) {
      response += '\n💡 **AI Recommendations:**\n';
      for (const rec of recommendations.slice(0, 3)) {
        response += `• ${rec.message || rec}\n`;
      }
    }

    return response;
  }

  generateLoanResponse(data) {
    const { loans, summary, strategy } = data;

    let response = '🏦 **Loan Summary:**\n\n';

    if (summary) {
      response += `Active Loans: ${summary.activeLoans || 0}\n`;
      response += `Total Outstanding: ₹${summary.totalOutstanding?.toLocaleString() || 0}\n`;
      response += `Monthly EMI: ₹${summary.totalEmi?.toLocaleString() || 0}\n\n`;
    }

    if (loans?.length > 0) {
      for (const loan of loans.slice(0, 5)) {
        response += `• **${loan.name || loan.type}**: ₹${loan.outstanding?.toLocaleString() || 0} outstanding @ ${(loan.rate * 100).toFixed(1)}% | EMI: ₹${loan.emi?.toLocaleString() || 0}\n`;
      }
    }

    if (strategy) {
      response += `\n💡 **Payoff Strategy:** ${strategy}`;
    }

    return response;
  }

  generateForecastResponse(data) {
    const { predictions, trend, confidence, category } = data;

    let response = '🔮 **Financial Forecast:**\n\n';

    if (category) {
      response += `Category: ${category}\n`;
    }

    if (predictions?.length > 0) {
      for (const pred of predictions) {
        response += `• ${pred.period || pred.label}: ₹${Math.round(pred.amount || pred.value).toLocaleString()}\n`;
      }
    }

    if (trend) {
      response += `\nTrend: ${trend}\n`;
    }

    if (confidence) {
      response += `Confidence: ${(confidence * 100).toFixed(0)}%\n`;
    }

    return response;
  }

  generateHealthScoreResponse(data) {
    const { score, breakdown, recommendations } = data;
    const rating = score >= 80 ? 'Excellent 🌟' :
                   score >= 60 ? 'Good 👍' :
                   score >= 40 ? 'Fair ⚠️' : 'Needs Attention 🔴';

    let response = `💪 **Financial Health Score: ${score}/100 (${rating})**\n\n`;

    if (breakdown) {
      for (const [area, value] of Object.entries(breakdown)) {
        const icon = value >= 80 ? '✅' : value >= 60 ? '🟡' : '🔴';
        response += `${icon} ${area}: ${Math.round(value)}/100\n`;
      }
    }

    if (recommendations?.length > 0) {
      response += '\n💡 **Recommendations:**\n';
      for (const rec of recommendations.slice(0, 5)) {
        response += `• ${rec.message || rec}\n`;
      }
    }

    return response;
  }

  _formatTimePeriod(period) {
    const mapping = {
      today: 'today',
      yesterday: 'yesterday',
      this_week: 'this week',
      last_week: 'last week',
      this_month: 'this month',
      last_month: 'last month',
      this_year: 'this year',
      last_year: 'last year'
    };
    return mapping[period] || period;
  }
}

// ============================================================================
// §6  CONVERSATION ENGINE — Main Orchestrator
// ============================================================================

class ConversationalAIEngine {
  constructor() {
    this.memory = {};       // userId -> ConversationMemory
    this.stateTracker = {}; // userId -> DialogStateTracker
    this.intentClassifier = new FinancialIntentClassifier();
    this.entityExtractor = new FinancialEntityExtractor();
    this.responseGenerator = new FinancialResponseGenerator();
    this.dataDir = path.join(__dirname, '../../data/conversations');
    this.handlers = {};
  }

  // Register intent handlers
  registerHandler(intent, handler) {
    this.handlers[intent] = handler;
  }

  // Main chat entry point
  async chat(userId, message, context = {}) {
    // Initialize per-user state
    if (!this.memory[userId]) {
      this.memory[userId] = new ConversationMemory();
    }
    if (!this.stateTracker[userId]) {
      this.stateTracker[userId] = new DialogStateTracker();
    }

    const memory = this.memory[userId];
    const tracker = this.stateTracker[userId];

    // Step 1: Extract entities
    const entities = this.entityExtractor.extract(message);

    // Step 2: Classify intent
    const intent = this.intentClassifier.classify(message);

    // Step 3: Update dialog state
    tracker.update(intent, intent.slots, entities);

    // Step 4: Record in memory
    memory.addMessage('user', message, {
      intent: intent.intent,
      entities,
      slots: intent.slots
    });

    // Step 5: Generate response
    let response;

    if (intent.intent === 'greeting') {
      response = {
        message: this.responseGenerator.generateGreeting(),
        intent: 'greeting',
        confidence: 1.0
      };
    } else if (intent.intent === 'gratitude') {
      response = {
        message: this.responseGenerator.generateGratitudeResponse(),
        intent: 'gratitude',
        confidence: 1.0
      };
    } else if (intent.intent === 'unknown') {
      // Check if this is a follow-up to previous conversation
      if (tracker.isFollowUp()) {
        const prevIntent = tracker.getState().currentIntent;
        response = await this._handleFollowUp(userId, message, prevIntent, context);
      } else {
        response = {
          message: this.responseGenerator.generateUnknownResponse(),
          intent: 'unknown',
          confidence: 0.0,
          suggestions: [
            'How much did I spend this month?',
            'Show my budget status',
            'What are my active loans?',
            'Give me investment advice',
            'What\'s my financial health score?'
          ]
        };
      }
    } else {
      // Handle recognized intent
      response = await this._handleIntent(userId, intent, entities, context);
    }

    // Add follow-up prompt
    if (response && intent.intent !== 'greeting' && intent.intent !== 'gratitude' && intent.intent !== 'unknown') {
      response.followUp = this.responseGenerator.generateFollowUp(intent.intent);
    }

    // Record response in memory
    memory.addMessage('assistant', response?.message || '', {
      intent: response?.intent || intent.intent
    });

    return {
      ...response,
      conversationId: userId,
      turnCount: tracker.getState().turnCount,
      entities: entities.map(e => ({ type: e.type, value: e.value })),
      detectedIntent: intent.intent,
      confidence: intent.confidence,
      slots: tracker.getState().slots
    };
  }

  async _handleIntent(userId, intent, entities, context) {
    const handler = this.handlers[intent.intent];

    if (handler) {
      try {
        const data = await handler(userId, intent.slots, context, entities);
        return {
          message: data.message || this._formatIntentResponse(intent.intent, data),
          intent: intent.intent,
          confidence: intent.confidence,
          data: data.raw || data
        };
      } catch (error) {
        logger.error(`Intent handler error for ${intent.intent}:`, error.message);
        return {
          message: `I tried to get that information but encountered an issue. Let me try a different approach. Could you provide more details?`,
          intent: intent.intent,
          confidence: intent.confidence,
          error: true
        };
      }
    }

    // Default response for unhandled intents
    return this._generateDefaultResponse(intent, context);
  }

  _formatIntentResponse(intent, data) {
    switch (intent) {
      case 'spending_query':
        return this.responseGenerator.generateSpendingResponse(data);
      case 'budget_query':
        return this.responseGenerator.generateBudgetResponse(data);
      case 'investment_query':
        return this.responseGenerator.generateInvestmentResponse(data);
      case 'loan_query':
        return this.responseGenerator.generateLoanResponse(data);
      case 'forecast_query':
        return this.responseGenerator.generateForecastResponse(data);
      case 'health_query':
        return this.responseGenerator.generateHealthScoreResponse(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  _generateDefaultResponse(intent, context) {
    const responses = {
      savings_query: '💰 I can help you optimize your savings! Based on your spending patterns, here are some quick tips:\n\n1. Automate your savings on payday\n2. Follow the 50/30/20 rule\n3. Build a 6-month emergency fund\n\nWould you like me to analyze your specific spending to find savings opportunities?',
      tax_query: '📄 For tax planning, I recommend:\n\n1. Maximize Section 80C (₹1.5L limit)\n2. Use Section 80D for health insurance\n3. Consider NPS for additional 80CCD(1B) deduction\n\nWant me to calculate your tax-saving opportunities?',
      insurance_query: '🛡️ Insurance basics:\n\n1. Term insurance: 10-15x annual income\n2. Health insurance: ₹10L minimum family cover\n3. Avoid mixing insurance with investment\n\nShall I review your current coverage?',
      goal_query: '🎯 I can help track your financial goals! What goal are you working towards? (e.g., house, car, vacation, retirement)',
      anomaly_query: '🔍 I\'ll scan your recent transactions for any unusual activity...',
      comparison_query: '⚖️ I can compare financial options for you. What would you like to compare?',
      advice_query: '💡 I\'d be happy to give you personalized financial advice. What area would you like guidance on?\n\n• Budgeting & Saving\n• Investing & Portfolio\n• Debt Management\n• Tax Planning\n• Retirement Planning',
      report_query: '📊 I can generate a comprehensive financial report for you. Which time period would you like? (this month, last 3 months, this year)'
    };

    return {
      message: responses[intent.intent] || `I understand you're asking about ${intent.intent.replace(/_/g, ' ')}. Let me help you with that!`,
      intent: intent.intent,
      confidence: intent.confidence
    };
  }

  async _handleFollowUp(userId, message, previousIntent, context) {
    // Try to understand the follow-up in context of previous intent
    const tracker = this.stateTracker[userId];
    const entities = this.entityExtractor.extract(message);

    // Update slots with new information
    for (const entity of entities) {
      if (entity.type === 'MONEY') tracker.setSlot('amount', entity.parsed?.amount);
      if (entity.type === 'RELATIVE_DATE') tracker.setSlot('time_period', entity.value);
    }

    // Check for affirmative/negative responses
    if (/^(yes|yeah|sure|ok|okay|yep|yup|definitely|please)/i.test(message.trim())) {
      return {
        message: `Let me process that for your ${previousIntent.replace(/_/g, ' ')} query...`,
        intent: previousIntent,
        confidence: 0.8,
        isFollowUp: true
      };
    }

    if (/^(no|nah|nope|not now|later|skip)/i.test(message.trim())) {
      tracker.reset();
      return {
        message: 'No problem! Feel free to ask me anything else about your finances.',
        intent: 'declined',
        confidence: 1.0
      };
    }

    // Re-classify with previous context
    return {
      message: `Based on our ${previousIntent.replace(/_/g, ' ')} discussion, let me look into that for you.`,
      intent: previousIntent,
      confidence: 0.6,
      isFollowUp: true
    };
  }

  // Get conversation summary for a user
  getConversationSummary(userId) {
    const memory = this.memory[userId];
    if (!memory) return { totalMessages: 0, topicsDiscussed: [] };
    return memory.summarize();
  }

  // Save conversation state
  async saveState(userId) {
    try {
      await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
      const filePath = path.join(this.dataDir, `${userId}_conversation.json`);
      const data = {
        memory: this.memory[userId]?.serialize(),
        state: this.stateTracker[userId]?.getState(),
        learnedPatterns: this.intentClassifier.learnedPatterns
      };
      await fs.promises.writeFile(filePath, JSON.stringify(data));
    } catch (e) {
      logger.debug(`Conversation save failed: ${e.message}`);
    }
  }

  // Load conversation state
  async loadState(userId) {
    try {
      const filePath = path.join(this.dataDir, `${userId}_conversation.json`);
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);

      if (data.memory) {
        this.memory[userId] = new ConversationMemory();
        this.memory[userId].deserialize(data.memory);
      }
      if (data.learnedPatterns) {
        Object.assign(this.intentClassifier.learnedPatterns, data.learnedPatterns);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ConversationMemory,
  FinancialIntentClassifier,
  FinancialEntityExtractor,
  DialogStateTracker,
  FinancialResponseGenerator,
  ConversationalAIEngine
};
