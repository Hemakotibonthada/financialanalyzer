const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CSVService = require('../services/csvService');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

// Every endpoint here is documented `@access Private` but none of them applied
// auth. The multer filename below also dereferences req.user.id, so an
// anonymous upload threw a TypeError inside the file handler rather than being
// rejected cleanly.
router.use(authenticate);

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/csv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route   POST /api/csv/preview
 * @desc    Preview CSV file before import
 * @access  Private
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { rows = 10 } = req.body;
    const preview = await CSVService.previewCSV(req.file.path, parseInt(rows));

    // Detect bank format
    const detectedFormat = CSVService.detectBankFormat(preview.headers);

    // Clean up file after preview
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        ...preview,
        detectedFormat,
        availableFormats: Object.keys(CSVService.BANK_FORMATS)
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('CSV preview error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to preview CSV'
    });
  }
});

/**
 * @route   POST /api/csv/import
 * @desc    Import transactions from CSV
 * @access  Private
 */
router.post(
  '/import',
  upload.single('file'),
  [
    body('bankFormat').optional().isString(),
    body('skipDuplicates').optional().isBoolean(),
    body('validateData').optional().isBoolean(),
    body('customMapping').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const userId = req.user.id;
      const {
        bankFormat = 'generic',
        skipDuplicates = true,
        validateData = true,
        customMapping = {}
      } = req.body;

      // Parse customMapping if it's a string
      const mapping = typeof customMapping === 'string'
        ? JSON.parse(customMapping)
        : customMapping;

      const result = await CSVService.importTransactions(userId, req.file.path, {
        bankFormat,
        skipDuplicates: skipDuplicates === 'true' || skipDuplicates === true,
        validateData: validateData === 'true' || validateData === true,
        customMapping: mapping
      });

      // Clean up file after import
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error('CSV import error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to import CSV'
      });
    }
  }
);

/**
 * @route   GET /api/csv/export
 * @desc    Export transactions to CSV
 * @access  Private
 */
router.get(
  '/export',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('type').optional().isIn(['debit', 'credit', 'transfer']),
    query('category').optional().isString(),
    query('fields').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const { startDate, endDate, type, category, fields } = req.query;

      // Build query
      const query = { userId };
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      if (type) query.type = type;
      if (category) query.category = category;

      // Fetch transactions
      const transactions = await Transaction.find(query).sort({ date: -1 });

      if (transactions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No transactions found for export'
        });
      }

      // Export options
      const exportOptions = {};
      if (fields) {
        exportOptions.fields = fields.split(',');
      }

      const csv = CSVService.exportToCSV(transactions, exportOptions);

      // Set headers for download
      const filename = `transactions_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export CSV'
      });
    }
  }
);

/**
 * @route   GET /api/csv/formats
 * @desc    Get available bank formats
 * @access  Private
 */
router.get('/formats', (req, res) => {
  try {
    const formats = Object.keys(CSVService.BANK_FORMATS).map(key => ({
      id: key,
      name: CSVService.BANK_FORMATS[key].name,
      dateFormat: CSVService.BANK_FORMATS[key].dateFormat,
      columns: CSVService.BANK_FORMATS[key].columns
    }));

    res.json({
      success: true,
      data: formats
    });
  } catch (error) {
    console.error('Formats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get formats'
    });
  }
});

/**
 * @route   POST /api/csv/validate
 * @desc    Validate CSV file without importing
 * @access  Private
 */
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { bankFormat = 'generic' } = req.body;

    // Parse CSV
    const transactions = await CSVService.parseCSV(req.file.path, bankFormat);

    // Validate
    const validTransactions = transactions.filter(t => CSVService.validateTransaction(t));
    const invalidTransactions = transactions.length - validTransactions.length;

    // Get sample of invalid reasons
    const validationErrors = [];
    transactions.forEach((t, index) => {
      if (!CSVService.validateTransaction(t)) {
        const errors = [];
        if (!t.date) errors.push('Missing date');
        if (!t.description) errors.push('Missing description');
        if (!t.amount || t.amount <= 0) errors.push('Invalid amount');
        if (!t.type) errors.push('Missing type');
        
        validationErrors.push({
          row: index + 1,
          errors
        });
      }
    });

    // Clean up file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        total: transactions.length,
        valid: validTransactions.length,
        invalid: invalidTransactions,
        validationErrors: validationErrors.slice(0, 10) // First 10 errors
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('CSV validation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate CSV'
    });
  }
});

/**
 * @route   GET /api/csv/template
 * @desc    Download CSV template
 * @access  Private
 */
router.get('/template', (req, res) => {
  try {
    const { format = 'generic' } = req.query;
    const bankFormat = CSVService.BANK_FORMATS[format] || CSVService.BANK_FORMATS.generic;

    // Create template with headers and sample row
    const headers = ['date', 'description', 'amount', 'type', 'category', 'merchantName', 'paymentMethod', 'notes'];
    const sampleRow = [
      '2024-01-15',
      'Sample Transaction',
      '100.00',
      'debit',
      'food',
      'Restaurant Name',
      'card',
      'Optional notes'
    ];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');

    const filename = `template_${format}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template'
    });
  }
});

module.exports = router;
