const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const companyExpenseController = require('../controllers/companyExpenseController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/company-expenses');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'expense-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, and common document formats
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and documents are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Ensure upload directory exists
const fs = require('fs');
const uploadDir = 'uploads/company-expenses';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/company-expenses/dashboard/summary
 * @desc    Get dashboard summary statistics
 * @access  Private
 */
router.get('/dashboard/summary', companyExpenseController.getDashboardSummary);

/**
 * @route   GET /api/company-expenses/analytics/by-category
 * @desc    Get expenses grouped by category
 * @access  Private
 */
router.get('/analytics/by-category', companyExpenseController.getExpensesByCategory);

/**
 * @route   GET /api/company-expenses/analytics/by-department
 * @desc    Get expenses grouped by department
 * @access  Private
 */
router.get('/analytics/by-department', companyExpenseController.getExpensesByDepartment);

/**
 * @route   GET /api/company-expenses/analytics/monthly-trend
 * @desc    Get monthly expense trends
 * @access  Private
 */
router.get('/analytics/monthly-trend', companyExpenseController.getMonthlyTrend);

/**
 * @route   GET /api/company-expenses/analytics/top-vendors
 * @desc    Get top vendors by spending
 * @access  Private
 */
router.get('/analytics/top-vendors', companyExpenseController.getTopVendors);

/**
 * @route   POST /api/company-expenses/reports/generate
 * @desc    Generate expense report (PDF or Excel)
 * @access  Private
 */
router.post('/reports/generate', companyExpenseController.generateReport);

/**
 * @route   GET /api/company-expenses/:id/attachments/:attachmentId/download
 * @desc    Download expense attachment
 * @access  Private
 */
router.get('/:id/attachments/:attachmentId/download', companyExpenseController.downloadAttachment);

/**
 * @route   DELETE /api/company-expenses/:id/attachments/:attachmentId
 * @desc    Delete expense attachment
 * @access  Private
 */
router.delete('/:id/attachments/:attachmentId', companyExpenseController.deleteAttachment);

/**
 * @route   GET /api/company-expenses/:id
 * @desc    Get single expense by ID
 * @access  Private
 */
router.get('/:id', companyExpenseController.getExpenseById);

/**
 * @route   PUT /api/company-expenses/:id
 * @desc    Update expense
 * @access  Private
 */
router.put('/:id', upload.array('attachments', 5), companyExpenseController.updateExpense);

/**
 * @route   DELETE /api/company-expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
router.delete('/:id', companyExpenseController.deleteExpense);

/**
 * @route   GET /api/company-expenses
 * @desc    Get all expenses for user (with filters and pagination)
 * @access  Private
 */
router.get('/', companyExpenseController.getExpenses);

/**
 * @route   POST /api/company-expenses
 * @desc    Create new expense
 * @access  Private
 */
router.post('/', upload.array('attachments', 5), companyExpenseController.createExpense);

module.exports = router;
