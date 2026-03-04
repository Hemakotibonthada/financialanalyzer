// ============================================================================
// SelfTrainingPanel.jsx — Real-Time AI Self-Training Monitor & Control Center
// ============================================================================
// Features:
//  • Live training progress feed with WebSocket-like polling
//  • Scheduler start/stop with interval configuration
//  • Per-model training logs with accuracy/loss charts
//  • Drift detection alerts with auto-retrain triggers
//  • A/B test runner and result visualizer
//  • Model version history and promotion workflow
//  • Incremental learning from new transactions
//  • Training health metrics dashboard
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { aiModelService, aiTrainingService } from '../../services/api';
import {
  Brain, Play, Square, RefreshCw, Zap, CheckCircle, AlertTriangle,
  Clock, TrendingUp, Activity, BarChart3, Layers, GitBranch, Cpu,
  ChevronDown, ChevronUp, ArrowRightLeft, Shield, Star, AlertOctagon,
  Settings, Database, Gauge, Target, Award, FlaskConical
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// ─── Constants ─────────────────────────────────────────────────────────────
const POLL_MS = 5000;
const INTERVAL_OPTIONS = [
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '3 hours', ms: 3 * 60 * 60 * 1000 },
  { label: '6 hours', ms: 6 * 60 * 60 * 1000 },
  { label: '12 hours', ms: 12 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
];

const MODEL_META = {
  categoryClassifier:   { icon: Layers,      color: '#3b82f6', label: 'Category Classifier' },
  spendingPredictor:    { icon: TrendingUp,   color: '#10b981', label: 'Spending Predictor'  },
  anomalyDetector:      { icon: AlertTriangle,color: '#ef4444', label: 'Anomaly Detector'    },
  healthScorePredictor: { icon: Gauge,        color: '#8b5cf6', label: 'Health Score AI'     },
};

// ─── Utilities ──────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? '—' : typeof n === 'number' ? n.toFixed(3) : n);
const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
const ago = (ts) => {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ running }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${running
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-slate-500/20 text-slate-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
      {running ? 'Running' : 'Stopped'}
    </span>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color = '#3b82f6', dk }) {
  return (
    <div className={`rounded-xl p-4 border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

function ModelCard({ name, info, dk, onTrain, onDrift }) {
  const [expanded, setExpanded] = useState(false);
  const [training, setTraining] = useState(false);
  const meta = MODEL_META[name] || { icon: Brain, color: '#6366f1', label: name };
  const Icon = meta.icon;
  const acc = info?.metrics?.accuracy ?? info?.accuracy ?? null;
  const status = info?.status || 'idle';
  const statusColor = status === 'trained' ? '#10b981' : status === 'training' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#64748b';

  const handleTrain = async () => {
    setTraining(true);
    try { await onTrain(name); } finally { setTraining(false); }
  };

  return (
    <div className={`rounded-xl border transition-all ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${meta.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${dk ? 'text-white' : 'text-gray-900'}`}>{meta.label}</p>
            <p className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{info?.version || 'v1.0.0'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: statusColor }}>
            {acc != null ? pct(acc) : status.toUpperCase()}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className={`px-4 pb-4 border-t ${dk ? 'border-slate-700/50' : 'border-gray-100'}`}>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              ['Accuracy', acc != null ? pct(acc) : '—'],
              ['Samples',  info?.trainingDataSize ?? info?.dataPoints ?? '—'],
              ['Last Trained', ago(info?.lastTrained || info?.trainedAt)],
              ['Status', (info?.status || 'idle').toUpperCase()],
            ].map(([k, v]) => (
              <div key={k}>
                <p className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{k}</p>
                <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{v}</p>
              </div>
            ))}
          </div>

          {/* Accuracy sparkline stub */}
          {info?.history?.length > 1 && (
            <div className="mt-3">
              <p className={`text-xs mb-1 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Accuracy History</p>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={info.history}>
                  <Line type="monotone" dataKey="accuracy" stroke={meta.color} dot={false} strokeWidth={2} />
                  <YAxis domain={[0, 1]} hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleTrain}
              disabled={training}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${training ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
              style={{ background: meta.color, color: '#fff' }}
            >
              {training ? <><RefreshCw className="w-3.5 h-3.5 inline animate-spin mr-1" />Training…</> : <><Play className="w-3.5 h-3.5 inline mr-1" />Retrain</>}
            </button>
            <button
              onClick={() => onDrift(name)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all hover:opacity-80 ${dk ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-600'}`}
            >
              <Shield className="w-3.5 h-3.5 inline mr-1" />Check Drift
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingLogItem({ entry, dk }) {
  const levelColor = { info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
  const c = levelColor[entry.level || 'info'] || '#64748b';
  return (
    <div className={`flex items-start gap-2 py-2 border-b last:border-0 ${dk ? 'border-slate-700/40' : 'border-gray-100'}`}>
      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: c }} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${dk ? 'text-slate-300' : 'text-gray-700'}`}>{entry.message}</p>
        <p className={`text-[10px] mt-0.5 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{entry.time || new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const SelfTrainingPanel = ({ embedded = false }) => {
  const { mode } = useTheme();
  const dk = mode === 'dark' || mode === 'black';

  // ── State ────────────────────────────────────────────────────────────────
  const [scheduler, setScheduler] = useState(null);
  const [registry, setRegistry]   = useState({});
  const [health, setHealth]       = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs]           = useState([]);
  const [driftReports, setDriftReports] = useState({});
  const [abTests, setAbTests]     = useState([]);

  const [loading, setLoading]     = useState(true);
  const [interval_, setInterval_] = useState(INTERVAL_OPTIONS[2].ms); // 1h default
  const [trainAll, setTrainAll]   = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [abForm, setAbForm]       = useState({ name: '', modelA: '', modelB: '', split: 50 });

  const pollRef = useRef(null);
  const logsRef = useRef(null);

  // ── Data Fetch ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [schedRes, regRes, healthRes, dashRes] = await Promise.allSettled([
        aiModelService.getScheduler(),
        aiModelService.getRegistry(),
        aiModelService.getHealth(),
        aiModelService.getDashboard(),
      ]);
      if (schedRes.status === 'fulfilled') setScheduler(schedRes.value.data || schedRes.value.data?.scheduler || {});
      if (regRes.status === 'fulfilled')   setRegistry(regRes.value.data?.registry || regRes.value.data || {});
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data?.health || healthRes.value.data || {});
      if (dashRes.status === 'fulfilled')  setDashboard(dashRes.value.data || {});
    } catch (e) {
      appendLog({ level: 'error', message: `Fetch error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  const appendLog = useCallback((entry) => {
    setLogs(prev => [
      { ...entry, time: new Date().toLocaleTimeString(), id: Date.now() + Math.random() },
      ...prev.slice(0, 199),
    ]);
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  // ── Scheduler Control ─────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      appendLog({ level: 'info', message: `Starting self-training scheduler (interval: ${INTERVAL_OPTIONS.find(o=>o.ms===interval_)?.label})…` });
      const res = await aiModelService.startScheduler(interval_);
      setScheduler(res.data?.scheduler || {});
      appendLog({ level: 'success', message: 'Scheduler started successfully.' });
      fetchAll();
    } catch (e) {
      appendLog({ level: 'error', message: `Failed to start scheduler: ${e.message}` });
    }
  };

  const handleStop = async () => {
    try {
      appendLog({ level: 'warning', message: 'Stopping scheduler…' });
      await aiModelService.stopScheduler();
      appendLog({ level: 'info', message: 'Scheduler stopped.' });
      fetchAll();
    } catch (e) {
      appendLog({ level: 'error', message: `Failed to stop: ${e.message}` });
    }
  };

  // ── Train All ─────────────────────────────────────────────────────────────
  const handleTrainAll = async () => {
    try {
      setTrainAll(true);
      appendLog({ level: 'info', message: 'Triggering full model training pass…' });
      const res = await aiModelService.trainAll();
      appendLog({ level: 'success', message: `Training complete — ${res.data?.modelsCount || 'all'} models updated.` });
      fetchAll();
    } catch (e) {
      appendLog({ level: 'error', message: `Training failed: ${e.message}` });
    } finally {
      setTrainAll(false);
    }
  };

  // ── Single Model Train ────────────────────────────────────────────────────
  const handleTrainOne = async (modelName) => {
    appendLog({ level: 'info', message: `Starting training: ${MODEL_META[modelName]?.label || modelName}…` });
    try {
      const res = await aiModelService.trainModel(modelName);
      appendLog({ level: 'success', message: `${MODEL_META[modelName]?.label || modelName} trained — acc: ${pct(res.data?.accuracy ?? res.data?.metrics?.accuracy)}` });
      fetchAll();
    } catch (e) {
      appendLog({ level: 'error', message: `${modelName} training failed: ${e.message}` });
    }
  };

  // ── Drift Check ───────────────────────────────────────────────────────────
  const handleDriftCheck = async (modelName) => {
    appendLog({ level: 'info', message: `Checking drift for ${MODEL_META[modelName]?.label || modelName}…` });
    try {
      const res = await aiModelService.getDrift(modelName);
      const report = res.data;
      setDriftReports(prev => ({ ...prev, [modelName]: report }));
      const drifted = report?.drifted || report?.hasDrift;
      appendLog({
        level: drifted ? 'warning' : 'success',
        message: `${MODEL_META[modelName]?.label || modelName}: ${drifted ? '⚠ Drift detected — retraining recommended' : '✓ No drift detected'}`
      });
    } catch (e) {
      appendLog({ level: 'error', message: `Drift check failed: ${e.message}` });
    }
  };

  // ── A/B Test ──────────────────────────────────────────────────────────────
  const handleCreateABTest = async () => {
    if (!abForm.name || !abForm.modelA || !abForm.modelB) return;
    try {
      appendLog({ level: 'info', message: `Creating A/B test "${abForm.name}"…` });
      await aiModelService.createABTest(abForm.name, abForm.modelA, abForm.modelB, abForm.split / 100);
      appendLog({ level: 'success', message: `A/B test "${abForm.name}" started.` });
      const res = await aiModelService.getABTestResults(abForm.name);
      setAbTests(prev => [res.data, ...prev.filter(t => t.name !== abForm.name)]);
    } catch (e) {
      appendLog({ level: 'error', message: `A/B test creation failed: ${e.message}` });
    }
  };

  // ── Derived view data ─────────────────────────────────────────────────────
  const modelNames  = useMemo(() => Object.keys(registry), [registry]);
  const totalModels = modelNames.length;
  const trainedCount = modelNames.filter(n => registry[n]?.status === 'trained').length;
  const avgAccuracy  = useMemo(() => {
    const vals = modelNames.map(n => registry[n]?.metrics?.accuracy ?? registry[n]?.accuracy).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }, [registry, modelNames]);
  const schedulerRunning = scheduler?.running || scheduler?.isRunning || scheduler?.active;

  const healthMetrics = useMemo(() => {
    const h = health?.metrics || health || {};
    return [
      { label: 'Overall Health', value: h.overallHealth != null ? `${(h.overallHealth * 100).toFixed(0)}%` : '—', icon: Gauge,      color: '#10b981' },
      { label: 'Avg Accuracy',   value: avgAccuracy != null ? pct(avgAccuracy) : '—',                         icon: Target,     color: '#3b82f6' },
      { label: 'Models Trained', value: `${trainedCount}/${totalModels}`,                                      icon: Brain,      color: '#8b5cf6' },
      { label: 'Next Train',     value: scheduler?.nextRun ? ago(scheduler.nextRun) + ' (in)' : '—',         icon: Clock,      color: '#f59e0b' },
      { label: 'Training Runs',  value: dashboard?.totalTrainingRuns ?? '—',                                   icon: Activity,   color: '#ec4899' },
      { label: 'Data Points',    value: dashboard?.totalDataPoints != null ? dashboard.totalDataPoints.toLocaleString() : '—', icon: Database, color: '#14b8a6' },
    ];
  }, [health, avgAccuracy, trainedCount, totalModels, scheduler, dashboard]);

  const accuracyChart = useMemo(() =>
    modelNames.map(n => ({
      name: MODEL_META[n]?.label || n,
      accuracy: registry[n]?.metrics?.accuracy ?? registry[n]?.accuracy ?? 0,
      color: MODEL_META[n]?.color || '#6366f1',
    })),
  [registry, modelNames]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',  label: 'Overview',   icon: Gauge },
    { id: 'models',    label: 'Models',     icon: Brain },
    { id: 'scheduler', label: 'Scheduler',  icon: Clock },
    { id: 'drift',     label: 'Drift',      icon: Shield },
    { id: 'abtest',    label: 'A/B Tests',  icon: FlaskConical },
    { id: 'logs',      label: 'Live Log',   icon: Activity },
  ];

  const cardCls = `rounded-2xl border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-gray-200'} shadow-sm`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-6'}`}>

      {/* ── Header ── */}
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              Self-Training AI Engine
            </h2>
            <p className={`text-sm mt-0.5 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
              Live model management · autonomous training · drift detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge running={schedulerRunning} />
            <button onClick={handleTrainAll} disabled={trainAll}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all ${trainAll ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {trainAll ? <><Cpu className="w-4 h-4 animate-spin" />Training…</> : <><Zap className="w-4 h-4" />Train All</>}
            </button>
            <button onClick={fetchAll} className={`p-2 rounded-xl border transition-all hover:opacity-80 ${dk ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-600'}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className={`flex flex-wrap gap-1 p-1 rounded-xl ${dk ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
        {tabs.map(tab => {
          const TIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${active
                ? 'bg-indigo-600 text-white shadow-sm'
                : dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-gray-500 hover:text-gray-900 hover:bg-white'
              }`}>
              <TIcon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {healthMetrics.map((m) => (
              <MetricCard key={m.label} {...m} dk={dk} />
            ))}
          </div>

          {/* Accuracy bar chart */}
          {accuracyChart.length > 0 && (
            <div className={`${cardCls} p-5`}>
              <h3 className={`font-bold text-sm mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>
                <BarChart3 className="w-4 h-4 inline mr-2" />Model Accuracy Comparison
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={accuracyChart} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="name" tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill: dk ? '#94a3b8' : '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: dk ? '#1e293b' : '#fff', border: 'none', borderRadius: 10 }}
                    formatter={v => [`${(v*100).toFixed(1)}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                    {accuracyChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Train All Models',   action: handleTrainAll,            icon: Zap,         color: '#6366f1', disabled: trainAll },
              { label: schedulerRunning ? 'Stop Scheduler' : 'Start Scheduler', action: schedulerRunning ? handleStop : handleStart, icon: schedulerRunning ? Square : Play, color: schedulerRunning ? '#ef4444' : '#10b981', disabled: false },
              { label: 'Refresh Status',     action: fetchAll,                  icon: RefreshCw,   color: '#3b82f6', disabled: false },
              { label: 'Check All Drift',    action: () => modelNames.forEach(handleDriftCheck), icon: Shield, color: '#f59e0b', disabled: false },
            ].map(({ label, action, icon: Icon, color, disabled }) => (
              <button key={label} onClick={action} disabled={disabled}
                className={`p-4 rounded-xl border text-center transition-all hover:shadow-md group ${dk ? 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color }} />
                <p className={`text-xs font-medium ${dk ? 'text-slate-300' : 'text-gray-700'}`}>{label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ MODELS TAB ══ */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <p className={`text-sm ${dk ? 'text-slate-400' : 'text-gray-600'}`}>
            Click any model card to expand details and retrain individually.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelNames.map(name => (
              <ModelCard key={name} name={name} info={registry[name]} dk={dk} onTrain={handleTrainOne} onDrift={handleDriftCheck} />
            ))}
            {modelNames.length === 0 && !loading && (
              <div className="col-span-2 text-center py-12">
                <Brain className={`w-16 h-16 mx-auto mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={dk ? 'text-slate-400' : 'text-gray-500'}>No models registered yet. Train the system first.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ SCHEDULER TAB ══ */}
      {activeTab === 'scheduler' && (
        <div className="space-y-5">
          <div className={`${cardCls} p-6`}>
            <h3 className={`font-bold mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>
              <Clock className="w-5 h-5 inline mr-2" />Auto-Training Scheduler
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                ['Status',       schedulerRunning ? 'Running' : 'Stopped'],
                ['Interval',     scheduler?.intervalMs ? `${scheduler.intervalMs / 60000} min` : '—'],
                ['Next Run',     scheduler?.nextRun ? new Date(scheduler.nextRun).toLocaleTimeString() : '—'],
                ['Total Runs',   scheduler?.runCount ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className={`p-3 rounded-lg ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{k}</p>
                  <p className={`font-semibold text-sm mt-0.5 ${dk ? 'text-white' : 'text-gray-900'}`}>{String(v)}</p>
                </div>
              ))}
            </div>

            {/* Interval picker */}
            <div className="mb-5">
              <p className={`text-sm font-medium mb-2 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>Training Interval</p>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_OPTIONS.map(opt => (
                  <button key={opt.ms}
                    onClick={() => setInterval_(opt.ms)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${interval_ === opt.ms
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : dk ? 'border-slate-600 text-slate-300 hover:border-indigo-500' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleStart} disabled={schedulerRunning}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-all ${schedulerRunning ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Play className="w-4 h-4" />Start Scheduler
              </button>
              <button onClick={handleStop} disabled={!schedulerRunning}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all ${!schedulerRunning ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Square className="w-4 h-4" />Stop Scheduler
              </button>
            </div>
          </div>

          {/* Scheduler history if available */}
          {scheduler?.history?.length > 0 && (
            <div className={`${cardCls} p-6`}>
              <h3 className={`font-bold mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>Recent Training Runs</h3>
              <div className="space-y-2">
                {scheduler.history.slice(0, 10).map((run, i) => (
                  <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${dk ? 'border-slate-700/40' : 'border-gray-100'}`}>
                    <div>
                      <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>{run.model || `Run #${i+1}`}</p>
                      <p className={`text-xs ${dk ? 'text-slate-500' : 'text-gray-400'}`}>{new Date(run.timestamp || run.startedAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${run.success !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {run.success !== false ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ DRIFT TAB ══ */}
      {activeTab === 'drift' && (
        <div className="space-y-4">
          <div className={`${cardCls} p-6`}>
            <h3 className={`font-bold mb-1 ${dk ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="w-5 h-5 inline mr-2" />Drift Detection
            </h3>
            <p className={`text-sm mb-5 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
              Checks whether the data distribution feeding a model has shifted, indicating that retraining is needed.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {modelNames.map(name => (
                <button key={name} onClick={() => handleDriftCheck(name)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all">
                  <Shield className="w-4 h-4" />{MODEL_META[name]?.label || name}
                </button>
              ))}
              <button onClick={() => modelNames.forEach(handleDriftCheck)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${dk ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                <Shield className="w-4 h-4" />Check All
              </button>
            </div>
          </div>

          {Object.entries(driftReports).map(([name, report]) => {
            const drifted = report?.drifted || report?.hasDrift;
            return (
              <div key={name} className={`${cardCls} p-5 border-l-4 ${drifted ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{MODEL_META[name]?.label || name}</h4>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${drifted ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {drifted ? '⚠ DRIFT DETECTED' : '✓ NO DRIFT'}
                  </span>
                </div>
                {report?.features && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {Object.entries(report.features).slice(0, 8).map(([feat, val]) => (
                      <div key={feat} className={`p-2 rounded-lg ${dk ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>{feat}</p>
                        <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{typeof val === 'number' ? val.toFixed(3) : String(val)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {drifted && (
                  <button onClick={() => handleTrainOne(name)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all">
                    <RefreshCw className="w-4 h-4" />Retrain Now
                  </button>
                )}
              </div>
            );
          })}

          {Object.keys(driftReports).length === 0 && (
            <div className="text-center py-12">
              <Shield className={`w-16 h-16 mx-auto mb-4 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={dk ? 'text-slate-400' : 'text-gray-500'}>No drift checks run yet. Click a model above to check.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ A/B TEST TAB ══ */}
      {activeTab === 'abtest' && (
        <div className="space-y-5">
          <div className={`${cardCls} p-6`}>
            <h3 className={`font-bold mb-4 ${dk ? 'text-white' : 'text-gray-900'}`}>
              <FlaskConical className="w-5 h-5 inline mr-2" />Create A/B Test
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Test Name',     key: 'name',   ph: 'e.g. category-v1-vs-v2' },
                { label: 'Model A (Control)', key: 'modelA', ph: 'e.g. categoryClassifier' },
                { label: 'Model B (Challenger)', key: 'modelB', ph: 'e.g. categoryClassifier_v2' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-600'}`}>{label}</label>
                  <input
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${dk ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder={ph}
                    value={abForm[key]}
                    onChange={e => setAbForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-medium mb-1 ${dk ? 'text-slate-300' : 'text-gray-600'}`}>Traffic Split (Model A %)</label>
                <input
                  type="range" min={10} max={90} step={10}
                  value={abForm.split}
                  onChange={e => setAbForm(f => ({ ...f, split: parseInt(e.target.value) }))}
                  className="w-full mb-1"
                />
                <div className="flex justify-between text-xs">
                  <span className={dk ? 'text-slate-400' : 'text-gray-500'}>A: {abForm.split}%</span>
                  <span className={dk ? 'text-slate-400' : 'text-gray-500'}>B: {100 - abForm.split}%</span>
                </div>
              </div>
            </div>
            <button onClick={handleCreateABTest}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all">
              <ArrowRightLeft className="w-4 h-4" />Start A/B Test
            </button>
          </div>

          {abTests.map((test, i) => (
            <div key={i} className={`${cardCls} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{test.name || `Test ${i+1}`}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Active</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Model A ({test.trafficSplitA != null ? `${(test.trafficSplitA*100).toFixed(0)}%` : '—'})</p>
                  <p className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{pct(test.modelAAccuracy)}</p>
                </div>
                <div>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Model B ({test.trafficSplitB != null ? `${(test.trafficSplitB*100).toFixed(0)}%` : '—'})</p>
                  <p className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>{pct(test.modelBAccuracy)}</p>
                </div>
                <div>
                  <p className={`text-xs ${dk ? 'text-slate-400' : 'text-gray-500'}`}>Winner</p>
                  <p className={`font-bold text-emerald-500`}>{test.winner || 'Pending…'}</p>
                </div>
              </div>
            </div>
          ))}

          {abTests.length === 0 && (
            <div className="text-center py-10">
              <ArrowRightLeft className={`w-14 h-14 mx-auto mb-3 ${dk ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={dk ? 'text-slate-400' : 'text-gray-500'}>No A/B tests running. Create one above.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ LIVE LOG TAB ══ */}
      {activeTab === 'logs' && (
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              <Activity className="w-4 h-4 inline mr-2" />Live Training Log
            </h3>
            <button onClick={() => setLogs([])} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${dk ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
              Clear
            </button>
          </div>
          <div ref={logsRef} className="space-y-0 max-h-80 overflow-y-auto">
            {logs.length === 0 && (
              <p className={`text-sm text-center py-8 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                No log entries yet. Perform a training action to see output here.
              </p>
            )}
            {logs.map(entry => <TrainingLogItem key={entry.id} entry={entry} dk={dk} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfTrainingPanel;
