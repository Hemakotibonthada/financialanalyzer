/**
 * Statement Import Routes
 * Upload a bank/card statement (PDF, TXT or CSV), extract its text, parse
 * transactions with the shared bankStatementParserService, and preview/import.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const parser = require('../services/gmail/bankStatementParserService');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

router.use(authenticate);

const uploadDir = path.join(__dirname, '../uploads/statements');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`),
});
const ALLOWED = ['.pdf', '.txt', '.csv'];
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only PDF, TXT or CSV statements are allowed'), ok);
  },
});

/** Extract plain text from an uploaded statement file. */
async function extractText(filePath, password) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt' || ext === '.csv') return fs.readFileSync(filePath, 'utf8');
  if (ext === '.pdf') {
    let buffer = fs.readFileSync(filePath);
    if (password) {
      // Password-protected PDFs require qpdf (via node-qpdf2) to decrypt first.
      try {
        const { decrypt } = require('node-qpdf2');
        const out = `${filePath}.dec.pdf`;
        await decrypt({ input: filePath, output: out, password });
        buffer = fs.readFileSync(out);
        fs.unlinkSync(out);
      } catch (e) {
        throw new Error('Password-protected PDF could not be unlocked (qpdf unavailable or wrong password).');
      }
    }
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  }
  throw new Error('Unsupported file type');
}

/** Run the appropriate parser over extracted text. */
function parseStatement(text, { bankCode, kind }) {
  if (kind === 'card') {
    return { detected: 'credit_card', transactions: parser.parseCreditCardStatement(text, '', '') || [] };
  }
  return { detected: bankCode || 'auto', transactions: parser.parseStatementText(text, bankCode) || [] };
}

/**
 * @route   POST /api/statements/parse
 * @desc    Extract & preview transactions from a statement (no DB write)
 * @body    file (multipart), password?, bankCode? (HDFC|ICICI|SBI|AXIS|KOTAK), kind? (bank|card)
 * @access  Private
 */
router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { password, bankCode, kind } = req.body;
    const text = await extractText(req.file.path, password);
    const { detected, transactions } = parseStatement(text, { bankCode, kind });
    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      data: { detected, count: transactions.length, textChars: text.length, transactions: transactions.slice(0, 100) },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    logger.error('Statement parse error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to parse statement' });
  }
});

/**
 * @route   POST /api/statements/import
 * @desc    Parse a statement and import its transactions
 * @body    file (multipart), password?, bankCode?, kind?, skipDuplicates? (default true)
 * @access  Private
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { password, bankCode, kind, skipDuplicates = 'true' } = req.body;
    const isPdf = path.extname(req.file.originalname).toLowerCase() === '.pdf';
    const text = await extractText(req.file.path, password);
    const { detected, transactions } = parseStatement(text, { bankCode, kind });
    fs.unlinkSync(req.file.path);

    const dedupe = skipDuplicates === 'true' || skipDuplicates === true;
    let imported = 0, skipped = 0, failed = 0;

    for (const t of transactions) {
      if (!t || !t.date || !(Number(t.amount) > 0)) { failed++; continue; }
      const type = ['debit', 'credit', 'transfer'].includes(t.type) ? t.type : 'debit';
      const doc = {
        userId: req.user._id,
        date: new Date(t.date),
        description: String(t.description || 'Statement transaction').slice(0, 300),
        amount: Number(t.amount),
        type,
        category: t.category || 'other',
        merchantName: t.merchantName || undefined,
        referenceNumber: t.referenceNumber || undefined,
        balance: Number.isFinite(t.balance) ? t.balance : undefined,
        source: 'bank_statement',
        extractionMethod: isPdf ? 'pdf_text' : 'csv_parse',
      };
      if (dedupe) {
        const dup = await Transaction.findOne({
          userId: req.user._id, date: doc.date, amount: doc.amount, description: doc.description,
        });
        if (dup) { skipped++; continue; }
      }
      try { await Transaction.create(doc); imported++; } catch { failed++; }
    }

    res.json({
      success: true,
      data: { detected, total: transactions.length, imported, skipped, failed },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    logger.error('Statement import error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to import statement' });
  }
});

module.exports = router;
