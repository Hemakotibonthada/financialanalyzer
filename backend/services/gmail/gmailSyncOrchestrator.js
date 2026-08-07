// ============================================================
// Gmail Sync Orchestrator Service
// ============================================================
// Central coordinator for the multi-stage Gmail sync pipeline.
// Manages fetch → parse → classify → extract → store → analyze
// with progress tracking, retry logic, and real-time updates.
// ============================================================

'use strict';

const { google } = require('googleapis');
const logger = require('../../utils/logger');
const EventEmitter = require('events');

// ============================================================
// SYNC STATE MACHINE
// ============================================================

const SYNC_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  FETCHING_MESSAGES: 'fetching_messages',
  DOWNLOADING_CONTENT: 'downloading_content',
  CLASSIFYING: 'classifying',
  EXTRACTING_TRANSACTIONS: 'extracting_transactions',
  PARSING_STATEMENTS: 'parsing_statements',
  STORING_DATA: 'storing_data',
  ANALYZING: 'analyzing',
  RECONCILING: 'reconciling',
  GENERATING_INSIGHTS: 'generating_insights',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const SYNC_MODES = {
  FULL: 'full',             // Complete historical sync
  INCREMENTAL: 'incremental', // Only new messages since last sync
  SELECTIVE: 'selective',    // Specific date range or sender
  ATTACHMENT_ONLY: 'attachment_only', // Only download attachments
  REPROCESS: 'reprocess'    // Re-analyze existing emails
};

// ============================================================
// MESSAGE BATCH PROCESSOR
// ============================================================

class MessageBatchProcessor {
  constructor(batchSize = 25) {
    this.batchSize = batchSize;
    this.processed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.results = [];
  }

  async processBatch(messages, processFn) {
    const batches = [];
    for (let i = 0; i < messages.length; i += this.batchSize) {
      batches.push(messages.slice(i, i + this.batchSize));
    }

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(msg => processFn(msg))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          this.processed++;
          if (result.value) {
            this.results.push(result.value);
          }
        } else {
          this.failed++;
          logger.warn('Batch item failed:', result.reason?.message);
        }
      }
    }

    return {
      processed: this.processed,
      failed: this.failed,
      skipped: this.skipped,
      results: this.results
    };
  }
}

// ============================================================
// RATE LIMITER (Google API quota management)
// ============================================================

class GmailRateLimiter {
  constructor(maxRequestsPerSecond = 10) {
    this.maxRPS = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this._processQueue();
    });
  }

  _processQueue() {
    if (this.processing) return;
    this.processing = true;

    const process = () => {
      this._refillTokens();

      while (this.queue.length > 0 && this.tokens > 0) {
        this.tokens--;
        const resolve = this.queue.shift();
        resolve();
      }

      if (this.queue.length > 0) {
        setTimeout(process, 100);
      } else {
        this.processing = false;
      }
    };

    process();
  }

  _refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxRPS, this.tokens + elapsed * this.maxRPS);
    this.lastRefill = now;
  }
}

// ============================================================
// SYNC PROGRESS TRACKER
// ============================================================

class SyncProgressTracker extends EventEmitter {
  constructor(syncId, userId) {
    super();
    this.syncId = syncId;
    this.userId = userId;
    this.startTime = Date.now();
    this.state = SYNC_STATES.IDLE;
    this.progress = {
      phase: 'idle',
      current: 0,
      total: 0,
      percentage: 0,
      messagesFound: 0,
      messagesProcessed: 0,
      transactionsExtracted: 0,
      statementsDownloaded: 0,
      emailsClassified: 0,
      errorsCount: 0,
      warnings: [],
      estimatedTimeRemaining: null
    };
    this.history = [];
  }

  updateState(newState, details = {}) {
    const prevState = this.state;
    this.state = newState;
    this.progress.phase = newState;

    Object.assign(this.progress, details);

    if (details.current !== undefined && details.total) {
      this.progress.percentage = Math.round((details.current / details.total) * 100);
    }

    // Estimate time remaining
    if (this.progress.current > 0 && this.progress.total > 0) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.progress.current / elapsed;
      const remaining = this.progress.total - this.progress.current;
      this.progress.estimatedTimeRemaining = Math.round(remaining / rate);
    }

    this.history.push({
      from: prevState,
      to: newState,
      timestamp: Date.now(),
      details
    });

    this.emit('progress', this.getSnapshot());
  }

  incrementProcessed() {
    this.progress.messagesProcessed++;
    this.progress.current = this.progress.messagesProcessed;
    this.emit('progress', this.getSnapshot());
  }

  incrementTransactions(count = 1) {
    this.progress.transactionsExtracted += count;
  }

  incrementStatements(count = 1) {
    this.progress.statementsDownloaded += count;
  }

  addWarning(warning) {
    this.progress.warnings.push(warning);
    this.progress.errorsCount++;
  }

  getSnapshot() {
    return {
      syncId: this.syncId,
      userId: this.userId,
      state: this.state,
      progress: { ...this.progress },
      elapsed: Date.now() - this.startTime,
      history: this.history.length
    };
  }

  getSummary() {
    return {
      syncId: this.syncId,
      state: this.state,
      duration: Date.now() - this.startTime,
      messagesFound: this.progress.messagesFound,
      messagesProcessed: this.progress.messagesProcessed,
      transactionsExtracted: this.progress.transactionsExtracted,
      statementsDownloaded: this.progress.statementsDownloaded,
      emailsClassified: this.progress.emailsClassified,
      errorsCount: this.progress.errorsCount,
      warnings: this.progress.warnings.slice(0, 20)
    };
  }
}

// ============================================================
// DUPLICATE DETECTOR
// ============================================================

class EmailDuplicateDetector {
  constructor() {
    this.seenMessageIds = new Set();
    this.seenHashes = new Set();
  }

  isDuplicate(messageId, contentHash = null) {
    if (this.seenMessageIds.has(messageId)) {
      return true;
    }
    if (contentHash && this.seenHashes.has(contentHash)) {
      return true;
    }
    this.seenMessageIds.add(messageId);
    if (contentHash) {
      this.seenHashes.add(contentHash);
    }
    return false;
  }

  async checkDatabase(GmailEmailModel, userId, messageIds) {
    const existing = await GmailEmailModel.find(
      { userId, gmailMessageId: { $in: messageIds } },
      { gmailMessageId: 1 }
    ).lean();

    const existingSet = new Set(existing.map(e => e.gmailMessageId));
    return messageIds.filter(id => !existingSet.has(id));
  }
}

// ============================================================
// ATTACHMENT DOWNLOADER
// ============================================================

class AttachmentDownloader {
  constructor(gmail, rateLimiter) {
    this.gmail = gmail;
    this.rateLimiter = rateLimiter;
    this.downloadedCount = 0;
    this.totalBytes = 0;
  }

  async downloadAttachment(messageId, attachmentId, filename) {
    await this.rateLimiter.acquire();
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      if (!response.data || !response.data.data) {
        logger.warn(`Empty attachment data for ${filename} in message ${messageId}`);
        return null;
      }

      const data = Buffer.from(response.data.data, 'base64');
      this.downloadedCount++;
      this.totalBytes += data.length;

      return {
        filename,
        data,
        size: data.length,
        mimeType: this._guessMimeType(filename)
      };
    } catch (error) {
      logger.error(`Failed to download attachment ${filename}:`, error.message);
      return null;
    }
  }

  _guessMimeType(filename) {
    const ext = (filename || '').toLowerCase().split('.').pop();
    const mimeMap = {
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'txt': 'text/plain',
      'html': 'text/html'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  getStats() {
    return {
      downloadedCount: this.downloadedCount,
      totalBytes: this.totalBytes,
      totalMB: (this.totalBytes / (1024 * 1024)).toFixed(2)
    };
  }
}

// ============================================================
// EMAIL CONTENT PARSER
// ============================================================

class EmailContentParser {
  parseMessage(messageData) {
    const headers = messageData.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const parsed = {
      messageId: messageData.id,
      threadId: messageData.threadId,
      labelIds: messageData.labelIds || [],
      snippet: messageData.snippet || '',
      internalDate: parseInt(messageData.internalDate || '0'),
      sizeEstimate: messageData.sizeEstimate || 0,
      from: this._parseEmailAddress(getHeader('From')),
      to: this._parseEmailAddress(getHeader('To')),
      cc: getHeader('Cc'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      contentType: getHeader('Content-Type'),
      body: { text: '', html: '' },
      attachments: [],
      isRead: !messageData.labelIds?.includes('UNREAD'),
      isImportant: messageData.labelIds?.includes('IMPORTANT'),
      isStarred: messageData.labelIds?.includes('STARRED')
    };

    // Extract body and attachments
    this._extractParts(messageData.payload, parsed);

    return parsed;
  }

  _parseEmailAddress(raw) {
    if (!raw) return { name: '', email: '' };
    const match = raw.match(/^(?:"?([^"]*?)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
    if (match) {
      return { name: (match[1] || '').trim(), email: (match[2] || '').trim().toLowerCase() };
    }
    return { name: '', email: raw.trim().toLowerCase() };
  }

  _extractParts(part, parsed) {
    if (!part) return;

    const mimeType = part.mimeType || '';

    if (part.filename && part.body?.attachmentId) {
      parsed.attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: mimeType,
        size: part.body.size || 0
      });
    }

    if (mimeType === 'text/plain' && part.body?.data) {
      parsed.body.text += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (mimeType === 'text/html' && part.body?.data) {
      parsed.body.html += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        this._extractParts(subPart, parsed);
      }
    }
  }
}

// ============================================================
// FINANCIAL EMAIL CLASSIFIER
// ============================================================

class FinancialEmailClassifier {
  constructor() {
    this.categories = {
      bank_alert: {
        senderPatterns: [/@sbi\.co\.in$/i, /@icicibank\.com$/i, /@hdfcbank\.com$/i, /@axisbank\.com$/i, /@kotak\.com$/i, /@yesbank\.in$/i, /@pnb\.co\.in$/i, /@canarabank\.com$/i, /@bankofbaroda\.com$/i, /@idfc\.com$/i, /@indusind\.com$/i, /@rbl\.com$/i],
        subjectPatterns: [/transaction\s*alert/i, /debit\s*alert/i, /credit\s*alert/i, /account\s*alert/i, /balance\s*alert/i, /atm\s*withdrawal/i],
        priority: 'high',
        weight: 10
      },
      upi_transaction: {
        senderPatterns: [/@paytm\.com$/i, /@phonepe\.com$/i, /@googlepay\.com$/i, /@cred\.club$/i, /@bharatpe\.com$/i, /@amazonpay\.in$/i, /@mobikwik\.com$/i],
        subjectPatterns: [/upi\s*transaction/i, /money\s*(sent|received|transferred)/i, /payment\s*(successful|confirmed)/i, /₹\s*[\d,]+/],
        priority: 'high',
        weight: 9
      },
      credit_card: {
        senderPatterns: [/@americanexpress\.com$/i, /@hdfcbank\.com$/i, /@icicibank\.com$/i, /@sbicard\.com$/i, /@axisbank\.com$/i, /@citibank\.com$/i],
        subjectPatterns: [/credit\s*card\s*statement/i, /card\s*transaction/i, /outstanding\s*amount/i, /minimum\s*due/i, /credit\s*card\s*bill/i],
        priority: 'high',
        weight: 9
      },
      bank_statement: {
        senderPatterns: [/@sbi\.co\.in$/i, /@icicibank\.com$/i, /@hdfcbank\.com$/i, /@axisbank\.com$/i],
        subjectPatterns: [/account\s*statement/i, /monthly\s*statement/i, /quarterly\s*statement/i, /e-?statement/i, /passbook\s*update/i],
        priority: 'high',
        weight: 8
      },
      investment: {
        senderPatterns: [/@zerodha\.com$/i, /@groww\.in$/i, /@kuvera\.in$/i, /@etmoney\.com$/i, /@upstox\.com$/i, /@angel\.co\.in$/i, /@icicidirect\.com$/i, /@5paisa\.com$/i],
        subjectPatterns: [/mutual\s*fund/i, /sip\s*(payment|confirmation)/i, /portfolio\s*update/i, /stock\s*(purchased|sold)/i, /trade\s*confirmation/i, /dividend/i, /nfo/i],
        priority: 'medium',
        weight: 7
      },
      insurance: {
        senderPatterns: [/@lic\.in$/i, /@sbilife\.co\.in$/i, /@maxlifeinsurance\.com$/i, /@bajajfinserv\.in$/i, /@tataaia\.com$/i, /@hdfclife\.com$/i],
        subjectPatterns: [/insurance\s*premium/i, /policy\s*(renewal|update)/i, /claim\s*(settlement|status)/i, /sum\s*assured/i],
        priority: 'medium',
        weight: 6
      },
      loan_emi: {
        senderPatterns: [/@hdfcbank\.com$/i, /@icicibank\.com$/i, /@sbi\.co\.in$/i, /@bajajfinserv\.in$/i],
        subjectPatterns: [/emi\s*(due|payment|reminder)/i, /loan\s*(statement|account)/i, /installment/i, /repayment/i, /foreclosure/i],
        priority: 'high',
        weight: 8
      },
      salary: {
        subjectPatterns: [/salary\s*(credit|credited)/i, /payslip/i, /pay\s*slip/i, /salary\s*slip/i, /wages?\s*credited/i, /ctc/i],
        bodyPatterns: [/salary\s*credit/i, /net\s*pay/i, /gross\s*salary/i, /basic\s*pay/i],
        priority: 'high',
        weight: 9
      },
      tax: {
        senderPatterns: [/@incometax\.gov\.in$/i, /@cleartax\.in$/i],
        subjectPatterns: [/form\s*16/i, /tds\s*certificate/i, /itr\s*(filed|acknowledgement)/i, /tax\s*refund/i, /26as/i, /interest\s*certificate/i],
        priority: 'medium',
        weight: 6
      },
      recharge_bill: {
        senderPatterns: [/@jio\.com$/i, /@airtel\.in$/i, /@vodafone\.in$/i, /@bsnl\.co\.in$/i],
        subjectPatterns: [/recharge\s*(successful|confirmation)/i, /bill\s*payment/i, /utility\s*bill/i, /electricity\s*bill/i, /water\s*bill/i, /gas\s*bill/i],
        priority: 'low',
        weight: 4
      },
      ecommerce: {
        senderPatterns: [/@amazon\.in$/i, /@flipkart\.com$/i, /@myntra\.com$/i, /@zomato\.com$/i, /@swiggy\.in$/i, /@makemytrip\.com$/i, /@olacabs\.com$/i, /@uber\.com$/i],
        subjectPatterns: [/order\s*(confirmed|placed|delivered)/i, /invoice/i, /payment\s*receipt/i, /booking\s*confirmation/i, /ride\s*receipt/i],
        priority: 'low',
        weight: 3
      }
    };
  }

  classify(parsedEmail) {
    const scores = {};
    let bestCategory = 'uncategorized';
    let bestScore = 0;

    const senderEmail = parsedEmail.from?.email || '';
    const subject = parsedEmail.subject || '';
    const bodyText = (parsedEmail.body?.text || '').substring(0, 2000);

    for (const [category, rules] of Object.entries(this.categories)) {
      let score = 0;

      // Check sender patterns
      if (rules.senderPatterns) {
        for (const pattern of rules.senderPatterns) {
          if (pattern.test(senderEmail)) {
            score += rules.weight * 2;
            break;
          }
        }
      }

      // Check subject patterns
      if (rules.subjectPatterns) {
        for (const pattern of rules.subjectPatterns) {
          if (pattern.test(subject)) {
            score += rules.weight * 1.5;
          }
        }
      }

      // Check body patterns
      if (rules.bodyPatterns) {
        for (const pattern of rules.bodyPatterns) {
          if (pattern.test(bodyText)) {
            score += rules.weight;
          }
        }
      }

      scores[category] = score;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return {
      category: bestCategory,
      confidence: bestScore > 0 ? Math.min(1, bestScore / 30) : 0,
      scores,
      priority: this.categories[bestCategory]?.priority || 'low',
      isFinancial: bestScore > 5
    };
  }

  classifyBatch(emails) {
    return emails.map(email => ({
      messageId: email.messageId,
      ...this.classify(email)
    }));
  }
}

// ============================================================
// SYNC HISTORY MANAGER
// ============================================================

class SyncHistoryManager {
  constructor() {
    this.activeSyncs = new Map();
    this.history = [];
  }

  startSync(syncId, userId, mode) {
    const tracker = new SyncProgressTracker(syncId, userId);
    this.activeSyncs.set(syncId, {
      tracker,
      mode,
      startTime: Date.now()
    });
    return tracker;
  }

  endSync(syncId, status = 'completed') {
    const sync = this.activeSyncs.get(syncId);
    if (sync) {
      const summary = sync.tracker.getSummary();
      summary.status = status;
      summary.mode = sync.mode;
      this.history.push(summary);
      this.activeSyncs.delete(syncId);
      return summary;
    }
    return null;
  }

  getActiveSync(userId) {
    for (const [syncId, sync] of this.activeSyncs) {
      if (sync.tracker.userId === userId) {
        return sync.tracker.getSnapshot();
      }
    }
    return null;
  }

  getHistory(userId, limit = 20) {
    return this.history
      .filter(s => s.userId === userId)
      .slice(-limit)
      .reverse();
  }

  isUserSyncing(userId) {
    for (const sync of this.activeSyncs.values()) {
      if (sync.tracker.userId === userId) {
        return true;
      }
    }
    return false;
  }
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

class GmailSyncOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.historyManager = new SyncHistoryManager();
    this.rateLimiter = new GmailRateLimiter(8);
    this.contentParser = new EmailContentParser();
    this.classifier = new FinancialEmailClassifier();
    this.duplicateDetector = new EmailDuplicateDetector();
  }

  // ─── Main sync entry point ──────────────────────────────────
  async executeSync(userId, oauth2Client, profile, options = {}) {
    const syncId = `sync_${userId}_${Date.now()}`;
    const mode = options.mode || SYNC_MODES.INCREMENTAL;

    // Prevent concurrent syncs
    if (this.historyManager.isUserSyncing(userId)) {
      return { success: false, message: 'A sync is already in progress for this user' };
    }

    const tracker = this.historyManager.startSync(syncId, userId, mode);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      // Phase 1: Fetch message list
      tracker.updateState(SYNC_STATES.FETCHING_MESSAGES, { phase: 'Fetching message list...' });
      const messageList = await this._fetchMessageList(gmail, profile, mode, options);
      tracker.updateState(SYNC_STATES.FETCHING_MESSAGES, {
        messagesFound: messageList.length,
        total: messageList.length
      });

      if (messageList.length === 0) {
        tracker.updateState(SYNC_STATES.COMPLETED);
        return this.historyManager.endSync(syncId, 'completed');
      }

      // Phase 2: Filter duplicates
      let GmailEmail;
      try { GmailEmail = require('../../models/GmailEmail'); } catch (e) { /* model not loaded */ }
      let newMessageIds = messageList.map(m => m.id);
      if (GmailEmail) {
        newMessageIds = await this.duplicateDetector.checkDatabase(GmailEmail, userId, newMessageIds);
      }
      logger.info(`After duplicate check: ${newMessageIds.length} new messages (${messageList.length - newMessageIds.length} already stored)`);

      // Phase 3: Download full message content
      tracker.updateState(SYNC_STATES.DOWNLOADING_CONTENT, { total: newMessageIds.length });
      const fullMessages = await this._downloadMessages(gmail, newMessageIds, tracker);

      // Phase 4: Parse message content
      const parsedMessages = fullMessages.map(msg => this.contentParser.parseMessage(msg));

      // Phase 5: Classify emails
      tracker.updateState(SYNC_STATES.CLASSIFYING, { total: parsedMessages.length });
      const classifiedEmails = parsedMessages.map(parsed => ({
        ...parsed,
        classification: this.classifier.classify(parsed)
      }));
      tracker.progress.emailsClassified = classifiedEmails.length;

      const financialEmails = classifiedEmails.filter(e => e.classification.isFinancial);
      logger.info(`Classified: ${financialEmails.length} financial out of ${classifiedEmails.length} total`);

      // Phase 6: Download attachments for financial emails
      const attachmentDownloader = new AttachmentDownloader(gmail, this.rateLimiter);
      const emailsWithAttachments = [];

      for (const email of financialEmails) {
        const downloadedAttachments = [];
        for (const att of email.attachments) {
          if (this._isFinancialAttachment(att.filename)) {
            const downloaded = await attachmentDownloader.downloadAttachment(
              email.messageId, att.attachmentId, att.filename
            );
            if (downloaded) {
              downloadedAttachments.push(downloaded);
              tracker.incrementStatements();
            }
          }
        }
        emailsWithAttachments.push({
          ...email,
          downloadedAttachments
        });
      }

      // Phase 7: Extract transactions from email body
      tracker.updateState(SYNC_STATES.EXTRACTING_TRANSACTIONS);
      let extractedTransactions = [];
      try {
        const { EmailTransactionExtractor } = require('./emailTransactionExtractor');
        const extractor = new EmailTransactionExtractor();
        for (const email of emailsWithAttachments) {
          const txns = await extractor.extractFromEmail(email);
          extractedTransactions.push(...txns);
          tracker.incrementTransactions(txns.length);
        }
      } catch (e) {
        logger.warn('Transaction extraction module not available:', e.message);
      }

      // Phase 8: Parse bank statements from attachments
      tracker.updateState(SYNC_STATES.PARSING_STATEMENTS);
      let parsedStatements = [];
      try {
        const { BankStatementParserService } = require('./bankStatementParserService');
        const parser = new BankStatementParserService();
        for (const email of emailsWithAttachments) {
          for (const att of email.downloadedAttachments) {
            if (att.mimeType === 'application/pdf' || att.filename.endsWith('.csv')) {
              try {
                const statementData = await parser.parseStatement(att.data, att.filename, att.mimeType);
                if (statementData && statementData.transactions?.length > 0) {
                  parsedStatements.push({
                    filename: att.filename,
                    emailMessageId: email.messageId,
                    ...statementData
                  });
                }
              } catch (parseErr) {
                tracker.addWarning(`Failed to parse ${att.filename}: ${parseErr.message}`);
              }
            }
          }
        }
      } catch (e) {
        logger.warn('Statement parser module not available:', e.message);
      }

      // Phase 9: Store emails in database
      tracker.updateState(SYNC_STATES.STORING_DATA);
      let storedCount = 0;
      if (GmailEmail) {
        try {
          const { EmailStorageService } = require('./emailStorageService');
          const storage = new EmailStorageService();
          for (const email of emailsWithAttachments) {
            try {
              await storage.storeEmail(userId, email);
              storedCount++;
            } catch (storeErr) {
              if (storeErr.code === 11000) {
                // Duplicate — skip silently
              } else {
                tracker.addWarning(`Failed to store email ${email.messageId}: ${storeErr.message}`);
              }
            }
          }
        } catch (e) {
          logger.warn('Storage module not available:', e.message);
        }
      }

      // Phase 10: AI Analysis
      tracker.updateState(SYNC_STATES.ANALYZING);
      let aiInsights = null;
      try {
        const { GmailAIAnalysisEngine } = require('./gmailAIAnalysisEngine');
        const aiEngine = new GmailAIAnalysisEngine();
        aiInsights = await aiEngine.analyzeEmails(emailsWithAttachments, extractedTransactions);
      } catch (e) {
        logger.warn('AI analysis module not available:', e.message);
      }

      // Complete
      tracker.updateState(SYNC_STATES.COMPLETED);
      const summary = this.historyManager.endSync(syncId, 'completed');

      return {
        success: true,
        ...summary,
        details: {
          totalMessagesFound: messageList.length,
          newMessages: newMessageIds.length,
          financialEmails: financialEmails.length,
          nonFinancialEmails: classifiedEmails.length - financialEmails.length,
          transactionsExtracted: extractedTransactions.length,
          statementsDownloaded: attachmentDownloader.getStats().downloadedCount,
          attachmentSizeMB: attachmentDownloader.getStats().totalMB,
          storedInDatabase: storedCount,
          parsedStatements: parsedStatements.length,
          aiInsights: aiInsights ? true : false,
          categoryBreakdown: this._getCategoryBreakdown(classifiedEmails)
        }
      };

    } catch (error) {
      logger.error(`Sync failed for user ${userId}:`, error.message);
      tracker.updateState(SYNC_STATES.FAILED, { error: error.message });
      this.historyManager.endSync(syncId, 'failed');
      throw error;
    }
  }

  // ─── Fetch message list ─────────────────────────────────────
  async _fetchMessageList(gmail, profile, mode, options) {
    const maxResults = options.maxResults || 200;
    const allMessages = [];
    let pageToken = null;

    // Build query based on mode
    let query = '';
    if (mode === SYNC_MODES.INCREMENTAL && profile.gmailSettings?.lastSync) {
      const lastSync = new Date(profile.gmailSettings.lastSync);
      query = `after:${Math.floor(lastSync.getTime() / 1000)}`;
    } else if (mode === SYNC_MODES.SELECTIVE) {
      if (options.dateAfter) query += `after:${Math.floor(new Date(options.dateAfter).getTime() / 1000)} `;
      if (options.dateBefore) query += `before:${Math.floor(new Date(options.dateBefore).getTime() / 1000)} `;
      if (options.sender) query += `from:${options.sender} `;
    }

    // Add financial filter keywords
    if (!options.skipFinancialFilter) {
      const financialQuery = 'subject:(statement OR transaction OR payment OR credit OR debit OR salary OR EMI OR invoice OR receipt OR UPI OR NEFT OR RTGS OR IMPS)';
      query = query ? `${query} ${financialQuery}` : financialQuery;
    }

    try {
      do {
        await this.rateLimiter.acquire();
        const listParams = {
          userId: 'me',
          maxResults: Math.min(500, maxResults - allMessages.length),
          pageToken: pageToken || undefined
        };

        if (query.trim()) {
          listParams.q = query;
        }

        const response = await gmail.users.messages.list(listParams);
        const messages = response.data.messages || [];
        allMessages.push(...messages);
        pageToken = response.data.nextPageToken;

      } while (pageToken && allMessages.length < maxResults);
    } catch (error) {
      // If search query fails (metadata scope), retry without query
      if (error.message?.includes("Metadata scope") || error.message?.includes("'q' parameter")) {
        logger.warn('Search query blocked by scope — fetching without filter');
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(100, maxResults)
        });
        return response.data.messages || [];
      }
      throw error;
    }

    return allMessages;
  }

  // ─── Download full messages ─────────────────────────────────
  async _downloadMessages(gmail, messageIds, tracker) {
    const batchProcessor = new MessageBatchProcessor(10);
    const result = await batchProcessor.processBatch(messageIds, async (msgId) => {
      await this.rateLimiter.acquire();
      try {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: msgId,
          format: 'full'
        });
        tracker.incrementProcessed();
        return response.data;
      } catch (error) {
        logger.warn(`Failed to download message ${msgId}:`, error.message);
        tracker.addWarning(`Message ${msgId}: ${error.message}`);
        return null;
      }
    });

    return result.results.filter(Boolean);
  }

  // ─── Helpers ────────────────────────────────────────────────
  _isFinancialAttachment(filename) {
    if (!filename) return false;
    const name = filename.toLowerCase();
    const financialExtensions = ['.pdf', '.csv', '.xlsx', '.xls'];
    const financialKeywords = ['statement', 'invoice', 'receipt', 'bill', 'payslip', 'salary', 'tax', 'form16', 'form-16', 'emi', 'loan', 'insurance', 'premium', 'portfolio', 'mutual', 'sip', 'interest', 'tds', '26as'];

    const hasFinancialExtension = financialExtensions.some(ext => name.endsWith(ext));
    const hasFinancialKeyword = financialKeywords.some(kw => name.includes(kw));

    return hasFinancialExtension || hasFinancialKeyword;
  }

  _getCategoryBreakdown(classifiedEmails) {
    const breakdown = {};
    for (const email of classifiedEmails) {
      const cat = email.classification?.category || 'uncategorized';
      breakdown[cat] = (breakdown[cat] || 0) + 1;
    }
    return breakdown;
  }

  // ─── Public API ─────────────────────────────────────────────
  getSyncStatus(userId) {
    return this.historyManager.getActiveSync(userId);
  }

  getSyncHistory(userId, limit) {
    return this.historyManager.getHistory(userId, limit);
  }

  isSyncing(userId) {
    return this.historyManager.isUserSyncing(userId);
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

const orchestrator = new GmailSyncOrchestrator();

module.exports = {
  GmailSyncOrchestrator,
  orchestrator,
  SYNC_STATES,
  SYNC_MODES,
  MessageBatchProcessor,
  GmailRateLimiter,
  SyncProgressTracker,
  EmailDuplicateDetector,
  AttachmentDownloader,
  EmailContentParser,
  FinancialEmailClassifier,
  SyncHistoryManager
};
