import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Mic, MicOff, Plus, X, Download, Trash2,
  Sparkles, TrendingUp, Wallet, PiggyBank, Receipt, CreditCard,
  ChevronRight, RefreshCw, Bot, User, Copy, Check, HelpCircle,
  BarChart3, Lightbulb, History, Settings, Volume2, Clock, Star,
  ArrowDown, ThumbsUp, ThumbsDown, Bookmark
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const SUGGESTIONS = [
  { text: 'What\'s my spending this month?', icon: Receipt },
  { text: 'How much have I saved?', icon: PiggyBank },
  { text: 'Show my budget status', icon: Wallet },
  { text: 'Credit card dues?', icon: CreditCard },
  { text: 'Investment summary', icon: TrendingUp },
  { text: 'Upcoming bills', icon: Clock },
];

const QUICK_ACTIONS = [
  { label: 'Add Expense', icon: Plus, color: 'red' },
  { label: 'Check Balance', icon: Wallet, color: 'blue' },
  { label: 'View Goals', icon: Star, color: 'yellow' },
  { label: 'Budget Report', icon: BarChart3, color: 'green' },
];

const FINANCIAL_TIPS = [
  { title: '50-30-20 Rule', desc: 'Divide income: 50% needs, 30% wants, 20% savings.' },
  { title: 'Emergency Fund', desc: 'Keep 3-6 months of expenses as an emergency fund.' },
  { title: 'Automate Savings', desc: 'Set up auto-transfers on payday for consistent savings.' },
  { title: 'Review Subscriptions', desc: 'Regularly cancel unused subscriptions to save money.' },
  { title: 'Track Daily Spend', desc: 'Awareness of daily spending helps stay within budget.' },
  { title: 'Invest Early', desc: 'Start investing early to leverage compound growth.' },
];

// Chat data is fetched from backend API - no hardcoded mock data

const ChatMessage = ({ message, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-md'}`}>
          <p className="text-sm whitespace-pre-line">{message.text}</p>
        </div>
        {/* Chart in response - renders dynamic data from backend */}
        {message.chart && message.chart.type === 'pie' && Array.isArray(message.chart.data) && (
          <div className="mt-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={message.chart.data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {message.chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {message.chart && message.chart.type === 'line' && Array.isArray(message.chart.data) && (
          <div className="mt-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={message.chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                <XAxis dataKey={message.chart.xKey || 'month'} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                <Line type="monotone" dataKey={message.chart.yKey || 'amount'} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {message.chart && message.chart.type === 'bar' && Array.isArray(message.chart.data) && (
          <div className="mt-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={message.chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b20" />
                <XAxis dataKey={message.chart.xKey || 'name'} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, color: '#fff' }} />
                <Bar dataKey={message.chart.yKey || 'value'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Actions */}
        {message.role === 'assistant' && (
          <div className="flex items-center gap-2 mt-1.5 ml-1">
            <button onClick={handleCopy} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setFeedback('up')} className={`p-1 transition-colors ${feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setFeedback('down')} className={`p-1 transition-colors ${feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-1 ml-1">{message.time}</p>
      </div>
      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  );
};

export default function FinancialChat() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: 'Hello! 👋 I\'m your AI Financial Assistant. I can help you track spending, manage budgets, check savings goals, and more. What would you like to know?', time: '10:00 AM', chart: null },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), chart: null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/chat/message', { message: text.trim() });
      const data = res.data;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.reply || data.message || 'I could not generate a response. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chart: data.chartData || null,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'Sorry, I\'m having trouble connecting to the AI service. Please check that the backend is running and try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chart: null,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInput('What\'s my spending this month?');
      }, 2000);
    }
  };

  const exportChat = () => {
    const exportText = messages.map(m => `[${m.time}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const clearChat = () => {
    setMessages([{ id: Date.now(), role: 'assistant', text: 'Chat cleared. How can I help you today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), chart: null }]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Starting AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="AI Chat">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">AI Financial Assistant</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-green-600 dark:text-green-400">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors md:hidden">
              <Lightbulb className="w-5 h-5" />
            </button>
            <button onClick={() => setShowExport(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={clearChat} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 md:px-6 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button key={i} onClick={() => sendMessage(action.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Icon className={`w-3.5 h-3.5 text-${action.color}-500`} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 md:px-6 pb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button key={i} onClick={() => sendMessage(s.text)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about your finances..."
                  rows={1}
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={toggleRecording}
                  className={`absolute right-3 bottom-2.5 p-1.5 rounded-lg transition-colors ${isRecording ? 'bg-red-100 dark:bg-red-900/40 text-red-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
                className={`p-3 rounded-2xl transition-colors ${input.trim() && !isTyping ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                <Send className="w-5 h-5" />
              </button>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening... Speak your question
              </div>
            )}
          </div>
        </div>

        {/* Tips Sidebar */}
        {showSidebar && (
          <div className="hidden md:block w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-yellow-500" /> Financial Tips
              </h3>
              <div className="space-y-3">
                {FINANCIAL_TIPS.map((tip, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                    onClick={() => sendMessage(`Tell me about ${tip.title}`)}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{tip.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tip.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mt-6 mb-3">
                <History className="w-4 h-4 text-blue-500" /> Recent Queries
              </h3>
              <div className="space-y-2">
                {messages.filter(m => m.role === 'user').slice(-5).reverse().map(m => (
                  <button key={m.id} onClick={() => sendMessage(m.text)}
                    className="w-full text-left p-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate">
                    {m.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Export Conversation</h3>
              <button onClick={() => setShowExport(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{messages.length} messages will be exported as a text file.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExport(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={exportChat} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
