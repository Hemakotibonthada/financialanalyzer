import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Calendar, Bell, Plus, Download, Filter, Search,
  Eye, ChevronRight, Wallet, Target, Shield, Zap, Award, Clock, RefreshCw,
  MoreHorizontal, ExternalLink, Maximize2, Sun, Moon, Settings, Star, Sparkles,
  AlertTriangle, CheckCircle2, ArrowRight, Layers, TrendingUp as Trending
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart,
  RadialBar, ComposedChart, Scatter
} from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Animated counter component
const AnimatedCounter = ({ end, duration = 1500, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * end);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);

  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>;
};

// Micro sparkline chart
const MicroSparkline = ({ data, color = '#3b82f6', height = 40 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4)} r="3" fill={color} />
    </svg>
  );
};

// Stat Card with animation
const StatCard = ({ title, value, change, changeType, icon: Icon, color, sparklineData, onClick, prefix = '₹' }) => (
  <div
    onClick={onClick}
    className={`relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700
      transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group overflow-hidden`}
  >
    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150"
      style={{ background: color }} />
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}15` }}>
        <Icon size={22} style={{ color }} />
      </div>
      {change !== undefined && (
        <span className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg ${
          changeType === 'positive' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' :
          changeType === 'negative' ? 'text-red-600 bg-red-50 dark:bg-red-900/30' :
          'text-slate-500 bg-slate-100 dark:bg-slate-700'
        }`}>
          {changeType === 'positive' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">
      {typeof value === 'number' ? <AnimatedCounter end={value} prefix={prefix} /> : value}
    </p>
    {sparklineData && (
      <div className="mt-3">
        <MicroSparkline data={sparklineData} color={color} />
      </div>
    )}
  </div>
);

// Quick Action Button
const QuickAction = ({ icon: Icon, label, onClick, color }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
    <div className="p-3 rounded-xl transition-colors duration-300" style={{ background: `${color}15` }}>
      <Icon size={20} style={{ color }} className="group-hover:scale-110 transition-transform duration-300" />
    </div>
    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
  </button>
);

// Recent Transaction Row
const TransactionRow = ({ transaction, index }) => (
  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 animate-fade-in-up"
    style={{ animationDelay: `${index * 50}ms` }}>
    <div className={`p-2.5 rounded-xl ${transaction.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
      {transaction.type === 'income' ? <ArrowUpRight size={18} className="text-emerald-600" /> : <ArrowDownRight size={18} className="text-red-600" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-900 dark:text-white truncate">{transaction.description || transaction.category}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{transaction.category} • {new Date(transaction.date).toLocaleDateString()}</p>
    </div>
    <div className="text-right">
      <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
        {transaction.type === 'income' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
      </p>
    </div>
  </div>
);

// Budget Progress Ring
const BudgetRing = ({ spent, budget, category, color }) => {
  const pct = Math.min((spent / budget) * 100, 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-slate-700" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">{category}</p>
        <p className="text-sm text-slate-500">₹{spent.toLocaleString()} / ₹{budget.toLocaleString()}</p>
      </div>
      <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${
        pct > 90 ? 'text-red-600 bg-red-50' : pct > 70 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
      }`}>
        {pct > 90 ? 'Over' : pct > 70 ? 'Warning' : 'Good'}
      </div>
    </div>
  );
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: ₹{Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const EnhancedDashboardV2 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [summaryRes, transRes, budgetRes] = await Promise.allSettled([
        api.get('/api/financial/summary'),
        api.get('/api/financial/transactions', { params: { limit: 10, sort: '-date' } }),
        api.get('/api/budgets')
      ]);

      setDashboardData({
        summary: summaryRes.status === 'fulfilled' ? summaryRes.value?.data?.data || summaryRes.value?.data : null,
        transactions: transRes.status === 'fulfilled' ? (transRes.value?.data?.data?.transactions || transRes.value?.data?.transactions || []) : [],
        budgets: budgetRes.status === 'fulfilled' ? (budgetRes.value?.data?.data || budgetRes.value?.data?.budgets || []) : [],
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const stats = useMemo(() => {
    if (!dashboardData?.summary) return [];
    const s = dashboardData.summary;
    return [
      { title: 'Total Balance', value: s.totalBalance || s.balance || 0, change: 12.5, changeType: 'positive', icon: Wallet, color: '#3b82f6', sparklineData: [30, 40, 35, 50, 49, 60, 70, 91] },
      { title: 'Monthly Income', value: s.monthlyIncome || s.totalIncome || 0, change: 8.2, changeType: 'positive', icon: TrendingUp, color: '#10b981', sparklineData: [40, 30, 45, 50, 55, 60, 58, 65] },
      { title: 'Monthly Expenses', value: s.monthlyExpenses || s.totalExpenses || 0, change: 3.1, changeType: 'negative', icon: CreditCard, color: '#ef4444', sparklineData: [50, 40, 60, 55, 45, 50, 48, 52] },
      { title: 'Savings Rate', value: s.savingsRate || 0, change: 5.4, changeType: 'positive', icon: Target, color: '#8b5cf6', prefix: '', sparklineData: [20, 25, 22, 30, 28, 35, 33, 38] },
    ];
  }, [dashboardData]);

  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => ({
      month: m,
      income: Math.floor(Math.random() * 50000) + 30000,
      expenses: Math.floor(Math.random() * 40000) + 20000,
      savings: Math.floor(Math.random() * 20000) + 5000,
    }));
  }, []);

  const categoryData = useMemo(() => [
    { name: 'Food & Dining', value: 15000, color: '#3b82f6' },
    { name: 'Transportation', value: 8000, color: '#10b981' },
    { name: 'Shopping', value: 12000, color: '#8b5cf6' },
    { name: 'Bills & Utilities', value: 10000, color: '#f59e0b' },
    { name: 'Entertainment', value: 5000, color: '#ef4444' },
    { name: 'Healthcare', value: 3000, color: '#06b6d4' },
    { name: 'Education', value: 7000, color: '#ec4899' },
    { name: 'Others', value: 4000, color: '#84cc16' }
  ], []);

  const quickActions = [
    { icon: Plus, label: 'Add Expense', onClick: () => navigate('/analyze'), color: '#ef4444' },
    { icon: Target, label: 'Set Goal', onClick: () => navigate('/goals'), color: '#3b82f6' },
    { icon: CreditCard, label: 'EMI Tracker', onClick: () => navigate('/emi-tracker'), color: '#8b5cf6' },
    { icon: PieChart, label: 'Analytics', onClick: () => navigate('/advanced-analytics'), color: '#10b981' },
    { icon: Download, label: 'Export', onClick: () => navigate('/export-center'), color: '#f59e0b' },
    { icon: Bell, label: 'Reminders', onClick: () => navigate('/bill-reminders'), color: '#06b6d4' },
    { icon: Shield, label: 'Insurance', onClick: () => navigate('/insurance'), color: '#ec4899' },
    { icon: Award, label: 'Achievements', onClick: () => navigate('/achievements'), color: '#84cc16' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 animate-pulse">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 h-80 animate-pulse">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="h-60 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 animate-fade-in-down">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            {['week', 'month', 'quarter', 'year'].map(range => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchDashboardData}
            className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 dashboard-grid">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {quickActions.map((action, i) => (
            <QuickAction key={i} {...action} />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Income vs Expenses Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Income vs Expenses</h2>
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Maximize2 size={16} className="text-slate-500" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyChartData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="income" fill="url(#colorIncome)" stroke="#10b981" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" fill="url(#colorExpenses)" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              <Bar dataKey="savings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Savings" barSize={20} opacity={0.8} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Spending Categories</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RePieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
            </RePieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {categoryData.slice(0, 5).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">₹{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h2>
            <button onClick={() => navigate('/analyze')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {(dashboardData?.transactions || []).slice(0, 6).map((t, i) => (
              <TransactionRow key={t._id || i} transaction={t} index={i} />
            ))}
            {(!dashboardData?.transactions?.length) && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <Activity size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">Add your first transaction to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Budget Overview</h2>
            <button onClick={() => navigate('/budget-planner')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Manage <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {(dashboardData?.budgets || []).slice(0, 5).map((b, i) => (
              <BudgetRing key={i} spent={b.spent || 0} budget={b.amount || b.limit || 10000} category={b.category || 'General'} color={COLORS[i % COLORS.length]} />
            ))}
            {(!dashboardData?.budgets?.length) && (
              <>
                <BudgetRing spent={15000} budget={20000} category="Food & Dining" color="#3b82f6" />
                <BudgetRing spent={7500} budget={10000} category="Transportation" color="#10b981" />
                <BudgetRing spent={4200} budget={5000} category="Entertainment" color="#8b5cf6" />
                <BudgetRing spent={9800} budget={12000} category="Shopping" color="#f59e0b" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Sparkles size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">AI Financial Insights</h3>
            <p className="text-blue-100 text-sm">
              Based on your spending patterns, you could save an additional ₹5,000 this month by reducing dining expenses.
            </p>
          </div>
          <button onClick={() => navigate('/ai-insights')} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors font-medium">
            View Insights <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardV2;
