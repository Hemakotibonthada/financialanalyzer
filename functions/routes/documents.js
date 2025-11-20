const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configure multer for memory storage (Firebase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

// Get all documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 20, category, type } = req.query;
    
    let query = db.collection('documents').where('userId', '==', userId);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const documentsSnapshot = await query.get();
    
    // Sort in memory and apply pagination
    const allDocuments = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate ? doc.data().uploadedAt.toDate().toISOString() : doc.data().uploadedAt,
      uploadedAtTimestamp: doc.data().uploadedAt?.toDate ? doc.data().uploadedAt.toDate().getTime() : new Date(doc.data().uploadedAt || 0).getTime()
    }));
    
    // Sort by uploadedAt descending
    allDocuments.sort((a, b) => b.uploadedAtTimestamp - a.uploadedAtTimestamp);
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const documents = allDocuments.slice(startIndex, startIndex + parseInt(limit));
    
    // Remove temporary sort field
    documents.forEach(doc => delete doc.uploadedAtTimestamp);
    
    const total = await db.collection('documents').where('userId', '==', userId).count().get();
    
    res.json({
      success: true,
      documents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total.data().count / parseInt(limit)),
        totalDocuments: total.data().count
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

// Upload document
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { category = 'other', type = 'financial', description = '' } = req.body;
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${category}/${timestamp}_${req.file.originalname}`;
    
    // Upload to Firebase Storage
    const file = bucket.file(filename);
    
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          userId,
          category,
          type,
          originalName: req.file.originalname
        }
      }
    });
    
    // Make file publicly accessible with signed URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    
    // Save metadata to Firestore
    const documentData = {
      userId,
      fileName: req.file.originalname,
      storagePath: filename,
      downloadURL: url,
      category,
      type,
      description,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('documents').add(documentData);
    
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: docRef.id,
        ...documentData,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

// Upload multiple documents
router.post('/upload-multiple', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    const { category = 'other', type = 'financial' } = req.body;
    const uploadedDocuments = [];
    
    for (const file of req.files) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${userId}/${category}/${timestamp}_${file.originalname}`;
        
        // Upload to Firebase Storage
        const storageFile = bucket.file(filename);
        
        await storageFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              userId,
              category,
              type,
              originalName: file.originalname
            }
          }
        });
        
        // Get signed URL
        const [url] = await storageFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000
        });
        
        // Save metadata to Firestore
        const documentData = {
          userId,
          fileName: file.originalname,
          storagePath: filename,
          downloadURL: url,
          category,
          type,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('documents').add(documentData);
        uploadedDocuments.push({
          id: docRef.id,
          ...documentData,
          uploadedAt: new Date().toISOString()
        });
      } catch (fileError) {
        console.error(`Error uploading ${file.originalname}:`, fileError);
      }
    }
    
    res.json({
      success: true,
      message: `${uploadedDocuments.length} documents uploaded successfully`,
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('Upload multiple documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents'
    });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const docRef = db.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Generate new signed URL
    const file = bucket.file(docSnap.data().storagePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000 // 1 hour
    });
    
    res.json({
      success: true,
      document: {
        id: docSnap.id,
        ...docSnap.data(),
        downloadURL: url,
        uploadedAt: docSnap.data().uploadedAt?.toDate ? docSnap.data().uploadedAt.toDate().toISOString() : docSnap.data().uploadedAt
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
});

// Download document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const docRef = db.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const file = bucket.file(docSnap.data().storagePath);
    const [buffer] = await file.download();
    
    res.set({
      'Content-Type': docSnap.data().mimeType,
      'Content-Disposition': `attachment; filename="${docSnap.data().fileName}"`
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
});

// Update document metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { category, type, description } = req.body;
    
    const docRef = db.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const updateData = {
      ...(category && { category }),
      ...(type && { type }),
      ...(description !== undefined && { description }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Document updated successfully'
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const docRef = db.collection('documents').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Delete from Storage
    try {
      const file = bucket.file(docSnap.data().storagePath);
      await file.delete();
    } catch (storageError) {
      console.error('Storage delete error:', storageError);
    }
    
    // Delete from Firestore
    await docRef.delete();
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// Get documents by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { category } = req.params;
    
    const documentsSnapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .where('category', '==', category)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const documents = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate ? doc.data().uploadedAt.toDate().toISOString() : doc.data().uploadedAt
    }));
    
    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Get documents by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

// Batch process documents
router.post('/batch-process', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Batch processing feature coming soon',
      results: []
    });
  } catch (error) {
    console.error('Batch process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process documents'
    });
  }
});

// Retry document processing
router.post('/:id/retry', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Document retry feature coming soon'
    });
  } catch (error) {
    console.error('Retry document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry document'
    });
  }
});

// Clear documents
router.delete('/clear/documents-only', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const documentsSnapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    let deletedCount = 0;
    
    for (const doc of documentsSnapshot.docs) {
      try {
        // Delete from Storage
        const file = bucket.file(doc.data().storagePath);
        await file.delete();
      } catch (storageError) {
        console.error('Storage delete error:', storageError);
      }
      
      batch.delete(doc.ref);
      deletedCount++;
    }
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} documents`,
      deletedCount
    });
  } catch (error) {
    console.error('Clear documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear documents'
    });
  }
});

// Clear all (documents and related data)
router.delete('/clear/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const documentsSnapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    let deletedCount = 0;
    
    for (const doc of documentsSnapshot.docs) {
      try {
        // Delete from Storage
        const file = bucket.file(doc.data().storagePath);
        await file.delete();
      } catch (storageError) {
        console.error('Storage delete error:', storageError);
      }
      
      batch.delete(doc.ref);
      deletedCount++;
    }
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} documents`,
      deletedCount
    });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all documents'
    });
  }
});

module.exports = router;
