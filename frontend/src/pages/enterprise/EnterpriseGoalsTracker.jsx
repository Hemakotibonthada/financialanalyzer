// ============================================================================
// ENTERPRISE FINANCIAL GOALS TRACKER
// ============================================================================
// AI-powered goal setting with progress tracking, milestone management,
// savings projections, and smart recommendations.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartTooltip, CartesianGrid,
} from 'recharts';
import {
  Target, Plus, Edit3, Trash2, TrendingUp, CheckCircle2, AlertTriangle,
  BrainCircuit, Sparkles, RefreshCw, Calendar, DollarSign, Percent,
  ArrowUpRight, Zap, Star, Clock, Gift, Home, Car, BookOpen,
  Plane, Heart, Shield, GraduationCap, Briefcase, Check, X,
  ChevronRight, IndianRupee, Trophy, Flag,
} from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  PageTransition, AnimatedCard, GlassCard, Badge, Shimmer,
  AnimatedNumber, ProgressRing, AnimatedTabs, EmptyState,
  colorPalette, chartColors,
} from '../../components/enterprise/EnterpriseAnimationSystem';

// ============================================================================
// §1  CONSTANTS
// ============================================================================

const GOAL_CATEGORIES = [
  { name: 'Emergency Fund', icon: Shield, color: '#10B981', emoji: '🛡️' },
  { name: 'Home Purchase', icon: Home, color: '#3B82F6', emoji: '🏠' },
  { name: 'Car Purchase', icon: Car, color: '#8B5CF6', emoji: '🚗' },
  { name: 'Education', icon: GraduationCap, color: '#F59E0B', emoji: '🎓' },
  { name: 'Travel', icon: Plane, color: '#06B6D4', emoji: '✈️' },
  { name: 'Wedding', icon: Heart, color: '#EC4899', emoji: '💍' },
  { name: 'Retirement', icon: Briefcase, color: '#6366F1', emoji: '🏖️' },
  { name: 'Investment', icon: TrendingUp, color: '#14B8A6', emoji: '📈' },
  { name: 'Gadget', icon: Star, color: '#F43F5E', emoji: '📱' },
  { name: 'Custom', icon: Gift, color: '#A855F7', emoji: '🎯' },
];

const PRIORITY_LEVELS = [
  { value: 'critical', label: 'Critical', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'low', label: 'Low', color: '#6B7280' },
];

// ============================================================================
// §2  SUB-COMPONENTS
// ============================================================================

const GoalCard = ({ goal, onEdit, onDelete, onAddSavings }) => {
  const target = goal.targetAmount || goal.target || 0;
  const saved = goal.savedAmount || goal.currentAmount || goal.saved || 0;
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const remaining = Math.max(0, target - saved);
  const catInfo = GOAL_CATEGORIES.find(c => c.name === goal.category) || GOAL_CATEGORIES[9];
  const CatIcon = catInfo.icon;

  const deadline = goal.deadline || goal.targetDate;
  const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const monthsLeft = daysLeft !== null ? Math.max(1, Math.ceil(daysLeft / 30)) : null;
  const monthlySavingsNeeded = monthsLeft ? Math.round(remaining / monthsLeft) : null;

  const isCompleted = pct >= 100;
  const isAtRisk = daysLeft !== null && daysLeft < 90 && pct < 50;

  return (
    <AnimatedCard className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${
      isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
      isAtRisk ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
      'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: catInfo.color + '15' }}>
            <CatIcon className="w-5 h-5" style={{ color: catInfo.color }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{goal.name || goal.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={isCompleted ? 'success' : isAtRisk ? 'warning' : 'info'}>
                {isCompleted ? 'Completed' : isAtRisk ? 'At Risk' : `${pct}%`}
              </Badge>
              {goal.priority && (
                <span className="text-[10px] font-medium" style={{ color: (PRIORITY_LEVELS.find(p => p.value === goal.priority) || {}).color }}>
                  {goal.priority.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {onEdit && <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 className="w-3.5 h-3.5 text-gray-400" /></button>}
          {onDelete && <button onClick={() => onDelete(goal._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">₹{saved.toLocaleString('en-IN')} saved</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">₹{target.toLocaleString('en-IN')}</span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
            width: `${pct}%`,
            backgroundColor: isCompleted ? '#10B981' : isAtRisk ? '#F59E0B' : catInfo.color,
          }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Remaining</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{remaining.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">{daysLeft !== null ? 'Days Left' : 'Status'}</p>
          <p className={`text-xs font-semibold ${daysLeft !== null && daysLeft < 30 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
            {daysLeft !== null ? daysLeft : isCompleted ? '✅' : 'Open'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Monthly Need</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {monthlySavingsNeeded ? `₹${monthlySavingsNeeded.toLocaleString('en-IN')}` : '—'}
          </p>
        </div>
      </div>

      {/* Quick Add */}
      {!isCompleted && onAddSavings && (
        <button onClick={() => onAddSavings(goal)}
          className="mt-3 w-full py-2 text-xs font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Progress
        </button>
      )}
    </AnimatedCard>
  );
};

const AddGoalModal = ({ open, onClose, onSave, editData }) => {
  const [form, setForm] = useState({
    name: '', category: 'Custom', targetAmount: '', savedAmount: '', deadline: '', priority: 'medium', notes: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || editData.title || '',
        category: editData.category || 'Custom',
        targetAmount: (editData.targetAmount || editData.target || '').toString(),
        savedAmount: (editData.savedAmount || editData.currentAmount || editData.saved || '').toString(),
        deadline: editData.deadline || editData.targetDate ? new Date(editData.deadline || editData.targetDate).toISOString().split('T')[0] : '',
        priority: editData.priority || 'medium',
        notes: editData.notes || '',
      });
    } else {
      setForm({ name: '', category: 'Custom', targetAmount: '', savedAmount: '0', deadline: '', priority: 'medium', notes: '' });
    }
  }, [editData, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editData ? 'Edit Goal' : 'Create Goal'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, targetAmount: parseFloat(form.targetAmount) || 0, savedAmount: parseFloat(form.savedAmount) || 0, _id: editData?._id }); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Goal Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              placeholder="e.g., Buy a house" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <div className="grid grid-cols-5 gap-1.5">
              {GOAL_CATEGORIES.map(cat => (
                <button key={cat.name} type="button" onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                  className={`p-1.5 rounded-lg text-center text-[10px] border transition-all
                    ${form.category === cat.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                  <span className="block text-sm">{cat.emoji}</span>{cat.name.substring(0, 8)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target (₹)</label>
              <input type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                required min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Saved (₹)</label>
              <input type="number" value={form.savedAmount} onChange={e => setForm(f => ({ ...f, savedAmount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white">
                {PRIORITY_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
              rows="2" placeholder="Any notes about this goal..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddSavingsModal = ({ open, onClose, onSave, goal }) => {
  const [amount, setAmount] = useState('');

  if (!open || !goal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 animate-fade-in-scale" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Progress to "{goal.name || goal.title}"</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current: ₹{(goal.savedAmount || goal.currentAmount || goal.saved || 0).toLocaleString('en-IN')} / ₹{(goal.targetAmount || goal.target || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(goal._id, parseFloat(amount) || 0); setAmount(''); }} className="space-y-4">
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            placeholder="Amount saved (₹)" required min="1" autoFocus />
          <div className="flex gap-2">
            {[1000, 5000, 10000, 25000].map(preset => (
              <button key={preset} type="button" onClick={() => setAmount(preset.toString())}
                className="flex-1 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                ₹{(preset / 1000).toFixed(0)}K
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Save
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
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>₹{(p.value || 0).toLocaleString('en-IN')}</p>
      ))}
    </div>
  );
};

// ============================================================================
// §3  MAIN COMPONENT
// ============================================================================

const EnterpriseGoalsTracker = () => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // ------- FETCH -------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals');
      const data = res?.data?.data?.goals || res?.data?.data || res?.data?.goals || res?.data || [];
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Goals fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ------- DERIVED -------
  const stats = useMemo(() => {
    const active = goals.filter(g => {
      const pct = (g.savedAmount || g.currentAmount || g.saved || 0) / (g.targetAmount || g.target || 1);
      return pct < 1;
    });
    const completed = goals.filter(g => {
      const pct = (g.savedAmount || g.currentAmount || g.saved || 0) / (g.targetAmount || g.target || 1);
      return pct >= 1;
    });
    const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || g.target || 0), 0);
    const totalSaved = goals.reduce((s, g) => s + (g.savedAmount || g.currentAmount || g.saved || 0), 0);
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

    return { active, completed, totalTarget, totalSaved, overallPct, activeCount: active.length, completedCount: completed.length };
  }, [goals]);

  const projectionData = useMemo(() => {
    const months = [];
    let cumulative = stats.totalSaved;
    const monthlySavings = stats.totalSaved > 0 ? Math.round(stats.totalSaved / Math.max(1, goals.length * 3)) : 5000;

    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      months.push({
        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        projected: Math.round(cumulative),
        target: stats.totalTarget,
      });
      cumulative += monthlySavings;
    }
    return months;
  }, [stats]);

  const recommendations = useMemo(() => {
    const recs = [];

    stats.active.forEach(g => {
      const saved = g.savedAmount || g.currentAmount || g.saved || 0;
      const target = g.targetAmount || g.target || 0;
      const pct = target > 0 ? (saved / target) * 100 : 0;
      const deadline = g.deadline || g.targetDate;

      if (deadline) {
        const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 30 && pct < 80) {
          recs.push({
            title: `${g.name || g.title} deadline approaching`,
            message: `Only ${daysLeft} days left but only ${Math.round(pct)}% complete. Increase monthly savings.`,
            type: 'warning',
          });
        }
      }

      if (pct === 0 && saved === 0) {
        recs.push({
          title: `Start saving for ${g.name || g.title}`,
          message: `Goal created but no savings yet. Even ₹500/month helps build momentum.`,
          type: 'info',
        });
      }
    });

    if (stats.completedCount > 0) {
      recs.push({
        title: `🎉 ${stats.completedCount} goal${stats.completedCount > 1 ? 's' : ''} completed!`,
        message: 'Great discipline! Consider setting new, larger goals.',
        type: 'success',
      });
    }

    if (!goals.some(g => g.category === 'Emergency Fund')) {
      recs.push({
        title: 'Set up an emergency fund',
        message: 'Financial experts recommend 6 months of expenses as an emergency fund.',
        type: 'suggestion',
      });
    }

    return recs;
  }, [goals, stats]);

  // ------- HANDLERS -------
  const handleSaveGoal = useCallback(async (formData) => {
    try {
      if (formData._id) {
        await api.put(`/goals/${formData._id}`, formData);
      } else {
        await api.post('/goals', formData);
      }
      setShowGoalModal(false);
      setEditData(null);
      fetchData();
    } catch (err) {
      console.error('Save goal error:', err);
    }
  }, [fetchData]);

  const handleAddSavings = useCallback(async (goalId, amount) => {
    try {
      const goal = goals.find(g => g._id === goalId);
      if (!goal) return;
      const currentSaved = goal.savedAmount || goal.currentAmount || goal.saved || 0;
      await api.put(`/goals/${goalId}`, { ...goal, savedAmount: currentSaved + amount, currentAmount: currentSaved + amount });
      setShowSavingsModal(false);
      setSelectedGoal(null);
      fetchData();
    } catch (err) {
      console.error('Add savings error:', err);
    }
  }, [goals, fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete goal error:', err);
    }
  }, [fetchData]);

  const tabs = [
    { id: 'active', label: `Active (${stats.activeCount})`, icon: <Target className="w-4 h-4" /> },
    { id: 'completed', label: `Completed (${stats.completedCount})`, icon: <Trophy className="w-4 h-4" /> },
    { id: 'insights', label: 'AI Insights', icon: <BrainCircuit className="w-4 h-4" />, badge: recommendations.length },
  ];

  const displayGoals = activeTab === 'active' ? stats.active : activeTab === 'completed' ? stats.completed : goals;

  // ------- RENDER -------
  return (
    <MainLayout title="Financial Goals" subtitle="Track & achieve your financial milestones">
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 space-y-6">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="w-7 h-7 text-green-500" />
                Financial Goals
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stats.activeCount} active · {stats.completedCount} completed · {stats.overallPct}% overall
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => { setEditData(null); setShowGoalModal(true); }}
                className="px-4 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Goal
              </button>
            </div>
          </div>

          {/* ─── KPI Cards ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Target', value: stats.totalTarget, icon: Flag, color: 'blue' },
              { label: 'Total Saved', value: stats.totalSaved, icon: IndianRupee, color: 'green' },
              { label: 'Overall Progress', value: stats.overallPct, icon: Percent, color: 'purple', suffix: '%', noRupee: true },
              { label: 'Goals Completed', value: stats.completedCount, icon: Trophy, color: 'amber', noRupee: true },
            ].map((stat, i) => {
              const colors = colorPalette[stat.color] || colorPalette.blue;
              return (
                <AnimatedCard key={i} delay={i * 50} className={`p-4 rounded-2xl ${colors.bg} border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${colors.text}`}>
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

          {/* ─── TAB CONTENT ─── */}
          {(activeTab === 'active' || activeTab === 'completed') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} height={220} rounded="rounded-2xl" />)}
                  </div>
                ) : displayGoals.length === 0 ? (
                  <GlassCard className="p-12">
                    <EmptyState icon={Target}
                      title={activeTab === 'completed' ? 'No completed goals yet' : 'No active goals'}
                      description={activeTab === 'completed' ? 'Complete your first goal to see it here' : 'Create a goal to start tracking your progress'}
                      action={activeTab === 'active' ? () => { setEditData(null); setShowGoalModal(true); } : undefined}
                      actionLabel="Create First Goal" />
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayGoals.map((g, i) => (
                      <GoalCard key={g._id || i} goal={g}
                        onEdit={(data) => { setEditData(data); setShowGoalModal(true); }}
                        onDelete={handleDelete}
                        onAddSavings={(goal) => { setSelectedGoal(goal); setShowSavingsModal(true); }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Savings Projection */}
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">12-Month Projection</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={projectionData}>
                      <defs>
                        <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                      <RechartTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="projected" stroke="#10B981" fill="url(#projGrad)" strokeWidth={2} name="Projected Savings" />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>

                {/* Category Breakdown */}
                <GlassCard className="p-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">By Category</h4>
                  <div className="space-y-2">
                    {(() => {
                      const cats = {};
                      goals.forEach(g => {
                        const cat = g.category || 'Custom';
                        if (!cats[cat]) cats[cat] = { count: 0, saved: 0, target: 0 };
                        cats[cat].count++;
                        cats[cat].saved += g.savedAmount || g.currentAmount || g.saved || 0;
                        cats[cat].target += g.targetAmount || g.target || 0;
                      });
                      return Object.entries(cats).map(([name, data]) => {
                        const catInfo = GOAL_CATEGORIES.find(c => c.name === name) || GOAL_CATEGORIES[9];
                        const pct = data.target > 0 ? Math.round((data.saved / data.target) * 100) : 0;
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <span className="text-sm">{catInfo.emoji}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-700 dark:text-gray-300">{name}</span>
                                <span className="text-xs text-gray-400">{data.count} goal{data.count > 1 ? 's' : ''}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: catInfo.color }} />
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-500">{pct}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-500" /> AI Goal Insights
                </h3>
                {recommendations.length === 0 ? (
                  <GlassCard className="p-8">
                    <EmptyState icon={BrainCircuit} title="No insights yet" description="Add goals to get AI-powered recommendations" />
                  </GlassCard>
                ) : (
                  recommendations.map((rec, i) => (
                    <AnimatedCard key={i} delay={i * 60}
                      className={`p-4 rounded-xl border ${
                        rec.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                        rec.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                        rec.type === 'suggestion' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' :
                        'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                      <div className="flex items-start gap-3">
                        <BrainCircuit className={`w-4 h-4 mt-0.5 ${
                          rec.type === 'warning' ? 'text-amber-500' :
                          rec.type === 'success' ? 'text-green-500' :
                          'text-blue-500'}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.message}</p>
                        </div>
                      </div>
                    </AnimatedCard>
                  ))
                )}
              </div>

              {/* Goal Tips */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Smart Saving Tips
                </h3>
                <GlassCard className="p-5 space-y-3">
                  {[
                    { title: '50-30-20 Rule', desc: '50% needs, 30% wants, 20% savings — simplest budgeting framework.' },
                    { title: 'Automate Savings', desc: 'Set up auto-debit SIPs on salary day. What you don\'t see, you don\'t spend.' },
                    { title: 'Visualize Your Goal', desc: 'Keep a picture of your goal (home, car) visible. Emotional anchoring works.' },
                    { title: 'Emergency Fund First', desc: 'Before other goals, save 6 months expenses in a liquid fund.' },
                    { title: 'Reward Milestones', desc: 'Celebrate 25%, 50%, 75% milestones with small rewards to stay motivated.' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{tip.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </div>
          )}
        </div>

        <AddGoalModal open={showGoalModal} onClose={() => { setShowGoalModal(false); setEditData(null); }}
          onSave={handleSaveGoal} editData={editData} />
        <AddSavingsModal open={showSavingsModal} onClose={() => { setShowSavingsModal(false); setSelectedGoal(null); }}
          onSave={handleAddSavings} goal={selectedGoal} />
      </PageTransition>
    </MainLayout>
  );
};

export default EnterpriseGoalsTracker;
