import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import {
  Flame, TrendingUp, Target, Wallet, Calendar, Shield, Clock,
  DollarSign, Percent, ArrowUpRight, ArrowDownRight, CheckCircle,
  AlertTriangle, Info, ChevronRight, RefreshCw, Settings, Star,
  BarChart3, LineChart, PieChart, Zap, Calculator, Landmark,
  Building2, Briefcase, Heart, Award, Download, Share2, Eye, EyeOff
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  FIRE TRACKER - Financial Independence / Retire Early Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

const FIRE_TYPES = {
  lean: { label: 'Lean FIRE', color: '#10B981', multiplier: 0.6, description: 'Basic lifestyle, minimal expenses' },
  regular: { label: 'FIRE', color: '#3B82F6', multiplier: 1.0, description: 'Current lifestyle maintained' },
  fat: { label: 'Fat FIRE', color: '#8B5CF6', multiplier: 1.5, description: 'Premium lifestyle, extra comfort' },
  coast: { label: 'Coast FIRE', color: '#F59E0B', multiplier: null, description: 'Stop saving, let investments grow' },
  barista: { label: 'Barista FIRE', color: '#EC4899', multiplier: 0.5, description: 'Part-time work covers basic expenses' }
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString('en-IN')}`;
};

// ─── FIRE Number Display ─────────────────────────────────────────────────────

const FIRENumberDisplay = ({ fireMetrics, palette, showValues, type = 'regular' }) => {
  const metrics = fireMetrics || {};
  const fireType = FIRE_TYPES[type] || FIRE_TYPES.regular;
  const fireNumber = type === 'lean' ? metrics.leanFireNumber : type === 'fat' ? metrics.fatFireNumber : metrics.fireNumber;
  const progress = fireNumber > 0 ? Math.min(100, (metrics.currentNetWorth / fireNumber) * 100) : 0;

  return (
    <div className={`${palette.card} rounded-2xl border p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${palette.text}`}>{fireType.label} Number</h2>
            <p className={`text-sm ${palette.textMuted}`}>{fireType.description}</p>
          </div>
        </div>

        {/* FIRE Number */}
        <div className="text-center mb-6">
          <p className={`text-sm ${palette.textMuted} mb-1`}>Your {fireType.label} Number</p>
          <p className="text-4xl font-bold" style={{ color: fireType.color }}>
            {showValues ? formatCurrency(fireNumber || 0) : '••••••'}
          </p>
          <p className={`text-sm ${palette.textMuted} mt-1`}>25x annual expenses{type !== 'regular' ? ` (${(fireType.multiplier * 100).toFixed(0)}% of current)` : ''}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className={palette.textSub}>Progress to {fireType.label}</span>
            <span className="font-bold" style={{ color: fireType.color }}>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden relative">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%`, backgroundColor: fireType.color }} />
            {/* Milestone markers */}
            {[25, 50, 75].map(pct => (
              <div key={pct} className="absolute top-0 h-full w-0.5 bg-white dark:bg-slate-900 opacity-50" style={{ left: `${pct}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={palette.textMuted}>Current: {showValues ? formatCurrency(metrics.currentNetWorth || 0) : '••'}</span>
            <span className={palette.textMuted}>Target: {showValues ? formatCurrency(fireNumber || 0) : '••'}</span>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${fireType.color}10` }}>
            <p className={`text-xs ${palette.textMuted}`}>FIRE Age</p>
            <p className="text-xl font-bold" style={{ color: fireType.color }}>{metrics.fireAge || '—'}</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${fireType.color}10` }}>
            <p className={`text-xs ${palette.textMuted}`}>Years Left</p>
            <p className="text-xl font-bold" style={{ color: fireType.color }}>{metrics.yearsToFIRE || '—'}</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: `${fireType.color}10` }}>
            <p className={`text-xs ${palette.textMuted}`}>Savings Rate</p>
            <p className="text-xl font-bold" style={{ color: fireType.color }}>{(metrics.savingsRate || 0).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── FIRE Scenario Planner ───────────────────────────────────────────────────

const FIREScenarioPlanner = ({ fireMetrics, palette }) => {
  const [monthlyExpenses, setMonthlyExpenses] = useState(fireMetrics?.annualExpenses ? Math.round(fireMetrics.annualExpenses / 12) : 60000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(Math.round(fireMetrics?.monthlyInvestmentNeeded || 30000));
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [inflation, setInflation] = useState(6);

  const scenario = useMemo(() => {
    const annualExpenses = monthlyExpenses * 12;
    const fireNumber = annualExpenses * (100 / withdrawalRate);
    const currentNetWorth = fireMetrics?.currentNetWorth || 0;
    const realReturn = (expectedReturn - inflation) / 100;
    const monthlyRate = expectedReturn / 12 / 100;

    // Calculate years to FIRE
    let yearsToFIRE = 0;
    let accumulated = currentNetWorth;
    const yearlyInvestment = monthlyInvestment * 12;

    while (accumulated < fireNumber && yearsToFIRE < 100) {
      accumulated = (accumulated + yearlyInvestment) * (1 + realReturn);
      yearsToFIRE++;
    }

    // Safe withdrawal
    const safeWithdrawal = currentNetWorth * (withdrawalRate / 100);
    const monthlyWithdrawal = safeWithdrawal / 12;

    // Corpus sustainability (years the corpus would last)
    let corpus = fireNumber;
    let sustainYears = 0;
    while (corpus > 0 && sustainYears < 100) {
      corpus = (corpus - annualExpenses) * (1 + (expectedReturn - inflation) / 100);
      sustainYears++;
    }

    return {
      fireNumber,
      yearsToFIRE: Math.min(yearsToFIRE, 99),
      safeWithdrawal,
      monthlyWithdrawal,
      sustainYears: Math.min(sustainYears, 99),
      annualExpenses,
      progress: fireNumber > 0 ? (currentNetWorth / fireNumber) * 100 : 0
    };
  }, [monthlyExpenses, monthlyInvestment, expectedReturn, withdrawalRate, inflation, fireMetrics]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-orange-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>FIRE Scenario Planner</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className={`text-xs ${palette.textMuted}`}>Monthly Expenses: {formatCurrency(monthlyExpenses)}</label>
          <input type="range" min="10000" max="500000" step="5000" value={monthlyExpenses} onChange={e => setMonthlyExpenses(parseInt(e.target.value))} className="w-full accent-red-500" />
        </div>
        <div>
          <label className={`text-xs ${palette.textMuted}`}>Monthly Investment: {formatCurrency(monthlyInvestment)}</label>
          <input type="range" min="5000" max="500000" step="5000" value={monthlyInvestment} onChange={e => setMonthlyInvestment(parseInt(e.target.value))} className="w-full accent-emerald-500" />
        </div>
        <div>
          <label className={`text-xs ${palette.textMuted}`}>Expected Return: {expectedReturn}%</label>
          <input type="range" min="5" max="20" value={expectedReturn} onChange={e => setExpectedReturn(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div>
          <label className={`text-xs ${palette.textMuted}`}>Withdrawal Rate: {withdrawalRate}%</label>
          <input type="range" min="2" max="6" step="0.5" value={withdrawalRate} onChange={e => setWithdrawalRate(parseFloat(e.target.value))} className="w-full accent-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
          <p className={`text-xs ${palette.textMuted}`}>FIRE Number</p>
          <p className="text-lg font-bold text-orange-500">{formatCurrency(scenario.fireNumber)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className={`text-xs ${palette.textMuted}`}>Years to FIRE</p>
          <p className="text-lg font-bold text-blue-500">{scenario.yearsToFIRE}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <p className={`text-xs ${palette.textMuted}`}>Monthly Withdrawal</p>
          <p className="text-lg font-bold text-emerald-500">{formatCurrency(scenario.monthlyWithdrawal)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
          <p className={`text-xs ${palette.textMuted}`}>Corpus Lasts</p>
          <p className="text-lg font-bold text-purple-500">{scenario.sustainYears}+ years</p>
        </div>
      </div>
    </div>
  );
};

// ─── Savings Rate Impact ─────────────────────────────────────────────────────

const SavingsRateImpact = ({ palette }) => {
  const rates = [10, 20, 30, 40, 50, 60, 70, 80];
  const data = rates.map(rate => {
    // Years to FI assuming 7% real return and spending the rest
    // Formula: years = -ln(1 - rate/100 * 25) / ln(1.07)
    const savingsRatio = rate / 100;
    const yearsToFI = savingsRatio > 0 ? Math.log((savingsRatio * 25 + 1)) / Math.log(1.07) : 99;
    return { rate, years: Math.min(Math.round(yearsToFI * 10) / 10, 99) };
  });

  const maxYears = Math.max(...data.map(d => d.years));

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>Savings Rate Impact</h3>
      </div>
      <p className={`text-sm ${palette.textMuted} mb-4`}>How your savings rate affects years to financial independence</p>

      <div className="flex items-end gap-2 h-48">
        {data.map((d, i) => {
          const height = maxYears > 0 ? (d.years / maxYears) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className={`text-[10px] font-medium ${palette.text} mb-1`}>{d.years}y</span>
              <div className="w-full relative" style={{ height: '160px' }}>
                <div className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-blue-400 transition-all duration-500" style={{ height: `${height}%` }} />
              </div>
              <span className={`text-xs font-medium ${palette.textSub} mt-2`}>{d.rate}%</span>
            </div>
          );
        })}
      </div>
      <p className={`text-xs text-center ${palette.textMuted} mt-2`}>Savings Rate (%)</p>

      <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className={`text-xs ${palette.textSub}`}>
            At a 50% savings rate, you could be financially independent in ~17 years. 
            The relationship between savings rate and years to FI is non-linear — small increases at high savings rates have dramatic impact.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── FIRE Milestones ─────────────────────────────────────────────────────────

const FIREMilestones = ({ fireMetrics, palette }) => {
  const milestones = useMemo(() => {
    const fireNumber = fireMetrics?.fireNumber || 0;
    const currentNetWorth = fireMetrics?.currentNetWorth || 0;

    return [
      { label: 'Emergency Fund Built', target: fireMetrics?.annualExpenses ? fireMetrics.annualExpenses * 0.5 : 300000, icon: Shield, color: '#10B981' },
      { label: '10% of FIRE Number', target: fireNumber * 0.1, icon: Star, color: '#3B82F6' },
      { label: '25% of FIRE Number', target: fireNumber * 0.25, icon: Target, color: '#8B5CF6' },
      { label: 'Coast FIRE', target: fireMetrics?.coastFireAge ? fireNumber * 0.3 : fireNumber * 0.35, icon: Flame, color: '#F59E0B' },
      { label: '50% of FIRE Number', target: fireNumber * 0.5, icon: Award, color: '#EC4899' },
      { label: '75% of FIRE Number', target: fireNumber * 0.75, icon: TrendingUp, color: '#06B6D4' },
      { label: 'Lean FIRE', target: fireNumber * 0.6, icon: Flame, color: '#10B981' },
      { label: 'Full FIRE', target: fireNumber, icon: Flame, color: '#EF4444' },
      { label: 'Fat FIRE', target: fireNumber * 1.5, icon: Flame, color: '#8B5CF6' }
    ].map(m => ({
      ...m,
      achieved: currentNetWorth >= m.target,
      progress: m.target > 0 ? Math.min(100, (currentNetWorth / m.target) * 100) : 0
    }));
  }, [fireMetrics]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-5 h-5 text-amber-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>FIRE Milestones</h3>
      </div>

      <div className="space-y-3">
        {milestones.map((milestone, i) => {
          const MIcon = milestone.icon;
          return (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${milestone.achieved ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${milestone.achieved ? 'bg-emerald-500' : ''}`} style={{ backgroundColor: milestone.achieved ? undefined : `${milestone.color}15` }}>
                {milestone.achieved ? <CheckCircle className="w-4 h-4 text-white" /> : <MIcon className="w-4 h-4" style={{ color: milestone.color }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${milestone.achieved ? 'text-emerald-600 dark:text-emerald-400 line-through' : palette.text}`}>{milestone.label}</span>
                  <span className={`text-xs ${palette.textMuted}`}>{formatCurrency(milestone.target)}</span>
                </div>
                {!milestone.achieved && (
                  <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-slate-700 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${milestone.progress}%`, backgroundColor: milestone.color }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── What-If Analyzer ────────────────────────────────────────────────────────

const WhatIfAnalyzer = ({ fireMetrics, palette }) => {
  const scenarios = useMemo(() => {
    const base = fireMetrics?.yearsToFIRE || 20;
    return [
      { label: 'Save ₹10K more/month', impact: -Math.round(base * 0.15), detail: 'Retire earlier by reducing discretionary spending' },
      { label: 'Get 2% higher returns', impact: -Math.round(base * 0.2), detail: 'Switch to growth-oriented portfolio allocation' },
      { label: 'Reduce expenses by 20%', impact: -Math.round(base * 0.25), detail: 'Lower your FIRE number significantly' },
      { label: 'Delay retirement by 3 years', impact: 3, detail: 'More accumulation time, smaller monthly SIP needed' },
      { label: 'Part-time work (₹20K/month)', impact: -Math.round(base * 0.1), detail: 'Barista FIRE approach reduces corpus needed' },
      { label: 'Market crash (-30%)', impact: Math.round(base * 0.15), detail: 'Temporary setback, stay the course' }
    ];
  }, [fireMetrics]);

  return (
    <div className={`${palette.card} rounded-2xl border p-6`}>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-cyan-500" />
        <h3 className={`text-lg font-bold ${palette.text}`}>What-If Analysis</h3>
      </div>

      <div className="space-y-3">
        {scenarios.map((scenario, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: palette.text === 'text-white' ? 'rgba(71,85,105,0.3)' : 'rgba(226,232,240,0.8)' }}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${scenario.impact < 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {scenario.impact < 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${palette.text}`}>{scenario.label}</p>
              <p className={`text-xs ${palette.textMuted}`}>{scenario.detail}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${scenario.impact < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {scenario.impact < 0 ? '' : '+'}{scenario.impact} years
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main FIRETracker Component ──────────────────────────────────────────────

const FIRETracker = () => {
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
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [fireMetrics, setFireMetrics] = useState(null);

  const fetchFIREMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/wealth/fire-metrics');
      const data = res.data?.data;
      if (data && Object.keys(data).length > 0) {
        setFireMetrics(data);
      } else {
        // No data from API — show empty state with zeros
        setFireMetrics({
          fireNumber: 0, leanFireNumber: 0, fatFireNumber: 0,
          currentNetWorth: 0, progressPercent: 0, yearsToFIRE: 0,
          fireAge: 0, coastFireAge: 0, safeWithdrawal: 0,
          annualExpenses: 0, annualIncome: 0, savingsRate: 0,
          monthlyInvestmentNeeded: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch FIRE metrics:', err);
      // On error, show empty state — no dummy data
      setFireMetrics({
        fireNumber: 0, leanFireNumber: 0, fatFireNumber: 0,
        currentNetWorth: 0, progressPercent: 0, yearsToFIRE: 0,
        fireAge: 0, coastFireAge: 0, safeWithdrawal: 0,
        annualExpenses: 0, annualIncome: 0, savingsRate: 0,
        monthlyInvestmentNeeded: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFIREMetrics(); }, [fetchFIREMetrics]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Flame },
    { key: 'scenarios', label: 'Scenarios', icon: Calculator },
    { key: 'milestones', label: 'Milestones', icon: Award },
    { key: 'impact', label: 'What-If', icon: Zap }
  ];

  if (loading) {
    return (
      <MainLayout title="FIRE Tracker">
        <div className={`min-h-screen ${palette.bg} flex items-center justify-center`}>
          <div className="text-center"><Flame className="w-10 h-10 text-orange-500 animate-pulse mx-auto mb-4" /><p className={palette.textSub}>Calculating your FIRE metrics...</p></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="FIRE Tracker" subtitle="Financial Independence / Retire Early">
      <div className={`min-h-screen ${palette.bg} p-4 lg:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl lg:text-3xl font-bold ${palette.text}`}>FIRE Tracker</h1>
              <p className={`${palette.textSub}`}>Track your path to Financial Independence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowValues(!showValues)} className={`p-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder}`}>
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={fetchFIREMetrics} className={`p-2 rounded-xl ${palette.btnBg} border ${palette.btnBorder}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-xl ${palette.card} border mb-6 overflow-x-auto`}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : `${palette.textSub}`}`}>
                <TabIcon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FIRENumberDisplay fireMetrics={fireMetrics} palette={palette} showValues={showValues} type="lean" />
              <FIRENumberDisplay fireMetrics={fireMetrics} palette={palette} showValues={showValues} type="regular" />
              <FIRENumberDisplay fireMetrics={fireMetrics} palette={palette} showValues={showValues} type="fat" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SavingsRateImpact palette={palette} />
              <FIREMilestones fireMetrics={fireMetrics} palette={palette} />
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FIREScenarioPlanner fireMetrics={fireMetrics} palette={palette} />
            <SavingsRateImpact palette={palette} />
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FIREMilestones fireMetrics={fireMetrics} palette={palette} />
            <FIRENumberDisplay fireMetrics={fireMetrics} palette={palette} showValues={showValues} type="regular" />
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WhatIfAnalyzer fireMetrics={fireMetrics} palette={palette} />
            <FIREScenarioPlanner fireMetrics={fireMetrics} palette={palette} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FIRETracker;
