// ============================================================================
// AI Financial Command Center — Enterprise AI Dashboard
// ============================================================================
// Comprehensive dashboard integrating the local AI engine: health scoring,
// spending forecasts, anomaly detection, pattern recognition, recommendations,
// and model training status.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity,
  Sparkles, Shield, Target, Zap, RefreshCw, DollarSign, Cpu, Eye,
  BarChart3, Layers, ChevronRight, ChevronDown, Clock, Calendar,
  ArrowRight, Play, Download, Lightbulb, Gauge, Bell, AlertOctagon,
  Info, Star, Wallet, PiggyBank, CreditCard, Award, Heart,
  ArrowUp, ArrowDown, Percent, TrendingUp as TrendUp
} from 'lucide-react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';
import { ThemeGradientText, ThemeButton, PageLoader, EmptyPlaceholder } from '../components/ui/ThemePageComponents';
import { FadeIn, StaggerChildren, PageTransition, AnimatedCounter, AnimatedProgress, CardSkeleton, GlassCard, AnimatedBadge } from '../components/ui/AnimatedComponents';

// ─── Constants ──────────────────────────────────────────────────────
const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const HEALTH_GRADES = [
  { min: 90, label: 'Excellent', color: '#10b981', bg: 'from-emerald-500/20 to-emerald-600/10' },
  { min: 75, label: 'Good', color: '#3b82f6', bg: 'from-blue-500/20 to-blue-600/10' },
  { min: 60, label: 'Fair', color: '#f59e0b', bg: 'from-amber-500/20 to-amber-600/10' },
  { min: 0,  label: 'Needs Work', color: '#ef4444', bg: 'from-red-500/20 to-red-600/10' },
];

const getHealthGrade = (score) => HEALTH_GRADES.find(g => score >= g.min) || HEALTH_GRADES[3];

// ─── Health Score Ring ──────────────────────────────────────────────
function HealthScoreRing({ score = 0, size = 200, strokeWidth = 14, isDark }) {
  const grade = getHealthGrade(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={grade.color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-[2000ms] ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${grade.color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black" style={{ color: grade.color }}>
          <AnimatedCounter end={score} duration={1800} />
        </span>
        <span className={`text-sm font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {grade.label}
        </span>
      </div>
    </div>
  );
}

// ─── Stat Mini Card ─────────────────────────────────────────────────
function StatMini({ icon: Icon, label, value, sub, color = 'blue', isDark }) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10', green: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10', amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10', pink: 'text-pink-500 bg-pink-500/10',
    cyan: 'text-cyan-500 bg-cyan-500/10',
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 hover:shadow-lg group ${isDark ? 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${c}`}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
          <p className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Anomaly Card ───────────────────────────────────────────────────
function AnomalyCard({ anomaly, isDark }) {
  const sev = {
    high: { bg: isDark ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-200', icon: 'text-red-500', badge: isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' },
    medium: { bg: isDark ? 'bg-amber-900/20 border-amber-800/50' : 'bg-amber-50 border-amber-200', icon: 'text-amber-500', badge: isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700' },
    low: { bg: isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200', icon: 'text-blue-500', badge: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700' },
  };
  const s = sev[anomaly.severity] || sev.low;
  return (
    <div className={`rounded-xl p-4 border ${s.bg} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{anomaly.type || anomaly.category || 'Anomaly'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>{(anomaly.severity || 'low').toUpperCase()}</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{anomaly.description || anomaly.message || `Unusual amount: ₹${anomaly.amount?.toLocaleString?.() || '?'}`}</p>
          {anomaly.date && <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{new Date(anomaly.date).toLocaleDateString('en-IN')}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Recommendation Card ────────────────────────────────────────────
function RecCard({ rec, index, isDark }) {
  const [open, setOpen] = useState(false);
  const priColors = {
    high: { border: 'border-l-red-500', badge: isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' },
    medium: { border: 'border-l-amber-500', badge: isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700' },
    low: { border: 'border-l-blue-500', badge: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700' },
  };
  const p = priColors[rec.priority] || priColors.low;
  return (
    <div className={`border-l-4 ${p.border} rounded-xl p-5 transition-all hover:shadow-lg cursor-pointer ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'}`}
      onClick={() => setOpen(!open)} style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Lightbulb className={`w-5 h-5 mt-0.5 ${rec.priority === 'high' ? 'text-red-500' : rec.priority === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
          <div>
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rec.title}</h4>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{rec.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.badge}`}>{(rec.priority || 'low').toUpperCase()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
        </div>
      </div>
      {open && (
        <div className="mt-4 animate-fade-in">
          {rec.actionItems?.length > 0 && (
            <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <h5 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <Target className="w-3.5 h-3.5" /> Action Steps
              </h5>
              <ul className="space-y-1.5">
                {rec.actionItems.map((item, i) => (
                  <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    <ChevronRight className="w-3 h-3 mt-0.5 text-indigo-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(rec.potentialSavings > 0 || rec.impact) && (
            <div className={`flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-semibold text-sm`}>
              <DollarSign className="w-4 h-4" />
              {rec.potentialSavings > 0 ? `Potential Savings: ₹${rec.potentialSavings.toLocaleString()}` : rec.impact}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = 'indigo', isDark, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-${color}-500/10`}><Icon className={`w-6 h-6 text-${color}-500`} /></div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          {subtitle && <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
const AICommandCenter = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { mode } = useTheme();
  const isDark = mode === 'dark' || mode === 'black';
  const isBlack = mode === 'black';

  /* ── 3-mode palette tokens ─────────────────────────────── */
  const p = useMemo(() => {
    const dk = mode === 'dark' || mode === 'black';
    const bk = mode === 'black';
    return {
      dk, bk,
      bg: bk ? 'bg-black' : dk ? 'bg-slate-900' : 'bg-gray-50',
      card: bk ? 'bg-gray-950 border border-gray-800' : dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200',
      cardHover: bk ? 'hover:border-gray-700' : dk ? 'hover:border-slate-600' : 'hover:border-gray-300',
      text: dk ? 'text-white' : 'text-gray-900',
      textSub: dk ? 'text-slate-400' : 'text-gray-600',
      textMuted: dk ? 'text-slate-500' : 'text-gray-400',
      border: dk ? 'border-slate-700/50' : 'border-gray-200',
      gridStroke: dk ? '#334155' : '#e5e7eb',
      tickFill: dk ? '#94a3b8' : '#6b7280',
      tooltipBg: bk ? '#0a0a0a' : dk ? '#1e293b' : '#fff',
      tabBg: bk ? 'bg-gray-950' : dk ? 'bg-slate-800/50' : 'bg-gray-100',
      tabInactive: dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-white',
      refreshBtn: bk ? 'bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700' : dk ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
      emptyIcon: dk ? 'text-slate-600' : 'text-gray-300',
      tinted: (c) => dk ? `bg-${c}-900/20 border-${c}-800/50` : `bg-${c}-50 border-${c}-200`,
      tintedBadge: (c) => dk ? `bg-${c}-900/40 text-${c}-400` : `bg-${c}-100 text-${c}-700`,
    };
  }, [mode]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, healthRes, recsRes, forecastRes, anomalyRes, insightsRes, patternsRes] = await Promise.allSettled([
        api.get('/ai/dashboard'),
        api.get('/ai/health-score'),
        api.get('/ai/recommendations'),
        api.get('/ai/forecast/spending'),
        api.get('/ai/anomalies'),
        api.get('/ai/insights'),
        api.get('/ai/patterns/recurring'),
      ]);
      setData({
        dashboard: dashRes.status === 'fulfilled' ? dashRes.value.data : null,
        health: healthRes.status === 'fulfilled' ? healthRes.value.data : null,
        recommendations: recsRes.status === 'fulfilled' ? recsRes.value.data : null,
        forecast: forecastRes.status === 'fulfilled' ? forecastRes.value.data : null,
        anomalies: anomalyRes.status === 'fulfilled' ? anomalyRes.value.data : null,
        insights: insightsRes.status === 'fulfilled' ? insightsRes.value.data : null,
        patterns: patternsRes.status === 'fulfilled' ? patternsRes.value.data : null,
      });
    } catch (err) {
      console.error('AICommandCenter fetch error:', err);
      setError(err.message || 'Failed to load AI data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTrain = async () => {
    try {
      setTraining(true);
      setTrainResult(null);
      const res = await api.post('/ai/train');
      setTrainResult(res.data);
      setTimeout(() => fetchAll(), 1500);
    } catch (err) {
      setTrainResult({ error: err.message });
    } finally {
      setTraining(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────
  const healthScore = data.health?.score ?? data.dashboard?.healthScore?.score ?? 0;
  const healthComponents = data.health?.components || data.dashboard?.healthScore?.components || [];
  const recs = data.recommendations?.recommendations || data.dashboard?.recommendations || [];
  const forecastData = data.forecast?.forecast || data.forecast?.monthly || [];
  const anomalies = data.anomalies?.anomalies || data.dashboard?.anomalies || [];
  const insightsData = data.insights?.insights || data.insights || {};
  const patterns = data.patterns?.patterns || data.patterns || [];

  // ─── Tabs ──────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    { id: 'health', label: 'Health Score', icon: Heart },
    { id: 'forecast', label: 'Forecasts', icon: TrendingUp },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { id: 'patterns', label: 'Patterns', icon: Eye },
    { id: 'train', label: 'Model Training', icon: Cpu },
  ];

  // ─── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout title="AI Command Center">
        <PageLoader message="Loading AI intelligence..." />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="AI Command Center">
        <EmptyPlaceholder
          icon={AlertTriangle}
          title="Failed to Load AI Data"
          message={error}
          action={<ThemeButton onClick={fetchAll}><RefreshCw className="w-4 h-4 mr-2" /> Retry</ThemeButton>}
        />
      </MainLayout>
    );
  }

  // ─── Header actions ────────────────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeButton onClick={handleTrain} disabled={training} className={training ? 'opacity-50 cursor-not-allowed' : ''}>
        <Cpu className={`w-4 h-4 ${training ? 'animate-spin' : ''}`} />
        {training ? 'Training...' : 'Train Models'}
      </ThemeButton>
      <button onClick={fetchAll}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-lg ${p.refreshBtn}`}>
        <RefreshCw className="w-4 h-4" /> Refresh
      </button>
    </div>
  );

  return (
    <MainLayout title="AI Command Center" subtitle="AI-powered financial intelligence" headerActions={headerActions}>
      <PageTransition>
        {/* Train result banner */}
        {trainResult && (
          <FadeIn direction="down">
            <div className={`mb-6 p-4 rounded-xl border ${trainResult.error
              ? (isDark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
              : (isDark ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}`}>
              {trainResult.error ? <AlertTriangle className="w-5 h-5 inline mr-2" /> : <CheckCircle className="w-5 h-5 inline mr-2" />}
              {trainResult.error ? `Training failed: ${trainResult.error}` : `Models trained successfully! ${trainResult.modelsCount || ''} models updated.`}
            </div>
          </FadeIn>
        )}

        {/* Tabs */}
        <div className={`mb-6 flex flex-wrap gap-2 p-1.5 rounded-2xl ${p.tabBg}`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : p.tabInactive}`}>
                <TabIcon className="w-4 h-4" /> {tab.label}
                {tab.id === 'anomalies' && anomalies.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{anomalies.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ════════ OVERVIEW TAB ════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stats */}
            <FadeIn direction="up">
              <StaggerChildren staggerMs={60} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatMini icon={Heart} label="Health Score" value={healthScore} sub={getHealthGrade(healthScore).label} color="green" isDark={isDark} />
                <StatMini icon={Lightbulb} label="Recommendations" value={recs.length} sub="actionable" color="amber" isDark={isDark} />
                <StatMini icon={AlertTriangle} label="Anomalies" value={anomalies.length} sub="detected" color="red" isDark={isDark} />
                <StatMini icon={Eye} label="Patterns" value={patterns.length || 0} sub="recurring" color="purple" isDark={isDark} />
              </StaggerChildren>
            </FadeIn>

            {/* Health + Recommendations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Ring */}
              <FadeIn direction="left" delay={100}>
                <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                  <SectionHeader icon={Heart} title="Financial Health" color="emerald" isDark={isDark} />
                  <div className="flex justify-center mb-4">
                    <HealthScoreRing score={healthScore} isDark={isDark} />
                  </div>
                  {healthComponents.length > 0 && (
                    <div className="space-y-3">
                      {healthComponents.slice(0, 5).map((c, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>{c.name || c.label}</span>
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.score ?? c.value ?? 0}</span>
                          </div>
                          <AnimatedProgress value={c.score ?? c.value ?? 0} max={100} color={c.score >= 75 ? '#10b981' : c.score >= 50 ? '#f59e0b' : '#ef4444'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Top Recommendations */}
              <FadeIn direction="up" delay={150} className="lg:col-span-2">
                <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                  <SectionHeader icon={Lightbulb} title="Top Recommendations" subtitle={`${recs.length} insights found`} color="amber" isDark={isDark}
                    action={recs.length > 3 && <button onClick={() => setActiveTab('health')} className="text-indigo-500 hover:text-indigo-400 text-sm font-medium">View all →</button>} />
                  <div className="space-y-3">
                    {recs.slice(0, 4).map((rec, i) => <RecCard key={i} rec={rec} index={i} isDark={isDark} />)}
                    {recs.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>No recommendations — your finances look great!</p>
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Forecast + Anomalies Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending Forecast */}
              <FadeIn direction="up" delay={200}>
                <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                  <SectionHeader icon={TrendingUp} title="Spending Forecast" subtitle="Next 3 months" color="blue" isDark={isDark} />
                  {forecastData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                        <XAxis dataKey="month" tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                        <YAxis tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <RTooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                          formatter={(v) => [`₹${v?.toLocaleString?.() || v}`, 'Forecast']} />
                        <Area type="monotone" dataKey="predicted" stroke="#8b5cf6" fill="url(#aiGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} />
                        {forecastData[0]?.actual !== undefined && (
                          <Area type="monotone" dataKey="actual" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-60">
                      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Not enough data for forecasts yet</p>
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Recent Anomalies */}
              <FadeIn direction="up" delay={250}>
                <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                  <SectionHeader icon={AlertTriangle} title="Anomaly Alerts" subtitle={`${anomalies.length} detected`} color="red" isDark={isDark}
                    action={anomalies.length > 4 && <button onClick={() => setActiveTab('anomalies')} className="text-indigo-500 hover:text-indigo-400 text-sm font-medium">View all →</button>} />
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {anomalies.slice(0, 5).map((a, i) => <AnomalyCard key={i} anomaly={a} isDark={isDark} />)}
                    {anomalies.length === 0 && (
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>No anomalies detected!</p>
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        )}

        {/* ════════ HEALTH TAB ════════ */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <FadeIn direction="up">
              <div className={`rounded-2xl p-8 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Health Ring */}
                  <div className="flex flex-col items-center justify-center">
                    <HealthScoreRing score={healthScore} size={260} strokeWidth={18} isDark={isDark} />
                    <p className={`mt-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Based on 7 financial health indicators
                    </p>
                  </div>
                  {/* Radar Chart */}
                  {healthComponents.length > 0 && (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={healthComponents.map(c => ({ subject: c.name || c.label, value: c.score ?? c.value ?? 0, fullMark: 100 }))}>
                          <PolarGrid stroke={isDark ? '#334155' : '#e5e7eb'} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDark ? '#64748b' : '#9ca3af', fontSize: 10 }} />
                          <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Component Details */}
            <FadeIn direction="up" delay={100}>
              <StaggerChildren staggerMs={80} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthComponents.map((c, i) => (
                  <div key={i} className={`rounded-xl p-5 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} hover:shadow-lg transition-all`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name || c.label}</h4>
                      <span className={`text-2xl font-black ${(c.score ?? c.value ?? 0) >= 75 ? 'text-emerald-500' : (c.score ?? c.value ?? 0) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {c.score ?? c.value ?? 0}
                      </span>
                    </div>
                    <AnimatedProgress value={c.score ?? c.value ?? 0} max={100} color={(c.score ?? c.value ?? 0) >= 75 ? '#10b981' : (c.score ?? c.value ?? 0) >= 50 ? '#f59e0b' : '#ef4444'} />
                    {c.details && <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{c.details}</p>}
                    {c.tip && <p className={`text-xs mt-1 italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>💡 {c.tip}</p>}
                  </div>
                ))}
              </StaggerChildren>
            </FadeIn>

            {/* All Recommendations */}
            <FadeIn direction="up" delay={200}>
              <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <SectionHeader icon={Lightbulb} title="All Recommendations" subtitle={`${recs.length} insights`} color="amber" isDark={isDark} />
                <div className="space-y-3">
                  {recs.map((rec, i) => <RecCard key={i} rec={rec} index={i} isDark={isDark} />)}
                  {recs.length === 0 && <p className={`text-center py-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No recommendations at this time.</p>}
                </div>
              </div>
            </FadeIn>
          </div>
        )}

        {/* ════════ FORECAST TAB ════════ */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <FadeIn direction="up">
              <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <SectionHeader icon={TrendingUp} title="Spending Forecast" subtitle="AI-predicted spending for upcoming months" color="blue" isDark={isDark} />
                {forecastData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="fGrad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                      <XAxis dataKey="month" tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }} />
                      <YAxis tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <RTooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 12 }}
                        formatter={v => [`₹${v?.toLocaleString?.() || 0}`, '']} />
                      <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#8b5cf6" fill="url(#fGrad1)" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6' }} />
                      {forecastData[0]?.actual !== undefined && (
                        <Area type="monotone" dataKey="actual" name="Actual" stroke="#10b981" fill="none" strokeWidth={2.5} strokeDasharray="5 5" />
                      )}
                      {forecastData[0]?.upper !== undefined && (
                        <Area type="monotone" dataKey="upper" name="Upper Bound" stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="3 3" />
                      )}
                      {forecastData[0]?.lower !== undefined && (
                        <Area type="monotone" dataKey="lower" name="Lower Bound" stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="3 3" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <BarChart3 className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>Need more transaction data to generate forecasts</p>
                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Keep adding transactions and check back soon</p>
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Category Forecasts */}
            {data.forecast?.categories && (
              <FadeIn direction="up" delay={100}>
                <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                  <SectionHeader icon={Layers} title="Category Forecasts" color="purple" isDark={isDark} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(data.forecast.categories).map(([cat, vals], i) => (
                      <div key={cat} className={`rounded-xl p-4 border ${isDark ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-100'}`}>
                        <h4 className={`font-semibold capitalize mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat}</h4>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{(vals.predicted || vals.average || 0).toLocaleString()}</span>
                          {vals.trend && (
                            <span className={`text-xs flex items-center gap-0.5 ${vals.trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {vals.trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {Math.abs(vals.trend).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        )}

        {/* ════════ ANOMALIES TAB ════════ */}
        {activeTab === 'anomalies' && (
          <div className="space-y-6">
            <FadeIn direction="up">
              <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <SectionHeader icon={AlertTriangle} title="Anomaly Detection" subtitle={`${anomalies.length} anomalies detected by AI`} color="red" isDark={isDark} />
                {anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} isDark={isDark} />)}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>All Clear!</h3>
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>No anomalous transactions detected in your recent activity.</p>
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Anomaly Stats */}
            {anomalies.length > 0 && (
              <FadeIn direction="up" delay={100}>
                <StaggerChildren staggerMs={80} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatMini icon={AlertOctagon} label="High Severity" value={anomalies.filter(a => a.severity === 'high').length} color="red" isDark={isDark} />
                  <StatMini icon={AlertTriangle} label="Medium Severity" value={anomalies.filter(a => a.severity === 'medium').length} color="amber" isDark={isDark} />
                  <StatMini icon={Info} label="Low Severity" value={anomalies.filter(a => a.severity === 'low' || !a.severity).length} color="blue" isDark={isDark} />
                </StaggerChildren>
              </FadeIn>
            )}
          </div>
        )}

        {/* ════════ PATTERNS TAB ════════ */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <FadeIn direction="up">
              <div className={`rounded-2xl p-6 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <SectionHeader icon={Eye} title="Recurring Patterns" subtitle="AI-detected spending patterns" color="purple" isDark={isDark} />
                {patterns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patterns.map((p, i) => (
                      <div key={i} className={`rounded-xl p-5 border transition-all hover:shadow-lg ${isDark ? 'bg-slate-700/30 border-slate-600/50 hover:border-purple-500/30' : 'bg-white border-gray-200 hover:border-purple-300'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <h4 className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.merchant || p.category || p.name}</h4>
                          {p.isSubscription && <AnimatedBadge text="Subscription" color="purple" />}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Amount</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{(p.averageAmount || p.amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Frequency</span>
                            <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{p.frequency || 'monthly'}</span>
                          </div>
                          {p.confidence != null && (
                            <div className="flex justify-between items-center">
                              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Confidence</span>
                              <div className="flex items-center gap-2">
                                <AnimatedProgress value={p.confidence} max={100} className="w-16 h-1.5" />
                                <span className="text-xs font-semibold">{p.confidence}%</span>
                              </div>
                            </div>
                          )}
                          {p.nextExpectedDate && (
                            <div className={`text-xs pt-2 border-t flex items-center gap-1 ${isDark ? 'border-slate-600 text-slate-500' : 'border-gray-100 text-gray-400'}`}>
                              <Calendar className="w-3 h-3" /> Next: {new Date(p.nextExpectedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Eye className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>No recurring patterns detected yet. Keep adding transactions!</p>
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        )}

        {/* ════════ MODEL TRAINING TAB ════════ */}
        {activeTab === 'train' && (
          <div className="space-y-6">
            <FadeIn direction="up">
              <div className={`rounded-2xl p-8 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`}>
                <SectionHeader icon={Cpu} title="Model Training Center" subtitle="Train and manage your local AI models" color="purple" isDark={isDark} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { icon: Sparkles, name: 'Categorizer', desc: 'Auto-categorize transactions using learned patterns', color: 'purple' },
                    { icon: TrendingUp, name: 'Spending Predictor', desc: 'Forecast future spending based on historical trends', color: 'blue' },
                    { icon: AlertTriangle, name: 'Anomaly Detector', desc: 'Detect unusual transactions and suspicious patterns', color: 'red' },
                    { icon: Star, name: 'Merchant Analyzer', desc: 'Analyze merchant spending habits and preferences', color: 'amber' },
                  ].map((m, i) => (
                    <div key={i} className={`rounded-xl p-5 border text-center transition-all hover:shadow-lg ${isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`inline-flex p-3 rounded-xl bg-${m.color}-500/10 mb-3`}>
                        <m.icon className={`w-6 h-6 text-${m.color}-500`} />
                      </div>
                      <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{m.name}</h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{m.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center">
                  <button onClick={handleTrain} disabled={training}
                    className={`px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${training
                      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5'}`}>
                    <div className="flex items-center gap-3">
                      <Cpu className={`w-6 h-6 ${training ? 'animate-spin' : ''}`} />
                      {training ? 'Training in Progress...' : 'Train All Models'}
                    </div>
                  </button>
                  <p className={`mt-3 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Models train on your local data — nothing leaves your machine
                  </p>
                </div>

                {trainResult && (
                  <FadeIn direction="up" delay={200}>
                    <div className={`mt-8 rounded-xl p-6 border ${trainResult.error
                      ? (isDark ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-200')
                      : (isDark ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200')}`}>
                      <div className="flex items-start gap-3">
                        {trainResult.error ? <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" /> : <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />}
                        <div>
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {trainResult.error ? 'Training Failed' : 'Training Complete'}
                          </h4>
                          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            {trainResult.error || `Successfully trained ${trainResult.modelsCount || 'all'} models with ${trainResult.dataPoints || 'your'} data points.`}
                          </p>
                          {trainResult.models && (
                            <div className="mt-3 space-y-1">
                              {Object.entries(trainResult.models).map(([name, info]) => (
                                <div key={name} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{name}</span>
                                  {info.accuracy && <span className="text-emerald-500 text-xs font-mono">{(info.accuracy * 100).toFixed(1)}% accuracy</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                )}
              </div>
            </FadeIn>
          </div>
        )}
      </PageTransition>
    </MainLayout>
  );
};

export default AICommandCenter;
