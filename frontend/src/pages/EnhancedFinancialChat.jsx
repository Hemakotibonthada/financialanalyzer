// ============================================================================
// AI Financial Chat — Enterprise Conversational AI Interface
// ============================================================================
// Interactive chat interface powered by local NLP engine.
// Features: auto-suggestions, message formatting, data visualization inline.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useAIChat } from '../services/aiService';
import { FadeIn, PageTransition, GlassCard } from '../components/ui/AnimatedComponents';
import { SectionHeader, EmptyState, StatusIndicator } from '../components/ui/EnterpriseComponents';
import { ChartCard, FinancialBarChart, FinancialDonutChart } from '../components/charts/EnterpriseCharts';
import {
  Send, Bot, User, Sparkles, RefreshCw, 
  MessageSquare, Lightbulb, Trash2, Copy, Check,
  TrendingUp, DollarSign, Shield, PieChart,
  ChevronRight, Zap, Clock,
} from 'lucide-react';

// ============================================================================
// CHAT MESSAGE COMPONENT
// ============================================================================

function ChatMessage({ message, isLast }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.error;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse data for inline visualization
  const hasData = message.data && !isUser;
  const chartData = useMemo(() => {
    if (!hasData || !message.data) return null;
    // Attempt to create chart-friendly data from response
    if (Array.isArray(message.data)) {
      return message.data.slice(0, 10).map((item, i) => ({
        name: item.name || item.category || item.label || item.merchant || `Item ${i + 1}`,
        value: item.value || item.amount || item.total || item.count || 0,
      }));
    }
    if (message.data.breakdown || message.data.categories) {
      const src = message.data.breakdown || message.data.categories;
      if (typeof src === 'object' && !Array.isArray(src)) {
        return Object.entries(src).map(([name, value]) => ({
          name,
          value: typeof value === 'number' ? value : value?.total || 0,
        }));
      }
    }
    return null;
  }, [hasData, message.data]);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} ${isLast ? 'animate-slide-up' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
        isUser
          ? 'bg-blue-600 text-white'
          : isError
            ? 'bg-red-100 dark:bg-red-900/20'
            : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-md'
            : isError
              ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-tl-md'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 rounded-tl-md shadow-sm'
        }`}>
          {/* Message content with basic markdown support */}
          <div className="whitespace-pre-wrap">
            {message.content.split('\n').map((line, i) => {
              // Bold
              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return (
                <p key={i} className={i > 0 ? 'mt-1' : ''} dangerouslySetInnerHTML={{ __html: formatted }} />
              );
            })}
          </div>

          {/* Intent badge */}
          {message.intent && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-medium rounded-full">
                <Zap className="w-3 h-3" />
                {message.intent}
              </span>
            </div>
          )}
        </div>

        {/* Inline chart from data */}
        {chartData && chartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 p-3">
            <FinancialBarChart
              data={chartData}
              bars={[{ key: 'value', name: 'Amount', color: '#8b5cf6' }]}
              xKey="name"
              height={180}
              barRadius={4}
            />
          </div>
        )}

        {/* Actions row */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs text-gray-400">
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUGGESTION CHIP
// ============================================================================

function SuggestionChip({ text, onClick, icon }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-sm whitespace-nowrap"
    >
      {icon || <Sparkles className="w-3.5 h-3.5 text-violet-500" />}
      {text}
    </button>
  );
}

// ============================================================================
// MAIN CHAT PAGE
// ============================================================================

const EnhancedFinancialChatPage = () => {
  const { messages, loading, sendMessage, clearChat, suggestedQueries } = useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Category-based suggestion icons
  const suggestionIcons = {
    spend: <DollarSign className="w-3.5 h-3.5 text-red-500" />,
    income: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
    health: <Shield className="w-3.5 h-3.5 text-blue-500" />,
    budget: <PieChart className="w-3.5 h-3.5 text-amber-500" />,
    default: <Sparkles className="w-3.5 h-3.5 text-violet-500" />,
  };

  const getIcon = (query) => {
    const q = query.toLowerCase();
    if (q.includes('spend') || q.includes('expense')) return suggestionIcons.spend;
    if (q.includes('income') || q.includes('earn')) return suggestionIcons.income;
    if (q.includes('health') || q.includes('score')) return suggestionIcons.health;
    if (q.includes('budget') || q.includes('save')) return suggestionIcons.budget;
    return suggestionIcons.default;
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6 py-6">

          {/* ═══════ HEADER ═══════ */}
          <FadeIn>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/25">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Financial Assistant</h1>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status="success" size="sm" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Local NLP Engine • Always Available</span>
                  </div>
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </FadeIn>

          {/* ═══════ MESSAGES AREA ═══════ */}
          <div className="flex-1 overflow-y-auto rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-4 rounded-2xl shadow-xl shadow-violet-500/25 mb-6">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Ask me anything about your finances
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
                  I can analyze your spending patterns, forecast expenses, detect anomalies, 
                  check your financial health, and provide personalized recommendations.
                </p>

                {/* Suggestion cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestedQueries.slice(0, 6).map((query, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(query)}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
                    >
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        {getIcon(query)}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-tight">{query}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ═══════ QUICK SUGGESTIONS (after messages exist) ═══════ */}
          {messages.length > 0 && messages.length < 10 && (
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
              {suggestedQueries.slice(0, 4).map((query, i) => (
                <SuggestionChip
                  key={i}
                  text={query}
                  onClick={handleSuggestionClick}
                  icon={getIcon(query)}
                />
              ))}
            </div>
          )}

          {/* ═══════ INPUT AREA ═══════ */}
          <div className="mt-3">
            <div className="flex gap-3 items-end bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-400 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none px-2 py-2 max-h-24 overflow-y-auto"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Powered by local NLP engine • Your data never leaves your device
            </p>
          </div>

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedFinancialChatPage;
