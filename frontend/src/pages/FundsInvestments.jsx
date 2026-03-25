import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp, TrendingDown, Plus, Edit3, Trash2, DollarSign, PieChart,
  BarChart3, Filter, Search, X, ArrowUpRight, ArrowDownRight, IndianRupee,
  Briefcase, Calendar, Target, ChevronDown, RefreshCw, Eye, Layers,
  Download, FileText, Share2, Percent, Clock, AlertTriangle, CheckCircle,
  Award, Zap, Activity, Shield, ArrowUp, ArrowDown, Copy, Printer,
  SortAsc, SortDesc, LayoutGrid, List, Info, Star, BookOpen, Hash, Users
} from 'lucide-react';
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const FUND_TYPES = [
  { value: 'mutual_fund', label: 'Mutual Fund', color: '#3b82f6', icon: '📊' },
  { value: 'etf', label: 'ETF', color: '#8b5cf6', icon: '📈' },
  { value: 'stock', label: 'Stock', color: '#10b981', icon: '📉' },
  { value: 'fd', label: 'Fixed Deposit', color: '#f59e0b', icon: '🏦' },
  { value: 'bond', label: 'Bond', color: '#06b6d4', icon: '📃' },
  { value: 'sip', label: 'SIP', color: '#ec4899', icon: '🔄' },
  { value: 'ppf', label: 'PPF', color: '#14b8a6', icon: '🏛️' },
  { value: 'nps', label: 'NPS', color: '#f97316', icon: '👴' },
  { value: 'elss', label: 'ELSS', color: '#6366f1', icon: '💰' },
  { value: 'gold', label: 'Gold', color: '#eab308', icon: '🥇' },
  { value: 'crypto', label: 'Crypto', color: '#a855f7', icon: '₿' },
  { value: 'real_estate', label: 'Real Estate', color: '#ef4444', icon: '🏠' },
  { value: 'rd', label: 'Recurring Deposit', color: '#22c55e', icon: '🔁' },
  { value: 'other', label: 'Other', color: '#64748b', icon: '📦' },
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

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtCompact = (val) => {
  const n = Number(val || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};
const fmtPct = (val) => `${Number(val || 0).toFixed(2)}%`;
const daysBetween = (d1, d2) => Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

const glassCard = (dk) => dk
  ? 'bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] hover:bg-white/[0.09]'
  : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.12)] hover:shadow-[0_8px_40px_rgba(31,38,135,0.18)] hover:bg-white/70';
const glassStatic = (dk) => dk
  ? 'bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
  : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.12)]';
const glassInner = (dk) => dk ? 'bg-white/5 backdrop-blur-sm' : 'bg-white/40 backdrop-blur-sm';
const inputCls = (dk) => dk
  ? 'bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-slate-400'
  : 'bg-white/50 backdrop-blur-sm border-white/40';

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════
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

const ProgressRing = ({ percent = 0, size = 48, stroke = 4, color = '#10b981', dk }) => {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={dk ? '#334155' : '#e5e7eb'} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c - (Math.min(percent, 100) / 100) * c}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} className="transition-all duration-700" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className={`text-[9px] font-bold ${dk ? 'fill-white' : 'fill-gray-900'}`}>{Math.round(percent)}%</text>
    </svg>
  );
};

const CustomTooltip = ({ active, payload, label, dk }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl text-xs shadow-lg border ${dk ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function FundsInvestments({ embedded = false }) {
  const { isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterType, setFilterType] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('currentValue');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedInvestments, setSelectedInvestments] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(null);
  const exportRef = useRef(null);

  // Funder state
  const [funders, setFunders] = useState([]);
  const [funderLoading, setFunderLoading] = useState(false);
  const [showFunderModal, setShowFunderModal] = useState(false);
  const [editFunder, setEditFunder] = useState(null);
  const [funderForm, setFunderForm] = useState({
    name: '', email: '', phone: '', company: '', type: 'angel', amount: '',
    equityPercentage: '', valuationAtInvestment: '', round: 'seed',
    investmentDate: new Date().toISOString().split('T')[0], instrumentType: 'equity',
    interestRate: '', maturityDate: '', boardSeat: false, status: 'received',
    amountReceived: '', notes: ''
  });

  const [formData, setFormData] = useState({
    type: 'mutual_fund', name: '', symbol: '', quantity: 1, purchasePrice: '',
    currentPrice: '', purchaseDate: new Date().toISOString().split('T')[0],
    category: 'equity', riskLevel: 'medium', maturityDate: '', notes: '',
    broker: '', folio: '', goal: ''
  });

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/investments');
      const data = res.data?.data || res.data;
      setInvestments(Array.isArray(data) ? data : []);
    } catch { setInvestments([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  // Fetch funders
  const fetchFunders = useCallback(async () => {
    setFunderLoading(true);
    try {
      const res = await api.get('/funders');
      const data = res.data?.data || res.data;
      setFunders(Array.isArray(data) ? data : []);
    } catch { setFunders([]); }
    finally { setFunderLoading(false); }
  }, []);

  useEffect(() => { fetchFunders(); }, [fetchFunders]);

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── ENRICHED DATA ────────────────────────────────────────────
  const enriched = useMemo(() => investments.map(i => {
    const invested = i.totalInvestedAmount || i.purchasePrice * i.quantity || 0;
    const currentValue = (i.currentPrice || i.purchasePrice) * i.quantity || 0;
    const gain = currentValue - invested;
    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
    const holdDays = i.purchaseDate ? daysBetween(new Date(i.purchaseDate), new Date()) : 0;
    const holdYears = holdDays / 365.25;
    const cagr = holdYears > 0 && invested > 0 ? (Math.pow(currentValue / invested, 1 / holdYears) - 1) * 100 : 0;
    const isLongTerm = holdDays > 365;
    const typeInfo = FUND_TYPES.find(f => f.value === i.type) || { label: 'Other', color: '#64748b', icon: '📦' };
    return { ...i, invested, currentValue, gain, gainPct, holdDays, holdYears, cagr, isLongTerm, typeInfo };
  }), [investments]);

  // ─── STATS ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalInvested = enriched.reduce((s, i) => s + i.invested, 0);
    const currentValue = enriched.reduce((s, i) => s + i.currentValue, 0);
    const totalGainLoss = currentValue - totalInvested;
    const overallReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const avgCagr = enriched.length > 0 ? enriched.reduce((s, i) => s + i.cagr, 0) / enriched.length : 0;
    const activeFunds = enriched.filter(i => i.status !== 'sold').length;
    const highRisk = enriched.filter(i => i.riskLevel === 'high').length;
    const longTerm = enriched.filter(i => i.isLongTerm).length;
    const topGainer = enriched.length > 0 ? enriched.reduce((best, i) => i.gainPct > best.gainPct ? i : best) : null;
    const topLoser = enriched.length > 0 ? enriched.reduce((worst, i) => i.gainPct < worst.gainPct ? i : worst) : null;
    const diversificationScore = Math.min(100, new Set(enriched.map(i => i.type)).size * 15 + new Set(enriched.map(i => i.category)).size * 10);
    return { totalInvested, currentValue, totalGainLoss, overallReturn, avgCagr, activeFunds, totalFunds: enriched.length,
      highRisk, longTerm, topGainer, topLoser, diversificationScore };
  }, [enriched]);

  // ─── CHART DATA ───────────────────────────────────────────────
  const typeAllocation = useMemo(() => {
    const g = {};
    enriched.forEach(i => {
      if (!g[i.type]) g[i.type] = { name: i.typeInfo.label, value: 0, invested: 0, count: 0, color: i.typeInfo.color };
      g[i.type].value += i.currentValue; g[i.type].invested += i.invested; g[i.type].count++;
    });
    return Object.values(g).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  }, [enriched]);

  const riskDistribution = useMemo(() => {
    const g = { low: 0, medium: 0, high: 0 };
    enriched.forEach(i => { g[i.riskLevel || 'medium'] += i.currentValue; });
    return RISK_LEVELS.map(r => ({ name: r.label, value: g[r.value], color: r.color })).filter(r => r.value > 0);
  }, [enriched]);

  const monthlyTrend = useMemo(() => {
    const months = {};
    enriched.forEach(i => {
      const d = new Date(i.purchaseDate || i.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { month: key, invested: 0, currentValue: 0, count: 0 };
      months[key].invested += i.invested; months[key].currentValue += i.currentValue; months[key].count++;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [enriched]);

  const gainLossDistribution = useMemo(() => {
    const ranges = [
      { label: '< -20%', min: -Infinity, max: -20, count: 0, color: '#ef4444' },
      { label: '-20 to -10%', min: -20, max: -10, count: 0, color: '#f97316' },
      { label: '-10 to 0%', min: -10, max: 0, count: 0, color: '#f59e0b' },
      { label: '0 to 10%', min: 0, max: 10, count: 0, color: '#84cc16' },
      { label: '10 to 25%', min: 10, max: 25, count: 0, color: '#22c55e' },
      { label: '> 25%', min: 25, max: Infinity, count: 0, color: '#10b981' },
    ];
    enriched.forEach(i => { const r = ranges.find(r => i.gainPct >= r.min && i.gainPct < r.max); if (r) r.count++; });
    return ranges.filter(r => r.count > 0);
  }, [enriched]);

  const categoryPerformance = useMemo(() => {
    const cats = {};
    enriched.forEach(i => {
      const c = i.category || 'other';
      if (!cats[c]) cats[c] = { name: CATEGORIES.find(x => x.value === c)?.label || c, invested: 0, currentValue: 0, count: 0 };
      cats[c].invested += i.invested; cats[c].currentValue += i.currentValue; cats[c].count++;
    });
    return Object.values(cats).map(c => ({ ...c, gain: c.currentValue - c.invested, returnPct: c.invested > 0 ? ((c.currentValue - c.invested) / c.invested * 100) : 0 })).sort((a, b) => b.currentValue - a.currentValue);
  }, [enriched]);

  const radarData = useMemo(() => {
    if (enriched.length === 0) return [];
    const riskScore = enriched.reduce((s, i) => s + (i.riskLevel === 'high' ? 3 : i.riskLevel === 'medium' ? 2 : 1), 0) / enriched.length;
    return [
      { metric: 'Diversification', value: stats.diversificationScore },
      { metric: 'Returns', value: Math.min(100, Math.max(0, stats.overallReturn + 50)) },
      { metric: 'Risk Mgmt', value: Math.max(0, 100 - riskScore * 25) },
      { metric: 'Consistency', value: enriched.filter(i => i.gain > 0).length / enriched.length * 100 },
      { metric: 'Long-term', value: (stats.longTerm / stats.totalFunds) * 100 },
      { metric: 'Volume', value: Math.min(100, stats.totalFunds * 10) },
    ];
  }, [enriched, stats]);

  const scatterData = useMemo(() => enriched.map(i => ({
    name: i.name, risk: i.riskLevel === 'high' ? 3 : i.riskLevel === 'medium' ? 2 : 1,
    returnPct: i.gainPct, value: i.currentValue, color: i.typeInfo.color
  })), [enriched]);

  // ─── FILTERED & SORTED ───────────────────────────────────────
  const filteredInvestments = useMemo(() => {
    let list = enriched.filter(i => {
      if (filterType !== 'all' && i.type !== filterType) return false;
      if (filterRisk !== 'all' && i.riskLevel !== filterRisk) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!i.name?.toLowerCase().includes(q) && !i.symbol?.toLowerCase().includes(q) && !i.typeInfo.label.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return mul * (a.name || '').localeCompare(b.name || '');
      if (sortField === 'gainPct') return mul * (a.gainPct - b.gainPct);
      if (sortField === 'invested') return mul * (a.invested - b.invested);
      if (sortField === 'holdDays') return mul * (a.holdDays - b.holdDays);
      return mul * (a.currentValue - b.currentValue);
    });
    return list;
  }, [enriched, filterType, filterRisk, filterCategory, searchQuery, sortField, sortDir]);

  // ─── ACTIONS ──────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const payload = { ...formData, quantity: parseFloat(formData.quantity) || 1, purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentPrice: parseFloat(formData.currentPrice) || parseFloat(formData.purchasePrice) || 0,
        totalInvestedAmount: (parseFloat(formData.quantity) || 1) * (parseFloat(formData.purchasePrice) || 0) };
      if (editItem) await api.put(`/investments/${editItem._id}`, payload);
      else await api.post('/investments', payload);
      setShowModal(false); setEditItem(null); resetForm(); fetchInvestments();
    } catch (err) { console.error('Save failed:', err); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ type: item.type || 'mutual_fund', name: item.name || '', symbol: item.symbol || '',
      quantity: item.quantity || 1, purchasePrice: item.purchasePrice || '', currentPrice: item.currentPrice || '',
      purchaseDate: item.purchaseDate?.split('T')[0] || '', category: item.category || 'equity', riskLevel: item.riskLevel || 'medium',
      maturityDate: item.maturityDate?.split('T')[0] || '', notes: item.notes || '', broker: item.broker || '', folio: item.folio || '', goal: item.goal || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this investment?')) return;
    try { await api.delete(`/investments/${id}`); fetchInvestments(); } catch (err) { console.error(err); }
  };

  const resetForm = () => setFormData({ type: 'mutual_fund', name: '', symbol: '', quantity: 1, purchasePrice: '', currentPrice: '',
    purchaseDate: new Date().toISOString().split('T')[0], category: 'equity', riskLevel: 'medium', maturityDate: '', notes: '', broker: '', folio: '', goal: '' });

  // Funder CRUD
  const handleSaveFunder = async () => {
    try {
      const payload = { ...funderForm, amount: parseFloat(funderForm.amount) || 0,
        equityPercentage: parseFloat(funderForm.equityPercentage) || 0,
        valuationAtInvestment: parseFloat(funderForm.valuationAtInvestment) || 0,
        amountReceived: parseFloat(funderForm.amountReceived) || parseFloat(funderForm.amount) || 0,
        interestRate: parseFloat(funderForm.interestRate) || 0 };
      if (editFunder) await api.put(`/funders/${editFunder._id}`, payload);
      else await api.post('/funders', payload);
      setShowFunderModal(false); setEditFunder(null); resetFunderForm(); fetchFunders();
    } catch (err) { console.error('Save funder failed:', err); }
  };

  const handleEditFunder = (f) => {
    setEditFunder(f);
    setFunderForm({ name: f.name || '', email: f.email || '', phone: f.phone || '', company: f.company || '',
      type: f.type || 'angel', amount: f.amount || '', equityPercentage: f.equityPercentage || '',
      valuationAtInvestment: f.valuationAtInvestment || '', round: f.round || 'seed',
      investmentDate: f.investmentDate?.split('T')[0] || '', instrumentType: f.instrumentType || 'equity',
      interestRate: f.interestRate || '', maturityDate: f.maturityDate?.split('T')[0] || '',
      boardSeat: f.boardSeat || false, status: f.status || 'received',
      amountReceived: f.amountReceived || '', notes: f.notes || '' });
    setShowFunderModal(true);
  };

  const handleDeleteFunder = async (id) => {
    if (!window.confirm('Delete this funder?')) return;
    try { await api.delete(`/funders/${id}`); fetchFunders(); } catch (err) { console.error(err); }
  };

  const resetFunderForm = () => setFunderForm({ name: '', email: '', phone: '', company: '', type: 'angel', amount: '',
    equityPercentage: '', valuationAtInvestment: '', round: 'seed',
    investmentDate: new Date().toISOString().split('T')[0], instrumentType: 'equity',
    interestRate: '', maturityDate: '', boardSeat: false, status: 'received', amountReceived: '', notes: '' });

  // Funder computed data
  const funderStats = useMemo(() => {
    const totalRaised = funders.reduce((s, f) => s + (f.amountReceived || f.amount || 0), 0);
    const totalCommitted = funders.reduce((s, f) => s + (f.amount || 0), 0);
    const totalEquity = funders.reduce((s, f) => s + (f.equityPercentage || 0), 0);
    return { totalRaised, totalCommitted, totalEquity, founderEquity: 100 - totalEquity, count: funders.length };
  }, [funders]);

  const toggleSelect = (id) => setSelectedInvestments(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelectedInvestments(new Set(filteredInvestments.map(i => i._id)));
  const clearSelection = () => setSelectedInvestments(new Set());

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedInvestments.size} investments?`)) return;
    for (const id of selectedInvestments) { try { await api.delete(`/investments/${id}`); } catch {} }
    clearSelection(); fetchInvestments();
  };

  // ─── EXPORT ───────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Name','Symbol','Type','Category','Risk','Qty','Buy Price','Current Price','Invested','Current Value','Gain/Loss','Return %','CAGR %','Purchase Date','Hold Days'];
    const rows = filteredInvestments.map(i => [i.name, i.symbol || '', i.typeInfo.label, i.category || '', i.riskLevel || '',
      i.quantity, i.purchasePrice, i.currentPrice || '', i.invested.toFixed(2), i.currentValue.toFixed(2),
      i.gain.toFixed(2), i.gainPct.toFixed(2), i.cagr.toFixed(2), i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString() : '', i.holdDays]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `investments_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportJSON = () => {
    const data = filteredInvestments.map(i => ({ name: i.name, symbol: i.symbol, type: i.type, category: i.category, riskLevel: i.riskLevel,
      quantity: i.quantity, purchasePrice: i.purchasePrice, currentPrice: i.currentPrice, invested: i.invested, currentValue: i.currentValue,
      gain: i.gain, returnPct: i.gainPct, cagr: i.cagr, purchaseDate: i.purchaseDate, holdDays: i.holdDays }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `investments_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportSummaryText = () => {
    const lines = ['═══ Investment Portfolio Summary ═══', `Date: ${new Date().toLocaleDateString()}`, `Total Invested: ${fmt(stats.totalInvested)}`,
      `Current Value: ${fmt(stats.currentValue)}`, `Total Gain/Loss: ${fmt(stats.totalGainLoss)} (${fmtPct(stats.overallReturn)})`,
      `Avg CAGR: ${fmtPct(stats.avgCagr)}`, `Holdings: ${stats.totalFunds} | Active: ${stats.activeFunds}`, '', '─── Holdings ───',
      ...filteredInvestments.map(i => `• ${i.name} | ${fmt(i.currentValue)} | ${i.gainPct >= 0 ? '+' : ''}${fmtPct(i.gainPct)}`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `investment_summary_${new Date().toISOString().split('T')[0]}.txt`; a.click(); URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Investment Report</title><style>body{font-family:system-ui;padding:40px;color:#1e293b}h1{color:#10b981;border-bottom:2px solid #10b981;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}th{background:#f0fdf4;font-weight:600}.g{color:#16a34a}.r{color:#dc2626}.s{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}.b{background:#f8fafc;padding:16px;border-radius:12px;text-align:center}.b h3{font-size:12px;color:#64748b;margin:0}.b p{font-size:24px;font-weight:700;margin:4px 0}</style></head><body>
      <h1>📊 Investment Portfolio Report</h1><p>Generated: ${new Date().toLocaleString()}</p>
      <div class="s"><div class="b"><h3>Invested</h3><p>${fmt(stats.totalInvested)}</p></div><div class="b"><h3>Current</h3><p>${fmt(stats.currentValue)}</p></div><div class="b"><h3>Gain/Loss</h3><p class="${stats.totalGainLoss >= 0 ? 'g' : 'r'}">${fmt(stats.totalGainLoss)}</p></div><div class="b"><h3>Return</h3><p class="${stats.overallReturn >= 0 ? 'g' : 'r'}">${fmtPct(stats.overallReturn)}</p></div></div>
      <table><thead><tr><th>Name</th><th>Type</th><th>Invested</th><th>Current</th><th>Gain/Loss</th><th>Return</th><th>CAGR</th></tr></thead>
      <tbody>${filteredInvestments.map(i => `<tr><td><strong>${i.name}</strong>${i.symbol ? ` (${i.symbol})` : ''}</td><td>${i.typeInfo.label}</td><td>${fmt(i.invested)}</td><td>${fmt(i.currentValue)}</td><td class="${i.gain >= 0 ? 'g' : 'r'}">${fmt(i.gain)}</td><td class="${i.gainPct >= 0 ? 'g' : 'r'}">${fmtPct(i.gainPct)}</td><td>${fmtPct(i.cagr)}</td></tr>`).join('')}</tbody></table></body></html>`);
    w.document.close(); w.print(); setShowExportMenu(false);
  };

  const copyToClipboard = () => {
    const text = filteredInvestments.map(i => `${i.name}\t${fmt(i.currentValue)}\t${i.gainPct >= 0 ? '+' : ''}${fmtPct(i.gainPct)}`).join('\n');
    navigator.clipboard.writeText(text); setShowExportMenu(false);
  };

  // ─── TABS ─────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'holdings', label: 'Holdings', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'funders', label: 'Funders', icon: Users },
    { id: 'insights', label: 'Insights', icon: Zap },
  ];

  const Wrapper = embedded ? React.Fragment : MainLayout;

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <Wrapper>
      <div className={`relative ${embedded ? '' : 'min-h-screen'} overflow-hidden`}>
        {!embedded && <div className="fixed inset-0 -z-10 pointer-events-none" style={{
          background: dk ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' : 'linear-gradient(135deg, #f0fdff 0%, #f8fafc 30%, #faf5ff 70%, #f0f9ff 100%)'
        }}>
          <svg className="absolute w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={dk ? '#0ea5e9' : '#67e8f9'} stopOpacity={dk ? '0.15' : '0.4'} /><stop offset="50%" stopColor={dk ? '#3b82f6' : '#60a5fa'} stopOpacity={dk ? '0.2' : '0.35'} /><stop offset="100%" stopColor={dk ? '#a855f7' : '#c084fc'} stopOpacity={dk ? '0.1' : '0.2'} /></linearGradient>
              <linearGradient id="wg2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor={dk ? '#06b6d4' : '#a5f3fc'} stopOpacity={dk ? '0.08' : '0.3'} /><stop offset="100%" stopColor={dk ? '#ec4899' : '#f0abfc'} stopOpacity={dk ? '0.06' : '0.15'} /></linearGradient>
            </defs>
            <path d="M0,600 C200,350 400,500 600,400 C800,300 1000,450 1200,350 C1350,280 1440,320 1440,320 L1440,900 L0,900 Z" fill="url(#wg1)" />
            <path d="M0,700 C300,500 500,600 720,480 C940,360 1100,500 1300,420 L1440,410 L1440,900 L0,900 Z" fill="url(#wg2)" />
            <path d="M0,400 C250,200 500,350 750,250 C1000,150 1200,280 1440,200 L1440,0 L0,0 Z" fill="url(#wg1)" opacity="0.3" />
          </svg>
          <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full ${dk ? 'bg-cyan-500/5' : 'bg-cyan-300/20'} blur-[120px]`} />
          <div className={`absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full ${dk ? 'bg-purple-500/5' : 'bg-purple-300/15'} blur-[100px]`} />
        </div>}

        <div className={`relative ${embedded ? 'p-2' : 'p-4 md:p-6'} max-w-[1600px] mx-auto space-y-5 ${dk ? 'text-white' : 'text-gray-900'}`}>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {!embedded && <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg"><TrendingUp className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-2xl font-bold">Funds & Investments</h1><p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Track, analyze & manage your portfolio</p></div>
          </div>}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedInvestments.size > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /> Delete {selectedInvestments.size}</button>
            )}
            <div className="relative" ref={exportRef}>
              <button onClick={() => setShowExportMenu(!showExportMenu)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${glassCard(dk)}`}><Download className="w-4 h-4" /> Export</button>
              {showExportMenu && (
                <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 ${dk ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-2xl`}>
                  {[{ label: 'Export CSV', icon: FileText, fn: exportCSV }, { label: 'Export JSON', icon: FileText, fn: exportJSON },
                    { label: 'Summary Report', icon: BookOpen, fn: exportSummaryText }, { label: 'Print Report', icon: Printer, fn: printReport },
                    { label: 'Copy to Clipboard', icon: Copy, fn: copyToClipboard }].map((item, idx) => (
                    <button key={idx} onClick={item.fn} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${dk ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <item.icon className="w-4 h-4" /> {item.label}</button>))}
                </div>
              )}
            </div>
            <button onClick={fetchInvestments} className={`p-2 rounded-xl transition-all ${glassCard(dk)}`}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium text-sm">
              <Plus className="w-4 h-4" /> Add Investment</button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total Invested" value={fmtCompact(stats.totalInvested)} icon={IndianRupee} color="blue" dk={dk} subtext={`${stats.totalFunds} holdings`} />
          <StatCard title="Current Value" value={fmtCompact(stats.currentValue)} icon={TrendingUp} color="emerald" dk={dk} subtext={`${stats.overallReturn >= 0 ? '+' : ''}${fmtPct(stats.overallReturn)}`} trend={stats.overallReturn} />
          <StatCard title="Gain / Loss" value={fmtCompact(Math.abs(stats.totalGainLoss))} icon={stats.totalGainLoss >= 0 ? ArrowUpRight : ArrowDownRight} color={stats.totalGainLoss >= 0 ? 'green' : 'red'} dk={dk} subtext={stats.totalGainLoss >= 0 ? 'Profit' : 'Loss'} trend={stats.totalGainLoss} />
          <StatCard title="Avg CAGR" value={fmtPct(stats.avgCagr)} icon={Percent} color="purple" dk={dk} subtext="Annualized" />
          <StatCard title="Diversification" value={`${stats.diversificationScore}/100`} icon={Shield} color="teal" dk={dk} subtext="Portfolio score" />
          <StatCard title="Long-term" value={`${stats.longTerm}/${stats.totalFunds}`} icon={Clock} color="orange" dk={dk} subtext="> 1 year held" />
        </div>

        {/* TABS */}
        <div className={`flex gap-1 p-1 rounded-2xl overflow-x-auto ${glassStatic(dk)}`}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? dk ? 'bg-white/10 text-white shadow-lg' : 'bg-white/80 text-gray-900 shadow-lg'
                : dk ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}</button>))}
        </div>

        {/* ══════ OVERVIEW ══════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4 text-blue-500" /> Asset Allocation</h3>
                {typeAllocation.length > 0 ? (<>
                  <ResponsiveContainer width="100%" height={240}>
                    <RePieChart><Pie data={typeAllocation} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value">
                      {typeAllocation.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><ReTooltip content={<CustomTooltip dk={dk} />} /></RePieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {typeAllocation.map((t, i) => (<div key={i} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className={`text-xs truncate ${dk ? 'text-slate-300' : 'text-gray-600'}`}>{t.name}</span><span className="text-xs font-semibold ml-auto">{fmtCompact(t.value)}</span></div>))}
                  </div>
                </>) : <div className={`h-64 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No investments yet</div>}
              </div>

              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Risk Allocation (by Value)</h3>
                {riskDistribution.length > 0 ? (<>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={riskDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} horizontal={false} />
                      <XAxis type="number" tickFormatter={v => fmtCompact(v)} tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 12 }} width={90} />
                      <ReTooltip content={<CustomTooltip dk={dk} />} /><Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                        {riskDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart>
                  </ResponsiveContainer>
                </>) : <div className={`h-64 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>}
              </div>
            </div>

            <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> Invested vs Current Value</h3>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyTrend}>
                    <defs><linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} /><XAxis dataKey="month" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                    <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} /><ReTooltip content={<CustomTooltip dk={dk} />} /><Legend />
                    <Area type="monotone" dataKey="invested" stroke="#3b82f6" fill="url(#gI)" strokeWidth={2} name="Invested" />
                    <Area type="monotone" dataKey="currentValue" stroke="#10b981" fill="url(#gC)" strokeWidth={2} name="Current Value" /></AreaChart>
                </ResponsiveContainer>
              ) : <div className={`h-48 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>}
            </div>

            {enriched.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.topGainer && <div className={`rounded-2xl p-4 ${glassCard(dk)}`}><div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-green-500" /><span className="text-sm font-semibold">Top Gainer</span></div>
                  <p className="font-bold truncate">{stats.topGainer.name}</p><p className="text-green-500 font-semibold text-lg">+{fmtPct(stats.topGainer.gainPct)}</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{fmt(stats.topGainer.gain)} profit</p></div>}
                {stats.topLoser && stats.topLoser.gainPct < 0 && <div className={`rounded-2xl p-4 ${glassCard(dk)}`}><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold">Biggest Loss</span></div>
                  <p className="font-bold truncate">{stats.topLoser.name}</p><p className="text-red-500 font-semibold text-lg">{fmtPct(stats.topLoser.gainPct)}</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{fmt(Math.abs(stats.topLoser.gain))} loss</p></div>}
                <div className={`rounded-2xl p-4 ${glassCard(dk)}`}><div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-teal-500" /><span className="text-sm font-semibold">Portfolio Health</span></div>
                  <div className="flex items-center gap-3"><ProgressRing percent={stats.diversificationScore} dk={dk} color="#14b8a6" /><div>
                    <p className="text-sm font-medium">{stats.diversificationScore >= 70 ? 'Well Diversified' : stats.diversificationScore >= 40 ? 'Moderate' : 'Needs Diversification'}</p>
                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{new Set(enriched.map(i => i.type)).size} types · {new Set(enriched.map(i => i.category)).size} categories</p></div></div></div>
              </div>
            )}
          </div>
        )}

        {/* ══════ HOLDINGS ══════ */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px] max-w-sm ${glassStatic(dk)}`}>
                <Search className="w-4 h-4 text-gray-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, symbol, type..."
                  className={`bg-transparent outline-none text-sm w-full ${dk ? 'text-white placeholder-slate-500' : 'placeholder-gray-400'}`} />
                {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2 rounded-xl text-sm ${glassStatic(dk)}`}><option value="all">All Types</option>{FUND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className={`px-3 py-2 rounded-xl text-sm ${glassStatic(dk)}`}><option value="all">All Risk</option>{RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`px-3 py-2 rounded-xl text-sm ${glassStatic(dk)}`}><option value="all">All Categories</option>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              <div className="flex items-center gap-1 ml-auto">
                <select value={sortField} onChange={e => setSortField(e.target.value)} className={`px-2 py-2 rounded-l-xl text-xs ${glassStatic(dk)}`}><option value="currentValue">Value</option><option value="gainPct">Returns</option><option value="invested">Invested</option><option value="name">Name</option><option value="holdDays">Hold Period</option></select>
                <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className={`p-2 rounded-r-xl ${glassStatic(dk)}`}>{sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}</button>
                <button onClick={() => setViewMode(v => v === 'cards' ? 'table' : 'cards')} className={`p-2 rounded-xl ml-1 ${glassStatic(dk)}`}>{viewMode === 'cards' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}</button>
              </div>
            </div>

            {filteredInvestments.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={selectedInvestments.size === filteredInvestments.length ? clearSelection : selectAll} className={`text-xs font-medium px-2 py-1 rounded-lg ${dk ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  {selectedInvestments.size === filteredInvestments.length ? 'Deselect All' : 'Select All'}</button>
                <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{filteredInvestments.length} results · Value: {fmtCompact(filteredInvestments.reduce((s, i) => s + i.currentValue, 0))}</span>
              </div>
            )}

            {loading ? <div className="flex justify-center py-16"><RefreshCw className="w-8 h-8 animate-spin text-emerald-500" /></div>
            : filteredInvestments.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center ${glassStatic(dk)}`}><Briefcase className={`w-12 h-12 mx-auto mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} /><p className={`text-lg font-medium mb-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>No investments found</p>
                <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4 inline mr-1" /> Add Investment</button></div>
            ) : viewMode === 'table' ? (
              <div className={`rounded-2xl overflow-hidden ${glassStatic(dk)}`}><div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className={dk ? 'bg-white/5' : 'bg-gray-50/50'}>
                  <th className="px-4 py-3 text-left w-8"><input type="checkbox" checked={selectedInvestments.size === filteredInvestments.length && filteredInvestments.length > 0} onChange={selectedInvestments.size === filteredInvestments.length ? clearSelection : selectAll} className="rounded" /></th>
                  <th className="px-4 py-3 text-left font-semibold">Investment</th><th className="px-4 py-3 text-right font-semibold">Invested</th><th className="px-4 py-3 text-right font-semibold">Current</th>
                  <th className="px-4 py-3 text-right font-semibold">Gain/Loss</th><th className="px-4 py-3 text-right font-semibold">Return</th><th className="px-4 py-3 text-right font-semibold">CAGR</th><th className="px-4 py-3 text-center font-semibold">Actions</th></tr></thead>
                <tbody>{filteredInvestments.map(inv => (
                  <tr key={inv._id} className={`border-t ${dk ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50/50'} transition-colors`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedInvestments.has(inv._id)} onChange={() => toggleSelect(inv._id)} className="rounded" /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-lg">{inv.typeInfo.icon}</span><div><p className="font-medium truncate max-w-[200px]">{inv.name}</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{inv.typeInfo.label} · {inv.quantity} units</p></div></div></td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCompact(inv.invested)}</td><td className="px-4 py-3 text-right font-medium">{fmtCompact(inv.currentValue)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${inv.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmtCompact(inv.gain)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${inv.gainPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>{inv.gainPct >= 0 ? '+' : ''}{fmtPct(inv.gainPct)}</td>
                    <td className={`px-4 py-3 text-right text-xs ${inv.cagr >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmtPct(inv.cagr)}</td>
                    <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1">
                      <button onClick={() => setShowDetailDrawer(inv)} className="p-1.5 rounded-lg hover:bg-white/10"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEdit(inv)} className="p-1.5 rounded-lg hover:bg-white/10"><Edit3 className="w-3.5 h-3.5 text-blue-500" /></button>
                      <button onClick={() => handleDelete(inv._id)} className="p-1.5 rounded-lg hover:bg-white/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></td></tr>))}</tbody></table></div></div>
            ) : (
              <div className="grid gap-3">{filteredInvestments.map(inv => (
                <div key={inv._id} className={`rounded-xl p-4 transition-all duration-300 ${glassCard(dk)} ${selectedInvestments.has(inv._id) ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input type="checkbox" checked={selectedInvestments.has(inv._id)} onChange={() => toggleSelect(inv._id)} className="rounded flex-shrink-0" />
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${inv.typeInfo.color}20` }}>{inv.typeInfo.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-semibold truncate">{inv.name}</h4>
                          {inv.symbol && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${dk ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{inv.symbol}</span>}
                          {inv.isLongTerm && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-semibold">LTCG</span>}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${inv.typeInfo.color}20`, color: inv.typeInfo.color }}>{inv.typeInfo.label}</span>
                          <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{inv.quantity} units @ {fmt(inv.purchasePrice)}</span>
                          <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>· {inv.holdDays}d held</span></div></div></div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="font-semibold">{fmtCompact(inv.currentValue)}</p>
                        <div className={`flex items-center gap-1 justify-end text-xs font-medium ${inv.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {inv.gain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {fmtCompact(Math.abs(inv.gain))} ({inv.gainPct >= 0 ? '+' : ''}{inv.gainPct.toFixed(1)}%)</div>
                        <p className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>CAGR: {fmtPct(inv.cagr)}</p></div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setShowDetailDrawer(inv)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Eye className="w-4 h-4 text-gray-400" /></button>
                        <button onClick={() => handleEdit(inv)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 text-blue-500" /></button>
                        <button onClick={() => handleDelete(inv._id)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Trash2 className="w-4 h-4 text-red-500" /></button></div></div></div></div>))}</div>
            )}
          </div>
        )}

        {/* ══════ ANALYTICS ══════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Return Distribution</h3>
                {gainLossDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}><BarChart data={gainLossDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} /><XAxis dataKey="label" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} /><ReTooltip content={<CustomTooltip dk={dk} />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Holdings">{gainLossDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer>
                ) : <div className={`h-56 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>}
              </div>
              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-purple-500" /> Category Performance</h3>
                {categoryPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}><BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} /><XAxis dataKey="name" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                    <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} /><ReTooltip content={<CustomTooltip dk={dk} />} /><Legend />
                    <Bar dataKey="invested" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Invested" /><Bar dataKey="currentValue" fill="#10b981" radius={[4, 4, 0, 0]} name="Current" /></BarChart></ResponsiveContainer>
                ) : <div className={`h-56 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {[{ title: 'Top 5 Performers', icon: TrendingUp, color: 'text-green-500', data: [...enriched].sort((a, b) => b.gainPct - a.gainPct).slice(0, 5) },
                { title: 'Bottom 5 Performers', icon: TrendingDown, color: 'text-red-500', data: [...enriched].sort((a, b) => a.gainPct - b.gainPct).slice(0, 5) }].map((section, si) => (
                <div key={si} className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                  <h3 className={`text-base font-semibold mb-3 flex items-center gap-2`}><section.icon className={`w-4 h-4 ${section.color}`} /> {section.title}</h3>
                  <div className="space-y-2">{section.data.map((inv, idx) => (
                    <div key={inv._id || idx} className={`flex items-center justify-between p-3 rounded-xl ${glassInner(dk)}`}>
                      <div className="flex items-center gap-2.5 min-w-0"><span className="text-sm">{inv.typeInfo.icon}</span><div className="min-w-0">
                        <p className="font-medium text-sm truncate">{inv.name}</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>CAGR: {fmtPct(inv.cagr)}</p></div></div>
                      <span className={`text-sm font-bold ${inv.gainPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>{inv.gainPct >= 0 ? '+' : ''}{fmtPct(inv.gainPct)}</span></div>))}
                    {enriched.length === 0 && <p className={`text-center py-6 text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</p>}</div></div>))}
            </div>
          </div>
        )}

        {/* ══════ PERFORMANCE ══════ */}
        {activeTab === 'performance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-teal-500" /> Portfolio Score</h3>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}><RadarChart data={radarData}><PolarGrid stroke={dk ? '#334155' : '#e5e7eb'} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} /><PolarRadiusAxis tick={{ fill: dk ? '#475569' : '#9ca3af', fontSize: 9 }} domain={[0, 100]} />
                    <Radar name="Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} /></RadarChart></ResponsiveContainer>
                ) : <div className={`h-64 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>Add investments to see score</div>}
              </div>
              <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Risk vs Return</h3>
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}><ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} />
                    <XAxis type="number" dataKey="risk" name="Risk" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} domain={[0.5, 3.5]} ticks={[1, 2, 3]} tickFormatter={v => v === 1 ? 'Low' : v === 2 ? 'Med' : 'High'} />
                    <YAxis type="number" dataKey="returnPct" name="Return%" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                    <ZAxis type="number" dataKey="value" range={[50, 400]} />
                    <ReTooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; const d = payload[0].payload;
                      return <div className={`px-3 py-2 rounded-xl text-xs shadow-lg border ${dk ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200'}`}><p className="font-semibold">{d.name}</p><p>Return: {fmtPct(d.returnPct)}</p><p>Value: {fmt(d.value)}</p></div>; }} />
                    <Scatter data={scatterData}>{scatterData.map((e, i) => <Cell key={i} fill={e.color} />)}</Scatter></ScatterChart></ResponsiveContainer>
                ) : <div className={`h-64 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>}
              </div>
            </div>
            <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Holding Period Analysis</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[{ label: '< 3 months', filter: i => i.holdDays < 90, color: '#ef4444' }, { label: '3–12 months', filter: i => i.holdDays >= 90 && i.holdDays < 365, color: '#f59e0b' },
                  { label: '1–3 years', filter: i => i.holdDays >= 365 && i.holdDays < 1095, color: '#10b981' }, { label: '3+ years', filter: i => i.holdDays >= 1095, color: '#3b82f6' }].map((b, idx) => {
                  const items = enriched.filter(b.filter); const val = items.reduce((s, i) => s + i.currentValue, 0);
                  const avgRet = items.length > 0 ? items.reduce((s, i) => s + i.gainPct, 0) / items.length : 0;
                  return <div key={idx} className={`p-4 rounded-xl ${glassInner(dk)}`}><div className="flex items-center gap-2 mb-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} /><span className="text-sm font-medium">{b.label}</span></div>
                    <p className="text-xl font-bold">{items.length}</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{fmtCompact(val)} · Avg: {avgRet >= 0 ? '+' : ''}{fmtPct(avgRet)}</p></div>; })}
              </div>
            </div>
          </div>
        )}

        {/* ══════ INSIGHTS ══════ */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Portfolio Insights</h3>
              <div className="space-y-3">
                {enriched.length === 0 ? <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Add investments to see insights</p> : (<>
                  {stats.highRisk > stats.totalFunds * 0.5 && <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-red-500 ${glassInner(dk)}`}><AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">High Risk Concentration</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{stats.highRisk} of {stats.totalFunds} holdings are high-risk. Consider rebalancing.</p></div></div>}
                  {stats.diversificationScore < 40 && <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-amber-500 ${glassInner(dk)}`}><AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">Low Diversification</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Score: {stats.diversificationScore}/100. Spread across more asset types.</p></div></div>}
                  {stats.overallReturn > 0 && <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-green-500 ${glassInner(dk)}`}><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">Positive Returns</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Portfolio up {fmtPct(stats.overallReturn)} with avg CAGR {fmtPct(stats.avgCagr)}.</p></div></div>}
                  {stats.overallReturn < -10 && <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-red-500 ${glassInner(dk)}`}><TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">Significant Loss</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Portfolio down {fmtPct(Math.abs(stats.overallReturn))}. Review underperformers.</p></div></div>}
                  {stats.longTerm > 0 && <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-teal-500 ${glassInner(dk)}`}><CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">LTCG Eligible</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{stats.longTerm} investment(s) qualify for long-term capital gains tax benefits.</p></div></div>}
                  <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border-indigo-500 ${glassInner(dk)}`}><Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium">Portfolio Summary</p><p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{stats.totalFunds} holdings across {new Set(enriched.map(i => i.type)).size} types. {enriched.filter(i => i.gain > 0).length} profitable, {enriched.filter(i => i.gain < 0).length} in loss. Avg hold: {enriched.length > 0 ? Math.round(enriched.reduce((s, i) => s + i.holdDays, 0) / enriched.length) : 0} days.</p></div></div>
                </>)}
              </div>
            </div>
            <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-purple-500" /> Detailed Category Analysis</h3>
              <div className="space-y-3">
                {categoryPerformance.map((cat, idx) => { const total = stats.currentValue || 1; return (
                  <div key={idx} className={`p-4 rounded-xl ${glassInner(dk)}`}>
                    <div className="flex items-center justify-between mb-2"><div><span className="text-sm font-semibold">{cat.name}</span><span className={`text-xs ml-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{cat.count} holdings</span></div>
                      <div className="text-right"><span className="text-sm font-bold">{fmtCompact(cat.currentValue)}</span><span className={`text-xs ml-2 font-medium ${cat.returnPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>{cat.returnPct >= 0 ? '+' : ''}{fmtPct(cat.returnPct)}</span></div></div>
                    <div className={`h-2.5 rounded-full overflow-hidden ${dk ? 'bg-slate-700' : 'bg-gray-200'}`}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.currentValue / total) * 100}%`, background: `linear-gradient(90deg, ${PIE_COLORS[idx % PIE_COLORS.length]}, ${PIE_COLORS[(idx + 1) % PIE_COLORS.length]})` }} /></div>
                    <div className="flex justify-between mt-1"><span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>Invested: {fmtCompact(cat.invested)}</span><span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{((cat.currentValue / total) * 100).toFixed(1)}% of portfolio</span></div></div>); })}
                {categoryPerformance.length === 0 && <p className={`text-center py-6 text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ FUNDERS TAB ══════ */}
        {activeTab === 'funders' && (
          <div className="space-y-5">
            {/* Funder Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard title="Total Raised" value={fmtCompact(funderStats.totalRaised)} icon={IndianRupee} color="emerald" dk={dk} subtext={`${funderStats.count} funders`} />
              <StatCard title="Committed" value={fmtCompact(funderStats.totalCommitted)} icon={Target} color="blue" dk={dk} subtext="Total pledged" />
              <StatCard title="Equity Given" value={`${funderStats.totalEquity.toFixed(1)}%`} icon={PieChart} color="purple" dk={dk} subtext={`${funderStats.founderEquity.toFixed(1)}% founder equity`} />
              <StatCard title="Active Funders" value={funderStats.count} icon={Users} color="orange" dk={dk} subtext="Investors" />
            </div>

            {/* Equity Split Donut */}
            {funders.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-500" /> Equity Distribution</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <RePieChart>
                      <Pie data={[
                        { name: 'Founders', value: funderStats.founderEquity, color: '#10b981' },
                        ...funders.filter(f => f.equityPercentage > 0).map(f => ({ name: f.name, value: f.equityPercentage, color: PIE_COLORS[funders.indexOf(f) % PIE_COLORS.length] }))
                      ]} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value">
                        {[{ color: '#10b981' }, ...funders.filter(f => f.equityPercentage > 0)].map((e, i) => <Cell key={i} fill={i === 0 ? '#10b981' : PIE_COLORS[(i - 1) % PIE_COLORS.length]} />)}
                      </Pie>
                      <ReTooltip content={<CustomTooltip dk={dk} />} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" /><span className={`text-xs ${dk ? 'text-slate-300' : 'text-gray-600'}`}>Founders</span><span className="text-xs font-semibold ml-auto">{funderStats.founderEquity.toFixed(1)}%</span></div>
                    {funders.filter(f => f.equityPercentage > 0).map((f, i) => (
                      <div key={f._id} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className={`text-xs truncate ${dk ? 'text-slate-300' : 'text-gray-600'}`}>{f.name}</span><span className="text-xs font-semibold ml-auto">{f.equityPercentage}%</span></div>
                    ))}
                  </div>
                </div>

                {/* Funding by Round */}
                <div className={`rounded-2xl p-5 ${glassCard(dk)}`}>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Funding by Round</h3>
                  {(() => {
                    const byRound = {};
                    funders.forEach(f => { const r = f.round || 'other'; if (!byRound[r]) byRound[r] = { name: r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), value: 0, count: 0 }; byRound[r].value += f.amountReceived || f.amount || 0; byRound[r].count++; });
                    const data = Object.values(byRound);
                    return data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} />
                          <XAxis dataKey="name" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                          <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                          <ReTooltip content={<CustomTooltip dk={dk} />} />
                          <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} name="Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className={`h-48 flex items-center justify-center text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>No data</div>;
                  })()}
                </div>
              </div>
            )}

            {/* Add Funder Button */}
            <div className="flex justify-end">
              <button onClick={() => { resetFunderForm(); setEditFunder(null); setShowFunderModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium text-sm">
                <Plus className="w-4 h-4" /> Add Funder / Investor
              </button>
            </div>

            {/* Funder List */}
            {funderLoading ? <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div>
            : funders.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center ${glassStatic(dk)}`}>
                <Users className={`w-12 h-12 mx-auto mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-lg font-medium mb-2 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>No funders yet</p>
                <p className={`text-sm mb-4 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>Track who invested in your company, how much, and the terms</p>
                <button onClick={() => { resetFunderForm(); setEditFunder(null); setShowFunderModal(true); }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4 inline mr-1" /> Add Funder</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {funders.map(f => {
                  const ROUND_COLORS = { pre_seed: '#94a3b8', seed: '#f59e0b', series_a: '#3b82f6', series_b: '#8b5cf6', series_c: '#6366f1', series_d: '#a855f7', bridge: '#06b6d4', debt: '#ef4444', grant: '#22c55e' };
                  const TYPE_LABELS = { angel: '👼 Angel', vc: '🏢 VC', pe: '💼 PE', family_office: '🏠 Family Office', corporate: '🏗️ Corporate', government: '🏛️ Govt', crowdfunding: '👥 Crowdfunding', personal: '👤 Personal', bank_loan: '🏦 Bank', other: '📦 Other' };
                  const STATUS_COLORS = { committed: 'text-amber-500 bg-amber-500/10', received: 'text-green-500 bg-green-500/10', partially_received: 'text-blue-500 bg-blue-500/10', converted: 'text-purple-500 bg-purple-500/10', exited: 'text-gray-500 bg-gray-500/10', defaulted: 'text-red-500 bg-red-500/10' };
                  return (
                    <div key={f._id} className={`rounded-xl p-4 transition-all duration-300 ${glassCard(dk)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${ROUND_COLORS[f.round] || '#64748b'}20` }}>
                            {TYPE_LABELS[f.type]?.split(' ')[0] || '📦'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{f.name}</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[f.status] || 'text-gray-500 bg-gray-500/10'}`}>{f.status?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {f.company && <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{f.company}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${ROUND_COLORS[f.round] || '#64748b'}20`, color: ROUND_COLORS[f.round] || '#64748b' }}>
                                {f.round?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                              <span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{TYPE_LABELS[f.type]?.split(' ').slice(1).join(' ')}</span>
                              {f.investmentDate && <span className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>· {new Date(f.investmentDate).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-lg">{fmtCompact(f.amountReceived || f.amount)}</p>
                            {f.equityPercentage > 0 && <p className={`text-xs font-medium text-purple-500`}>{f.equityPercentage}% equity</p>}
                            {f.instrumentType && <p className={`text-[10px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{f.instrumentType?.replace('_', ' ')}</p>}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleEditFunder(f)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 text-blue-500" /></button>
                            <button onClick={() => handleDeleteFunder(f._id)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Trash2 className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </div>
                      </div>
                      {f.notes && <p className={`text-xs mt-2 pl-14 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{f.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════ FUNDER MODAL ══════ */}
        {showFunderModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowFunderModal(false)}>
            <div className={`w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${dk ? 'bg-slate-800/90 backdrop-blur-2xl border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.5)]' : 'bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_60px_rgba(31,38,135,0.2)]'}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">{editFunder ? 'Edit Funder' : 'Add Funder / Investor'}</h2>
                <button onClick={() => setShowFunderModal(false)} className={`p-2 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}><X className="w-5 h-5" /></button></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Investor Name *</label><input value={funderForm.name} onChange={e => setFunderForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Company</label><input value={funderForm.company} onChange={e => setFunderForm(p => ({ ...p, company: e.target.value }))} placeholder="Sequoia Capital" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Email</label><input value={funderForm.email} onChange={e => setFunderForm(p => ({ ...p, email: e.target.value }))} type="email" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Phone</label><input value={funderForm.phone} onChange={e => setFunderForm(p => ({ ...p, phone: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Investor Type</label><select value={funderForm.type} onChange={e => setFunderForm(p => ({ ...p, type: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>
                    {[['angel','Angel'],['vc','VC'],['pe','Private Equity'],['family_office','Family Office'],['corporate','Corporate'],['government','Government'],['crowdfunding','Crowdfunding'],['personal','Personal'],['bank_loan','Bank Loan'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Round</label><select value={funderForm.round} onChange={e => setFunderForm(p => ({ ...p, round: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>
                    {[['pre_seed','Pre-Seed'],['seed','Seed'],['series_a','Series A'],['series_b','Series B'],['series_c','Series C'],['series_d','Series D'],['bridge','Bridge'],['debt','Debt'],['grant','Grant'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Amount ₹ *</label><input type="number" value={funderForm.amount} onChange={e => setFunderForm(p => ({ ...p, amount: e.target.value }))} min="0" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Equity %</label><input type="number" value={funderForm.equityPercentage} onChange={e => setFunderForm(p => ({ ...p, equityPercentage: e.target.value }))} min="0" max="100" step="0.1" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Valuation ₹</label><input type="number" value={funderForm.valuationAtInvestment} onChange={e => setFunderForm(p => ({ ...p, valuationAtInvestment: e.target.value }))} min="0" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Investment Date *</label><input type="date" value={funderForm.investmentDate} onChange={e => setFunderForm(p => ({ ...p, investmentDate: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Instrument</label><select value={funderForm.instrumentType} onChange={e => setFunderForm(p => ({ ...p, instrumentType: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>
                    {[['equity','Equity'],['convertible_note','Convertible Note'],['safe','SAFE'],['debt','Debt'],['revenue_share','Revenue Share'],['grant','Grant'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Status</label><select value={funderForm.status} onChange={e => setFunderForm(p => ({ ...p, status: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>
                    {[['committed','Committed'],['received','Received'],['partially_received','Partially Received'],['converted','Converted'],['exited','Exited'],['defaulted','Defaulted']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Amount Received ₹</label><input type="number" value={funderForm.amountReceived} onChange={e => setFunderForm(p => ({ ...p, amountReceived: e.target.value }))} min="0" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={funderForm.boardSeat} onChange={e => setFunderForm(p => ({ ...p, boardSeat: e.target.checked }))} className="rounded" />
                    <span className={`text-sm ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Board Seat</span></label>
                </div>
                <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Notes</label><textarea value={funderForm.notes} onChange={e => setFunderForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Investment terms, conditions..." className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputCls(dk)}`} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowFunderModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={handleSaveFunder} disabled={!funderForm.name || !funderForm.amount}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                  {editFunder ? 'Update' : 'Add Funder'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ MODAL ══════ */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className={`w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${dk ? 'bg-slate-800/90 backdrop-blur-2xl border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.5)]' : 'bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_60px_rgba(31,38,135,0.2)]'}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">{editItem ? 'Edit Investment' : 'Add Investment'}</h2>
                <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}><X className="w-5 h-5" /></button></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Type</label><select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>{FUND_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Category</label><select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                </div>
                <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Name *</label><input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HDFC Flexi Cap Fund" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Symbol</label><input value={formData.symbol} onChange={e => setFormData(p => ({ ...p, symbol: e.target.value }))} placeholder="HDFC" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Folio #</label><input value={formData.folio} onChange={e => setFormData(p => ({ ...p, folio: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Risk Level</label><select value={formData.riskLevel} onChange={e => setFormData(p => ({ ...p, riskLevel: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`}>{RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Qty *</label><input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} min="0" step="0.01" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Buy ₹ *</label><input type="number" value={formData.purchasePrice} onChange={e => setFormData(p => ({ ...p, purchasePrice: e.target.value }))} min="0" step="0.01" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Current ₹</label><input type="number" value={formData.currentPrice} onChange={e => setFormData(p => ({ ...p, currentPrice: e.target.value }))} min="0" step="0.01" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Purchase Date *</label><input type="date" value={formData.purchaseDate} onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Maturity Date</label><input type="date" value={formData.maturityDate} onChange={e => setFormData(p => ({ ...p, maturityDate: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Broker</label><input value={formData.broker} onChange={e => setFormData(p => ({ ...p, broker: e.target.value }))} placeholder="Zerodha" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Goal</label><input value={formData.goal} onChange={e => setFormData(p => ({ ...p, goal: e.target.value }))} placeholder="Retirement" className={`w-full px-3 py-2 rounded-xl border text-sm ${inputCls(dk)}`} /></div>
                </div>
                <div><label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Notes</label><textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes..." className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputCls(dk)}`} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={handleSave} disabled={!formData.name || !formData.purchasePrice} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">{editItem ? 'Update' : 'Add Investment'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ DETAIL DRAWER ══════ */}
        {showDetailDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowDetailDrawer(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className={`relative w-full max-w-md ${dk ? 'bg-slate-900' : 'bg-white'} shadow-2xl overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${dk ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <h3 className="text-lg font-semibold">Investment Details</h3><button onClick={() => setShowDetailDrawer(null)} className={`p-2 rounded-lg ${dk ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X className="w-5 h-5" /></button></div>
              <div className="px-6 py-5 space-y-5">
                {(() => { const e = enriched.find(x => x._id === showDetailDrawer._id) || showDetailDrawer; return (<>
                  <div className="text-center py-3">
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3" style={{ backgroundColor: `${e.typeInfo?.color || '#64748b'}15` }}>{e.typeInfo?.icon || '📦'}</div>
                    <h2 className="text-xl font-bold">{e.name}</h2>{e.symbol && <p className={`text-sm font-mono mt-1 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{e.symbol}</p>}
                    <p className="text-3xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mt-3">{fmt(e.currentValue)}</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ l: 'Invested', v: fmt(e.invested) }, { l: 'Gain/Loss', v: `${e.gain >= 0 ? '+' : ''}${fmt(e.gain)}`, c: e.gain >= 0 ? 'text-green-500' : 'text-red-500' },
                      { l: 'Return', v: `${e.gainPct >= 0 ? '+' : ''}${fmtPct(e.gainPct)}`, c: e.gainPct >= 0 ? 'text-green-500' : 'text-red-500' },
                      { l: 'CAGR', v: fmtPct(e.cagr), c: e.cagr >= 0 ? 'text-green-500' : 'text-red-500' },
                      { l: 'Quantity', v: e.quantity }, { l: 'Buy Price', v: fmt(e.purchasePrice) },
                      { l: 'Current Price', v: fmt(e.currentPrice || e.purchasePrice) }, { l: 'Hold Period', v: `${e.holdDays} days` }].map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-xl ${dk ? 'bg-slate-800' : 'bg-gray-50'}`}><p className={`text-[10px] font-medium uppercase ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{item.l}</p><p className={`text-sm font-semibold mt-0.5 ${item.c || ''}`}>{item.v}</p></div>))}
                  </div>
                  <div className={`p-4 rounded-xl space-y-2 ${dk ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    {[{ l: 'Type', v: e.typeInfo?.label }, { l: 'Category', v: e.category }, { l: 'Risk', v: e.riskLevel },
                      { l: 'Purchase Date', v: e.purchaseDate ? new Date(e.purchaseDate).toLocaleDateString() : '-' },
                      { l: 'Maturity', v: e.maturityDate ? new Date(e.maturityDate).toLocaleDateString() : '-' },
                      { l: 'Tax Status', v: e.isLongTerm ? 'LTCG Eligible' : 'STCG' }, { l: 'Broker', v: e.broker || '-' }, { l: 'Goal', v: e.goal || '-' }].map((item, idx) => (
                      <div key={idx} className="flex justify-between"><span className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{item.l}</span><span className="text-xs font-medium">{item.v}</span></div>))}
                  </div>
                  {e.notes && <div className={`p-3 rounded-xl text-sm ${dk ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-600'}`}><p className={`text-xs font-medium mb-1 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Notes</p>{e.notes}</div>}
                  <div className="flex gap-3">
                    <button onClick={() => { handleEdit(e); setShowDetailDrawer(null); }} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium"><Edit3 className="w-4 h-4 inline mr-1" /> Edit</button>
                    <button onClick={() => { handleDelete(e._id); setShowDetailDrawer(null); }} className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium"><Trash2 className="w-4 h-4 inline mr-1" /> Delete</button></div>
                </>); })()}
              </div>
            </div>
          </div>
        )}

      </div></div>
    </Wrapper>
  );
}
