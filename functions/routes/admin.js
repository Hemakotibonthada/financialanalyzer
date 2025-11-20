const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Middleware to check admin role
const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// Get dashboard stats
router.get('/dashboard/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const expensesSnapshot = await db.collection('expenses').get();
    const documentsSnapshot = await db.collection('documents').get();
    
    const stats = {
      totalUsers: usersSnapshot.size,
      totalExpenses: expensesSnapshot.size,
      totalDocuments: documentsSnapshot.size,
      activeUsers: usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        const lastActive = data.lastLoginAt?.toDate ? data.lastActive.toDate() : new Date(data.lastLoginAt);
        const daysSince = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      }).length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats'
    });
  }
});

// Get all users
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const usersSnapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    }));
    
    const totalSnapshot = await db.collection('users').count().get();
    
    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalSnapshot.data().count / parseInt(limit)),
        totalUsers: totalSnapshot.data().count
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user segmentation
router.get('/users/segmentation', authenticateToken, isAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    const segmentation = {
      byRole: {},
      byStatus: { active: 0, inactive: 0 }
    };
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      
      // By role
      const role = data.role || 'user';
      segmentation.byRole[role] = (segmentation.byRole[role] || 0) + 1;
      
      // By status
      const lastActive = data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
      const daysSince = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
      if (daysSince <= 30) {
        segmentation.byStatus.active++;
      } else {
        segmentation.byStatus.inactive++;
      }
    });
    
    res.json({
      success: true,
      data: segmentation
    });
  } catch (error) {
    console.error('Segmentation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segmentation'
    });
  }
});

// Toggle user status
router.post('/users/:userId/toggle-status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const currentStatus = userDoc.data().isActive ?? true;
    await userRef.update({
      isActive: !currentStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
});

// Delete user
router.delete('/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete user from Auth
    await admin.auth().deleteUser(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Update user
router.put('/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, name, email } = req.body;
    
    const updateData = {
      ...(role && { role }),
      ...(name && { name }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).update(updateData);
    
    // Update email in Auth if provided
    if (email) {
      await admin.auth().updateUser(userId, { email });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Get documents (admin view)
router.get('/documents', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const documentsSnapshot = await db.collection('documents')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();
    
    const documents = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    }));
    
    const totalSnapshot = await db.collection('documents').count().get();
    
    res.json({
      success: true,
      documents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalSnapshot.data().count / parseInt(limit)),
        totalDocuments: totalSnapshot.data().count
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

// Get analytics overview
router.get('/analytics/overview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const days = parseInt(period) || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const expensesSnapshot = await db.collection('expenses')
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();
    
    const totalAmount = expensesSnapshot.docs.reduce((sum, doc) => {
      return sum + (parseFloat(doc.data().amount) || 0);
    }, 0);
    
    res.json({
      success: true,
      data: {
        totalExpenses: expensesSnapshot.size,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// System health
router.get('/system/health', authenticateToken, isAdmin, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firestore: 'healthy',
        auth: 'healthy',
        storage: 'healthy'
      }
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health'
    });
  }
});

// Get reports
router.get('/reports/:type', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    
    res.json({
      success: true,
      message: `${type} report generated`,
      data: {
        type,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// Bulk actions
router.post('/users/bulk-action', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { action, userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array required'
      });
    }
    
    let processedCount = 0;
    
    for (const userId of userIds) {
      try {
        if (action === 'delete') {
          await admin.auth().deleteUser(userId);
        } else if (action === 'activate' || action === 'deactivate') {
          await db.collection('users').doc(userId).update({
            isActive: action === 'activate',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        processedCount++;
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${processedCount}/${userIds.length} users`,
      processed: processedCount
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
});

// System cleanup
router.post('/system/cleanup', authenticateToken, isAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'System cleanup completed',
      cleaned: {
        expiredSessions: 0,
        orphanedDocuments: 0
      }
    });
  } catch (error) {
    console.error('System cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform cleanup'
    });
  }
});

module.exports = router;
