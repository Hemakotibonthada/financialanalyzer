import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity,
  Sparkles, Shield, Target, Zap, RefreshCw, DollarSign, Cpu, Eye,
  BarChart3, PieChart as PieIcon, Layers, X, ChevronRight,
  ChevronDown, Clock, Calendar, ArrowRight, Play, Settings,
  Download, Upload, FileText, Lightbulb, Gauge, Bell,
  AlertOctagon, XCircle, Info, Search, Star, Hash,
  Wallet, PiggyBank, CreditCard, Package, Timer,
  Award, BookOpen, Repeat, Flag, Heart
} from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import MainLayout from '../MainLayout';

// ─── Animation keyframes ────────────────────────────────────────────
const ANIM_STYLES = `
@keyframes mlFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mlFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mlScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes mlPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes mlGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(139,92,246,0.1); } }
@keyframes mlCount { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mlSlideRight { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
.ml-fade-up { animation: mlFadeUp 0.45s ease-out both; }
.ml-fade { animation: mlFade 0.3s ease-out both; }
.ml-scale { animation: mlScale 0.35s ease-out both; }
.ml-pulse { animation: mlPulse 2s ease-in-out infinite; }
.ml-glow { animation: mlGlow 3s ease-in-out infinite; }
.ml-count { animation: mlCount 0.5s ease-out both; }
.ml-slide-right { animation: mlSlideRight 0.4s ease-out both; }
`;

// ─── Color palettes ─────────────────────────────────────────────────
const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6', info: '#6366f1' };
const HEALTH_COLORS = { excellent: '#10b981', good: '#3b82f6', fair: '#f59e0b', poor: '#ef4444' };

// ─── Sub-components ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, isDark, delay = 0, suffix = '', trend = null }) {
  const colorMap = {
    purple: { bg: 'from-purple-500/20 to-purple-600/10', icon: 'text-purple-500', ring: 'ring-purple-500/20' },
    blue: { bg: 'from-blue-500/20 to-blue-600/10', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
    green: { bg: 'from-emerald-500/20 to-emerald-600/10', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
    yellow: { bg: 'from-amber-500/20 to-amber-600/10', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
    red: { bg: 'from-red-500/20 to-red-600/10', icon: 'text-red-500', ring: 'ring-red-500/20' },
    cyan: { bg: 'from-cyan-500/20 to-cyan-600/10', icon: 'text-cyan-500', ring: 'ring-cyan-500/20' },
    pink: { bg: 'from-pink-500/20 to-pink-600/10', icon: 'text-pink-500', ring: 'ring-pink-500/20' },
  };
  const c = colorMap[color] || colorMap.purple;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm ml-fade-up group hover:shadow-xl transition-all duration-300 ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${c.bg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} ml-count`}
          style={{ animationDelay: `${delay + 100}ms` }}>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        {trend !== null && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs last period
          </div>
        )}
      </div>
    </div>
  );
}

function Snackbar({ open, message, type, onClose }) {
  if (!open) return null;
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
  const SIcon = icons[type] || icons.info;
  return (
    <div className="fixed bottom-6 right-6 z-[60] ml-fade-up">
      <div className={`${colors[type] || colors.info} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px]`}>
        <SIcon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-0.5"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, isDark, children, className = '' }) {
  return (
    <div className={`rounded-2xl border backdrop-blur-sm ml-fade-up ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'} ${className}`}>
      <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <Icon className="w-4 h-4 text-purple-500" /> {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN ML DASHBOARD
// ═════════════════════════════════════════════════════════════════════
const MLDashboard = () => {
  const { isDark } = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [insights, setInsights] = useState([]);
  const [forecasts, setForecasts] = useState({ spending: null, income: null, savings: null });
  const [patterns, setPatterns] = useState({ recurring: [], merchants: [], velocity: null });
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const showSnackbar = useCallback((message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ open: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, open: false })), 3500);
  }, []);

  // Inject styles
  useEffect(() => {
    if (!document.getElementById('ml-dash-anims')) {
      const style = document.createElement('style');
      style.id = 'ml-dash-anims';
      style.textContent = ANIM_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // ─── Fetch all AI data ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, healthRes, recsRes, anomRes, insRes] = await Promise.allSettled([
        api.get('/ai/dashboard'),
        api.get('/ai/health-score'),
        api.get('/ai/recommendations'),
        api.get('/ai/anomalies'),
        api.get('/ai/insights'),
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value.data?.data || dashRes.value.data || null);
      if (healthRes.status === 'fulfilled') setHealthScore(healthRes.value.data?.data || healthRes.value.data || null);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.data?.data || []);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data?.data || []);
      if (insRes.status === 'fulfilled') setInsights(insRes.value.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch AI data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Tab-specific data
  useEffect(() => {
    if (activeTab === 'forecasts') {
      Promise.allSettled([
        api.get('/ai/forecast/spending'),
        api.get('/ai/forecast/income'),
        api.get('/ai/forecast/savings'),
      ]).then(([s, i, sv]) => {
        setForecasts({
          spending: s.status === 'fulfilled' ? (s.value.data?.data || null) : null,
          income: i.status === 'fulfilled' ? (i.value.data?.data || null) : null,
          savings: sv.status === 'fulfilled' ? (sv.value.data?.data || null) : null,
        });
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'patterns') {
      Promise.allSettled([
        api.get('/ai/patterns/recurring'),
        api.get('/ai/patterns/merchants'),
        api.get('/ai/patterns/velocity'),
      ]).then(([r, m, v]) => {
        setPatterns({
          recurring: r.status === 'fulfilled' ? (r.value.data?.data || []) : [],
          merchants: m.status === 'fulfilled' ? (m.value.data?.data || []) : [],
          velocity: v.status === 'fulfilled' ? (v.value.data?.data || null) : null,
        });
      });
    }
  }, [activeTab]);

  // ─── AI actions ─────────────────────────────────────────────────
  const handleTrainModel = async () => {
    try {
      showSnackbar('Training AI model...', 'info');
      const res = await api.post('/ai/train');
      setTrainingStatus(res.data?.data || { status: 'completed' });
      showSnackbar('AI model trained successfully!');
      fetchAll();
    } catch (err) {
      showSnackbar('Training failed', 'error');
    }
  };

  const handleCategorize = async () => {
    try {
      showSnackbar('Running auto-categorization...', 'info');
      await api.post('/ai/categorize');
      showSnackbar('Categorization complete!');
    } catch (err) {
      showSnackbar('Categorization failed', 'error');
    }
  };

  // ─── Computed ───────────────────────────────────────────────────
  const healthLabel = useMemo(() => {
    const score = healthScore?.score ?? healthScore?.overallScore ?? 0;
    if (score >= 80) return { label: 'Excellent', color: HEALTH_COLORS.excellent };
    if (score >= 60) return { label: 'Good', color: HEALTH_COLORS.good };
    if (score >= 40) return { label: 'Fair', color: HEALTH_COLORS.fair };
    return { label: 'Needs Work', color: HEALTH_COLORS.poor };
  }, [healthScore]);

  const healthScoreValue = healthScore?.score ?? healthScore?.overallScore ?? 0;

  const breakdownData = useMemo(() => {
    if (!healthScore?.breakdown) return [];
    return Object.entries(healthScore.breakdown).map(([key, val]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      score: typeof val === 'object' ? val.score || 0 : val,
      fullMark: 100,
    }));
  }, [healthScore]);

  const anomalyBySeverity = useMemo(() => {
    const counts = {};
    (anomalies || []).forEach(a => {
      const sev = a.severity || 'info';
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [anomalies]);

  const forecastChartData = useMemo(() => {
    if (!forecasts.spending?.predictions) return [];
    return forecasts.spending.predictions.map((p, i) => ({
      period: p.period || `Month ${i + 1}`,
      spending: p.amount || p.predicted || 0,
      income: forecasts.income?.predictions?.[i]?.amount || forecasts.income?.predictions?.[i]?.predicted || 0,
      savings: forecasts.savings?.predictions?.[i]?.amount || forecasts.savings?.predictions?.[i]?.predicted || 0,
    }));
  }, [forecasts]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'health', label: 'Health Score', icon: Heart },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
    { id: 'patterns', label: 'Patterns', icon: Repeat },
    { id: 'insights', label: 'Insights', icon: Sparkles },
  ];

  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: 'none',
    borderRadius: 12,
    color: isDark ? '#ffffff' : '#1e293b',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <MainLayout title="AI Dashboard">
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="text-center ml-fade-up">
            <div className="relative inline-block">
              <Brain className="w-14 h-14 text-purple-500 mx-auto mb-4 ml-pulse" />
              <Sparkles className="w-6 h-6 text-purple-400 animate-spin absolute -bottom-1 -right-2" />
            </div>
            <p className={`mt-4 text-lg font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Loading AI Engine...</p>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Analyzing your financial data</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="AI Dashboard">
      <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'} p-4 md:p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Header ──────────────────────────────────────────── */}
          <div className="ml-fade-up flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-3`}>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 ml-glow">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                AI & Machine Learning
              </h1>
              <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Intelligent financial insights powered by your data
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleTrainModel}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 border border-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100'}`}>
                <Cpu className="w-4 h-4" /> Train Model
              </button>
              <button onClick={handleCategorize}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}>
                <Layers className="w-4 h-4" /> Auto-Categorize
              </button>
              <button onClick={fetchAll}
                className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Health Score Banner ─────────────────────────────── */}
          <div className={`ml-fade-up rounded-2xl p-6 border relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-slate-800 to-slate-800/80 border-slate-700/50' : 'bg-gradient-to-r from-white to-purple-50/50 border-slate-200'}`}
            style={{ animationDelay: '50ms' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(${healthLabel.color} ${healthScoreValue * 3.6}deg, ${isDark ? '#334155' : '#e2e8f0'} 0deg)`,
                    }}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{healthScoreValue}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Financial Health Score</p>
                  <p className={`text-xl font-bold`} style={{ color: healthLabel.color }}>{healthLabel.label}</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Based on {healthScore?.factorsAnalyzed || 'multiple'} financial factors
                  </p>
                </div>
              </div>
              <div className="flex-1" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {breakdownData.slice(0, 4).map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white/80'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.name}</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(item.score)}</p>
                    <div className={`w-full h-1.5 rounded-full mt-1 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.score}%`, backgroundColor: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Stats Strip ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Health" value={healthScoreValue} suffix="/100" icon={Heart} color="green" isDark={isDark} delay={0} />
            <StatCard label="Recommendations" value={recommendations.length} icon={Lightbulb} color="yellow" isDark={isDark} delay={40} />
            <StatCard label="Anomalies" value={anomalies.length} icon={AlertTriangle} color="red" isDark={isDark} delay={80} />
            <StatCard label="Insights" value={insights.length} icon={Sparkles} color="purple" isDark={isDark} delay={120} />
            <StatCard label="Patterns" value={patterns.recurring.length + patterns.merchants.length} icon={Repeat} color="blue" isDark={isDark} delay={160} />
            <StatCard label="AI Score" value={dashboardData?.aiScore || dashboardData?.score || 'N/A'} icon={Brain} color="pink" isDark={isDark} delay={200} />
            <StatCard label="Confidence" value={dashboardData?.confidence ? `${Math.round(dashboardData.confidence * 100)}%` : 'N/A'} icon={Target} color="cyan" isDark={isDark} delay={240} />
          </div>

          {/* ─── Tabs ────────────────────────────────────────────── */}
          <div className={`flex gap-1 rounded-2xl p-1.5 border overflow-x-auto ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                      : isDark ? 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}>
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <div className="ml-fade space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Recommendations */}
                <ChartCard title="Top Recommendations" icon={Lightbulb} isDark={isDark}>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {(recommendations || []).slice(0, 6).map((rec, i) => {
                      const priorityColor = rec.priority === 'high' ? 'text-red-500' : rec.priority === 'medium' ? 'text-amber-500' : 'text-blue-500';
                      return (
                        <div key={i} className={`p-3 rounded-xl ml-slide-right ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                          style={{ animationDelay: `${i * 60}ms` }}>
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                              <Lightbulb className={`w-4 h-4 ${priorityColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.title || rec.recommendation || 'Recommendation'}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{rec.description || rec.reason || ''}</p>
                              {rec.impact && (
                                <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  Potential impact: {rec.impact}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {recommendations.length === 0 && (
                      <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No recommendations yet. Add more transactions for AI analysis.</p>
                      </div>
                    )}
                  </div>
                </ChartCard>

                {/* Anomaly Distribution */}
                <ChartCard title="Anomaly Distribution" icon={AlertTriangle} isDark={isDark}>
                  {anomalyBySeverity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={anomalyBySeverity} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {anomalyBySeverity.map((entry, idx) => (
                            <Cell key={idx} fill={SEVERITY_COLORS[entry.name] || CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-[280px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Shield className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">All Clear!</p>
                      <p className="text-xs">No anomalies detected</p>
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Recent Insights */}
              <ChartCard title="AI Insights" icon={Sparkles} isDark={isDark}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(insights || []).slice(0, 6).map((insight, i) => (
                    <div key={i} className={`p-4 rounded-xl border ml-fade-up ${isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-100'}`}
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className={`text-xs font-medium uppercase ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          {insight.category || insight.type || 'Insight'}
                        </span>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{insight.message || insight.title || insight.description || 'AI-generated insight'}</p>
                      {insight.confidence && (
                        <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Confidence: {Math.round(insight.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  ))}
                  {insights.length === 0 && (
                    <div className={`col-span-full text-center py-10 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">AI insights will appear as you add more data</p>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>
          )}

          {/* ═══ HEALTH SCORE TAB ═══ */}
          {activeTab === 'health' && (
            <div className="ml-fade space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <ChartCard title="Health Breakdown" icon={Heart} isDark={isDark}>
                  {breakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={breakdownData}>
                        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <PolarAngleAxis dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                        <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        <Tooltip contentStyle={tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`flex items-center justify-center h-[320px] text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No breakdown data</div>
                  )}
                </ChartCard>

                {/* Score Detail */}
                <ChartCard title="Score Components" icon={BarChart3} isDark={isDark}>
                  {breakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={breakdownData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                          {breakdownData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.score >= 70 ? '#10b981' : entry.score >= 40 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`flex items-center justify-center h-[320px] text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No data available</div>
                  )}
                </ChartCard>
              </div>

              {/* Improvement Tips */}
              {healthScore?.tips?.length > 0 && (
                <ChartCard title="Improvement Tips" icon={Target} isDark={isDark}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {healthScore.tips.map((tip, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <div className="p-1 rounded-lg bg-emerald-500/10"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{typeof tip === 'string' ? tip : tip.message || tip.tip}</p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}
            </div>
          )}

          {/* ═══ RECOMMENDATIONS TAB ═══ */}
          {activeTab === 'recommendations' && (
            <div className="ml-fade space-y-4">
              {recommendations.length === 0 ? (
                <div className={`rounded-2xl p-16 border text-center ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <Lightbulb className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No recommendations available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, i) => {
                    const priorityColors = { high: 'border-red-500/30 bg-red-500/5', medium: 'border-amber-500/30 bg-amber-500/5', low: 'border-blue-500/30 bg-blue-500/5' };
                    const pc = priorityColors[rec.priority] || priorityColors.low;
                    return (
                      <div key={i} className={`rounded-2xl p-5 border ml-fade-up ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}
                        style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.title || rec.recommendation || 'Recommendation'}</h4>
                              {rec.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${pc}`}>
                                  {rec.priority}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{rec.description || rec.reason || ''}</p>
                          </div>
                        </div>
                        {rec.impact && (
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            <TrendingUp className="w-3 h-3" /> Potential impact: {rec.impact}
                          </div>
                        )}
                        {rec.actionable && rec.action && (
                          <p className={`mt-2 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            Action: {typeof rec.action === 'string' ? rec.action : rec.action.description || ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ ANOMALIES TAB ═══ */}
          {activeTab === 'anomalies' && (
            <div className="ml-fade space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChartCard title="Detected Anomalies" icon={AlertTriangle} isDark={isDark}>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {(anomalies || []).map((anom, i) => {
                        const sevColor = SEVERITY_COLORS[anom.severity] || SEVERITY_COLORS.info;
                        return (
                          <div key={i} className={`p-4 rounded-xl border-l-4 ml-slide-right ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                            style={{ borderLeftColor: sevColor, animationDelay: `${i * 40}ms` }}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: sevColor }} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {anom.type || anom.anomalyType || 'Anomaly'}
                                  </p>
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: sevColor + '20', color: sevColor }}>
                                    {anom.severity || 'info'}
                                  </span>
                                </div>
                                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {anom.description || anom.message || 'Unusual pattern detected'}
                                </p>
                                {anom.amount && (
                                  <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Amount: ₹{Number(anom.amount).toLocaleString()}
                                  </p>
                                )}
                                {anom.confidence && (
                                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Confidence: {Math.round(anom.confidence * 100)}%
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {anomalies.length === 0 && (
                        <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No anomalies detected</p>
                          <p className="text-xs mt-1">Your transactions look normal</p>
                        </div>
                      )}
                    </div>
                  </ChartCard>
                </div>

                <ChartCard title="Severity Breakdown" icon={Gauge} isDark={isDark}>
                  {anomalyBySeverity.length > 0 ? (
                    <div className="space-y-4">
                      {anomalyBySeverity.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${(item.value / Math.max(...anomalyBySeverity.map(a => a.value), 1)) * 100}%`,
                              backgroundColor: SEVERITY_COLORS[item.name] || '#6366f1',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No data</div>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {/* ═══ FORECASTS TAB ═══ */}
          {activeTab === 'forecasts' && (
            <div className="ml-fade space-y-6">
              <ChartCard title="Financial Forecast" icon={TrendingUp} isDark={isDark}>
                {forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={forecastChartData}>
                      <defs>
                        <linearGradient id="gradSpending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="period" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="spending" stroke="#ef4444" fill="url(#gradSpending)" strokeWidth={2} name="Spending" />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#gradIncome)" strokeWidth={2} name="Income" />
                      <Area type="monotone" dataKey="savings" stroke="#3b82f6" fill="url(#gradSavings)" strokeWidth={2} name="Savings" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`flex items-center justify-center h-[350px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <div className="text-center">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Forecasts loading or no data available</p>
                    </div>
                  </div>
                )}
              </ChartCard>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'spending', label: 'Spending Forecast', icon: Wallet, color: 'red', data: forecasts.spending },
                  { key: 'income', label: 'Income Forecast', icon: TrendingUp, color: 'green', data: forecasts.income },
                  { key: 'savings', label: 'Savings Forecast', icon: PiggyBank, color: 'blue', data: forecasts.savings },
                ].map(({ key, label, icon: Icon, color, data }) => (
                  <div key={key} className={`rounded-2xl p-5 border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 text-${color}-500`} />
                      <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</h4>
                    </div>
                    {data ? (
                      <div>
                        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{(data.nextMonth || data.predicted || data.total || 0).toLocaleString()}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {data.trend || 'Next month prediction'}
                        </p>
                        {data.confidence && (
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Confidence: {Math.round(data.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ PATTERNS TAB ═══ */}
          {activeTab === 'patterns' && (
            <div className="ml-fade space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recurring Patterns */}
                <ChartCard title="Recurring Payments" icon={Repeat} isDark={isDark}>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {patterns.recurring.length > 0 ? patterns.recurring.map((p, i) => (
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <Repeat className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {p.description || p.merchant || p.name || 'Recurring'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {p.frequency || 'Monthly'} · ₹{(p.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                          {p.confidence ? `${Math.round(p.confidence * 100)}%` : p.status || 'Active'}
                        </span>
                      </div>
                    )) : (
                      <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Repeat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No recurring patterns detected yet</p>
                      </div>
                    )}
                  </div>
                </ChartCard>

                {/* Top Merchants */}
                <ChartCard title="Top Merchants" icon={Package} isDark={isDark}>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {patterns.merchants.length > 0 ? patterns.merchants.slice(0, 10).map((m, i) => (
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-purple-500">
                          {(m.merchant || m.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {m.merchant || m.name || 'Unknown'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {m.count || m.transactions || 0} transactions
                          </p>
                        </div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{(m.totalAmount || m.total || 0).toLocaleString()}
                        </p>
                      </div>
                    )) : (
                      <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No merchant data available</p>
                      </div>
                    )}
                  </div>
                </ChartCard>
              </div>

              {/* Velocity Info */}
              {patterns.velocity && (
                <ChartCard title="Spending Velocity" icon={Activity} isDark={isDark}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Daily Average</p>
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{(patterns.velocity.dailyAvg || patterns.velocity.daily || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Weekly Average</p>
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{(patterns.velocity.weeklyAvg || patterns.velocity.weekly || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Average</p>
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{(patterns.velocity.monthlyAvg || patterns.velocity.monthly || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </ChartCard>
              )}
            </div>
          )}

          {/* ═══ INSIGHTS TAB ═══ */}
          {activeTab === 'insights' && (
            <div className="ml-fade space-y-4">
              {insights.length === 0 ? (
                <div className={`rounded-2xl p-16 border text-center ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <Sparkles className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No insights yet</p>
                  <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>Add more transactions and train the AI model to generate insights</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, i) => {
                    const typeIcon = {
                      warning: AlertTriangle, success: CheckCircle, info: Info, tip: Lightbulb, anomaly: Shield
                    };
                    const typeColor = {
                      warning: 'text-amber-500', success: 'text-emerald-500', info: 'text-blue-500', tip: 'text-purple-500', anomaly: 'text-red-500'
                    };
                    const InsightIcon = typeIcon[insight.type] || Sparkles;
                    const insightColor = typeColor[insight.type] || 'text-purple-500';

                    return (
                      <div key={i} className={`rounded-2xl p-5 border ml-fade-up hover:shadow-lg transition-all ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}
                        style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                            <InsightIcon className={`w-5 h-5 ${insightColor}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {insight.title || insight.category || 'Insight'}
                              </p>
                              {insight.type && (
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  {insight.type}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {insight.message || insight.description || ''}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              {insight.confidence && (
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Confidence: {Math.round(insight.confidence * 100)}%
                                </span>
                              )}
                              {insight.createdAt && (
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(insight.createdAt).toLocaleDateString()}
                                </span>
                              )}
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

        </div>
      </div>

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))} />
    </MainLayout>
  );
};

export default MLDashboard;
