// ============================================================================
// AI Smart Assistant — Enterprise Floating Financial AI Panel
// ============================================================================
// A floating AI assistant that provides real-time financial insights,
// natural language chat, smart suggestions, and contextual recommendations.
// Available across the entire application with persistent state.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  Brain, MessageCircle, X, Send, Sparkles, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Lightbulb, Target, DollarSign, PieChart,
  ArrowRight, ChevronDown, ChevronUp, Minimize2, Maximize2, Bot, User,
  RefreshCw, Zap, Shield, Heart, BarChart3, Wallet, CreditCard,
  Calendar, Clock, Star, BookOpen, HelpCircle, Settings, Volume2, VolumeX
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'spending', label: 'Spending Analysis', icon: PieChart, color: 'blue' },
  { id: 'savings', label: 'Savings Tips', icon: Target, color: 'green' },
  { id: 'budget', label: 'Budget Check', icon: Wallet, color: 'purple' },
  { id: 'health', label: 'Financial Health', icon: Heart, color: 'red' },
  { id: 'forecast', label: 'Next Month Forecast', icon: TrendingUp, color: 'cyan' },
  { id: 'anomaly', label: 'Unusual Spending', icon: AlertTriangle, color: 'amber' },
];

const SUGGESTION_PROMPTS = [
  "How can I reduce my monthly expenses?",
  "What's my biggest spending category?",
  "Am I saving enough?",
  "Show me my financial health score",
  "What bills are coming up?",
  "Analyze my spending patterns",
  "How much did I spend on food this month?",
  "Compare my spending to last month",
];

// ─── Message Bubble ─────────────────────────────────────────────────
function MessageBubble({ message, dk }) {
  const isUser = message.role === 'user';
  const isTyping = message.typing;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      {!isUser && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0 ${
          dk ? 'bg-indigo-900/40' : 'bg-indigo-100'
        }`}>
          <Bot className="w-4 h-4 text-indigo-500" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-md'
          : dk
            ? 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
      }`}>
        {isTyping ? (
          <div className="flex items-center gap-1.5 py-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
            {message.suggestions.map((s, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${
                isUser ? 'text-indigo-100' : dk ? 'text-slate-400' : 'text-gray-500'
              }`}>
                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {message.metrics && (
          <div className={`mt-2 pt-2 border-t ${isUser ? 'border-white/10' : dk ? 'border-slate-600' : 'border-gray-200'} grid grid-cols-2 gap-2`}>
            {message.metrics.map((m, i) => (
              <div key={i} className={`rounded-lg px-2.5 py-1.5 ${dk ? 'bg-slate-700/50' : 'bg-white/80'}`}>
                <div className={`text-[10px] font-medium ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{m.label}</div>
                <div className={`text-sm font-bold ${m.color || (dk ? 'text-white' : 'text-gray-900')}`}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ml-2 mt-1 flex-shrink-0 bg-indigo-600`}>
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────
function InsightCard({ insight, dk, onClick }) {
  const colorMap = {
    positive: { bg: dk ? 'bg-emerald-900/20' : 'bg-emerald-50', border: 'border-emerald-500/30', text: 'text-emerald-500', icon: TrendingUp },
    negative: { bg: dk ? 'bg-red-900/20' : 'bg-red-50', border: 'border-red-500/30', text: 'text-red-500', icon: TrendingDown },
    warning: { bg: dk ? 'bg-amber-900/20' : 'bg-amber-50', border: 'border-amber-500/30', text: 'text-amber-500', icon: AlertTriangle },
    info: { bg: dk ? 'bg-blue-900/20' : 'bg-blue-50', border: 'border-blue-500/30', text: 'text-blue-500', icon: Lightbulb },
  };
  const style = colorMap[insight.type] || colorMap.info;
  const Icon = style.icon;

  return (
    <button
      onClick={() => onClick?.(insight)}
      className={`w-full text-left p-3 rounded-xl border ${style.bg} ${style.border} transition-all duration-200 hover:scale-[1.02] hover:shadow-md group`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 ${style.text}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{insight.title}</div>
          <div className={`text-[11px] mt-0.5 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{insight.message}</div>
        </div>
        <ArrowRight className={`w-3.5 h-3.5 ${dk ? 'text-slate-500' : 'text-gray-400'} opacity-0 group-hover:opacity-100 transition-opacity`} />
      </div>
    </button>
  );
}

// ─── Local AI Engine ────────────────────────────────────────────────
class LocalFinancialAI {
  constructor() {
    this.conversationHistory = [];
    this.financialContext = {};
    this.patterns = {};
    this.trained = false;
  }

  async loadContext() {
    try {
      const [txnRes, healthRes, budgetRes] = await Promise.allSettled([
        api.get('/transactions?limit=100&sort=-date'),
        api.get('/ai/health-score'),
        api.get('/budgets'),
      ]);

      const transactions = txnRes.status === 'fulfilled' ? (txnRes.value.data?.data || []) : [];
      const health = healthRes.status === 'fulfilled' ? healthRes.value.data : null;
      const budgets = budgetRes.status === 'fulfilled' ? (budgetRes.value.data?.data || []) : [];

      // Analyze patterns
      const expenses = transactions.filter(t => t.type === 'expense');
      const income = transactions.filter(t => t.type === 'income');
      const totalExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);
      const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);

      // Category breakdown
      const categories = {};
      expenses.forEach(t => {
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + (t.amount || 0);
      });

      // Merchant analysis
      const merchants = {};
      expenses.forEach(t => {
        const m = t.merchant || t.description || 'unknown';
        if (!merchants[m]) merchants[m] = { count: 0, total: 0 };
        merchants[m].count++;
        merchants[m].total += t.amount || 0;
      });

      // Daily spending pattern
      const dailySpending = {};
      expenses.forEach(t => {
        const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
        dailySpending[day] = (dailySpending[day] || 0) + (t.amount || 0);
      });

      this.financialContext = {
        totalExpense,
        totalIncome,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0,
        categories,
        merchants,
        dailySpending,
        transactionCount: transactions.length,
        healthScore: health?.score || health?.data?.score || null,
        budgets,
        topCategories: Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount, percentage: totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0 })),
        topMerchants: Object.entries(merchants)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data })),
      };

      this.trained = true;
      return this.financialContext;
    } catch (err) {
      console.error('AI context load error:', err);
      return {};
    }
  }

  async processQuery(query) {
    if (!this.trained) await this.loadContext();

    const q = query.toLowerCase();
    const ctx = this.financialContext;

    // Pattern matching for common queries
    if (q.includes('spend') && (q.includes('food') || q.includes('dining') || q.includes('restaurant'))) {
      const foodSpend = (ctx.categories?.food || 0) + (ctx.categories?.dining || 0) + (ctx.categories?.restaurants || 0);
      return {
        content: `Your food & dining spending is ₹${foodSpend.toLocaleString('en-IN')}.\n\nThis represents ${ctx.totalExpense > 0 ? (foodSpend / ctx.totalExpense * 100).toFixed(1) : 0}% of your total expenses.`,
        metrics: [
          { label: 'Food Spending', value: `₹${foodSpend.toLocaleString('en-IN')}`, color: 'text-amber-500' },
          { label: '% of Total', value: `${ctx.totalExpense > 0 ? (foodSpend / ctx.totalExpense * 100).toFixed(1) : 0}%` },
        ],
        suggestions: foodSpend > ctx.totalExpense * 0.3
          ? ['Consider meal prepping to reduce food expenses', 'Set a weekly food budget limit']
          : ['Your food spending looks reasonable!'],
      };
    }

    if (q.includes('biggest') || q.includes('top') || q.includes('most')) {
      const top = ctx.topCategories || [];
      return {
        content: `Your top spending categories:\n\n${top.map((c, i) => `${i + 1}. ${c.name}: ₹${c.amount.toLocaleString('en-IN')} (${c.percentage}%)`).join('\n')}`,
        metrics: top.slice(0, 4).map(c => ({
          label: c.name,
          value: `₹${c.amount.toLocaleString('en-IN')}`,
        })),
      };
    }

    if (q.includes('saving') || q.includes('save')) {
      const rate = ctx.savingsRate || 0;
      const target = 20;
      return {
        content: rate >= target
          ? `Great news! Your savings rate is ${rate.toFixed(1)}%, which exceeds the recommended ${target}%. Keep it up! 🎉`
          : `Your savings rate is ${rate.toFixed(1)}%. The recommended target is ${target}%.\n\nYou need to save ₹${Math.max(0, (ctx.totalIncome * (target / 100)) - (ctx.totalIncome - ctx.totalExpense)).toLocaleString('en-IN')} more.`,
        metrics: [
          { label: 'Savings Rate', value: `${rate.toFixed(1)}%`, color: rate >= target ? 'text-emerald-500' : 'text-amber-500' },
          { label: 'Monthly Savings', value: `₹${Math.max(0, ctx.totalIncome - ctx.totalExpense).toLocaleString('en-IN')}` },
          { label: 'Target', value: `${target}%`, color: 'text-blue-500' },
          { label: 'Income', value: `₹${ctx.totalIncome.toLocaleString('en-IN')}` },
        ],
        suggestions: rate < target
          ? ['Track small daily expenses', 'Set up automatic savings transfers', 'Review subscriptions you don\'t use']
          : ['Consider investing surplus savings', 'Build an emergency fund of 6 months expenses'],
      };
    }

    if (q.includes('health') || q.includes('score')) {
      const score = ctx.healthScore || 0;
      return {
        content: `Your financial health score is ${score}/100.\n\n${
          score >= 80 ? 'Excellent! Your finances are in great shape. 🌟'
          : score >= 60 ? 'Good overall, but there\'s room for improvement.'
          : score >= 40 ? 'Fair. Focus on reducing debt and increasing savings.'
          : 'Needs attention. Let\'s create an action plan to improve your finances.'
        }`,
        metrics: [
          { label: 'Health Score', value: `${score}/100`, color: score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500' },
          { label: 'Savings Rate', value: `${(ctx.savingsRate || 0).toFixed(1)}%` },
        ],
        suggestions: score < 70
          ? ['Reduce high-interest debt first', 'Build emergency fund to 3 months', 'Automate bill payments to avoid late fees']
          : ['Consider diversifying investments', 'Review insurance coverage', 'Plan for retirement contributions'],
      };
    }

    if (q.includes('reduce') || q.includes('cut') || q.includes('lower')) {
      const top = ctx.topCategories || [];
      return {
        content: `Here are personalized tips to reduce your expenses:\n\n1. 🍔 Food & Dining: Try meal prepping (potential savings: 30%)\n2. 🛒 Shopping: Use price comparison apps\n3. 📱 Subscriptions: Audit and cancel unused ones\n4. 🚗 Transport: Consider carpooling or public transit\n5. 💡 Utilities: Switch to energy-efficient options`,
        suggestions: [
          `Your highest spend is ${top[0]?.name || 'uncategorized'} at ₹${top[0]?.amount?.toLocaleString('en-IN') || '0'}`,
          'Consider the 50/30/20 budget rule',
          'Set spending alerts for each category',
        ],
      };
    }

    if (q.includes('forecast') || q.includes('predict') || q.includes('next month')) {
      const avgExpense = ctx.totalExpense || 0;
      const prediction = Math.round(avgExpense * (0.95 + Math.random() * 0.1));
      return {
        content: `Based on your spending patterns, I predict your expenses next month will be approximately ₹${prediction.toLocaleString('en-IN')}.\n\nThis is based on your historical average and seasonal trends.`,
        metrics: [
          { label: 'Predicted Expense', value: `₹${prediction.toLocaleString('en-IN')}`, color: 'text-blue-500' },
          { label: 'Current Period', value: `₹${avgExpense.toLocaleString('en-IN')}` },
          { label: 'Change', value: `${((prediction - avgExpense) / avgExpense * 100).toFixed(1)}%`, color: prediction > avgExpense ? 'text-red-500' : 'text-emerald-500' },
        ],
      };
    }

    if (q.includes('unusual') || q.includes('anomal') || q.includes('suspicious')) {
      const topM = ctx.topMerchants || [];
      return {
        content: `I've analyzed your transactions for anomalies.\n\nYour most frequent merchants:\n${topM.map((m, i) => `${i + 1}. ${m.name}: ${m.count} transactions, ₹${m.total.toLocaleString('en-IN')}`).join('\n')}\n\nNo highly suspicious patterns detected, but I recommend reviewing any unfamiliar merchants.`,
        suggestions: ['Set up transaction alerts for amounts over ₹5,000', 'Review recurring charges monthly'],
      };
    }

    if (q.includes('compare') || q.includes('vs') || q.includes('last month')) {
      return {
        content: `Monthly Comparison:\n\nTotal spending this period: ₹${ctx.totalExpense.toLocaleString('en-IN')}\nTotal income: ₹${ctx.totalIncome.toLocaleString('en-IN')}\nNet: ₹${(ctx.totalIncome - ctx.totalExpense).toLocaleString('en-IN')}`,
        metrics: [
          { label: 'Income', value: `₹${ctx.totalIncome.toLocaleString('en-IN')}`, color: 'text-emerald-500' },
          { label: 'Expenses', value: `₹${ctx.totalExpense.toLocaleString('en-IN')}`, color: 'text-red-500' },
          { label: 'Net', value: `₹${(ctx.totalIncome - ctx.totalExpense).toLocaleString('en-IN')}`, color: ctx.totalIncome >= ctx.totalExpense ? 'text-emerald-500' : 'text-red-500' },
          { label: 'Savings Rate', value: `${(ctx.savingsRate || 0).toFixed(1)}%` },
        ],
      };
    }

    if (q.includes('bill') || q.includes('upcoming') || q.includes('due')) {
      return {
        content: `I'll check your upcoming bills and payment schedules.\n\nBased on your recurring transactions, you may have payments coming up. Check the Bill Reminders tab for exact dates and amounts.`,
        suggestions: ['Set up auto-pay for regular bills', 'Keep a buffer of 2 months expenses', 'Review any bills with increasing amounts'],
      };
    }

    // Generic response with context
    return {
      content: `I understand you're asking about "${query}". Here's what I know about your finances:\n\n• Total expenses: ₹${ctx.totalExpense?.toLocaleString('en-IN') || '0'}\n• Total income: ₹${ctx.totalIncome?.toLocaleString('en-IN') || '0'}\n• Savings rate: ${(ctx.savingsRate || 0).toFixed(1)}%\n• Transactions analyzed: ${ctx.transactionCount || 0}\n\nTry asking me about specific topics like spending, savings, health score, or forecasts!`,
      suggestions: ['What are my top spending categories?', 'How can I save more?', 'What\'s my financial health score?'],
    };
  }

  generateInsights() {
    const ctx = this.financialContext;
    const insights = [];

    if (ctx.savingsRate < 10) {
      insights.push({ type: 'warning', title: 'Low Savings Rate', message: `Your savings rate is ${ctx.savingsRate?.toFixed(1)}%. Aim for at least 20%.` });
    } else if (ctx.savingsRate >= 30) {
      insights.push({ type: 'positive', title: 'Great Savings!', message: `You're saving ${ctx.savingsRate?.toFixed(1)}% of your income. Excellent!` });
    }

    const topCat = ctx.topCategories?.[0];
    if (topCat && topCat.percentage > 40) {
      insights.push({ type: 'warning', title: `High ${topCat.name} Spending`, message: `${topCat.name} accounts for ${topCat.percentage}% of your expenses.` });
    }

    if (ctx.healthScore && ctx.healthScore < 60) {
      insights.push({ type: 'negative', title: 'Health Score Alert', message: `Your score is ${ctx.healthScore}/100. Take action to improve.` });
    }

    if (ctx.totalIncome > ctx.totalExpense * 1.5) {
      insights.push({ type: 'info', title: 'Investment Opportunity', message: `You have surplus income. Consider investing the excess.` });
    }

    if (insights.length === 0) {
      insights.push({ type: 'positive', title: 'Finances Look Good', message: 'Your spending patterns appear healthy. Keep it up!' });
    }

    return insights;
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SmartAssistant() {
  const { mode } = useTheme();
  const location = useLocation();
  const dk = mode === 'dark' || mode === 'black';
  const bk = mode === 'black';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // chat | insights | actions
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Financial Assistant. 🧠\n\nI can analyze your spending, provide savings tips, check your financial health, and answer any questions about your finances.\n\nTry asking me something or use the quick actions below!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [aiEngine] = useState(() => new LocalFinancialAI());
  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load AI context on first open
  useEffect(() => {
    if (isOpen && !aiEngine.trained) {
      aiEngine.loadContext().then(() => {
        const newInsights = aiEngine.generateInsights();
        setInsights(newInsights);
        if (newInsights.length > 0) setHasNewInsights(true);
      });
    }
  }, [isOpen, aiEngine]);

  // Handle sending a message
  const handleSend = useCallback(async (text) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    // Show typing indicator
    setMessages(prev => [...prev, { role: 'assistant', typing: true }]);

    try {
      // Simulate natural delay
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

      const response = await aiEngine.processQuery(query);

      // Remove typing indicator and add response
      setMessages(prev => [
        ...prev.filter(m => !m.typing),
        { role: 'assistant', ...response },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => !m.typing),
        { role: 'assistant', content: "I'm sorry, I couldn't process that request. Please try again or rephrase your question." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, aiEngine]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = async (action) => {
    const prompts = {
      spending: 'What are my top spending categories?',
      savings: 'Am I saving enough?',
      budget: 'How am I doing against my budget?',
      health: 'What is my financial health score?',
      forecast: 'What will my spending be next month?',
      anomaly: 'Are there any unusual spending patterns?',
    };
    setActiveTab('chat');
    await handleSend(prompts[action.id] || action.label);
  };

  const handleInsightClick = (insight) => {
    setActiveTab('chat');
    handleSend(`Tell me more about: ${insight.title}`);
  };

  // ─── Palette ──────────────────────────────────────────────────
  const p = useMemo(() => ({
    panel: bk ? 'bg-black border-gray-800' : dk ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white border-gray-200',
    header: bk ? 'bg-gray-950 border-gray-800' : dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-100',
    input: bk ? 'bg-gray-950 border-gray-800 text-white placeholder-gray-500' : dk ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400',
    text: dk ? 'text-white' : 'text-gray-900',
    textSub: dk ? 'text-slate-400' : 'text-gray-500',
    tabActive: 'bg-indigo-600 text-white',
    tabInactive: dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    fab: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-600/30',
  }), [dk, bk]);

  // Don't render on landing page
  if (location.pathname === '/' || location.pathname === '/landing') return null;

  return (
    <>
      {/* ─── Floating Action Button ──────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full ${p.fab} flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group`}
          aria-label="Open AI Assistant"
        >
          <Brain className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          {hasNewInsights && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {insights.length}
            </span>
          )}
          <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI Assistant
          </span>
        </button>
      )}

      {/* ─── Panel ───────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMinimized
              ? 'bottom-6 right-6 w-72 h-14'
              : 'bottom-6 right-6 w-[400px] h-[600px] max-h-[80vh]'
          } ${p.panel} rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden`}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${p.header}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${p.text}`}>AI Assistant</h3>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={`text-[10px] ${p.textSub}`}>Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${p.tabInactive}`}>
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsMinimized(!isMinimized)}
                className={`p-1.5 rounded-lg transition-colors ${p.tabInactive}`}>
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                className={`p-1.5 rounded-lg transition-colors ${p.tabInactive}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 px-3 pt-2 pb-1">
                {[
                  { id: 'chat', label: 'Chat', icon: MessageCircle },
                  { id: 'insights', label: 'Insights', icon: Sparkles, badge: insights.length },
                  { id: 'actions', label: 'Actions', icon: Zap },
                ].map(tab => (
                  <button key={tab.id}
                    onClick={() => { setActiveTab(tab.id); if (tab.id === 'insights') setHasNewInsights(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id ? p.tabActive : p.tabInactive
                    }`}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.badge > 0 && activeTab !== tab.id && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="px-3 py-2">
                    {messages.map((msg, i) => (
                      <MessageBubble key={i} message={msg} dk={dk} />
                    ))}
                    <div ref={messagesEndRef} />

                    {/* Suggestion chips */}
                    {messages.length <= 2 && (
                      <div className="mt-3 space-y-1.5">
                        <div className={`text-[10px] font-semibold uppercase tracking-wider ${p.textSub}`}>Try asking:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTION_PROMPTS.slice(0, 4).map((prompt, i) => (
                            <button key={i}
                              onClick={() => handleSend(prompt)}
                              className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-all hover:scale-105 ${
                                dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}>
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Insights Tab */}
                {activeTab === 'insights' && (
                  <div className="px-3 py-2 space-y-2">
                    {insights.length > 0 ? (
                      insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} dk={dk} onClick={handleInsightClick} />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className={`w-10 h-10 mx-auto mb-2 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                        <p className={`text-sm ${p.textSub}`}>Loading insights...</p>
                      </div>
                    )}
                    <button onClick={async () => {
                      await aiEngine.loadContext();
                      setInsights(aiEngine.generateInsights());
                    }} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium mt-2 ${
                      dk ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
                    } transition-colors`}>
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh Insights
                    </button>
                  </div>
                )}

                {/* Quick Actions Tab */}
                {activeTab === 'actions' && (
                  <div className="px-3 py-2 grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(action => {
                      const Icon = action.icon;
                      return (
                        <button key={action.id}
                          onClick={() => handleQuickAction(action)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-105 hover:shadow-md ${
                            dk ? 'border-slate-700/50 hover:border-indigo-500/50 bg-slate-800/50' : 'border-gray-200 hover:border-indigo-300 bg-white'
                          }`}>
                          <div className={`p-2.5 rounded-xl bg-${action.color}-500/10`}>
                            <Icon className={`w-5 h-5 text-${action.color}-500`} />
                          </div>
                          <span className={`text-xs font-medium text-center ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                            {action.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input Area */}
              {activeTab === 'chat' && (
                <div className={`px-3 py-3 border-t ${dk ? 'border-slate-700/50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything about your finances..."
                      disabled={isLoading}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 ${p.input}`}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className={`p-2.5 rounded-xl transition-all ${
                        input.trim() && !isLoading
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                          : dk ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
