const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Liability = require('../models/Liability');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const InsurancePolicy = require('../models/InsurancePolicy');

// ============== ASSETS ==============

// Get all assets for user
router.get('/assets', authenticate, async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single asset
router.get('/assets/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, userId: req.user.id });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    res.json({ asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create asset
router.post('/assets', authenticate, async (req, res) => {
  try {
    const asset = new Asset({
      ...req.body,
      userId: req.user.id
    });
    await asset.save();
    res.status(201).json({ asset, message: 'Asset created successfully' });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update asset
router.put('/assets/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    res.json({ asset, message: 'Asset updated successfully' });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete asset
router.delete('/assets/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== LIABILITIES ==============

// Get all liabilities for user
router.get('/liabilities', authenticate, async (req, res) => {
  try {
    const liabilities = await Liability.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ liabilities });
  } catch (error) {
    console.error('Error fetching liabilities:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create liability
router.post('/liabilities', authenticate, async (req, res) => {
  try {
    const liability = new Liability({
      ...req.body,
      userId: req.user.id
    });
    await liability.save();
    res.status(201).json({ liability, message: 'Liability created successfully' });
  } catch (error) {
    console.error('Error creating liability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update liability
router.put('/liabilities/:id', authenticate, async (req, res) => {
  try {
    const liability = await Liability.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!liability) {
      return res.status(404).json({ message: 'Liability not found' });
    }
    res.json({ liability, message: 'Liability updated successfully' });
  } catch (error) {
    console.error('Error updating liability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete liability
router.delete('/liabilities/:id', authenticate, async (req, res) => {
  try {
    const liability = await Liability.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!liability) {
      return res.status(404).json({ message: 'Liability not found' });
    }
    res.json({ message: 'Liability deleted successfully' });
  } catch (error) {
    console.error('Error deleting liability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== INCOMES ==============

// Get all incomes for user
router.get('/incomes', authenticate, async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ incomes });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create income
router.post('/incomes', authenticate, async (req, res) => {
  try {
    const income = new Income({
      ...req.body,
      userId: req.user.id
    });
    await income.save();
    res.status(201).json({ income, message: 'Income created successfully' });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update income
router.put('/incomes/:id', authenticate, async (req, res) => {
  try {
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json({ income, message: 'Income updated successfully' });
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete income
router.delete('/incomes/:id', authenticate, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== EXPENSES ==============

// Get all expenses for user
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create expense
router.post('/expenses', authenticate, async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      userId: req.user.id
    });
    await expense.save();
    res.status(201).json({ expense, message: 'Expense created successfully' });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update expense
router.put('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ expense, message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete expense
router.delete('/expenses/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== INSURANCES ==============

// Get all insurance policies for user
router.get('/insurances', authenticate, async (req, res) => {
  try {
    const insurances = await InsurancePolicy.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ insurances });
  } catch (error) {
    console.error('Error fetching insurances:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create insurance policy
router.post('/insurances', authenticate, async (req, res) => {
  try {
    const insurance = new InsurancePolicy({
      ...req.body,
      userId: req.user.id
    });
    await insurance.save();
    res.status(201).json({ insurance, message: 'Insurance policy created successfully' });
  } catch (error) {
    console.error('Error creating insurance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update insurance policy
router.put('/insurances/:id', authenticate, async (req, res) => {
  try {
    const insurance = await InsurancePolicy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!insurance) {
      return res.status(404).json({ message: 'Insurance policy not found' });
    }
    res.json({ insurance, message: 'Insurance policy updated successfully' });
  } catch (error) {
    console.error('Error updating insurance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete insurance policy
router.delete('/insurances/:id', authenticate, async (req, res) => {
  try {
    const insurance = await InsurancePolicy.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!insurance) {
      return res.status(404).json({ message: 'Insurance policy not found' });
    }
    res.json({ message: 'Insurance policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== SUMMARY & ANALYTICS ==============

// Get financial summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const [assets, liabilities, incomes, expenses, investments, insurances] = await Promise.all([
      Asset.find({ userId: req.user.id }),
      Liability.find({ userId: req.user.id }),
      Income.find({ userId: req.user.id }),
      Expense.find({ userId: req.user.id }),
      require('../models/Investment').find({ userId: req.user.id }).catch(() => []),
      InsurancePolicy.find({ userId: req.user.id })
    ]);

    const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalInvestments = investments.reduce((sum, i) => sum + (parseFloat(i.currentValue) || parseFloat(i.amount) || 0), 0);
    const totalInsurancePremium = insurances.reduce((sum, i) => sum + (parseFloat(i.premium) || 0), 0);

    res.json({
      summary: {
        netWorth: totalAssets - totalLiabilities,
        totalAssets,
        totalLiabilities,
        monthlyIncome: totalIncome,
        monthlyExpenses: totalExpenses,
        monthlySavings: totalIncome - totalExpenses,
        totalInvestments,
        totalInsurancePremium,
        assetCount: assets.length,
        liabilityCount: liabilities.length,
        incomeSourceCount: incomes.length,
        expenseCount: expenses.length,
        insuranceCount: insurances.length
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

