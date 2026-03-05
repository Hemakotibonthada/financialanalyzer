import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, LineChart,
  Target, Shield, AlertTriangle, CheckCircle, Clock, ArrowUpRight,
  ArrowDownRight, Wallet, Building2, Gem, Globe, Briefcase, RefreshCw,
  Download, Filter, Calendar, ChevronRight, Star, Award, Zap,
  Activity, Eye, EyeOff, Lock, Unlock, Info, HelpCircle, Settings,
  Plus, Minus, Edit3, Trash2, Copy, Share2, ExternalLink, Layers,
  BarChart2, Percent, Hash, CreditCard, Banknote, Landmark, CircleDollarSign,
  ArrowUp, ArrowDown, MoreVertical, X, Check, Search, Bell, BookOpen
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  WEALTH MANAGEMENT DASHBOARD - Comprehensive Wealth Tracking & Analysis
// ═══════════════════════════════════════════════════════════════════════════════

const ASSET_CATEGORIES = {
  cash: { label: 'Cash & Savings', icon: Wallet, color: '#10B981', gradient: 'from-emerald-500 to-teal-600' },
  stocks: { label: 'Stocks & Equities', icon: TrendingUp, color: '#3B82F6', gradient: 'from-blue-500 to-indigo-600' },
  bonds: { label: 'Bonds & Fixed Income', icon: Shield, color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600' },
  realEstate: { label: 'Real Estate', icon: Building2, color: '#F59E0B', gradient: 'from-amber-500 to-orange-600' },
  crypto: { label: 'Cryptocurrency', icon: Gem, color: '#EC4899', gradient: 'from-pink-500 to-rose-600' },
  commodities: { label: 'Commodities & Gold', icon: CircleDollarSign, color: '#EAB308', gradient: 'from-yellow-500 to-amber-600' },
  mutualFunds: { label: 'Mutual Funds', icon: Layers, color: '#06B6D4', gradient: 'from-cyan-500 to-blue-600' },
  retirement: { label: 'Retirement Accounts', icon: Landmark, color: '#14B8A6', gradient: 'from-teal-500 to-emerald-600' },
  insurance: { label: 'Insurance Policies', icon: Shield, color: '#6366F1', gradient: 'from-indigo-500 to-violet-600' },
  alternative: { label: 'Alternative Investments', icon: Globe, color: '#D946EF', gradient: 'from-fuchsia-500 to-pink-600' },
  business: { label: 'Business Equity', icon: Briefcase, color: '#0EA5E9', gradient: 'from-sky-500 to-blue-600' },
  other: { label: 'Other Assets', icon: MoreVertical, color: '#64748B', gradient: 'from-slate-500 to-gray-600' }
};

const LIABILITY_CATEGORIES = {
  mortgage: { label: 'Mortgage', icon: Building2, color: '#EF4444' },
  carLoan: { label: 'Car Loan', icon: CreditCard, color: '#F97316' },
  studentLoan: { label: 'Student Loan', icon: BookOpen, color: '#A855F7' },
  creditCard: { label: 'Credit Card Debt', icon: CreditCard, color: '#DC2626' },
  personalLoan: { label: 'Personal Loan', icon: Banknote, color: '#E11D48' },
  businessLoan: { label: 'Business Loan', icon: Briefcase, color: '#BE123C' },
  other: { label: 'Other Liabilities', icon: MoreVertical, color: '#64748B' }
};

const TIME_RANGES = [
  { key: '1W', label: '1 Week', days: 7 },
  { key: '1M', label: '1 Month', days: 30 },
  { key: '3M', label: '3 Months', days: 90 },
  { key: '6M', label: '6 Months', days: 180 },
  { key: '1Y', label: '1 Year', days: 365 },
  { key: '3Y', label: '3 Years', days: 1095 },
  { key: '5Y', label: '5 Years', days: 1825 },
  { key: 'ALL', label: 'All Time', days: 0 }
];

const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 10000000).toFixed(2)}Cr`;
  if (absAmount >= 100000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 100000).toFixed(2)}L`;
  if (absAmount >= 1000) return `${amount < 0 ? '-' : ''}₹${(absAmount / 1000).toFixed(1)}K`;
  return `${amount < 0 ? '-' : ''}₹${absAmount.toFixed(0)}`;
};

const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const calculateCAGR = (startValue, endValue, years) => {
  if (!startValue || !years || startValue <= 0) return 0;
  return ((Math.pow(endValue / startValue, 1 / years) - 1) * 100);
};

const calculateSharpeRatio = (returns, riskFreeRate = 6) => {
  if (!returns || returns.length === 0) return 0;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  return stdDev === 0 ? 0 : (avgReturn - riskFreeRate) / stdDev;
};

const calculateMaxDrawdown = (values) => {
  if (!values || values.length === 0) return 0;
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
};

// ─── WealthOverviewCard ──────────────────────────────────────────────────────

const WealthOverviewCard = ({ data, palette, onRefresh, refreshing }) => {
  const [showValues, setShowValues] = useState(true);
  const totalAssets = data?.totalAssets || 0;
  const totalLiabilities = data?.totalLiabilities || 0;
  const netWorth = totalAssets - totalLiabilities;
  const monthlyChange = data?.monthlyChange || 0;
  const yearlyReturn = data?.yearlyReturn || 0;
  const wealthScore = data?.wealthScore || 0;

  return (
    <div className={`${palette.card} rounded-2xl border p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full transform translate-x-1/3 -translate-y-1/3" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${palette.text}`}>Wealth Overview</h2>
            <p className={`text-sm ${palette.textSub} mt-1`}>Your complete financial picture</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowValues(!showValues)} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder} transition-all`} title={showValues ? 'Hide values' : 'Show values'}>
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={onRefresh} disabled={refreshing} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder} transition-all ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mb-8">
          <p className={`text-sm font-medium ${palette.textSub} mb-1`}>Net Worth</p>
          <div className="flex items-baseline gap-3">
            <h1 className={`text-4xl font-bold ${palette.text}`}>{showValues ? formatCurrency(netWorth) : '••••••'}</h1>
            <span className={`flex items-center gap-1 text-sm font-medium ${monthlyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {monthlyChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {showValues ? formatPercent(monthlyChange) : '••'}
              <span className={`${palette.textMuted} ml-1`}>this month</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className={`text-sm font-medium ${palette.textSub}`}>Total Assets</span>
            </div>
            <p className="text-2xl font-bold text-emerald-500">{showValues ? formatCurrency(totalAssets) : '••••••'}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className={`text-sm font-medium ${palette.textSub}`}>Total Liabilities</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{showValues ? formatCurrency(totalLiabilities) : '••••••'}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Annual Return', value: formatPercent(yearlyReturn), color: yearlyReturn >= 0 ? 'text-emerald-500' : 'text-red-500' },
            { label: 'Wealth Score', value: `${wealthScore}/100`, color: wealthScore >= 70 ? 'text-emerald-500' : wealthScore >= 40 ? 'text-amber-500' : 'text-red-500' },
            { label: 'Debt-to-Asset', value: totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}%` : '0%', color: (totalLiabilities / (totalAssets || 1)) < 0.4 ? 'text-emerald-500' : 'text-amber-500' },
            { label: 'Liquidity', value: data?.liquidityRatio ? `${data.liquidityRatio.toFixed(1)}x` : '0x', color: (data?.liquidityRatio || 0) >= 3 ? 'text-emerald-500' : 'text-amber-500' }
          ].map((stat, i) => (
            <div key={i} className={`${palette.card} rounded-xl border p-3 text-center`}>
              <p className={`text-xs font-medium ${palette.textMuted} mb-1`}>{stat.label}</p>
              <p className={`text-lg font-bold ${showValues ? stat.color : palette.text}`}>{showValues ? stat.value : '••'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── AssetAllocationChart ────────────────────────────────────────────────────

const AssetAllocationChart = ({ assets, palette }) => {
  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + (a.currentValue || 0), 0), [assets]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    assets.forEach(asset => {
      const cat = asset.category || 'other';
      if (!breakdown[cat]) breakdown[cat] = { ...ASSET_CATEGORIES[cat] || ASSET_CATEGORIES.other, value: 0, count: 0, items: [] };
      breakdown[cat].value += asset.currentValue || 0;
      breakdown[cat].count += 1;
      breakdown[cat].items.push(asset);
    });
    return Object.entries(breakdown)
      .map(([key, data]) => ({ ...data, key, percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [assets, totalValue]);

  const donutSegments = useMemo(() => {
    const segments = [];
    let currentAngle = -90;
    categoryBreakdown.forEach((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const r = 80;
      const cx = 100, cy = 100;
      segments.push({
        ...cat,
        d: `M ${cx + r * Math.cos(startRad)} ${cy + r * Math.sin(startRad)} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endRad)} ${cy + r * Math.sin(endRad)} L ${cx} ${cy} Z`,
      });
      currentAngle = endAngle;
    });
    return segments;
  }, [categoryBreakdown]);

  const [hoveredSegment, setHoveredSegment] = useState(null);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-bold ${palette.text}`}>Asset Allocation</h3>
        <span className={`text-sm ${palette.textSub}`}>{assets.length} assets</span>
      </div>
      <div className="flex items-start gap-6">
        <div className="relative flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {donutSegments.map((seg, i) => (
              <path key={i} d={seg.d} fill={seg.color} opacity={hoveredSegment === i ? 1 : 0.85} stroke={palette.text === 'text-white' ? '#1e293b' : '#fff'} strokeWidth="2" onMouseEnter={() => setHoveredSegment(i)} onMouseLeave={() => setHoveredSegment(null)} className="transition-opacity duration-200 cursor-pointer" />
            ))}
            <text x="100" y="92" textAnchor="middle" className={`text-xs fill-current ${palette.textSub}`} style={{ fontSize: '11px' }}>Total</text>
            <text x="100" y="112" textAnchor="middle" className={`font-bold fill-current ${palette.text}`} style={{ fontSize: '14px' }}>{formatCurrency(totalValue)}</text>
          </svg>
        </div>
        <div className="flex-1 space-y-2 max-h-[200px] overflow-y-auto">
          {categoryBreakdown.map((cat, i) => (
            <div key={cat.key} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${hoveredSegment === i ? (palette.text === 'text-white' ? 'bg-slate-700/50' : 'bg-gray-100') : ''}`} onMouseEnter={() => setHoveredSegment(i)} onMouseLeave={() => setHoveredSegment(null)}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className={`text-sm ${palette.text}`}>{cat.label}</span>
                <span className={`text-xs ${palette.textMuted}`}>({cat.count})</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${palette.text}`}>{formatCurrency(cat.value)}</span>
                <span className={`text-xs ${palette.textMuted} ml-2`}>{cat.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── WealthGrowthTimeline ────────────────────────────────────────────────────

const WealthGrowthTimeline = ({ history, palette, timeRange, onTimeRangeChange }) => {
  const [tooltipData, setTooltipData] = useState(null);
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const tr = TIME_RANGES.find(t => t.key === timeRange);
    if (!tr || tr.days === 0) return history;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - tr.days);
    return history.filter(h => new Date(h.date) >= cutoff);
  }, [history, timeRange]);

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return { points: [], minY: 0, maxY: 0, width: 800, height: 200 };
    const values = filteredHistory.map(h => h.netWorth || 0);
    const minY = Math.min(...values) * 0.95;
    const maxY = Math.max(...values) * 1.05;
    const range = maxY - minY || 1;
    const width = 800, height = 200;
    const points = filteredHistory.map((h, i) => ({
      x: (i / (filteredHistory.length - 1 || 1)) * width,
      y: height - ((h.netWorth - minY) / range) * height,
      date: h.date, netWorth: h.netWorth, assets: h.totalAssets, liabilities: h.totalLiabilities
    }));
    return { points, minY, maxY, width, height };
  }, [filteredHistory]);

  const pathD = useMemo(() => {
    if (chartData.points.length < 2) return '';
    return chartData.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartData]);

  const areaD = useMemo(() => {
    if (chartData.points.length < 2) return '';
    return pathD + ` L ${chartData.points[chartData.points.length - 1].x} ${chartData.height} L ${chartData.points[0].x} ${chartData.height} Z`;
  }, [pathD, chartData]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${palette.text}`}>Wealth Growth</h3>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: palette.text === 'text-white' ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)' }}>
          {TIME_RANGES.map(tr => (
            <button key={tr.key} onClick={() => onTimeRangeChange(tr.key)} className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${timeRange === tr.key ? 'bg-blue-500 text-white shadow-sm' : `${palette.textSub} hover:bg-opacity-20`}`}>{tr.key}</button>
          ))}
        </div>
      </div>
      {filteredHistory.length > 1 ? (
        <div className="relative">
          <svg width="100%" height="220" viewBox={`0 0 ${chartData.width} ${chartData.height + 20}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#wealthGrad)" />
            <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {chartData.points.filter((_, i) => i % Math.max(1, Math.floor(chartData.points.length / 20)) === 0).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" className="cursor-pointer" onMouseEnter={() => setTooltipData(p)} onMouseLeave={() => setTooltipData(null)} />
            ))}
          </svg>
          {tooltipData && (
            <div className={`absolute z-10 ${palette.card} border rounded-lg p-3 shadow-xl pointer-events-none text-sm`} style={{ left: Math.min(tooltipData.x, chartData.width - 180), top: tooltipData.y - 80 }}>
              <p className={`font-medium ${palette.text}`}>{new Date(tooltipData.date).toLocaleDateString()}</p>
              <p className="text-blue-500 font-bold">{formatCurrency(tooltipData.netWorth)}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48"><p className={palette.textMuted}>Not enough data to display chart</p></div>
      )}
    </div>
  );
};

// ─── AssetDetailCard ─────────────────────────────────────────────────────────

const AssetDetailCard = ({ asset, palette, onEdit, onDelete }) => {
  const catInfo = ASSET_CATEGORIES[asset.category] || ASSET_CATEGORIES.other;
  const Icon = catInfo.icon;
  const change = asset.currentValue - (asset.purchasePrice || asset.currentValue);
  const changePercent = asset.purchasePrice > 0 ? ((change / asset.purchasePrice) * 100) : 0;

  return (
    <div className={`${palette.card} rounded-xl border p-4 group hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catInfo.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className={`font-semibold ${palette.text}`}>{asset.name}</h4>
            <p className={`text-xs ${palette.textMuted}`}>{catInfo.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(asset)} className={`p-1.5 rounded-lg ${palette.btnBg} border ${palette.btnBorder}`}><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(asset)} className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={`text-xl font-bold ${palette.text}`}>{formatCurrency(asset.currentValue)}</span>
          <span className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {change >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {formatPercent(changePercent)}
          </span>
        </div>
        {asset.purchasePrice && (
          <div className="flex justify-between text-xs">
            <span className={palette.textMuted}>Cost Basis</span>
            <span className={palette.textSub}>{formatCurrency(asset.purchasePrice)}</span>
          </div>
        )}
        {asset.institution && (
          <div className="flex justify-between text-xs">
            <span className={palette.textMuted}>Institution</span>
            <span className={palette.textSub}>{asset.institution}</span>
          </div>
        )}
      </div>
      {asset.purchasePrice > 0 && (
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${change >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, Math.abs(changePercent))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LiabilityCard ───────────────────────────────────────────────────────────

const LiabilityCard = ({ liability, palette, onEdit, onDelete }) => {
  const catInfo = LIABILITY_CATEGORIES[liability.category] || LIABILITY_CATEGORIES.other;
  const Icon = catInfo.icon;
  const progress = liability.originalAmount > 0 ? ((liability.originalAmount - liability.currentBalance) / liability.originalAmount) * 100 : 0;

  return (
    <div className={`${palette.card} rounded-xl border p-4 group hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className={`font-semibold ${palette.text}`}>{liability.name}</h4>
            <p className={`text-xs ${palette.textMuted}`}>{catInfo.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(liability)} className={`p-1.5 rounded-lg ${palette.btnBg} border ${palette.btnBorder}`}><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(liability)} className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-red-500">{formatCurrency(liability.currentBalance)}</span>
          {liability.interestRate && <span className={`text-sm ${palette.textMuted}`}>{liability.interestRate}% APR</span>}
        </div>
        {liability.monthlyPayment && (
          <div className="flex justify-between text-xs">
            <span className={palette.textMuted}>Monthly Payment</span>
            <span className={palette.textSub}>{formatCurrency(liability.monthlyPayment)}</span>
          </div>
        )}
        {liability.remainingTerm && (
          <div className="flex justify-between text-xs">
            <span className={palette.textMuted}>Remaining Term</span>
            <span className={palette.textSub}>{liability.remainingTerm} months</span>
          </div>
        )}
      </div>
      {liability.originalAmount > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={palette.textMuted}>{progress.toFixed(0)}% paid off</span>
            <span className={palette.textMuted}>{formatCurrency(liability.originalAmount - liability.currentBalance)} paid</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── WealthInsightsPanel ─────────────────────────────────────────────────────

const WealthInsightsPanel = ({ data, palette }) => {
  const insights = useMemo(() => {
    if (!data) return [];
    const result = [];
    const dta = data.totalAssets > 0 ? (data.totalLiabilities / data.totalAssets) : 0;
    if (dta > 0.5) {
      result.push({ type: 'warning', icon: AlertTriangle, title: 'High Debt-to-Asset Ratio', description: `Your debt-to-asset ratio is ${(dta * 100).toFixed(1)}%. Consider reducing liabilities to below 40% of total assets.`, action: 'Review Debt Strategy', actionUrl: '/debt-management' });
    } else if (dta < 0.2) {
      result.push({ type: 'success', icon: CheckCircle, title: 'Excellent Debt Management', description: `Your debt-to-asset ratio is only ${(dta * 100).toFixed(1)}%. You have strong financial health.`, action: 'Explore Investments', actionUrl: '/investments' });
    }
    if (data.emergencyFundMonths !== undefined) {
      if (data.emergencyFundMonths < 3) {
        result.push({ type: 'error', icon: AlertTriangle, title: 'Insufficient Emergency Fund', description: `You have ${data.emergencyFundMonths.toFixed(1)} months of expenses saved. Aim for 6+ months.`, action: 'Build Emergency Fund', actionUrl: '/emergency-fund' });
      } else if (data.emergencyFundMonths >= 6) {
        result.push({ type: 'success', icon: CheckCircle, title: 'Strong Emergency Fund', description: `You have ${data.emergencyFundMonths.toFixed(1)} months of expenses saved.` });
      }
    }
    if (data.savingsRate !== undefined) {
      if (data.savingsRate < 10) {
        result.push({ type: 'error', icon: Wallet, title: 'Low Savings Rate', description: `Your savings rate is ${data.savingsRate.toFixed(1)}%. Aim for 20%+.`, action: 'Optimize Budget', actionUrl: '/budget-planner' });
      } else if (data.savingsRate >= 30) {
        result.push({ type: 'success', icon: Wallet, title: 'Excellent Savings Rate', description: `You're saving ${data.savingsRate.toFixed(1)}% of your income. Outstanding!` });
      }
    }
    if (data.yearlyReturn !== undefined) {
      const benchmark = 12;
      if (data.yearlyReturn > benchmark) {
        result.push({ type: 'success', icon: TrendingUp, title: 'Outperforming Benchmark', description: `Your portfolio returned ${data.yearlyReturn.toFixed(1)}% vs benchmark ${benchmark}%.`, action: 'View Analytics', actionUrl: '/portfolio-analytics' });
      }
    }
    if (data.taxSavings !== undefined && data.taxSavings > 0) {
      result.push({ type: 'info', icon: Percent, title: 'Tax Saving Opportunity', description: `You could save up to ${formatCurrency(data.taxSavings)} through tax-optimized investments.`, action: 'Explore Tax Savings', actionUrl: '/tax-planner' });
    }
    return result;
  }, [data]);

  const typeColors = {
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' }
  };

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Wealth Insights</h3>
      </div>
      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const colors = typeColors[insight.type] || typeColors.info;
            const InsightIcon = insight.icon;
            return (
              <div key={i} className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
                <div className="flex items-start gap-3">
                  <InsightIcon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${colors.text}`}>{insight.title}</h4>
                    <p className={`text-sm mt-1 ${palette.textSub}`}>{insight.description}</p>
                    {insight.action && (
                      <a href={insight.actionUrl} className="text-sm font-medium text-blue-500 hover:text-blue-600 mt-2 inline-flex items-center gap-1">
                        {insight.action} <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className={`font-medium ${palette.text}`}>Looking Great!</p>
          <p className={`text-sm ${palette.textMuted} mt-1`}>No critical wealth insights at this time</p>
        </div>
      )}
    </div>
  );
};

// ─── RiskAnalysisPanel ───────────────────────────────────────────────────────

const RiskAnalysisPanel = ({ data, palette }) => {
  const riskMetrics = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Portfolio Volatility', value: data.volatility || 0, status: (data.volatility || 0) < 15 ? 'low' : (data.volatility || 0) < 30 ? 'medium' : 'high', description: 'Measures price fluctuation of your portfolio' },
      { name: 'Concentration Risk', value: data.concentrationRisk || 0, status: (data.concentrationRisk || 0) < 30 ? 'low' : (data.concentrationRisk || 0) < 60 ? 'medium' : 'high', description: 'How concentrated your assets are in few holdings' },
      { name: 'Liquidity Risk', value: data.liquidityRisk || 0, status: (data.liquidityRisk || 0) < 20 ? 'low' : (data.liquidityRisk || 0) < 50 ? 'medium' : 'high', description: 'Ability to convert assets to cash quickly' },
      { name: 'Interest Rate Risk', value: data.interestRateRisk || 0, status: (data.interestRateRisk || 0) < 25 ? 'low' : (data.interestRateRisk || 0) < 55 ? 'medium' : 'high', description: 'Sensitivity to interest rate changes' },
      { name: 'Inflation Risk', value: data.inflationRisk || 0, status: (data.inflationRisk || 0) < 20 ? 'low' : (data.inflationRisk || 0) < 45 ? 'medium' : 'high', description: 'Risk of purchasing power erosion' },
      { name: 'Currency Risk', value: data.currencyRisk || 0, status: (data.currencyRisk || 0) < 15 ? 'low' : (data.currencyRisk || 0) < 40 ? 'medium' : 'high', description: 'Exposure to foreign currency fluctuations' }
    ];
  }, [data]);

  const statusColors = {
    low: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Low' },
    medium: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Medium' },
    high: { bg: 'bg-red-500', text: 'text-red-500', label: 'High' }
  };

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-purple-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Risk Analysis</h3>
      </div>
      <div className="space-y-4">
        {riskMetrics.map((metric, i) => {
          const colors = statusColors[metric.status];
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className={`text-sm font-medium ${palette.text}`}>{metric.name}</span>
                  <p className={`text-xs ${palette.textMuted}`}>{metric.description}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} bg-opacity-20 ${colors.text}`}>{colors.label}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${colors.bg} transition-all duration-700`} style={{ width: `${Math.min(100, metric.value)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${palette.text}`}>Overall Risk Score</p>
            <p className={`text-xs ${palette.textMuted}`}>Weighted average of all factors</p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${(data?.overallRiskScore || 0) < 30 ? 'text-emerald-500' : (data?.overallRiskScore || 0) < 60 ? 'text-amber-500' : 'text-red-500'}`}>{(data?.overallRiskScore || 0).toFixed(0)}</span>
            <span className={`text-sm ${palette.textMuted}`}>/100</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ProjectionCalculator ────────────────────────────────────────────────────

const ProjectionCalculator = ({ data, palette }) => {
  const [years, setYears] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [monthlyContribution, setMonthlyContribution] = useState(25000);
  const [inflationRate, setInflationRate] = useState(6);

  const projections = useMemo(() => {
    const currentNetWorth = (data?.totalAssets || 0) - (data?.totalLiabilities || 0);
    const results = [];
    let nominalValue = currentNetWorth;
    for (let year = 0; year <= years; year++) {
      const realValue = nominalValue / Math.pow(1 + inflationRate / 100, year);
      results.push({ year, nominal: nominalValue, real: realValue, contributions: monthlyContribution * 12 * year, gains: nominalValue - currentNetWorth - (monthlyContribution * 12 * year) });
      nominalValue = (nominalValue + monthlyContribution * 12) * (1 + expectedReturn / 100);
    }
    return results;
  }, [data, years, expectedReturn, monthlyContribution, inflationRate]);

  const finalProjection = projections[projections.length - 1];

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <LineChart className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Wealth Projection</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className={`block text-xs font-medium ${palette.textMuted} mb-1`}>Years: {years}</label>
          <input type="range" min="1" max="40" value={years} onChange={e => setYears(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className={`block text-xs font-medium ${palette.textMuted} mb-1`}>Return: {expectedReturn}%</label>
          <input type="range" min="1" max="30" value={expectedReturn} onChange={e => setExpectedReturn(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className={`block text-xs font-medium ${palette.textMuted} mb-1`}>Monthly SIP</label>
          <input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(parseInt(e.target.value) || 0)} className={`w-full px-3 py-1.5 rounded-lg border ${palette.btnBorder} ${palette.card} ${palette.text} text-sm`} />
        </div>
        <div>
          <label className={`block text-xs font-medium ${palette.textMuted} mb-1`}>Inflation: {inflationRate}%</label>
          <input type="range" min="1" max="15" value={inflationRate} onChange={e => setInflationRate(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
      </div>
      <div className="relative h-48 flex items-end gap-1 mb-4">
        {projections.filter((_, i) => i % Math.max(1, Math.floor(projections.length / 15)) === 0 || i === projections.length - 1).map((p, i) => {
          const maxVal = projections[projections.length - 1]?.nominal || 1;
          const height = (p.nominal / maxVal) * 100;
          const realHeight = (p.real / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: '180px' }}>
                <div className="absolute bottom-0 w-full rounded-t-sm bg-blue-500 bg-opacity-30" style={{ height: `${height}%` }} />
                <div className="absolute bottom-0 w-full rounded-t-sm bg-blue-500" style={{ height: `${realHeight}%` }} />
              </div>
              <span className={`text-[10px] ${palette.textMuted}`}>Y{p.year}</span>
            </div>
          );
        })}
      </div>
      {finalProjection && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
          <div className="text-center">
            <p className={`text-xs ${palette.textMuted}`}>Projected (Nominal)</p>
            <p className="text-lg font-bold text-blue-500">{formatCurrency(finalProjection.nominal)}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${palette.textMuted}`}>Real Value (Adj.)</p>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(finalProjection.real)}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${palette.textMuted}`}>Total Contributions</p>
            <p className={`text-sm font-semibold ${palette.text}`}>{formatCurrency(finalProjection.contributions)}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${palette.textMuted}`}>Investment Gains</p>
            <p className="text-sm font-semibold text-emerald-500">{formatCurrency(finalProjection.gains)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AddAssetModal ───────────────────────────────────────────────────────────

const AddAssetModal = ({ isOpen, onClose, onSubmit, editAsset, palette }) => {
  const [formData, setFormData] = useState({ name: '', category: 'stocks', currentValue: '', purchasePrice: '', purchaseDate: '', institution: '', accountNumber: '', notes: '', isLiquid: true, taxExempt: false });
  useEffect(() => {
    if (editAsset) {
      setFormData({ name: editAsset.name || '', category: editAsset.category || 'stocks', currentValue: editAsset.currentValue || '', purchasePrice: editAsset.purchasePrice || '', purchaseDate: editAsset.purchaseDate ? new Date(editAsset.purchaseDate).toISOString().split('T')[0] : '', institution: editAsset.institution || '', accountNumber: editAsset.accountNumber || '', notes: editAsset.notes || '', isLiquid: editAsset.isLiquid !== false, taxExempt: editAsset.taxExempt || false });
    } else {
      setFormData({ name: '', category: 'stocks', currentValue: '', purchasePrice: '', purchaseDate: '', institution: '', accountNumber: '', notes: '', isLiquid: true, taxExempt: false });
    }
  }, [editAsset, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); onSubmit({ ...formData, currentValue: parseFloat(formData.currentValue) || 0, purchasePrice: parseFloat(formData.purchasePrice) || 0, _id: editAsset?._id }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${palette.card} border rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${palette.text}`}>{editAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${palette.btnBg} border ${palette.btnBorder}`}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Asset Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} focus:ring-2 focus:ring-blue-500`} placeholder="e.g., HDFC Bank Savings" />
          </div>
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Category *</label>
            <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`}>
              {Object.entries(ASSET_CATEGORIES).map(([key, cat]) => (<option key={key} value={key}>{cat.label}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Current Value *</label>
              <input type="number" required value={formData.currentValue} onChange={e => setFormData(p => ({ ...p, currentValue: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="₹0" />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Purchase Price</label>
              <input type="number" value={formData.purchasePrice} onChange={e => setFormData(p => ({ ...p, purchasePrice: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="₹0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Purchase Date</label>
              <input type="date" value={formData.purchaseDate} onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Institution</label>
              <input type="text" value={formData.institution} onChange={e => setFormData(p => ({ ...p, institution: e.target.value }))} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text}`} placeholder="e.g., HDFC Bank" />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium ${palette.textSub} mb-1`}>Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className={`w-full px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} resize-none`} placeholder="Additional notes..." />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.isLiquid} onChange={e => setFormData(p => ({ ...p, isLiquid: e.target.checked }))} className="w-4 h-4 rounded text-blue-500" />
              <span className={`text-sm ${palette.textSub}`}>Liquid Asset</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.taxExempt} onChange={e => setFormData(p => ({ ...p, taxExempt: e.target.checked }))} className="w-4 h-4 rounded text-blue-500" />
              <span className={`text-sm ${palette.textSub}`}>Tax Exempt</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 px-4 py-2.5 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} font-medium`}>Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 shadow-lg transition-all">{editAsset ? 'Update' : 'Add Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── GoalProgressTracker ─────────────────────────────────────────────────────

const GoalProgressTracker = ({ goals, palette }) => {
  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Wealth Goals</h3>
        </div>
        <a href="/goals" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">View All <ChevronRight className="w-3.5 h-3.5" /></a>
      </div>
      {goals && goals.length > 0 ? (
        <div className="space-y-4">
          {goals.slice(0, 5).map((goal, i) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const daysLeft = goal.targetDate ? Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;
            const monthlyNeeded = goal.targetDate && goal.targetAmount > goal.currentAmount ? (goal.targetAmount - goal.currentAmount) / Math.max(1, daysLeft / 30) : 0;
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${palette.text}`}>{goal.name}</span>
                    {progress >= 100 && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <span className={`text-sm ${palette.textSub}`}>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={palette.textMuted}>{progress.toFixed(0)}% complete</span>
                  {daysLeft !== null && daysLeft > 0 && <span className={palette.textMuted}>{daysLeft} days left • {formatCurrency(monthlyNeeded)}/mo needed</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className={palette.textMuted}>No wealth goals set</p>
          <a href="/goals" className="text-sm text-blue-500 hover:text-blue-600 mt-2 inline-block">Set your first goal</a>
        </div>
      )}
    </div>
  );
};

// ─── Main WealthManagement Component ─────────────────────────────────────────

const WealthManagement = () => {
  const { user } = useAuth();
  const { mode } = useTheme();
  const navigate = useNavigate();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';
  const palette = useMemo(() => ({
    bg: isBlack ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-gray-50',
    card: isBlack ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isBlack ? 'text-zinc-100' : isDark ? 'text-slate-100' : 'text-gray-900',
    textSub: isBlack ? 'text-zinc-400' : isDark ? 'text-slate-400' : 'text-gray-600',
    textMuted: isBlack ? 'text-zinc-500' : isDark ? 'text-slate-500' : 'text-gray-500',
    border: isBlack ? 'border-zinc-800' : isDark ? 'border-slate-700' : 'border-gray-200',
    btnBg: isBlack ? 'bg-zinc-800 hover:bg-zinc-700' : isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50',
    btnBorder: isBlack ? 'border-zinc-700' : isDark ? 'border-slate-600' : 'border-gray-300',
  }), [isDark, isBlack]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1Y');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLiability, setEditingLiability] = useState(null);

  const [wealthData, setWealthData] = useState({ totalAssets: 0, totalLiabilities: 0, monthlyChange: 0, yearlyReturn: 0, wealthScore: 0, liquidityRatio: 0, emergencyFundMonths: 0, diversificationScore: 0, savingsRate: 0, taxSavings: 0, insuranceCoverage: 0, volatility: 0, concentrationRisk: 0, liquidityRisk: 0, interestRateRisk: 0, inflationRisk: 0, currencyRisk: 0, overallRiskScore: 0 });
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [wealthHistory, setWealthHistory] = useState([]);
  const [wealthGoals, setWealthGoals] = useState([]);

  const fetchWealthData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [overviewRes, assetsRes, liabilitiesRes, historyRes, goalsRes] = await Promise.allSettled([
        api.get('/networth/overview', { params: { refresh: forceRefresh } }),
        api.get('/networth/assets'),
        api.get('/networth/liabilities'),
        api.get('/networth/history', { params: { days: TIME_RANGES.find(t => t.key === timeRange)?.days || 365 } }),
        api.get('/goals', { params: { limit: 10 } })
      ]);
      if (overviewRes.status === 'fulfilled' && overviewRes.value?.data?.data) setWealthData(prev => ({ ...prev, ...overviewRes.value.data.data }));
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value?.data?.data || assetsRes.value?.data || []);
      if (liabilitiesRes.status === 'fulfilled') setLiabilities(liabilitiesRes.value?.data?.data || liabilitiesRes.value?.data || []);
      if (historyRes.status === 'fulfilled') setWealthHistory(historyRes.value?.data?.data || historyRes.value?.data || []);
      if (goalsRes.status === 'fulfilled') setWealthGoals(goalsRes.value?.data?.data || goalsRes.value?.data?.goals || []);
    } catch (err) { console.error('Failed to fetch wealth data:', err); } finally { setLoading(false); }
  }, [timeRange]);

  useEffect(() => { fetchWealthData(); }, [fetchWealthData]);

  const handleRefresh = async () => { setRefreshing(true); await fetchWealthData(true); setRefreshing(false); };

  const handleAddAsset = async (assetData) => {
    try {
      if (assetData._id) await api.put(`/networth/assets/${assetData._id}`, assetData);
      else await api.post('/networth/assets', assetData);
      setAssetModalOpen(false); setEditingAsset(null); fetchWealthData(true);
    } catch (err) { console.error('Failed to save asset:', err); }
  };

  const handleDeleteAsset = async (asset) => {
    if (!window.confirm(`Delete "${asset.name}"?`)) return;
    try { await api.delete(`/networth/assets/${asset._id}`); fetchWealthData(true); } catch (err) { console.error('Failed to delete asset:', err); }
  };

  const handleAddLiability = async (liabilityData) => {
    try {
      if (liabilityData._id) await api.put(`/networth/liabilities/${liabilityData._id}`, liabilityData);
      else await api.post('/networth/liabilities', liabilityData);
      setLiabilityModalOpen(false); setEditingLiability(null); fetchWealthData(true);
    } catch (err) { console.error('Failed to save liability:', err); }
  };

  const handleDeleteLiability = async (liability) => {
    if (!window.confirm(`Delete "${liability.name}"?`)) return;
    try { await api.delete(`/networth/liabilities/${liability._id}`); fetchWealthData(true); } catch (err) { console.error('Failed to delete liability:', err); }
  };

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(a => a.name?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q) || a.institution?.toLowerCase().includes(q));
  }, [assets, searchQuery]);

  const filteredLiabilities = useMemo(() => {
    if (!searchQuery) return liabilities;
    const q = searchQuery.toLowerCase();
    return liabilities.filter(l => l.name?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q) || l.lender?.toLowerCase().includes(q));
  }, [liabilities, searchQuery]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'assets', label: 'Assets', icon: TrendingUp },
    { key: 'liabilities', label: 'Liabilities', icon: CreditCard },
    { key: 'projection', label: 'Projection', icon: LineChart },
    { key: 'insights', label: 'Insights', icon: Zap }
  ];

  if (loading) {
    return (
      <MainLayout title="Wealth Management">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center"><RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" /><p className={palette.textSub}>Loading wealth data...</p></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Wealth Management" subtitle="Track, analyze, and grow your wealth">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Wealth Management</h1>
            <p className={`${palette.textSub} mt-1`}>Comprehensive view of your financial portfolio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${palette.textMuted}`} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search assets..." className={`pl-9 pr-4 py-2 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} text-sm w-64`} />
            </div>
            <button onClick={() => { setEditingAsset(null); setAssetModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg text-sm">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
            <button onClick={handleRefresh} disabled={refreshing} className={`p-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder} ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border mb-6 overflow-x-auto`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : `${palette.textSub} hover:bg-opacity-10 hover:bg-blue-500`}`}>
                <TabIcon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <WealthOverviewCard data={wealthData} palette={palette} onRefresh={handleRefresh} refreshing={refreshing} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssetAllocationChart assets={assets} palette={palette} />
              <WealthGrowthTimeline history={wealthHistory} palette={palette} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoalProgressTracker goals={wealthGoals} palette={palette} />
              <RiskAnalysisPanel data={wealthData} palette={palette} />
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <AssetAllocationChart assets={filteredAssets} palette={palette} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset, i) => (
                <AssetDetailCard key={asset._id || i} asset={asset} palette={palette} onEdit={(a) => { setEditingAsset(a); setAssetModalOpen(true); }} onDelete={handleDeleteAsset} />
              ))}
              {filteredAssets.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className={`font-medium ${palette.text}`}>No assets found</p>
                  <button onClick={() => { setEditingAsset(null); setAssetModalOpen(true); }} className="mt-4 px-6 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600">Add First Asset</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'liabilities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Debt', value: formatCurrency(liabilities.reduce((s, l) => s + (l.currentBalance || 0), 0)), color: 'text-red-500', icon: CreditCard },
                { label: 'Monthly Payments', value: formatCurrency(liabilities.reduce((s, l) => s + (l.monthlyPayment || 0), 0)), color: 'text-amber-500', icon: Calendar },
                { label: 'Avg Interest', value: liabilities.length > 0 ? `${(liabilities.reduce((s, l) => s + (l.interestRate || 0), 0) / liabilities.length).toFixed(1)}%` : '0%', color: 'text-purple-500', icon: Percent },
                { label: 'Debts Count', value: liabilities.length.toString(), color: 'text-blue-500', icon: Hash }
              ].map((stat, i) => {
                const StatIcon = stat.icon;
                return (
                  <div key={i} className={`${palette.card} rounded-xl border p-4`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${stat.color} bg-opacity-10 flex items-center justify-center`}><StatIcon className={`w-5 h-5 ${stat.color}`} /></div>
                      <div><p className={`text-xs ${palette.textMuted}`}>{stat.label}</p><p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLiabilities.map((liability, i) => (
                <LiabilityCard key={liability._id || i} liability={liability} palette={palette} onEdit={(l) => { setEditingLiability(l); setLiabilityModalOpen(true); }} onDelete={handleDeleteLiability} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'projection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectionCalculator data={wealthData} palette={palette} />
            <WealthGrowthTimeline history={wealthHistory} palette={palette} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WealthInsightsPanel data={wealthData} palette={palette} />
            <RiskAnalysisPanel data={wealthData} palette={palette} />
          </div>
        )}

        <AddAssetModal isOpen={assetModalOpen} onClose={() => { setAssetModalOpen(false); setEditingAsset(null); }} onSubmit={handleAddAsset} editAsset={editingAsset} palette={palette} />
      </div>
    </MainLayout>
  );
};

export default WealthManagement;
