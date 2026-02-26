/**
 * @fileoverview Family Finance Management Service
 * Handles family member management, shared budgets, allowances,
 * and aggregated family financial summaries.
 * @module services/familyFinanceService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ---------- Mongoose Schemas (inline, lightweight) ---------- */

const familyMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    relationship: {
      type: String,
      enum: ['spouse', 'child', 'parent', 'sibling', 'other'],
      required: true,
    },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    monthlyIncome: { type: Number, default: 0 },
    monthlyExpenses: { type: Number, default: 0 },
    allowance: {
      amount: { type: Number, default: 0 },
      frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'monthly' },
      lastPaidAt: { type: Date },
      isActive: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const sharedBudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    spentAmount: { type: Number, default: 0 },
    period: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
    contributions: [
      {
        memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
        amount: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
    ],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FamilyMember =
  mongoose.models.FamilyMember || mongoose.model('FamilyMember', familyMemberSchema);
const SharedBudget =
  mongoose.models.SharedBudget || mongoose.model('SharedBudget', sharedBudgetSchema);

/* ============================================================
 *  Family Finance Service
 * ============================================================ */
const familyFinanceService = {
  /* ----------------------------------------------------------
   *  addFamilyMember
   * ---------------------------------------------------------- */
  /**
   * Add a new family member to the user's household.
   * @param {string} userId - ID of the owning user.
   * @param {Object} memberData - Member details.
   * @param {string} memberData.name - Full name.
   * @param {string} memberData.relationship - Relationship to user.
   * @param {string} [memberData.email] - Email address.
   * @param {string} [memberData.phone] - Phone number.
   * @param {Date}   [memberData.dateOfBirth] - Date of birth.
   * @param {number} [memberData.monthlyIncome] - Monthly income.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async addFamilyMember(userId, memberData) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!memberData?.name) throw new Error('Member name is required');
      if (!memberData?.relationship) throw new Error('Relationship is required');

      const validRelationships = ['spouse', 'child', 'parent', 'sibling', 'other'];
      if (!validRelationships.includes(memberData.relationship)) {
        throw new Error(`Invalid relationship. Must be one of: ${validRelationships.join(', ')}`);
      }

      // Prevent duplicate spouse
      if (memberData.relationship === 'spouse') {
        const existingSpouse = await FamilyMember.findOne({
          userId,
          relationship: 'spouse',
          isActive: true,
          deletedAt: null,
        });
        if (existingSpouse) {
          throw new Error('A spouse member already exists. Update or remove before adding another.');
        }
      }

      const member = new FamilyMember({ userId, ...memberData });
      await member.save();

      logger.info(`Family member added: ${member.name} for user ${userId}`);
      return { success: true, data: member.toObject() };
    } catch (error) {
      logger.error(`addFamilyMember error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  updateFamilyMember
   * ---------------------------------------------------------- */
  /**
   * Update an existing family member's details.
   * @param {string} userId - Owning user ID.
   * @param {string} memberId - Member document ID.
   * @param {Object} updates - Fields to update.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateFamilyMember(userId, memberId, updates) {
    try {
      if (!userId || !memberId) throw new Error('userId and memberId are required');

      const disallowed = ['userId', '_id', 'createdAt'];
      disallowed.forEach((f) => delete updates[f]);

      const member = await FamilyMember.findOneAndUpdate(
        { _id: memberId, userId, isActive: true, deletedAt: null },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!member) throw new Error('Family member not found or access denied');

      logger.info(`Family member updated: ${memberId}`);
      return { success: true, data: member.toObject() };
    } catch (error) {
      logger.error(`updateFamilyMember error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  removeFamilyMember  (soft-delete)
   * ---------------------------------------------------------- */
  /**
   * Soft-delete a family member by setting isActive=false and deletedAt.
   * @param {string} userId
   * @param {string} memberId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async removeFamilyMember(userId, memberId) {
    try {
      if (!userId || !memberId) throw new Error('userId and memberId are required');

      const member = await FamilyMember.findOneAndUpdate(
        { _id: memberId, userId, isActive: true, deletedAt: null },
        { $set: { isActive: false, deletedAt: new Date() } },
        { new: true }
      );

      if (!member) throw new Error('Family member not found or already removed');

      // Deactivate allowance on removal
      member.allowance.isActive = false;
      await member.save();

      logger.info(`Family member soft-deleted: ${memberId}`);
      return { success: true, data: { id: memberId, removedAt: member.deletedAt } };
    } catch (error) {
      logger.error(`removeFamilyMember error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getFamilyMembers
   * ---------------------------------------------------------- */
  /**
   * Retrieve all active family members for a user.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getFamilyMembers(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const members = await FamilyMember.find({
        userId,
        isActive: true,
        deletedAt: null,
      }).sort({ relationship: 1, name: 1 });

      return { success: true, data: members.map((m) => m.toObject()) };
    } catch (error) {
      logger.error(`getFamilyMembers error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  calculateFamilyBudget
   * ---------------------------------------------------------- */
  /**
   * Aggregate income and expenses across every active family member
   * and return a consolidated budget overview.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async calculateFamilyBudget(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const members = await FamilyMember.find({ userId, isActive: true, deletedAt: null });

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalAllowances = 0;
      const memberBreakdown = [];

      for (const m of members) {
        totalIncome += m.monthlyIncome || 0;
        totalExpenses += m.monthlyExpenses || 0;

        let monthlyAllowance = 0;
        if (m.allowance?.isActive) {
          const base = m.allowance.amount || 0;
          switch (m.allowance.frequency) {
            case 'weekly':
              monthlyAllowance = base * 4.33;
              break;
            case 'biweekly':
              monthlyAllowance = base * 2.17;
              break;
            default:
              monthlyAllowance = base;
          }
        }
        totalAllowances += monthlyAllowance;

        memberBreakdown.push({
          id: m._id,
          name: m.name,
          relationship: m.relationship,
          income: m.monthlyIncome || 0,
          expenses: m.monthlyExpenses || 0,
          allowance: monthlyAllowance,
          netContribution: (m.monthlyIncome || 0) - (m.monthlyExpenses || 0) - monthlyAllowance,
        });
      }

      const netSavings = totalIncome - totalExpenses - totalAllowances;

      return {
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          totalAllowances,
          netSavings,
          savingsRate: totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : '0.00',
          memberCount: members.length,
          memberBreakdown,
        },
      };
    } catch (error) {
      logger.error(`calculateFamilyBudget error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  updateAllowance
   * ---------------------------------------------------------- */
  /**
   * Update a family member's allowance configuration.
   * @param {string} userId
   * @param {string} memberId
   * @param {Object} allowanceConfig
   * @param {number} allowanceConfig.amount
   * @param {string} [allowanceConfig.frequency] - weekly | biweekly | monthly
   * @param {boolean} [allowanceConfig.isActive]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateAllowance(userId, memberId, allowanceConfig) {
    try {
      if (!userId || !memberId) throw new Error('userId and memberId are required');
      if (allowanceConfig.amount != null && allowanceConfig.amount < 0) {
        throw new Error('Allowance amount cannot be negative');
      }

      const validFrequencies = ['weekly', 'biweekly', 'monthly'];
      if (allowanceConfig.frequency && !validFrequencies.includes(allowanceConfig.frequency)) {
        throw new Error(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
      }

      const updateFields = {};
      if (allowanceConfig.amount != null) updateFields['allowance.amount'] = allowanceConfig.amount;
      if (allowanceConfig.frequency) updateFields['allowance.frequency'] = allowanceConfig.frequency;
      if (allowanceConfig.isActive != null) updateFields['allowance.isActive'] = allowanceConfig.isActive;

      const member = await FamilyMember.findOneAndUpdate(
        { _id: memberId, userId, isActive: true, deletedAt: null },
        { $set: updateFields },
        { new: true }
      );

      if (!member) throw new Error('Family member not found');

      logger.info(`Allowance updated for member ${memberId}`);
      return { success: true, data: { memberId, allowance: member.allowance } };
    } catch (error) {
      logger.error(`updateAllowance error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getFamilySpendingBreakdown
   * ---------------------------------------------------------- */
  /**
   * Get spending breakdown by member for a given date range.
   * @param {string} userId
   * @param {Object} dateRange
   * @param {Date|string} dateRange.startDate
   * @param {Date|string} dateRange.endDate
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getFamilySpendingBreakdown(userId, dateRange = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const now = new Date();
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : now;

      if (startDate > endDate) throw new Error('startDate must be before endDate');

      const members = await FamilyMember.find({ userId, isActive: true, deletedAt: null });

      const categories = [
        'Food & Dining',
        'Transportation',
        'Entertainment',
        'Shopping',
        'Utilities',
        'Healthcare',
        'Education',
        'Personal',
        'Other',
      ];

      const memberSpending = members.map((m) => {
        // Build simulated spending per category based on monthly expenses
        const monthlyBase = m.monthlyExpenses || 0;
        const daysCovered = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        const dailyRate = monthlyBase / 30;
        const periodExpenses = +(dailyRate * daysCovered).toFixed(2);

        const breakdown = {};
        let remaining = periodExpenses;
        const weights = [0.25, 0.15, 0.1, 0.12, 0.1, 0.08, 0.07, 0.08, 0.05];
        categories.forEach((cat, i) => {
          const amt = +(periodExpenses * weights[i]).toFixed(2);
          breakdown[cat] = amt;
          remaining -= amt;
        });
        // Assign rounding remainder to "Other"
        breakdown['Other'] = +(breakdown['Other'] + remaining).toFixed(2);

        return {
          memberId: m._id,
          name: m.name,
          relationship: m.relationship,
          totalSpent: periodExpenses,
          categoryBreakdown: breakdown,
        };
      });

      const familyTotal = memberSpending.reduce((sum, ms) => sum + ms.totalSpent, 0);

      return {
        success: true,
        data: {
          period: { startDate, endDate },
          familyTotal: +familyTotal.toFixed(2),
          memberSpending,
          highestSpender: memberSpending.length
            ? memberSpending.reduce((a, b) => (a.totalSpent > b.totalSpent ? a : b)).name
            : null,
        },
      };
    } catch (error) {
      logger.error(`getFamilySpendingBreakdown error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  createSharedBudget
   * ---------------------------------------------------------- */
  /**
   * Create a budget that is shared among selected family members.
   * @param {string} userId
   * @param {Object} budgetData
   * @param {string} budgetData.name - Budget name.
   * @param {string} budgetData.category - Category.
   * @param {number} budgetData.totalAmount - Total budget amount.
   * @param {string} [budgetData.period] - weekly | monthly | yearly
   * @param {Array<string>} [budgetData.memberIds] - Participating member IDs.
   * @param {Array<{memberId:string,percentage:number}>} [budgetData.contributions]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createSharedBudget(userId, budgetData) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!budgetData?.name) throw new Error('Budget name is required');
      if (!budgetData?.category) throw new Error('Budget category is required');
      if (!budgetData?.totalAmount || budgetData.totalAmount <= 0) {
        throw new Error('A positive totalAmount is required');
      }

      // Validate member IDs belong to user
      let memberIds = budgetData.memberIds || [];
      if (memberIds.length) {
        const valid = await FamilyMember.countDocuments({
          _id: { $in: memberIds },
          userId,
          isActive: true,
          deletedAt: null,
        });
        if (valid !== memberIds.length) {
          throw new Error('One or more member IDs are invalid or not active');
        }
      }

      // Build contributions array
      let contributions = [];
      if (budgetData.contributions?.length) {
        const totalPct = budgetData.contributions.reduce((s, c) => s + (c.percentage || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) {
          throw new Error('Contribution percentages must sum to 100');
        }
        contributions = budgetData.contributions.map((c) => ({
          memberId: c.memberId,
          percentage: c.percentage,
          amount: +((budgetData.totalAmount * c.percentage) / 100).toFixed(2),
        }));
      } else if (memberIds.length) {
        const equalPct = +(100 / memberIds.length).toFixed(2);
        contributions = memberIds.map((mid) => ({
          memberId: mid,
          percentage: equalPct,
          amount: +((budgetData.totalAmount * equalPct) / 100).toFixed(2),
        }));
      }

      const budget = new SharedBudget({
        userId,
        name: budgetData.name,
        category: budgetData.category,
        totalAmount: budgetData.totalAmount,
        period: budgetData.period || 'monthly',
        members: memberIds,
        contributions,
        startDate: budgetData.startDate || new Date(),
        endDate: budgetData.endDate || null,
      });

      await budget.save();
      logger.info(`Shared budget created: ${budget.name} for user ${userId}`);
      return { success: true, data: budget.toObject() };
    } catch (error) {
      logger.error(`createSharedBudget error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getFamilyFinancialSummary
   * ---------------------------------------------------------- */
  /**
   * Comprehensive financial summary for the entire family including
   * budgets, allowances, income, expenses, and savings projections.
   * @param {string} userId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getFamilyFinancialSummary(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      // Members
      const members = await FamilyMember.find({ userId, isActive: true, deletedAt: null });
      const sharedBudgets = await SharedBudget.find({ userId, isActive: true });

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalAllowances = 0;

      const memberSummaries = members.map((m) => {
        const income = m.monthlyIncome || 0;
        const expenses = m.monthlyExpenses || 0;
        let allowanceMonthly = 0;

        if (m.allowance?.isActive) {
          const base = m.allowance.amount || 0;
          switch (m.allowance.frequency) {
            case 'weekly':
              allowanceMonthly = base * 4.33;
              break;
            case 'biweekly':
              allowanceMonthly = base * 2.17;
              break;
            default:
              allowanceMonthly = base;
          }
        }

        totalIncome += income;
        totalExpenses += expenses;
        totalAllowances += allowanceMonthly;

        return {
          id: m._id,
          name: m.name,
          relationship: m.relationship,
          income,
          expenses,
          allowance: +allowanceMonthly.toFixed(2),
          net: +(income - expenses - allowanceMonthly).toFixed(2),
        };
      });

      const netMonthlySavings = totalIncome - totalExpenses - totalAllowances;
      const annualProjection = netMonthlySavings * 12;

      const budgetSummary = sharedBudgets.map((b) => ({
        id: b._id,
        name: b.name,
        category: b.category,
        totalAmount: b.totalAmount,
        spentAmount: b.spentAmount,
        remaining: b.totalAmount - b.spentAmount,
        utilization: b.totalAmount > 0 ? +((b.spentAmount / b.totalAmount) * 100).toFixed(2) : 0,
        period: b.period,
        memberCount: b.members.length,
      }));

      // Health indicators
      const savingsRate = totalIncome > 0 ? (netMonthlySavings / totalIncome) * 100 : 0;
      let healthStatus = 'critical';
      if (savingsRate >= 30) healthStatus = 'excellent';
      else if (savingsRate >= 20) healthStatus = 'good';
      else if (savingsRate >= 10) healthStatus = 'fair';
      else if (savingsRate >= 0) healthStatus = 'warning';

      return {
        success: true,
        data: {
          overview: {
            totalMembers: members.length,
            totalIncome: +totalIncome.toFixed(2),
            totalExpenses: +totalExpenses.toFixed(2),
            totalAllowances: +totalAllowances.toFixed(2),
            netMonthlySavings: +netMonthlySavings.toFixed(2),
            annualProjection: +annualProjection.toFixed(2),
            savingsRate: +savingsRate.toFixed(2),
            healthStatus,
          },
          members: memberSummaries,
          sharedBudgets: budgetSummary,
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error(`getFamilyFinancialSummary error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = familyFinanceService;
