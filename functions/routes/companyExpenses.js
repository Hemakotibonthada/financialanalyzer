const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configure multer for file uploads with better error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Max 10 files
    fieldSize: 10 * 1024 * 1024, // 10MB per field
    parts: 100 // Max 100 parts in multipart form
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    
    if (mimetype && extname) {
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
        message: 'File too large. Maximum size is 10MB per file.'
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
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error('File upload error:', err);
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

// Create company expense
// Create new company expense
router.post('/', authenticateToken, (req, res, next) => {
  upload.array('attachments', 10)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
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

module.exports = router;
