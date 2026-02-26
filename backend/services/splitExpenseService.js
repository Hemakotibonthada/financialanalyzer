const Group = require('../models/Group');
const SplitExpense = require('../models/SplitExpense');
const logger = require('../utils/logger');

/**
 * Split Expense Service
 * Handles group expense splitting, balance calculations, and settlement suggestions
 */
class SplitExpenseService {
  /**
   * Create a new expense-splitting group
   */
  async createGroup(userId, groupData) {
    try {
      const { name, description, members, currency, avatar, category } = groupData;

      // Ensure creator is included in members
      const memberList = members || [];
      const creatorExists = memberList.some(
        m => m.userId && m.userId.toString() === userId.toString()
      );

      if (!creatorExists) {
        memberList.unshift({
          userId,
          name: groupData.creatorName || 'Creator',
          email: groupData.creatorEmail || '',
          joinedAt: new Date(),
          isActive: true
        });
      }

      const group = new Group({
        name,
        description,
        members: memberList,
        createdBy: userId,
        currency: currency || 'INR',
        avatar: avatar || '👥',
        category: category || 'other',
        totalExpenses: 0,
        status: 'active'
      });

      await group.save();
      logger.info(`Group "${name}" created by user ${userId}`);

      return {
        success: true,
        data: { group },
        message: 'Group created successfully'
      };
    } catch (error) {
      logger.error('Create group error:', error);
      throw error;
    }
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId) {
    try {
      const groups = await Group.find({
        'members.userId': userId,
        'members.isActive': true
      }).sort({ updatedAt: -1 });

      return {
        success: true,
        data: { groups, count: groups.length }
      };
    } catch (error) {
      logger.error('Get user groups error:', error);
      throw error;
    }
  }

  /**
   * Add a member to a group
   */
  async addMember(groupId, userId, memberData) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      // Check if user is authorized (member of the group)
      const isMember = group.members.some(
        m => m.userId && m.userId.toString() === userId.toString() && m.isActive
      );
      if (!isMember) {
        return { success: false, message: 'Not authorized to modify this group', statusCode: 403 };
      }

      // Check if member already exists
      const existingMember = group.members.find(
        m => m.email === memberData.email && m.isActive
      );
      if (existingMember) {
        return { success: false, message: 'Member already in group', statusCode: 400 };
      }

      // Re-activate if previously removed
      const inactiveMember = group.members.find(
        m => m.email === memberData.email && !m.isActive
      );
      if (inactiveMember) {
        inactiveMember.isActive = true;
        inactiveMember.name = memberData.name || inactiveMember.name;
        inactiveMember.joinedAt = new Date();
      } else {
        group.members.push({
          userId: memberData.userId || null,
          name: memberData.name,
          email: memberData.email,
          joinedAt: new Date(),
          isActive: true
        });
      }

      await group.save();
      logger.info(`Member added to group ${groupId}`);

      return {
        success: true,
        data: { group },
        message: 'Member added successfully'
      };
    } catch (error) {
      logger.error('Add member error:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a group (soft delete)
   */
  async removeMember(groupId, userId, memberId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      if (group.createdBy.toString() !== userId.toString()) {
        return { success: false, message: 'Only group creator can remove members', statusCode: 403 };
      }

      const member = group.members.find(
        m => (m.userId && m.userId.toString() === memberId) || m._id.toString() === memberId
      );
      if (!member) {
        return { success: false, message: 'Member not found', statusCode: 404 };
      }

      member.isActive = false;
      await group.save();

      return {
        success: true,
        data: { group },
        message: 'Member removed successfully'
      };
    } catch (error) {
      logger.error('Remove member error:', error);
      throw error;
    }
  }

  /**
   * Add an expense to a group with split calculation
   */
  async addExpense(groupId, userId, expenseData) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      const isMember = group.members.some(
        m => m.userId && m.userId.toString() === userId.toString() && m.isActive
      );
      if (!isMember) {
        return { success: false, message: 'Not a member of this group', statusCode: 403 };
      }

      const { description, amount, paidBy, splitType, splits, category, date, notes } = expenseData;
      const activeMembers = group.members.filter(m => m.isActive);

      // Calculate splits based on type
      let calculatedSplits;
      switch (splitType) {
        case 'equal':
          calculatedSplits = this._calculateEqualSplit(amount, activeMembers, splits);
          break;
        case 'percentage':
          calculatedSplits = this._calculatePercentageSplit(amount, splits);
          break;
        case 'exact':
          calculatedSplits = this._calculateExactSplit(amount, splits);
          break;
        default:
          calculatedSplits = this._calculateEqualSplit(amount, activeMembers, splits);
      }

      if (!calculatedSplits.valid) {
        return { success: false, message: calculatedSplits.error, statusCode: 400 };
      }

      // Determine payer info
      const payer = activeMembers.find(
        m => m.userId && m.userId.toString() === (paidBy || userId).toString()
      );

      const expense = new SplitExpense({
        groupId,
        description,
        amount,
        paidBy: {
          userId: payer ? payer.userId : userId,
          name: payer ? payer.name : 'Unknown'
        },
        splitType: splitType || 'equal',
        splits: calculatedSplits.splits,
        category: category || 'other',
        date: date || new Date(),
        notes,
        currency: group.currency
      });

      await expense.save();

      // Update group total
      group.totalExpenses = (group.totalExpenses || 0) + amount;
      await group.save();

      logger.info(`Expense of ${amount} added to group ${groupId}`);

      return {
        success: true,
        data: { expense, group },
        message: 'Expense added successfully'
      };
    } catch (error) {
      logger.error('Add expense error:', error);
      throw error;
    }
  }

  /**
   * Get all expenses for a group
   */
  async getGroupExpenses(groupId, userId, options = {}) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      const isMember = group.members.some(
        m => m.userId && m.userId.toString() === userId.toString() && m.isActive
      );
      if (!isMember) {
        return { success: false, message: 'Not a member of this group', statusCode: 403 };
      }

      const { page = 1, limit = 50, category, startDate, endDate } = options;
      const query = { groupId };

      if (category) query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const expenses = await SplitExpense.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await SplitExpense.countDocuments(query);

      return {
        success: true,
        data: {
          expenses,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Get group expenses error:', error);
      throw error;
    }
  }

  /**
   * Delete an expense from a group
   */
  async deleteExpense(groupId, expenseId, userId) {
    try {
      const expense = await SplitExpense.findOne({ _id: expenseId, groupId });
      if (!expense) {
        return { success: false, message: 'Expense not found', statusCode: 404 };
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      // Only payer or group creator can delete
      const isPayer = expense.paidBy.userId.toString() === userId.toString();
      const isCreator = group.createdBy.toString() === userId.toString();
      if (!isPayer && !isCreator) {
        return { success: false, message: 'Not authorized to delete this expense', statusCode: 403 };
      }

      group.totalExpenses = Math.max(0, (group.totalExpenses || 0) - expense.amount);
      await group.save();
      await SplitExpense.deleteOne({ _id: expenseId });

      return {
        success: true,
        message: 'Expense deleted successfully'
      };
    } catch (error) {
      logger.error('Delete expense error:', error);
      throw error;
    }
  }

  /**
   * Get balances for all members in a group
   */
  async getBalances(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, message: 'Group not found', statusCode: 404 };
      }

      const isMember = group.members.some(
        m => m.userId && m.userId.toString() === userId.toString() && m.isActive
      );
      if (!isMember) {
        return { success: false, message: 'Not a member of this group', statusCode: 403 };
      }

      const expenses = await SplitExpense.find({ groupId, isSettled: false });
      const balanceMap = {};

      // Initialize balances for all active members
      for (const member of group.members.filter(m => m.isActive)) {
        const id = member.userId ? member.userId.toString() : member._id.toString();
        balanceMap[id] = {
          userId: id,
          name: member.name,
          email: member.email,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0
        };
      }

      // Calculate from expenses
      for (const expense of expenses) {
        const payerId = expense.paidBy.userId.toString();
        if (balanceMap[payerId]) {
          balanceMap[payerId].totalPaid += expense.amount;
        }

        for (const split of expense.splits) {
          const splitUserId = split.userId.toString();
          if (balanceMap[splitUserId]) {
            balanceMap[splitUserId].totalOwed += split.amount;
          }
        }
      }

      // Calculate net balance (positive = owed money, negative = owes money)
      const balances = Object.values(balanceMap).map(b => ({
        ...b,
        netBalance: parseFloat((b.totalPaid - b.totalOwed).toFixed(2))
      }));

      return {
        success: true,
        data: {
          balances,
          totalExpenses: group.totalExpenses,
          currency: group.currency
        }
      };
    } catch (error) {
      logger.error('Get balances error:', error);
      throw error;
    }
  }

  /**
   * Calculate settlement suggestions using graph-based simplification
   * Minimizes the number of transactions needed to settle all debts
   */
  async getSettlements(groupId, userId) {
    try {
      const balanceResult = await this.getBalances(groupId, userId);
      if (!balanceResult.success) {
        return balanceResult;
      }

      const { balances } = balanceResult.data;
      const settlements = this._simplifyDebts(balances);

      return {
        success: true,
        data: {
          settlements,
          settlementsCount: settlements.length,
          currency: balanceResult.data.currency
        }
      };
    } catch (error) {
      logger.error('Get settlements error:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Equal split calculation
   */
  _calculateEqualSplit(amount, activeMembers, providedSplits) {
    const participants = providedSplits && providedSplits.length > 0
      ? providedSplits
      : activeMembers.map(m => ({ userId: m.userId, name: m.name }));

    const perPerson = parseFloat((amount / participants.length).toFixed(2));
    const remainder = parseFloat((amount - perPerson * participants.length).toFixed(2));

    const splits = participants.map((p, index) => ({
      userId: p.userId,
      name: p.name || 'Member',
      amount: index === 0 ? perPerson + remainder : perPerson,
      percentage: parseFloat((100 / participants.length).toFixed(2)),
      paid: false
    }));

    return { valid: true, splits };
  }

  /**
   * Percentage-based split calculation
   */
  _calculatePercentageSplit(amount, splits) {
    if (!splits || splits.length === 0) {
      return { valid: false, error: 'Splits are required for percentage split type' };
    }

    const totalPercentage = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { valid: false, error: `Percentages must sum to 100%, got ${totalPercentage}%` };
    }

    const calculatedSplits = splits.map(s => ({
      userId: s.userId,
      name: s.name || 'Member',
      amount: parseFloat(((s.percentage / 100) * amount).toFixed(2)),
      percentage: s.percentage,
      paid: false
    }));

    // Adjust rounding difference on first member
    const splitTotal = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
    const diff = parseFloat((amount - splitTotal).toFixed(2));
    if (diff !== 0 && calculatedSplits.length > 0) {
      calculatedSplits[0].amount = parseFloat((calculatedSplits[0].amount + diff).toFixed(2));
    }

    return { valid: true, splits: calculatedSplits };
  }

  /**
   * Exact amount split calculation
   */
  _calculateExactSplit(amount, splits) {
    if (!splits || splits.length === 0) {
      return { valid: false, error: 'Splits are required for exact split type' };
    }

    const totalSplit = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      return {
        valid: false,
        error: `Split amounts (${totalSplit}) must equal total amount (${amount})`
      };
    }

    const calculatedSplits = splits.map(s => ({
      userId: s.userId,
      name: s.name || 'Member',
      amount: s.amount,
      percentage: parseFloat(((s.amount / amount) * 100).toFixed(2)),
      paid: false
    }));

    return { valid: true, splits: calculatedSplits };
  }

  /**
   * Graph-based debt simplification
   * Uses a greedy algorithm: match max creditor with max debtor iteratively
   */
  _simplifyDebts(balances) {
    // Separate into creditors (positive balance) and debtors (negative balance)
    const creditors = [];
    const debtors = [];

    for (const b of balances) {
      if (b.netBalance > 0.01) {
        creditors.push({ ...b, remaining: b.netBalance });
      } else if (b.netBalance < -0.01) {
        debtors.push({ ...b, remaining: Math.abs(b.netBalance) });
      }
    }

    // Sort descending by amount
    creditors.sort((a, b) => b.remaining - a.remaining);
    debtors.sort((a, b) => b.remaining - a.remaining);

    const settlements = [];

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const settleAmount = parseFloat(Math.min(creditor.remaining, debtor.remaining).toFixed(2));

      if (settleAmount > 0.01) {
        settlements.push({
          from: {
            userId: debtor.userId,
            name: debtor.name
          },
          to: {
            userId: creditor.userId,
            name: creditor.name
          },
          amount: settleAmount
        });
      }

      creditor.remaining = parseFloat((creditor.remaining - settleAmount).toFixed(2));
      debtor.remaining = parseFloat((debtor.remaining - settleAmount).toFixed(2));

      if (creditor.remaining < 0.01) i++;
      if (debtor.remaining < 0.01) j++;
    }

    return settlements;
  }
}

module.exports = new SplitExpenseService();
