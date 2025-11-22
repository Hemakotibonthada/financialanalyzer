const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();

    console.log('Dashboard request for user:', userId);

    // Get current month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all user data in parallel including profile with error handling
    let userProfileDoc;
    try {
      userProfileDoc = await db.collection('users').doc(userId).get();
    } catch (err) {
      console.error('Error fetching user profile:', err);
      userProfileDoc = null;
    }

    const [expensesSnapshot, incomesSnapshot, budgetsSnapshot, goalsSnapshot, investmentsSnapshot] = await Promise.all([
      db.collection('expenses').where('userId', '==', userId).get().catch(err => {
        console.error('Error fetching expenses:', err);
        return { docs: [] };
      }),
      db.collection('incomes').where('userId', '==', userId).get().catch(err => {
        console.error('Error fetching incomes:', err);
        return { docs: [] };
      }),
      db.collection('budgets').where('userId', '==', userId).get().catch(err => {
        console.error('Error fetching budgets:', err);
        return { docs: [] };
      }),
      db.collection('goals').where('userId', '==', userId).get().catch(err => {
        console.error('Error fetching goals:', err);
        return { docs: [] };
      }),
      db.collection('investments').where('userId', '==', userId).get().catch(err => {
        console.error('Error fetching investments:', err);
        return { docs: [] };
      }),
    ]);

    // Get profile data
    const profileData = (userProfileDoc && userProfileDoc.exists) ? userProfileDoc.data() : {};
    console.log('Profile data fetched:', Object.keys(profileData).length, 'fields');

    // Process expenses with safe parsing
    const expenses = (expensesSnapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Total expenses:', expenses.length);
    
    const currentMonthExpenses = expenses.filter(exp => {
      try {
        const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        return date >= startOfMonth && date <= endOfMonth;
      } catch (err) {
        console.error('Error parsing expense date:', err, exp.id);
        return false;
      }
    });
    console.log('Current month expenses:', currentMonthExpenses.length);

    // Process incomes with safe parsing
    const incomes = (incomesSnapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Total incomes:', incomes.length);
    
    const currentMonthIncomes = incomes.filter(inc => {
      try {
        const date = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
        return date >= startOfMonth && date <= endOfMonth;
      } catch (err) {
        console.error('Error parsing income date:', err, inc.id);
        return false;
      }
    });
    console.log('Current month incomes:', currentMonthIncomes.length);

    // Process investments with safe parsing
    const investments = (investmentsSnapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Total investments:', investments.length);
    
    const currentMonthInvestments = investments.filter(inv => {
      try {
        const date = inv.date?.toDate ? inv.date.toDate() : (inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.date || inv.createdAt));
        return date >= startOfMonth && date <= endOfMonth;
      } catch (err) {
        console.error('Error parsing investment date:', err, inv.id);
        return false;
      }
    });
    console.log('Current month investments:', currentMonthInvestments.length);

    // ALSO check expenses with category 'investment' (from Expense Tracker)
    const investmentExpenses = currentMonthExpenses.filter(exp => {
      const category = exp.category || '';
      return category.toLowerCase() === 'investment';
    });
    console.log('Current month investment expenses:', investmentExpenses.length);

    // Calculate totals
    const totalExpenses = currentMonthExpenses.filter(exp => {
      const category = exp.category || '';
      return category.toLowerCase() !== 'investment'; // Exclude investment category from spending
    }).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const totalIncome = currentMonthIncomes.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
    // Sum investments from both 'investments' collection AND expenses with category='investment'
    const totalInvestments = currentMonthInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0) +
                              investmentExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    // Get profile monthly income (salary) to include in total income
    const profileMonthlyIncome = parseFloat(profileData.monthlyIncome || 0);
    const totalIncomeWithSalary = totalIncome + profileMonthlyIncome;
    const balance = totalIncomeWithSalary - totalExpenses;

    // Process budgets and goals
    const budgets = (budgetsSnapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
    const goals = (goalsSnapshot.docs || []).map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Budgets:', budgets.length, 'Goals:', goals.length);

    // Category breakdown - needed for financial health calculation (exclude investments)
    const categoryData = {};
    currentMonthExpenses.forEach(exp => {
      const category = exp.category || 'Uncategorized';
      // Exclude investment category from spending breakdown
      if (category.toLowerCase() !== 'investment') {
        categoryData[category] = (categoryData[category] || 0) + (parseFloat(exp.amount) || 0);
      }
    });

    // Calculate comprehensive financial health score (0-100)
    // totalIncomeWithSalary is already calculated above (includes profile monthly income)
    const savingsRate = totalIncomeWithSalary > 0 ? ((totalIncomeWithSalary - totalExpenses) / totalIncomeWithSalary) * 100 : 0;
    
    // Calculate individual health factors (each out of 25 points)
    const healthFactors = [];
    let financialHealthScore = 0;
    
    // 1. Income Stability (25 points)
    let incomeStabilityScore = 0;
    
    // Collect income data from trends
    const incomeValues = [];
    // Simple approach: check if user has consistent monthly income
    if (profileMonthlyIncome > 0) {
      // User has set their monthly income in profile
      incomeStabilityScore = 20;
      healthFactors.push({
        factor: 'Income Stability',
        score: incomeStabilityScore,
        description: `Monthly income: ₹${Math.round(profileMonthlyIncome).toLocaleString('en-IN')}`
      });
    } else if (totalIncome > 0) {
      // Has income transactions but no profile income
      incomeStabilityScore = 15;
      healthFactors.push({
        factor: 'Income Stability',
        score: incomeStabilityScore,
        description: 'Income recorded - set monthly income in profile for better tracking'
      });
    } else {
      // No income data at all
      incomeStabilityScore = 10;
      healthFactors.push({
        factor: 'Income Stability',
        score: incomeStabilityScore,
        description: 'Set up monthly income in Profile to track stability'
      });
    }
    financialHealthScore += incomeStabilityScore;
    
    // 2. Spending Discipline (25 points)
    let spendingScore = 0;
    const totalBudget = budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    if (totalBudget > 0 && budgets.length > 0) {
      const spendingRatio = totalExpenses / totalBudget;
      if (spendingRatio <= 0.75) spendingScore = 25; // Excellent budget adherence
      else if (spendingRatio <= 0.90) spendingScore = 23;
      else if (spendingRatio <= 1.0) spendingScore = 20;
      else if (spendingRatio <= 1.1) spendingScore = 15;
      else spendingScore = 10;
      healthFactors.push({
        factor: 'Spending Discipline',
        score: spendingScore,
        description: spendingScore >= 20 ? 'Excellent budget adherence with detailed category tracking' :
                     spendingScore >= 15 ? 'Good spending control' : 'Budget exceeded - needs attention'
      });
    } else {
      // No budgets set up
      spendingScore = 15;
      healthFactors.push({
        factor: 'Spending Discipline',
        score: spendingScore,
        description: 'Set up budgets to track and control spending effectively'
      });
    }
    financialHealthScore += spendingScore;
    
    // 3. Savings Rate (25 points)
    let savingsRateScore = 0;
    if (savingsRate >= 30) savingsRateScore = 25; // Exceptional 91% savings rate
    else if (savingsRate >= 20) savingsRateScore = 23;
    else if (savingsRate >= 10) savingsRateScore = 20;
    else if (savingsRate > 0) savingsRateScore = 15;
    else savingsRateScore = 5;
    healthFactors.push({
      factor: 'Savings Rate',
      score: savingsRateScore,
      description: savingsRate >= 30 ? `Exceptional ${Math.round(savingsRate)}% savings rate!` :
                   savingsRate >= 20 ? `Strong ${Math.round(savingsRate)}% savings rate` :
                   savingsRate >= 10 ? `Moderate ${Math.round(savingsRate)}% savings rate` :
                   `Low savings rate - aim for at least 10%`
    });
    financialHealthScore += savingsRateScore;
    
    // 4. Financial Awareness (25 points)
    let awarenessScore = 0;
    const hasGoals = goals.length > 0;
    const hasBudgets = budgets.length > 0;
    const hasMultipleCategories = Object.keys(categoryData).length >= 3;
    
    if (hasGoals && hasBudgets && hasMultipleCategories) awarenessScore = 25;
    else if (hasGoals && hasBudgets) awarenessScore = 20;
    else if (hasGoals || hasBudgets) awarenessScore = 15;
    else awarenessScore = 10;
    
    healthFactors.push({
      factor: 'Financial Awareness',
      score: awarenessScore,
      description: awarenessScore >= 20 ? 'Good financial awareness: savings goals' :
                   awarenessScore >= 15 ? 'Building financial awareness' : 'Set up budgets and goals to track progress'
    });
    financialHealthScore += awarenessScore;
    
    // 5. EMI Burden (25 points) - Check if user has EMIs
    let emiBurdenScore = 0;
    try {
      const emisSnapshot = await db.collection('emi').where('userId', '==', userId).get();
      const activeEmis = emisSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'active' || !data.status;
      });
      
      const totalEmiAmount = activeEmis.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (parseFloat(data.monthlyPayment) || parseFloat(data.emiAmount) || 0);
      }, 0);
      
      if (totalEmiAmount === 0) {
        emiBurdenScore = 25; // No EMI burden - excellent
        healthFactors.push({
          factor: 'EMI Burden',
          score: emiBurdenScore,
          description: 'No active EMIs - excellent debt position'
        });
      } else {
        const emiBurdenPercentage = totalIncomeWithSalary > 0 ? (totalEmiAmount / totalIncomeWithSalary) * 100 : 100;
        if (emiBurdenPercentage <= 20) {
          emiBurdenScore = 23; // Low EMI burden - very good
          healthFactors.push({
            factor: 'EMI Burden',
            score: emiBurdenScore,
            description: `Low burden: ${activeEmis.length} active EMI${activeEmis.length > 1 ? 's' : ''}, ₹${totalEmiAmount.toFixed(0)}/month (${emiBurdenPercentage.toFixed(0)}% of income)`
          });
        } else if (emiBurdenPercentage <= 35) {
          emiBurdenScore = 20; // Moderate EMI burden - acceptable
          healthFactors.push({
            factor: 'EMI Burden',
            score: emiBurdenScore,
            description: `Moderate burden: ${activeEmis.length} EMI${activeEmis.length > 1 ? 's' : ''}, ₹${totalEmiAmount.toFixed(0)}/month (${emiBurdenPercentage.toFixed(0)}% of income)`
          });
        } else if (emiBurdenPercentage <= 50) {
          emiBurdenScore = 15; // High EMI burden - concerning
          healthFactors.push({
            factor: 'EMI Burden',
            score: emiBurdenScore,
            description: `High burden: ${activeEmis.length} EMI${activeEmis.length > 1 ? 's' : ''}, ₹${totalEmiAmount.toFixed(0)}/month (${emiBurdenPercentage.toFixed(0)}% of income)`
          });
        } else {
          emiBurdenScore = 10; // Very high EMI burden - critical
          healthFactors.push({
            factor: 'EMI Burden',
            score: emiBurdenScore,
            description: `Very high burden: ${activeEmis.length} EMI${activeEmis.length > 1 ? 's' : ''}, ₹${totalEmiAmount.toFixed(0)}/month (${emiBurdenPercentage.toFixed(0)}% of income)`
          });
        }
      }
    } catch (err) {
      console.error('Error calculating EMI burden:', err);
      emiBurdenScore = 10;
      healthFactors.push({
        factor: 'EMI Burden',
        score: emiBurdenScore,
        description: 'Unable to calculate EMI burden'
      });
    }
    financialHealthScore += emiBurdenScore;
    
    // Ensure score is within 0-100 range
    financialHealthScore = Math.max(0, Math.min(100, Math.round(financialHealthScore)));
    
    // Calculate grade based on score
    const getGrade = (score) => {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    };
    
    const grade = getGrade(financialHealthScore);
    
    // Generate recommendations based on weak areas
    const recommendations = [];
    
    // Prioritize recommendations by lowest scores first
    if (incomeStabilityScore < 15) {
      recommendations.push('💰 Set up your monthly income in profile and add income transactions to track stability');
    } else if (incomeStabilityScore < 20) {
      recommendations.push('💰 Income fluctuations detected - consider building an emergency fund');
    }
    
    if (spendingScore < 20) {
      recommendations.push('📊 Set up monthly budgets for key categories to track and control spending');
    }
    
    if (savingsRateScore < 15) {
      recommendations.push('💡 Aim to save at least 10-20% of your income - review and cut unnecessary expenses');
    } else if (savingsRateScore < 20) {
      recommendations.push('💡 Good savings habit - try to increase to 20%+ for better financial security');
    }
    
    if (awarenessScore < 20) {
      recommendations.push('🎯 Set financial goals and track expenses by category to improve awareness');
    }
    
    if (emiBurdenScore < 20 && emiBurdenScore > 0) {
      recommendations.push('🔺 EMI Alert: High EMI burden detected - consider paying off high-interest loans first');
    }
    
    // Add positive reinforcement if score is good
    if (financialHealthScore >= 80) {
      recommendations.push('🎉 Excellent financial health! Keep up the disciplined approach');
    } else if (financialHealthScore >= 60 && recommendations.length === 0) {
      recommendations.push('👍 Good progress! Small improvements can boost your score significantly');
    }
    
    // Add default if no recommendations
    if (recommendations.length === 0) {
      recommendations.push('👍 Good progress! Small improvements can boost your score significantly');
    }
    
    // Create financial health data structure
    const financialHealthData = {
      score: financialHealthScore,
      grade: grade,
      factors: healthFactors,
      recommendations: recommendations
    };

    // Calculate total for percentages
    const totalCategoryAmount = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
    
    // Color palette for categories
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#E7E9ED', '#4D5360'
    ];

    const categoryBreakdown = Object.entries(categoryData)
      .map(([name, value], index) => ({
        category: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        amount: parseFloat(value.toFixed(2)),
        percentage: totalCategoryAmount > 0 ? parseFloat(((value / totalCategoryAmount) * 100).toFixed(1)) : 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trends (last 6 months) with complete data
    const monthlyTrends = [];
    const monthlyStats = {
      totalSpending: 0,
      totalIncome: 0,
      totalInvestments: 0,
      monthCount: 6
    };
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthExpenses = expenses.filter(exp => {
        try {
          const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
          return date >= monthDate && date <= monthEnd;
        } catch (err) {
          return false;
        }
      });

      const monthIncomes = incomes.filter(inc => {
        try {
          const date = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
          return date >= monthDate && date <= monthEnd;
        } catch (err) {
          return false;
        }
      });

      // Separate investments from spending for this month
      const monthInvestmentExpenses = monthExpenses.filter(exp => {
        const category = exp.category || '';
        return category.toLowerCase() === 'investment';
      });

      const monthRegularExpenses = monthExpenses.filter(exp => {
        const category = exp.category || '';
        return category.toLowerCase() !== 'investment';
      });

      const monthInvestments = investments.filter(inv => {
        try {
          const date = inv.date?.toDate ? inv.date.toDate() : (inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.date || inv.createdAt));
          return date >= monthDate && date <= monthEnd;
        } catch (err) {
          return false;
        }
      });

      const monthExpenseTotal = monthRegularExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      const monthInvestmentTotal = monthInvestmentExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) +
                                   monthInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const monthIncomeFromTransactions = monthIncomes.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
      // Include monthly salary/income from profile
      const monthIncomeTotal = monthIncomeFromTransactions + profileMonthlyIncome;
      const monthSavings = monthIncomeTotal - monthExpenseTotal;
      
      monthlyStats.totalSpending += monthExpenseTotal;
      monthlyStats.totalIncome += monthIncomeTotal;
      monthlyStats.totalInvestments += monthInvestmentTotal;
      
      monthlyTrends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthKey: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        expenses: parseFloat(monthExpenseTotal.toFixed(2)),
        income: parseFloat(monthIncomeTotal.toFixed(2)),
        netSavings: parseFloat(monthSavings.toFixed(2)),
        totalSpending: parseFloat(monthExpenseTotal.toFixed(2)),
        totalIncome: parseFloat(monthIncomeTotal.toFixed(2)),
        totalInvestments: parseFloat(monthInvestmentTotal.toFixed(2))
      });
    }
    
    // Calculate summary statistics
    const trendSummary = {
      totalMonths: monthlyTrends.length,
      averageSpending: monthlyTrends.length > 0 ? parseFloat((monthlyStats.totalSpending / monthlyTrends.length).toFixed(2)) : 0,
      averageIncome: monthlyTrends.length > 0 ? parseFloat((monthlyStats.totalIncome / monthlyTrends.length).toFixed(2)) : 0,
      averageInvestments: monthlyTrends.length > 0 ? parseFloat((monthlyStats.totalInvestments / monthlyTrends.length).toFixed(2)) : 0,
      spendingTrend: monthlyTrends.length >= 2 && monthlyTrends[0].totalSpending > 0 ? 
        parseFloat((((monthlyTrends[monthlyTrends.length - 1].totalSpending - monthlyTrends[0].totalSpending) / monthlyTrends[0].totalSpending * 100).toFixed(2))) : 0,
      incomeTrend: monthlyTrends.length >= 2 && monthlyTrends[0].totalIncome > 0 ? 
        parseFloat((((monthlyTrends[monthlyTrends.length - 1].totalIncome - monthlyTrends[0].totalIncome) / monthlyTrends[0].totalIncome * 100).toFixed(2))) : 0,
      consistencyScore: 100, // Placeholder - can be calculated based on variance
      bestMonth: monthlyTrends.length > 0 ? monthlyTrends.reduce((best, current) => 
        (current.totalIncome - current.totalSpending) > (best.totalIncome - best.totalSpending) ? current : best
      ).month : null,
      totalPeriod: `${monthlyTrends.length} months`
    };

    // Budget progress
    const budgetProgress = budgets.map(budget => {
      const categorySpent = currentMonthExpenses
        .filter(exp => {
          const category = exp.category || '';
          return exp.category === budget.category && category.toLowerCase() !== 'investment';
        })
        .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      
      const budgetAmount = parseFloat(budget.amount) || 0;
      const spentAmount = parseFloat(categorySpent.toFixed(2));
      
      // Handle edge case: if budget is 0, status should be 'good' with 0% used
      let percentUsed = 0;
      let status = 'good';
      
      if (budgetAmount > 0) {
        percentUsed = Math.min(100, (spentAmount / budgetAmount) * 100);
        
        // Determine status based on percentage
        if (percentUsed >= 100) status = 'over';
        else if (percentUsed >= 90) status = 'critical';
        else if (percentUsed >= 75) status = 'warning';
      } else if (spentAmount > 0) {
        // If there's spending but no budget, mark as over
        status = 'over';
        percentUsed = 100;
      }
      
      return {
        category: budget.category,
        budget: budgetAmount,
        spent: spentAmount,
        percentage: percentUsed,
        percentUsed: percentUsed, // Add percentUsed for BudgetTracker component
        status: status
      };
    });

    // Budget analysis for BudgetTracker component
    const budgetAnalysis = budgets.length > 0 ? {
      hasBudget: true,
      totalBudget: budgetProgress.reduce((sum, b) => sum + b.budget, 0),
      totalSpent: budgetProgress.reduce((sum, b) => sum + b.spent, 0),
      totalRemaining: budgetProgress.reduce((sum, b) => sum + (b.budget - b.spent), 0),
      categories: budgetProgress,
      overallStatus: (() => {
        const totalBudget = budgetProgress.reduce((sum, b) => sum + b.budget, 0);
        const totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);
        const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        if (percentage >= 100) return 'over';
        if (percentage >= 90) return 'critical';
        if (percentage >= 75) return 'warning';
        return 'good';
      })(),
      alerts: budgetProgress
        .filter(b => b.percentUsed >= 75)
        .map(b => ({
          category: b.category,
          severity: b.percentUsed >= 100 ? 'over' : 'warning',
          message: b.percentUsed >= 100 
            ? `You've exceeded your ${b.category} budget by ₹${(b.spent - b.budget).toFixed(2)}`
            : `You've used ${b.percentUsed.toFixed(0)}% of your ${b.category} budget`
        }))
    } : {
      hasBudget: false,
      message: 'No budget configured',
      recommendation: 'Set up a monthly budget to track your spending'
    };

    // Goals progress
    const goalsProgress = goals.map(goal => ({
      name: goal.name,
      target: parseFloat(goal.targetAmount) || 0,
      current: parseFloat(goal.currentAmount) || 0,
      percentage: goal.targetAmount ? Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0
    }));

    // Savings goals for SavingsGoals component
    const savingsGoals = goals.length > 0 ? {
      hasGoals: true,
      goals: goalsProgress,
      totalTargetAmount: goalsProgress.reduce((sum, g) => sum + g.target, 0),
      totalCurrentAmount: goalsProgress.reduce((sum, g) => sum + g.current, 0),
      avgMonthlySavings: balance / Math.max(1, now.getMonth() + 1),
      recommendations: []
    } : {
      hasGoals: false,
      message: 'No savings goals set',
      recommendation: 'Create savings goals to track your financial progress'
    };

    // Recent transactions
    const recentTransactions = [...expenses, ...incomes]
      .sort((a, b) => {
        try {
          const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return dateB - dateA;
        } catch (err) {
          return 0;
        }
      })
      .slice(0, 10)
      .map(txn => ({
        id: txn.id,
        type: txn.type || (expenses.find(e => e.id === txn.id) ? 'expense' : 'income'),
        description: txn.description || txn.name || 'No description',
        amount: parseFloat(txn.amount) || 0,
        category: txn.category || 'Uncategorized',
        date: txn.date?.toDate ? txn.date.toDate().toISOString() : txn.date
      }));

    // Spending Patterns Analysis (exclude investments)
    const spendingPatterns = (() => {
      const spendingExpenses = expenses.filter(exp => {
        const category = exp.category || '';
        return category.toLowerCase() !== 'investment';
      });

      if (spendingExpenses.length === 0) {
        return null;
      }

      // Day of week analysis
      const dayOfWeekData = Array(7).fill(0).map((_, i) => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
        dayIndex: i,
        amount: 0,
        count: 0,
        transactions: []
      }));

      // Hourly analysis
      const hourlyData = Array(24).fill(0).map((_, i) => ({
        hour: i,
        amount: 0,
        count: 0
      }));

      // Category time analysis
      const categoryTimeData = {};

      // Merchant/Category frequency
      const merchantData = {};

      spendingExpenses.forEach(exp => {
        try {
          const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
          const dayIndex = date.getDay();
          const hour = date.getHours();
          const amount = parseFloat(exp.amount) || 0;
          const category = exp.category || 'Uncategorized';

          // Day of week
          dayOfWeekData[dayIndex].amount += amount;
          dayOfWeekData[dayIndex].count += 1;
          dayOfWeekData[dayIndex].transactions.push(exp.id);

          // Hourly
          hourlyData[hour].amount += amount;
          hourlyData[hour].count += 1;

          // Category time patterns
          if (!categoryTimeData[category]) {
            categoryTimeData[category] = {
              category,
              totalAmount: 0,
              byDayOfWeek: Array(7).fill(0),
              byHour: Array(24).fill(0),
              count: 0,
              avgAmount: 0
            };
          }
          categoryTimeData[category].totalAmount += amount;
          categoryTimeData[category].byDayOfWeek[dayIndex] += amount;
          categoryTimeData[category].byHour[hour] += amount;
          categoryTimeData[category].count += 1;

          // Merchant/Type frequency
          if (!merchantData[category]) {
            merchantData[category] = {
              type: category,
              count: 0,
              totalAmount: 0,
              avgTransaction: 0
            };
          }
          merchantData[category].count += 1;
          merchantData[category].totalAmount += amount;
        } catch (err) {
          console.error('Error processing expense for patterns:', err);
        }
      });

      // Calculate averages and sort
      Object.values(categoryTimeData).forEach(cat => {
        cat.avgAmount = cat.totalAmount / cat.count;
      });

      Object.values(merchantData).forEach(merchant => {
        merchant.avgTransaction = merchant.totalAmount / merchant.count;
      });

      // Find peak patterns
      const peakDay = dayOfWeekData.reduce((max, day) => 
        day.amount > max.amount ? day : max
      );

      const peakHour = hourlyData.reduce((max, hour) => 
        hour.amount > max.amount ? hour : max
      );

      // Weekend vs Weekday analysis
      const weekdayTotal = dayOfWeekData.slice(1, 6).reduce((sum, day) => sum + day.amount, 0);
      const weekendTotal = dayOfWeekData[0].amount + dayOfWeekData[6].amount;

      // Sort merchants by count
      const topMerchants = Object.values(merchantData)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Spending patterns insights
      const insights = [];
      
      if (weekendTotal > weekdayTotal / 5 * 2) {
        insights.push({
          type: 'warning',
          message: 'You spend more on weekends than weekdays',
          suggestion: 'Consider planning weekend activities with a budget'
        });
      }

      if (peakHour.hour >= 22 || peakHour.hour <= 2) {
        insights.push({
          type: 'info',
          message: 'You make purchases late at night',
          suggestion: 'Late-night purchases may be impulsive - review these transactions'
        });
      }

      // Find recurring patterns (same day, similar amount)
      const recurringPatterns = Object.values(categoryTimeData)
        .filter(cat => cat.count >= 3)
        .map(cat => {
          const dominantDay = cat.byDayOfWeek.indexOf(Math.max(...cat.byDayOfWeek));
          const dominantHour = cat.byHour.indexOf(Math.max(...cat.byHour));
          return {
            category: cat.category,
            frequency: cat.count,
            avgAmount: cat.avgAmount,
            preferredDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dominantDay],
            preferredTime: `${dominantHour}:00 - ${dominantHour + 1}:00`
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      return {
        dayOfWeek: {
          data: dayOfWeekData,
          peakDay: peakDay.day,
          weekdayTotal: parseFloat(weekdayTotal.toFixed(2)),
          weekendTotal: parseFloat(weekendTotal.toFixed(2)),
          weekendRatio: weekdayTotal > 0 ? parseFloat((weekendTotal / (weekdayTotal + weekendTotal) * 100).toFixed(1)) : 0
        },
        hourly: {
          data: hourlyData,
          peakHour: peakHour.hour,
          peakAmount: parseFloat(peakHour.amount.toFixed(2)),
          morning: hourlyData.slice(6, 12).reduce((sum, h) => sum + h.amount, 0),
          afternoon: hourlyData.slice(12, 18).reduce((sum, h) => sum + h.amount, 0),
          evening: hourlyData.slice(18, 24).reduce((sum, h) => sum + h.amount, 0),
          night: [...hourlyData.slice(0, 6)].reduce((sum, h) => sum + h.amount, 0)
        },
        merchants: topMerchants,
        categoryPatterns: Object.values(categoryTimeData)
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 10),
        recurringPatterns,
        insights,
        summary: {
          totalTransactions: spendingExpenses.length,
          avgTransactionSize: spendingExpenses.length > 0 ? parseFloat((spendingExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) / spendingExpenses.length).toFixed(2)) : 0,
          mostActiveDay: peakDay.day,
          mostActiveHour: `${peakHour.hour}:00`,
          weekendSpendingRatio: weekdayTotal > 0 ? parseFloat((weekendTotal / (weekdayTotal + weekendTotal) * 100).toFixed(1)) : 0
        }
      };
    })();

    console.log('Dashboard data prepared successfully');

    // Response
    res.json({
      success: true,
      data: {
        summary: {
          // From transactions (including salary from profile)
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          totalIncome: parseFloat(totalIncomeWithSalary.toFixed(2)),
          balance: parseFloat(balance.toFixed(2)),
          savingsRate: totalIncomeWithSalary > 0 ? parseFloat(((totalIncomeWithSalary - totalExpenses) / totalIncomeWithSalary * 100).toFixed(2)) : 0,
          // From profile (for Financial Summary display)
          monthlyIncome: parseFloat(profileData.monthlyIncome || 0),
          monthlySpending: parseFloat(totalExpenses.toFixed(2)),
          monthlyInvestments: parseFloat(totalInvestments.toFixed(2)),
          totalAnalyses: expenses.length + incomes.length,
          lastSyncDate: profileData.lastSyncDate || null,
          financialHealthScore: financialHealthScore || null
        },
        charts: {
          categoryBreakdown: {
            chartData: categoryBreakdown,
            summary: {
              totalAmount: totalCategoryAmount,
              totalCategories: categoryBreakdown.length,
              topCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null,
              diversificationIndex: categoryBreakdown.length > 0 ? 
                (categoryBreakdown.length / Math.max(1, categoryBreakdown.length)) * 
                (1 - (categoryBreakdown[0]?.percentage || 0) / 100) : 0
            }
          },
          monthlyTrends: {
            trends: monthlyTrends,
            summary: trendSummary
          },
          budgetProgress,
          budgetAnalysis,
          goalsProgress,
          financialHealth: financialHealthData,
          spendingPatterns
        },
        insights: {
          savingsGoals,
          recommendations: []
        },
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
});

// Get daily trends for a specific month
router.get('/daily-trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();
    const { month } = req.query; // Expected format: YYYY-MM

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM'
      });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);
    const currentDate = new Date();
    
    // If selected month is current month, only go up to today
    const effectiveEndDate = (year === currentDate.getFullYear() && monthNum - 1 === currentDate.getMonth())
      ? currentDate
      : endOfMonth;

    // Fetch expenses and incomes
    const [expensesSnapshot, incomesSnapshot] = await Promise.all([
      db.collection('expenses').where('userId', '==', userId).get(),
      db.collection('incomes').where('userId', '==', userId).get()
    ]);

    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const incomes = incomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Generate daily data
    const dailyTrends = [];
    const daysInMonth = effectiveEndDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, monthNum - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, monthNum - 1, day, 23, 59, 59);

      // Filter expenses for this day
      const dayExpenses = expenses.filter(exp => {
        try {
          const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
          return date >= dayStart && date <= dayEnd;
        } catch {
          return false;
        }
      });

      // Filter incomes for this day
      const dayIncomes = incomes.filter(inc => {
        try {
          const date = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
          return date >= dayStart && date <= dayEnd;
        } catch {
          return false;
        }
      });

      const dayExpenseTotal = dayExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      const dayIncomeTotal = dayIncomes.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);

      dailyTrends.push({
        date: `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day: day,
        totalIncome: parseFloat(dayIncomeTotal.toFixed(2)),
        totalSpending: parseFloat(dayExpenseTotal.toFixed(2)),
        totalInvestments: 0,
        netSavings: parseFloat((dayIncomeTotal - dayExpenseTotal).toFixed(2)),
        transactionCount: dayExpenses.length + dayIncomes.length
      });
    }

    // Calculate summary
    const totalIncome = dailyTrends.reduce((sum, d) => sum + d.totalIncome, 0);
    const totalSpending = dailyTrends.reduce((sum, d) => sum + d.totalSpending, 0);

    res.json({
      success: true,
      data: {
        dailyTrends,
        summary: {
          month: `${startOfMonth.toLocaleDateString('en-US', { month: 'short' })} ${year}`,
          totalDays: daysInMonth,
          totalIncome: parseFloat(totalIncome.toFixed(2)),
          totalSpending: parseFloat(totalSpending.toFixed(2)),
          netSavings: parseFloat((totalIncome - totalSpending).toFixed(2)),
          avgDailyIncome: parseFloat((totalIncome / daysInMonth).toFixed(2)),
          avgDailySpending: parseFloat((totalSpending / daysInMonth).toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching daily trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily trends',
      error: error.message
    });
  }
});

// Get complete advanced dashboard
router.get('/advanced/complete-dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();

    // Fetch all collections in parallel
    const [
      expensesSnapshot,
      incomesSnapshot,
      budgetsSnapshot,
      goalsSnapshot,
      emisSnapshot,
      lendersSnapshot
    ] = await Promise.all([
      db.collection('expenses').where('userId', '==', userId).get(),
      db.collection('incomes').where('userId', '==', userId).get(),
      db.collection('budgets').where('userId', '==', userId).get(),
      db.collection('goals').where('userId', '==', userId).get(),
      db.collection('emis').where('userId', '==', userId).get(),
      db.collection('lenders').where('userId', '==', userId).get()
    ]);

    // Process expenses
    const expenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      amount: parseFloat(doc.data().amount) || 0
    }));

    // Process incomes
    const incomes = incomesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      amount: parseFloat(doc.data().amount) || 0
    }));

    // Process budgets
    const budgets = budgetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Process goals
    const goals = goalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Process EMIs
    const emis = emisSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Process lenders
    const lenders = lendersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate summary statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalEMIs = emis.reduce((sum, emi) => sum + (parseFloat(emi.amount) || 0), 0);
    const totalLent = lenders.reduce((sum, lender) => sum + (parseFloat(lender.amount) || 0), 0);

    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + exp.amount;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalExpenses,
          totalIncome,
          balance: totalIncome - totalExpenses,
          totalEMIs,
          totalLent,
          expenseCount: expenses.length,
          incomeCount: incomes.length
        },
        expenses: expenses.slice(0, 10),
        incomes: incomes.slice(0, 10),
        budgets,
        goals,
        emis: emis.slice(0, 10),
        lenders: lenders.slice(0, 10),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
      }
    });
  } catch (error) {
    console.error('Advanced dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advanced dashboard',
      error: error.message
    });
  }
});

module.exports = router;
