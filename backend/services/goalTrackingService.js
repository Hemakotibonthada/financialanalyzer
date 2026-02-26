const FinancialGoal = require('../models/FinancialGoal');
const logger = require('../utils/logger');

/**
 * Goal Tracking Service
 * Manages financial goals, progress tracking, milestones, and statistics
 */
class GoalTrackingService {
  constructor() {
    // Default goal categories with suggested targets and icons
    this.goalCategoryDefaults = {
      retirement: { icon: '🏖️', suggestedMonths: 360, priority: 'high' },
      emergency_fund: { icon: '🛡️', suggestedMonths: 12, priority: 'high' },
      home_purchase: { icon: '🏠', suggestedMonths: 60, priority: 'high' },
      car_purchase: { icon: '🚗', suggestedMonths: 36, priority: 'medium' },
      education: { icon: '🎓', suggestedMonths: 48, priority: 'high' },
      wedding: { icon: '💍', suggestedMonths: 24, priority: 'medium' },
      vacation: { icon: '✈️', suggestedMonths: 12, priority: 'low' },
      business: { icon: '💼', suggestedMonths: 36, priority: 'medium' },
      debt_free: { icon: '🆓', suggestedMonths: 24, priority: 'high' },
      wealth_creation: { icon: '💰', suggestedMonths: 120, priority: 'medium' },
      other: { icon: '🎯', suggestedMonths: 24, priority: 'low' }
    };
  }

  /**
   * Create a new financial goal
   */
  async createGoal(userId, goalData) {
    try {
      const {
        name, description, category, targetAmount, currentAmount,
        targetDate, priority, icon, contributions, milestones,
        autoContribute, monthlyContribution
      } = goalData;

      const categoryDefaults = this.goalCategoryDefaults[category] || this.goalCategoryDefaults.other;

      // Calculate target date if not provided
      let calcTargetDate = targetDate;
      if (!calcTargetDate && targetAmount && monthlyContribution && monthlyContribution > 0) {
        const monthsNeeded = Math.ceil((targetAmount - (currentAmount || 0)) / monthlyContribution);
        calcTargetDate = new Date();
        calcTargetDate.setMonth(calcTargetDate.getMonth() + monthsNeeded);
      } else if (!calcTargetDate) {
        calcTargetDate = new Date();
        calcTargetDate.setMonth(calcTargetDate.getMonth() + categoryDefaults.suggestedMonths);
      }

      const goal = new FinancialGoal({
        userId,
        name,
        description,
        category: category || 'other',
        icon: icon || categoryDefaults.icon,
        targetAmount,
        currentAmount: currentAmount || 0,
        targetDate: calcTargetDate,
        priority: priority || categoryDefaults.priority,
        status: 'active',
        contributions: contributions || [],
        milestones: milestones || this._generateDefaultMilestones(targetAmount),
        autoContribute: autoContribute || false,
        monthlyContribution: monthlyContribution || 0
      });

      await goal.save();
      logger.info(`Goal "${name}" created for user ${userId}`);

      // Check if goal is already achieved
      const achievementCheck = this._checkAchievement(goal);

      return {
        success: true,
        data: {
          goal,
          progress: this.calculateProgress(goal),
          achievement: achievementCheck
        },
        message: 'Goal created successfully'
      };
    } catch (error) {
      logger.error('Create goal error:', error);
      throw error;
    }
  }

  /**
   * Get all goals for a user
   */
  async getGoals(userId, options = {}) {
    try {
      const { status, category, priority, sortBy = 'createdAt', order = -1 } = options;
      const query = { userId };

      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;

      const goals = await FinancialGoal.find(query)
        .sort({ [sortBy]: order });

      const goalsWithProgress = goals.map(goal => ({
        ...goal.toObject(),
        progress: this.calculateProgress(goal),
        projectedCompletion: this.getProjectedCompletionDate(goal),
        monthlyNeeded: this.calculateMonthlyContribution(goal)
      }));

      return {
        success: true,
        data: {
          goals: goalsWithProgress,
          count: goalsWithProgress.length
        }
      };
    } catch (error) {
      logger.error('Get goals error:', error);
      throw error;
    }
  }

  /**
   * Get a single goal by ID
   */
  async getGoalById(userId, goalId) {
    try {
      const goal = await FinancialGoal.findOne({ _id: goalId, userId });
      if (!goal) {
        return { success: false, message: 'Goal not found', statusCode: 404 };
      }

      return {
        success: true,
        data: {
          goal,
          progress: this.calculateProgress(goal),
          projectedCompletion: this.getProjectedCompletionDate(goal),
          monthlyNeeded: this.calculateMonthlyContribution(goal),
          milestoneStatus: this._getMilestoneStatus(goal)
        }
      };
    } catch (error) {
      logger.error('Get goal by ID error:', error);
      throw error;
    }
  }

  /**
   * Update a goal
   */
  async updateGoal(userId, goalId, updateData) {
    try {
      const goal = await FinancialGoal.findOne({ _id: goalId, userId });
      if (!goal) {
        return { success: false, message: 'Goal not found', statusCode: 404 };
      }

      const allowedFields = [
        'name', 'description', 'category', 'targetAmount', 'targetDate',
        'priority', 'icon', 'autoContribute', 'monthlyContribution', 'status'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          goal[field] = updateData[field];
        }
      }

      await goal.save();

      const achievementCheck = this._checkAchievement(goal);

      return {
        success: true,
        data: {
          goal,
          progress: this.calculateProgress(goal),
          achievement: achievementCheck
        },
        message: 'Goal updated successfully'
      };
    } catch (error) {
      logger.error('Update goal error:', error);
      throw error;
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(userId, goalId) {
    try {
      const goal = await FinancialGoal.findOneAndDelete({ _id: goalId, userId });
      if (!goal) {
        return { success: false, message: 'Goal not found', statusCode: 404 };
      }

      logger.info(`Goal "${goal.name}" deleted for user ${userId}`);

      return {
        success: true,
        message: 'Goal deleted successfully'
      };
    } catch (error) {
      logger.error('Delete goal error:', error);
      throw error;
    }
  }

  /**
   * Update goal progress (add contribution)
   */
  async updateProgress(userId, goalId, contributionData) {
    try {
      const goal = await FinancialGoal.findOne({ _id: goalId, userId });
      if (!goal) {
        return { success: false, message: 'Goal not found', statusCode: 404 };
      }

      const { amount, note, date } = contributionData;

      if (!amount || amount <= 0) {
        return { success: false, message: 'Contribution amount must be positive', statusCode: 400 };
      }

      // Add contribution record
      if (!goal.contributions) goal.contributions = [];
      goal.contributions.push({
        amount,
        date: date || new Date(),
        note: note || ''
      });

      // Update current amount
      goal.currentAmount = (goal.currentAmount || 0) + amount;

      // Check and update milestones
      this._updateMilestones(goal);

      await goal.save();

      const achievement = this._checkAchievement(goal);
      if (achievement.achieved) {
        goal.status = 'completed';
        goal.completedAt = new Date();
        await goal.save();
      }

      logger.info(`Goal "${goal.name}" progress updated: +${amount}, now at ${goal.currentAmount}`);

      return {
        success: true,
        data: {
          goal,
          progress: this.calculateProgress(goal),
          achievement,
          newMilestones: this._getRecentlyReachedMilestones(goal)
        },
        message: achievement.achieved
          ? '🎉 Congratulations! Goal achieved!'
          : `Progress updated: ₹${amount} added`
      };
    } catch (error) {
      logger.error('Update progress error:', error);
      throw error;
    }
  }

  /**
   * Add a milestone to a goal
   */
  async addMilestone(userId, goalId, milestoneData) {
    try {
      const goal = await FinancialGoal.findOne({ _id: goalId, userId });
      if (!goal) {
        return { success: false, message: 'Goal not found', statusCode: 404 };
      }

      const { name, targetAmount, targetPercentage } = milestoneData;

      const milestoneAmount = targetAmount || (goal.targetAmount * (targetPercentage || 0) / 100);
      const isReached = (goal.currentAmount || 0) >= milestoneAmount;

      if (!goal.milestones) goal.milestones = [];
      goal.milestones.push({
        name: name || `Milestone at ₹${milestoneAmount}`,
        targetAmount: milestoneAmount,
        targetPercentage: targetPercentage || parseFloat(((milestoneAmount / goal.targetAmount) * 100).toFixed(1)),
        reached: isReached,
        reachedAt: isReached ? new Date() : null
      });

      // Sort milestones by target amount
      goal.milestones.sort((a, b) => a.targetAmount - b.targetAmount);

      await goal.save();

      return {
        success: true,
        data: { goal },
        message: 'Milestone added successfully'
      };
    } catch (error) {
      logger.error('Add milestone error:', error);
      throw error;
    }
  }

  /**
   * Get goal statistics dashboard
   */
  async getStatistics(userId) {
    try {
      const goals = await FinancialGoal.find({ userId });

      if (goals.length === 0) {
        return {
          success: true,
          data: {
            totalGoals: 0,
            activeGoals: 0,
            completedGoals: 0,
            totalTargetAmount: 0,
            totalSaved: 0,
            overallProgress: 0,
            byCategory: {},
            byPriority: {},
            upcomingDeadlines: [],
            recentContributions: [],
            averageMonthlyContribution: 0
          }
        };
      }

      const activeGoals = goals.filter(g => g.status === 'active');
      const completedGoals = goals.filter(g => g.status === 'completed');

      const totalTargetAmount = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
      const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
      const overallProgress = totalTargetAmount > 0
        ? parseFloat(((totalSaved / totalTargetAmount) * 100).toFixed(1))
        : 0;

      // By category
      const byCategory = {};
      for (const goal of goals) {
        const cat = goal.category || 'other';
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, targetTotal: 0, savedTotal: 0, progress: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].targetTotal += goal.targetAmount || 0;
        byCategory[cat].savedTotal += goal.currentAmount || 0;
      }
      for (const cat of Object.keys(byCategory)) {
        byCategory[cat].progress = byCategory[cat].targetTotal > 0
          ? parseFloat(((byCategory[cat].savedTotal / byCategory[cat].targetTotal) * 100).toFixed(1))
          : 0;
      }

      // By priority
      const byPriority = { high: 0, medium: 0, low: 0 };
      for (const goal of goals) {
        const p = goal.priority || 'low';
        byPriority[p] = (byPriority[p] || 0) + 1;
      }

      // Upcoming deadlines (next 3 months)
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      const upcomingDeadlines = activeGoals
        .filter(g => g.targetDate && new Date(g.targetDate) <= threeMonths)
        .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
        .slice(0, 5)
        .map(g => ({
          goalId: g._id,
          name: g.name,
          targetDate: g.targetDate,
          progress: this.calculateProgress(g),
          daysRemaining: Math.max(0, Math.ceil((new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24)))
        }));

      // Recent contributions across all goals
      const recentContributions = [];
      for (const goal of goals) {
        if (goal.contributions && goal.contributions.length > 0) {
          for (const c of goal.contributions.slice(-5)) {
            recentContributions.push({
              goalName: goal.name,
              goalId: goal._id,
              amount: c.amount,
              date: c.date,
              note: c.note
            });
          }
        }
      }
      recentContributions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Average monthly contribution (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      let totalContributions = 0;
      for (const goal of goals) {
        if (goal.contributions) {
          for (const c of goal.contributions) {
            if (new Date(c.date) >= sixMonthsAgo) {
              totalContributions += c.amount || 0;
            }
          }
        }
      }
      const averageMonthlyContribution = parseFloat((totalContributions / 6).toFixed(2));

      // Goal priority scoring
      const priorityScores = activeGoals.map(g => ({
        goalId: g._id,
        name: g.name,
        score: this._calculatePriorityScore(g),
        recommendation: this._getPriorityRecommendation(g)
      })).sort((a, b) => b.score - a.score);

      return {
        success: true,
        data: {
          totalGoals: goals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          totalTargetAmount,
          totalSaved,
          overallProgress,
          byCategory,
          byPriority,
          upcomingDeadlines,
          recentContributions: recentContributions.slice(0, 10),
          averageMonthlyContribution,
          priorityScores
        }
      };
    } catch (error) {
      logger.error('Get statistics error:', error);
      throw error;
    }
  }

  // ==================== CALCULATION HELPERS ====================

  /**
   * Calculate progress percentage for a goal
   */
  calculateProgress(goal) {
    if (!goal || !goal.targetAmount || goal.targetAmount <= 0) return 0;
    const progress = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
    return parseFloat(Math.min(progress, 100).toFixed(1));
  }

  /**
   * Get projected completion date based on current savings rate
   */
  getProjectedCompletionDate(goal) {
    if (!goal || goal.status === 'completed') return null;

    const remaining = (goal.targetAmount || 0) - (goal.currentAmount || 0);
    if (remaining <= 0) return new Date(); // Already met

    // Calculate average monthly rate from contributions
    const contributions = goal.contributions || [];
    if (contributions.length < 2) {
      // Use monthly contribution if set
      if (goal.monthlyContribution && goal.monthlyContribution > 0) {
        const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
        const projected = new Date();
        projected.setMonth(projected.getMonth() + monthsNeeded);
        return projected;
      }
      return null; // Not enough data
    }

    // Calculate rate from contribution history
    const sorted = contributions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const monthsDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));
    const totalContributed = sorted.reduce((sum, c) => sum + (c.amount || 0), 0);
    const monthlyRate = totalContributed / monthsDiff;

    if (monthlyRate <= 0) return null;

    const monthsNeeded = Math.ceil(remaining / monthlyRate);
    const projected = new Date();
    projected.setMonth(projected.getMonth() + monthsNeeded);
    return projected;
  }

  /**
   * Calculate monthly contribution needed to reach goal by target date
   */
  calculateMonthlyContribution(goal) {
    if (!goal || !goal.targetDate) return 0;

    const remaining = (goal.targetAmount || 0) - (goal.currentAmount || 0);
    if (remaining <= 0) return 0;

    const now = new Date();
    const target = new Date(goal.targetDate);
    const monthsRemaining = Math.max(1, (target - now) / (1000 * 60 * 60 * 24 * 30));

    return parseFloat((remaining / monthsRemaining).toFixed(2));
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Generate default milestones at 25%, 50%, 75%, 100%
   */
  _generateDefaultMilestones(targetAmount) {
    if (!targetAmount) return [];

    return [
      { name: '25% reached', targetAmount: targetAmount * 0.25, targetPercentage: 25, reached: false },
      { name: 'Halfway there!', targetAmount: targetAmount * 0.5, targetPercentage: 50, reached: false },
      { name: '75% reached', targetAmount: targetAmount * 0.75, targetPercentage: 75, reached: false },
      { name: 'Goal achieved!', targetAmount: targetAmount, targetPercentage: 100, reached: false }
    ];
  }

  /**
   * Update milestone reached status
   */
  _updateMilestones(goal) {
    if (!goal.milestones) return;

    for (const milestone of goal.milestones) {
      if (!milestone.reached && (goal.currentAmount || 0) >= milestone.targetAmount) {
        milestone.reached = true;
        milestone.reachedAt = new Date();
      }
    }
  }

  /**
   * Get recently reached milestones
   */
  _getRecentlyReachedMilestones(goal) {
    if (!goal.milestones) return [];

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return goal.milestones
      .filter(m => m.reached && m.reachedAt && new Date(m.reachedAt) >= oneDayAgo)
      .map(m => ({ name: m.name, targetAmount: m.targetAmount, reachedAt: m.reachedAt }));
  }

  /**
   * Get milestone status for a goal
   */
  _getMilestoneStatus(goal) {
    if (!goal.milestones || goal.milestones.length === 0) return { reached: 0, total: 0, next: null };

    const reached = goal.milestones.filter(m => m.reached).length;
    const next = goal.milestones.find(m => !m.reached);

    return {
      reached,
      total: goal.milestones.length,
      next: next ? {
        name: next.name,
        targetAmount: next.targetAmount,
        remaining: Math.max(0, next.targetAmount - (goal.currentAmount || 0))
      } : null
    };
  }

  /**
   * Check if a goal has been achieved
   */
  _checkAchievement(goal) {
    const achieved = (goal.currentAmount || 0) >= (goal.targetAmount || 0);
    const progress = this.calculateProgress(goal);

    return {
      achieved,
      progress,
      remaining: achieved ? 0 : parseFloat(((goal.targetAmount || 0) - (goal.currentAmount || 0)).toFixed(2)),
      exceededBy: achieved ? parseFloat(((goal.currentAmount || 0) - (goal.targetAmount || 0)).toFixed(2)) : 0
    };
  }

  /**
   * Calculate priority score for a goal (0-100)
   * Higher score = needs more attention
   */
  _calculatePriorityScore(goal) {
    let score = 0;

    // Priority weight (high=40, medium=25, low=10)
    const priorityWeights = { high: 40, medium: 25, low: 10 };
    score += priorityWeights[goal.priority] || 10;

    // Deadline proximity (closer = higher score, max 30 points)
    if (goal.targetDate) {
      const daysRemaining = Math.max(0, (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 30) score += 30;
      else if (daysRemaining <= 90) score += 20;
      else if (daysRemaining <= 180) score += 10;
      else score += 5;
    }

    // Progress deficit (behind schedule = higher score, max 30 points)
    if (goal.targetDate && goal.targetAmount) {
      const totalDays = (new Date(goal.targetDate) - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24);
      const elapsedDays = (new Date() - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24);
      const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
      const actualProgress = this.calculateProgress(goal);
      const deficit = Math.max(0, expectedProgress - actualProgress);
      score += Math.min(30, deficit * 0.5);
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Get recommendation text based on goal state
   */
  _getPriorityRecommendation(goal) {
    const progress = this.calculateProgress(goal);
    const monthlyNeeded = this.calculateMonthlyContribution(goal);

    if (progress >= 90) return 'Almost there! Keep going to reach your goal.';
    if (progress >= 50) return `Good progress! Contribute ₹${monthlyNeeded.toLocaleString()}/month to stay on track.`;
    if (progress >= 25) return `Building momentum. Target ₹${monthlyNeeded.toLocaleString()}/month.`;

    if (goal.targetDate) {
      const daysRemaining = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 90) {
        return `⚠️ Deadline approaching! Need ₹${monthlyNeeded.toLocaleString()}/month to reach target.`;
      }
    }

    return `Start with ₹${monthlyNeeded.toLocaleString()}/month to reach your goal on time.`;
  }
}

module.exports = new GoalTrackingService();
