const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');
const receiptProcessingService = require('../services/receiptProcessingService');
const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/receipts/scan
 * @desc    Upload and process a receipt
 * @access  Private
 */
router.post('/scan', upload.uploadFinancial.single('receipt'), async (req, res) => {
  try {
    const rawText = req.body.rawText || req.body.raw_text || '';
    const imageUrl = req.file ? `/uploads/financial/${req.file.filename}` : req.body.imageUrl || null;

    if (!rawText && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide receipt text or upload a receipt image'
      });
    }

    const result = await receiptProcessingService.processReceipt(req.user._id, rawText, imageUrl);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Scan receipt route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/receipts
 * @desc    List user's receipts
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const result = await receiptProcessingService.getUserReceipts(req.user._id, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      category: req.query.category
    });

    res.json(result);
  } catch (error) {
    logger.error('List receipts route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/receipts/analytics
 * @desc    Get receipt analytics
 * @access  Private
 */
router.get('/analytics', async (req, res) => {
  try {
    const result = await receiptProcessingService.receiptAnalytics(req.user._id, {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    res.json(result);
  } catch (error) {
    logger.error('Receipt analytics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/receipts/:id
 * @desc    Get receipt details
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      data: { receipt }
    });
  } catch (error) {
    logger.error('Get receipt route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/receipts/:id
 * @desc    Update receipt data (manual corrections)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    const allowedFields = ['vendor', 'amount', 'date', 'items', 'category', 'notes'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        receipt[field] = req.body[field];
      }
    }

    // Mark as completed if it was failed and now has amount
    if (receipt.status === 'failed' && receipt.amount) {
      receipt.status = 'completed';
    }

    await receipt.save();

    res.json({
      success: true,
      data: { receipt },
      message: 'Receipt updated successfully'
    });
  } catch (error) {
    logger.error('Update receipt route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/receipts/:id
 * @desc    Delete a receipt
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    logger.error('Delete receipt route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/receipts/batch
 * @desc    Batch process multiple receipts
 * @access  Private
 */
router.post('/batch', async (req, res) => {
  try {
    const { receipts } = req.body;

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of receipts to process'
      });
    }

    if (receipts.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 receipts per batch'
      });
    }

    const result = await receiptProcessingService.batchProcess(req.user._id, receipts);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Batch process route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch process receipts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
