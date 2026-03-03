import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Target, Plus, Edit, Trash2, X, Check, Calendar, TrendingUp,
  Home, Car, GraduationCap, Umbrella, Plane, Heart, Briefcase,
  Sparkles, ChevronLeft, ChevronRight, Award, Star, PartyPopper
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const AnimatedValue = ({ end, prefix = '₹' }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s; const r = { current: null };
    const a = (t) => { if (!s) s = t; const p = Math.min((t - s) / 1200, 1); setV((1 - Math.pow(1 - p, 3)) * end); if (p < 1) r.current = requestAnimationFrame(a); };
    r.current = requestAnimationFrame(a); return () => cancelAnimationFrame(r.current);
  }, [end]);
  return <span>{prefix}{Math.round(v).toLocaleString()}</span>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const GOAL_ICONS = {
  emergency: Umbrella, house: Home, car: Car, education: GraduationCap,
  vacation: Plane, retirement: Briefcase, health: Heart, wedding: Sparkles, other: Target
};

const GOAL_COLORS = {
  emergency: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600', ring: '#f59e0b' },
  house: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', ring: '#3b82f6' },
  car: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600', ring: '#8b5cf6' },
  education: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600', ring: '#06b6d4' },
  vacation: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600', ring: '#ec4899' },
  retirement: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600', ring: '#10b981' },
  health: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600', ring: '#ef4444' },
  wedding: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600', ring: '#f43f5e' },
  other: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600', ring: '#64748b' },
};

const ProgressRing = ({ pct, color, size = 80 }) => {
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-600" />
        <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 40 40)" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-900 dark:text-white">{Math.round(pct)}%</span>
      </div>
    </div>
  );
};

const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none z-50">
    {Array.from({ length: 50 }).map((_, i) => (
      <div key={i} className="absolute animate-bounce" style={{
        left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
        width: 8, height: 8, borderRadius: Math.random() > .5 ? '50%' : '0',
        background: COLORS[i % COLORS.length],
        animationDelay: `${Math.random() * 2}s`, animationDuration: `${1 + Math.random() * 2}s`,
        opacity: 0.8
      }} />
    ))}
  </div>
);

export default function GoalTimeline() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const timelineRef = useRef(null);

  const [newGoal, setNewGoal] = useState({
    name: '', category: 'other', target: '', current: '', deadline: '', monthlySaving: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/goals');
        setGoals(res.data?.goals || res.data || []);
      } catch {
        setGoals([]);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    load();
  }, []);

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.current, 0);
  const completedGoals = goals.filter((g) => g.current >= g.target).length;
  const totalMonthlySaving = goals.reduce((s, g) => s + g.monthlySaving, 0);

  const pctOf = (g) => Math.min(100, (g.current / g.target) * 100);

  const projectedDate = (g) => {
    if (g.current >= g.target) return 'Completed!';
    if (!g.monthlySaving) return 'N/A';
    const remaining = g.target - g.current;
    const months = Math.ceil(remaining / g.monthlySaving);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const monthlyNeeded = (g) => {
    if (g.current >= g.target) return 0;
    const now = new Date();
    const deadline = new Date(g.deadline);
    const months = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
    return Math.ceil((g.target - g.current) / months);
  };

  const addOrUpdateGoal = () => {
    if (!newGoal.name || !newGoal.target) return;
    const goal = {
      id: editGoal?.id || Date.now(),
      name: newGoal.name,
      category: newGoal.category,
      target: +newGoal.target,
      current: +newGoal.current || 0,
      deadline: newGoal.deadline || '2027-12-31',
      monthlySaving: +newGoal.monthlySaving || 0,
      milestones: [],
      createdAt: editGoal?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (editGoal) {
      setGoals(goals.map((g) => g.id === editGoal.id ? goal : g));
    } else {
      setGoals([...goals, goal]);
    }

    if (goal.current >= goal.target) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setNewGoal({ name: '', category: 'other', target: '', current: '', deadline: '', monthlySaving: '' });
    setShowAddModal(false);
    setEditGoal(null);
  };

  const deleteGoal = (id) => setGoals(goals.filter((g) => g.id !== id));

  const openEdit = (g) => {
    setEditGoal(g);
    setNewGoal({ name: g.name, category: g.category, target: g.target, current: g.current, deadline: g.deadline, monthlySaving: g.monthlySaving });
    setShowAddModal(true);
  };

  const scrollTimeline = (dir) => {
    if (timelineRef.current) timelineRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const progressData = useMemo(() => goals.map((g) => ({ name: g.name.split(' ').slice(0, 2).join(' '), progress: Math.round(pctOf(g)), target: 100 })), [goals]);

  const trendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((m, i) => ({
      month: m,
      totalSaved: Math.round(totalCurrent * (0.6 + i * 0.08)),
      target: totalTarget,
    }));
  }, [totalCurrent, totalTarget]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    goals.forEach((g) => { map[g.category] = (map[g.category] || 0) + g.target; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [goals]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Goal Timeline">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {showConfetti && <Confetti />}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3"><Target className="w-8 h-8 text-purple-600" /> Goal Timeline</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track & achieve your financial milestones</p>
          </div>
          <button onClick={() => { setEditGoal(null); setNewGoal({ name: '', category: 'other', target: '', current: '', deadline: '', monthlySaving: '' }); setShowAddModal(true); }} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard-grid animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-blue-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Target</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white"><AnimatedValue end={totalTarget} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Total Saved</span></div>
            <p className="text-2xl font-bold text-emerald-600"><AnimatedValue end={totalCurrent} /></p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-amber-500" /><span className="text-xs text-slate-500 dark:text-slate-400">Completed</span></div>
            <p className="text-2xl font-bold text-amber-600">{completedGoals}/{goals.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-purple-600" /><span className="text-xs text-slate-500 dark:text-slate-400">Monthly Saving</span></div>
            <p className="text-2xl font-bold text-purple-600"><AnimatedValue end={totalMonthlySaving} /></p>
          </div>
        </div>

        {/* Horizontal Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Timeline View</h3>
            <div className="flex gap-2">
              <button onClick={() => scrollTimeline(-1)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => scrollTimeline(1)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={timelineRef} className="flex gap-4 overflow-x-auto pb-4 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            {/* Timeline line */}
            <div className="relative flex gap-6 min-w-max">
              <div className="absolute top-[88px] left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-600" />
              {goals.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map((goal, i) => {
                const pct = pctOf(goal);
                const Icon = GOAL_ICONS[goal.category] || Target;
                const colors = GOAL_COLORS[goal.category] || GOAL_COLORS.other;
                const completed = pct >= 100;

                return (
                  <div key={goal.id} className="relative flex flex-col items-center min-w-[200px]" onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}>
                    {/* Card */}
                    <div className={`w-full p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${completed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{goal.name}</p>
                        </div>
                      </div>
                      <ProgressRing pct={pct} color={colors.ring} size={64} />
                    </div>

                    {/* Timeline dot */}
                    <div className={`mt-2 w-4 h-4 rounded-full border-2 ${completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500'} z-10`} />

                    {/* Date */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>

                    {/* Milestones */}
                    {goal.milestones?.map((m, mi) => (
                      <div key={mi} className={`absolute top-2 ${mi % 2 === 0 ? 'right-1' : 'left-1'}`}>
                        {goal.current >= m.at && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      </div>
                    ))}

                    {completed && (
                      <div className="absolute -top-1 -right-1"><PartyPopper className="w-5 h-5 text-amber-500" /></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Goal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 dashboard-grid">
          {goals.map((goal, i) => {
            const pct = pctOf(goal);
            const Icon = GOAL_ICONS[goal.category] || Target;
            const colors = GOAL_COLORS[goal.category] || GOAL_COLORS.other;
            const completed = pct >= 100;

            return (
              <div key={goal.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border transition-all hover:shadow-lg animate-fade-in-up ${completed ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'}`} style={{ animationDelay: `${i * 80 + 300}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{goal.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{goal.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <ProgressRing pct={pct} color={colors.ring} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Saved</span>
                      <span className="font-semibold text-slate-900 dark:text-white">₹{goal.current.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Target</span>
                      <span className="font-semibold text-slate-900 dark:text-white">₹{goal.target.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%`, background: colors.ring }} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-400">Deadline</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-0.5">{new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-400">Projected</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-0.5">{projectedDate(goal)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-400">Monthly</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-0.5">₹{goal.monthlySaving.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-slate-400">Need/Mo</p>
                    <p className="font-medium text-slate-900 dark:text-white mt-0.5">₹{monthlyNeeded(goal).toLocaleString()}</p>
                  </div>
                </div>

                {completed && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
                    <p className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Goal Achieved!</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Comparison */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Progress Overview</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={progressData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={80} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="progress" radius={[0, 6, 6, 0]}>
                  {progressData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categoryBreakdown.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-slate-600 dark:text-slate-400 capitalize">{d.name}</span></div>
              ))}
            </div>
          </div>

          {/* Savings Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Savings Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="totalSaved" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Add/Edit Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditGoal(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="Goal Name" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />

              {/* Icon Picker */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Category</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(GOAL_ICONS).map(([key, Icon]) => {
                    const colors = GOAL_COLORS[key];
                    return (
                      <button key={key} onClick={() => setNewGoal({ ...newGoal, category: key })} className={`flex items-center gap-2 p-2.5 rounded-xl text-sm capitalize transition-all ${newGoal.category === key ? `${colors.bg} ring-2 ring-blue-500` : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                        <span className="text-slate-700 dark:text-slate-300 text-xs">{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Target Amount</label>
                  <input type="number" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} placeholder="₹" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Current Savings</label>
                  <input type="number" value={newGoal.current} onChange={(e) => setNewGoal({ ...newGoal, current: e.target.value })} placeholder="₹" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Deadline</label>
                  <input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Monthly Saving</label>
                  <input type="number" value={newGoal.monthlySaving} onChange={(e) => setNewGoal({ ...newGoal, monthlySaving: e.target.value })} placeholder="₹" className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowAddModal(false); setEditGoal(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={addOrUpdateGoal} className="flex-1 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-600/30 px-4 py-2.5">{editGoal ? 'Update' : 'Create'} Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}
