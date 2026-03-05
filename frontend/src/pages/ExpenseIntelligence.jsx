import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  ShoppingCart, TrendingUp, TrendingDown, BarChart3, PieChart, Clock,
  Calendar, AlertTriangle, CheckCircle, ChevronRight, RefreshCw, Download,
  Filter, Search, Zap, Target, Wallet, Eye, EyeOff, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity, Star, Bell, Info,
  MapPin, Store, Coffee, Utensils, ShoppingBag, Fuel, Home,
  Smartphone, Plane, Music, Tv, Heart, Stethoscope, BookOpen,
  GraduationCap, CreditCard, Percent, Hash, MoreVertical, X
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPENSE INTELLIGENCE DASHBOARD - Smart Spending Analysis
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS = {
  food: Utensils, grocery: ShoppingCart, transport: Fuel, shopping: ShoppingBag,
  entertainment: Music, utilities: Home, healthcare: Stethoscope, education: GraduationCap,
  insurance: Heart, investment: TrendingUp, rent: Home, emi: CreditCard,
  travel: Plane, lifestyle: Coffee, subscription: Tv, other: MoreVertical
};

const CATEGORY_COLORS = {
  food: '#F97316', grocery: '#10B981', transport: '#3B82F6', shopping: '#EC4899',
  entertainment: '#8B5CF6', utilities: '#06B6D4', healthcare: '#EF4444', education: '#6366F1',
  insurance: '#14B8A6', investment: '#22C55E', rent: '#F59E0B', emi: '#DC2626',
  travel: '#0EA5E9', lifestyle: '#D946EF', subscription: '#A855F7', other: '#64748B'
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${amount < 0 ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${amount < 0 ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${amount < 0 ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  return `${amount < 0 ? '-' : ''}₹${abs.toLocaleString('en-IN')}`;
};

// ─── SpendingSummaryCards ────────────────────────────────────────────────────

const SpendingSummaryCards = ({ summary, palette }) => {
  if (!summary) return null;

  const cards = [
    { label: 'Total Spent', value: formatCurrency(summary.totalSpent), icon: ShoppingCart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Avg Daily', value: formatCurrency(summary.avgDaily), icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Avg Transaction', value: formatCurrency(summary.avgTransaction), icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Transactions', value: summary.transactionCount.toString(), icon: Hash, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const CardIcon = card.icon;
        return (
          <div key={i} className={`${palette.card} rounded-xl border p-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <CardIcon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className={`text-xs ${palette.textMuted}`}>{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── NeedsVsWantsChart ──────────────────────────────────────────────────────

const NeedsVsWantsChart = ({ data, palette }) => {
  if (!data) return null;
  
  const segments = [
    { label: 'Needs', value: data.needs, target: 50, color: '#3B82F6', amount: data.needsAmount },
    { label: 'Wants', value: data.wants, target: 30, color: '#8B5CF6', amount: data.wantsAmount },
    { label: 'Other', value: 100 - data.needs - data.wants, target: 20, color: '#10B981', amount: data.otherAmount }
  ];

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <PieChart className="w-5 h-5 text-blue-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>50/30/20 Rule Analysis</h3>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {/* Pie chart */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            {(() => {
              let currentAngle = -90;
              return segments.map((seg, i) => {
                const angle = (seg.value / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const r = 50;
                const cx = 64, cy = 64;
                const largeArc = angle > 180 ? 1 : 0;
                const d = `M ${cx + r * Math.cos(startRad)} ${cy + r * Math.sin(startRad)} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endRad)} ${cy + r * Math.sin(endRad)} L ${cx} ${cy} Z`;
                currentAngle = endAngle;
                return <path key={i} d={d} fill={seg.color} opacity="0.85" />;
              });
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className={`text-sm font-medium ${palette.text}`}>{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${palette.text}`}>{seg.value.toFixed(0)}%</span>
                  <span className={`text-xs ${Math.abs(seg.value - seg.target) <= 5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    (target: {seg.target}%)
                  </span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, seg.value)}%`, backgroundColor: seg.color }} />
                <div className="absolute top-0 h-full w-0.5 bg-white dark:bg-slate-900" style={{ left: `${seg.target}%` }} />
              </div>
              <p className={`text-xs ${palette.textMuted}`}>{formatCurrency(seg.amount || 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CategoryBreakdownChart ──────────────────────────────────────────────────

const CategoryBreakdownChart = ({ categories, palette }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Category Breakdown</h3>
        </div>
        <span className={`text-sm ${palette.textMuted}`}>{categories.length} categories</span>
      </div>

      <div className="space-y-3">
        {categories.slice(0, 10).map((cat, i) => {
          const Icon = CATEGORY_ICONS[cat.name] || MoreVertical;
          const color = CATEGORY_COLORS[cat.name] || '#64748B';
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${palette.text} capitalize`}>{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${palette.text}`}>{formatCurrency(cat.amount)}</span>
                    <span className={`text-xs ${palette.textMuted}`}>{cat.percentage?.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, cat.percentage || 0)}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SpendingTrendsChart ─────────────────────────────────────────────────────

const SpendingTrendsChart = ({ trends, palette }) => {
  if (!trends?.data || trends.data.length < 2) {
    return (
      <div className={`${palette.card} rounded-2xl border p-6 text-center`}>
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className={palette.textMuted}>Not enough data for trend analysis</p>
      </div>
    );
  }

  const maxAmount = Math.max(...trends.data.map(d => d.total));

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Spending Trends</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trends.direction === 'increasing' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
          trends.direction === 'decreasing' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
          'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
        }`}>
          {trends.direction === 'increasing' ? `↑ ${Math.abs(trends.changePercent).toFixed(0)}%` :
           trends.direction === 'decreasing' ? `↓ ${Math.abs(trends.changePercent).toFixed(0)}%` : 'Stable'}
        </span>
      </div>

      <div className="flex items-end gap-1 h-40">
        {trends.data.map((d, i) => {
          const height = maxAmount > 0 ? (d.total / maxAmount) * 100 : 0;
          const isLast = i === trends.data.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full relative" style={{ height: '130px' }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ${isLast ? 'bg-blue-500' : 'bg-blue-400 bg-opacity-60'}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={`text-[8px] ${palette.textMuted} mt-1 rotate-[-45deg] origin-center`}>
                {d.period.length > 7 ? d.period.substring(5) : d.period}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── AnomalyAlerts ───────────────────────────────────────────────────────────

const AnomalyAlerts = ({ anomalies, palette }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className={`${palette.card} rounded-2xl border p-6 text-center`}>
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <p className={`font-medium ${palette.text}`}>No Anomalies Detected</p>
        <p className={`text-sm ${palette.textMuted}`}>Your spending patterns look normal</p>
      </div>
    );
  }

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Spending Anomalies</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>
          {anomalies.length} detected
        </span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {anomalies.map((anomaly, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className={`text-sm font-medium ${palette.text}`}>{anomaly.message}</p>
              {anomaly.transaction && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${palette.textMuted}`}>
                    {new Date(anomaly.transaction.date).toLocaleDateString('en-IN')}
                  </span>
                  <span className={`text-xs font-medium text-red-500`}>
                    {formatCurrency(anomaly.transaction.amount)}
                  </span>
                </div>
              )}
              {anomaly.deviation && (
                <span className={`text-xs text-amber-600 dark:text-amber-400`}>
                  {anomaly.deviation}% above average
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SavingsOpportunities ────────────────────────────────────────────────────

const SavingsOpportunities = ({ opportunities, palette }) => {
  if (!opportunities || opportunities.length === 0) return null;

  const totalPotential = opportunities.reduce((s, o) => s + (o.potentialSavings || 0), 0);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-500" />
          <h3 className={`text-lg font-bold ${palette.text}`}>Savings Opportunities</h3>
        </div>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          Save up to {formatCurrency(totalPotential)}/mo
        </span>
      </div>

      <div className="space-y-3">
        {opportunities.map((opp, i) => (
          <div key={i} className="p-4 rounded-xl border hover:shadow-md transition-all" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className={`font-semibold text-sm ${palette.text}`}>{opp.title}</h4>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  opp.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  opp.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>{opp.priority}</span>
              </div>
              {opp.potentialSavings > 0 && (
                <span className="text-sm font-bold text-emerald-500">{formatCurrency(opp.potentialSavings)}/mo</span>
              )}
            </div>
            <p className={`text-sm ${palette.textSub}`}>{opp.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── DayOfWeekChart ──────────────────────────────────────────────────────────

const DayOfWeekChart = ({ data, palette }) => {
  if (!data || data.length === 0) return null;
  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-violet-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Spending by Day of Week</h3>
      </div>

      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => {
          const height = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
          const isWeekend = d.day === 'Saturday' || d.day === 'Sunday';
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className={`text-[10px] font-medium ${palette.textMuted} mb-1`}>{formatCurrency(d.amount)}</span>
              <div className="w-full relative" style={{ height: '110px' }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isWeekend ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${palette.textSub} mt-2`}>{d.shortDay}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className={`text-xs ${palette.textMuted}`}>Weekday</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span className={`text-xs ${palette.textMuted}`}>Weekend</span></div>
      </div>
    </div>
  );
};

// ─── MerchantLeaderboard ─────────────────────────────────────────────────────

const MerchantLeaderboard = ({ merchants, palette }) => {
  if (!merchants || merchants.length === 0) return null;

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Store className="w-5 h-5 text-orange-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Top Merchants</h3>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {merchants.slice(0, 15).map((merchant, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors" style={{ backgroundColor: i < 3 ? (palette.text === 'text-white' ? 'rgba(30,41,59,0.3)' : 'rgba(248,250,252,0.8)') : 'transparent' }}>
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : `${palette.textMuted}`
              }`}>{i + 1}</span>
              <div>
                <p className={`text-sm font-medium ${palette.text} truncate max-w-[200px]`}>{merchant.name}</p>
                <p className={`text-xs ${palette.textMuted}`}>{merchant.count} transactions</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${palette.text}`}>{formatCurrency(merchant.amount)}</p>
              <p className={`text-xs ${palette.textMuted}`}>avg {formatCurrency(merchant.avgTransaction)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SpendingRecommendations ─────────────────────────────────────────────────

const SpendingRecommendations = ({ recommendations, palette }) => {
  if (!recommendations || recommendations.length === 0) return null;

  const typeColors = {
    warning: { bg: 'bg-red-50 dark:bg-red-900/10', icon: 'text-red-500', border: 'border-red-200 dark:border-red-800' },
    action: { bg: 'bg-amber-50 dark:bg-amber-900/10', icon: 'text-amber-500', border: 'border-amber-200 dark:border-amber-800' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/10', icon: 'text-blue-500', border: 'border-blue-200 dark:border-blue-800' }
  };

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Smart Recommendations</h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const colors = typeColors[rec.type] || typeColors.info;
          return (
            <div key={i} className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
              <div className="flex items-start gap-3">
                {rec.type === 'warning' ? <AlertTriangle className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} /> :
                 rec.type === 'action' ? <Target className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} /> :
                 <Info className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />}
                <div>
                  <h4 className={`font-semibold text-sm ${palette.text}`}>{rec.title}</h4>
                  <p className={`text-sm ${palette.textSub} mt-1`}>{rec.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main ExpenseIntelligence Component ──────────────────────────────────────

const ExpenseIntelligence = () => {
  const { user } = useAuth();
  const { mode } = useTheme();
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
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState(90);
  const [analysisData, setAnalysisData] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/expense-intelligence/analyze', { params: { days: timePeriod } });
      setAnalysisData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch expense analysis:', err);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'categories', label: 'Categories', icon: PieChart },
    { key: 'trends', label: 'Trends', icon: TrendingUp },
    { key: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { key: 'savings', label: 'Savings', icon: Zap },
    { key: 'merchants', label: 'Merchants', icon: Store }
  ];

  if (loading) {
    return (
      <MainLayout title="Expense Intelligence">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center"><RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" /><p className={palette.textSub}>Analyzing your spending...</p></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Expense Intelligence" subtitle="AI-powered spending analysis">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>Expense Intelligence</h1>
            <p className={`${palette.textSub} mt-1`}>Deep analysis of your spending patterns</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={timePeriod} onChange={e => setTimePeriod(parseInt(e.target.value))} className={`px-4 py-2 rounded-xl border ${palette.btnBorder} ${palette.card} ${palette.text} text-sm`}>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last 1 year</option>
            </select>
            <button onClick={fetchAnalysis} className={`p-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder}`}><RefreshCw className="w-4 h-4" /></button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        <SpendingSummaryCards summary={analysisData?.summary} palette={palette} />

        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border my-6 overflow-x-auto`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : `${palette.textSub}`}`}>
                <TabIcon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NeedsVsWantsChart data={analysisData?.summary?.needsVsWants} palette={palette} />
            <SpendingTrendsChart trends={analysisData?.trends} palette={palette} />
            <CategoryBreakdownChart categories={analysisData?.summary?.topCategories} palette={palette} />
            <SpendingRecommendations recommendations={analysisData?.recommendations} palette={palette} />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdownChart categories={analysisData?.summary?.topCategories} palette={palette} />
            <NeedsVsWantsChart data={analysisData?.summary?.needsVsWants} palette={palette} />
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SpendingTrendsChart trends={analysisData?.trends} palette={palette} />
            <DayOfWeekChart data={analysisData?.dayOfWeekAnalysis} palette={palette} />
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnomalyAlerts anomalies={analysisData?.anomalies} palette={palette} />
            <SpendingRecommendations recommendations={analysisData?.recommendations} palette={palette} />
          </div>
        )}

        {activeTab === 'savings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SavingsOpportunities opportunities={analysisData?.savingsOpportunities} palette={palette} />
            <SpendingRecommendations recommendations={analysisData?.recommendations} palette={palette} />
          </div>
        )}

        {activeTab === 'merchants' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MerchantLeaderboard merchants={analysisData?.merchantAnalysis} palette={palette} />
            <DayOfWeekChart data={analysisData?.dayOfWeekAnalysis} palette={palette} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ExpenseIntelligence;
