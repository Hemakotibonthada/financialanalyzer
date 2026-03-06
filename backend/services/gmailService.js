const { google } = require('googleapis');
const fs = require('fs').promises;
const fse = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');
const { saveTransactions } = require('./documentProcessor');
const { parseEmailTransaction } = require('./emailTransactionParser');

class GmailService {
  constructor(tokens = null) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
    }
    
    // Enhanced financial keywords with categories
    this.financialCategories = {
      banking: {
        keywords: ['bank statement', 'account statement', 'monthly statement', 'savings account', 'checking account', 'account summary', 'balance', 'transaction history'],
        priority: 'high'
      },
      creditCards: {
        keywords: ['credit card', 'card statement', 'credit statement', 'mastercard', 'visa', 'amex', 'american express', 'discover'],
        priority: 'high'
      },
      upiPayments: {
        keywords: ['upi transaction', 'upi payment', 'money transferred', 'money received', 'payment successful', 'paytm', 'phonepe', 'googlepay', 'bharatpe', 'wallet', 'digital payment'],
        priority: 'high'
      },
      mobileWallet: {
        keywords: ['wallet recharged', 'wallet payment', 'mobile recharge', 'bill payment', 'qr payment', 'scan and pay', 'instant transfer', 'quick payment'],
        priority: 'high'
      },
      investments: {
        keywords: ['investment', 'portfolio', 'mutual fund', 'stocks', 'trading', 'brokerage', 'dividend', 'capital gains', '401k', 'ira', 'retirement'],
        priority: 'high'
      },
      insurance: {
        keywords: ['insurance', 'policy', 'premium', 'claim', 'coverage', 'health insurance', 'auto insurance', 'life insurance'],
        priority: 'medium'
      },
      taxes: {
        keywords: ['tax', 'form 16', '1099', 'w-2', 'tax return', 'irs', 'taxable', 'deduction', 'refund'],
        priority: 'high'
      },
      utilities: {
        keywords: ['electricity', 'water bill', 'gas bill', 'internet bill', 'phone bill', 'utility', 'service charge'],
        priority: 'medium'
      },
      loans: {
        keywords: ['loan', 'mortgage', 'emi', 'installment', 'principal', 'interest', 'home loan', 'personal loan'],
        priority: 'high'
      },
      receipts: {
        keywords: ['receipt', 'invoice', 'bill', 'purchase', 'order confirmation', 'payment confirmation'],
        priority: 'low'
      },
      payroll: {
        keywords: ['salary', 'payslip', 'pay stub', 'wages', 'payroll', 'bonus', 'overtime'],
        priority: 'high'
      },
      expenses: {
        keywords: ['expense', 'reimbursement', 'business expense', 'travel expense', 'meal expense'],
        priority: 'medium'
      }
    };

    // All financial keywords (flattened)
    this.financialKeywords = Object.values(this.financialCategories)
      .flatMap(category => category.keywords);

    // Enhanced file extensions with priority
    this.supportedExtensions = {
      high: ['.pdf', '.xlsx', '.xls'],
      medium: ['.csv', '.doc', '.docx'],
      low: ['.txt', '.png', '.jpg', '.jpeg', '.json', '.html', '.zip', '.rar', '.7z', '.gif', '.bmp', '.tif', '.tiff']
    };

    // All supported extensions (flattened)
    this.allExtensions = Object.values(this.supportedExtensions).flat();

    // UPI transaction detection helpers
    this.upiApps = [
      'paytm', 'phonepe', 'google pay', 'gpay', 'bharatpe', 'amazon pay', 'mobikwik',
      'freecharge', 'yono', 'cred', 'airtel money', 'jio pay', 'pine labs', 'razorpay',
      'cashfree', 'payu', 'paytm business', 'icici upi', 'hdfc bank upi', 'axis bank upi'
    ];
    this.upiPatterns = {
      amount: /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
      utr: /(?:utr|utr no\.?|txn id|transaction id|reference(?: no)?|ref(?:erence)? no\.?)[^A-Za-z0-9]*([A-Z0-9]{8,})/i,
      upiId: /([a-z0-9][\w\.\-]{1,}@\w+)/i
    };
    this.upiDirectionKeywords = {
      credit: ['received', 'credited', 'got', 'incoming', 'added'],
      debit: ['paid', 'sent', 'debited', 'transferred', 'outgoing', 'payment to']
    };

    this.publicSenderKeywords = [
      'noreply',
      'no-reply',
      'newsletter',
      'promotions',
      'notification',
      'support',
      'donotreply',
      'mailer-daemon',
      'updates',
      'info@',
      'offers',
      'marketing',
      'announcements'
    ];

    this.replySubjectRegex = /^\s*(re:|fwd?:)/i;
  }

  /**
   * Static method to get an instance for token operations (no user tokens needed)
   */
  static getAuthInstance() {
    return new GmailService();
  }

  /**
   * Static method to get an instance for a specific user's session
   */
  static getUserInstance(tokens) {
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      throw new Error('Cannot create user instance without valid tokens.');
    }
    return new GmailService(tokens);
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl() {
    // Only request gmail.readonly — it covers everything gmail.metadata does
    // plus supports search queries. Requesting both causes Google API to reject
    // the 'q' parameter with "Metadata scope does not support 'q' parameter".
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error('Error getting tokens from code:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Set credentials for the OAuth2 client
   */
  setCredentials(tokens) {
    logger.info('Setting OAuth2Client credentials');
    logger.info('Token validation:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length,
      refreshTokenLength: tokens.refresh_token?.length
    });
    
    if (!tokens.access_token && !tokens.refresh_token) {
      throw new Error('Either access_token or refresh_token is required');
    }
    
    this.oauth2Client.setCredentials(tokens);
    logger.info('Credentials set successfully on OAuth2Client');
    
    // Verify credentials were set
    const currentCreds = this.oauth2Client.credentials;
    logger.info('Verified credentials on client:', {
      hasAccessToken: !!currentCreds.access_token,
      hasRefreshToken: !!currentCreds.refresh_token
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshToken(refreshToken);
      return credentials;
    } catch (error) {
      logger.error('Error refreshing access token:', error.message);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Search for financial emails
   */
  async searchFinancialEmails(userId, options = {}) {
    try {
      // Verify OAuth2Client has credentials
      const currentCreds = this.oauth2Client.credentials;
      logger.info('Checking OAuth2Client credentials before Gmail search:', {
        hasAccessToken: !!currentCreds?.access_token,
        hasRefreshToken: !!currentCreds?.refresh_token,
        accessTokenLength: currentCreds?.access_token?.length,
        refreshTokenLength: currentCreds?.refresh_token?.length
      });

      if (!currentCreds?.access_token && !currentCreds?.refresh_token) {
        throw new Error('No access token or refresh token available on OAuth2Client');
      }

      logger.info('Creating Gmail client with authenticated OAuth2Client');
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      const {
        maxResults = 100,
        dateAfter = null,
        dateBefore = null,
        hasAttachment = null,
        pageToken = null,
        includeSpamTrash = false
      } = options;

      // Build search query
      let query = this.buildSearchQuery(hasAttachment, dateAfter, dateBefore);
      
      logger.info(`Searching Gmail with query: ${query}`);

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken: pageToken || undefined,
        includeSpamTrash
      });

      const messages = response.data.messages || [];
      logger.info(`Found ${messages.length} potential financial emails (estimate: ${response.data.resultSizeEstimate || 0})`);

      return {
        messages,
        nextPageToken: response.data.nextPageToken || null,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      };
    } catch (error) {
      logger.error('Error searching Gmail:', error.message);

      // If the metadata scope blocks the 'q' parameter, retry without search query
      // This happens when tokens were issued with gmail.metadata + gmail.readonly
      if (error?.message?.includes("Metadata scope does not support 'q' parameter")) {
        logger.warn('Metadata scope conflict detected — retrying without search query filter');
        try {
          const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
          const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: options.maxResults || 50,
            pageToken: options.pageToken || undefined
          });
          return {
            messages: response.data.messages || [],
            nextPageToken: response.data.nextPageToken || null,
            resultSizeEstimate: response.data.resultSizeEstimate || 0
          };
        } catch (retryError) {
          logger.error('Retry without query also failed:', retryError.message);
          throw new Error(`Gmail search failed: ${retryError.message}`);
        }
      }

      const genericError = new Error(`Failed to search Gmail for financial emails: ${error.message}`);
      genericError.cause = error;
      throw genericError;
    }
  }

  /**
   * Build enhanced Gmail search query with multiple strategies
   */
  buildSearchQuery(hasAttachment, dateAfter, dateBefore, searchStrategy = 'comprehensive') {
    let queries = [];

    if (searchStrategy === 'comprehensive') {
      // Strategy 1: Major Indian Banks and Financial Institutions
      const indianBankSenders = [
        'from:(*@sbi.co.in OR *@icicibank.com OR *@hdfcbank.com OR *@axisbank.com)',
        'from:(*@kotak.com OR *@yesbank.in OR *@idbibank.in OR *@pnb.co.in)',
        'from:(*@canarabank.com OR *@bankofbaroda.com OR *@unionbankofindia.com)',
        'from:(*@idfc.com OR *@indusind.com OR *@rbl.com OR *@dbs.com)',
        'from:(*@standardchartered.com OR *@citibank.com OR *@hsbc.co.in)',
        'from:(*@americanexpress.com OR *@bajajfinserv.in OR *@tataaia.com)',
        'from:(*@lic.in OR *@sbilife.co.in OR *@maxlifeinsurance.com)'
      ].join(' OR ');

      // Strategy 2: UPI Apps and Digital Payment Platforms
      const upiAndDigitalPaymentSenders = [
        // Major UPI Apps
        'from:(*@paytm.com OR *@phonepe.com OR *@googlepay.com OR *@gpay.com)',
        'from:(*@bharatpe.com OR *@cred.club OR *@mobikwik.com OR *@freecharge.com)',
        'from:(*@amazonpay.in OR *@amazon.in OR *@jiopay.com OR *@airtel.in)',
        'from:(*@ybl.nsdl.co.in OR *@upi.npci.org.in OR *@payu.in)',
        
        // Payment Gateways and Fintech
        'from:(*@razorpay.com OR *@cashfree.com OR *@instamojo.com OR *@billdesk.com)',
        'from:(*@ccavenue.com OR *@paykun.com OR *@easebuzz.in OR *@zaakpay.com)',
        
        // Investment and Trading Platforms
        'from:(*@zerodha.com OR *@kuvera.in OR *@groww.in OR *@etmoney.com)',
        'from:(*@upstox.com OR *@angel.co.in OR *@icicidirect.com OR *@hdfcsec.com)',
        'from:(*@5paisa.com OR *@sharekhan.com OR *@kotaksecurities.com)',
        
        // Cryptocurrency and Digital Wallets
        'from:(*@wazirx.com OR *@coindcx.com OR *@coinbase.com OR *@binance.com)',
        'from:(*@bitbns.com OR *@unocoin.com OR *@zebpay.com)'
      ].join(' OR ');

      // Strategy 3: Enhanced Subject Line Patterns (including UPI transactions)
      const enhancedSubjectPatterns = [
        // Traditional Banking
        'subject:("account statement" OR "monthly statement" OR "quarterly statement")',
        'subject:("credit card statement" OR "debit card" OR "card transaction")',
        'subject:("transaction alert" OR "payment received" OR "payment made")',
        'subject:("balance alert" OR "low balance" OR "minimum balance")',
        'subject:("loan statement" OR "emi due" OR "payment due" OR "overdue")',
        
        // UPI and Digital Payments
        'subject:("UPI transaction" OR "UPI payment" OR "money transferred" OR "money received")',
        'subject:("payment successful" OR "payment failed" OR "transaction successful" OR "transaction failed")',
        'subject:("wallet recharged" OR "wallet payment" OR "mobile recharge" OR "bill payment")',
        'subject:("QR payment" OR "scan and pay" OR "instant transfer" OR "quick payment")',
        'subject:("cashback credited" OR "reward points" OR "offer applied" OR "discount received")',
        
        // Investment and Trading
        'subject:("investment statement" OR "portfolio" OR "mutual fund" OR "SIP")',
        'subject:("dividend received" OR "bonus shares" OR "stock purchased" OR "stock sold")',
        'subject:("order executed" OR "trade confirmation" OR "margin call" OR "settlement")',
        
        // Insurance and Other Financial Services
        'subject:("insurance premium" OR "policy" OR "claim settlement" OR "maturity")',
        'subject:("tax" OR "form 16" OR "tds certificate" OR "interest certificate")',
        'subject:("receipt" OR "invoice" OR "bill payment" OR "recharge")',
        'subject:("salary" OR "payslip" OR "increment" OR "bonus" OR "pf")'
      ].join(' OR ');

      // Strategy 4: UPI and Financial Keywords in Content
      const contentKeywords = [
        // Traditional Banking
        '("available balance" OR "current balance" OR "outstanding amount")',
        '("account number" OR "ifsc code" OR "routing number" OR "sort code")',
        '("interest earned" OR "charges debited" OR "fee deducted")',
        '("maturity amount" OR "dividend credited" OR "bonus shares")',
        
        // UPI Specific Terms
        '("UPI ID" OR "VPA" OR "virtual payment address" OR "@paytm" OR "@ybl" OR "@okhdfcbank")',
        '("UPI PIN" OR "transaction PIN" OR "payment app" OR "digital wallet")',
        '("merchant payment" OR "peer to peer" OR "P2P transfer" OR "request money")',
        '("split bill" OR "group payment" OR "collect request" OR "payment link")',
        
        // Transaction Status and Details
        '("transaction successful" OR "payment confirmed" OR "transfer completed")',
        '("transaction failed" OR "payment declined" OR "insufficient balance")',
        '("transaction ID" OR "reference number" OR "UTR number" OR "order ID")',
        '("debit" OR "credit" OR "withdrawal" OR "deposit" OR "refund")',
        
        // Amounts and Currency
        '("₹" OR "INR" OR "rupees" OR "amount paid" OR "amount received")',
        '("cashback" OR "reward" OR "points earned" OR "discount" OR "offer")'
      ].join(' OR ');

      // Strategy 5: Common Financial Domain Patterns
      const domainPatterns = [
        'from:(noreply OR donotreply OR alerts OR statements OR customercare)',
        'from:(support OR service OR notification OR updates OR info)',
        'from:(finance OR accounts OR billing OR treasury OR investment)'
      ].join(' OR ');

      // Combine all strategies
      queries.push(`(${indianBankSenders})`);
      queries.push(`(${upiAndDigitalPaymentSenders})`);
      queries.push(`(${enhancedSubjectPatterns})`);
      queries.push(`(${contentKeywords})`);
      queries.push(`(${domainPatterns})`);

    } else {
      // Simple strategy - all keywords
      const keywordQuery = this.financialKeywords
        .map(keyword => `"${keyword}"`)
        .join(' OR ');
      queries.push(`(${keywordQuery})`);
    }

    let finalQuery = queries.join(' OR ');

    // Add attachment filter with enhanced file type detection
    if (hasAttachment === true) {
      finalQuery += ' has:attachment';
      
      // Enhanced file type filters - prioritize financial document types
      const financialFileTypes = [
        'filename:(pdf OR xlsx OR xls OR csv)',
        'filename:(statement OR transaction OR receipt OR invoice)',
        'filename:(account OR credit OR debit OR payment)',
        'filename:(tax OR salary OR investment OR insurance)'
      ].join(' OR ');
      
      finalQuery += ` (${financialFileTypes})`;
    }

    // Add date filters
    if (dateAfter) {
      const afterDate = new Date(dateAfter).toISOString().split('T')[0];
      finalQuery += ` after:${afterDate}`;
    }

    if (dateBefore) {
      const beforeDate = new Date(dateBefore).toISOString().split('T')[0];
      finalQuery += ` before:${beforeDate}`;
    }

    // Add additional filters to improve relevance
    finalQuery += ' -from:unsubscribe -subject:unsubscribe -subject:newsletter';

    return finalQuery;
  }

  /**
   * Get email details and attachments
   */
  async getEmailWithAttachments(messageId, userId, runDate = null, options = {}) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get message details
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const emailData = this.parseEmailData(message.data);
      const body = this.extractEmailBody(message.data.payload);
      const bodyText = body.text || this.stripHtml(body.html);

      const includeAttachments = options.includeAttachments !== false;
      
      // Process attachments
      const attachments = includeAttachments
        ? await this.processAttachments(
            gmail,
            messageId,
            message.data.payload,
            userId,
            emailData,
            runDate // Pass runDate for organized folder structure
          )
        : [];

      return {
        ...emailData,
        body,
        bodyText,
        snippet: message.data.snippet || emailData.snippet,
        historyId: message.data.historyId,
        threadId: message.data.threadId,
        labelIds: message.data.labelIds || [],
        attachments,
        gmailMessageId: messageId
      };
    } catch (error) {
      logger.error(`Error getting email ${messageId}:`, error);
      throw new Error('Failed to retrieve email details');
    }
  }

  /**
   * Parse email data from Gmail API response
   */
  parseEmailData(messageData) {
    const headers = messageData.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

    const subject = getHeader('Subject') || 'No Subject';
    const from = getHeader('From') || 'Unknown Sender';
    const to = getHeader('To') || '';
    const cc = getHeader('Cc') || '';
    const bcc = getHeader('Bcc') || '';
    const messageId = getHeader('Message-ID') || getHeader('Message-Id') || '';
    const date = new Date(parseInt(messageData.internalDate));

    // Extract password hints from subject and body
    const passwordHints = this.extractPasswordHints(subject, messageData.snippet || '');

    return {
      subject,
      from,
      to,
      cc,
      bcc,
      date,
      snippet: messageData.snippet || '',
      passwordHints,
      headers,
      messageId
    };
  }

  /**
   * Decode Gmail API base64url encoded data
   */
  decodeBase64(data) {
    if (!data) return '';
    const sanitized = data.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(sanitized, 'base64');
    return buffer.toString('utf8');
  }

  /**
   * Extract plain text and HTML body content from a Gmail message payload
   */
  extractEmailBody(payload) {
    const body = { text: '', html: '' };

    const traverseParts = (part) => {
      if (!part) return;

      if (part.mimeType === 'text/plain' && part.body?.data) {
        body.text += `${this.decodeBase64(part.body.data)}\n`;
      }

      if (part.mimeType === 'text/html' && part.body?.data) {
        body.html += this.decodeBase64(part.body.data);
      }

      if (part.parts && part.parts.length) {
        part.parts.forEach(traverseParts);
      }
    };

    traverseParts(payload);

    if (!body.text && payload?.body?.data) {
      body.text = this.decodeBase64(payload.body.data);
    }

    if (!body.text && body.html) {
      body.text = this.stripHtml(body.html);
    }

    body.text = body.text.trim();
    body.html = body.html.trim();

    return body;
  }

  /**
   * Strip HTML tags for fallback plain text generation
   */
  stripHtml(html = '') {
    return html
      .replace(/<style[\s\S]*?<[\s]*\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<[\s]*\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&rsquo;/gi, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Extract potential password hints from email content
   */
  extractPasswordHints(subject, snippet) {
    const hints = [];
    const content = `${subject} ${snippet}`.toLowerCase();

    // Common password patterns
    const patterns = [
      /password[:\s]*([a-zA-Z0-9@#$%^&*]{4,})/gi,
      /pin[:\s]*(\d{4,6})/gi,
      /passcode[:\s]*([a-zA-Z0-9]{4,})/gi,
      /access code[:\s]*([a-zA-Z0-9]{4,})/gi,
      /security code[:\s]*([a-zA-Z0-9]{4,})/gi,
      /your (date of birth|dob|birthday)/gi,
      /last (\d+) digits/gi,
      /pan number/gi,
      /phone number/gi,
      /mobile number/gi
    ];

    patterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        hints.push({
          source: 'email_content',
          hint: match[1] || match[0],
          extractedDate: new Date()
        });
      });
    });

    // Common hint phrases without specific values
    const hintPhrases = [
      'password is your date of birth',
      'password is your pan number',
      'password is your phone number',
      'password is last 4 digits',
      'password is first 4 letters of name'
    ];

    hintPhrases.forEach(phrase => {
      if (content.includes(phrase)) {
        hints.push({
          source: 'email_content',
          hint: phrase,
          extractedDate: new Date()
        });
      }
    });

    return hints;
  }

  /**
   * Process email attachments
   */
  async processAttachments(gmail, messageId, payload, userId, emailData, runDate = null) {
    const attachments = [];

    const processPart = async (part) => {
      if (!part) return;

      if (part.filename && part.body && part.body.attachmentId) {
        const attachment = await this.downloadAttachment(
          gmail,
          messageId,
          part.body.attachmentId,
          part.filename,
          userId,
          emailData,
          runDate
        );

        if (attachment) {
          attachments.push(attachment);
        }
      }

      if (part.parts && part.parts.length) {
        for (const childPart of part.parts) {
          await processPart(childPart);
        }
      }
    };

    if (payload?.body?.attachmentId && payload.filename) {
      await processPart(payload);
    }

    if (payload?.parts && payload.parts.length) {
      for (const part of payload.parts) {
        await processPart(part);
      }
    }

    return attachments;
  }

  /**
   * Download and save attachment
   */
  async downloadAttachment(gmail, messageId, attachmentId, filename, userId, emailData, runDate = null) {
    try {
      const existingDocument = await Document.findOne({
        userId,
        gmailMessageId: messageId,
        originalFileName: filename
      });

      if (existingDocument) {
        logger.info(`Attachment already stored, skipping download: ${filename}`);
        return {
          documentId: existingDocument._id,
          filename: existingDocument.fileName,
          originalFilename: existingDocument.originalFileName,
          size: existingDocument.fileSize,
          category: existingDocument.category,
          isPasswordProtected: existingDocument.isPasswordProtected
        };
      }

      // Check if file extension is supported
      const ext = path.extname(filename).toLowerCase();
      const isSupportedExtension = this.allExtensions.includes(ext);

      // Determine file priority
      let filePriority = 'low';
      for (const [priority, extensions] of Object.entries(this.supportedExtensions)) {
        if (extensions.includes(ext)) {
          filePriority = priority;
          break;
        }
      }

      // Get attachment data
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });

      const data = Buffer.from(attachment.data.data, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
      const safeFilename = `${timestamp}_${hash}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Create organized directory structure
      let uploadDir;
      if (runDate) {
        // For analysis runs: uploads/financial/{runDate}/
        const runDateStr = runDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        uploadDir = path.join(process.cwd(), 'uploads', 'financial', runDateStr);
        logger.info(`Using analysis run directory: ${uploadDir}`);
      } else {
        // For regular sync: uploads/financial/{userId}/
        uploadDir = path.join(process.cwd(), 'uploads', 'financial', String(userId));
      }
      
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeFilename);
      
      // Save file
      await fs.writeFile(filePath, data);
      
      logger.info(`Downloaded attachment: ${safeFilename}`);

      // Enhanced categorization
      const categorization = this.categorizeDocument(filename, emailData.subject, emailData.from);
      
      // Create document record with enhanced metadata
      const documentData = {
        userId,
        fileName: safeFilename,
        originalFileName: filename,
        fileType: isSupportedExtension && ext ? ext.substring(1) : 'bin',
        fileSize: data.length,
        filePath,
        source: 'gmail',
        gmailMessageId: messageId,
        category: categorization.category,
        confidence: categorization.confidence,
        priority: categorization.priority,
        passwordHints: emailData.passwordHints,
        metadata: {
          dateCreated: emailData.date,
          subject: emailData.subject,
          author: emailData.from,
          keywords: this.extractKeywords(filename, emailData.subject),
          matchedKeywords: categorization.matchedKeywords,
          filePriority: filePriority,
          extractedDate: emailData.date,
          processingStatus: 'pending'
        }
      };

      // Check if file might be password protected (common for financial PDFs)
      if (ext === '.pdf') {
        documentData.isPasswordProtected = await this.checkIfPasswordProtected(filePath);
        if (documentData.isPasswordProtected) {
          documentData.processingStatus = 'password_required';
        }
      }

      const document = await Document.create(documentData);
      
      return {
        documentId: document._id,
        filename: safeFilename,
        originalFilename: filename,
        size: data.length,
        category: documentData.category,
        isPasswordProtected: documentData.isPasswordProtected
      };
      
    } catch (error) {
      logger.error(`Error downloading attachment ${filename}:`, error);
      return null;
    }
  }

  /**
   * Check if PDF is password protected
   */
  async checkIfPasswordProtected(filePath) {
    try {
      const data = await fs.readFile(filePath);
      const content = data.toString();
      
      // Simple check for password protection indicators
      return content.includes('/Encrypt') || content.includes('/Filter/Standard');
    } catch (error) {
      logger.error('Error checking password protection:', error);
      return false;
    }
  }

  /**
   * Enhanced document categorization with confidence scoring
   */
  categorizeDocument(filename, subject, fromEmail = '') {
    const text = `${filename} ${subject} ${fromEmail}`.toLowerCase();
    let bestMatch = { category: 'other', confidence: 0, priority: 'low' };

    // Check against enhanced categories
    for (const [categoryName, categoryData] of Object.entries(this.financialCategories)) {
      let matchCount = 0;
      let totalKeywords = categoryData.keywords.length;

      for (const keyword of categoryData.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      const confidence = matchCount / totalKeywords;
      
      if (confidence > bestMatch.confidence || 
          (confidence === bestMatch.confidence && this.getPriorityScore(categoryData.priority) > this.getPriorityScore(bestMatch.priority))) {
        bestMatch = {
          category: categoryName,
          confidence: confidence,
          priority: categoryData.priority,
          matchedKeywords: categoryData.keywords.filter(k => text.includes(k.toLowerCase()))
        };
      }
    }

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      priority: bestMatch.priority,
      matchedKeywords: bestMatch.matchedKeywords || []
    };
  }

  /**
   * Get numeric priority score
   */
  getPriorityScore(priority) {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[priority] || 0;
  }

  /**
   * Extract keywords from filename and subject
   */
  extractKeywords(filename, subject) {
    const text = `${filename} ${subject}`.toLowerCase();
    const keywords = [];

    this.financialKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * Extract UPI transactions from email content
   */
  extractUPITransactions(emailData) {
    const subject = emailData.subject || '';
    const bodyText = emailData.bodyText || '';
    const snippet = emailData.snippet || '';
    const combinedText = `${subject}\n${bodyText}\n${snippet}`;
    const lowerCombined = combinedText.toLowerCase();

    if (!lowerCombined.includes('upi') && !/[a-z0-9._-]+@\w+/.test(lowerCombined)) {
      return [];
    }

    const amountMatch = combinedText.match(this.upiPatterns.amount);
    if (!amountMatch) {
      return [];
    }

    const amountValue = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!amountValue || Number.isNaN(amountValue)) {
      return [];
    }

    const upiIdMatch = combinedText.match(this.upiPatterns.upiId);
    const utrMatch = combinedText.match(this.upiPatterns.utr);
    const direction = this.detectUPIDirection(lowerCombined);
    const counterparty = this.extractUPICounterparty(combinedText, direction);
    const app = this.detectUPIApp(lowerCombined);

    const descriptionParts = [];
    descriptionParts.push(direction === 'credit' ? 'UPI credit' : 'UPI payment');
    if (counterparty) {
      descriptionParts.push(direction === 'credit' ? `from ${counterparty}` : `to ${counterparty}`);
    }
    if (upiIdMatch) {
      descriptionParts.push(`(${upiIdMatch[1]})`);
    }
    if (app) {
      descriptionParts.push(`via ${app}`);
    }

    const description = descriptionParts.join(' ') || subject || 'UPI transaction';

    const baseTransaction = {
      date: emailData.date || new Date(),
      description,
      amount: amountValue,
      type: direction === 'credit' ? 'credit' : 'debit',
      ai_category: 'UPI Payments',
      paymentMethod: 'upi',
      source: 'gmail_email',
      upi: {
        vpa: upiIdMatch ? upiIdMatch[1] : undefined,
        utr: utrMatch ? utrMatch[1] : undefined,
        reference: utrMatch ? utrMatch[1] : undefined,
        app,
        payer: direction === 'credit' ? (counterparty || 'Unknown') : emailData.from,
        payee: direction === 'credit' ? emailData.from : (counterparty || 'Unknown')
      },
      emailMetadata: {
        subject: emailData.subject,
        from: emailData.from,
        snippet: emailData.snippet,
        gmailMessageId: emailData.gmailMessageId,
        historyId: emailData.historyId
      },
      ai_confidence: this.calculateUPIConfidence({ amount: amountValue, upiIdMatch, utrMatch, direction, counterparty, app }),
      tags: ['upi', 'gmail'].concat(app ? [app.toLowerCase().replace(/\s+/g, '_')] : [])
    };

    return [baseTransaction];
  }

  detectUPIDirection(contentLower) {
    if (this.upiDirectionKeywords.credit.some(keyword => contentLower.includes(keyword))) {
      return 'credit';
    }
    if (this.upiDirectionKeywords.debit.some(keyword => contentLower.includes(keyword))) {
      return 'debit';
    }
    return 'debit';
  }

  extractUPICounterparty(content, direction) {
    const patterns = direction === 'credit'
      ? [/from\s+([A-Za-z][A-Za-z\s.&'-]{2,})/i, /by\s+([A-Za-z][A-Za-z\s.&'-]{2,})/i]
      : [/to\s+([A-Za-z][A-Za-z\s.&'-]{2,})/i, /paid\s+to\s+([A-Za-z][A-Za-z\s.&'-]{2,})/i];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const value = match[1].replace(/\s+/g, ' ').trim();
        if (value && value.length <= 60) {
          return value;
        }
      }
    }

    return null;
  }

  detectUPIApp(contentLower) {
    const matched = this.upiApps.find(app => contentLower.includes(app));
    if (!matched) {
      return null;
    }
    return matched.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  calculateUPIConfidence({ amount, upiIdMatch, utrMatch, direction, counterparty, app }) {
    let confidence = 0.6;

    if (amount) confidence += 0.1;
    if (upiIdMatch) confidence += 0.15;
    if (utrMatch) confidence += 0.1;
    if (direction) confidence += 0.05;
    if (counterparty) confidence += 0.05;
    if (app) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  async persistUPITransactions(userId, emailData, transactions) {
    if (!transactions || transactions.length === 0) {
      return { count: 0, documentId: null, transactionsPreview: [] };
    }

    let document = await Document.findOne({
      userId,
      gmailMessageId: emailData.gmailMessageId,
      source: 'gmail_email'
    });

    if (document) {
      const existingCount = await Transaction.countDocuments({ documentId: document._id });
      if (existingCount > 0) {
        logger.info(`UPI transactions already recorded for message ${emailData.gmailMessageId}`);
        return { count: 0, documentId: document._id, transactionsPreview: [] };
      }
    }

    const safeSubject = (emailData.subject || 'upi-email').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'upi-email';
    const safeBase = safeSubject.substring(0, 80).replace(/\s+/g, '_').toLowerCase();
    const safeUserId = userId.toString();
  const timestamp = Date.now();
  const uploadDir = path.join(process.cwd(), 'uploads', 'financial', safeUserId, 'emails');
  const safeFilename = document?.fileName || `${timestamp}_${safeBase || 'upi'}_${emailData.gmailMessageId}.json`;
  const filePath = document?.filePath || path.join(uploadDir, safeFilename);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

    const payload = {
      gmailMessageId: emailData.gmailMessageId,
      subject: emailData.subject,
      from: emailData.from,
      date: emailData.date,
      snippet: emailData.snippet,
      bodyText: emailData.bodyText,
      bodyHtml: emailData.body?.html,
      transactions
    };

  const fileContent = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, fileContent, 'utf8');
    const fileSize = Buffer.byteLength(fileContent);

    if (!document) {
      document = await Document.create({
        userId,
  fileName: safeFilename,
        originalFileName: `${safeSubject}.json`,
        fileType: 'json',
        fileSize,
        filePath,
        source: 'gmail_email',
        gmailMessageId: emailData.gmailMessageId,
        category: 'upi_transaction',
        isProcessed: true,
        processingStatus: 'completed',
        passwordHints: emailData.passwordHints,
        metadata: {
          dateCreated: emailData.date,
          subject: emailData.subject,
          author: emailData.from,
          keywords: this.extractKeywords(safeSubject, emailData.subject),
          emailSource: emailData.from,
          labels: emailData.labelIds || [],
          threadId: emailData.threadId
        }
      });
    } else {
  document.fileName = path.basename(filePath);
      document.originalFileName = `${safeSubject}.json`;
      document.fileType = 'json';
      document.fileSize = fileSize;
      document.filePath = filePath;
      document.category = 'upi_transaction';
      document.source = 'gmail_email';
      document.isProcessed = true;
      document.processingStatus = 'completed';
      document.passwordHints = emailData.passwordHints;
      document.metadata = {
        ...(document.metadata || {}),
        dateCreated: emailData.date,
        subject: emailData.subject,
        author: emailData.from,
        keywords: this.extractKeywords(safeSubject, emailData.subject),
        emailSource: emailData.from,
        labels: emailData.labelIds || [],
        threadId: emailData.threadId
      };
      document.markModified('metadata');
      await document.save();
    }

    const enrichedTransactions = transactions.map(transaction => ({
      ...transaction,
      enhanced: true,
      ai_tags: Array.from(new Set([...(transaction.tags || []), 'upi'])),
      source: 'gmail_email'
    }));

    const savedTransactions = await saveTransactions(enrichedTransactions, document);

    document.transactionCount = savedTransactions.length;
    document.isProcessed = true;
    document.processingStatus = 'completed';
    await document.save();

    logger.info(`Persisted ${savedTransactions.length} UPI transactions from Gmail message ${emailData.gmailMessageId}`);

    return {
      count: savedTransactions.length,
      documentId: document._id,
      transactionsPreview: savedTransactions.slice(0, 5).map(t => ({
        amount: t.amount,
        type: t.type,
        description: t.description,
        category: t.category,
        date: t.date
      }))
    };
  }

  /**
   * Persist general (non-UPI) email-parsed transactions into the database.
   * Uses the comprehensive emailTransactionParser to extract bank alerts,
   * credit card charges, NEFT/RTGS/IMPS, salary, EMI, bills, etc.
   * Skips emails that already have UPI transactions persisted (avoids duplicates).
   */
  async persistEmailTransactions(userId, emailData, parsedTx) {
    if (!parsedTx) return { count: 0, documentId: null, transactionsPreview: [] };

    // Check if a Document already exists for this gmail message
    let document = await Document.findOne({
      userId,
      gmailMessageId: emailData.gmailMessageId,
      source: 'gmail_email'
    });

    // If a document already exists, check if a transaction for the same amount+type already exists
    if (document) {
      const duplicate = await Transaction.findOne({
        documentId: document._id,
        amount: parsedTx.amount,
        type: parsedTx.type
      });
      if (duplicate) {
        logger.info(`Email transaction already recorded for message ${emailData.gmailMessageId} (amount: ${parsedTx.amount}, type: ${parsedTx.type})`);
        return { count: 0, documentId: document._id, transactionsPreview: [] };
      }
    }

    const safeSubject = (emailData.subject || 'email-tx').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'email-tx';
    const safeBase = safeSubject.substring(0, 80).replace(/\s+/g, '_').toLowerCase();
    const safeUserId = userId.toString();
    const timestamp = Date.now();
    const uploadDir = path.join(process.cwd(), 'uploads', 'financial', safeUserId, 'emails');
    const safeFilename = document?.fileName || `${timestamp}_${safeBase}_${emailData.gmailMessageId}.json`;
    const filePath = document?.filePath || path.join(uploadDir, safeFilename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const payload = {
      gmailMessageId: emailData.gmailMessageId,
      subject: emailData.subject,
      from: emailData.from,
      date: emailData.date,
      snippet: emailData.snippet,
      bodyText: emailData.bodyText,
      bodyHtml: emailData.body?.html,
      parsedTransaction: parsedTx
    };

    const fileContent = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, fileContent, 'utf8');
    const fileSize = Buffer.byteLength(fileContent);

    if (!document) {
      document = await Document.create({
        userId,
        fileName: safeFilename,
        originalFileName: `${safeSubject}.json`,
        fileType: 'json',
        fileSize,
        filePath,
        source: 'gmail_email',
        gmailMessageId: emailData.gmailMessageId,
        category: parsedTx.category || 'email_transaction',
        isProcessed: true,
        processingStatus: 'completed',
        passwordHints: emailData.passwordHints,
        metadata: {
          dateCreated: emailData.date,
          subject: emailData.subject,
          author: emailData.from,
          keywords: this.extractKeywords(safeBase, emailData.subject),
          emailSource: emailData.from,
          labels: emailData.labelIds || [],
          threadId: emailData.threadId,
          parsedBank: parsedTx.emailMetadata?.parsedBank,
          transactionType: parsedTx.type,
          paymentMethod: parsedTx.paymentMethod
        }
      });
    } else {
      // Update existing document metadata
      document.category = parsedTx.category || document.category;
      document.metadata = {
        ...(document.metadata || {}),
        parsedBank: parsedTx.emailMetadata?.parsedBank,
        transactionType: parsedTx.type,
        paymentMethod: parsedTx.paymentMethod
      };
      document.markModified('metadata');
      await document.save();
    }

    // Build full transaction record compatible with Transaction model
    const transactionRecord = {
      userId,
      documentId: document._id,
      date: parsedTx.date || emailData.date || new Date(),
      description: parsedTx.description || emailData.subject,
      amount: parsedTx.amount,
      type: parsedTx.type,
      category: parsedTx.category,
      paymentMethod: parsedTx.paymentMethod || 'other',
      source: 'gmail_email',
      merchantName: parsedTx.merchantName,
      confidence: parsedTx.confidence,
      tags: parsedTx.tags || ['gmail'],
      ai_category: parsedTx.ai_category,
      ai_confidence: parsedTx.ai_confidence,
      ai_tags: parsedTx.tags,
      aiProcessed: true,
      emailMetadata: {
        ...parsedTx.emailMetadata,
        accountNumber: parsedTx.accountNumber,
        referenceNumber: parsedTx.referenceNumber,
        balance: parsedTx.balance,
        subcategory: parsedTx.subcategory
      },
      enhanced: true,
    };

    const savedTransactions = await saveTransactions([transactionRecord], document);

    document.transactionCount = (document.transactionCount || 0) + savedTransactions.length;
    document.isProcessed = true;
    document.processingStatus = 'completed';
    await document.save();

    logger.info(`Persisted ${savedTransactions.length} general email transaction(s) from Gmail message ${emailData.gmailMessageId} [${parsedTx.type} ${parsedTx.amount} ${parsedTx.category}]`);

    return {
      count: savedTransactions.length,
      documentId: document._id,
      transactionsPreview: savedTransactions.slice(0, 5).map(t => ({
        amount: t.amount,
        type: t.type,
        description: t.description,
        category: t.category,
        date: t.date
      }))
    };
  }

  extractEmailAddress(value = '') {
    if (!value) {
      return '';
    }
    const match = value.match(/<([^>]+)>/);
    const email = match ? match[1] : value;
    return email.trim().toLowerCase();
  }

  isPublicEmail(sender = '', headers = []) {
    const normalizedSender = this.extractEmailAddress(sender);
    if (!normalizedSender) {
      return false;
    }

    const matchesKeyword = this.publicSenderKeywords.some(keyword => normalizedSender.includes(keyword));
    if (matchesKeyword) {
      return true;
    }

    return headers.some((header) =>
      header?.name && header?.value && header.name.toLowerCase() === 'list-unsubscribe'
    );
  }

  generateFallbackSummary(emailData) {
    const text = (emailData?.snippet || emailData?.bodyText || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      return null;
    }

    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2);
    return sentences.join(' ').substring(0, 400);
  }

  async generateEmailSummary(emailData, profile, options = {}) {
    const bodyText = (emailData?.bodyText || '').trim();
    if (!bodyText) {
      return null;
    }

    // 100% local summarization — no external APIs
    try {
      const subject = (emailData.subject || '').toLowerCase();
      const from = (typeof emailData.from === 'string' ? emailData.from : emailData.from?.email || '').toLowerCase();
      const body = bodyText.substring(0, 3000);

      // ── Financial pattern detection ──
      const amountPattern = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
      const amounts = [];
      let match;
      while ((match = amountPattern.exec(body)) !== null) {
        amounts.push(parseFloat(match[1].replace(/,/g, '')));
      }

      const upiPattern = /([a-z0-9][\w.\-]+@\w+)/i;
      const upiMatch = body.match(upiPattern);
      const utrPattern = /(?:utr|ref(?:erence)?)\s*(?:no\.?\s*)?:?\s*([A-Z0-9]{8,})/i;
      const utrMatch = body.match(utrPattern);

      // ── Detect email type ──
      const isDebit = /debited|paid|spent|charged|deducted|withdrawn|payment.*made/i.test(body);
      const isCredit = /credited|received|deposited|refund|cashback|salary/i.test(body);
      const isAlert = /alert|security|suspicious|otp|verify|urgent/i.test(subject);
      const isStatement = /statement|summary|report|bill.*due|outstanding/i.test(subject);
      const isEMI = /emi|installment|loan.*payment|auto.*debit/i.test(subject + ' ' + body);
      const isInvestment = /mutual fund|sip|dividend|portfolio|zerodha|groww|kuvera/i.test(subject + ' ' + body);

      // ── Build local summary ──
      const parts = [];

      // Sender context
      const senderName = emailData.from?.name || from.split('@')[0] || 'Unknown';
      parts.push(`Email from ${senderName}.`);

      // Subject summary
      if (subject) {
        parts.push(`Subject: "${emailData.subject}".`);
      }

      // Transaction details
      if (amounts.length > 0) {
        const mainAmount = Math.max(...amounts);
        const formattedAmt = `₹${mainAmount.toLocaleString('en-IN')}`;
        if (isDebit) {
          parts.push(`Debit transaction of ${formattedAmt} detected.`);
        } else if (isCredit) {
          parts.push(`Credit of ${formattedAmt} received.`);
        } else {
          parts.push(`Amount mentioned: ${formattedAmt}.`);
        }
      }

      // Type-specific insights
      if (isEMI) parts.push('This appears to be an EMI/loan related communication.');
      if (isStatement) parts.push('This is a financial statement or bill summary.');
      if (isAlert) parts.push('This is a security or account alert.');
      if (isInvestment) parts.push('This is related to investments or trading.');
      if (upiMatch) parts.push(`UPI ID: ${upiMatch[1]}.`);
      if (utrMatch) parts.push(`Reference: ${utrMatch[1]}.`);

      // Extract key sentences from body
      const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.length > 20 && s.length < 200);
      const financialSentences = sentences.filter(s =>
        /amount|balance|credit|debit|paid|received|due|payment|transaction|account/i.test(s)
      );
      if (financialSentences.length > 0) {
        parts.push(financialSentences[0].trim());
      }

      return parts.join(' ').substring(0, 500) || this.generateFallbackSummary(emailData);
    } catch (error) {
      logger.warn('Local email summary failed:', error.message);
      return this.generateFallbackSummary(emailData);
    }
  }

  async saveEmailSummaryDocument(userId, emailData, summary, options = {}) {
    const safeUserId = userId.toString();
    const emailDir = path.join(process.cwd(), 'uploads', 'financial', safeUserId, 'emails');
    await fs.mkdir(emailDir, { recursive: true });

    const safeSubject = (emailData.subject || 'email-record').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'email-record';
    const safeBase = safeSubject.substring(0, 80).replace(/\s+/g, '_').toLowerCase();

    let document = await Document.findOne({
      userId,
      gmailMessageId: emailData.gmailMessageId,
      source: 'gmail_email'
    });

    const timestamp = Date.now();
    const defaultFileName = `${timestamp}_${safeBase || 'email'}_${emailData.gmailMessageId}.json`;
    const fileName = document?.fileName || defaultFileName;
    const filePath = path.join(emailDir, fileName);

    const payload = {
      gmailMessageId: emailData.gmailMessageId,
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      snippet: emailData.snippet,
      date: emailData.date,
      summary,
      bodyText: options.includeBody === false ? undefined : emailData.bodyText,
      attachments: (emailData.attachments || []).map((attachment) => ({
        documentId: attachment.documentId,
        filename: attachment.filename,
        originalFilename: attachment.originalFilename,
        size: attachment.size,
        category: attachment.category
      })),
      labels: emailData.labelIds || [],
      savedAt: new Date()
    };

    const fileContent = JSON.stringify(payload, null, 2);
    const fileSize = Buffer.byteLength(fileContent, 'utf8');

    await fs.writeFile(filePath, fileContent, 'utf8');

    const metadata = {
      dateCreated: emailData.date,
      subject: emailData.subject,
      author: emailData.from,
      keywords: this.extractKeywords(safeSubject, emailData.subject),
      emailSource: emailData.from,
      labels: emailData.labelIds || [],
      threadId: emailData.threadId
    };

    if (document) {
      document.fileName = fileName;
      document.originalFileName = `${safeSubject}.json`;
      document.fileType = 'json';
      document.fileSize = fileSize;
      document.filePath = filePath;
      document.category = 'email_record';
      document.source = 'gmail_email';
      document.isProcessed = true;
      document.processingStatus = 'completed';
      document.extractedText = emailData.bodyText;
      document.extractedData = {
        summary,
        snippet: emailData.snippet,
        from: emailData.from
      };
      document.passwordHints = emailData.passwordHints;
      document.metadata = metadata;
      document.markModified('metadata');
      document.markModified('passwordHints');
      await document.save();
    } else {
      document = await Document.create({
        userId,
        fileName,
        originalFileName: `${safeSubject}.json`,
        fileType: 'json',
        fileSize,
        filePath,
        source: 'gmail_email',
        gmailMessageId: emailData.gmailMessageId,
        category: 'email_record',
        isProcessed: true,
        processingStatus: 'completed',
        extractedText: emailData.bodyText,
        extractedData: {
          summary,
          snippet: emailData.snippet,
          from: emailData.from
        },
        passwordHints: emailData.passwordHints,
        metadata
      });
    }

    return document;
  }

  async readLatestEmails(userId, profile, options = {}) {
    const includePublic = options.includePublic === true;
    const excludeReplies = options.excludeReplies !== false;
    const includeAttachments = options.includeAttachments !== false;
    const includeBody = options.includeBody !== false;
    const includeHtml = options.includeHtml === true;
    const summarize = options.summarize !== false;
    const persistSummary = options.persistSummary !== false;
    const onlyUnread = options.onlyUnread === true;
    const useLastReadState = options.useLastReadState !== false && !options.pageToken;

    const maxResults = Math.min(Math.max(parseInt(options.maxResults, 10) || 10, 1), 50);

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const queryParts = [];
    if (options.query) {
      queryParts.push(options.query);
    }
    if (onlyUnread) {
      queryParts.push('is:unread');
    }

    const listRequest = {
      userId: 'me',
      maxResults,
      includeSpamTrash: false
    };

    if (queryParts.length) {
      listRequest.q = queryParts.join(' ');
    }
    if (options.labelIds) {
      listRequest.labelIds = Array.isArray(options.labelIds)
        ? options.labelIds
        : [options.labelIds];
    }
    if (options.pageToken) {
      listRequest.pageToken = options.pageToken;
    }

    const response = await gmail.users.messages.list(listRequest);
    let messages = response.data.messages || [];
    const resultSizeEstimate = response.data.resultSizeEstimate || 0;

    if (useLastReadState && profile?.gmailSettings?.lastReadMessageId) {
      const lastReadId = profile.gmailSettings.lastReadMessageId;
      const filteredMessages = [];
      for (const message of messages) {
        if (message.id === lastReadId) {
          break;
        }
        filteredMessages.push(message);
      }
      messages = filteredMessages;
    }

    if (!messages.length) {
      return {
        emails: [],
        stats: {
          totalFetched: 0,
          processed: 0,
          skippedReplies: 0,
          skippedPublicSenders: 0,
          summaryGenerated: 0,
          errors: 0
        },
        pagination: {
          nextPageToken: response.data.nextPageToken || null,
          resultSizeEstimate
        },
        lastRead: {
          messageId: profile?.gmailSettings?.lastReadMessageId || null,
          at: profile?.gmailSettings?.lastReadAt || null
        }
      };
    }

    messages = messages.reverse();

    const emails = [];
    const stats = {
      totalFetched: messages.length,
      processed: 0,
      skippedReplies: 0,
      skippedPublicSenders: 0,
      summaryGenerated: 0,
      errors: 0
    };

    let latestProcessedId = null;

    for (const message of messages) {
      try {
        const emailData = await this.getEmailWithAttachments(
          message.id,
          userId,
          null,
          { includeAttachments }
        );

        latestProcessedId = message.id;

        if (excludeReplies && this.replySubjectRegex.test(emailData.subject || '')) {
          stats.skippedReplies++;
          continue;
        }

        const isPublicSender = this.isPublicEmail(emailData.from, emailData.headers);
        if (!includePublic && isPublicSender) {
          stats.skippedPublicSenders++;
          continue;
        }

        let summary = null;
        if (summarize) {
          summary = await this.generateEmailSummary(emailData, profile, options.aiOptions || {});
          if (summary) {
            stats.summaryGenerated++;
          }
        }

        if (!summary) {
          summary = this.generateFallbackSummary(emailData);
        }

        let summaryDocument = null;
        if (persistSummary) {
          summaryDocument = await this.saveEmailSummaryDocument(userId, emailData, summary, {
            includeBody
          });
        }

        const emailPayload = {
          id: emailData.gmailMessageId,
          threadId: emailData.threadId,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          date: emailData.date,
          snippet: emailData.snippet,
          labels: emailData.labelIds || [],
          summary,
          attachments: includeAttachments ? emailData.attachments : [],
          isPublicSender,
          documentId: summaryDocument?._id || null
        };

        if (includeBody) {
          emailPayload.bodyText = emailData.bodyText;
          if (includeHtml && emailData.body?.html) {
            emailPayload.bodyHtml = emailData.body.html;
          }
        }

        emails.push(emailPayload);
        stats.processed++;
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing Gmail message ${message.id}:`, error);
      }
    }

    if (latestProcessedId) {
      profile.gmailSettings.lastReadMessageId = latestProcessedId;
      profile.gmailSettings.lastReadAt = new Date();
      if (stats.processed > 0) {
        profile.gmailSettings.lastReadSummaryCount = (profile.gmailSettings.lastReadSummaryCount || 0) + stats.processed;
      }
      // Use findOneAndUpdate to handle both Mongoose docs and lean objects
const FinancialProfile = require('../models/FinancialProfile');
await FinancialProfile.findOneAndUpdate(
  { userId: profile.userId || profile._id },
  { $set: { gmailSettings: profile.gmailSettings } }
);
    }

    return {
      emails,
      stats,
      pagination: {
        nextPageToken: response.data.nextPageToken || null,
        resultSizeEstimate
      },
      lastRead: {
        messageId: profile.gmailSettings.lastReadMessageId || null,
        at: profile.gmailSettings.lastReadAt || null
      }
    };
  }

  /**
   * Sync financial documents for analysis run - organizes files by run date
   */
  async syncForAnalysis(userId, profile, options = {}) {
    try {
      const runDate = new Date();
      logger.info(`Starting Gmail sync for analysis run: ${runDate.toISOString()}, user: ${userId}`);

      // Validate profile data
      logger.info('Validating Gmail settings:', {
        hasGmailSettings: !!profile.gmailSettings,
        isConnected: profile.gmailSettings?.isConnected,
        hasAccessToken: !!profile.gmailSettings?.accessToken,
        hasRefreshToken: !!profile.gmailSettings?.refreshToken
      });
      
      if (!profile.gmailSettings || !profile.gmailSettings.isConnected || !profile.gmailSettings.accessToken) {
        throw new Error('Gmail not connected. Please connect your Gmail account first.');
      }

      // Set up OAuth2 credentials
      const credentials = {
        access_token: profile.gmailSettings.accessToken,
        refresh_token: profile.gmailSettings.refreshToken
      };
      
      logger.info('Setting up OAuth2 credentials for analysis sync');
      this.setCredentials(credentials);

      // Determine sync period from options
      const dateAfter = options.dateAfter || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days
      const dateBefore = options.dateBefore || new Date();

      logger.info('Analysis sync date range:', {
        dateAfter: dateAfter.toISOString(),
        dateBefore: dateBefore.toISOString()
      });

      // Search for financial emails
      const messages = [];
      let pageToken = null;
      let estimated = 0;
      const maxMessages = options.maxResults || 100;

      do {
        const page = await this.searchFinancialEmails(userId, {
          maxResults: Math.min(500, maxMessages - messages.length),
          dateAfter,
          dateBefore,
          hasAttachment: options.hasAttachment ?? null,
          pageToken
        });

        estimated = page.resultSizeEstimate || estimated;
        if (page.messages && page.messages.length) {
          messages.push(...page.messages);
        }

        pageToken = page.nextPageToken;
      } while (pageToken && messages.length < maxMessages);

      logger.info(`Analysis Gmail search collected ${messages.length} messages (estimate: ${estimated})`);

      const results = {
        runDate: runDate,
        totalEmails: messages.length,
        processedEmails: 0,
        downloadedAttachments: 0,
        upiEmailsProcessed: 0,
        upiTransactionsCreated: 0,
        emailTransactionsCreated: 0,
        emailTransactionsSummaries: [],
        duplicatesSkipped: 0,
        downloadedFiles: [],
        upiSummaries: [],
        errors: []
      };

      // Process each message with run date for organized folder structure
      for (const message of messages) {
        try {
          const existingEmailDoc = await Document.exists({ userId, gmailMessageId: message.id, source: 'gmail_email' });
          const existingAttachmentDoc = await Document.exists({ userId, gmailMessageId: message.id, source: 'gmail' });

          if (existingEmailDoc && existingAttachmentDoc && !options.forceResync) {
            results.duplicatesSkipped++;
            logger.info(`Analysis sync: skipping already processed message ${message.id}`);
            continue;
          }

          const emailData = await this.getEmailWithAttachments(message.id, userId, runDate);
          results.processedEmails++;
          results.downloadedAttachments += emailData.attachments.length;
          
          // Collect downloaded file paths with enhanced metadata
          emailData.attachments.forEach(attachment => {
            results.downloadedFiles.push({
              filename: attachment.filename,
              originalFilename: attachment.originalFilename,
              documentId: attachment.documentId,
              category: attachment.category,
              priority: attachment.priority || 'medium',
              confidence: attachment.confidence || 0.5,
              size: attachment.size,
              emailSubject: emailData.subject,
              emailFrom: emailData.from,
              emailDate: emailData.date
            });
          });

          const upiTransactions = this.extractUPITransactions(emailData);
          if (upiTransactions.length) {
            const persisted = await this.persistUPITransactions(userId, emailData, upiTransactions);
            if (persisted.count > 0) {
              results.upiEmailsProcessed++;
              results.upiTransactionsCreated += persisted.count;
              results.upiSummaries.push({
                documentId: persisted.documentId,
                gmailMessageId: emailData.gmailMessageId,
                transactions: persisted.transactionsPreview
              });
            }
          }

          // ── Enhanced Email Transaction Parsing (non-UPI) ──────────────
          // Parse bank alerts, CC charges, NEFT/RTGS/IMPS, salary, EMI, etc.
          if (!upiTransactions.length) {
            try {
              const parsedTx = parseEmailTransaction(emailData);
              if (parsedTx && parsedTx.paymentMethod !== 'upi') {
                const persisted = await this.persistEmailTransactions(userId, emailData, parsedTx);
                if (persisted.count > 0) {
                  results.emailTransactionsCreated += persisted.count;
                  results.emailTransactionsSummaries.push({
                    documentId: persisted.documentId,
                    gmailMessageId: emailData.gmailMessageId,
                    transactions: persisted.transactionsPreview
                  });
                }
              }
            } catch (parseErr) {
              logger.warn(`Email parser error for message ${message.id}: ${parseErr.message}`);
            }
          }
          
          logger.info(`Analysis sync processed email: ${emailData.subject} (attachments: ${emailData.attachments.length}, UPI: ${upiTransactions.length})`);
        } catch (error) {
          logger.error(`Error processing message ${message.id}:`, error);
          results.errors.push({
            messageId: message.id,
            error: error.message
          });
        }
      }

      // Process downloaded files BEFORE returning (wait for transactions to be extracted)
      if (results.downloadedFiles.length > 0) {
        logger.info(`Processing ${results.downloadedFiles.length} downloaded files immediately for analysis...`);
        try {
          const processingResults = await this.processDownloadedFiles(results.downloadedFiles, userId, runDate);
          
          // Add processing results to return data
          results.processingResults = {
            totalFiles: processingResults.totalFiles,
            processedFiles: processingResults.processedFiles,
            extractedTransactions: processingResults.extractedTransactions,
            createdAnalyses: processingResults.createdAnalyses,
            errors: processingResults.errors
          };
          
          logger.info(`Document processing completed: ${processingResults.extractedTransactions} transactions extracted from ${processingResults.processedFiles} files`);
        } catch (error) {
          logger.error('Error in automatic document processing:', error);
          results.processingResults = {
            totalFiles: results.downloadedFiles.length,
            processedFiles: 0,
            extractedTransactions: 0,
            createdAnalyses: 0,
            errors: [{ error: error.message }]
          };
        }
      }

      // Don't update lastSync for analysis runs (keep regular sync separate)
      logger.info(`Analysis Gmail sync completed for user ${userId}:`, {
        runDate: runDate.toISOString(),
        totalEmails: results.totalEmails,
        downloadedAttachments: results.downloadedAttachments,
        extractedTransactions: results.processingResults?.extractedTransactions || 0,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      logger.error(`Analysis Gmail sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync financial documents for a user
   */
  async syncFinancialDocuments(userId, profile, options = {}) {
    try {
      logger.info(`Starting Gmail sync for user ${userId}`);

      // Validate profile data
      if (!profile.gmailSettings || !profile.gmailSettings.accessToken) {
        throw new Error('Invalid Gmail settings in profile - missing access token');
      }

      logger.info('Profile Gmail settings validation:', {
        hasGmailSettings: !!profile.gmailSettings,
        isConnected: profile.gmailSettings.isConnected,
        hasAccessToken: !!profile.gmailSettings.accessToken,
        hasRefreshToken: !!profile.gmailSettings.refreshToken,
        email: profile.gmailSettings.email
      });

      // Set up OAuth2 credentials
      const credentials = {
        access_token: profile.gmailSettings.accessToken,
        refresh_token: profile.gmailSettings.refreshToken
      };
      
      logger.info('Setting up OAuth2 credentials for sync');
      this.setCredentials(credentials);

      const syncStartedAt = new Date();
      const settings = profile.gmailSettings || {};
      const isInitialSync = !settings.initialSyncCompleted;
      if (isInitialSync) {
        profile.gmailSettings.initialSyncStartedAt = syncStartedAt;
      }

      const fallbackDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const requestedAfter = options.dateAfter ? new Date(options.dateAfter) : null;
      const computedDateAfter = isInitialSync ? null : (requestedAfter || settings.lastMessageInternalDate || settings.lastSync || fallbackDate);
      const computedDateBefore = options.dateBefore ? new Date(options.dateBefore) : null;

      logger.info('Computed Gmail sync window:', {
        isInitialSync,
        dateAfter: computedDateAfter ? computedDateAfter.toISOString() : null,
        dateBefore: computedDateBefore ? computedDateBefore.toISOString() : null
      });

      // Collect messages with pagination support
      const messages = [];
      let pageToken = null;
      let estimatedTotal = 0;
      const shouldFetchAllPages = isInitialSync && !options.maxResults;
      const maxMessages = options.maxResults || (shouldFetchAllPages ? Number.MAX_SAFE_INTEGER : 200);

      do {
        const remaining = maxMessages === Number.MAX_SAFE_INTEGER ? 500 : Math.min(500, maxMessages - messages.length);
        if (remaining <= 0) {
          break;
        }

        const page = await this.searchFinancialEmails(userId, {
          maxResults: remaining,
          dateAfter: computedDateAfter,
          dateBefore: computedDateBefore,
          hasAttachment: isInitialSync ? null : options.hasAttachment ?? null,
          pageToken
        });

        estimatedTotal = page.resultSizeEstimate || estimatedTotal;
        if (page.messages && page.messages.length) {
          messages.push(...page.messages);
        }

        pageToken = page.nextPageToken;
      } while (pageToken && (shouldFetchAllPages || messages.length < maxMessages));

      logger.info(`Collected ${messages.length} messages for processing (estimate: ${estimatedTotal})`);

      const results = {
        isInitialSync,
        totalEmails: messages.length,
        estimatedTotal,
        processedEmails: 0,
        downloadedAttachments: 0,
        upiEmailsProcessed: 0,
        upiTransactionsCreated: 0,
        emailTransactionsCreated: 0,
        emailTransactionsSummaries: [],
        duplicatesSkipped: 0,
        downloadedFiles: [],
        upiSummaries: [],
        errors: []
      };

      let latestInternalDate = settings.lastMessageInternalDate ? new Date(settings.lastMessageInternalDate) : null;
      let latestHistoryId = settings.lastHistoryId || null;

      for (const message of messages) {
        try {
          const existingEmailDoc = await Document.exists({ userId, gmailMessageId: message.id, source: 'gmail_email' });
          const existingAttachmentDoc = await Document.exists({ userId, gmailMessageId: message.id, source: 'gmail' });

          if (existingEmailDoc && existingAttachmentDoc && !options.forceResync) {
            results.duplicatesSkipped++;
            logger.info(`Skipping Gmail message ${message.id} - already processed.`);
            continue;
          }

          const emailData = await this.getEmailWithAttachments(message.id, userId);
          results.processedEmails++;
          results.downloadedAttachments += emailData.attachments.length;

          if (emailData.attachments.length) {
            emailData.attachments.forEach(attachment => {
              results.downloadedFiles.push({
                filename: attachment.filename,
                originalFilename: attachment.originalFilename,
                documentId: attachment.documentId,
                category: attachment.category,
                priority: attachment.priority || 'medium',
                confidence: attachment.confidence || 0.5,
                size: attachment.size,
                emailSubject: emailData.subject,
                emailFrom: emailData.from,
                emailDate: emailData.date
              });
            });
          }

          const upiTransactions = this.extractUPITransactions(emailData);
          if (upiTransactions.length) {
            const persisted = await this.persistUPITransactions(userId, emailData, upiTransactions);
            if (persisted.count > 0) {
              results.upiEmailsProcessed++;
              results.upiTransactionsCreated += persisted.count;
              results.upiSummaries.push({
                documentId: persisted.documentId,
                gmailMessageId: emailData.gmailMessageId,
                transactions: persisted.transactionsPreview
              });
            }
          }

          // ── Enhanced Email Transaction Parsing (non-UPI) ──────────────
          if (!upiTransactions.length) {
            try {
              const parsedTx = parseEmailTransaction(emailData);
              if (parsedTx && parsedTx.paymentMethod !== 'upi') {
                const persisted = await this.persistEmailTransactions(userId, emailData, parsedTx);
                if (persisted.count > 0) {
                  results.emailTransactionsCreated += persisted.count;
                  results.emailTransactionsSummaries.push({
                    documentId: persisted.documentId,
                    gmailMessageId: emailData.gmailMessageId,
                    transactions: persisted.transactionsPreview
                  });
                }
              }
            } catch (parseErr) {
              logger.warn(`Email parser error for message ${message.id}: ${parseErr.message}`);
            }
          }

          if (emailData.date && (!latestInternalDate || emailData.date > latestInternalDate)) {
            latestInternalDate = emailData.date;
          }

          if (emailData.historyId) {
            latestHistoryId = emailData.historyId;
          }

          logger.info(`Processed email: ${emailData.subject} (attachments: ${emailData.attachments.length}, UPI: ${upiTransactions.length})`);
        } catch (error) {
          logger.error(`Error processing message ${message.id}:`, error);
          results.errors.push({
            messageId: message.id,
            error: error.message
          });
        }
      }

      // Update profile sync metadata
      profile.gmailSettings.lastSync = syncStartedAt;
      profile.gmailSettings.lastAttachmentSyncCount = results.downloadedAttachments;
      profile.gmailSettings.totalMessagesSynced = (profile.gmailSettings.totalMessagesSynced || 0) + results.processedEmails;

      if (latestInternalDate) {
        profile.gmailSettings.lastMessageInternalDate = latestInternalDate;
      }

      if (latestHistoryId) {
        profile.gmailSettings.lastHistoryId = latestHistoryId;
      }

      if (isInitialSync) {
        profile.gmailSettings.initialSyncCompleted = true;
        profile.gmailSettings.lastFullSyncAt = syncStartedAt;
      }

      // Use findOneAndUpdate to handle both Mongoose docs and lean objects
const FinancialProfile = require('../models/FinancialProfile');
await FinancialProfile.findOneAndUpdate(
  { userId: profile.userId || profile._id },
  { $set: { gmailSettings: profile.gmailSettings } }
);

      logger.info(`Gmail sync completed for user ${userId}:`, {
        ...results,
        latestInternalDate: latestInternalDate ? latestInternalDate.toISOString() : null,
        lastHistoryId: latestHistoryId
      });

      return results;

    } catch (error) {
      logger.error(`Gmail sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Automatically process downloaded financial documents
   * @param {Array} downloadedFiles - Array of downloaded file objects
   * @param {String} userId - User ID
   * @param {String} runDate - Run date for organization
   */
  async processDownloadedFiles(downloadedFiles, userId, runDate) {
    const documentProcessor = require('./documentProcessor');
    const Analysis = require('../models/Analysis');
    
    const processingResults = {
      totalFiles: downloadedFiles.length,
      processedFiles: 0,
      extractedTransactions: 0,
      createdAnalyses: 0,
      errors: []
    };

    logger.info(`Starting automatic processing for ${downloadedFiles.length} downloaded files`);

    // Group files by category for batch processing
    const filesByCategory = {};
    downloadedFiles.forEach(file => {
      const category = file.category || 'other';
      if (!filesByCategory[category]) {
        filesByCategory[category] = [];
      }
      filesByCategory[category].push(file);
    });

    // Process files by category (prioritize high-confidence files)
    const categories = Object.keys(filesByCategory).sort((a, b) => {
      const avgConfidenceA = filesByCategory[a].reduce((sum, f) => sum + (f.confidence || 0.5), 0) / filesByCategory[a].length;
      const avgConfidenceB = filesByCategory[b].reduce((sum, f) => sum + (f.confidence || 0.5), 0) / filesByCategory[b].length;
      return avgConfidenceB - avgConfidenceA;
    });

    for (const category of categories) {
      const files = filesByCategory[category];
      logger.info(`Processing ${files.length} files in category: ${category}`);

      for (const file of files) {
        try {
          logger.info(`Processing document ID: ${file.documentId}, filename: ${file.originalFilename}`);
          
          // Process the document using documentProcessor.processDocumentById
          // This will extract transactions and save them to the database
          const extractedData = await documentProcessor.processDocumentById(file.documentId);

          if (extractedData && extractedData.transactions && extractedData.transactions.length > 0) {
            processingResults.processedFiles++;
            processingResults.extractedTransactions += extractedData.transactions.length;

            logger.info(`Successfully processed: ${file.originalFilename} (${extractedData.transactions.length} transactions)`);
          } else {
            logger.warn(`No transactions extracted from: ${file.originalFilename}`);
            processingResults.processedFiles++;
          }

        } catch (error) {
          logger.error(`Error processing file ${file.originalFilename}:`, error);
          processingResults.errors.push({
            filename: file.originalFilename,
            error: error.message
          });
        }
      }
    }

    logger.info('Automatic document processing completed:', processingResults);
    return processingResults;
  }
}

const gmailServiceSingleton = new GmailService();

// Expose helper factories on the singleton so existing imports can access them
gmailServiceSingleton.getAuthInstance = GmailService.getAuthInstance.bind(GmailService);
gmailServiceSingleton.getUserInstance = GmailService.getUserInstance.bind(GmailService);
gmailServiceSingleton.GmailService = GmailService;

module.exports = gmailServiceSingleton;