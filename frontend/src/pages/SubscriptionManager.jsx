import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  CreditCard, Plus, Edit2, Trash2, Search, Filter, Calendar,
  DollarSign, Bell, TrendingUp, ArrowUpRight, ArrowDownRight,
  Check, X, ChevronDown, ExternalLink, RefreshCw, Star,
  Zap, Music, Tv, Cloud, Shield, BookOpen, Dumbbell, Wifi, MapPin
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const SUBSCRIPTION_CATEGORIES = [
  { id: 'streaming', label: 'Streaming', icon: Tv, color: '#6366f1' },
  { id: 'music', label: 'Music', icon: Music, color: '#ec4899' },
  { id: 'cloud', label: 'Cloud Storage', icon: Cloud, color: '#3b82f6' },
  { id: 'productivity', label: 'Productivity', icon: Zap, color: '#f59e0b' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, color: '#10b981' },
  { id: 'security', label: 'Security', icon: Shield, color: '#ef4444' },
  { id: 'education', label: 'Education', icon: BookOpen, color: '#8b5cf6' },
  { id: 'internet', label: 'Internet', icon: Wifi, color: '#06b6d4' },
  { id: 'other', label: 'Other', icon: Star, color: '#64748b' },
];

const BILLING_CYCLES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'half-yearly', label: 'Half-Yearly' },
  { id: 'yearly', label: 'Yearly' },
];

const SubscriptionForm = ({ subscription, onSave, onCancel }) => {
  const [form, setForm] = useState(subscription || {
    name: '', category: 'streaming', amount: '', billingCycle: 'monthly',
    nextBilling: '', url: '', notes: '', status: 'active',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm">
            {SUBSCRIPTION_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Cycle</label>
          <select value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm">
            {BILLING_CYCLES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Next Billing Date</label>
          <input type="date" value={form.nextBilling} onChange={e => setForm({ ...form, nextBilling: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL (optional)</label>
        <input value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
        <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
      </div>
    </form>
  );
};

export default function SubscriptionManager({ embedded = false }) {
  const Wrapper = embedded ? React.Fragment : MainLayout;
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/subscriptions');
        const subs = res.data?.subscriptions || res.data || [];
        setSubscriptions(subs);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load subscriptions.');
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce((sum, s) => {
      const amt = s.amount || 0;
      if (s.billingCycle === 'yearly') return sum + amt / 12;
      if (s.billingCycle === 'half-yearly') return sum + amt / 6;
      if (s.billingCycle === 'quarterly') return sum + amt / 3;
      return sum + amt;
    }, 0);
    const yearlyTotal = monthlyTotal * 12;
    const categoryBreakdown = {};
    active.forEach(s => {
      const cat = s.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = 0;
      const normalized = s.billingCycle === 'yearly' ? (s.amount || 0) / 12 : s.billingCycle === 'half-yearly' ? (s.amount || 0) / 6 : s.billingCycle === 'quarterly' ? (s.amount || 0) / 3 : (s.amount || 0);
      categoryBreakdown[cat] += normalized;
    });
    const chartData = Object.entries(categoryBreakdown).map(([id, value]) => {
      const cat = SUBSCRIPTION_CATEGORIES.find(c => c.id === id) || { label: id, color: '#64748b' };
      return { name: cat.label, value: Math.round(value), color: cat.color };
    });
    return { activeCount: active.length, pausedCount: subscriptions.filter(s => s.status === 'paused').length, cancelledCount: subscriptions.filter(s => s.status === 'cancelled').length, monthlyTotal, yearlyTotal, chartData };
  }, [subscriptions]);

  const filtered = useMemo(() => {
    let result = subscriptions;
    if (activeTab === 'active') result = result.filter(s => s.status === 'active');
    else if (activeTab === 'paused') result = result.filter(s => s.status === 'paused');
    else if (activeTab === 'cancelled') result = result.filter(s => s.status === 'cancelled');
    if (filterCategory !== 'all') result = result.filter(s => s.category === filterCategory);
    if (searchTerm) result = result.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    result.sort((a, b) => {
      if (sortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'date') return new Date(a.nextBilling || 0) - new Date(b.nextBilling || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
    return result;
  }, [subscriptions, activeTab, filterCategory, searchTerm, sortBy]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    return subscriptions.filter(s => s.status === 'active' && s.nextBilling && new Date(s.nextBilling) <= week).sort((a, b) => new Date(a.nextBilling) - new Date(b.nextBilling));
  }, [subscriptions]);

  const handleSave = async (data) => {
    try {
      if (editingSub) {
        const res = await api.put(`/subscriptions/${editingSub.id || editingSub._id}`, data);
        const updated = res.data?.subscription || res.data || data;
        setSubscriptions(prev => prev.map(s => (s.id === editingSub.id || s._id === editingSub._id) ? { ...s, ...updated } : s));
      } else {
        const res = await api.post('/subscriptions', data);
        const created = res.data?.subscription || res.data || { ...data, id: Date.now() };
        setSubscriptions(prev => [created, ...prev]);
      }
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
    setShowAddModal(false);
    setEditingSub(null);
  };

  const handleDelete = async (sub) => {
    try {
      await api.delete(`/subscriptions/${sub.id || sub._id}`);
    } catch (err) {
      console.error('Error deleting:', err);
    }
    setSubscriptions(prev => prev.filter(s => s.id !== sub.id && s._id !== sub._id));
  };

  const handleToggleStatus = async (sub) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/subscriptions/${sub.id || sub._id}`, { status: newStatus });
    } catch (err) {
      console.error('Error toggling status:', err);
    }
    setSubscriptions(prev => prev.map(s => (s.id === sub.id || s._id === sub._id) ? { ...s, status: newStatus } : s));
  };

  const getCategoryInfo = (catId) => SUBSCRIPTION_CATEGORIES.find(c => c.id === catId) || SUBSCRIPTION_CATEGORIES[SUBSCRIPTION_CATEGORIES.length - 1];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 space-y-6">
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" /> Subscription Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage all your subscriptions</p>
        </div>
        <button onClick={() => { setEditingSub(null); setShowAddModal(true); }}
          className="bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 px-4 py-2.5 flex items-center gap-2 w-fit shadow-lg shadow-indigo-600/30">
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', value: stats.activeCount, icon: CreditCard, color: 'indigo' },
          { label: 'Monthly Cost', value: `₹${Math.round(stats.monthlyTotal).toLocaleString()}`, icon: DollarSign, color: 'green' },
          { label: 'Yearly Cost', value: `₹${Math.round(stats.yearlyTotal).toLocaleString()}`, icon: TrendingUp, color: 'purple' },
          { label: 'Upcoming (7 days)', value: upcoming.length, icon: Bell, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Category & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Spending by Category</h3>
          {stats.chartData.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No data yet.</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {stats.chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [`₹${v}`, 'Monthly']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {stats.chartData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                    </div>
                    <span className="font-medium text-slate-800 dark:text-white">₹{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming billing */}
          {upcoming.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
              <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <Bell className="w-5 h-5" /> Upcoming Billing
              </h3>
              <div className="space-y-2">
                {upcoming.slice(0, 4).map(s => {
                  const cat = getCategoryInfo(s.category);
                  const Icon = cat.icon;
                  const daysLeft = Math.ceil((new Date(s.nextBilling) - Date.now()) / 86400000);
                  return (
                    <div key={s.id || s._id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{s.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{daysLeft <= 0 ? 'Today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">₹{(s.amount || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {[
            { id: 'all', label: 'All', count: subscriptions.length },
            { id: 'active', label: 'Active', count: stats.activeCount },
            { id: 'paused', label: 'Paused', count: stats.pausedCount },
            { id: 'cancelled', label: 'Cancelled', count: stats.cancelledCount },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..."
              className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white w-48" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <option value="all">All Categories</option>
            {SUBSCRIPTION_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <option value="name">Sort: Name</option>
            <option value="amount">Sort: Amount</option>
            <option value="date">Sort: Next Billing</option>
          </select>
        </div>
      </div>

      {/* Subscription List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No subscriptions found</p>
          <p className="text-sm mt-1">Add a subscription to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(sub => {
            const cat = getCategoryInfo(sub.category);
            const Icon = cat.icon;
            const daysLeft = sub.nextBilling ? Math.ceil((new Date(sub.nextBilling) - Date.now()) / 86400000) : null;
            return (
              <div key={sub.id || sub._id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{sub.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cat.label} • {sub.billingCycle}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sub.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : sub.status === 'paused' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {sub.status}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{(sub.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {sub.nextBilling ? `Next: ${new Date(sub.nextBilling).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No billing date'}
                      {daysLeft != null && daysLeft >= 0 && <span className="ml-1 text-amber-600">({daysLeft}d)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 pt-3 border-t border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggleStatus(sub)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title={sub.status === 'active' ? 'Pause' : 'Activate'}>
                    {sub.status === 'active' ? <RefreshCw className="w-4 h-4 text-amber-500" /> : <Check className="w-4 h-4 text-green-500" />}
                  </button>
                  <button onClick={() => { setEditingSub(sub); setShowAddModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="w-4 h-4 text-blue-500" /></button>
                  {sub.url && <a href={sub.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ExternalLink className="w-4 h-4 text-slate-500" /></a>}
                  <button onClick={() => handleDelete(sub)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ml-auto"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowAddModal(false); setEditingSub(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{editingSub ? 'Edit' : 'Add'} Subscription</h3>
              <button onClick={() => { setShowAddModal(false); setEditingSub(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <SubscriptionForm subscription={editingSub} onSave={handleSave} onCancel={() => { setShowAddModal(false); setEditingSub(null); }} />
          </div>
        </div>
      )}
    </div>
    </Wrapper>
  );
}
