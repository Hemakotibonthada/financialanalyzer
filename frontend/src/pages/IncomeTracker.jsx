import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Wallet, Plus, Edit3, Trash2, TrendingUp, TrendingDown, DollarSign, Briefcase,
  Code, BarChart3, PiggyBank, Building2, Gift, X, Check, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, Percent, IndianRupee, ChevronDown, FileText
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start; const ref = { current: null };
    const animate = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / 1200, 1); setVal((1 - Math.pow(1 - p, 3)) * end); if (p < 1) ref.current = requestAnimationFrame(animate); };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end]);
  return <span>{prefix}{Math.round(val).toLocaleString()}</span>;
};

const SOURCE_ICONS = {
  salary: Briefcase, freelance: Code, investment: TrendingUp, rental: Building2,
  dividend: PiggyBank, bonus: Gift, business: BarChart3, other: Wallet
};

const SOURCE_COLORS = {
  salary: '#3b82f6', freelance: '#8b5cf6', investment: '#10b981', rental: '#f59e0b',
  dividend: '#ec4899', bonus: '#06b6d4', business: '#f97316', other: '#64748b'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TAX_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 5 },
  { min: 700000, max: 1000000, rate: 10 },
  { min: 1000000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
];

export default function IncomeTracker() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterSource, setFilterSource] = useState('all');
  const [formData, setFormData] = useState({ name: '', amount: '', source: 'salary', date: '', recurring: false, frequency: 'Monthly' });
  const [showTaxDetails, setShowTaxDetails] = useState(false);

  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/financial/income');
      const payload = res.data?.data || res.data;
      setIncomes(Array.isArray(payload?.transactions) ? payload.transactions : Array.isArray(payload) ? payload : []);
    } catch {
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncomes(); }, [fetchIncomes]);

  const stats = useMemo(() => {
    const thisMonth = incomes.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    });
    const lastMonth = incomes.filter(i => {
      const d = new Date(i.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() - 1 && d.getFullYear() === now.getFullYear();
    });
    const thisMonthTotal = thisMonth.reduce((s, i) => s + i.amount, 0);
    const lastMonthTotal = lastMonth.reduce((s, i) => s + i.amount, 0);
    const growth = lastMonthTotal ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;
    const annualEstimate = thisMonthTotal * 12;
    return { thisMonthTotal, lastMonthTotal, growth, annualEstimate, totalSources: new Set(incomes.map(i => i.source)).size };
  }, [incomes]);

  const sourceBreakdown = useMemo(() => {
    const grouped = {};
    incomes.forEach(i => {
      if (!grouped[i.source]) grouped[i.source] = 0;
      grouped[i.source] += i.amount;
    });
    return Object.entries(grouped).map(([source, total]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: total,
      color: SOURCE_COLORS[source] || '#64748b',
    }));
  }, [incomes]);

  const monthlyTrend = useMemo(() => {
    return MONTHS.map((m, i) => {
      const thisYear = incomes.filter(inc => {
        const d = new Date(inc.date);
        return d.getMonth() === i && d.getFullYear() === selectedYear;
      }).reduce((s, inc) => s + inc.amount, 0);
      const lastYear = incomes.filter(inc => {
        const d = new Date(inc.date);
        return d.getMonth() === i && d.getFullYear() === selectedYear - 1;
      }).reduce((s, inc) => s + inc.amount, 0);
      return { month: m, income: thisYear, lastYear };
    });
  }, [incomes, selectedYear]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(i => filterSource === 'all' || i.source === filterSource)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [incomes, filterSource]);

  const taxEstimate = useMemo(() => {
    const annual = stats.annualEstimate;
    const stdDeduction = 50000;
    const taxableIncome = Math.max(0, annual - stdDeduction);
    let tax = 0;
    let remaining = taxableIncome;
    for (const slab of TAX_SLABS) {
      const slabRange = Math.min(remaining, (slab.max === Infinity ? remaining : slab.max - slab.min));
      if (slabRange <= 0) break;
      tax += slabRange * slab.rate / 100;
      remaining -= slabRange;
    }
    const cess = tax * 0.04;
    return { taxableIncome, tax, cess, totalTax: tax + cess, effectiveRate: annual ? ((tax + cess) / annual * 100).toFixed(1) : 0 };
  }, [stats.annualEstimate]);

  const handleSave = useCallback(async () => {
    try {
      if (editingIncome) {
        setIncomes(prev => prev.map(i => i.id === editingIncome.id ? { ...i, ...formData, amount: parseFloat(formData.amount) } : i));
      } else {
        setIncomes(prev => [...prev, { ...formData, id: Date.now(), amount: parseFloat(formData.amount) }]);
      }
      setShowModal(false); setEditingIncome(null);
      setFormData({ name: '', amount: '', source: 'salary', date: '', recurring: false, frequency: 'Monthly' });
    } catch (err) { console.error(err); }
  }, [formData, editingIncome]);

  const handleEdit = useCallback((income) => {
    setEditingIncome(income);
    setFormData({ name: income.name, amount: income.amount, source: income.source, date: income.date, recurring: income.recurring || false, frequency: income.frequency || 'Monthly' });
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading income data...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Income Tracker">
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-lg shadow-green-600/30">
              <Wallet className="w-6 h-6" />
            </div>
            Income Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track all your income sources</p>
        </div>
        <button onClick={() => { setEditingIncome(null); setFormData({ name: '', amount: '', source: 'salary', date: '', recurring: false, frequency: 'Monthly' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
          <Plus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
        {[
          { label: 'This Month', value: stats.thisMonthTotal, icon: IndianRupee, color: 'green', change: stats.growth, prefix: '₹' },
          { label: 'Last Month', value: stats.lastMonthTotal, icon: Calendar, color: 'blue', prefix: '₹' },
          { label: 'Annual Estimate', value: stats.annualEstimate, icon: TrendingUp, color: 'purple', prefix: '₹' },
          { label: 'Income Sources', value: stats.totalSources, icon: Briefcase, color: 'amber', prefix: '' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${parseFloat(stat.change) >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                  {parseFloat(stat.change) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}%
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={stat.value} prefix={stat.prefix} /></div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Monthly Income Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Monthly Income Breakdown
            </h2>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 outline-none">
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="income" name="This Year" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastYear" name="Last Year" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Breakdown Pie */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-pink-500" /> By Source
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {sourceBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {sourceBreakdown.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">₹{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Income Growth Trend
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`]} />
              <Legend />
              <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
              <Line type="monotone" dataKey="lastYear" name="Previous Year" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Estimation */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowTaxDetails(!showTaxDetails)}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" /> Tax Estimation (New Regime FY 2025-26)
          </h2>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showTaxDetails ? 'rotate-180' : ''}`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Annual Income', value: stats.annualEstimate, color: 'green' },
            { label: 'Taxable Income', value: taxEstimate.taxableIncome, color: 'blue' },
            { label: 'Estimated Tax', value: taxEstimate.totalTax, color: 'red' },
            { label: 'Effective Rate', value: taxEstimate.effectiveRate, color: 'amber', suffix: '%', noPrefix: true },
          ].map((item, idx) => (
            <div key={idx} className={`p-4 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-900/20 border border-${item.color}-200 dark:border-${item.color}-800`}>
              <div className="text-sm text-slate-600 dark:text-slate-400">{item.label}</div>
              <div className={`text-xl font-bold text-${item.color}-700 dark:text-${item.color}-400 mt-1`}>
                {item.noPrefix ? `${item.value}${item.suffix}` : <AnimatedValue end={item.value} prefix="₹" />}
              </div>
            </div>
          ))}
        </div>

        {showTaxDetails && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400">Slab</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400">Rate</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400">Tax</th>
                </tr>
              </thead>
              <tbody>
                {TAX_SLABS.map((slab, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                      ₹{slab.min.toLocaleString()} - {slab.max === Infinity ? 'Above' : `₹${slab.max.toLocaleString()}`}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{slab.rate}%</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">
                      ₹{Math.max(0, Math.min(taxEstimate.taxableIncome - slab.min, (slab.max === Infinity ? taxEstimate.taxableIncome - slab.min : slab.max - slab.min)) * slab.rate / 100).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 px-3 text-slate-900 dark:text-white" colSpan={2}>Health & Education Cess (4%)</td>
                  <td className="py-2 px-3 text-right text-red-600">₹{Math.round(taxEstimate.cess).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Income List */}
      <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Income History</h2>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none">
            <option value="all">All Sources</option>
            {Object.keys(SOURCE_ICONS).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {filteredIncomes.map((income, idx) => {
            const IconComp = SOURCE_ICONS[income.source] || Wallet;
            const color = SOURCE_COLORS[income.source] || '#64748b';
            return (
              <div key={income.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lg transition-all"
                style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{income.name}</h3>
                    {income.recurring && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">Recurring</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="capitalize">{income.source}</span>
                    <span>•</span>
                    <span>{new Date(income.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {income.recurring && <><span>•</span><span>{income.frequency}</span></>}
                  </div>
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400 shrink-0">+₹{income.amount.toLocaleString()}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(income)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(income.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingIncome ? 'Edit Income' : 'Add Income'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Monthly salary"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="50000"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
                  <select value={formData.source} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.keys(SOURCE_ICONS).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.recurring} onChange={e => setFormData(p => ({ ...p, recurring: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Recurring income</span>
                </label>
                {formData.recurring && (
                  <select value={formData.frequency} onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white outline-none">
                    {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
              </div>
              <button onClick={handleSave}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> {editingIncome ? 'Update Income' : 'Add Income'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
