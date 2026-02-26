const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

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

    // Generate AI response (placeholder – integrate with actual AI service)
    const aiContent = generateFinancialResponse(content);
    const assistantMessage = new ChatMessage({
      userId: req.user._id,
      conversationId: convId,
      role: 'assistant',
      content: aiContent,
      metadata: { model: 'financial-assistant-v1', tokens: aiContent.length }
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

// Get suggested questions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      'What are my top spending categories this month?',
      'How much have I saved compared to last month?',
      'Can you analyze my recurring expenses?',
      'What\'s my projected savings by end of year?',
      'Show me a breakdown of my investment portfolio.',
      'How can I reduce my monthly expenses?',
      'What bills are coming up next week?',
      'Compare my spending trends over the last 3 months.'
    ];
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Simple placeholder response generator
function generateFinancialResponse(query) {
  const q = query.toLowerCase();
  if (q.includes('save') || q.includes('saving')) {
    return 'Based on your spending patterns, I recommend setting aside 20% of your income into a high-yield savings account. You could also look into automating transfers on payday to build consistency.';
  }
  if (q.includes('spend') || q.includes('expense')) {
    return 'Your top spending categories this month appear to be food, transportation, and entertainment. Consider setting budget limits for discretionary categories to optimize your cashflow.';
  }
  if (q.includes('invest')) {
    return 'For long-term growth, consider a diversified portfolio with index funds. A typical allocation might be 60% equity, 30% debt, and 10% gold or alternatives based on your risk profile.';
  }
  if (q.includes('budget')) {
    return 'I recommend the 50-30-20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Would you like me to create a personalized budget plan?';
  }
  return 'I can help you analyze your finances. Try asking about your spending patterns, savings goals, investment options, or budget planning!';
}

module.exports = router;
