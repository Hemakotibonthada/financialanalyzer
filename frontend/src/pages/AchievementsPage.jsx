import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, IconButton,
  TextField, InputAdornment, LinearProgress, Avatar, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Badge, Tooltip, Paper, Alert, CircularProgress
} from '@mui/material';
import {
  EmojiEvents, Star, Lock, CheckCircle, TrendingUp, Timer,
  Whatshot, WorkspacePremium, Diamond, MilitaryTech, LocalPolice,
  Leaderboard, Speed, Favorite, AutoAwesome, Bolt, Shield,
  Celebration, SportsScore, FlagCircle, ArrowForward, Share,
  Group, Person, Psychology, School, Savings, CreditCard,
  AccountBalance, ShowChart, Receipt, Calculate
} from '@mui/icons-material';
import api from '../services/api';
import '../styles/animations.css';

// ============================================================
// Feature #102: Achievements & Gamification Page
// ============================================================

const ACHIEVEMENT_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏆', count: 0 },
  { id: 'savings', label: 'Savings', icon: '💰', count: 0 },
  { id: 'budget', label: 'Budget', icon: '📊', count: 0 },
  { id: 'tracking', label: 'Tracking', icon: '📝', count: 0 },
  { id: 'investing', label: 'Investing', icon: '📈', count: 0 },
  { id: 'goals', label: 'Goals', icon: '🎯', count: 0 },
  { id: 'debt', label: 'Debt', icon: '💳', count: 0 },
  { id: 'knowledge', label: 'Knowledge', icon: '📚', count: 0 },
  { id: 'social', label: 'Social', icon: '👥', count: 0 },
];

// Static achievement definitions — unlocked/progress come from the API
const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_save', name: 'First Dollar', description: 'Save your first ₹1,000', icon: '🌱', category: 'savings', points: 10, rarity: 'common' },
  { id: 'save_10k', name: 'Getting Started', description: 'Accumulate ₹10,000 in savings', icon: '💰', category: 'savings', points: 25, rarity: 'common' },
  { id: 'save_50k', name: 'Nest Egg Builder', description: 'Accumulate ₹50,000 in savings', icon: '🥚', category: 'savings', points: 50, rarity: 'uncommon' },
  { id: 'save_1l', name: 'Lakhpati', description: 'Accumulate ₹1,00,000 in savings', icon: '💎', category: 'savings', points: 100, rarity: 'rare' },
  { id: 'save_5l', name: 'Wealth Builder', description: 'Accumulate ₹5,00,000 in savings', icon: '🏆', category: 'savings', points: 200, rarity: 'epic' },
  { id: 'save_10l', name: 'Crorepati Starter', description: 'Accumulate ₹10,00,000 in savings', icon: '👑', category: 'savings', points: 500, rarity: 'legendary' },
  { id: 'emergency_fund', name: 'Safety Net', description: 'Build 6 months of emergency fund', icon: '🛡️', category: 'savings', points: 150, rarity: 'rare' },
  { id: 'savings_streak_30', name: 'Consistent Saver', description: 'Save money 30 days in a row', icon: '🔥', category: 'savings', points: 75, rarity: 'uncommon' },
  { id: 'first_budget', name: 'Budget Master', description: 'Create your first budget', icon: '📋', category: 'budget', points: 10, rarity: 'common' },
  { id: 'under_budget', name: 'Under Budget', description: 'Stay under budget for a full month', icon: '✅', category: 'budget', points: 50, rarity: 'uncommon' },
  { id: 'budget_streak_3', name: 'Hat Trick', description: 'Stay under budget 3 months in a row', icon: '🎩', category: 'budget', points: 100, rarity: 'rare' },
  { id: 'budget_streak_6', name: 'Budget Champion', description: 'Stay under budget 6 months in a row', icon: '🏅', category: 'budget', points: 200, rarity: 'epic' },
  { id: 'budget_streak_12', name: 'Budget Legend', description: 'Stay under budget 12 months in a row', icon: '🌟', category: 'budget', points: 500, rarity: 'legendary' },
  { id: 'zero_budget', name: 'Zero Based Guru', description: 'Use zero-based budgeting for 3 months', icon: '🎯', category: 'budget', points: 75, rarity: 'uncommon' },
  { id: 'first_transaction', name: 'First Entry', description: 'Log your first transaction', icon: '📝', category: 'tracking', points: 5, rarity: 'common' },
  { id: 'track_100', name: 'Century', description: 'Log 100 transactions', icon: '💯', category: 'tracking', points: 50, rarity: 'uncommon' },
  { id: 'track_500', name: 'Dedicated Tracker', description: 'Log 500 transactions', icon: '📊', category: 'tracking', points: 100, rarity: 'rare' },
  { id: 'track_1000', name: 'Tracking Machine', description: 'Log 1,000 transactions', icon: '🤖', category: 'tracking', points: 200, rarity: 'epic' },
  { id: 'daily_login_30', name: 'Consistency King', description: 'Log in 30 days straight', icon: '📅', category: 'tracking', points: 75, rarity: 'uncommon' },
  { id: 'daily_login_100', name: 'Centurion', description: 'Log in 100 days straight', icon: '🎖️', category: 'tracking', points: 150, rarity: 'rare' },
  { id: 'all_categories', name: 'Category Expert', description: 'Use all spending categories', icon: '🗂️', category: 'tracking', points: 30, rarity: 'common' },
  { id: 'first_sip', name: 'SIP Starter', description: 'Start your first SIP', icon: '📈', category: 'investing', points: 25, rarity: 'common' },
  { id: 'diversified', name: 'Diversifier', description: 'Invest in 5+ different asset classes', icon: '🎨', category: 'investing', points: 100, rarity: 'rare' },
  { id: 'tax_saver', name: 'Tax Optimizer', description: 'Max out 80C deductions', icon: '🏛️', category: 'investing', points: 150, rarity: 'rare' },
  { id: 'portfolio_10l', name: 'Portfolio Pro', description: 'Portfolio value reaches ₹10L', icon: '💼', category: 'investing', points: 200, rarity: 'epic' },
  { id: 'first_dividend', name: 'Passive Income', description: 'Receive your first dividend', icon: '🤑', category: 'investing', points: 50, rarity: 'uncommon' },
  { id: 'first_goal', name: 'Goal Setter', description: 'Set your first financial goal', icon: '🎯', category: 'goals', points: 10, rarity: 'common' },
  { id: 'goal_achieved', name: 'Goal Achiever', description: 'Complete a financial goal', icon: '🏁', category: 'goals', points: 100, rarity: 'rare' },
  { id: 'multi_goal', name: 'Multi-Achiever', description: 'Complete 5 financial goals', icon: '🌈', category: 'goals', points: 250, rarity: 'epic' },
  { id: 'ahead_schedule', name: 'Ahead of Schedule', description: 'Complete a goal before target date', icon: '⚡', category: 'goals', points: 75, rarity: 'uncommon' },
  { id: 'debt_free', name: 'Debt Free', description: 'Pay off all outstanding debts', icon: '🆓', category: 'debt', points: 300, rarity: 'epic' },
  { id: 'emi_on_time', name: 'Punctual Payer', description: 'Pay all EMIs on time for 6 months', icon: '⏰', category: 'debt', points: 100, rarity: 'rare' },
  { id: 'credit_score_750', name: 'Credit Champion', description: 'Maintain credit score above 750', icon: '🏆', category: 'debt', points: 150, rarity: 'rare' },
  { id: 'no_credit_card_debt', name: 'Zero Balance', description: 'Pay full credit card bill 6 months straight', icon: '💳', category: 'debt', points: 75, rarity: 'uncommon' },
  { id: 'first_lesson', name: 'Learner', description: 'Complete your first finance lesson', icon: '📖', category: 'knowledge', points: 10, rarity: 'common' },
  { id: 'quiz_perfect', name: 'Quiz Master', description: 'Score 100% on a finance quiz', icon: '🧠', category: 'knowledge', points: 50, rarity: 'uncommon' },
  { id: 'module_complete', name: 'Scholar', description: 'Complete an entire learning module', icon: '🎓', category: 'knowledge', points: 100, rarity: 'rare' },
  { id: 'all_modules', name: 'Finance Graduate', description: 'Complete all learning modules', icon: '👨‍🎓', category: 'knowledge', points: 500, rarity: 'legendary' },
  { id: 'share_first', name: 'Social Butterfly', description: 'Share your first achievement', icon: '🦋', category: 'social', points: 15, rarity: 'common' },
  { id: 'refer_friend', name: 'Ambassador', description: 'Refer 5 friends to the app', icon: '🤝', category: 'social', points: 100, rarity: 'rare' },
];

const LEVELS = [
  { level: 1, name: 'Beginner', minPoints: 0, maxPoints: 50, icon: '🌱', color: '#9E9E9E' },
  { level: 2, name: 'Novice', minPoints: 51, maxPoints: 150, icon: '🌿', color: '#4CAF50' },
  { level: 3, name: 'Apprentice', minPoints: 151, maxPoints: 300, icon: '⭐', color: '#2196F3' },
  { level: 4, name: 'Intermediate', minPoints: 301, maxPoints: 500, icon: '🌟', color: '#FF9800' },
  { level: 5, name: 'Advanced', minPoints: 501, maxPoints: 750, icon: '💫', color: '#9C27B0' },
  { level: 6, name: 'Expert', minPoints: 751, maxPoints: 1000, icon: '🔥', color: '#F44336' },
  { level: 7, name: 'Master', minPoints: 1001, maxPoints: 1500, icon: '💎', color: '#00BCD4' },
  { level: 8, name: 'Grandmaster', minPoints: 1501, maxPoints: 2000, icon: '👑', color: '#FFD700' },
  { level: 9, name: 'Legend', minPoints: 2001, maxPoints: 3000, icon: '🏆', color: '#FF6F00' },
  { level: 10, name: 'Transcendent', minPoints: 3001, maxPoints: Infinity, icon: '✨', color: '#D500F9' },
];

const RARITY_COLORS = {
  common: { bg: '#E0E0E0', text: '#616161', label: 'Common' },
  uncommon: { bg: '#4CAF5030', text: '#4CAF50', label: 'Uncommon' },
  rare: { bg: '#2196F330', text: '#2196F3', label: 'Rare' },
  epic: { bg: '#9C27B030', text: '#9C27B0', label: 'Epic' },
  legendary: { bg: '#FF980030', text: '#FF9800', label: 'Legendary' },
};

const AchievementsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showUnlocked, setShowUnlocked] = useState(false);

  const [profileData, setProfileData] = useState(null);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/achievements/profile');
        const data = res.data?.data || res.data || {};
        setProfileData(data);
        setDailyQuests(data.dailyQuests || []);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Error fetching achievements:', err);
        setError('Failed to load achievements data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Merge static definitions with API data
  const allAchievements = useMemo(() => {
    const apiMap = profileData?.achievements || {};
    return ACHIEVEMENT_DEFINITIONS.map(def => {
      const apiData = apiMap[def.id] || {};
      return {
        ...def,
        unlocked: apiData.unlocked || false,
        unlockedDate: apiData.unlockedDate || null,
        progress: apiData.progress ?? 0,
      };
    });
  }, [profileData]);

  const streak = profileData?.streak || 0;

  const totalPoints = useMemo(() =>
    allAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0),
  [allAchievements]);

  const currentLevel = useMemo(() =>
    LEVELS.find(l => totalPoints >= l.minPoints && totalPoints <= l.maxPoints) || LEVELS[0],
  [totalPoints]);

  const nextLevel = useMemo(() => {
    const idx = LEVELS.indexOf(currentLevel);
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  }, [currentLevel]);

  const levelProgress = useMemo(() => {
    if (!nextLevel) return 100;
    const range = currentLevel.maxPoints - currentLevel.minPoints;
    const current = totalPoints - currentLevel.minPoints;
    return Math.round((current / range) * 100);
  }, [currentLevel, nextLevel, totalPoints]);

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;
  const totalCount = allAchievements.length;

  const filteredAchievements = useMemo(() => {
    let filtered = allAchievements;
    if (selectedCategory !== 'all') filtered = filtered.filter(a => a.category === selectedCategory);
    if (showUnlocked) filtered = filtered.filter(a => a.unlocked);
    return filtered;
  }, [selectedCategory, showUnlocked, allAchievements]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }} color="text.secondary">Loading achievements...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3, animation: 'fadeInUp 0.6s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Achievements</Typography>
          <Typography color="text.secondary">Track your progress and earn rewards</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip icon={<Whatshot />} label={`${streak} Day Streak 🔥`} color="error" />
          <Chip icon={<Star />} label={`${totalPoints} Points`} color="primary" />
        </Box>
      </Box>

      {/* Level Card */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${currentLevel.color}20, ${currentLevel.color}05)`, border: '1px solid', borderColor: `${currentLevel.color}40` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentLevel.color}, ${currentLevel.color}80)`,
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  fontSize: '2.5rem', animation: 'pulse 2s infinite',
                  boxShadow: `0 4px 20px ${currentLevel.color}40`,
                }}>
                  {currentLevel.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Level {currentLevel.level}</Typography>
                  <Typography variant="h5" fontWeight={700}>{currentLevel.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{totalPoints} total points</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Level Progress</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {nextLevel ? `${totalPoints - currentLevel.minPoints} / ${currentLevel.maxPoints - currentLevel.minPoints} XP` : 'MAX'}
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={levelProgress} sx={{ height: 12, borderRadius: 6, bgcolor: `${currentLevel.color}15`, '& .MuiLinearProgress-bar': { borderRadius: 6, background: `linear-gradient(90deg, ${currentLevel.color}, ${currentLevel.color}CC)` } }} />
                {nextLevel && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {nextLevel.maxPoints - totalPoints + currentLevel.minPoints} XP to Level {nextLevel.level} ({nextLevel.name} {nextLevel.icon})
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={1}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={currentLevel.color}>{unlockedCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Unlocked</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700}>{totalCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="error.main">{streak}</Typography>
                  <Typography variant="caption" color="text.secondary">Streak</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<EmojiEvents />} label="Achievements" iconPosition="start" />
        <Tab icon={<Bolt />} label="Daily Quests" iconPosition="start" />
        <Tab icon={<Leaderboard />} label="Leaderboard" iconPosition="start" />
        <Tab icon={<WorkspacePremium />} label="Badges" iconPosition="start" />
      </Tabs>

      {/* Achievements Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            {ACHIEVEMENT_CATEGORIES.map(cat => (
              <Chip key={cat.id} label={`${cat.icon} ${cat.label}`} onClick={() => setSelectedCategory(cat.id)} variant={selectedCategory === cat.id ? 'filled' : 'outlined'} color={selectedCategory === cat.id ? 'primary' : 'default'} size="small" />
            ))}
            <Box sx={{ flex: 1 }} />
            <Chip label={showUnlocked ? 'Showing Unlocked' : 'Showing All'} onClick={() => setShowUnlocked(!showUnlocked)} variant="outlined" size="small" icon={showUnlocked ? <CheckCircle /> : <Lock />} />
          </Box>
          <Grid container spacing={2}>
            {filteredAchievements.map(achievement => {
              const rarity = RARITY_COLORS[achievement.rarity];
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={achievement.id}>
                  <Card onClick={() => setSelectedAchievement(achievement)} sx={{ cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, opacity: achievement.unlocked ? 1 : 0.7, position: 'relative', overflow: 'visible' }}>
                    {achievement.unlocked && <Chip label="✓ Unlocked" size="small" color="success" sx={{ position: 'absolute', top: -10, right: 8, fontSize: '0.65rem' }} />}
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ fontSize: '3rem', mb: 1, filter: achievement.unlocked ? 'none' : 'grayscale(100%)', transition: 'filter 0.3s' }}>{achievement.unlocked ? achievement.icon : '🔒'}</Box>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{achievement.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, minHeight: 30 }}>{achievement.description}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
                        <Chip label={`${achievement.points} XP`} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.65rem', height: 20 }} />
                        <Chip label={rarity.label} size="small" sx={{ bgcolor: rarity.bg, color: rarity.text, fontSize: '0.65rem', height: 20 }} />
                      </Box>
                      {!achievement.unlocked && achievement.progress > 0 && (
                        <Box>
                          <LinearProgress variant="determinate" value={achievement.progress} sx={{ height: 4, borderRadius: 2, mt: 1 }} />
                          <Typography variant="caption" color="text.secondary">{achievement.progress}%</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Daily Quests Tab */}
      {activeTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>Complete daily quests to earn bonus XP and maintain your streak! Quests reset at midnight.</Alert>
          {dailyQuests.length === 0 ? (
            <Alert severity="info">No daily quests available right now.</Alert>
          ) : (
            <Grid container spacing={2}>
              {dailyQuests.map(quest => (
                <Grid item xs={12} sm={6} key={quest.id}>
                  <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }, borderLeft: 4, borderColor: quest.completed ? 'success.main' : quest.progress > 0 ? 'warning.main' : 'divider' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: '2rem' }}>{quest.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight={600}>{quest.name}</Typography>
                            <Chip label={`+${quest.points} XP`} size="small" color="primary" variant="outlined" />
                          </Box>
                          <LinearProgress variant="determinate" value={(quest.progress / quest.target) * 100} sx={{ height: 8, borderRadius: 4, my: 1 }} color={quest.completed ? 'success' : 'primary'} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">{quest.progress}/{quest.target}</Typography>
                            {quest.completed && <Chip icon={<CheckCircle />} label="Completed!" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>🔥 Streak Calendar</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.max(streak, 30) }, (_, i) => (
                  <Tooltip key={i} title={`Day ${i + 1}`}>
                    <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: i < streak ? (i >= streak - 7 ? '#4CAF50' : '#4CAF5060') : '#f0f0f0', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.2)' } }} />
                  </Tooltip>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>🔥 {streak} days and counting! Keep it up!</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 2 && (
        <Box>
          {leaderboard.length === 0 ? (
            <Alert severity="info">Leaderboard data is not available yet.</Alert>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {leaderboard.slice(0, 3).map((user, idx) => (
                  <Grid item xs={12} sm={4} key={user.rank}>
                    <Card sx={{ textAlign: 'center', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, border: idx === 0 ? '2px solid #FFD700' : idx === 1 ? '2px solid #C0C0C0' : '2px solid #CD7F32', order: idx === 0 ? 2 : idx === 1 ? 1 : 3 }}>
                      <CardContent>
                        <Typography variant="h2" component="span">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</Typography>
                        <Typography variant="h4" component="span" sx={{ display: 'block' }}>{user.avatar}</Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>{user.name}</Typography>
                        <Typography variant="h5" fontWeight={700} color="primary.main">{user.points} XP</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                          <Chip label={`Level ${user.level}`} size="small" variant="outlined" />
                          <Chip label={`🔥 ${user.streak}`} size="small" />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Card>
                <CardContent>
                  {leaderboard.slice(3).map(user => (
                    <Box key={user.rank} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: user.isUser ? 'primary.50' : 'transparent', px: user.isUser ? 2 : 0, borderRadius: user.isUser ? 1 : 0, transition: 'all 0.3s', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="h6" fontWeight={700} sx={{ width: 40, textAlign: 'center' }}>#{user.rank}</Typography>
                      <Typography variant="h5" component="span">{user.avatar}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={user.isUser ? 700 : 500}>{user.name} {user.isUser && '(You)'}</Typography>
                        <Typography variant="caption" color="text.secondary">Level {user.level}</Typography>
                      </Box>
                      <Chip label={`🔥 ${user.streak}`} size="small" variant="outlined" />
                      <Typography variant="subtitle1" fontWeight={700} color="primary.main">{user.points} XP</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* Badges Tab */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Earn special badges by completing groups of related achievements.</Typography>
          <Grid container spacing={2}>
            {[
              { name: 'Savings Master', icon: '💰', required: ['first_save', 'save_10k', 'save_50k', 'save_1l'], color: '#4CAF50' },
              { name: 'Budget Pro', icon: '📊', required: ['first_budget', 'under_budget', 'budget_streak_3'], color: '#2196F3' },
              { name: 'Tracking Expert', icon: '📝', required: ['first_transaction', 'track_100', 'track_500'], color: '#FF9800' },
              { name: 'Investment Guru', icon: '📈', required: ['first_sip', 'diversified', 'portfolio_10l'], color: '#9C27B0' },
              { name: 'Debt Destroyer', icon: '💪', required: ['emi_on_time', 'credit_score_750', 'debt_free'], color: '#F44336' },
              { name: 'Knowledge Seeker', icon: '🎓', required: ['first_lesson', 'quiz_perfect', 'module_complete', 'all_modules'], color: '#795548' },
            ].map((badge, idx) => {
              const earned = badge.required.filter(id => allAchievements.find(a => a.id === id)?.unlocked).length;
              const total = badge.required.length;
              return (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card sx={{ textAlign: 'center', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, border: earned === total ? '2px solid' : 'none', borderColor: badge.color }}>
                    <CardContent>
                      <Box sx={{ width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 2, background: earned === total ? `linear-gradient(135deg, ${badge.color}30, ${badge.color}10)` : '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2.5rem', filter: earned === total ? 'none' : 'grayscale(50%)' }}>{badge.icon}</Box>
                      <Typography variant="h6" fontWeight={600}>{badge.name}</Typography>
                      <LinearProgress variant="determinate" value={(earned / total) * 100} sx={{ height: 8, borderRadius: 4, my: 1.5, '& .MuiLinearProgress-bar': { bgcolor: badge.color } }} />
                      <Typography variant="body2" color="text.secondary">{earned}/{total} achievements</Typography>
                      {earned === total && <Chip icon={<CheckCircle />} label="Earned!" color="success" size="small" sx={{ mt: 1 }} />}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedAchievement} onClose={() => setSelectedAchievement(null)} maxWidth="sm" fullWidth>
        {selectedAchievement && (
          <>
            <DialogTitle>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h1" component="span">{selectedAchievement.icon}</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{selectedAchievement.name}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" textAlign="center" color="text.secondary" gutterBottom>{selectedAchievement.description}</Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Points</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">{selectedAchievement.points} XP</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Rarity</Typography>
                  <Chip label={RARITY_COLORS[selectedAchievement.rarity].label} size="small" sx={{ mt: 0.5, bgcolor: RARITY_COLORS[selectedAchievement.rarity].bg, color: RARITY_COLORS[selectedAchievement.rarity].text }} />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip icon={selectedAchievement.unlocked ? <CheckCircle /> : <Lock />} label={selectedAchievement.unlocked ? 'Unlocked' : 'Locked'} size="small" color={selectedAchievement.unlocked ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                </Grid>
              </Grid>
              {selectedAchievement.unlocked && selectedAchievement.unlockedDate && (
                <Typography variant="caption" textAlign="center" display="block" color="text.secondary" sx={{ mt: 2 }}>
                  Unlocked on {new Date(selectedAchievement.unlockedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </Typography>
              )}
              {!selectedAchievement.unlocked && selectedAchievement.progress > 0 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={selectedAchievement.progress} sx={{ height: 10, borderRadius: 5 }} />
                  <Typography variant="caption" textAlign="center" display="block" sx={{ mt: 0.5 }}>{selectedAchievement.progress}% progress</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              {selectedAchievement.unlocked && <Button variant="outlined" startIcon={<Share />}>Share Achievement</Button>}
              <Button onClick={() => setSelectedAchievement(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AchievementsPage;
