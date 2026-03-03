// ============================================================================
// ENTERPRISE EMAIL TRANSACTION PARSER
// Extracts financial transactions from ALL types of Indian bank/financial emails
// Covers: Bank alerts, CC charges, NEFT/RTGS/IMPS, salary, EMI, bills, etc.
// ============================================================================
const logger = require('../utils/logger');

// ── Indian Bank Sender Patterns ─────────────────────────────────────────────
const BANK_SENDERS = {
  'SBI':    /sbi|state bank|onlinesbi/i,
  'HDFC':   /hdfc(?:bank)?|hdfcbank/i,
  'ICICI':  /icici(?:bank)?|icicibank/i,
  'Axis':   /axis(?:bank)?|axisbank/i,
  'Kotak':  /kotak(?:bank)?|kotakbank/i,
  'PNB':    /pnb|punjab national/i,
  'BOB':    /bob|bank of baroda/i,
  'BOI':    /boi|bank of india/i,
  'Canara': /canara(?:bank)?/i,
  'Union':  /union(?:bank)?|unionbank/i,
  'IDBI':   /idbi(?:bank)?/i,
  'IndusInd':/indusind/i,
  'Yes Bank':/yesbank|yes bank/i,
  'Federal':/federal(?:bank)?/i,
  'RBL':    /rbl(?:bank)?/i,
  'IDFC':   /idfc(?:first)?/i,
  'Citi':   /citi(?:bank)?/i,
  'HSBC':   /hsbc/i,
  'SC':     /standard chartered/i,
  'DBS':    /dbs(?:bank)?/i,
  'Paytm':  /paytm/i,
  'PhonePe':/phonepe/i,
  'GPay':   /googlepay|google pay|gpay/i,
  'Amazon': /amazon\s?pay/i,
  'CRED':   /cred\.club|cred/i,
  'Razorpay':/razorpay/i,
};

// ── Amount Extraction Patterns ──────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  /(?:₹|rs\.?|inr\.?|rupees?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:amount|amt)[\s:]*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees?)/i,
  /(?:debited|credited|paid|received|charged|deducted|transferred)\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

// ── Account Number Patterns ─────────────────────────────────────────────────
const ACCOUNT_PATTERNS = [
  /a\/c\s*(?:no\.?\s*)?[*xX]*(\d{4,})/i,
  /account\s*(?:no\.?\s*)?[*xX]*(\d{4,})/i,
  /(?:ac|acct)\s*(?:no\.?)?\s*[*xX]*(\d{4,})/i,
  /ending\s*(?:with\s*)?(\d{4})/i,
  /xx+(\d{4})/i,
  /\*{2,}(\d{4})/,
];

// ── Reference/Transaction ID Patterns ───────────────────────────────────────
const REFERENCE_PATTERNS = [
  /(?:ref(?:erence)?|txn|transaction)\s*(?:no\.?|id|#)?\s*[:.]?\s*([A-Z0-9]{6,})/i,
  /(?:UTR|IMPS|NEFT|RTGS)\s*(?:no\.?|ref)?\s*[:.]?\s*([A-Z0-9]{8,})/i,
  /(?:UPI)\s*(?:ref|txn)?\s*[:.]?\s*([A-Z0-9]{8,})/i,
  /(?:order\s*(?:id|#|no))\s*[:.]?\s*([A-Z0-9-]{6,})/i,
];

// ── Balance Pattern ─────────────────────────────────────────────────────────
const BALANCE_PATTERNS = [
  /(?:balance|bal|avl\.?\s*bal|available)\s*(?:is|:)?\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:avail(?:able)?)\s*(?:₹|rs\.?|inr\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

// ── Date Extraction Patterns ────────────────────────────────────────────────
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,                    // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,  // 15 Jan 2026
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{2,4})/i, // Jan 15, 2026
];

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// ============================================================================
// TRANSACTION TYPE DETECTORS
// ============================================================================

/**
 * Detect the transaction type and category from email content
 */
function detectTransactionType(content, subject, from) {
  const lower = (content + ' ' + subject + ' ' + from).toLowerCase();

  // ── Credit Card ──
  if (/credit\s*card|cc\s*(?:ending|xx|no)|card\s*(?:ending|xx|no)|mastercard|visa\s*card/i.test(lower)) {
    if (/(?:payment|bill)\s*(?:due|reminder|outstanding)/i.test(lower)) {
      return { category: 'Bills & Payments', subcategory: 'Credit Card Bill', transactionType: 'reminder' };
    }
    if (/(?:charged|spent|transaction|purchase|debited)/i.test(lower)) {
      return { category: 'Credit Card Spend', subcategory: 'Card Transaction', transactionType: 'debit' };
    }
    if (/(?:credited|refund|reversal|cashback)/i.test(lower)) {
      return { category: 'Credit Card Refund', subcategory: 'Refund', transactionType: 'credit' };
    }
    if (/(?:statement|bill)/i.test(lower)) {
      return { category: 'Bills & Payments', subcategory: 'Credit Card Statement', transactionType: 'info' };
    }
    return { category: 'Credit Card Spend', subcategory: 'Card Transaction', transactionType: 'debit' };
  }

  // ── Salary / Payroll ──
  if (/salary|payroll|pay\s*slip|wages?\b|compensation|ctc/i.test(lower)) {
    return { category: 'Income', subcategory: 'Salary', transactionType: 'credit' };
  }

  // ── EMI / Loan ──
  if (/emi|equated monthly|loan\s*(?:repayment|installment|payment)|mortgage/i.test(lower)) {
    return { category: 'Loans & EMI', subcategory: 'EMI Payment', transactionType: 'debit' };
  }

  // ── NEFT ──
  if (/neft/i.test(lower)) {
    if (/(?:credited|received|incoming)/i.test(lower)) {
      return { category: 'Bank Transfer', subcategory: 'NEFT Credit', transactionType: 'credit' };
    }
    return { category: 'Bank Transfer', subcategory: 'NEFT Debit', transactionType: 'debit' };
  }

  // ── RTGS ──
  if (/rtgs/i.test(lower)) {
    if (/(?:credited|received|incoming)/i.test(lower)) {
      return { category: 'Bank Transfer', subcategory: 'RTGS Credit', transactionType: 'credit' };
    }
    return { category: 'Bank Transfer', subcategory: 'RTGS Debit', transactionType: 'debit' };
  }

  // ── IMPS ──
  if (/imps/i.test(lower)) {
    if (/(?:credited|received|incoming)/i.test(lower)) {
      return { category: 'Bank Transfer', subcategory: 'IMPS Credit', transactionType: 'credit' };
    }
    return { category: 'Bank Transfer', subcategory: 'IMPS Debit', transactionType: 'debit' };
  }

  // ── UPI (already handled in gmailService, but catch any stragglers) ──
  if (/upi/i.test(lower)) {
    if (/(?:credited|received)/i.test(lower)) {
      return { category: 'UPI Payments', subcategory: 'UPI Credit', transactionType: 'credit' };
    }
    return { category: 'UPI Payments', subcategory: 'UPI Debit', transactionType: 'debit' };
  }

  // ── Utility / Bill Payments ──
  if (/electricity|power\s*bill|water\s*bill|gas\s*bill|broadband|internet\s*bill|phone\s*bill|recharge|dth|landline/i.test(lower)) {
    return { category: 'Bills & Utilities', subcategory: 'Utility Bill', transactionType: 'debit' };
  }

  // ── Insurance Premium ──
  if (/insurance|premium\s*(?:paid|due|deducted)|lic|policy\s*(?:renewal|premium)/i.test(lower)) {
    return { category: 'Insurance', subcategory: 'Premium Payment', transactionType: 'debit' };
  }

  // ── Investment ──
  if (/(?:sip|mutual fund|mf\s*purchase|mf\s*redemption|nav|folio|nfo|elss)/i.test(lower)) {
    if (/(?:redemption|credit|maturity)/i.test(lower)) {
      return { category: 'Investments', subcategory: 'Redemption', transactionType: 'credit' };
    }
    return { category: 'Investments', subcategory: 'SIP / MF Purchase', transactionType: 'debit' };
  }

  // ── Tax ──
  if (/(?:income\s*tax|advance\s*tax|tds|gst|tax\s*refund|form\s*16|26as)/i.test(lower)) {
    if (/refund/i.test(lower)) {
      return { category: 'Tax', subcategory: 'Tax Refund', transactionType: 'credit' };
    }
    return { category: 'Tax', subcategory: 'Tax Payment', transactionType: 'debit' };
  }

  // ── E-commerce / Order ──
  if (/(?:order\s*(?:confirmed|placed|delivered)|amazon|flipkart|myntra|swiggy|zomato|bigbasket|blinkit)/i.test(lower)) {
    if (/(?:refund|return|cancel)/i.test(lower)) {
      return { category: 'Shopping', subcategory: 'Refund', transactionType: 'credit' };
    }
    return { category: 'Shopping', subcategory: 'Online Purchase', transactionType: 'debit' };
  }

  // ── Subscription ──
  if (/(?:subscription|netflix|spotify|hotstar|prime\s*(?:video|membership)|youtube\s*premium|icloud)/i.test(lower)) {
    return { category: 'Subscriptions', subcategory: 'Digital Subscription', transactionType: 'debit' };
  }

  // ── Travel ──
  if (/(?:flight|booking|irctc|makemytrip|goibibo|ola|uber|rapido|cleartrip|hotel)/i.test(lower)) {
    return { category: 'Travel', subcategory: 'Travel Booking', transactionType: 'debit' };
  }

  // ── Cashback / Reward ──
  if (/(?:cashback|reward|bonus|referral\s*credit|promotional\s*credit)/i.test(lower)) {
    return { category: 'Income', subcategory: 'Cashback / Reward', transactionType: 'credit' };
  }

  // ── Fixed Deposit ──
  if (/(?:fixed\s*deposit|fd\s*(?:booked|matured|opened|closed)|recurring\s*deposit|rd\s*matured)/i.test(lower)) {
    if (/(?:matured|maturity|credit)/i.test(lower)) {
      return { category: 'Investments', subcategory: 'FD Maturity', transactionType: 'credit' };
    }
    return { category: 'Investments', subcategory: 'FD Booking', transactionType: 'debit' };
  }

  // ── Generic debit ──
  if (/(?:debited|deducted|withdrawn|paid|sent|charged|debit\s*alert)/i.test(lower)) {
    return { category: 'Other Expense', subcategory: 'Bank Debit', transactionType: 'debit' };
  }

  // ── Generic credit ──
  if (/(?:credited|received|added|deposited|credit\s*alert|incoming)/i.test(lower)) {
    return { category: 'Other Income', subcategory: 'Bank Credit', transactionType: 'credit' };
  }

  // ── Account statement / info only ──
  if (/(?:statement|balance|alert|notification)/i.test(lower)) {
    return { category: 'Info', subcategory: 'Account Alert', transactionType: 'info' };
  }

  return { category: 'Other', subcategory: 'Unknown', transactionType: 'unknown' };
}

// ============================================================================
// EXTRACT FUNCTIONS
// ============================================================================

function extractAmount(text) {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 0 && val < 100000000) return val; // sanity: < 10Cr
    }
  }
  return null;
}

function extractAllAmounts(text) {
  const amounts = [];
  const globalPattern = /(?:₹|rs\.?|inr\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let match;
  while ((match = globalPattern.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (val > 0 && val < 100000000) amounts.push(val);
  }
  return amounts;
}

function extractAccountNumber(text) {
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function extractReference(text) {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function extractBalance(text) {
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val >= 0 && val < 1000000000) return val;
    }
  }
  return null;
}

function extractDate(text, fallbackDate) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        if (/[a-z]/i.test(match[2])) {
          // "15 Jan 2026" format
          const mon = MONTH_MAP[match[2].slice(0, 3).toLowerCase()];
          const day = parseInt(match[1]);
          const year = parseInt(match[3]);
          return new Date(year < 100 ? 2000 + year : year, mon, day);
        }
        if (/[a-z]/i.test(match[1])) {
          // "Jan 15, 2026" format
          const mon = MONTH_MAP[match[1].slice(0, 3).toLowerCase()];
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          return new Date(year < 100 ? 2000 + year : year, mon, day);
        }
        // DD/MM/YYYY
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        return new Date(year < 100 ? 2000 + year : year, month, day);
      } catch { /* fall through */ }
    }
  }
  return fallbackDate ? new Date(fallbackDate) : new Date();
}

function extractMerchant(text, subject) {
  // Try common merchant patterns
  const patterns = [
    /(?:at|to|from|merchant|payee|via)\s+([A-Z][A-Za-z0-9\s&.'-]{2,30})/,
    /(?:paid\s+to|payment\s+to|sent\s+to|received\s+from)\s+([A-Z][A-Za-z0-9\s&.'-]{2,30})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, ' ');
      if (cleaned.length >= 2 && cleaned.length <= 40) return cleaned;
    }
  }
  return null;
}

function detectBank(from) {
  if (!from) return null;
  for (const [bank, pattern] of Object.entries(BANK_SENDERS)) {
    if (pattern.test(from)) return bank;
  }
  return null;
}

function detectPaymentMethod(text) {
  const lower = text.toLowerCase();
  if (/\bupi\b/i.test(lower)) return 'upi';
  if (/\bneft\b/i.test(lower)) return 'neft';
  if (/\brtgs\b/i.test(lower)) return 'rtgs';
  if (/\bimps\b/i.test(lower)) return 'imps';
  if (/\bcheque\b|\bcheck\b/i.test(lower)) return 'cheque';
  if (/credit\s*card|debit\s*card|visa|master\s*card|rupay/i.test(lower)) return 'card';
  if (/net\s*banking|internet\s*banking/i.test(lower)) return 'net_banking';
  if (/wallet|paytm|phonepe|amazon\s*pay/i.test(lower)) return 'wallet';
  return 'bank_transfer';
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================
function calculateConfidence(parsed) {
  let score = 0.40;
  if (parsed.amount) score += 0.20;
  if (parsed.accountNumber) score += 0.10;
  if (parsed.reference) score += 0.10;
  if (parsed.merchant) score += 0.05;
  if (parsed.balance !== null) score += 0.05;
  if (parsed.bank) score += 0.05;
  if (parsed.transactionType !== 'unknown') score += 0.05;
  return Math.min(0.95, score);
}

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

/**
 * Parse a single email into a structured transaction (or null if not financial)
 * @param {Object} emailData — { subject, bodyText, snippet, from, to, date, gmailMessageId, historyId }
 * @returns {Object|null} — parsed transaction object ready for DB insertion
 */
function parseEmailTransaction(emailData) {
  const subject = emailData.subject || '';
  const bodyText = emailData.bodyText || '';
  const snippet = emailData.snippet || '';
  const from = emailData.from || '';
  const combinedText = `${subject}\n${bodyText}\n${snippet}`;

  // Skip if no amount is found
  const amount = extractAmount(combinedText);
  if (!amount) return null;

  // Detect type and category
  const typeInfo = detectTransactionType(combinedText, subject, from);
  if (typeInfo.transactionType === 'info' || typeInfo.transactionType === 'unknown' || typeInfo.transactionType === 'reminder') {
    // Still record these as info transactions but with a flag
    if (typeInfo.transactionType === 'reminder') {
      return {
        date: extractDate(combinedText, emailData.date),
        description: `${typeInfo.subcategory}: ${subject}`.slice(0, 200),
        amount: amount,
        type: 'debit',
        category: typeInfo.category,
        subcategory: typeInfo.subcategory,
        paymentMethod: detectPaymentMethod(combinedText),
        source: 'gmail_email',
        merchantName: extractMerchant(combinedText, subject),
        accountNumber: extractAccountNumber(combinedText),
        referenceNumber: extractReference(combinedText),
        balance: extractBalance(combinedText),
        confidence: calculateConfidence({ amount, accountNumber: extractAccountNumber(combinedText), reference: extractReference(combinedText), merchant: extractMerchant(combinedText, subject), balance: extractBalance(combinedText), bank: detectBank(from), transactionType: typeInfo.transactionType }),
        tags: ['gmail', typeInfo.category.toLowerCase().replace(/[\s&]+/g, '_')],
        isReminder: true,
        emailMetadata: {
          subject, from, snippet: (snippet || '').slice(0, 200),
          gmailMessageId: emailData.gmailMessageId,
          historyId: emailData.historyId,
          parsedBank: detectBank(from),
        },
        ai_category: typeInfo.category,
        ai_confidence: 0.55,
      };
    }
    return null;
  }

  const accountNumber = extractAccountNumber(combinedText);
  const reference = extractReference(combinedText);
  const balance = extractBalance(combinedText);
  const merchant = extractMerchant(combinedText, subject);
  const bank = detectBank(from);
  const paymentMethod = detectPaymentMethod(combinedText);
  const txnDate = extractDate(combinedText, emailData.date);

  // Build description
  const descParts = [];
  if (typeInfo.subcategory && typeInfo.subcategory !== 'Unknown') descParts.push(typeInfo.subcategory);
  if (merchant) descParts.push(typeInfo.transactionType === 'credit' ? `from ${merchant}` : `to ${merchant}`);
  if (bank) descParts.push(`(${bank})`);
  if (accountNumber) descParts.push(`A/c **${accountNumber}`);
  const description = descParts.length > 0 ? descParts.join(' ') : subject.slice(0, 120);

  const parsed = {
    date: txnDate,
    description,
    amount,
    type: typeInfo.transactionType,
    category: typeInfo.category,
    subcategory: typeInfo.subcategory,
    paymentMethod,
    source: 'gmail_email',
    merchantName: merchant,
    accountNumber,
    referenceNumber: reference,
    balance,
    confidence: 0,
    tags: ['gmail', typeInfo.category.toLowerCase().replace(/[\s&]+/g, '_')],
    emailMetadata: {
      subject,
      from,
      snippet: (snippet || '').slice(0, 200),
      gmailMessageId: emailData.gmailMessageId,
      historyId: emailData.historyId,
      parsedBank: bank,
    },
    ai_category: typeInfo.category,
    ai_confidence: 0,
  };

  parsed.confidence = calculateConfidence({ amount, accountNumber, reference, merchant, balance, bank, transactionType: typeInfo.transactionType });
  parsed.ai_confidence = parsed.confidence;

  return parsed;
}

/**
 * Parse multiple emails into transactions, deduplicating by gmail message ID + amount
 * @param {Array} emails — array of emailData objects
 * @returns {{ transactions: Array, skipped: number, errors: number }}
 */
function parseEmailBatch(emails) {
  const transactions = [];
  const seen = new Set();
  let skipped = 0;
  let errors = 0;

  for (const email of emails) {
    try {
      const tx = parseEmailTransaction(email);
      if (!tx) { skipped++; continue; }

      // Dedup key: gmail message ID + amount
      const dedupKey = `${email.gmailMessageId || ''}_${tx.amount}_${tx.type}`;
      if (seen.has(dedupKey)) { skipped++; continue; }
      seen.add(dedupKey);

      transactions.push(tx);
    } catch (err) {
      errors++;
      if (logger && logger.warn) logger.warn(`[EmailParser] Error parsing email: ${err.message}`);
    }
  }

  return { transactions, skipped, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  parseEmailTransaction,
  parseEmailBatch,
  extractAmount,
  extractAllAmounts,
  extractAccountNumber,
  extractReference,
  extractBalance,
  extractDate,
  extractMerchant,
  detectBank,
  detectPaymentMethod,
  detectTransactionType,
  calculateConfidence,
  BANK_SENDERS,
  AMOUNT_PATTERNS,
};
