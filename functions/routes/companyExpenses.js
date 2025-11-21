const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const Busboy = require('busboy');

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configure multer for file uploads with better error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10, // Max 10 files
    fieldSize: 50 * 1024 * 1024, // 50MB per field
    parts: 1000, // Max 1000 parts in multipart form
    headerPairs: 2000 // Increase header pairs limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|image\//;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = file.originalname ? allowedTypes.test(file.originalname.toLowerCase().split('.').pop()) : true;
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB per file.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many form parts.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error('File upload error:', err);
    // Handle "Unexpected end of form" error
    if (err.message && err.message.includes('Unexpected end of form')) {
      return res.status(400).json({
        success: false,
        message: 'Form upload interrupted. Please try again with a smaller file or check your connection.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  next();
};

// Get all company expenses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 20, category, startDate, endDate } = req.query;
    
    console.log('Fetching company expenses for user:', userId);
    console.log('Query params:', { page, limit, category, startDate, endDate });
    
    let query = db.collection('companyExpenses').where('userId', '==', userId);
    
    // Get all expenses first without date filters
    const expensesSnapshot = await query.get();
    
    console.log('Found expenses count:', expensesSnapshot.size);
    
    // Filter in memory to avoid index issues
    let allExpenses = expensesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        dateTimestamp: data.date?.toDate ? data.date.toDate().getTime() : new Date(data.date || 0).getTime()
      };
    });
    
    // Apply filters in memory
    if (category && category !== 'all') {
      allExpenses = allExpenses.filter(exp => exp.category === category);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const startTime = start.getTime();
        allExpenses = allExpenses.filter(exp => exp.dateTimestamp >= startTime);
      }
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999); // Include the entire end date
        const endTime = end.getTime();
        allExpenses = allExpenses.filter(exp => exp.dateTimestamp <= endTime);
      }
    }
    
    // Sort by date descending
    allExpenses.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
    
    // Apply pagination
    const totalCount = allExpenses.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const expenses = allExpenses.slice(startIndex, startIndex + parseInt(limit));
    
    // Remove temporary sort field
    expenses.forEach(exp => delete exp.dateTimestamp);
    
    console.log('Returning expenses:', expenses.length, 'of', totalCount);
    
    res.json({
      success: true,
      expenses,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / parseInt(limit)),
        totalExpenses: totalCount
      }
    });
  } catch (error) {
    console.error('Get company expenses error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company expenses',
      error: error.message
    });
  }
});

// Get analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;
    
    console.log('Fetching analytics for user:', userId);
    console.log('Date range:', { startDate, endDate });
    
    // Get all expenses and filter in memory to avoid index issues
    const query = db.collection('companyExpenses').where('userId', '==', userId);
    const expensesSnapshot = await query.get();
    
    console.log('Total expenses found:', expensesSnapshot.size);
    
    // Filter by date in memory
    let filteredDocs = expensesSnapshot.docs;
    
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const startTime = start.getTime();
        filteredDocs = filteredDocs.filter(doc => {
          const data = doc.data();
          const docTime = data.date?.toDate ? data.date.toDate().getTime() : new Date(data.date || 0).getTime();
          return docTime >= startTime;
        });
      }
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        filteredDocs = filteredDocs.filter(doc => {
          const data = doc.data();
          const docTime = data.date?.toDate ? data.date.toDate().getTime() : new Date(data.date || 0).getTime();
          return docTime <= endTime;
        });
      }
    }
    
    console.log('Filtered expenses count:', filteredDocs.length);
    
    const analytics = {
      total: filteredDocs.length,
      totalAmount: 0,
      byCategory: {},
      byStatus: {},
      byPaymentMethod: {}
    };
    
    filteredDocs.forEach(doc => {
      const data = doc.data();
      const amount = parseFloat(data.amount) || 0;
      
      analytics.totalAmount += amount;
      
      const category = data.category || 'Uncategorized';
      analytics.byCategory[category] = (analytics.byCategory[category] || 0) + amount;
      
      const status = data.paymentStatus || data.status || 'pending';
      analytics.byStatus[status] = (analytics.byStatus[status] || 0) + 1;
      
      const method = data.paymentMethod || 'cash';
      analytics.byPaymentMethod[method] = (analytics.byPaymentMethod[method] || 0) + amount;
    });
    
    analytics.totalAmount = parseFloat(analytics.totalAmount.toFixed(2));
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Create new company expense
router.post('/', authenticateToken, (req, res, next) => {
  // Add timeout and error handling
  const uploadMiddleware = upload.array('attachments', 10);
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return handleMulterError(err, req, res, next);
    }
    
    // Check if body was parsed
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Empty request body after multer');
      return res.status(400).json({
        success: false,
        message: 'No form data received. Please check your upload and try again.'
      });
    }
    
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log('Creating company expense for user:', userId);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Files count:', req.files?.length || 0);
    
    // Validate required fields
    if (!req.body.description || !req.body.amount || !req.body.category) {
      console.log('Validation failed - missing fields:', {
        hasDescription: !!req.body.description,
        hasAmount: !!req.body.amount,
        hasCategory: !!req.body.category
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: description, amount, and category are required'
      });
    }
    
    // Parse vendor data if it's a JSON string
    let vendor = {};
    if (req.body.vendor) {
      try {
        vendor = typeof req.body.vendor === 'string' ? JSON.parse(req.body.vendor) : req.body.vendor;
      } catch (e) {
        vendor = { name: req.body.vendor };
      }
    }
    
    // Parse tags if it's a JSON string
    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    // Parse recurring details if present
    let recurringDetails = null;
    if (req.body.recurringDetails) {
      try {
        recurringDetails = typeof req.body.recurringDetails === 'string' 
          ? JSON.parse(req.body.recurringDetails) 
          : req.body.recurringDetails;
      } catch (e) {
        console.error('Failed to parse recurringDetails:', e);
      }
    }
    
    // Handle file uploads to Firebase Storage
    const attachmentUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const fileName = `company-expenses/${userId}/${Date.now()}_${file.originalname}`;
          const fileUpload = bucket.file(fileName);
          
          await fileUpload.save(file.buffer, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                uploadedBy: userId
              }
            }
          });
          
          // Make file publicly accessible or get signed URL
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          attachmentUrls.push({
            name: file.originalname,
            url: publicUrl,
            type: file.mimetype,
            size: file.size
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }
    
    // Build expense data
    const expenseData = {
      description: req.body.description,
      amount: parseFloat(req.body.amount),
      category: req.body.category,
      date: req.body.expenseDate || req.body.date ? new Date(req.body.expenseDate || req.body.date) : new Date(),
      paymentMethod: req.body.paymentMethod || 'cash',
      paymentStatus: req.body.paymentStatus || 'pending',
      invoiceNumber: req.body.invoiceNumber || '',
      referenceNumber: req.body.referenceNumber || '',
      vendor: vendor,
      project: req.body.project || '',
      department: req.body.department || '',
      notes: req.body.notes || '',
      tags: tags,
      attachments: attachmentUrls,
      isRecurring: req.body.isRecurring === 'true' || req.body.isRecurring === true,
      recurringDetails: recurringDetails,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Convert date to Firestore Timestamp
    if (expenseData.date) {
      expenseData.date = admin.firestore.Timestamp.fromDate(new Date(expenseData.date));
    }
    
    const expenseRef = await db.collection('companyExpenses').add(expenseData);
    const newDoc = await expenseRef.get();
    
    res.json({
      success: true,
      message: 'Company expense created successfully',
      data: {
        id: expenseRef.id,
        ...newDoc.data(),
        date: newDoc.data().date?.toDate ? newDoc.data().date.toDate().toISOString() : newDoc.data().date
      }
    });
  } catch (error) {
    console.error('Create company expense error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Failed to create company expense',
      error: error.message
    });
  }
});

// Update company expense
router.put('/:id', authenticateToken, (req, res, next) => {
  upload.array('attachments', 10)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const expenseRef = db.collection('companyExpenses').doc(id);
    const expenseDoc = await expenseRef.get();
    
    if (!expenseDoc.exists || expenseDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Company expense not found'
      });
    }
    
    // Parse vendor data if it's a JSON string
    let vendor = req.body.vendor;
    if (vendor && typeof vendor === 'string') {
      try {
        vendor = JSON.parse(vendor);
      } catch (e) {
        vendor = { name: vendor };
      }
    }
    
    // Parse tags if it's a JSON string
    let tags = req.body.tags;
    if (tags && typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    // Handle new file uploads
    const existingAttachments = expenseDoc.data().attachments || [];
    const attachmentUrls = [...existingAttachments];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const fileName = `company-expenses/${userId}/${Date.now()}_${file.originalname}`;
          const fileUpload = bucket.file(fileName);
          
          await fileUpload.save(file.buffer, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                uploadedBy: userId
              }
            }
          });
          
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          attachmentUrls.push({
            name: file.originalname,
            url: publicUrl,
            type: file.mimetype,
            size: file.size
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }
    
    const updateData = {
      description: req.body.description || expenseDoc.data().description,
      amount: req.body.amount ? parseFloat(req.body.amount) : expenseDoc.data().amount,
      category: req.body.category || expenseDoc.data().category,
      paymentMethod: req.body.paymentMethod || expenseDoc.data().paymentMethod,
      paymentStatus: req.body.paymentStatus || expenseDoc.data().paymentStatus,
      invoiceNumber: req.body.invoiceNumber !== undefined ? req.body.invoiceNumber : expenseDoc.data().invoiceNumber,
      referenceNumber: req.body.referenceNumber !== undefined ? req.body.referenceNumber : expenseDoc.data().referenceNumber,
      vendor: vendor || expenseDoc.data().vendor,
      project: req.body.project !== undefined ? req.body.project : expenseDoc.data().project,
      department: req.body.department !== undefined ? req.body.department : expenseDoc.data().department,
      notes: req.body.notes !== undefined ? req.body.notes : expenseDoc.data().notes,
      tags: tags || expenseDoc.data().tags,
      attachments: attachmentUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (req.body.expenseDate || req.body.date) {
      updateData.date = admin.firestore.Timestamp.fromDate(new Date(req.body.expenseDate || req.body.date));
    }
    
    await expenseRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Company expense updated successfully',
      data: {
        id: id,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Update company expense error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update company expense',
      error: error.message
    });
  }
});

// Delete company expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const expenseRef = db.collection('companyExpenses').doc(id);
    const expenseDoc = await expenseRef.get();
    
    if (!expenseDoc.exists || expenseDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Company expense not found'
      });
    }
    
    await expenseRef.delete();
    
    res.json({
      success: true,
      message: 'Company expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete company expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company expense'
    });
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id, attachmentId } = req.params;
    
    const expenseRef = db.collection('companyExpenses').doc(id);
    const expenseDoc = await expenseRef.get();
    
    if (!expenseDoc.exists || expenseDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Company expense not found'
      });
    }
    
    const attachments = expenseDoc.data().attachments || [];
    const filteredAttachments = attachments.filter(a => a.id !== attachmentId);
    
    // Delete from Storage
    const attachment = attachments.find(a => a.id === attachmentId);
    if (attachment && attachment.storagePath) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(attachment.storagePath).delete();
      } catch (error) {
        console.error('Storage delete error:', error);
      }
    }
    
    await expenseRef.update({
      attachments: filteredAttachments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment'
    });
  }
});

// Get report
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate, format = 'json' } = req.query;
    
    let query = db.collection('companyExpenses').where('userId', '==', userId);
    
    if (startDate) {
      query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
    }
    
    const expensesSnapshot = await query.orderBy('date', 'desc').get();
    
    const expenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString() : doc.data().date
    }));
    
    if (format === 'json') {
      res.json({
        success: true,
        data: expenses
      });
    } else {
      // For CSV/Excel formats, return JSON for now
      res.json({
        success: true,
        message: 'Report generated',
        data: expenses
      });
    }
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// ============================================
// BUDGETS ENDPOINTS
// ============================================

// Get all budgets
router.get('/budgets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Fetching budgets for user:', userId);
    
    const budgetsSnapshot = await db.collection('companyBudgets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const budgets = budgetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate().toISOString() : doc.data().startDate,
      endDate: doc.data().endDate?.toDate ? doc.data().endDate.toDate().toISOString() : doc.data().endDate,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt
    }));
    
    console.log('Found budgets:', budgets.length);
    
    res.json({
      success: true,
      budgets
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets',
      error: error.message
    });
  }
});

// Create new budget
router.post('/budgets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Creating budget for user:', userId);
    console.log('Request body:', req.body);
    
    // Validate required fields
    if (!req.body.name || !req.body.amount || !req.body.period) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, amount, and period are required'
      });
    }
    
    const budgetData = {
      name: req.body.name,
      amount: parseFloat(req.body.amount),
      spent: parseFloat(req.body.spent) || 0,
      period: req.body.period,
      category: req.body.category || '',
      department: req.body.department || '',
      startDate: req.body.startDate ? admin.firestore.Timestamp.fromDate(new Date(req.body.startDate)) : null,
      endDate: req.body.endDate ? admin.firestore.Timestamp.fromDate(new Date(req.body.endDate)) : null,
      alertThreshold: parseFloat(req.body.alertThreshold) || 80,
      notes: req.body.notes || '',
      isActive: req.body.isActive !== false,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const budgetRef = await db.collection('companyBudgets').add(budgetData);
    const newDoc = await budgetRef.get();
    
    res.json({
      success: true,
      message: 'Budget created successfully',
      budget: {
        id: budgetRef.id,
        ...newDoc.data(),
        startDate: newDoc.data().startDate?.toDate ? newDoc.data().startDate.toDate().toISOString() : newDoc.data().startDate,
        endDate: newDoc.data().endDate?.toDate ? newDoc.data().endDate.toDate().toISOString() : newDoc.data().endDate
      }
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget',
      error: error.message
    });
  }
});

// Update budget
router.put('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const budgetRef = db.collection('companyBudgets').doc(id);
    const budgetDoc = await budgetRef.get();
    
    if (!budgetDoc.exists || budgetDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
    if (req.body.spent !== undefined) updateData.spent = parseFloat(req.body.spent);
    if (req.body.period !== undefined) updateData.period = req.body.period;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.department !== undefined) updateData.department = req.body.department;
    if (req.body.alertThreshold !== undefined) updateData.alertThreshold = parseFloat(req.body.alertThreshold);
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    
    if (req.body.startDate) {
      updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(req.body.startDate));
    }
    
    if (req.body.endDate) {
      updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(req.body.endDate));
    }
    
    await budgetRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Budget updated successfully',
      budget: {
        id: id,
        ...budgetDoc.data(),
        ...updateData
      }
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
      error: error.message
    });
  }
});

// Delete budget
router.delete('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const budgetRef = db.collection('companyBudgets').doc(id);
    const budgetDoc = await budgetRef.get();
    
    if (!budgetDoc.exists || budgetDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    await budgetRef.delete();
    
    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget'
    });
  }
});

// ============================================
// TRANSACTIONS ENDPOINTS
// ============================================

// Get all transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 50, type, category, startDate, endDate } = req.query;
    
    console.log('Fetching transactions for user:', userId);
    
    let query = db.collection('companyTransactions').where('userId', '==', userId);
    
    const transactionsSnapshot = await query.get();
    
    // Filter in memory
    let allTransactions = transactionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        dateTimestamp: data.date?.toDate ? data.date.toDate().getTime() : new Date(data.date || 0).getTime()
      };
    });
    
    // Apply filters
    if (type && type !== 'all') {
      allTransactions = allTransactions.filter(t => t.type === type);
    }
    
    if (category && category !== 'all') {
      allTransactions = allTransactions.filter(t => t.category === category);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const startTime = start.getTime();
        allTransactions = allTransactions.filter(t => t.dateTimestamp >= startTime);
      }
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        allTransactions = allTransactions.filter(t => t.dateTimestamp <= endTime);
      }
    }
    
    // Sort by date descending
    allTransactions.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
    
    // Apply pagination
    const totalCount = allTransactions.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const transactions = allTransactions.slice(startIndex, startIndex + parseInt(limit));
    
    // Remove temporary sort field
    transactions.forEach(t => delete t.dateTimestamp);
    
    console.log('Returning transactions:', transactions.length, 'of', totalCount);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / parseInt(limit)),
        totalTransactions: totalCount
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// Create new transaction
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Creating transaction for user:', userId);
    console.log('Request body:', req.body);
    
    // Validate required fields
    if (!req.body.type || !req.body.amount || !req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, amount, and category are required'
      });
    }
    
    // Parse party info if it's a JSON string
    let partyInfo = {};
    if (req.body.partyInfo) {
      try {
        partyInfo = typeof req.body.partyInfo === 'string' ? JSON.parse(req.body.partyInfo) : req.body.partyInfo;
      } catch (e) {
        console.error('Failed to parse partyInfo:', e);
      }
    }
    
    // Parse tags if it's a JSON string
    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    // Parse recurring info if present
    let recurringInfo = null;
    if (req.body.recurringInfo) {
      try {
        recurringInfo = typeof req.body.recurringInfo === 'string' 
          ? JSON.parse(req.body.recurringInfo) 
          : req.body.recurringInfo;
      } catch (e) {
        console.error('Failed to parse recurringInfo:', e);
      }
    }
    
    const transactionData = {
      type: req.body.type, // income, expense, transfer
      category: req.body.category,
      amount: parseFloat(req.body.amount),
      subtotal: parseFloat(req.body.subtotal) || parseFloat(req.body.amount),
      discountAmount: parseFloat(req.body.discountAmount) || 0,
      discountPercent: parseFloat(req.body.discountPercent) || 0,
      taxAmount: parseFloat(req.body.taxAmount) || 0,
      taxPercent: parseFloat(req.body.taxPercent) || 0,
      totalAmount: parseFloat(req.body.totalAmount) || parseFloat(req.body.amount),
      description: req.body.description || '',
      date: req.body.date ? admin.firestore.Timestamp.fromDate(new Date(req.body.date)) : admin.firestore.FieldValue.serverTimestamp(),
      paymentMethod: req.body.paymentMethod || 'cash',
      paymentStatus: req.body.paymentStatus || 'completed',
      referenceNumber: req.body.referenceNumber || '',
      partyInfo: partyInfo,
      invoiceNumber: req.body.invoiceNumber || '',
      poNumber: req.body.poNumber || '',
      department: req.body.department || '',
      project: req.body.project || '',
      fromAccount: req.body.fromAccount || '',
      toAccount: req.body.toAccount || '',
      isBillable: req.body.isBillable === 'true' || req.body.isBillable === true,
      isReconciled: req.body.isReconciled === 'true' || req.body.isReconciled === true,
      notes: req.body.notes || '',
      tags: tags,
      isRecurring: req.body.isRecurring === 'true' || req.body.isRecurring === true,
      recurringInfo: recurringInfo,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const transactionRef = await db.collection('companyTransactions').add(transactionData);
    const newDoc = await transactionRef.get();
    
    res.json({
      success: true,
      message: 'Transaction created successfully',
      transaction: {
        id: transactionRef.id,
        ...newDoc.data(),
        date: newDoc.data().date?.toDate ? newDoc.data().date.toDate().toISOString() : newDoc.data().date
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
});

// Update transaction
router.put('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const transactionRef = db.collection('companyTransactions').doc(id);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists || transactionDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Parse complex fields
    let partyInfo = req.body.partyInfo;
    if (partyInfo && typeof partyInfo === 'string') {
      try {
        partyInfo = JSON.parse(partyInfo);
      } catch (e) {
        console.error('Failed to parse partyInfo:', e);
      }
    }
    
    let tags = req.body.tags;
    if (tags && typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    let recurringInfo = req.body.recurringInfo;
    if (recurringInfo && typeof recurringInfo === 'string') {
      try {
        recurringInfo = JSON.parse(recurringInfo);
      } catch (e) {
        console.error('Failed to parse recurringInfo:', e);
      }
    }
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update only provided fields
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
    if (req.body.subtotal !== undefined) updateData.subtotal = parseFloat(req.body.subtotal);
    if (req.body.discountAmount !== undefined) updateData.discountAmount = parseFloat(req.body.discountAmount);
    if (req.body.discountPercent !== undefined) updateData.discountPercent = parseFloat(req.body.discountPercent);
    if (req.body.taxAmount !== undefined) updateData.taxAmount = parseFloat(req.body.taxAmount);
    if (req.body.taxPercent !== undefined) updateData.taxPercent = parseFloat(req.body.taxPercent);
    if (req.body.totalAmount !== undefined) updateData.totalAmount = parseFloat(req.body.totalAmount);
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.paymentMethod !== undefined) updateData.paymentMethod = req.body.paymentMethod;
    if (req.body.paymentStatus !== undefined) updateData.paymentStatus = req.body.paymentStatus;
    if (req.body.referenceNumber !== undefined) updateData.referenceNumber = req.body.referenceNumber;
    if (partyInfo !== undefined) updateData.partyInfo = partyInfo;
    if (req.body.invoiceNumber !== undefined) updateData.invoiceNumber = req.body.invoiceNumber;
    if (req.body.poNumber !== undefined) updateData.poNumber = req.body.poNumber;
    if (req.body.department !== undefined) updateData.department = req.body.department;
    if (req.body.project !== undefined) updateData.project = req.body.project;
    if (req.body.fromAccount !== undefined) updateData.fromAccount = req.body.fromAccount;
    if (req.body.toAccount !== undefined) updateData.toAccount = req.body.toAccount;
    if (req.body.isBillable !== undefined) updateData.isBillable = req.body.isBillable === 'true' || req.body.isBillable === true;
    if (req.body.isReconciled !== undefined) updateData.isReconciled = req.body.isReconciled === 'true' || req.body.isReconciled === true;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (tags !== undefined) updateData.tags = tags;
    if (req.body.isRecurring !== undefined) updateData.isRecurring = req.body.isRecurring === 'true' || req.body.isRecurring === true;
    if (recurringInfo !== undefined) updateData.recurringInfo = recurringInfo;
    
    if (req.body.date) {
      updateData.date = admin.firestore.Timestamp.fromDate(new Date(req.body.date));
    }
    
    await transactionRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: {
        id: id,
        ...transactionDoc.data(),
        ...updateData
      }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error.message
    });
  }
});

// Delete transaction
router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const transactionRef = db.collection('companyTransactions').doc(id);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists || transactionDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    await transactionRef.delete();
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction'
    });
  }
});

// ============================================
// INVESTORS ENDPOINTS
// ============================================

// Get all investors
router.get('/investors', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Fetching investors for user:', userId);
    
    const investorsSnapshot = await db.collection('companyInvestors')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const investors = investorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        investmentDate: data.investmentDate?.toDate ? data.investmentDate.toDate().toISOString() : data.investmentDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    });
    
    console.log('Found investors:', investors.length);
    
    res.json({
      success: true,
      investors
    });
  } catch (error) {
    console.error('Get investors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investors',
      error: error.message
    });
  }
});

// Create new investor
router.post('/investors', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Creating investor for user:', userId);
    console.log('Request body:', req.body);
    
    // Validate required fields
    if (!req.body.name || !req.body.investorType || !req.body.investmentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, investorType, and investmentAmount are required'
      });
    }
    
    // Parse vesting schedule if it's a JSON string
    let vestingSchedule = null;
    if (req.body.vestingSchedule) {
      try {
        vestingSchedule = typeof req.body.vestingSchedule === 'string' 
          ? JSON.parse(req.body.vestingSchedule) 
          : req.body.vestingSchedule;
      } catch (e) {
        console.error('Failed to parse vestingSchedule:', e);
      }
    }
    
    // Parse address if it's a JSON string
    let address = {};
    if (req.body.address) {
      try {
        address = typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address;
      } catch (e) {
        console.error('Failed to parse address:', e);
      }
    }
    
    // Parse banking details if it's a JSON string
    let bankingDetails = {};
    if (req.body.bankingDetails) {
      try {
        bankingDetails = typeof req.body.bankingDetails === 'string' 
          ? JSON.parse(req.body.bankingDetails) 
          : req.body.bankingDetails;
      } catch (e) {
        console.error('Failed to parse bankingDetails:', e);
      }
    }
    
    const investorData = {
      name: req.body.name,
      investorType: req.body.investorType,
      email: req.body.email || '',
      phone: req.body.phone || '',
      company: req.body.company || '',
      designation: req.body.designation || '',
      status: req.body.status || 'active',
      investmentAmount: parseFloat(req.body.investmentAmount),
      equityPercentage: parseFloat(req.body.equityPercentage) || 0,
      investmentDate: req.body.investmentDate 
        ? admin.firestore.Timestamp.fromDate(new Date(req.body.investmentDate)) 
        : admin.firestore.FieldValue.serverTimestamp(),
      investmentType: req.body.investmentType || '',
      numberOfShares: parseInt(req.body.numberOfShares) || 0,
      valuationCap: parseFloat(req.body.valuationCap) || 0,
      vestingSchedule: vestingSchedule,
      hasBoardSeat: req.body.hasBoardSeat === 'true' || req.body.hasBoardSeat === true,
      hasVotingRights: req.body.hasVotingRights === 'true' || req.body.hasVotingRights === true,
      address: address,
      panNumber: req.body.panNumber || '',
      taxId: req.body.taxId || '',
      bankingDetails: bankingDetails,
      notes: req.body.notes || '',
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const investorRef = await db.collection('companyInvestors').add(investorData);
    const newDoc = await investorRef.get();
    
    res.json({
      success: true,
      message: 'Investor created successfully',
      investor: {
        id: investorRef.id,
        ...newDoc.data(),
        investmentDate: newDoc.data().investmentDate?.toDate 
          ? newDoc.data().investmentDate.toDate().toISOString() 
          : newDoc.data().investmentDate
      }
    });
  } catch (error) {
    console.error('Create investor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create investor',
      error: error.message
    });
  }
});

// Update investor
router.put('/investors/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const investorRef = db.collection('companyInvestors').doc(id);
    const investorDoc = await investorRef.get();
    
    if (!investorDoc.exists || investorDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Investor not found'
      });
    }
    
    // Parse complex fields
    let vestingSchedule = req.body.vestingSchedule;
    if (vestingSchedule && typeof vestingSchedule === 'string') {
      try {
        vestingSchedule = JSON.parse(vestingSchedule);
      } catch (e) {
        console.error('Failed to parse vestingSchedule:', e);
      }
    }
    
    let address = req.body.address;
    if (address && typeof address === 'string') {
      try {
        address = JSON.parse(address);
      } catch (e) {
        console.error('Failed to parse address:', e);
      }
    }
    
    let bankingDetails = req.body.bankingDetails;
    if (bankingDetails && typeof bankingDetails === 'string') {
      try {
        bankingDetails = JSON.parse(bankingDetails);
      } catch (e) {
        console.error('Failed to parse bankingDetails:', e);
      }
    }
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update only provided fields
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.investorType !== undefined) updateData.investorType = req.body.investorType;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.company !== undefined) updateData.company = req.body.company;
    if (req.body.designation !== undefined) updateData.designation = req.body.designation;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.investmentAmount !== undefined) updateData.investmentAmount = parseFloat(req.body.investmentAmount);
    if (req.body.equityPercentage !== undefined) updateData.equityPercentage = parseFloat(req.body.equityPercentage);
    if (req.body.investmentType !== undefined) updateData.investmentType = req.body.investmentType;
    if (req.body.numberOfShares !== undefined) updateData.numberOfShares = parseInt(req.body.numberOfShares);
    if (req.body.valuationCap !== undefined) updateData.valuationCap = parseFloat(req.body.valuationCap);
    if (vestingSchedule !== undefined) updateData.vestingSchedule = vestingSchedule;
    if (req.body.hasBoardSeat !== undefined) updateData.hasBoardSeat = req.body.hasBoardSeat === 'true' || req.body.hasBoardSeat === true;
    if (req.body.hasVotingRights !== undefined) updateData.hasVotingRights = req.body.hasVotingRights === 'true' || req.body.hasVotingRights === true;
    if (address !== undefined) updateData.address = address;
    if (req.body.panNumber !== undefined) updateData.panNumber = req.body.panNumber;
    if (req.body.taxId !== undefined) updateData.taxId = req.body.taxId;
    if (bankingDetails !== undefined) updateData.bankingDetails = bankingDetails;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    
    if (req.body.investmentDate) {
      updateData.investmentDate = admin.firestore.Timestamp.fromDate(new Date(req.body.investmentDate));
    }
    
    await investorRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Investor updated successfully',
      investor: {
        id: id,
        ...investorDoc.data(),
        ...updateData
      }
    });
  } catch (error) {
    console.error('Update investor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update investor',
      error: error.message
    });
  }
});

// Delete investor
router.delete('/investors/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const investorRef = db.collection('companyInvestors').doc(id);
    const investorDoc = await investorRef.get();
    
    if (!investorDoc.exists || investorDoc.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Investor not found'
      });
    }
    
    await investorRef.delete();
    
    res.json({
      success: true,
      message: 'Investor deleted successfully'
    });
  } catch (error) {
    console.error('Delete investor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete investor'
    });
  }
});

module.exports = router;
