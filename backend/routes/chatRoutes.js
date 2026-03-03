const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const BillReminder = require('../models/BillReminder');
const Investment = require('../models/Investment');
const logger = require('../utils/logger');

router.use(authenticate);

// Send message and get AI response
router.post('/message', async (req, res) => {
  try {
    const { content, conversationId } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Message content is required' });

    const convId = conversationId || uuidv4();

    // Save user message
    const userMessage = new ChatMessage({
      userId: req.user._id,
      conversationId: convId,
      role: 'user',
      content
    });
    await userMessage.save();

    // Build financial context from user's real data
    const financialContext = await buildUserFinancialContext(req.user._id);
    
    // Generate AI response using configured AI provider (Ollama or OpenAI)
    const aiContent = await generateAIResponse(content, financialContext);
    const assistantMessage = new ChatMessage({
      userId: req.user._id,
      conversationId: convId,
      role: 'assistant',
      content: aiContent,
      metadata: { model: process.env.AI_PROVIDER === 'openai' ? 'openai' : (process.env.OLLAMA_MODEL || 'mistral:7b'), tokens: aiContent.length }
    });
    await assistantMessage.save();

    res.json({ success: true, data: { conversationId: convId, userMessage, assistantMessage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List conversations
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await ChatMessage.getConversations(req.user._id);
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get conversation messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      conversationId: req.params.id,
      userId: req.user._id
    }).sort({ createdAt: 1 });
    if (!messages.length) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const result = await ChatMessage.deleteMany({ conversationId: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, message: 'Conversation deleted', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export conversation
router.post('/conversations/:id/export', async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      conversationId: req.params.id,
      userId: req.user._id
    }).sort({ createdAt: 1 });
    if (!messages.length) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const exported = messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt
    }));
    res.json({ success: true, data: { conversationId: req.params.id, messages: exported, exportedAt: new Date() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get suggested questions based on user's actual data
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Build dynamic suggestions based on user's actual data patterns
    const baseSuggestions = [
      'What are my top spending categories this month?',
      'How much have I saved compared to last month?',
      'Can you analyze my recurring expenses?',
      'What\'s my projected savings by end of year?',
      'Show me a breakdown of my investment portfolio.',
      'How can I reduce my monthly expenses?',
      'What bills are coming up next week?',
      'Compare my spending trends over the last 3 months.',
    ];
    
    // Try to add AI-powered contextual suggestions
    try {
      const Transaction = require('../models/Transaction');
      const txCount = await Transaction.countDocuments({ userId });
      
      if (txCount > 0) {
        baseSuggestions.push(
          'What is my financial health score?',
          'Are there any anomalies in my spending?',
          'What spending patterns have you detected?',
          'Should I adjust any of my budgets?',
          'How does my savings rate compare to recommended levels?',
          'What categories am I overspending in?'
        );
      }
      
      if (txCount === 0) {
        baseSuggestions.unshift(
          'How do I get started with the app?',
          'What features does this financial tool offer?',
          'How can I import my transactions?'
        );
      }
    } catch (e) { /* ignore */ }
    
    // Shuffle and return top 8
    const shuffled = baseSuggestions.sort(() => Math.random() - 0.5).slice(0, 8);
    res.json({ success: true, data: shuffled });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Build financial context from user's real data for AI prompt
 */
async function buildUserFinancialContext(userId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Fetch real transaction data
    const [monthlyTransactions, lastMonthTransactions, budgets, upcomingBills, investments] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startOfMonth } }).lean().catch(() => []),
      Transaction.find({ userId, date: { $gte: startOfLastMonth, $lt: startOfMonth } }).lean().catch(() => []),
      Budget.find({ userId, isActive: true }).lean().catch(() => []),
      BillReminder.find({ userId, status: { $ne: 'paid' }, dueDate: { $gte: now } }).sort({ dueDate: 1 }).limit(10).lean().catch(() => []),
      Investment.find({ userId }).lean().catch(() => [])
    ]);

    // Calculate real spending by category
    const spendingByCategory = {};
    let totalIncome = 0;
    let totalExpenses = 0;
    monthlyTransactions.forEach(t => {
      if (t.type === 'debit' || t.type === 'expense') {
        totalExpenses += t.amount || 0;
        const cat = t.category || 'Uncategorized';
        spendingByCategory[cat] = (spendingByCategory[cat] || 0) + (t.amount || 0);
      } else if (t.type === 'credit' || t.type === 'income') {
        totalIncome += t.amount || 0;
      }
    });

    let lastMonthExpenses = 0;
    lastMonthTransactions.forEach(t => {
      if (t.type === 'debit' || t.type === 'expense') lastMonthExpenses += t.amount || 0;
    });

    const topCategories = Object.entries(spendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: \u20b9${amt.toLocaleString('en-IN')}`);

    const budgetSummary = budgets.map(b => {
      const spent = spendingByCategory[b.category] || 0;
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      return `${b.category}: \u20b9${spent.toLocaleString('en-IN')}/\u20b9${b.amount.toLocaleString('en-IN')} (${pct}%)`;
    });

    const billsSummary = upcomingBills.map(b => `${b.name}: \u20b9${(b.amount || 0).toLocaleString('en-IN')} due ${new Date(b.dueDate).toLocaleDateString('en-IN')}`);

    const totalInvested = investments.reduce((s, i) => s + (i.totalInvestedAmount || 0), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + (i.currentValue || 0), 0);

    return [
      `Financial Summary for ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}:`,
      `Total Income: \u20b9${totalIncome.toLocaleString('en-IN')}`,
      `Total Expenses: \u20b9${totalExpenses.toLocaleString('en-IN')}`,
      `Net Savings: \u20b9${(totalIncome - totalExpenses).toLocaleString('en-IN')}`,
      lastMonthExpenses > 0 ? `Last month expenses: \u20b9${lastMonthExpenses.toLocaleString('en-IN')}` : '',
      topCategories.length > 0 ? `Top Spending Categories: ${topCategories.join(', ')}` : 'No spending data yet.',
      budgetSummary.length > 0 ? `Budget Status: ${budgetSummary.join('; ')}` : '',
      billsSummary.length > 0 ? `Upcoming Bills: ${billsSummary.join('; ')}` : 'No upcoming bills.',
      investments.length > 0 ? `Investments: ${investments.length} holdings, Total Invested: \u20b9${totalInvested.toLocaleString('en-IN')}, Current Value: \u20b9${totalCurrentValue.toLocaleString('en-IN')}` : 'No investments tracked.',
    ].filter(Boolean).join('\n');
  } catch (error) {
    logger.error('Error building financial context:', error);
    return 'No financial data available yet. The user should add transactions, budgets, and other data first.';
  }
}

/**
 * Generate AI response using Ollama (local) or OpenAI
 */
async function generateAIResponse(userMessage, financialContext) {
  const systemPrompt = `You are a helpful financial assistant. Answer the user's question based on their actual financial data provided below. Be specific with real numbers from their data. If data is not available, suggest they add it to the app. Do not invent or fabricate numbers.\n\n${financialContext}`;

  try {
    const provider = process.env.AI_PROVIDER || 'ollama';

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      return completion.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
    }

    // Default: Ollama (local AI)
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'mistral:7b';

    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false
    }, { timeout: 60000 });

    return response.data?.message?.content || 'I could not generate a response. Please try again.';
  } catch (error) {
    logger.error('AI response generation error:', error.message);
    // Fallback: use localAIEngine to generate a smart response
    try {
      const localAI = require('../services/localAIEngine');
      const userId = null; // We don't have userId here, use context
      
      const lowerMsg = userMessage.toLowerCase();
      let smartResponse = '';
      
      if (lowerMsg.includes('spend') || lowerMsg.includes('expense') || lowerMsg.includes('category')) {
        smartResponse = `Based on your financial data:\n\n${financialContext}\n\nI can see your spending breakdown above. To get more detailed AI analysis, visit the AI Command Center page where you can see spending forecasts, anomaly detection, and personalized recommendations.`;
      } else if (lowerMsg.includes('save') || lowerMsg.includes('saving')) {
        smartResponse = `Here's what I can tell you from your data:\n\n${financialContext}\n\nTip: Aim for a savings rate of at least 20% of your income. Set up automatic transfers to a savings account on payday to make saving effortless.`;
      } else if (lowerMsg.includes('budget')) {
        smartResponse = `Your current budget status:\n\n${financialContext}\n\nTip: Use the 50/30/20 rule — 50% needs, 30% wants, 20% savings. Visit Budget Planner to create or adjust your budgets.`;
      } else if (lowerMsg.includes('invest')) {
        smartResponse = `Your investment summary:\n\n${financialContext}\n\nTip: Diversify across equity, debt, and alternative investments. Consider SIPs for disciplined investing. Check the Investment Portfolio page for detailed analytics.`;
      } else if (lowerMsg.includes('bill') || lowerMsg.includes('due') || lowerMsg.includes('remind')) {
        smartResponse = `Your upcoming bills and reminders:\n\n${financialContext}\n\nTip: Set up autopay for recurring bills to avoid late fees. Use the Bill Tracker page to manage all your bills in one place.`;
      } else if (lowerMsg.includes('forecast') || lowerMsg.includes('predict') || lowerMsg.includes('future')) {
        smartResponse = `Based on your historical data:\n\n${financialContext}\n\nFor AI-powered spending forecasts and predictions, visit the AI Command Center where our local AI engine analyzes your patterns and predicts future spending.`;
      } else if (lowerMsg.includes('health') || lowerMsg.includes('score')) {
        smartResponse = `Your financial overview:\n\n${financialContext}\n\nFor a detailed financial health score with 7 components, visit the AI Command Center. The score considers savings rate, budget adherence, debt-to-income ratio, emergency fund, investment diversity, insurance coverage, and spending consistency.`;
      } else {
        smartResponse = `Here's your current financial snapshot:\n\n${financialContext}\n\nI'm running in local mode (no external AI connected). For smarter AI-powered insights, either:\n1. Start Ollama: \`ollama serve\` then \`ollama pull mistral:7b\`\n2. Or set OPENAI_API_KEY in your .env file\n\nMeanwhile, visit the AI Command Center for local ML-powered analysis!`;
      }
      
      return smartResponse;
    } catch (fallbackError) {
      logger.error('Local AI fallback error:', fallbackError.message);
      return `I'm unable to connect to the AI service right now. Here's a summary of your data:\n\n${financialContext}\n\nPlease ensure Ollama is running (ollama serve) or configure OpenAI API key for cloud AI.`;
    }
  }
}

module.exports = router;
