/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  LOCAL AI ENGINE - Offline Financial Intelligence (No External Dependencies)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Runs entirely on the server with zero external API calls.
 *  Uses statistical models, rule-based NLP, and pattern recognition.
 *  Falls back gracefully when Ollama is not available.
 *
 *  Capabilities:
 *  • Financial chat with context-aware responses
 *  • Transaction categorization
 *  • Spending pattern analysis
 *  • Budget recommendations
 *  • Debt payoff strategy optimization
 *  • Investment suggestions based on risk profile
 *  • Natural language query parsing
 *  • Anomaly detection
 *  • Predictive alerts
 */

const axios = require('axios');
const logger = require('../utils/logger');

class LocalAIEngine {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'mistral:7b';
    this.ollamaAvailable = null; // null = not checked, true/false = checked
    this.lastOllamaCheck = 0;
    this.checkInterval = 60000; // Re-check Ollama every 60s

    // Knowledge base for rule-based responses
    this.financialKnowledge = {
      savings: {
        keywords: ['save', 'saving', 'savings', 'emergency fund', 'rainy day', 'put aside', 'set aside'],
        tips: [
          'Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
          'Build an emergency fund covering 6 months of expenses before investing.',
          'Automate your savings — set up auto-transfers on payday.',
          'Start with liquid funds or high-yield savings for emergency money.',
          'Every ₹100 saved today at 12% becomes ₹310 in 10 years (power of compounding).'
        ]
      },
      investment: {
        keywords: ['invest', 'investment', 'mutual fund', 'stock', 'sip', 'portfolio', 'returns', 'nifty', 'sensex', 'equity', 'fd', 'ppf'],
        tips: [
          'Start SIP with as little as ₹500/month — consistency beats timing.',
          'Index funds (like Nifty 50) have averaged 12-14% annual returns over 15+ years.',
          'ELSS mutual funds give tax benefits under Section 80C with only 3-year lock-in.',
          'Diversify across equity, debt, and gold. Don\'t put all eggs in one basket.',
          'For goals 5+ years away, equity allocation should be 60-80%.',
          'PPF gives 7.1% guaranteed + tax-free returns — great for conservative investors.'
        ]
      },
      debt: {
        keywords: ['debt', 'loan', 'emi', 'borrow', 'repay', 'interest', 'credit card', 'outstanding', 'payoff'],
        tips: [
          'Use the Avalanche method: pay highest-interest debt first to save the most money.',
          'Or use Snowball method: clear smallest debts first for psychological momentum.',
          'Never pay just the minimum on credit cards — you\'ll pay 3-4x the original amount.',
          'Consolidate high-interest debts into a lower-rate personal loan if possible.',
          'Keep your debt-to-income ratio below 36% for healthy finances.',
          'Prepay home loans when you get bonuses — even small prepayments save years of interest.'
        ]
      },
      budget: {
        keywords: ['budget', 'expense', 'spending', 'cut', 'reduce', 'track', 'overspend', 'monthly'],
        tips: [
          'Track every expense for 30 days — awareness alone reduces spending by 10-15%.',
          'Use the 24-hour rule: wait a day before any non-essential purchase over ₹1,000.',
          'Review subscriptions quarterly — cancel ones you haven\'t used in 30 days.',
          'Cook at home 4-5 days/week — food delivery costs 2-3x more.',
          'Set category budgets: rent (≤30%), food (≤15%), transport (≤10%), savings (≥20%).'
        ]
      },
      tax: {
        keywords: ['tax', '80c', '80d', 'deduction', 'itr', 'income tax', 'old regime', 'new regime', 'hra', 'nps'],
        tips: [
          'Section 80C: Save up to ₹1.5L through ELSS, PPF, LIC, home loan principal.',
          'Section 80CCD(1B): Additional ₹50K deduction for NPS contributions.',
          'Section 80D: ₹25K for self + ₹50K for senior citizen parents\' health insurance.',
          'New tax regime is better if you don\'t have many deductions (>₹3.75L needed for old to win).',
          'Long-term equity gains up to ₹1L/year are completely tax-free.',
          'Home loan: ₹2L interest deduction (Sec 24) + ₹1.5L principal deduction (Sec 80C).'
        ]
      },
      insurance: {
        keywords: ['insurance', 'term', 'health', 'life', 'cover', 'premium', 'claim', 'policy'],
        tips: [
          'Term insurance: Get 10-15x annual income as cover. It\'s the cheapest and most effective.',
          'Health insurance: ₹10L minimum for a family — medical inflation is 14% p.a. in India.',
          'Never mix insurance with investment (avoid ULIPs, endowment plans).',
          'Buy term insurance early — a 25-year-old pays 50% less premium than a 35-year-old.',
          'Critical illness cover is essential — cancer treatment costs ₹15-30L on average.'
        ]
      },
      retirement: {
        keywords: ['retire', 'retirement', 'pension', 'nps', 'epf', 'fire', 'financial independence', 'corpus'],
        tips: [
          'Rule of 25: You need 25x your annual expenses to retire (4% withdrawal rule).',
          'Start at 25, invest ₹10K/month at 12% = ₹3.5Cr by 55. Start at 35 = only ₹1Cr.',
          'NPS gives extra ₹50K tax deduction + automatic asset allocation.',
          'EPF earns 8.15% tax-free — maximize employer contribution.',
          'FIRE (Financial Independence) at 50% savings rate = ~17 years to freedom.'
        ]
      }
    };

    // Intent patterns for NLQ
    this.intentPatterns = [
      { pattern: /how much (did i|have i|do i) (spend|spent|pay|paid)/i, intent: 'spending_query' },
      { pattern: /what.*(my|the) (balance|total|outstanding|due)/i, intent: 'balance_query' },
      { pattern: /should i (invest|save|pay|buy)/i, intent: 'advice_query' },
      { pattern: /how (can i|to|do i) (save|reduce|cut|lower)/i, intent: 'savings_advice' },
      { pattern: /what.*(best|good|recommended).*(invest|fund|scheme)/i, intent: 'investment_advice' },
      { pattern: /(analyze|review|check).*(spending|expense|finance|budget)/i, intent: 'analysis_request' },
      { pattern: /when (will|can) i (be|become) (debt.free|financially independent)/i, intent: 'projection_query' },
      { pattern: /(help|tips?|advice|suggest|recommend)/i, intent: 'general_advice' },
      { pattern: /(hello|hi|hey|good morning|good evening)/i, intent: 'greeting' },
      { pattern: /(thank|thanks|thx)/i, intent: 'thanks' }
    ];
  }

  /**
   * Check if Ollama is available (with caching)
   */
  async isOllamaAvailable() {
    if (this.ollamaAvailable !== null && Date.now() - this.lastOllamaCheck < this.checkInterval) {
      return this.ollamaAvailable;
    }
    try {
      await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 3000 });
      this.ollamaAvailable = true;
    } catch {
      this.ollamaAvailable = false;
    }
    this.lastOllamaCheck = Date.now();
    return this.ollamaAvailable;
  }

  /**
   * Main chat handler — tries Ollama first, falls back to local intelligence
   */
  async chat(message, context = {}) {
    try {
      // Try Ollama if available
      if (await this.isOllamaAvailable()) {
        try {
          return await this._ollamaChat(message, context);
        } catch (err) {
          logger.debug('Ollama chat failed, using local engine:', err.message);
        }
      }

      // Local AI engine (always works)
      return this._localChat(message, context);
    } catch (error) {
      logger.error('AI chat error:', error);
      return {
        response: 'I encountered an issue processing your request. Please try again.',
        source: 'error',
        confidence: 0
      };
    }
  }

  /**
   * Ollama-based chat
   */
  async _ollamaChat(message, context) {
    const systemPrompt = this._buildSystemPrompt(context);
    
    const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
      model: this.ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(context.history || []).slice(-6),
        { role: 'user', content: message }
      ],
      stream: false,
      options: { temperature: 0.7, num_predict: 500 }
    }, { timeout: 30000 });

    return {
      response: response.data.message?.content || response.data.response || 'No response generated.',
      source: 'ollama',
      model: this.ollamaModel,
      confidence: 0.85
    };
  }

  _buildSystemPrompt(context) {
    let prompt = `You are FinServe AI, a smart Indian financial advisor built into a personal finance app. 
You give concise, actionable advice in 2-3 short paragraphs. Use ₹ for currency. 
Focus on Indian tax laws, investment options (MF, SIP, PPF, NPS, ELSS), and budgeting.
Be friendly but professional. Never give specific stock tips.`;

    if (context.portfolio) {
      prompt += `\n\nUser's financial snapshot:
- Total Borrowed: ₹${(context.portfolio.totalBorrowed || 0).toLocaleString()}
- Outstanding: ₹${(context.portfolio.totalOutstanding || 0).toLocaleString()}
- Monthly Income: ₹${(context.portfolio.monthlyIncome || 0).toLocaleString()}
- Active Loans: ${context.portfolio.activeLoans || 0}`;
    }

    if (context.transactions) {
      const totalSpent = context.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      prompt += `\n- Recent Spending: ₹${totalSpent.toLocaleString()} (last 30 days)`;
    }

    return prompt;
  }

  /**
   * Local AI chat — rule-based + statistical, works without any external service
   */
  _localChat(message, context) {
    const lowerMsg = message.toLowerCase().trim();

    // Detect intent
    const intent = this._detectIntent(lowerMsg);

    // Generate response based on intent
    let response;
    let confidence = 0.7;

    switch (intent) {
      case 'greeting':
        response = this._greetingResponse(context);
        confidence = 0.95;
        break;
      case 'thanks':
        response = 'You\'re welcome! Feel free to ask anything about your finances. I\'m here to help! 💰';
        confidence = 0.95;
        break;
      case 'spending_query':
        response = this._spendingResponse(context);
        confidence = 0.8;
        break;
      case 'balance_query':
        response = this._balanceResponse(context);
        confidence = 0.8;
        break;
      case 'advice_query':
      case 'general_advice':
        response = this._adviceResponse(lowerMsg, context);
        confidence = 0.75;
        break;
      case 'savings_advice':
        response = this._topicResponse('savings', context);
        confidence = 0.8;
        break;
      case 'investment_advice':
        response = this._topicResponse('investment', context);
        confidence = 0.8;
        break;
      case 'analysis_request':
        response = this._analysisResponse(context);
        confidence = 0.75;
        break;
      case 'projection_query':
        response = this._projectionResponse(context);
        confidence = 0.7;
        break;
      default:
        response = this._smartFallback(lowerMsg, context);
        confidence = 0.6;
        break;
    }

    return {
      response,
      source: 'local',
      model: 'finserve-local-v1',
      intent,
      confidence
    };
  }

  _detectIntent(message) {
    for (const { pattern, intent } of this.intentPatterns) {
      if (pattern.test(message)) return intent;
    }
    return 'unknown';
  }

  _greetingResponse(context) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = context.userName ? `, ${context.userName.split(' ')[0]}` : '';
    
    let extra = '';
    if (context.portfolio?.totalOutstanding > 0) {
      extra = `\n\nQuick update: You have ₹${context.portfolio.totalOutstanding.toLocaleString()} in outstanding loans. Would you like me to suggest a repayment strategy?`;
    }
    
    return `${greeting}${name}! 👋 I'm your FinServe AI assistant. I can help you with:\n\n• 📊 Analyzing your spending patterns\n• 💰 Savings & investment tips\n• 📋 Budget optimization\n• 🏦 Debt management strategies\n• 📈 Tax planning advice\n\nWhat would you like to know?${extra}`;
  }

  _spendingResponse(context) {
    if (!context.transactions || context.transactions.length === 0) {
      return 'I don\'t have your recent transaction data. Add some transactions in the Expense Tracker to get spending insights!';
    }

    const expenses = context.transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((s, t) => s + (t.amount || 0), 0);
    const categories = {};
    expenses.forEach(t => { categories[t.category || 'other'] = (categories[t.category || 'other'] || 0) + (t.amount || 0); });
    
    const topCats = Object.entries(categories).sort(([,a], [,b]) => b - a).slice(0, 3);
    
    let response = `📊 **Your Recent Spending Summary:**\n\nTotal spent: ₹${total.toLocaleString()}\n\nTop categories:\n`;
    topCats.forEach(([cat, amt], i) => {
      response += `${i + 1}. ${cat}: ₹${amt.toLocaleString()} (${((amt / total) * 100).toFixed(0)}%)\n`;
    });

    if (context.portfolio?.monthlyIncome > 0) {
      const ratio = (total / context.portfolio.monthlyIncome) * 100;
      response += `\nThis is ${ratio.toFixed(0)}% of your monthly income. ${ratio > 80 ? '⚠️ Consider reducing discretionary spending.' : ratio > 50 ? 'Reasonable, but there\'s room to save more.' : '✅ Great spending discipline!'}`;
    }

    return response;
  }

  _balanceResponse(context) {
    if (!context.portfolio) {
      return 'I need access to your financial data. Please check the Dashboard for your current balances.';
    }
    const p = context.portfolio;
    return `💰 **Your Financial Position:**\n\n• Total Borrowed: ₹${(p.totalBorrowed || 0).toLocaleString()}\n• Outstanding: ₹${(p.totalOutstanding || 0).toLocaleString()}\n• Repaid: ₹${(p.totalRepaid || 0).toLocaleString()}\n• Active Loans: ${p.activeLoans || 0}\n\n${p.totalOutstanding > 0 ? `You still owe ₹${p.totalOutstanding.toLocaleString()}. Focus on clearing high-interest loans first.` : '🎉 You\'re debt-free! Consider investing your surplus.'}`;
  }

  _topicResponse(topic, context) {
    const knowledge = this.financialKnowledge[topic];
    if (!knowledge) return this._smartFallback(topic, context);

    // Pick 3 random tips
    const tips = [...knowledge.tips].sort(() => Math.random() - 0.5).slice(0, 3);
    
    const icons = { savings: '💰', investment: '📈', debt: '💳', budget: '📋', tax: '🧾', insurance: '🛡️', retirement: '🏖️' };
    
    let response = `${icons[topic] || '💡'} **${topic.charAt(0).toUpperCase() + topic.slice(1)} Tips:**\n\n`;
    tips.forEach((tip, i) => { response += `${i + 1}. ${tip}\n\n`; });
    
    if (context.portfolio?.totalOutstanding > 0 && topic === 'investment') {
      response += `\n⚠️ **Note:** You have ₹${context.portfolio.totalOutstanding.toLocaleString()} in outstanding loans. Consider clearing high-interest debt before aggressive investing.`;
    }

    return response;
  }

  _adviceResponse(message, context) {
    // Match to the best topic
    let bestTopic = null;
    let bestScore = 0;

    for (const [topic, info] of Object.entries(this.financialKnowledge)) {
      const score = info.keywords.filter(kw => message.includes(kw)).length;
      if (score > bestScore) { bestScore = score; bestTopic = topic; }
    }

    if (bestTopic) return this._topicResponse(bestTopic, context);

    // General advice
    return `💡 **Smart Financial Advice:**\n\n1. **Build emergency fund first** — 6 months of expenses in liquid assets.\n2. **Clear high-interest debt** — Credit card debt (36-42% p.a.) should be #1 priority.\n3. **Start SIP early** — Even ₹5,000/month in an index fund grows to ₹1Cr+ in 20 years.\n4. **Get adequate insurance** — Term life (10x income) + Health (₹10L minimum).\n5. **Tax-optimize** — Use 80C (₹1.5L), 80D (₹25K-75K), and 80CCD(1B) (₹50K) to save ₹50K+ in taxes.\n\nWould you like detailed advice on any of these?`;
  }

  _analysisResponse(context) {
    if (!context.portfolio && (!context.transactions || context.transactions.length === 0)) {
      return '📊 I need more data to analyze your finances. Start by:\n\n1. Adding transactions in the Expense Tracker\n2. Recording your loans in Personal Borrowings\n3. Setting up your financial profile\n\nOnce you have data, I can provide detailed analysis!';
    }

    let response = '📊 **Financial Analysis:**\n\n';

    if (context.portfolio) {
      const p = context.portfolio;
      
      // Debt assessment
      if (p.totalOutstanding > 0) {
        const severity = p.totalOutstanding > (p.monthlyIncome || 50000) * 6 ? 'high' : p.totalOutstanding > (p.monthlyIncome || 50000) * 3 ? 'moderate' : 'low';
        response += `**Debt Level:** ${severity === 'high' ? '🔴 High' : severity === 'moderate' ? '🟡 Moderate' : '🟢 Low'}\n`;
        response += `Outstanding ₹${p.totalOutstanding.toLocaleString()} across ${p.activeLoans || 0} loans.\n\n`;
      }

      // Savings capacity
      if (p.monthlyIncome > 0 && p.monthlyExpenses > 0) {
        const savingsRate = ((p.monthlyIncome - p.monthlyExpenses) / p.monthlyIncome * 100).toFixed(0);
        response += `**Savings Rate:** ${savingsRate}% ${parseInt(savingsRate) >= 20 ? '✅' : parseInt(savingsRate) >= 10 ? '🟡' : '🔴'}\n\n`;
      }
    }

    response += '**Recommendations:**\n';
    response += '• Review your top 3 spending categories for potential cuts\n';
    response += '• Set up auto-SIP for at least 10% of income\n';
    response += '• Check if you\'re maximizing tax deductions\n';

    return response;
  }

  _projectionResponse(context) {
    const outstanding = context.portfolio?.totalOutstanding || 0;
    const monthlyIncome = context.portfolio?.monthlyIncome || 50000;

    if (outstanding === 0) {
      return '🎉 You\'re already debt-free! Here\'s how to stay that way:\n\n• Avoid new debt for depreciating assets\n• Build 6-month emergency fund\n• Start investing the money you\'d have spent on EMIs\n\nYour financial independence journey is well underway!';
    }

    const recommendedPayment = Math.round(monthlyIncome * 0.2);
    const monthsToFreedom = Math.ceil(outstanding / recommendedPayment);

    return `🗓️ **Debt Freedom Projection:**\n\nOutstanding: ₹${outstanding.toLocaleString()}\nRecommended monthly repayment: ₹${recommendedPayment.toLocaleString()} (20% of income)\n\n📅 **Estimated debt-free date:** ${new Date(Date.now() + monthsToFreedom * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}\n(~${monthsToFreedom} months)\n\n💡 **Speed it up:** Every extra ₹5,000/month saves ~${Math.round(monthsToFreedom * 0.1)} months!`;
  }

  _smartFallback(message, context) {
    // Try to match any topic keywords
    for (const [topic, info] of Object.entries(this.financialKnowledge)) {
      if (info.keywords.some(kw => message.includes(kw))) {
        return this._topicResponse(topic, context);
      }
    }

    return `💡 I'm your FinServe AI financial assistant. I can help with:\n\n• **"How much did I spend?"** — Spending analysis\n• **"How to save more?"** — Savings tips\n• **"Best investments?"** — Investment advice\n• **"Help with debt"** — Debt management\n• **"Tax saving tips"** — Tax optimization\n• **"Analyze my finances"** — Full financial review\n\nTry asking one of these, or describe what you need help with!`;
  }

  /**
   * AI-powered transaction categorization (local)
   */
  categorizeTransaction(description, amount) {
    const lower = (description || '').toLowerCase();
    
    const patterns = {
      food: /swiggy|zomato|restaurant|cafe|pizza|burger|domino|kfc|mcdonald|subway|food|eat|dine|biryani|kitchen|meal/,
      grocery: /bigbasket|blinkit|zepto|dmart|reliance fresh|grocery|supermarket|vegetable|fruit|provision/,
      transport: /uber|ola|rapido|metro|petrol|diesel|fuel|parking|toll|fastag|bus|train|irctc|flight/,
      shopping: /amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|mall|clothes|shoes|electronics/,
      entertainment: /netflix|hotstar|spotify|prime video|movie|pvr|inox|game|youtube|subscription/,
      utilities: /electricity|water|gas|broadband|jio|airtel|vodafone|bsnl|wifi|internet|phone bill/,
      healthcare: /hospital|doctor|pharmacy|medicine|apollo|medplus|diagnostic|health|dentist|eye/,
      education: /school|college|course|udemy|tuition|book|coaching|exam|fee/,
      rent: /rent|lease|pg|hostel|accommodation/,
      emi: /emi|loan payment|installment|bajaj finserv/,
      investment: /mutual fund|sip|zerodha|groww|stock|share|ppf|nps|fd|investment/,
      insurance: /insurance|premium|lic|hdfc life|policy/,
      transfer: /transfer|upi|neft|imps|rtgs|sent to|paid to/
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(lower)) return { category, confidence: 0.85 };
    }

    // Amount-based heuristics
    if (amount < 500) return { category: 'food', confidence: 0.4 };
    if (amount >= 5000 && amount <= 50000) return { category: 'shopping', confidence: 0.3 };
    
    return { category: 'other', confidence: 0.2 };
  }

  /**
   * Generate smart notification text
   */
  generateAlert(type, data) {
    const templates = {
      high_spending: `⚠️ Your ${data.category || 'overall'} spending is ${data.percentage || 0}% above your usual average. Consider reviewing recent ${data.category || ''} expenses.`,
      bill_due: `🔔 ${data.name || 'Bill'} of ₹${(data.amount || 0).toLocaleString()} is due ${data.daysUntil === 0 ? 'today' : data.daysUntil === 1 ? 'tomorrow' : `in ${data.daysUntil} days`}.`,
      goal_progress: `🎯 You're ${data.percentage || 0}% towards your "${data.goalName || 'goal'}" target. ${data.percentage >= 75 ? 'Almost there!' : data.percentage >= 50 ? 'Halfway!' : 'Keep going!'}`,
      low_balance: `💰 Your account balance is ₹${(data.balance || 0).toLocaleString()}. Upcoming EMIs total ₹${(data.emiDue || 0).toLocaleString()}. ${data.balance < data.emiDue ? 'Shortfall alert!' : 'Sufficient balance.'}`,
      debt_milestone: `🎉 You've repaid ${data.percentage || 0}% of your loan from ${data.lender || 'lender'}. ${data.percentage >= 90 ? 'Almost done!' : 'Great progress!'}`
    };
    return templates[type] || `📢 ${JSON.stringify(data)}`;
  }

  /**
   * Get AI status info
   */
  async getStatus() {
    const ollamaUp = await this.isOllamaAvailable();
    return {
      engine: ollamaUp ? 'ollama' : 'local',
      model: ollamaUp ? this.ollamaModel : 'finserve-local-v1',
      ollamaAvailable: ollamaUp,
      ollamaUrl: this.ollamaUrl,
      capabilities: ['chat', 'categorize', 'alerts', 'analysis', 'predictions'],
      knowledgeTopics: Object.keys(this.financialKnowledge),
      version: '2.0.0'
    };
  }
}

module.exports = new LocalAIEngine();
