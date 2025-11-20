const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        profile: {
          id: userDoc.id,
          ...userDoc.data()
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Create or update profile
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const profileData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).set(profileData, { merge: true });
    
    // Create/update budget documents from budgetLimits
    if (req.body.budgetLimits && typeof req.body.budgetLimits === 'object') {
      const budgetLimits = req.body.budgetLimits;
      const batch = db.batch();
      
      // Get existing budgets for this user
      const existingBudgets = await db.collection('budgets')
        .where('userId', '==', userId)
        .get();
      
      const existingBudgetsByCategory = {};
      existingBudgets.forEach(doc => {
        existingBudgetsByCategory[doc.data().category] = doc.id;
      });
      
      // Create or update budgets for each category with a limit
      for (const [category, amount] of Object.entries(budgetLimits)) {
        if (amount && parseFloat(amount) > 0) {
          const budgetData = {
            userId,
            category,
            amount: parseFloat(amount),
            period: 'monthly',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          if (existingBudgetsByCategory[category]) {
            // Update existing budget
            const budgetRef = db.collection('budgets').doc(existingBudgetsByCategory[category]);
            batch.update(budgetRef, budgetData);
          } else {
            // Create new budget
            const budgetRef = db.collection('budgets').doc();
            batch.set(budgetRef, {
              ...budgetData,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
      
      await batch.commit();
    }
    
    // Create/update savings goal from savingsGoal
    if (req.body.savingsGoal && req.body.savingsGoal.amount && parseFloat(req.body.savingsGoal.amount) > 0) {
      const savingsGoal = req.body.savingsGoal;
      
      // Check if user already has a primary savings goal
      const existingGoals = await db.collection('goals')
        .where('userId', '==', userId)
        .where('name', '==', savingsGoal.description || 'Primary Savings Goal')
        .limit(1)
        .get();
      
      const goalData = {
        userId,
        name: savingsGoal.description || 'Primary Savings Goal',
        targetAmount: parseFloat(savingsGoal.amount),
        currentAmount: 0, // Will be calculated based on actual savings
        targetDate: savingsGoal.deadline ? admin.firestore.Timestamp.fromDate(new Date(savingsGoal.deadline)) : null,
        category: 'savings',
        priority: 'high',
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (!existingGoals.empty) {
        // Update existing goal
        const goalDoc = existingGoals.docs[0];
        await db.collection('goals').doc(goalDoc.id).update(goalData);
      } else {
        // Create new goal
        await db.collection('goals').add({
          ...goalData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    await db.collection('users').doc(userId).update({
      preferences: req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// Get monthly income info
router.get('/monthly-income', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({
        success: true,
        data: {
          monthlyIncome: 0,
          source: 'default'
        }
      });
    }
    
    const userData = userDoc.data();
    res.json({
      success: true,
      data: {
        monthlyIncome: userData.monthlyIncome || 0,
        source: userData.monthlyIncome ? 'profile' : 'default'
      }
    });
  } catch (error) {
    console.error('Get monthly income error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly income'
    });
  }
});

module.exports = router;
