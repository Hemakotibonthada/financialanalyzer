const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');
const Analysis = require('../models/Analysis');
const { processDocumentById } = require('../services/documentProcessor');
const { performFinancialAnalysis } = require('../services/financialAIService');
const websocketService = require('../services/websocketService');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'financial', req.user.id);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * @route POST /api/documents/upload
 * @desc Upload financial documents
 * @access Private
 */
router.post('/upload', authenticate, upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedDocuments = [];
    const password = req.body.password; // Get password from request body
    
    logger.info(`Upload request received. Files: ${req.files.length}, Password provided: ${password ? 'YES' : 'NO'}`);
    if (password) {
      logger.info(`Password value: ${password}`);
    }
    
    for (const file of req.files) {
      try {
        const passwordHints = password ? [{
          source: 'user_provided',
          hint: password,
          extractedDate: new Date()
        }] : [];

        logger.info(`Creating document with ${passwordHints.length} password hints`);

        const document = new Document({
          userId: req.user.id,
          fileName: file.filename,
          originalFileName: file.originalname,
          fileType: path.extname(file.originalname).substring(1).toLowerCase(),
          fileSize: file.size,
          filePath: file.path,
          source: 'upload',
          category: categorizePlaceholder(file.originalname),
          processingStatus: 'pending',
          passwordHints: passwordHints
        });

        await document.save();
        uploadedDocuments.push(document);

        logger.info(`Document uploaded: ${file.originalname} for user ${req.user.id}${password ? ' (with password)' : ''}`);
      } catch (error) {
        logger.error(`Error saving document ${file.originalname}:`, error);
      }
    }

    res.json({
      success: true,
      message: `${uploadedDocuments.length} documents uploaded successfully`,
      documents: uploadedDocuments.map(doc => ({
        id: doc._id,
        originalName: doc.originalFileName,
        size: doc.fileSize,
        category: doc.category,
        status: doc.processingStatus
      }))
    });

  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload documents'
    });
  }
});

/**
 * @route POST /api/documents/:id/process
 * @desc Process a specific document
 * @access Private
 */
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const documentId = req.params.id;

    // Verify document belongs to user
    const document = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Process the document
    const result = await processDocumentById(documentId, password);

    res.json({
      success: true,
      message: 'Document processed successfully',
      document: {
        id: result.document._id,
        originalName: result.document.originalFileName,
        status: result.document.processingStatus,
        transactionCount: result.transactions.length,
        isPasswordProtected: result.document.isPasswordProtected
      },
      transactions: result.transactions.map(t => ({
        id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category
      }))
    });

  } catch (error) {
    logger.error('Document processing error:', error);
    
    if (error.message === 'PDF_PASSWORD_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Password required for this document',
        requiresPassword: true
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process document'
    });
  }
});

/**
 * @route GET /api/documents
 * @desc Get user's documents
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status, 
      source 
    } = req.query;

    const filter = { userId: req.user.id };
    if (category) filter.category = category;
    if (status) filter.processingStatus = status;
    if (source) filter.source = source;

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-filePath -passwordHints.hint');

    const total = await Document.countDocuments(filter);

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc._id,
        originalName: doc.originalFileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        category: doc.category,
        source: doc.source,
        isProcessed: doc.isProcessed,
        processingStatus: doc.processingStatus,
        transactionCount: doc.transactionCount,
        isPasswordProtected: doc.isPasswordProtected,
        createdAt: doc.createdAt,
        gmailMessageId: doc.gmailMessageId
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete a document and its transactions
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;

    const document = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete associated transactions
    await Transaction.deleteMany({ documentId });

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      logger.warn(`Could not delete file ${document.filePath}:`, fileError);
    }

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    logger.info(`Document deleted: ${document.originalFileName} for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

/**
 * @route GET /api/documents/:id/transactions
 * @desc Get transactions from a specific document
 * @access Private
 */
router.get('/:id/transactions', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;

    // Verify document belongs to user
    const document = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const transactions = await Transaction.find({ documentId })
      .sort({ date: -1 });

    res.json({
      success: true,
      document: {
        id: document._id,
        originalName: document.originalFileName,
        category: document.category
      },
      transactions: transactions.map(t => ({
        id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        merchantName: t.merchantName,
        confidence: t.confidence,
        isVerified: t.isVerified
      }))
    });

  } catch (error) {
    logger.error('Get document transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document transactions'
    });
  }
});

/**
 * @route POST /api/documents/batch-process
 * @desc Process multiple documents
 * @access Private
 */
router.post('/batch-process', authenticate, async (req, res) => {
  try {
    const { documentIds, passwords = {} } = req.body;

    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Document IDs array is required'
      });
    }

    const results = [];
    
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      
      // Emit processing start
      websocketService.emitDocumentStatus(req.user.id, docId, 'processing', {
        progress: Math.round(((i) / documentIds.length) * 100),
        current: i + 1,
        total: documentIds.length
      });
      
      try {
        const password = passwords[docId] || null;
        const result = await processDocumentById(docId, password);
        
        // Emit processing success
        websocketService.emitDocumentStatus(req.user.id, docId, 'completed', {
          transactionCount: result.transactions.length,
          progress: Math.round(((i + 1) / documentIds.length) * 100)
        });
        
        results.push({
          documentId: docId,
          success: true,
          transactionCount: result.transactions.length,
          status: result.document.processingStatus
        });
      } catch (error) {
        // Emit processing error
        websocketService.emitDocumentStatus(req.user.id, docId, 'failed', {
          error: error.message,
          progress: Math.round(((i + 1) / documentIds.length) * 100)
        });
        
        results.push({
          documentId: docId,
          success: false,
          error: error.message,
          requiresPassword: error.message === 'PDF_PASSWORD_REQUIRED'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalTransactions = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.transactionCount, 0);

    res.json({
      success: true,
      message: `Processed ${successCount}/${documentIds.length} documents`,
      results,
      summary: {
        processed: successCount,
        total: documentIds.length,
        totalTransactions
      }
    });

  } catch (error) {
    logger.error('Batch processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process documents'
    });
  }
});

/**
 * Helper function to categorize document (placeholder)
 */
function categorizePlaceholder(filename) {
  const name = filename.toLowerCase();
  if (name.includes('statement') || name.includes('bank')) return 'bank_statement';
  if (name.includes('credit') || name.includes('card')) return 'credit_card';
  if (name.includes('receipt') || name.includes('invoice')) return 'receipt';
  if (name.includes('tax')) return 'tax_document';
  if (name.includes('investment') || name.includes('portfolio')) return 'investment';
  if (name.includes('insurance')) return 'insurance';
  return 'other';
}

module.exports = router;