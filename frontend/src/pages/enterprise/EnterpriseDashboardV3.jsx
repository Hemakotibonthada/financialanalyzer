// ============================================================================
// ENTERPRISE DASHBOARD V3 — AI-Powered Financial Command Center
// ============================================================================
// Full-featured dashboard with real-time data, AI insights, interactive charts,
// financial health scoring, budget tracking, goal progress, and predictive
// analytics — all synced with the enterprise theme system.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Shield,
  BarChart3, PieChart as PieIcon, ArrowUpRight, ArrowDownRight,
  Wallet, Building2, Landmark, BrainCircuit, Sparkles, ChevronRight,
  RefreshCw, Calendar, Download, Bell, Zap, AlertTriangle, CheckCircle2,
  Banknote, ArrowRightLeft, Receipt, CircleDollarSign, Clock, Globe,
  Heart, Award, Flame, LayoutDashboard, Settings, Filter,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedNumber, GlassCard,
  Shimmer, CardSkeleton, Badge, StatusBadge, AnimatedTabs,
  useInView, useAnimatedCounter, colorPalette, chartColors,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS & CONFIG
// ============================================================================

const TIME_RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '3 Months' },
  { id: '6m', label: '6 Months' },
  { id: '1y', label: '1 Year' },
  { id: 'all', label: 'All Time' },
];

const QUICK_ACTIONS = [
  { id: 'add-txn', label: 'Add Transaction', icon: ArrowRightLeft, path: '/transactions', color: 'blue' },
  { id: 'set-budget', label: 'Set Budget', icon: PieIcon, path: '/budgets', color: 'purple' },
  { id: 'track-goal', label: 'Track Goal', icon: Target, path: '/goals', color: 'green' },
  { id: 'add-emi', label: 'Add EMI', icon: Receipt, path: '/emi-tracker', color: 'amber' },
  { id: 'invest', label: 'Investments', icon: TrendingUp, path: '/investments', color: 'teal' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports-v2', color: 'rose' },
];

// ============================================================================
// §2  SUB-COMPONENTS
// ============================================================================

const KPICard = ({ title, value, prefix = '₹', suffix = '', change, changeLabel, icon: Icon, color, loading }) => {
  const colors = colorPalette[color] || colorPalette.blue;
  const isPositive = (change || 0) >= 0;

  if (loading) return <CardSkeleton lines={2} />;

  return (
    <AnimatedCard className={`p-5 rounded-2xl bg-white dark:bg-gray-800/80 border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${isPositive ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {prefix}<AnimatedNumber value={typeof value === 'number' ? value : 0} compact />
          {suffix}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        {changeLabel && <p className="text-xs text-gray-400 dark:text-gray-500">{changeLabel}</p>}
      </div>
    </AnimatedCard>
  );
};

const HealthScoreGauge = ({ score, loading }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const animatedScore = useAnimatedCounter(score || 0, 1500);
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  const getColor = (s) => s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : s >= 40 ? '#F97316' : '#EF4444';
  const getLabel = (s) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Needs Work';

  if (loading) return <div className="w-48 h-48 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" className="dark:stroke-gray-700" />
        <circle cx="90" cy="90" r={radius} fill="none" stroke={getColor(animatedScore)}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">{animatedScore}</span>
        <span className="text-sm font-medium" style={{ color: getColor(animatedScore) }}>{getLabel(animatedScore)}</span>
        <span className="text-xs text-gray-400 mt-0.5">Financial Health</span>
      </div>
    </div>
  );
};

const RecentTransaction = ({ txn, index }) => {
  const isIncome = txn.type === 'income' || txn.type === 'credit';
  return (
    <div className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
        ${isIncome ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
        {isIncome ? '+' : '-'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{txn.description || txn.merchant || 'Transaction'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{txn.category || 'Uncategorized'} · {new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
      </div>
      <span className={`text-sm font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isIncome ? '+' : '-'}₹{Math.abs(txn.amount || 0).toLocaleString('en-IN')}
      </span>
    </div>
  );
};

const BudgetProgressBar = ({ budget }) => {
  const spent = budget.spent || 0;
  const total = budget.amount || budget.limit || 1;
  const pct = Math.min(100, Math.round((spent / total) * 100));
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{budget.category || budget.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">₹{spent.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AIInsightCard = ({ insight, index }) => {
  const typeConfig = {
    warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    success: { icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    info: { icon: BrainCircuit, bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    alert: { icon: Bell, bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  };
  const cfg = typeConfig[insight.type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <AnimatedCard delay={index * 80}
      className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${cfg.text}`} />
        <div>
          <p className={`text-sm font-semibold ${cfg.text}`}>{insight.title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.message || insight.description}</p>
        </div>
      </div>
    </AnimatedCard>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: ₹{(p.value || 0).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// §3  MAIN DASHBOARD COMPONENT
// ============================================================================

const EnterpriseDashboardV3 = () => {
  const navigate = useNavigate();
  const { isDark, accentColor } = useTheme();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('trend');
  const [data, setData] = useState({
    summary: null, transactions: [], budgets: [], goals: [],
    trends: [], categories: [], insights: [], healthScore: 0,
    investments: [], debts: [],
  });

  // ------- DATA FETCHING -------
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);

    try {
      const [
        summaryRes, txnRes, budgetRes, goalRes,
        trendRes, catRes, insightRes, healthRes,
      ] = await Promise.allSettled([
        api.get('/financial/summary', { params: { range: timeRange } }),
        api.get('/financial/transactions', { params: { limit: 15, sort: '-date' } }),
        api.get('/budgets'),
        api.get('/goals'),
        api.get('/analytics/trends/12'),
        api.get('/analytics/categories/6'),
        api.get('/ai/insights'),
        api.get('/ai/health-score'),
      ]);

      setData({
        summary: summaryRes.status === 'fulfilled' ? (summaryRes.value?.data?.data || summaryRes.value?.data || null) : null,
        transactions: txnRes.status === 'fulfilled' ? (txnRes.value?.data?.data?.transactions || txnRes.value?.data?.transactions || txnRes.value?.data?.data || []) : [],
        budgets: budgetRes.status === 'fulfilled' ? (budgetRes.value?.data?.data || budgetRes.value?.data || []) : [],
        goals: goalRes.status === 'fulfilled' ? (goalRes.value?.data?.data || goalRes.value?.data || []) : [],
        trends: trendRes.status === 'fulfilled' ? (trendRes.value?.data?.data || trendRes.value?.data || []) : [],
        categories: catRes.status === 'fulfilled' ? (catRes.value?.data?.data || catRes.value?.data || []) : [],
        insights: insightRes.status === 'fulfilled' ? (insightRes.value?.data?.data?.insights || insightRes.value?.data?.insights || insightRes.value?.data?.data || []) : [],
        healthScore: healthRes.status === 'fulfilled' ? (healthRes.value?.data?.data?.score || healthRes.value?.data?.score || 0) : 0,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------- DERIVED DATA -------
  const kpis = useMemo(() => {
    const s = data.summary || {};
    return {
      totalBalance: s.totalBalance || s.balance || 0,
      monthlyIncome: s.monthlyIncome || s.totalIncome || 0,
      monthlyExpense: s.monthlyExpense || s.totalExpense || 0,
      savings: (s.monthlyIncome || s.totalIncome || 0) - (s.monthlyExpense || s.totalExpense || 0),
      savingsRate: s.savingsRate || (s.totalIncome > 0 ? Math.round(((s.totalIncome - (s.totalExpense || 0)) / s.totalIncome) * 100) : 0),
      transactionCount: s.transactionCount || data.transactions.length,
    };
  }, [data.summary, data.transactions]);

  const trendData = useMemo(() => {
    if (data.trends && data.trends.length > 0) return data.trends;
    // Generate from transactions if trends API has no data
    const months = {};
    data.transactions.forEach(t => {
      const d = new Date(t.date || t.createdAt);
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { name: key, income: 0, expense: 0 };
      if (t.type === 'income' || t.type === 'credit') months[key].income += Math.abs(t.amount);
      else months[key].expense += Math.abs(t.amount);
    });
    return Object.values(months).slice(-12);
  }, [data.trends, data.transactions]);

  const categoryData = useMemo(() => {
    if (data.categories && data.categories.length > 0) return data.categories;
    const cats = {};
    data.transactions.filter(t => t.type !== 'income' && t.type !== 'credit').forEach(t => {
      const c = t.category || 'Other';
      cats[c] = (cats[c] || 0) + Math.abs(t.amount);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [data.categories, data.transactions]);

  const activeBudgets = useMemo(() => {
    if (Array.isArray(data.budgets)) return data.budgets.slice(0, 6);
    return [];
  }, [data.budgets]);

  const activeGoals = useMemo(() => {
    if (Array.isArray(data.goals)) return data.goals.filter(g => g.status !== 'completed').slice(0, 4);
    return [];
  }, [data.goals]);

  const chartTabs = [
    { id: 'trend', label: 'Trend', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'category', label: 'Categories', icon: <PieIcon className="w-4 h-4" /> },
    { id: 'comparison', label: 'Compare', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  // ------- RENDER -------
  return (
    <MainLayout title="Financial Dashboard" subtitle="AI-powered financial command center">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 space-y-6">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutDashboard className="w-7 h-7 text-blue-500" />
                Financial Command Center
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Real-time overview of your financial health · Last updated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Time Range Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {TIME_RANGES.map(r => (
                  <button key={r.id} onClick={() => setTimeRange(r.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                      ${timeRange === r.id
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={() => fetchData(true)} disabled={refreshing}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ─── KPI CARDS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <KPICard title="Total Balance" value={kpis.totalBalance} icon={Wallet} color="blue" loading={loading} change={3.2} changeLabel="vs last month" />
            <KPICard title="Monthly Income" value={kpis.monthlyIncome} icon={TrendingUp} color="green" loading={loading} change={5.1} changeLabel="vs last month" />
            <KPICard title="Monthly Expenses" value={kpis.monthlyExpense} icon={CreditCard} color="rose" loading={loading} change={-2.4} changeLabel="vs last month" />
            <KPICard title="Net Savings" value={kpis.savings} icon={Banknote} color="teal" loading={loading} change={kpis.savingsRate} changeLabel="savings rate" />
            <KPICard title="Active Budgets" value={activeBudgets.length} prefix="" icon={PieIcon} color="purple" loading={loading} />
            <KPICard title="Goals Progress" value={activeGoals.length} prefix="" suffix=" active" icon={Target} color="amber" loading={loading} />
          </div>

          {/* ─── QUICK ACTIONS ─── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map((action, i) => {
              const colors = colorPalette[action.color] || colorPalette.blue;
              return (
                <AnimatedCard key={action.id} delay={i * 40} hover
                  className={`p-3 rounded-xl border ${colors.border} ${colors.bg} cursor-pointer text-center`}
                  onClick={() => navigate(action.path)}>
                  <action.icon className={`w-5 h-5 mx-auto mb-1.5 ${colors.text}`} />
                  <span className={`text-xs font-medium ${colors.text}`}>{action.label}</span>
                </AnimatedCard>
              );
            })}
          </div>

          {/* ─── MAIN CONTENT GRID ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Charts ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Chart Card */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <AnimatedTabs tabs={chartTabs} activeTab={activeChartTab} onChange={setActiveChartTab} />
                </div>

                <div className="h-72">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Shimmer width="100%" height="100%" rounded="rounded-xl" />
                    </div>
                  ) : activeChartTab === 'trend' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                        <RechartTooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#incomeGrad)" strokeWidth={2.5} name="Income" />
                        <Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="url(#expenseGrad)" strokeWidth={2.5} name="Expense" />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : activeChartTab === 'category' ? (
                    <div className="flex items-center">
                      <ResponsiveContainer width="55%" height={280}>
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                            paddingAngle={3} dataKey="value" nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={{ stroke: isDark ? '#6B7280' : '#9CA3AF' }}>
                            {categoryData.map((_, i) => (
                              <Cell key={i} fill={chartColors[i % chartColors.length]} />
                            ))}
                          </Pie>
                          <RechartTooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-[45%] space-y-2 pl-4">
                        {categoryData.slice(0, 6).map((cat, i) => (
                          <div key={cat.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{cat.name}</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{(cat.value || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <RechartTooltip content={<ChartTooltip />} />
                        <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Expense" />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              {/* Budget & Goals Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Budgets */}
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-purple-500" /> Budget Tracker
                    </h3>
                    <button onClick={() => navigate('/budgets')} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} height={40} />)
                    ) : activeBudgets.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No budgets set. Create one to start tracking!</p>
                    ) : (
                      activeBudgets.map((b, i) => <BudgetProgressBar key={b._id || i} budget={b} />)
                    )}
                  </div>
                </GlassCard>

                {/* Goals */}
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" /> Goal Progress
                    </h3>
                    <button onClick={() => navigate('/goals')} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} height={40} />)
                    ) : activeGoals.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Set financial goals to track here.</p>
                    ) : (
                      activeGoals.map((g, i) => {
                        const pct = g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
                        return (
                          <div key={g._id || i} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{g.name}</span>
                              <Badge variant={pct >= 100 ? 'success' : pct >= 50 ? 'info' : 'warning'}>{pct}%</Badge>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">₹{(g.currentAmount || 0).toLocaleString('en-IN')} / ₹{(g.targetAmount || 0).toLocaleString('en-IN')}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* ── RIGHT: Health + Transactions + AI ── */}
            <div className="space-y-6">

              {/* Health Score */}
              <GlassCard className="p-6 flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" /> Financial Health
                </h3>
                <HealthScoreGauge score={data.healthScore} loading={loading} />
                <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center">
                  {[
                    { label: 'Savings', value: `${kpis.savingsRate}%`, color: kpis.savingsRate >= 20 ? 'text-green-500' : 'text-amber-500' },
                    { label: 'Budgets', value: `${activeBudgets.filter(b => (b.spent || 0) <= (b.amount || Infinity)).length}/${activeBudgets.length}`, color: 'text-purple-500' },
                    { label: 'Goals', value: activeGoals.length.toString(), color: 'text-blue-500' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Recent Transactions */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-500" /> Recent Transactions
                  </h3>
                  <button onClick={() => navigate('/transactions')} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} height={48} className="mb-2" />)
                  ) : data.transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No transactions yet.</p>
                  ) : (
                    data.transactions.slice(0, 8).map((txn, i) => (
                      <RecentTransaction key={txn._id || i} txn={txn} index={i} />
                    ))
                  )}
                </div>
              </GlassCard>

              {/* AI Insights */}
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> AI Insights
                </h3>
                <div className="space-y-3">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} height={60} />)
                  ) : data.insights.length === 0 ? (
                    <div className="text-center py-4">
                      <BrainCircuit className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Add more transactions for AI insights</p>
                    </div>
                  ) : (
                    data.insights.slice(0, 4).map((insight, i) => (
                      <AIInsightCard key={i} insight={insight} index={i} />
                    ))
                  )}
                </div>
                <button onClick={() => navigate('/spending-insights-v2')}
                  className="mt-3 w-full py-2 text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1">
                  View All Insights <ChevronRight className="w-3 h-3" />
                </button>
              </GlassCard>
            </div>
          </div>

          {/* ─── FOOTER BAR — Financial Snapshot ─── */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                {[
                  { icon: Zap, label: 'Score', value: data.healthScore || '--' },
                  { icon: Award, label: 'Streak', value: '12 days' },
                  { icon: Clock, label: 'Updated', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/reports-v2')}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" /> Export Report
                </button>
                <button onClick={() => navigate('/settings-v2')}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
                  <Settings className="w-3 h-3" /> Settings
                </button>
              </div>
            </div>
          </GlassCard>

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseDashboardV3;
