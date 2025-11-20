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

// Get EMIs grouped by card provider
router.get('/by-provider', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const providerMap = {};
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const provider = emi.cardProvider || 'Unknown';
      
      if (!providerMap[provider]) {
        providerMap[provider] = {
          provider,
          count: 0,
          totalPrincipal: 0,
          totalOutstanding: 0,
          activeCount: 0,
          completedCount: 0,
          totalMonthlyEMI: 0,
          emis: []
        };
      }
      
      providerMap[provider].count++;
      providerMap[provider].totalPrincipal += parseFloat(emi.principalAmount) || 0;
      providerMap[provider].totalOutstanding += (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      providerMap[provider].totalMonthlyEMI += parseFloat(emi.emiAmount) || 0;
      
      if (emi.status === 'active') providerMap[provider].activeCount++;
      if (emi.status === 'completed') providerMap[provider].completedCount++;
      
      providerMap[provider].emis.push({
        id: doc.id,
        ...emi
      });
    });
    
    const providers = Object.values(providerMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error fetching EMIs by provider:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMIs by provider', message: error.message });
  }
});

// Get EMIs grouped by merchant
router.get('/by-merchant', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const merchantMap = {};
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const merchant = emi.merchantName || 'Unknown';
      
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = {
          merchant,
          count: 0,
          totalOutstanding: 0,
          totalPrincipal: 0,
          emis: []
        };
      }
      
      merchantMap[merchant].count++;
      merchantMap[merchant].totalOutstanding += (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      merchantMap[merchant].totalPrincipal += parseFloat(emi.principalAmount) || 0;
      merchantMap[merchant].emis.push({
        id: doc.id,
        ...emi
      });
    });
    
    const merchants = Object.values(merchantMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('Error fetching EMIs by merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMIs by merchant', message: error.message });
  }
});

// Get EMI payment timeline
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 12));
    
    const timeline = [];
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      if (emi.status !== 'active') return;
      
      const emiStartDate = emi.startDate?.toDate ? emi.startDate.toDate() : new Date(emi.startDate);
      const currentDate = new Date(emiStartDate);
      
      for (let i = 0; i < parseInt(emi.remainingInstallments || 0); i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        if (currentDate >= start && currentDate <= end) {
          timeline.push({
            emiId: doc.id,
            merchantName: emi.merchantName,
            cardProvider: emi.cardProvider,
            amount: parseFloat(emi.emiAmount) || 0,
            dueDate: new Date(currentDate).toISOString(),
            installmentNumber: (parseInt(emi.totalTenure) || 0) - (parseInt(emi.remainingInstallments) || 0) + i + 1
          });
        }
      }
    });
    
    timeline.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Error fetching EMI timeline:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMI timeline', message: error.message });
  }
});

// Get EMI charts data
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
    
    res.json({
      success: true,
      data: {
        providerDistribution: providerData,
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

// Calculate foreclosure savings
router.get('/foreclosure/:emiId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { emiId } = req.params;
    
    const doc = await db.collection('emi').doc(emiId).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }
    
    const emi = doc.data();
    const remainingAmount = (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
    const principalRemaining = (parseFloat(emi.principalAmount) || 0) - (parseFloat(emi.paidAmount) || 0);
    const interestRemaining = remainingAmount - principalRemaining;
    const savings = interestRemaining * 0.7; // Assuming 70% of interest can be saved
    
    res.json({
      success: true,
      data: {
        emiId,
        remainingAmount,
        principalRemaining,
        interestRemaining,
        potentialSavings: Math.round(savings * 100) / 100,
        foreClosureAmount: Math.round((principalRemaining + interestRemaining * 0.3) * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error calculating foreclosure:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate foreclosure', message: error.message });
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
      
      // Calculate expenses for this month
      let monthSpending = 0;
      expenseSnapshot.docs.forEach(doc => {
        const expense = doc.data();
        const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
        if (expenseDate.getFullYear() === year && expenseDate.getMonth() === month) {
          monthSpending += parseFloat(expense.amount) || 0;
        }
      });
      
      monthlyTrends.push({
        month: monthKey,
        amount: Math.round(emiTotal * 100) / 100,
        count: emiSnapshot.docs.filter(doc => doc.data().status === 'active').length,
        income: Math.round(monthIncome * 100) / 100,
        spending: Math.round(monthSpending * 100) / 100
      });
    }
    
    // Calculate analysis (change percentages)
    const analysis = {
      incomeChange: 0,
      spendingChange: 0
    };
    
    if (monthlyTrends.length >= 2) {
      const firstMonth = monthlyTrends[0];
      const lastMonth = monthlyTrends[monthlyTrends.length - 1];
      
      if (firstMonth.income > 0) {
        analysis.incomeChange = Math.round(((lastMonth.income - firstMonth.income) / firstMonth.income * 100) * 10) / 10;
      }
      
      if (firstMonth.spending > 0) {
        analysis.spendingChange = Math.round(((lastMonth.spending - firstMonth.spending) / firstMonth.spending * 100) * 10) / 10;
      }
    }
    
    // Calculate summary statistics
    const totalIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0);
    const totalSpending = monthlyTrends.reduce((sum, m) => sum + m.spending, 0);
    
    const summary = {
      avgMonthlyIncome: Math.round((totalIncome / monthlyTrends.length) * 100) / 100,
      avgMonthlySpending: Math.round((totalSpending / monthlyTrends.length) * 100) / 100
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

// Get EMI insights
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .get();
    
    const insights = {
      totalInterestPaid: 0,
      projectedInterest: 0,
      averageInterestRate: 0,
      highestEMI: { amount: 0, name: '' },
      earliestMaturity: null,
      recommendations: []
    };
    
    let totalRate = 0;
    let rateCount = 0;
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const rate = parseFloat(emi.interestRate) || 0;
      const principal = parseFloat(emi.principalAmount) || 0;
      const paidAmount = parseFloat(emi.paidAmount) || 0;
      const tenure = parseInt(emi.tenure) || 0;
      
      // Calculate interest paid
      const interestPaid = paidAmount - (principal * (paidAmount / (emiAmount * tenure || 1)));
      insights.totalInterestPaid += Math.max(0, interestPaid);
      
      // Track highest EMI
      if (emiAmount > insights.highestEMI.amount) {
        insights.highestEMI = {
          amount: emiAmount,
          name: emi.loanName || emi.description || 'Unnamed EMI'
        };
      }
      
      // Average rate
      if (rate > 0) {
        totalRate += rate;
        rateCount++;
      }
      
      // Maturity date
      if (emi.endDate) {
        const endDate = emi.endDate?.toDate ? emi.endDate.toDate() : new Date(emi.endDate);
        if (!insights.earliestMaturity || endDate < insights.earliestMaturity) {
          insights.earliestMaturity = endDate;
        }
      }
    });
    
    insights.averageInterestRate = rateCount > 0 ? (totalRate / rateCount).toFixed(2) : 0;
    insights.totalInterestPaid = Math.round(insights.totalInterestPaid * 100) / 100;
    
    // Generate recommendations
    if (insights.averageInterestRate > 12) {
      insights.recommendations.push({
        type: 'high_interest',
        message: 'Your average interest rate is high. Consider refinancing loans with rates above 12%.',
        priority: 'high'
      });
    }
    
    if (snapshot.size > 5) {
      insights.recommendations.push({
        type: 'multiple_emis',
        message: 'You have multiple EMIs. Consider consolidating them to reduce overall interest.',
        priority: 'medium'
      });
    }
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching EMI insights:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch EMI insights',
      message: error.message 
    });
  }
});

// Get EMI charts data
router.get('/charts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi')
      .where('userId', '==', userId)
      .get();
    
    const charts = {
      statusDistribution: [],
      categoryDistribution: [],
      interestRateComparison: [],
      paymentProgress: []
    };
    
    const statusCount = {};
    const categoryCount = {};
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const status = emi.status || 'active';
      const category = emi.category || 'Other';
      const principal = parseFloat(emi.principalAmount) || 0;
      const paidAmount = parseFloat(emi.paidAmount) || 0;
      const rate = parseFloat(emi.interestRate) || 0;
      
      // Status distribution
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      // Category distribution
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      
      // Interest rate comparison
      if (rate > 0) {
        charts.interestRateComparison.push({
          name: emi.loanName || emi.description || 'Unnamed',
          rate: rate,
          amount: principal
        });
      }
      
      // Payment progress
      if (principal > 0) {
        charts.paymentProgress.push({
          name: emi.loanName || emi.description || 'Unnamed',
          paid: paidAmount,
          remaining: principal - paidAmount,
          progress: ((paidAmount / principal) * 100).toFixed(1)
        });
      }
    });
    
    // Convert to array format
    charts.statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count
    }));
    
    charts.categoryDistribution = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count
    }));
    
    res.json({
      success: true,
      data: charts
    });
  } catch (error) {
    console.error('Error fetching EMI charts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch EMI charts',
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

// Calculate EMI
router.post('/calculate', (req, res) => {
  try {
    const { principal, rate, tenure } = req.body;
    
    if (!principal || !rate || !tenure) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters' 
      });
    }
    
    const monthlyRate = rate / (12 * 100);
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                (Math.pow(1 + monthlyRate, tenure) - 1);
    
    const totalAmount = emi * tenure;
    const totalInterest = totalAmount - principal;
    
    res.json({
      success: true,
      data: {
        emi: Math.round(emi * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        principal
      }
    });
  } catch (error) {
    console.error('Error calculating EMI:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to calculate EMI',
      message: error.message
    });
  }
});

// Add manual EMI
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const emiData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'manual'
    };
    
    const docRef = await db.collection('emis').add(emiData);
    const doc = await docRef.get();
    
    res.status(201).json({ 
      success: true,
      data: { 
        id: doc.id, 
        ...doc.data() 
      } 
    });
  } catch (error) {
    console.error('Error adding manual EMI:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add manual EMI' 
    });
  }
});

// Sync EMI statements
router.post('/sync-statements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Placeholder for statement sync logic
    // In a real implementation, this would connect to banking APIs
    
    res.json({
      success: true,
      message: 'Statement sync feature coming soon',
      data: {
        status: 'pending',
        message: 'Automatic EMI statement sync will be available soon'
      }
    });
  } catch (error) {
    console.error('Error syncing statements:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to sync statements' 
    });
  }
});

// Mark EMI as paid
router.post('/:id/mark-paid', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const emiId = req.params.id;
    const { paidDate, paidAmount, notes } = req.body;
    
    const docRef = db.collection('emis').doc(emiId);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ 
        success: false,
        message: 'EMI not found' 
      });
    }
    
    await docRef.update({
      status: 'paid',
      paidDate: paidDate || admin.firestore.FieldValue.serverTimestamp(),
      paidAmount: paidAmount || doc.data().amount,
      notes: notes || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await docRef.get();
    res.json({ 
      success: true,
      data: { 
        id: updatedDoc.id, 
        ...updatedDoc.data() 
      } 
    });
  } catch (error) {
    console.error('Error marking EMI as paid:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark EMI as paid' 
    });
  }
});

// Export EMI data as PDF
router.get('/export/pdf', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'PDF export feature coming soon',
      data: {
        status: 'feature_in_development'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export PDF' 
    });
  }
});

// Export EMI data as Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Excel export feature coming soon',
      data: {
        status: 'feature_in_development'
      }
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export Excel' 
    });
  }
});

// Export EMI data as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const snapshot = await db.collection('emis')
      .where('userId', '==', userId)
      .get();
    
    const emis = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Convert to CSV format
    const headers = ['ID', 'Name', 'Amount', 'Due Date', 'Status', 'Bank'];
    const csvRows = [headers.join(',')];
    
    emis.forEach(emi => {
      const row = [
        emi.id,
        emi.name || '',
        emi.amount || 0,
        emi.dueDate || '',
        emi.status || '',
        emi.bank || ''
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=emis.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export CSV' 
    });
  }
});

// Export monthly trends
router.get('/monthly-trends/export', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Trends export feature coming soon',
      data: {
        status: 'feature_in_development'
      }
    });
  } catch (error) {
    console.error('Error exporting trends:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export trends' 
    });
  }
});

// Get EMIs grouped by card provider
router.get('/by-provider', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const providerMap = {};
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const provider = emi.cardProvider || 'Unknown';
      
      if (!providerMap[provider]) {
        providerMap[provider] = {
          provider,
          count: 0,
          totalPrincipal: 0,
          totalOutstanding: 0,
          activeCount: 0,
          completedCount: 0,
          totalMonthlyEMI: 0,
          emis: []
        };
      }
      
      providerMap[provider].count++;
      providerMap[provider].totalPrincipal += parseFloat(emi.principalAmount) || 0;
      providerMap[provider].totalOutstanding += (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      providerMap[provider].totalMonthlyEMI += parseFloat(emi.emiAmount) || 0;
      
      if (emi.status === 'active') providerMap[provider].activeCount++;
      if (emi.status === 'completed') providerMap[provider].completedCount++;
      
      providerMap[provider].emis.push({ id: doc.id, ...emi });
    });
    
    const providers = Object.values(providerMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error fetching EMIs by provider:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMIs by provider', message: error.message });
  }
});

// Get EMIs grouped by merchant
router.get('/by-merchant', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const merchantMap = {};
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      const merchant = emi.merchantName || 'Unknown';
      
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = {
          merchant,
          count: 0,
          totalOutstanding: 0,
          totalPrincipal: 0,
          emis: []
        };
      }
      
      merchantMap[merchant].count++;
      merchantMap[merchant].totalOutstanding += (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      merchantMap[merchant].totalPrincipal += parseFloat(emi.principalAmount) || 0;
      merchantMap[merchant].emis.push({ id: doc.id, ...emi });
    });
    
    const merchants = Object.values(merchantMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('Error fetching EMIs by merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMIs by merchant', message: error.message });
  }
});

// Get EMI payment timeline
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 12));
    
    const timeline = [];
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      if (emi.status !== 'active') return;
      
      const emiStartDate = emi.startDate?.toDate ? emi.startDate.toDate() : new Date(emi.startDate);
      const currentDate = new Date(emiStartDate);
      
      for (let i = 0; i < parseInt(emi.remainingInstallments || 0); i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        if (currentDate >= start && currentDate <= end) {
          timeline.push({
            emiId: doc.id,
            merchantName: emi.merchantName,
            cardProvider: emi.cardProvider,
            amount: parseFloat(emi.emiAmount) || 0,
            dueDate: new Date(currentDate).toISOString(),
            installmentNumber: (parseInt(emi.totalTenure) || 0) - (parseInt(emi.remainingInstallments) || 0) + i + 1
          });
        }
      }
    });
    
    timeline.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Error fetching EMI timeline:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EMI timeline', message: error.message });
  }
});

// Get EMI charts data
router.get('/charts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    const providerData = {};
    const merchantData = {};
    const statusData = { active: 0, completed: 0, foreclosed: 0 };
    const interestRateRanges = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20%+': 0 };
    
    let totalPrincipal = 0;
    let totalInterest = 0;
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      
      const provider = emi.cardProvider || 'Unknown';
      providerData[provider] = (providerData[provider] || 0) + 1;
      
      const merchant = emi.merchantName || 'Unknown';
      merchantData[merchant] = (merchantData[merchant] || 0) + (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
      
      if (statusData[emi.status] !== undefined) statusData[emi.status]++;
      
      const rate = parseFloat(emi.interestRate) || 0;
      if (rate <= 5) interestRateRanges['0-5%']++;
      else if (rate <= 10) interestRateRanges['5-10%']++;
      else if (rate <= 15) interestRateRanges['10-15%']++;
      else if (rate <= 20) interestRateRanges['15-20%']++;
      else interestRateRanges['20%+']++;
      
      totalPrincipal += parseFloat(emi.principalAmount) || 0;
      const totalPayable = (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.totalTenure) || 0);
      totalInterest += totalPayable - (parseFloat(emi.principalAmount) || 0);
    });
    
    res.json({
      success: true,
      data: {
        providerDistribution: providerData,
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

// Calculate foreclosure savings
router.get('/foreclosure/:emiId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { emiId } = req.params;
    
    const doc = await db.collection('emi').doc(emiId).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }
    
    const emi = doc.data();
    const remainingAmount = (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
    const principalRemaining = (parseFloat(emi.principalAmount) || 0) - (parseFloat(emi.paidAmount) || 0);
    const interestRemaining = remainingAmount - principalRemaining;
    const savings = interestRemaining * 0.7;
    
    res.json({
      success: true,
      data: {
        emiId,
        remainingAmount,
        principalRemaining,
        interestRemaining,
        potentialSavings: Math.round(savings * 100) / 100,
        foreClosureAmount: Math.round((principalRemaining + interestRemaining * 0.3) * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error calculating foreclosure:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate foreclosure', message: error.message });
  }
});

// Foreclose an EMI
router.post('/:id/foreclose', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { foreclosureDate, foreclosureAmount } = req.body;
    
    const docRef = db.collection('emi').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }
    
    await docRef.update({
      status: 'foreclosed',
      foreclosureDate: foreclosureDate ? admin.firestore.Timestamp.fromDate(new Date(foreclosureDate)) : admin.firestore.FieldValue.serverTimestamp(),
      foreclosureAmount: foreclosureAmount || 0,
      remainingInstallments: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'EMI foreclosed successfully' });
  } catch (error) {
    console.error('Error foreclosing EMI:', error);
    res.status(500).json({ success: false, error: 'Failed to foreclose EMI', message: error.message });
  }
});

// Get statistics summary
router.get('/statistics/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('emi').where('userId', '==', userId).get();
    
    let activeCount = 0;
    let completedCount = 0;
    let totalOutstanding = 0;
    let monthlyBurden = 0;
    let totalInterestRate = 0;
    let interestCount = 0;
    
    snapshot.docs.forEach(doc => {
      const emi = doc.data();
      if (emi.status === 'active') {
        activeCount++;
        monthlyBurden += parseFloat(emi.emiAmount) || 0;
        totalOutstanding += (parseFloat(emi.emiAmount) || 0) * (parseInt(emi.remainingInstallments) || 0);
        
        const rate = parseFloat(emi.interestRate);
        if (rate && rate > 0) {
          totalInterestRate += rate;
          interestCount++;
        }
      }
      if (emi.status === 'completed') completedCount++;
    });
    
    res.json({
      success: true,
      data: {
        activeEMIs: activeCount,
        completedEMIs: completedCount,
        totalOutstanding: Math.round(totalOutstanding),
        monthlyBurden: Math.round(monthlyBurden),
        averageInterestRate: interestCount > 0 ? (totalInterestRate / interestCount).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', message: error.message });
  }
});

module.exports = router;
