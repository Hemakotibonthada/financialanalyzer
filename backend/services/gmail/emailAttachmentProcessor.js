// ============================================================================
// EMAIL ATTACHMENT PROCESSOR SERVICE
// ============================================================================
// Comprehensive service for downloading, processing, and analyzing email
// attachments from Gmail. Handles bank statements (PDF/CSV/Excel), invoices,
// receipts, payslips, tax documents, insurance, and investment statements.
//
// Capabilities:
//   - Download attachments via Gmail API
//   - Auto-detect attachment type (bank statement, invoice, receipt, etc.)
//   - PDF text extraction via pdf-parse
//   - CSV/Excel parsing for structured bank data
//   - OCR for image attachments (Tesseract, optional dependency)
//   - Bank-specific statement parsers (ICICI, HDFC, SBI, Axis, Kotak, etc.)
//   - Credit card statement parsing (ICICI, HDFC, SBI, Amex, Citi, etc.)
//   - UPI receipt parsing
//   - Investment statement parsing (Zerodha, Groww, Kuvera, ET Money)
//   - Insurance & payslip document detection
//   - Filesystem organization by user/category/date
//   - Attachment statistics and cleanup
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// Optional dependencies — wrapped in try/catch for graceful degradation
let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (err) {
  logger.warn('[AttachmentProcessor] pdf-parse not installed. PDF processing disabled.');
}

let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (err) {
  logger.warn('[AttachmentProcessor] xlsx not installed. Excel processing disabled.');
}

let Tesseract = null;
try {
  Tesseract = require('tesseract.js');
} catch (err) {
  logger.warn('[AttachmentProcessor] tesseract.js not installed. OCR disabled.');
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = '[AttachmentProcessor]';

const UPLOAD_BASE_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'gmail');

/** Supported MIME types for processing */
const SUPPORTED_MIME_TYPES = {
  pdf: ['application/pdf'],
  csv: ['text/csv', 'application/csv', 'text/comma-separated-values'],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/x-excel',
    'application/x-msexcel'
  ],
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp', 'image/webp'],
  text: ['text/plain', 'text/html']
};

/** Attachment categories */
const ATTACHMENT_CATEGORIES = {
  BANK_STATEMENT: 'bank_statements',
  CREDIT_CARD_STATEMENT: 'credit_card_statements',
  INVOICE: 'invoices',
  RECEIPT: 'receipts',
  PAYSLIP: 'payslips',
  TAX_DOCUMENT: 'tax_documents',
  INSURANCE: 'insurance',
  INVESTMENT_STATEMENT: 'investment_statements',
  UPI_RECEIPT: 'upi_receipts',
  UNKNOWN: 'other'
};

/** Maximum attachment size: 25 MB */
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/** Maximum attachments per email */
const MAX_ATTACHMENTS_PER_EMAIL = 20;

// ============================================================================
// FILENAME / CONTENT DETECTION PATTERNS
// ============================================================================

const FILENAME_PATTERNS = {
  bank_statement: [
    /bank\s*statement/i,
    /account\s*statement/i,
    /a\/?c\s*statement/i,
    /transaction\s*statement/i,
    /e[\-_]?statement/i,
    /savings?\s*a\/?c/i,
    /current\s*a\/?c/i,
    /passbook/i,
    /stmt[_\-\s]/i
  ],
  credit_card: [
    /credit\s*card\s*statement/i,
    /card\s*statement/i,
    /cc[\-_\s]?statement/i,
    /credit\s*card\s*bill/i,
    /card\s*bill/i
  ],
  invoice: [
    /invoice/i,
    /bill/i,
    /receipt/i,
    /payment\s*confirmation/i,
    /order\s*confirmation/i,
    /booking\s*confirmation/i,
    /e[\-_]?bill/i
  ],
  payslip: [
    /payslip/i,
    /pay[\-_\s]?slip/i,
    /salary[\-_\s]?slip/i,
    /salary\s*statement/i,
    /wage\s*slip/i,
    /pay\s*stub/i,
    /ctc[\-_\s]?break/i,
    /compensation/i
  ],
  tax_document: [
    /form[\-_\s]?16/i,
    /form[\-_\s]?26as/i,
    /tds\s*certificate/i,
    /itr/i,
    /income\s*tax/i,
    /tax\s*return/i,
    /26as/i,
    /ais/i,
    /annual\s*information/i
  ],
  insurance: [
    /insurance/i,
    /policy\s*(document|schedule|certificate)/i,
    /premium\s*receipt/i,
    /claim\s*settlement/i,
    /life\s*cover/i,
    /health\s*cover/i,
    /motor\s*insurance/i
  ],
  investment: [
    /portfolio\s*statement/i,
    /cas[\-_\s]?statement/i,
    /consolidated\s*account/i,
    /holding\s*statement/i,
    /demat/i,
    /mutual\s*fund/i,
    /mf[\-_\s]?statement/i,
    /capital\s*gain/i,
    /profit[\-_\s]?loss/i,
    /contract\s*note/i,
    /trade\s*confirmation/i
  ]
};

const CONTENT_PATTERNS = {
  bank_statement: [
    /statement\s*of\s*(account|transaction)/i,
    /account\s*summary/i,
    /opening\s*balance/i,
    /closing\s*balance/i,
    /ledger\s*balance/i,
    /available\s*balance/i,
    /transaction\s*details/i,
    /value\s*date/i,
    /txn\s*date/i,
    /narration/i,
    /cheque\s*no/i,
    /debit|credit/i,
    /withdrawal|deposit/i
  ],
  credit_card: [
    /credit\s*card\s*statement/i,
    /statement\s*date/i,
    /payment\s*due\s*date/i,
    /minimum\s*(amount\s*)?due/i,
    /total\s*(amount\s*)?due/i,
    /credit\s*limit/i,
    /available\s*credit/i,
    /reward\s*points/i,
    /cashback/i,
    /previous\s*balance/i,
    /billing\s*cycle/i,
    /card\s*no.*\*{4}/i
  ],
  payslip: [
    /basic\s*salary/i,
    /gross\s*salary/i,
    /net\s*salary/i,
    /hra|house\s*rent\s*allowance/i,
    /dearness\s*allowance/i,
    /provident\s*fund|pf\s*contribution/i,
    /professional\s*tax/i,
    /tax\s*deducted/i,
    /employee\s*(id|code|number)/i,
    /department/i,
    /designation/i,
    /earnings|deductions/i
  ],
  tax_document: [
    /form\s*(?:no\.?\s*)?16/i,
    /certificate\s*under\s*section\s*203/i,
    /tax\s*deducted\s*at\s*source/i,
    /tan\s*of\s*the\s*deductor/i,
    /pan\s*of\s*the\s*deductee/i,
    /assessment\s*year/i,
    /annual\s*information\s*statement/i,
    /form\s*26as/i,
    /challan\s*identification/i
  ],
  insurance: [
    /sum\s*(assured|insured)/i,
    /policy\s*(number|no)/i,
    /premium\s*amount/i,
    /cover\s*amount/i,
    /nominee/i,
    /risk\s*commencement/i,
    /maturity\s*date/i,
    /policy\s*period/i,
    /claim\s*number/i
  ],
  investment: [
    /folio\s*no/i,
    /nav|net\s*asset\s*value/i,
    /units?\s*(allotted|redeemed|balance)/i,
    /scheme\s*name/i,
    /mutual\s*fund/i,
    /isin/i,
    /registrar/i,
    /amc/i,
    /systematic\s*investment/i,
    /capital\s*gain/i,
    /contract\s*note/i,
    /trade\s*date/i,
    /settlement\s*date/i
  ]
};

// ============================================================================
// BANK IDENTIFICATION PATTERNS
// ============================================================================

const BANK_IDENTIFICATION = {
  'ICICI': {
    content: [/icici\s*bank/i, /icicibank\.com/i, /industrial\s*credit/i],
    senders: [/icici/i, /icicibank/i],
    ifscPrefix: 'ICIC'
  },
  'HDFC': {
    content: [/hdfc\s*bank/i, /hdfcbank\.com/i, /housing\s*development\s*finance/i],
    senders: [/hdfc/i, /hdfcbank/i],
    ifscPrefix: 'HDFC'
  },
  'SBI': {
    content: [/state\s*bank\s*of\s*india/i, /sbi\.co\.in/i, /onlinesbi/i],
    senders: [/sbi/i, /statebankof/i, /onlinesbi/i],
    ifscPrefix: 'SBIN'
  },
  'Axis': {
    content: [/axis\s*bank/i, /axisbank\.com/i],
    senders: [/axis/i, /axisbank/i],
    ifscPrefix: 'UTIB'
  },
  'Kotak': {
    content: [/kotak\s*mahindra/i, /kotakbank/i, /kotak\s*bank/i],
    senders: [/kotak/i, /kotakbank/i],
    ifscPrefix: 'KKBK'
  },
  'PNB': {
    content: [/punjab\s*national\s*bank/i, /pnb/i],
    senders: [/pnb/i, /punjab\s*national/i],
    ifscPrefix: 'PUNB'
  },
  'BOB': {
    content: [/bank\s*of\s*baroda/i, /bob/i, /bankofbaroda/i],
    senders: [/baroda/i, /bob/i],
    ifscPrefix: 'BARB'
  },
  'Canara': {
    content: [/canara\s*bank/i, /canarabank/i],
    senders: [/canara/i],
    ifscPrefix: 'CNRB'
  },
  'Union': {
    content: [/union\s*bank\s*of\s*india/i, /unionbank/i],
    senders: [/union\s*bank/i, /unionbank/i],
    ifscPrefix: 'UBIN'
  },
  'IDBI': {
    content: [/idbi\s*bank/i, /idbibank/i],
    senders: [/idbi/i],
    ifscPrefix: 'IBKL'
  },
  'IndusInd': {
    content: [/indusind\s*bank/i, /indusind/i],
    senders: [/indusind/i],
    ifscPrefix: 'INDB'
  },
  'Yes Bank': {
    content: [/yes\s*bank/i, /yesbank/i],
    senders: [/yesbank/i, /yes\s*bank/i],
    ifscPrefix: 'YESB'
  },
  'IDFC First': {
    content: [/idfc\s*first/i, /idfcfirstbank/i, /idfc\s*bank/i],
    senders: [/idfc/i],
    ifscPrefix: 'IDFB'
  },
  'Federal Bank': {
    content: [/federal\s*bank/i, /federalbank/i],
    senders: [/federal/i],
    ifscPrefix: 'FDRL'
  },
  'RBL': {
    content: [/rbl\s*bank/i, /ratnakar/i],
    senders: [/rbl/i],
    ifscPrefix: 'RATN'
  }
};

// ============================================================================
// CREDIT CARD ISSUER PATTERNS
// ============================================================================

const CREDIT_CARD_ISSUERS = {
  'ICICI': [/icici/i, /icici\s*bank\s*credit\s*card/i],
  'HDFC': [/hdfc/i, /hdfc\s*bank\s*credit\s*card/i],
  'SBI': [/sbi\s*card/i, /sbi\s*credit/i],
  'Axis': [/axis/i, /axis\s*bank\s*credit/i],
  'Amex': [/amex/i, /american\s*express/i],
  'Citi': [/citi/i, /citibank/i],
  'HSBC': [/hsbc/i],
  'RBL': [/rbl/i, /ratnakar/i],
  'IndusInd': [/indusind/i],
  'Kotak': [/kotak/i],
  'Yes Bank': [/yes\s*bank/i],
  'Standard Chartered': [/standard\s*chartered/i, /sc\s*bank/i],
  'BOB': [/bob\s*card/i, /bank\s*of\s*baroda\s*credit/i]
};

// ============================================================================
// INVESTMENT PLATFORM PATTERNS
// ============================================================================

const INVESTMENT_PLATFORMS = {
  'Zerodha': [/zerodha/i, /kite/i, /coin\s*by\s*zerodha/i],
  'Groww': [/groww/i],
  'Kuvera': [/kuvera/i],
  'ET Money': [/et\s*money/i, /etmoney/i],
  'Paytm Money': [/paytm\s*money/i],
  'Upstox': [/upstox/i, /rksv/i],
  'Angel One': [/angel\s*(one|broking)/i],
  'CAMS': [/cams/i, /computer\s*age\s*management/i],
  'KFintech': [/kfintech/i, /karvy/i, /kfin/i],
  'NSDL': [/nsdl/i, /national\s*securities\s*depository/i],
  'CDSL': [/cdsl/i, /central\s*depository/i]
};

// ============================================================================
// TRANSACTION EXTRACTION REGEX PATTERNS
// ============================================================================

const AMOUNT_REGEX = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const AMOUNT_STRICT = /(?:Rs\.?|INR|₹)\s*([\d,]+\.\d{2})/g;

const DATE_FORMATS_REGEX = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,                     // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i, // DD Mon YYYY
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/                        // YYYY-MM-DD
];

const UPI_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/g;
const ACCOUNT_NUMBER_REGEX = /(?:a\/?c\s*(?:no\.?|number)?|account\s*(?:no\.?|number)?)[:\s]*(\d{9,18})/i;
const IFSC_REGEX = /(?:ifsc|ifsci)[:\s]*([A-Z]{4}0[A-Z0-9]{6})/i;
const PAN_REGEX = /(?:pan)[:\s]*([A-Z]{5}\d{4}[A-Z])/i;
const CARD_MASK_REGEX = /(?:card\s*(?:no\.?|number)?)[:\s]*(?:\*{4}\s*\*{4}\s*\*{4}\s*|\*+\s*)(\d{4})/i;

// ============================================================================
// TRANSACTION LINE PATTERNS (for extracting structured rows)
// ============================================================================

const TRANSACTION_LINE_PATTERNS = [
  // DD/MM/YYYY  Description  Debit  Credit  Balance
  /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/,
  // DD Mon YYYY  Description  Amount  Dr/Cr  Balance
  /^(\d{1,2}\s+\w{3}\s+\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|DR|CR)\s+([\d,]+\.\d{2})\s*$/i,
  // Date  Narration  Chq  Debit  Credit  Balance
  /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(\d*)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/,
  // Date  Ref  Description  Amount  Balance
  /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\S+)\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/
];

// ============================================================================
// EmailAttachmentProcessor CLASS
// ============================================================================

class EmailAttachmentProcessor {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.supportedExtensions = ['.pdf', '.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.txt'];
    this._ensureBaseDirectory();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Ensure the base uploads directory exists
   */
  _ensureBaseDirectory() {
    try {
      if (!fs.existsSync(UPLOAD_BASE_DIR)) {
        fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
        logger.info(`${LOG_PREFIX} Created base upload directory: ${UPLOAD_BASE_DIR}`);
      }
    } catch (err) {
      logger.error(`${LOG_PREFIX} Failed to create base directory: ${err.message}`);
    }
  }

  /**
   * Ensure a user-specific category directory exists
   */
  _ensureCategoryDirectory(userId, category) {
    const dir = path.join(UPLOAD_BASE_DIR, userId, category);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`${LOG_PREFIX} Created directory: ${dir}`);
      }
      return dir;
    } catch (err) {
      logger.error(`${LOG_PREFIX} Failed to create category directory ${dir}: ${err.message}`);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process all attachments from an email message
   * @param {Object} gmail - Authenticated Gmail API client
   * @param {string} messageId - Gmail message ID
   * @param {Object} emailData - Metadata about the email (sender, subject, userId, etc.)
   * @returns {Object} Processed attachments result
   */
  async processAttachments(gmail, messageId, emailData) {
    const startTime = Date.now();
    const result = {
      messageId,
      emailSubject: emailData.subject || '',
      sender: emailData.sender || '',
      userId: emailData.userId || 'anonymous',
      attachments: [],
      totalAttachments: 0,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      extractedTransactions: [],
      bankIdentified: null,
      statementSummary: null,
      processingTimeMs: 0,
      errors: []
    };

    try {
      logger.info(`${LOG_PREFIX} Processing attachments for message ${messageId} (subject: "${emailData.subject}")`);

      // Get message details to find attachments
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });

      const parts = message.data.payload ? this._getAllParts(message.data.payload) : [];
      const attachmentParts = parts.filter(part => {
        return (part.filename && part.filename.length > 0) ||
               (part.body && part.body.attachmentId);
      });

      if (attachmentParts.length === 0) {
        logger.info(`${LOG_PREFIX} No attachments found in message ${messageId}`);
        result.processingTimeMs = Date.now() - startTime;
        return result;
      }

      if (attachmentParts.length > MAX_ATTACHMENTS_PER_EMAIL) {
        logger.warn(`${LOG_PREFIX} Message ${messageId} has ${attachmentParts.length} attachments, limiting to ${MAX_ATTACHMENTS_PER_EMAIL}`);
        attachmentParts.splice(MAX_ATTACHMENTS_PER_EMAIL);
      }

      result.totalAttachments = attachmentParts.length;
      logger.info(`${LOG_PREFIX} Found ${attachmentParts.length} attachments in message ${messageId}`);

      // Process each attachment
      for (const part of attachmentParts) {
        try {
          const attachmentResult = await this._processSingleAttachment(
            gmail, messageId, part, emailData
          );
          result.attachments.push(attachmentResult);

          if (attachmentResult.status === 'processed') {
            result.processedCount++;

            // Merge extracted transactions
            if (attachmentResult.transactions && attachmentResult.transactions.length > 0) {
              result.extractedTransactions.push(...attachmentResult.transactions);
            }

            // Set bank identification
            if (attachmentResult.bankIdentified && !result.bankIdentified) {
              result.bankIdentified = attachmentResult.bankIdentified;
            }

            // Set statement summary
            if (attachmentResult.statementSummary && !result.statementSummary) {
              result.statementSummary = attachmentResult.statementSummary;
            }
          } else if (attachmentResult.status === 'skipped') {
            result.skippedCount++;
          } else {
            result.failedCount++;
          }
        } catch (partErr) {
          result.failedCount++;
          result.errors.push({
            filename: part.filename || 'unknown',
            error: partErr.message
          });
          logger.error(`${LOG_PREFIX} Error processing attachment ${part.filename}: ${partErr.message}`);
        }
      }

      // Calculate overall statement summary if not already set
      if (!result.statementSummary && result.extractedTransactions.length > 0) {
        result.statementSummary = this.calculateStatementSummary(result.extractedTransactions);
      }

      this.processedCount += result.processedCount;
      result.processingTimeMs = Date.now() - startTime;

      logger.info(
        `${LOG_PREFIX} Completed processing message ${messageId}: ` +
        `${result.processedCount} processed, ${result.failedCount} failed, ` +
        `${result.skippedCount} skipped, ${result.extractedTransactions.length} transactions extracted ` +
        `(${result.processingTimeMs}ms)`
      );

      return result;
    } catch (err) {
      this.errorCount++;
      result.errors.push({ error: err.message });
      result.processingTimeMs = Date.now() - startTime;
      logger.error(`${LOG_PREFIX} Failed to process attachments for ${messageId}: ${err.message}`);
      return result;
    }
  }

  /**
   * Recursively extract all parts from a MIME message payload
   */
  _getAllParts(payload) {
    const parts = [];
    if (payload.parts) {
      for (const part of payload.parts) {
        parts.push(part);
        if (part.parts) {
          parts.push(...this._getAllParts(part));
        }
      }
    } else {
      parts.push(payload);
    }
    return parts;
  }

  /**
   * Process a single attachment part
   */
  async _processSingleAttachment(gmail, messageId, part, emailData) {
    const filename = part.filename || 'unnamed_attachment';
    const mimeType = part.mimeType || 'application/octet-stream';
    const attachmentId = part.body ? part.body.attachmentId : null;
    const size = part.body ? part.body.size || 0 : 0;

    const attachmentMeta = {
      filename,
      mimeType,
      attachmentId,
      size,
      messageId,
      sender: emailData.sender || '',
      subject: emailData.subject || '',
      userId: emailData.userId || 'anonymous',
      emailDate: emailData.date || new Date().toISOString(),
      status: 'pending',
      category: ATTACHMENT_CATEGORIES.UNKNOWN,
      bankIdentified: null,
      transactions: [],
      statementSummary: null,
      extractedText: null,
      accountDetails: null,
      filepath: null,
      hash: null,
      processingTimeMs: 0
    };

    const startTime = Date.now();

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    if (!this.supportedExtensions.includes(ext) && !attachmentId) {
      attachmentMeta.status = 'skipped';
      attachmentMeta.skipReason = `Unsupported file extension: ${ext}`;
      logger.info(`${LOG_PREFIX} Skipping unsupported attachment: ${filename} (${ext})`);
      return attachmentMeta;
    }

    // Check size limit
    if (size > MAX_ATTACHMENT_SIZE) {
      attachmentMeta.status = 'skipped';
      attachmentMeta.skipReason = `Attachment too large: ${(size / 1024 / 1024).toFixed(2)} MB`;
      logger.warn(`${LOG_PREFIX} Skipping oversized attachment: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
      return attachmentMeta;
    }

    try {
      // Download the attachment
      const buffer = await this.downloadAttachment(gmail, messageId, attachmentId, filename);

      if (!buffer || buffer.length === 0) {
        attachmentMeta.status = 'failed';
        attachmentMeta.error = 'Empty attachment data';
        return attachmentMeta;
      }

      // Generate hash for deduplication
      attachmentMeta.hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Detect attachment type
      const detectedType = this.detectAttachmentType(filename, mimeType, buffer);
      attachmentMeta.category = detectedType.category;
      attachmentMeta.detectionConfidence = detectedType.confidence;
      attachmentMeta.detectedSubType = detectedType.subType || null;

      // Save attachment locally
      const savedPath = this.saveAttachmentLocally(
        buffer, filename, emailData.userId || 'anonymous', attachmentMeta.category
      );
      attachmentMeta.filepath = savedPath;

      // Process based on file type
      let processingResult = null;

      if (SUPPORTED_MIME_TYPES.pdf.includes(mimeType) || ext === '.pdf') {
        processingResult = await this.processPDFAttachment(savedPath, attachmentMeta);
      } else if (SUPPORTED_MIME_TYPES.csv.includes(mimeType) || ext === '.csv') {
        processingResult = await this.processCSVAttachment(savedPath, attachmentMeta);
      } else if (SUPPORTED_MIME_TYPES.excel.includes(mimeType) || ext === '.xlsx' || ext === '.xls') {
        processingResult = await this.processExcelAttachment(savedPath, attachmentMeta);
      } else if (SUPPORTED_MIME_TYPES.image.includes(mimeType) || ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'].includes(ext)) {
        processingResult = await this.processImageAttachment(savedPath, attachmentMeta);
      } else if (SUPPORTED_MIME_TYPES.text.includes(mimeType) || ext === '.txt') {
        processingResult = await this.processTextAttachment(savedPath, attachmentMeta);
      }

      if (processingResult) {
        attachmentMeta.extractedText = processingResult.text ? processingResult.text.substring(0, 5000) : null;
        attachmentMeta.transactions = processingResult.transactions || [];
        attachmentMeta.bankIdentified = processingResult.bankIdentified || null;
        attachmentMeta.accountDetails = processingResult.accountDetails || null;
        attachmentMeta.statementSummary = processingResult.statementSummary || null;
      }

      attachmentMeta.status = 'processed';
      attachmentMeta.processingTimeMs = Date.now() - startTime;

      logger.info(
        `${LOG_PREFIX} Processed ${filename}: category=${attachmentMeta.category}, ` +
        `bank=${attachmentMeta.bankIdentified || 'unknown'}, ` +
        `transactions=${attachmentMeta.transactions.length}, ` +
        `time=${attachmentMeta.processingTimeMs}ms`
      );

      return attachmentMeta;
    } catch (err) {
      attachmentMeta.status = 'failed';
      attachmentMeta.error = err.message;
      attachmentMeta.processingTimeMs = Date.now() - startTime;
      logger.error(`${LOG_PREFIX} Failed to process ${filename}: ${err.message}`);
      return attachmentMeta;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DOWNLOAD ATTACHMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Download an attachment from Gmail API
   * @param {Object} gmail - Gmail API client
   * @param {string} messageId - Message ID
   * @param {string} attachmentId - Attachment ID
   * @param {string} filename - Filename for logging
   * @returns {Buffer} Attachment data
   */
  async downloadAttachment(gmail, messageId, attachmentId, filename) {
    try {
      if (!attachmentId) {
        logger.warn(`${LOG_PREFIX} No attachmentId for ${filename}, skipping download`);
        return null;
      }

      logger.info(`${LOG_PREFIX} Downloading attachment: ${filename} (attachmentId: ${attachmentId.substring(0, 20)}...)`);

      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      if (!response.data || !response.data.data) {
        logger.warn(`${LOG_PREFIX} Empty response for attachment ${filename}`);
        return null;
      }

      // Gmail API returns base64url encoded data
      const data = response.data.data;
      const buffer = Buffer.from(data, 'base64');

      logger.info(`${LOG_PREFIX} Downloaded attachment: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
      return buffer;
    } catch (err) {
      logger.error(`${LOG_PREFIX} Failed to download attachment ${filename}: ${err.message}`);
      throw new Error(`Download failed for ${filename}: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SAVE ATTACHMENT LOCALLY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Save attachment buffer to filesystem organized by user/category/date
   * @param {Buffer} buffer - File data
   * @param {string} filename - Original filename
   * @param {string} userId - User identifier
   * @param {string} category - Attachment category
   * @returns {string} Saved file path
   */
  saveAttachmentLocally(buffer, filename, userId, category) {
    try {
      const dir = this._ensureCategoryDirectory(userId, category);
      if (!dir) throw new Error('Failed to create directory');

      // Create date-based subdirectory
      const now = new Date();
      const dateDir = path.join(dir, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }

      // Sanitize filename and ensure uniqueness
      const sanitized = this._sanitizeFilename(filename);
      const timestamp = now.getTime();
      const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      const uniqueFilename = `${base}_${timestamp}_${hash}${ext}`;

      const filepath = path.join(dateDir, uniqueFilename);
      fs.writeFileSync(filepath, buffer);

      logger.info(`${LOG_PREFIX} Saved attachment: ${filepath} (${(buffer.length / 1024).toFixed(2)} KB)`);
      return filepath;
    } catch (err) {
      logger.error(`${LOG_PREFIX} Failed to save attachment ${filename}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Sanitize a filename removing unsafe characters
   */
  _sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^\.+/, '')
      .substring(0, 200);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DETECT ATTACHMENT TYPE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Detect the type of attachment based on filename, MIME type, and initial buffer content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @param {Buffer} buffer - File content
   * @returns {Object} Detection result with category and confidence
   */
  detectAttachmentType(filename, mimeType, buffer) {
    const result = {
      category: ATTACHMENT_CATEGORIES.UNKNOWN,
      confidence: 0,
      subType: null,
      detectedPatterns: []
    };

    const lowerFilename = (filename || '').toLowerCase();
    const scores = {};

    // Initialize scores
    Object.keys(FILENAME_PATTERNS).forEach(type => {
      scores[type] = 0;
    });

    // Step 1: Check filename patterns
    for (const [type, patterns] of Object.entries(FILENAME_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerFilename)) {
          scores[type] += 30;
          result.detectedPatterns.push(`filename:${type}`);
        }
      }
    }

    // Step 2: Try to read initial text content for PDFs or text files
    let initialText = '';
    if (buffer && buffer.length > 0) {
      try {
        // For text files, read directly
        if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/csv')) {
          initialText = buffer.toString('utf-8').substring(0, 2000);
        } else {
          // For binary files try to extract readable strings
          initialText = buffer.toString('utf-8', 0, Math.min(buffer.length, 4000))
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s{3,}/g, ' ');
        }
      } catch (e) {
        // ignore
      }
    }

    // Step 3: Check content patterns against initial text
    if (initialText.length > 50) {
      for (const [type, patterns] of Object.entries(CONTENT_PATTERNS)) {
        let matches = 0;
        for (const pattern of patterns) {
          if (pattern.test(initialText)) {
            matches++;
          }
        }
        if (matches > 0) {
          scores[type] = (scores[type] || 0) + (matches * 15);
          result.detectedPatterns.push(`content:${type}(${matches})`);
        }
      }
    }

    // Step 4: Check MIME type heuristics
    if (SUPPORTED_MIME_TYPES.csv.includes(mimeType) || lowerFilename.endsWith('.csv')) {
      scores.bank_statement = (scores.bank_statement || 0) + 10;
    }

    // Step 5: Determine best match
    let bestType = 'unknown';
    let bestScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Map internal type to category
    const typeToCategory = {
      'bank_statement': ATTACHMENT_CATEGORIES.BANK_STATEMENT,
      'credit_card': ATTACHMENT_CATEGORIES.CREDIT_CARD_STATEMENT,
      'invoice': ATTACHMENT_CATEGORIES.INVOICE,
      'payslip': ATTACHMENT_CATEGORIES.PAYSLIP,
      'tax_document': ATTACHMENT_CATEGORIES.TAX_DOCUMENT,
      'insurance': ATTACHMENT_CATEGORIES.INSURANCE,
      'investment': ATTACHMENT_CATEGORIES.INVESTMENT_STATEMENT
    };

    if (bestScore >= 15) {
      result.category = typeToCategory[bestType] || ATTACHMENT_CATEGORIES.UNKNOWN;
      result.confidence = Math.min(bestScore / 100, 1.0);
      result.subType = bestType;
    }

    logger.debug(`${LOG_PREFIX} Detected type for ${filename}: ${result.category} (confidence: ${result.confidence.toFixed(2)}, patterns: ${result.detectedPatterns.join(', ')})`);
    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PDF PROCESSING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process a PDF attachment — extract text and parse transactions
   * @param {string} filepath - Path to saved PDF file
   * @param {Object} attachmentMeta - Metadata about the attachment
   * @returns {Object} Processing result with text, transactions, etc.
   */
  async processPDFAttachment(filepath, attachmentMeta) {
    if (!pdfParse) {
      logger.warn(`${LOG_PREFIX} pdf-parse not available, skipping PDF: ${filepath}`);
      return { text: null, transactions: [], error: 'pdf-parse not installed' };
    }

    try {
      logger.info(`${LOG_PREFIX} Processing PDF: ${attachmentMeta.filename}`);
      const dataBuffer = fs.readFileSync(filepath);

      const pdfData = await pdfParse(dataBuffer, {
        max: 50,  // max pages
        version: 'v2.0.550'
      });

      const text = pdfData.text || '';
      const pageCount = pdfData.numpages || 0;

      logger.info(`${LOG_PREFIX} Extracted ${text.length} chars from ${pageCount} pages of ${attachmentMeta.filename}`);

      if (text.length < 50) {
        logger.warn(`${LOG_PREFIX} Very little text extracted from PDF, may be image-based`);
        return { text, transactions: [], pageCount, note: 'Minimal text extracted — may need OCR' };
      }

      // Identify bank from content
      const bankName = this.identifyBankFromContent(text, attachmentMeta.filename, attachmentMeta.sender);

      // Extract account details
      const accountDetails = this.extractAccountDetails(text);

      // Extract transactions based on identified bank
      let transactions = [];
      if (bankName) {
        transactions = this._parseBankSpecificStatement(text, bankName);
      }

      // Fallback to generic extraction
      if (transactions.length === 0) {
        transactions = this.extractTransactionsFromText(text, bankName, attachmentMeta.category);
      }

      // Calculate summary
      const statementSummary = transactions.length > 0
        ? this.calculateStatementSummary(transactions)
        : null;

      return {
        text,
        pageCount,
        transactions,
        bankIdentified: bankName,
        accountDetails,
        statementSummary
      };
    } catch (err) {
      logger.error(`${LOG_PREFIX} PDF processing error for ${attachmentMeta.filename}: ${err.message}`);
      return { text: null, transactions: [], error: err.message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CSV PROCESSING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process a CSV attachment — parse rows as transactions
   * @param {string} filepath - Path to saved CSV file
   * @param {Object} attachmentMeta - Metadata about the attachment
   * @returns {Object} Processing result
   */
  async processCSVAttachment(filepath, attachmentMeta) {
    try {
      logger.info(`${LOG_PREFIX} Processing CSV: ${attachmentMeta.filename}`);
      const rawContent = fs.readFileSync(filepath, 'utf-8');
      const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        logger.warn(`${LOG_PREFIX} CSV has less than 2 lines: ${attachmentMeta.filename}`);
        return { text: rawContent, transactions: [], note: 'Insufficient data' };
      }

      // Detect delimiter
      const delimiter = this._detectCSVDelimiter(lines[0]);
      logger.info(`${LOG_PREFIX} CSV delimiter detected: '${delimiter}', ${lines.length} lines`);

      // Parse header
      const headers = this._parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());

      // Map header columns to standard fields
      const columnMap = this._mapCSVColumns(headers);
      logger.info(`${LOG_PREFIX} CSV column mapping: ${JSON.stringify(columnMap)}`);

      if (!columnMap.date && !columnMap.amount) {
        // Possibly bank-specific format — try alternate header row
        const altHeaders = lines.length > 1
          ? this._parseCSVLine(lines[1], delimiter).map(h => h.trim().toLowerCase())
          : [];
        const altMapping = this._mapCSVColumns(altHeaders);
        if (altMapping.date || altMapping.amount) {
          Object.assign(columnMap, altMapping);
          lines.shift(); // remove original non-header row
        }
      }

      const transactions = [];
      const bankName = this.identifyBankFromContent(rawContent, attachmentMeta.filename, attachmentMeta.sender);

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this._parseCSVLine(lines[i], delimiter);
          const txn = this._mapCSVRowToTransaction(values, columnMap, headers);
          if (txn && (txn.amount || txn.debit || txn.credit)) {
            txn.source = 'csv_attachment';
            txn.lineNumber = i + 1;
            txn.bank = bankName || 'Unknown';
            transactions.push(txn);
          }
        } catch (lineErr) {
          logger.debug(`${LOG_PREFIX} Failed to parse CSV line ${i + 1}: ${lineErr.message}`);
        }
      }

      const accountDetails = this.extractAccountDetails(rawContent);
      const statementSummary = transactions.length > 0
        ? this.calculateStatementSummary(transactions)
        : null;

      logger.info(`${LOG_PREFIX} CSV parsed: ${transactions.length} transactions from ${lines.length - 1} data lines`);

      return {
        text: rawContent.substring(0, 5000),
        transactions,
        bankIdentified: bankName,
        accountDetails,
        statementSummary,
        totalRows: lines.length - 1,
        parsedRows: transactions.length
      };
    } catch (err) {
      logger.error(`${LOG_PREFIX} CSV processing error for ${attachmentMeta.filename}: ${err.message}`);
      return { text: null, transactions: [], error: err.message };
    }
  }

  /**
   * Detect CSV delimiter from a header line
   */
  _detectCSVDelimiter(headerLine) {
    const delimiters = [',', '\t', '|', ';'];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const d of delimiters) {
      const count = (headerLine.match(new RegExp(d === '|' ? '\\|' : d, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }
    return bestDelimiter;
  }

  /**
   * Parse a single CSV line respecting quoted fields
   */
  _parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Map CSV header columns to standard transaction fields
   */
  _mapCSVColumns(headers) {
    const map = {};
    const mappings = {
      date: [/date|txn\s*date|transaction\s*date|value\s*date|posting\s*date|trans.*date/i],
      description: [/description|narration|particulars|details|transaction\s*details|remark/i],
      amount: [/amount|txn\s*amount|transaction\s*amount/i],
      debit: [/debit|withdrawal|dr|debit\s*amount|withdrawal\s*amount/i],
      credit: [/credit|deposit|cr|credit\s*amount|deposit\s*amount/i],
      balance: [/balance|closing\s*balance|available\s*balance|running\s*balance/i],
      reference: [/ref|reference|ref\s*no|txn\s*ref|utr|rrn|cheque\s*no/i],
      category: [/category|type|txn\s*type|transaction\s*type/i]
    };

    for (let i = 0; i < headers.length; i++) {
      for (const [field, patterns] of Object.entries(mappings)) {
        for (const pattern of patterns) {
          if (pattern.test(headers[i]) && !map[field]) {
            map[field] = i;
          }
        }
      }
    }
    return map;
  }

  /**
   * Map a CSV row array to a transaction object using column mapping
   */
  _mapCSVRowToTransaction(values, columnMap, headers) {
    const txn = {
      date: null,
      description: '',
      amount: 0,
      type: 'unknown',
      debit: 0,
      credit: 0,
      balance: null,
      reference: '',
      category: ''
    };

    // Date
    if (columnMap.date !== undefined && values[columnMap.date]) {
      txn.date = this._parseTransactionDate(values[columnMap.date]);
    }

    // Description
    if (columnMap.description !== undefined) {
      txn.description = (values[columnMap.description] || '').trim();
    }

    // Amount (single column)
    if (columnMap.amount !== undefined) {
      const rawAmount = this._parseAmount(values[columnMap.amount]);
      txn.amount = Math.abs(rawAmount);
      txn.type = rawAmount < 0 ? 'debit' : 'credit';
    }

    // Separate debit/credit columns
    if (columnMap.debit !== undefined) {
      txn.debit = this._parseAmount(values[columnMap.debit]);
    }
    if (columnMap.credit !== undefined) {
      txn.credit = this._parseAmount(values[columnMap.credit]);
    }

    // Resolve type from debit/credit
    if (txn.debit > 0 && txn.credit === 0) {
      txn.type = 'debit';
      txn.amount = txn.debit;
    } else if (txn.credit > 0 && txn.debit === 0) {
      txn.type = 'credit';
      txn.amount = txn.credit;
    } else if (txn.amount > 0 && txn.type === 'unknown') {
      // Already handled above
    }

    // Balance
    if (columnMap.balance !== undefined) {
      txn.balance = this._parseAmount(values[columnMap.balance]);
    }

    // Reference
    if (columnMap.reference !== undefined) {
      txn.reference = (values[columnMap.reference] || '').trim();
    }

    // Category
    if (columnMap.category !== undefined) {
      txn.category = (values[columnMap.category] || '').trim();
    }

    return (txn.date || txn.amount > 0) ? txn : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EXCEL PROCESSING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process an Excel attachment — parse as bank statement
   * @param {string} filepath - Path to saved Excel file
   * @param {Object} attachmentMeta - Metadata about the attachment
   * @returns {Object} Processing result
   */
  async processExcelAttachment(filepath, attachmentMeta) {
    if (!XLSX) {
      logger.warn(`${LOG_PREFIX} xlsx not available, skipping Excel: ${filepath}`);
      return { text: null, transactions: [], error: 'xlsx not installed' };
    }

    try {
      logger.info(`${LOG_PREFIX} Processing Excel: ${attachmentMeta.filename}`);
      const workbook = XLSX.readFile(filepath);

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { text: null, transactions: [], error: 'No sheets in workbook' };
      }

      const allTransactions = [];
      let combinedText = '';

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        const textData = XLSX.utils.sheet_to_csv(worksheet);
        combinedText += `--- Sheet: ${sheetName} ---\n${textData}\n\n`;

        if (jsonData.length === 0) continue;

        // Get headers from first row
        const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase());
        const columnMap = this._mapCSVColumns(headers);

        logger.info(`${LOG_PREFIX} Excel sheet "${sheetName}": ${jsonData.length} rows, columns mapped: ${JSON.stringify(columnMap)}`);

        for (let i = 0; i < jsonData.length; i++) {
          try {
            const row = jsonData[i];
            const values = Object.values(row);
            const txn = this._mapCSVRowToTransaction(values, columnMap, headers);
            if (txn && (txn.amount || txn.debit || txn.credit)) {
              txn.source = 'excel_attachment';
              txn.sheetName = sheetName;
              txn.lineNumber = i + 2; // +2 for header row and 1-indexing
              allTransactions.push(txn);
            }
          } catch (rowErr) {
            logger.debug(`${LOG_PREFIX} Failed to parse Excel row ${i + 2} in sheet ${sheetName}: ${rowErr.message}`);
          }
        }
      }

      const bankName = this.identifyBankFromContent(combinedText, attachmentMeta.filename, attachmentMeta.sender);
      const accountDetails = this.extractAccountDetails(combinedText);
      const statementSummary = allTransactions.length > 0
        ? this.calculateStatementSummary(allTransactions)
        : null;

      logger.info(`${LOG_PREFIX} Excel parsed: ${allTransactions.length} transactions from ${workbook.SheetNames.length} sheets`);

      return {
        text: combinedText.substring(0, 5000),
        transactions: allTransactions,
        bankIdentified: bankName,
        accountDetails,
        statementSummary,
        sheetsProcessed: workbook.SheetNames.length
      };
    } catch (err) {
      logger.error(`${LOG_PREFIX} Excel processing error for ${attachmentMeta.filename}: ${err.message}`);
      return { text: null, transactions: [], error: err.message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // IMAGE PROCESSING (OCR)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process an image attachment using OCR (Tesseract)
   * @param {string} filepath - Path to saved image file
   * @param {Object} attachmentMeta - Metadata about the attachment
   * @returns {Object} Processing result
   */
  async processImageAttachment(filepath, attachmentMeta) {
    if (!Tesseract) {
      logger.warn(`${LOG_PREFIX} Tesseract not available, skipping OCR for: ${filepath}`);
      return { text: null, transactions: [], error: 'tesseract.js not installed' };
    }

    try {
      logger.info(`${LOG_PREFIX} Running OCR on image: ${attachmentMeta.filename}`);

      const worker = await Tesseract.createWorker('eng');
      const result = await worker.recognize(filepath);
      const text = result.data ? result.data.text : '';
      await worker.terminate();

      logger.info(`${LOG_PREFIX} OCR extracted ${text.length} characters from ${attachmentMeta.filename}`);

      if (text.length < 20) {
        return { text, transactions: [], note: 'Minimal text from OCR' };
      }

      const bankName = this.identifyBankFromContent(text, attachmentMeta.filename, attachmentMeta.sender);
      const accountDetails = this.extractAccountDetails(text);
      const transactions = this.extractTransactionsFromText(text, bankName, attachmentMeta.category);
      const statementSummary = transactions.length > 0
        ? this.calculateStatementSummary(transactions)
        : null;

      return {
        text,
        transactions,
        bankIdentified: bankName,
        accountDetails,
        statementSummary,
        ocrConfidence: result.data ? result.data.confidence : 0
      };
    } catch (err) {
      logger.error(`${LOG_PREFIX} OCR error for ${attachmentMeta.filename}: ${err.message}`);
      return { text: null, transactions: [], error: err.message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEXT FILE PROCESSING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process a plain text attachment
   * @param {string} filepath - Path to saved text file
   * @param {Object} attachmentMeta - Metadata about the attachment
   * @returns {Object} Processing result
   */
  async processTextAttachment(filepath, attachmentMeta) {
    try {
      logger.info(`${LOG_PREFIX} Processing text file: ${attachmentMeta.filename}`);
      const text = fs.readFileSync(filepath, 'utf-8');

      if (text.length < 20) {
        return { text, transactions: [], note: 'Minimal content' };
      }

      const bankName = this.identifyBankFromContent(text, attachmentMeta.filename, attachmentMeta.sender);
      const accountDetails = this.extractAccountDetails(text);
      const transactions = this.extractTransactionsFromText(text, bankName, attachmentMeta.category);
      const statementSummary = transactions.length > 0
        ? this.calculateStatementSummary(transactions)
        : null;

      return {
        text: text.substring(0, 5000),
        transactions,
        bankIdentified: bankName,
        accountDetails,
        statementSummary
      };
    } catch (err) {
      logger.error(`${LOG_PREFIX} Text file processing error for ${attachmentMeta.filename}: ${err.message}`);
      return { text: null, transactions: [], error: err.message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BANK IDENTIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Identify which bank issued the statement based on content, filename, and sender
   * @param {string} text - Extracted text content
   * @param {string} filename - Attachment filename
   * @param {string} senderEmail - Sender email address
   * @returns {string|null} Bank name or null
   */
  identifyBankFromContent(text, filename, senderEmail) {
    const scores = {};

    for (const [bankName, config] of Object.entries(BANK_IDENTIFICATION)) {
      scores[bankName] = 0;

      // Check content patterns
      if (text) {
        for (const pattern of config.content) {
          if (pattern.test(text)) {
            scores[bankName] += 20;
          }
        }
      }

      // Check sender email
      if (senderEmail) {
        for (const pattern of config.senders) {
          if (pattern.test(senderEmail)) {
            scores[bankName] += 30;
          }
        }
      }

      // Check filename
      if (filename) {
        for (const pattern of config.content) {
          if (pattern.test(filename)) {
            scores[bankName] += 15;
          }
        }
      }

      // Check for IFSC prefix in content
      if (text && config.ifscPrefix) {
        const ifscPattern = new RegExp(config.ifscPrefix + '0[A-Z0-9]{6}', 'i');
        if (ifscPattern.test(text)) {
          scores[bankName] += 25;
        }
      }
    }

    // Find best match
    let bestBank = null;
    let bestScore = 0;
    for (const [bank, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestBank = bank;
      }
    }

    if (bestScore >= 15) {
      logger.info(`${LOG_PREFIX} Identified bank: ${bestBank} (score: ${bestScore})`);
      return bestBank;
    }

    // Check credit card issuers
    for (const [issuer, patterns] of Object.entries(CREDIT_CARD_ISSUERS)) {
      for (const pattern of patterns) {
        if ((text && pattern.test(text)) || (senderEmail && pattern.test(senderEmail))) {
          logger.info(`${LOG_PREFIX} Identified credit card issuer: ${issuer}`);
          return issuer;
        }
      }
    }

    // Check investment platforms
    for (const [platform, patterns] of Object.entries(INVESTMENT_PLATFORMS)) {
      for (const pattern of patterns) {
        if ((text && pattern.test(text)) || (senderEmail && pattern.test(senderEmail))) {
          logger.info(`${LOG_PREFIX} Identified investment platform: ${platform}`);
          return platform;
        }
      }
    }

    logger.debug(`${LOG_PREFIX} Could not identify bank/issuer from content`);
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EXTRACT ACCOUNT DETAILS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Extract account number, IFSC, holder name, statement period from text
   * @param {string} text - Extracted text
   * @returns {Object} Account details
   */
  extractAccountDetails(text) {
    if (!text) return null;

    const details = {
      accountNumber: null,
      maskedAccountNumber: null,
      ifscCode: null,
      branchName: null,
      holderName: null,
      panNumber: null,
      statementPeriod: null,
      statementFrom: null,
      statementTo: null,
      cardNumber: null
    };

    // Account number
    const accMatch = text.match(ACCOUNT_NUMBER_REGEX);
    if (accMatch) {
      details.accountNumber = accMatch[1];
      details.maskedAccountNumber = 'XXXX' + accMatch[1].slice(-4);
    }

    // IFSC Code
    const ifscMatch = text.match(IFSC_REGEX);
    if (ifscMatch) {
      details.ifscCode = ifscMatch[1].toUpperCase();
    }

    // PAN Number
    const panMatch = text.match(PAN_REGEX);
    if (panMatch) {
      details.panNumber = panMatch[1].toUpperCase();
    }

    // Card number (masked)
    const cardMatch = text.match(CARD_MASK_REGEX);
    if (cardMatch) {
      details.cardNumber = 'XXXX-XXXX-XXXX-' + cardMatch[1];
    }

    // Holder name patterns
    const namePatterns = [
      /(?:account\s*holder|customer\s*name|name)[:\s]+([A-Z][A-Z\s.]{2,40})/i,
      /(?:mr\.|mrs\.|ms\.|shri|smt\.)\s+([A-Z][A-Z\s.]{2,40})/i,
      /(?:dear|hi|hello)\s+([A-Z][a-zA-Z\s.]{2,30})/i
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        details.holderName = match[1].trim();
        break;
      }
    }

    // Branch name
    const branchMatch = text.match(/(?:branch)[:\s]+([A-Za-z\s,.-]{3,50})/i);
    if (branchMatch) {
      details.branchName = branchMatch[1].trim();
    }

    // Statement period
    const periodPatterns = [
      /(?:statement\s*period|period)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|[-–])\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:from)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}\s+\w{3,9}\s+\d{4})\s*(?:to|[-–])\s*(\d{1,2}\s+\w{3,9}\s+\d{4})/i
    ];
    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        details.statementFrom = match[1].trim();
        details.statementTo = match[2].trim();
        details.statementPeriod = `${match[1].trim()} to ${match[2].trim()}`;
        break;
      }
    }

    return details;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GENERIC TRANSACTION EXTRACTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Extract transactions from raw text using regex patterns
   * @param {string} text - Raw text content
   * @param {string} bankName - Identified bank name (may be null)
   * @param {string} statementType - Type of statement
   * @returns {Array} Extracted transactions
   */
  extractTransactionsFromText(text, bankName, statementType) {
    if (!text || text.length < 30) return [];

    const transactions = [];
    const lines = text.split(/\r?\n/);

    logger.info(`${LOG_PREFIX} Extracting transactions from ${lines.length} text lines (bank: ${bankName || 'unknown'})`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 10) continue;

      // Try each transaction line pattern
      for (const pattern of TRANSACTION_LINE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const txn = this._buildTransactionFromMatch(match, line, i + 1);
          if (txn) {
            txn.bank = bankName || 'Unknown';
            txn.source = 'text_extraction';
            transactions.push(txn);
          }
          break;
        }
      }

      // Fallback: look for lines with dates and amounts
      if (!transactions.find(t => t.lineNumber === i + 1)) {
        const fallbackTxn = this._tryFallbackExtraction(line, i + 1);
        if (fallbackTxn) {
          fallbackTxn.bank = bankName || 'Unknown';
          fallbackTxn.source = 'fallback_extraction';
          transactions.push(fallbackTxn);
        }
      }
    }

    // Deduplicate by date + amount + description
    const unique = this._deduplicateTransactions(transactions);

    logger.info(`${LOG_PREFIX} Extracted ${unique.length} unique transactions (${transactions.length} raw)`);
    return unique;
  }

  /**
   * Build a transaction object from a regex match
   */
  _buildTransactionFromMatch(match, rawLine, lineNumber) {
    try {
      const groups = match.slice(1);
      if (groups.length < 3) return null;

      const txn = {
        date: this._parseTransactionDate(groups[0]),
        description: (groups[1] || '').trim(),
        amount: 0,
        type: 'unknown',
        debit: 0,
        credit: 0,
        balance: null,
        reference: '',
        lineNumber,
        raw: rawLine.substring(0, 200)
      };

      // Parse amounts from remaining groups
      for (let i = 2; i < groups.length; i++) {
        if (!groups[i]) continue;

        const val = this._parseAmount(groups[i]);
        if (val === 0) {
          // Check for Dr/Cr indicator
          if (/^(dr|debit)$/i.test(groups[i])) {
            txn.type = 'debit';
          } else if (/^(cr|credit)$/i.test(groups[i])) {
            txn.type = 'credit';
          }
          continue;
        }

        if (i === groups.length - 1) {
          txn.balance = val; // Last number is usually balance
        } else if (txn.debit === 0 && txn.credit === 0) {
          // First amount column
          if (i + 1 < groups.length && groups[i + 1] && this._parseAmount(groups[i + 1]) > 0) {
            txn.debit = val;
          } else {
            txn.amount = val;
          }
        } else if (txn.debit > 0 && txn.credit === 0) {
          txn.credit = val;
        }
      }

      // Resolve type
      if (txn.debit > 0) {
        txn.type = 'debit';
        txn.amount = txn.debit;
      } else if (txn.credit > 0) {
        txn.type = 'credit';
        txn.amount = txn.credit;
      }

      return txn.amount > 0 ? txn : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fallback extraction for lines that don't match structured patterns
   */
  _tryFallbackExtraction(line, lineNumber) {
    // Must contain a date
    let dateStr = null;
    for (const datePattern of DATE_FORMATS_REGEX) {
      const match = line.match(datePattern);
      if (match) {
        dateStr = match[0];
        break;
      }
    }
    if (!dateStr) return null;

    // Must contain an amount
    const amounts = [];
    let amountMatch;
    const amountRegex = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/gi;
    while ((amountMatch = amountRegex.exec(line)) !== null) {
      amounts.push(this._parseAmount(amountMatch[1]));
    }

    // Also try plain number amounts
    if (amounts.length === 0) {
      const plainAmounts = line.match(/\b(\d{1,3}(?:,\d{2,3})*(?:\.\d{2}))\b/g);
      if (plainAmounts) {
        for (const pa of plainAmounts) {
          const val = this._parseAmount(pa);
          if (val > 0 && val < 10000000) { // Sanity check: < 1 crore
            amounts.push(val);
          }
        }
      }
    }

    if (amounts.length === 0) return null;

    // Determine type from keywords
    let type = 'unknown';
    if (/debit|withdrawn|paid|payment|purchase|transfer\s*to/i.test(line)) {
      type = 'debit';
    } else if (/credit|deposit|received|refund|transfer\s*from|salary|cashback/i.test(line)) {
      type = 'credit';
    }

    // Construct description by removing date and amounts
    let description = line
      .replace(dateStr, '')
      .replace(AMOUNT_REGEX, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .substring(0, 200);

    return {
      date: this._parseTransactionDate(dateStr),
      description,
      amount: amounts[0],
      type,
      debit: type === 'debit' ? amounts[0] : 0,
      credit: type === 'credit' ? amounts[0] : 0,
      balance: amounts.length > 1 ? amounts[amounts.length - 1] : null,
      lineNumber,
      raw: line.substring(0, 200),
      confidence: 0.5
    };
  }

  /**
   * Deduplicate transactions by date + amount + description hash
   */
  _deduplicateTransactions(transactions) {
    const seen = new Set();
    return transactions.filter(txn => {
      const key = `${txn.date || ''}_${txn.amount}_${(txn.description || '').substring(0, 30)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BANK-SPECIFIC PARSERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Route to bank-specific parser
   */
  _parseBankSpecificStatement(text, bankName) {
    switch (bankName) {
      case 'ICICI': return this.parseICICIStatement(text);
      case 'HDFC': return this.parseHDFCStatement(text);
      case 'SBI': return this.parseSBIStatement(text);
      case 'Axis': return this.parseAxisStatement(text);
      case 'Kotak': return this.parseKotakStatement(text);
      case 'PNB': return this.parsePNBStatement(text);
      case 'BOB': return this.parseBOBStatement(text);
      case 'Canara': return this.parseCanaraStatement(text);
      case 'Union': return this.parseUnionStatement(text);
      case 'IDBI': return this.parseIDBIStatement(text);
      default: return [];
    }
  }

  /**
   * Parse ICICI Bank statement text
   * Format: DD/MM/YYYY  Description  Chq/Ref  Debit  Credit  Balance
   */
  parseICICIStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    // ICICI patterns
    const iciciLinePattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(\S*)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;
    const iciciAltPattern = /^(\d{1,2}-\w{3}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(iciciLinePattern) || line.match(iciciAltPattern);
      if (match) {
        const groups = match.slice(1);
        const txn = {
          date: this._parseTransactionDate(groups[0]),
          description: (groups[1] || '').trim(),
          reference: groups.length > 3 ? (groups[2] || '').trim() : '',
          debit: 0,
          credit: 0,
          balance: 0,
          type: 'unknown',
          amount: 0,
          bank: 'ICICI',
          source: 'icici_parser',
          lineNumber: i + 1
        };

        if (groups.length === 6) {
          txn.debit = this._parseAmount(groups[3]);
          txn.credit = this._parseAmount(groups[4]);
          txn.balance = this._parseAmount(groups[5]);
        } else if (groups.length === 5) {
          txn.debit = this._parseAmount(groups[2]);
          txn.credit = this._parseAmount(groups[3]);
          txn.balance = this._parseAmount(groups[4]);
        }

        if (txn.debit > 0) {
          txn.type = 'debit';
          txn.amount = txn.debit;
        } else if (txn.credit > 0) {
          txn.type = 'credit';
          txn.amount = txn.credit;
        }

        if (txn.amount > 0) {
          transactions.push(txn);
        }
      }
    }

    logger.info(`${LOG_PREFIX} ICICI parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse HDFC Bank statement text
   * Format: DD/MM/YY  Narration  Chq/Ref  Value Dt  Withdrawal  Deposit  Closing Balance
   */
  parseHDFCStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const hdfcLinePattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(\S*)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})?\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;
    const hdfcSimplePattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(hdfcLinePattern) || line.match(hdfcSimplePattern);
      if (match) {
        const groups = match.slice(1);
        const txn = {
          date: this._parseTransactionDate(groups[0]),
          description: (groups[1] || '').trim(),
          reference: '',
          debit: 0,
          credit: 0,
          balance: 0,
          type: 'unknown',
          amount: 0,
          bank: 'HDFC',
          source: 'hdfc_parser',
          lineNumber: i + 1
        };

        if (groups.length === 7) {
          txn.reference = (groups[2] || '').trim();
          txn.debit = this._parseAmount(groups[4]);
          txn.credit = this._parseAmount(groups[5]);
          txn.balance = this._parseAmount(groups[6]);
        } else if (groups.length === 5) {
          txn.debit = this._parseAmount(groups[2]);
          txn.credit = this._parseAmount(groups[3]);
          txn.balance = this._parseAmount(groups[4]);
        }

        if (txn.debit > 0) {
          txn.type = 'debit';
          txn.amount = txn.debit;
        } else if (txn.credit > 0) {
          txn.type = 'credit';
          txn.amount = txn.credit;
        }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} HDFC parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse SBI (State Bank of India) statement text
   * Format: Txn Date  Value Date  Description  Ref No  Debit  Credit  Balance
   */
  parseSBIStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const sbiPattern = /^(\d{1,2}\s+\w{3}\s+\d{4})\s+(\d{1,2}\s+\w{3}\s+\d{4})?\s*(.+?)\s+(\S+)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;
    const sbiAltPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(\S+)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(sbiPattern) || line.match(sbiAltPattern);
      if (match) {
        const groups = match.slice(1);
        const txn = {
          date: this._parseTransactionDate(groups[0]),
          description: '',
          reference: '',
          debit: 0,
          credit: 0,
          balance: 0,
          type: 'unknown',
          amount: 0,
          bank: 'SBI',
          source: 'sbi_parser',
          lineNumber: i + 1
        };

        if (groups.length === 7) {
          txn.description = (groups[2] || '').trim();
          txn.reference = (groups[3] || '').trim();
          txn.debit = this._parseAmount(groups[4]);
          txn.credit = this._parseAmount(groups[5]);
          txn.balance = this._parseAmount(groups[6]);
        } else if (groups.length === 6) {
          txn.description = (groups[1] || '').trim();
          txn.reference = (groups[2] || '').trim();
          txn.debit = this._parseAmount(groups[3]);
          txn.credit = this._parseAmount(groups[4]);
          txn.balance = this._parseAmount(groups[5]);
        }

        if (txn.debit > 0) {
          txn.type = 'debit';
          txn.amount = txn.debit;
        } else if (txn.credit > 0) {
          txn.type = 'credit';
          txn.amount = txn.credit;
        }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} SBI parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse Axis Bank statement text
   * Format: Tran Date  Chq No  Particulars  Debit  Credit  Balance
   */
  parseAxisStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const axisPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\S*)\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;
    const axisAltPattern = /^(\d{1,2}-\w{3}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(axisPattern) || line.match(axisAltPattern);
      if (match) {
        const groups = match.slice(1);
        const txn = {
          date: this._parseTransactionDate(groups[0]),
          description: '',
          reference: '',
          debit: 0,
          credit: 0,
          balance: 0,
          type: 'unknown',
          amount: 0,
          bank: 'Axis',
          source: 'axis_parser',
          lineNumber: i + 1
        };

        if (groups.length === 6) {
          txn.reference = (groups[1] || '').trim();
          txn.description = (groups[2] || '').trim();
          txn.debit = this._parseAmount(groups[3]);
          txn.credit = this._parseAmount(groups[4]);
          txn.balance = this._parseAmount(groups[5]);
        } else if (groups.length === 5) {
          txn.description = (groups[1] || '').trim();
          txn.debit = this._parseAmount(groups[2]);
          txn.credit = this._parseAmount(groups[3]);
          txn.balance = this._parseAmount(groups[4]);
        }

        if (txn.debit > 0) {
          txn.type = 'debit';
          txn.amount = txn.debit;
        } else if (txn.credit > 0) {
          txn.type = 'credit';
          txn.amount = txn.credit;
        }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} Axis parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse Kotak Mahindra Bank statement text
   * Format: Sl.No  Date  Description  Chq/Ref  Debit  Credit  Balance
   */
  parseKotakStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const kotakPattern = /^\d*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(\S*)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;
    const kotakAltPattern = /^(\d{1,2}\s+\w{3}\s+\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(kotakPattern) || line.match(kotakAltPattern);
      if (match) {
        const groups = match.slice(1);
        const txn = {
          date: this._parseTransactionDate(groups[0]),
          description: (groups[1] || '').trim(),
          reference: groups.length >= 6 ? (groups[2] || '').trim() : '',
          debit: 0,
          credit: 0,
          balance: 0,
          type: 'unknown',
          amount: 0,
          bank: 'Kotak',
          source: 'kotak_parser',
          lineNumber: i + 1
        };

        if (groups.length === 6) {
          txn.debit = this._parseAmount(groups[3]);
          txn.credit = this._parseAmount(groups[4]);
          txn.balance = this._parseAmount(groups[5]);
        } else if (groups.length === 5) {
          txn.debit = this._parseAmount(groups[2]);
          txn.credit = this._parseAmount(groups[3]);
          txn.balance = this._parseAmount(groups[4]);
        }

        if (txn.debit > 0) {
          txn.type = 'debit';
          txn.amount = txn.debit;
        } else if (txn.credit > 0) {
          txn.type = 'credit';
          txn.amount = txn.credit;
        }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} Kotak parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse PNB (Punjab National Bank) statement text
   */
  parsePNBStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const pnbPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      const match = line.match(pnbPattern);
      if (match) {
        const txn = {
          date: this._parseTransactionDate(match[1]),
          description: (match[2] || '').trim(),
          debit: this._parseAmount(match[3]),
          credit: this._parseAmount(match[4]),
          balance: this._parseAmount(match[5]),
          type: 'unknown',
          amount: 0,
          bank: 'PNB',
          source: 'pnb_parser',
          lineNumber: i + 1
        };

        if (txn.debit > 0) { txn.type = 'debit'; txn.amount = txn.debit; }
        else if (txn.credit > 0) { txn.type = 'credit'; txn.amount = txn.credit; }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} PNB parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse Bank of Baroda statement text
   */
  parseBOBStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const bobPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(\S*)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      const match = line.match(bobPattern);
      if (match) {
        const txn = {
          date: this._parseTransactionDate(match[1]),
          description: (match[2] || '').trim(),
          reference: (match[3] || '').trim(),
          debit: this._parseAmount(match[4]),
          credit: this._parseAmount(match[5]),
          balance: this._parseAmount(match[6]),
          type: 'unknown',
          amount: 0,
          bank: 'BOB',
          source: 'bob_parser',
          lineNumber: i + 1
        };

        if (txn.debit > 0) { txn.type = 'debit'; txn.amount = txn.debit; }
        else if (txn.credit > 0) { txn.type = 'credit'; txn.amount = txn.credit; }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} BOB parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse Canara Bank statement text
   */
  parseCanaraStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const canaraPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|DR|CR)\s+([\d,]+\.\d{2})\s*$/i;
    const canaraAltPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      let match = line.match(canaraPattern);
      if (match) {
        const amount = this._parseAmount(match[3]);
        const isDr = /dr/i.test(match[4]);
        transactions.push({
          date: this._parseTransactionDate(match[1]),
          description: (match[2] || '').trim(),
          debit: isDr ? amount : 0,
          credit: isDr ? 0 : amount,
          balance: this._parseAmount(match[5]),
          type: isDr ? 'debit' : 'credit',
          amount,
          bank: 'Canara',
          source: 'canara_parser',
          lineNumber: i + 1
        });
        continue;
      }

      match = line.match(canaraAltPattern);
      if (match) {
        const txn = {
          date: this._parseTransactionDate(match[1]),
          description: (match[2] || '').trim(),
          debit: this._parseAmount(match[3]),
          credit: this._parseAmount(match[4]),
          balance: this._parseAmount(match[5]),
          type: 'unknown',
          amount: 0,
          bank: 'Canara',
          source: 'canara_parser',
          lineNumber: i + 1
        };
        if (txn.debit > 0) { txn.type = 'debit'; txn.amount = txn.debit; }
        else if (txn.credit > 0) { txn.type = 'credit'; txn.amount = txn.credit; }
        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} Canara parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse Union Bank of India statement text
   */
  parseUnionStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const unionPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      const match = line.match(unionPattern);
      if (match) {
        const txn = {
          date: this._parseTransactionDate(match[1]),
          description: (match[2] || '').trim(),
          debit: this._parseAmount(match[3]),
          credit: this._parseAmount(match[4]),
          balance: this._parseAmount(match[5]),
          type: 'unknown',
          amount: 0,
          bank: 'Union',
          source: 'union_parser',
          lineNumber: i + 1
        };

        if (txn.debit > 0) { txn.type = 'debit'; txn.amount = txn.debit; }
        else if (txn.credit > 0) { txn.type = 'credit'; txn.amount = txn.credit; }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} Union parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse IDBI Bank statement text
   */
  parseIDBIStatement(text) {
    const transactions = [];
    const lines = text.split(/\r?\n/);

    const idbiPattern = /^\d*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})?\s*(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 15) continue;

      const match = line.match(idbiPattern);
      if (match) {
        const txn = {
          date: this._parseTransactionDate(match[1]),
          description: (match[3] || '').trim(),
          debit: this._parseAmount(match[4]),
          credit: this._parseAmount(match[5]),
          balance: this._parseAmount(match[6]),
          type: 'unknown',
          amount: 0,
          bank: 'IDBI',
          source: 'idbi_parser',
          lineNumber: i + 1
        };

        if (txn.debit > 0) { txn.type = 'debit'; txn.amount = txn.debit; }
        else if (txn.credit > 0) { txn.type = 'credit'; txn.amount = txn.credit; }

        if (txn.amount > 0) transactions.push(txn);
      }
    }

    logger.info(`${LOG_PREFIX} IDBI parser extracted ${transactions.length} transactions`);
    return transactions;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREDIT CARD STATEMENT PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse a credit card statement
   * @param {string} text - Statement text
   * @param {string} issuer - Card issuer name
   * @returns {Object} Parsed statement with transactions and summary
   */
  parseCreditCardStatement(text, issuer) {
    if (!text) return { transactions: [], summary: null };

    const lines = text.split(/\r?\n/);
    const transactions = [];
    const summary = {
      issuer: issuer || 'Unknown',
      cardNumber: null,
      statementDate: null,
      dueDate: null,
      totalDue: null,
      minimumDue: null,
      creditLimit: null,
      availableCredit: null,
      rewardPoints: null,
      previousBalance: null,
      paymentsReceived: null,
      newCharges: null
    };

    // Extract summary fields
    const totalDueMatch = text.match(/(?:total\s*(?:amount\s*)?due|total\s*outstanding)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (totalDueMatch) summary.totalDue = this._parseAmount(totalDueMatch[1]);

    const minDueMatch = text.match(/(?:minimum\s*(?:amount\s*)?due|min\.?\s*due)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (minDueMatch) summary.minimumDue = this._parseAmount(minDueMatch[1]);

    const dueDateMatch = text.match(/(?:payment\s*due\s*date|due\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w{3,9}\s+\d{4})/i);
    if (dueDateMatch) summary.dueDate = dueDateMatch[1].trim();

    const stmtDateMatch = text.match(/(?:statement\s*date|billing\s*date|statement\s*generated)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w{3,9}\s+\d{4})/i);
    if (stmtDateMatch) summary.statementDate = stmtDateMatch[1].trim();

    const creditLimitMatch = text.match(/(?:credit\s*limit|total\s*credit\s*limit)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (creditLimitMatch) summary.creditLimit = this._parseAmount(creditLimitMatch[1]);

    const availCreditMatch = text.match(/(?:available\s*credit|available\s*limit)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (availCreditMatch) summary.availableCredit = this._parseAmount(availCreditMatch[1]);

    const rewardMatch = text.match(/(?:reward\s*points?|loyalty\s*points?)[:\s]*([\d,]+)/i);
    if (rewardMatch) summary.rewardPoints = parseInt(rewardMatch[1].replace(/,/g, ''));

    const cardMatch = text.match(CARD_MASK_REGEX);
    if (cardMatch) summary.cardNumber = 'XXXX-XXXX-XXXX-' + cardMatch[1];

    const prevBalMatch = text.match(/(?:previous\s*balance|opening\s*balance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (prevBalMatch) summary.previousBalance = this._parseAmount(prevBalMatch[1]);

    const paymentsMatch = text.match(/(?:payments?\s*received|payments?\s*credits?)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (paymentsMatch) summary.paymentsReceived = this._parseAmount(paymentsMatch[1]);

    // Parse individual transactions
    // CC statements typically: DD/MM/YYYY  Description  Amount (Dr/Cr)
    const ccLinePattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|DR|CR)?\s*$/i;
    const ccAltPattern = /^(\d{1,2}\s+\w{3}\s+\d{2,4})\s+(.+?)\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)\s*(Dr|Cr)?\s*$/i;
    const ccAmountOnlyPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})?\s*(.+?)\s+([\d,]+\.\d{2})\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 12) continue;

      let match = line.match(ccLinePattern) || line.match(ccAltPattern) || line.match(ccAmountOnlyPattern);
      if (match) {
        const groups = match.slice(1).filter(g => g !== undefined);
        const dateStr = groups[0];
        let description = '';
        let amountStr = '';
        let typeIndicator = '';

        if (groups.length >= 3) {
          // Find description and amount from groups
          for (let g = 1; g < groups.length; g++) {
            if (/^[\d,]+\.\d{2}$/.test(groups[g])) {
              amountStr = groups[g];
            } else if (/^(Dr|Cr|DR|CR)$/i.test(groups[g])) {
              typeIndicator = groups[g];
            } else if (!description && groups[g].length > 2) {
              description = groups[g].trim();
            }
          }
        }

        if (!amountStr) continue;

        const amount = this._parseAmount(amountStr);
        if (amount <= 0) continue;

        // In CC statements, charges are typically debits unless marked Cr
        let type = 'debit';
        if (/cr/i.test(typeIndicator) || /refund|reversal|cashback|credit|payment\s*received/i.test(description)) {
          type = 'credit';
        }

        transactions.push({
          date: this._parseTransactionDate(dateStr),
          description,
          amount,
          type,
          debit: type === 'debit' ? amount : 0,
          credit: type === 'credit' ? amount : 0,
          bank: issuer || 'Unknown',
          source: 'cc_statement_parser',
          lineNumber: i + 1
        });
      }
    }

    // Calculate new charges
    const totalCharges = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    summary.newCharges = totalCharges;

    logger.info(`${LOG_PREFIX} Credit card parser (${issuer}): ${transactions.length} transactions, total due: ${summary.totalDue || 'unknown'}`);

    return { transactions, summary };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPI RECEIPT PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse UPI transaction receipt text
   * @param {string} text - Receipt text
   * @returns {Object} Parsed UPI transaction
   */
  parseUPIReceipt(text) {
    if (!text) return null;

    const upiTxn = {
      type: 'upi',
      utrNumber: null,
      payerVPA: null,
      payeeVPA: null,
      payeeName: null,
      amount: null,
      date: null,
      status: null,
      referenceId: null,
      bank: null,
      description: null
    };

    // UTR / Transaction ID
    const utrMatch = text.match(/(?:utr|transaction\s*id|txn\s*id|ref(?:erence)?\s*(?:no|id|number)?)[:\s]*([A-Z0-9]{12,22})/i);
    if (utrMatch) upiTxn.utrNumber = utrMatch[1];

    // RRN
    const rrnMatch = text.match(/(?:rrn|rrn\s*no)[:\s]*(\d{12})/i);
    if (rrnMatch) upiTxn.referenceId = rrnMatch[1];

    // VPAs
    const vpas = text.match(UPI_REGEX);
    if (vpas && vpas.length >= 1) {
      upiTxn.payerVPA = vpas[0];
      if (vpas.length >= 2) upiTxn.payeeVPA = vpas[1];
    }

    // Payee name
    const payeeMatch = text.match(/(?:paid\s*to|payee|beneficiary|merchant)[:\s]+([A-Za-z\s.]{2,40})/i);
    if (payeeMatch) upiTxn.payeeName = payeeMatch[1].trim();

    // Amount
    const amountMatch = text.match(/(?:amount|rs\.?|inr|₹)[:\s]*([\d,]+(?:\.\d{2})?)/i);
    if (amountMatch) upiTxn.amount = this._parseAmount(amountMatch[1]);

    // Date
    for (const datePattern of DATE_FORMATS_REGEX) {
      const dateMatch = text.match(datePattern);
      if (dateMatch) {
        upiTxn.date = this._parseTransactionDate(dateMatch[0]);
        break;
      }
    }

    // Status
    if (/success|completed|approved/i.test(text)) {
      upiTxn.status = 'success';
    } else if (/failed|declined|rejected/i.test(text)) {
      upiTxn.status = 'failed';
    } else if (/pending|processing/i.test(text)) {
      upiTxn.status = 'pending';
    }

    return upiTxn.amount ? upiTxn : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INVESTMENT STATEMENT PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse investment/portfolio statements
   * @param {string} text - Statement text
   * @param {string} platform - Investment platform name
   * @returns {Object} Parsed investment data
   */
  parseInvestmentStatement(text, platform) {
    if (!text) return { holdings: [], summary: null };

    const holdings = [];
    const summary = {
      platform: platform || 'Unknown',
      totalInvested: null,
      currentValue: null,
      totalReturns: null,
      returnsPercentage: null,
      asOfDate: null,
      folioNumbers: [],
      schemes: []
    };

    // Extract summary
    const investedMatch = text.match(/(?:total\s*invest(?:ed|ment)|cost\s*value)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (investedMatch) summary.totalInvested = this._parseAmount(investedMatch[1]);

    const currentMatch = text.match(/(?:current\s*value|market\s*value|present\s*value)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (currentMatch) summary.currentValue = this._parseAmount(currentMatch[1]);

    const returnsMatch = text.match(/(?:total\s*returns?|gain|profit)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (returnsMatch) summary.totalReturns = this._parseAmount(returnsMatch[1]);

    const pctMatch = text.match(/(?:returns?|growth)\s*[:\s]*([+-]?\d+\.?\d*)\s*%/i);
    if (pctMatch) summary.returnsPercentage = parseFloat(pctMatch[1]);

    // Extract folio numbers
    const folioMatches = text.match(/folio\s*(?:no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/gi);
    if (folioMatches) {
      for (const fm of folioMatches) {
        const folioNum = fm.match(/([A-Z0-9\-\/]+)$/i);
        if (folioNum && !summary.folioNumbers.includes(folioNum[1])) {
          summary.folioNumbers.push(folioNum[1]);
        }
      }
    }

    // Parse mutual fund holdings
    const lines = text.split(/\r?\n/);
    const holdingPattern = /(.+?)\s+(?:folio[:\s]*(\S+))?\s*(?:Nav|NAV)[:\s]*(?:Rs\.?|₹)?\s*([\d.]+)\s+(?:units?)[:\s]*([\d.]+)\s+(?:value|current)[:\s]*(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const hMatch = line.match(holdingPattern);
      if (hMatch) {
        holdings.push({
          schemeName: hMatch[1].trim(),
          folioNumber: (hMatch[2] || '').trim(),
          nav: parseFloat(hMatch[3]),
          units: parseFloat(hMatch[4]),
          currentValue: this._parseAmount(hMatch[5]),
          lineNumber: i + 1
        });
        if (!summary.schemes.includes(hMatch[1].trim())) {
          summary.schemes.push(hMatch[1].trim());
        }
      }
    }

    // Contract note parsing (for Zerodha/Upstox/AngelOne)
    const tradePattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(BUY|SELL)\s+(.+?)\s+(\d+)\s+(?:@|at)\s*(?:Rs\.?|₹)?\s*([\d.]+)\s+(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tMatch = line.match(tradePattern);
      if (tMatch) {
        holdings.push({
          date: this._parseTransactionDate(tMatch[1]),
          action: tMatch[2].toUpperCase(),
          instrument: tMatch[3].trim(),
          quantity: parseInt(tMatch[4]),
          price: parseFloat(tMatch[5]),
          totalValue: this._parseAmount(tMatch[6]),
          type: 'trade',
          lineNumber: i + 1
        });
      }
    }

    logger.info(`${LOG_PREFIX} Investment parser (${platform}): ${holdings.length} holdings/trades`);
    return { holdings, summary };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAYSLIP PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse payslip / salary slip
   * @param {string} text - Payslip text
   * @returns {Object} Parsed payslip data
   */
  parsePayslip(text) {
    if (!text) return null;

    const payslip = {
      employeeName: null,
      employeeId: null,
      designation: null,
      department: null,
      month: null,
      year: null,
      earnings: {},
      deductions: {},
      grossSalary: null,
      totalDeductions: null,
      netSalary: null,
      companyName: null
    };

    // Employee details
    const empIdMatch = text.match(/(?:employee\s*(?:id|code|no\.?|number))[:\s]*([A-Z0-9\-]+)/i);
    if (empIdMatch) payslip.employeeId = empIdMatch[1];

    const empNameMatch = text.match(/(?:employee\s*name|name\s*of\s*employee)[:\s]+([A-Za-z\s.]{2,40})/i);
    if (empNameMatch) payslip.employeeName = empNameMatch[1].trim();

    const deptMatch = text.match(/(?:department|dept)[:\s]+([A-Za-z\s&]{2,40})/i);
    if (deptMatch) payslip.department = deptMatch[1].trim();

    const desigMatch = text.match(/(?:designation|position|role)[:\s]+([A-Za-z\s.&]{2,40})/i);
    if (desigMatch) payslip.designation = desigMatch[1].trim();

    // Month/Year
    const monthMatch = text.match(/(?:month|pay\s*period|salary\s*for)[:\s]*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{1,2}[\/\-]\d{4})/i);
    if (monthMatch) {
      const periodStr = monthMatch[1];
      const monthYearMatch = periodStr.match(/(\w+)\s+(\d{4})/);
      if (monthYearMatch) {
        payslip.month = monthYearMatch[1];
        payslip.year = parseInt(monthYearMatch[2]);
      }
    }

    // Earnings
    const earningsMap = {
      'Basic Salary': /(?:basic\s*(?:salary|pay))[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'HRA': /(?:hra|house\s*rent\s*allowance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Dearness Allowance': /(?:da|dearness\s*allowance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Conveyance': /(?:conveyance|transport\s*allowance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Medical Allowance': /(?:medical\s*allowance|medical\s*reimbursement)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Special Allowance': /(?:special\s*allowance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Leave Travel Allowance': /(?:lta|leave\s*travel\s*allowance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Performance Bonus': /(?:bonus|performance\s*bonus|incentive)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i
    };

    for (const [name, pattern] of Object.entries(earningsMap)) {
      const match = text.match(pattern);
      if (match) payslip.earnings[name] = this._parseAmount(match[1]);
    }

    // Deductions
    const deductionsMap = {
      'Provident Fund': /(?:pf|provident\s*fund|epf)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Professional Tax': /(?:pt|professional\s*tax)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Income Tax': /(?:tds|income\s*tax|tax\s*deducted)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'ESI': /(?:esi|employee\s*state\s*insurance)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Loan Recovery': /(?:loan\s*recovery|loan\s*emi)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      'Other Deductions': /(?:other\s*deductions?)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i
    };

    for (const [name, pattern] of Object.entries(deductionsMap)) {
      const match = text.match(pattern);
      if (match) payslip.deductions[name] = this._parseAmount(match[1]);
    }

    // Summary amounts
    const grossMatch = text.match(/(?:gross\s*(?:salary|earnings?|pay))[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (grossMatch) payslip.grossSalary = this._parseAmount(grossMatch[1]);

    const totalDeductionsMatch = text.match(/(?:total\s*deductions?)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (totalDeductionsMatch) payslip.totalDeductions = this._parseAmount(totalDeductionsMatch[1]);

    const netMatch = text.match(/(?:net\s*(?:salary|pay|amount)|take\s*home)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (netMatch) payslip.netSalary = this._parseAmount(netMatch[1]);

    // Calculate totals if not extracted
    if (!payslip.grossSalary) {
      payslip.grossSalary = Object.values(payslip.earnings).reduce((s, v) => s + v, 0);
    }
    if (!payslip.totalDeductions) {
      payslip.totalDeductions = Object.values(payslip.deductions).reduce((s, v) => s + v, 0);
    }
    if (!payslip.netSalary && payslip.grossSalary > 0) {
      payslip.netSalary = payslip.grossSalary - payslip.totalDeductions;
    }

    logger.info(`${LOG_PREFIX} Payslip parsed: gross=${payslip.grossSalary}, net=${payslip.netSalary}`);
    return payslip;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INSURANCE DOCUMENT PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse insurance document/policy
   * @param {string} text - Document text
   * @returns {Object} Parsed insurance details
   */
  parseInsuranceDocument(text) {
    if (!text) return null;

    const insurance = {
      policyNumber: null,
      policyType: null,
      insurer: null,
      insuredName: null,
      sumAssured: null,
      premiumAmount: null,
      premiumFrequency: null,
      startDate: null,
      maturityDate: null,
      nominee: null,
      planName: null,
      policyStatus: null
    };

    const policyNumMatch = text.match(/(?:policy\s*(?:no\.?|number))[:\s]*([A-Z0-9\-\/]+)/i);
    if (policyNumMatch) insurance.policyNumber = policyNumMatch[1];

    const sumMatch = text.match(/(?:sum\s*(?:assured|insured)|cover\s*amount|death\s*benefit)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (sumMatch) insurance.sumAssured = this._parseAmount(sumMatch[1]);

    const premiumMatch = text.match(/(?:premium\s*(?:amount)?)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (premiumMatch) insurance.premiumAmount = this._parseAmount(premiumMatch[1]);

    const freqMatch = text.match(/(?:premium\s*(?:payment\s*)?(?:mode|frequency))[:\s]*(\w+)/i);
    if (freqMatch) insurance.premiumFrequency = freqMatch[1].trim();

    const planMatch = text.match(/(?:plan\s*name|product\s*name|scheme)[:\s]+(.{3,60})/i);
    if (planMatch) insurance.planName = planMatch[1].trim();

    const nomineeMatch = text.match(/(?:nominee)[:\s]+([A-Za-z\s.]{2,40})/i);
    if (nomineeMatch) insurance.nominee = nomineeMatch[1].trim();

    const insuredMatch = text.match(/(?:insured\s*name|life\s*assured|policyholder)[:\s]+([A-Za-z\s.]{2,40})/i);
    if (insuredMatch) insurance.insuredName = insuredMatch[1].trim();

    // Determine policy type
    if (/term\s*(plan|insurance|life)/i.test(text)) insurance.policyType = 'Term Life';
    else if (/health\s*insurance|mediclaim|medical/i.test(text)) insurance.policyType = 'Health';
    else if (/motor\s*insurance|vehicle|car|bike/i.test(text)) insurance.policyType = 'Motor';
    else if (/endowment/i.test(text)) insurance.policyType = 'Endowment';
    else if (/ulip/i.test(text)) insurance.policyType = 'ULIP';
    else if (/whole\s*life/i.test(text)) insurance.policyType = 'Whole Life';
    else if (/travel\s*insurance/i.test(text)) insurance.policyType = 'Travel';
    else if (/home\s*insurance/i.test(text)) insurance.policyType = 'Home';

    // Identify insurer
    const insurerPatterns = {
      'LIC': /lic|life\s*insurance\s*corporation/i,
      'HDFC Life': /hdfc\s*(?:standard\s*)?life/i,
      'ICICI Prudential': /icici\s*prudential/i,
      'SBI Life': /sbi\s*life/i,
      'Max Life': /max\s*life/i,
      'Bajaj Allianz': /bajaj\s*allianz/i,
      'Tata AIA': /tata\s*aia/i,
      'Kotak Life': /kotak\s*(?:mahindra\s*)?life/i,
      'Star Health': /star\s*health/i,
      'Care Health': /care\s*health|religare/i,
      'HDFC Ergo': /hdfc\s*ergo/i,
      'ICICI Lombard': /icici\s*lombard/i,
      'New India Assurance': /new\s*india\s*assurance/i
    };

    for (const [name, pattern] of Object.entries(insurerPatterns)) {
      if (pattern.test(text)) {
        insurance.insurer = name;
        break;
      }
    }

    logger.info(`${LOG_PREFIX} Insurance doc parsed: ${insurance.policyType || 'unknown'} from ${insurance.insurer || 'unknown'}`);
    return insurance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TAX DOCUMENT PARSER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse Form 16 / tax document
   * @param {string} text - Document text
   * @returns {Object} Parsed tax details
   */
  parseTaxDocument(text) {
    if (!text) return null;

    const taxDoc = {
      formType: null,
      assessmentYear: null,
      financialYear: null,
      panNumber: null,
      tanNumber: null,
      employerName: null,
      employeeName: null,
      grossSalary: null,
      totalIncome: null,
      taxDeducted: null,
      totalTaxPayable: null,
      standardDeduction: null,
      section80C: null,
      section80D: null,
      hraExemption: null,
      netTaxableIncome: null
    };

    // Identify form type
    if (/form\s*(?:no\.?\s*)?16\b/i.test(text)) taxDoc.formType = 'Form 16';
    else if (/form\s*26\s*as/i.test(text)) taxDoc.formType = 'Form 26AS';
    else if (/annual\s*information\s*statement/i.test(text)) taxDoc.formType = 'AIS';
    else if (/income\s*tax\s*return/i.test(text)) taxDoc.formType = 'ITR';

    const ayMatch = text.match(/(?:assessment\s*year)[:\s]*(\d{4}[\-\s]*\d{2,4})/i);
    if (ayMatch) taxDoc.assessmentYear = ayMatch[1].trim();

    const fyMatch = text.match(/(?:financial\s*year|fy)[:\s]*(\d{4}[\-\s]*\d{2,4})/i);
    if (fyMatch) taxDoc.financialYear = fyMatch[1].trim();

    const panMatch = text.match(PAN_REGEX);
    if (panMatch) taxDoc.panNumber = panMatch[1].toUpperCase();

    const tanMatch = text.match(/(?:tan)[:\s]*([A-Z]{4}\d{5}[A-Z])/i);
    if (tanMatch) taxDoc.tanNumber = tanMatch[1].toUpperCase();

    const employerMatch = text.match(/(?:employer|deductor|company)\s*(?:name)?[:\s]+(.{3,60})/i);
    if (employerMatch) taxDoc.employerName = employerMatch[1].trim();

    // Financial figures
    const grossMatch = text.match(/(?:gross\s*(?:total\s*)?(?:salary|income))[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (grossMatch) taxDoc.grossSalary = this._parseAmount(grossMatch[1]);

    const totalIncomeMatch = text.match(/(?:total\s*income|total\s*taxable\s*income)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (totalIncomeMatch) taxDoc.totalIncome = this._parseAmount(totalIncomeMatch[1]);

    const tdsMatch = text.match(/(?:tax\s*deducted|tds|tax\s*collected)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (tdsMatch) taxDoc.taxDeducted = this._parseAmount(tdsMatch[1]);

    const sec80cMatch = text.match(/(?:section\s*80\s*c|80c)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (sec80cMatch) taxDoc.section80C = this._parseAmount(sec80cMatch[1]);

    const sec80dMatch = text.match(/(?:section\s*80\s*d|80d)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (sec80dMatch) taxDoc.section80D = this._parseAmount(sec80dMatch[1]);

    const stdDeductionMatch = text.match(/(?:standard\s*deduction)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (stdDeductionMatch) taxDoc.standardDeduction = this._parseAmount(stdDeductionMatch[1]);

    logger.info(`${LOG_PREFIX} Tax document parsed: ${taxDoc.formType || 'unknown'}, AY: ${taxDoc.assessmentYear || 'unknown'}`);
    return taxDoc;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATEMENT SUMMARY CALCULATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculate statement summary from transactions
   * @param {Array} transactions - List of parsed transactions
   * @returns {Object} Statement summary
   */
  calculateStatementSummary(transactions) {
    if (!transactions || transactions.length === 0) return null;

    const summary = {
      totalTransactions: transactions.length,
      totalCredits: 0,
      totalDebits: 0,
      creditCount: 0,
      debitCount: 0,
      unknownCount: 0,
      netFlow: 0,
      openingBalance: null,
      closingBalance: null,
      averageTransaction: 0,
      largestCredit: null,
      largestDebit: null,
      smallestTransaction: null,
      dateRange: { from: null, to: null },
      monthlyBreakdown: {},
      categoryBreakdown: {}
    };

    let minDate = null;
    let maxDate = null;

    for (const txn of transactions) {
      const amount = txn.amount || 0;

      if (txn.type === 'credit') {
        summary.totalCredits += amount;
        summary.creditCount++;
        if (!summary.largestCredit || amount > summary.largestCredit.amount) {
          summary.largestCredit = { amount, description: txn.description, date: txn.date };
        }
      } else if (txn.type === 'debit') {
        summary.totalDebits += amount;
        summary.debitCount++;
        if (!summary.largestDebit || amount > summary.largestDebit.amount) {
          summary.largestDebit = { amount, description: txn.description, date: txn.date };
        }
      } else {
        summary.unknownCount++;
      }

      // Track smallest
      if (amount > 0 && (!summary.smallestTransaction || amount < summary.smallestTransaction.amount)) {
        summary.smallestTransaction = { amount, description: txn.description, date: txn.date };
      }

      // Track balance for opening/closing
      if (txn.balance != null) {
        if (summary.openingBalance === null) {
          // First transaction balance — approximate opening balance
          if (txn.type === 'debit') {
            summary.openingBalance = txn.balance + amount;
          } else if (txn.type === 'credit') {
            summary.openingBalance = txn.balance - amount;
          } else {
            summary.openingBalance = txn.balance;
          }
        }
        summary.closingBalance = txn.balance;
      }

      // Date tracking
      if (txn.date) {
        const d = new Date(txn.date);
        if (!isNaN(d.getTime())) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;

          // Monthly breakdown
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!summary.monthlyBreakdown[monthKey]) {
            summary.monthlyBreakdown[monthKey] = { credits: 0, debits: 0, count: 0 };
          }
          summary.monthlyBreakdown[monthKey].count++;
          if (txn.type === 'credit') summary.monthlyBreakdown[monthKey].credits += amount;
          else if (txn.type === 'debit') summary.monthlyBreakdown[monthKey].debits += amount;
        }
      }

      // Category breakdown
      const cat = txn.category || this._categorizeTransaction(txn.description);
      if (!summary.categoryBreakdown[cat]) {
        summary.categoryBreakdown[cat] = { total: 0, count: 0 };
      }
      summary.categoryBreakdown[cat].total += amount;
      summary.categoryBreakdown[cat].count++;
    }

    summary.netFlow = summary.totalCredits - summary.totalDebits;
    summary.averageTransaction = transactions.length > 0
      ? (summary.totalCredits + summary.totalDebits) / transactions.length
      : 0;

    if (minDate) summary.dateRange.from = minDate.toISOString().split('T')[0];
    if (maxDate) summary.dateRange.to = maxDate.toISOString().split('T')[0];

    // Round amounts
    summary.totalCredits = Math.round(summary.totalCredits * 100) / 100;
    summary.totalDebits = Math.round(summary.totalDebits * 100) / 100;
    summary.netFlow = Math.round(summary.netFlow * 100) / 100;
    summary.averageTransaction = Math.round(summary.averageTransaction * 100) / 100;

    logger.info(
      `${LOG_PREFIX} Statement summary: ${summary.totalTransactions} txns, ` +
      `credits: ₹${summary.totalCredits.toLocaleString()}, ` +
      `debits: ₹${summary.totalDebits.toLocaleString()}, ` +
      `net: ₹${summary.netFlow.toLocaleString()}`
    );

    return summary;
  }

  /**
   * Categorize a transaction based on description keywords
   */
  _categorizeTransaction(description) {
    if (!description) return 'uncategorized';

    const desc = description.toLowerCase();

    const categories = {
      'salary': /salary|payroll|monthly\s*pay|stipend|wages/,
      'rent': /rent|house\s*rent|landlord/,
      'utilities': /electric|water\s*bill|gas\s*bill|broadband|internet|wifi|phone\s*bill|mobile\s*recharge/,
      'food': /swiggy|zomato|uber\s*eats|food|restaurant|cafe|dining|grofers|bigbasket|blinkit/,
      'shopping': /amazon|flipkart|myntra|ajio|nykaa|meesho|snapdeal|shopping/,
      'travel': /uber|ola|rapido|makemytrip|goibibo|irctc|train|flight|hotel|booking/,
      'healthcare': /hospital|doctor|pharma|medical|apollo|medplus|1mg|netmeds/,
      'insurance': /insurance|premium|lic|policy/,
      'investment': /mutual\s*fund|sip|mf|zerodha|groww|stock|shares|nse|bse/,
      'emi': /emi|loan\s*repayment|instalment|installment/,
      'transfer': /neft|rtgs|imps|upi|transfer|sent\s*to|received\s*from/,
      'atm': /atm|cash\s*withdrawal|atm\s*withdrawal/,
      'entertainment': /netflix|hotstar|prime\s*video|spotify|youtube|subscription/,
      'education': /school|college|university|tuition|course|udemy|coursera/,
      'tax': /income\s*tax|gst|tds|advance\s*tax/,
      'refund': /refund|reversal|cashback/,
      'interest': /interest\s*(?:credit|earned|paid)|int\s*(?:cr|dr)/
    };

    for (const [cat, pattern] of Object.entries(categories)) {
      if (pattern.test(desc)) return cat;
    }

    return 'uncategorized';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ATTACHMENT REPORT GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a comprehensive report for processed attachments
   * @param {Array} processedAttachments - Array of processed attachment results
   * @returns {Object} Comprehensive report
   */
  generateAttachmentReport(processedAttachments) {
    if (!processedAttachments || processedAttachments.length === 0) {
      return { summary: 'No attachments processed', details: [] };
    }

    const report = {
      generatedAt: new Date().toISOString(),
      totalEmails: processedAttachments.length,
      totalAttachments: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalTransactions: 0,
      banksIdentified: [],
      categoryBreakdown: {},
      transactionsSummary: null,
      processingTime: 0,
      errors: [],
      details: []
    };

    const allTransactions = [];
    const bankSet = new Set();

    for (const result of processedAttachments) {
      report.totalAttachments += result.totalAttachments || 0;
      report.totalProcessed += result.processedCount || 0;
      report.totalFailed += result.failedCount || 0;
      report.totalSkipped += result.skippedCount || 0;
      report.processingTime += result.processingTimeMs || 0;

      if (result.bankIdentified) bankSet.add(result.bankIdentified);

      if (result.extractedTransactions) {
        allTransactions.push(...result.extractedTransactions);
        report.totalTransactions += result.extractedTransactions.length;
      }

      if (result.errors) report.errors.push(...result.errors);

      // Category breakdown
      if (result.attachments) {
        for (const att of result.attachments) {
          const cat = att.category || ATTACHMENT_CATEGORIES.UNKNOWN;
          if (!report.categoryBreakdown[cat]) {
            report.categoryBreakdown[cat] = { count: 0, processed: 0, failed: 0 };
          }
          report.categoryBreakdown[cat].count++;
          if (att.status === 'processed') report.categoryBreakdown[cat].processed++;
          else if (att.status === 'failed') report.categoryBreakdown[cat].failed++;
        }
      }

      report.details.push({
        messageId: result.messageId,
        subject: result.emailSubject,
        sender: result.sender,
        attachmentCount: result.totalAttachments,
        processedCount: result.processedCount,
        transactionCount: (result.extractedTransactions || []).length,
        bank: result.bankIdentified,
        processingTimeMs: result.processingTimeMs
      });
    }

    report.banksIdentified = Array.from(bankSet);

    if (allTransactions.length > 0) {
      report.transactionsSummary = this.calculateStatementSummary(allTransactions);
    }

    report.summary = `Processed ${report.totalProcessed}/${report.totalAttachments} attachments ` +
      `from ${report.totalEmails} emails. Extracted ${report.totalTransactions} transactions ` +
      `from ${report.banksIdentified.length} banks. ` +
      `(${report.totalFailed} failed, ${report.totalSkipped} skipped, ${report.processingTime}ms total)`;

    logger.info(`${LOG_PREFIX} Report generated: ${report.summary}`);
    return report;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP OLD ATTACHMENTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Clean up old attachment files for a user
   * @param {string} userId - User identifier
   * @param {number} daysToKeep - Number of days to keep (default: 90)
   * @returns {Object} Cleanup result
   */
  cleanupOldAttachments(userId, daysToKeep = 90) {
    const result = {
      userId,
      daysToKeep,
      filesDeleted: 0,
      bytesFreed: 0,
      directoriesChecked: 0,
      errors: []
    };

    try {
      const userDir = path.join(UPLOAD_BASE_DIR, userId);
      if (!fs.existsSync(userDir)) {
        logger.info(`${LOG_PREFIX} No upload directory for user ${userId}`);
        return result;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffMs = cutoffDate.getTime();

      logger.info(`${LOG_PREFIX} Cleaning attachments for ${userId} older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`);

      this._cleanupDirectory(userDir, cutoffMs, result);

      logger.info(
        `${LOG_PREFIX} Cleanup complete for ${userId}: ${result.filesDeleted} files deleted, ` +
        `${(result.bytesFreed / 1024).toFixed(2)} KB freed, ${result.directoriesChecked} directories checked`
      );

      return result;
    } catch (err) {
      logger.error(`${LOG_PREFIX} Cleanup error for ${userId}: ${err.message}`);
      result.errors.push(err.message);
      return result;
    }
  }

  /**
   * Recursively clean up a directory
   */
  _cleanupDirectory(dirPath, cutoffMs, result) {
    try {
      result.directoriesChecked++;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          this._cleanupDirectory(fullPath, cutoffMs, result);

          // Remove empty directories
          try {
            const remaining = fs.readdirSync(fullPath);
            if (remaining.length === 0) {
              fs.rmdirSync(fullPath);
              logger.debug(`${LOG_PREFIX} Removed empty directory: ${fullPath}`);
            }
          } catch (e) {
            // ignore
          }
        } else if (entry.isFile()) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.mtimeMs < cutoffMs) {
              fs.unlinkSync(fullPath);
              result.filesDeleted++;
              result.bytesFreed += stats.size;
              logger.debug(`${LOG_PREFIX} Deleted old file: ${fullPath} (${(stats.size / 1024).toFixed(2)} KB)`);
            }
          } catch (fileErr) {
            result.errors.push(`Failed to delete ${fullPath}: ${fileErr.message}`);
          }
        }
      }
    } catch (err) {
      result.errors.push(`Failed to read directory ${dirPath}: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ATTACHMENT STATISTICS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get statistics about stored attachments for a user
   * @param {string} userId - User identifier
   * @returns {Object} Attachment statistics
   */
  getAttachmentStats(userId) {
    const stats = {
      userId,
      totalFiles: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      categoryStats: {},
      oldestFile: null,
      newestFile: null,
      fileTypeDistribution: {},
      monthlyDistribution: {}
    };

    try {
      const userDir = path.join(UPLOAD_BASE_DIR, userId);
      if (!fs.existsSync(userDir)) {
        logger.info(`${LOG_PREFIX} No upload directory for user ${userId}`);
        return stats;
      }

      this._gatherStats(userDir, '', stats);

      stats.totalSizeMB = Math.round((stats.totalSizeBytes / (1024 * 1024)) * 100) / 100;

      logger.info(
        `${LOG_PREFIX} Stats for ${userId}: ${stats.totalFiles} files, ` +
        `${stats.totalSizeMB} MB, categories: ${Object.keys(stats.categoryStats).join(', ')}`
      );

      return stats;
    } catch (err) {
      logger.error(`${LOG_PREFIX} Error getting stats for ${userId}: ${err.message}`);
      return stats;
    }
  }

  /**
   * Recursively gather file statistics
   */
  _gatherStats(dirPath, relativePath, stats) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          // Track category statistics (first level directories = categories)
          if (!relativePath) {
            stats.categoryStats[entry.name] = { files: 0, sizeBytes: 0, sizeMB: 0 };
          }
          this._gatherStats(fullPath, relPath, stats);
        } else if (entry.isFile()) {
          try {
            const fileStats = fs.statSync(fullPath);
            stats.totalFiles++;
            stats.totalSizeBytes += fileStats.size;

            // File type distribution
            const ext = path.extname(entry.name).toLowerCase() || '.unknown';
            if (!stats.fileTypeDistribution[ext]) {
              stats.fileTypeDistribution[ext] = { count: 0, sizeBytes: 0 };
            }
            stats.fileTypeDistribution[ext].count++;
            stats.fileTypeDistribution[ext].sizeBytes += fileStats.size;

            // Category stats
            const category = relativePath.split('/')[0] || 'uncategorized';
            if (stats.categoryStats[category]) {
              stats.categoryStats[category].files++;
              stats.categoryStats[category].sizeBytes += fileStats.size;
              stats.categoryStats[category].sizeMB = Math.round((stats.categoryStats[category].sizeBytes / (1024 * 1024)) * 100) / 100;
            }

            // Oldest/newest tracking
            const mtime = fileStats.mtime;
            if (!stats.oldestFile || mtime < new Date(stats.oldestFile.date)) {
              stats.oldestFile = { path: relPath, date: mtime.toISOString(), sizeBytes: fileStats.size };
            }
            if (!stats.newestFile || mtime > new Date(stats.newestFile.date)) {
              stats.newestFile = { path: relPath, date: mtime.toISOString(), sizeBytes: fileStats.size };
            }

            // Monthly distribution
            const monthKey = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, '0')}`;
            if (!stats.monthlyDistribution[monthKey]) {
              stats.monthlyDistribution[monthKey] = { count: 0, sizeBytes: 0 };
            }
            stats.monthlyDistribution[monthKey].count++;
            stats.monthlyDistribution[monthKey].sizeBytes += fileStats.size;
          } catch (e) {
            // ignore individual file errors
          }
        }
      }
    } catch (err) {
      logger.debug(`${LOG_PREFIX} Error reading directory ${dirPath}: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse a monetary amount string to a float
   * @param {string} amountStr - Amount string (e.g., "1,23,456.78", "Rs. 5000")
   * @returns {number} Parsed amount
   */
  _parseAmount(amountStr) {
    if (!amountStr) return 0;
    try {
      const cleaned = String(amountStr)
        .replace(/[₹$€£¥]/g, '')
        .replace(/\b(Rs\.?|INR|rupees?)\b/gi, '')
        .replace(/,/g, '')
        .replace(/\s+/g, '')
        .trim();

      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : Math.abs(num);
    } catch {
      return 0;
    }
  }

  /**
   * Parse a date string into ISO format
   * @param {string} dateStr - Date string in various Indian formats
   * @returns {string|null} ISO date string
   */
  _parseTransactionDate(dateStr) {
    if (!dateStr) return null;

    try {
      const cleaned = dateStr.trim();

      // DD/MM/YYYY or DD-MM-YYYY
      let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (match) {
        let [, day, month, year] = match;
        if (year.length === 2) year = '20' + year;
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }

      // DD Mon YYYY or DD-Mon-YYYY
      match = cleaned.match(/^(\d{1,2})[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\-](\d{2,4})$/i);
      if (match) {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        let year = match[3];
        if (year.length === 2) year = '20' + year;
        const d = new Date(parseInt(year), months[match[2].toLowerCase().substring(0, 3)], parseInt(match[1]));
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }

      // YYYY-MM-DD
      match = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (match) {
        const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }

      // Try native Date parsing as last resort
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a file is a duplicate based on hash
   * @param {string} hash - SHA256 hash of file content
   * @param {string} userId - User identifier
   * @returns {boolean} True if duplicate found
   */
  isDuplicate(hash, userId) {
    try {
      const userDir = path.join(UPLOAD_BASE_DIR, userId);
      if (!fs.existsSync(userDir)) return false;

      return this._searchForHash(userDir, hash);
    } catch {
      return false;
    }
  }

  /**
   * Recursively search for a file with matching hash in filename
   */
  _searchForHash(dirPath, hash) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (this._searchForHash(fullPath, hash)) return true;
        } else if (entry.isFile() && entry.name.includes(hash.substring(0, 8))) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }

  /**
   * Get the processing statistics of this processor instance
   * @returns {Object} Processing stats
   */
  getProcessorStats() {
    return {
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      supportedExtensions: this.supportedExtensions,
      availableProcessors: {
        pdf: !!pdfParse,
        excel: !!XLSX,
        ocr: !!Tesseract
      },
      categories: ATTACHMENT_CATEGORIES,
      supportedBanks: Object.keys(BANK_IDENTIFICATION),
      supportedCardIssuers: Object.keys(CREDIT_CARD_ISSUERS),
      supportedInvestmentPlatforms: Object.keys(INVESTMENT_PLATFORMS)
    };
  }

  /**
   * Reset processing counters
   */
  resetCounters() {
    this.processedCount = 0;
    this.errorCount = 0;
    logger.info(`${LOG_PREFIX} Processing counters reset`);
  }

  /**
   * Validate that required dependencies are available
   * @returns {Object} Dependency status
   */
  checkDependencies() {
    const deps = {
      'pdf-parse': { available: !!pdfParse, required: false, purpose: 'PDF text extraction' },
      'xlsx': { available: !!XLSX, required: false, purpose: 'Excel file processing' },
      'tesseract.js': { available: !!Tesseract, required: false, purpose: 'OCR for image attachments' },
      'fs': { available: true, required: true, purpose: 'File system operations' },
      'path': { available: true, required: true, purpose: 'Path manipulation' },
      'crypto': { available: true, required: true, purpose: 'Hashing for deduplication' }
    };

    const allOptionalAvailable = deps['pdf-parse'].available && deps['xlsx'].available && deps['tesseract.js'].available;
    const status = allOptionalAvailable ? 'full' : 'partial';

    logger.info(`${LOG_PREFIX} Dependency check: ${status}. PDF=${deps['pdf-parse'].available}, Excel=${deps['xlsx'].available}, OCR=${deps['tesseract.js'].available}`);

    return { status, dependencies: deps };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

module.exports = new EmailAttachmentProcessor();
