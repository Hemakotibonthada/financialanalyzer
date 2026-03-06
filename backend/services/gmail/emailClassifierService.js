/**
 * Email Classifier Service
 * AI-powered email classification for FinancialAnalyzer
 * Uses local ML algorithms (Naive Bayes, TF-IDF, heuristic scoring) to classify
 * Gmail emails into financial categories without external API dependencies.
 *
 * @module services/gmail/emailClassifierService
 */

const logger = require('../../utils/logger');

// ─── Constants & Configuration ───────────────────────────────────────────────

const CLASSIFICATION_CATEGORIES = [
  'transaction_alert',
  'bank_statement',
  'credit_card_statement',
  'upi_payment',
  'investment_update',
  'insurance_notification',
  'loan_emi',
  'salary_credit',
  'tax_document',
  'bill_payment',
  'subscription_charge',
  'refund_credit',
  'fraud_alert',
  'promotional',
  'other'
];

const INDIAN_BANK_DOMAINS = {
  'sbi': ['sbi.co.in', 'onlinesbi.com', 'sbicaps.com', 'sbicard.com', 'sbimf.com'],
  'hdfc': ['hdfcbank.com', 'hdfcbank.net', 'hdfcfund.com', 'hdfclife.com', 'hdfcsec.com', 'hdfcergo.com'],
  'icici': ['icicibank.com', 'iciciprulife.com', 'icicibank.co.in', 'icicidirect.com', 'icicipruamc.com'],
  'axis': ['axisbank.com', 'axisbank.co.in', 'axisdirect.in', 'axismf.com'],
  'kotak': ['kotak.com', 'kotakbank.com', 'kotaksecurities.com', 'kotakmf.com'],
  'pnb': ['pnb.co.in', 'pnbindia.in', 'pnbmetlife.com', 'pnbhousing.com'],
  'bob': ['bankofbaroda.com', 'bankofbaroda.co.in', 'barodaetrade.com', 'bobtreasuryindia.com'],
  'canara': ['canarabank.com', 'canarabank.in', 'canarahsbclife.com', 'canararobeco.com'],
  'union': ['unionbankofindia.co.in', 'unionbankonline.co.in'],
  'idfc': ['idfcfirstbank.com', 'idfcbank.com', 'idfcmf.com'],
  'indusind': ['indusind.com', 'indusindbank.com'],
  'rbl': ['rblbank.com', 'rblbank.co.in'],
  'yes': ['yesbank.in', 'yesbank.com'],
  'dbs': ['dbs.com', 'dbsbank.in', 'dbs.com.sg'],
  'sc': ['sc.com', 'standardchartered.com', 'standardchartered.co.in'],
  'citi': ['citibank.com', 'citibank.co.in', 'online.citi.com'],
  'hsbc': ['hsbc.com', 'hsbc.co.in', 'hsbcinvestdirect.com'],
  'amex': ['americanexpress.com', 'aexp.com', 'amexnetwork.com'],
  'idbi': ['idbi.com', 'idbibank.in', 'idbifederal.com'],
  'federal': ['federalbank.co.in', 'fedbank.com'],
  'bandhan': ['bandhanbank.com'],
  'iob': ['iob.in', 'iobnet.co.in'],
  'indianbank': ['indianbank.in', 'indianbank.net.in'],
  'boi': ['bankofindia.co.in', 'bfrsindia.com'],
  'centralbank': ['centralbankofindia.co.in'],
  'uco': ['ucobank.com'],
  'mahabank': ['mahabank.co.in', 'bankofmaharashtra.in'],
  'punjabsind': ['punjabsindbank.co.in'],
  'jk': ['jkbank.com', 'jkbank.net'],
  'south_indian': ['southindianbank.com', 'sib.co.in'],
  'karur_vysya': ['kvb.co.in', 'kvbmail.com'],
  'city_union': ['cityunionbank.com', 'cubnetbanking.com'],
  'tamilnad': ['tmb.in', 'tmbnet.in'],
  'karnataka': ['karnatakabank.com'],
  'dhanlaxmi': ['dfrbank.com', 'dhanalakshmibank.com'],
  'csb': ['csb.co.in', 'csbbank.com'],
  'nainital': ['nainitalbank.co.in'],
  'suryoday': ['suryodaybank.com'],
  'ujjivan': ['ujjivansfb.in'],
  'equitas': ['equitasbank.com', 'equitas.in'],
  'au': ['aubank.in', 'ausmallfinancebank.com'],
  'fino': ['finobank.com'],
  'jana': ['janabank.com', 'janasmallfinancebank.com'],
  'paytm_payments': ['paytmbank.com'],
  'airtel_payments': ['airtelbank.com'],
  'india_post': ['ippb.in', 'indiapost.gov.in'],
  'nsdl_payments': ['nsdlbank.com'],
  'gramin': ['grameen.co.in'],
  'northeastern': ['nesfb.com'],
  'capital_sfb': ['capitalsfb.com'],
  'shivalik': ['shivalikbank.com'],
  'unity': ['unitysfb.com']
};

const UPI_APP_DOMAINS = {
  'paytm': ['paytm.com', 'paytmbank.com', 'paytmmoney.com', 'paytmmall.com'],
  'phonepe': ['phonepe.com', 'phonepe.in'],
  'googlepay': ['google.com', 'gpay.in', 'pay.google.com', 'payments.google.com'],
  'cred': ['cred.club', 'cred.in'],
  'bharatpe': ['bharatpe.com', 'bharatpe.in'],
  'amazonpay': ['amazon.in', 'amazon.com', 'amazonpay.in', 'pay.amazon.in'],
  'mobikwik': ['mobikwik.com', 'zaakpay.com'],
  'freecharge': ['freecharge.in', 'freecharge.com'],
  'airtel_money': ['airtel.in', 'wynk.in'],
  'jio_pay': ['jio.com', 'jiomoney.com'],
  'whatsapp_pay': ['whatsapp.com'],
  'slice': ['sliceit.com', 'slice.one'],
  'jupiter': ['jupiter.money', 'jupiter.co.in'],
  'fi': ['fi.money', 'epifi.com'],
  'niyo': ['niyo.co', 'goniyo.com'],
  'groww': ['groww.in'],
  'zerodha': ['zerodha.com', 'kite.zerodha.com'],
  'upstox': ['upstox.com']
};

const PAYMENT_GATEWAY_DOMAINS = [
  'razorpay.com', 'payu.in', 'payumoney.com', 'cashfree.com',
  'instamojo.com', 'ccavenue.com', 'billdesk.com', 'paytm.com',
  'juspay.in', 'simpl.co', 'lazypay.in', 'zestmoney.in',
  'bajajfinserv.in', 'twidpay.com', 'paypal.com', 'stripe.com',
  'digilocker.gov.in', 'incometax.gov.in', 'gst.gov.in',
  'npci.org.in', 'nsdl.co.in', 'cdsl.com'
];

const FINANCIAL_KEYWORDS = {
  transaction_alert: [
    'debited', 'credited', 'transaction', 'transfer', 'withdrawn', 'deposited',
    'neft', 'rtgs', 'imps', 'upi', 'debit', 'credit', 'txn', 'trxn',
    'a/c', 'account', 'bal', 'balance', 'avl bal', 'available balance',
    'otp', 'one time password', 'atm', 'pos', 'purchase'
  ],
  bank_statement: [
    'statement', 'account statement', 'e-statement', 'estatement',
    'monthly statement', 'quarterly statement', 'account summary',
    'passbook', 'ledger', 'period', 'opening balance', 'closing balance',
    'mini statement'
  ],
  credit_card_statement: [
    'credit card', 'card statement', 'outstanding', 'minimum due',
    'total due', 'payment due date', 'reward points', 'cashback',
    'credit limit', 'card number', 'billing cycle', 'emi conversion',
    'card ending', 'mastercard', 'visa', 'rupay'
  ],
  upi_payment: [
    'upi', 'unified payment', 'vpa', '@upi', '@ybl', '@paytm', '@oksbi',
    '@okaxis', '@okicici', '@okhdfcbank', 'upi id', 'upi ref',
    'upi transaction', 'collect request', 'pay request', 'mandate'
  ],
  investment_update: [
    'mutual fund', 'sip', 'nav', 'folio', 'units', 'portfolio',
    'investment', 'dividend', 'redemption', 'switch', 'demat',
    'stock', 'share', 'equity', 'nse', 'bse', 'sensex', 'nifty',
    'trade', 'order executed', 'contract note', 'holding'
  ],
  insurance_notification: [
    'insurance', 'policy', 'premium', 'claim', 'coverage', 'nominee',
    'sum assured', 'maturity', 'renewal', 'endowment', 'term plan',
    'health insurance', 'motor insurance', 'life insurance',
    'rider', 'surrender', 'irdai'
  ],
  loan_emi: [
    'emi', 'equated monthly', 'installment', 'loan', 'principal',
    'interest', 'tenure', 'disbursement', 'prepayment', 'foreclosure',
    'sanction', 'home loan', 'personal loan', 'car loan', 'education loan',
    'gold loan', 'moratorium', 'repayment'
  ],
  salary_credit: [
    'salary', 'payroll', 'wages', 'compensation', 'pay credited',
    'salary credited', 'monthly pay', 'pay slip', 'payslip',
    'net pay', 'gross pay', 'ctc', 'take home', 'reimbursement'
  ],
  tax_document: [
    'tax', 'itr', 'income tax', 'tds', 'form 16', 'form 26as',
    'gst', 'pan', 'aadhaar', 'assessment', 'return', 'refund',
    'challan', 'advance tax', 'tax deducted', 'tax collected',
    'capital gains', '80c', '80d', 'section'
  ],
  bill_payment: [
    'bill', 'electricity', 'water', 'gas', 'broadband', 'mobile',
    'recharge', 'prepaid', 'postpaid', 'dth', 'utility',
    'municipal', 'rent', 'maintenance', 'society', 'due date',
    'overdue', 'late fee', 'fastag', 'toll'
  ],
  subscription_charge: [
    'subscription', 'recurring', 'auto-debit', 'autopay',
    'netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube premium',
    'swiggy', 'zomato', 'membership', 'annual plan', 'monthly plan',
    'renewal', 'trial', 'upgrade', 'downgrade'
  ],
  refund_credit: [
    'refund', 'reversal', 'cashback', 'return', 'cancelled',
    'chargeback', 'dispute resolved', 'money back', 'credit back',
    'refund initiated', 'refund processed', 'refund credited'
  ],
  fraud_alert: [
    'fraud', 'suspicious', 'unauthorized', 'blocked', 'locked',
    'security alert', 'unusual activity', 'compromised',
    'phishing', 'scam', 'verify', 'urgent action', 'immediate',
    'account frozen', 'card blocked', 'kyc update', 'kyc expiry'
  ],
  promotional: [
    'offer', 'discount', 'cashback offer', 'pre-approved',
    'exclusive', 'limited time', 'hurry', 'congratulations',
    'selected', 'qualify', 'upgrade', 'apply now', 'instant approval',
    'guaranteed', 'free', 'winner', 'lucky', 'reward'
  ]
};

const URGENCY_INDICATORS = [
  'urgent', 'immediate', 'action required', 'important',
  'alert', 'warning', 'critical', 'attention', 'asap',
  'deadline', 'expires', 'last date', 'final notice',
  'do not ignore', 'time sensitive', 'response needed'
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i, /tinyurl\.com/i, /goo\.gl/i, /t\.co/i,
  /short\.link/i, /rb\.gy/i, /is\.gd/i, /v\.gd/i,
  /click\s*here/i, /verify.*account/i, /update.*kyc/i,
  /confirm.*identity/i, /secure.*login/i, /reset.*password/i,
  /\.xyz\//i, /\.top\//i, /\.club\//i, /\.online\//i,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /[a-zA-Z0-9]{30,}\.com/i,
  /@gmail\.com.*bank/i, /@yahoo\.com.*bank/i,
  /free.*prize/i, /lottery.*winner/i,
  /nigerian.*prince/i, /inheritance.*fund/i
];

const PHISHING_INDICATORS = [
  'dear customer', 'dear user', 'dear account holder',
  'click below immediately', 'verify your account now',
  'your account will be suspended', 'confirm your identity',
  'update your kyc immediately', 'link expires in 24 hours',
  'we noticed unusual activity', 're-enter your password',
  'download the attachment', 'enable macros',
  'send your details', 'reply with your pin',
  'share your otp', 'provide your card number',
  'your account has been compromised', 'act now or lose access',
  'you have won', 'congratulations you are selected',
  'unclaimed funds', 'inheritance notification'
];

const INR_AMOUNT_PATTERNS = [
  /(?:Rs\.?\s*|INR\s*|₹\s*)(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/gi,
  /(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)\s*(?:rupees|inr)/gi,
  /(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:\.\d{1,2})?)\s*(?:lakh|lac)/gi,
  /(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:\.\d{1,2})?)\s*(?:crore|cr)/gi,
  /(\d+(?:\.\d{1,2})?)\s*(?:lakh|lac)\s*(?:rupees|inr)/gi,
  /(\d+(?:\.\d{1,2})?)\s*(?:crore|cr)\s*(?:rupees|inr)/gi
];

// ─── EmailFeatureExtractor ───────────────────────────────────────────────────

/**
 * Extracts 50+ features from an email for classification.
 * Features span sender, content, amount, temporal, and structural dimensions.
 */
class EmailFeatureExtractor {
  constructor() {
    this.idfScores = {};
    this.documentCount = 0;
    this.termDocFrequency = {};
    this.vocabularySize = 0;
    this.vocabulary = new Set();
    this._bankDomainLookup = this._buildBankDomainLookup();
    this._upiDomainLookup = this._buildUpiDomainLookup();
    this._gatewayDomainSet = new Set(PAYMENT_GATEWAY_DOMAINS);
    logger.info('[EmailFeatureExtractor] Initialized with domain lookups');
  }

  /**
   * Build a reverse lookup: domain -> bank name
   */
  _buildBankDomainLookup() {
    const lookup = {};
    for (const [bankName, domains] of Object.entries(INDIAN_BANK_DOMAINS)) {
      for (const domain of domains) {
        lookup[domain.toLowerCase()] = bankName;
      }
    }
    return lookup;
  }

  /**
   * Build a reverse lookup: domain -> UPI app name
   */
  _buildUpiDomainLookup() {
    const lookup = {};
    for (const [appName, domains] of Object.entries(UPI_APP_DOMAINS)) {
      for (const domain of domains) {
        lookup[domain.toLowerCase()] = appName;
      }
    }
    return lookup;
  }

  /**
   * Extract comprehensive feature vector from an email
   * @param {Object} email - Email object with from, subject, body, date, headers, attachments
   * @returns {Object} Feature vector with 50+ dimensions
   */
  extractFeatures(email) {
    if (!email) {
      logger.warn('[EmailFeatureExtractor] Null email passed to extractFeatures');
      return this._emptyFeatureVector();
    }

    try {
      const from = email.from || email.sender || '';
      const subject = email.subject || '';
      const body = email.body || email.snippet || email.text || '';
      const date = email.date || email.receivedAt || email.internalDate || new Date();
      const headers = email.headers || {};
      const attachments = email.attachments || [];

      const senderFeatures = this.extractSenderFeatures(from);
      const contentFeatures = this.extractContentFeatures(subject, body);
      const amountFeatures = this.extractAmountFeatures(`${subject} ${body}`);
      const temporalFeatures = this.extractTemporalFeatures(date);
      const structuralFeatures = this._extractStructuralFeatures(email);
      const headerFeatures = this._extractHeaderFeatures(headers);
      const attachmentFeatures = this._extractAttachmentFeatures(attachments);

      const featureVector = {
        ...senderFeatures,
        ...contentFeatures,
        ...amountFeatures,
        ...temporalFeatures,
        ...structuralFeatures,
        ...headerFeatures,
        ...attachmentFeatures,
        _raw: {
          from,
          subject,
          bodyLength: body.length,
          date: new Date(date).toISOString(),
          attachmentCount: attachments.length
        }
      };

      return this.normalizeFeatures(featureVector);
    } catch (error) {
      logger.error('[EmailFeatureExtractor] Error extracting features:', error.message);
      return this._emptyFeatureVector();
    }
  }

  /**
   * Extract sender-related features
   * @param {string} from - Sender email/name
   * @returns {Object} Sender feature set
   */
  extractSenderFeatures(from) {
    const features = {
      sender_is_bank: 0,
      sender_bank_name: null,
      sender_is_upi_app: 0,
      sender_upi_app_name: null,
      sender_is_payment_gateway: 0,
      sender_is_government: 0,
      sender_is_noreply: 0,
      sender_domain_length: 0,
      sender_has_subdomain: 0,
      sender_domain_age_indicator: 0,
      sender_is_known_financial: 0,
      sender_local_part_length: 0,
      sender_has_numeric_local: 0,
      sender_domain_tld: 'unknown'
    };

    if (!from || typeof from !== 'string') return features;

    const emailMatch = from.match(/<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
    if (!emailMatch) return features;

    const emailAddr = emailMatch[1].toLowerCase();
    const [localPart, domain] = emailAddr.split('@');

    features.sender_local_part_length = localPart.length;
    features.sender_has_numeric_local = /\d/.test(localPart) ? 1 : 0;
    features.sender_domain_length = domain.length;
    features.sender_has_subdomain = (domain.split('.').length > 2) ? 1 : 0;
    features.sender_is_noreply = /no[-_]?reply|donotreply|noreply|alerts?|notifications?/i.test(localPart) ? 1 : 0;

    const tldMatch = domain.match(/\.([a-zA-Z]{2,})$/);
    features.sender_domain_tld = tldMatch ? tldMatch[1] : 'unknown';

    // Bank detection
    if (this._bankDomainLookup[domain]) {
      features.sender_is_bank = 1;
      features.sender_bank_name = this._bankDomainLookup[domain];
      features.sender_is_known_financial = 1;
      features.sender_domain_age_indicator = 1;
    } else {
      // Try partial domain match against bank domains
      for (const [bankDomain, bankName] of Object.entries(this._bankDomainLookup)) {
        if (domain.endsWith(bankDomain) || domain.includes(bankName)) {
          features.sender_is_bank = 1;
          features.sender_bank_name = bankName;
          features.sender_is_known_financial = 1;
          break;
        }
      }
    }

    // UPI app detection
    if (this._upiDomainLookup[domain]) {
      features.sender_is_upi_app = 1;
      features.sender_upi_app_name = this._upiDomainLookup[domain];
      features.sender_is_known_financial = 1;
    } else {
      for (const [upiDomain, appName] of Object.entries(this._upiDomainLookup)) {
        if (domain.endsWith(upiDomain) || domain.includes(appName)) {
          features.sender_is_upi_app = 1;
          features.sender_upi_app_name = appName;
          features.sender_is_known_financial = 1;
          break;
        }
      }
    }

    // Payment gateway detection
    if (this._gatewayDomainSet.has(domain)) {
      features.sender_is_payment_gateway = 1;
      features.sender_is_known_financial = 1;
    } else {
      for (const gw of this._gatewayDomainSet) {
        if (domain.endsWith(gw)) {
          features.sender_is_payment_gateway = 1;
          features.sender_is_known_financial = 1;
          break;
        }
      }
    }

    // Government
    if (/\.gov\.in$|\.nic\.in$|incometax|gst\.gov/i.test(domain)) {
      features.sender_is_government = 1;
      features.sender_is_known_financial = 1;
    }

    return features;
  }

  /**
   * Extract content-level features using TF-IDF and keyword matching
   * @param {string} subject - Email subject
   * @param {string} body - Email body text
   * @returns {Object} Content feature set
   */
  extractContentFeatures(subject, body) {
    const combinedText = `${subject || ''} ${body || ''}`.toLowerCase();
    const words = this._tokenize(combinedText);
    const wordCount = words.length;

    const features = {
      content_word_count: wordCount,
      content_char_count: combinedText.length,
      content_avg_word_length: wordCount > 0
        ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
        : 0,
      content_unique_word_ratio: wordCount > 0
        ? new Set(words).size / wordCount
        : 0,
      content_uppercase_ratio: this._getUppercaseRatio(subject || ''),
      content_exclamation_count: (combinedText.match(/!/g) || []).length,
      content_question_count: (combinedText.match(/\?/g) || []).length,
      content_url_count: (combinedText.match(/https?:\/\/[^\s<]+/gi) || []).length,
      content_has_html: /<[a-z][\s\S]*>/i.test(body || '') ? 1 : 0,
      content_phone_count: (combinedText.match(/\b\d{10,12}\b/g) || []).length,
      content_email_mention_count: (combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/g) || []).length,
      content_number_density: wordCount > 0
        ? (combinedText.match(/\d+/g) || []).length / wordCount
        : 0,
      content_subject_length: (subject || '').length,
      content_has_account_number: /\b\d{9,18}\b|a\/c\s*(?:no)?\.?\s*\d+|account\s*(?:no)?\.?\s*\d+/i.test(combinedText) ? 1 : 0,
      content_has_card_number: /\bx{4,}[\s-]?\d{4}\b|\b\*{4,}[\s-]?\d{4}\b|card\s*ending\s*\d{4}/i.test(combinedText) ? 1 : 0,
      content_has_upi_ref: /upi\s*ref|utr|rrn|reference\s*(?:no|number|id)/i.test(combinedText) ? 1 : 0,
      content_urgency_score: 0,
      content_financial_term_density: 0
    };

    // Category keyword scores
    for (const [category, keywords] of Object.entries(FINANCIAL_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = combinedText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      features[`keyword_score_${category}`] = score;
    }

    // Urgency score
    let urgencyScore = 0;
    for (const indicator of URGENCY_INDICATORS) {
      if (combinedText.includes(indicator.toLowerCase())) {
        urgencyScore += 1;
      }
    }
    features.content_urgency_score = Math.min(urgencyScore / URGENCY_INDICATORS.length, 1);

    // Financial term density
    let totalFinancialTerms = 0;
    for (const keywords of Object.values(FINANCIAL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
          totalFinancialTerms++;
        }
      }
    }
    const allFinancialTermsCount = Object.values(FINANCIAL_KEYWORDS).reduce((s, a) => s + a.length, 0);
    features.content_financial_term_density = allFinancialTermsCount > 0
      ? totalFinancialTerms / allFinancialTermsCount
      : 0;

    // TF-IDF top terms
    const tfIdfScores = this._computeTfIdf(words);
    features.content_tfidf_top3 = tfIdfScores.slice(0, 3).map(t => t.term);
    features.content_tfidf_max_score = tfIdfScores.length > 0 ? tfIdfScores[0].score : 0;

    return features;
  }

  /**
   * Extract amount-related features from text (INR-specific)
   * @param {string} text - Combined text to search
   * @returns {Object} Amount feature set
   */
  extractAmountFeatures(text) {
    const features = {
      amount_count: 0,
      amount_min: 0,
      amount_max: 0,
      amount_avg: 0,
      amount_sum: 0,
      amount_has_lakh: 0,
      amount_has_crore: 0,
      amount_range: 0,
      amount_largest_magnitude: 0,
      amount_values: []
    };

    if (!text || typeof text !== 'string') return features;

    const amounts = [];

    // Standard INR amounts (₹, Rs., INR)
    const standardPattern = /(?:Rs\.?\s*|INR\s*|₹\s*)(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/gi;
    let match;
    while ((match = standardPattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const value = parseFloat(numStr);
      if (!isNaN(value) && value > 0 && value < 1e12) {
        amounts.push(value);
      }
    }

    // Amounts in words (lakh)
    const lakhPattern = /(?:Rs\.?\s*|INR\s*|₹\s*)?(\d+(?:\.\d{1,2})?)\s*(?:lakh|lac)/gi;
    while ((match = lakhPattern.exec(text)) !== null) {
      const value = parseFloat(match[1]) * 100000;
      if (!isNaN(value) && value > 0 && value < 1e12) {
        amounts.push(value);
        features.amount_has_lakh = 1;
      }
    }

    // Amounts in words (crore)
    const crorePattern = /(?:Rs\.?\s*|INR\s*|₹\s*)?(\d+(?:\.\d{1,2})?)\s*(?:crore|cr)/gi;
    while ((match = crorePattern.exec(text)) !== null) {
      const value = parseFloat(match[1]) * 10000000;
      if (!isNaN(value) && value > 0 && value < 1e15) {
        amounts.push(value);
        features.amount_has_crore = 1;
      }
    }

    // Plain number with rupee word
    const rupeeWordPattern = /(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)\s*(?:rupees|inr)/gi;
    while ((match = rupeeWordPattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const value = parseFloat(numStr);
      if (!isNaN(value) && value > 0 && value < 1e12) {
        amounts.push(value);
      }
    }

    // Deduplicate amounts
    const uniqueAmounts = [...new Set(amounts)];

    if (uniqueAmounts.length > 0) {
      features.amount_count = uniqueAmounts.length;
      features.amount_min = Math.min(...uniqueAmounts);
      features.amount_max = Math.max(...uniqueAmounts);
      features.amount_sum = uniqueAmounts.reduce((s, a) => s + a, 0);
      features.amount_avg = features.amount_sum / uniqueAmounts.length;
      features.amount_range = features.amount_max - features.amount_min;
      features.amount_largest_magnitude = Math.floor(Math.log10(features.amount_max)) + 1;
      features.amount_values = uniqueAmounts.sort((a, b) => b - a).slice(0, 5);
    }

    return features;
  }

  /**
   * Extract temporal features from email date
   * @param {Date|string|number} date - Email timestamp
   * @returns {Object} Temporal feature set
   */
  extractTemporalFeatures(date) {
    const features = {
      temporal_hour: 0,
      temporal_day_of_week: 0,
      temporal_day_of_month: 0,
      temporal_month: 0,
      temporal_is_weekend: 0,
      temporal_is_business_hours: 0,
      temporal_is_salary_day: 0,
      temporal_is_month_end: 0,
      temporal_is_month_start: 0,
      temporal_is_quarter_end: 0,
      temporal_is_financial_year_end: 0,
      temporal_time_of_day: 'unknown',
      temporal_week_of_month: 0,
      temporal_is_holiday_season: 0
    };

    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return features;

      features.temporal_hour = d.getHours();
      features.temporal_day_of_week = d.getDay();
      features.temporal_day_of_month = d.getDate();
      features.temporal_month = d.getMonth() + 1;
      features.temporal_is_weekend = (d.getDay() === 0 || d.getDay() === 6) ? 1 : 0;
      features.temporal_is_business_hours = (d.getHours() >= 9 && d.getHours() <= 18) ? 1 : 0;

      // Salary day detection (common: 1st, 7th, 15th, 25th, last working day)
      const salaryDays = [1, 7, 15, 25, 28, 29, 30, 31];
      features.temporal_is_salary_day = salaryDays.includes(d.getDate()) ? 1 : 0;

      // Month boundary
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      features.temporal_is_month_end = (d.getDate() >= daysInMonth - 2) ? 1 : 0;
      features.temporal_is_month_start = (d.getDate() <= 3) ? 1 : 0;

      // Quarter end (March, June, September, December)
      features.temporal_is_quarter_end = ([3, 6, 9, 12].includes(d.getMonth() + 1) && d.getDate() >= 28) ? 1 : 0;

      // India financial year end (March 31)
      features.temporal_is_financial_year_end = (d.getMonth() === 2 && d.getDate() >= 25) ? 1 : 0;

      // Time of day category
      const hour = d.getHours();
      if (hour >= 5 && hour < 12) features.temporal_time_of_day = 'morning';
      else if (hour >= 12 && hour < 17) features.temporal_time_of_day = 'afternoon';
      else if (hour >= 17 && hour < 21) features.temporal_time_of_day = 'evening';
      else features.temporal_time_of_day = 'night';

      // Week of month (1-5)
      features.temporal_week_of_month = Math.ceil(d.getDate() / 7);

      // Holiday season (Diwali ~Oct-Nov, Christmas ~Dec, New Year ~Jan)
      const month = d.getMonth() + 1;
      features.temporal_is_holiday_season = ([10, 11, 12, 1].includes(month)) ? 1 : 0;

    } catch (error) {
      logger.warn('[EmailFeatureExtractor] Error parsing date for temporal features:', error.message);
    }

    return features;
  }

  /**
   * Extract structural features: body length, formatting, etc.
   */
  _extractStructuralFeatures(email) {
    const body = email.body || email.text || email.snippet || '';
    const subject = email.subject || '';

    return {
      structural_body_length: body.length,
      structural_subject_length: subject.length,
      structural_has_attachment: (email.attachments && email.attachments.length > 0) ? 1 : 0,
      structural_attachment_count: (email.attachments || []).length,
      structural_is_multipart: email.mimeType === 'multipart/mixed' ||
        email.mimeType === 'multipart/alternative' ? 1 : 0,
      structural_has_table: /<table/i.test(body) ? 1 : 0,
      structural_has_image: /<img/i.test(body) || /\.(jpg|jpeg|png|gif)/i.test(body) ? 1 : 0,
      structural_paragraph_count: (body.split(/\n\s*\n/).length) || 1,
      structural_line_count: (body.split('\n').length) || 1,
      structural_has_footer: /unsubscribe|disclaimer|confidential|this email/i.test(body) ? 1 : 0,
      structural_has_greeting: /dear\s|hi\s|hello\s|greetings/i.test(body) ? 1 : 0,
      structural_link_count: (body.match(/https?:\/\/[^\s<]+/gi) || []).length,
      structural_has_pdf: (email.attachments || []).some(a =>
        (a.mimeType || a.filename || '').toLowerCase().includes('pdf')
      ) ? 1 : 0
    };
  }

  /**
   * Extract features from email headers (SPF, DKIM, etc.)
   */
  _extractHeaderFeatures(headers) {
    const features = {
      header_has_spf: 0,
      header_spf_pass: 0,
      header_has_dkim: 0,
      header_dkim_pass: 0,
      header_has_dmarc: 0,
      header_dmarc_pass: 0,
      header_has_reply_to: 0,
      header_reply_to_matches_from: 0,
      header_has_list_unsubscribe: 0,
      header_x_mailer: 'unknown',
      header_authentication_score: 0
    };

    if (!headers || typeof headers !== 'object') return features;

    const getHeader = (name) => {
      if (typeof headers === 'object' && !Array.isArray(headers)) {
        return headers[name] || headers[name.toLowerCase()] || '';
      }
      if (Array.isArray(headers)) {
        const h = headers.find(h => h.name && h.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      }
      return '';
    };

    const authResults = getHeader('Authentication-Results') || getHeader('authentication-results');
    if (authResults) {
      features.header_has_spf = /spf=/i.test(authResults) ? 1 : 0;
      features.header_spf_pass = /spf=pass/i.test(authResults) ? 1 : 0;
      features.header_has_dkim = /dkim=/i.test(authResults) ? 1 : 0;
      features.header_dkim_pass = /dkim=pass/i.test(authResults) ? 1 : 0;
      features.header_has_dmarc = /dmarc=/i.test(authResults) ? 1 : 0;
      features.header_dmarc_pass = /dmarc=pass/i.test(authResults) ? 1 : 0;
    }

    const replyTo = getHeader('Reply-To') || getHeader('reply-to');
    if (replyTo) {
      features.header_has_reply_to = 1;
      const from = getHeader('From') || getHeader('from');
      if (from && replyTo) {
        const fromDomain = (from.match(/@([a-zA-Z0-9.-]+)/i) || [])[1] || '';
        const replyDomain = (replyTo.match(/@([a-zA-Z0-9.-]+)/i) || [])[1] || '';
        features.header_reply_to_matches_from = (fromDomain.toLowerCase() === replyDomain.toLowerCase()) ? 1 : 0;
      }
    }

    const listUnsub = getHeader('List-Unsubscribe') || getHeader('list-unsubscribe');
    features.header_has_list_unsubscribe = listUnsub ? 1 : 0;

    const xMailer = getHeader('X-Mailer') || getHeader('x-mailer');
    features.header_x_mailer = xMailer || 'unknown';

    // Authentication score (0-1): combination of SPF, DKIM, DMARC
    features.header_authentication_score = (
      features.header_spf_pass * 0.3 +
      features.header_dkim_pass * 0.4 +
      features.header_dmarc_pass * 0.3
    );

    return features;
  }

  /**
   * Extract attachment-related features
   */
  _extractAttachmentFeatures(attachments) {
    const features = {
      attachment_count: 0,
      attachment_has_pdf: 0,
      attachment_has_csv: 0,
      attachment_has_image: 0,
      attachment_has_spreadsheet: 0,
      attachment_has_document: 0,
      attachment_total_size: 0,
      attachment_types: []
    };

    if (!Array.isArray(attachments) || attachments.length === 0) return features;

    features.attachment_count = attachments.length;
    const types = new Set();

    for (const att of attachments) {
      const filename = (att.filename || att.name || '').toLowerCase();
      const mimeType = (att.mimeType || att.contentType || '').toLowerCase();
      const size = att.size || 0;

      features.attachment_total_size += size;

      if (filename.endsWith('.pdf') || mimeType.includes('pdf')) {
        features.attachment_has_pdf = 1;
        types.add('pdf');
      }
      if (filename.endsWith('.csv') || mimeType.includes('csv')) {
        features.attachment_has_csv = 1;
        types.add('csv');
      }
      if (/\.(jpg|jpeg|png|gif|bmp|webp)$/.test(filename) || mimeType.includes('image')) {
        features.attachment_has_image = 1;
        types.add('image');
      }
      if (/\.(xls|xlsx|ods)$/.test(filename) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        features.attachment_has_spreadsheet = 1;
        types.add('spreadsheet');
      }
      if (/\.(doc|docx|odt)$/.test(filename) || mimeType.includes('document') || mimeType.includes('word')) {
        features.attachment_has_document = 1;
        types.add('document');
      }
    }

    features.attachment_types = [...types];
    return features;
  }

  /**
   * Compute TF-IDF scores for tokens
   */
  _computeTfIdf(tokens) {
    if (!tokens || tokens.length === 0) return [];

    const tf = {};
    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    const totalTokens = tokens.length;
    const scores = [];

    for (const [term, count] of Object.entries(tf)) {
      const tfScore = count / totalTokens;
      const docFreq = this.termDocFrequency[term] || 1;
      const idfScore = this.documentCount > 0
        ? Math.log((this.documentCount + 1) / (docFreq + 1)) + 1
        : 1;
      scores.push({ term, score: tfScore * idfScore });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  /**
   * Update IDF corpus with new document
   */
  updateCorpus(text) {
    if (!text) return;
    const tokens = new Set(this._tokenize(text.toLowerCase()));
    this.documentCount++;
    for (const token of tokens) {
      this.termDocFrequency[token] = (this.termDocFrequency[token] || 0) + 1;
      this.vocabulary.add(token);
    }
    this.vocabularySize = this.vocabulary.size;
  }

  /**
   * Tokenize text into word tokens
   */
  _tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9@₹\s.'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && w.length < 40);
  }

  /**
   * Get uppercase ratio for subject-line analysis
   */
  _getUppercaseRatio(text) {
    if (!text || text.length === 0) return 0;
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    const upper = letters.replace(/[^A-Z]/g, '');
    return upper.length / letters.length;
  }

  /**
   * Normalize numeric features to [0, 1] range
   */
  normalizeFeatures(features) {
    const normalized = { ...features };

    // Log-normalize large numeric values
    const logNormKeys = ['content_word_count', 'content_char_count', 'structural_body_length',
      'structural_line_count', 'structural_paragraph_count', 'structural_link_count',
      'attachment_total_size', 'amount_max', 'amount_sum', 'amount_avg'];

    for (const key of logNormKeys) {
      if (typeof normalized[key] === 'number' && normalized[key] > 0) {
        normalized[`${key}_log`] = Math.log1p(normalized[key]);
      }
    }

    // Clip keyword scores to [0, 1] using sigmoid
    for (const category of CLASSIFICATION_CATEGORIES) {
      const key = `keyword_score_${category}`;
      if (typeof normalized[key] === 'number') {
        normalized[`${key}_normalized`] = 1 / (1 + Math.exp(-normalized[key] + 3));
      }
    }

    return normalized;
  }

  /**
   * Return an empty feature vector with default values
   */
  _emptyFeatureVector() {
    const features = {};
    const prefixes = ['sender_', 'content_', 'amount_', 'temporal_', 'structural_',
      'header_', 'attachment_', 'keyword_score_'];
    // Return minimal feature set
    for (const category of CLASSIFICATION_CATEGORIES) {
      features[`keyword_score_${category}`] = 0;
      features[`keyword_score_${category}_normalized`] = 0;
    }
    features.sender_is_bank = 0;
    features.sender_is_known_financial = 0;
    features.amount_count = 0;
    features.amount_max = 0;
    features.content_urgency_score = 0;
    features.header_authentication_score = 0;
    return features;
  }

  /**
   * Get feature vector as flat numeric array for ML models
   */
  toVector(features) {
    const numericKeys = Object.keys(features).filter(k =>
      typeof features[k] === 'number' && !k.startsWith('_')
    );
    numericKeys.sort();
    return {
      keys: numericKeys,
      values: numericKeys.map(k => features[k])
    };
  }

  /**
   * Serialize the extractor state
   */
  serialize() {
    return {
      idfScores: this.idfScores,
      documentCount: this.documentCount,
      termDocFrequency: this.termDocFrequency,
      vocabularySize: this.vocabularySize
    };
  }

  /**
   * Deserialize from saved state
   */
  deserialize(state) {
    if (!state) return;
    this.idfScores = state.idfScores || {};
    this.documentCount = state.documentCount || 0;
    this.termDocFrequency = state.termDocFrequency || {};
    this.vocabularySize = state.vocabularySize || 0;
    this.vocabulary = new Set(Object.keys(this.termDocFrequency));
  }
}


// ─── NaiveBayesClassifier ────────────────────────────────────────────────────

/**
 * Multinomial Naive Bayes classifier with Laplace smoothing.
 * Supports incremental learning and model serialization.
 */
class NaiveBayesClassifier {
  /**
   * @param {Object} options
   * @param {number} options.alpha - Laplace smoothing parameter (default: 1.0)
   * @param {string[]} options.categories - List of classification categories
   */
  constructor(options = {}) {
    this.alpha = options.alpha || 1.0;
    this.categories = options.categories || CLASSIFICATION_CATEGORIES;
    this.vocabulary = new Set();
    this.vocabularySize = 0;
    this.classCounts = {};
    this.classWordCounts = {};
    this.classWordTotals = {};
    this.classPriors = {};
    this.totalDocuments = 0;
    this.trained = false;
    this.trainingHistory = [];
    this.featureImportance = {};
    this._featureExtractor = new EmailFeatureExtractor();

    // Initialize class structures
    for (const category of this.categories) {
      this.classCounts[category] = 0;
      this.classWordCounts[category] = {};
      this.classWordTotals[category] = 0;
      this.classPriors[category] = 1 / this.categories.length;
    }

    logger.info('[NaiveBayesClassifier] Initialized with categories:', this.categories.length);
  }

  /**
   * Train the classifier on labeled email data
   * @param {Array<{email: Object, label: string}>} labeledEmails
   */
  train(labeledEmails) {
    if (!Array.isArray(labeledEmails) || labeledEmails.length === 0) {
      logger.warn('[NaiveBayesClassifier] No training data provided');
      return { success: false, error: 'No training data' };
    }

    const startTime = Date.now();
    let processedCount = 0;
    let skippedCount = 0;

    for (const item of labeledEmails) {
      const { email, label } = item;
      if (!email || !label || !this.categories.includes(label)) {
        skippedCount++;
        continue;
      }

      try {
        const features = this._emailToFeatureWords(email);
        this._trainOnDocument(features, label);
        processedCount++;
      } catch (error) {
        logger.warn('[NaiveBayesClassifier] Error training on email:', error.message);
        skippedCount++;
      }
    }

    // Compute priors
    this._computePriors();
    this._computeFeatureImportance();

    this.trained = true;
    const elapsed = Date.now() - startTime;

    const result = {
      success: true,
      processedCount,
      skippedCount,
      totalDocuments: this.totalDocuments,
      vocabularySize: this.vocabularySize,
      elapsedMs: elapsed
    };

    this.trainingHistory.push({
      timestamp: new Date().toISOString(),
      ...result
    });

    logger.info(`[NaiveBayesClassifier] Training complete: ${processedCount} docs, ${this.vocabularySize} vocab, ${elapsed}ms`);
    return result;
  }

  /**
   * Incrementally train on new data without resetting
   * @param {Array<{email: Object, label: string}>} newData
   */
  incrementalTrain(newData) {
    if (!Array.isArray(newData) || newData.length === 0) return;

    let count = 0;
    for (const item of newData) {
      const { email, label } = item;
      if (!email || !label || !this.categories.includes(label)) continue;

      try {
        const features = this._emailToFeatureWords(email);
        this._trainOnDocument(features, label);
        count++;
      } catch (error) {
        logger.warn('[NaiveBayesClassifier] Incremental train error:', error.message);
      }
    }

    if (count > 0) {
      this._computePriors();
      this._computeFeatureImportance();
      this.trained = true;
      logger.info(`[NaiveBayesClassifier] Incremental training: ${count} new documents`);
    }
  }

  /**
   * Internal: train on a single document's feature words
   */
  _trainOnDocument(featureWords, label) {
    this.classCounts[label] = (this.classCounts[label] || 0) + 1;
    this.totalDocuments++;

    for (const word of featureWords) {
      this.vocabulary.add(word);
      this.classWordCounts[label][word] = (this.classWordCounts[label][word] || 0) + 1;
      this.classWordTotals[label] = (this.classWordTotals[label] || 0) + 1;
    }

    this.vocabularySize = this.vocabulary.size;
  }

  /**
   * Compute class prior probabilities
   */
  _computePriors() {
    for (const category of this.categories) {
      this.classPriors[category] = this.totalDocuments > 0
        ? (this.classCounts[category] + this.alpha) / (this.totalDocuments + this.alpha * this.categories.length)
        : 1 / this.categories.length;
    }
  }

  /**
   * Compute feature importance per class (information gain approximation)
   */
  _computeFeatureImportance() {
    this.featureImportance = {};

    for (const word of this.vocabulary) {
      let maxDiff = 0;
      let bestClass = null;

      for (const category of this.categories) {
        const wordCountInClass = this.classWordCounts[category][word] || 0;
        const totalWordsInClass = this.classWordTotals[category] || 0;
        const probInClass = totalWordsInClass > 0
          ? (wordCountInClass + this.alpha) / (totalWordsInClass + this.alpha * this.vocabularySize)
          : this.alpha / (this.alpha * this.vocabularySize);

        const overallCount = Array.from(this.categories).reduce((sum, c) =>
          sum + (this.classWordCounts[c][word] || 0), 0
        );
        const overallTotal = Array.from(this.categories).reduce((sum, c) =>
          sum + (this.classWordTotals[c] || 0), 0
        );
        const probOverall = overallTotal > 0
          ? (overallCount + this.alpha) / (overallTotal + this.alpha * this.vocabularySize)
          : this.alpha / (this.alpha * this.vocabularySize);

        const diff = Math.abs(probInClass - probOverall);
        if (diff > maxDiff) {
          maxDiff = diff;
          bestClass = category;
        }
      }

      if (maxDiff > 0.001) {
        this.featureImportance[word] = { importance: maxDiff, bestClass };
      }
    }
  }

  /**
   * Convert email to feature word list for NB
   */
  _emailToFeatureWords(email) {
    const features = this._featureExtractor.extractFeatures(email);
    const words = [];

    // Add category keyword features as pseudo-words
    for (const category of CLASSIFICATION_CATEGORIES) {
      const score = features[`keyword_score_${category}`] || 0;
      for (let i = 0; i < Math.min(score, 10); i++) {
        words.push(`__kw_${category}__`);
      }
    }

    // Add sender features
    if (features.sender_is_bank) words.push('__sender_bank__', '__sender_bank__');
    if (features.sender_is_upi_app) words.push('__sender_upi__', '__sender_upi__');
    if (features.sender_is_payment_gateway) words.push('__sender_gateway__');
    if (features.sender_is_noreply) words.push('__sender_noreply__');
    if (features.sender_is_government) words.push('__sender_govt__');
    if (features.sender_bank_name) words.push(`__bank_${features.sender_bank_name}__`);
    if (features.sender_upi_app_name) words.push(`__upi_${features.sender_upi_app_name}__`);

    // Add amount features
    if (features.amount_count > 0) {
      words.push('__has_amount__');
      const maxAmt = features.amount_max || 0;
      if (maxAmt < 100) words.push('__amount_tiny__');
      else if (maxAmt < 1000) words.push('__amount_small__');
      else if (maxAmt < 10000) words.push('__amount_medium__');
      else if (maxAmt < 100000) words.push('__amount_large__');
      else if (maxAmt < 1000000) words.push('__amount_very_large__');
      else words.push('__amount_huge__');
    }

    // Add temporal features
    if (features.temporal_is_salary_day) words.push('__salary_day__');
    if (features.temporal_is_month_end) words.push('__month_end__');
    if (features.temporal_is_month_start) words.push('__month_start__');
    if (features.temporal_is_quarter_end) words.push('__quarter_end__');
    if (features.temporal_is_financial_year_end) words.push('__fy_end__');
    if (features.temporal_is_weekend) words.push('__weekend__');
    if (features.temporal_time_of_day) words.push(`__tod_${features.temporal_time_of_day}__`);

    // Add urgency features
    const urgency = features.content_urgency_score || 0;
    if (urgency > 0.5) words.push('__high_urgency__', '__high_urgency__');
    else if (urgency > 0.2) words.push('__medium_urgency__');

    // Add structural features
    if (features.content_has_account_number) words.push('__has_account_number__');
    if (features.content_has_card_number) words.push('__has_card_number__');
    if (features.content_has_upi_ref) words.push('__has_upi_ref__');
    if (features.attachment_has_pdf) words.push('__has_pdf__');
    if (features.attachment_has_csv) words.push('__has_csv__');

    // Add header authentication
    if (features.header_authentication_score > 0.7) words.push('__auth_strong__');
    else if (features.header_authentication_score > 0.3) words.push('__auth_moderate__');
    else words.push('__auth_weak__');

    // Add actual text tokens
    const from = email.from || email.sender || '';
    const subject = email.subject || '';
    const body = email.body || email.snippet || email.text || '';
    const textTokens = this._featureExtractor._tokenize(`${subject} ${body}`.toLowerCase());
    words.push(...textTokens.slice(0, 100)); // Cap at 100 text tokens

    return words;
  }

  /**
   * Predict category for an email
   * @param {Object} email
   * @returns {Object} { category, confidence, scores, featureWords }
   */
  predict(email) {
    if (!this.trained) {
      return this._heuristicPredict(email);
    }

    try {
      const featureWords = this._emailToFeatureWords(email);
      const logScores = {};

      for (const category of this.categories) {
        // Start with log prior
        logScores[category] = Math.log(this.classPriors[category] || (1 / this.categories.length));

        // Add log likelihoods for each feature word
        for (const word of featureWords) {
          const wordCount = this.classWordCounts[category][word] || 0;
          const totalWords = this.classWordTotals[category] || 0;
          const logLikelihood = Math.log(
            (wordCount + this.alpha) / (totalWords + this.alpha * this.vocabularySize)
          );
          logScores[category] += logLikelihood;
        }
      }

      // Convert log scores to probabilities using log-sum-exp trick
      const maxLogScore = Math.max(...Object.values(logScores));
      const expScores = {};
      let sumExp = 0;

      for (const category of this.categories) {
        expScores[category] = Math.exp(logScores[category] - maxLogScore);
        sumExp += expScores[category];
      }

      const probabilities = {};
      for (const category of this.categories) {
        probabilities[category] = sumExp > 0 ? expScores[category] / sumExp : 1 / this.categories.length;
      }

      // Find best category
      let bestCategory = this.categories[0];
      let bestScore = -Infinity;
      for (const category of this.categories) {
        if (probabilities[category] > bestScore) {
          bestScore = probabilities[category];
          bestCategory = category;
        }
      }

      // Get top-3 candidates
      const sortedCategories = Object.entries(probabilities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return {
        category: bestCategory,
        confidence: bestScore,
        scores: probabilities,
        topCandidates: sortedCategories.map(([cat, score]) => ({ category: cat, score })),
        featureWords: featureWords.slice(0, 20),
        method: 'naive_bayes'
      };
    } catch (error) {
      logger.error('[NaiveBayesClassifier] Prediction error:', error.message);
      return this._heuristicPredict(email);
    }
  }

  /**
   * Predict categories for a batch of emails
   * @param {Object[]} emails
   * @returns {Object[]}
   */
  predictBatch(emails) {
    if (!Array.isArray(emails)) return [];
    return emails.map(email => this.predict(email));
  }

  /**
   * Get confidence score for a specific email and category
   * @param {Object} email
   * @param {string} category - Optional specific category
   * @returns {number} Confidence 0-1
   */
  getConfidence(email, category = null) {
    const prediction = this.predict(email);
    if (category) {
      return prediction.scores[category] || 0;
    }
    return prediction.confidence;
  }

  /**
   * Heuristic-based prediction when model is not trained
   */
  _heuristicPredict(email) {
    const features = this._featureExtractor.extractFeatures(email);
    const scores = {};

    for (const category of this.categories) {
      const keywordScore = features[`keyword_score_${category}`] || 0;
      const normalizedScore = features[`keyword_score_${category}_normalized`] || 0;
      scores[category] = normalizedScore * 0.7 + (keywordScore > 0 ? 0.3 : 0);
    }

    // Boost based on sender
    if (features.sender_is_bank) {
      scores['transaction_alert'] += 0.2;
      scores['bank_statement'] += 0.15;
      scores['credit_card_statement'] += 0.1;
    }
    if (features.sender_is_upi_app) {
      scores['upi_payment'] += 0.3;
    }
    if (features.sender_is_government) {
      scores['tax_document'] += 0.25;
    }

    // Boost based on amounts
    if (features.amount_count > 0) {
      scores['transaction_alert'] += 0.1;
      if (features.amount_max > 100000) {
        scores['loan_emi'] += 0.1;
        scores['salary_credit'] += 0.1;
      }
    }

    // Boost based on attachments
    if (features.attachment_has_pdf) {
      scores['bank_statement'] += 0.15;
      scores['credit_card_statement'] += 0.1;
      scores['tax_document'] += 0.1;
    }

    // Urgency detection
    if (features.content_urgency_score > 0.5) {
      scores['fraud_alert'] += 0.15;
    }

    // Time-based boosts
    if (features.temporal_is_salary_day && features.amount_count > 0) {
      scores['salary_credit'] += 0.1;
    }
    if (features.temporal_is_month_end) {
      scores['credit_card_statement'] += 0.05;
      scores['bank_statement'] += 0.05;
    }

    // Find best category
    let bestCategory = 'other';
    let bestScore = 0;
    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // If no strong signals, default to other
    if (bestScore < 0.1) {
      bestCategory = 'other';
      bestScore = 0.5;
    }

    // Normalize scores
    const totalScore = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
    const normalizedScores = {};
    for (const [cat, score] of Object.entries(scores)) {
      normalizedScores[cat] = score / totalScore;
    }

    return {
      category: bestCategory,
      confidence: bestScore,
      scores: normalizedScores,
      topCandidates: Object.entries(normalizedScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, score]) => ({ category: cat, score })),
      featureWords: [],
      method: 'heuristic'
    };
  }

  /**
   * Get training statistics
   */
  getStats() {
    return {
      trained: this.trained,
      totalDocuments: this.totalDocuments,
      vocabularySize: this.vocabularySize,
      alpha: this.alpha,
      categoryDistribution: { ...this.classCounts },
      trainingHistory: this.trainingHistory,
      topFeatures: Object.entries(this.featureImportance)
        .sort((a, b) => b[1].importance - a[1].importance)
        .slice(0, 20)
        .map(([term, info]) => ({ term, ...info }))
    };
  }

  /**
   * Serialize model for persistence
   */
  serialize() {
    return {
      alpha: this.alpha,
      categories: this.categories,
      vocabulary: [...this.vocabulary],
      vocabularySize: this.vocabularySize,
      classCounts: this.classCounts,
      classWordCounts: this.classWordCounts,
      classWordTotals: this.classWordTotals,
      classPriors: this.classPriors,
      totalDocuments: this.totalDocuments,
      trained: this.trained,
      trainingHistory: this.trainingHistory,
      featureImportance: this.featureImportance
    };
  }

  /**
   * Deserialize model from saved state
   */
  deserialize(state) {
    if (!state) return false;
    try {
      this.alpha = state.alpha || 1.0;
      this.categories = state.categories || CLASSIFICATION_CATEGORIES;
      this.vocabulary = new Set(state.vocabulary || []);
      this.vocabularySize = state.vocabularySize || this.vocabulary.size;
      this.classCounts = state.classCounts || {};
      this.classWordCounts = state.classWordCounts || {};
      this.classWordTotals = state.classWordTotals || {};
      this.classPriors = state.classPriors || {};
      this.totalDocuments = state.totalDocuments || 0;
      this.trained = state.trained || false;
      this.trainingHistory = state.trainingHistory || [];
      this.featureImportance = state.featureImportance || {};

      // Ensure all categories are initialized
      for (const category of this.categories) {
        if (!this.classCounts[category]) this.classCounts[category] = 0;
        if (!this.classWordCounts[category]) this.classWordCounts[category] = {};
        if (!this.classWordTotals[category]) this.classWordTotals[category] = 0;
        if (!this.classPriors[category]) this.classPriors[category] = 1 / this.categories.length;
      }

      logger.info(`[NaiveBayesClassifier] Model deserialized: ${this.totalDocuments} docs, ${this.vocabularySize} vocab`);
      return true;
    } catch (error) {
      logger.error('[NaiveBayesClassifier] Deserialization error:', error.message);
      return false;
    }
  }

  /**
   * Reset the classifier
   */
  reset() {
    this.vocabulary = new Set();
    this.vocabularySize = 0;
    this.totalDocuments = 0;
    this.trained = false;
    for (const category of this.categories) {
      this.classCounts[category] = 0;
      this.classWordCounts[category] = {};
      this.classWordTotals[category] = 0;
      this.classPriors[category] = 1 / this.categories.length;
    }
    this.trainingHistory = [];
    this.featureImportance = {};
    logger.info('[NaiveBayesClassifier] Model reset');
  }
}


// ─── EmailPriorityScorer ─────────────────────────────────────────────────────

/**
 * Scores emails 0-100 for financial importance.
 * Priority levels: critical, high, medium, low.
 */
class EmailPriorityScorer {
  constructor() {
    this._featureExtractor = new EmailFeatureExtractor();
    this._categoryWeights = {
      fraud_alert: 95,
      salary_credit: 80,
      loan_emi: 75,
      credit_card_statement: 72,
      bank_statement: 70,
      tax_document: 68,
      investment_update: 65,
      insurance_notification: 60,
      transaction_alert: 55,
      upi_payment: 50,
      refund_credit: 48,
      bill_payment: 45,
      subscription_charge: 35,
      promotional: 15,
      other: 20
    };

    this._amountThresholds = {
      critical: 500000,  // 5 Lakh+
      high: 50000,       // 50K+
      medium: 5000,      // 5K+
      low: 0
    };

    this._senderReputationBoosts = {
      bank: 15,
      government: 20,
      payment_gateway: 10,
      upi_app: 8,
      known_financial: 12,
      unknown: -5
    };

    logger.info('[EmailPriorityScorer] Initialized');
  }

  /**
   * Score an email for financial priority
   * @param {Object} email - Email object
   * @param {Object} classification - Classification result from NaiveBayesClassifier
   * @returns {Object} { score, level, factors, breakdown }
   */
  score(email, classification = null) {
    try {
      const features = this._featureExtractor.extractFeatures(email);
      const category = classification ? classification.category : 'other';
      const confidence = classification ? classification.confidence : 0;

      let score = 0;
      const factors = [];
      const breakdown = {};

      // 1. Category base score (0-30 points)
      const categoryBaseScore = (this._categoryWeights[category] || 20) * 0.3;
      score += categoryBaseScore;
      breakdown.category = categoryBaseScore;
      factors.push({ factor: 'category', value: category, points: categoryBaseScore });

      // 2. Amount impact (0-25 points)
      const amountScore = this._scoreAmount(features);
      score += amountScore.points;
      breakdown.amount = amountScore.points;
      if (amountScore.points > 0) {
        factors.push({ factor: 'amount', value: amountScore.maxAmount, points: amountScore.points });
      }

      // 3. Sender reputation (0-15 points)
      const senderScore = this._scoreSender(features);
      score += senderScore.points;
      breakdown.sender = senderScore.points;
      factors.push({ factor: 'sender', value: senderScore.type, points: senderScore.points });

      // 4. Urgency (0-15 points)
      const urgencyScore = this._scoreUrgency(features, category);
      score += urgencyScore.points;
      breakdown.urgency = urgencyScore.points;
      if (urgencyScore.points > 0) {
        factors.push({ factor: 'urgency', value: urgencyScore.level, points: urgencyScore.points });
      }

      // 5. Temporal relevance (0-10 points)
      const temporalScore = this._scoreTemporal(features, category);
      score += temporalScore.points;
      breakdown.temporal = temporalScore.points;
      if (temporalScore.points > 0) {
        factors.push({ factor: 'temporal', value: temporalScore.reason, points: temporalScore.points });
      }

      // 6. Confidence adjustment (-5 to +5 points)
      const confidenceAdj = (confidence - 0.5) * 10;
      score += confidenceAdj;
      breakdown.confidence = confidenceAdj;

      // Clamp to [0, 100]
      score = Math.max(0, Math.min(100, Math.round(score)));

      // Determine priority level
      const level = this._getPriorityLevel(score, category);

      return {
        score,
        level,
        factors,
        breakdown,
        category,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[EmailPriorityScorer] Error scoring email:', error.message);
      return { score: 20, level: 'low', factors: [], breakdown: {}, category: 'other' };
    }
  }

  /**
   * Score based on monetary amounts
   */
  _scoreAmount(features) {
    const maxAmount = features.amount_max || 0;
    let points = 0;

    if (maxAmount >= this._amountThresholds.critical) {
      points = 25;
    } else if (maxAmount >= this._amountThresholds.high) {
      points = 20;
    } else if (maxAmount >= this._amountThresholds.medium) {
      points = 12;
    } else if (maxAmount > 0) {
      points = 5;
    }

    // Bonus for multiple amounts (likely a statement)
    if ((features.amount_count || 0) > 3) {
      points += 3;
    }

    return { points: Math.min(25, points), maxAmount };
  }

  /**
   * Score based on sender reputation
   */
  _scoreSender(features) {
    let points = 0;
    let type = 'unknown';

    if (features.sender_is_bank) {
      points = this._senderReputationBoosts.bank;
      type = 'bank';
    } else if (features.sender_is_government) {
      points = this._senderReputationBoosts.government;
      type = 'government';
    } else if (features.sender_is_payment_gateway) {
      points = this._senderReputationBoosts.payment_gateway;
      type = 'payment_gateway';
    } else if (features.sender_is_upi_app) {
      points = this._senderReputationBoosts.upi_app;
      type = 'upi_app';
    } else if (features.sender_is_known_financial) {
      points = this._senderReputationBoosts.known_financial;
      type = 'known_financial';
    } else {
      points = this._senderReputationBoosts.unknown;
      type = 'unknown';
    }

    return { points: Math.max(0, Math.min(15, points)), type };
  }

  /**
   * Score based on urgency indicators
   */
  _scoreUrgency(features, category) {
    let points = 0;
    let level = 'low';

    const urgencyScore = features.content_urgency_score || 0;

    if (category === 'fraud_alert') {
      points = 15;
      level = 'critical';
    } else if (urgencyScore > 0.5) {
      points = 12;
      level = 'high';
    } else if (urgencyScore > 0.2) {
      points = 6;
      level = 'medium';
    } else if (urgencyScore > 0) {
      points = 2;
      level = 'low';
    }

    return { points: Math.min(15, points), level };
  }

  /**
   * Score based on temporal relevance
   */
  _scoreTemporal(features, category) {
    let points = 0;
    let reason = '';

    if (features.temporal_is_salary_day && category === 'salary_credit') {
      points += 8;
      reason = 'salary_day_match';
    }
    if (features.temporal_is_month_end && ['credit_card_statement', 'bank_statement'].includes(category)) {
      points += 5;
      reason = reason || 'month_end_statement';
    }
    if (features.temporal_is_financial_year_end && category === 'tax_document') {
      points += 10;
      reason = 'fy_end_tax';
    }
    if (features.temporal_is_quarter_end && category === 'investment_update') {
      points += 5;
      reason = reason || 'quarter_end_investment';
    }

    return { points: Math.min(10, points), reason };
  }

  /**
   * Determine priority level from score and category
   */
  _getPriorityLevel(score, category) {
    // Override for critical categories
    if (category === 'fraud_alert') return 'critical';

    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  /**
   * Batch score multiple emails
   * @param {Array<{email: Object, classification: Object}>} items
   * @returns {Object[]}
   */
  scoreBatch(items) {
    return items.map(item => this.score(item.email, item.classification));
  }

  /**
   * Get the priority level thresholds
   */
  getThresholds() {
    return {
      critical: { minScore: 80, description: 'Fraud, large transactions, urgent alerts' },
      high: { minScore: 60, description: 'Statements, salary, loans, investments' },
      medium: { minScore: 35, description: 'Regular transactions, bill payments' },
      low: { minScore: 0, description: 'Promotions, subscriptions, informational' }
    };
  }

  /**
   * Serialize scorer configuration
   */
  serialize() {
    return {
      categoryWeights: { ...this._categoryWeights },
      amountThresholds: { ...this._amountThresholds },
      senderReputationBoosts: { ...this._senderReputationBoosts }
    };
  }

  /**
   * Deserialize scorer configuration
   */
  deserialize(state) {
    if (!state) return;
    if (state.categoryWeights) this._categoryWeights = { ...this._categoryWeights, ...state.categoryWeights };
    if (state.amountThresholds) this._amountThresholds = { ...this._amountThresholds, ...state.amountThresholds };
    if (state.senderReputationBoosts) this._senderReputationBoosts = { ...this._senderReputationBoosts, ...state.senderReputationBoosts };
  }
}


// ─── EmailThreadAnalyzer ─────────────────────────────────────────────────────

/**
 * Analyzes email threads and conversation chains.
 * Groups related emails, detects recurring patterns, identifies follow-ups.
 */
class EmailThreadAnalyzer {
  constructor() {
    this._threads = new Map();
    this._recurringPatterns = new Map();
    this._senderHistory = new Map();
    this._threadIdCounter = 0;
    logger.info('[EmailThreadAnalyzer] Initialized');
  }

  /**
   * Group emails into threads based on subject, references and sender
   * @param {Object[]} emails - Array of email objects
   * @returns {Object[]} Array of thread objects
   */
  groupByThread(emails) {
    if (!Array.isArray(emails) || emails.length === 0) return [];

    this._threads.clear();
    const threadMap = new Map();
    const processed = [];

    // Sort by date
    const sorted = [...emails].sort((a, b) => {
      const dateA = new Date(a.date || a.receivedAt || 0);
      const dateB = new Date(b.date || b.receivedAt || 0);
      return dateA - dateB;
    });

    for (const email of sorted) {
      const threadKey = this._getThreadKey(email);
      const gmailThreadId = email.threadId || null;

      // Try Gmail thread ID first
      if (gmailThreadId && threadMap.has(`gmail_${gmailThreadId}`)) {
        threadMap.get(`gmail_${gmailThreadId}`).emails.push(email);
        continue;
      }

      // Try subject-based threading
      let foundThread = false;
      for (const [key, thread] of threadMap) {
        if (this._emailBelongsToThread(email, thread)) {
          thread.emails.push(email);
          foundThread = true;
          break;
        }
      }

      if (!foundThread) {
        const threadId = gmailThreadId || `thread_${++this._threadIdCounter}`;
        const thread = {
          id: threadId,
          subject: this._normalizeSubject(email.subject || ''),
          emails: [email],
          participants: new Set(),
          startDate: email.date || email.receivedAt,
          category: null
        };
        const mapKey = gmailThreadId ? `gmail_${gmailThreadId}` : `subj_${threadKey}`;
        threadMap.set(mapKey, thread);
      }

      // Track by Gmail thread ID as well
      if (gmailThreadId && !threadMap.has(`gmail_${gmailThreadId}`)) {
        const lastEntry = [...threadMap.values()].pop();
        threadMap.set(`gmail_${gmailThreadId}`, lastEntry);
      }
    }

    // Build thread objects
    const threads = [];
    const seen = new Set();
    for (const thread of threadMap.values()) {
      if (seen.has(thread.id)) continue;
      seen.add(thread.id);

      // Collect participants
      for (const email of thread.emails) {
        const from = email.from || email.sender || '';
        const match = from.match(/<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)>?/);
        if (match) thread.participants.add(match[1].toLowerCase());

        const to = email.to || '';
        const toMatch = to.match(/<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)>?/g);
        if (toMatch) {
          for (const t of toMatch) {
            const m = t.match(/<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)>?/);
            if (m) thread.participants.add(m[1].toLowerCase());
          }
        }
      }

      threads.push({
        id: thread.id,
        subject: thread.subject,
        emailCount: thread.emails.length,
        participants: [...thread.participants],
        startDate: thread.startDate,
        endDate: thread.emails[thread.emails.length - 1].date ||
          thread.emails[thread.emails.length - 1].receivedAt,
        emails: thread.emails,
        isMultiEmail: thread.emails.length > 1,
        conversationType: this._detectConversationType(thread.emails)
      });
    }

    this._threads = threadMap;
    return threads.sort((a, b) => b.emailCount - a.emailCount);
  }

  /**
   * Check if an email belongs to an existing thread
   */
  _emailBelongsToThread(email, thread) {
    const subjectNorm = this._normalizeSubject(email.subject || '');
    if (subjectNorm === thread.subject && subjectNorm.length > 3) return true;

    // Check references header
    const references = email.references || '';
    const inReplyTo = email.inReplyTo || '';
    for (const existing of thread.emails) {
      const existingId = existing.messageId || existing.id || '';
      if (existingId && (references.includes(existingId) || inReplyTo.includes(existingId))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize subject line for comparison
   */
  _normalizeSubject(subject) {
    return subject
      .replace(/^(re|fwd|fw):\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Get a thread key for an email
   */
  _getThreadKey(email) {
    const subject = this._normalizeSubject(email.subject || '');
    return subject.slice(0, 60);
  }

  /**
   * Detect conversation chains: dispute → resolution, complaint → response, etc.
   * @param {Object[]} emails - Thread emails sorted by date
   * @returns {Object} Conversation analysis
   */
  detectConversationChains(emails) {
    if (!Array.isArray(emails) || emails.length < 2) {
      return { type: 'single', stages: [], resolved: false };
    }

    const stages = [];
    const disputeKeywords = ['dispute', 'complaint', 'issue', 'problem', 'error', 'wrong', 'incorrect', 'unauthorized'];
    const resolutionKeywords = ['resolved', 'resolution', 'fixed', 'corrected', 'credited', 'refunded', 'updated', 'processed'];
    const acknowledgeKeywords = ['received', 'acknowledged', 'noted', 'reference number', 'ticket', 'case id'];
    const escalationKeywords = ['escalate', 'supervisor', 'manager', 'ombudsman', 'rbi', 'consumer forum'];

    let hasDispute = false;
    let hasResolution = false;
    let hasAcknowledge = false;
    let hasEscalation = false;

    for (const email of emails) {
      const text = `${email.subject || ''} ${email.body || email.snippet || ''}`.toLowerCase();

      const stage = {
        date: email.date || email.receivedAt,
        from: email.from || email.sender || '',
        type: 'message'
      };

      if (disputeKeywords.some(kw => text.includes(kw))) {
        stage.type = 'dispute';
        hasDispute = true;
      } else if (acknowledgeKeywords.some(kw => text.includes(kw))) {
        stage.type = 'acknowledgement';
        hasAcknowledge = true;
      } else if (escalationKeywords.some(kw => text.includes(kw))) {
        stage.type = 'escalation';
        hasEscalation = true;
      } else if (resolutionKeywords.some(kw => text.includes(kw))) {
        stage.type = 'resolution';
        hasResolution = true;
      }

      stages.push(stage);
    }

    let type = 'conversation';
    if (hasDispute) {
      type = hasResolution ? 'dispute_resolved' : (hasEscalation ? 'dispute_escalated' : 'dispute_pending');
    } else if (hasResolution) {
      type = 'resolved';
    }

    return {
      type,
      stages,
      resolved: hasResolution,
      escalated: hasEscalation,
      emailCount: emails.length,
      duration: this._calculateDuration(emails)
    };
  }

  /**
   * Calculate duration between first and last email
   */
  _calculateDuration(emails) {
    if (emails.length < 2) return 0;
    const first = new Date(emails[0].date || emails[0].receivedAt || 0);
    const last = new Date(emails[emails.length - 1].date || emails[emails.length - 1].receivedAt || 0);
    return Math.abs(last - first);
  }

  /**
   * Detect conversation type for a thread
   */
  _detectConversationType(emails) {
    if (emails.length === 1) return 'single';
    if (emails.length === 2) return 'reply';

    const chain = this.detectConversationChains(emails);
    return chain.type;
  }

  /**
   * Track recurring email patterns (e.g., monthly statements, weekly reports)
   * @param {Object[]} emails - Historical emails
   * @returns {Object[]} Recurring pattern definitions
   */
  trackRecurringPatterns(emails) {
    if (!Array.isArray(emails) || emails.length < 3) return [];

    // Group by sender + normalized subject
    const groups = new Map();
    for (const email of emails) {
      const from = (email.from || email.sender || '').toLowerCase();
      const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
      const domain = domainMatch ? domainMatch[1] : 'unknown';
      const subject = this._normalizeSubject(email.subject || '');
      const key = `${domain}::${subject.slice(0, 30)}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(email);
    }

    const patterns = [];

    for (const [key, groupEmails] of groups) {
      if (groupEmails.length < 3) continue;

      // Sort by date
      const sorted = groupEmails.sort((a, b) =>
        new Date(a.date || a.receivedAt || 0) - new Date(b.date || b.receivedAt || 0)
      );

      // Calculate intervals
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date || sorted[i - 1].receivedAt || 0);
        const curr = new Date(sorted[i].date || sorted[i].receivedAt || 0);
        const daysDiff = Math.abs(curr - prev) / (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
      }

      if (intervals.length === 0) continue;

      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const stdDevInterval = Math.sqrt(
        intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) / intervals.length
      );

      // Determine frequency
      let frequency = 'irregular';
      const cv = stdDevInterval / (avgInterval || 1); // coefficient of variation

      if (cv < 0.3) {
        if (avgInterval <= 1.5) frequency = 'daily';
        else if (avgInterval <= 8) frequency = 'weekly';
        else if (avgInterval <= 16) frequency = 'biweekly';
        else if (avgInterval <= 35) frequency = 'monthly';
        else if (avgInterval <= 100) frequency = 'quarterly';
        else if (avgInterval <= 200) frequency = 'semi-annual';
        else if (avgInterval <= 400) frequency = 'annual';
      }

      if (frequency !== 'irregular') {
        const [domain, subjectPrefix] = key.split('::');
        patterns.push({
          id: `pattern_${patterns.length + 1}`,
          sender_domain: domain,
          subject_pattern: subjectPrefix,
          frequency,
          avgIntervalDays: Math.round(avgInterval),
          occurrences: sorted.length,
          lastOccurrence: sorted[sorted.length - 1].date || sorted[sorted.length - 1].receivedAt,
          nextExpected: this._predictNextOccurrence(sorted, avgInterval),
          confidence: Math.max(0, 1 - cv),
          examples: sorted.slice(-3).map(e => ({
            subject: e.subject,
            date: e.date || e.receivedAt
          }))
        });
      }
    }

    this._recurringPatterns = new Map(patterns.map(p => [p.id, p]));
    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Predict next occurrence based on pattern
   */
  _predictNextOccurrence(sortedEmails, avgInterval) {
    const lastDate = new Date(
      sortedEmails[sortedEmails.length - 1].date ||
      sortedEmails[sortedEmails.length - 1].receivedAt ||
      Date.now()
    );
    const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
    return nextDate.toISOString();
  }

  /**
   * Identify follow-up emails that need attention
   * @param {Object[]} emails
   * @returns {Object[]} Emails needing follow-up
   */
  identifyFollowUps(emails) {
    if (!Array.isArray(emails)) return [];

    const followUpKeywords = [
      'follow up', 'follow-up', 'followup', 'reminder', 'pending',
      'awaiting', 'yet to', 'still pending', 'no response',
      'kindly respond', 'action required', 'please update',
      'status update', 'revert back', 'looking forward'
    ];

    const actionKeywords = [
      'please submit', 'kindly provide', 'update your',
      'complete your', 'verify your', 'upload',
      'sign', 'approve', 'confirm', 'respond by',
      'deadline', 'due date', 'last date'
    ];

    const followUps = [];

    for (const email of emails) {
      const text = `${email.subject || ''} ${email.body || email.snippet || ''}`.toLowerCase();
      const isFollowUp = followUpKeywords.some(kw => text.includes(kw));
      const hasAction = actionKeywords.some(kw => text.includes(kw));

      if (isFollowUp || hasAction) {
        // Extract deadline if mentioned
        const deadlineMatch = text.match(
          /(?:by|before|deadline|due|last date)\s*:?\s*(\d{1,2}[\s/-]\w{3,9}[\s/-]\d{2,4}|\d{1,2}[\s/-]\d{1,2}[\s/-]\d{2,4})/i
        );

        followUps.push({
          email,
          isFollowUp,
          hasAction,
          deadline: deadlineMatch ? deadlineMatch[1] : null,
          urgency: isFollowUp && hasAction ? 'high' : (isFollowUp ? 'medium' : 'low'),
          matchedKeywords: [
            ...followUpKeywords.filter(kw => text.includes(kw)),
            ...actionKeywords.filter(kw => text.includes(kw))
          ]
        });
      }
    }

    return followUps.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
    });
  }

  /**
   * Get thread analysis summary
   */
  getSummary() {
    return {
      totalThreads: this._threads.size,
      recurringPatterns: this._recurringPatterns.size,
      patterns: [...this._recurringPatterns.values()]
    };
  }
}


// ─── SpamFinancialFilter ─────────────────────────────────────────────────────

/**
 * Distinguishes genuine financial emails from phishing/spam.
 * Checks sender authenticity, URL patterns, and content indicators.
 */
class SpamFinancialFilter {
  constructor() {
    this._featureExtractor = new EmailFeatureExtractor();
    this._whitelistedDomains = this._buildWhitelist();
    this._blacklistedPatterns = SUSPICIOUS_URL_PATTERNS;
    this._phishingIndicators = PHISHING_INDICATORS;
    this._legitimacyCache = new Map();
    this._cacheMaxSize = 5000;
    this._reportedPhishing = new Set();
    logger.info('[SpamFinancialFilter] Initialized with whitelist:', this._whitelistedDomains.size, 'domains');
  }

  /**
   * Build comprehensive whitelist of legitimate financial domains
   */
  _buildWhitelist() {
    const whitelist = new Set();

    // Add all bank domains
    for (const domains of Object.values(INDIAN_BANK_DOMAINS)) {
      for (const domain of domains) {
        whitelist.add(domain.toLowerCase());
      }
    }

    // Add UPI app domains
    for (const domains of Object.values(UPI_APP_DOMAINS)) {
      for (const domain of domains) {
        whitelist.add(domain.toLowerCase());
      }
    }

    // Add payment gateways
    for (const domain of PAYMENT_GATEWAY_DOMAINS) {
      whitelist.add(domain.toLowerCase());
    }

    // Add additional legitimate financial domains
    const additionalDomains = [
      'npci.org.in', 'rbi.org.in', 'sebi.gov.in', 'irdai.gov.in',
      'incometax.gov.in', 'incometaxindiaefiling.gov.in', 'gst.gov.in',
      'nsdl.co.in', 'cdsl.com', 'cibil.com', 'transunion.com',
      'experian.com', 'equifax.com', 'crif.com',
      'cams.com', 'kfintech.com', 'mfuonline.com',
      'amfiindia.com', 'bseindia.com', 'nseindia.com',
      'msei.in', 'ncdex.com', 'mcxindia.com',
      'nach.org.in', 'bhimonline.org.in',
      'reliancemf.com', 'dfrgeneral.com', 'sbimf.com',
      'hdfcfund.com', 'icicipruamc.com', 'axismf.com',
      'nipponindiaim.com', 'utimf.com', 'kodakamc.com',
      'dfrbank.com', 'dhanalakshmibank.com',
      'tatamutualfund.com', 'adityabirlacapital.com',
      'franklintempletonindia.com', 'miaboreturn.com',
      'pgim.com', 'edelweissmf.com', 'quantum.co.in',
      'starhealth.in', 'maxlifeinsurance.com', 'icicilombard.com',
      'hdfcergo.com', 'tataaia.com', 'sbilife.co.in',
      'licindia.in', 'newindia.co.in', 'orientalinsurance.org.in',
      'nationalinsurance.nic.co.in', 'uiic.co.in'
    ];

    for (const domain of additionalDomains) {
      whitelist.add(domain.toLowerCase());
    }

    return whitelist;
  }

  /**
   * Check if an email is legitimate or potentially phishing
   * @param {Object} email
   * @returns {Object} { isLegitimate, confidence, reasons, riskLevel, checks }
   */
  checkLegitimacy(email) {
    const emailId = email.id || email.messageId || '';
    if (emailId && this._legitimacyCache.has(emailId)) {
      return this._legitimacyCache.get(emailId);
    }

    try {
      const features = this._featureExtractor.extractFeatures(email);
      const checks = {
        senderDomainCheck: this._checkSenderDomain(email, features),
        headerAuthCheck: this._checkHeaderAuthentication(features),
        urlCheck: this._checkUrls(email),
        contentCheck: this._checkContent(email),
        replyToCheck: this._checkReplyTo(email, features),
        attachmentCheck: this._checkAttachments(email)
      };

      // Calculate overall legitimacy score
      let legitimacyScore = 50; // Start neutral
      const reasons = [];

      // Sender domain check (most important)
      if (checks.senderDomainCheck.isWhitelisted) {
        legitimacyScore += 25;
        reasons.push({ type: 'positive', message: `Sender domain whitelisted: ${checks.senderDomainCheck.domain}` });
      } else if (checks.senderDomainCheck.isSuspicious) {
        legitimacyScore -= 30;
        reasons.push({ type: 'negative', message: `Suspicious sender domain: ${checks.senderDomainCheck.domain}` });
      }

      // Header authentication
      if (checks.headerAuthCheck.score > 0.7) {
        legitimacyScore += 15;
        reasons.push({ type: 'positive', message: 'Strong email authentication (SPF/DKIM/DMARC pass)' });
      } else if (checks.headerAuthCheck.score < 0.3 && checks.headerAuthCheck.hasInfo) {
        legitimacyScore -= 15;
        reasons.push({ type: 'negative', message: 'Weak email authentication' });
      }

      // URL check
      if (checks.urlCheck.suspiciousCount > 0) {
        legitimacyScore -= checks.urlCheck.suspiciousCount * 10;
        reasons.push({
          type: 'negative',
          message: `${checks.urlCheck.suspiciousCount} suspicious URL(s) detected`
        });
      }
      if (checks.urlCheck.shortenedCount > 0) {
        legitimacyScore -= checks.urlCheck.shortenedCount * 5;
        reasons.push({
          type: 'warning',
          message: `${checks.urlCheck.shortenedCount} shortened URL(s) detected`
        });
      }

      // Content check
      if (checks.contentCheck.phishingScore > 0.5) {
        legitimacyScore -= 25;
        reasons.push({
          type: 'negative',
          message: `High phishing indicator score: ${(checks.contentCheck.phishingScore * 100).toFixed(0)}%`
        });
      } else if (checks.contentCheck.phishingScore > 0.2) {
        legitimacyScore -= 10;
        reasons.push({
          type: 'warning',
          message: `Moderate phishing indicators detected`
        });
      }

      // Reply-To mismatch
      if (checks.replyToCheck.mismatch) {
        legitimacyScore -= 20;
        reasons.push({
          type: 'negative',
          message: 'Reply-To domain doesn\'t match sender domain'
        });
      }

      // Suspicious attachments
      if (checks.attachmentCheck.hasSuspicious) {
        legitimacyScore -= 15;
        reasons.push({
          type: 'negative',
          message: `Suspicious attachment(s): ${checks.attachmentCheck.suspiciousTypes.join(', ')}`
        });
      }

      // Reported phishing
      if (emailId && this._reportedPhishing.has(emailId)) {
        legitimacyScore -= 50;
        reasons.push({ type: 'negative', message: 'Previously reported as phishing' });
      }

      // Clamp score
      legitimacyScore = Math.max(0, Math.min(100, legitimacyScore));

      const result = {
        isLegitimate: legitimacyScore >= 50,
        confidence: legitimacyScore / 100,
        legitimacyScore,
        riskLevel: this._getRiskLevel(legitimacyScore),
        reasons,
        checks,
        timestamp: new Date().toISOString()
      };

      // Cache result
      if (emailId) {
        if (this._legitimacyCache.size >= this._cacheMaxSize) {
          const firstKey = this._legitimacyCache.keys().next().value;
          this._legitimacyCache.delete(firstKey);
        }
        this._legitimacyCache.set(emailId, result);
      }

      return result;
    } catch (error) {
      logger.error('[SpamFinancialFilter] Error checking legitimacy:', error.message);
      return {
        isLegitimate: false,
        confidence: 0,
        legitimacyScore: 0,
        riskLevel: 'unknown',
        reasons: [{ type: 'error', message: error.message }],
        checks: {}
      };
    }
  }

  /**
   * Check sender domain against whitelist and suspicious patterns
   */
  _checkSenderDomain(email, features) {
    const from = (email.from || email.sender || '').toLowerCase();
    const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
    const domain = domainMatch ? domainMatch[1] : '';

    const result = {
      domain,
      isWhitelisted: false,
      isSuspicious: false,
      bankName: features.sender_bank_name || null
    };

    if (!domain) {
      result.isSuspicious = true;
      return result;
    }

    // Check whitelist
    if (this._whitelistedDomains.has(domain)) {
      result.isWhitelisted = true;
      return result;
    }

    // Check if domain is a subdomain of a whitelisted domain
    for (const whitelisted of this._whitelistedDomains) {
      if (domain.endsWith(`.${whitelisted}`)) {
        result.isWhitelisted = true;
        return result;
      }
    }

    // Suspicious domain checks
    // Typosquatting detection: look for domains similar to bank names
    const bankNames = Object.keys(INDIAN_BANK_DOMAINS);
    for (const bankName of bankNames) {
      // Check if domain contains bank name but isn't whitelisted (typosquat)
      if (domain.includes(bankName) && !result.isWhitelisted) {
        result.isSuspicious = true;
        result.suspicionReason = `Domain contains bank name "${bankName}" but is not whitelisted`;
        break;
      }
    }

    // Check for free email providers impersonating banks
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'mail.com'];
    if (freeProviders.includes(domain)) {
      // Free email from banks is suspicious
      if (features.sender_is_bank || features.sender_is_known_financial) {
        result.isSuspicious = true;
        result.suspicionReason = 'Free email provider claiming to be financial institution';
      }
    }

    // Newly registered domain indicators (high number of digits, unusual TLDs)
    if (/\d{3,}/.test(domain) || /\.(xyz|top|club|online|site|website|space|fun)$/.test(domain)) {
      result.isSuspicious = true;
      result.suspicionReason = 'Suspicious TLD or high digit count in domain';
    }

    return result;
  }

  /**
   * Check email header authentication (SPF/DKIM/DMARC)
   */
  _checkHeaderAuthentication(features) {
    return {
      score: features.header_authentication_score || 0,
      spfPass: features.header_spf_pass === 1,
      dkimPass: features.header_dkim_pass === 1,
      dmarcPass: features.header_dmarc_pass === 1,
      hasInfo: features.header_has_spf === 1 || features.header_has_dkim === 1
    };
  }

  /**
   * Check for suspicious URLs in the email
   */
  _checkUrls(email) {
    const body = email.body || email.snippet || email.text || '';
    const urls = body.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi) || [];

    let suspiciousCount = 0;
    let shortenedCount = 0;
    const suspiciousUrls = [];

    for (const url of urls) {
      let isSuspicious = false;

      for (const pattern of this._blacklistedPatterns) {
        if (pattern.test(url)) {
          isSuspicious = true;
          break;
        }
      }

      // Check if URL is shortened
      const shortenedDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'short.link', 'rb.gy',
        'is.gd', 'v.gd', 'ow.ly', 'buff.ly', 'adf.ly', 'shorte.st'];
      for (const sd of shortenedDomains) {
        if (url.toLowerCase().includes(sd)) {
          shortenedCount++;
          break;
        }
      }

      // Check for IP-based URLs
      if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
        isSuspicious = true;
      }

      // Check for unusual port numbers
      if (/:\d{4,5}\//.test(url)) {
        isSuspicious = true;
      }

      // Check for data: URLs
      if (/^data:/i.test(url)) {
        isSuspicious = true;
      }

      if (isSuspicious) {
        suspiciousCount++;
        suspiciousUrls.push(url);
      }
    }

    return {
      totalUrls: urls.length,
      suspiciousCount,
      shortenedCount,
      suspiciousUrls: suspiciousUrls.slice(0, 5)
    };
  }

  /**
   * Check email content for phishing indicators
   */
  _checkContent(email) {
    const text = `${email.subject || ''} ${email.body || email.snippet || ''}`.toLowerCase();
    let phishingHits = 0;
    const matchedIndicators = [];

    for (const indicator of this._phishingIndicators) {
      if (text.includes(indicator.toLowerCase())) {
        phishingHits++;
        matchedIndicators.push(indicator);
      }
    }

    const phishingScore = this._phishingIndicators.length > 0
      ? phishingHits / this._phishingIndicators.length
      : 0;

    // Check for common phishing patterns
    const hasPasswordRequest = /(?:send|share|provide|enter)\s+(?:your\s+)?(?:password|pin|otp|cvv|card\s*number)/i.test(text);
    const hasUrgentThreat = /(?:account|card)\s+(?:will be|has been)\s+(?:suspended|blocked|closed|deactivated)/i.test(text);
    const hasGenericGreeting = /^(?:dear\s+(?:customer|user|valued\s+customer|account\s+holder|sir\/madam))/i.test(text.trim());
    const hasMismatchedBranding = false; // Would need image analysis

    let adjustedScore = phishingScore;
    if (hasPasswordRequest) adjustedScore += 0.3;
    if (hasUrgentThreat) adjustedScore += 0.2;
    if (hasGenericGreeting) adjustedScore += 0.1;

    return {
      phishingScore: Math.min(1, adjustedScore),
      phishingHits,
      matchedIndicators: matchedIndicators.slice(0, 5),
      hasPasswordRequest,
      hasUrgentThreat,
      hasGenericGreeting,
      hasMismatchedBranding
    };
  }

  /**
   * Check if Reply-To matches From domain
   */
  _checkReplyTo(email, features) {
    const result = { mismatch: false, fromDomain: '', replyToDomain: '' };

    const headers = email.headers || {};
    const from = email.from || email.sender || '';
    const replyTo = headers['Reply-To'] || headers['reply-to'] || '';

    if (!replyTo) return result;

    const fromDomain = (from.match(/@([a-zA-Z0-9.-]+)/i) || [])[1] || '';
    const replyDomain = (replyTo.match(/@([a-zA-Z0-9.-]+)/i) || [])[1] || '';

    result.fromDomain = fromDomain.toLowerCase();
    result.replyToDomain = replyDomain.toLowerCase();

    if (fromDomain && replyDomain && fromDomain.toLowerCase() !== replyDomain.toLowerCase()) {
      result.mismatch = true;
    }

    return result;
  }

  /**
   * Check attachments for suspicious file types
   */
  _checkAttachments(email) {
    const attachments = email.attachments || [];
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs',
      '.js', '.wsf', '.msi', '.dll', '.reg', '.ps1', '.hta'];
    const result = { hasSuspicious: false, suspiciousTypes: [] };

    for (const att of attachments) {
      const filename = (att.filename || att.name || '').toLowerCase();
      for (const ext of suspiciousExtensions) {
        if (filename.endsWith(ext)) {
          result.hasSuspicious = true;
          result.suspiciousTypes.push(ext);
          break;
        }
      }

      // Double extension check (e.g., document.pdf.exe)
      if (/\.\w+\.\w+$/.test(filename)) {
        const lastExt = (filename.match(/\.(\w+)$/) || [])[1] || '';
        if (suspiciousExtensions.includes(`.${lastExt}`)) {
          result.hasSuspicious = true;
          result.suspiciousTypes.push(`double_ext:${filename}`);
        }
      }
    }

    return result;
  }

  /**
   * Get risk level from legitimacy score
   */
  _getRiskLevel(score) {
    if (score >= 80) return 'safe';
    if (score >= 60) return 'low_risk';
    if (score >= 40) return 'medium_risk';
    if (score >= 20) return 'high_risk';
    return 'critical_risk';
  }

  /**
   * Report an email as phishing
   * @param {string} emailId
   */
  reportPhishing(emailId) {
    if (emailId) {
      this._reportedPhishing.add(emailId);
      this._legitimacyCache.delete(emailId);
      logger.info(`[SpamFinancialFilter] Email reported as phishing: ${emailId}`);
    }
  }

  /**
   * Clear legitimacy cache
   */
  clearCache() {
    this._legitimacyCache.clear();
    logger.info('[SpamFinancialFilter] Cache cleared');
  }

  /**
   * Get filter statistics
   */
  getStats() {
    return {
      whitelistedDomains: this._whitelistedDomains.size,
      cachedResults: this._legitimacyCache.size,
      reportedPhishing: this._reportedPhishing.size,
      blacklistedPatterns: this._blacklistedPatterns.length,
      phishingIndicators: this._phishingIndicators.length
    };
  }

  /**
   * Serialize filter state
   */
  serialize() {
    return {
      reportedPhishing: [...this._reportedPhishing]
    };
  }

  /**
   * Deserialize filter state
   */
  deserialize(state) {
    if (state && Array.isArray(state.reportedPhishing)) {
      this._reportedPhishing = new Set(state.reportedPhishing);
    }
  }
}


// ─── EmailClassificationPipeline ─────────────────────────────────────────────

/**
 * Main orchestrator combining all classification components.
 * Provides unified API for email classification, batch processing,
 * training, and model management.
 */
class EmailClassificationPipeline {
  /**
   * @param {Object} options
   * @param {number} options.batchSize - Batch processing chunk size (default: 50)
   * @param {number} options.cacheSize - Result cache size (default: 10000)
   * @param {number} options.minTrainingSize - Minimum training set size (default: 20)
   * @param {number} options.retrainThreshold - Accuracy drop threshold for auto-retrain (default: 0.1)
   * @param {boolean} options.enableCaching - Enable result caching (default: true)
   * @param {boolean} options.enableAutoRetrain - Enable automatic retraining (default: true)
   */
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.cacheSize = options.cacheSize || 10000;
    this.minTrainingSize = options.minTrainingSize || 20;
    this.retrainThreshold = options.retrainThreshold || 0.1;
    this.enableCaching = options.enableCaching !== false;
    this.enableAutoRetrain = options.enableAutoRetrain !== false;

    // Components
    this.featureExtractor = new EmailFeatureExtractor();
    this.classifier = new NaiveBayesClassifier();
    this.priorityScorer = new EmailPriorityScorer();
    this.threadAnalyzer = new EmailThreadAnalyzer();
    this.spamFilter = new SpamFinancialFilter();

    // Pipeline state
    this._classificationCache = new Map();
    this._classificationHistory = [];
    this._trainingData = [];
    this._stats = {
      totalClassified: 0,
      totalBatches: 0,
      categoryDistribution: {},
      priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      legitimacyDistribution: { safe: 0, low_risk: 0, medium_risk: 0, high_risk: 0, critical_risk: 0 },
      averageConfidence: 0,
      cacheHits: 0,
      cacheMisses: 0,
      modelVersion: 1,
      lastTrainedAt: null,
      lastClassifiedAt: null,
      accuracyEstimate: null,
      errors: 0
    };
    this._confidenceAccumulator = 0;
    this._feedbackBuffer = [];
    this._feedbackBufferLimit = 100;
    this._autoRetrainCounter = 0;
    this._autoRetrainInterval = 500; // Auto-retrain every 500 classifications if enabled

    logger.info('[EmailClassificationPipeline] Initialized with options:', {
      batchSize: this.batchSize,
      cacheSize: this.cacheSize,
      enableCaching: this.enableCaching,
      enableAutoRetrain: this.enableAutoRetrain
    });
  }

  /**
   * Classify a single email through the full pipeline
   * @param {Object} email - Email object
   * @param {Object} options - { skipCache, skipSpamCheck, skipPriority }
   * @returns {Object} Full classification result
   */
  classifyEmail(email, options = {}) {
    if (!email) {
      logger.warn('[EmailClassificationPipeline] Null email passed to classifyEmail');
      return this._emptyClassificationResult();
    }

    const emailId = email.id || email.messageId || this._generateEmailHash(email);

    // Check cache
    if (this.enableCaching && !options.skipCache && this._classificationCache.has(emailId)) {
      this._stats.cacheHits++;
      const cached = this._classificationCache.get(emailId);
      return { ...cached, fromCache: true };
    }
    this._stats.cacheMisses++;

    try {
      const startTime = Date.now();

      // Step 1: Extract features
      const features = this.featureExtractor.extractFeatures(email);

      // Step 2: Classify category
      const classification = this.classifier.predict(email);

      // Step 3: Check legitimacy (spam/phishing)
      let legitimacy = null;
      if (!options.skipSpamCheck) {
        legitimacy = this.spamFilter.checkLegitimacy(email);
      }

      // Step 4: Score priority
      let priority = null;
      if (!options.skipPriority) {
        priority = this.priorityScorer.score(email, classification);
      }

      // Step 5: Assemble result
      const result = {
        emailId,
        category: classification.category,
        confidence: classification.confidence,
        topCandidates: classification.topCandidates,
        method: classification.method,
        priority: priority ? {
          score: priority.score,
          level: priority.level,
          factors: priority.factors
        } : null,
        legitimacy: legitimacy ? {
          isLegitimate: legitimacy.isLegitimate,
          confidence: legitimacy.confidence,
          riskLevel: legitimacy.riskLevel,
          reasons: legitimacy.reasons
        } : null,
        features: {
          senderIsBank: features.sender_is_bank === 1,
          senderBankName: features.sender_bank_name,
          senderIsUpiApp: features.sender_is_upi_app === 1,
          senderUpiAppName: features.sender_upi_app_name,
          amountCount: features.amount_count,
          amountMax: features.amount_max,
          amountValues: features.amount_values,
          urgencyScore: features.content_urgency_score,
          hasAccountNumber: features.content_has_account_number === 1,
          hasCardNumber: features.content_has_card_number === 1,
          hasUpiRef: features.content_has_upi_ref === 1,
          hasAttachments: features.structural_has_attachment === 1,
          authenticationScore: features.header_authentication_score
        },
        processingTimeMs: Date.now() - startTime,
        classifiedAt: new Date().toISOString(),
        fromCache: false
      };

      // Override category if phishing detected
      if (legitimacy && !legitimacy.isLegitimate && legitimacy.legitimacyScore < 30) {
        result.originalCategory = result.category;
        result.category = 'fraud_alert';
        result.categoryOverrideReason = 'Potential phishing detected';
        if (priority) {
          result.priority.level = 'critical';
          result.priority.score = Math.max(result.priority.score, 90);
        }
      }

      // Cache result
      if (this.enableCaching) {
        this._cacheResult(emailId, result);
      }

      // Update stats
      this._updateStats(result);

      // Check for auto-retrain
      if (this.enableAutoRetrain) {
        this._checkAutoRetrain();
      }

      return result;
    } catch (error) {
      logger.error('[EmailClassificationPipeline] Classification error:', error.message);
      this._stats.errors++;
      return this._emptyClassificationResult(emailId);
    }
  }

  /**
   * Classify a batch of emails with progress tracking
   * @param {Object[]} emails
   * @param {Function} onProgress - Callback(processed, total, currentResult)
   * @returns {Object} { results, summary, processingTimeMs }
   */
  classifyBatch(emails, onProgress = null) {
    if (!Array.isArray(emails) || emails.length === 0) {
      return { results: [], summary: this._emptyBatchSummary(), processingTimeMs: 0 };
    }

    const startTime = Date.now();
    const results = [];
    const total = emails.length;
    let processed = 0;

    logger.info(`[EmailClassificationPipeline] Starting batch classification: ${total} emails`);

    // Process in chunks
    const chunks = [];
    for (let i = 0; i < total; i += this.batchSize) {
      chunks.push(emails.slice(i, i + this.batchSize));
    }

    for (const chunk of chunks) {
      for (const email of chunk) {
        try {
          const result = this.classifyEmail(email);
          results.push(result);
          processed++;

          if (onProgress && typeof onProgress === 'function') {
            try {
              onProgress(processed, total, result);
            } catch (cbError) {
              logger.warn('[EmailClassificationPipeline] Progress callback error:', cbError.message);
            }
          }
        } catch (error) {
          logger.warn('[EmailClassificationPipeline] Batch item error:', error.message);
          results.push(this._emptyClassificationResult());
          processed++;
          this._stats.errors++;
        }
      }
    }

    // Generate batch summary
    const summary = this._generateBatchSummary(results);
    const processingTimeMs = Date.now() - startTime;

    this._stats.totalBatches++;

    logger.info(`[EmailClassificationPipeline] Batch complete: ${processed}/${total} emails, ${processingTimeMs}ms`);

    return {
      results,
      summary,
      processingTimeMs,
      batchSize: total,
      processedCount: processed
    };
  }

  /**
   * Train models from user's historical labeled data
   * @param {Array<{email: Object, label: string}>} labeledEmails
   * @returns {Object} Training results
   */
  trainFromHistory(labeledEmails) {
    if (!Array.isArray(labeledEmails) || labeledEmails.length < this.minTrainingSize) {
      const msg = `Insufficient training data: ${(labeledEmails || []).length} < ${this.minTrainingSize}`;
      logger.warn(`[EmailClassificationPipeline] ${msg}`);
      return { success: false, error: msg };
    }

    const startTime = Date.now();

    try {
      // Update feature extractor corpus
      for (const item of labeledEmails) {
        if (item.email) {
          const text = `${item.email.subject || ''} ${item.email.body || item.email.snippet || ''}`;
          this.featureExtractor.updateCorpus(text);
        }
      }

      // Split into train/validation (80/20)
      const shuffled = [...labeledEmails].sort(() => Math.random() - 0.5);
      const splitIdx = Math.floor(shuffled.length * 0.8);
      const trainSet = shuffled.slice(0, splitIdx);
      const validSet = shuffled.slice(splitIdx);

      // Train classifier
      const trainResult = this.classifier.train(trainSet);

      if (!trainResult.success) {
        return { success: false, error: 'Classifier training failed', details: trainResult };
      }

      // Validate
      let correct = 0;
      let total = 0;
      const confusionMatrix = {};

      for (const item of validSet) {
        if (!item.email || !item.label) continue;
        const prediction = this.classifier.predict(item.email);
        total++;

        if (!confusionMatrix[item.label]) confusionMatrix[item.label] = {};
        confusionMatrix[item.label][prediction.category] =
          (confusionMatrix[item.label][prediction.category] || 0) + 1;

        if (prediction.category === item.label) {
          correct++;
        }
      }

      const accuracy = total > 0 ? correct / total : 0;
      this._stats.accuracyEstimate = accuracy;
      this._stats.lastTrainedAt = new Date().toISOString();
      this._stats.modelVersion++;

      // Store training data for future retraining
      this._trainingData = labeledEmails;

      const result = {
        success: true,
        trainResult: {
          processedCount: trainResult.processedCount,
          vocabularySize: trainResult.vocabularySize
        },
        validation: {
          accuracy,
          correct,
          total,
          confusionMatrix
        },
        modelVersion: this._stats.modelVersion,
        processingTimeMs: Date.now() - startTime
      };

      logger.info(`[EmailClassificationPipeline] Training complete: accuracy=${(accuracy * 100).toFixed(1)}%, model v${this._stats.modelVersion}`);
      return result;
    } catch (error) {
      logger.error('[EmailClassificationPipeline] Training error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Provide feedback on a classification to improve future accuracy
   * @param {string} emailId
   * @param {string} correctCategory
   */
  provideFeedback(emailId, correctCategory) {
    if (!emailId || !correctCategory || !CLASSIFICATION_CATEGORIES.includes(correctCategory)) {
      return { success: false, error: 'Invalid feedback parameters' };
    }

    // Find cached classification
    const cached = this._classificationCache.get(emailId);
    const wasCorrect = cached ? cached.category === correctCategory : null;

    this._feedbackBuffer.push({
      emailId,
      correctCategory,
      predictedCategory: cached ? cached.category : null,
      wasCorrect,
      timestamp: new Date().toISOString()
    });

    // Trigger retrain if buffer is full
    if (this._feedbackBuffer.length >= this._feedbackBufferLimit && this._trainingData.length > 0) {
      logger.info('[EmailClassificationPipeline] Feedback buffer full, considering retrain');
      this._processAndRetrain();
    }

    return {
      success: true,
      wasCorrect,
      feedbackBufferSize: this._feedbackBuffer.length,
      feedbackBufferLimit: this._feedbackBufferLimit
    };
  }

  /**
   * Process feedback buffer and retrain if beneficial
   */
  _processAndRetrain() {
    const incorrectCount = this._feedbackBuffer.filter(f => f.wasCorrect === false).length;
    const errorRate = incorrectCount / this._feedbackBuffer.length;

    if (errorRate > this.retrainThreshold && this._trainingData.length >= this.minTrainingSize) {
      logger.info(`[EmailClassificationPipeline] Error rate ${(errorRate * 100).toFixed(1)}% > threshold, retraining`);

      // Add feedback as new training data
      // (In production, you'd retrieve the actual emails by ID)
      this.classifier.incrementalTrain(
        this._feedbackBuffer
          .filter(f => f.wasCorrect === false)
          .map(f => {
            const cached = this._classificationCache.get(f.emailId);
            if (cached && cached._originalEmail) {
              return { email: cached._originalEmail, label: f.correctCategory };
            }
            return null;
          })
          .filter(Boolean)
      );

      this._stats.modelVersion++;
      this._stats.lastTrainedAt = new Date().toISOString();
    }

    this._feedbackBuffer = [];
  }

  /**
   * Get comprehensive classification statistics
   * @returns {Object}
   */
  getClassificationStats() {
    const classifierStats = this.classifier.getStats();
    const spamFilterStats = this.spamFilter.getStats();
    const threadSummary = this.threadAnalyzer.getSummary();

    return {
      pipeline: {
        totalClassified: this._stats.totalClassified,
        totalBatches: this._stats.totalBatches,
        averageConfidence: this._stats.totalClassified > 0
          ? this._confidenceAccumulator / this._stats.totalClassified
          : 0,
        categoryDistribution: { ...this._stats.categoryDistribution },
        priorityDistribution: { ...this._stats.priorityDistribution },
        legitimacyDistribution: { ...this._stats.legitimacyDistribution },
        cacheHitRate: (this._stats.cacheHits + this._stats.cacheMisses) > 0
          ? this._stats.cacheHits / (this._stats.cacheHits + this._stats.cacheMisses)
          : 0,
        errors: this._stats.errors,
        modelVersion: this._stats.modelVersion,
        lastTrainedAt: this._stats.lastTrainedAt,
        lastClassifiedAt: this._stats.lastClassifiedAt,
        accuracyEstimate: this._stats.accuracyEstimate
      },
      classifier: classifierStats,
      spamFilter: spamFilterStats,
      threads: threadSummary,
      featureExtractor: {
        documentCount: this.featureExtractor.documentCount,
        vocabularySize: this.featureExtractor.vocabularySize
      },
      feedbackBuffer: {
        size: this._feedbackBuffer.length,
        limit: this._feedbackBufferLimit
      }
    };
  }

  /**
   * Export complete model state for persistence
   * @returns {Object} Serialized model
   */
  exportModel() {
    try {
      const model = {
        version: this._stats.modelVersion,
        exportedAt: new Date().toISOString(),
        components: {
          featureExtractor: this.featureExtractor.serialize(),
          classifier: this.classifier.serialize(),
          priorityScorer: this.priorityScorer.serialize(),
          spamFilter: this.spamFilter.serialize()
        },
        stats: { ...this._stats },
        feedbackHistory: this._feedbackBuffer.slice(-50) // Keep last 50 feedback items
      };

      logger.info(`[EmailClassificationPipeline] Model exported: v${model.version}`);
      return { success: true, model };
    } catch (error) {
      logger.error('[EmailClassificationPipeline] Export error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import model state from serialized data
   * @param {Object} modelData
   * @returns {Object} Import result
   */
  importModel(modelData) {
    if (!modelData || !modelData.components) {
      return { success: false, error: 'Invalid model data' };
    }

    try {
      const { components, stats } = modelData;

      // Restore feature extractor
      if (components.featureExtractor) {
        this.featureExtractor.deserialize(components.featureExtractor);
      }

      // Restore classifier
      if (components.classifier) {
        this.classifier.deserialize(components.classifier);
      }

      // Restore priority scorer
      if (components.priorityScorer) {
        this.priorityScorer.deserialize(components.priorityScorer);
      }

      // Restore spam filter
      if (components.spamFilter) {
        this.spamFilter.deserialize(components.spamFilter);
      }

      // Restore stats
      if (stats) {
        this._stats = { ...this._stats, ...stats };
      }

      // Clear cache since model changed
      this._classificationCache.clear();

      logger.info(`[EmailClassificationPipeline] Model imported: v${modelData.version || 'unknown'}`);
      return {
        success: true,
        version: modelData.version,
        importedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[EmailClassificationPipeline] Import error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze email threads from a batch of emails
   * @param {Object[]} emails
   * @returns {Object} Thread analysis results
   */
  analyzeThreads(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
      return { threads: [], recurringPatterns: [], followUps: [] };
    }

    try {
      const threads = this.threadAnalyzer.groupByThread(emails);
      const recurringPatterns = this.threadAnalyzer.trackRecurringPatterns(emails);
      const followUps = this.threadAnalyzer.identifyFollowUps(emails);

      // Classify threads
      for (const thread of threads) {
        if (thread.emails.length > 0) {
          const firstEmail = thread.emails[0];
          const classification = this.classifyEmail(firstEmail, { skipCache: false });
          thread.category = classification.category;
          thread.priority = classification.priority;
        }

        // Detect conversation chain for multi-email threads
        if (thread.emails.length > 1) {
          thread.conversationChain = this.threadAnalyzer.detectConversationChains(thread.emails);
        }
      }

      return {
        threads,
        recurringPatterns,
        followUps,
        summary: {
          totalThreads: threads.length,
          multiEmailThreads: threads.filter(t => t.isMultiEmail).length,
          recurringPatternsCount: recurringPatterns.length,
          followUpsCount: followUps.length
        }
      };
    } catch (error) {
      logger.error('[EmailClassificationPipeline] Thread analysis error:', error.message);
      return { threads: [], recurringPatterns: [], followUps: [], error: error.message };
    }
  }

  /**
   * Get a quick summary of emails by category and priority
   * @param {Object[]} emails
   * @returns {Object} Summary
   */
  quickSummary(emails) {
    if (!Array.isArray(emails)) return {};

    const batchResult = this.classifyBatch(emails);
    return batchResult.summary;
  }

  /**
   * Reset the entire pipeline
   */
  reset() {
    this.classifier.reset();
    this.featureExtractor = new EmailFeatureExtractor();
    this._classificationCache.clear();
    this._classificationHistory = [];
    this._trainingData = [];
    this._feedbackBuffer = [];
    this._stats = {
      totalClassified: 0,
      totalBatches: 0,
      categoryDistribution: {},
      priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      legitimacyDistribution: { safe: 0, low_risk: 0, medium_risk: 0, high_risk: 0, critical_risk: 0 },
      averageConfidence: 0,
      cacheHits: 0,
      cacheMisses: 0,
      modelVersion: 1,
      lastTrainedAt: null,
      lastClassifiedAt: null,
      accuracyEstimate: null,
      errors: 0
    };
    this._confidenceAccumulator = 0;
    logger.info('[EmailClassificationPipeline] Pipeline reset complete');
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Cache a classification result
   */
  _cacheResult(emailId, result) {
    if (this._classificationCache.size >= this.cacheSize) {
      // Evict oldest entry (FIFO)
      const firstKey = this._classificationCache.keys().next().value;
      this._classificationCache.delete(firstKey);
    }
    this._classificationCache.set(emailId, result);
  }

  /**
   * Update pipeline statistics
   */
  _updateStats(result) {
    this._stats.totalClassified++;
    this._stats.lastClassifiedAt = result.classifiedAt;
    this._confidenceAccumulator += (result.confidence || 0);

    // Category distribution
    const cat = result.category || 'other';
    this._stats.categoryDistribution[cat] = (this._stats.categoryDistribution[cat] || 0) + 1;

    // Priority distribution
    if (result.priority && result.priority.level) {
      const level = result.priority.level;
      this._stats.priorityDistribution[level] = (this._stats.priorityDistribution[level] || 0) + 1;
    }

    // Legitimacy distribution
    if (result.legitimacy && result.legitimacy.riskLevel) {
      const risk = result.legitimacy.riskLevel;
      this._stats.legitimacyDistribution[risk] = (this._stats.legitimacyDistribution[risk] || 0) + 1;
    }
  }

  /**
   * Check if auto-retrain should be triggered
   */
  _checkAutoRetrain() {
    this._autoRetrainCounter++;
    if (this._autoRetrainCounter >= this._autoRetrainInterval) {
      this._autoRetrainCounter = 0;
      if (this._feedbackBuffer.length > 10) {
        this._processAndRetrain();
      }
    }
  }

  /**
   * Generate a hash for emails without an ID
   */
  _generateEmailHash(email) {
    const str = `${email.from || ''}:${email.subject || ''}:${email.date || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate summary for a batch of classification results
   */
  _generateBatchSummary(results) {
    const summary = {
      total: results.length,
      categoryBreakdown: {},
      priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
      legitimacyBreakdown: { legitimate: 0, suspicious: 0, unknown: 0 },
      averageConfidence: 0,
      averagePriorityScore: 0,
      topCategories: [],
      flaggedEmails: [],
      highPriorityEmails: []
    };

    if (results.length === 0) return summary;

    let totalConfidence = 0;
    let totalPriority = 0;
    let priorityCount = 0;

    for (const result of results) {
      // Category
      const cat = result.category || 'other';
      summary.categoryBreakdown[cat] = (summary.categoryBreakdown[cat] || 0) + 1;

      // Priority
      if (result.priority) {
        const level = result.priority.level || 'low';
        summary.priorityBreakdown[level] = (summary.priorityBreakdown[level] || 0) + 1;
        totalPriority += result.priority.score || 0;
        priorityCount++;

        if (['critical', 'high'].includes(level)) {
          summary.highPriorityEmails.push({
            emailId: result.emailId,
            category: result.category,
            priorityScore: result.priority.score,
            priorityLevel: level
          });
        }
      }

      // Legitimacy
      if (result.legitimacy) {
        if (result.legitimacy.isLegitimate) {
          summary.legitimacyBreakdown.legitimate++;
        } else {
          summary.legitimacyBreakdown.suspicious++;
          summary.flaggedEmails.push({
            emailId: result.emailId,
            riskLevel: result.legitimacy.riskLevel,
            reasons: result.legitimacy.reasons
          });
        }
      } else {
        summary.legitimacyBreakdown.unknown++;
      }

      totalConfidence += result.confidence || 0;
    }

    summary.averageConfidence = totalConfidence / results.length;
    summary.averagePriorityScore = priorityCount > 0 ? totalPriority / priorityCount : 0;

    // Top categories
    summary.topCategories = Object.entries(summary.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({
        category,
        count,
        percentage: ((count / results.length) * 100).toFixed(1)
      }));

    return summary;
  }

  /**
   * Return empty batch summary
   */
  _emptyBatchSummary() {
    return {
      total: 0,
      categoryBreakdown: {},
      priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
      legitimacyBreakdown: { legitimate: 0, suspicious: 0, unknown: 0 },
      averageConfidence: 0,
      averagePriorityScore: 0,
      topCategories: [],
      flaggedEmails: [],
      highPriorityEmails: []
    };
  }

  /**
   * Return empty classification result
   */
  _emptyClassificationResult(emailId = null) {
    return {
      emailId,
      category: 'other',
      confidence: 0,
      topCandidates: [],
      method: 'none',
      priority: { score: 0, level: 'low', factors: [] },
      legitimacy: { isLegitimate: false, confidence: 0, riskLevel: 'unknown', reasons: [] },
      features: {},
      processingTimeMs: 0,
      classifiedAt: new Date().toISOString(),
      fromCache: false,
      error: true
    };
  }
}


// ─── Module Exports ──────────────────────────────────────────────────────────

module.exports = {
  EmailFeatureExtractor,
  NaiveBayesClassifier,
  EmailPriorityScorer,
  EmailThreadAnalyzer,
  SpamFinancialFilter,
  EmailClassificationPipeline,
  CLASSIFICATION_CATEGORIES,
  INDIAN_BANK_DOMAINS,
  UPI_APP_DOMAINS,
  PAYMENT_GATEWAY_DOMAINS,
  FINANCIAL_KEYWORDS
};
