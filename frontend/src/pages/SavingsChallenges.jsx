import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatedCard, StatCard, Badge, ProgressRing, AnimatedTabs, EmptyState, SearchInput } from '../components/ui/ComponentLibrary';
import { EnhancedDoughnutChart, EnhancedBarChart, Sparkline } from '../components/ui/ChartComponents';
import { useLocalStorage, useAnimatedCounter } from '../hooks/useCustomHooks';
import { formatCurrency, formatDate } from '../utils/helpers';
import api from '../services/api';

// ============================================================
// Feature #55: Gamified Savings Challenges
// ============================================================

const CHALLENGE_TEMPLATES = [
  { id: 'no-spend-weekend', name: 'No-Spend Weekend', description: 'Go an entire weekend without spending money', duration: 2, type: 'daily', target: 2, icon: '🚫', difficulty: 'Easy', reward: 50, category: 'spending' },
  { id: '52-week', name: '52-Week Challenge', description: 'Save ₹100 in week 1, ₹200 in week 2, and so on', duration: 365, type: 'weekly', target: 137800, icon: '📈', difficulty: 'Hard', reward: 500, category: 'savings' },
  { id: 'round-up', name: 'Round-Up Challenge', description: 'Round up every purchase to the nearest ₹100 and save the difference', duration: 30, type: 'daily', target: 3000, icon: '🔄', difficulty: 'Easy', reward: 100, category: 'savings' },
  { id: 'no-eat-out', name: 'No Eating Out', description: 'Cook all meals at home for 30 days', duration: 30, type: 'daily', target: 30, icon: '🍳', difficulty: 'Medium', reward: 200, category: 'spending' },
  { id: 'cancel-sub', name: 'Subscription Audit', description: 'Review and cancel at least 2 unused subscriptions', duration: 7, type: 'one-time', target: 2, icon: '✂️', difficulty: 'Easy', reward: 75, category: 'spending' },
  { id: 'spare-change', name: 'Spare Change Jar', description: 'Save all coins/change for a month', duration: 30, type: 'daily', target: 1000, icon: '🏺', difficulty: 'Easy', reward: 50, category: 'savings' },
  { id: 'envelope', name: 'Envelope System', description: 'Use cash envelopes for all discretionary spending', duration: 30, type: 'daily', target: 30, icon: '✉️', difficulty: 'Medium', reward: 150, category: 'budget' },
  { id: 'side-hustle', name: 'Side Hustle Sprint', description: 'Earn ₹5,000 from a side project', duration: 30, type: 'one-time', target: 5000, icon: '💼', difficulty: 'Hard', reward: 300, category: 'income' },
  { id: 'money-fast', name: '24-Hour Money Fast', description: 'Spend absolutely nothing for 24 hours', duration: 1, type: 'one-time', target: 1, icon: '⏱️', difficulty: 'Easy', reward: 25, category: 'spending' },
  { id: 'invest-learn', name: 'Investment Learner', description: 'Read about investing for 15 minutes daily for 2 weeks', duration: 14, type: 'daily', target: 14, icon: '📚', difficulty: 'Medium', reward: 100, category: 'learning' },
];

// ===== ActiveChallengesView =====
const ActiveChallengesView = ({ challenges, onUpdate }) => {
  if (challenges.length === 0) {
    return <EmptyState icon="🏁" title="No Active Challenges" message="Browse and join a challenge to get started!" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {challenges.map(challenge => {
        const progress = challenge.target > 0 ? Math.min(100, Math.round((challenge.current / challenge.target) * 100)) : 0;
        const daysLeft = challenge.endDate ? Math.max(0, Math.ceil((new Date(challenge.endDate) - Date.now()) / 86400000)) : 0;
        return (
          <AnimatedCard key={challenge.id || challenge._id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{challenge.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{challenge.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{challenge.description}</p>
                </div>
              </div>
              <Badge variant={challenge.difficulty === 'Hard' ? 'danger' : challenge.difficulty === 'Medium' ? 'warning' : 'success'}>
                {challenge.difficulty}
              </Badge>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">Progress</span>
                <span className="font-semibold text-slate-800 dark:text-white">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{challenge.current?.toLocaleString()} / {challenge.target?.toLocaleString()}</span>
              <span>{daysLeft} days left</span>
              <span>🎁 {challenge.reward} pts</span>
            </div>
          </AnimatedCard>
        );
      })}
    </div>
  );
};

// ===== BrowseChallengesView =====
const BrowseChallengesView = ({ templates, activeChallengeIds, onJoin }) => {
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return true;
    });
  }, [templates, filterDifficulty, filterCategory]);

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          <option value="all">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(template => {
          const isActive = activeChallengeIds.includes(template.id);
          return (
            <AnimatedCard key={template.id} className="p-5">
              <div className="text-center mb-3">
                <span className="text-4xl">{template.icon}</span>
                <h3 className="font-semibold text-slate-800 dark:text-white mt-2">{template.name}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">{template.description}</p>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
                <span>📅 {template.duration} days</span>
                <Badge variant={template.difficulty === 'Hard' ? 'danger' : template.difficulty === 'Medium' ? 'warning' : 'success'}>
                  {template.difficulty}
                </Badge>
                <span>🎁 {template.reward} pts</span>
              </div>
              <button
                onClick={() => !isActive && onJoin(template)}
                disabled={isActive}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'}`}>
                {isActive ? '✓ Already Joined' : 'Join Challenge'}
              </button>
            </AnimatedCard>
          );
        })}
      </div>
    </div>
  );
};

// ===== CompletedChallengesView =====
const CompletedChallengesView = ({ challenges }) => {
  if (challenges.length === 0) {
    return <EmptyState icon="🏅" title="No Completed Challenges" message="Complete challenges to see your achievements here!" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {challenges.map(challenge => (
        <AnimatedCard key={challenge.id || challenge._id} className="p-5 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <div className="text-center">
            <span className="text-4xl">{challenge.icon}</span>
            <h3 className="font-semibold text-slate-800 dark:text-white mt-2">{challenge.name}</h3>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">✅ Completed {challenge.completedDate ? formatDate(challenge.completedDate) : ''}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge variant="success">+{challenge.reward} pts</Badge>
              <Badge variant="info">{challenge.difficulty}</Badge>
            </div>
          </div>
        </AnimatedCard>
      ))}
    </div>
  );
};

// ===== LeaderboardView =====
const LeaderboardView = ({ leaderboard }) => {
  if (leaderboard.length === 0) {
    return <EmptyState icon="🏆" title="Leaderboard Unavailable" message="Complete challenges to appear on the leaderboard!" />;
  }

  return (
    <div className="space-y-4">
      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaderboard.slice(0, 3).map((user, idx) => (
          <AnimatedCard key={user.rank || idx} className={`p-6 text-center ${idx === 0 ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10 md:order-2' : idx === 1 ? 'md:order-1' : 'md:order-3'}`}>
            <span className="text-4xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-2">{user.name}</h3>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{user.points?.toLocaleString()} pts</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.challenges || 0} challenges completed</p>
          </AnimatedCard>
        ))}
      </div>

      {/* Rest */}
      {leaderboard.length > 3 && (
        <AnimatedCard className="divide-y divide-slate-200 dark:divide-slate-700">
          {leaderboard.slice(3).map((user, idx) => (
            <div key={user.rank || idx} className={`flex items-center gap-4 p-4 ${user.isUser ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
              <span className="text-lg font-bold text-slate-400 w-8 text-center">#{user.rank || idx + 4}</span>
              <span className="text-2xl">{user.avatar || '👤'}</span>
              <div className="flex-1">
                <span className="font-medium text-slate-800 dark:text-white">{user.name} {user.isUser && <Badge variant="primary" className="ml-1">You</Badge>}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.challenges || 0} challenges</p>
              </div>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{user.points?.toLocaleString()} pts</span>
            </div>
          ))}
        </AnimatedCard>
      )}
    </div>
  );
};

// ===== Main Component =====
export default function SavingsChallenges() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const animatedStreak = useAnimatedCounter(streak);
  const animatedPoints = useAnimatedCounter(totalPoints);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [challengesRes, leaderboardRes] = await Promise.all([
          api.get('/achievements/challenges'),
          api.get('/achievements/leaderboard').catch(() => ({ data: [] })),
        ]);

        const challengeData = challengesRes.data?.data || challengesRes.data || {};
        setActiveChallenges(challengeData.active || []);
        setCompletedChallenges(challengeData.completed || []);
        setStreak(challengeData.streak || 0);
        setTotalPoints(challengeData.totalPoints || 0);

        const lb = leaderboardRes.data?.data || leaderboardRes.data || [];
        setLeaderboard(lb);
      } catch (err) {
        console.error('Error fetching challenges:', err);
        setError('Failed to load challenges data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleJoinChallenge = useCallback(async (template) => {
    try {
      const res = await api.post('/achievements/challenges/join', { templateId: template.id });
      const newChallenge = res.data?.data || res.data || {
        ...template,
        id: `${template.id}-${Date.now()}`,
        current: 0,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + template.duration * 86400000).toISOString(),
        status: 'active',
      };
      setActiveChallenges(prev => [...prev, newChallenge]);
    } catch (err) {
      console.error('Error joining challenge:', err);
    }
  }, []);

  const activeChallengeIds = useMemo(() =>
    activeChallenges.map(c => c.templateId || c.id?.split('-')[0]),
  [activeChallenges]);

  const tabs = [
    { label: `Active (${activeChallenges.length})`, icon: '🔥' },
    { label: 'Browse', icon: '🔍' },
    { label: `Completed (${completedChallenges.length})`, icon: '✅' },
    { label: 'Leaderboard', icon: '🏆' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-3xl">🏆</span> Savings Challenges
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gamified savings to build better habits</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatCard mini icon="🔥" label="Streak" value={`${animatedStreak} days`} />
          <StatCard mini icon="⭐" label="Points" value={animatedPoints.toLocaleString()} />
          <StatCard mini icon="✅" label="Completed" value={completedChallenges.length} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === i ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && <ActiveChallengesView challenges={activeChallenges} onUpdate={() => {}} />}
      {activeTab === 1 && <BrowseChallengesView templates={CHALLENGE_TEMPLATES} activeChallengeIds={activeChallengeIds} onJoin={handleJoinChallenge} />}
      {activeTab === 2 && <CompletedChallengesView challenges={completedChallenges} />}
      {activeTab === 3 && <LeaderboardView leaderboard={leaderboard} />}
    </div>
  );
}
