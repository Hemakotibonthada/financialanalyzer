// ============================================================================
// ENTERPRISE BUDGET INTELLIGENCE — AI-Powered Budget Planning
// ============================================================================
// Smart budgets with AI recommendations, spending forecasts, category drill-
// down, automated alerts, and multi-period comparison.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, Tooltip as RechartTooltip, CartesianGrid, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  PieChart as PieIcon, Plus, Edit3, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Target, BrainCircuit, Sparkles, ChevronRight,
  RefreshCw, Calendar, DollarSign, Percent, BarChart3, ArrowUpRight,
  ArrowDownRight, Bell, Zap, Wallet, Shield, Clock, Filter,
  Check, X, ChevronDown, IndianRupee,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge, Shimmer,
  AnimatedNumber, ProgressRing, AnimatedTabs, EmptyState,
  useAnimatedCounter, colorPalette, chartColors,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS
// ============================================================================

const BUDGET_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️', suggestedPct: 15 },
  { name: 'Groceries', icon: '🛒', suggestedPct: 10 },
  { name: 'Transport', icon: '🚗', suggestedPct: 10 },
  { name: 'Utilities', icon: '💡', suggestedPct: 8 },
  { name: 'Rent', icon: '🏠', suggestedPct: 25 },
  { name: 'Entertainment', icon: '🎬', suggestedPct: 5 },
  { name: 'Shopping', icon: '🛍️', suggestedPct: 8 },
  { name: 'Healthcare', icon: '⚕️', suggestedPct: 5 },
  { name: 'Education', icon: '📚', suggestedPct: 5 },
  { name: 'Insurance', icon: '🛡️', suggestedPct: 5 },
  { name: 'Savings', icon: '💰', suggestedPct: 20 },
  { name: 'Other', icon: '📦', suggestedPct: 4 },
];

// ============================================================================
// §2  SUB-COMPONENTS
// ============================================================================

const BudgetOverviewCard = ({ budget, onClick }) => {
  const spent = budget.spent || 0;
  const limit = budget.amount || budget.limit || 1;
  const pct = Math.min(100, Math.round((spent / limit) * 100));
  const remaining = Math.max(0, limit - spent);
  const status = pct >= 100 ? 'over' : pct >= 85 ? 'warning' : pct >= 50 ? 'moderate' : 'good';

  const statusConfig = {
    over: { color: '#EF4444', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', label: 'Over Budget' },
    warning: { color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', label: 'Near Limit' },
    moderate: { color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', label: 'On Track' },
    good: { color: '#10B981', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600 dark:text-green-400', label: 'Under Budget' },
  };

  const cfg = statusConfig[status];
  const catInfo = BUDGET_CATEGORIES.find(c => c.name === budget.category) || { icon: '📦' };

  return (
    <AnimatedCard className="p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{catInfo.icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{budget.category || budget.name}</p>
            <Badge variant={status === 'over' ? 'error' : status === 'warning' ? 'warning' : 'success'}>
              {cfg.label}
            </Badge>
          </div>
        </div>
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="4" className="dark:stroke-gray-700" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={cfg.color} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(1, pct / 100))}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">{pct}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Spent</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">₹{spent.toLocaleString('en-IN')}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: cfg.color }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400 dark:text-gray-500">Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
          <span className="text-gray-400 dark:text-gray-500">Limit: ₹{limit.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </AnimatedCard>
  );
};

const AIRecommendation = ({ rec, index }) => (
  <AnimatedCard delay={index * 60} className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800">
    <div className="flex items-start gap-3">
      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
        <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.message}</p>
        {rec.savings && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
            Potential savings: ₹{rec.savings.toLocaleString('en-IN')}/month
          </p>
        )}
      </div>
    </div>
  </AnimatedCard>
);

const AddBudgetModal = ({ open, onClose, onSave, editData, monthlyIncome }) => {
  const [form, setForm] = useState({ category: '', amount: '', period: 'monthly', alerts: true });

  useEffect(() => {
    if (editData) {
      setForm({ category: editData.category || '', amount: (editData.amount || '').toString(), period: editData.period || 'monthly', alerts: editData.alerts !== false });
    } else {
      setForm({ category: '', amount: '', period: 'monthly', alerts: true });
    }
  }, [editData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editData ? 'Edit Budget' : 'Create Budget'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, amount: parseFloat(form.amount) || 0, _id: editData?._id }); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {BUDGET_CATEGORIES.map(cat => (
                <button key={cat.name} type="button" onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                  className={`p-2 rounded-xl text-center text-xs border transition-all
                    ${form.category === cat.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'}`}>
                  <span className="text-lg block mb-0.5">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Budget Amount (₹)
              {monthlyIncome > 0 && form.category && (
                <span className="ml-1 text-gray-400">
                  Suggested: ₹{Math.round(monthlyIncome * (BUDGET_CATEGORIES.find(c => c.name === form.category)?.suggestedPct || 5) / 100).toLocaleString('en-IN')}
                </span>
              )}
            </label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="10000" required min="0" />
          </div>

          <div className="flex items-center gap-2 justify-between">
            <label className="text-xs text-gray-600 dark:text-gray-400">Enable alerts when near limit</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, alerts: !f.alerts }))}
              className={`w-10 h-5 rounded-full transition-colors ${form.alerts ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${form.alerts ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
// §3  MAIN COMPONENT
// ============================================================================

const EnterpriseBudgetIntelligence = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ------- FETCH -------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, txnRes] = await Promise.allSettled([
        api.get('/budgets'),
        api.get('/financial/transactions', { params: { limit: 200, sort: '-date' } }),
      ]);

      setBudgets(budgetRes.status === 'fulfilled' ? (budgetRes.value?.data?.data || budgetRes.value?.data || []) : []);
      const txns = txnRes.status === 'fulfilled' ? (txnRes.value?.data?.data?.transactions || txnRes.value?.data?.transactions || txnRes.value?.data?.data || []) : [];
      setTransactions(Array.isArray(txns) ? txns : []);
    } catch (err) {
      console.error('Budget fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------- DERIVED -------
  const budgetSummary = useMemo(() => {
    if (!Array.isArray(budgets) || budgets.length === 0) return { totalBudget: 0, totalSpent: 0, totalRemaining: 0, adherenceRate: 100, overBudgetCount: 0 };

    const totalBudget = budgets.reduce((s, b) => s + (b.amount || b.limit || 0), 0);
    const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
    const overBudgetCount = budgets.filter(b => (b.spent || 0) > (b.amount || b.limit || 0)).length;

    return {
      totalBudget: Math.round(totalBudget),
      totalSpent: Math.round(totalSpent),
      totalRemaining: Math.round(Math.max(0, totalBudget - totalSpent)),
      adherenceRate: budgets.length > 0 ? Math.round(((budgets.length - overBudgetCount) / budgets.length) * 100) : 100,
      overBudgetCount,
    };
  }, [budgets]);

  const pieData = useMemo(() => {
    return budgets.map(b => ({
      name: b.category || b.name || 'Other',
      value: b.amount || b.limit || 0,
      spent: b.spent || 0,
    })).filter(d => d.value > 0);
  }, [budgets]);

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' || t.type === 'credit')
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  }, [transactions]);

  const recommendations = useMemo(() => {
    const recs = [];
    const sortedBudgets = [...budgets].sort((a, b) => ((b.spent || 0) / (b.amount || 1)) - ((a.spent || 0) / (a.amount || 1)));

    sortedBudgets.forEach(b => {
      const pct = (b.spent || 0) / (b.amount || 1);
      if (pct > 1) {
        recs.push({
          title: `${b.category} is over budget by ₹${Math.round((b.spent || 0) - (b.amount || 0)).toLocaleString('en-IN')}`,
          message: `Consider increasing the budget or reducing spending in ${b.category}. Your spending is ${Math.round(pct * 100)}% of the limit.`,
          savings: Math.round((b.spent || 0) - (b.amount || 0)),
          type: 'warning',
        });
      }
    });

    // Check for uncategorized spending
    const categorizedExpenses = new Set(budgets.map(b => b.category));
    const uncategorized = {};
    transactions
      .filter(t => t.type !== 'income' && t.type !== 'credit' && !categorizedExpenses.has(t.category))
      .forEach(t => {
        const cat = t.category || 'Uncategorized';
        uncategorized[cat] = (uncategorized[cat] || 0) + Math.abs(t.amount || 0);
      });

    Object.entries(uncategorized)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([cat, amount]) => {
        recs.push({
          title: `Create a budget for ${cat}`,
          message: `You've spent ₹${Math.round(amount).toLocaleString('en-IN')} on ${cat} without a budget. Creating one helps track spending.`,
          type: 'suggestion',
        });
      });

    if (budgetSummary.adherenceRate >= 90 && budgets.length > 0) {
      recs.push({
        title: 'Excellent budget discipline! 🎉',
        message: `${budgetSummary.adherenceRate}% budget adherence rate. You're managing your finances well.`,
        type: 'success',
      });
    }

    if (monthlyIncome > 0 && budgetSummary.totalBudget < monthlyIncome * 0.5) {
      recs.push({
        title: 'Budget covers less than 50% of income',
        message: 'Allocate budgets for more categories to have better control over your spending.',
        type: 'info',
      });
    }

    return recs;
  }, [budgets, budgetSummary, transactions, monthlyIncome]);

  // ------- HANDLERS -------
  const handleSave = useCallback(async (formData) => {
    try {
      if (formData._id) {
        await api.put(`/budgets/${formData._id}`, formData);
      } else {
        await api.post('/budgets', formData);
      }
      setShowModal(false);
      setEditData(null);
      fetchData();
    } catch (err) {
      console.error('Save budget error:', err);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete budget error:', err);
    }
  }, [fetchData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <PieIcon className="w-4 h-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Advisor', icon: <BrainCircuit className="w-4 h-4" />, badge: recommendations.length },
  ];

  // ------- RENDER -------
  return (
    <MainLayout title="Budget Intelligence" subtitle="AI-powered budget planning & analysis">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 space-y-6">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-7 h-7 text-purple-500" />
                Budget Intelligence
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {budgets.length} active budgets · {budgetSummary.adherenceRate}% adherence rate
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchData()}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => { setEditData(null); setShowModal(true); }}
                className="px-4 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center gap-1.5 transition-colors">
                <Plus className="w-4 h-4" /> Create Budget
              </button>
            </div>
          </div>

          {/* ─── SUMMARY CARDS ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Budget', value: budgetSummary.totalBudget, icon: Wallet, color: 'purple' },
              { label: 'Total Spent', value: budgetSummary.totalSpent, icon: IndianRupee, color: 'rose' },
              { label: 'Remaining', value: budgetSummary.totalRemaining, icon: Shield, color: 'green' },
              { label: 'Adherence', value: budgetSummary.adherenceRate, icon: Target, color: 'blue', prefix: '', suffix: '%' },
            ].map((stat, i) => {
              const colors = colorPalette[stat.color];
              return (
                <AnimatedCard key={i} delay={i * 50} className={`p-4 rounded-2xl ${colors.bg} border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${colors.text}`}>
                    {stat.prefix !== '' ? '₹' : ''}<AnimatedNumber value={stat.value} compact />{stat.suffix || ''}
                  </p>
                </AnimatedCard>
              );
            })}
          </div>

          {/* ─── TABS ─── */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {/* ─── TAB CONTENT ─── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Budget Grid */}
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} height={180} rounded="rounded-2xl" />)}
                  </div>
                ) : budgets.length === 0 ? (
                  <GlassCard className="p-12">
                    <EmptyState
                      icon={PieIcon}
                      title="No budgets yet"
                      description="Create budgets to track your spending and get AI-powered insights"
                      action={() => { setEditData(null); setShowModal(true); }}
                      actionLabel="Create First Budget"
                    />
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgets.map((b, i) => (
                      <BudgetOverviewCard key={b._id || i} budget={b}
                        onClick={() => setSelectedBudget(b)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Allocation Chart */}
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Budget Allocation</h4>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            paddingAngle={2} dataKey="value" nameKey="name">
                            {pieData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                          </Pie>
                          <RechartTooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {pieData.slice(0, 6).map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{d.name}</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">₹{d.value.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No budget data</p>
                  )}
                </GlassCard>

                {/* Quick Alerts */}
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                    <Bell className="w-4 h-4 text-amber-500" /> Alerts
                  </h4>
                  <div className="space-y-2">
                    {budgets.filter(b => ((b.spent || 0) / (b.amount || 1)) >= 0.85).length === 0 ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" /> All budgets are on track!
                      </div>
                    ) : (
                      budgets.filter(b => ((b.spent || 0) / (b.amount || 1)) >= 0.85).map((b, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              {b.category}: {Math.round(((b.spent || 0) / (b.amount || 1)) * 100)}% used
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget vs Actual */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Budget vs Actual</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgets.map(b => ({
                    name: (b.category || '').substring(0, 10),
                    budget: b.amount || 0,
                    actual: b.spent || 0,
                  }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                    <RechartTooltip content={<ChartTooltip />} />
                    <Bar dataKey="budget" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Budget" />
                    <Bar dataKey="actual" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Actual" />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Spending by Category Over Time */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Spending Trend</h4>
                {(() => {
                  const monthlySpend = {};
                  transactions.filter(t => t.type !== 'income').forEach(t => {
                    const d = new Date(t.date || t.createdAt);
                    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                    monthlySpend[key] = (monthlySpend[key] || 0) + Math.abs(t.amount || 0);
                  });
                  const data = Object.entries(monthlySpend).slice(-6).map(([m, v]) => ({ month: m, spending: Math.round(v) }));

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <YAxis tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <RechartTooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="spending" stroke="#8B5CF6" fill="url(#spendGrad)" strokeWidth={2} name="Spending" />
                      </AreaChart>
                    </ResponsiveContainer>
                  );
                })()}
              </GlassCard>

              {/* Budget Health Scores */}
              <GlassCard className="p-6 lg:col-span-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Budget Health Scores</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {budgets.map((b, i) => {
                    const pct = Math.round(((b.spent || 0) / (b.amount || 1)) * 100);
                    const score = Math.max(0, 100 - Math.max(0, pct - 100) * 2 - (pct > 85 ? (pct - 85) : 0));
                    const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="4" className="dark:stroke-gray-700" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
                              strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center truncate w-full">{b.category}</p>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> AI Recommendations
                </h3>
                {recommendations.length === 0 ? (
                  <GlassCard className="p-8">
                    <EmptyState
                      icon={BrainCircuit}
                      title="No recommendations yet"
                      description="Add more budgets and transactions for AI-powered insights"
                    />
                  </GlassCard>
                ) : (
                  recommendations.map((rec, i) => <AIRecommendation key={i} rec={rec} index={i} />)
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Smart Budget Suggestions
                </h3>
                <GlassCard className="p-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Based on your income of <strong>₹{monthlyIncome.toLocaleString('en-IN')}</strong>, here's the recommended allocation:
                  </p>
                  <div className="space-y-3">
                    {BUDGET_CATEGORIES.filter(c => c.suggestedPct >= 5).map((cat, i) => {
                      const amount = Math.round(monthlyIncome * cat.suggestedPct / 100);
                      const existing = budgets.find(b => b.category === cat.name);
                      return (
                        <div key={cat.name} className="flex items-center gap-3">
                          <span className="text-lg">{cat.icon}</span>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                              <span className="text-xs text-gray-500">{cat.suggestedPct}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-400">₹{amount.toLocaleString('en-IN')}/mo</span>
                              {existing ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <button onClick={() => { setEditData({ category: cat.name, amount }); setShowModal(true); }}
                                  className="text-xs text-blue-500 hover:text-blue-600">+ Add</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
        </div>

        <AddBudgetModal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }}
          onSave={handleSave} editData={editData} monthlyIncome={monthlyIncome} />
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseBudgetIntelligence;
