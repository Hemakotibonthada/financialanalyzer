/**
 * @fileoverview Financial AI Chat Service
 * Manages conversations, message processing, intent detection,
 * context-aware suggestions, and financial advice generation.
 * @module services/chatService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ---------- Mongoose Schemas ---------- */

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    metadata: {
      intent: { type: String },
      confidence: { type: Number },
      chartData: { type: mongoose.Schema.Types.Mixed },
      suggestions: [String],
      processingTimeMs: { type: Number },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Conversation' },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    summary: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

/* ---------- Intent Keywords Map ---------- */

const INTENT_KEYWORDS = {
  budget: [
    'budget', 'budgeting', 'spending', 'expense', 'expenses', 'allocate',
    'allocation', 'overspend', 'underspend', 'category', 'limit',
  ],
  savings: [
    'save', 'saving', 'savings', 'emergency fund', 'piggy bank', 'deposit',
    'fd', 'fixed deposit', 'rd', 'recurring deposit', 'goal',
  ],
  investment: [
    'invest', 'investment', 'mutual fund', 'sip', 'stock', 'stocks',
    'portfolio', 'nifty', 'sensex', 'returns', 'ipo', 'equity', 'bond',
    'nps', 'ppf', 'elss', 'gold', 'real estate',
  ],
  tax: [
    'tax', 'income tax', 'gst', 'deduction', '80c', '80d', 'hra',
    'section', 'itr', 'tds', 'tax saving', 'rebate', 'exemption',
  ],
  debt: [
    'loan', 'emi', 'debt', 'credit card', 'interest', 'repay',
    'repayment', 'borrow', 'mortgage', 'personal loan', 'home loan',
  ],
  insurance: [
    'insurance', 'life insurance', 'health insurance', 'term plan',
    'premium', 'claim', 'cover', 'policy',
  ],
};

/* ---------- Advice Templates ---------- */

const ADVICE_TEMPLATES = {
  budget: [
    'Based on your spending patterns, consider reducing discretionary expenses by 10-15% and redirecting that amount to your savings goals.',
    'Your food & dining category has been trending higher. Planning weekly meals could save you ₹2,000-3,000 per month.',
    'The 50/30/20 rule is a great starting point—50% on needs, 30% on wants, and 20% towards savings.',
    'Try the envelope budgeting method for variable expenses to gain better control over your cash flow.',
  ],
  savings: [
    'Setting up automatic transfers to a savings account on pay-day ensures consistent savings.',
    'Your emergency fund should cover at least 6 months of expenses. Currently, you seem to be on track.',
    'Consider putting your short-term savings in a liquid fund for better returns than a savings account.',
    'The power of compounding is huge—even small monthly contributions compound significantly over 10+ years.',
  ],
  investment: [
    'For long-term goals (10+ years), equity-oriented mutual funds have historically outperformed other asset classes in India.',
    'Diversify your portfolio across asset classes—equity, debt, and gold—based on your risk profile.',
    'SIP is one of the best ways to invest in mutual funds. It averages out the cost and removes the need for timing the market.',
    'Review your investment portfolio at least quarterly and rebalance if any allocation drifts more than 5% from the target.',
  ],
  tax: [
    'Maximize your Section 80C deductions (up to ₹1.5 lakh) via ELSS, PPF, NPS, or life insurance premiums.',
    'If you pay rent, claim HRA exemption; if you have a home loan, the interest deduction under Section 24 can save significant tax.',
    'NPS contributions above 80C limit get an additional ₹50,000 deduction under Section 80CCD(1B).',
    'Compare Old vs New Tax Regime based on your deductions to choose the one that saves you more.',
  ],
  debt: [
    'Consider the avalanche method—pay off the highest-interest debt first while making minimums on the rest.',
    'If your credit card utilization is above 30%, try to bring it down as it impacts your credit score.',
    'Refinancing or consolidating high-interest debt could save you money over time.',
    'Ensure your total EMIs don\'t exceed 40% of your monthly take-home for a healthy debt-to-income ratio.',
  ],
  general: [
    'Tracking every expense—even small ones—gives you a clear picture of where your money is going.',
    'Setting specific, measurable financial goals increases the likelihood of achieving them.',
    'Reviewing your finances monthly helps you catch issues early and stay on track.',
    'Automating bill payments avoids late fees and keeps your credit score healthy.',
  ],
};

/* ============================================================
 *  Chat Service
 * ============================================================ */
const chatService = {
  /* ----------------------------------------------------------
   *  sendMessage
   * ---------------------------------------------------------- */
  /**
   * Process a user message, detect intent, generate a response,
   * and store both in the conversation.
   * @param {string} userId
   * @param {string} conversationId - Conversation ID (created if new).
   * @param {string} message - User's message text.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async sendMessage(userId, conversationId, message) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!message || !message.trim()) throw new Error('Message cannot be empty');

      const startTime = Date.now();

      // Auto-generate conversation ID if not supplied
      const convId =
        conversationId || `conv_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Upsert conversation
      let conversation = await Conversation.findOne({ conversationId: convId, userId });
      if (!conversation) {
        conversation = new Conversation({
          conversationId: convId,
          userId,
          title: message.substring(0, 80),
        });
      }

      // Analyse intent
      const intentResult = await chatService.analyzeQuery(message);

      // Store user message
      const userMsg = new ChatMessage({
        conversationId: convId,
        userId,
        role: 'user',
        content: message,
        metadata: { intent: intentResult.intent, confidence: intentResult.confidence },
      });
      await userMsg.save();

      // Generate assistant response
      const responseText = await chatService.generateFinancialAdvice({
        intent: intentResult.intent,
        message,
        userId,
      });

      // Build contextual suggestions
      const suggestions = await chatService.getSuggestions(userId, intentResult.intent);

      const processingTimeMs = Date.now() - startTime;

      const assistantMsg = new ChatMessage({
        conversationId: convId,
        userId,
        role: 'assistant',
        content: responseText,
        metadata: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          suggestions: suggestions.data || [],
          processingTimeMs,
        },
      });
      await assistantMsg.save();

      // Update conversation
      conversation.messageCount += 2;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      return {
        success: true,
        data: {
          conversationId: convId,
          userMessage: userMsg.toObject(),
          assistantMessage: assistantMsg.toObject(),
          intent: intentResult,
          suggestions: suggestions.data || [],
          processingTimeMs,
        },
      };
    } catch (error) {
      logger.error(`sendMessage error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getConversations
   * ---------------------------------------------------------- */
  /**
   * List all conversations for a user, sorted by most recent.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getConversations(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const conversations = await Conversation.find({ userId, isActive: true })
        .sort({ lastMessageAt: -1 })
        .lean();

      return { success: true, data: conversations };
    } catch (error) {
      logger.error(`getConversations error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getConversationMessages
   * ---------------------------------------------------------- */
  /**
   * Retrieve paginated messages for a conversation.
   * @param {string} userId
   * @param {string} conversationId
   * @param {Object} [pagination]
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=50]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getConversationMessages(userId, conversationId, pagination = {}) {
    try {
      if (!userId || !conversationId) throw new Error('userId and conversationId are required');

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(pagination.limit, 10) || 50));

      const conv = await Conversation.findOne({ conversationId, userId, isActive: true });
      if (!conv) throw new Error('Conversation not found');

      const [messages, total] = await Promise.all([
        ChatMessage.find({ conversationId, userId, isDeleted: false })
          .sort({ createdAt: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ChatMessage.countDocuments({ conversationId, userId, isDeleted: false }),
      ]);

      return {
        success: true,
        data: {
          conversationId,
          title: conv.title,
          messages,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      logger.error(`getConversationMessages error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  deleteConversation
   * ---------------------------------------------------------- */
  /**
   * Soft-delete a conversation and its messages.
   * @param {string} userId
   * @param {string} conversationId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async deleteConversation(userId, conversationId) {
    try {
      if (!userId || !conversationId) throw new Error('userId and conversationId are required');

      const conv = await Conversation.findOneAndUpdate(
        { conversationId, userId, isActive: true },
        { isActive: false },
        { new: true }
      );
      if (!conv) throw new Error('Conversation not found');

      await ChatMessage.updateMany(
        { conversationId, userId },
        { $set: { isDeleted: true } }
      );

      logger.info(`Conversation deleted: ${conversationId}`);
      return { success: true, data: { conversationId, deletedAt: new Date() } };
    } catch (error) {
      logger.error(`deleteConversation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  exportConversation
   * ---------------------------------------------------------- */
  /**
   * Export a conversation in the specified format.
   * @param {string} userId
   * @param {string} conversationId
   * @param {'text'|'json'} [format='text']
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async exportConversation(userId, conversationId, format = 'text') {
    try {
      if (!userId || !conversationId) throw new Error('userId and conversationId are required');

      const conv = await Conversation.findOne({ conversationId, userId, isActive: true }).lean();
      if (!conv) throw new Error('Conversation not found');

      const messages = await ChatMessage.find({ conversationId, userId, isDeleted: false })
        .sort({ createdAt: 1 })
        .lean();

      if (format === 'json') {
        return {
          success: true,
          data: {
            format: 'json',
            content: {
              conversation: conv,
              messages,
              exportedAt: new Date(),
            },
          },
        };
      }

      // Plain text format
      const lines = [`=== ${conv.title} ===`, `Exported: ${new Date().toISOString()}`, ''];
      for (const msg of messages) {
        const timestamp = new Date(msg.createdAt).toLocaleString('en-IN');
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        lines.push(`[${timestamp}] ${role}:`);
        lines.push(msg.content);
        lines.push('');
      }

      return {
        success: true,
        data: {
          format: 'text',
          content: lines.join('\n'),
          messageCount: messages.length,
        },
      };
    } catch (error) {
      logger.error(`exportConversation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getSuggestions
   * ---------------------------------------------------------- */
  /**
   * Get context-aware follow-up question suggestions.
   * @param {string} userId
   * @param {string} [contextIntent] - Detected intent from previous message.
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getSuggestions(userId, contextIntent) {
    try {
      const suggestionMap = {
        budget: [
          'How can I reduce my monthly expenses?',
          'Show my spending breakdown by category',
          'What percentage of my income goes to needs vs wants?',
          'Help me create a zero-based budget',
          'Which categories am I overspending in?',
        ],
        savings: [
          'How much should I have in my emergency fund?',
          'What are the best savings options for short-term goals?',
          'How can I automate my savings?',
          'Compare FD vs liquid fund for parking money',
          'Help me set a savings target for this year',
        ],
        investment: [
          'What SIPs should I start for long-term growth?',
          'How is my portfolio performing this month?',
          'Should I invest more in equity or debt right now?',
          'What are the top-performing ELSS funds?',
          'Explain asset allocation for my risk profile',
        ],
        tax: [
          'How can I save more tax this year?',
          'Should I choose the old or new tax regime?',
          'What deductions am I eligible for under 80C?',
          'How does HRA exemption work?',
          'Calculate my estimated tax liability',
        ],
        debt: [
          'Should I prepay my home loan or invest the surplus?',
          'How can I reduce my credit card debt faster?',
          'What is the avalanche vs snowball method?',
          'Calculate my EMI for a new loan',
          'What is a good debt-to-income ratio?',
        ],
        insurance: [
          'How much life insurance cover do I need?',
          'Compare term plans for my age group',
          'What health insurance coverage is sufficient?',
          'Should I buy a standalone critical illness policy?',
          'How to claim tax benefits on insurance premiums?',
        ],
      };

      const defaultSuggestions = [
        'What is my financial health score?',
        'Show my monthly spending summary',
        'How can I improve my savings rate?',
        'What are some smart investment options?',
        'Help me plan for retirement',
      ];

      const suggestions = suggestionMap[contextIntent] || defaultSuggestions;

      // Shuffle & pick 3-4 to keep it fresh
      const shuffled = [...suggestions].sort(() => 0.5 - Math.random());
      return { success: true, data: shuffled.slice(0, 4) };
    } catch (error) {
      logger.error(`getSuggestions error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  generateFinancialAdvice
   * ---------------------------------------------------------- */
  /**
   * Generate contextual financial advice based on detected intent
   * and the user's message.
   * @param {Object} context
   * @param {string} context.intent
   * @param {string} context.message
   * @param {string} context.userId
   * @returns {Promise<string>} - Advice text.
   */
  async generateFinancialAdvice(context) {
    try {
      const { intent, message } = context;

      const templates = ADVICE_TEMPLATES[intent] || ADVICE_TEMPLATES.general;

      // Select a relevant template randomly
      const advice = templates[Math.floor(Math.random() * templates.length)];

      // Build a richer response that echoes intent
      const intentLabels = {
        budget: 'budgeting',
        savings: 'savings',
        investment: 'investments',
        tax: 'tax planning',
        debt: 'debt management',
        insurance: 'insurance',
        general: 'personal finance',
      };

      const topic = intentLabels[intent] || 'personal finance';

      const greeting = `Great question about ${topic}! `;
      const closing =
        '\n\nWould you like me to go deeper into any aspect or provide a personalized recommendation?';

      return greeting + advice + closing;
    } catch (error) {
      logger.error(`generateFinancialAdvice error: ${error.message}`);
      return 'I apologize, but I encountered an issue generating advice. Please try rephrasing your question.';
    }
  },

  /* ----------------------------------------------------------
   *  analyzeQuery
   * ---------------------------------------------------------- */
  /**
   * Detect the intent of a user's message using keyword matching.
   * Returns the best-matching intent and a confidence score.
   * @param {string} message
   * @returns {Promise<{intent: string, confidence: number, allScores: Object}>}
   */
  async analyzeQuery(message) {
    try {
      if (!message) return { intent: 'general', confidence: 0, allScores: {} };

      const lowerMsg = message.toLowerCase();
      const scores = {};

      for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        let matchCount = 0;
        for (const kw of keywords) {
          if (lowerMsg.includes(kw)) matchCount++;
        }
        scores[intent] = keywords.length > 0 ? matchCount / keywords.length : 0;
      }

      // Pick top intent
      let bestIntent = 'general';
      let bestScore = 0;
      for (const [intent, score] of Object.entries(scores)) {
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }

      // Normalise confidence to 0-1
      const confidence = Math.min(1, bestScore * 5); // scale up since individual keyword density is low

      return { intent: bestIntent, confidence: +confidence.toFixed(2), allScores: scores };
    } catch (error) {
      logger.error(`analyzeQuery error: ${error.message}`);
      return { intent: 'general', confidence: 0, allScores: {} };
    }
  },

  /* ----------------------------------------------------------
   *  formatChartResponse
   * ---------------------------------------------------------- */
  /**
   * Format data for chart rendering on the frontend.
   * @param {Object} data - Raw data to visualize.
   * @param {'bar'|'pie'|'line'|'doughnut'} chartType
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async formatChartResponse(data, chartType = 'bar') {
    try {
      if (!data) throw new Error('Data is required for chart formatting');

      const validTypes = ['bar', 'pie', 'line', 'doughnut'];
      if (!validTypes.includes(chartType)) {
        throw new Error(`Invalid chart type. Must be one of: ${validTypes.join(', ')}`);
      }

      const colours = [
        '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
      ];

      let chartConfig;

      if (Array.isArray(data)) {
        // Array of { label, value } objects
        chartConfig = {
          type: chartType,
          data: {
            labels: data.map((d) => d.label || d.name || 'Unknown'),
            datasets: [
              {
                label: 'Amount',
                data: data.map((d) => d.value || d.amount || 0),
                backgroundColor: data.map((_, i) => colours[i % colours.length]),
                borderColor: data.map((_, i) => colours[i % colours.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
          },
        };
      } else if (data.labels && data.values) {
        chartConfig = {
          type: chartType,
          data: {
            labels: data.labels,
            datasets: [
              {
                label: data.datasetLabel || 'Value',
                data: data.values,
                backgroundColor: data.labels.map((_, i) => colours[i % colours.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
          },
        };
      } else {
        // Key-value object
        const entries = Object.entries(data);
        chartConfig = {
          type: chartType,
          data: {
            labels: entries.map(([k]) => k),
            datasets: [
              {
                label: 'Value',
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map((_, i) => colours[i % colours.length]),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
          },
        };
      }

      return { success: true, data: chartConfig };
    } catch (error) {
      logger.error(`formatChartResponse error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getConversationSummary
   * ---------------------------------------------------------- */
  /**
   * Generate a concise summary of a long conversation.
   * @param {string} conversationId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getConversationSummary(conversationId) {
    try {
      if (!conversationId) throw new Error('conversationId is required');

      const conv = await Conversation.findOne({ conversationId, isActive: true });
      if (!conv) throw new Error('Conversation not found');

      const messages = await ChatMessage.find({
        conversationId,
        isDeleted: false,
      })
        .sort({ createdAt: 1 })
        .lean();

      if (!messages.length) {
        return { success: true, data: { conversationId, summary: 'No messages in this conversation.', topics: [] } };
      }

      // Collect intents to find dominant topics
      const intentCounts = {};
      const userQuestions = [];
      for (const msg of messages) {
        if (msg.role === 'user') {
          userQuestions.push(msg.content.substring(0, 120));
        }
        if (msg.metadata?.intent) {
          intentCounts[msg.metadata.intent] = (intentCounts[msg.metadata.intent] || 0) + 1;
        }
      }

      const sortedIntents = Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([intent]) => intent);

      const topTopics = sortedIntents.slice(0, 3);

      // Build summary text
      const topicStr = topTopics.length ? topTopics.join(', ') : 'general finance';
      const summaryText = `This conversation contains ${messages.length} messages covering topics related to ${topicStr}. ` +
        `The user asked ${userQuestions.length} question(s). ` +
        (userQuestions.length > 0
          ? `Key questions included: "${userQuestions[0]}"${userQuestions.length > 1 ? ` and "${userQuestions[userQuestions.length - 1]}"` : ''}.`
          : '');

      // Persist summary
      conv.summary = summaryText;
      await conv.save();

      return {
        success: true,
        data: {
          conversationId,
          title: conv.title,
          summary: summaryText,
          topics: topTopics,
          messageCount: messages.length,
          duration: {
            firstMessage: messages[0].createdAt,
            lastMessage: messages[messages.length - 1].createdAt,
          },
        },
      };
    } catch (error) {
      logger.error(`getConversationSummary error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = chatService;
