// ============================================================================
// ENTERPRISE ANALYTICS DASHBOARD — Advanced Data Analysis & Visualization
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedNumber, AnimatedTabs, GlassCard,
  Badge, Shimmer, EmptyState,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Treemap,
} from 'recharts';
import {
  BarChart3, TrendingUp, PieChart as PieIcon, Activity, Calendar,
  Filter, Download, Layers, Brain, RefreshCw, ArrowUpRight, ArrowDownRight,
  DollarSign, ChevronDown,
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: ₹{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
        </p>
      ))}
    </div>
  );
}

function KPICard({ label, value, change, icon: Icon, color, prefix = '₹' }) {
  const isPositive = change >= 0;
  return (
    <AnimatedCard className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {prefix}<AnimatedNumber value={value} />
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? <ArrowUpRight size={14} className="text-green-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
          <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
    </AnimatedCard>
  );
}

// ── Custom Treemap Content ──
function TreemapContent({ x, y, width, height, name, value, index }) {
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]}
        stroke="#fff" strokeWidth={2} rx={4} opacity={0.85} />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff"
        fontSize={Math.min(12, width / 8)} fontWeight="600">{name}</text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#ffffffcc"
        fontSize={Math.min(10, width / 10)}>₹{(value / 1000).toFixed(1)}K</text>
    </g>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function EnterpriseAnalytics() {
  const { mode: theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('6m');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [txRes] = await Promise.allSettled([
        api.get('/financial/transactions'),
      ]);
      setTransactions(txRes.status === 'fulfilled' ? (txRes.value?.data?.transactions || txRes.value?.data || []) : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter transactions by date range ──
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12, 'all': 999 };
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (months[dateRange] || 6), 1);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  }, [transactions, dateRange]);

  // ── Comprehensive analytics ──
  const analytics = useMemo(() => {
    const expenses = filteredTransactions.filter(t => (t.amount || 0) < 0);
    const income = filteredTransactions.filter(t => (t.amount || 0) > 0);
    const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const avgTransaction = expenses.length > 0 ? totalExpenses / expenses.length : 0;

    // Monthly trends
    const monthlyData = {};
    filteredTransactions.forEach(t => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, count: 0 };
      if ((t.amount || 0) > 0) monthlyData[month].income += Math.abs(t.amount);
      else { monthlyData[month].expenses += Math.abs(t.amount); monthlyData[month].count++; }
    });

    const trendData = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      income: Math.round(data.income),
      expenses: Math.round(data.expenses),
      savings: Math.round(data.income - data.expenses),
      transactions: data.count,
    }));

    // Category breakdown
    const categoryMap = {};
    expenses.forEach(t => {
      const cat = t.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0, transactions: [] };
      categoryMap[cat].total += Math.abs(t.amount);
      categoryMap[cat].count++;
      categoryMap[cat].transactions.push(t);
    });

    const categoryData = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, value: Math.round(data.total), count: data.count, avg: Math.round(data.total / data.count) }))
      .sort((a, b) => b.value - a.value);

    // Day of week analysis
    const dayOfWeekMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const dayData = {};
    expenses.forEach(t => {
      const day = new Date(t.date).getDay();
      if (!dayData[day]) dayData[day] = { total: 0, count: 0 };
      dayData[day].total += Math.abs(t.amount);
      dayData[day].count++;
    });
    const dayOfWeekData = Object.entries(dayData).map(([day, data]) => ({
      day: dayOfWeekMap[day], total: Math.round(data.total), count: data.count, avg: Math.round(data.total / data.count),
    }));

    // Hour of day analysis (if time data available)
    const hourData = {};
    expenses.forEach(t => {
      const hour = new Date(t.date).getHours();
      if (!hourData[hour]) hourData[hour] = { total: 0, count: 0 };
      hourData[hour].total += Math.abs(t.amount);
      hourData[hour].count++;
    });
    const hourlyData = Object.entries(hourData).map(([hour, data]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`, total: Math.round(data.total), count: data.count,
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    // Spending velocity (cumulative spending over time within current month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = expenses.filter(t => t.date?.startsWith(currentMonth))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    const velocityData = currentMonthExpenses.map(t => {
      cumulative += Math.abs(t.amount);
      return { date: new Date(t.date).getDate(), cumulative: Math.round(cumulative), category: t.category || 'Other' };
    });

    // Category comparison radar
    const topCategories = categoryData.slice(0, 6);
    const maxCatValue = Math.max(...topCategories.map(c => c.value), 1);
    const radarData = topCategories.map(c => ({
      category: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      current: Math.round((c.value / maxCatValue) * 100),
      fullMark: 100,
    }));

    // Change percentages (compare last 2 months)
    const months = Object.keys(monthlyData).sort();
    const lastMonth = months.length > 0 ? monthlyData[months[months.length - 1]] : { income: 0, expenses: 0 };
    const prevMonth = months.length > 1 ? monthlyData[months[months.length - 2]] : { income: 0, expenses: 0 };
    const incomeChange = prevMonth.income > 0 ? ((lastMonth.income - prevMonth.income) / prevMonth.income) * 100 : 0;
    const expenseChange = prevMonth.expenses > 0 ? ((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 : 0;

    // AI insights
    const insights = [];
    const highestCat = categoryData[0];
    if (highestCat) {
      insights.push(`💰 Highest spending: ${highestCat.name} at ₹${highestCat.value.toLocaleString('en-IN')} (${categoryData.length > 0 ? ((highestCat.value / totalExpenses) * 100).toFixed(1) : 0}%)`);
    }
    if (totalIncome > totalExpenses) {
      insights.push(`✅ Positive cash flow: You saved ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')} this period`);
    } else {
      insights.push(`⚠️ Negative cash flow: You overspent by ₹${(totalExpenses - totalIncome).toLocaleString('en-IN')}`);
    }
    const peakDay = dayOfWeekData.reduce((max, d) => d.avg > max.avg ? d : max, { avg: 0 });
    if (peakDay.day) {
      insights.push(`📊 Peak spending day: ${peakDay.day} (avg ₹${peakDay.avg.toLocaleString('en-IN')})`);
    }

    // Treemap data
    const treemapData = categoryData.slice(0, 10).map(c => ({ name: c.name, size: c.value }));

    return {
      totalIncome, totalExpenses, avgTransaction, trendData, categoryData,
      dayOfWeekData, hourlyData, velocityData, radarData, treemapData,
      incomeChange, expenseChange, insights, transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const tabs = ['Trends', 'Categories', 'Patterns', 'AI Insights'];

  if (loading) {
    return (
      <MainLayout title="Analytics" subtitle="Loading financial data...">
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <Shimmer key={i} className="h-36 rounded-xl" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Analytics" subtitle="Enterprise-Grade Financial Analytics">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">

          {/* ── Controls ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{analytics.transactionCount} transactions analyzed</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {['1m', '3m', '6m', '1y', 'all'].map(range => (
                  <button key={range} onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      dateRange === range ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{range.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total Income" value={analytics.totalIncome} change={analytics.incomeChange} icon={DollarSign} color="#10B981" />
            <KPICard label="Total Expenses" value={analytics.totalExpenses} change={analytics.expenseChange} icon={Activity} color="#EF4444" />
            <KPICard label="Net Savings" value={Math.max(0, analytics.totalIncome - analytics.totalExpenses)} icon={TrendingUp} color="#3B82F6" />
            <KPICard label="Avg Transaction" value={analytics.avgTransaction} icon={BarChart3} color="#8B5CF6" />
          </div>

          {/* ── Tabs ── */}
          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

          {/* ── Tab: Trends ── */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatedCard className="p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">INCOME VS EXPENSES TREND</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={analytics.trendData}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="income" stroke="#10B981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                    <Area yAxisId="left" type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                    <Line yAxisId="left" type="monotone" dataKey="savings" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Savings" />
                    <Bar yAxisId="right" dataKey="transactions" fill="#8B5CF6" opacity={0.3} radius={[4, 4, 0, 0]} name="Tx Count" />
                  </ComposedChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Savings Over Time */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">NET SAVINGS TREND</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.trendData}>
                    <defs>
                      <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="savings" stroke="#3B82F6" fill="url(#savGrad)" strokeWidth={2} name="Savings" />
                  </AreaChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Spending Velocity */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SPENDING VELOCITY (THIS MONTH)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.velocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} label={{ value: 'Day', position: 'bottom', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cumulative" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} name="Cumulative Spend" />
                  </AreaChart>
                </ResponsiveContainer>
              </AnimatedCard>
            </div>
          )}

          {/* ── Tab: Categories ── */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">EXPENSE BREAKDOWN</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={analytics.categoryData.slice(0, 8)} cx="50%" cy="50%" innerRadius={60} outerRadius={120}
                      paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {analytics.categoryData.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Category Bar Chart */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">TOP CATEGORIES</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.categoryData.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Amount">
                      {analytics.categoryData.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Treemap */}
              <AnimatedCard className="p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SPENDING TREEMAP</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <Treemap data={analytics.treemapData} dataKey="size" nameKey="name"
                    aspectRatio={4 / 3} stroke="#fff" content={<TreemapContent />}>
                  </Treemap>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Category Radar */}
              <AnimatedCard className="p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CATEGORY COMPARISON</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analytics.radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Spending %" dataKey="current" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </AnimatedCard>
            </div>
          )}

          {/* ── Tab: Patterns ── */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Day of Week */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SPENDING BY DAY OF WEEK</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total">
                      {analytics.dayOfWeekData.map((entry, i) => (
                        <Cell key={i} fill={entry.day === 'Sat' || entry.day === 'Sun' ? '#F59E0B' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Hour of Day */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SPENDING BY HOUR</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={analytics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#EC4899" fill="#EC4899" fillOpacity={0.15} strokeWidth={2} name="Spending" />
                  </AreaChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Transaction Count by Day */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">TRANSACTION FREQUENCY</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Average Spend by Day */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">AVG SPEND PER DAY</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="avg" fill="#10B981" radius={[4, 4, 0, 0]} name="Average" />
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedCard>
            </div>
          )}

          {/* ── Tab: AI Insights ── */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Brain size={20} className="text-purple-500" /> AI Financial Insights
                </h3>
                <div className="space-y-3">
                  {analytics.insights.map((insight, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300">
                      {insight}
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Category Statistics</h3>
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Category</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Count</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.categoryData.map((cat, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 px-2 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-white">
                            ₹{cat.value.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-500">{cat.count}</td>
                          <td className="py-2 px-2 text-right text-gray-500">₹{cat.avg.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </PageTransition>
    </MainLayout>
  );
}
