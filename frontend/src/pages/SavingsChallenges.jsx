// ============================================================
// Financial Analyzer - Savings Challenges Page
// Feature #86: Gamified savings challenges & trackers
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatedCard, StatCard, Badge, Modal, AnimatedTabs, ProgressRing, EmptyState, Stepper, Timeline } from '../../components/ui/ComponentLibrary';
import { EnhancedLineChart, EnhancedBarChart, GaugeChart } from '../../components/ui/ChartComponents';
import { useLocalStorage, useAnimatedCounter } from '../../hooks/useCustomHooks';
import { formatCurrency, formatDate } from '../../utils/helpers';
import '../../styles/animations.css';

const CHALLENGE_TEMPLATES = [
  {
    id: 'no-spend-week',
    name: 'No-Spend Week',
    description: 'Go an entire week without unnecessary spending',
    icon: '🚫',
    category: 'lifestyle',
    duration: 7,
    difficulty: 'medium',
    targetSavings: 5000,
    badge: '🏆',
    color: '#EF4444',
    tips: ['Cook meals at home', 'Cancel planned shopping', 'Use free entertainment'],
  },
  {
    id: '52-week',
    name: '52-Week Challenge',
    description: 'Save ₹100 in week 1, ₹200 in week 2... up to ₹5,200 in week 52',
    icon: '📅',
    category: 'savings',
    duration: 365,
    difficulty: 'hard',
    targetSavings: 137800,
    badge: '💎',
    color: '#8B5CF6',
    tips: ['Set up automated transfers', 'Increase amount gradually', 'Track weekly progress'],
  },
  {
    id: 'round-up',
    name: 'Round-Up Savings',
    description: 'Round up every transaction and save the difference',
    icon: '🔄',
    category: 'savings',
    duration: 30,
    difficulty: 'easy',
    targetSavings: 3000,
    badge: '🌟',
    color: '#10B981',
    tips: ['Enable auto-round-ups', 'Every paisa counts', 'Watch savings grow passively'],
  },
  {
    id: 'lunch-prep',
    name: 'Lunch Prep Challenge',
    description: 'Bring lunch from home for 30 days straight',
    icon: '🍱',
    category: 'food',
    duration: 30,
    difficulty: 'medium',
    targetSavings: 9000,
    badge: '👨‍🍳',
    color: '#F59E0B',
    tips: ['Meal prep on Sundays', 'Try new recipes', 'Track restaurant savings'],
  },
  {
    id: 'coffee-detox',
    name: 'Coffee Shop Detox',
    description: 'Make coffee at home instead of buying from cafes',
    icon: '☕',
    category: 'food',
    duration: 30,
    difficulty: 'easy',
    targetSavings: 6000,
    badge: '🎖️',
    color: '#6366F1',
    tips: ['Invest in good coffee maker', 'Try different home brews', 'Save ₹200/day'],
  },
  {
    id: 'subscription-audit',
    name: 'Subscription Purge',
    description: 'Cancel all unnecessary subscriptions this month',
    icon: '✂️',
    category: 'lifestyle',
    duration: 7,
    difficulty: 'easy',
    targetSavings: 3000,
    badge: '⭐',
    color: '#EC4899',
    tips: ['List all active subscriptions', 'Cancel what you don\'t use', 'Downgrade premium plans'],
  },
  {
    id: 'pantry-challenge',
    name: 'Pantry Challenge',
    description: 'Cook only from what you already have for a week',
    icon: '🏪',
    category: 'food',
    duration: 7,
    difficulty: 'medium',
    targetSavings: 4000,
    badge: '🍽️',
    color: '#14B8A6',
    tips: ['Inventory your pantry', 'Get creative with recipes', 'Zero food waste'],
  },
  {
    id: 'envelope-system',
    name: 'Envelope Budgeting',
    description: 'Use the envelope system for 1 month - cash only for discretionary spending',
    icon: '✉️',
    category: 'budgeting',
    duration: 30,
    difficulty: 'hard',
    targetSavings: 15000,
    badge: '💰',
    color: '#D946EF',
    tips: ['Prepare physical envelopes', 'Allocate budget to each', 'Don\'t borrow between envelopes'],
  },
  {
    id: 'no-online-shopping',
    name: 'No Online Shopping Month',
    description: 'Avoid all online shopping for 30 days',
    icon: '🛒',
    category: 'lifestyle',
    duration: 30,
    difficulty: 'hard',
    targetSavings: 12000,
    badge: '🛡️',
    color: '#F97316',
    tips: ['Remove shopping apps', 'Unsubscribe from sale emails', 'Make a needs-only list'],
  },
  {
    id: 'spare-change',
    name: 'Spare Change Jar',
    description: 'Save all coins and small notes daily',
    icon: '🏺',
    category: 'savings',
    duration: 90,
    difficulty: 'easy',
    targetSavings: 5000,
    badge: '🪙',
    color: '#6B7280',
    tips: ['Keep a jar visible', 'Empty pockets daily', 'Don\'t dip into it'],
  },
];

const ACHIEVEMENTS = [
  { id: 'first-challenge', name: 'First Steps', description: 'Complete your first challenge', icon: '🌱', unlocked: true },
  { id: 'streak-7', name: '7-Day Streak', description: 'Maintain a 7-day savings streak', icon: '🔥', unlocked: true },
  { id: 'streak-30', name: '30-Day Warrior', description: 'Maintain a 30-day savings streak', icon: '⚔️', unlocked: false },
  { id: 'saved-10k', name: '10K Club', description: 'Save ₹10,000 through challenges', icon: '🎯', unlocked: true },
  { id: 'saved-50k', name: '50K Master', description: 'Save ₹50,000 through challenges', icon: '💎', unlocked: false },
  { id: 'saved-100k', name: 'Lakhpati', description: 'Save ₹1,00,000 through challenges', icon: '👑', unlocked: false },
  { id: 'multi-challenge', name: 'Multi-tasker', description: 'Complete 3 challenges simultaneously', icon: '🎪', unlocked: false },
  { id: 'perfect-month', name: 'Perfect Month', description: 'Complete all daily goals for 30 days', icon: '⭐', unlocked: false },
  { id: 'community-top', name: 'Top Saver', description: 'Rank in top 10% of community', icon: '🏅', unlocked: false },
  { id: 'challenge-master', name: 'Challenge Master', description: 'Complete 10 different challenges', icon: '🎓', unlocked: false },
];

export default function SavingsChallenges() {
  const [activeTab, setActiveTab] = useState('active');
  const [activeChallenges, setActiveChallenges] = useLocalStorage('savings-challenges-active', []);
  const [completedChallenges, setCompletedChallenges] = useLocalStorage('savings-challenges-completed', []);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);

  // Initialize with sample data if empty
  useEffect(() => {
    if (activeChallenges.length === 0) {
      setActiveChallenges([
        {
          ...CHALLENGE_TEMPLATES[0],
          startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
          currentSaved: 2800,
          daysCompleted: 3,
          dailyLog: [
            { date: new Date(Date.now() - 3 * 86400000).toISOString(), saved: 800, notes: 'Cooked at home' },
            { date: new Date(Date.now() - 2 * 86400000).toISOString(), saved: 1200, notes: 'Skipped coffee shop' },
            { date: new Date(Date.now() - 1 * 86400000).toISOString(), saved: 800, notes: 'Free movie night' },
          ],
        },
        {
          ...CHALLENGE_TEMPLATES[3],
          startDate: new Date(Date.now() - 12 * 86400000).toISOString(),
          currentSaved: 3600,
          daysCompleted: 12,
          dailyLog: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() - (12 - i) * 86400000).toISOString(),
            saved: 300,
            notes: 'Lunch from home',
          })),
        },
      ]);
    }
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const totalSaved = [...activeChallenges, ...completedChallenges].reduce((s, c) => s + (c.currentSaved || 0), 0);
    const activeCount = activeChallenges.length;
    const completedCount = completedChallenges.length;
    const currentStreak = 12; // Mock
    const totalChallenges = activeCount + completedCount;

    return { totalSaved, activeCount, completedCount, currentStreak, totalChallenges };
  }, [activeChallenges, completedChallenges]);

  // Join challenge
  const joinChallenge = (template) => {
    const challenge = {
      ...template,
      startDate: new Date().toISOString(),
      currentSaved: 0,
      daysCompleted: 0,
      dailyLog: [],
    };
    setActiveChallenges(prev => [...prev, challenge]);
    setShowJoinModal(false);
    setSelectedTemplate(null);
  };

  // Log savings for today
  const logSavings = (challengeId, amount, notes) => {
    setActiveChallenges(prev => prev.map(c => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        currentSaved: c.currentSaved + amount,
        daysCompleted: c.daysCompleted + 1,
        dailyLog: [...c.dailyLog, { date: new Date().toISOString(), saved: amount, notes }],
      };
    }));
  };

  // Complete challenge
  const completeChallenge = (challengeId) => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (challenge) {
      setCompletedChallenges(prev => [...prev, { ...challenge, completedDate: new Date().toISOString() }]);
      setActiveChallenges(prev => prev.filter(c => c.id !== challengeId));
    }
  };

  // Abandon challenge
  const abandonChallenge = (challengeId) => {
    setActiveChallenges(prev => prev.filter(c => c.id !== challengeId));
  };

  const tabs = [
    { key: 'active', label: 'Active', icon: '🏃', count: stats.activeCount },
    { key: 'browse', label: 'Browse', icon: '🔍' },
    { key: 'completed', label: 'Completed', icon: '✅', count: stats.completedCount },
    { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Savings Challenges</h1>
            <p className="text-gray-500 mt-1">Gamify your savings with fun challenges and achievements</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAchievements(true)} className="px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center gap-2">
              🏅 Achievements ({ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACHIEVEMENTS.length})
            </button>
            <button onClick={() => setShowJoinModal(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              🚀 Join Challenge
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Saved" value={stats.totalSaved} format="currency" color="#10B981" icon="💰" delay={0} />
          <StatCard title="Active Challenges" value={stats.activeCount} color="#3B82F6" icon="🏃" delay={100} />
          <StatCard title="Current Streak" value={stats.currentStreak} suffix=" days" color="#F59E0B" icon="🔥" delay={200} />
          <StatCard title="Achievements" value={ACHIEVEMENTS.filter(a => a.unlocked).length} suffix={`/${ACHIEVEMENTS.length}`} color="#8B5CF6" icon="🏅" delay={300} />
        </div>

        {/* Tabs */}
        <AnimatedTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

        {/* Tab Content */}
        {activeTab === 'active' && (
          <ActiveChallengesView
            challenges={activeChallenges}
            onLogSavings={logSavings}
            onComplete={completeChallenge}
            onAbandon={abandonChallenge}
          />
        )}

        {activeTab === 'browse' && (
          <BrowseChallengesView
            templates={CHALLENGE_TEMPLATES}
            activeChallengeIds={activeChallenges.map(c => c.id)}
            onJoin={(template) => { setSelectedTemplate(template); setShowJoinModal(true); }}
          />
        )}

        {activeTab === 'completed' && (
          <CompletedChallengesView challenges={completedChallenges} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView totalSaved={stats.totalSaved} />
        )}
      </div>

      {/* Join Challenge Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Challenge" size="md">
        {selectedTemplate ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <span className="text-5xl block mb-3">{selectedTemplate.icon}</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
              <p className="text-gray-500 mt-1">{selectedTemplate.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-bold text-gray-900 dark:text-white">{selectedTemplate.duration} days</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500">Target</div>
                <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedTemplate.targetSavings)}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500">Difficulty</div>
                <Badge variant={selectedTemplate.difficulty === 'easy' ? 'success' : selectedTemplate.difficulty === 'medium' ? 'warning' : 'danger'}>
                  {selectedTemplate.difficulty}
                </Badge>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">💡 Tips</h4>
              <ul className="space-y-1">
                {selectedTemplate.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-blue-700 dark:text-blue-400">• {tip}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowJoinModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => joinChallenge(selectedTemplate)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                🚀 Start Challenge
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">Choose a challenge to join:</p>
            {CHALLENGE_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </div>
                <Badge variant={t.difficulty === 'easy' ? 'success' : t.difficulty === 'medium' ? 'warning' : 'danger'} size="xs">
                  {t.difficulty}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Achievements Modal */}
      <Modal isOpen={showAchievements} onClose={() => setShowAchievements(false)} title="🏅 Achievements" size="md">
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map(achievement => (
            <div
              key={achievement.id}
              className={`p-4 rounded-xl border text-center transition-all ${
                achievement.unlocked
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 grayscale'
              }`}
            >
              <span className="text-3xl block mb-2">{achievement.icon}</span>
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{achievement.name}</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">{achievement.description}</p>
              {achievement.unlocked && (
                <Badge variant="success" size="xs" className="mt-2">Unlocked</Badge>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ======================== ACTIVE CHALLENGES VIEW ========================
function ActiveChallengesView({ challenges, onLogSavings, onComplete, onAbandon }) {
  const [logModal, setLogModal] = useState(null);
  const [logAmount, setLogAmount] = useState('');
  const [logNotes, setLogNotes] = useState('');

  if (challenges.length === 0) {
    return (
      <EmptyState
        icon="🏃"
        title="No Active Challenges"
        description="Join a savings challenge to get started!"
        actionLabel="Browse Challenges"
      />
    );
  }

  return (
    <div className="space-y-6">
      {challenges.map((challenge, i) => {
        const progress = Math.min((challenge.currentSaved / challenge.targetSavings) * 100, 100);
        const daysRemaining = challenge.duration - challenge.daysCompleted;
        const dailyTarget = daysRemaining > 0 ? (challenge.targetSavings - challenge.currentSaved) / daysRemaining : 0;

        return (
          <AnimatedCard key={challenge.id} delay={i * 100}>
            <div className="flex items-start gap-6">
              {/* Progress Ring */}
              <div className="flex-shrink-0">
                <ProgressRing progress={progress} size={120} strokeWidth={8} color={challenge.color}>
                  <div className="text-center">
                    <span className="text-2xl block">{challenge.icon}</span>
                    <span className="text-xs font-bold" style={{ color: challenge.color }}>{Math.round(progress)}%</span>
                  </div>
                </ProgressRing>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{challenge.name}</h3>
                    <p className="text-sm text-gray-500">{challenge.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={challenge.difficulty === 'easy' ? 'success' : challenge.difficulty === 'medium' ? 'warning' : 'danger'}>
                      {challenge.difficulty}
                    </Badge>
                    <Badge variant="info">Day {challenge.daysCompleted}/{challenge.duration}</Badge>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xs text-gray-500">Saved</div>
                    <div className="font-bold text-green-600">{formatCurrency(challenge.currentSaved)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-gray-500">Target</div>
                    <div className="font-bold text-blue-600">{formatCurrency(challenge.targetSavings)}</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xs text-gray-500">Days Left</div>
                    <div className="font-bold text-purple-600">{daysRemaining}</div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-xs text-gray-500">Daily Target</div>
                    <div className="font-bold text-orange-600">{formatCurrency(Math.max(0, dailyTarget))}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${progress}%`, backgroundColor: challenge.color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>

                {/* Recent Log */}
                {challenge.dailyLog.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    {challenge.dailyLog.slice(-7).map((log, j) => (
                      <div key={j} className="flex-shrink-0 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs">
                        <span className="text-gray-400">{formatDate(log.date, 'shortDate')}</span>
                        <span className="font-medium text-green-600 ml-1">+{formatCurrency(log.saved)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogModal(challenge.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    ✅ Log Today's Savings
                  </button>
                  {progress >= 100 && (
                    <button
                      onClick={() => onComplete(challenge.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      🏆 Complete Challenge
                    </button>
                  )}
                  <button
                    onClick={() => onAbandon(challenge.id)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Abandon
                  </button>
                </div>
              </div>
            </div>

            {/* Log Modal */}
            {logModal === challenge.id && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Log Today's Savings</h4>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={logAmount}
                      onChange={(e) => setLogAmount(e.target.value)}
                      placeholder="Amount saved"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (logAmount) {
                        onLogSavings(challenge.id, Number(logAmount), logNotes);
                        setLogAmount('');
                        setLogNotes('');
                        setLogModal(null);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setLogModal(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </AnimatedCard>
        );
      })}
    </div>
  );
}

// ======================== BROWSE CHALLENGES VIEW ========================
function BrowseChallengesView({ templates, activeChallengeIds, onJoin }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  const categories = [...new Set(templates.map(t => t.category))];

  const filtered = templates.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterCategory === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filterCategory === cat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setFilterDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filterDifficulty === d ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {d === 'all' ? 'All Levels' : d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((template, i) => {
          const isActive = activeChallengeIds.includes(template.id);
          return (
            <AnimatedCard
              key={template.id}
              delay={i * 100}
              className={`relative overflow-hidden ${isActive ? 'opacity-60' : ''}`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10" style={{ backgroundColor: template.color }} />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{template.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
                  <Badge variant={template.difficulty === 'easy' ? 'success' : template.difficulty === 'medium' ? 'warning' : 'danger'} size="xs">
                    {template.difficulty}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">{template.description}</p>
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-500">📅 {template.duration} days</span>
                <span className="font-bold text-green-600">🎯 {formatCurrency(template.targetSavings)}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400">Reward:</span>
                <span className="text-lg">{template.badge}</span>
              </div>
              <button
                onClick={() => !isActive && onJoin(template)}
                disabled={isActive}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isActive ? '✅ Already Active' : '🚀 Join Challenge'}
              </button>
            </AnimatedCard>
          );
        })}
      </div>
    </div>
  );
}

// ======================== COMPLETED CHALLENGES VIEW ========================
function CompletedChallengesView({ challenges }) {
  if (challenges.length === 0) {
    return (
      <EmptyState icon="🏆" title="No Completed Challenges" description="Complete your first challenge to see it here!" />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {challenges.map((challenge, i) => (
        <AnimatedCard key={i} delay={i * 100} className="relative">
          <div className="absolute top-3 right-3 text-2xl">{challenge.badge}</div>
          <div className="text-center py-4">
            <span className="text-4xl block mb-2">{challenge.icon}</span>
            <h3 className="font-bold text-gray-900 dark:text-white">{challenge.name}</h3>
            <Badge variant="success" className="mt-1">Completed</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-xs text-gray-500">Saved</div>
              <div className="font-bold text-green-600">{formatCurrency(challenge.currentSaved)}</div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xs text-gray-500">Duration</div>
              <div className="font-bold text-blue-600">{challenge.daysCompleted} days</div>
            </div>
          </div>
        </AnimatedCard>
      ))}
    </div>
  );
}

// ======================== LEADERBOARD VIEW ========================
function LeaderboardView({ totalSaved }) {
  const mockLeaderboard = [
    { rank: 1, name: 'Priya S.', saved: 125000, challenges: 8, badge: '👑' },
    { rank: 2, name: 'Rahul M.', saved: 98500, challenges: 6, badge: '🥈' },
    { rank: 3, name: 'Anita K.', saved: 87200, challenges: 7, badge: '🥉' },
    { rank: 4, name: 'You', saved: totalSaved || 6400, challenges: 2, badge: '⭐', isUser: true },
    { rank: 5, name: 'Vikram P.', saved: 62000, challenges: 5, badge: '' },
    { rank: 6, name: 'Sneha R.', saved: 54300, challenges: 4, badge: '' },
    { rank: 7, name: 'Amit J.', saved: 48900, challenges: 3, badge: '' },
    { rank: 8, name: 'Kavita D.', saved: 42100, challenges: 4, badge: '' },
    { rank: 9, name: 'Rohan B.', saved: 38700, challenges: 3, badge: '' },
    { rank: 10, name: 'Deepa L.', saved: 35200, challenges: 2, badge: '' },
  ];

  return (
    <AnimatedCard>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏆 Community Leaderboard</h3>
      <div className="space-y-2">
        {mockLeaderboard.map((entry, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
              entry.isUser
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 ring-2 ring-blue-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={`w-8 text-center font-bold ${
              entry.rank <= 3 ? 'text-lg' : 'text-sm text-gray-400'
            }`}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
            </span>
            <div className="flex-1">
              <span className={`font-medium ${entry.isUser ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                {entry.name} {entry.badge}
              </span>
              <span className="text-xs text-gray-400 ml-2">{entry.challenges} challenges</span>
            </div>
            <span className="font-bold text-green-600">{formatCurrency(entry.saved)}</span>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
}
