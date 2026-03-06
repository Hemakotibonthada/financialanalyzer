// ============================================================================
// Bank Statement Parser Service — Multi-Bank Statement Extraction Engine
// ============================================================================
// Parses bank statements from PDF text, HTML email bodies, and CSV attachments
// for all major Indian banks (SBI, HDFC, ICICI, Axis, Kotak, etc.)
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// BANK-SPECIFIC PARSERS
// ============================================================================

/**
 * Base class for bank statement parsing
 */
class BankParserBase {
  constructor(bankName, bankCode) {
    this.bankName = bankName;
    this.bankCode = bankCode;
    this.dateFormats = ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD MMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];
  }

  /**
   * Parse a date string into a Date object
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }

    // DD MMM YYYY (e.g. 05 Mar 2026)
    match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
    if (match) {
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const day = parseInt(match[1]);
      const month = months[match[2].toLowerCase().slice(0, 3)];
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      if (month !== undefined) return new Date(year, month, day);
    }

    // YYYY-MM-DD
    match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }

    // Try native Date parsing as fallback
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Parse amount string (handles Indian formats: 1,23,456.78)
   */
  parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleaned = amountStr.toString().replace(/[₹Rs.\s,]/g, '').replace(/\(([^)]+)\)/, '-$1');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : Math.abs(val);
  }

  /**
   * Detect transaction type from description + amount columns
   */
  detectType(description, debitAmount, creditAmount) {
    if (creditAmount && creditAmount > 0) return 'credit';
    if (debitAmount && debitAmount > 0) return 'debit';

    const desc = (description || '').toLowerCase();
    const creditKeywords = ['salary', 'credit', 'deposit', 'received', 'refund', 'cashback', 'interest', 'dividend', 'incoming'];
    const debitKeywords = ['debit', 'withdrawal', 'payment', 'purchase', 'transfer to', 'emi', 'charge', 'fee', 'outgoing'];

    if (creditKeywords.some(k => desc.includes(k))) return 'credit';
    if (debitKeywords.some(k => desc.includes(k))) return 'debit';
    return 'debit'; // default
  }

  /**
   * Auto-categorize transaction from description
   */
  categorize(description) {
    const desc = (description || '').toLowerCase();

    const categoryMap = {
      // Income
      salary: ['salary', 'payroll', 'wages', 'compensation', 'stipend'],
      interest: ['interest earned', 'int cr', 'interest credit', 'savings interest'],
      dividend: ['dividend', 'div cr'],
      refund: ['refund', 'cashback', 'reversal', 'return'],

      // Essentials
      rent_mortgage: ['rent', 'house rent', 'hra', 'mortgage', 'home loan emi'],
      utilities: ['electricity', 'water bill', 'gas bill', 'power bill', 'bescom', 'bwssb', 'mahanagar gas'],
      groceries: ['bigbasket', 'grofers', 'blinkit', 'dmart', 'more supermarket', 'reliance fresh', 'nature basket', 'jiomart'],
      fuel: ['petrol', 'diesel', 'hp fuel', 'iocl', 'bpcl', 'indian oil', 'fuel station'],
      healthcare: ['pharmacy', 'hospital', 'medical', 'doctor', 'clinic', 'apollo', 'practo', 'netmeds', '1mg', 'medplus'],

      // Financial
      emi: ['emi', 'equated monthly', 'installment', 'loan payment', 'auto debit'],
      insurance: ['insurance', 'premium', 'lic', 'sbi life', 'hdfc life', 'icici pru', 'bajaj allianz', 'max life', 'star health'],
      investment: ['mutual fund', 'sip', 'zerodha', 'groww', 'kuvera', 'upstox', 'coin', 'etmoney', 'mf purchase', 'nps', 'ppf'],
      tax: ['income tax', 'gst', 'tds', 'advance tax', 'self assessment', 'challan'],

      // Lifestyle
      food_dining: ['swiggy', 'zomato', 'uber eats', 'restaurant', 'food', 'dining', 'cafe', 'pizza', 'burger', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'chaayos'],
      shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'tatacliq', 'croma', 'reliance digital', 'shopping'],
      entertainment: ['netflix', 'hotstar', 'prime video', 'jiocinema', 'spotify', 'youtube', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow'],
      travel: ['irctc', 'makemytrip', 'goibibo', 'cleartrip', 'yatra', 'ola', 'uber', 'rapido', 'flight', 'hotel', 'booking', 'airbnb'],
      education: ['course', 'tuition', 'school', 'college', 'university', 'udemy', 'coursera', 'unacademy', 'byju', 'exam fee'],
      subscriptions: ['subscription', 'annual plan', 'monthly plan', 'membership', 'gym', 'cult.fit', 'premium'],

      // Transfer
      transfer: ['transfer', 'neft', 'rtgs', 'imps', 'upi', 'fund transfer', 'self transfer'],

      // Bills
      telecom: ['jio', 'airtel', 'vi', 'bsnl', 'mobile recharge', 'broadband', 'act fibernet', 'hathway'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => desc.includes(k))) return category;
    }
    return 'other';
  }

  /**
   * Extract merchant/payee name from description
   */
  extractMerchant(description) {
    const desc = (description || '').trim();

    // UPI: extract payee from UPI format "UPI-MERCHANT-VPA-REF"
    const upiMatch = desc.match(/UPI[-\/]([^-\/]+)/i);
    if (upiMatch) return upiMatch[1].trim();

    // NEFT/RTGS/IMPS: extract beneficiary
    const neftMatch = desc.match(/(?:NEFT|RTGS|IMPS)[-\/\s]*(?:CR|DR)?[-\/\s]*([A-Za-z\s]+?)(?:[-\/]|$)/i);
    if (neftMatch) return neftMatch[1].trim();

    // ATM withdrawal
    if (/atm/i.test(desc)) return 'ATM Withdrawal';

    // Card transaction
    const cardMatch = desc.match(/(?:POS|ECOM)[-\/\s]+(.+?)(?:[-\/]|$)/i);
    if (cardMatch) return cardMatch[1].trim();

    // Just return first meaningful part
    const parts = desc.split(/[-\/|]/);
    return parts[0].trim().slice(0, 60);
  }

  /**
   * Extract reference/UTR number
   */
  extractReference(description) {
    const desc = (description || '');
    // UTR number (16-22 alphanumeric)
    const utrMatch = desc.match(/(?:UTR|Ref|Reference|Txn)\s*(?:No\.?|#|:)?\s*([A-Z0-9]{10,22})/i);
    if (utrMatch) return utrMatch[1];

    // UPI reference
    const upiRefMatch = desc.match(/([0-9]{12,16})/);
    if (upiRefMatch) return upiRefMatch[1];

    return null;
  }
}

// ============================================================================
// HDFC BANK PARSER
// ============================================================================
class HDFCBankParser extends BankParserBase {
  constructor() {
    super('HDFC Bank', 'HDFC');
    this.patterns = {
      // HDFC statement line: Date | Description | Ref No | Debit | Credit | Balance
      statementLine: /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(?:([\d,]+\.\d{2}))?\s*([\d,]+\.\d{2})/,
      // HDFC email alert: "Rs.XXXX has been debited/credited"
      emailAlert: /(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:has been\s+)?(debited|credited)/i,
      // Account number
      accountNumber: /(?:A\/c|Account)\s*(?:No\.?|Number|#)?\s*[:\s]*([X\d*]+\d{4})/i,
    };
  }

  parseStatementText(text) {
    const transactions = [];
    const lines = text.split('\n');
    let currentBalance = 0;

    for (const line of lines) {
      const match = line.match(this.patterns.statementLine);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const amount1 = this.parseAmount(match[3]);
        const amount2 = match[4] ? this.parseAmount(match[4]) : 0;
        const balance = this.parseAmount(match[5]);

        // Determine debit/credit based on balance change
        let debit = 0, credit = 0;
        if (balance < currentBalance || amount2 === 0) {
          debit = amount1;
        } else {
          credit = amount1 || amount2;
        }
        currentBalance = balance;

        transactions.push({
          date,
          description,
          amount: debit || credit,
          type: this.detectType(description, debit, credit),
          category: this.categorize(description),
          merchantName: this.extractMerchant(description),
          referenceNumber: this.extractReference(description),
          balance,
          bankCode: this.bankCode,
          bankName: this.bankName,
          source: 'bank_statement',
        });
      }
    }
    return transactions;
  }

  parseEmailAlert(subject, body) {
    const transactions = [];
    const fullText = `${subject} ${body}`;

    const alertMatch = fullText.match(this.patterns.emailAlert);
    if (alertMatch) {
      const amount = this.parseAmount(alertMatch[1]);
      const type = alertMatch[2].toLowerCase() === 'credited' ? 'credit' : 'debit';

      // Extract date from email
      const dateMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/);
      const date = dateMatch ? this.parseDate(dateMatch[1]) : new Date();

      // Extract account number
      const acctMatch = fullText.match(this.patterns.accountNumber);

      transactions.push({
        date,
        description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
        amount,
        type,
        category: this.categorize(fullText),
        merchantName: this.extractMerchant(body),
        referenceNumber: this.extractReference(fullText),
        accountNumber: acctMatch ? acctMatch[1] : null,
        bankCode: this.bankCode,
        bankName: this.bankName,
        source: 'gmail_email',
      });
    }
    return transactions;
  }
}

// ============================================================================
// ICICI BANK PARSER
// ============================================================================
class ICICIBankParser extends BankParserBase {
  constructor() {
    super('ICICI Bank', 'ICICI');
    this.patterns = {
      statementLine: /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(?:([\d,]+\.?\d*))?\s*([\d,]+\.?\d*)/,
      emailAlert: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:has been\s+)?(debited|credited)/i,
      upiAlert: /(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:sent to|received from|paid to)\s+(.+?)(?:\s+on|\s+via|\.|$)/i,
      accountNumber: /(?:A\/c|Account)\s*(?:No\.?|Number|#)?\s*[:\s]*(XX\d+|\d{4,})/i,
    };
  }

  parseStatementText(text) {
    const transactions = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(this.patterns.statementLine);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const val1 = this.parseAmount(match[3]);
        const val2 = match[4] ? this.parseAmount(match[4]) : 0;
        const balance = this.parseAmount(match[5]);

        const debit = val2 > 0 ? val1 : 0;
        const credit = val2 > 0 ? val2 : val1;

        transactions.push({
          date,
          description,
          amount: debit || credit,
          type: this.detectType(description, debit, credit),
          category: this.categorize(description),
          merchantName: this.extractMerchant(description),
          referenceNumber: this.extractReference(description),
          balance,
          bankCode: this.bankCode,
          bankName: this.bankName,
          source: 'bank_statement',
        });
      }
    }
    return transactions;
  }

  parseEmailAlert(subject, body) {
    const transactions = [];
    const fullText = `${subject} ${body}`;

    // Standard debit/credit alert
    const alertMatch = fullText.match(this.patterns.emailAlert);
    if (alertMatch) {
      const amount = this.parseAmount(alertMatch[1]);
      const type = alertMatch[2].toLowerCase() === 'credited' ? 'credit' : 'debit';
      const dateMatch = fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/);

      transactions.push({
        date: dateMatch ? this.parseDate(dateMatch[1]) : new Date(),
        description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
        amount, type,
        category: this.categorize(fullText),
        merchantName: this.extractMerchant(body),
        referenceNumber: this.extractReference(fullText),
        bankCode: this.bankCode,
        bankName: this.bankName,
        source: 'gmail_email',
      });
    }

    // UPI-specific alert
    const upiMatch = fullText.match(this.patterns.upiAlert);
    if (upiMatch && transactions.length === 0) {
      const amount = this.parseAmount(upiMatch[1]);
      const merchant = upiMatch[2].trim();
      const isSent = /sent to|paid to/i.test(fullText);

      transactions.push({
        date: new Date(),
        description: `UPI ${isSent ? 'Payment to' : 'Received from'} ${merchant}`,
        amount, type: isSent ? 'debit' : 'credit',
        category: this.categorize(merchant),
        merchantName: merchant,
        referenceNumber: this.extractReference(fullText),
        paymentMethod: 'upi',
        bankCode: this.bankCode,
        bankName: this.bankName,
        source: 'gmail_email',
      });
    }
    return transactions;
  }
}

// ============================================================================
// SBI PARSER
// ============================================================================
class SBIParser extends BankParserBase {
  constructor() {
    super('State Bank of India', 'SBI');
    this.patterns = {
      statementLine: /(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/,
      emailAlert: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|credited)\s+(?:from|to)\s+(?:your\s+)?(?:a\/c|account)/i,
      smsStyle: /(?:Rs|INR)\s*([\d,.]+)\s+(debited|credited)\s+(?:from|to|in)\s+(?:A\/c\s*)?([X*\d]+)/i,
    };
  }

  parseStatementText(text) {
    const transactions = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(this.patterns.statementLine);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const debit = this.parseAmount(match[3]);
        const credit = this.parseAmount(match[4]);

        if (debit > 0 || credit > 0) {
          transactions.push({
            date, description,
            amount: debit || credit,
            type: credit > 0 ? 'credit' : 'debit',
            category: this.categorize(description),
            merchantName: this.extractMerchant(description),
            referenceNumber: this.extractReference(description),
            bankCode: this.bankCode,
            bankName: this.bankName,
            source: 'bank_statement',
          });
        }
      }
    }
    return transactions;
  }

  parseEmailAlert(subject, body) {
    const transactions = [];
    const fullText = `${subject} ${body}`;

    const match = fullText.match(this.patterns.emailAlert) || fullText.match(this.patterns.smsStyle);
    if (match) {
      const amount = this.parseAmount(match[1]);
      const type = /credited/i.test(match[2] || fullText) ? 'credit' : 'debit';

      transactions.push({
        date: new Date(),
        description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
        amount, type,
        category: this.categorize(fullText),
        merchantName: this.extractMerchant(body),
        referenceNumber: this.extractReference(fullText),
        bankCode: this.bankCode,
        bankName: this.bankName,
        source: 'gmail_email',
      });
    }
    return transactions;
  }
}

// ============================================================================
// AXIS BANK PARSER
// ============================================================================
class AxisBankParser extends BankParserBase {
  constructor() {
    super('Axis Bank', 'AXIS');
    this.patterns = {
      statementLine: /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*([DC]r?)?\s*([\d,]+\.?\d*)?/,
      emailAlert: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:has been\s+)?(debited|credited)/i,
    };
  }

  parseStatementText(text) {
    const transactions = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(this.patterns.statementLine);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const amount = this.parseAmount(match[3]);
        const typeIndicator = (match[4] || '').toUpperCase();
        const type = typeIndicator.startsWith('C') ? 'credit' : 'debit';

        transactions.push({
          date, description, amount, type,
          category: this.categorize(description),
          merchantName: this.extractMerchant(description),
          referenceNumber: this.extractReference(description),
          bankCode: this.bankCode,
          bankName: this.bankName,
          source: 'bank_statement',
        });
      }
    }
    return transactions;
  }

  parseEmailAlert(subject, body) {
    const fullText = `${subject} ${body}`;
    const match = fullText.match(this.patterns.emailAlert);
    if (!match) return [];

    return [{
      date: new Date(),
      description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
      amount: this.parseAmount(match[1]),
      type: match[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
      category: this.categorize(fullText),
      merchantName: this.extractMerchant(body),
      referenceNumber: this.extractReference(fullText),
      bankCode: this.bankCode,
      bankName: this.bankName,
      source: 'gmail_email',
    }];
  }
}

// ============================================================================
// KOTAK BANK PARSER
// ============================================================================
class KotakBankParser extends BankParserBase {
  constructor() {
    super('Kotak Mahindra Bank', 'KOTAK');
    this.patterns = {
      statementLine: /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/,
      emailAlert: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:debited|credited)/i,
    };
  }

  parseStatementText(text) {
    const transactions = [];
    for (const line of text.split('\n')) {
      const match = line.match(this.patterns.statementLine);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const debit = this.parseAmount(match[3]);
        const credit = this.parseAmount(match[4]);
        if (debit > 0 || credit > 0) {
          transactions.push({
            date, description, amount: debit || credit,
            type: credit > 0 ? 'credit' : 'debit',
            category: this.categorize(description),
            merchantName: this.extractMerchant(description),
            referenceNumber: this.extractReference(description),
            bankCode: this.bankCode, bankName: this.bankName,
            source: 'bank_statement',
          });
        }
      }
    }
    return transactions;
  }

  parseEmailAlert(subject, body) {
    const fullText = `${subject} ${body}`;
    const match = fullText.match(this.patterns.emailAlert);
    if (!match) return [];
    return [{
      date: new Date(),
      description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
      amount: this.parseAmount(match[1]),
      type: /credited/i.test(fullText) ? 'credit' : 'debit',
      category: this.categorize(fullText),
      merchantName: this.extractMerchant(body),
      referenceNumber: this.extractReference(fullText),
      bankCode: this.bankCode, bankName: this.bankName,
      source: 'gmail_email',
    }];
  }
}

// ============================================================================
// UPI TRANSACTION PARSER
// ============================================================================
class UPITransactionParser extends BankParserBase {
  constructor() {
    super('UPI', 'UPI');
    this.upiApps = [
      { name: 'Google Pay', domains: ['googlepay.com', 'gpay.com'], code: 'GPAY' },
      { name: 'PhonePe', domains: ['phonepe.com'], code: 'PHONEPE' },
      { name: 'Paytm', domains: ['paytm.com'], code: 'PAYTM' },
      { name: 'CRED', domains: ['cred.club'], code: 'CRED' },
      { name: 'Amazon Pay', domains: ['amazonpay.in', 'amazon.in'], code: 'AMAZONPAY' },
      { name: 'BharatPe', domains: ['bharatpe.com'], code: 'BHARATPE' },
      { name: 'MobiKwik', domains: ['mobikwik.com'], code: 'MOBIKWIK' },
      { name: 'Freecharge', domains: ['freecharge.com'], code: 'FREECHARGE' },
    ];

    this.patterns = {
      amount: /(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
      upiId: /([a-z0-9][\w.\-]{1,}@[a-z]+)/i,
      utr: /(?:UTR|Ref|Transaction\s*ID|Reference)\s*(?:No\.?|#|:)?\s*([A-Z0-9]{10,22})/i,
      paidTo: /(?:paid to|sent to|transferred to|payment to)\s+(.+?)(?:\s+on|\s+via|\s+for|\.|$)/i,
      receivedFrom: /(?:received from|credited from|payment from)\s+(.+?)(?:\s+on|\s+via|\.|$)/i,
      amountDeducted: /(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:has been\s+)?(?:deducted|debited)/i,
      amountCredited: /(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:has been\s+)?(?:credited|added|received)/i,
    };
  }

  detectUPIApp(senderEmail, body) {
    const lowerEmail = (senderEmail || '').toLowerCase();
    const lowerBody = (body || '').toLowerCase();

    for (const app of this.upiApps) {
      if (app.domains.some(d => lowerEmail.includes(d) || lowerBody.includes(d))) {
        return app;
      }
    }
    return null;
  }

  parseEmailAlert(subject, body, senderEmail) {
    const transactions = [];
    const fullText = `${subject} ${body}`;
    const app = this.detectUPIApp(senderEmail, fullText);

    // Amount extraction
    const amountMatch = fullText.match(this.patterns.amount);
    if (!amountMatch) return transactions;

    const amount = this.parseAmount(amountMatch[1]);
    if (amount <= 0) return transactions;

    // Direction detection
    const debitMatch = fullText.match(this.patterns.amountDeducted) || fullText.match(this.patterns.paidTo);
    const creditMatch = fullText.match(this.patterns.amountCredited) || fullText.match(this.patterns.receivedFrom);
    const isCredit = creditMatch && !debitMatch;
    const type = isCredit ? 'credit' : 'debit';

    // Merchant extraction
    let merchant = 'Unknown';
    const paidToMatch = fullText.match(this.patterns.paidTo);
    const receivedFromMatch = fullText.match(this.patterns.receivedFrom);
    if (paidToMatch) merchant = paidToMatch[1].trim();
    else if (receivedFromMatch) merchant = receivedFromMatch[1].trim();

    // UPI ID extraction
    const upiIdMatch = fullText.match(this.patterns.upiId);
    const utrMatch = fullText.match(this.patterns.utr);

    // Date extraction
    const dateMatch = fullText.match(/(\d{1,2}[\s\/\-][A-Za-z]{3,9}[\s\/\-]\d{2,4})/);
    const date = dateMatch ? this.parseDate(dateMatch[1]) : new Date();

    transactions.push({
      date,
      description: `UPI ${type === 'credit' ? 'Received' : 'Payment'}: ${merchant}`,
      amount, type,
      category: this.categorize(merchant + ' ' + fullText),
      merchantName: merchant,
      referenceNumber: utrMatch ? utrMatch[1] : null,
      paymentMethod: 'upi',
      upiDetails: {
        app: app ? app.name : 'Unknown',
        appCode: app ? app.code : null,
        vpa: upiIdMatch ? upiIdMatch[1] : null,
        utr: utrMatch ? utrMatch[1] : null,
      },
      bankCode: 'UPI',
      bankName: app ? app.name : 'UPI Payment',
      source: 'gmail_email',
    });
    return transactions;
  }
}

// ============================================================================
// CREDIT CARD STATEMENT PARSER
// ============================================================================
class CreditCardParser extends BankParserBase {
  constructor() {
    super('Credit Card', 'CC');
    this.issuers = {
      hdfc: { name: 'HDFC Credit Card', code: 'HDFC_CC' },
      icici: { name: 'ICICI Credit Card', code: 'ICICI_CC' },
      sbi: { name: 'SBI Credit Card', code: 'SBI_CC' },
      axis: { name: 'Axis Credit Card', code: 'AXIS_CC' },
      amex: { name: 'American Express', code: 'AMEX' },
      kotak: { name: 'Kotak Credit Card', code: 'KOTAK_CC' },
      citi: { name: 'Citibank Credit Card', code: 'CITI_CC' },
      rbl: { name: 'RBL Credit Card', code: 'RBL_CC' },
    };

    this.patterns = {
      transaction: /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*([DC]r?)?/,
      totalDue: /(?:total\s+(?:amount\s+)?due|outstanding|minimum\s+(?:amount\s+)?due)\s*[:\s]*(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      dueDate: /(?:due\s+date|payment\s+date)\s*[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
      cardNumber: /(?:card\s+(?:no\.?|number|ending))\s*[:\s]*(\d{4}|\*+\d{4}|XX+\d{4})/i,
    };
  }

  detectIssuer(senderEmail, subject) {
    const text = `${senderEmail} ${subject}`.toLowerCase();
    for (const [key, info] of Object.entries(this.issuers)) {
      if (text.includes(key)) return info;
    }
    return { name: 'Credit Card', code: 'CC' };
  }

  parseStatementText(text, senderEmail = '', subject = '') {
    const transactions = [];
    const issuer = this.detectIssuer(senderEmail, subject);
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(this.patterns.transaction);
      if (match) {
        const date = this.parseDate(match[1]);
        const description = match[2].trim();
        const amount = this.parseAmount(match[3]);
        const typeIndicator = (match[4] || '').toUpperCase();
        const type = typeIndicator.startsWith('C') ? 'credit' : 'debit';

        transactions.push({
          date, description, amount, type,
          category: this.categorize(description),
          merchantName: this.extractMerchant(description),
          referenceNumber: this.extractReference(description),
          bankCode: issuer.code,
          bankName: issuer.name,
          source: 'bank_statement',
          paymentMethod: 'card',
        });
      }
    }

    // Extract statement summary
    const totalDueMatch = text.match(this.patterns.totalDue);
    const dueDateMatch = text.match(this.patterns.dueDate);
    const cardMatch = text.match(this.patterns.cardNumber);

    return {
      transactions,
      summary: {
        issuer: issuer.name,
        totalDue: totalDueMatch ? this.parseAmount(totalDueMatch[1]) : null,
        dueDate: dueDateMatch ? this.parseDate(dueDateMatch[1]) : null,
        cardLast4: cardMatch ? cardMatch[1].replace(/[X*]/g, '').slice(-4) : null,
      },
    };
  }

  parseEmailAlert(subject, body, senderEmail) {
    const fullText = `${subject} ${body}`;
    const issuer = this.detectIssuer(senderEmail, subject);
    const amountMatch = fullText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return [];

    return [{
      date: new Date(),
      description: subject.replace(/^(?:Fwd?:|Re:)\s*/i, '').trim(),
      amount: this.parseAmount(amountMatch[1]),
      type: /credited|refund|cashback/i.test(fullText) ? 'credit' : 'debit',
      category: this.categorize(fullText),
      merchantName: this.extractMerchant(body),
      referenceNumber: this.extractReference(fullText),
      bankCode: issuer.code,
      bankName: issuer.name,
      source: 'gmail_email',
      paymentMethod: 'card',
    }];
  }
}

// ============================================================================
// INVESTMENT PLATFORM PARSER
// ============================================================================
class InvestmentParser extends BankParserBase {
  constructor() {
    super('Investment', 'INV');
    this.platforms = {
      zerodha: { name: 'Zerodha', code: 'ZERODHA', type: 'broker' },
      groww: { name: 'Groww', code: 'GROWW', type: 'broker' },
      kuvera: { name: 'Kuvera', code: 'KUVERA', type: 'mf' },
      etmoney: { name: 'ET Money', code: 'ETMONEY', type: 'mf' },
      upstox: { name: 'Upstox', code: 'UPSTOX', type: 'broker' },
      '5paisa': { name: '5Paisa', code: '5PAISA', type: 'broker' },
      paytmmoney: { name: 'Paytm Money', code: 'PAYTM_MONEY', type: 'broker' },
      angelone: { name: 'Angel One', code: 'ANGELONE', type: 'broker' },
      coin: { name: 'Zerodha Coin', code: 'COIN', type: 'mf' },
    };

    this.patterns = {
      sipExecuted: /SIP\s+(?:of\s+)?(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:in|for)\s+(.+?)(?:\s+has|\s+was|\s+executed|$)/i,
      orderExecuted: /(?:buy|sell|purchase|sold)\s+(.+?)\s+(?:at|@)\s+(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      dividendCredit: /dividend\s+(?:of\s+)?(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:from|for|credited)/i,
      navUpdate: /NAV\s*[:\s]*(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      units: /([\d,]+\.?\d*)\s+units?\s+(?:purchased|bought|sold|allotted|redeemed)/i,
    };
  }

  detectPlatform(senderEmail) {
    const email = (senderEmail || '').toLowerCase();
    for (const [key, info] of Object.entries(this.platforms)) {
      if (email.includes(key)) return info;
    }
    return null;
  }

  parseEmailAlert(subject, body, senderEmail) {
    const transactions = [];
    const fullText = `${subject} ${body}`;
    const platform = this.detectPlatform(senderEmail);

    // SIP execution
    const sipMatch = fullText.match(this.patterns.sipExecuted);
    if (sipMatch) {
      transactions.push({
        date: new Date(),
        description: `SIP: ${sipMatch[2].trim()}`,
        amount: this.parseAmount(sipMatch[1]),
        type: 'debit',
        category: 'investment',
        merchantName: platform ? platform.name : 'Investment',
        investmentType: 'sip',
        fundName: sipMatch[2].trim(),
        bankCode: platform ? platform.code : 'INV',
        bankName: platform ? platform.name : 'Investment Platform',
        source: 'gmail_email',
      });
    }

    // Order execution
    const orderMatch = fullText.match(this.patterns.orderExecuted);
    if (orderMatch && transactions.length === 0) {
      const isSell = /sell|sold|redeem/i.test(fullText);
      transactions.push({
        date: new Date(),
        description: `${isSell ? 'Sold' : 'Bought'}: ${orderMatch[1].trim()}`,
        amount: this.parseAmount(orderMatch[2]),
        type: isSell ? 'credit' : 'debit',
        category: 'investment',
        merchantName: platform ? platform.name : 'Investment',
        investmentType: isSell ? 'sell' : 'buy',
        bankCode: platform ? platform.code : 'INV',
        bankName: platform ? platform.name : 'Investment Platform',
        source: 'gmail_email',
      });
    }

    // Dividend
    const divMatch = fullText.match(this.patterns.dividendCredit);
    if (divMatch && transactions.length === 0) {
      transactions.push({
        date: new Date(),
        description: `Dividend Credit`,
        amount: this.parseAmount(divMatch[1]),
        type: 'credit',
        category: 'dividend',
        merchantName: platform ? platform.name : 'Investment',
        investmentType: 'dividend',
        bankCode: platform ? platform.code : 'INV',
        bankName: platform ? platform.name : 'Investment Platform',
        source: 'gmail_email',
      });
    }
    return transactions;
  }
}

// ============================================================================
// INSURANCE & TAX PARSER
// ============================================================================
class InsuranceTaxParser extends BankParserBase {
  constructor() {
    super('Insurance/Tax', 'INSTAX');
    this.providers = {
      lic: 'LIC', sbilife: 'SBI Life', hdfclife: 'HDFC Life',
      icicipru: 'ICICI Prudential', maxlife: 'Max Life', bajaj: 'Bajaj Allianz',
      tataaia: 'Tata AIA', starhealth: 'Star Health', newIndia: 'New India Assurance',
    };
    this.patterns = {
      premiumDue: /premium\s+(?:of\s+)?(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:is\s+)?due/i,
      premiumPaid: /premium\s+(?:of\s+)?(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:paid|received|successful)/i,
      policyNumber: /policy\s*(?:no\.?|number|#)\s*[:\s]*([A-Z0-9\-]+)/i,
      tdsDeducted: /TDS\s+(?:of\s+)?(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:deducted|withheld)/i,
      form16: /form\s*16|form\s*26AS|tax\s*certificate|interest\s*certificate/i,
    };
  }

  parseEmailAlert(subject, body, senderEmail) {
    const transactions = [];
    const fullText = `${subject} ${body}`;

    // Premium payment
    const premiumMatch = fullText.match(this.patterns.premiumPaid);
    if (premiumMatch) {
      transactions.push({
        date: new Date(),
        description: `Insurance Premium Paid`,
        amount: this.parseAmount(premiumMatch[1]),
        type: 'debit',
        category: 'insurance',
        merchantName: this.extractInsurer(senderEmail),
        source: 'gmail_email',
      });
    }

    // TDS deduction
    const tdsMatch = fullText.match(this.patterns.tdsDeducted);
    if (tdsMatch) {
      transactions.push({
        date: new Date(),
        description: `TDS Deducted`,
        amount: this.parseAmount(tdsMatch[1]),
        type: 'debit',
        category: 'tax',
        source: 'gmail_email',
      });
    }
    return transactions;
  }

  extractInsurer(email) {
    const lower = (email || '').toLowerCase();
    for (const [key, name] of Object.entries(this.providers)) {
      if (lower.includes(key)) return name;
    }
    return 'Insurance Provider';
  }
}

// ============================================================================
// CSV STATEMENT PARSER
// ============================================================================
class CSVStatementParser extends BankParserBase {
  constructor() {
    super('CSV', 'CSV');
    this.columnMappings = [
      // Common column name patterns
      { field: 'date', patterns: ['date', 'transaction date', 'txn date', 'value date', 'posting date'] },
      { field: 'description', patterns: ['description', 'narration', 'particulars', 'details', 'remarks', 'transaction description'] },
      { field: 'debit', patterns: ['debit', 'withdrawal', 'debit amount', 'dr', 'dr.', 'withdrawal amt'] },
      { field: 'credit', patterns: ['credit', 'deposit', 'credit amount', 'cr', 'cr.', 'deposit amt'] },
      { field: 'amount', patterns: ['amount', 'transaction amount', 'txn amount'] },
      { field: 'balance', patterns: ['balance', 'closing balance', 'running balance', 'available balance'] },
      { field: 'reference', patterns: ['reference', 'ref no', 'ref number', 'cheque no', 'txn id', 'utr'] },
      { field: 'type', patterns: ['type', 'transaction type', 'txn type', 'dr/cr'] },
    ];
  }

  /**
   * Auto-detect column mapping from CSV headers
   */
  detectColumns(headers) {
    const mapping = {};
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    for (const col of this.columnMappings) {
      const idx = normalizedHeaders.findIndex(h => col.patterns.some(p => h.includes(p)));
      if (idx !== -1) {
        mapping[col.field] = idx;
      }
    }
    return mapping;
  }

  /**
   * Parse CSV content into transactions
   */
  parseCSV(csvContent, bankCode = 'UNKNOWN') {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // Find header row (first row with recognizable column names)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('date') || lower.includes('narration') || lower.includes('description')) {
        headerIdx = i;
        break;
      }
    }

    const headers = this.parseCSVLine(lines[headerIdx]);
    const columnMap = this.detectColumns(headers);

    if (!columnMap.date) {
      logger.warn('CSV parsing: could not detect date column');
      return [];
    }

    const transactions = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const fields = this.parseCSVLine(lines[i]);
      if (fields.length < 3) continue;

      const dateStr = columnMap.date !== undefined ? fields[columnMap.date] : '';
      const date = this.parseDate(dateStr);
      if (!date) continue;

      const description = columnMap.description !== undefined ? fields[columnMap.description] : '';
      const debit = columnMap.debit !== undefined ? this.parseAmount(fields[columnMap.debit]) : 0;
      const credit = columnMap.credit !== undefined ? this.parseAmount(fields[columnMap.credit]) : 0;
      const amount = columnMap.amount !== undefined ? this.parseAmount(fields[columnMap.amount]) : (debit || credit);
      const balance = columnMap.balance !== undefined ? this.parseAmount(fields[columnMap.balance]) : 0;
      const reference = columnMap.reference !== undefined ? fields[columnMap.reference] : this.extractReference(description);

      if (amount <= 0 && debit <= 0 && credit <= 0) continue;

      let type = this.detectType(description, debit, credit);
      if (columnMap.type !== undefined) {
        const typeVal = (fields[columnMap.type] || '').toLowerCase();
        if (typeVal.includes('cr') || typeVal.includes('credit')) type = 'credit';
        else if (typeVal.includes('dr') || typeVal.includes('debit')) type = 'debit';
      }

      transactions.push({
        date, description: description.trim(),
        amount: amount || debit || credit,
        type, balance,
        category: this.categorize(description),
        merchantName: this.extractMerchant(description),
        referenceNumber: reference,
        bankCode, bankName: bankCode,
        source: 'bank_statement',
      });
    }
    return transactions;
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }
}

// ============================================================================
// MASTER BANK STATEMENT PARSER
// ============================================================================
class BankStatementParserService {
  constructor() {
    this.parsers = {
      HDFC: new HDFCBankParser(),
      ICICI: new ICICIBankParser(),
      SBI: new SBIParser(),
      AXIS: new AxisBankParser(),
      KOTAK: new KotakBankParser(),
    };

    this.upiParser = new UPITransactionParser();
    this.creditCardParser = new CreditCardParser();
    this.investmentParser = new InvestmentParser();
    this.insuranceTaxParser = new InsuranceTaxParser();
    this.csvParser = new CSVStatementParser();

    // Bank detection patterns from sender email
    this.bankDetection = {
      'sbi.co.in': 'SBI',
      'icicibank.com': 'ICICI',
      'hdfcbank.com': 'HDFC',
      'axisbank.com': 'AXIS',
      'kotak.com': 'KOTAK',
      'yesbank.in': 'YESB',
      'idbibank.in': 'IDBI',
      'pnb.co.in': 'PNB',
      'canarabank.com': 'CANARA',
      'bankofbaroda.com': 'BOB',
      'idfc.com': 'IDFC',
      'indusind.com': 'INDUSIND',
      'rbl.com': 'RBL',
      'standardchartered.com': 'SC',
      'citibank.com': 'CITI',
      'hsbc.co.in': 'HSBC',
    };

    // Category detection for email classification
    this.emailCategories = {
      upi: ['paytm.com', 'phonepe.com', 'googlepay.com', 'gpay.com', 'bharatpe.com', 'cred.club', 'mobikwik.com', 'freecharge.com', 'amazonpay.in'],
      investment: ['zerodha.com', 'groww.in', 'kuvera.in', 'etmoney.com', 'upstox.com', '5paisa.com', 'angelone.in', 'icicidirect.com', 'hdfcsec.com'],
      insurance: ['lic.in', 'sbilife.co.in', 'maxlifeinsurance.com', 'hdfclife.com', 'iciciprulife.com', 'bajajfinserv.in', 'tataaia.com', 'starhealth.in'],
      creditCard: ['americanexpress.com'],
    };
  }

  /**
   * Detect bank from sender email address
   */
  detectBank(senderEmail) {
    if (!senderEmail) return null;
    const lower = senderEmail.toLowerCase();
    for (const [domain, code] of Object.entries(this.bankDetection)) {
      if (lower.includes(domain)) return code;
    }
    return null;
  }

  /**
   * Detect email category (bank, upi, investment, insurance, creditCard)
   */
  detectEmailCategory(senderEmail) {
    const lower = (senderEmail || '').toLowerCase();
    
    for (const [category, domains] of Object.entries(this.emailCategories)) {
      if (domains.some(d => lower.includes(d))) return category;
    }

    if (this.detectBank(senderEmail)) return 'bank';
    return 'other';
  }

  /**
   * Parse email into transactions based on auto-detected bank/category
   */
  parseEmail(senderEmail, subject, body) {
    const category = this.detectEmailCategory(senderEmail);
    const bankCode = this.detectBank(senderEmail);

    switch (category) {
      case 'upi':
        return this.upiParser.parseEmailAlert(subject, body, senderEmail);

      case 'investment':
        return this.investmentParser.parseEmailAlert(subject, body, senderEmail);

      case 'insurance':
        return this.insuranceTaxParser.parseEmailAlert(subject, body, senderEmail);

      case 'creditCard':
        return this.creditCardParser.parseEmailAlert(subject, body, senderEmail);

      case 'bank': {
        const parser = this.parsers[bankCode];
        if (parser) return parser.parseEmailAlert(subject, body);
        // Fallback: use HDFC parser as generic
        return this.parsers.HDFC.parseEmailAlert(subject, body);
      }

      default:
        // Try generic bank alert pattern
        return this.parsers.HDFC.parseEmailAlert(subject, body);
    }
  }

  /**
   * Parse a bank statement text (from PDF extraction)
   */
  parseStatementText(text, bankCode) {
    const parser = this.parsers[bankCode];
    if (parser) return parser.parseStatementText(text);

    // Auto-detect bank from text content
    const bankIndicators = {
      HDFC: ['hdfc bank', 'hdfcbank'],
      ICICI: ['icici bank', 'icicibank'],
      SBI: ['state bank of india', 'sbi', 'yono'],
      AXIS: ['axis bank', 'axisbank'],
      KOTAK: ['kotak mahindra', 'kotak bank'],
    };

    const lower = text.toLowerCase();
    for (const [code, keywords] of Object.entries(bankIndicators)) {
      if (keywords.some(k => lower.includes(k))) {
        return this.parsers[code].parseStatementText(text);
      }
    }

    // Fallback: use HDFC parser format (most common)
    return this.parsers.HDFC.parseStatementText(text);
  }

  /**
   * Parse CSV file content
   */
  parseCSVStatement(csvContent, bankCode) {
    return this.csvParser.parseCSV(csvContent, bankCode || 'UNKNOWN');
  }

  /**
   * Parse credit card statement
   */
  parseCreditCardStatement(text, senderEmail, subject) {
    return this.creditCardParser.parseStatementText(text, senderEmail, subject);
  }

  /**
   * Get parser statistics
   */
  getParserStats() {
    return {
      supportedBanks: Object.keys(this.parsers).length,
      supportedUPIApps: this.upiParser.upiApps.length,
      supportedInvestmentPlatforms: Object.keys(this.investmentParser.platforms).length,
      supportedInsuranceProviders: Object.keys(this.insuranceTaxParser.providers).length,
      supportedCreditCardIssuers: Object.keys(this.creditCardParser.issuers).length,
      totalCategories: Object.keys(new BankParserBase('', '').categorize).length || 20,
    };
  }
}

module.exports = new BankStatementParserService();
module.exports.BankStatementParserService = BankStatementParserService;
module.exports.HDFCBankParser = HDFCBankParser;
module.exports.ICICIBankParser = ICICIBankParser;
module.exports.SBIParser = SBIParser;
module.exports.AxisBankParser = AxisBankParser;
module.exports.KotakBankParser = KotakBankParser;
module.exports.UPITransactionParser = UPITransactionParser;
module.exports.CreditCardParser = CreditCardParser;
module.exports.InvestmentParser = InvestmentParser;
module.exports.InsuranceTaxParser = InsuranceTaxParser;
module.exports.CSVStatementParser = CSVStatementParser;
