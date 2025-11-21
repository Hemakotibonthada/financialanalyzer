const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const db = admin.firestore();

// Get EMI overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .get();
    
    let totalEMIs = 0;
    let totalMonthlyPayment = 0;
    let totalOutstanding = 0;
    let totalPaid = 0;
    let activeEMIsCount = 0;
    let completedEMIsCount = 0;
    const activeEMIsArray = [];
    const completedEMIsArray = [];
    
    snapshot.docs.forEach(doc => {
      const emi = { id: doc.id, ...doc.data() };
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const principal = parseFloat(emi.principalAmount) || 0;
      const paidAmount = parseFloat(emi.paidAmount) || 0;
      const status = emi.status || 'active';
      
      totalEMIs++;
      if (status === 'active') {
        activeEMIsCount++;
        totalMonthlyPayment += emiAmount;
        activeEMIsArray.push(emi);
      } else if (status === 'completed') {
        completedEMIsCount++;
        completedEMIsArray.push(emi);
      }
      totalPaid += paidAmount;
      totalOutstanding += (principal - paidAmount);
    });
    
    res.json({
      success: true,
      data: {
        totalEMIs,
        totalActiveEMIs: activeEMIsCount,
        totalCompletedEMIs: completedEMIsCount,
        activeEMIs: activeEMIsArray,
        completedEMIs: completedEMIsArray,
        totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching EMI overview:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch EMI overview',
      message: error.message 
    });
  }
});

// Get upcoming EMI payments
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { months = 12 } = req.query;
    
    const snapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + parseInt(months));
    
    const upcoming = [];
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const nextDueDate = emi.nextDueDate?.toDate ? emi.nextDueDate.toDate() : new Date(emi.nextDueDate);
      
      if (nextDueDate >= today && nextDueDate <= futureDate) {
        upcoming.push({
          id: doc.id,
          ...emi,
          nextDueDate: nextDueDate.toISOString(),
          daysUntilDue: Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24))
        });
      }
    });
    
    upcoming.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
    
    res.json({
      success: true,
      data: upcoming
    });
  } catch (error) {
    console.error('Error fetching upcoming EMIs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch upcoming EMIs',
      message: error.message 
    });
  }
});

// Get EMI charts data - FIXED FORMAT for frontend
router.get('/charts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    // Provider distribution
    const providerData = {};
    const merchantData = {};
    const statusData = { active: 0, completed: 0, foreclosed: 0 };
    const interestRateRanges = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20%+': 0 };
    
    let totalPrincipal = 0;
    let totalInterest = 0;
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      
      // Provider distribution
      const provider = emi.cardProvider || 'Unknown';
      providerData[provider] = (providerData[provider] || 0) + 1;
      
      // Merchant distribution
      const merchant = emi.merchantName || 'Unknown';
      merchantData[merchant] = (merchantData[merchant] || 0) + (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      
      // Status distribution
      if (statusData[emi.status] !== undefined) statusData[emi.status]++;
      
      // Interest rate distribution
      const rate = parseFloat(emi.interestRate) || 0;
      if (rate <= 5) interestRateRanges['0-5%']++;
      else if (rate <= 10) interestRateRanges['5-10%']++;
      else if (rate <= 15) interestRateRanges['10-15%']++;
      else if (rate <= 20) interestRateRanges['15-20%']++;
      else interestRateRanges['20%+']++;
      
      // Principal vs Interest
      totalPrincipal += parseFloat(emi.principalAmount) || 0;
      const totalPayable = (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.totalTenure) || 0);
      totalInterest += totalPayable - (parseFloat(emi.principalAmount) || 0);
    });
    
    // Convert provider distribution object to array format expected by frontend
    const providerDistributionArray = Object.entries(providerData).map(([provider, count]) => ({
      provider,
      amount: count,
      name: provider
    }));
    
    res.json({
      success: true,
      data: {
        providerDistribution: {
          data: providerDistributionArray,
          total: providerDistributionArray.reduce((sum, p) => sum + p.amount, 0)
        },
        merchantDistribution: Object.entries(merchantData).sort((a, b) => b[1] - a[1]).slice(0, 10),
        statusDistribution: statusData,
        interestRateDistribution: interestRateRanges,
        principalVsInterest: { principal: totalPrincipal, interest: totalInterest }
      }
    });
  } catch (error) {
    console.error('Error fetching EMI charts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMI charts', message: error.message });
  }
});

// Get EMI insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const activeEMIs = [];
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      if (emi.status === 'active') activeEMIs.push({ id: doc.id, ...emi });
    });
    
    const insights = {
      totalMonthlyBurden: activeEMIs.reduce((sum, emi) => sum + (parseFloat(emi.emiAmount) || 0), 0),
      highestEMI: activeEMIs.length > 0 ? activeEMIs.reduce((max, emi) => (parseFloat(emi.emiAmount) || 0) > (parseFloat(max.emiAmount) || 0) ? emi : max) : null,
      avgInterestRate: activeEMIs.length > 0 ? activeEMIs.reduce((sum, emi) => sum + (parseFloat(emi.interestRate) || 0), 0) / activeEMIs.length : 0,
      totalOutstanding: activeEMIs.reduce((sum, emi) => sum + (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0), 0),
      recommendations: []
    };
    
    // Generate recommendations
    if (insights.avgInterestRate > 15) {
      insights.recommendations.push('Consider refinancing high-interest EMIs to save on interest costs.');
    }
    
    if (insights.totalMonthlyBurden > 50000) {
      insights.recommendations.push('Your monthly EMI burden is high. Consider foreclosing some EMIs to reduce financial strain.');
    }
    
    if (activeEMIs.length > 5) {
      insights.recommendations.push('You have multiple active EMIs. Consider consolidating them for better management.');
    }
    
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching EMI insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMI insights', message: error.message });
  }
});

// Get monthly trends
router.get('/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { months = 6 } = req.query;
    
    const emiSnapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .get();
    
    const incomeSnapshot = await db.collection('incomes')
      .where('userId', '==', userId)
      .get();
    
    const expenseSnapshot = await db.collection('expenses')
      .where('userId', '==', userId)
      .get();
    
    const monthlyTrends = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Calculate EMI total for this month
      let emiTotal = 0;
      emiSnapshot.docs.forEach(doc => {
        const emi = doc.data();
        if (emi.status === 'active') {
          emiTotal += parseFloat(emi.emiAmount) || 0;
        }
      });
      
      // Calculate income for this month
      let monthIncome = 0;
      incomeSnapshot.docs.forEach(doc => {
        const income = doc.data();
        const incomeDate = income.date?.toDate ? income.date.toDate() : new Date(income.date);
        if (incomeDate.getFullYear() === year && incomeDate.getMonth() === month) {
          monthIncome += parseFloat(income.amount) || 0;
        }
      });
      
      // Calculate expenses for this month (separate investments, loans)
      let monthSpending = 0;
      let monthInvestments = 0;
      let monthLoans = 0;
      expenseSnapshot.docs.forEach(doc => {
        const expense = doc.data();
        const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
        if (expenseDate.getFullYear() === year && expenseDate.getMonth() === month) {
          const amount = parseFloat(expense.amount) || 0;
          const category = (expense.category || '').toLowerCase();
          
          if (category === 'investment') {
            monthInvestments += amount;
          } else if (category === 'loan' || category === 'emi') {
            monthLoans += amount;
          } else {
            monthSpending += amount;
          }
        }
      });
      
      // Calculate total monthly commitments (EMI + loans)
      const monthlyCommitments = emiTotal + monthLoans;
      
      // Calculate net savings (income - spending - EMI)
      const netSavings = monthIncome - monthSpending - emiTotal;
      
      // Calculate savings rate
      const savingsRate = monthIncome > 0 ? ((netSavings / monthIncome) * 100) : 0;
      
      monthlyTrends.push({
        month: monthKey,
        monthName: monthKey,
        year: date.getFullYear(),
        totalAmount: Math.round(emiTotal * 100) / 100,
        amount: Math.round(emiTotal * 100) / 100,
        count: emiSnapshot.docs.filter(doc => doc.data().status === 'active').length,
        income: Math.round(monthIncome * 100) / 100,
        spending: Math.round(monthSpending * 100) / 100,
        spendings: Math.round(monthSpending * 100) / 100,
        emiPayments: Math.round(emiTotal * 100) / 100,
        investments: Math.round(monthInvestments * 100) / 100,
        loanPayments: Math.round(monthLoans * 100) / 100,
        monthlyCommitments: Math.round(monthlyCommitments * 100) / 100,
        netSavings: Math.round(netSavings * 100) / 100,
        savingsRate: Math.round(savingsRate * 10) / 10
      });
    }
    
    // Calculate analysis (change percentages)
    const analysis = {
      incomeChange: 0,
      spendingChange: 0,
      difference: 0
    };
    
    if (monthlyTrends.length >= 2) {
      const firstMonth = monthlyTrends[0];
      const lastMonth = monthlyTrends[monthlyTrends.length - 1];
      
      if (firstMonth.income > 0) {
        analysis.incomeChange = Math.round(((lastMonth.income - firstMonth.income) / firstMonth.income * 100) * 10) / 10;
      } else if (lastMonth.income > 0) {
        analysis.incomeChange = 100;
      }
      
      if (firstMonth.spending > 0) {
        analysis.spendingChange = Math.round(((lastMonth.spending - firstMonth.spending) / firstMonth.spending * 100) * 10) / 10;
      } else if (lastMonth.spending > 0) {
        analysis.spendingChange = 100;
      }
      
      analysis.difference = Math.round((lastMonth.spending - firstMonth.spending) * 100) / 100;
    }
    
    // Calculate summary statistics
    const totalIncome = monthlyTrends.reduce((sum, m) => sum + (m.income || 0), 0);
    const totalSpending = monthlyTrends.reduce((sum, m) => sum + (m.spending || 0), 0);
    const totalInvestments = monthlyTrends.reduce((sum, m) => sum + (m.investments || 0), 0);
    const totalNetSavings = monthlyTrends.reduce((sum, m) => sum + (m.netSavings || 0), 0);
    
    const avgMonthlyIncome = monthlyTrends.length > 0 ? totalIncome / monthlyTrends.length : 0;
    const avgMonthlySpendings = monthlyTrends.length > 0 ? totalSpending / monthlyTrends.length : 0;
    const avgSavingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlySpendings) / avgMonthlyIncome * 100) : 0;
    
    const summary = {
      avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
      avgMonthlySpendings: Math.round(avgMonthlySpendings * 100) / 100,
      totalInvestments: Math.round(totalInvestments * 100) / 100,
      totalNetSavings: Math.round(totalNetSavings * 100) / 100,
      avgSavingsRate: Math.round(avgSavingsRate * 100) / 100
    };
    
    res.json({
      success: true,
      data: {
        analysis,
        summary,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch monthly trends',
      message: error.message 
    });
  }
});

// Get all EMIs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const emis = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: emis
    });
  } catch (error) {
    console.error('Error fetching EMIs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch EMIs',
      message: error.message
    });
  }
});

// Create new EMI
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const emiData = {
      ...req.body,
      userId,
      status: req.body.status || 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('emi').add(emiData);
    const doc = await docRef.get();
    
    res.status(201).json({ 
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error creating EMI:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create EMI',
      message: error.message
    });
  }
});

// Add manual EMI
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { 
      cardProvider,
      customProviderName,
      cardLastFourDigits,
      cardHolderName,
      merchantName,
      productDescription,
      repaymentType,
      principalAmount,
      emiAmount,
      interestRate,
      processingFee,
      totalTenure,
      startDate,
      notes
    } = req.body;

    // Calculate next due date and other fields
    const emiStartDate = new Date(startDate);
    const nextDueDate = new Date(emiStartDate);
    
    // For monthly EMI, set next due date to first payment
    // For on-request, set it far in future
    if (repaymentType === 'ON_REQUEST') {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 10);
    }

    const principal = parseFloat(principalAmount) || 0;
    const monthlyEMI = repaymentType === 'MONTHLY' ? (parseFloat(emiAmount) || 0) : 0;
    const tenure = repaymentType === 'MONTHLY' ? (parseInt(totalTenure) || 0) : 0;
    const interest = parseFloat(interestRate) || 0;
    const fee = parseFloat(processingFee) || 0;

    const totalAmount = repaymentType === 'MONTHLY' 
      ? (monthlyEMI * tenure) + fee
      : principal + fee;

    const emiData = {
      userId,
      cardProvider: cardProvider === 'OTHER' ? customProviderName : cardProvider,
      cardLastFourDigits: cardLastFourDigits || '',
      cardHolderName: cardHolderName || '',
      merchantName: merchantName || '',
      productDescription: productDescription || '',
      repaymentType: repaymentType || 'MONTHLY',
      principalAmount: principal,
      emiAmount: monthlyEMI,
      interestRate: interest,
      processingFee: fee,
      totalTenure: tenure,
      totalAmount: totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      paidInstallments: 0,
      remainingInstallments: tenure,
      startDate: admin.firestore.Timestamp.fromDate(emiStartDate),
      nextDueDate: admin.firestore.Timestamp.fromDate(nextDueDate),
      status: 'active',
      notes: notes || '',
      source: 'manual',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('emi').add(emiData);
    const doc = await docRef.get();
    
    res.status(201).json({ 
      success: true,
      message: 'EMI created successfully',
      data: { 
        id: doc.id, 
        ...doc.data(),
        startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate().toISOString() : doc.data().startDate,
        nextDueDate: doc.data().nextDueDate?.toDate ? doc.data().nextDueDate.toDate().toISOString() : doc.data().nextDueDate
      } 
    });
  } catch (error) {
    console.error('Error adding manual EMI:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add manual EMI',
      error: error.message
    });
  }
});

// Get EMI by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('emi').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        error: 'EMI not found' 
      });
    }
    
    res.json({ 
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching EMI:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch EMI',
      message: error.message
    });
  }
});

// Update EMI
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('emi').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        error: 'EMI not found' 
      });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ 
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating EMI:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update EMI',
      message: error.message
    });
  }
});

// Delete EMI
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('emi').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        error: 'EMI not found' 
      });
    }
    
    await docRef.delete();
    res.json({ 
      success: true,
      message: 'EMI deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting EMI:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete EMI',
      message: error.message
    });
  }
});

// Export stubs
router.get('/export/pdf', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'PDF export feature coming soon' });
});

router.get('/export/excel', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Excel export feature coming soon' });
});

router.get('/export/csv', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'CSV export feature coming soon' });
});

router.get('/monthly-trends/export', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Trends export feature coming soon' });
});

router.post('/sync-statements', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Statement sync feature coming soon' });
});

module.exports = router;
