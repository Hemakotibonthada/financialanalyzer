const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Get all bill reminders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status } = req.query;
    
    let query = db.collection('billReminders').where('userId', '==', userId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const billsSnapshot = await query.orderBy('dueDate', 'asc').get();
    
    const bills = billsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate ? doc.data().dueDate.toDate().toISOString() : doc.data().dueDate,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    }));
    
    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Get bill reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill reminders'
    });
  }
});

// Get dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const billsSnapshot = await db.collection('billReminders')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    const bills = billsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate ? doc.data().dueDate.toDate() : new Date(doc.data().dueDate)
    }));
    
    const overdue = bills.filter(b => b.dueDate < now);
    const upcoming = bills.filter(b => b.dueDate >= now && b.dueDate <= nextWeek);
    const totalAmount = bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    res.json({
      success: true,
      data: {
        total: bills.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        overdueAmount: parseFloat(overdue.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0).toFixed(2)),
        upcomingAmount: parseFloat(upcoming.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Create bill reminder
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const billData = {
      ...req.body,
      userId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (billData.dueDate) {
      billData.dueDate = admin.firestore.Timestamp.fromDate(new Date(billData.dueDate));
    }
    
    const billRef = await db.collection('billReminders').add(billData);
    
    res.json({
      success: true,
      message: 'Bill reminder created successfully',
      data: {
        id: billRef.id,
        ...billData
      }
    });
  } catch (error) {
    console.error('Create bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill reminder'
    });
  }
});

// Update bill reminder
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists || billDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (updateData.dueDate) {
      updateData.dueDate = admin.firestore.Timestamp.fromDate(new Date(updateData.dueDate));
    }
    
    await billRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Bill reminder updated successfully'
    });
  } catch (error) {
    console.error('Update bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill reminder'
    });
  }
});

// Delete bill reminder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists || billDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await billRef.delete();
    
    res.json({
      success: true,
      message: 'Bill reminder deleted successfully'
    });
  } catch (error) {
    console.error('Delete bill reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill reminder'
    });
  }
});

// Mark as paid
router.post('/:id/mark-paid', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { paidAmount, paidDate, paymentMethod } = req.body;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists || billDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await billRef.update({
      status: 'paid',
      paidAmount: paidAmount || billDoc.data().amount,
      paidDate: admin.firestore.Timestamp.fromDate(new Date(paidDate || Date.now())),
      paymentMethod: paymentMethod || 'manual',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Bill marked as paid'
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark bill as paid'
    });
  }
});

// Request approval
router.post('/:id/request-approval', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { note } = req.body;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists || billDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await billRef.update({
      status: 'pending_approval',
      approvalNote: note,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Approval requested'
    });
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request approval'
    });
  }
});

// Approve
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { note } = req.body;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await billRef.update({
      status: 'approved',
      approvedBy: userId,
      approvalNote: note,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Bill approved'
    });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve bill'
    });
  }
});

// Reject
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { note } = req.body;
    
    const billRef = db.collection('billReminders').doc(id);
    const billDoc = await billRef.get();
    
    if (!billDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Bill reminder not found'
      });
    }
    
    await billRef.update({
      status: 'rejected',
      rejectedBy: userId,
      rejectionNote: note,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Bill rejected'
    });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject bill'
    });
  }
});

module.exports = router;
