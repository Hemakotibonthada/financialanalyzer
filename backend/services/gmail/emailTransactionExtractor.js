// ============================================================================
// EMAIL TRANSACTION EXTRACTOR SERVICE
// ============================================================================
// Comprehensive extraction engine for financial transactions from Gmail emails.
// Handles: bank alerts, UPI, NEFT/RTGS/IMPS, credit card, statements, salary,
// EMI, bills, e-commerce, wallets, and 30+ Indian bank email formats.
//
// Capabilities:
//   - HTML table parsing for bank statements
//   - Plain-text transaction extraction
//   - UPI-specific parsing (VPA, UTR, merchant)
//   - Multi-transaction emails (monthly statements with 50+ rows)
//   - Indian currency formats (₹, Rs., INR, lakh, crore)
//   - Entity extraction (amounts, dates, accounts, IFSC, card numbers)
//   - Confidence scoring per transaction
//   - Balance tracking (opening/closing)
//   - Deduplication and AI-enriched metadata
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// CONSTANTS & PATTERN DEFINITIONS
// ============================================================================

/** @type {string} Service log prefix */
const LOG_PREFIX = '[EmailTxnExtractor]';

// ── Indian Bank Sender Identification ───────────────────────────────────────
const BANK_SENDER_PATTERNS = {
  'State Bank of India':       { code: 'SBI',      regex: /sbi|state\s*bank\s*of\s*india|onlinesbi/i },
  'HDFC Bank':                 { code: 'HDFC',     regex: /hdfc(?:bank)?|hdfcbank/i },
  'ICICI Bank':                { code: 'ICICI',    regex: /icici(?:bank)?|icicibank/i },
  'Axis Bank':                 { code: 'AXIS',     regex: /axis(?:bank)?|axisbank/i },
  'Kotak Mahindra Bank':       { code: 'KOTAK',    regex: /kotak(?:bank)?|kotakbank|kotak\s*mahindra/i },
  'Punjab National Bank':      { code: 'PNB',      regex: /pnb|punjab\s*national/i },
  'Bank of Baroda':            { code: 'BOB',      regex: /bob|bank\s*of\s*baroda/i },
  'Bank of India':             { code: 'BOI',      regex: /boi|bank\s*of\s*india/i },
  'Canara Bank':               { code: 'CANARA',   regex: /canara(?:bank)?/i },
  'Union Bank of India':       { code: 'UNION',    regex: /union(?:bank)?|unionbank/i },
  'IDBI Bank':                 { code: 'IDBI',     regex: /idbi(?:bank)?/i },
  'IndusInd Bank':             { code: 'INDUSIND', regex: /indusind/i },
  'Yes Bank':                  { code: 'YES',      regex: /yesbank|yes\s*bank/i },
  'Federal Bank':              { code: 'FEDERAL',  regex: /federal(?:bank)?/i },
  'RBL Bank':                  { code: 'RBL',      regex: /rbl(?:bank)?/i },
  'IDFC First Bank':           { code: 'IDFC',     regex: /idfc(?:\s*first)?/i },
  'Citibank':                  { code: 'CITI',     regex: /citi(?:bank)?/i },
  'HSBC':                      { code: 'HSBC',     regex: /hsbc/i },
  'Standard Chartered':        { code: 'SC',       regex: /standard\s*chartered/i },
  'DBS Bank':                  { code: 'DBS',      regex: /dbs(?:bank)?/i },
  'South Indian Bank':         { code: 'SIB',      regex: /south\s*indian\s*bank|sib/i },
  'Karnataka Bank':            { code: 'KBL',      regex: /karnataka\s*bank/i },
  'Indian Overseas Bank':      { code: 'IOB',      regex: /indian\s*overseas|iob/i },
  'Central Bank of India':     { code: 'CBI',      regex: /central\s*bank\s*of\s*india/i },
  'UCO Bank':                  { code: 'UCO',      regex: /uco\s*bank/i },
  'Bank of Maharashtra':       { code: 'BOM',      regex: /bank\s*of\s*maharashtra/i },
  'Indian Bank':               { code: 'IB',       regex: /indian\s*bank/i },
  'Bandhan Bank':              { code: 'BANDHAN',  regex: /bandhan/i },
  'Jammu & Kashmir Bank':      { code: 'JKB',      regex: /j&?k\s*bank|jammu/i },
  'AU Small Finance Bank':     { code: 'AU',       regex: /au\s*(?:small\s*finance)?/i },
  'Equitas Small Finance Bank':{ code: 'EQUITAS',  regex: /equitas/i },
  'Ujjivan Small Finance Bank':{ code: 'UJJIVAN',  regex: /ujjivan/i },
  'Paytm Payments Bank':       { code: 'PAYTM',    regex: /paytm/i },
  'PhonePe':                   { code: 'PHONEPE',  regex: /phonepe/i },
  'Google Pay':                { code: 'GPAY',     regex: /googlepay|google\s*pay|gpay|tez/i },
  'Amazon Pay':                { code: 'AMAZONPAY', regex: /amazon\s*pay/i },
  'CRED':                      { code: 'CRED',     regex: /cred\.club|cred/i },
  'Razorpay':                  { code: 'RAZORPAY', regex: /razorpay/i },
};

// ── Amount Extraction Patterns ──────────────────────────────────────────────
// Supports: ₹1,23,456.78 | Rs. 1,23,456.78 | INR 1,23,456 | 1.5 lakh | 2.5 crore
const AMOUNT_PATTERNS = [
  // ₹ / Rs. / INR prefix
  { regex: /(?:₹|rs\.?|inr\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi, group: 1 },
  // Amount keyword prefix
  { regex: /(?:amount|amt|total|sum|value|charge|fee)[\s:]*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/gi, group: 1 },
  // Amount with suffix
  { regex: /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees?)/gi, group: 1 },
  // Verb-prefixed amounts
  { regex: /(?:debited|credited|paid|received|charged|deducted|transferred|sent|collected|refunded)\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/gi, group: 1 },
  // Lakh/crore formats
  { regex: /(?:₹|rs\.?|inr\.?)?\s*([\d.]+)\s*(?:lakh|lac|lakhs)/gi, group: 1, multiplier: 100000 },
  { regex: /(?:₹|rs\.?|inr\.?)?\s*([\d.]+)\s*(?:crore|cr)/gi, group: 1, multiplier: 10000000 },
];

// ── Account Number Patterns ─────────────────────────────────────────────────
const ACCOUNT_PATTERNS = [
  /a\/c\s*(?:no\.?\s*)?[*xX]*(\d{4,})/i,
  /account\s*(?:no\.?\s*)?[*xX]*(\d{4,})/i,
  /(?:ac|acct)\s*(?:no\.?)?\s*[*xX]*(\d{4,})/i,
  /ending\s*(?:with\s*)?(\d{4})/i,
  /xx+(\d{4})/i,
  /\*{2,}(\d{4})/,
  /(?:savings|current|account)\s*[A-Z]*\d*[*xX]+(\d{4})/i,
];

// ── Reference / Transaction ID Patterns ─────────────────────────────────────
const REFERENCE_PATTERNS = [
  /(?:ref(?:erence)?|txn|transaction)\s*(?:no\.?|id|#)?\s*[:.]?\s*([A-Z0-9]{6,30})/i,
  /(?:UTR|IMPS|NEFT|RTGS)\s*(?:no\.?|ref)?\s*[:.]?\s*([A-Z0-9]{8,30})/i,
  /(?:UPI)\s*(?:ref|txn)?\s*[:.]?\s*([A-Z0-9]{8,30})/i,
  /(?:order\s*(?:id|#|no))\s*[:.]?\s*([A-Z0-9\-]{6,30})/i,
  /(?:RRN|ARN)\s*[:.]?\s*([A-Z0-9]{8,30})/i,
  /(?:approval\s*(?:code|no))\s*[:.]?\s*([A-Z0-9]{4,12})/i,
];

// ── UPI VPA Pattern ─────────────────────────────────────────────────────────
const UPI_VPA_PATTERN = /([a-zA-Z0-9._-]+@[a-zA-Z]{2,})/g;

// ── IFSC Code Pattern ───────────────────────────────────────────────────────
const IFSC_PATTERN = /\b([A-Z]{4}0[A-Z0-9]{6})\b/g;

// ── Card Number Pattern (last 4 digits) ─────────────────────────────────────
const CARD_LAST4_PATTERNS = [
  /card\s*(?:ending|no\.?|number)?\s*(?:in\s*)?[*xX]+(\d{4})/i,
  /(?:credit|debit)\s*card\s*[*xX]+(\d{4})/i,
  /(?:visa|master\s*card|rupay|amex)\s*(?:card)?\s*[*xX]*(\d{4})/i,
  /xx+(\d{4})\b/i,
];

// ── Balance Patterns ────────────────────────────────────────────────────────
const BALANCE_PATTERNS = [
  /(?:available\s*)?(?:balance|bal|avl\.?\s*bal)\s*(?:is|:)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:avail(?:able)?)\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:closing|closing\s*bal(?:ance)?|current\s*bal(?:ance)?)\s*(?:is|:)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:opening|opening\s*bal(?:ance)?)\s*(?:is|:)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

// ── Date Extraction Patterns ────────────────────────────────────────────────
const DATE_PATTERNS = [
  { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, format: 'DD/MM/YYYY' },
  { regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s,]+(\d{2,4})/i, format: 'DD MMM YYYY' },
  { regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{2,4})/i, format: 'MMM DD YYYY' },
  { regex: /(\d{4})-(\d{2})-(\d{2})/, format: 'YYYY-MM-DD' },
  { regex: /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2,4})/i, format: 'DD Month YYYY' },
];

const MONTH_MAP = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

// ── Transaction Type Keywords ───────────────────────────────────────────────
const DEBIT_KEYWORDS = [
  'debited', 'deducted', 'withdrawn', 'paid', 'sent', 'charged', 'purchase',
  'debit alert', 'payment', 'transfer to', 'transferred', 'auto-debit',
  'standing instruction', 'nach debit', 'emi deducted', 'bill payment',
];

const CREDIT_KEYWORDS = [
  'credited', 'received', 'deposited', 'added', 'credit alert', 'refund',
  'cashback', 'reversed', 'incoming', 'salary', 'interest credit',
  'dividend', 'maturity', 'nach credit', 'transfer from',
];

// ── Merchant Extraction Patterns ────────────────────────────────────────────
const MERCHANT_PATTERNS = [
  /(?:at|to|from|merchant|payee|via|beneficiary)\s+([A-Z][A-Za-z0-9\s&.'_-]{2,40})/,
  /(?:paid\s+to|payment\s+to|sent\s+to|received\s+from|transferred\s+to)\s+([A-Za-z0-9\s&.'_-]{2,40})/i,
  /(?:towards|for)\s+([A-Z][A-Za-z0-9\s&.'_-]{2,40})/,
  /(?:VPA|upi)\s*[:]\s*([a-zA-Z0-9._-]+@[a-zA-Z]+)/i,
];

// ── Category Mapping for Transaction Types ──────────────────────────────────
const CATEGORY_RULES = [
  { pattern: /credit\s*card|cc\s*(?:ending|xx|no)|mastercard|visa\s*card|rupay\s*card/i, category: 'Credit Card', subcategory: 'Card Transaction' },
  { pattern: /salary|payroll|pay\s*slip|wages?\b|compensation/i, category: 'Income', subcategory: 'Salary' },
  { pattern: /emi|equated monthly|loan\s*(?:repayment|installment|payment)|mortgage/i, category: 'Loans & EMI', subcategory: 'EMI Payment' },
  { pattern: /\bneft\b/i, category: 'Bank Transfer', subcategory: 'NEFT' },
  { pattern: /\brtgs\b/i, category: 'Bank Transfer', subcategory: 'RTGS' },
  { pattern: /\bimps\b/i, category: 'Bank Transfer', subcategory: 'IMPS' },
  { pattern: /\bupi\b/i, category: 'UPI Payments', subcategory: 'UPI' },
  { pattern: /electricity|power\s*bill|water\s*bill|gas\s*bill|broadband|internet\s*bill/i, category: 'Bills & Utilities', subcategory: 'Utility Bill' },
  { pattern: /insurance|premium\s*(?:paid|due|deducted)|lic|policy\s*(?:renewal|premium)/i, category: 'Insurance', subcategory: 'Premium Payment' },
  { pattern: /(?:sip|mutual fund|mf\s*purchase|elss|nav|folio)/i, category: 'Investments', subcategory: 'Mutual Fund' },
  { pattern: /(?:fixed\s*deposit|fd\s*(?:booked|matured)|recurring\s*deposit)/i, category: 'Investments', subcategory: 'Fixed Deposit' },
  { pattern: /(?:income\s*tax|advance\s*tax|tds|gst|tax\s*refund)/i, category: 'Tax', subcategory: 'Tax Payment' },
  { pattern: /(?:amazon|flipkart|myntra|swiggy|zomato|bigbasket|blinkit)/i, category: 'Shopping', subcategory: 'Online Purchase' },
  { pattern: /(?:subscription|netflix|spotify|hotstar|prime|youtube\s*premium)/i, category: 'Subscriptions', subcategory: 'Digital Subscription' },
  { pattern: /(?:flight|irctc|makemytrip|goibibo|ola|uber|rapido)/i, category: 'Travel', subcategory: 'Travel Booking' },
  { pattern: /(?:cashback|reward|bonus|referral\s*credit)/i, category: 'Income', subcategory: 'Cashback / Reward' },
  { pattern: /(?:rent|house\s*rent|rental)/i, category: 'Housing', subcategory: 'Rent' },
  { pattern: /(?:fuel|petrol|diesel|cng|ev\s*charge)/i, category: 'Transport', subcategory: 'Fuel' },
  { pattern: /(?:grocery|supermarket|dmart|reliance\s*fresh|more\s*store)/i, category: 'Groceries', subcategory: 'Grocery Shopping' },
  { pattern: /(?:hospital|medical|pharmacy|doctor|health|diagnostic)/i, category: 'Health', subcategory: 'Medical Expense' },
  { pattern: /(?:school|college|tuition|education|exam\s*fee|university)/i, category: 'Education', subcategory: 'Education Fee' },
  { pattern: /(?:recharge|prepaid|postpaid|mobile\s*(?:bill|recharge))/i, category: 'Bills & Utilities', subcategory: 'Mobile Recharge' },
  { pattern: /(?:nach|auto[\s-]*debit|standing\s*instruction|si\s*debit)/i, category: 'Auto-Debit', subcategory: 'NACH / Standing Instruction' },
  { pattern: /(?:cheque|check)\s*(?:deposit|cleared|bounced)/i, category: 'Bank Transfer', subcategory: 'Cheque' },
  { pattern: /(?:atm|cash\s*withdrawal|atm\s*withdrawal)/i, category: 'Cash', subcategory: 'ATM Withdrawal' },
];

// ── Bank-Specific Email Format Patterns ─────────────────────────────────────
// Each bank has its own SMS/email phrasing; here we capture the most common ones
const BANK_FORMAT_PATTERNS = {
  SBI: [
    /(?:Your a\/c|account)\s*(?:no\.?\s*)?[*xX]*(\d{4,})\s*(?:is|has been)\s*(debited|credited)\s*(?:by|with|for)?\s*(?:₹|rs\.?|inr\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is)\s*(debited|credited)\s*(?:from|to)\s*(?:your\s*)?(?:a\/c|account)\s*[*xX]*(\d{4,})/i,
  ],
  HDFC: [
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited)\s*(?:from|to)\s*(?:HDFC\s*Bank\s*)?(?:a\/c|account)\s*[*xX]*(\d{4,})/i,
    /(?:HDFC\s*Bank)\s*(?:a\/c|account)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Alert|Info)\s*:\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited)/i,
  ],
  ICICI: [
    /(?:ICICI Bank)\s*(?:acct|a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:for|with)?\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited)\s*(?:from|to)\s*(?:your\s*)?(?:ICICI\s*)?(?:acct|a\/c)\s*[*xX]*(\d{4,})/i,
  ],
  AXIS: [
    /(?:Axis Bank)\s*(?:a\/c|account)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been)\s*(?:debited|credited)\s*(?:from|to)\s*(?:your\s*)(?:Axis)?\s*(?:a\/c)\s*(\d{4})/i,
  ],
  KOTAK: [
    /(?:Kotak)\s*(?:a\/c|account)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited)\s*(?:from|to)\s*(?:your\s*)?(?:Kotak\s*)?(?:acct|a\/c)\s*(\d{4})/i,
  ],
  PNB: [
    /(?:PNB)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:by)?\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  BOB: [
    /(?:Bank of Baroda)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:by)?\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  CANARA: [
    /(?:Canara Bank|CanaraBank)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:for)?\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  INDUSIND: [
    /(?:IndusInd)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  YES: [
    /(?:Yes Bank)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  IDFC: [
    /(?:IDFC\s*(?:First)?)\s*(?:a\/c)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  CITI: [
    /(?:Citibank)\s*(?:a\/c|account|card)\s*[*xX]*(\d{4,})\s*(?:debited|credited|charged)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  HSBC: [
    /(?:HSBC)\s*(?:a\/c|account)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
  SC: [
    /(?:Standard Chartered|SCB)\s*(?:a\/c|account)\s*[*xX]*(\d{4,})\s*(?:debited|credited)\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ],
};

// ── UPI-Specific Patterns ───────────────────────────────────────────────────
const UPI_PATTERNS = [
  /(?:UPI)\s*(?:txn|transaction|payment)\s*(?:of)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:sent|received|paid|collected)\s*(?:via|through|using)\s*UPI/i,
  /(?:UPI)\s*(?:ref(?:erence)?|txn)?\s*(?:no\.?|id)?\s*[:.]?\s*(\d{12})/i,
];


// ============================================================================
// EmailTransactionExtractor CLASS
// ============================================================================

/**
 * @class EmailTransactionExtractor
 * @description Comprehensive service to extract financial transactions from
 * GmailEmail documents, handling HTML tables, plain text, UPI, bank alerts,
 * statements, and multi-transaction emails.
 */
class EmailTransactionExtractor {

  constructor() {
    /** @type {number} Max transactions to extract from a single email */
    this.maxTransactionsPerEmail = 500;

    /** @type {number} Minimum amount threshold (₹) */
    this.minimumAmount = 0.01;

    /** @type {number} Maximum sane amount (₹100 crore) */
    this.maximumAmount = 1_000_000_000;

    /** @type {Map<string, Object>} Cached bank patterns for performance */
    this._bankPatternCache = new Map();

    logger.info(`${LOG_PREFIX} EmailTransactionExtractor initialized`);
  }

  // ==========================================================================
  // PUBLIC API — extractFromEmail
  // ==========================================================================

  /**
   * Main entry point: extract all financial transactions from a GmailEmail document.
   *
   * @param {Object} email - A GmailEmail MongoDB document or plain object
   * @param {string} email.subject - Email subject line
   * @param {string} [email.bodyText] - Plain text body
   * @param {string} [email.bodyHtml] - HTML body
   * @param {string} [email.snippet] - Gmail snippet
   * @param {Object} email.from - Sender info { email, name }
   * @param {Date}   email.date - Email date
   * @param {string} email.gmailMessageId - Unique Gmail message ID
   * @param {string} [email.userId] - Owner user ID
   * @returns {Promise<{ transactions: Array, metadata: Object }>}
   */
  async extractFromEmail(email) {
    const startTime = Date.now();

    if (!email) {
      logger.warn(`${LOG_PREFIX} extractFromEmail called with null email`);
      return { transactions: [], metadata: { error: 'No email provided' } };
    }

    const subject = (email.subject || '').trim();
    const bodyText = (email.bodyText || '').trim();
    const bodyHtml = (email.bodyHtml || '').trim();
    const snippet = (email.snippet || '').trim();
    const senderEmail = (email.from && email.from.email) ? email.from.email : '';
    const senderName = (email.from && email.from.name) ? email.from.name : '';
    const emailDate = email.date ? new Date(email.date) : new Date();
    const gmailMessageId = email.gmailMessageId || '';

    logger.debug(`${LOG_PREFIX} Processing email: "${subject.substring(0, 80)}" from ${senderEmail}`);

    /** @type {Array<Object>} Collected transactions from all extraction methods */
    let allTransactions = [];
    const metadata = {
      gmailMessageId,
      subject,
      senderEmail,
      senderName,
      emailDate,
      extractionMethods: [],
      bankDetected: null,
      isStatement: false,
      processingTimeMs: 0,
    };

    try {
      // Detect the sending bank/institution
      const bankInfo = this._detectBank(senderEmail, senderName, subject);
      metadata.bankDetected = bankInfo;

      // Determine if this is a bank statement (multi-transaction)
      const isStatement = this._isStatementEmail(subject, bodyText, bodyHtml);
      metadata.isStatement = isStatement;

      // ── Strategy 1: HTML Table Extraction (for statements) ──
      if (bodyHtml && bodyHtml.length > 100) {
        try {
          const htmlTransactions = this.extractFromHTMLBody(bodyHtml, emailDate, bankInfo);
          if (htmlTransactions.length > 0) {
            metadata.extractionMethods.push('html_table');
            allTransactions.push(...htmlTransactions);
            logger.debug(`${LOG_PREFIX} HTML extraction yielded ${htmlTransactions.length} transactions`);
          }
        } catch (htmlErr) {
          logger.warn(`${LOG_PREFIX} HTML extraction error: ${htmlErr.message}`);
        }
      }

      // ── Strategy 2: UPI-Specific Extraction ──
      if (/upi|unified payment/i.test(subject + ' ' + bodyText + ' ' + snippet)) {
        try {
          const upiTxns = this.extractUPITransaction(subject, bodyText || snippet, emailDate, bankInfo);
          if (upiTxns.length > 0) {
            metadata.extractionMethods.push('upi');
            allTransactions.push(...upiTxns);
            logger.debug(`${LOG_PREFIX} UPI extraction yielded ${upiTxns.length} transactions`);
          }
        } catch (upiErr) {
          logger.warn(`${LOG_PREFIX} UPI extraction error: ${upiErr.message}`);
        }
      }

      // ── Strategy 3: Bank Alert Extraction ──
      try {
        const alertTxns = this.extractBankAlert(subject, bodyText || snippet, senderEmail, emailDate, bankInfo);
        if (alertTxns.length > 0) {
          metadata.extractionMethods.push('bank_alert');
          allTransactions.push(...alertTxns);
          logger.debug(`${LOG_PREFIX} Bank alert extraction yielded ${alertTxns.length} transactions`);
        }
      } catch (alertErr) {
        logger.warn(`${LOG_PREFIX} Bank alert extraction error: ${alertErr.message}`);
      }

      // ── Strategy 4: Plain Text Extraction (fallback) ──
      if (bodyText && bodyText.length > 20) {
        try {
          const textTxns = this.extractFromPlainText(bodyText, emailDate, bankInfo);
          if (textTxns.length > 0) {
            metadata.extractionMethods.push('plain_text');
            allTransactions.push(...textTxns);
            logger.debug(`${LOG_PREFIX} Plain text extraction yielded ${textTxns.length} transactions`);
          }
        } catch (textErr) {
          logger.warn(`${LOG_PREFIX} Plain text extraction error: ${textErr.message}`);
        }
      }

      // ── Strategy 5: Statement Summary Extraction ──
      if (isStatement) {
        try {
          const summary = this.extractStatementSummary(bodyText || this._stripHtml(bodyHtml));
          if (summary) {
            metadata.statementSummary = summary;
            metadata.extractionMethods.push('statement_summary');
          }
        } catch (summaryErr) {
          logger.warn(`${LOG_PREFIX} Statement summary extraction error: ${summaryErr.message}`);
        }
      }

      // ── Deduplicate ──
      allTransactions = this.deduplicateTransactions(allTransactions);

      // ── Attach email metadata to each transaction ──
      allTransactions = allTransactions.map(txn => ({
        ...txn,
        source: 'gmail_email',
        emailMetadata: {
          gmailMessageId,
          subject,
          from: senderEmail,
          senderName,
          snippet: snippet.substring(0, 200),
          parsedBank: bankInfo ? bankInfo.name : null,
          bankCode: bankInfo ? bankInfo.code : null,
        },
      }));

      // ── Limit output ──
      if (allTransactions.length > this.maxTransactionsPerEmail) {
        logger.warn(`${LOG_PREFIX} Truncating transactions from ${allTransactions.length} to ${this.maxTransactionsPerEmail}`);
        allTransactions = allTransactions.slice(0, this.maxTransactionsPerEmail);
      }

      metadata.processingTimeMs = Date.now() - startTime;
      metadata.totalExtracted = allTransactions.length;

      logger.info(`${LOG_PREFIX} Extracted ${allTransactions.length} transactions from email "${subject.substring(0, 60)}" in ${metadata.processingTimeMs}ms`);

      return { transactions: allTransactions, metadata };

    } catch (err) {
      logger.error(`${LOG_PREFIX} Fatal extraction error for email "${subject.substring(0, 60)}": ${err.message}`);
      metadata.processingTimeMs = Date.now() - startTime;
      metadata.error = err.message;
      return { transactions: allTransactions, metadata };
    }
  }

  // ==========================================================================
  // HTML BODY EXTRACTION
  // ==========================================================================

  /**
   * Extract transactions from HTML email body.
   * Parses HTML tables and structured divs for tabular transaction data.
   *
   * @param {string} html - Raw HTML body content
   * @param {Date}   [fallbackDate] - Date to use if none found in rows
   * @param {Object} [bankInfo] - Detected bank info { name, code }
   * @returns {Array<Object>} Array of extracted transaction objects
   */
  extractFromHTMLBody(html, fallbackDate = new Date(), bankInfo = null) {
    if (!html || html.length < 50) return [];

    const transactions = [];

    try {
      // ── Parse HTML Tables ──
      const tables = this._extractHTMLTables(html);

      for (const table of tables) {
        if (!table.rows || table.rows.length < 2) continue;

        // Determine column mapping from header row
        const columnMap = this._detectTableColumns(table.headers || table.rows[0]);
        if (!columnMap.hasFinancialData) continue;

        logger.debug(`${LOG_PREFIX} Found financial table with ${table.rows.length} rows, columns: ${JSON.stringify(columnMap.mapping)}`);

        // Skip header row if headers were detected from first row
        const dataStartIndex = table.headers ? 0 : 1;

        for (let i = dataStartIndex; i < table.rows.length; i++) {
          try {
            const row = table.rows[i];
            const txn = this._parseTableRow(row, columnMap, fallbackDate, bankInfo);
            if (txn && txn.amount > this.minimumAmount) {
              txn.extractionMethod = 'html_table';
              txn.tableRowIndex = i;
              transactions.push(txn);
            }
          } catch (rowErr) {
            logger.debug(`${LOG_PREFIX} Error parsing table row ${i}: ${rowErr.message}`);
          }
        }
      }

      // ── Parse Structured Divs (some banks use div-based layouts) ──
      const divTransactions = this._extractFromStructuredDivs(html, fallbackDate, bankInfo);
      transactions.push(...divTransactions);

    } catch (err) {
      logger.warn(`${LOG_PREFIX} HTML body extraction error: ${err.message}`);
    }

    return transactions;
  }

  /**
   * Extract HTML tables from raw HTML string.
   * Returns array of { headers: string[]|null, rows: string[][] }
   *
   * @private
   * @param {string} html
   * @returns {Array<{ headers: string[]|null, rows: string[][] }>}
   */
  _extractHTMLTables(html) {
    const tables = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const table = { headers: null, rows: [] };

      // Extract thead headers
      const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
      if (theadMatch) {
        const headerCells = this._extractCellsFromRow(theadMatch[1]);
        if (headerCells.length > 0) {
          table.headers = headerCells;
        }
      }

      // Extract all rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cells = this._extractCellsFromRow(rowMatch[1]);
        if (cells.length > 0) {
          table.rows.push(cells);
        }
      }

      // If no thead, check if the first row looks like headers
      if (!table.headers && table.rows.length > 1) {
        const firstRow = table.rows[0];
        const looksLikeHeader = firstRow.some(cell =>
          /date|description|narration|amount|debit|credit|balance|particulars|withdrawal|deposit|ref/i.test(cell)
        );
        if (looksLikeHeader) {
          table.headers = firstRow;
        }
      }

      if (table.rows.length >= 2) {
        tables.push(table);
      }
    }

    return tables;
  }

  /**
   * Extract cell text values from a table row HTML.
   *
   * @private
   * @param {string} rowHtml
   * @returns {string[]}
   */
  _extractCellsFromRow(rowHtml) {
    const cells = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = this._stripHtml(cellMatch[1]).trim();
      cells.push(text);
    }

    return cells;
  }

  /**
   * Detect column types in a table header row.
   *
   * @private
   * @param {string[]} headerRow
   * @returns {{ mapping: Object, hasFinancialData: boolean }}
   */
  _detectTableColumns(headerRow) {
    const mapping = {};
    let hasDate = false;
    let hasAmount = false;

    for (let i = 0; i < headerRow.length; i++) {
      const header = (headerRow[i] || '').toLowerCase().trim();

      if (/^(?:date|txn\s*date|transaction\s*date|value\s*date|posting\s*date|dt)$/i.test(header) ||
          /date/i.test(header)) {
        mapping.date = i;
        hasDate = true;
      } else if (/^(?:description|narration|particulars|details|remarks|transaction\s*details?)$/i.test(header) ||
                 /narration|description|particular/i.test(header)) {
        mapping.description = i;
      } else if (/^(?:debit|withdrawal|dr|debit\s*amount|withdraw)$/i.test(header) ||
                 (/debit|withdrawal|dr/i.test(header) && !/credit/i.test(header))) {
        mapping.debit = i;
        hasAmount = true;
      } else if (/^(?:credit|deposit|cr|credit\s*amount)$/i.test(header) ||
                 (/credit|deposit|cr/i.test(header) && !/debit/i.test(header))) {
        mapping.credit = i;
        hasAmount = true;
      } else if (/^(?:amount|amt|value|sum)$/i.test(header) ||
                 /amount|amt/i.test(header)) {
        mapping.amount = i;
        hasAmount = true;
      } else if (/^(?:balance|closing\s*bal|avl\s*bal|running\s*bal)$/i.test(header) ||
                 /balance|bal/i.test(header)) {
        mapping.balance = i;
      } else if (/^(?:ref(?:erence)?|txn\s*(?:id|no)|transaction\s*(?:id|ref)|chq\s*no)$/i.test(header) ||
                 /ref|txn.*id|chq/i.test(header)) {
        mapping.reference = i;
      } else if (/^(?:type|mode|channel)$/i.test(header)) {
        mapping.type = i;
      }
    }

    return {
      mapping,
      hasFinancialData: hasAmount || (hasDate && headerRow.length >= 3),
    };
  }

  /**
   * Parse a single table row into a transaction object.
   *
   * @private
   * @param {string[]} row - Array of cell text values
   * @param {{ mapping: Object }} columnMap - Column index mapping
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Object|null}
   */
  _parseTableRow(row, columnMap, fallbackDate, bankInfo) {
    const map = columnMap.mapping;

    // Extract date
    let txnDate = fallbackDate;
    if (map.date !== undefined && row[map.date]) {
      const parsed = this._parseDate(row[map.date]);
      if (parsed) txnDate = parsed;
    }

    // Extract description
    let description = '';
    if (map.description !== undefined && row[map.description]) {
      description = row[map.description].trim();
    }

    // Skip rows with no meaningful description
    if (!description || description.length < 2) {
      // Try to build description from other cells
      description = row.filter((c, idx) => idx !== map.date && idx !== map.balance).join(' ').trim();
    }

    // Skip summary/total rows
    if (/^(?:total|grand\s*total|sub\s*total|opening|closing|balance\s*b\/f|balance\s*c\/f|page)/i.test(description)) {
      return null;
    }

    // Extract amount
    let amount = 0;
    let type = 'debit';

    if (map.debit !== undefined && map.credit !== undefined) {
      // Separate debit/credit columns
      const debitAmt = this._parseAmount(row[map.debit]);
      const creditAmt = this._parseAmount(row[map.credit]);
      if (creditAmt > 0) {
        amount = creditAmt;
        type = 'credit';
      } else if (debitAmt > 0) {
        amount = debitAmt;
        type = 'debit';
      }
    } else if (map.amount !== undefined) {
      // Single amount column — detect type from description or sign
      amount = this._parseAmount(row[map.amount]);
      type = this._detectTransactionTypeFromText(description);
    }

    if (amount <= 0) return null;

    // Extract balance
    let balance = null;
    if (map.balance !== undefined && row[map.balance]) {
      balance = this._parseAmount(row[map.balance]);
    }

    // Extract reference
    let reference = null;
    if (map.reference !== undefined && row[map.reference]) {
      reference = row[map.reference].trim();
    }

    // Categorize
    const category = this._categorizeTransaction(description);

    return {
      date: txnDate,
      description: description.substring(0, 300),
      amount,
      type,
      category: category.category,
      subcategory: category.subcategory,
      referenceNumber: reference,
      balance,
      bank: bankInfo ? bankInfo.name : null,
      bankCode: bankInfo ? bankInfo.code : null,
      confidence: this._calculateConfidence({ amount, date: txnDate, description, reference, balance, bank: bankInfo }),
      tags: ['gmail', 'statement'],
    };
  }

  /**
   * Extract transactions from div-based structured layouts.
   * Some banks/wallets use div grids instead of tables.
   *
   * @private
   * @param {string} html
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Array<Object>}
   */
  _extractFromStructuredDivs(html, fallbackDate, bankInfo) {
    const transactions = [];

    // Pattern: divs containing transaction-like blocks
    const blockRegex = /<div[^>]*class="[^"]*(?:transaction|txn|payment|entry|row|item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let blockMatch;

    while ((blockMatch = blockRegex.exec(html)) !== null) {
      try {
        const blockText = this._stripHtml(blockMatch[1]).trim();
        if (blockText.length < 10) continue;

        const amount = this._extractFirstAmount(blockText);
        if (!amount || amount < this.minimumAmount) continue;

        const date = this._extractFirstDate(blockText) || fallbackDate;
        const type = this._detectTransactionTypeFromText(blockText);
        const category = this._categorizeTransaction(blockText);
        const reference = this._extractFirstReference(blockText);

        transactions.push({
          date,
          description: blockText.substring(0, 300),
          amount,
          type,
          category: category.category,
          subcategory: category.subcategory,
          referenceNumber: reference,
          bank: bankInfo ? bankInfo.name : null,
          bankCode: bankInfo ? bankInfo.code : null,
          confidence: this._calculateConfidence({ amount, date, description: blockText, reference, bank: bankInfo }),
          extractionMethod: 'html_div',
          tags: ['gmail'],
        });
      } catch (divErr) {
        logger.debug(`${LOG_PREFIX} Div block parse error: ${divErr.message}`);
      }
    }

    return transactions;
  }

  // ==========================================================================
  // PLAIN TEXT EXTRACTION
  // ==========================================================================

  /**
   * Extract transactions from plain text email body.
   * Handles line-by-line parsing and block detection.
   *
   * @param {string} text - Plain text email body
   * @param {Date}   [fallbackDate] - Fallback date
   * @param {Object} [bankInfo] - Bank info
   * @returns {Array<Object>}
   */
  extractFromPlainText(text, fallbackDate = new Date(), bankInfo = null) {
    if (!text || text.length < 20) return [];

    const transactions = [];
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

    try {
      // ── Method A: Line-by-line amount detection ──
      const lineTransactions = this._extractTransactionsFromLines(lines, fallbackDate, bankInfo);
      transactions.push(...lineTransactions);

      // ── Method B: Block-based detection (paragraph transaction blocks) ──
      const blockTransactions = this._extractTransactionsFromBlocks(text, fallbackDate, bankInfo);
      transactions.push(...blockTransactions);

      // ── Method C: Tabular text (space/tab-delimited) ──
      const tabularTransactions = this._extractFromTabularText(lines, fallbackDate, bankInfo);
      transactions.push(...tabularTransactions);

    } catch (err) {
      logger.warn(`${LOG_PREFIX} Plain text extraction error: ${err.message}`);
    }

    return transactions;
  }

  /**
   * Extract transactions by scanning individual lines for amounts.
   *
   * @private
   * @param {string[]} lines
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Array<Object>}
   */
  _extractTransactionsFromLines(lines, fallbackDate, bankInfo) {
    const transactions = [];
    let contextDate = fallbackDate;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Update context date if this line has a date
      const lineDate = this._extractFirstDate(line);
      if (lineDate) contextDate = lineDate;

      // Check for amount
      const amount = this._extractFirstAmount(line);
      if (!amount || amount < this.minimumAmount || amount > this.maximumAmount) continue;

      // Build context from surrounding lines
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(lines.length - 1, i + 1);
      const context = lines.slice(contextStart, contextEnd + 1).join(' ');

      // Check if this line is a header or summary — skip
      if (/^(?:total|balance|opening|closing|summary|page|date|narration|description)/i.test(line)) {
        continue;
      }

      const type = this._detectTransactionTypeFromText(context);
      const category = this._categorizeTransaction(context);
      const reference = this._extractFirstReference(context);
      const merchant = this._extractMerchant(context);
      const accountNumber = this._extractAccountNumber(context);
      const balance = this._extractBalance(context);

      // Build description
      let description = line.replace(/(?:₹|rs\.?|inr\.?)\s*[\d,]+(?:\.\d{1,2})?/gi, '').trim();
      if (description.length < 5) description = context.substring(0, 200);

      transactions.push({
        date: contextDate,
        description: description.substring(0, 300),
        amount,
        type,
        category: category.category,
        subcategory: category.subcategory,
        referenceNumber: reference,
        accountNumber,
        balance,
        merchantName: merchant,
        bank: bankInfo ? bankInfo.name : null,
        bankCode: bankInfo ? bankInfo.code : null,
        confidence: this._calculateConfidence({ amount, date: contextDate, description, reference, balance, bank: bankInfo, merchant, accountNumber }),
        extractionMethod: 'plain_text_line',
        tags: ['gmail'],
      });
    }

    return transactions;
  }

  /**
   * Extract transactions from text blocks separated by double newlines or dividers.
   *
   * @private
   * @param {string} text
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Array<Object>}
   */
  _extractTransactionsFromBlocks(text, fallbackDate, bankInfo) {
    const transactions = [];
    // Split by double newline or horizontal separators
    const blocks = text.split(/\n{2,}|[-=_]{3,}/).filter(b => b.trim().length > 15);

    for (const block of blocks) {
      const trimmed = block.trim();
      const amounts = this._extractAllAmounts(trimmed);
      if (amounts.length === 0) continue;
      if (amounts.length > 5) continue; // Likely a summary block

      // Use the primary (usually largest or first) amount
      const primaryAmount = amounts[0];
      if (primaryAmount < this.minimumAmount || primaryAmount > this.maximumAmount) continue;

      const date = this._extractFirstDate(trimmed) || fallbackDate;
      const type = this._detectTransactionTypeFromText(trimmed);
      const category = this._categorizeTransaction(trimmed);
      const reference = this._extractFirstReference(trimmed);
      const merchant = this._extractMerchant(trimmed);
      const accountNumber = this._extractAccountNumber(trimmed);
      const balance = this._extractBalance(trimmed);

      // Deduplicate: avoid adding if a line-based transaction already covers this
      const description = trimmed.substring(0, 300);

      transactions.push({
        date,
        description,
        amount: primaryAmount,
        type,
        category: category.category,
        subcategory: category.subcategory,
        referenceNumber: reference,
        accountNumber,
        balance,
        merchantName: merchant,
        bank: bankInfo ? bankInfo.name : null,
        bankCode: bankInfo ? bankInfo.code : null,
        confidence: this._calculateConfidence({ amount: primaryAmount, date, description, reference, balance, bank: bankInfo, merchant, accountNumber }),
        extractionMethod: 'plain_text_block',
        tags: ['gmail'],
      });
    }

    return transactions;
  }

  /**
   * Extract transactions from space/tab-delimited tabular plain text.
   * Common in forwarded or copy-pasted bank statements.
   *
   * @private
   * @param {string[]} lines
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Array<Object>}
   */
  _extractFromTabularText(lines, fallbackDate, bankInfo) {
    const transactions = [];

    // Detect tabular structure: look for lines with 3+ whitespace-separated columns
    const tabularLines = lines.filter(line => {
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
      return parts.length >= 3;
    });

    if (tabularLines.length < 3) return []; // Not enough rows for a table

    // Check if the first tabular line looks like a header
    const firstLine = tabularLines[0];
    const isHeader = /date|description|narration|amount|debit|credit|balance|particulars/i.test(firstLine);

    // Parse column map from header
    let columnMap = null;
    let startIndex = 0;
    if (isHeader) {
      const headerParts = firstLine.split(/\s{2,}|\t/).map(p => p.trim());
      columnMap = this._detectTableColumns(headerParts);
      startIndex = 1;
    }

    for (let i = startIndex; i < tabularLines.length; i++) {
      try {
        const parts = tabularLines[i].split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length < 3) continue;

        if (columnMap && columnMap.hasFinancialData) {
          const txn = this._parseTableRow(parts, columnMap, fallbackDate, bankInfo);
          if (txn && txn.amount > this.minimumAmount) {
            txn.extractionMethod = 'tabular_text';
            transactions.push(txn);
          }
        } else {
          // Heuristic: first column is date, middle is description, last columns are amounts
          const date = this._parseDate(parts[0]);
          const description = parts.slice(1, -2).join(' ');
          const lastTwo = parts.slice(-2);
          let amount = 0;
          let type = 'debit';

          for (const val of lastTwo) {
            const parsed = this._parseAmount(val);
            if (parsed > 0) {
              amount = parsed;
              break;
            }
          }

          if (amount > this.minimumAmount && amount < this.maximumAmount) {
            type = this._detectTransactionTypeFromText(description);
            const category = this._categorizeTransaction(description);
            transactions.push({
              date: date || fallbackDate,
              description: description.substring(0, 300),
              amount,
              type,
              category: category.category,
              subcategory: category.subcategory,
              bank: bankInfo ? bankInfo.name : null,
              bankCode: bankInfo ? bankInfo.code : null,
              confidence: 0.45,
              extractionMethod: 'tabular_text_heuristic',
              tags: ['gmail', 'statement'],
            });
          }
        }
      } catch (tabErr) {
        logger.debug(`${LOG_PREFIX} Tabular row parse error at line ${i}: ${tabErr.message}`);
      }
    }

    return transactions;
  }

  // ==========================================================================
  // UPI TRANSACTION EXTRACTION
  // ==========================================================================

  /**
   * Extract UPI-specific transaction details.
   *
   * @param {string} subject - Email subject
   * @param {string} body - Email body (text)
   * @param {Date}   [fallbackDate] - Fallback date
   * @param {Object} [bankInfo] - Bank info
   * @returns {Array<Object>}
   */
  extractUPITransaction(subject, body, fallbackDate = new Date(), bankInfo = null) {
    const transactions = [];
    const combined = `${subject}\n${body}`;

    // Skip if not clearly UPI-related
    if (!/upi|unified\s*payment/i.test(combined)) return transactions;

    try {
      // Extract amount
      const amount = this._extractFirstAmount(combined);
      if (!amount || amount < this.minimumAmount) return transactions;

      // Extract UPI VPA addresses
      const vpas = this._extractUPIVPAs(combined);

      // Extract UPI reference (12-digit)
      let upiRef = null;
      const upiRefMatch = combined.match(/(?:UPI\s*(?:ref|txn|transaction|reference)\s*(?:no\.?|id|#)?\s*[:.]?\s*)(\d{12})/i);
      if (upiRefMatch) upiRef = upiRefMatch[1];

      // Fallback reference
      const reference = upiRef || this._extractFirstReference(combined);

      // Detect type
      const type = this._detectTransactionTypeFromText(combined);

      // Extract merchant from VPA or text
      let merchant = null;
      if (vpas.length > 0) {
        // Use the recipient VPA as merchant hint
        const recipientVpa = type === 'debit' ? vpas[vpas.length - 1] : vpas[0];
        merchant = this._merchantFromVPA(recipientVpa);
      }
      if (!merchant) {
        merchant = this._extractMerchant(combined);
      }

      // Extract account info
      const accountNumber = this._extractAccountNumber(combined);
      const balance = this._extractBalance(combined);
      const date = this._extractFirstDate(combined) || fallbackDate;

      // Build description
      const descParts = ['UPI'];
      if (type === 'debit') descParts.push('payment');
      else descParts.push('received');
      if (merchant) descParts.push(type === 'debit' ? `to ${merchant}` : `from ${merchant}`);
      if (upiRef) descParts.push(`Ref: ${upiRef}`);

      const txn = {
        date,
        description: descParts.join(' ').substring(0, 300),
        amount,
        type,
        category: 'UPI Payments',
        subcategory: type === 'credit' ? 'UPI Credit' : 'UPI Debit',
        paymentMethod: 'upi',
        referenceNumber: reference,
        accountNumber,
        balance,
        merchantName: merchant,
        bank: bankInfo ? bankInfo.name : null,
        bankCode: bankInfo ? bankInfo.code : null,
        upiDetails: {
          vpas,
          upiRef,
          senderVpa: vpas.length > 0 ? vpas[0] : null,
          receiverVpa: vpas.length > 1 ? vpas[1] : (vpas.length === 1 ? vpas[0] : null),
        },
        confidence: this._calculateConfidence({ amount, date, reference, balance, bank: bankInfo, merchant, accountNumber, hasUPI: true }),
        extractionMethod: 'upi_specific',
        tags: ['gmail', 'upi'],
      };

      transactions.push(txn);

    } catch (err) {
      logger.warn(`${LOG_PREFIX} UPI extraction error: ${err.message}`);
    }

    return transactions;
  }

  // ==========================================================================
  // BANK ALERT EXTRACTION
  // ==========================================================================

  /**
   * Extract transactions from bank email alerts.
   * Handles the specific phrasing patterns used by each Indian bank.
   *
   * @param {string} subject - Email subject
   * @param {string} body - Email body text
   * @param {string} senderEmail - Sender email address
   * @param {Date}   [fallbackDate] - Fallback date
   * @param {Object} [bankInfo] - Bank info
   * @returns {Array<Object>}
   */
  extractBankAlert(subject, body, senderEmail, fallbackDate = new Date(), bankInfo = null) {
    const transactions = [];
    const combined = `${subject}\n${body}`;

    try {
      // ── Try bank-specific patterns first ──
      if (bankInfo && bankInfo.code) {
        const bankPatterns = BANK_FORMAT_PATTERNS[bankInfo.code];
        if (bankPatterns) {
          for (const pattern of bankPatterns) {
            const match = combined.match(pattern);
            if (match) {
              const txn = this._buildTransactionFromBankMatch(match, combined, fallbackDate, bankInfo);
              if (txn) {
                txn.extractionMethod = 'bank_specific_pattern';
                transactions.push(txn);
                logger.debug(`${LOG_PREFIX} Matched bank-specific pattern for ${bankInfo.code}`);
              }
            }
          }
        }
      }

      // ── Generic bank alert patterns ──
      if (transactions.length === 0) {
        const genericPatterns = [
          // "Rs. 5,000 debited from a/c XX1234"
          /(?:₹|rs\.?|inr\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been\s*)?(?:debited|credited|charged|deducted|transferred|added|received)\s*(?:from|to|in)?\s*(?:your\s*)?(?:a\/c|account|acct)?\s*[*xX]*(\d{4})?/i,
          // "a/c XX1234 is debited for Rs. 5,000"
          /(?:a\/c|account|acct)\s*[*xX]*(\d{4,})\s*(?:is|has been)\s*(debited|credited)\s*(?:by|with|for)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
          // "Transaction alert: Rs. 5,000 debited"
          /(?:transaction\s*alert|txn\s*alert|alert)\s*[:\-]?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited)/i,
        ];

        for (const pattern of genericPatterns) {
          const match = combined.match(pattern);
          if (match) {
            const txn = this._buildTransactionFromGenericMatch(match, combined, fallbackDate, bankInfo);
            if (txn) {
              txn.extractionMethod = 'generic_bank_alert';
              transactions.push(txn);
              break; // Use first matching pattern
            }
          }
        }
      }

      // ── Credit card alert patterns ──
      if (transactions.length === 0) {
        const ccPatterns = [
          /(?:credit\s*card|card)\s*[*xX]*(\d{4})\s*(?:has been|was)?\s*(?:charged|used|debited)\s*(?:for)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
          /(?:₹|rs\.?|inr\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:charged|spent|used)\s*(?:on|at|via)\s*(?:your\s*)?(?:credit\s*card|card)\s*[*xX]*(\d{4})?/i,
          /transaction\s*(?:of)?\s*(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:on|at)\s*(?:your\s*)?(?:card|cc)\s*[*xX]*(\d{4})?/i,
        ];

        for (const pattern of ccPatterns) {
          const match = combined.match(pattern);
          if (match) {
            const amount = this._parseAmount(match[1] || match[2]);
            const cardLast4 = match[2] || match[1];
            if (amount > this.minimumAmount) {
              const date = this._extractFirstDate(combined) || fallbackDate;
              const merchant = this._extractMerchant(combined);
              const reference = this._extractFirstReference(combined);
              const balance = this._extractBalance(combined);

              transactions.push({
                date,
                description: `Credit Card transaction${merchant ? ' at ' + merchant : ''} (card **${cardLast4 || '****'})`.substring(0, 300),
                amount,
                type: 'debit',
                category: 'Credit Card',
                subcategory: 'Card Transaction',
                paymentMethod: 'card',
                referenceNumber: reference,
                cardLast4: /^\d{4}$/.test(cardLast4) ? cardLast4 : null,
                balance,
                merchantName: merchant,
                bank: bankInfo ? bankInfo.name : null,
                bankCode: bankInfo ? bankInfo.code : null,
                confidence: this._calculateConfidence({ amount, date, reference, balance, bank: bankInfo, merchant }),
                extractionMethod: 'credit_card_alert',
                tags: ['gmail', 'credit_card'],
              });
              break;
            }
          }
        }
      }

    } catch (err) {
      logger.warn(`${LOG_PREFIX} Bank alert extraction error: ${err.message}`);
    }

    return transactions;
  }

  /**
   * Build a transaction object from a bank-specific regex match.
   *
   * @private
   * @param {RegExpMatchArray} match
   * @param {string} fullText
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Object|null}
   */
  _buildTransactionFromBankMatch(match, fullText, fallbackDate, bankInfo) {
    try {
      // Bank-specific patterns have varying group positions
      // Try to extract amount, type, account from match groups
      let amount = 0;
      let type = 'debit';
      let accountNumber = null;

      for (let g = 1; g < match.length; g++) {
        const val = (match[g] || '').trim();
        if (!val) continue;

        // Is it an amount?
        const parsedAmount = this._parseAmount(val);
        if (parsedAmount > 0 && parsedAmount < this.maximumAmount) {
          amount = parsedAmount;
          continue;
        }

        // Is it a type indicator?
        if (/^(?:debited|debit)$/i.test(val)) { type = 'debit'; continue; }
        if (/^(?:credited|credit)$/i.test(val)) { type = 'credit'; continue; }

        // Is it an account number?
        if (/^\d{4,}$/.test(val)) { accountNumber = val; continue; }
      }

      if (amount <= 0) return null;

      // Also detect type from full text if not found in match
      if (!match.some(m => /debited|credited/i.test(m || ''))) {
        type = this._detectTransactionTypeFromText(fullText);
      }

      const date = this._extractFirstDate(fullText) || fallbackDate;
      const reference = this._extractFirstReference(fullText);
      const balance = this._extractBalance(fullText);
      const merchant = this._extractMerchant(fullText);
      const category = this._categorizeTransaction(fullText);

      return {
        date,
        description: this._buildAlertDescription(type, amount, merchant, bankInfo, accountNumber),
        amount,
        type,
        category: category.category,
        subcategory: category.subcategory,
        paymentMethod: this._detectPaymentMethod(fullText),
        referenceNumber: reference,
        accountNumber,
        balance,
        merchantName: merchant,
        bank: bankInfo ? bankInfo.name : null,
        bankCode: bankInfo ? bankInfo.code : null,
        confidence: this._calculateConfidence({ amount, date, reference, balance, bank: bankInfo, merchant, accountNumber }),
        tags: ['gmail', 'bank_alert'],
      };
    } catch (err) {
      logger.debug(`${LOG_PREFIX} Bank match build error: ${err.message}`);
      return null;
    }
  }

  /**
   * Build a transaction from a generic alert regex match.
   *
   * @private
   * @param {RegExpMatchArray} match
   * @param {string} fullText
   * @param {Date} fallbackDate
   * @param {Object} bankInfo
   * @returns {Object|null}
   */
  _buildTransactionFromGenericMatch(match, fullText, fallbackDate, bankInfo) {
    try {
      // Find the amount in match groups
      let amount = 0;
      let accountNumber = null;

      for (let g = 1; g < match.length; g++) {
        const val = (match[g] || '').trim();
        if (!val) continue;

        const parsedAmount = this._parseAmount(val);
        if (parsedAmount > 0 && parsedAmount < this.maximumAmount && amount === 0) {
          amount = parsedAmount;
          continue;
        }

        if (/^\d{4,}$/.test(val) && !accountNumber) {
          accountNumber = val;
        }
      }

      if (amount <= 0) return null;

      const type = this._detectTransactionTypeFromText(fullText);
      const date = this._extractFirstDate(fullText) || fallbackDate;
      const reference = this._extractFirstReference(fullText);
      const balance = this._extractBalance(fullText);
      const merchant = this._extractMerchant(fullText);
      const category = this._categorizeTransaction(fullText);

      return {
        date,
        description: this._buildAlertDescription(type, amount, merchant, bankInfo, accountNumber),
        amount,
        type,
        category: category.category,
        subcategory: category.subcategory,
        paymentMethod: this._detectPaymentMethod(fullText),
        referenceNumber: reference,
        accountNumber: accountNumber || this._extractAccountNumber(fullText),
        balance,
        merchantName: merchant,
        bank: bankInfo ? bankInfo.name : null,
        bankCode: bankInfo ? bankInfo.code : null,
        confidence: this._calculateConfidence({ amount, date, reference, balance, bank: bankInfo, merchant, accountNumber }),
        tags: ['gmail', 'bank_alert'],
      };
    } catch (err) {
      logger.debug(`${LOG_PREFIX} Generic match build error: ${err.message}`);
      return null;
    }
  }

  // ==========================================================================
  // STATEMENT SUMMARY EXTRACTION
  // ==========================================================================

  /**
   * Extract opening/closing balance and summary info from a bank statement.
   *
   * @param {string} text - Statement text
   * @returns {Object|null} Statement summary or null
   */
  extractStatementSummary(text) {
    if (!text || text.length < 50) return null;

    try {
      const summary = {
        openingBalance: null,
        closingBalance: null,
        totalDebits: null,
        totalCredits: null,
        transactionCount: null,
        statementPeriod: null,
        accountNumber: null,
        accountHolder: null,
      };

      let found = false;

      // Opening balance
      const openingMatch = text.match(/(?:opening|open(?:ing)?\s*bal(?:ance)?|b\/f|brought\s*forward)\s*[:.]?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (openingMatch) {
        summary.openingBalance = this._parseAmount(openingMatch[1]);
        found = true;
      }

      // Closing balance
      const closingMatch = text.match(/(?:closing|close(?:ing)?\s*bal(?:ance)?|c\/f|carried\s*forward)\s*[:.]?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (closingMatch) {
        summary.closingBalance = this._parseAmount(closingMatch[1]);
        found = true;
      }

      // Total debits
      const totalDebitMatch = text.match(/(?:total\s*debit|total\s*withdrawal|debit\s*total)\s*[:.]?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (totalDebitMatch) {
        summary.totalDebits = this._parseAmount(totalDebitMatch[1]);
        found = true;
      }

      // Total credits
      const totalCreditMatch = text.match(/(?:total\s*credit|total\s*deposit|credit\s*total)\s*[:.]?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (totalCreditMatch) {
        summary.totalCredits = this._parseAmount(totalCreditMatch[1]);
        found = true;
      }

      // Transaction count
      const txnCountMatch = text.match(/(?:no\.?\s*of\s*transactions?|transaction\s*count|total\s*entries)\s*[:.]?\s*(\d+)/i);
      if (txnCountMatch) {
        summary.transactionCount = parseInt(txnCountMatch[1]);
        found = true;
      }

      // Statement period (DD/MM/YYYY to DD/MM/YYYY)
      const periodMatch = text.match(/(?:statement\s*(?:period|from)|period|from)\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
      if (periodMatch) {
        summary.statementPeriod = {
          from: this._parseDate(periodMatch[1]),
          to: this._parseDate(periodMatch[2]),
          raw: `${periodMatch[1]} to ${periodMatch[2]}`,
        };
        found = true;
      }

      // Account number
      const acctMatch = text.match(/(?:account\s*(?:no\.?|number)|a\/c\s*(?:no\.?))\s*[:.]?\s*([A-Z0-9*xX]{6,20})/i);
      if (acctMatch) {
        summary.accountNumber = acctMatch[1];
        found = true;
      }

      // Account holder name
      const holderMatch = text.match(/(?:account\s*holder|name|customer\s*name)\s*[:.]?\s*([A-Za-z\s.]{3,50})/i);
      if (holderMatch) {
        summary.accountHolder = holderMatch[1].trim();
        found = true;
      }

      return found ? summary : null;

    } catch (err) {
      logger.warn(`${LOG_PREFIX} Statement summary extraction error: ${err.message}`);
      return null;
    }
  }

  // ==========================================================================
  // DEDUPLICATION
  // ==========================================================================

  /**
   * Remove duplicate transactions from the extracted set.
   * Uses composite key: date + amount + type + reference/description.
   *
   * @param {Array<Object>} transactions - Raw extracted transactions
   * @returns {Array<Object>} Deduplicated transactions
   */
  deduplicateTransactions(transactions) {
    if (!transactions || transactions.length === 0) return [];

    const seen = new Map();
    const deduplicated = [];

    for (const txn of transactions) {
      // Build dedup key
      const dateKey = txn.date ? new Date(txn.date).toISOString().split('T')[0] : 'nodate';
      const amountKey = (txn.amount || 0).toFixed(2);
      const typeKey = txn.type || 'unknown';
      const refKey = txn.referenceNumber || '';
      const descKey = (txn.description || '').substring(0, 50).toLowerCase().replace(/\s+/g, '');

      // Primary key: date + amount + type + reference
      const primaryKey = `${dateKey}|${amountKey}|${typeKey}|${refKey}`;
      // Secondary key: date + amount + type + description hash
      const secondaryKey = `${dateKey}|${amountKey}|${typeKey}|${descKey}`;

      if (refKey && seen.has(primaryKey)) {
        // Exact duplicate by reference — keep the one with higher confidence
        const existing = seen.get(primaryKey);
        if ((txn.confidence || 0) > (existing.confidence || 0)) {
          // Replace with higher confidence version
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) deduplicated[idx] = txn;
          seen.set(primaryKey, txn);
        }
        continue;
      }

      if (!refKey && seen.has(secondaryKey)) {
        // Likely duplicate by description
        const existing = seen.get(secondaryKey);
        if ((txn.confidence || 0) > (existing.confidence || 0)) {
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) deduplicated[idx] = txn;
          seen.set(secondaryKey, txn);
        }
        continue;
      }

      seen.set(primaryKey, txn);
      seen.set(secondaryKey, txn);
      deduplicated.push(txn);
    }

    if (transactions.length !== deduplicated.length) {
      logger.info(`${LOG_PREFIX} Deduplication: ${transactions.length} → ${deduplicated.length} transactions (removed ${transactions.length - deduplicated.length} duplicates)`);
    }

    return deduplicated;
  }

  // ==========================================================================
  // ENRICHMENT
  // ==========================================================================

  /**
   * Enrich transactions with AI-derived metadata: improved categories,
   * merchant normalization, tags, and user-specific context.
   *
   * @param {Array<Object>} transactions - Extracted transactions
   * @param {string} [userId] - User ID for personalized enrichment
   * @returns {Promise<Array<Object>>} Enriched transactions
   */
  async enrichTransactions(transactions, userId = null) {
    if (!transactions || transactions.length === 0) return [];

    logger.debug(`${LOG_PREFIX} Enriching ${transactions.length} transactions${userId ? ' for user ' + userId : ''}`);

    const enriched = [];

    for (const txn of transactions) {
      try {
        const enrichedTxn = { ...txn };

        // ── Normalize merchant name ──
        enrichedTxn.merchantName = this._normalizeMerchant(txn.merchantName || txn.description);

        // ── Improve category if confidence is low ──
        if (!txn.category || txn.category === 'Other' || txn.category === 'Other Expense') {
          const betterCategory = this._categorizeTransaction(txn.description || '');
          if (betterCategory.category !== 'Other') {
            enrichedTxn.category = betterCategory.category;
            enrichedTxn.subcategory = betterCategory.subcategory;
          }
        }

        // ── Add smart tags ──
        enrichedTxn.tags = this._generateSmartTags(enrichedTxn);

        // ── Detect recurring pattern hints ──
        enrichedTxn.isLikelyRecurring = this._isLikelyRecurring(enrichedTxn);

        // ── Normalize amount for display ──
        enrichedTxn.formattedAmount = this._formatIndianCurrency(enrichedTxn.amount);

        // ── AI category and confidence ──
        enrichedTxn.ai_category = enrichedTxn.category;
        enrichedTxn.ai_confidence = enrichedTxn.confidence || 0.5;

        // ── User ID ──
        if (userId) {
          enrichedTxn.userId = userId;
        }

        enriched.push(enrichedTxn);

      } catch (enrichErr) {
        logger.debug(`${LOG_PREFIX} Enrichment error for transaction: ${enrichErr.message}`);
        enriched.push(txn); // Return un-enriched on error
      }
    }

    logger.info(`${LOG_PREFIX} Enriched ${enriched.length} transactions`);
    return enriched;
  }

  // ==========================================================================
  // ENTITY EXTRACTION HELPERS
  // ==========================================================================

  /**
   * Extract the first amount found in text.
   *
   * @private
   * @param {string} text
   * @returns {number|null}
   */
  _extractFirstAmount(text) {
    if (!text) return null;

    for (const patternDef of AMOUNT_PATTERNS) {
      const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags.replace('g', ''));
      const match = text.match(regex);
      if (match && match[patternDef.group]) {
        let val = parseFloat(match[patternDef.group].replace(/,/g, ''));
        if (patternDef.multiplier) val *= patternDef.multiplier;
        if (val > 0 && val < this.maximumAmount) return val;
      }
    }

    return null;
  }

  /**
   * Extract all amounts found in text.
   *
   * @private
   * @param {string} text
   * @returns {number[]}
   */
  _extractAllAmounts(text) {
    if (!text) return [];

    const amounts = [];
    const seen = new Set();

    for (const patternDef of AMOUNT_PATTERNS) {
      const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        let val = parseFloat(match[patternDef.group].replace(/,/g, ''));
        if (patternDef.multiplier) val *= patternDef.multiplier;
        if (val > 0 && val < this.maximumAmount) {
          const key = val.toFixed(2);
          if (!seen.has(key)) {
            seen.add(key);
            amounts.push(val);
          }
        }
      }
    }

    return amounts;
  }

  /**
   * Extract the first date found in text.
   *
   * @private
   * @param {string} text
   * @returns {Date|null}
   */
  _extractFirstDate(text) {
    if (!text) return null;

    for (const patternDef of DATE_PATTERNS) {
      const match = text.match(patternDef.regex);
      if (match) {
        const parsed = this._parseDateMatch(match, patternDef.format);
        if (parsed) return parsed;
      }
    }

    return null;
  }

  /**
   * Extract the first reference/transaction ID found in text.
   *
   * @private
   * @param {string} text
   * @returns {string|null}
   */
  _extractFirstReference(text) {
    if (!text) return null;

    for (const pattern of REFERENCE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1].trim();
    }

    return null;
  }

  /**
   * Extract account number from text.
   *
   * @private
   * @param {string} text
   * @returns {string|null}
   */
  _extractAccountNumber(text) {
    if (!text) return null;

    for (const pattern of ACCOUNT_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  /**
   * Extract UPI VPA addresses from text.
   *
   * @private
   * @param {string} text
   * @returns {string[]}
   */
  _extractUPIVPAs(text) {
    if (!text) return [];

    const vpas = [];
    const seen = new Set();
    const regex = new RegExp(UPI_VPA_PATTERN.source, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const vpa = match[1].toLowerCase();
      // Filter out regular email addresses (basic heuristic)
      const domain = vpa.split('@')[1] || '';
      const upiDomains = ['upi', 'ybl', 'okhdfcbank', 'okicici', 'okaxis', 'oksbi',
        'paytm', 'gpay', 'ibl', 'axl', 'sbi', 'icici', 'hdfcbank',
        'axisbank', 'kotak', 'indus', 'federal', 'rbl', 'idfc',
        'apl', 'waicici', 'wahdfcbank', 'fbl', 'boi', 'cnrb',
        'pnb', 'unionbank', 'cbin', 'uboi', 'jkb', 'aubank',
        'equitas', 'ujjivan', 'dbs', 'hsbc', 'sc', 'citi',
        'slice', 'jupiter', 'fi', 'niyobank', 'airtel',
        'postbank', 'bandhan', 'indianbank', 'iob', 'uco'];

      if (upiDomains.some(d => domain.includes(d)) || domain.length <= 6) {
        if (!seen.has(vpa)) {
          seen.add(vpa);
          vpas.push(vpa);
        }
      }
    }

    return vpas;
  }

  /**
   * Extract IFSC codes from text.
   *
   * @private
   * @param {string} text
   * @returns {string[]}
   */
  _extractIFSCCodes(text) {
    if (!text) return [];

    const codes = [];
    const regex = new RegExp(IFSC_PATTERN.source, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!codes.includes(match[1])) {
        codes.push(match[1]);
      }
    }

    return codes;
  }

  /**
   * Extract last 4 digits of card number from text.
   *
   * @private
   * @param {string} text
   * @returns {string|null}
   */
  _extractCardLast4(text) {
    if (!text) return null;

    for (const pattern of CARD_LAST4_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1] && /^\d{4}$/.test(match[1])) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract balance from text.
   *
   * @private
   * @param {string} text
   * @returns {number|null}
   */
  _extractBalance(text) {
    if (!text) return null;

    for (const pattern of BALANCE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = this._parseAmount(match[1]);
        if (val >= 0 && val < this.maximumAmount) return val;
      }
    }

    return null;
  }

  /**
   * Extract merchant name from text.
   *
   * @private
   * @param {string} text
   * @returns {string|null}
   */
  _extractMerchant(text) {
    if (!text) return null;

    for (const pattern of MERCHANT_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleaned = match[1].trim().replace(/\s+/g, ' ');
        if (cleaned.length >= 2 && cleaned.length <= 80) {
          return cleaned;
        }
      }
    }

    return null;
  }

  // ==========================================================================
  // PARSING HELPERS
  // ==========================================================================

  /**
   * Parse an amount string, handling Indian format (1,23,456.78).
   *
   * @private
   * @param {string|number} amountStr
   * @returns {number}
   */
  _parseAmount(amountStr) {
    if (amountStr == null) return 0;
    if (typeof amountStr === 'number') return Math.abs(amountStr);

    const cleaned = amountStr.toString()
      .replace(/[₹Rs.\s]/gi, '')
      .replace(/,/g, '')
      .replace(/\(([^)]+)\)/, '-$1')
      .trim();

    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : Math.abs(val);
  }

  /**
   * Parse a date string into a Date object.
   *
   * @private
   * @param {string} dateStr
   * @returns {Date|null}
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD MMM YYYY
    match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1]);
      const monthKey = match[2].toLowerCase().substring(0, 3);
      const month = MONTH_MAP[monthKey];
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      if (month !== undefined) {
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }

    // YYYY-MM-DD
    match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback: native Date parsing
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Parse a date from a regex match, given its format.
   *
   * @private
   * @param {RegExpMatchArray} match
   * @param {string} format
   * @returns {Date|null}
   */
  _parseDateMatch(match, format) {
    try {
      switch (format) {
        case 'DD/MM/YYYY': {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          return new Date(year, month, day);
        }
        case 'DD MMM YYYY':
        case 'DD Month YYYY': {
          const day = parseInt(match[1]);
          const monthKey = match[2].toLowerCase().substring(0, 3);
          const month = MONTH_MAP[monthKey];
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          if (month !== undefined) return new Date(year, month, day);
          return null;
        }
        case 'MMM DD YYYY': {
          const monthKey = match[1].toLowerCase().substring(0, 3);
          const month = MONTH_MAP[monthKey];
          const day = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          if (month !== undefined) return new Date(year, month, day);
          return null;
        }
        case 'YYYY-MM-DD': {
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // DETECTION & CLASSIFICATION HELPERS
  // ==========================================================================

  /**
   * Detect the sending bank/institution from email sender info.
   *
   * @private
   * @param {string} senderEmail
   * @param {string} senderName
   * @param {string} subject
   * @returns {{ name: string, code: string }|null}
   */
  _detectBank(senderEmail, senderName, subject) {
    const combined = `${senderEmail} ${senderName} ${subject}`.toLowerCase();

    for (const [name, info] of Object.entries(BANK_SENDER_PATTERNS)) {
      if (info.regex.test(combined)) {
        return { name, code: info.code };
      }
    }

    return null;
  }

  /**
   * Determine whether an email is a bank statement (multi-transaction).
   *
   * @private
   * @param {string} subject
   * @param {string} bodyText
   * @param {string} bodyHtml
   * @returns {boolean}
   */
  _isStatementEmail(subject, bodyText, bodyHtml) {
    const combined = `${subject} ${(bodyText || '').substring(0, 500)}`;

    // Subject-based detection
    if (/(?:statement|e-?statement|account\s*summary|transaction\s*summary|monthly\s*summary)/i.test(subject)) {
      return true;
    }

    // Content-based detection: multiple amounts or table presence
    if (bodyHtml && /<table/i.test(bodyHtml)) {
      const amountCount = (bodyHtml.match(/(?:₹|rs\.?|inr\.?)\s*[\d,]+/gi) || []).length;
      if (amountCount >= 5) return true;
    }

    // Multiple date + amount pairs in text
    const dateCount = (combined.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || []).length;
    const amountCount = (combined.match(/(?:₹|rs\.?)\s*[\d,]+/gi) || []).length;
    if (dateCount >= 3 && amountCount >= 3) return true;

    // Keyword-based
    if (/(?:opening\s*bal|closing\s*bal|total\s*debit|total\s*credit|statement\s*period)/i.test(combined)) {
      return true;
    }

    return false;
  }

  /**
   * Detect transaction type (debit/credit) from text content.
   *
   * @private
   * @param {string} text
   * @returns {string} 'debit' | 'credit'
   */
  _detectTransactionTypeFromText(text) {
    if (!text) return 'debit';
    const lower = text.toLowerCase();

    // Check credit keywords first (more specific)
    for (const keyword of CREDIT_KEYWORDS) {
      if (lower.includes(keyword)) return 'credit';
    }

    // Check debit keywords
    for (const keyword of DEBIT_KEYWORDS) {
      if (lower.includes(keyword)) return 'debit';
    }

    return 'debit'; // Default to debit
  }

  /**
   * Categorize a transaction based on description text.
   *
   * @private
   * @param {string} text
   * @returns {{ category: string, subcategory: string }}
   */
  _categorizeTransaction(text) {
    if (!text) return { category: 'Other', subcategory: 'Unknown' };

    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(text)) {
        return { category: rule.category, subcategory: rule.subcategory };
      }
    }

    // Fallback based on type keywords
    const lower = text.toLowerCase();
    if (CREDIT_KEYWORDS.some(k => lower.includes(k))) {
      return { category: 'Other Income', subcategory: 'Miscellaneous Credit' };
    }
    if (DEBIT_KEYWORDS.some(k => lower.includes(k))) {
      return { category: 'Other Expense', subcategory: 'Miscellaneous Debit' };
    }

    return { category: 'Other', subcategory: 'Unknown' };
  }

  /**
   * Detect payment method from text.
   *
   * @private
   * @param {string} text
   * @returns {string}
   */
  _detectPaymentMethod(text) {
    if (!text) return 'bank_transfer';
    const lower = text.toLowerCase();

    if (/\bupi\b/i.test(lower)) return 'upi';
    if (/\bneft\b/i.test(lower)) return 'neft';
    if (/\brtgs\b/i.test(lower)) return 'rtgs';
    if (/\bimps\b/i.test(lower)) return 'imps';
    if (/\bcheque\b|\bcheck\b/i.test(lower)) return 'cheque';
    if (/credit\s*card|debit\s*card|visa|master\s*card|rupay|amex/i.test(lower)) return 'card';
    if (/net\s*banking|internet\s*banking/i.test(lower)) return 'net_banking';
    if (/wallet|paytm|phonepe|amazon\s*pay/i.test(lower)) return 'wallet';
    if (/\bnach\b|auto[\s-]*debit|standing\s*instruction/i.test(lower)) return 'nach';
    if (/\batm\b|cash\s*withdrawal/i.test(lower)) return 'atm';
    return 'bank_transfer';
  }

  // ==========================================================================
  // CONFIDENCE SCORING
  // ==========================================================================

  /**
   * Calculate a confidence score (0–1) for an extracted transaction.
   *
   * @private
   * @param {Object} factors - Extraction quality factors
   * @param {number} [factors.amount]
   * @param {Date}   [factors.date]
   * @param {string} [factors.description]
   * @param {string} [factors.reference]
   * @param {number} [factors.balance]
   * @param {Object} [factors.bank]
   * @param {string} [factors.merchant]
   * @param {string} [factors.accountNumber]
   * @param {boolean} [factors.hasUPI]
   * @returns {number} Confidence score between 0.10 and 0.99
   */
  _calculateConfidence(factors) {
    let score = 0.30; // Base score

    // Amount presence is fundamental
    if (factors.amount && factors.amount > 0) score += 0.20;

    // Date quality
    if (factors.date && factors.date instanceof Date && !isNaN(factors.date.getTime())) {
      score += 0.08;
      // Bonus for recent dates (within 2 years)
      const ageMs = Date.now() - factors.date.getTime();
      if (ageMs >= 0 && ageMs < 2 * 365 * 24 * 60 * 60 * 1000) score += 0.02;
    }

    // Description quality
    if (factors.description && factors.description.length > 10) score += 0.05;

    // Reference/transaction ID
    if (factors.reference) score += 0.10;

    // Balance present (confirms bank interaction)
    if (factors.balance != null && factors.balance >= 0) score += 0.05;

    // Bank detected
    if (factors.bank) score += 0.05;

    // Merchant identified
    if (factors.merchant) score += 0.05;

    // Account number present
    if (factors.accountNumber) score += 0.05;

    // UPI-specific data
    if (factors.hasUPI) score += 0.05;

    // Cap at 0.99
    return Math.min(0.99, Math.max(0.10, parseFloat(score.toFixed(2))));
  }

  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================

  /**
   * Strip HTML tags from a string, returning plain text.
   *
   * @private
   * @param {string} html
   * @returns {string}
   */
  _stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<\/th>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&rupee;|&#8377;/gi, '₹')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Build a human-readable description for a bank alert transaction.
   *
   * @private
   * @param {string} type - 'debit' | 'credit'
   * @param {number} amount
   * @param {string|null} merchant
   * @param {Object|null} bankInfo
   * @param {string|null} accountNumber
   * @returns {string}
   */
  _buildAlertDescription(type, amount, merchant, bankInfo, accountNumber) {
    const parts = [];

    if (type === 'credit') parts.push('Credit');
    else parts.push('Debit');

    if (merchant) {
      parts.push(type === 'credit' ? `from ${merchant}` : `to ${merchant}`);
    }

    if (bankInfo) parts.push(`(${bankInfo.name})`);
    if (accountNumber) parts.push(`A/c **${accountNumber}`);

    return parts.join(' ').substring(0, 300);
  }

  /**
   * Derive a merchant name from a UPI VPA address.
   * e.g., "swiggy@ybl" → "Swiggy", "ola.money@paytm" → "Ola Money"
   *
   * @private
   * @param {string} vpa
   * @returns {string|null}
   */
  _merchantFromVPA(vpa) {
    if (!vpa) return null;

    const parts = vpa.split('@');
    if (parts.length !== 2) return null;

    let handle = parts[0];

    // Known VPA merchants
    const knownMerchants = {
      'swiggy': 'Swiggy',
      'zomato': 'Zomato',
      'ola': 'Ola',
      'uber': 'Uber',
      'amazon': 'Amazon',
      'flipkart': 'Flipkart',
      'paytm': 'Paytm',
      'phonepe': 'PhonePe',
      'bigbasket': 'BigBasket',
      'blinkit': 'Blinkit',
      'dunzo': 'Dunzo',
      'netflix': 'Netflix',
      'spotify': 'Spotify',
      'airtel': 'Airtel',
      'jio': 'Jio',
      'irctc': 'IRCTC',
      'rapido': 'Rapido',
      'cred': 'CRED',
      'slice': 'Slice',
      'jupiter': 'Jupiter',
      'groww': 'Groww',
      'zerodha': 'Zerodha',
      'dream11': 'Dream11',
      'goibibo': 'Goibibo',
      'makemytrip': 'MakeMyTrip',
      'myntra': 'Myntra',
      'nykaa': 'Nykaa',
      'meesho': 'Meesho',
      'tatacliq': 'Tata CLiQ',
      'reliance': 'Reliance',
      'dmart': 'DMart',
      'bookmyshow': 'BookMyShow',
      'practo': 'Practo',
      'pharmeasy': 'PharmEasy',
      'lenskart': 'Lenskart',
      'cultfit': 'Cult.fit',
      'urbanclap': 'Urban Company',
      'urbancompany': 'Urban Company',
    };

    // Check against known merchants
    const handleLower = handle.toLowerCase().replace(/[._-]/g, '');
    for (const [key, name] of Object.entries(knownMerchants)) {
      if (handleLower.includes(key)) return name;
    }

    // Capitalize the handle as a merchant name
    return handle
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || null;
  }

  /**
   * Normalize merchant name: trim, title-case, remove noise.
   *
   * @private
   * @param {string} merchant
   * @returns {string|null}
   */
  _normalizeMerchant(merchant) {
    if (!merchant) return null;

    let normalized = merchant
      .replace(/\b(?:pvt|ltd|limited|private|india|corp|inc|llp|llc)\b\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Title case
    normalized = normalized.replace(/\b\w/g, c => c.toUpperCase());

    // Remove trailing punctuation
    normalized = normalized.replace(/[,.\-_:;]+$/, '').trim();

    return normalized.length >= 2 ? normalized : null;
  }

  /**
   * Generate smart tags based on transaction content.
   *
   * @private
   * @param {Object} txn
   * @returns {string[]}
   */
  _generateSmartTags(txn) {
    const tags = new Set(txn.tags || []);
    tags.add('gmail');

    const desc = (txn.description || '').toLowerCase();

    // Source-based tags
    if (txn.paymentMethod) tags.add(txn.paymentMethod);
    if (txn.bankCode) tags.add(txn.bankCode.toLowerCase());

    // Category-based tags
    if (txn.category) tags.add(txn.category.toLowerCase().replace(/[\s&]+/g, '_'));

    // Content-based tags
    if (/emi|loan|installment/i.test(desc)) tags.add('emi');
    if (/salary|payroll/i.test(desc)) tags.add('salary');
    if (/refund|reversal/i.test(desc)) tags.add('refund');
    if (/cashback|reward/i.test(desc)) tags.add('cashback');
    if (/subscription|recurring/i.test(desc)) tags.add('subscription');
    if (/tax|tds|gst/i.test(desc)) tags.add('tax');
    if (/insurance|premium/i.test(desc)) tags.add('insurance');
    if (/investment|sip|mutual\s*fund|fd/i.test(desc)) tags.add('investment');
    if (/rent/i.test(desc)) tags.add('rent');
    if (/grocery|supermarket/i.test(desc)) tags.add('grocery');
    if (/fuel|petrol|diesel/i.test(desc)) tags.add('fuel');
    if (/medical|hospital|pharmacy/i.test(desc)) tags.add('medical');
    if (/travel|flight|hotel|booking/i.test(desc)) tags.add('travel');

    // Amount-based tags
    if (txn.amount >= 100000) tags.add('high_value');
    if (txn.amount >= 1000000) tags.add('very_high_value');

    return Array.from(tags);
  }

  /**
   * Heuristic: is this transaction likely recurring?
   *
   * @private
   * @param {Object} txn
   * @returns {boolean}
   */
  _isLikelyRecurring(txn) {
    const desc = (txn.description || '').toLowerCase();

    const recurringKeywords = [
      'emi', 'installment', 'equated monthly', 'auto-debit', 'auto debit',
      'standing instruction', 'nach', 'mandate', 'subscription', 'recurring',
      'monthly', 'rent', 'premium', 'sip', 'netflix', 'spotify', 'prime',
      'hotstar', 'youtube premium', 'icloud', 'internet bill', 'broadband',
      'phone bill', 'electricity', 'water bill', 'gas bill', 'dth',
    ];

    return recurringKeywords.some(kw => desc.includes(kw));
  }

  /**
   * Format a number as Indian currency string.
   *
   * @private
   * @param {number} amount
   * @returns {string}
   */
  _formatIndianCurrency(amount) {
    if (amount == null || isNaN(amount)) return '₹0.00';

    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `₹${formatted}`;
  }
}


// ============================================================================
// BATCH PROCESSING HELPERS
// ============================================================================

/**
 * Process a batch of GmailEmail documents and extract all transactions.
 *
 * @param {Array<Object>} emails - Array of GmailEmail documents
 * @param {Object} [options] - Processing options
 * @param {string} [options.userId] - User ID for enrichment
 * @param {boolean} [options.enrich=true] - Whether to run enrichment
 * @param {boolean} [options.deduplicate=true] - Whether to deduplicate across emails
 * @returns {Promise<{ transactions: Array, metadata: Object }>}
 */
async function extractFromEmailBatch(emails, options = {}) {
  const extractor = new EmailTransactionExtractor();
  const { userId = null, enrich = true, deduplicate = true } = options;

  const startTime = Date.now();
  let allTransactions = [];
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  logger.info(`${LOG_PREFIX} Starting batch extraction for ${emails.length} emails`);

  for (const email of emails) {
    try {
      const result = await extractor.extractFromEmail(email);
      if (result.transactions.length > 0) {
        allTransactions.push(...result.transactions);
        successCount++;
      } else {
        skipCount++;
      }
    } catch (err) {
      errorCount++;
      logger.warn(`${LOG_PREFIX} Batch: Error processing email "${(email.subject || '').substring(0, 40)}": ${err.message}`);
    }
  }

  // Cross-email deduplication
  if (deduplicate) {
    allTransactions = extractor.deduplicateTransactions(allTransactions);
  }

  // Enrichment
  if (enrich) {
    allTransactions = await extractor.enrichTransactions(allTransactions, userId);
  }

  const processingTimeMs = Date.now() - startTime;
  const metadata = {
    totalEmails: emails.length,
    emailsWithTransactions: successCount,
    emailsSkipped: skipCount,
    emailsErrored: errorCount,
    totalTransactions: allTransactions.length,
    processingTimeMs,
    averagePerEmailMs: emails.length > 0 ? Math.round(processingTimeMs / emails.length) : 0,
  };

  logger.info(`${LOG_PREFIX} Batch complete: ${allTransactions.length} transactions from ${successCount}/${emails.length} emails in ${processingTimeMs}ms`);

  return { transactions: allTransactions, metadata };
}

/**
 * Quick extraction utility: extract transactions from raw email text content
 * without needing a full GmailEmail document.
 *
 * @param {string} subject
 * @param {string} bodyText
 * @param {string} [bodyHtml]
 * @param {string} [senderEmail]
 * @param {Date}   [date]
 * @returns {Promise<Array<Object>>}
 */
async function quickExtract(subject, bodyText, bodyHtml = '', senderEmail = '', date = new Date()) {
  const extractor = new EmailTransactionExtractor();
  const email = {
    subject,
    bodyText,
    bodyHtml,
    snippet: bodyText ? bodyText.substring(0, 200) : '',
    from: { email: senderEmail, name: '' },
    date,
    gmailMessageId: `quick_${Date.now()}`,
  };

  const result = await extractor.extractFromEmail(email);
  return result.transactions;
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  EmailTransactionExtractor,
  extractFromEmailBatch,
  quickExtract,

  // Expose patterns for external use/testing
  BANK_SENDER_PATTERNS,
  AMOUNT_PATTERNS,
  ACCOUNT_PATTERNS,
  REFERENCE_PATTERNS,
  BALANCE_PATTERNS,
  DATE_PATTERNS,
  UPI_PATTERNS,
  BANK_FORMAT_PATTERNS,
  CATEGORY_RULES,
  DEBIT_KEYWORDS,
  CREDIT_KEYWORDS,
  MONTH_MAP,
};
