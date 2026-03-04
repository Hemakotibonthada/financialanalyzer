/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AI Insights — Enterprise Theme-Synced AI-Powered Financial Intelligence
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  Lightbulb, TrendingUp, AlertTriangle, CheckCircle,
  DollarSign, Calendar, Repeat, Target,
  RefreshCw, ChevronRight, Zap, Shield,
  PiggyBank, CreditCard, TrendingDown, ArrowUpRight,
  ArrowDownRight, BarChart3, Brain, Sparkles,
  Activity, Eye, Clock, Info
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import {
  PageShell, SectionCard, StatTile, StatusPill,
  PageLoader, EmptyPlaceholder, ThemeButton, ProgressBar,
  FilterBar, FilterSelect, ThemeGradientText, IconBadge
} from '../components/ui/ThemePageComponents';

// ─── Theme-aware palette helper ─────────────────────────────────────────
const usePalette = () => {
  const { mode, accent } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';

  return useMemo(() => ({
    isDark,
    isBlack,
    // Surface
    card: isBlack ? 'bg-zinc-900/80 border-zinc-800' : isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white/80 border-gray-200/60',
    cardSolid: isBlack ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    cardHover: isBlack ? 'hover:bg-zinc-800/90' : isDark ? 'hover:bg-slate-700/80' : 'hover:bg-gray-50',
    glass: 'backdrop-blur-xl',
    // Text
    text: isBlack ? 'text-zinc-100' : isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isBlack ? 'text-zinc-400' : isDark ? 'text-slate-400' : 'text-gray-600',
    textMuted: isBlack ? 'text-zinc-500' : isDark ? 'text-slate-500' : 'text-gray-500',
    // Accent
    accent,
    // Borders
    borderLight: isBlack ? 'border-zinc-800/50' : isDark ? 'border-slate-700/50' : 'border-gray-100',
  }), [mode, accent, isDark, isBlack]);
};

// ─── Priority & Category Helpers ────────────────────────────────────────
const getPriorityConfig = (priority, p) => {
  const configs = {
    high: {
      border: 'border-l-red-500',
      bg: p.isDark ? 'bg-red-500/10' : 'bg-red-50',
      badge: 'error',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    },
    medium: {
      border: 'border-l-amber-500',
      bg: p.isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      badge: 'warning',
      icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
    },
    low: {
      border: 'border-l-blue-500',
      bg: p.isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      badge: 'info',
      icon: <CheckCircle className="w-5 h-5 text-blue-500" />,
    },
  };
  return configs[priority] || configs.low;
};

const getCategoryIcon = (category) => {
  const icons = {
    savings: <PiggyBank className="w-4 h-4" />,
    expenses: <TrendingDown className="w-4 h-4" />,
    debt: <CreditCard className="w-4 h-4" />,
    investment: <TrendingUp className="w-4 h-4" />,
    security: <Shield className="w-4 h-4" />,
    subscriptions: <Repeat className="w-4 h-4" />,
  };
  return icons[category] || <Target className="w-4 h-4" />;
};

// ─── Recommendation Card ────────────────────────────────────────────────
const RecommendationCard = ({ rec, index, p }) => {
  const [expanded, setExpanded] = useState(false);
  const config = getPriorityConfig(rec.priority, p);

  return (
    <div
      className={`
        border-l-4 ${config.border} ${config.bg} rounded-2xl p-5 sm:p-6
        transition-all duration-300 hover:shadow-lg ${p.glass}
        transform hover:-translate-y-0.5 cursor-pointer
        animate-fade-in-up
      `}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className={`text-lg font-bold ${p.text} truncate`}>
              {rec.icon} {rec.title}
            </h3>
            <StatusPill status={config.badge === 'error' ? 'error' : config.badge === 'warning' ? 'warning' : 'info'}>
              {rec.priority?.toUpperCase()}
            </StatusPill>
            <span className={`flex items-center gap-1 text-xs ${p.textMuted}`}>
              {getCategoryIcon(rec.category)}
              {rec.category}
            </span>
          </div>

          {/* Description */}
          <p className={`${p.textSub} text-sm leading-relaxed mb-3`}>{rec.description}</p>

          {/* Action Items — expandable */}
          {rec.actionItems && rec.actionItems.length > 0 && expanded && (
            <div className={`${p.cardSolid} rounded-xl p-4 mb-3 border ${p.borderLight} transition-all duration-300`}>
              <h4 className={`font-semibold ${p.text} mb-2 flex items-center gap-2 text-sm`}>
                <Target className="w-4 h-4" /> Action Steps
              </h4>
              <ul className="space-y-2">
                {rec.actionItems.map((item, idx) => (
                  <li key={idx} className={`flex items-start gap-2 text-sm ${p.textSub}`}>
                    <ChevronRight className={`w-4 h-4 text-${p.accent}-500 mt-0.5 flex-shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Savings / Gains */}
          <div className="flex flex-wrap gap-4">
            {rec.potentialSavings > 0 && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                <ArrowDownRight className="w-4 h-4" />
                Save ₹{rec.potentialSavings.toLocaleString()}
              </div>
            )}
            {rec.potentialGains > 0 && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold">
                <ArrowUpRight className="w-4 h-4" />
                Earn ₹{rec.potentialGains.toLocaleString()}/yr
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {rec.targetAmount > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={p.textMuted}>Progress</span>
                <span className={`font-semibold ${p.text}`}>
                  ₹{rec.currentAmount?.toLocaleString() || 0} / ₹{rec.targetAmount.toLocaleString()}
                </span>
              </div>
              <ProgressBar
                value={Math.min(((rec.currentAmount || 0) / rec.targetAmount) * 100, 100)}
              />
            </div>
          )}

          {/* Expand hint */}
          {rec.actionItems && rec.actionItems.length > 0 && !expanded && (
            <button className={`mt-2 text-xs ${p.textMuted} flex items-center gap-1 hover:underline`}>
              <Eye className="w-3 h-3" /> View {rec.actionItems.length} action steps
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Recurring Transaction Card ─────────────────────────────────────────
const RecurringCard = ({ tx, index, p }) => (
  <div
    className={`
      ${p.card} border rounded-2xl p-5 ${p.glass}
      transition-all duration-300 hover:shadow-lg ${p.cardHover}
      transform hover:-translate-y-1
      animate-fade-in-up
    `}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <IconBadge icon={Calendar} color="purple" size="sm" />
        <h3 className={`font-bold ${p.text} capitalize truncate`}>{tx.merchant}</h3>
      </div>
      {tx.isSubscription && (
        <StatusPill status="info">Subscription</StatusPill>
      )}
    </div>

    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <span className={`text-xs ${p.textMuted}`}>Amount</span>
        <span className={`font-bold ${p.text}`}>₹{tx.averageAmount?.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs ${p.textMuted}`}>Frequency</span>
        <span className={`capitalize ${p.text} text-sm font-medium`}>{tx.frequency}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs ${p.textMuted}`}>Confidence</span>
        <div className="flex items-center gap-2">
          <ProgressBar value={tx.confidence} size="sm" className="w-16" />
          <span className={`text-xs font-semibold ${p.textSub}`}>{tx.confidence}%</span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs ${p.textMuted}`}>Occurrences</span>
        <span className={`${p.text} text-sm font-medium`}>{tx.occurrences}x</span>
      </div>

      <div className={`pt-2.5 border-t ${p.borderLight}`}>
        <div className={`text-xs ${p.textMuted} flex items-center gap-1`}>
          <Clock className="w-3 h-3" />
          Next: {new Date(tx.nextExpectedDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
          })}
        </div>
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════
const AIInsights = () => {
  const p = usePalette();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/insights?period=${period}`);
      setInsights(response.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout title="AI Insights">
        <PageShell>
          <PageLoader text="Analyzing your financial data with AI..." />
        </PageShell>
      </MainLayout>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <MainLayout title="AI Insights">
        <PageShell>
          <div className="max-w-4xl mx-auto pt-20">
            <EmptyPlaceholder
              icon={AlertTriangle}
              title="Error Loading Insights"
              message={error}
            />
            <div className="flex justify-center mt-6">
              <ThemeButton onClick={fetchInsights} icon={RefreshCw}>
                Try Again
              </ThemeButton>
            </div>
          </div>
        </PageShell>
      </MainLayout>
    );
  }

  if (!insights) return null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <MainLayout title="AI Insights">
      <PageShell>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-8">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <IconBadge icon={Brain} color={p.accent} size="lg" />
              <div>
                <ThemeGradientText as="h1" className="text-3xl sm:text-4xl font-extrabold">
                  AI Financial Insights
                </ThemeGradientText>
                <p className={`${p.textSub} text-sm mt-1`}>
                  Personalized intelligence powered by self-training models
                </p>
              </div>
            </div>

            <FilterBar>
              <FilterSelect
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: 'week', label: 'Last Week' },
                  { value: 'month', label: 'Last Month' },
                  { value: 'year', label: 'Last Year' },
                ]}
              />
              <ThemeButton onClick={fetchInsights} icon={RefreshCw} variant="secondary" size="sm">
                Refresh
              </ThemeButton>
            </FilterBar>
          </div>

          {/* ── Summary Stats ──────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatTile
              icon={DollarSign}
              label="Savings Rate"
              value={`${insights.savingsRate?.toFixed(1) || 0}%`}
              sub={`₹${(insights.savings || 0).toLocaleString()} saved`}
              trend={insights.savingsRate > 20 ? 'up' : insights.savingsRate > 10 ? 'flat' : 'down'}
              color="green"
            />
            <StatTile
              icon={TrendingDown}
              label="Total Expenses"
              value={`₹${((insights.totalExpenses || 0) / 1000).toFixed(1)}K`}
              sub={period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
              color="blue"
            />
            <StatTile
              icon={Repeat}
              label="Recurring Payments"
              value={insights.recurringTransactions?.length || 0}
              sub={`₹${(insights.recurringTransactions?.reduce((s, t) => s + (t.averageAmount || 0), 0) || 0).toLocaleString()}/mo`}
              color="purple"
            />
            <StatTile
              icon={Activity}
              label="EMI Burden"
              value={`${insights.emiSummary?.emiToIncomeRatio || 0}%`}
              sub={`₹${(insights.emiSummary?.totalMonthlyEMI || 0).toLocaleString()}/mo`}
              trend={insights.emiSummary?.emiToIncomeRatio > 40 ? 'down' : 'up'}
              color="orange"
            />
          </div>

          {/* ── AI Recommendations ─────────────────────────── */}
          <SectionCard
            icon={Sparkles}
            title="AI Recommendations"
            subtitle="Personalized insights to boost your financial health"
          >
            {insights.recommendations && insights.recommendations.length > 0 ? (
              <div className="space-y-4">
                {insights.recommendations.map((rec, index) => (
                  <RecommendationCard key={index} rec={rec} index={index} p={p} />
                ))}
              </div>
            ) : (
              <EmptyPlaceholder
                icon={CheckCircle}
                title="Excellent Financial Health!"
                message="Your finances are in great shape. Keep up the good work!"
              />
            )}
          </SectionCard>

          {/* ── Recurring Transactions ─────────────────────── */}
          {insights.recurringTransactions && insights.recurringTransactions.length > 0 && (
            <SectionCard
              icon={Repeat}
              title="Recurring Transactions Detected"
              subtitle="AI-detected patterns in your spending"
              actions={
                <div className={`flex items-center gap-2 text-sm ${p.textMuted}`}>
                  <Info className="w-4 h-4" />
                  {insights.recurringTransactions.length} patterns found
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {insights.recurringTransactions.map((tx, index) => (
                  <RecurringCard key={index} tx={tx} index={index} p={p} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </PageShell>
    </MainLayout>
  );
};

export default AIInsights;
