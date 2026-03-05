// ============================================================================
// FINANCIAL DOCUMENT INTELLIGENCE — AI-Powered Document Analysis
// ============================================================================
// Extracts structured financial data from unstructured text: bank statements,
// salary slips, tax documents, insurance policies. Uses rule-based NLP,
// regex patterns, and template matching. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §1  AMOUNT PARSER — Extract Monetary Values from Text
// ============================================================================

class AmountParser {
  constructor() {
    this.patterns = [
      // Indian format: ₹1,23,456.78 or Rs. 1,23,456.78
      { regex: /[₹][\s]*([\d,]+(?:\.\d{1,2})?)/g, currency: 'INR' },
      { regex: /(?:Rs\.?|INR|Rupees?)[\s]*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'INR' },
      // With lakh/crore
      { regex: /([\d.]+)\s*(?:lakh|lac|lakhs)/gi, multiplier: 100000, currency: 'INR' },
      { regex: /([\d.]+)\s*(?:crore|cr|crores)/gi, multiplier: 10000000, currency: 'INR' },
      // Plain numbers with context
      { regex: /(?:amount|total|balance|salary|income|debit|credit|payment)[\s:]*[₹Rs.]?\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'INR' },
    ];
  }

  extractAll(text) {
    const amounts = [];
    for (const { regex, currency, multiplier } of this.patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        if (multiplier) value *= multiplier;
        if (!isNaN(value) && value > 0) {
          amounts.push({
            value: Math.round(value * 100) / 100,
            raw: match[0].trim(),
            position: match.index,
            currency: currency || 'INR'
          });
        }
      }
    }
    // Deduplicate by position
    return amounts.filter((a, i, arr) =>
      !arr.some((b, j) => j < i && Math.abs(a.position - b.position) < 5 && a.value === b.value)
    );
  }

  extractPrimary(text) {
    const amounts = this.extractAll(text);
    return amounts.length > 0 ? amounts.sort((a, b) => b.value - a.value)[0] : null;
  }
}

// ============================================================================
// §2  DATE PARSER — Extract Dates from Financial Documents
// ============================================================================

class DateParser {
  constructor() {
    this.patterns = [
      // DD/MM/YYYY, DD-MM-YYYY
      { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, format: 'dmy' },
      // YYYY-MM-DD
      { regex: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, format: 'ymd' },
      // DD Mon YYYY, DD Month YYYY
      {
        regex: /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,.]?\s+(\d{4})/gi,
        format: 'dMy'
      },
      // Mon DD, YYYY
      {
        regex: /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,.]?\s+(\d{4})/gi,
        format: 'Mdy'
      },
    ];

    this.monthMap = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
  }

  extractAll(text) {
    const dates = [];
    for (const { regex, format } of this.patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const parsed = this._parseMatch(match, format);
        if (parsed) {
          dates.push({
            date: parsed,
            raw: match[0].trim(),
            position: match.index
          });
        }
      }
    }
    return dates.filter((d, i, arr) =>
      !arr.some((b, j) => j < i && Math.abs(d.position - b.position) < 5)
    );
  }

  _parseMatch(match, format) {
    try {
      let day, month, year;
      switch (format) {
        case 'dmy':
          day = parseInt(match[1]); month = parseInt(match[2]) - 1; year = parseInt(match[3]);
          break;
        case 'ymd':
          year = parseInt(match[1]); month = parseInt(match[2]) - 1; day = parseInt(match[3]);
          break;
        case 'dMy':
          day = parseInt(match[1]); month = this.monthMap[match[2].toLowerCase().substring(0, 3)]; year = parseInt(match[3]);
          break;
        case 'Mdy':
          month = this.monthMap[match[1].toLowerCase().substring(0, 3)]; day = parseInt(match[2]); year = parseInt(match[3]);
          break;
        default: return null;
      }
      if (month === undefined || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
      return new Date(year, month, day);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// §3  BANK STATEMENT PARSER — Extract Transactions from Bank Statements
// ============================================================================

class BankStatementParser {
  constructor() {
    this.amountParser = new AmountParser();
    this.dateParser = new DateParser();
  }

  parse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const transactions = [];
    const metadata = this._extractMetadata(text);

    for (const line of lines) {
      const txn = this._parseTransactionLine(line);
      if (txn) transactions.push(txn);
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    return {
      metadata,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        totalCredits: transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        totalDebits: transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
        dateRange: transactions.length > 0 ? {
          from: transactions[0].date,
          to: transactions[transactions.length - 1].date
        } : null
      }
    };
  }

  _parseTransactionLine(line) {
    // Try to extract: date, description, debit/credit amount, balance
    const dates = this.dateParser.extractAll(line);
    const amounts = this.amountParser.extractAll(line);

    if (dates.length === 0 || amounts.length === 0) return null;

    const date = dates[0].date;
    const amount = amounts[0].value;

    // Determine type based on keywords
    const lineLower = line.toLowerCase();
    const isCredit = lineLower.includes('credit') || lineLower.includes('cr') ||
      lineLower.includes('deposit') || lineLower.includes('received') ||
      lineLower.includes('salary') || lineLower.includes('refund');
    const isDebit = lineLower.includes('debit') || lineLower.includes('dr') ||
      lineLower.includes('withdrawal') || lineLower.includes('payment') ||
      lineLower.includes('purchase') || lineLower.includes('transfer to');

    // Extract description (remove date and amounts from line)
    let description = line;
    if (dates[0]) description = description.replace(dates[0].raw, '').trim();
    for (const a of amounts) description = description.replace(a.raw, '').trim();
    description = description.replace(/[\s]{2,}/g, ' ').trim();

    // Auto-categorize
    const category = this._autoCategorizeLine(description);

    return {
      date: date?.toISOString() || null,
      description: description.substring(0, 200),
      amount,
      type: isCredit ? 'credit' : isDebit ? 'debit' : (amounts.length > 1 ? 'debit' : 'unknown'),
      category,
      balance: amounts.length > 1 ? amounts[amounts.length - 1].value : null,
      raw: line
    };
  }

  _autoCategorizeLine(description) {
    const desc = description.toLowerCase();
    const rules = [
      { pattern: /salary|wages|payroll/i, category: 'salary' },
      { pattern: /emi|loan|interest/i, category: 'loan_payment' },
      { pattern: /swiggy|zomato|food|restaurant|pizza|burger/i, category: 'food' },
      { pattern: /uber|ola|petrol|diesel|fuel|parking|toll/i, category: 'transport' },
      { pattern: /amazon|flipkart|myntra|shopping/i, category: 'shopping' },
      { pattern: /electric|water|gas|phone|mobile|internet|wifi|broadband/i, category: 'utilities' },
      { pattern: /netflix|spotify|hotstar|prime|movie|game/i, category: 'entertainment' },
      { pattern: /hospital|doctor|pharmacy|medical|health/i, category: 'healthcare' },
      { pattern: /school|college|tuition|course|education/i, category: 'education' },
      { pattern: /rent|housing|maintenance|society/i, category: 'rent' },
      { pattern: /insurance|premium|lic/i, category: 'insurance' },
      { pattern: /sip|mutual fund|stock|invest|ppf|nps/i, category: 'investment' },
      { pattern: /atm|cash|withdraw/i, category: 'cash_withdrawal' },
      { pattern: /transfer|sent|paid|upi|neft|imps/i, category: 'transfer' },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(desc)) return rule.category;
    }
    return 'uncategorized';
  }

  _extractMetadata(text) {
    const metadata = {};

    // Account number
    const accMatch = text.match(/(?:a\/c|account|acct)[.\s]*(?:no|number|#)?[.\s:]*(\d{4,})/i);
    if (accMatch) metadata.accountNumber = accMatch[1].replace(/\d{4}(?=\d{4})/, '****');

    // Bank name
    const bankPatterns = [
      /(?:state bank|sbi)/i, /(?:hdfc)/i, /(?:icici)/i, /(?:axis)/i,
      /(?:kotak)/i, /(?:pnb|punjab national)/i, /(?:bob|bank of baroda)/i,
      /(?:canara)/i, /(?:union bank)/i, /(?:indusind)/i
    ];
    for (const bp of bankPatterns) {
      if (bp.test(text)) {
        metadata.bankName = text.match(bp)[0];
        break;
      }
    }

    // IFSC
    const ifscMatch = text.match(/[A-Z]{4}0[A-Z0-9]{6}/);
    if (ifscMatch) metadata.ifsc = ifscMatch[0];

    // PAN
    const panMatch = text.match(/[A-Z]{5}\d{4}[A-Z]/);
    if (panMatch) metadata.pan = panMatch[0].replace(/\d{4}/, '****');

    // Statement period
    const dates = this.dateParser.extractAll(text);
    if (dates.length >= 2) {
      metadata.statementPeriod = {
        from: dates[0].date?.toISOString(),
        to: dates[dates.length - 1].date?.toISOString()
      };
    }

    return metadata;
  }
}

// ============================================================================
// §4  SALARY SLIP PARSER — Extract Compensation Details
// ============================================================================

class SalarySlipParser {
  constructor() {
    this.amountParser = new AmountParser();
  }

  parse(text) {
    const result = {
      grossSalary: 0,
      netSalary: 0,
      earnings: {},
      deductions: {},
      taxDeducted: 0,
      employeeName: null,
      employeeId: null,
      employer: null,
      month: null,
      pan: null
    };

    // Extract employee details
    const nameMatch = text.match(/(?:employee|name|emp)[.\s:]*([A-Za-z\s]{3,40})/i);
    if (nameMatch) result.employeeName = nameMatch[1].trim();

    const empIdMatch = text.match(/(?:emp(?:loyee)?[\s]*(?:id|no|number|code))[.\s:]*([A-Z0-9]{3,15})/i);
    if (empIdMatch) result.employeeId = empIdMatch[1];

    const panMatch = text.match(/(?:PAN)[.\s:]*([A-Z]{5}\d{4}[A-Z])/i);
    if (panMatch) result.pan = panMatch[0];

    // Extract earnings
    const earningsPatterns = [
      { key: 'basic', pattern: /basic[\s]*(?:salary|pay)?[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'hra', pattern: /(?:HRA|house\s*rent\s*allowance)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'da', pattern: /(?:DA|dearness\s*allowance)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'specialAllowance', pattern: /(?:special\s*allowance|SA)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'conveyance', pattern: /(?:conveyance|transport)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'medicalAllowance', pattern: /(?:medical\s*allowance|MA)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'lta', pattern: /(?:LTA|leave\s*travel)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'bonus', pattern: /(?:bonus|incentive)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
    ];

    for (const { key, pattern } of earningsPatterns) {
      const match = text.match(pattern);
      if (match) result.earnings[key] = parseFloat(match[1].replace(/,/g, ''));
    }

    // Extract deductions
    const deductionPatterns = [
      { key: 'pf', pattern: /(?:PF|provident\s*fund|EPF)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'esi', pattern: /(?:ESI|employee\s*state\s*insurance)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'tds', pattern: /(?:TDS|tax\s*deducted|income\s*tax)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'professionalTax', pattern: /(?:professional\s*tax|PT)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'loanRecovery', pattern: /(?:loan\s*recovery|advance)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
    ];

    for (const { key, pattern } of deductionPatterns) {
      const match = text.match(pattern);
      if (match) result.deductions[key] = parseFloat(match[1].replace(/,/g, ''));
    }

    // Calculate totals
    result.grossSalary = Object.values(result.earnings).reduce((s, v) => s + v, 0);
    const totalDeductions = Object.values(result.deductions).reduce((s, v) => s + v, 0);
    result.netSalary = result.grossSalary - totalDeductions;
    result.taxDeducted = result.deductions.tds || 0;

    // Try to find gross/net from text directly
    const grossMatch = text.match(/(?:gross\s*(?:salary|pay|earnings))[\s:]*[₹Rs.]*\s*([\d,]+)/i);
    if (grossMatch) result.grossSalary = parseFloat(grossMatch[1].replace(/,/g, ''));

    const netMatch = text.match(/(?:net\s*(?:salary|pay|take[\s-]*home))[\s:]*[₹Rs.]*\s*([\d,]+)/i);
    if (netMatch) result.netSalary = parseFloat(netMatch[1].replace(/,/g, ''));

    // Extract month
    const monthMatch = text.match(/(?:for\s*(?:the\s*)?month\s*(?:of)?|pay\s*(?:period|month))[.\s:]*(\w+\s*\d{4})/i);
    if (monthMatch) result.month = monthMatch[1].trim();

    return result;
  }
}

// ============================================================================
// §5  TAX DOCUMENT PARSER — Extract Tax Filing Information
// ============================================================================

class TaxDocumentParser {
  constructor() {
    this.amountParser = new AmountParser();
  }

  parseForm16(text) {
    const result = {
      employer: null,
      employee: null,
      pan: null,
      tan: null,
      assessmentYear: null,
      grossSalary: 0,
      exemptions: {},
      deductions: {},
      taxableIncome: 0,
      taxPayable: 0,
      tdsDeducted: 0,
      balance: 0
    };

    // Assessment Year
    const ayMatch = text.match(/(?:assessment\s*year|AY)[\s:]*(\d{4}[\s-]*\d{2,4})/i);
    if (ayMatch) result.assessmentYear = ayMatch[1];

    // PAN
    const panMatch = text.match(/(?:PAN\s*(?:of|:)?\s*(?:employee|deductee))[.\s:]*([A-Z]{5}\d{4}[A-Z])/i);
    if (panMatch) result.pan = panMatch[1];

    // TAN
    const tanMatch = text.match(/(?:TAN)[.\s:]*([A-Z]{4}\d{5}[A-Z])/i);
    if (tanMatch) result.tan = tanMatch[1];

    // Income components
    const incomePatterns = [
      { key: 'grossSalary', pattern: /(?:gross\s*(?:total\s*)?(?:salary|income))[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'taxableIncome', pattern: /(?:total\s*taxable\s*income|net\s*taxable)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'taxPayable', pattern: /(?:tax\s*(?:payable|on\s*total\s*income))[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'tdsDeducted', pattern: /(?:TDS|tax\s*deducted\s*at\s*source)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
    ];

    for (const { key, pattern } of incomePatterns) {
      const match = text.match(pattern);
      if (match) result[key] = parseFloat(match[1].replace(/,/g, ''));
    }

    // Section 80 deductions
    const section80Patterns = [
      { key: 'section80C', pattern: /(?:80C|sec(?:tion)?\s*80C)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'section80D', pattern: /(?:80D|sec(?:tion)?\s*80D)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'section80CCD', pattern: /(?:80CCD|NPS)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'section80E', pattern: /(?:80E|education\s*loan\s*interest)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
      { key: 'section24', pattern: /(?:sec(?:tion)?\s*24|home\s*loan\s*interest)[\s:]*[₹Rs.]*\s*([\d,]+)/i },
    ];

    for (const { key, pattern } of section80Patterns) {
      const match = text.match(pattern);
      if (match) result.deductions[key] = parseFloat(match[1].replace(/,/g, ''));
    }

    // HRA exemption
    const hraMatch = text.match(/(?:HRA\s*(?:exemption|exempt))[\s:]*[₹Rs.]*\s*([\d,]+)/i);
    if (hraMatch) result.exemptions.hra = parseFloat(hraMatch[1].replace(/,/g, ''));

    // Standard deduction
    const stdMatch = text.match(/(?:standard\s*deduction)[\s:]*[₹Rs.]*\s*([\d,]+)/i);
    if (stdMatch) result.exemptions.standardDeduction = parseFloat(stdMatch[1].replace(/,/g, ''));

    result.balance = result.taxPayable - result.tdsDeducted;

    return result;
  }
}

// ============================================================================
// §6  INSURANCE POLICY PARSER
// ============================================================================

class InsurancePolicyParser {
  parse(text) {
    const result = {
      policyType: null,
      policyNumber: null,
      insurer: null,
      insured: null,
      sumAssured: 0,
      premium: 0,
      premiumFrequency: null,
      startDate: null,
      endDate: null,
      nominees: [],
      riders: [],
      coverageDetails: {}
    };

    // Policy type
    const typePatterns = [
      { pattern: /term\s*(?:life|insurance|plan)/i, type: 'term_life' },
      { pattern: /health\s*(?:insurance|plan|cover)/i, type: 'health' },
      { pattern: /motor\s*(?:insurance|plan|cover)/i, type: 'motor' },
      { pattern: /(?:endowment|money\s*back)/i, type: 'endowment' },
      { pattern: /(?:ULIP|unit\s*linked)/i, type: 'ulip' },
      { pattern: /(?:home|property)\s*(?:insurance|cover)/i, type: 'home' },
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text)) { result.policyType = type; break; }
    }

    // Policy number
    const policyMatch = text.match(/(?:policy\s*(?:no|number|#))[.\s:]*([A-Z0-9\-]{5,20})/i);
    if (policyMatch) result.policyNumber = policyMatch[1];

    // Sum assured
    const amountParser = new AmountParser();
    const sumMatch = text.match(/(?:sum\s*(?:assured|insured)|cover(?:age)?\s*amount)[\s:]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
    if (sumMatch) result.sumAssured = parseFloat(sumMatch[1].replace(/,/g, ''));

    // Premium
    const premiumMatch = text.match(/(?:premium)[\s:]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
    if (premiumMatch) result.premium = parseFloat(premiumMatch[1].replace(/,/g, ''));

    // Premium frequency
    if (/monthly/i.test(text)) result.premiumFrequency = 'monthly';
    else if (/quarterly/i.test(text)) result.premiumFrequency = 'quarterly';
    else if (/half[\s-]*yearly|semi[\s-]*annual/i.test(text)) result.premiumFrequency = 'half-yearly';
    else if (/annual|yearly/i.test(text)) result.premiumFrequency = 'annual';

    // Dates
    const dateParser = new DateParser();
    const dates = dateParser.extractAll(text);
    if (dates.length >= 1) result.startDate = dates[0].date?.toISOString();
    if (dates.length >= 2) result.endDate = dates[1].date?.toISOString();

    // Nominee
    const nomineeMatch = text.match(/(?:nominee)[.\s:]*([A-Za-z\s]{3,40})/i);
    if (nomineeMatch) result.nominees.push({ name: nomineeMatch[1].trim() });

    return result;
  }
}

// ============================================================================
// §7  UNIFIED DOCUMENT INTELLIGENCE SERVICE
// ============================================================================

class DocumentIntelligenceService {
  constructor() {
    this.bankParser = new BankStatementParser();
    this.salaryParser = new SalarySlipParser();
    this.taxParser = new TaxDocumentParser();
    this.insuranceParser = new InsurancePolicyParser();
    this.amountParser = new AmountParser();
    this.dateParser = new DateParser();
  }

  async analyzeDocument(text, documentType = null) {
    // Auto-detect document type if not specified
    if (!documentType) {
      documentType = this._detectDocumentType(text);
    }

    let result;
    switch (documentType) {
      case 'bank_statement':
        result = this.bankParser.parse(text);
        break;
      case 'salary_slip':
        result = this.salaryParser.parse(text);
        break;
      case 'form16':
        result = this.taxParser.parseForm16(text);
        break;
      case 'insurance_policy':
        result = this.insuranceParser.parse(text);
        break;
      default:
        result = this._genericParse(text);
    }

    return {
      documentType,
      confidence: documentType ? 0.8 : 0.5,
      data: result,
      extractedAmounts: this.amountParser.extractAll(text),
      extractedDates: this.dateParser.extractAll(text),
      textLength: text.length,
      analyzedAt: new Date()
    };
  }

  _detectDocumentType(text) {
    const textLower = text.toLowerCase();

    const indicators = {
      bank_statement: ['statement', 'account no', 'opening balance', 'closing balance', 'debit', 'credit'],
      salary_slip: ['salary slip', 'pay slip', 'payslip', 'gross salary', 'net salary', 'basic pay', 'take home'],
      form16: ['form 16', 'form-16', 'form no. 16', 'certificate under section 203', 'assessment year'],
      insurance_policy: ['policy', 'sum assured', 'premium', 'nominee', 'insured', 'coverage']
    };

    let bestType = 'unknown';
    let bestScore = 0;

    for (const [type, keywords] of Object.entries(indicators)) {
      const score = keywords.filter(kw => textLower.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    return bestScore >= 2 ? bestType : 'unknown';
  }

  _genericParse(text) {
    return {
      amounts: this.amountParser.extractAll(text),
      dates: this.dateParser.extractAll(text),
      textPreview: text.substring(0, 500),
      wordCount: text.split(/\s+/).length,
      lineCount: text.split('\n').length
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  AmountParser,
  DateParser,
  BankStatementParser,
  SalarySlipParser,
  TaxDocumentParser,
  InsurancePolicyParser,
  DocumentIntelligenceService
};
