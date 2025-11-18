const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dataImportExportService = require('../services/dataImportExportService');
const { authenticate } = require('../middleware/auth');
const { getUserDocumentPassword } = require('../utils/documentPasswordGenerator');
const User = require('../models/User');
const FinancialProfile = require('../models/FinancialProfile');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.ofx', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Import transactions from CSV
router.post('/import/transactions/csv', authenticate, upload.single('file'), async (req, res) => {
  try {
    const result = await dataImportExportService.importTransactionsFromCSV(
      req.user._id,
      req.file.path
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import transactions from Excel
router.post('/import/transactions/excel', authenticate, upload.single('file'), async (req, res) => {
  try {
    const result = await dataImportExportService.importTransactionsFromExcel(
      req.user._id,
      req.file.path
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import from OFX (bank statement)
router.post('/import/transactions/ofx', authenticate, upload.single('file'), async (req, res) => {
  try {
    const result = await dataImportExportService.importFromOFX(
      req.user._id,
      req.file.path
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import budgets from CSV
router.post('/import/budgets/csv', authenticate, upload.single('file'), async (req, res) => {
  try {
    const result = await dataImportExportService.importBudgetsFromCSV(
      req.user._id,
      req.file.path
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export transactions to CSV
router.get('/export/transactions/csv', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const csv = await dataImportExportService.exportTransactionsToCSV(
      req.user._id,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export transactions to Excel
router.get('/export/transactions/excel', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Generate password from user info
    const password = await getUserDocumentPassword(req.user._id, User, FinancialProfile);
    
    const buffer = await dataImportExportService.exportTransactionsToExcel(
      req.user._id,
      new Date(startDate),
      new Date(endDate),
      password
    );
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', 'attachment; filename=transactions.xlsx');
    res.header('X-Document-Password', password);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export complete data
router.get('/export/complete', authenticate, async (req, res) => {
  try {
    // Generate password from user info
    const password = await getUserDocumentPassword(req.user._id, User, FinancialProfile);
    
    const buffer = await dataImportExportService.exportCompleteData(req.user._id, password);
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', 'attachment; filename=complete-financial-data.xlsx');
    res.header('X-Document-Password', password);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup user data
router.post('/backup', authenticate, async (req, res) => {
  try {
    const backup = await dataImportExportService.backupUserData(req.user._id);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore user data
router.post('/restore', authenticate, upload.single('file'), async (req, res) => {
  try {
    const backupData = JSON.parse(require('fs').readFileSync(req.file.path, 'utf8'));
    const result = await dataImportExportService.restoreUserData(req.user._id, backupData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download template files
router.get('/templates/transactions', authenticate, (req, res) => {
  const csv = dataImportExportService.generateTransactionTemplate();
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename=transaction-template.csv');
  res.send(csv);
});

router.get('/templates/budgets', authenticate, (req, res) => {
  const csv = dataImportExportService.generateBudgetTemplate();
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename=budget-template.csv');
  res.send(csv);
});

module.exports = router;
