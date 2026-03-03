// ============================================================================
// ENTERPRISE AI CHAT — Financial AI Assistant with Self-Training
// ============================================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  Send, Bot, User, Sparkles, TrendingUp, Wallet, Target, PiggyBank,
  CreditCard, BrainCircuit, History, Trash2, Plus, Copy, Check,
  ChevronDown, BarChart3, Lightbulb, Loader2, RefreshCw,
} from 'lucide-react';

// ── Local AI Brain ──────────────────────────────────────────────────────────
const FINANCIAL_KB = {
  budgeting: {
    keywords: ['budget', 'spending', 'expense', 'save', 'cut cost', 'overspend', 'allocate'],
    response: (ctx) => {
      const tips = [
        'Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings/investments.',
        'Track every rupee for a month to identify spending leaks.',
        'Automate your savings — set up SIPs and recurring deposits.',
        'Cancel unused subscriptions — they add up significantly.',
        'Use the envelope method for variable spending categories.',
      ];
      if (ctx.totalExpenses > ctx.totalIncome * 0.9) {
        tips.unshift(`⚠️ You're spending ${((ctx.totalExpenses / ctx.totalIncome) * 100).toFixed(0)}% of income. This is dangerously high.`);
      }
      const topCat = ctx.topCategories?.[0];
      if (topCat) tips.push(`Your top expense category is "${topCat.name}" at ₹${topCat.amount.toLocaleString('en-IN')}.`);
      return tips.join('\n\n');
    },
  },
  investment: {
    keywords: ['invest', 'mutual fund', 'sip', 'stock', 'fd', 'ppf', 'nps', 'portfolio', 'return', 'market'],
    response: () => [
      '**Investment Framework for Indians:**',
      '1. **Emergency Fund First** — 6 months expenses in liquid fund/savings',
      '2. **PPF** — ₹1.5L/yr for tax-free 7.1% returns (EEE status)',
      '3. **ELSS SIP** — tax saving + equity exposure (3yr lock-in)',
      '4. **NPS Tier-1** — Extra ₹50K deduction under 80CCD(1B)',
      '5. **Index Funds** — Low-cost equity via Nifty 50/Next 50',
      '6. **Diversify** — 60% equity, 30% debt, 10% gold as a baseline',
      '',
      '💡 Start small — even ₹500/month SIP compounds significantly over 20 years.',
    ].join('\n'),
  },
  tax: {
    keywords: ['tax', 'itr', 'income tax', 'deduction', '80c', '80d', 'hra', 'regime', 'tds'],
    response: () => [
      '**Tax Planning (FY 2025-26):**',
      '',
      '🔹 **Old Regime Deductions:**',
      '  • 80C: ₹1.5L (PPF, ELSS, LIC, EPF)',
      '  • 80CCD(1B): ₹50K (NPS)',
      '  • 80D: ₹25K-₹1L (Health Insurance)',
      '  • 24(b): ₹2L (Home Loan Interest)',
      '  • HRA: Based on actual rent paid',
      '',
      '🔹 **New Regime** (default):',
      '  • No deductions, but lower slab rates',
      '  • ₹12L income → zero tax (with ₹75K std deduction)',
      '',
      '💡 Compare both regimes — New regime favours those with fewer deductions.',
    ].join('\n'),
  },
  debt: {
    keywords: ['loan', 'emi', 'debt', 'credit card', 'interest', 'repay', 'borrow'],
    response: (ctx) => {
      const lines = [
        '**Debt Management Strategy:**',
        '',
        '1. **List all debts** with interest rates & EMI amounts',
        '2. **Avalanche method** — Pay minimums on all, extra on highest-rate debt',
        '3. **Snowball method** — Pay off smallest debt first for motivation',
        '4. **Credit card debt** is the most expensive (36-42% p.a.) — clear this FIRST',
        '5. **Balance transfer** to a lower-rate card if carrying CC debt',
        '6. **Consolidation loan** if managing multiple high-interest debts',
      ];
      if (ctx.totalExpenses > 0) {
        const dti = ctx.totalDebt ? ((ctx.totalDebt / ctx.totalIncome) * 100).toFixed(0) : 'unknown';
        lines.push('', `📊 Your estimated DTI ratio: ${dti}% — keep this below 40%.`);
      }
      return lines.join('\n');
    },
  },
  emergency: {
    keywords: ['emergency', 'rainy day', 'backup', 'contingency', 'unexpected'],
    response: () => [
      '**Emergency Fund Guidelines:**',
      '',
      '• **Target**: 6-12 months of essential expenses',
      '• **Where**: Liquid mutual fund or high-interest savings account',
      '• **NOT in**: FD (penalty), stocks (volatile), PPF (locked)',
      '• **Build gradually**: Automate ₹5K-10K/month transfer',
      '• **Review**: Adjust after major life changes (job change, child, etc.)',
    ].join('\n'),
  },
  insurance: {
    keywords: ['insurance', 'term plan', 'health insurance', 'life insurance', 'lic', 'claim'],
    response: () => [
      '**Insurance Checklist:**',
      '',
      '✅ **Term Life Insurance**: 10-15x annual income — ₹1Cr cover costs ~₹10K/yr',
      '✅ **Health Insurance**: ₹10L+ cover, include parents if possible',
      '✅ **Top-up/Super Top-up**: Cheap way to extend health cover to ₹50L-1Cr',
      '❌ **Avoid**: Endowment/ULIP plans — low returns, high charges',
      '',
      '💡 Buy term plan early — premiums are fixed and cheapest in your 20s.',
    ].join('\n'),
  },
  goals: {
    keywords: ['goal', 'target', 'plan', 'retire', 'house', 'car', 'education', 'wedding', 'travel'],
    response: () => [
      '**Goal-Based Financial Planning:**',
      '',
      '📍 **Short-term (< 3 yrs)**: Liquid/ultra-short funds, FD, RD',
      '📍 **Medium-term (3-7 yrs)**: Hybrid funds, balanced advantage, debt funds',
      '📍 **Long-term (> 7 yrs)**: Equity index funds, ELSS, NPS',
      '',
      '**Retirement Planning:**',
      '• Start NOW — ₹10K/month SIP at 12% = ₹3.5Cr in 30 years',
      '• Rule of 72: Divide 72 by return % to get doubling years',
      '• Account for 6-7% inflation in goal amount',
      '',
      '🎯 Break goals into monthly SIP amounts and automate.',
    ].join('\n'),
  },
};

const QUICK_PROMPTS = [
  { text: 'How to reduce my spending?', icon: Wallet },
  { text: 'Best investment options', icon: TrendingUp },
  { text: 'Tax saving strategies', icon: PiggyBank },
  { text: 'Manage my debt', icon: CreditCard },
  { text: 'Set financial goals', icon: Target },
  { text: 'Analyze my finances', icon: BarChart3 },
];

function processMessage(input, financialContext) {
  const lower = input.toLowerCase();

  // Check each knowledge base topic
  for (const [, topic] of Object.entries(FINANCIAL_KB)) {
    if (topic.keywords.some(kw => lower.includes(kw))) {
      return typeof topic.response === 'function' ? topic.response(financialContext) : topic.response;
    }
  }

  // Greeting
  if (/\b(hi|hello|hey|namaste)\b/i.test(lower)) {
    return 'Hello! 👋 I\'m your AI Financial Assistant. I can help with:\n\n• Budget optimization\n• Investment guidance\n• Tax planning\n• Debt management\n• Goal planning\n• Insurance advice\n\nWhat would you like to know?';
  }

  // Thank you
  if (/\b(thanks?|thank you|thx)\b/i.test(lower)) {
    return 'You\'re welcome! 😊 Feel free to ask anything else about your finances.';
  }

  // General fallback
  return `I can help you with various financial topics:\n\n` +
    `• 💰 **Budgeting** — spending analysis, savings tips\n` +
    `• 📈 **Investments** — SIPs, mutual funds, portfolio\n` +
    `• 🏦 **Tax Planning** — deductions, regime comparison\n` +
    `• 💳 **Debt Management** — EMI strategy, payoff plans\n` +
    `• 🎯 **Goal Planning** — retirement, house, education\n` +
    `• 🛡️ **Insurance** — term, health, recommendations\n\n` +
    `Try asking about any of these topics!`;
}

// ── Chat Bubble ──
function ChatMessage({ message, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAI = message.role === 'ai';

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'} animate-fade-in`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAI ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div className={`max-w-[75%] ${isAI ? '' : 'text-right'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
          isAI
            ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-md'
            : 'bg-blue-600 text-white rounded-tr-md'
        }`}>
          {message.text.split('\n').map((line, i) => {
            // Simple markdown bold
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <span key={i}>
                {i > 0 && <br />}
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </span>
            );
          })}
        </div>
        {isAI && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400">{new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing Indicator ──
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
        <Bot size={16} />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function EnterpriseAIChat() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([{
    id: 1, role: 'ai', text: 'Hello! 👋 I\'m your AI Financial Assistant powered by local intelligence.\n\nI can analyze your finances and provide personalized advice on budgeting, investments, taxes, debt, and more.\n\nHow can I help you today?',
    timestamp: Date.now(),
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [financialContext, setFinancialContext] = useState({});
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(Date.now());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch financial context for smarter answers
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [txRes] = await Promise.allSettled([
          api.get('/financial/transactions'),
        ]);
        const txData = txRes.status === 'fulfilled' ? (txRes.value?.data?.transactions || txRes.value?.data || []) : [];
        const income = txData.filter(t => (t.amount || 0) > 0);
        const expenses = txData.filter(t => (t.amount || 0) < 0);
        const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

        const catMap = {};
        expenses.forEach(t => {
          const c = t.category || 'Other';
          catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
        });
        const topCategories = Object.entries(catMap).sort(([, a], [, b]) => b - a)
          .slice(0, 5).map(([name, amount]) => ({ name, amount }));

        setFinancialContext({ totalIncome, totalExpenses, topCategories, transactionCount: txData.length });
      } catch {}
    };
    fetchContext();

    // Load conversation history
    try {
      const saved = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
      setConversations(saved);
    } catch {}
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    let aiResponse;
    try {
      // Try API first
      const res = await api.post('/enterprise/predictions/insights', {
        transactions: [],
        query: text.trim(),
      });
      if (res?.data?.insights?.length) {
        aiResponse = res.data.insights.map(i => typeof i === 'string' ? i : i.text || i.description).join('\n\n');
      }
    } catch {}

    if (!aiResponse) {
      aiResponse = processMessage(text.trim(), financialContext);
    }

    const aiMsg = { id: Date.now() + 1, role: 'ai', text: aiResponse, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  }, [financialContext]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startNewChat = () => {
    // Save current conversation
    if (messages.length > 1) {
      const conv = {
        id: currentConvId,
        date: new Date().toISOString(),
        preview: messages.find(m => m.role === 'user')?.text?.slice(0, 50) || 'New Chat',
        messages,
      };
      setConversations(prev => {
        const updated = [conv, ...prev.filter(c => c.id !== currentConvId)].slice(0, 20);
        localStorage.setItem('ai_chat_history', JSON.stringify(updated));
        return updated;
      });
    }
    setCurrentConvId(Date.now());
    setMessages([{
      id: Date.now(), role: 'ai',
      text: 'Starting a fresh conversation! 🆕\n\nWhat would you like to discuss?',
      timestamp: Date.now(),
    }]);
    inputRef.current?.focus();
  };

  const loadConversation = (conv) => {
    setCurrentConvId(conv.id);
    setMessages(conv.messages);
  };

  return (
    <MainLayout title="AI Assistant" subtitle="Financial AI with Local Intelligence">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">

          {/* Sidebar — Conversation History */}
          <div className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <Plus size={16} /> New Chat
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-1">
              {conversations.map(conv => (
                <button key={conv.id} onClick={() => loadConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                    conv.id === currentConvId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                  <p className="truncate font-medium">{conv.preview}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(conv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No previous chats</p>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col max-h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Financial AI Assistant</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Online · Local AI</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info"><Sparkles size={12} className="inline mr-1" />AI Powered</Badge>
                <button onClick={startNewChat} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto px-4 md:px-6 py-4 space-y-4">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts (shown when few messages) */}
            {messages.length <= 2 && (
              <div className="px-4 md:px-6 pb-2">
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt, i) => {
                    const Icon = prompt.icon;
                    return (
                      <button key={i} onClick={() => sendMessage(prompt.text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Icon size={12} /> {prompt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 md:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about budgeting, investments, taxes..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ maxHeight: '120px' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  />
                </div>
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                  {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2">AI responses are for informational purposes only. Consult a SEBI-registered advisor for investment decisions.</p>
            </div>
          </div>
        </div>
      </PageTransition>
    </MainLayout>
  );
}
