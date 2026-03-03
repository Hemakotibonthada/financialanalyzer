// ============================================================================
// Enhanced Financial Goals V2 — Enterprise Goal Tracking & Savings
// ============================================================================
// Comprehensive financial goal management with progress visualization,
// AI projections, savings milestones, and gamification elements.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import {
  StatCard, SectionHeader, InsightCard, EmptyState,
  ProgressRing, MetricComparison, Timeline,
  QuickAction, LoadingOverlay, AnimatedNumber,
} from '../components/ui/EnterpriseComponents';
import {
  FinancialAreaChart, FinancialBarChart, FinancialDonutChart,
  ChartCard, currencyFormatter,
} from '../components/charts/EnterpriseCharts';
import { FadeIn, StaggerChildren, PageTransition, AnimatedProgress } from '../components/ui/AnimatedComponents';
import api from '../services/api';
import { getAIRecommendations, getCashflowProjection } from '../services/aiService';
import {
  Target, Trophy, Star, Plus, RefreshCw, Calendar,
  TrendingUp, Clock, CheckCircle, Flag, DollarSign,
  Zap, Award, Sparkles, ArrowRight, Edit3,
  Trash2, Gift, Heart, Home, Car, GraduationCap,
  Plane, Smartphone, Shield, Gem, Wallet,
} from 'lucide-react';

// ============================================================================
// GOAL ICONS
// ============================================================================

const GOAL_ICONS = {
  emergency: Shield, retirement: Clock, house: Home, car: Car,
  education: GraduationCap, travel: Plane, wedding: Heart,
  gadget: Smartphone, investment: TrendingUp, other: Target,
  default: Flag,
};

const GOAL_COLORS = {
  emergency: '#ef4444', retirement: '#8b5cf6', house: '#3b82f6',
  car: '#f59e0b', education: '#06b6d4', travel: '#ec4899',
  wedding: '#f97316', gadget: '#6366f1', investment: '#10b981',
  other: '#6b7280', default: '#3b82f6',
};

// ============================================================================
// GOAL CARD
// ============================================================================

const GoalCard = ({ goal, onDelete }) => {
  const name = goal.name || goal.title || 'Unnamed Goal';
  const target = goal.targetAmount || goal.target || 0;
  const saved = goal.currentAmount || goal.saved || goal.progress || 0;
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const remaining = Math.max(target - saved, 0);
  const type = (goal.type || goal.category || 'default').toLowerCase();
  const Icon = GOAL_ICONS[type] || GOAL_ICONS.default;
  const color = GOAL_COLORS[type] || GOAL_COLORS.default;
  const deadline = goal.deadline || goal.targetDate;
  const daysLeft = deadline ? Math.max(Math.ceil((new Date(deadline) - new Date()) / 86400000), 0) : null;
  const isCompleted = pct >= 100;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border ${isCompleted ? 'border-emerald-200 dark:border-emerald-800/40' : 'border-gray-100 dark:border-gray-700/50'} hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{name}</h3>
            {goal.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCompleted && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              ✅ Achieved
            </span>
          )}
          {onDelete && (
            <button onClick={() => onDelete(goal._id)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">Saved</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">₹{saved.toLocaleString('en-IN')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Target</p>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">₹{target.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            backgroundColor: isCompleted ? '#10b981' : color,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-medium" style={{ color: isCompleted ? '#10b981' : color }}>
          {pct.toFixed(0)}% complete
        </span>
        <div className="flex items-center gap-3">
          {remaining > 0 && <span>₹{remaining.toLocaleString('en-IN')} left</span>}
          {daysLeft !== null && (
            <span className={`flex items-center gap-1 ${daysLeft < 30 ? 'text-amber-500' : ''}`}>
              <Clock className="w-3 h-3" /> {daysLeft}d left
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADD GOAL MODAL
// ============================================================================

const AddGoalModal = ({ show, onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: '', targetAmount: '', category: 'other',
    deadline: '', description: '', priority: 'medium',
  });

  const goalTypes = [
    { value: 'emergency', label: '🛡️ Emergency Fund' },
    { value: 'retirement', label: '⏰ Retirement' },
    { value: 'house', label: '🏠 House' },
    { value: 'car', label: '🚗 Car' },
    { value: 'education', label: '🎓 Education' },
    { value: 'travel', label: '✈️ Travel' },
    { value: 'wedding', label: '💍 Wedding' },
    { value: 'investment', label: '📈 Investment' },
    { value: 'other', label: '🎯 Other' },
  ];

  const handleSubmit = () => {
    if (!form.name || !form.targetAmount) return;
    onAdd({ ...form, targetAmount: parseFloat(form.targetAmount) });
    setForm({ name: '', targetAmount: '', category: 'other', deadline: '', description: '', priority: 'medium' });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" /> New Financial Goal
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Goal Name</label>
            <input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              placeholder="e.g., Emergency Fund, New Car"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Target (₹)</label>
              <input
                type="number" value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                placeholder="500000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Deadline</label>
              <input
                type="date" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {goalTypes.map(gt => (
                <button
                  key={gt.value}
                  onClick={() => setForm({ ...form, category: gt.value })}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    form.category === gt.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {gt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/25">
              Create Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedFinancialGoalsV2 = () => {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/goals'),
        getAIRecommendations(),
        getCashflowProjection(),
      ]);
      const get = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;

      const goalsData = get(0)?.data?.data || get(0)?.data?.goals || get(0)?.data || [];
      setGoals(Array.isArray(goalsData) ? goalsData : []);

      const recs = get(1)?.recommendations || get(1)?.data?.recommendations || [];
      setRecommendations(Array.isArray(recs) ? recs.filter(r =>
        (r.category || r.type || r.message || '').toLowerCase().includes('sav') ||
        (r.category || r.type || r.message || '').toLowerCase().includes('goal')
      ) : []);

      const cf = get(2)?.projections || get(2)?.data?.projections || [];
      setCashflow(Array.isArray(cf) ? cf : []);
    } catch (err) {
      console.error('Goals fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived
  const completedGoals = goals.filter(g => {
    const target = g.targetAmount || g.target || 0;
    const saved = g.currentAmount || g.saved || g.progress || 0;
    return target > 0 && saved >= target;
  });
  const activeGoals = goals.filter(g => !completedGoals.includes(g));

  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || g.target || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || g.saved || g.progress || 0), 0);
  const overallProgress = totalTarget > 0 ? ((totalSaved / totalTarget) * 100) : 0;

  const filteredGoals = filter === 'completed' ? completedGoals : filter === 'active' ? activeGoals : goals;

  const goalDistribution = useMemo(() =>
    goals.map(g => ({
      name: g.name || g.title || 'Goal',
      value: g.targetAmount || g.target || 0,
    }))
  , [goals]);

  const handleAddGoal = async (goal) => {
    try {
      await api.post('/goals', goal);
      fetchData();
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingOverlay message="Loading your goals..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* HEADER */}
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/25">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Goals</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Track, achieve, and celebrate your financial milestones</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchData} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-500/25"
                >
                  <Plus className="w-4 h-4" /> New Goal
                </button>
              </div>
            </div>
          </FadeIn>

          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Goals" value={goals.length} color="primary" icon={<Target className="w-5 h-5" />} variant="gradient" />
            <StatCard title="Completed" value={completedGoals.length} color="success" icon={<CheckCircle className="w-5 h-5" />} />
            <StatCard title="Total Saved" value={totalSaved} prefix="₹" color="warning" icon={<Wallet className="w-5 h-5" />} />
            <StatCard title="Overall Progress" value={overallProgress.toFixed(0)} suffix="%" color={overallProgress >= 50 ? 'success' : 'warning'} icon={<TrendingUp className="w-5 h-5" />} />
          </div>

          {/* Progress */}
          {goals.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Progress</h3>
                <span className="text-sm font-bold" style={{ color: overallProgress >= 50 ? '#10b981' : '#f59e0b' }}>
                  ₹{totalSaved.toLocaleString('en-IN')} / ₹{totalTarget.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* FILTER */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: `All (${goals.length})` },
              { id: 'active', label: `Active (${activeGoals.length})` },
              { id: 'completed', label: `Done (${completedGoals.length})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* GOALS GRID */}
          {filteredGoals.length > 0 ? (
            <StaggerChildren staggerDelay={60} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal, i) => (
                <GoalCard key={goal._id || i} goal={goal} onDelete={handleDeleteGoal} />
              ))}
            </StaggerChildren>
          ) : (
            <EmptyState
              title={filter === 'completed' ? 'No completed goals yet' : 'No goals set'}
              description="Create financial goals to start tracking your progress."
            />
          )}

          {/* CHARTS */}
          {goals.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Goal Distribution" subtitle="Target amounts by goal">
                <FinancialDonutChart
                  data={goalDistribution}
                  height={280}
                  centerLabel="Total"
                  centerValue={currencyFormatter(totalTarget)}
                />
              </ChartCard>

              <ChartCard title="Goal Progress" subtitle="Savings vs target">
                <FinancialBarChart
                  data={goals.map(g => ({
                    name: (g.name || g.title || 'Goal').substring(0, 12),
                    saved: g.currentAmount || g.saved || g.progress || 0,
                    target: g.targetAmount || g.target || 0,
                  }))}
                  bars={[
                    { key: 'saved', name: 'Saved', color: '#10b981' },
                    { key: 'target', name: 'Target', color: '#e5e7eb' },
                  ]}
                  xKey="name"
                  height={280}
                />
              </ChartCard>
            </div>
          )}

          {/* AI RECOMMENDATIONS */}
          {recommendations.length > 0 && (
            <>
              <SectionHeader title="AI Goal Advisor" badge={`${recommendations.length} tips`} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.slice(0, 4).map((rec, i) => (
                  <InsightCard
                    key={i}
                    type="tip"
                    title={rec.title || 'Goal Advice'}
                    description={rec.message || rec.description}
                    confidence={rec.confidence}
                  />
                ))}
              </div>
            </>
          )}

          {/* Milestones */}
          {completedGoals.length > 0 && (
            <>
              <SectionHeader title="🏆 Achieved Milestones" badge={`${completedGoals.length}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedGoals.map((g, i) => (
                  <div key={i} className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{g.name || g.title}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      ₹{(g.targetAmount || g.target || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          <AddGoalModal show={showAddGoal} onClose={() => setShowAddGoal(false)} onAdd={handleAddGoal} />

        </div>
      </PageTransition>
    </MainLayout>
  );
};

export default EnhancedFinancialGoalsV2;
