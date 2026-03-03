import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const BADGE_COLORS = {
  gold: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-400', text: 'text-yellow-700 dark:text-yellow-300', icon: '🏆' },
  silver: { bg: 'bg-slate-100 dark:bg-slate-700/50', border: 'border-slate-400', text: 'text-slate-600 dark:text-slate-300', icon: '🥈' },
  bronze: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300', icon: '🥉' },
};

const CATEGORIES = ['all', 'savings', 'investing', 'debt', 'budgeting', 'literacy'];

const MILESTONES_DATA = [
  { id: 1, title: 'First Savings Goal', description: 'Save your first ₹10,000', category: 'savings', badge: 'bronze', xp: 50, target: 10000, current: 10000, unlocked: true, unlockedAt: '2025-08-15' },
  { id: 2, title: 'Emergency Fund Built', description: 'Build a 3-month emergency fund', category: 'savings', badge: 'silver', xp: 200, target: 150000, current: 150000, unlocked: true, unlockedAt: '2025-11-20' },
  { id: 3, title: 'Six-Month Safety Net', description: 'Save 6 months of expenses', category: 'savings', badge: 'gold', xp: 500, target: 300000, current: 220000, unlocked: false },
  { id: 4, title: 'First Investment', description: 'Make your first investment', category: 'investing', badge: 'bronze', xp: 75, target: 1, current: 1, unlocked: true, unlockedAt: '2025-09-10' },
  { id: 5, title: 'Portfolio Diversifier', description: 'Invest in 5 different asset classes', category: 'investing', badge: 'silver', xp: 250, target: 5, current: 3, unlocked: false },
  { id: 6, title: 'Debt Free Journey', description: 'Pay off your first loan', category: 'debt', badge: 'bronze', xp: 100, target: 1, current: 1, unlocked: true, unlockedAt: '2026-01-05' },
  { id: 7, title: 'Debt Destroyer', description: 'Pay off all credit card debt', category: 'debt', badge: 'gold', xp: 500, target: 100, current: 72, unlocked: false },
  { id: 8, title: 'Budget Master', description: 'Stick to budget for 3 consecutive months', category: 'budgeting', badge: 'silver', xp: 150, target: 3, current: 3, unlocked: true, unlockedAt: '2025-12-01' },
  { id: 9, title: 'Year-Long Budgeter', description: 'Maintain budget for 12 months', category: 'budgeting', badge: 'gold', xp: 400, target: 12, current: 7, unlocked: false },
  { id: 10, title: 'Financial Learner', description: 'Complete 5 financial quizzes', category: 'literacy', badge: 'bronze', xp: 60, target: 5, current: 5, unlocked: true, unlockedAt: '2025-10-18' },
  { id: 11, title: 'Knowledge Seeker', description: 'Score 90%+ on 10 quizzes', category: 'literacy', badge: 'silver', xp: 200, target: 10, current: 6, unlocked: false },
  { id: 12, title: 'Money Guru', description: 'Achieve top rank on leaderboard', category: 'literacy', badge: 'gold', xp: 1000, target: 1, current: 0, unlocked: false },
];

const LEADERBOARD = [
  { rank: 1, name: 'Priya S.', xp: 3200, level: 12 },
  { rank: 2, name: 'Rahul K.', xp: 2850, level: 11 },
  { rank: 3, name: 'You', xp: 1785, level: 8, isUser: true },
  { rank: 4, name: 'Ankit M.', xp: 1600, level: 7 },
  { rank: 5, name: 'Sneha P.', xp: 1450, level: 7 },
];

function getLevel(xp) {
  if (xp >= 3000) return 12;
  if (xp >= 2500) return 11;
  if (xp >= 2000) return 10;
  if (xp >= 1500) return 8;
  if (xp >= 1000) return 6;
  if (xp >= 500) return 4;
  if (xp >= 200) return 2;
  return 1;
}

export default function Milestones() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [celebrating, setCelebrating] = useState(null);
  const [shareOpen, setShareOpen] = useState(null);
  const [milestones, setMilestones] = useState(MILESTONES_DATA);
  const [leaderboard, setLeaderboard] = useState(LEADERBOARD);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const [profileRes, lbRes] = await Promise.allSettled([
          api.get('/achievements/profile'),
          api.get('/achievements/leaderboard'),
        ]);
        if (profileRes.status === 'fulfilled' && profileRes.value.data?.data?.milestones) {
          setMilestones(profileRes.value.data.data.milestones);
        }
        if (lbRes.status === 'fulfilled' && lbRes.value.data?.data) {
          setLeaderboard(lbRes.value.data.data);
        }
      } catch (err) {
        console.log('Achievements fetch fallback to defaults:', err.message);
      }
    };
    fetchAchievements();
  }, []);

  const totalXP = milestones.filter(m => m.unlocked).reduce((s, m) => s + m.xp, 0);
  const level = getLevel(totalXP);
  const nextLevelXP = [0, 200, 500, 500, 1000, 1000, 1500, 1500, 2000, 2000, 2500, 3000, 3500][level + 1] || 3500;

  const filtered = activeCategory === 'all' ? milestones : milestones.filter(m => m.category === activeCategory);
  const unlockedCount = milestones.filter(m => m.unlocked).length;
  const inProgressCount = milestones.filter(m => !m.unlocked && m.current > 0).length;

  const handleCelebrate = (milestone) => {
    setCelebrating(milestone.id);
    setTimeout(() => setCelebrating(null), 2000);
  };

  return (
    <MainLayout title="Milestones">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Milestones & Achievements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your financial journey and earn rewards</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalXP}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total XP</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-2xl font-bold text-purple-600">Lv.{level}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current Level</p>
            </div>
          </div>
        </div>

        {/* XP Progress to next level */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress to Level {level + 1}</span>
            <span className="text-sm text-slate-500">{totalXP} / {nextLevelXP} XP</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700" style={{ width: `${Math.min((totalXP / nextLevelXP) * 100, 100)}%` }} />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Milestones', value: MILESTONES_DATA.length, color: 'text-blue-600' },
            { label: 'Unlocked', value: unlockedCount, color: 'text-green-600' },
            { label: 'In Progress', value: inProgressCount, color: 'text-amber-600' },
            { label: 'Locked', value: MILESTONES_DATA.length - unlockedCount - inProgressCount, color: 'text-slate-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Milestone Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((milestone) => {
            const badge = BADGE_COLORS[milestone.badge];
            const progress = Math.min((milestone.current / milestone.target) * 100, 100);
            const isCelebrating = celebrating === milestone.id;

            return (
              <div
                key={milestone.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-all duration-300 ${
                  isCelebrating ? 'ring-4 ring-yellow-400 scale-105' : ''
                } ${!milestone.unlocked ? 'opacity-80' : ''}`}
              >
                {/* Celebration overlay */}
                {isCelebrating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-yellow-400/20 z-10 animate-pulse">
                    <span className="text-6xl">🎉</span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${badge.bg} border ${badge.border}`}>
                    {badge.icon}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.bg} ${badge.text} border ${badge.border}`}>
                    {milestone.badge.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{milestone.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{milestone.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                    {milestone.category}
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">+{milestone.xp} XP</span>
                </div>

                {/* Progress bar */}
                {!milestone.unlocked && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{milestone.current} / {milestone.target}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {milestone.unlocked ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✅ Unlocked {milestone.unlockedAt}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleCelebrate(milestone)}
                        className="text-xs px-2 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200"
                      >
                        🎉
                      </button>
                      <button
                        onClick={() => setShareOpen(shareOpen === milestone.id ? null : milestone.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">🔒 Keep going to unlock!</p>
                )}

                {/* Share dropdown */}
                {shareOpen === milestone.id && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Share Achievement</p>
                    <div className="flex gap-2">
                      {['Twitter', 'WhatsApp', 'Copy Link'].map(platform => (
                        <button key={platform} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leaderboard Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🏅 Leaderboard</h2>
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  entry.isUser
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                    entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    entry.rank === 2 ? 'bg-slate-300 text-slate-700' :
                    entry.rank === 3 ? 'bg-orange-300 text-orange-800' :
                    'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {entry.rank}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${entry.isUser ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                      {entry.name}
                    </p>
                    <p className="text-xs text-slate-500">Level {entry.level}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{entry.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
