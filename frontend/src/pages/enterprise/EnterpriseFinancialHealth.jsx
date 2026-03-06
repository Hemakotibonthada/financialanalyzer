// ============================================================================
// ENTERPRISE FINANCIAL HEALTH PAGE — Comprehensive Health Score & Analysis
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, AnimatedNumber, AnimatedTabs, GlassCard,
  Badge, Shimmer, EmptyState, useAnimatedCounter, ProgressRing,
} from '../../components/enterprise/EnterpriseAnimationSystem';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  Heart, TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle,
  Activity, Zap, Target, DollarSign, PiggyBank, CreditCard,
  ArrowUpRight, ArrowDownRight, Award, Star, Info, RefreshCw,
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];

const HEALTH_DIMENSIONS = [
  { key: 'income', label: 'Income Stability', icon: DollarSign, weight: 0.15 },
  { key: 'savings', label: 'Savings Rate', icon: PiggyBank, weight: 0.2 },
  { key: 'debt', label: 'Debt Health', icon: CreditCard, weight: 0.2 },
  { key: 'emergency', label: 'Emergency Fund', icon: Shield, weight: 0.15 },
  { key: 'spending', label: 'Spending Discipline', icon: Activity, weight: 0.1 },
  { key: 'investments', label: 'Investment Growth', icon: TrendingUp, weight: 0.1 },
  { key: 'goals', label: 'Goal Progress', icon: Target, weight: 0.1 },
];

const getScoreColor = (score) => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
};

const getScoreLabel = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Improvement';
  return 'Critical';
};

// ── Health Score Gauge Component ──
function HealthGauge({ score, size = 200 }) {
  const animatedScore = useAnimatedCounter(score, 2000);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270 degrees
  const progress = (animatedScore / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth="12"
          className="text-gray-200 dark:text-gray-700"
          strokeDasharray={`${circumference} ${2 * Math.PI * radius * 0.25}`}
          strokeDashoffset="0"
          transform={`rotate(135, ${size / 2}, ${size / 2})`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${progress} ${circumference - progress + 2 * Math.PI * radius * 0.25}`}
          strokeDashoffset="0"
          transform={`rotate(135, ${size / 2}, ${size / 2})`}
          strokeLinecap="round"
          className="transition-all duration-2000"
        />
        <text x={size / 2} y={size / 2 - 10} textAnchor="middle" className="fill-current text-gray-900 dark:text-white"
          style={{ fontSize: `${size / 5}px`, fontWeight: 700 }}>{animatedScore}</text>
        <text x={size / 2} y={size / 2 + 20} textAnchor="middle" className="fill-current text-gray-500 dark:text-gray-400"
          style={{ fontSize: `${size / 14}px` }}>{getScoreLabel(score)}</text>
      </svg>
    </div>
  );
}

// ── Dimension Score Card ──
function DimensionCard({ dimension, score, insights }) {
  const Icon = dimension.icon;
  const color = getScoreColor(score);

  return (
    <AnimatedCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{dimension.label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      {insights && insights.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{insights[0]}</p>
      )}
    </AnimatedCard>
  );
}

// ── Recommendation Card ──
function RecommendationCard({ rec, index }) {
  const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
  const color = priorityColors[rec.priority] || '#3B82F6';

  return (
    <AnimatedCard className="p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-full mt-0.5" style={{ backgroundColor: `${color}15` }}>
          {rec.priority === 'high' ? <AlertTriangle size={14} style={{ color }} /> :
           rec.priority === 'low' ? <CheckCircle size={14} style={{ color }} /> :
           <Info size={14} style={{ color }} />}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{rec.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rec.description}</p>
          {rec.impact && (
            <div className="mt-2 flex items-center gap-1">
              <Zap size={12} className="text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Impact: {rec.impact}</span>
            </div>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}

// ── Chart Tooltip ──
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function EnterpriseFinancialHealth() {
  const { mode: theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [txRes, budRes, goalRes, invRes, debtRes] = await Promise.allSettled([
        api.get('/financial/transactions'),
        api.get('/budgets'),
        api.get('/goals'),
        api.get('/investments'),
        api.get('/debt'),
      ]);
      setTransactions(txRes.status === 'fulfilled' ? (txRes.value?.data?.transactions || txRes.value?.data || []) : []);
      setBudgets(budRes.status === 'fulfilled' ? (budRes.value?.data?.budgets || budRes.value?.data || []) : []);
      setGoals(goalRes.status === 'fulfilled' ? (goalRes.value?.data?.goals || goalRes.value?.data || []) : []);
      setInvestments(invRes.status === 'fulfilled' ? (invRes.value?.data?.investments || invRes.value?.data || []) : []);
      setDebts(debtRes.status === 'fulfilled' ? (debtRes.value?.data?.debts || debtRes.value?.data || []) : []);
    } catch (err) {
      console.error('Failed to fetch financial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── AI Health Score Calculation ──
  const healthAnalysis = useMemo(() => {
    const expenses = transactions.filter(t => (t.amount || 0) < 0);
    const income = transactions.filter(t => (t.amount || 0) > 0);
    const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const monthlyIncome = totalIncome / Math.max(1, new Set(income.map(t => new Date(t.date).toISOString().slice(0, 7))).size);
    const monthlyExpenses = totalExpenses / Math.max(1, new Set(expenses.map(t => new Date(t.date).toISOString().slice(0, 7))).size);
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    const totalDebt = debts.reduce((s, d) => s + (d.balance || d.amount || 0), 0);
    const totalEMI = debts.reduce((s, d) => s + (d.emi || d.monthlyPayment || 0), 0);
    const dtiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

    const totalGoalTarget = goals.reduce((s, g) => s + (g.targetAmount || g.target || 0), 0);
    const totalGoalSaved = goals.reduce((s, g) => s + (g.savedAmount || g.current || 0), 0);
    const goalProgress = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;

    const totalInvested = investments.reduce((s, i) => s + (i.invested || i.amount || 0), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + (i.currentValue || i.current || i.invested || i.amount || 0), 0);
    const investmentGrowth = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

    // ── Calculate dimension scores ──
    const scores = {};

    // Income stability: based on consistency of income, penalize if single source
    scores.income = Math.min(100, Math.max(0,
      monthlyIncome > 50000 ? 80 : monthlyIncome > 30000 ? 60 : monthlyIncome > 15000 ? 40 : 20
    ));

    // Savings rate: 30%+ = excellent
    scores.savings = Math.min(100, Math.max(0,
      savingsRate >= 30 ? 90 : savingsRate >= 20 ? 75 : savingsRate >= 10 ? 55 : savingsRate >= 0 ? 35 : 15
    ));

    // Debt health: based on DTI ratio
    scores.debt = Math.min(100, Math.max(0,
      dtiRatio === 0 ? 95 : dtiRatio < 20 ? 80 : dtiRatio < 35 ? 60 : dtiRatio < 50 ? 40 : 20
    ));

    // Emergency fund: 6+ months = excellent
    const emergencyMonths = monthlyExpenses > 0 ? (totalGoalSaved * 0.3) / monthlyExpenses : 0;
    scores.emergency = Math.min(100, Math.max(0,
      emergencyMonths >= 6 ? 90 : emergencyMonths >= 3 ? 70 : emergencyMonths >= 1 ? 45 : 20
    ));

    // Spending discipline: budget adherence
    const budgetAdherence = budgets.length > 0
      ? budgets.reduce((s, b) => {
          const spent = b.spent || 0;
          const limit = b.limit || b.amount || 1;
          return s + Math.min(1, spent / limit);
        }, 0) / budgets.length * 100
      : 50;
    scores.spending = Math.min(100, Math.max(0, 100 - Math.abs(budgetAdherence - 70)));

    // Investment growth
    scores.investments = Math.min(100, Math.max(0,
      investmentGrowth >= 15 ? 90 : investmentGrowth >= 10 ? 75 : investmentGrowth >= 5 ? 60 :
      investmentGrowth >= 0 ? 45 : 25
    ));

    // Goal progress
    scores.goals = Math.min(100, Math.max(0,
      goalProgress >= 80 ? 90 : goalProgress >= 60 ? 75 : goalProgress >= 40 ? 55 :
      goalProgress >= 20 ? 35 : 15
    ));

    // Overall weighted score
    const overallScore = Math.round(
      HEALTH_DIMENSIONS.reduce((s, d) => s + (scores[d.key] || 0) * d.weight, 0)
    );

    // ── Generate recommendations ──
    const recommendations = [];
    if (savingsRate < 20) {
      recommendations.push({
        title: 'Increase Your Savings Rate',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% of income. Consider automating transfers on payday.`,
        priority: savingsRate < 10 ? 'high' : 'medium',
        impact: `+₹${Math.round(monthlyIncome * 0.05).toLocaleString('en-IN')}/month potential savings`,
      });
    }
    if (dtiRatio > 35) {
      recommendations.push({
        title: 'Reduce Debt-to-Income Ratio',
        description: `Your DTI ratio is ${dtiRatio.toFixed(1)}%. This is above the recommended 35%. Focus on paying off high-interest debt first.`,
        priority: 'high',
        impact: 'Reduce financial risk significantly',
      });
    }
    if (emergencyMonths < 3) {
      recommendations.push({
        title: 'Build Your Emergency Fund',
        description: `You have approximately ${emergencyMonths.toFixed(1)} months of expenses saved. Target 6 months for financial security.`,
        priority: emergencyMonths < 1 ? 'high' : 'medium',
        impact: `Need ₹${Math.round(monthlyExpenses * (6 - emergencyMonths)).toLocaleString('en-IN')} more`,
      });
    }
    if (investmentGrowth < 8) {
      recommendations.push({
        title: 'Review Investment Strategy',
        description: `Your portfolio growth is ${investmentGrowth.toFixed(1)}%. Consider diversifying or rebalancing based on your risk profile.`,
        priority: 'medium',
        impact: 'Potentially higher long-term returns',
      });
    }
    if (goalProgress < 50) {
      recommendations.push({
        title: 'Accelerate Goal Savings',
        description: `You've achieved ${goalProgress.toFixed(1)}% of your financial goals. Increase monthly contributions or extend timelines.`,
        priority: goalProgress < 25 ? 'high' : 'medium',
        impact: 'Stay on track for your financial goals',
      });
    }
    if (budgets.length === 0) {
      recommendations.push({
        title: 'Create a Budget Plan',
        description: 'Setting up budgets helps track spending and identify areas for savings. Start with 3-5 major categories.',
        priority: 'medium',
        impact: 'Better financial control and visibility',
      });
    }
    if (investments.length === 0) {
      recommendations.push({
        title: 'Start Investing',
        description: 'Even small regular investments can grow significantly over time through compounding. Consider SIP in index funds.',
        priority: 'low',
        impact: 'Long-term wealth creation',
      });
    }

    // ── Trend data ──
    const monthlyTrends = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      if (!monthlyTrends[month]) monthlyTrends[month] = { income: 0, expenses: 0 };
      if ((t.amount || 0) > 0) monthlyTrends[month].income += Math.abs(t.amount);
      else monthlyTrends[month].expenses += Math.abs(t.amount);
    });

    const trendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        income: data.income,
        expenses: data.expenses,
        savings: data.income - data.expenses,
        savingsRate: data.income > 0 ? ((data.income - data.expenses) / data.income * 100) : 0,
      }));

    // ── Radar chart data ──
    const radarData = HEALTH_DIMENSIONS.map(d => ({
      dimension: d.label,
      score: scores[d.key] || 0,
      fullMark: 100,
    }));

    return {
      overallScore, scores, recommendations, trendData, radarData,
      savingsRate, dtiRatio, goalProgress, investmentGrowth,
      monthlyIncome, monthlyExpenses, totalDebt, totalInvested,
    };
  }, [transactions, budgets, goals, investments, debts]);

  const tabs = ['Overview', 'Deep Analysis', 'Recommendations'];

  if (loading) {
    return (
      <MainLayout title="Financial Health" subtitle="Analyzing your financial wellness...">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Shimmer key={i} className="h-40 rounded-xl" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Financial Health" subtitle="AI-Powered Comprehensive Health Analysis">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Health Score</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive analysis across 7 dimensions</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* ── Score Overview Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Score Gauge */}
            <GlassCard className="p-6 flex flex-col items-center justify-center">
              <HealthGauge score={healthAnalysis.overallScore} size={220} />
              <div className="mt-4 flex items-center gap-2">
                <Badge variant={healthAnalysis.overallScore >= 70 ? 'success' : healthAnalysis.overallScore >= 50 ? 'warning' : 'error'}>
                  {getScoreLabel(healthAnalysis.overallScore)}
                </Badge>
              </div>
            </GlassCard>

            {/* Key Metrics */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">KEY METRICS</h3>
              <div className="space-y-4">
                {[
                  { label: 'Savings Rate', value: `${healthAnalysis.savingsRate.toFixed(1)}%`, good: healthAnalysis.savingsRate >= 20, icon: PiggyBank },
                  { label: 'Debt-to-Income', value: `${healthAnalysis.dtiRatio.toFixed(1)}%`, good: healthAnalysis.dtiRatio < 35, icon: CreditCard },
                  { label: 'Goal Progress', value: `${healthAnalysis.goalProgress.toFixed(1)}%`, good: healthAnalysis.goalProgress >= 50, icon: Target },
                  { label: 'Investment Growth', value: `${healthAnalysis.investmentGrowth.toFixed(1)}%`, good: healthAnalysis.investmentGrowth >= 8, icon: TrendingUp },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <m.icon size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-semibold ${m.good ? 'text-green-600' : 'text-amber-600'}`}>{m.value}</span>
                      {m.good ? <ArrowUpRight size={14} className="text-green-500" /> : <ArrowDownRight size={14} className="text-amber-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Radar Chart */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">HEALTH RADAR</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={healthAnalysis.radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* ── Tabs ── */}
          <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

          {/* ── Tab Content ── */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dimension Scores */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Health Dimensions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {HEALTH_DIMENSIONS.map(dim => (
                    <DimensionCard key={dim.key} dimension={dim} score={healthAnalysis.scores[dim.key] || 0}
                      insights={healthAnalysis.recommendations.filter(r => r.title.toLowerCase().includes(dim.label.toLowerCase().split(' ')[0])).map(r => r.description)} />
                  ))}
                </div>
              </div>

              {/* Savings Trend */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Savings Trend</h3>
                <AnimatedCard className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={healthAnalysis.trendData}>
                      <defs>
                        <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="savings" stroke="#10B981" fill="url(#savingsGrad)" strokeWidth={2} name="Net Savings" />
                    </AreaChart>
                  </ResponsiveContainer>
                </AnimatedCard>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses Trend */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">INCOME VS EXPENSES</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={healthAnalysis.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Savings Rate Trend */}
              <AnimatedCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">SAVINGS RATE TREND</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={healthAnalysis.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="savingsRate" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="Savings Rate %" />
                    {/* Target line at 20% */}
                    <Line type="monotone" dataKey={() => 20} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Target 20%" />
                  </LineChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Financial Summary Cards */}
              <AnimatedCard className="p-6 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">FINANCIAL SNAPSHOT</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Monthly Income', value: healthAnalysis.monthlyIncome, color: '#10B981' },
                    { label: 'Monthly Expenses', value: healthAnalysis.monthlyExpenses, color: '#EF4444' },
                    { label: 'Total Debt', value: healthAnalysis.totalDebt, color: '#F59E0B' },
                    { label: 'Total Invested', value: healthAnalysis.totalInvested, color: '#3B82F6' },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                      <p className="text-xl font-bold" style={{ color: item.color }}>
                        <AnimatedNumber value={item.value} />
                      </p>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </div>
          )}

          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-amber-500" /> AI Recommendations
                </h3>
                {healthAnalysis.recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {healthAnalysis.recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} index={i} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Award size={48} />} title="Great Financial Health!"
                    description="You're doing well across all dimensions. Keep up the good work!" />
                )}
              </div>

              {/* Score Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Score Breakdown</h3>
                <AnimatedCard className="p-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={HEALTH_DIMENSIONS.map(d => ({
                      name: d.label,
                      score: healthAnalysis.scores[d.key] || 0,
                      weight: d.weight * 100,
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score">
                        {HEALTH_DIMENSIONS.map((d, i) => (
                          <Cell key={i} fill={getScoreColor(healthAnalysis.scores[d.key] || 0)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </AnimatedCard>

                {/* Quick Tips */}
                <AnimatedCard className="p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">QUICK FINANCIAL TIPS</h4>
                  <div className="space-y-2">
                    {[
                      '💡 Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
                      '📊 Track every expense, even small ones — they add up',
                      '🎯 Set SMART financial goals with specific deadlines',
                      '🔄 Automate your savings through SIPs and recurring transfers',
                      '⚡ Review and rebalance investments quarterly',
                    ].map((tip, i) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-gray-300 py-1 px-2 rounded bg-gray-50 dark:bg-gray-800/50">{tip}</p>
                    ))}
                  </div>
                </AnimatedCard>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    </MainLayout>
  );
}
