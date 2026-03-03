// ============================================================================
// ENTERPRISE INVESTMENT AI ADVISOR
// ============================================================================
// Advanced AI-powered investment portfolio management with risk analysis,
// asset allocation, rebalancing suggestions, and market insights.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, Tooltip as RechartTooltip, CartesianGrid,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, Edit3, Trash2, AlertTriangle,
  CheckCircle2, Target, BrainCircuit, Sparkles, RefreshCw, Shield,
  DollarSign, Percent, BarChart3, ArrowUpRight, ArrowDownRight,
  Zap, PieChart as PieIcon, Briefcase, Activity, Star,
  ChevronRight, Info, Check, X, Calendar, IndianRupee, Layers,
  Lock, Unlock, Eye, LayoutGrid, List, Heart, CircleDot,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge, Shimmer,
  AnimatedNumber, ProgressRing, AnimatedTabs, EmptyState, StatusBadge,
  useAnimatedCounter, colorPalette, chartColors,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS & DATA
// ============================================================================

const ASSET_CLASSES = [
  { name: 'Equity', icon: '📈', color: '#3B82F6', risk: 'High', description: 'Stocks, mutual funds' },
  { name: 'Debt', icon: '📄', color: '#10B981', risk: 'Low', description: 'Bonds, FDs, PPF' },
  { name: 'Gold', icon: '🥇', color: '#F59E0B', risk: 'Medium', description: 'Physical, SGBs, Gold ETFs' },
  { name: 'Real Estate', icon: '🏠', color: '#8B5CF6', risk: 'Medium', description: 'Property, REITs' },
  { name: 'Cash', icon: '💵', color: '#6B7280', risk: 'Very Low', description: 'Savings, liquid funds' },
  { name: 'Crypto', icon: '₿', color: '#F43F5E', risk: 'Very High', description: 'Bitcoin, Ethereum' },
  { name: 'International', icon: '🌍', color: '#06B6D4', risk: 'High', description: 'US stocks, global funds' },
  { name: 'Alternatives', icon: '🎨', color: '#EC4899', risk: 'High', description: 'Art, commodities, P2P' },
];

const RISK_PROFILES = {
  conservative: { equity: 20, debt: 50, gold: 15, real_estate: 10, cash: 5, name: 'Conservative', color: '#10B981' },
  moderate: { equity: 40, debt: 30, gold: 10, real_estate: 10, cash: 10, name: 'Moderate', color: '#3B82F6' },
  aggressive: { equity: 60, debt: 15, gold: 10, real_estate: 10, cash: 5, name: 'Aggressive', color: '#F59E0B' },
  veryAggressive: { equity: 80, debt: 5, gold: 5, real_estate: 5, cash: 5, name: 'Very Aggressive', color: '#EF4444' },
};

const POPULAR_INSTRUMENTS = [
  { name: 'Nifty 50 Index Fund', category: 'Equity', risk: 'Medium', returns: '12-15%', minInvestment: 500 },
  { name: 'HDFC Mid Cap Fund', category: 'Equity', risk: 'High', returns: '15-20%', minInvestment: 500 },
  { name: 'PPF', category: 'Debt', risk: 'Very Low', returns: '7.1%', minInvestment: 500 },
  { name: 'Sovereign Gold Bond', category: 'Gold', risk: 'Low', returns: '8-10%', minInvestment: 1000 },
  { name: 'ELSS Tax Saver', category: 'Equity', risk: 'High', returns: '12-18%', minInvestment: 500 },
  { name: 'Liquid Fund', category: 'Cash', risk: 'Very Low', returns: '4-5%', minInvestment: 100 },
  { name: 'REIT Fund', category: 'Real Estate', risk: 'Medium', returns: '8-12%', minInvestment: 10000 },
  { name: 'US Equity Fund', category: 'International', risk: 'High', returns: '10-15%', minInvestment: 500 },
  { name: 'Corporate Bond Fund', category: 'Debt', risk: 'Low', returns: '7-9%', minInvestment: 1000 },
  { name: 'Multi-Asset Fund', category: 'Equity', risk: 'Medium', returns: '10-14%', minInvestment: 1000 },
];

// ============================================================================
// §2  SUB-COMPONENTS
// ============================================================================

const PortfolioCard = ({ holding, onEdit, onDelete }) => {
  const assetClass = ASSET_CLASSES.find(a => a.name === holding.assetClass) || ASSET_CLASSES[0];
  const gain = (holding.currentValue || 0) - (holding.investedAmount || 0);
  const gainPct = holding.investedAmount > 0 ? ((gain / holding.investedAmount) * 100).toFixed(1) : 0;
  const isPositive = gain >= 0;

  return (
    <AnimatedCard className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: assetClass.color + '15' }}>
            {assetClass.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{holding.name || holding.instrument}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{holding.assetClass}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && <button onClick={() => onEdit(holding)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 className="w-3.5 h-3.5 text-gray-400" /></button>}
          {onDelete && <button onClick={() => onDelete(holding._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Invested</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{(holding.investedAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{(holding.currentValue || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className={`mt-3 flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {isPositive ? '+' : ''}₹{Math.abs(gain).toLocaleString('en-IN')}
        <span className="text-xs ml-1">({isPositive ? '+' : ''}{gainPct}%)</span>
      </div>
    </AnimatedCard>
  );
};

const RiskMeter = ({ score }) => {
  const clamp = Math.max(0, Math.min(100, score || 50));
  const angle = -90 + (clamp / 100) * 180;
  const color = clamp <= 30 ? '#10B981' : clamp <= 60 ? '#F59E0B' : '#EF4444';
  const label = clamp <= 25 ? 'Low' : clamp <= 50 ? 'Moderate' : clamp <= 75 ? 'High' : 'Very High';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" className="dark:stroke-gray-700" />
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${Math.PI * 50}`} strokeDashoffset={`${Math.PI * 50 * (1 - clamp / 100)}`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <line x1="60" y1="60" x2={60 + 35 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 35 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2" strokeLinecap="round" style={{ transition: 'all 1s ease' }} />
        <circle cx="60" cy="60" r="4" fill={color} />
      </svg>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{label} Risk</p>
      <p className="text-xs text-gray-400">Score: {clamp}/100</p>
    </div>
  );
};

const InstrumentSuggestion = ({ instrument, onAdd }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
        style={{ backgroundColor: (ASSET_CLASSES.find(a => a.name === instrument.category) || {}).color + '15' || '#f0f0f0' }}>
        {(ASSET_CLASSES.find(a => a.name === instrument.category) || {}).icon || '📊'}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{instrument.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{instrument.category}</span>
          <span>·</span>
          <span className={instrument.risk === 'Very Low' || instrument.risk === 'Low' ? 'text-green-500' : instrument.risk === 'Medium' ? 'text-amber-500' : 'text-red-500'}>
            {instrument.risk}
          </span>
          <span>·</span>
          <span className="text-green-500">{instrument.returns}</span>
        </div>
      </div>
    </div>
    <button onClick={() => onAdd(instrument)}
      className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
      Explore
    </button>
  </div>
);

const AddHoldingModal = ({ open, onClose, onSave, editData }) => {
  const [form, setForm] = useState({ name: '', assetClass: 'Equity', investedAmount: '', currentValue: '', units: '', purchaseDate: '' });

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || editData.instrument || '',
        assetClass: editData.assetClass || 'Equity',
        investedAmount: (editData.investedAmount || '').toString(),
        currentValue: (editData.currentValue || '').toString(),
        units: (editData.units || '').toString(),
        purchaseDate: editData.purchaseDate ? new Date(editData.purchaseDate).toISOString().split('T')[0] : '',
      });
    } else {
      setForm({ name: '', assetClass: 'Equity', investedAmount: '', currentValue: '', units: '', purchaseDate: '' });
    }
  }, [editData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editData ? 'Edit Holding' : 'Add Investment'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, investedAmount: parseFloat(form.investedAmount) || 0, currentValue: parseFloat(form.currentValue) || 0, units: parseFloat(form.units) || 0, _id: editData?._id }); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Investment Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Nifty 50 Index Fund" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asset Class</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ASSET_CLASSES.map(a => (
                <button key={a.name} type="button" onClick={() => setForm(f => ({ ...f, assetClass: a.name }))}
                  className={`p-1.5 rounded-lg text-center text-[10px] border transition-all
                    ${form.assetClass === a.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                  <span className="block text-sm">{a.icon}</span>{a.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Invested (₹)</label>
              <input type="number" value={form.investedAmount} onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Current Value (₹)</label>
              <input type="number" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Units/Quantity</label>
              <input type="number" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                step="any" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center gap-2">
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

const EnterpriseInvestmentAdvisor = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [riskProfile, setRiskProfile] = useState('moderate');

  // ------- FETCH -------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [investRes] = await Promise.allSettled([
        api.get('/investments'),
      ]);
      const data = investRes.status === 'fulfilled'
        ? (investRes.value?.data?.data?.investments || investRes.value?.data?.data || investRes.value?.data?.investments || investRes.value?.data || [])
        : [];
      setHoldings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Investment fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------- DERIVED -------
  const portfolioStats = useMemo(() => {
    if (!holdings.length) return { totalInvested: 0, currentValue: 0, totalGain: 0, gainPct: 0, holdingsCount: 0, assetAllocation: [] };

    const totalInvested = holdings.reduce((s, h) => s + (h.investedAmount || 0), 0);
    const currentValue = holdings.reduce((s, h) => s + (h.currentValue || 0), 0);
    const totalGain = currentValue - totalInvested;
    const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;

    // Asset allocation
    const allocationMap = {};
    holdings.forEach(h => {
      const cls = h.assetClass || 'Other';
      if (!allocationMap[cls]) allocationMap[cls] = { name: cls, value: 0, invested: 0 };
      allocationMap[cls].value += h.currentValue || 0;
      allocationMap[cls].invested += h.investedAmount || 0;
    });

    const assetAllocation = Object.values(allocationMap).map(a => ({
      ...a,
      percentage: currentValue > 0 ? Math.round((a.value / currentValue) * 100) : 0,
    })).sort((a, b) => b.value - a.value);

    return { totalInvested, currentValue, totalGain, gainPct, holdingsCount: holdings.length, assetAllocation };
  }, [holdings]);

  const riskScore = useMemo(() => {
    if (!holdings.length) return 50;
    const riskWeights = { 'Very Low': 10, 'Low': 25, 'Medium': 50, 'High': 75, 'Very High': 95 };
    const totalValue = holdings.reduce((s, h) => s + (h.currentValue || 0), 0);
    if (totalValue <= 0) return 50;

    return Math.round(holdings.reduce((score, h) => {
      const cls = ASSET_CLASSES.find(a => a.name === h.assetClass);
      const weight = (h.currentValue || 0) / totalValue;
      return score + weight * (riskWeights[cls?.risk || 'Medium'] || 50);
    }, 0));
  }, [holdings]);

  const diversificationScore = useMemo(() => {
    if (!holdings.length) return 0;
    const totalValue = holdings.reduce((s, h) => s + (h.currentValue || 0), 0);
    if (totalValue <= 0) return 0;

    const weights = {};
    holdings.forEach(h => {
      const cls = h.assetClass || 'Other';
      weights[cls] = (weights[cls] || 0) + (h.currentValue || 0) / totalValue;
    });

    // Herfindahl index
    const hhi = Object.values(weights).reduce((s, w) => s + w * w, 0);
    const numClasses = Object.keys(weights).length;
    const minHHI = 1 / Math.max(numClasses, 1);
    const score = numClasses > 1 ? Math.round(((1 - hhi) / (1 - minHHI)) * 100) : 10;
    return Math.max(0, Math.min(100, score));
  }, [holdings]);

  const recommendations = useMemo(() => {
    const recs = [];
    const ideal = RISK_PROFILES[riskProfile];

    // Compare current allocation to ideal
    const current = {};
    const totalValue = portfolioStats.currentValue || 1;
    holdings.forEach(h => {
      const cls = h.assetClass || 'Other';
      current[cls] = ((current[cls] || 0) + (h.currentValue || 0)) / totalValue * 100;
    });

    if (portfolioStats.assetAllocation.length > 0) {
      const topAlloc = portfolioStats.assetAllocation[0];
      if (topAlloc.percentage > 70) {
        recs.push({
          title: `Portfolio heavily concentrated in ${topAlloc.name}`,
          message: `${topAlloc.percentage}% is in ${topAlloc.name}. Consider diversifying to reduce risk.`,
          type: 'warning',
          action: 'Diversify',
        });
      }
    }

    if (diversificationScore < 40 && holdings.length > 0) {
      recs.push({
        title: 'Low diversification detected',
        message: `Your diversification score is ${diversificationScore}/100. Add investments in different asset classes.`,
        type: 'warning',
      });
    }

    if (!current['Debt'] && holdings.length > 0) {
      recs.push({
        title: 'Consider adding debt instruments',
        message: 'PPF, bonds, or debt mutual funds can provide stability and guaranteed returns.',
        type: 'suggestion',
      });
    }

    if (!current['Gold'] && holdings.length > 0) {
      recs.push({
        title: 'Add gold for hedge',
        message: 'Gold acts as a hedge against inflation and market downturns. Consider SGBs or Gold ETFs.',
        type: 'suggestion',
      });
    }

    if (portfolioStats.totalGain > 0) {
      recs.push({
        title: 'Portfolio is performing well! ✨',
        message: `Your investments have grown by ₹${Math.round(portfolioStats.totalGain).toLocaleString('en-IN')} (${portfolioStats.gainPct}%). Keep investing regularly.`,
        type: 'success',
      });
    }

    if (holdings.length === 0) {
      recs.push({
        title: 'Start your investment journey',
        message: 'Add your existing investments or explore recommended instruments to build wealth over time.',
        type: 'info',
      });
    }

    return recs;
  }, [holdings, portfolioStats, riskProfile, diversificationScore]);

  // Rebalancing suggestions
  const rebalancingSuggestions = useMemo(() => {
    const ideal = RISK_PROFILES[riskProfile];
    if (!holdings.length || !portfolioStats.currentValue) return [];

    const current = {};
    holdings.forEach(h => {
      const cls = (h.assetClass || 'Other').toLowerCase().replace(/\s/g, '_');
      current[cls] = (current[cls] || 0) + (h.currentValue || 0);
    });

    const totalValue = portfolioStats.currentValue;
    const suggestions = [];

    Object.entries(ideal).filter(([k]) => k !== 'name' && k !== 'color').forEach(([cls, targetPct]) => {
      const currentAmt = current[cls] || 0;
      const currentPct = Math.round((currentAmt / totalValue) * 100);
      const diff = currentPct - targetPct;

      if (Math.abs(diff) > 5) {
        suggestions.push({
          assetClass: cls.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          currentPct,
          targetPct,
          diff,
          action: diff > 0 ? 'reduce' : 'increase',
          amount: Math.round(Math.abs(diff / 100) * totalValue),
        });
      }
    });

    return suggestions.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [holdings, portfolioStats, riskProfile]);

  // ------- HANDLERS -------
  const handleSave = useCallback(async (formData) => {
    try {
      if (formData._id) {
        await api.put(`/investments/${formData._id}`, formData);
      } else {
        await api.post('/investments', formData);
      }
      setShowModal(false);
      setEditData(null);
      fetchData();
    } catch (err) {
      console.error('Save investment error:', err);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Remove this investment?')) return;
    try {
      await api.delete(`/investments/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete investment error:', err);
    }
  }, [fetchData]);

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'advisor', label: 'AI Advisor', icon: <BrainCircuit className="w-4 h-4" />, badge: recommendations.length },
    { id: 'explore', label: 'Explore', icon: <Star className="w-4 h-4" /> },
  ];

  // ------- RENDER -------
  return (
    <MainLayout title="Investment Advisor" subtitle="AI-powered portfolio management">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 space-y-6">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-7 h-7 text-blue-500" />
                Investment Advisor
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {holdings.length} holdings · Risk score {riskScore}/100 · Diversification {diversificationScore}/100
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => { setEditData(null); setShowModal(true); }}
                className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-1.5 transition-colors">
                <Plus className="w-4 h-4" /> Add Investment
              </button>
            </div>
          </div>

          {/* ─── KPI CARDS ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Invested', value: portfolioStats.totalInvested, icon: IndianRupee, color: 'blue' },
              { label: 'Current Value', value: portfolioStats.currentValue, icon: Briefcase, color: 'purple' },
              { label: 'Total Gain/Loss', value: portfolioStats.totalGain, icon: portfolioStats.totalGain >= 0 ? TrendingUp : TrendingDown,
                color: portfolioStats.totalGain >= 0 ? 'green' : 'rose' },
              { label: 'Risk Score', value: riskScore, icon: Shield, color: riskScore <= 30 ? 'green' : riskScore <= 60 ? 'amber' : 'rose', suffix: '/100', noRupee: true },
              { label: 'Diversification', value: diversificationScore, icon: Layers, color: diversificationScore >= 60 ? 'green' : 'amber', suffix: '/100', noRupee: true },
            ].map((stat, i) => {
              const colors = colorPalette[stat.color] || colorPalette.blue;
              return (
                <AnimatedCard key={i} delay={i * 50} className={`p-4 rounded-2xl ${colors.bg} border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${colors.text}`}>
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

          {/* ─── PORTFOLIO TAB ─── */}
          {activeTab === 'portfolio' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} height={180} rounded="rounded-2xl" />)}
                  </div>
                ) : holdings.length === 0 ? (
                  <GlassCard className="p-12">
                    <EmptyState icon={Briefcase} title="No investments added" description="Track your portfolio by adding your investments"
                      action={() => { setEditData(null); setShowModal(true); }} actionLabel="Add First Investment" />
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {holdings.map((h, i) => (
                      <PortfolioCard key={h._id || i} holding={h}
                        onEdit={(data) => { setEditData(data); setShowModal(true); }}
                        onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar — Allocation */}
              <div className="space-y-4">
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Asset Allocation</h4>
                  {portfolioStats.assetAllocation.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={portfolioStats.assetAllocation} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            paddingAngle={2} dataKey="value" nameKey="name">
                            {portfolioStats.assetAllocation.map((d, i) => (
                              <Cell key={i} fill={(ASSET_CLASSES.find(a => a.name === d.name) || {}).color || chartColors[i]} />
                            ))}
                          </Pie>
                          <RechartTooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-3">
                        {portfolioStats.assetAllocation.map((d, i) => {
                          const cls = ASSET_CLASSES.find(a => a.name === d.name);
                          return (
                            <div key={d.name} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls?.color || chartColors[i] }} />
                              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{d.name}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">Add investments to see allocation</p>
                  )}
                </GlassCard>

                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Risk Assessment</h4>
                  <RiskMeter score={riskScore} />
                </GlassCard>
              </div>
            </div>
          )}

          {/* ─── ANALYSIS TAB ─── */}
          {activeTab === 'analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invested vs Current */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Invested vs Current Value</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={holdings.map(h => ({
                    name: (h.name || h.instrument || '').substring(0, 12),
                    invested: h.investedAmount || 0,
                    current: h.currentValue || 0,
                  }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                    <RechartTooltip content={<ChartTooltip />} />
                    <Bar dataKey="invested" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Invested" />
                    <Bar dataKey="current" fill="#10B981" radius={[4, 4, 0, 0]} name="Current" />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Risk Profile Radar */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Portfolio Risk Profile</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={ASSET_CLASSES.slice(0, 6).map(a => {
                    const alloc = portfolioStats.assetAllocation.find(al => al.name === a.name);
                    return { subject: a.name, value: alloc?.percentage || 0, fullMark: 100 };
                  })}>
                    <PolarGrid stroke={isDark ? '#374151' : '#E5E7EB'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar name="Allocation" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Rebalancing Suggestions */}
              <GlassCard className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rebalancing Suggestions</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Risk Profile:</span>
                    {Object.entries(RISK_PROFILES).map(([key, profile]) => (
                      <button key={key} onClick={() => setRiskProfile(key)}
                        className={`px-2 py-1 rounded-lg transition-colors ${riskProfile === key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                        {profile.name}
                      </button>
                    ))}
                  </div>
                </div>

                {rebalancingSuggestions.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm">Your portfolio is well-balanced for a {RISK_PROFILES[riskProfile].name} profile!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rebalancingSuggestions.map((s, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${s.action === 'increase' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                        <div className="flex items-center gap-3">
                          {s.action === 'increase' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {s.action === 'increase' ? 'Increase' : 'Reduce'} {s.assetClass}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Current: {s.currentPct}% → Target: {s.targetPct}%
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${s.action === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                          {s.action === 'increase' ? '+' : '-'}₹{s.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* ─── AI ADVISOR TAB ─── */}
          {activeTab === 'advisor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" /> AI Investment Insights
                </h3>
                {recommendations.map((rec, i) => (
                  <AnimatedCard key={i} delay={i * 60}
                    className={`p-4 rounded-xl border ${
                      rec.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                      rec.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                      'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        rec.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/50' :
                        rec.type === 'success' ? 'bg-green-100 dark:bg-green-900/50' :
                        'bg-blue-100 dark:bg-blue-900/50'}`}>
                        {rec.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                         rec.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                         <BrainCircuit className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.message}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Investment Rules */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" /> Investment Principles
                </h3>
                <GlassCard className="p-5 space-y-3">
                  {[
                    { title: 'Diversify across asset classes', desc: 'Don\'t put all eggs in one basket. Spread across equity, debt, gold.', icon: Layers },
                    { title: 'Start SIPs early', desc: 'Power of compounding works best with early and regular investments.', icon: Calendar },
                    { title: 'Emergency fund first', desc: 'Keep 6 months of expenses in liquid funds before aggressive investing.', icon: Shield },
                    { title: 'Review quarterly', desc: 'Rebalance your portfolio every quarter to maintain target allocation.', icon: RefreshCw },
                    { title: 'Tax-efficient investing', desc: 'Use ELSS for 80C benefit. Hold equity >1 year for LTCG tax advantage.', icon: Percent },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <rule.icon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{rule.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </div>
          )}

          {/* ─── EXPLORE TAB ─── */}
          {activeTab === 'explore' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" /> Recommended Instruments
                </h3>
                <div className="space-y-2">
                  {POPULAR_INSTRUMENTS.map((inst, i) => (
                    <InstrumentSuggestion key={i} instrument={inst}
                      onAdd={() => { setEditData({ name: inst.name, assetClass: inst.category, investedAmount: inst.minInvestment }); setShowModal(true); }} />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" /> Model Portfolios
                </h3>
                {Object.entries(RISK_PROFILES).map(([key, profile]) => (
                  <GlassCard key={key} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRiskProfile(key)}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{profile.name}</h4>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profile.color }} />
                    </div>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                      {Object.entries(profile).filter(([k]) => !['name', 'color'].includes(k)).map(([cls, pct]) => {
                        const assetInfo = ASSET_CLASSES.find(a => a.name.toLowerCase().replace(/\s/g, '_') === cls);
                        return (
                          <div key={cls} className="h-full" style={{
                            width: `${pct}%`,
                            backgroundColor: assetInfo?.color || '#6B7280',
                          }} />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(profile).filter(([k]) => !['name', 'color'].includes(k) && profile[k] > 0).map(([cls, pct]) => (
                        <span key={cls} className="text-[10px] text-gray-500 dark:text-gray-400">
                          {cls.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {pct}%
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>

        <AddHoldingModal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }}
          onSave={handleSave} editData={editData} />
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseInvestmentAdvisor;
