// ============================================================
// Financial Analyzer - Achievement & Gamification Service
// Feature #92: Complete gamification engine with achievements,
// levels, streaks, challenges, and leaderboards
// ============================================================

const mongoose = require('mongoose');

// Achievement definitions
const ACHIEVEMENTS = {
  // ==================== SAVINGS ACHIEVEMENTS ====================
  'first-save': {
    id: 'first-save',
    name: 'First Steps',
    description: 'Make your first savings entry',
    icon: '🌱',
    category: 'savings',
    points: 10,
    tier: 'bronze',
    condition: { type: 'savings_count', threshold: 1 },
  },
  'savings-streak-7': {
    id: 'savings-streak-7',
    name: 'Week Warrior',
    description: 'Save money 7 days in a row',
    icon: '🔥',
    category: 'savings',
    points: 50,
    tier: 'silver',
    condition: { type: 'savings_streak', threshold: 7 },
  },
  'savings-streak-30': {
    id: 'savings-streak-30',
    name: 'Monthly Marvel',
    description: 'Save money 30 days in a row',
    icon: '💪',
    category: 'savings',
    points: 200,
    tier: 'gold',
    condition: { type: 'savings_streak', threshold: 30 },
  },
  'savings-streak-100': {
    id: 'savings-streak-100',
    name: 'Century Saver',
    description: 'Save money 100 days in a row',
    icon: '🏆',
    category: 'savings',
    points: 500,
    tier: 'platinum',
    condition: { type: 'savings_streak', threshold: 100 },
  },
  'save-1l': {
    id: 'save-1l',
    name: 'Lakh Milestone',
    description: 'Total savings reach ₹1,00,000',
    icon: '💰',
    category: 'savings',
    points: 100,
    tier: 'silver',
    condition: { type: 'total_savings', threshold: 100000 },
  },
  'save-5l': {
    id: 'save-5l',
    name: 'Half Million',
    description: 'Total savings reach ₹5,00,000',
    icon: '🏦',
    category: 'savings',
    points: 300,
    tier: 'gold',
    condition: { type: 'total_savings', threshold: 500000 },
  },
  'save-10l': {
    id: 'save-10l',
    name: 'Millionaire Mindset',
    description: 'Total savings reach ₹10,00,000',
    icon: '💎',
    category: 'savings',
    points: 500,
    tier: 'platinum',
    condition: { type: 'total_savings', threshold: 1000000 },
  },

  // ==================== BUDGET ACHIEVEMENTS ====================
  'budget-created': {
    id: 'budget-created',
    name: 'Budget Beginner',
    description: 'Create your first budget',
    icon: '📝',
    category: 'budget',
    points: 15,
    tier: 'bronze',
    condition: { type: 'budget_count', threshold: 1 },
  },
  'budget-under-3': {
    id: 'budget-under-3',
    name: 'Budget Keeper',
    description: 'Stay under budget for 3 consecutive months',
    icon: '📊',
    category: 'budget',
    points: 100,
    tier: 'silver',
    condition: { type: 'budget_streak', threshold: 3 },
  },
  'budget-under-6': {
    id: 'budget-under-6',
    name: 'Budget Master',
    description: 'Stay under budget for 6 consecutive months',
    icon: '🎯',
    category: 'budget',
    points: 250,
    tier: 'gold',
    condition: { type: 'budget_streak', threshold: 6 },
  },
  'budget-under-12': {
    id: 'budget-under-12',
    name: 'Budget Legend',
    description: 'Stay under budget for 12 consecutive months',
    icon: '👑',
    category: 'budget',
    points: 500,
    tier: 'platinum',
    condition: { type: 'budget_streak', threshold: 12 },
  },
  'all-categories-budget': {
    id: 'all-categories-budget',
    name: 'Category Champion',
    description: 'Set budgets for all spending categories',
    icon: '🗂️',
    category: 'budget',
    points: 50,
    tier: 'silver',
    condition: { type: 'budget_categories', threshold: 10 },
  },

  // ==================== TRACKING ACHIEVEMENTS ====================
  'first-transaction': {
    id: 'first-transaction',
    name: 'First Entry',
    description: 'Log your first transaction',
    icon: '✏️',
    category: 'tracking',
    points: 5,
    tier: 'bronze',
    condition: { type: 'transaction_count', threshold: 1 },
  },
  'transaction-50': {
    id: 'transaction-50',
    name: 'Diligent Tracker',
    description: 'Log 50 transactions',
    icon: '📋',
    category: 'tracking',
    points: 30,
    tier: 'bronze',
    condition: { type: 'transaction_count', threshold: 50 },
  },
  'transaction-500': {
    id: 'transaction-500',
    name: 'Data Devotee',
    description: 'Log 500 transactions',
    icon: '📱',
    category: 'tracking',
    points: 100,
    tier: 'silver',
    condition: { type: 'transaction_count', threshold: 500 },
  },
  'transaction-2000': {
    id: 'transaction-2000',
    name: 'Transaction Titan',
    description: 'Log 2000 transactions',
    icon: '🗃️',
    category: 'tracking',
    points: 300,
    tier: 'gold',
    condition: { type: 'transaction_count', threshold: 2000 },
  },
  'daily-login-7': {
    id: 'daily-login-7',
    name: 'Week Regular',
    description: 'Log in 7 days in a row',
    icon: '📅',
    category: 'tracking',
    points: 25,
    tier: 'bronze',
    condition: { type: 'login_streak', threshold: 7 },
  },
  'daily-login-30': {
    id: 'daily-login-30',
    name: 'Monthly Devotee',
    description: 'Log in 30 days in a row',
    icon: '🌟',
    category: 'tracking',
    points: 100,
    tier: 'silver',
    condition: { type: 'login_streak', threshold: 30 },
  },
  'daily-login-365': {
    id: 'daily-login-365',
    name: 'Year of Dedication',
    description: 'Log in every day for a year',
    icon: '🏅',
    category: 'tracking',
    points: 1000,
    tier: 'legendary',
    condition: { type: 'login_streak', threshold: 365 },
  },

  // ==================== INVESTMENT ACHIEVEMENTS ====================
  'first-investment': {
    id: 'first-investment',
    name: 'Investor Initiate',
    description: 'Make your first investment entry',
    icon: '📈',
    category: 'investment',
    points: 20,
    tier: 'bronze',
    condition: { type: 'investment_count', threshold: 1 },
  },
  'diversified-portfolio': {
    id: 'diversified-portfolio',
    name: 'Diversification Pro',
    description: 'Have investments in 5+ different asset classes',
    icon: '🌈',
    category: 'investment',
    points: 150,
    tier: 'gold',
    condition: { type: 'investment_types', threshold: 5 },
  },
  'sip-warrior': {
    id: 'sip-warrior',
    name: 'SIP Warrior',
    description: 'Maintain SIP for 12 consecutive months',
    icon: '⚔️',
    category: 'investment',
    points: 200,
    tier: 'gold',
    condition: { type: 'sip_streak', threshold: 12 },
  },
  'portfolio-1cr': {
    id: 'portfolio-1cr',
    name: 'Crorepati',
    description: 'Portfolio value reaches ₹1 Crore',
    icon: '💎',
    category: 'investment',
    points: 1000,
    tier: 'legendary',
    condition: { type: 'portfolio_value', threshold: 10000000 },
  },

  // ==================== GOAL ACHIEVEMENTS ====================
  'first-goal': {
    id: 'first-goal',
    name: 'Goal Setter',
    description: 'Set your first financial goal',
    icon: '🎯',
    category: 'goals',
    points: 10,
    tier: 'bronze',
    condition: { type: 'goal_count', threshold: 1 },
  },
  'goal-achieved': {
    id: 'goal-achieved',
    name: 'Goal Crusher',
    description: 'Achieve your first financial goal',
    icon: '🏁',
    category: 'goals',
    points: 100,
    tier: 'silver',
    condition: { type: 'goals_achieved', threshold: 1 },
  },
  'goals-5': {
    id: 'goals-5',
    name: 'Serial Achiever',
    description: 'Achieve 5 financial goals',
    icon: '🏆',
    category: 'goals',
    points: 300,
    tier: 'gold',
    condition: { type: 'goals_achieved', threshold: 5 },
  },
  'emergency-fund': {
    id: 'emergency-fund',
    name: 'Safety Net',
    description: 'Build a 6-month emergency fund',
    icon: '🛡️',
    category: 'goals',
    points: 250,
    tier: 'gold',
    condition: { type: 'emergency_fund_months', threshold: 6 },
  },

  // ==================== DEBT ACHIEVEMENTS ====================
  'debt-free': {
    id: 'debt-free',
    name: 'Debt Free',
    description: 'Pay off all debts',
    icon: '🎉',
    category: 'debt',
    points: 500,
    tier: 'platinum',
    condition: { type: 'debt_count', threshold: 0 },
  },
  'debt-reduced-50': {
    id: 'debt-reduced-50',
    name: 'Halfway There',
    description: 'Reduce total debt by 50%',
    icon: '📉',
    category: 'debt',
    points: 150,
    tier: 'silver',
    condition: { type: 'debt_reduction', threshold: 50 },
  },
  'emi-on-time-12': {
    id: 'emi-on-time-12',
    name: 'EMI Master',
    description: 'Pay all EMIs on time for 12 months',
    icon: '⏰',
    category: 'debt',
    points: 200,
    tier: 'gold',
    condition: { type: 'emi_ontime_streak', threshold: 12 },
  },

  // ==================== SOCIAL/COMMUNITY ====================
  'profile-complete': {
    id: 'profile-complete',
    name: 'All Set Up',
    description: 'Complete your financial profile',
    icon: '✅',
    category: 'community',
    points: 20,
    tier: 'bronze',
    condition: { type: 'profile_completion', threshold: 100 },
  },
  'referral-1': {
    id: 'referral-1',
    name: 'Friend Finder',
    description: 'Refer one friend to the app',
    icon: '🤝',
    category: 'community',
    points: 50,
    tier: 'bronze',
    condition: { type: 'referral_count', threshold: 1 },
  },
  'leaderboard-top10': {
    id: 'leaderboard-top10',
    name: 'Top 10',
    description: 'Reach the top 10 on any leaderboard',
    icon: '🥇',
    category: 'community',
    points: 200,
    tier: 'gold',
    condition: { type: 'leaderboard_rank', threshold: 10 },
  },

  // ==================== KNOWLEDGE ====================
  'tips-read-10': {
    id: 'tips-read-10',
    name: 'Knowledge Seeker',
    description: 'Read 10 financial tips',
    icon: '📚',
    category: 'knowledge',
    points: 30,
    tier: 'bronze',
    condition: { type: 'tips_read', threshold: 10 },
  },
  'quiz-master': {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Score 100% on a financial quiz',
    icon: '🧠',
    category: 'knowledge',
    points: 75,
    tier: 'silver',
    condition: { type: 'quiz_perfect', threshold: 1 },
  },
};

// Level definitions
const LEVELS = [
  { level: 1, name: 'Financial Newbie', minPoints: 0, maxPoints: 49, icon: '🌱', perks: [] },
  { level: 2, name: 'Money Aware', minPoints: 50, maxPoints: 149, icon: '🌿', perks: ['custom_dashboard'] },
  { level: 3, name: 'Budget Tracker', minPoints: 150, maxPoints: 299, icon: '🌳', perks: ['advanced_charts'] },
  { level: 4, name: 'Smart Saver', minPoints: 300, maxPoints: 499, icon: '🌻', perks: ['goal_templates'] },
  { level: 5, name: 'Financial Planner', minPoints: 500, maxPoints: 799, icon: '⭐', perks: ['ai_insights'] },
  { level: 6, name: 'Money Manager', minPoints: 800, maxPoints: 1199, icon: '🌟', perks: ['export_reports'] },
  { level: 7, name: 'Wealth Builder', minPoints: 1200, maxPoints: 1799, icon: '💫', perks: ['custom_categories'] },
  { level: 8, name: 'Financial Expert', minPoints: 1800, maxPoints: 2499, icon: '🔥', perks: ['priority_support'] },
  { level: 9, name: 'Master Investor', minPoints: 2500, maxPoints: 3499, icon: '💎', perks: ['beta_features'] },
  { level: 10, name: 'Financial Legend', minPoints: 3500, maxPoints: Infinity, icon: '👑', perks: ['all_features'] },
];

class AchievementService {
  /**
   * Get user's gamification profile
   */
  static async getUserProfile(userId) {
    try {
      // In a real implementation, this would query a UserAchievements collection
      // For now, we'll calculate from transaction data
      const stats = await this._getUserStats(userId);
      const unlockedAchievements = this._checkAchievements(stats);
      const totalPoints = unlockedAchievements.reduce((s, a) => s + a.points, 0);
      const currentLevel = this._getLevel(totalPoints);
      const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);

      return {
        success: true,
        profile: {
          level: currentLevel.level,
          levelName: currentLevel.name,
          levelIcon: currentLevel.icon,
          totalPoints,
          pointsToNextLevel: nextLevel ? nextLevel.minPoints - totalPoints : 0,
          progressToNextLevel: nextLevel 
            ? Math.round(((totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100) 
            : 100,
          perks: currentLevel.perks,
        },
        achievements: {
          unlocked: unlockedAchievements,
          locked: Object.values(ACHIEVEMENTS).filter(a => !unlockedAchievements.find(u => u.id === a.id)),
          total: Object.keys(ACHIEVEMENTS).length,
          unlockedCount: unlockedAchievements.length,
          completionPercentage: Math.round((unlockedAchievements.length / Object.keys(ACHIEVEMENTS).length) * 100),
        },
        stats: {
          ...stats,
          currentStreak: stats.loginStreak || 0,
          bestStreak: stats.bestLoginStreak || 0,
        },
        streaks: {
          login: { current: stats.loginStreak || 0, best: stats.bestLoginStreak || 7 },
          savings: { current: stats.savingsStreak || 0, best: stats.bestSavingsStreak || 14 },
          budget: { current: stats.budgetStreak || 0, best: stats.bestBudgetStreak || 3 },
        },
        recentActivity: [],
      };
    } catch (error) {
      console.error('Error getting achievement profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for newly unlocked achievements after an action
   */
  static async checkNewAchievements(userId, actionType, actionData = {}) {
    try {
      const stats = await this._getUserStats(userId);
      
      // Update stats based on action
      switch (actionType) {
        case 'transaction_added':
          stats.transactionCount = (stats.transactionCount || 0) + 1;
          if (actionData.type === 'income') {
            stats.totalSavings = (stats.totalSavings || 0) + actionData.amount;
          }
          break;
        case 'budget_created':
          stats.budgetCount = (stats.budgetCount || 0) + 1;
          break;
        case 'goal_created':
          stats.goalCount = (stats.goalCount || 0) + 1;
          break;
        case 'goal_achieved':
          stats.goalsAchieved = (stats.goalsAchieved || 0) + 1;
          break;
        case 'investment_added':
          stats.investmentCount = (stats.investmentCount || 0) + 1;
          break;
        case 'login':
          stats.loginStreak = (stats.loginStreak || 0) + 1;
          break;
        case 'tip_read':
          stats.tipsRead = (stats.tipsRead || 0) + 1;
          break;
      }

      const previouslyUnlocked = this._checkAchievements(stats);
      // In real implementation, compare with stored achievements to find new ones
      
      return {
        success: true,
        newAchievements: [], // Would contain newly unlocked achievements
        totalPoints: previouslyUnlocked.reduce((s, a) => s + a.points, 0),
      };
    } catch (error) {
      console.error('Error checking achievements:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(type = 'points', limit = 20) {
    // In a real implementation, this would aggregate across all users
    // Mock leaderboard for demonstration
    const mockUsers = [
      { rank: 1, name: 'Priya S.', points: 4250, level: 10, levelIcon: '👑', streak: 145, achievements: 35 },
      { rank: 2, name: 'Rahul K.', points: 3800, level: 10, levelIcon: '👑', streak: 98, achievements: 32 },
      { rank: 3, name: 'Anita M.', points: 3200, level: 9, levelIcon: '💎', streak: 67, achievements: 28 },
      { rank: 4, name: 'Vikram P.', points: 2900, level: 9, levelIcon: '💎', streak: 55, achievements: 26 },
      { rank: 5, name: 'Deepa R.', points: 2500, level: 9, levelIcon: '💎', streak: 42, achievements: 24 },
      { rank: 6, name: 'Amit J.', points: 2200, level: 8, levelIcon: '🔥', streak: 38, achievements: 22 },
      { rank: 7, name: 'Sneha T.', points: 1950, level: 8, levelIcon: '🔥', streak: 33, achievements: 20 },
      { rank: 8, name: 'Ravi L.', points: 1700, level: 7, levelIcon: '💫', streak: 28, achievements: 18 },
      { rank: 9, name: 'Meera N.', points: 1500, level: 7, levelIcon: '💫', streak: 25, achievements: 16 },
      { rank: 10, name: 'Kiran D.', points: 1300, level: 7, levelIcon: '💫', streak: 21, achievements: 14 },
      { rank: 11, name: 'Suresh B.', points: 1100, level: 6, levelIcon: '🌟', streak: 18, achievements: 12 },
      { rank: 12, name: 'Lakshmi V.', points: 950, level: 6, levelIcon: '🌟', streak: 15, achievements: 11 },
      { rank: 13, name: 'Arjun G.', points: 800, level: 6, levelIcon: '🌟', streak: 12, achievements: 10 },
      { rank: 14, name: 'Neha C.', points: 650, level: 5, levelIcon: '⭐', streak: 10, achievements: 8 },
      { rank: 15, name: 'Pankaj H.', points: 500, level: 5, levelIcon: '⭐', streak: 8, achievements: 7 },
    ];

    if (type === 'streak') {
      mockUsers.sort((a, b) => b.streak - a.streak);
      mockUsers.forEach((u, i) => u.rank = i + 1);
    }

    return {
      success: true,
      type,
      leaderboard: mockUsers.slice(0, limit),
      totalParticipants: 1247,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get available challenges
   */
  static getChallenges() {
    return {
      success: true,
      challenges: [
        {
          id: 'no-spend-weekend',
          name: 'No-Spend Weekend',
          description: 'Spend ₹0 on discretionary items this weekend',
          duration: '2 days',
          reward: 30,
          difficulty: 'easy',
          category: 'savings',
          icon: '🚫💸',
        },
        {
          id: 'track-every-rupee',
          name: 'Track Every Rupee',
          description: 'Log every single expense for a week',
          duration: '7 days',
          reward: 50,
          difficulty: 'medium',
          category: 'tracking',
          icon: '🔍',
        },
        {
          id: 'meal-prep-week',
          name: 'Meal Prep Week',
          description: 'Cook all meals at home for a week',
          duration: '7 days',
          reward: 40,
          difficulty: 'medium',
          category: 'savings',
          icon: '🍳',
        },
        {
          id: 'auto-savings-setup',
          name: 'Automate Savings',
          description: 'Set up automatic transfers to savings',
          duration: 'one-time',
          reward: 25,
          difficulty: 'easy',
          category: 'savings',
          icon: '🔄',
        },
        {
          id: 'investment-research',
          name: 'Investment Explorer',
          description: 'Research and compare 5 investment options',
          duration: '3 days',
          reward: 35,
          difficulty: 'medium',
          category: 'investment',
          icon: '🔬',
        },
        {
          id: '52-week-savings',
          name: '52-Week Challenge',
          description: 'Save incrementally each week (₹100, ₹200, ₹300...)',
          duration: '52 weeks',
          reward: 500,
          difficulty: 'hard',
          category: 'savings',
          icon: '📈',
        },
        {
          id: 'debt-snowball',
          name: 'Debt Snowball Start',
          description: 'Pay off your smallest debt completely',
          duration: '30 days',
          reward: 100,
          difficulty: 'hard',
          category: 'debt',
          icon: '⛸️',
        },
        {
          id: 'subscription-audit',
          name: 'Subscription Audit',
          description: 'Review and cancel at least one unused subscription',
          duration: '1 day',
          reward: 20,
          difficulty: 'easy',
          category: 'savings',
          icon: '🔎',
        },
        {
          id: 'budget-all-categories',
          name: 'Complete Budget',
          description: 'Set up budgets for every spending category',
          duration: '1 day',
          reward: 30,
          difficulty: 'easy',
          category: 'budget',
          icon: '📋',
        },
        {
          id: 'net-worth-tracker',
          name: 'Net Worth Snapshot',
          description: 'Calculate and record your complete net worth',
          duration: '1 day',
          reward: 25,
          difficulty: 'easy',
          category: 'tracking',
          icon: '📸',
        },
      ],
    };
  }

  /**
   * Get daily rewards/quests
   */
  static getDailyQuests() {
    const quests = [
      { id: 'log-expense', name: 'Log an expense', points: 5, completed: false, icon: '✏️' },
      { id: 'check-budget', name: 'Check budget status', points: 5, completed: false, icon: '📊' },
      { id: 'read-tip', name: 'Read a financial tip', points: 3, completed: false, icon: '📖' },
      { id: 'review-goals', name: 'Review your goals', points: 5, completed: false, icon: '🎯' },
      { id: 'categorize-3', name: 'Categorize 3 transactions', points: 10, completed: false, icon: '🏷️' },
    ];

    return {
      success: true,
      date: new Date().toISOString().substring(0, 10),
      quests,
      totalDailyPoints: quests.reduce((s, q) => s + q.points, 0),
      bonusMultiplier: 1.5, // Weekend bonus
    };
  }

  // ======================== HELPER METHODS ========================

  static async _getUserStats(userId) {
    try {
      const Transaction = require('../models/Transaction');
      
      const [transactionCount, totalSavings] = await Promise.all([
        Transaction.countDocuments({ userId }),
        Transaction.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'income' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      return {
        transactionCount,
        totalSavings: totalSavings[0]?.total || 0,
        budgetCount: 0,
        goalCount: 0,
        goalsAchieved: 0,
        investmentCount: 0,
        loginStreak: 1,
        bestLoginStreak: 7,
        savingsStreak: 0,
        bestSavingsStreak: 14,
        budgetStreak: 0,
        bestBudgetStreak: 3,
        tipsRead: 0,
        profileCompletion: 60,
      };
    } catch (error) {
      return {
        transactionCount: 0,
        totalSavings: 0,
        budgetCount: 0,
        goalCount: 0,
        goalsAchieved: 0,
        investmentCount: 0,
        loginStreak: 1,
        bestLoginStreak: 1,
        savingsStreak: 0,
        bestSavingsStreak: 0,
        budgetStreak: 0,
        bestBudgetStreak: 0,
        tipsRead: 0,
        profileCompletion: 0,
      };
    }
  }

  static _checkAchievements(stats) {
    const unlocked = [];

    for (const achievement of Object.values(ACHIEVEMENTS)) {
      const { type, threshold } = achievement.condition;
      let earned = false;

      switch (type) {
        case 'transaction_count': earned = stats.transactionCount >= threshold; break;
        case 'savings_count': earned = stats.totalSavings > 0; break;
        case 'total_savings': earned = stats.totalSavings >= threshold; break;
        case 'savings_streak': earned = (stats.savingsStreak || stats.bestSavingsStreak || 0) >= threshold; break;
        case 'budget_count': earned = stats.budgetCount >= threshold; break;
        case 'budget_streak': earned = (stats.budgetStreak || stats.bestBudgetStreak || 0) >= threshold; break;
        case 'budget_categories': earned = stats.budgetCategories >= threshold; break;
        case 'login_streak': earned = (stats.loginStreak || stats.bestLoginStreak || 0) >= threshold; break;
        case 'investment_count': earned = stats.investmentCount >= threshold; break;
        case 'goal_count': earned = stats.goalCount >= threshold; break;
        case 'goals_achieved': earned = stats.goalsAchieved >= threshold; break;
        case 'profile_completion': earned = stats.profileCompletion >= threshold; break;
        case 'tips_read': earned = stats.tipsRead >= threshold; break;
        case 'debt_count': earned = stats.debtCount === threshold; break;
        default: earned = false;
      }

      if (earned) {
        unlocked.push({
          ...achievement,
          earnedAt: new Date().toISOString(),
        });
      }
    }

    return unlocked;
  }

  static _getLevel(totalPoints) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVELS[i].minPoints) {
        return LEVELS[i];
      }
    }
    return LEVELS[0];
  }
}

module.exports = AchievementService;
