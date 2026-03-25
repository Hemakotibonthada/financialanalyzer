import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Repeat, Plus, Edit3, Trash2, Pause, Play, Calendar, CreditCard, Wifi, Tv,
  Home, Car, Heart, Music, Cloud, Shield, X, Check, ChevronLeft, ChevronRight,
  Filter, Search, TrendingUp, DollarSign, Clock, AlertCircle, MoreVertical
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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

const CATEGORY_ICONS = {
  subscription: Tv, bills: Wifi, emi: CreditCard, rent: Home, insurance: Shield,
  entertainment: Music, transport: Car, health: Heart, cloud: Cloud, other: Repeat
};

const CATEGORY_COLORS = {
  subscription: 'blue', bills: 'orange', emi: 'purple', rent: 'green',
  insurance: 'red', entertainment: 'pink', transport: 'cyan', health: 'emerald', cloud: 'indigo', other: 'slate'
};

const FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function RecurringPayments({ embedded = false }) {
  const Wrapper = embedded ? React.Fragment : MainLayout;
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrequency, setFilterFrequency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [formData, setFormData] = useState({ name: '', amount: '', category: 'subscription', frequency: 'Monthly', nextDate: '', icon: 'subscription' });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/recurring');
      const raw = res.data?.data || res.data?.payments || res.data;
      setPayments(Array.isArray(raw) ? raw : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const stats = useMemo(() => {
    const active = payments.filter(p => p.status === 'active');
    const monthlyTotal = active.reduce((sum, p) => {
      const mult = { Weekly: 4, Monthly: 1, Quarterly: 1 / 3, 'Half-Yearly': 1 / 6, Yearly: 1 / 12 };
      return sum + p.amount * (mult[p.frequency] || 1);
    }, 0);
    const sorted = [...active].sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
    return { monthlyTotal, annualProjection: monthlyTotal * 12, activeCount: active.length, pausedCount: payments.length - active.length, nextPayment: sorted[0] || null };
  }, [payments]);

  const monthlyBreakdown = useMemo(() => {
    return MONTHS.map((m, i) => {
      const total = payments.filter(p => p.status === 'active').reduce((sum, p) => {
        const mult = { Weekly: 4, Monthly: 1, Quarterly: (i % 3 === 0 ? 1 : 0), 'Half-Yearly': (i % 6 === 0 ? 1 : 0), Yearly: (i === 0 ? 1 : 0) };
        return sum + p.amount * (mult[p.frequency] || 1);
      }, 0);
      return { month: m, total };
    });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterFrequency !== 'all' && p.frequency !== filterFrequency) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [payments, filterCategory, filterStatus, filterFrequency, searchQuery]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayPayments = payments.filter(p => p.status === 'active' && p.nextDate === dateStr);
      days.push({ day: i, payments: dayPayments });
    }
    return days;
  }, [currentMonth, payments]);

  const handleSave = useCallback(async () => {
    try {
      if (editingPayment) {
        setPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...p, ...formData, amount: parseFloat(formData.amount) } : p));
      } else {
        const newPayment = { ...formData, id: Date.now(), amount: parseFloat(formData.amount), status: 'active' };
        setPayments(prev => [...prev, newPayment]);
      }
      setShowModal(false);
      setEditingPayment(null);
      setFormData({ name: '', amount: '', category: 'subscription', frequency: 'Monthly', nextDate: '', icon: 'subscription' });
    } catch (err) {
      console.error('Failed to save payment:', err);
    }
  }, [formData, editingPayment]);

  const handleEdit = useCallback((payment) => {
    setEditingPayment(payment);
    setFormData({ name: payment.name, amount: payment.amount, category: payment.category, frequency: payment.frequency, nextDate: payment.nextDate, icon: payment.icon });
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/bill-reminders/${id}`);
    } catch { /* ignore */ }
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const togglePause = useCallback(async (id) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'paused' : 'active' } : p));
    try { await api.put(`/bill-reminders/${id}`, { status: 'paused' }); } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading recurring payments...</p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper>
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl text-white shadow-lg shadow-purple-600/30">
              <Repeat className="w-6 h-6" />
            </div>
            Recurring Payments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage subscriptions, bills & EMIs</p>
        </div>
        <button onClick={() => { setEditingPayment(null); setFormData({ name: '', amount: '', category: 'subscription', frequency: 'Monthly', nextDate: '', icon: 'subscription' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
          <Plus className="w-4 h-4" /> Add Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
        {[
          { label: 'Monthly Total', value: stats.monthlyTotal, icon: DollarSign, color: 'blue', prefix: '₹' },
          { label: 'Annual Projection', value: stats.annualProjection, icon: TrendingUp, color: 'green', prefix: '₹' },
          { label: 'Active Payments', value: stats.activeCount, icon: Repeat, color: 'purple', prefix: '' },
          { label: 'Paused', value: stats.pausedCount, icon: Pause, color: 'amber', prefix: '' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedValue end={stat.value} prefix={stat.prefix} />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Next Payment Alert */}
      {stats.nextPayment && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 animate-fade-in-up flex items-center gap-4">
          <div className="p-3 bg-blue-500 text-white rounded-xl"><Clock className="w-6 h-6" /></div>
          <div className="flex-1">
            <div className="font-semibold text-blue-900 dark:text-blue-100">Next Payment Due</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{stats.nextPayment.name} — ₹{stats.nextPayment.amount.toLocaleString()} on {new Date(stats.nextPayment.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      )}

      {/* View Toggle & Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 animate-fade-in-up">
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {['list', 'calendar'].map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${viewMode === v ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search payments..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none">
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 outline-none">
            <option value="all">All Frequencies</option>
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3 animate-fade-in-up">
          {filteredPayments.map((payment, idx) => {
            const IconComp = CATEGORY_ICONS[payment.icon] || Repeat;
            const color = CATEGORY_COLORS[payment.category] || 'slate';
            return (
              <div key={payment.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lg transition-all ${payment.status === 'paused' ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${idx * 50}ms` }}>
                <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 shrink-0`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{payment.name}</h3>
                    {payment.status === 'paused' && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full font-medium">Paused</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                    <span className="capitalize">{payment.category}</span>
                    <span>•</span>
                    <span>{payment.frequency}</span>
                    <span>•</span>
                    <span>Next: {new Date(payment.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white shrink-0">₹{payment.amount.toLocaleString()}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePause(payment.id)}
                    className={`p-2 rounded-lg transition-colors ${payment.status === 'active' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                    {payment.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleEdit(payment)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(payment.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Repeat className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No payments found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new payment.</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2">{d}</div>
            ))}
            {calendarDays.map((day, idx) => (
              <div key={idx} className={`min-h-[80px] p-1.5 rounded-lg border ${day ? 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'border-transparent'}`}>
                {day && (
                  <>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{day.day}</div>
                    {day.payments.map(p => (
                      <div key={p.id} className="mt-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded truncate">{p.name}</div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Breakdown Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" /> Monthly Payments Breakdown
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Total']} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {monthlyBreakdown.map((_, i) => (
                  <Cell key={i} fill={i === new Date().getMonth() ? '#8b5cf6' : '#c4b5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingPayment ? 'Edit Payment' : 'Add Recurring Payment'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Name</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Netflix subscription"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                  <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="649"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                  <select value={formData.frequency} onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value, icon: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Next Payment Date</label>
                  <input type="date" value={formData.nextDate} onChange={e => setFormData(p => ({ ...p, nextDate: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={handleSave}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> {editingPayment ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Wrapper>
  );
}
