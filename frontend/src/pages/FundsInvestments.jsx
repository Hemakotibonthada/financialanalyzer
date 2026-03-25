import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp, TrendingDown, Plus, Edit3, Trash2, DollarSign, PieChart,
  BarChart3, Filter, Search, X, ArrowUpRight, ArrowDownRight, IndianRupee,
  Briefcase, Calendar, Target, ChevronDown, RefreshCw, Eye, Layers
} from 'lucide-react';
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const FUND_TYPES = [
  { value: 'mutual_fund', label: 'Mutual Fund', color: '#3b82f6' },
  { value: 'etf', label: 'ETF', color: '#8b5cf6' },
  { value: 'stock', label: 'Stock', color: '#10b981' },
  { value: 'fd', label: 'Fixed Deposit', color: '#f59e0b' },
  { value: 'bond', label: 'Bond', color: '#06b6d4' },
  { value: 'sip', label: 'SIP', color: '#ec4899' },
  { value: 'ppf', label: 'PPF', color: '#14b8a6' },
  { value: 'nps', label: 'NPS', color: '#f97316' },
  { value: 'elss', label: 'ELSS', color: '#6366f1' },
  { value: 'gold', label: 'Gold', color: '#eab308' },
  { value: 'crypto', label: 'Crypto', color: '#a855f7' },
  { value: 'real_estate', label: 'Real Estate', color: '#ef4444' },
  { value: 'rd', label: 'Recurring Deposit', color: '#22c55e' },
  { value: 'other', label: 'Other', color: '#64748b' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: '#22c55e' },
  { value: 'medium', label: 'Medium Risk', color: '#f59e0b' },
  { value: 'high', label: 'High Risk', color: '#ef4444' },
];

const CATEGORIES = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#eab308', '#a855f7'];

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const formatPercent = (val) => `${Number(val || 0).toFixed(2)}%`;

// Glassmorphism card class helper
const glassCard = (dk) => dk
  ? 'bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] hover:bg-white/[0.09]'
  : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.12)] hover:shadow-[0_8px_40px_rgba(31,38,135,0.18)] hover:bg-white/70';

const glassCardStatic = (dk) => dk
  ? 'bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
  : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.12)]';

const StatCard = ({ title, value, subtext, icon: Icon, color, trend, dk }) => (
  <div className={`rounded-2xl p-5 transition-all duration-300 ${glassCard(dk)}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className={`text-sm font-medium ${dk ? 'text-slate-300' : 'text-gray-600'}`}>{title}</p>
        <p className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        {subtext && (
          <div className="flex items-center gap-1">
            {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500" /> : trend < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-red-500" /> : null}
            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : dk ? 'text-slate-400' : 'text-gray-500'}`}>{subtext}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl backdrop-blur-sm bg-${color}-100/70 dark:bg-${color}-900/30`}>
        <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
      </div>
    </div>
  </div>
);

export default function FundsInvestments() {
  const { isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterType, setFilterType] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    type: 'mutual_fund', name: '', symbol: '', quantity: 1, purchasePrice: '',
    currentPrice: '', purchaseDate: new Date().toISOString().split('T')[0],
    category: 'equity', riskLevel: 'medium', maturityDate: '', notes: ''
  });

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/investments');
      const data = res.data?.data || res.data;
      setInvestments(Array.isArray(data) ? data : []);
    } catch {
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  // Computed stats
  const stats = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + (i.totalInvestedAmount || i.purchasePrice * i.quantity || 0), 0);
    const currentValue = investments.reduce((s, i) => s + ((i.currentPrice || i.purchasePrice) * i.quantity || 0), 0);
    const totalGainLoss = currentValue - totalInvested;
    const overallReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const activeFunds = investments.filter(i => i.status !== 'sold').length;
    return { totalInvested, currentValue, totalGainLoss, overallReturn, activeFunds, totalFunds: investments.length };
  }, [investments]);

  // Type allocation for pie chart
  const typeAllocation = useMemo(() => {
    const grouped = {};
    investments.forEach(i => {
      const t = FUND_TYPES.find(f => f.value === i.type) || { label: 'Other', color: '#64748b' };
      const val = (i.currentPrice || i.purchasePrice) * i.quantity || 0;
      if (!grouped[i.type]) grouped[i.type] = { name: t.label, value: 0, color: t.color };
      grouped[i.type].value += val;
    });
    return Object.values(grouped).filter(g => g.value > 0);
  }, [investments]);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    const grouped = { low: 0, medium: 0, high: 0 };
    investments.forEach(i => { grouped[i.riskLevel || 'medium']++; });
    return RISK_LEVELS.map(r => ({ name: r.label, value: grouped[r.value], color: r.color })).filter(r => r.value > 0);
  }, [investments]);

  // Monthly investment trend
  const monthlyTrend = useMemo(() => {
    const months = {};
    investments.forEach(i => {
      const d = new Date(i.purchaseDate || i.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: key, invested: 0, count: 0 };
      months[key].invested += i.totalInvestedAmount || i.purchasePrice * i.quantity || 0;
      months[key].count++;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [investments]);

  // Filtered list
  const filteredInvestments = useMemo(() => {
    return investments.filter(i => {
      if (filterType !== 'all' && i.type !== filterType) return false;
      if (filterRisk !== 'all' && i.riskLevel !== filterRisk) return false;
      if (searchQuery && !i.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !i.symbol?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [investments, filterType, filterRisk, searchQuery]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity) || 1,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentPrice: parseFloat(formData.currentPrice) || parseFloat(formData.purchasePrice) || 0,
        totalInvestedAmount: (parseFloat(formData.quantity) || 1) * (parseFloat(formData.purchasePrice) || 0),
      };

      if (editItem) {
        await api.put(`/investments/${editItem._id}`, payload);
      } else {
        await api.post('/investments', payload);
      }
      setShowModal(false);
      setEditItem(null);
      resetForm();
      fetchInvestments();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      type: item.type || 'mutual_fund', name: item.name || '', symbol: item.symbol || '',
      quantity: item.quantity || 1, purchasePrice: item.purchasePrice || '',
      currentPrice: item.currentPrice || '', purchaseDate: item.purchaseDate?.split('T')[0] || '',
      category: item.category || 'equity', riskLevel: item.riskLevel || 'medium',
      maturityDate: item.maturityDate?.split('T')[0] || '', notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) return;
    try {
      await api.delete(`/investments/${id}`);
      fetchInvestments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'mutual_fund', name: '', symbol: '', quantity: 1, purchasePrice: '',
      currentPrice: '', purchaseDate: new Date().toISOString().split('T')[0],
      category: 'equity', riskLevel: 'medium', maturityDate: '', notes: ''
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'holdings', label: 'Holdings', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <MainLayout>
      {/* Wave gradient background — matches the provided image */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Background layer */}
        <div className="fixed inset-0 -z-10 pointer-events-none" style={{
          background: dk
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f0fdff 0%, #f8fafc 30%, #faf5ff 70%, #f0f9ff 100%)'
        }}>
          {/* Flowing wave SVG overlay */}
          <svg className="absolute w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={dk ? '#0ea5e9' : '#67e8f9'} stopOpacity={dk ? '0.15' : '0.4'} />
                <stop offset="40%" stopColor={dk ? '#3b82f6' : '#60a5fa'} stopOpacity={dk ? '0.2' : '0.35'} />
                <stop offset="70%" stopColor={dk ? '#6366f1' : '#818cf8'} stopOpacity={dk ? '0.15' : '0.3'} />
                <stop offset="100%" stopColor={dk ? '#a855f7' : '#c084fc'} stopOpacity={dk ? '0.1' : '0.2'} />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={dk ? '#06b6d4' : '#a5f3fc'} stopOpacity={dk ? '0.08' : '0.3'} />
                <stop offset="50%" stopColor={dk ? '#8b5cf6' : '#a78bfa'} stopOpacity={dk ? '0.12' : '0.2'} />
                <stop offset="100%" stopColor={dk ? '#ec4899' : '#f0abfc'} stopOpacity={dk ? '0.06' : '0.15'} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Primary wave */}
            <path d="M0,600 C200,350 400,500 600,400 C800,300 1000,450 1200,350 C1350,280 1440,320 1440,320 L1440,900 L0,900 Z"
              fill="url(#waveGrad1)" filter="url(#glow)" />
            {/* Secondary wave */}
            <path d="M0,700 C300,500 500,600 720,480 C940,360 1100,500 1300,420 C1380,390 1440,410 1440,410 L1440,900 L0,900 Z"
              fill="url(#waveGrad2)" />
            {/* Top accent wave */}
            <path d="M0,400 C250,200 500,350 750,250 C1000,150 1200,280 1440,200 L1440,0 L0,0 Z"
              fill="url(#waveGrad1)" opacity="0.3" />
          </svg>
          {/* Glossy light reflections */}
          <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full ${dk ? 'bg-cyan-500/5' : 'bg-cyan-300/20'} blur-[120px]`} />
          <div className={`absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full ${dk ? 'bg-purple-500/5' : 'bg-purple-300/15'} blur-[100px]`} />
          <div className={`absolute bottom-0 left-1/2 w-[700px] h-[400px] rounded-full ${dk ? 'bg-blue-500/5' : 'bg-blue-300/15'} blur-[120px]`} />
        </div>

        <div className={`relative p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 ${dk ? 'text-white' : 'text-gray-900'}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Funds & Investments</h1>
                <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Track, analyze & manage your investment portfolio</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchInvestments} className={`p-2.5 rounded-xl border transition-all hover:shadow ${glassCard(dk)}`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Add Investment
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={IndianRupee} color="blue" dk={dk} subtext={`${stats.totalFunds} investments`} />
          <StatCard title="Current Value" value={formatCurrency(stats.currentValue)} icon={TrendingUp} color="emerald" dk={dk}
            subtext={`${stats.overallReturn >= 0 ? '+' : ''}${formatPercent(stats.overallReturn)} returns`} trend={stats.overallReturn} />
          <StatCard title="Total Gain/Loss" value={formatCurrency(Math.abs(stats.totalGainLoss))} icon={stats.totalGainLoss >= 0 ? ArrowUpRight : ArrowDownRight}
            color={stats.totalGainLoss >= 0 ? 'green' : 'red'} dk={dk}
            subtext={stats.totalGainLoss >= 0 ? 'Profit' : 'Loss'} trend={stats.totalGainLoss} />
          <StatCard title="Active Holdings" value={stats.activeFunds} icon={Briefcase} color="purple" dk={dk} subtext="Active investments" />
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1.5 rounded-2xl ${glassCardStatic(dk)}`}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? dk ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'bg-white/80 text-gray-900 shadow-lg backdrop-blur-sm'
                  : `${dk ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'}`
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Allocation Pie */}
            <div className={`rounded-2xl p-6 transition-all duration-300 ${glassCard(dk)}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-500" /> Asset Allocation</h3>
              {typeAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie data={typeAllocation} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {typeAllocation.map((entry, idx) => <Cell key={idx} fill={entry.color || PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-64 flex items-center justify-center ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No investments yet</div>
              )}
            </div>

            {/* Risk Distribution */}
            <div className={`rounded-2xl p-6 transition-all duration-300 ${glassCard(dk)}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> Risk Distribution</h3>
              {riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={riskDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} />
                    <XAxis dataKey="name" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {riskDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-64 flex items-center justify-center ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>
              )}
            </div>

            {/* Monthly Investment Trend */}
            <div className={`rounded-2xl p-6 col-span-1 lg:col-span-2 transition-all duration-300 ${glassCard(dk)}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-500" /> Investment Trend</h3>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} />
                    <XAxis dataKey="month" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend />
                    <Line type="monotone" dataKey="invested" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Invested" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-48 flex items-center justify-center ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No investment history</div>
              )}
            </div>
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${glassCardStatic(dk)}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search investments..."
                  className={`bg-transparent outline-none text-sm w-48 ${dk ? 'text-white placeholder-slate-500' : 'placeholder-gray-400'}`} />
                {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm ${glassCardStatic(dk)}`}>
                <option value="all">All Types</option>
                {FUND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm ${glassCardStatic(dk)}`}>
                <option value="all">All Risk</option>
                {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Investment Cards */}
            {loading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredInvestments.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center ${glassCardStatic(dk)}`}>
                <Briefcase className={`w-12 h-12 mx-auto mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-lg font-medium mb-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>No investments found</p>
                <p className={`text-sm mb-4 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>Start by adding your first investment</p>
                <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4 inline mr-1" /> Add Investment
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredInvestments.map(inv => {
                  const invested = inv.totalInvestedAmount || inv.purchasePrice * inv.quantity || 0;
                  const current = (inv.currentPrice || inv.purchasePrice) * inv.quantity || 0;
                  const gain = current - invested;
                  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                  const typeInfo = FUND_TYPES.find(f => f.value === inv.type) || { label: 'Other', color: '#64748b' };

                  return (
                    <div key={inv._id} className={`rounded-xl p-4 transition-all duration-300 ${glassCard(dk)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: typeInfo.color }}>
                            {inv.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{inv.name}</h4>
                              {inv.symbol && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${dk ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{inv.symbol}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>{typeInfo.label}</span>
                              <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{inv.quantity} units</span>
                              {inv.purchaseDate && <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>· {new Date(inv.purchaseDate).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(current)}</p>
                            <div className={`flex items-center gap-1 justify-end text-xs font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {gain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {formatCurrency(Math.abs(gain))} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(inv)} className={`p-2 rounded-lg transition-colors ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                              <Edit3 className="w-4 h-4 text-blue-500" />
                            </button>
                            <button onClick={() => handleDelete(inv._id)} className={`p-2 rounded-lg transition-colors ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className={`rounded-2xl p-6 transition-all duration-300 ${glassCard(dk)}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Top Performers</h3>
              <div className="space-y-3">
                {investments
                  .map(i => ({ ...i, gain: ((i.currentPrice || i.purchasePrice) - i.purchasePrice) / i.purchasePrice * 100 }))
                  .sort((a, b) => b.gain - a.gain)
                  .slice(0, 5)
                  .map((inv, idx) => (
                    <div key={inv._id || idx} className={`flex items-center justify-between p-3 rounded-xl ${dk ? 'bg-white/5 backdrop-blur-sm' : 'bg-white/40 backdrop-blur-sm'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${dk ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>{idx + 1}</span>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">{inv.name}</p>
                          <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{FUND_TYPES.find(f => f.value === inv.type)?.label}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${inv.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {inv.gain >= 0 ? '+' : ''}{inv.gain.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                {investments.length === 0 && <p className={`text-center py-8 text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No investments to analyze</p>}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className={`rounded-2xl p-6 transition-all duration-300 ${glassCard(dk)}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-500" /> Category Breakdown</h3>
              <div className="space-y-3">
                {(() => {
                  const cats = {};
                  investments.forEach(i => {
                    const c = i.category || 'other';
                    const val = (i.currentPrice || i.purchasePrice) * i.quantity || 0;
                    if (!cats[c]) cats[c] = { name: CATEGORIES.find(x => x.value === c)?.label || c, value: 0, count: 0 };
                    cats[c].value += val;
                    cats[c].count++;
                  });
                  const total = Object.values(cats).reduce((s, c) => s + c.value, 0);
                  return Object.values(cats).sort((a, b) => b.value - a.value).map((cat, idx) => (
                    <div key={idx} className={`p-3 rounded-xl ${dk ? 'bg-white/5 backdrop-blur-sm' : 'bg-white/40 backdrop-blur-sm'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-sm font-semibold">{formatCurrency(cat.value)}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                          style={{ width: `${total > 0 ? (cat.value / total) * 100 : 0}%` }} />
                      </div>
                      <p className={`text-xs mt-1 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{cat.count} holdings · {total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0}%</p>
                    </div>
                  ));
                })()}
                {investments.length === 0 && <p className={`text-center py-8 text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data to display</p>}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className={`w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${dk ? 'bg-slate-800/90 backdrop-blur-2xl border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.5)]' : 'bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_60px_rgba(31,38,135,0.2)]'}`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editItem ? 'Edit Investment' : 'Add Investment'}</h2>
                <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Type</label>
                    <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`}>
                      {FUND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Category</label>
                    <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Name *</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HDFC Flexi Cap Fund"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-slate-400' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Symbol</label>
                    <input value={formData.symbol} onChange={e => setFormData(p => ({ ...p, symbol: e.target.value }))} placeholder="e.g. HDFCFLEXICAP"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-slate-400' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Risk Level</label>
                    <select value={formData.riskLevel} onChange={e => setFormData(p => ({ ...p, riskLevel: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`}>
                      {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Quantity *</label>
                    <input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} min="0" step="0.01"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Buy Price (₹) *</label>
                    <input type="number" value={formData.purchasePrice} onChange={e => setFormData(p => ({ ...p, purchasePrice: e.target.value }))} min="0" step="0.01"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Current Price (₹)</label>
                    <input type="number" value={formData.currentPrice} onChange={e => setFormData(p => ({ ...p, currentPrice: e.target.value }))} min="0" step="0.01"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Purchase Date *</label>
                    <input type="date" value={formData.purchaseDate} onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Maturity Date</label>
                    <input type="date" value={formData.maturityDate} onChange={e => setFormData(p => ({ ...p, maturityDate: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes..."
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${dk ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-slate-400' : 'bg-white/50 backdrop-blur-sm border-white/40'}`} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!formData.name || !formData.purchasePrice}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all">
                  {editItem ? 'Update' : 'Add Investment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
}
