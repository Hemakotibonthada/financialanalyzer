// ============================================================
// Gmail AI Analysis Engine — Local ML-Powered Email Intelligence
// ============================================================
// Analyzes Gmail financial emails using local AI models.
// No external API calls — 100% local processing.
// Supports: transaction extraction, categorization, anomaly
// detection, spending pattern analysis, and NL summaries.
// ============================================================

'use strict';

const logger = require('../../utils/logger');

// ─── TF-IDF Vectorizer for Email Classification ───────────────
class EmailTFIDFVectorizer {
  constructor() {
    this.vocabulary = new Map();
    this.idfScores = new Map();
    this.docCount = 0;
    this.fitted = false;
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text.toLowerCase()
      .replace(/[₹$€£¥]/g, ' CURRENCY_SYMBOL ')
      .replace(/\b\d{1,3}(,\d{3})*(\.\d{1,2})?\b/g, ' AMOUNT_TOKEN ')
      .replace(/\b\d{10,18}\b/g, ' LONG_NUMBER ')
      .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, ' IFSC_CODE ')
      .replace(/\b[a-z0-9]+@[a-z]+\b/gi, ' UPI_ID ')
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && t.length < 30);
  }

  fit(documents) {
    this.docCount = documents.length;
    const docFrequency = new Map();

    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      }
      for (const token of tokens) {
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, this.vocabulary.size);
        }
      }
    }

    for (const [term, freq] of docFrequency) {
      this.idfScores.set(term, Math.log((this.docCount + 1) / (freq + 1)) + 1);
    }
    this.fitted = true;
    return this;
  }

  transform(text) {
    const tokens = this.tokenize(text);
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    const vector = new Float64Array(this.vocabulary.size);
    for (const [token, count] of tf) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        const termFreq = count / tokens.length;
        const idf = this.idfScores.get(token) || 1;
        vector[idx] = termFreq * idf;
      }
    }
    return vector;
  }

  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// ─── Email Classifier (Naive Bayes) ───────────────────────────
class EmailNaiveBayesClassifier {
  constructor() {
    this.classCounts = {};
    this.classWordCounts = {};
    this.vocabulary = new Set();
    this.totalDocs = 0;
    this.trained = false;
  }

  train(documents, labels) {
    this.totalDocs = documents.length;
    for (let i = 0; i < documents.length; i++) {
      const label = labels[i];
      const words = this._tokenize(documents[i]);

      this.classCounts[label] = (this.classCounts[label] || 0) + 1;
      if (!this.classWordCounts[label]) this.classWordCounts[label] = {};

      for (const word of words) {
        this.vocabulary.add(word);
        this.classWordCounts[label][word] = (this.classWordCounts[label][word] || 0) + 1;
      }
    }
    this.trained = true;
  }

  predict(text) {
    if (!this.trained) return { label: 'unknown', confidence: 0 };
    const words = this._tokenize(text);
    const scores = {};
    const vocabSize = this.vocabulary.size;

    for (const label of Object.keys(this.classCounts)) {
      const classTotalWords = Object.values(this.classWordCounts[label]).reduce((a, b) => a + b, 0);
      let logProb = Math.log(this.classCounts[label] / this.totalDocs);

      for (const word of words) {
        const wordCount = this.classWordCounts[label][word] || 0;
        logProb += Math.log((wordCount + 1) / (classTotalWords + vocabSize));
      }
      scores[label] = logProb;
    }

    const maxLabel = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const allScores = Object.values(scores);
    const maxScore = Math.max(...allScores);
    const expSum = allScores.reduce((sum, s) => sum + Math.exp(s - maxScore), 0);
    const confidence = 1 / expSum;

    return { label: maxLabel[0], confidence: Math.min(confidence, 1), scores };
  }

  _tokenize(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  }
}

// ─── Amount Extraction Engine ─────────────────────────────────
class AmountExtractionEngine {
  constructor() {
    this.patterns = [
      // Indian Rupee patterns
      { regex: /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'INR' },
      { regex: /(?:rupees?)\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'INR' },
      { regex: /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/gi, currency: 'INR' },
      // Lakh/Crore patterns
      { regex: /(?:Rs\.?|INR|₹)\s*([\d.]+)\s*(?:lakh|lac|L)/gi, currency: 'INR', multiplier: 100000 },
      { regex: /(?:Rs\.?|INR|₹)\s*([\d.]+)\s*(?:crore|Cr)/gi, currency: 'INR', multiplier: 10000000 },
      // Dollar patterns
      { regex: /\$\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'USD' },
      { regex: /USD\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'USD' },
      // Generic amount with context
      { regex: /(?:amount|balance|total|due|paid|credited|debited|transferred)\s*(?:of|:|-|is)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/gi, currency: 'INR' },
    ];

    this.contextPatterns = {
      credit: /(?:credited|received|deposited|incoming|credit|refund|cashback|added|got)/i,
      debit: /(?:debited|withdrawn|paid|sent|transferred|charged|deducted|outgoing|debit)/i,
      balance: /(?:balance|available|remaining|outstanding|closing)/i,
    };
  }

  extractAmounts(text) {
    const amounts = [];
    const seen = new Set();

    for (const pattern of this.patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        const rawAmount = match[1].replace(/,/g, '');
        let value = parseFloat(rawAmount);
        if (pattern.multiplier) value *= pattern.multiplier;
        if (isNaN(value) || value <= 0 || value > 1e12) continue;

        const key = `${value.toFixed(2)}-${match.index}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Determine context from surrounding text
        const context = text.substring(Math.max(0, match.index - 80), Math.min(text.length, match.index + 80));
        let type = 'unknown';
        if (this.contextPatterns.credit.test(context)) type = 'credit';
        else if (this.contextPatterns.debit.test(context)) type = 'debit';
        else if (this.contextPatterns.balance.test(context)) type = 'balance';

        amounts.push({
          value,
          currency: pattern.currency,
          type,
          rawMatch: match[0].trim(),
          context: context.trim(),
          position: match.index,
          confidence: this._calculateConfidence(value, type, context)
        });
      }
    }

    return amounts.sort((a, b) => b.confidence - a.confidence);
  }

  _calculateConfidence(value, type, context) {
    let confidence = 0.5;
    if (type !== 'unknown') confidence += 0.2;
    if (/₹|Rs\.?|INR/i.test(context)) confidence += 0.15;
    if (/account|transaction|payment|transfer/i.test(context)) confidence += 0.1;
    if (value >= 1 && value <= 10000000) confidence += 0.05;
    return Math.min(confidence, 1.0);
  }

  extractPrimaryAmount(text) {
    const amounts = this.extractAmounts(text);
    if (amounts.length === 0) return null;

    // Prefer debit/credit over balance, higher confidence first
    const prioritized = amounts.sort((a, b) => {
      const typeOrder = { debit: 0, credit: 1, balance: 2, unknown: 3 };
      const typeDiff = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
      if (typeDiff !== 0) return typeDiff;
      return b.confidence - a.confidence;
    });

    return prioritized[0];
  }
}

// ─── Date Extraction Engine ───────────────────────────────────
class DateExtractionEngine {
  constructor() {
    this.patterns = [
      // DD/MM/YYYY, DD-MM-YYYY
      { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, format: 'DMY' },
      // YYYY-MM-DD (ISO)
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/g, format: 'YMD' },
      // DD Mon YYYY
      { regex: /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/gi, format: 'DMnY' },
      // Mon DD, YYYY
      { regex: /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/gi, format: 'MnDY' },
    ];

    this.monthMap = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
  }

  extractDates(text) {
    const dates = [];
    for (const pattern of this.patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        try {
          let date;
          switch (pattern.format) {
            case 'DMY':
              date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
              break;
            case 'YMD':
              date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
              break;
            case 'DMnY':
              date = new Date(parseInt(match[3]), this.monthMap[match[2].toLowerCase()], parseInt(match[1]));
              break;
            case 'MnDY':
              date = new Date(parseInt(match[3]), this.monthMap[match[1].toLowerCase()], parseInt(match[2]));
              break;
          }
          if (date && !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2030) {
            dates.push({ date, raw: match[0], position: match.index, format: pattern.format });
          }
        } catch (e) { /* skip invalid dates */ }
      }
    }
    return dates.sort((a, b) => a.date - b.date);
  }

  extractMostRelevantDate(text, emailDate) {
    const dates = this.extractDates(text);
    if (dates.length === 0) return emailDate ? new Date(emailDate) : new Date();
    // Prefer the date closest to the email date
    if (emailDate) {
      const ref = new Date(emailDate).getTime();
      dates.sort((a, b) => Math.abs(a.date.getTime() - ref) - Math.abs(b.date.getTime() - ref));
    }
    return dates[0].date;
  }
}

// ─── UPI Transaction Parser ──────────────────────────────────
class UPITransactionParser {
  constructor() {
    this.upiIdPattern = /([a-zA-Z0-9._-]+@[a-zA-Z]+)/g;
    this.utrPattern = /(?:UTR|Ref\.?\s*(?:No\.?)?|Transaction\s*(?:ID|No\.?)?|Reference)\s*[:\s]*([A-Z0-9]{8,20})/gi;
    this.amountEngine = new AmountExtractionEngine();

    this.upiAppSignatures = {
      'Google Pay': /google\s*pay|gpay|tez/i,
      'PhonePe': /phonepe/i,
      'Paytm': /paytm/i,
      'BHIM': /bhim\s*upi|bhim/i,
      'CRED': /cred/i,
      'Amazon Pay': /amazon\s*pay/i,
      'WhatsApp Pay': /whatsapp\s*pay/i,
      'MobiKwik': /mobikwik/i,
      'Freecharge': /freecharge/i,
    };

    this.merchantCategories = {
      food_dining: /swiggy|zomato|uber\s*eats|dominos|pizza\s*hut|mcdonalds|kfc|starbucks|cafe|restaurant|food|dine|eat/i,
      groceries: /bigbasket|grofers|blinkit|jiomart|dmart|grocery|vegetables|fruits|milk|provisions/i,
      transportation: /uber|ola|rapido|metro|bus|railway|irctc|redbus|taxi|ride|fuel|petrol|diesel/i,
      shopping: /amazon|flipkart|myntra|ajio|meesho|snapdeal|shopping|mall|store|shop/i,
      entertainment: /netflix|hotstar|prime\s*video|spotify|gaana|bookmyshow|movie|theatre|gaming/i,
      utilities: /electricity|water|gas|internet|broadband|airtel|jio|vi|bsnl|recharge|bill/i,
      healthcare: /hospital|pharmacy|medical|doctor|clinic|health|medicine|apollo|fortis|practo/i,
      education: /school|college|university|course|udemy|coursera|tuition|education|books/i,
      investment: /zerodha|groww|upstox|kuvera|smallcase|mutual\s*fund|sip|stocks|investment/i,
      insurance: /insurance|lic|policy|premium|hdfc\s*life|icici\s*pru|sbi\s*life|bajaj\s*allianz/i,
      emi: /emi|installment|loan\s*payment|equated\s*monthly/i,
      rent: /rent|landlord|house\s*rent|pg|hostel/i,
      travel: /makemytrip|goibibo|cleartrip|yatra|hotel|flight|booking|travel|trip/i,
      subscription: /subscription|monthly\s*plan|annual\s*plan|membership|premium/i,
    };
  }

  parse(emailBody, subject, from) {
    const text = `${subject || ''} ${emailBody || ''} ${from || ''}`;
    const result = {
      isUPI: false,
      amount: null,
      type: 'unknown', // debit/credit
      upiId: null,
      payerVPA: null,
      payeeVPA: null,
      utr: null,
      app: null,
      merchant: null,
      category: 'other',
      confidence: 0,
    };

    // Check if it's a UPI transaction
    const upiIndicators = /upi|unified\s*payment|vpa|@[a-z]+\b|transaction\s*(successful|failed|id)/i;
    if (!upiIndicators.test(text)) return result;
    result.isUPI = true;

    // Extract amount
    const primaryAmount = this.amountEngine.extractPrimaryAmount(text);
    if (primaryAmount) {
      result.amount = primaryAmount.value;
      result.type = primaryAmount.type === 'credit' ? 'credit' : 'debit';
      result.confidence = primaryAmount.confidence;
    }

    // Extract UPI IDs
    const upiIds = [];
    let upiMatch;
    const upiRegex = new RegExp(this.upiIdPattern.source, 'g');
    while ((upiMatch = upiRegex.exec(text)) !== null) {
      upiIds.push(upiMatch[1]);
    }
    if (upiIds.length > 0) {
      result.upiId = upiIds[0];
      if (upiIds.length >= 2) {
        result.payerVPA = upiIds[0];
        result.payeeVPA = upiIds[1];
      }
    }

    // Extract UTR
    const utrRegex = new RegExp(this.utrPattern.source, 'gi');
    const utrMatch = utrRegex.exec(text);
    if (utrMatch) result.utr = utrMatch[1];

    // Detect UPI app
    for (const [app, pattern] of Object.entries(this.upiAppSignatures)) {
      if (pattern.test(text)) {
        result.app = app;
        break;
      }
    }

    // Detect merchant/category
    for (const [category, pattern] of Object.entries(this.merchantCategories)) {
      if (pattern.test(text)) {
        result.category = category;
        break;
      }
    }

    // Extract merchant name heuristic
    const merchantPatterns = [
      /(?:paid\s+to|transferred\s+to|sent\s+to|payment\s+to)\s+([A-Za-z0-9\s&'.]+?)(?:\s*(?:via|through|using|on|\.|$))/i,
      /(?:from|received\s+from)\s+([A-Za-z0-9\s&'.]+?)(?:\s*(?:via|through|using|on|\.|$))/i,
    ];
    for (const mp of merchantPatterns) {
      const mm = mp.exec(text);
      if (mm && mm[1].trim().length > 1) {
        result.merchant = mm[1].trim().substring(0, 60);
        break;
      }
    }

    return result;
  }
}

// ─── Bank Alert Parser ────────────────────────────────────────
class BankAlertParser {
  constructor() {
    this.amountEngine = new AmountExtractionEngine();
    this.dateEngine = new DateExtractionEngine();

    this.bankPatterns = {
      'SBI': {
        sender: /sbi|state\s*bank/i,
        debit: /debited|withdrawn|paid/i,
        credit: /credited|deposited|received/i,
        accountPattern: /(?:A\/c|Account|Ac)\s*(?:no\.?|number)?\s*[:\s]*(?:XX|xx|\*{2,})?(\d{4,})/i,
        balancePattern: /(?:Bal|Balance|Avl\.?\s*Bal)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
      'ICICI': {
        sender: /icici/i,
        debit: /debited|withdrawn/i,
        credit: /credited/i,
        accountPattern: /(?:Acct|Account)\s*(?:no\.?)?\s*[:\s]*(?:XX)?(\d{4,})/i,
        balancePattern: /(?:Avl\s*Bal|Available\s*Balance)\s*(?:is)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
      'HDFC': {
        sender: /hdfc/i,
        debit: /debited|withdrawn/i,
        credit: /credited/i,
        accountPattern: /(?:a\/c|account)\s*(?:no\.?)?\s*[:\s]*(?:XX)?(\d{4,})/i,
        balancePattern: /(?:Avl\s*bal|Balance)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
      'Axis': {
        sender: /axis/i,
        debit: /debited/i,
        credit: /credited/i,
        accountPattern: /(?:A\/C|Account)\s*[:\s]*(?:XX)?(\d{4,})/i,
        balancePattern: /(?:Bal|Balance)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
      'Kotak': {
        sender: /kotak/i,
        debit: /debited/i,
        credit: /credited/i,
        accountPattern: /(?:A\/c|Account)\s*[:\s]*(?:XX)?(\d{4,})/i,
        balancePattern: /(?:Bal)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
      'Generic': {
        sender: /bank|financial|noreply/i,
        debit: /debited|withdrawn|paid|sent|deducted|charged/i,
        credit: /credited|deposited|received|added|refund/i,
        accountPattern: /(?:A\/c|Account|Ac)\s*(?:no\.?)?\s*[:\s]*(?:XX|xx|\*{2,})?(\d{3,})/i,
        balancePattern: /(?:Bal(?:ance)?)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      },
    };
  }

  parse(emailBody, subject, from, emailDate) {
    const text = `${subject || ''}\n${emailBody || ''}`;
    const senderText = `${from || ''} ${subject || ''}`;

    const result = {
      isTransaction: false,
      bank: null,
      type: null, // debit/credit
      amount: null,
      accountNumber: null,
      balance: null,
      date: null,
      description: subject || '',
      merchantName: null,
      referenceNumber: null,
      confidence: 0,
    };

    // Detect bank
    for (const [bankName, patterns] of Object.entries(this.bankPatterns)) {
      if (patterns.sender.test(senderText)) {
        result.bank = bankName;

        // Detect transaction type
        if (patterns.debit.test(text)) result.type = 'debit';
        else if (patterns.credit.test(text)) result.type = 'credit';

        // Extract account number
        const accMatch = patterns.accountPattern.exec(text);
        if (accMatch) result.accountNumber = accMatch[1];

        // Extract balance
        const balMatch = patterns.balancePattern.exec(text);
        if (balMatch) result.balance = parseFloat(balMatch[1].replace(/,/g, ''));

        break;
      }
    }

    if (!result.bank) result.bank = 'Unknown';

    // Extract amount
    const primaryAmount = this.amountEngine.extractPrimaryAmount(text);
    if (primaryAmount) {
      result.amount = primaryAmount.value;
      if (!result.type) result.type = primaryAmount.type === 'credit' ? 'credit' : 'debit';
      result.confidence = primaryAmount.confidence;
    }

    // Extract date
    result.date = this.dateEngine.extractMostRelevantDate(text, emailDate);

    // Determine if this is actually a transaction alert
    result.isTransaction = !!(result.amount && result.type && result.amount > 0);
    if (result.isTransaction) result.confidence = Math.max(result.confidence, 0.6);

    // Extract reference number
    const refPatterns = [
      /(?:Ref\.?\s*(?:No\.?)?|Txn\s*(?:No\.?)?|Reference)\s*[:\s]*([A-Z0-9]{6,20})/i,
      /(?:UTR|NEFT|RTGS|IMPS)\s*[:\s]*([A-Z0-9]{8,20})/i,
    ];
    for (const rp of refPatterns) {
      const rm = rp.exec(text);
      if (rm) { result.referenceNumber = rm[1]; break; }
    }

    return result;
  }
}

// ─── Email Sentiment Analyzer ─────────────────────────────────
class EmailSentimentAnalyzer {
  constructor() {
    this.positiveWords = new Set([
      'credited', 'received', 'successful', 'approved', 'confirmed', 'completed',
      'reward', 'cashback', 'bonus', 'interest', 'dividend', 'profit', 'gain',
      'refund', 'deposited', 'added', 'earned', 'savings', 'growth',
    ]);
    this.negativeWords = new Set([
      'debited', 'withdrawn', 'failed', 'declined', 'overdue', 'penalty',
      'insufficient', 'charged', 'fee', 'fine', 'loss', 'deducted',
      'expired', 'rejected', 'cancelled', 'blocked', 'fraud', 'suspicious',
    ]);
    this.urgentWords = new Set([
      'urgent', 'immediate', 'action required', 'overdue', 'last date',
      'deadline', 'penalty', 'blocked', 'suspended', 'fraud', 'suspicious',
    ]);
  }

  analyze(text) {
    const words = (text || '').toLowerCase().split(/\s+/);
    let positiveScore = 0, negativeScore = 0, urgencyScore = 0;

    for (const word of words) {
      if (this.positiveWords.has(word)) positiveScore++;
      if (this.negativeWords.has(word)) negativeScore++;
      if (this.urgentWords.has(word)) urgencyScore++;
    }

    const total = positiveScore + negativeScore;
    let sentiment = 'neutral';
    let score = 0;

    if (total > 0) {
      score = (positiveScore - negativeScore) / total;
      if (score > 0.2) sentiment = 'positive';
      else if (score < -0.2) sentiment = 'negative';
    }

    return {
      sentiment,
      score: Math.round(score * 100) / 100,
      positiveCount: positiveScore,
      negativeCount: negativeScore,
      urgency: urgencyScore > 0 ? (urgencyScore > 2 ? 'high' : 'medium') : 'low',
      isFinancialAlert: total > 0,
    };
  }
}

// ─── Email Category Detector ──────────────────────────────────
class EmailCategoryDetector {
  constructor() {
    this.categories = {
      bank_alert: {
        keywords: ['transaction alert', 'debited', 'credited', 'balance', 'account', 'atm', 'neft', 'rtgs', 'imps'],
        weight: 1.0,
      },
      upi_transaction: {
        keywords: ['upi', 'vpa', '@ybl', '@paytm', '@okhdfcbank', 'unified payment', 'qr', 'scan and pay'],
        weight: 1.0,
      },
      credit_card: {
        keywords: ['credit card', 'card transaction', 'last 4 digits', 'card ending', 'reward points', 'statement'],
        weight: 0.9,
      },
      bank_statement: {
        keywords: ['account statement', 'monthly statement', 'quarterly statement', 'annual statement', 'passbook'],
        weight: 0.95,
      },
      emi_payment: {
        keywords: ['emi', 'installment', 'emi due', 'auto debit', 'loan payment', 'equated monthly'],
        weight: 0.9,
      },
      salary: {
        keywords: ['salary', 'payslip', 'pay slip', 'monthly salary', 'ctc', 'gross salary', 'net pay', 'wage'],
        weight: 0.95,
      },
      investment: {
        keywords: ['mutual fund', 'sip', 'folio', 'nav', 'units allotted', 'dividend', 'capital gain', 'portfolio'],
        weight: 0.85,
      },
      insurance: {
        keywords: ['insurance', 'premium', 'policy', 'claim', 'maturity', 'sum assured', 'cover'],
        weight: 0.8,
      },
      tax: {
        keywords: ['form 16', 'tds', 'income tax', 'tax deducted', 'itr', 'assessment', 'pan'],
        weight: 0.85,
      },
      bill_payment: {
        keywords: ['bill payment', 'electricity', 'water bill', 'gas bill', 'broadband', 'mobile recharge', 'dth'],
        weight: 0.75,
      },
      loan: {
        keywords: ['loan', 'home loan', 'personal loan', 'car loan', 'education loan', 'disbursement', 'sanction'],
        weight: 0.85,
      },
      receipt: {
        keywords: ['receipt', 'invoice', 'order', 'booking', 'ticket', 'purchase'],
        weight: 0.6,
      },
      promotional: {
        keywords: ['offer', 'discount', 'coupon', 'deal', 'sale', 'cashback offer', 'pre-approved', 'eligible'],
        weight: 0.3,
      },
    };
  }

  detect(text) {
    const lowerText = (text || '').toLowerCase();
    const scores = {};

    for (const [category, config] of Object.entries(this.categories)) {
      let score = 0;
      let matchedKeywords = [];
      for (const keyword of config.keywords) {
        if (lowerText.includes(keyword)) {
          score += config.weight;
          matchedKeywords.push(keyword);
        }
      }
      if (score > 0) {
        scores[category] = { score: score * config.weight, matchedKeywords };
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    if (sorted.length === 0) return { category: 'other', confidence: 0, matchedKeywords: [] };

    const [topCategory, topData] = sorted[0];
    const maxPossible = this.categories[topCategory].keywords.length * this.categories[topCategory].weight;
    const confidence = Math.min(topData.score / maxPossible, 1.0);

    return {
      category: topCategory,
      confidence,
      matchedKeywords: topData.matchedKeywords,
      allCategories: sorted.map(([cat, data]) => ({
        category: cat,
        score: data.score,
        keywords: data.matchedKeywords,
      })),
    };
  }
}

// ─── Email Thread Analyzer ────────────────────────────────────
class EmailThreadAnalyzer {
  constructor() {
    this.amountEngine = new AmountExtractionEngine();
  }

  analyzeThread(emails) {
    if (!emails || emails.length === 0) return null;

    const sorted = [...emails].sort((a, b) => new Date(a.date) - new Date(b.date));
    const amounts = [];
    const categories = {};

    for (const email of sorted) {
      const extracted = this.amountEngine.extractAmounts(email.body || email.snippet || '');
      amounts.push(...extracted);
      if (email.category) {
        categories[email.category] = (categories[email.category] || 0) + 1;
      }
    }

    const totalAmount = amounts.filter(a => a.type === 'debit').reduce((sum, a) => sum + a.value, 0);
    const totalCredit = amounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.value, 0);

    return {
      emailCount: sorted.length,
      dateRange: {
        from: sorted[0].date,
        to: sorted[sorted.length - 1].date,
      },
      totalDebits: totalAmount,
      totalCredits: totalCredit,
      netFlow: totalCredit - totalAmount,
      transactionCount: amounts.filter(a => a.type !== 'balance').length,
      dominantCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
      categories,
    };
  }
}

// ─── Spending Pattern Detector ────────────────────────────────
class EmailSpendingPatternDetector {
  constructor() {
    this.patterns = [];
  }

  addTransaction(transaction) {
    this.patterns.push(transaction);
  }

  addTransactions(transactions) {
    this.patterns.push(...transactions);
  }

  detectPatterns() {
    if (this.patterns.length < 3) {
      return { recurring: [], trends: [], anomalies: [], insights: [] };
    }

    // Group by merchant/description
    const merchantGroups = {};
    for (const txn of this.patterns) {
      const key = (txn.merchant || txn.description || 'unknown').toLowerCase().trim();
      if (!merchantGroups[key]) merchantGroups[key] = [];
      merchantGroups[key].push(txn);
    }

    // Detect recurring payments
    const recurring = [];
    for (const [merchant, txns] of Object.entries(merchantGroups)) {
      if (txns.length >= 2) {
        const amounts = txns.map(t => t.amount).filter(a => a > 0);
        const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const variance = amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
        const isConsistent = Math.sqrt(variance) / avgAmount < 0.1; // <10% CV

        if (isConsistent && amounts.length >= 2) {
          recurring.push({
            merchant,
            frequency: this._estimateFrequency(txns),
            averageAmount: Math.round(avgAmount * 100) / 100,
            count: txns.length,
            lastDate: txns.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date,
            isSubscription: avgAmount < 5000 && isConsistent,
          });
        }
      }
    }

    // Detect spending trends
    const monthlySpending = {};
    for (const txn of this.patterns) {
      if (txn.type === 'debit' && txn.amount > 0) {
        const month = new Date(txn.date).toISOString().slice(0, 7);
        monthlySpending[month] = (monthlySpending[month] || 0) + txn.amount;
      }
    }

    const months = Object.keys(monthlySpending).sort();
    const trends = [];
    if (months.length >= 2) {
      const values = months.map(m => monthlySpending[m]);
      const trend = this._linearTrend(values);
      trends.push({
        period: `${months[0]} to ${months[months.length - 1]}`,
        direction: trend > 0 ? 'increasing' : (trend < 0 ? 'decreasing' : 'stable'),
        monthlyAverage: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
        monthlyValues: months.map((m, i) => ({ month: m, amount: values[i] })),
        trendStrength: Math.abs(trend),
      });
    }

    // Detect anomalies (transactions > 2 std deviations from mean)
    const allAmounts = this.patterns.filter(t => t.amount > 0).map(t => t.amount);
    const mean = allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length;
    const stdDev = Math.sqrt(allAmounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / allAmounts.length);
    const anomalies = this.patterns.filter(t => t.amount > mean + 2 * stdDev).map(t => ({
      ...t,
      zScore: (t.amount - mean) / stdDev,
      reason: `Amount ₹${t.amount.toLocaleString()} is ${((t.amount - mean) / stdDev).toFixed(1)}x standard deviations above average`,
    }));

    // Generate insights
    const insights = this._generateInsights(recurring, trends, anomalies, monthlySpending);

    return { recurring, trends, anomalies, insights };
  }

  _estimateFrequency(transactions) {
    if (transactions.length < 2) return 'unknown';
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap <= 2) return 'daily';
    if (avgGap <= 8) return 'weekly';
    if (avgGap <= 16) return 'biweekly';
    if (avgGap <= 35) return 'monthly';
    if (avgGap <= 95) return 'quarterly';
    return 'irregular';
  }

  _linearTrend(values) {
    const n = values.length;
    if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  _generateInsights(recurring, trends, anomalies, monthlySpending) {
    const insights = [];

    if (recurring.length > 0) {
      const totalRecurring = recurring.reduce((s, r) => s + r.averageAmount, 0);
      insights.push({
        type: 'recurring',
        title: 'Recurring Payments Detected',
        description: `${recurring.length} recurring payment(s) totaling approximately ₹${totalRecurring.toLocaleString()} per cycle.`,
        priority: 'medium',
        data: { count: recurring.length, total: totalRecurring },
      });
    }

    if (trends.length > 0 && trends[0].direction === 'increasing') {
      insights.push({
        type: 'trend',
        title: 'Spending is Increasing',
        description: `Your spending has been trending upward. Monthly average: ₹${trends[0].monthlyAverage.toLocaleString()}.`,
        priority: 'high',
        data: trends[0],
      });
    }

    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        title: `${anomalies.length} Unusual Transaction(s)`,
        description: `Found ${anomalies.length} transaction(s) significantly above your average spending.`,
        priority: 'high',
        data: { count: anomalies.length, transactions: anomalies.slice(0, 5) },
      });
    }

    const monthValues = Object.values(monthlySpending);
    if (monthValues.length >= 2) {
      const lastMonth = monthValues[monthValues.length - 1];
      const prevMonth = monthValues[monthValues.length - 2];
      const change = ((lastMonth - prevMonth) / prevMonth * 100).toFixed(1);
      insights.push({
        type: 'comparison',
        title: 'Month-over-Month Change',
        description: `Spending ${parseFloat(change) > 0 ? 'increased' : 'decreased'} by ${Math.abs(parseFloat(change))}% compared to previous month.`,
        priority: parseFloat(change) > 20 ? 'high' : 'low',
        data: { currentMonth: lastMonth, previousMonth: prevMonth, changePercent: parseFloat(change) },
      });
    }

    return insights;
  }
}

// ─── Natural Language Summary Generator ───────────────────────
class EmailNLSummaryGenerator {
  constructor() {
    this.templates = {
      dailySummary: (data) => {
        const parts = [];
        parts.push(`📊 **Daily Financial Email Summary** (${data.date})`);
        parts.push(`\nYou received ${data.totalEmails} financial email(s) today.`);

        if (data.totalDebits > 0) {
          parts.push(`\n💸 **Total Debits:** ₹${data.totalDebits.toLocaleString()} across ${data.debitCount} transaction(s)`);
        }
        if (data.totalCredits > 0) {
          parts.push(`\n💰 **Total Credits:** ₹${data.totalCredits.toLocaleString()} across ${data.creditCount} transaction(s)`);
        }
        if (data.alerts && data.alerts.length > 0) {
          parts.push(`\n⚠️ **Alerts:** ${data.alerts.join(', ')}`);
        }
        if (data.topCategories && data.topCategories.length > 0) {
          parts.push(`\n📂 **Top Categories:** ${data.topCategories.map(c => `${c.name} (${c.count})`).join(', ')}`);
        }
        return parts.join('\n');
      },

      transactionSummary: (txn) => {
        const emoji = txn.type === 'credit' ? '💰' : '💸';
        const verb = txn.type === 'credit' ? 'received' : 'paid';
        return `${emoji} ₹${txn.amount?.toLocaleString() || 0} ${verb}${txn.merchant ? ` to/from ${txn.merchant}` : ''}${txn.bank ? ` via ${txn.bank}` : ''}${txn.date ? ` on ${new Date(txn.date).toLocaleDateString('en-IN')}` : ''}`;
      },

      weeklyReport: (data) => {
        const parts = [];
        parts.push(`📈 **Weekly Financial Summary** (${data.weekStart} – ${data.weekEnd})`);
        parts.push(`\n📬 **Emails Analyzed:** ${data.emailCount}`);
        parts.push(`\n💸 **Total Spending:** ₹${data.totalSpending.toLocaleString()}`);
        parts.push(`\n💰 **Total Income:** ₹${data.totalIncome.toLocaleString()}`);
        parts.push(`\n📊 **Net Flow:** ₹${(data.totalIncome - data.totalSpending).toLocaleString()}`);

        if (data.topMerchants && data.topMerchants.length > 0) {
          parts.push(`\n🏪 **Top Merchants:**`);
          data.topMerchants.forEach((m, i) => {
            parts.push(`  ${i + 1}. ${m.name}: ₹${m.amount.toLocaleString()} (${m.count} txn)`);
          });
        }

        if (data.insights && data.insights.length > 0) {
          parts.push(`\n💡 **Insights:**`);
          data.insights.forEach(insight => {
            parts.push(`  • ${insight.description}`);
          });
        }

        return parts.join('\n');
      },
    };
  }

  generateDailySummary(emails, date) {
    const transactions = emails.filter(e => e.parsedTransaction?.isTransaction);
    const debits = transactions.filter(t => t.parsedTransaction.type === 'debit');
    const credits = transactions.filter(t => t.parsedTransaction.type === 'credit');

    const categoryCount = {};
    for (const email of emails) {
      const cat = email.emailCategory?.category || 'other';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    return this.templates.dailySummary({
      date: date || new Date().toLocaleDateString('en-IN'),
      totalEmails: emails.length,
      totalDebits: debits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
      totalCredits: credits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
      debitCount: debits.length,
      creditCount: credits.length,
      topCategories: Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      alerts: emails.filter(e => e.sentiment?.urgency === 'high').map(e => e.subject),
    });
  }

  generateTransactionNarrative(transaction) {
    return this.templates.transactionSummary(transaction);
  }

  generateWeeklyReport(emails, weekStart, weekEnd) {
    const transactions = emails.filter(e => e.parsedTransaction?.isTransaction);
    const debits = transactions.filter(t => t.parsedTransaction.type === 'debit');
    const credits = transactions.filter(t => t.parsedTransaction.type === 'credit');

    const merchantSpending = {};
    for (const t of debits) {
      const merchant = t.parsedTransaction.merchant || t.parsedTransaction.description || 'Unknown';
      if (!merchantSpending[merchant]) merchantSpending[merchant] = { amount: 0, count: 0 };
      merchantSpending[merchant].amount += t.parsedTransaction.amount || 0;
      merchantSpending[merchant].count++;
    }

    const patternDetector = new EmailSpendingPatternDetector();
    patternDetector.addTransactions(transactions.map(t => t.parsedTransaction));
    const patterns = patternDetector.detectPatterns();

    return this.templates.weeklyReport({
      weekStart: weekStart || 'N/A',
      weekEnd: weekEnd || 'N/A',
      emailCount: emails.length,
      totalSpending: debits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
      totalIncome: credits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
      topMerchants: Object.entries(merchantSpending)
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...data })),
      insights: patterns.insights,
    });
  }
}

// ─── Main Gmail AI Analysis Engine ────────────────────────────
class GmailAIAnalysisEngine {
  constructor() {
    this.tfidf = new EmailTFIDFVectorizer();
    this.classifier = new EmailNaiveBayesClassifier();
    this.amountEngine = new AmountExtractionEngine();
    this.dateEngine = new DateExtractionEngine();
    this.upiParser = new UPITransactionParser();
    this.bankAlertParser = new BankAlertParser();
    this.sentimentAnalyzer = new EmailSentimentAnalyzer();
    this.categoryDetector = new EmailCategoryDetector();
    this.threadAnalyzer = new EmailThreadAnalyzer();
    this.patternDetector = new EmailSpendingPatternDetector();
    this.summaryGenerator = new EmailNLSummaryGenerator();

    this._trainClassifier();
    logger.info('Gmail AI Analysis Engine initialized');
  }

  _trainClassifier() {
    // Train with sample data for email classification
    const trainingDocs = [
      'Your account has been debited with Rs 5000 for ATM withdrawal',
      'Rs 25000 credited to your account salary payment',
      'Credit card statement for the month of January',
      'Your SIP of Rs 5000 has been successfully invested in mutual fund',
      'Insurance premium of Rs 12000 debited from your account',
      'EMI of Rs 15000 auto debited from account',
      'UPI payment of Rs 500 to merchant via Google Pay',
      'Tax deducted at source Form 16 available',
      'Electricity bill payment of Rs 2500 successful',
      'Loan disbursement of Rs 500000 credited to your account',
      'Exciting offer 50% cashback on credit card',
      'Monthly salary credit of Rs 85000',
      'Fixed deposit maturity amount Rs 100000 credited',
      'Personal loan EMI Rs 8500 debited',
    ];

    const trainingLabels = [
      'bank_alert', 'bank_alert', 'credit_card', 'investment',
      'insurance', 'emi_payment', 'upi_transaction', 'tax',
      'bill_payment', 'loan', 'promotional', 'salary',
      'investment', 'emi_payment',
    ];

    this.classifier.train(trainingDocs, trainingLabels);
    this.tfidf.fit(trainingDocs);
  }

  /**
   * Analyze a single email and extract all financial intelligence
   */
  analyzeEmail(email) {
    const { subject, body, snippet, from, date, messageId } = email;
    const fullText = `${subject || ''}\n${snippet || ''}\n${body || ''}`;

    // 1. Classify email category
    const classification = this.classifier.predict(fullText);
    const ruleCategory = this.categoryDetector.detect(fullText);

    // Use rule-based if high confidence, otherwise use ML
    const emailCategory = ruleCategory.confidence > 0.5 ? ruleCategory : {
      category: classification.label,
      confidence: classification.confidence,
      matchedKeywords: [],
    };

    // 2. Parse as bank alert
    const bankAlert = this.bankAlertParser.parse(body || snippet, subject, from, date);

    // 3. Parse as UPI transaction
    const upiTransaction = this.upiParser.parse(body || snippet, subject, from);

    // 4. Extract amounts
    const amounts = this.amountEngine.extractAmounts(fullText);

    // 5. Extract dates
    const dates = this.dateEngine.extractDates(fullText);

    // 6. Sentiment analysis
    const sentiment = this.sentimentAnalyzer.analyze(fullText);

    // 7. Determine the primary parsed transaction
    let parsedTransaction = null;
    if (bankAlert.isTransaction) {
      parsedTransaction = {
        isTransaction: true,
        source: 'bank_alert',
        type: bankAlert.type,
        amount: bankAlert.amount,
        bank: bankAlert.bank,
        accountNumber: bankAlert.accountNumber,
        balance: bankAlert.balance,
        date: bankAlert.date,
        description: subject,
        referenceNumber: bankAlert.referenceNumber,
        confidence: bankAlert.confidence,
      };
    } else if (upiTransaction.isUPI && upiTransaction.amount) {
      parsedTransaction = {
        isTransaction: true,
        source: 'upi',
        type: upiTransaction.type,
        amount: upiTransaction.amount,
        merchant: upiTransaction.merchant,
        upiId: upiTransaction.upiId,
        utr: upiTransaction.utr,
        app: upiTransaction.app,
        category: upiTransaction.category,
        date: date ? new Date(date) : new Date(),
        description: subject,
        confidence: upiTransaction.confidence,
      };
    } else if (amounts.length > 0 && amounts[0].type !== 'unknown') {
      parsedTransaction = {
        isTransaction: true,
        source: 'extracted',
        type: amounts[0].type,
        amount: amounts[0].value,
        date: dates.length > 0 ? dates[0].date : (date ? new Date(date) : new Date()),
        description: subject,
        confidence: amounts[0].confidence * 0.7, // Lower confidence for generic extraction
      };
    }

    return {
      messageId,
      subject,
      from,
      date,
      emailCategory,
      parsedTransaction,
      upiDetails: upiTransaction.isUPI ? upiTransaction : null,
      bankAlertDetails: bankAlert.isTransaction ? bankAlert : null,
      amounts,
      dates: dates.map(d => ({ date: d.date.toISOString(), raw: d.raw })),
      sentiment,
      isFinancial: emailCategory.category !== 'promotional' && emailCategory.category !== 'other',
      analysisTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Batch analyze multiple emails
   */
  analyzeEmails(emails) {
    const results = [];
    for (const email of emails) {
      try {
        results.push(this.analyzeEmail(email));
      } catch (err) {
        logger.error(`Error analyzing email ${email.messageId}:`, err.message);
        results.push({
          messageId: email.messageId,
          error: err.message,
          analysisTimestamp: new Date().toISOString(),
        });
      }
    }
    return results;
  }

  /**
   * Generate aggregate analytics from analyzed emails
   */
  generateAnalytics(analyzedEmails) {
    const transactions = analyzedEmails.filter(e => e.parsedTransaction?.isTransaction);
    const debits = transactions.filter(t => t.parsedTransaction.type === 'debit');
    const credits = transactions.filter(t => t.parsedTransaction.type === 'credit');

    // Category breakdown
    const categoryBreakdown = {};
    for (const email of analyzedEmails) {
      const cat = email.emailCategory?.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }

    // Spending by merchant
    const merchantSpending = {};
    for (const t of debits) {
      const merchant = t.parsedTransaction.merchant || t.parsedTransaction.description || 'Unknown';
      if (!merchantSpending[merchant]) merchantSpending[merchant] = { total: 0, count: 0, transactions: [] };
      merchantSpending[merchant].total += t.parsedTransaction.amount || 0;
      merchantSpending[merchant].count++;
    }

    // Daily spending
    const dailySpending = {};
    for (const t of transactions) {
      const day = new Date(t.parsedTransaction.date || t.date).toISOString().slice(0, 10);
      if (!dailySpending[day]) dailySpending[day] = { debits: 0, credits: 0, count: 0 };
      if (t.parsedTransaction.type === 'debit') dailySpending[day].debits += t.parsedTransaction.amount || 0;
      else dailySpending[day].credits += t.parsedTransaction.amount || 0;
      dailySpending[day].count++;
    }

    // Bank distribution
    const bankDistribution = {};
    for (const t of transactions) {
      const bank = t.parsedTransaction.bank || t.bankAlertDetails?.bank || 'Unknown';
      bankDistribution[bank] = (bankDistribution[bank] || 0) + 1;
    }

    // Sentiment breakdown
    const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
    let highUrgency = 0;
    for (const e of analyzedEmails) {
      if (e.sentiment) {
        sentimentBreakdown[e.sentiment.sentiment]++;
        if (e.sentiment.urgency === 'high') highUrgency++;
      }
    }

    // Run pattern detection
    this.patternDetector = new EmailSpendingPatternDetector();
    this.patternDetector.addTransactions(transactions.map(t => ({
      ...t.parsedTransaction,
      merchant: t.parsedTransaction.merchant || t.parsedTransaction.description,
    })));
    const patterns = this.patternDetector.detectPatterns();

    return {
      summary: {
        totalEmails: analyzedEmails.length,
        financialEmails: analyzedEmails.filter(e => e.isFinancial).length,
        transactionCount: transactions.length,
        totalDebits: debits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
        totalCredits: credits.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0),
        averageTransaction: transactions.length > 0 ?
          transactions.reduce((s, t) => s + (t.parsedTransaction.amount || 0), 0) / transactions.length : 0,
        highConfidenceCount: transactions.filter(t => t.parsedTransaction.confidence > 0.7).length,
      },
      categoryBreakdown,
      merchantSpending: Object.entries(merchantSpending)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([name, data]) => ({ name, ...data })),
      dailySpending: Object.entries(dailySpending)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({ date, ...data })),
      bankDistribution,
      sentimentBreakdown,
      highUrgencyAlerts: highUrgency,
      patterns,
    };
  }

  /**
   * Generate natural language summary
   */
  generateSummary(analyzedEmails, type = 'daily') {
    if (type === 'weekly') {
      const dates = analyzedEmails.map(e => new Date(e.date)).filter(d => !isNaN(d));
      const weekStart = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-IN') : 'N/A';
      const weekEnd = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-IN') : 'N/A';
      return this.summaryGenerator.generateWeeklyReport(analyzedEmails, weekStart, weekEnd);
    }
    return this.summaryGenerator.generateDailySummary(analyzedEmails);
  }

  /**
   * Find similar emails using TF-IDF cosine similarity
   */
  findSimilarEmails(targetEmail, allEmails, topN = 5) {
    const targetText = `${targetEmail.subject || ''} ${targetEmail.body || targetEmail.snippet || ''}`;
    const targetVector = this.tfidf.transform(targetText);

    const similarities = allEmails
      .filter(e => e.messageId !== targetEmail.messageId)
      .map(email => {
        const text = `${email.subject || ''} ${email.body || email.snippet || ''}`;
        const vector = this.tfidf.transform(text);
        return {
          email,
          similarity: this.tfidf.cosineSimilarity(targetVector, vector),
        };
      })
      .filter(s => s.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topN);

    return similarities;
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      classifierTrained: this.classifier.trained,
      tfidfFitted: this.tfidf.fitted,
      vocabularySize: this.tfidf.vocabulary.size,
      classifierClasses: Object.keys(this.classifier.classCounts),
    };
  }
}

// ─── Exports ──────────────────────────────────────────────────
module.exports = {
  GmailAIAnalysisEngine,
  EmailTFIDFVectorizer,
  EmailNaiveBayesClassifier,
  AmountExtractionEngine,
  DateExtractionEngine,
  UPITransactionParser,
  BankAlertParser,
  EmailSentimentAnalyzer,
  EmailCategoryDetector,
  EmailThreadAnalyzer,
  EmailSpendingPatternDetector,
  EmailNLSummaryGenerator,
};
