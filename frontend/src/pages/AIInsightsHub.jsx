// ============================================================================
// AI Insights Hub — Unified AI Intelligence Dashboard
// ============================================================================
// Surfaces all 12 AI engines in a single interactive dashboard:
//  - AI Status & Training controls
//  - Predictive alerts
//  - Spending pattern analysis
//  - Budget optimization
//  - Investment suggestions
//  - Cash flow projections
//  - Financial literacy tips
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useTheme } from '../context/ThemeContext';
import { aiIntelligenceService } from '../services/api';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Brain, Cpu, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Sparkles, Target, Shield, Heart, Zap, RefreshCw, Play, Lightbulb,
  DollarSign, PieChart as PieIcon, BarChart3, Eye, BookOpen,
  ArrowUpRight, ArrowDownRight, Clock, Star, Award, Layers,
  Activity, ChevronRight, AlertCircle, Info, CreditCard, Wallet
} from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

export default function AIInsightsHub() {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';
  const bk = mode === 'black';

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);

  // Data states
  const [aiStatus, setAiStatus] = useState(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [budgetOpt, setBudgetOpt] = useState(null);
  const [investAnalysis, setInvestAnalysis] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [dailyTip, setDailyTip] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      aiIntelligenceService.getStatus(),
      aiIntelligenceService.getPredictiveAlerts(),
      aiIntelligenceService.getRecommendations(),
      aiIntelligenceService.getPredictions(3),
      aiIntelligenceService.getDailyTip(),
      aiIntelligenceService.optimizeBudget(),
      aiIntelligenceService.analyzeInvestments(),
      aiIntelligenceService.projectCashFlow(30),
      aiIntelligenceService.getPatterns(),
    ]);

    if (results[0].status === 'fulfilled') setAiStatus(results[0].value.data?.data);
    if (results[1].status === 'fulfilled') setPredictiveAlerts(results[1].value.data?.data);
    if (results[2].status === 'fulfilled') setRecommendations(results[2].value.data?.data);
    if (results[3].status === 'fulfilled') setPredictions(results[3].value.data?.data);
    if (results[4].status === 'fulfilled') setDailyTip(results[4].value.data?.data);
    if (results[5].status === 'fulfilled') setBudgetOpt(results[5].value.data?.data);
    if (results[6].status === 'fulfilled') setInvestAnalysis(results[6].value.data?.data);
    if (results[7].status === 'fulfilled') setCashFlow(results[7].value.data?.data);
    if (results[8].status === 'fulfilled') setPatterns(results[8].value.data?.data);

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const res = await aiIntelligenceService.train();
      setAiStatus(prev => ({ ...prev, ...res.data?.data?.metadata }));
    } catch {}
    setTraining(false);
    fetchAll();
  };

  // ─── Palette ──────────────────────────────────────────────────
  const p = useMemo(() => ({
    bg: bk ? 'bg-black' : dk ? 'bg-slate-900' : 'bg-gray-50',
    card: bk ? 'bg-gray-950 border-gray-800' : dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-gray-200',
    text: dk ? 'text-white' : 'text-gray-900',
    sub: dk ? 'text-slate-400' : 'text-gray-500',
    muted: dk ? 'text-slate-500' : 'text-gray-400',
    border: dk ? 'border-slate-700/50' : 'border-gray-200',
    tabActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20',
    tabInactive: dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    grid: dk ? '#334155' : '#e5e7eb',
    tick: dk ? '#94a3b8' : '#6b7280',
    tooltipBg: bk ? '#0a0a0a' : dk ? '#1e293b' : '#fff',
  }), [dk, bk]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: predictiveAlerts?.totalAlerts },
    { id: 'patterns', label: 'Patterns', icon: Eye },
    { id: 'budget', label: 'Budget AI', icon: Target },
    { id: 'invest', label: 'Invest', icon: TrendingUp },
    { id: 'forecast', label: 'Forecast', icon: Activity },
    { id: 'learn', label: 'Learn', icon: BookOpen },
  ];

  return (
    <MainLayout title="AI Insights Hub">
      <div className="p-4 md:p-6 space-y-6 page-enter">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${p.text}`}>AI Intelligence Hub</h1>
              <p className={`text-sm ${p.sub}`}>
                {aiStatus?.lastTrainedAt
                  ? `Trained ${new Date(aiStatus.lastTrainedAt).toLocaleDateString('en-IN')} • ${aiStatus.accuracy || 0}% accuracy • ${aiStatus.trainingSamples || 0} samples`
                  : 'AI engines ready — train on your data to unlock insights'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleTrain} disabled={training}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                training ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'
              } bg-gradient-to-r from-indigo-600 to-purple-600 text-white`}>
              {training ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {training ? 'Training...' : 'Train AI'}
            </button>
            <button onClick={fetchAll} className={`p-2.5 rounded-xl border ${p.card} transition-colors`}>
              <RefreshCw className={`w-4 h-4 ${p.sub}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1.5 p-1.5 rounded-2xl overflow-x-auto ${bk ? 'bg-gray-950' : dk ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeTab === tab.id ? p.tabActive : p.tabInactive
                }`}>
                <Icon className="w-4 h-4" /> {tab.label}
                {tab.badge > 0 && activeTab !== tab.id && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Brain className={`w-12 h-12 mx-auto mb-3 ${dk ? 'text-indigo-400' : 'text-indigo-500'} animate-pulse`} />
              <p className={p.sub}>Loading AI insights...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* ═══════ OVERVIEW TAB ═══════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* AI Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'AI Status', value: aiStatus?.lastTrainedAt ? 'Trained' : 'Ready', icon: Cpu, color: 'indigo', sub: aiStatus?.accuracy ? `${aiStatus.accuracy}% accuracy` : 'Train to activate' },
                    { label: 'Active Alerts', value: predictiveAlerts?.totalAlerts || 0, icon: AlertTriangle, color: 'amber', sub: `${predictiveAlerts?.critical || 0} critical` },
                    { label: 'Recommendations', value: recommendations?.length || 0, icon: Lightbulb, color: 'purple', sub: 'AI-generated' },
                    { label: 'Patterns Found', value: patterns?.recurring?.found || 0, icon: Eye, color: 'cyan', sub: `${patterns?.spendingVelocity?.trend || 'stable'} velocity` },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className={`rounded-2xl p-5 border ${p.card} hover-lift card-appear`}
                        style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${dk ? `bg-${card.color}-900/30` : `bg-${card.color}-100`}`}>
                            <Icon className={`w-5 h-5 text-${card.color}-500`} />
                          </div>
                        </div>
                        <p className={`text-xs font-medium ${p.sub}`}>{card.label}</p>
                        <p className={`text-2xl font-bold ${p.text} mt-1`}>{card.value}</p>
                        <p className={`text-xs ${p.muted} mt-1`}>{card.sub}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Daily Tip */}
                {dailyTip && (
                  <div className={`rounded-2xl p-5 border ${dk ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200/50'}`}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          💡 Tip of the Day — {dailyTip.category}
                        </span>
                        <p className={`text-sm mt-1 ${p.text}`}>{dailyTip.tip}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Recommendations */}
                {recommendations && recommendations.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-4 flex items-center gap-2`}>
                      <Sparkles className="w-5 h-5 text-indigo-500" /> AI Recommendations
                    </h3>
                    <div className="space-y-3">
                      {recommendations.slice(0, 5).map((rec, i) => (
                        <div key={i} className={`p-4 rounded-xl border-l-4 ${
                          rec.priority === 'critical' ? 'border-l-red-500' : rec.priority === 'high' ? 'border-l-amber-500' : 'border-l-blue-500'
                        } ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`text-xs font-bold uppercase ${
                                rec.priority === 'critical' ? 'text-red-500' : rec.priority === 'high' ? 'text-amber-500' : 'text-blue-500'
                              }`}>{rec.priority}</span>
                              <h4 className={`font-semibold ${p.text} mt-0.5`}>{rec.title}</h4>
                              <p className={`text-sm ${p.sub} mt-1`}>{rec.description}</p>
                            </div>
                            {rec.potentialImpact > 0 && (
                              <span className={`text-sm font-bold text-emerald-500 whitespace-nowrap`}>
                                Save ₹{rec.potentialImpact.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {rec.actionItems && (
                            <div className="mt-2 space-y-1">
                              {rec.actionItems.slice(0, 3).map((item, j) => (
                                <div key={j} className={`flex items-start gap-2 text-xs ${p.sub}`}>
                                  <ChevronRight className="w-3 h-3 mt-0.5 text-indigo-500 flex-shrink-0" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predictions */}
                {predictions?.monthly?.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-4 flex items-center gap-2`}>
                      <Activity className="w-5 h-5 text-indigo-500" /> Spending Forecast
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={predictions.monthly.map(m => ({
                        month: m.month,
                        predicted: m.predicted,
                        lower: m.lower,
                        upper: m.upper,
                      }))}>
                        <defs>
                          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: p.tick, fontSize: 11 }} axisLine={false} />
                        <YAxis tick={{ fill: p.tick, fontSize: 11 }} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip contentStyle={{ background: p.tooltipBg, border: 'none', borderRadius: 12 }}
                          formatter={v => [`₹${v?.toLocaleString?.('en-IN') || 0}`, '']} />
                        <Area type="monotone" dataKey="upper" stroke="none" fill="#f59e0b" fillOpacity={0.1} />
                        <Area type="monotone" dataKey="lower" stroke="none" fill="#f59e0b" fillOpacity={0.1} />
                        <Area type="monotone" dataKey="predicted" stroke="#6366f1" fill="url(#predGrad)" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#6366f1' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ═══════ ALERTS TAB ═══════ */}
            {activeTab === 'alerts' && (
              <div className="space-y-3">
                {predictiveAlerts?.alerts?.length > 0 ? (
                  predictiveAlerts.alerts.map((alert, i) => {
                    const severityColor = { critical: 'red', high: 'amber', medium: 'blue', low: 'gray', info: 'sky' };
                    const color = severityColor[alert.severity] || 'blue';
                    return (
                      <div key={i} className={`rounded-2xl p-5 border card-appear ${p.card}`}
                        style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${dk ? `bg-${color}-900/30` : `bg-${color}-100`}`}>
                            <AlertTriangle className={`w-5 h-5 text-${color}-500`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                dk ? `bg-${color}-900/40 text-${color}-400` : `bg-${color}-100 text-${color}-700`
                              }`}>{alert.severity}</span>
                              <span className={`text-xs ${p.muted}`}>{alert.type?.replace(/_/g, ' ')}</span>
                            </div>
                            <h4 className={`font-semibold ${p.text}`}>{alert.title}</h4>
                            <p className={`text-sm ${p.sub} mt-1`}>{alert.message}</p>
                            {alert.action && (
                              <p className={`text-xs mt-2 p-2 rounded-lg ${dk ? 'bg-slate-700/50' : 'bg-gray-50'} ${dk ? 'text-slate-300' : 'text-gray-600'}`}>
                                💡 {alert.action}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16">
                    <Shield className={`w-14 h-14 mx-auto mb-3 ${dk ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <h3 className={`text-lg font-bold ${p.text}`}>All Clear!</h3>
                    <p className={`text-sm ${p.sub} mt-1`}>No predictive alerts. Your finances look healthy.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══════ PATTERNS TAB ═══════ */}
            {activeTab === 'patterns' && patterns && (
              <div className="space-y-6">
                {/* Spending Velocity */}
                {patterns.spendingVelocity && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-3 flex items-center gap-2`}>
                      <Activity className="w-5 h-5 text-indigo-500" /> Spending Velocity
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs ${p.sub}`}>Daily Average</p>
                        <p className={`text-2xl font-bold ${p.text}`}>₹{(patterns.spendingVelocity.avgDaily || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${p.sub}`}>Recent (7d)</p>
                        <p className={`text-2xl font-bold ${p.text}`}>₹{(patterns.spendingVelocity.recentDaily || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${p.sub}`}>Trend</p>
                        <p className={`text-2xl font-bold ${
                          patterns.spendingVelocity.trend === 'accelerating' ? 'text-red-500' : patterns.spendingVelocity.trend === 'decelerating' ? 'text-emerald-500' : p.text
                        }`}>
                          {patterns.spendingVelocity.trend === 'accelerating' ? '↑ Increasing' : patterns.spendingVelocity.trend === 'decelerating' ? '↓ Decreasing' : '→ Stable'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurring Transactions */}
                {patterns.recurring?.items?.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-3 flex items-center gap-2`}>
                      <RefreshCw className="w-5 h-5 text-purple-500" /> Recurring Transactions ({patterns.recurring.found})
                    </h3>
                    <p className={`text-sm ${p.sub} mb-4`}>
                      Annual cost: ₹{(patterns.recurring.totalAnnualCost || 0).toLocaleString('en-IN')}
                    </p>
                    <div className="space-y-2">
                      {patterns.recurring.items.slice(0, 8).map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div>
                            <span className={`font-semibold text-sm ${p.text}`}>{item.description}</span>
                            <span className={`text-xs ${p.muted} ml-2`}>{item.frequency}</span>
                            {item.isSubscription && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded ml-2">Subscription</span>}
                          </div>
                          <div className="text-right">
                            <span className={`font-bold text-sm ${p.text}`}>₹{item.avgAmount.toLocaleString('en-IN')}</span>
                            <span className={`text-xs ${p.muted} block`}>₹{item.annualCost.toLocaleString('en-IN')}/yr</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Impulse Spending */}
                {patterns.impulseSpending && patterns.impulseSpending.impulseCount > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-3 flex items-center gap-2`}>
                      <Zap className="w-5 h-5 text-amber-500" /> Impulse Purchases
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className={`text-xs ${p.sub}`}>Impulse Rate</p>
                        <p className={`text-2xl font-bold ${patterns.impulseSpending.impulseRate > 30 ? 'text-red-500' : p.text}`}>
                          {patterns.impulseSpending.impulseRate}%
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${p.sub}`}>Total Impulse</p>
                        <p className={`text-2xl font-bold text-amber-500`}>₹{(patterns.impulseSpending.impulseTotal || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${p.sub}`}>Savings Potential</p>
                        <p className="text-2xl font-bold text-emerald-500">₹{(patterns.impulseSpending.savingsPotential || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════ BUDGET TAB ═══════ */}
            {activeTab === 'budget' && budgetOpt && (
              <div className="space-y-6">
                {/* 50/30/20 Rule */}
                <div className={`rounded-2xl p-6 border ${p.card}`}>
                  <h3 className={`text-lg font-bold ${p.text} mb-4 flex items-center gap-2`}>
                    <Target className="w-5 h-5 text-indigo-500" /> 50/30/20 Budget Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Needs (50%)', data: budgetOpt.rule503020?.needs, color: 'blue', target: 50 },
                      { label: 'Wants (30%)', data: budgetOpt.rule503020?.wants, color: 'purple', target: 30 },
                      { label: 'Savings (20%)', data: budgetOpt.rule503020?.savings, color: 'emerald', target: 20 },
                    ].map((item, i) => {
                      const actual = item.data?.actual || 0;
                      const target = item.data?.target || 0;
                      const income = budgetOpt.monthlyIncome || 1;
                      const actualPct = (actual / income * 100);
                      const isOver = actual > target;
                      return (
                        <div key={i} className={`p-4 rounded-xl border ${dk ? 'border-slate-700/50' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-semibold ${p.text}`}>{item.label}</span>
                            <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                              {actualPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden mb-2`}>
                            <div className={`h-full rounded-full transition-all duration-1000 bg-${item.color}-500`}
                              style={{ width: `${Math.min(100, actualPct / item.target * 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className={p.sub}>Actual: ₹{actual.toLocaleString('en-IN')}</span>
                            <span className={p.muted}>Target: ₹{target.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Adjustments */}
                {budgetOpt.adjustments?.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-3`}>Suggested Adjustments</h3>
                    <div className="space-y-2">
                      {budgetOpt.adjustments.map((adj, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            {adj.direction === 'reduce' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                            <span className={`text-sm ${p.text}`}>{adj.message}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            adj.priority === 'high' ? (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : (dk ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700')
                          }`}>{adj.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════ INVEST TAB ═══════ */}
            {activeTab === 'invest' && investAnalysis && (
              <div className="space-y-6">
                {/* Risk Profile */}
                <div className={`rounded-2xl p-6 border ${p.card}`}>
                  <h3 className={`text-lg font-bold ${p.text} mb-4 flex items-center gap-2`}>
                    <Shield className="w-5 h-5 text-indigo-500" /> Your Risk Profile
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke={dk ? '#334155' : '#e5e7eb'} strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 * (1 - (investAnalysis.riskProfile?.score || 0) / 100)}`}
                          strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black text-indigo-500`}>{investAnalysis.riskProfile?.score || 0}</span>
                        <span className={`text-[10px] ${p.muted}`}>Risk Score</span>
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold ${p.text}`}>{investAnalysis.riskProfile?.label || 'Unknown'}</h4>
                      <p className={`text-sm ${p.sub} mt-1 max-w-md`}>{investAnalysis.riskProfile?.description}</p>
                    </div>
                  </div>
                </div>

                {/* Asset Allocation */}
                {investAnalysis.allocation && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-4`}>Recommended Asset Allocation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(investAnalysis.allocation.percentages || {}).map(([asset, pct], i) => (
                        <div key={asset} className={`p-4 rounded-xl text-center ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div className={`text-3xl font-black`} style={{ color: CHART_COLORS[i] }}>{pct}%</div>
                          <div className={`text-sm font-semibold ${p.text} capitalize mt-1`}>{asset}</div>
                          <div className={`text-xs ${p.muted}`}>₹{(investAnalysis.allocation.amounts?.[asset] || 0).toLocaleString('en-IN')}/mo</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SIP Plan */}
                {investAnalysis.sipPlan?.plan?.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-4`}>Recommended SIP Plan</h3>
                    <div className="space-y-2">
                      {investAnalysis.sipPlan.plan.map((sip, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          <div>
                            <h4 className={`font-semibold ${p.text}`}>{sip.product}</h4>
                            <p className={`text-xs ${p.sub} mt-0.5`}>{sip.rationale}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${p.text}`}>₹{sip.amount.toLocaleString('en-IN')}</span>
                            <span className={`text-xs ${p.muted} block`}>{sip.frequency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {investAnalysis.sipPlan.projectedIn10Years && (
                      <div className={`mt-4 p-4 rounded-xl ${dk ? 'bg-emerald-900/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200/50'}`}>
                        <span className="text-emerald-500 text-xs font-bold">10-Year Projection</span>
                        <p className={`text-sm ${p.text} mt-1`}>
                          Investing ₹{investAnalysis.sipPlan.totalMonthly?.toLocaleString('en-IN')}/month → Projected value: <strong className="text-emerald-500">
                            ₹{investAnalysis.sipPlan.projectedIn10Years?.projectedValue?.toLocaleString('en-IN')}
                          </strong> ({investAnalysis.sipPlan.projectedIn10Years?.returnMultiple}x returns)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════ FORECAST TAB ═══════ */}
            {activeTab === 'forecast' && cashFlow && (
              <div className="space-y-6">
                <div className={`rounded-2xl p-6 border ${p.card}`}>
                  <h3 className={`text-lg font-bold ${p.text} mb-4 flex items-center gap-2`}>
                    <Activity className="w-5 h-5 text-indigo-500" /> 30-Day Cash Flow Projection
                  </h3>
                  {cashFlow.projections?.daily?.length > 0 && (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={cashFlow.projections.daily.filter((_, i) => i % 3 === 0)}>
                        <defs>
                          <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: p.tick, fontSize: 10 }} axisLine={false} tickFormatter={v => v?.substring(5)} />
                        <YAxis tick={{ fill: p.tick, fontSize: 11 }} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip contentStyle={{ background: p.tooltipBg, border: 'none', borderRadius: 12 }} />
                        <Area type="monotone" dataKey="balance" stroke="#6366f1" fill="url(#cfGrad)" strokeWidth={2} name="Balance" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Scenarios */}
                {cashFlow.scenarios && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Optimistic', value: cashFlow.scenarios.optimistic?.endBalance, color: 'emerald' },
                      { label: 'Expected', value: cashFlow.scenarios.expected?.endBalance, color: 'indigo' },
                      { label: 'Pessimistic', value: cashFlow.scenarios.pessimistic?.endBalance, color: 'red' },
                    ].map((s, i) => (
                      <div key={i} className={`rounded-2xl p-5 border ${p.card} text-center`}>
                        <span className={`text-xs font-bold uppercase ${p.sub}`}>{s.label} Scenario</span>
                        <p className={`text-2xl font-bold text-${s.color}-500 mt-2`}>
                          ₹{(s.value || 0).toLocaleString('en-IN')}
                        </p>
                        <span className={`text-xs ${p.muted}`}>End Balance (30 days)</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alerts */}
                {cashFlow.alerts?.length > 0 && (
                  <div className={`rounded-2xl p-6 border ${p.card}`}>
                    <h3 className={`text-lg font-bold ${p.text} mb-3`}>Cash Flow Alerts</h3>
                    {cashFlow.alerts.map((a, i) => (
                      <div key={i} className={`flex items-start gap-2 p-3 rounded-xl mb-2 ${dk ? 'bg-red-900/10' : 'bg-red-50'}`}>
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                        <p className={`text-sm ${p.text}`}>{a.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════ LEARN TAB ═══════ */}
            {activeTab === 'learn' && (
              <div className="space-y-6">
                <div className={`rounded-2xl p-6 border ${p.card}`}>
                  <h3 className={`text-lg font-bold ${p.text} mb-2 flex items-center gap-2`}>
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Financial Literacy Center
                  </h3>
                  <p className={`text-sm ${p.sub} mb-4`}>Learn essential financial concepts with real Indian context</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: '50-30-20', title: '50/30/20 Budget Rule', cat: 'Budgeting', icon: Target },
                      { id: 'emergency-fund', title: 'Emergency Fund', cat: 'Savings', icon: Shield },
                      { id: 'compound-interest', title: 'Compound Interest', cat: 'Investing', icon: TrendingUp },
                      { id: 'sip', title: 'SIP Investing', cat: 'Investing', icon: Activity },
                      { id: 'section-80c', title: 'Section 80C Tax Saving', cat: 'Tax', icon: DollarSign },
                      { id: 'credit-score', title: 'CIBIL Score', cat: 'Credit', icon: Star },
                      { id: 'debt-to-income', title: 'Debt-to-Income Ratio', cat: 'Debt', icon: CreditCard },
                      { id: 'asset-allocation', title: 'Asset Allocation', cat: 'Investing', icon: PieIcon },
                    ].map(concept => {
                      const Icon = concept.icon;
                      return (
                        <button key={concept.id}
                          onClick={async () => {
                            try {
                              const res = await aiIntelligenceService.getConcept(concept.id);
                              const c = res.data?.data;
                              if (c) {
                                alert(`${c.title}\n\n${c.explanation}\n\n📌 Example: ${c.realWorldExample}\n\n🇮🇳 Indian Context: ${c.indianContext}\n\n✅ Action: ${c.actionStep}`);
                              }
                            } catch {}
                          }}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:scale-[1.02] hover:shadow-md ${
                            dk ? 'border-slate-700/50 hover:border-indigo-500/30' : 'border-gray-200 hover:border-indigo-300'
                          }`}>
                          <div className={`p-2 rounded-lg ${dk ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                            <Icon className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <h4 className={`text-sm font-semibold ${p.text}`}>{concept.title}</h4>
                            <span className={`text-[10px] ${p.muted}`}>{concept.cat}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${p.muted} ml-auto`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
