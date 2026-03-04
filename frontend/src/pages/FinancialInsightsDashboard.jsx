// ============================================================================
// FinancialInsightsDashboard.jsx — Deep financial analytics dashboard
// ============================================================================
// Comprehensive insights: monthly trends, financial ratios, spending velocity,
// category analysis, merchant breakdown, and actionable recommendations.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import MainLayout from '../components/MainLayout';
import {
  TrendingUp, TrendingDown, Activity, DollarSign, BarChart3,
  Target, AlertTriangle, CheckCircle2, Info, Shield, Zap,
  ArrowUpRight, ArrowDownRight, Minus, PieChart, Clock,
  Gauge, Store, CalendarDays, Wallet, LineChart as LineChartIcon,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { PageTransition, FadeIn, StaggerChildren, AnimatedCounter, AnimatedProgress, CardSkeleton } from '../components/ui/AnimatedComponents';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16'];

// ─── Rating Badge ───────────────────────────────────────────────────
function RatingBadge({ rating }) {
  const config = {
    excellent: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Excellent' },
    good:      { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Good' },
    fair:      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Fair' },
    poor:      { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Needs Work' },
  };
  const c = config[rating] || config.fair;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
}

// ─── Stat Card ──────────────────────────────────────────────────────
function InsightStatCard({ icon: Icon, label, value, subtext, trend, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Insight Alert Card ─────────────────────────────────────────────
function InsightAlertCard({ insight }) {
  const config = {
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: AlertTriangle, iconColor: 'text-red-500' },
    warning:  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500' },
    info:     { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: Info, iconColor: 'text-blue-500' },
    success:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  };
  const c = config[insight.type] || config.info;
  const IconComp = c.icon;

  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-4 flex gap-3`}>
      <IconComp className={`w-5 h-5 ${c.iconColor} mt-0.5 flex-shrink-0`} />
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{insight.title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.message}</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function FinancialInsightsDashboard() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/financial-insights/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const trendChartData = useMemo(() => {
    if (!data?.trends?.trends) return [];
    return data.trends.trends.map(t => ({
      month: t.month,
      Income: Math.round(t.income),
      Expenses: Math.round(t.expenses),
      Savings: Math.round(t.savings),
      SavingsRate: parseFloat(t.savingsRate?.toFixed(1) || 0),
    }));
  }, [data]);

  const categoryPieData = useMemo(() => {
    if (!data?.categories?.categories) return [];
    return data.categories.categories.slice(0, 8).map(c => ({
      name: c.category,
      value: Math.round(c.totalSpent),
      percent: parseFloat(c.percentOfTotal?.toFixed(1) || 0),
    }));
  }, [data]);

  const velocityData = useMemo(() => {
    if (!data?.velocity?.dailyData) return [];
    return data.velocity.dailyData.map(d => ({
      date: d._id?.slice(5) || d.date,
      amount: Math.round(d.total),
    }));
  }, [data]);

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton className="h-72" />
            <CardSkeleton className="h-72" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">{error}</h3>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
              <RefreshCw className="w-4 h-4 inline mr-2" />Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const ratios = data?.ratios?.ratios || {};
  const ratings = data?.ratios?.ratings || {};
  const metrics = data?.ratios?.metrics || {};
  const velocity = data?.velocity || {};
  const insights = data?.insights || [];

  return (
    <MainLayout>
      <PageTransition>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-7 h-7 text-indigo-500" />
                Financial Insights
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deep analytics and actionable recommendations</p>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </FadeIn>

        {/* Key Metrics */}
        <FadeIn delay={100}>
          <StaggerChildren staggerDelay={80}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InsightStatCard icon={Wallet} label="Monthly Income" value={`₹${Math.round(metrics.monthlyIncome || 0).toLocaleString('en-IN')}`} color="emerald" />
              <InsightStatCard icon={DollarSign} label="Monthly Expenses" value={`₹${Math.round(metrics.monthlyExpenses || 0).toLocaleString('en-IN')}`} color="rose" />
              <InsightStatCard
                icon={Target}
                label="Savings Rate"
                value={`${(ratios.savingsRate || 0).toFixed(1)}%`}
                subtext={<RatingBadge rating={ratings.savingsRate} />}
                color="indigo"
              />
              <InsightStatCard
                icon={Shield}
                label="Net Worth"
                value={`₹${Math.round(ratios.netWorth || 0).toLocaleString('en-IN')}`}
                color="purple"
              />
            </div>
          </StaggerChildren>
        </FadeIn>

        {/* Actionable Insights */}
        {insights.length > 0 && (
          <FadeIn delay={200}>
            <SectionHeader icon={Zap} title="Actionable Insights" subtitle={`${insights.length} recommendations based on your data`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins, i) => <InsightAlertCard key={i} insight={ins} />)}
            </div>
          </FadeIn>
        )}

        {/* Monthly Trends Chart */}
        <FadeIn delay={300}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <SectionHeader icon={LineChartIcon} title="Monthly Trends" subtitle="Income vs Expenses over time" />
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} className="text-gray-500" />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Savings" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">No trend data available</div>
            )}
          </div>
        </FadeIn>

        {/* Mid Section: Category Pie + Financial Ratios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <FadeIn delay={350}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <SectionHeader icon={PieChart} title="Spending by Category" subtitle={`Top ${categoryPieData.length} categories`} />
              {categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">No category data</div>
              )}
            </div>
          </FadeIn>

          {/* Financial Ratios */}
          <FadeIn delay={400}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <SectionHeader icon={BarChart3} title="Financial Ratios" subtitle="Key financial health indicators" />
              <div className="space-y-4">
                {[
                  { label: 'Savings Rate', value: ratios.savingsRate, target: 30, suffix: '%', rating: ratings.savingsRate },
                  { label: 'Debt-to-Income', value: ratios.debtToIncome, target: 36, suffix: '%', rating: ratings.debtToIncome, inverse: true },
                  { label: 'Emergency Fund', value: ratios.emergencyFund, target: 6, suffix: ' months', rating: ratings.emergencyFund },
                  { label: 'Expense-to-Income', value: ratios.expenseToIncome, target: 70, suffix: '%', inverse: true },
                  { label: 'Investment Returns', value: ratios.investmentReturn, suffix: '%' },
                ].map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(r.value || 0).toFixed(1)}{r.suffix}
                        </span>
                        {r.rating && <RatingBadge rating={r.rating} />}
                      </div>
                    </div>
                    <AnimatedProgress
                      value={Math.min(100, r.target ? ((r.value || 0) / r.target * 100) : Math.abs(r.value || 0))}
                      className={`h-2 rounded-full ${r.rating === 'excellent' ? 'bg-emerald-500' : r.rating === 'good' ? 'bg-blue-500' : r.rating === 'fair' ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Spending Velocity */}
        <FadeIn delay={450}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={Activity} title="Spending Velocity" subtitle="Daily spending rate & projection" />
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Avg: <span className="font-semibold text-gray-900 dark:text-white">₹{(velocity.avgDaily || 0).toLocaleString('en-IN')}/day</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  velocity.trend === 'accelerating' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                  velocity.trend === 'decelerating' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {velocity.trend === 'accelerating' ? '↑ Accelerating' : velocity.trend === 'decelerating' ? '↓ Decelerating' : '→ Steady'}
                </span>
              </div>
            </div>
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">No velocity data</div>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                <p className="font-semibold text-gray-900 dark:text-white">₹{(velocity.totalSpent || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Projected Monthly</p>
                <p className="font-semibold text-gray-900 dark:text-white">₹{(velocity.projectedMonthly || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Highest Day</p>
                <p className="font-semibold text-gray-900 dark:text-white">₹{(velocity.highestDay?.total || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Days Remaining</p>
                <p className="font-semibold text-gray-900 dark:text-white">{velocity.daysRemaining || 0}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Top Merchants */}
        {data?.merchants?.merchants?.length > 0 && (
          <FadeIn delay={500}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <SectionHeader icon={Store} title="Top Merchants" subtitle={`${data.merchants.totalMerchants} merchants analyzed`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.merchants.merchants.slice(0, 9).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold`} style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.merchant}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.count} txns · {m.frequency}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{Math.round(m.totalSpent).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Category Trend Details */}
        {data?.categories?.categories?.length > 0 && (
          <FadeIn delay={550}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <SectionHeader icon={BarChart3} title="Category Trends" subtitle="Spending direction by category" />
              <div className="space-y-2">
                {data.categories.categories.slice(0, 10).map((cat, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === i ? null : i)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          cat.trend === 'increasing' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          cat.trend === 'decreasing' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {cat.trend === 'increasing' ? '↑ Rising' : cat.trend === 'decreasing' ? '↓ Falling' : cat.trend === 'stable' ? '→ Stable' : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{cat.percentOfTotal?.toFixed(1)}%</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{Math.round(cat.totalSpent).toLocaleString('en-IN')}</span>
                        {expandedCategory === i ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      </div>
                    </button>
                    {expandedCategory === i && cat.monthlyData && (
                      <div className="px-3 pb-3">
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={cat.monthlyData}>
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="amount" fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
    </MainLayout>
  );
}
