const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/**
 * @route   GET /public/stats
 * @desc    Get platform-level statistics for the landing page (no auth required)
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const db = admin.firestore();

    // Gather platform stats from Firestore collections
    const [usersSnap, transactionsSnap, documentsSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('transactions').count().get(),
      db.collection('documents').count().get(),
    ]);

    const totalUsers = usersSnap.data().count || 0;
    const totalTransactions = transactionsSnap.data().count || 0;
    const totalDocuments = documentsSnap.data().count || 0;

    // Get category & payment method breakdowns from a summary doc if available
    let categoryData = [];
    let paymentMethods = [];
    let monthlyGrowth = [];
    let totalVolume = 0;
    let totalCredit = 0;
    let totalDebit = 0;

    try {
      // Try to fetch aggregated summary (if you've stored one)
      const summaryDoc = await db.collection('platform_stats').doc('summary').get();
      if (summaryDoc.exists) {
        const data = summaryDoc.data();
        categoryData = data.categories || [];
        paymentMethods = data.paymentMethods || [];
        monthlyGrowth = data.monthlyGrowth || [];
        totalVolume = data.totalVolume || 0;
        totalCredit = data.totalCredit || 0;
        totalDebit = data.totalDebit || 0;
      }
    } catch (e) {
      // Summary not available, use defaults
    }

    // Recent transaction count (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let recentCount = 0;
    try {
      const recentSnap = await db.collection('transactions')
        .where('date', '>=', thirtyDaysAgo)
        .count()
        .get();
      recentCount = recentSnap.data().count || 0;
    } catch (e) {
      // Date field may not exist in all docs
    }

    const stats = {
      users: {
        total: totalUsers,
        active: totalUsers
      },
      transactions: {
        total: totalTransactions,
        recent30Days: recentCount,
        avgAmount: totalTransactions > 0 ? Math.round(totalVolume / totalTransactions) : 0
      },
      moneyManaged: {
        total: Math.round(totalVolume),
        totalCredit: Math.round(totalCredit),
        totalDebit: Math.round(totalDebit)
      },
      documents: {
        total: totalDocuments
      },
      categories: categoryData,
      paymentMethods: paymentMethods,
      transactionSources: [],
      monthlyGrowth: monthlyGrowth,
      platform: {
        uptimePercentage: 99.9,
        uptimeSeconds: Math.floor(process.uptime()),
        bankFormatsSupported: 40,
        featuresCount: 16
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Public stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform statistics'
    });
  }
});

module.exports = router;
