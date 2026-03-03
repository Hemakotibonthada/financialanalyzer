// ============================================================================
// ENTERPRISE DEBT MANAGEMENT — AI-Powered Debt Payoff Strategies
// ============================================================================
// Full CRUD debt tracking with avalanche/snowball calculators, payoff
// projections, interest savings analysis, and AI recommendations.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartTooltip, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import {
  CreditCard, Plus, Edit3, Trash2, TrendingDown, CheckCircle2,
  AlertTriangle, BrainCircuit, Sparkles, RefreshCw, Calendar,
  Percent, ArrowDownRight, Zap, Shield, Clock, Home, Car,
  GraduationCap, Landmark, Wallet, Check, X, IndianRupee,
  Target, Layers, ArrowUpRight, BarChart3,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge, Shimmer,
  AnimatedNumber, AnimatedTabs, EmptyState, colorPalette, chartColors,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS
// ============================================================================

const DEBT_TYPES = [
  { name: 'Credit Card', icon: CreditCard, emoji: '💳', avgRate: 36 },
  { name: 'Personal Loan', icon: Wallet, emoji: '💰', avgRate: 12 },
  { name: 'Home Loan', icon: Home, emoji: '🏠', avgRate: 8.5 },
  { name: 'Car Loan', icon: Car, emoji: '🚗', avgRate: 9 },
  { name: 'Education Loan', icon: GraduationCap, emoji: '🎓', avgRate: 10 },
  { name: 'Business Loan', icon: Landmark, emoji: '🏛️', avgRate: 14 },
  { name: 'Other', icon: Wallet, emoji: '📋', avgRate: 15 },
];

// ============================================================================
// §2  CALCULATORS
// ============================================================================

function calculatePayoff(debts, strategy = 'avalanche', extraPayment = 0) {
  if (!debts.length) return { timeline: [], totalInterest: 0, months: 0 };

  let working = debts.map(d => ({
    name: d.name || d.type,
    balance: d.balance || d.amount || d.currentBalance || 0,
    rate: (d.interestRate || d.rate || 12) / 100 / 12,
    minPayment: d.minimumPayment || d.emi || d.monthlyPayment || 0,
  })).filter(d => d.balance > 0);

  // Ensure minimum payments are meaningful
  working.forEach(d => {
    if (!d.minPayment || d.minPayment <= 0) {
      d.minPayment = Math.max(500, d.balance * 0.02);
    }
  });

  const timeline = [];
  let month = 0;
  let totalInterest = 0;
  const maxMonths = 360; // 30 years max

  while (working.some(d => d.balance > 0) && month < maxMonths) {
    month++;

    // Sort by strategy
    if (strategy === 'avalanche') {
      working.sort((a, b) => b.rate - a.rate);
    } else {
      working.sort((a, b) => a.balance - b.balance);
    }

    let extraLeft = extraPayment;
    let monthlyInterest = 0;
    let monthlyPrincipal = 0;
    let totalBalance = 0;

    working.forEach(d => {
      if (d.balance <= 0) return;

      const interest = d.balance * d.rate;
      monthlyInterest += interest;
      totalInterest += interest;

      let payment = d.minPayment;
      // Apply extra payment to first priority debt
      if (extraLeft > 0 && working.indexOf(d) === working.findIndex(x => x.balance > 0)) {
        payment += extraLeft;
        extraLeft = 0;
      }

      const principal = Math.min(d.balance, payment - interest);
      monthlyPrincipal += Math.max(0, principal);
      d.balance = Math.max(0, d.balance - principal);
      totalBalance += d.balance;
    });

    if (month % 1 === 0) {
      timeline.push({
        month,
        balance: Math.round(totalBalance),
        interest: Math.round(monthlyInterest),
        principal: Math.round(monthlyPrincipal),
      });
    }
  }

  return { timeline, totalInterest: Math.round(totalInterest), months: month };
}

// ============================================================================
// §3  SUB-COMPONENTS
// ============================================================================

const DebtCard = ({ debt, onEdit, onDelete }) => {
  const balance = debt.balance || debt.amount || debt.currentBalance || 0;
  const originalAmount = debt.originalAmount || debt.principalAmount || balance;
  const rate = debt.interestRate || debt.rate || 0;
  const emi = debt.minimumPayment || debt.emi || debt.monthlyPayment || 0;
  const paid = Math.max(0, originalAmount - balance);
  const pct = originalAmount > 0 ? Math.round((paid / originalAmount) * 100) : 0;
  const typeInfo = DEBT_TYPES.find(t => t.name === debt.type) || DEBT_TYPES[6];
  const TypeIcon = typeInfo.icon;

  return (
    <AnimatedCard className="p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/20">
            <TypeIcon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{debt.name || debt.type}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="error">{rate}% p.a.</Badge>
              {debt.lender && <span className="text-[10px] text-gray-400">{debt.lender}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 className="w-3.5 h-3.5 text-gray-400" /></button>}
          {onDelete && <button onClick={() => onDelete(debt._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Outstanding: <strong className="text-red-500">₹{balance.toLocaleString('en-IN')}</strong></span>
          <span className="text-gray-400">{pct}% paid</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">EMI</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{emi.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Original</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{originalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Paid</p>
          <p className="text-xs font-semibold text-green-600 dark:text-green-400">₹{paid.toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AnimatedCard>
  );
};

const AddDebtModal = ({ open, onClose, onSave, editData }) => {
  const [form, setForm] = useState({
    name: '', type: 'Personal Loan', balance: '', originalAmount: '', interestRate: '', minimumPayment: '', lender: '', startDate: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '',
        type: editData.type || 'Personal Loan',
        balance: (editData.balance || editData.amount || editData.currentBalance || '').toString(),
        originalAmount: (editData.originalAmount || editData.principalAmount || '').toString(),
        interestRate: (editData.interestRate || editData.rate || '').toString(),
        minimumPayment: (editData.minimumPayment || editData.emi || editData.monthlyPayment || '').toString(),
        lender: editData.lender || '',
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : '',
      });
    } else {
      setForm({ name: '', type: 'Personal Loan', balance: '', originalAmount: '', interestRate: '', minimumPayment: '', lender: '', startDate: '' });
    }
  }, [editData, open]);

  if (!open) return null;

  const selectedType = DEBT_TYPES.find(t => t.name === form.type);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editData ? 'Edit Debt' : 'Add Debt'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            balance: parseFloat(form.balance) || 0,
            originalAmount: parseFloat(form.originalAmount) || parseFloat(form.balance) || 0,
            interestRate: parseFloat(form.interestRate) || 0,
            minimumPayment: parseFloat(form.minimumPayment) || 0,
            _id: editData?._id,
          });
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Debt Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., HDFC Home Loan" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Debt Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DEBT_TYPES.map(t => (
                <button key={t.name} type="button" onClick={() => setForm(f => ({ ...f, type: t.name, interestRate: f.interestRate || t.avgRate.toString() }))}
                  className={`p-1.5 rounded-lg text-center text-[10px] border transition-all
                    ${form.type === t.name
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                  <span className="block text-sm">{t.emoji}</span>{t.name.substring(0, 10)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Outstanding (₹)</label>
              <input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Original Amount (₹)</label>
              <input type="number" value={form.originalAmount} onChange={e => setForm(f => ({ ...f, originalAmount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Interest Rate (% p.a.)
                {selectedType && <span className="ml-1 text-gray-400">Avg: {selectedType.avgRate}%</span>}
              </label>
              <input type="number" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                step="0.1" min="0" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">EMI / Min Payment (₹)</label>
              <input type="number" value={form.minimumPayment} onChange={e => setForm(f => ({ ...f, minimumPayment: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Lender</label>
              <input type="text" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., SBI, HDFC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {editData ? 'Update' : 'Add'}
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
      <p className="text-xs text-gray-500 mb-1">Month {label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: ₹{(p.value || 0).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// §4  MAIN COMPONENT
// ============================================================================

const EnterpriseDebtManagement = () => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [activeTab, setActiveTab] = useState('debts');
  const [strategy, setStrategy] = useState('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);

  // ------- FETCH -------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [debtRes] = await Promise.allSettled([api.get('/debts')]);
      const data = debtRes.status === 'fulfilled'
        ? (debtRes.value?.data?.data?.debts || debtRes.value?.data?.data || debtRes.value?.data?.debts || debtRes.value?.data || [])
        : [];
      setDebts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Debt fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------- DERIVED -------
  const debtStats = useMemo(() => {
    const totalDebt = debts.reduce((s, d) => s + (d.balance || d.amount || d.currentBalance || 0), 0);
    const totalEMI = debts.reduce((s, d) => s + (d.minimumPayment || d.emi || d.monthlyPayment || 0), 0);
    const avgRate = debts.length > 0
      ? debts.reduce((s, d) => s + (d.interestRate || d.rate || 0), 0) / debts.length
      : 0;
    const highestRate = debts.reduce((max, d) => Math.max(max, d.interestRate || d.rate || 0), 0);

    return { totalDebt, totalEMI, avgRate: avgRate.toFixed(1), highestRate, count: debts.length };
  }, [debts]);

  const avalancheResult = useMemo(() => calculatePayoff(debts, 'avalanche', extraPayment), [debts, extraPayment]);
  const snowballResult = useMemo(() => calculatePayoff(debts, 'snowball', extraPayment), [debts, extraPayment]);

  const activeResult = strategy === 'avalanche' ? avalancheResult : snowballResult;
  const interestSaved = Math.abs(snowballResult.totalInterest - avalancheResult.totalInterest);

  const recommendations = useMemo(() => {
    const recs = [];

    debts.forEach(d => {
      const rate = d.interestRate || d.rate || 0;
      if (rate > 24) {
        recs.push({
          title: `${d.name || d.type}: Very high interest (${rate}%)`,
          message: `This debt at ${rate}% is eroding your wealth. Prioritize paying it off or consider balance transfer.`,
          type: 'warning',
          savings: Math.round((d.balance || d.amount || 0) * rate / 100 / 12),
        });
      }
    });

    if (avalancheResult.totalInterest < snowballResult.totalInterest) {
      recs.push({
        title: `Avalanche saves ₹${interestSaved.toLocaleString('en-IN')} in interest`,
        message: `Paying highest-rate debts first (avalanche) saves more money than smallest-balance-first (snowball).`,
        type: 'info',
      });
    }

    if (debtStats.totalEMI > 0 && extraPayment === 0) {
      const suggestedExtra = Math.round(debtStats.totalEMI * 0.1);
      recs.push({
        title: `Add ₹${suggestedExtra.toLocaleString('en-IN')}/mo extra payment`,
        message: 'Even 10% extra monthly payment can reduce total interest significantly. Try the slider below!',
        type: 'suggestion',
      });
    }

    if (debts.length === 0) {
      recs.push({
        title: 'Debt-free! 🎉',
        message: 'No debts tracked. Add your loans and credit cards to get payoff strategies.',
        type: 'success',
      });
    }

    const creditCards = debts.filter(d => d.type === 'Credit Card');
    if (creditCards.length > 1) {
      recs.push({
        title: 'Consider consolidating credit card debt',
        message: `You have ${creditCards.length} credit cards with debt. A personal loan at lower interest could save money.`,
        type: 'suggestion',
      });
    }

    return recs;
  }, [debts, debtStats, avalancheResult, snowballResult, interestSaved, extraPayment]);

  // ------- HANDLERS -------
  const handleSave = useCallback(async (formData) => {
    try {
      if (formData._id) {
        await api.put(`/debts/${formData._id}`, formData);
      } else {
        await api.post('/debts', formData);
      }
      setShowModal(false);
      setEditData(null);
      fetchData();
    } catch (err) {
      console.error('Save debt error:', err);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Remove this debt?')) return;
    try {
      await api.delete(`/debts/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete debt error:', err);
    }
  }, [fetchData]);

  const tabs = [
    { id: 'debts', label: `Debts (${debtStats.count})`, icon: <CreditCard className="w-4 h-4" /> },
    { id: 'payoff', label: 'Payoff Plan', icon: <Target className="w-4 h-4" /> },
    { id: 'advisor', label: 'AI Advisor', icon: <BrainCircuit className="w-4 h-4" />, badge: recommendations.length },
  ];

  // ------- RENDER -------
  return (
    <MainLayout title="Debt Management" subtitle="Strategic debt payoff with AI guidance">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 space-y-6">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-7 h-7 text-red-500" />
                Debt Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {debtStats.count} debts · Total: ₹{debtStats.totalDebt.toLocaleString('en-IN')} · Avg rate: {debtStats.avgRate}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => { setEditData(null); setShowModal(true); }}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Debt
              </button>
            </div>
          </div>

          {/* ─── KPI CARDS ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Debt', value: debtStats.totalDebt, icon: CreditCard, color: 'rose' },
              { label: 'Monthly EMI', value: debtStats.totalEMI, icon: IndianRupee, color: 'amber' },
              { label: 'Payoff Time', value: activeResult.months, icon: Clock, color: 'blue', suffix: ' mo', noRupee: true },
              { label: 'Total Interest', value: activeResult.totalInterest, icon: Percent, color: 'purple' },
            ].map((stat, i) => {
              const colors = colorPalette[stat.color] || colorPalette.blue;
              return (
                <AnimatedCard key={i} delay={i * 50} className={`p-4 rounded-2xl ${colors.bg} border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${colors.text}`}>
                    {!stat.noRupee && '₹'}<AnimatedNumber value={stat.value} compact />{stat.suffix || ''}
                  </p>
                </AnimatedCard>
              );
            })}
          </div>

          {/* ─── TABS ─── */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {/* ─── DEBTS TAB ─── */}
          {activeTab === 'debts' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} height={200} rounded="rounded-2xl" />)}
                  </div>
                ) : debts.length === 0 ? (
                  <GlassCard className="p-12">
                    <EmptyState icon={CreditCard} title="No debts tracked" description="Add your loans and credit card debts to get strategic payoff plans"
                      action={() => { setEditData(null); setShowModal(true); }} actionLabel="Add First Debt" />
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {debts.map((d, i) => (
                      <DebtCard key={d._id || i} debt={d}
                        onEdit={(data) => { setEditData(data); setShowModal(true); }}
                        onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar — Breakdown */}
              <div className="space-y-4">
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Debt Breakdown</h4>
                  {debts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={debts.map(d => ({
                        name: (d.name || d.type || '').substring(0, 10),
                        balance: d.balance || d.amount || 0,
                        emi: d.minimumPayment || d.emi || 0,
                      }))} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <YAxis tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                        <RechartTooltip content={<ChartTooltip />} />
                        <Bar dataKey="balance" fill="#EF4444" radius={[4, 4, 0, 0]} name="Balance" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No debts to show</p>
                  )}
                </GlassCard>

                {/* Interest Rate Comparison */}
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Interest Rates</h4>
                  <div className="space-y-2">
                    {[...debts].sort((a, b) => (b.interestRate || b.rate || 0) - (a.interestRate || a.rate || 0)).map((d, i) => {
                      const rate = d.interestRate || d.rate || 0;
                      const maxRate = Math.max(...debts.map(dd => dd.interestRate || dd.rate || 0), 1);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate">{d.name || d.type}</span>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${(rate / maxRate) * 100}%`,
                              backgroundColor: rate > 20 ? '#EF4444' : rate > 12 ? '#F59E0B' : '#10B981',
                            }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-12 text-right">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ─── PAYOFF PLAN TAB ─── */}
          {activeTab === 'payoff' && debts.length > 0 && (
            <div className="space-y-6">
              {/* Strategy Selector */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Strategy:</span>
                  {['avalanche', 'snowball'].map(s => (
                    <button key={s} onClick={() => setStrategy(s)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                        strategy === s ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {s === 'avalanche' ? '🏔️ Avalanche (Highest Rate)' : '⛄ Snowball (Lowest Balance)'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Extra: ₹{extraPayment.toLocaleString('en-IN')}/mo</span>
                  <input type="range" min="0" max={Math.max(50000, debtStats.totalEMI)} step="500"
                    value={extraPayment} onChange={e => setExtraPayment(parseInt(e.target.value) || 0)}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payoff Timeline Chart */}
                <GlassCard className="p-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Payoff Timeline ({strategy === 'avalanche' ? 'Avalanche' : 'Snowball'})
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activeResult.timeline.filter((_, i) => i % Math.max(1, Math.floor(activeResult.timeline.length / 24)) === 0)}>
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                      <RechartTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="balance" stroke="#EF4444" fill="url(#balGrad)" strokeWidth={2} name="Balance" />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>

                {/* Strategy Comparison */}
                <GlassCard className="p-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Strategy Comparison</h4>
                  <div className="space-y-4">
                    {[
                      { name: 'Avalanche', data: avalancheResult, desc: 'Pay highest interest rate first', color: '#3B82F6' },
                      { name: 'Snowball', data: snowballResult, desc: 'Pay smallest balance first', color: '#F59E0B' },
                    ].map(s => (
                      <div key={s.name} className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        strategy === s.name.toLowerCase() ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'
                      }`} onClick={() => setStrategy(s.name.toLowerCase())}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {s.name === 'Avalanche' ? '🏔️' : '⛄'} {s.name}
                          </h5>
                          {strategy === s.name.toLowerCase() && <Badge variant="info">Active</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{s.desc}</p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase">Total Interest</p>
                            <p className="text-sm font-bold text-red-500">₹{s.data.totalInterest.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase">Payoff Time</p>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{s.data.months} months</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {interestSaved > 0 && (
                      <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Avalanche saves <strong>₹{interestSaved.toLocaleString('en-IN')}</strong> in interest
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {activeTab === 'payoff' && debts.length === 0 && (
            <GlassCard className="p-12">
              <EmptyState icon={Target} title="No debts to plan" description="Add your debts first to see payoff strategies" />
            </GlassCard>
          )}

          {/* ─── AI ADVISOR TAB ─── */}
          {activeTab === 'advisor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-500" /> AI Debt Insights
                </h3>
                {recommendations.map((rec, i) => (
                  <AnimatedCard key={i} delay={i * 60}
                    className={`p-4 rounded-xl border ${
                      rec.type === 'warning' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                      rec.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                      'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                    <div className="flex items-start gap-3">
                      <BrainCircuit className={`w-4 h-4 mt-0.5 ${rec.type === 'warning' ? 'text-red-500' : rec.type === 'success' ? 'text-green-500' : 'text-blue-500'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.message}</p>
                        {rec.savings && (
                          <p className="text-xs font-medium text-red-500 mt-1">Monthly interest cost: ₹{rec.savings.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" /> Debt-Free Strategies
                </h3>
                <GlassCard className="p-5 space-y-3">
                  {[
                    { title: 'Eliminate high-interest debt first', desc: 'Credit cards at 36%+ should be your top priority.' },
                    { title: 'Balance transfer to lower rate', desc: 'Transfer credit card debt to a lower-rate personal loan.' },
                    { title: 'Negotiate with lenders', desc: 'Banks often reduce rates if you have good payment history.' },
                    { title: 'Debt consolidation', desc: 'Combine multiple debts into one loan at a lower rate.' },
                    { title: 'Automate payments', desc: 'Set auto-debit to avoid late fees and maintain credit score.' },
                    { title: 'Use windfalls wisely', desc: 'Put bonuses and tax refunds toward high-interest debts.' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{tip.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </div>
          )}
        </div>

        <AddDebtModal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }}
          onSave={handleSave} editData={editData} />
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseDebtManagement;
