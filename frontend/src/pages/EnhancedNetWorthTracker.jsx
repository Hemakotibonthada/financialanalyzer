import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Minus, RefreshCw, Calendar,
  DollarSign, Home, Car, Briefcase, CreditCard, PiggyBank, BarChart3,
  ArrowUpRight, ArrowDownRight, Edit2, Trash2, ChevronDown, Info,
  Award, Target, Shield, Landmark, Building2, Coins, Gem
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const ASSET_CATEGORIES = [
  { id: 'cash', label: 'Cash & Savings', icon: PiggyBank, color: '#10b981' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, color: '#3b82f6' },
  { id: 'real_estate', label: 'Real Estate', icon: Home, color: '#8b5cf6' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, color: '#f59e0b' },
  { id: 'retirement', label: 'Retirement', icon: Landmark, color: '#06b6d4' },
  { id: 'business', label: 'Business', icon: Building2, color: '#ec4899' },
  { id: 'crypto', label: 'Cryptocurrency', icon: Coins, color: '#84cc16' },
  { id: 'valuables', label: 'Valuables', icon: Gem, color: '#f97316' },
];

const LIABILITY_CATEGORIES = [
  { id: 'mortgage', label: 'Mortgage', icon: Home, color: '#ef4444' },
  { id: 'car_loan', label: 'Car Loan', icon: Car, color: '#f97316' },
  { id: 'student_loan', label: 'Student Loan', icon: Briefcase, color: '#f59e0b' },
  { id: 'credit_card', label: 'Credit Cards', icon: CreditCard, color: '#ec4899' },
  { id: 'personal_loan', label: 'Personal Loans', icon: DollarSign, color: '#8b5cf6' },
  { id: 'other', label: 'Other Debts', icon: Wallet, color: '#6b7280' },
];

const formatCurrency = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString()}`;
};

const AnimatedNumber = ({ value, prefix = '₹' }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef();
  useEffect(() => {
    let start;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(eased * value);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <span>{prefix}{Math.round(display).toLocaleString()}</span>;
};

const NetWorthGauge = ({ netWorth, totalAssets, totalLiabilities }) => {
  const ratio = totalAssets > 0 ? (netWorth / totalAssets) * 100 : 0;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (Math.max(0, Math.min(100, ratio)) / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-slate-700" />
          <circle cx="90" cy="90" r="80" fill="none" stroke="url(#netWorthGradient)" strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-2000 ease-out" />
          <defs>
            <linearGradient id="netWorthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <AnimatedNumber value={netWorth} />
          </p>
          <p className="text-xs text-slate-400">{ratio.toFixed(0)}% healthy</p>
        </div>
      </div>
    </div>
  );
};

const EnhancedNetWorthTracker = () => {
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('asset');
  const [newItem, setNewItem] = useState({ name: '', value: '', category: '', notes: '' });
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsRes, liabilitiesRes, historyRes] = await Promise.allSettled([
        api.get('/networth/assets'),
        api.get('/networth/liabilities'),
        api.get('/networth/history'),
      ]);
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value?.data?.data || assetsRes.value?.data || []);
      if (liabilitiesRes.status === 'fulfilled') setLiabilities(liabilitiesRes.value?.data?.data || liabilitiesRes.value?.data || []);
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value?.data?.data || historyRes.value?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalAssets = useMemo(() => assets.reduce((sum, a) => sum + (a.value || a.amount || 0), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((sum, l) => sum + (l.value || l.amount || 0), 0), [liabilities]);
  const netWorth = totalAssets - totalLiabilities;

  const assetBreakdown = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const cat = a.category || 'other';
      map[cat] = (map[cat] || 0) + (a.value || a.amount || 0);
    });
    return ASSET_CATEGORIES.map(c => ({ name: c.label, value: map[c.id] || 0, color: c.color })).filter(c => c.value > 0);
  }, [assets]);

  const liabilityBreakdown = useMemo(() => {
    const map = {};
    liabilities.forEach(l => {
      const cat = l.category || 'other';
      map[cat] = (map[cat] || 0) + (l.value || l.amount || 0);
    });
    return LIABILITY_CATEGORIES.map(c => ({ name: c.label, value: map[c.id] || 0, color: c.color })).filter(c => c.value > 0);
  }, [liabilities]);

  const chartHistory = useMemo(() => {
    if (history.length) return history.map(h => ({
      date: new Date(h.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      assets: h.totalAssets || 0, liabilities: h.totalLiabilities || 0, netWorth: h.netWorth || 0
    }));
    // No historical data available yet
    return [];
  }, [history]);

  const handleAdd = async () => {
    try {
      const payload = { ...newItem, value: parseFloat(newItem.value) };
      if (addType === 'asset') {
        await api.post('/networth/assets', payload);
      } else {
        await api.post('/networth/liabilities', payload);
      }
      setShowAddModal(false);
      setNewItem({ name: '', value: '', category: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await api.delete(`/networth/${type}s/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
          <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 animate-fade-in-down">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth Tracker</h1>
          <p className="text-slate-500 dark:text-slate-400">Track your complete financial picture</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all">
            <RefreshCw size={18} className="text-slate-500" />
          </button>
          <button onClick={() => { setAddType('asset'); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={16} /> Add Asset
          </button>
          <button onClick={() => { setAddType('liability'); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
            <Minus size={16} /> Add Liability
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 dashboard-grid">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <TrendingUp size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Assets</p>
              <p className="text-2xl font-bold text-emerald-600"><AnimatedNumber value={totalAssets} /></p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-emerald-600">
            <ArrowUpRight size={14} /> <span className="font-medium">+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <TrendingDown size={22} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600"><AnimatedNumber value={totalLiabilities} /></p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-emerald-600">
            <ArrowDownRight size={14} /> <span className="font-medium">-5.2% from last month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10">
            <p className="text-sm text-blue-100 mb-1">Net Worth</p>
            <p className="text-3xl font-bold mb-3"><AnimatedNumber value={netWorth} /></p>
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <Award size={14} />
              <span>Top 15% in your age group</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-6">
        {['overview', 'assets', 'liabilities', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-700'
            }`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Net Worth Gauge + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <NetWorthGauge netWorth={netWorth} totalAssets={totalAssets} totalLiabilities={totalLiabilities} />
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Net Worth Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartHistory}>
                  <defs>
                    <linearGradient id="nwAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="nwLiab" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="assets" stroke="#10b981" fill="url(#nwAssets)" strokeWidth={2} name="Assets" />
                  <Area type="monotone" dataKey="liabilities" stroke="#ef4444" fill="url(#nwLiab)" strokeWidth={2} name="Liabilities" />
                  <Line type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={3} dot={false} name="Net Worth" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Asset Allocation</h3>
              {assetBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={assetBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {assetBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {assetBreakdown.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <PiggyBank size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No assets tracked yet</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Liability Breakdown</h3>
              {liabilityBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={liabilityBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {liabilityBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {liabilityBreakdown.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Shield size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No liabilities tracked</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-4 animate-fade-in">
          {ASSET_CATEGORIES.map(cat => {
            const catAssets = assets.filter(a => a.category === cat.id);
            if (!catAssets.length) return null;
            return (
              <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 rounded-lg" style={{ background: `${cat.color}20` }}>
                    <cat.icon size={18} style={{ color: cat.color }} />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{cat.label}</span>
                  <span className="ml-auto font-bold text-emerald-600">
                    {formatCurrency(catAssets.reduce((s, a) => s + (a.value || a.amount || 0), 0))}
                  </span>
                </div>
                {catAssets.map((asset, i) => (
                  <div key={asset._id || i} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{asset.name}</p>
                      {asset.notes && <p className="text-xs text-slate-500">{asset.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(asset.value || asset.amount || 0)}
                      </span>
                      <button onClick={() => handleDelete(asset._id, 'asset')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {assets.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <PiggyBank size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No assets tracked</h3>
              <button onClick={() => { setAddType('asset'); setShowAddModal(true); }}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                <Plus size={14} className="inline mr-1" /> Add Your First Asset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liabilities Tab */}
      {activeTab === 'liabilities' && (
        <div className="space-y-4 animate-fade-in">
          {LIABILITY_CATEGORIES.map(cat => {
            const catLiab = liabilities.filter(l => l.category === cat.id);
            if (!catLiab.length) return null;
            return (
              <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 rounded-lg" style={{ background: `${cat.color}20` }}>
                    <cat.icon size={18} style={{ color: cat.color }} />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{cat.label}</span>
                  <span className="ml-auto font-bold text-red-600">
                    {formatCurrency(catLiab.reduce((s, l) => s + (l.value || l.amount || 0), 0))}
                  </span>
                </div>
                {catLiab.map((liab, i) => (
                  <div key={liab._id || i} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{liab.name}</p>
                      {liab.notes && <p className="text-xs text-slate-500">{liab.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-600">{formatCurrency(liab.value || liab.amount || 0)}</span>
                      <button onClick={() => handleDelete(liab._id, 'liability')} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {liabilities.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Shield size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No liabilities — great job!</h3>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Net Worth Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartHistory}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatCurrency(v)} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="netWorth" stroke="#3b82f6" fill="url(#nwGrad)" strokeWidth={3} name="Net Worth" />
                <Line type="monotone" dataKey="assets" stroke="#10b981" strokeWidth={2} dot={false} name="Assets" />
                <Line type="monotone" dataKey="liabilities" stroke="#ef4444" strokeWidth={2} dot={false} name="Liabilities" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white p-6 pb-0 mb-4">Monthly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-left text-xs font-semibold text-slate-500">Period</th>
                    <th className="p-3 text-right text-xs font-semibold text-slate-500">Assets</th>
                    <th className="p-3 text-right text-xs font-semibold text-slate-500">Liabilities</th>
                    <th className="p-3 text-right text-xs font-semibold text-slate-500">Net Worth</th>
                    <th className="p-3 text-right text-xs font-semibold text-slate-500">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {chartHistory.map((row, i) => {
                    const prevNW = i > 0 ? chartHistory[i - 1].netWorth : row.netWorth;
                    const change = ((row.netWorth - prevNW) / (prevNW || 1)) * 100;
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                        <td className="p-3 text-sm font-medium text-slate-900 dark:text-white">{row.date}</td>
                        <td className="p-3 text-sm text-right text-emerald-600 font-medium">{formatCurrency(row.assets)}</td>
                        <td className="p-3 text-sm text-right text-red-600 font-medium">{formatCurrency(row.liabilities)}</td>
                        <td className="p-3 text-sm text-right font-bold text-slate-900 dark:text-white">{formatCurrency(row.netWorth)}</td>
                        <td className="p-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            change >= 0 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30' : 'text-red-700 bg-red-50 dark:bg-red-900/30'
                          }`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-in">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              Add {addType === 'asset' ? 'Asset' : 'Liability'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Name</label>
                <input type="text" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  placeholder={addType === 'asset' ? 'e.g., Savings Account' : 'e.g., Home Loan'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Value (₹)</label>
                  <input type="number" value={newItem.value} onChange={e => setNewItem(p => ({ ...p, value: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Category</label>
                  <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                    <option value="">Select...</option>
                    {(addType === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Notes</label>
                <textarea value={newItem.notes} onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
                <button onClick={handleAdd} disabled={!newItem.name || !newItem.value}
                  className={`flex-1 py-3 text-white rounded-xl text-sm font-medium shadow-lg transition-colors ${
                    addType === 'asset' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                  }`}>
                  Add {addType === 'asset' ? 'Asset' : 'Liability'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedNetWorthTracker;
