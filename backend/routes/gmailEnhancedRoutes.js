/**
 * Gmail Enhanced Routes
 * Comprehensive API endpoints for the enhanced Gmail integration system.
 * Covers: email listing, detail view, sync orchestration, attachment processing,
 * AI analysis, bank statement parsing, reports, and settings management.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Lazy-load services to avoid circular dependencies and startup crashes
let _storageService, _classifierService, _extractorService, _attachmentProcessor;
let _parserService, _aiEngine, _reportGenerator, _syncOrchestrator;

function getStorage() {
  if (!_storageService) _storageService = require('../services/gmail/emailStorageService');
  return _storageService;
}
function getClassifier() {
  if (!_classifierService) _classifierService = require('../services/gmail/emailClassifierService');
  return _classifierService;
}
function getExtractor() {
  if (!_extractorService) _extractorService = require('../services/gmail/emailTransactionExtractor');
  return _extractorService;
}
function getAttachmentProcessor() {
  if (!_attachmentProcessor) _attachmentProcessor = require('../services/gmail/emailAttachmentProcessor');
  return _attachmentProcessor;
}
function getParser() {
  if (!_parserService) _parserService = require('../services/gmail/bankStatementParserService');
  return _parserService;
}
function getAI() {
  if (!_aiEngine) _aiEngine = require('../services/gmail/gmailAIAnalysisEngine');
  return _aiEngine;
}
function getReportGenerator() {
  if (!_reportGenerator) _reportGenerator = require('../services/gmail/gmailReportGenerator');
  return _reportGenerator;
}
function getOrchestrator() {
  if (!_syncOrchestrator) _syncOrchestrator = require('../services/gmail/gmailSyncOrchestrator');
  return _syncOrchestrator;
}

// Models
const GmailEmail = require('../models/GmailEmail');
const GmailAttachment = require('../models/GmailAttachment');
const FinancialProfile = require('../models/FinancialProfile');

// ═══════════════════════════════════════════════════════════════
// EMAIL LISTING & SEARCH
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/gmail-enhanced/emails
 * List stored Gmail emails with pagination, filtering, and search
 */
router.get('/emails', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      category,
      search,
      hasTransactions,
      hasAttachments,
      dateFrom,
      dateTo,
      sort = '-receivedAt',
      isRead,
      isStarred,
      bank,
    } = req.query;

    const query = { userId };

    // Category filter
    if (category && category !== 'all') {
      query['classification.primaryCategory'] = category;
    }

    // Search across subject, from, snippet
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'from.email': { $regex: search, $options: 'i' } },
        { 'from.name': { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } },
      ];
    }

    // Transaction filter
    if (hasTransactions === 'true') {
      query['extractedData.transactionCount'] = { $gt: 0 };
    }

    // Attachment filter
    if (hasAttachments === 'true') {
      query.hasAttachments = true;
    }

    // Date range
    if (dateFrom || dateTo) {
      query.receivedAt = {};
      if (dateFrom) query.receivedAt.$gte = new Date(dateFrom);
      if (dateTo) query.receivedAt.$lte = new Date(dateTo);
    }

    // Read/unread
    if (isRead === 'true') query.isRead = true;
    if (isRead === 'false') query.isRead = false;

    // Starred
    if (isStarred === 'true') query.isStarred = true;

    // Bank filter
    if (bank) {
      query['classification.detectedBank'] = { $regex: bank, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [emails, total] = await Promise.all([
      GmailEmail.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-rawBody -rawHtml -rawHeaders')
        .lean(),
      GmailEmail.countDocuments(query),
    ]);

    // Get category counts for sidebar
    const categoryCounts = await GmailEmail.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$classification.primaryCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        categoryCounts: categoryCounts.reduce((acc, c) => {
          acc[c._id || 'uncategorized'] = c.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    logger.error('List emails error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list emails', error: error.message });
  }
});

/**
 * GET /api/gmail-enhanced/emails/:id
 * Get full email detail including body, attachments, extracted data
 */
router.get('/emails/:id', authenticate, async (req, res) => {
  try {
    const email = await GmailEmail.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Get attachments for this email
    const attachments = await GmailAttachment.find({
      emailId: email._id,
      userId: req.user._id,
    }).select('-rawContent').lean();

    res.json({
      success: true,
      data: { ...email, attachments },
    });
  } catch (error) {
    logger.error('Get email detail error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get email', error: error.message });
  }
});

/**
 * POST /api/gmail-enhanced/emails/:id/star
 * Toggle star on an email
 */
router.post('/emails/:id/star', authenticate, async (req, res) => {
  try {
    const email = await GmailEmail.findOne({ _id: req.params.id, userId: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    email.isStarred = !email.isStarred;
    await email.save();

    res.json({ success: true, isStarred: email.isStarred });
  } catch (error) {
    logger.error('Star email error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to star email' });
  }
});

/**
 * POST /api/gmail-enhanced/emails/:id/read
 * Mark an email as read
 */
router.post('/emails/:id/read', authenticate, async (req, res) => {
  try {
    await GmailEmail.updateOne(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Mark read error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

/**
 * DELETE /api/gmail-enhanced/emails/:id
 * Delete stored email (does NOT delete from Gmail)
 */
router.delete('/emails/:id', authenticate, async (req, res) => {
  try {
    const result = await GmailEmail.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    // Also delete associated attachments
    await GmailAttachment.deleteMany({ emailId: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Email deleted' });
  } catch (error) {
    logger.error('Delete email error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete email' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SYNC & PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/gmail-enhanced/sync
 * Full sync: fetch from Gmail, store, classify, extract transactions, process attachments.
 * Emits real-time progress via WebSocket so the UI can show a persistent progress bar.
 */
router.post('/sync', authenticate, async (req, res) => {
  const userId = req.user._id;
  const ws = require('../services/websocketService');

  // Respond immediately — sync runs in background
  const { maxResults = 10000, dateAfter, fullSync = false } = req.body;

  // Send initial response so the frontend doesn't hang
  res.json({ success: true, message: 'Gmail sync started in background', data: { status: 'started' } });

  // ── Background sync ──
  (async () => {
    try {
      const profile = await FinancialProfile.findOne({ userId })
        .select('+gmailSettings.accessToken +gmailSettings.refreshToken');

      if (!profile?.gmailSettings?.isConnected) {
        ws.sendToUser(userId, 'gmailSyncProgress', { status: 'error', message: 'Gmail not connected' });
        return;
      }

      ws.sendToUser(userId, 'gmailSyncProgress', { status: 'starting', progress: 0, message: 'Connecting to Gmail...' });

      const GmailService = require('../services/gmailService');
      const credentials = { access_token: profile.gmailSettings.accessToken, refresh_token: profile.gmailSettings.refreshToken };
      const gmailSvc = GmailService.getUserInstance(credentials);

      // Refresh token
      if (credentials.refresh_token) {
        try {
          const { credentials: newCreds } = await gmailSvc.oauth2Client.refreshToken(credentials.refresh_token);
          await FinancialProfile.findOneAndUpdate({ userId }, { $set: { 'gmailSettings.accessToken': newCreds.access_token } });
          gmailSvc.setCredentials({ access_token: newCreds.access_token, refresh_token: credentials.refresh_token });
        } catch (e) { logger.warn('Token refresh failed:', e.message); }
      }

      const { google } = require('googleapis');
      const gmail = google.gmail({ version: 'v1', auth: gmailSvc.oauth2Client });

      ws.sendToUser(userId, 'gmailSyncProgress', { status: 'fetching', progress: 5, message: 'Fetching email list...' });

      // Build query — fetch ALL emails (no category filter for full coverage)
      let query = '';
      if (dateAfter) {
        const d = new Date(dateAfter);
        query += `after:${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      }
      if (!fullSync && profile.gmailSettings.lastSync) {
        const ls = new Date(profile.gmailSettings.lastSync);
        if (query) query += ' ';
        query += `after:${ls.getFullYear()}/${ls.getMonth() + 1}/${ls.getDate()}`;
      }

      // Paginate to get ALL messages (no artificial cap)
      const allMessageIds = [];
      let pageToken = null;
      do {
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          ...(query && { q: query }),
          maxResults: 100,  // Google max per page
          ...(pageToken && { pageToken })
        });
        const msgs = listRes.data.messages || [];
        allMessageIds.push(...msgs.map(m => m.id));
        pageToken = listRes.data.nextPageToken;
        ws.sendToUser(userId, 'gmailSyncProgress', { status: 'fetching', progress: 10, message: `Found ${allMessageIds.length} emails so far...` });
        // Safety: stop if user specified a limit
        if (maxResults && allMessageIds.length >= maxResults) {
          allMessageIds.splice(maxResults);
          break;
        }
      } while (pageToken);

      logger.info(`Gmail enhanced sync: ${allMessageIds.length} messages to process`);
      ws.sendToUser(userId, 'gmailSyncProgress', { status: 'processing', progress: 15, message: `Processing ${allMessageIds.length} emails...`, total: allMessageIds.length });

      const results = { total: allMessageIds.length, stored: 0, skipped: 0, classified: 0, transactionsExtracted: 0, attachmentsProcessed: 0, errors: [] };

      for (let idx = 0; idx < allMessageIds.length; idx++) {
        const msgId = allMessageIds[idx];
        const pct = 15 + Math.floor((idx / allMessageIds.length) * 80);

        try {
          const exists = await GmailEmail.exists({ gmailId: msgId, userId });
          if (exists) { results.skipped++; continue; }

          const msgResponse = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
          const msg = msgResponse.data;
          const headers = msg.payload?.headers || [];
          const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const fromRaw = getHeader('From');
          const fromMatch = fromRaw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]*)>?$/);
          const fromName = fromMatch?.[1]?.trim() || '';
          const fromEmail = fromMatch?.[2]?.trim() || fromRaw;

          let textBody = '', htmlBody = '';
          function extractBody(part) {
            if (!part) return;
            if (part.mimeType === 'text/plain' && part.body?.data) textBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
            if (part.mimeType === 'text/html' && part.body?.data) htmlBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
            if (part.parts) part.parts.forEach(extractBody);
          }
          extractBody(msg.payload);

          const attachmentParts = [];
          function findAttachments(part) {
            if (!part) return;
            if (part.filename && part.body?.attachmentId) {
              attachmentParts.push({ filename: part.filename, mimeType: part.mimeType, size: parseInt(part.body.size || 0), attachmentId: part.body.attachmentId });
            }
            if (part.parts) part.parts.forEach(findAttachments);
          }
          findAttachments(msg.payload);

          const emailDoc = new GmailEmail({
            userId, gmailId: msgId, threadId: msg.threadId,
            subject: getHeader('Subject') || '(No Subject)',
            from: { name: fromName, email: fromEmail },
            to: getHeader('To'), date: getHeader('Date'),
            receivedAt: new Date(parseInt(msg.internalDate)),
            snippet: msg.snippet || '', body: textBody || '', rawHtml: htmlBody || '',
            labels: msg.labelIds || [], hasAttachments: attachmentParts.length > 0,
            attachmentCount: attachmentParts.length, sizeEstimate: msg.sizeEstimate || 0,
            isRead: !(msg.labelIds || []).includes('UNREAD'),
          });

          // Classify
          try {
            const classifier = getClassifier();
            if (classifier.classifyEmail) {
              const c = classifier.classifyEmail({ subject: emailDoc.subject, from: emailDoc.from, body: textBody, snippet: emailDoc.snippet });
              emailDoc.classification = { primaryCategory: c.category || 'other', confidence: c.confidence || 0, detectedBank: c.bank || null, isFinancial: c.isFinancial || false, subCategory: c.subCategory || null };
              results.classified++;
            }
          } catch (e) { /* skip */ }

          // Extract transactions
          try {
            const extractor = getExtractor();
            if (extractor.extractFromEmail) {
              const ex = extractor.extractFromEmail({ subject: emailDoc.subject, body: textBody, from: emailDoc.from, date: emailDoc.receivedAt });
              if (ex?.transactions?.length > 0) {
                emailDoc.extractedData = { transactions: ex.transactions, transactionCount: ex.transactions.length,
                  totalCredits: ex.transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
                  totalDebits: ex.transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0) };
                results.transactionsExtracted += ex.transactions.length;
              }
            }
          } catch (e) { /* skip */ }

          await emailDoc.save();
          results.stored++;

          // Download attachments, organize by category, save to Documents
          for (const att of attachmentParts) {
            try {
              const attRes = await gmail.users.messages.attachments.get({ userId: 'me', messageId: msgId, id: att.attachmentId });
              const attData = Buffer.from(attRes.data.data, 'base64');
              const pathModule = require('path');
              const fsModule = require('fs');
              const Document = require('../models/Document');

              // Categorize attachment based on email classification + filename
              const emailCat = emailDoc.classification?.primaryCategory || 'other';
              const fname = (att.filename || '').toLowerCase();
              let docCategory = 'other';
              let folderName = 'other';

              if (/salary|payslip|pay\s*stub|wage|form\s*16/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'payslip'; folderName = 'payslips';
              } else if (/insurance|policy|premium|claim|lic|ergo|lombard|star.*health/i.test(fname + ' ' + (emailDoc.subject || '') + ' ' + (emailDoc.from?.email || ''))) {
                docCategory = 'insurance'; folderName = 'insurance';
              } else if (/investment|mutual.*fund|sip|portfolio|demat|zerodha|groww|kuvera|dividend/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'investment'; folderName = 'investments';
              } else if (/statement|bank.*statement|account.*statement/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'bank_statement'; folderName = 'bank_statements';
              } else if (/credit.*card|card.*statement/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'credit_card'; folderName = 'credit_cards';
              } else if (/tax|itr|form.*16|tds|26as|ais/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'tax_document'; folderName = 'tax_documents';
              } else if (/receipt|invoice|bill/i.test(fname)) {
                docCategory = 'receipt'; folderName = 'receipts';
              } else if (/loan|emi|sanction/i.test(fname + ' ' + (emailDoc.subject || ''))) {
                docCategory = 'loan'; folderName = 'loans';
              } else if (emailCat === 'insurance_notification') {
                docCategory = 'insurance'; folderName = 'insurance';
              } else if (emailCat === 'credit_card_statement') {
                docCategory = 'credit_card'; folderName = 'credit_cards';
              } else if (emailCat === 'salary_credit') {
                docCategory = 'payslip'; folderName = 'payslips';
              }

              // Save to organized folder: uploads/documents/{userId}/{category}/
              const docDir = pathModule.join(process.cwd(), 'uploads', 'documents', String(userId), folderName);
              if (!fsModule.existsSync(docDir)) fsModule.mkdirSync(docDir, { recursive: true });
              const safeFilename = `${Date.now()}_${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              const localPath = pathModule.join(docDir, safeFilename);
              fsModule.writeFileSync(localPath, attData);

              // Also save to gmail folder for raw backup
              const gmailDir = pathModule.join(process.cwd(), 'uploads', 'gmail', String(userId));
              if (!fsModule.existsSync(gmailDir)) fsModule.mkdirSync(gmailDir, { recursive: true });
              const gmailPath = pathModule.join(gmailDir, safeFilename);
              fsModule.writeFileSync(gmailPath, attData);

              // Create GmailAttachment record
              const attDoc = new GmailAttachment({ userId, emailId: emailDoc._id, gmailMessageId: msgId, filename: att.filename,
                mimeType: att.mimeType, size: attData.length, contentBase64: attRes.data.data, status: 'downloaded',
                localPath, category: docCategory });

              // Try to unlock password-protected PDFs
              if (att.mimeType === 'application/pdf' || att.filename.toLowerCase().endsWith('.pdf')) {
                try {
                  const User = require('../models/User');
                  const user = await User.findById(userId);
                  const userProfile = await FinancialProfile.findOne({ userId });
                  if (user && userProfile?.dateOfBirth) {
                    const { tryUnlockPDF } = require('../utils/documentPasswordGenerator');
                    const unlockResult = await tryUnlockPDF(localPath, user, userProfile.dateOfBirth);
                    if (unlockResult.success) {
                      attDoc.status = 'unlocked';
                      attDoc.unlockedPath = unlockResult.outputPath;
                      attDoc.passwordUsed = unlockResult.password;
                    }
                  }
                } catch (unlockErr) {
                  logger.debug('PDF unlock attempt:', att.filename, unlockErr.message);
                }
              }

              await attDoc.save();

              // Create Document record for the Documents tab
              const existingDoc = await Document.findOne({ userId, gmailMessageId: msgId, originalFileName: att.filename });
              if (!existingDoc) {
                try {
                  await Document.create({
                    userId,
                    fileName: safeFilename,
                    originalFileName: att.filename,
                    fileType: pathModule.extname(att.filename).replace('.', '') || 'pdf',
                    fileSize: attData.length,
                    filePath: localPath,
                    source: 'gmail',
                    gmailMessageId: msgId,
                    category: docCategory,
                    isProcessed: false,
                    metadata: {
                      subject: emailDoc.subject,
                      from: emailDoc.from?.email,
                      dateReceived: emailDoc.receivedAt,
                      folderName,
                    }
                  });
                } catch (docErr) {
                  logger.debug('Document record creation skipped:', docErr.message);
                }
              }

              results.attachmentsProcessed++;
            } catch (e) { results.errors.push(`Attachment ${att.filename}: ${e.message}`); }
          }

          // Emit progress every 5 messages
          if (idx % 5 === 0 || idx === allMessageIds.length - 1) {
            ws.sendToUser(userId, 'gmailSyncProgress', {
              status: 'processing', progress: pct,
              message: `${idx + 1}/${allMessageIds.length} — ${results.stored} stored, ${results.skipped} skipped`,
              current: idx + 1, total: allMessageIds.length, results
            });
          }
        } catch (e) { results.errors.push(`${msgId}: ${e.message}`); }
      }

      // Update last sync time
      await FinancialProfile.findOneAndUpdate({ userId }, { $set: { 'gmailSettings.lastSync': new Date() } });

      // Auto-extract insurance data from synced emails (fire and forget)
      try {
        const InsurancePolicy = require('../models/InsurancePolicy');
        const insuranceEmails = await GmailEmail.find({
          userId,
          $or: [
            { 'classification.primaryCategory': { $in: ['insurance_notification', 'insurance'] } },
            { subject: { $regex: /insurance|policy|premium|claim|coverage|renewal|lic/i } }
          ]
        }).sort('-receivedAt').limit(50).lean();
        
        if (insuranceEmails.length > 0) {
          logger.info(`Auto-extracting insurance data from ${insuranceEmails.length} emails`);
        }
      } catch (insErr) {
        logger.debug('Insurance auto-extract skipped:', insErr.message);
      }

      ws.sendToUser(userId, 'gmailSyncProgress', {
        status: 'completed', progress: 100,
        message: `Done! ${results.stored} emails stored, ${results.transactionsExtracted} transactions extracted`,
        results
      });

      logger.info('Enhanced Gmail sync completed:', results);
    } catch (error) {
      logger.error('Background Gmail sync error:', error.message);
      ws.sendToUser(userId, 'gmailSyncProgress', {
        status: 'error', progress: 0,
        message: error.message?.includes('invalid_grant')
          ? 'Gmail session expired. Disconnect and reconnect Gmail.'
          : `Sync failed: ${error.message}`
      });
    }
  })();
});

/**
 * GET /api/gmail-enhanced/sync/status
 * Get current sync status and last sync info
 */
router.get('/sync/status', authenticate, async (req, res) => {
  try {
    const profile = await FinancialProfile.findOne({ userId: req.user._id });

    const [emailCount, attachmentCount, financialCount, transactionEmails] = await Promise.all([
      GmailEmail.countDocuments({ userId: req.user._id }),
      GmailAttachment.countDocuments({ userId: req.user._id }),
      GmailEmail.countDocuments({ userId: req.user._id, 'classification.isFinancial': true }),
      GmailEmail.countDocuments({ userId: req.user._id, 'extractedData.transactionCount': { $gt: 0 } }),
    ]);

    res.json({
      success: true,
      data: {
        isConnected: profile?.gmailSettings?.isConnected || false,
        email: profile?.gmailSettings?.email || null,
        lastSync: profile?.gmailSettings?.lastSync || null,
        stats: {
          totalEmails: emailCount,
          totalAttachments: attachmentCount,
          financialEmails: financialCount,
          emailsWithTransactions: transactionEmails,
        },
      },
    });
  } catch (error) {
    logger.error('Sync status error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get sync status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/gmail-enhanced/analytics
 * Comprehensive analytics for stored Gmail data
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    // Category breakdown
    const categoryBreakdown = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since } } },
      { $group: { _id: '$classification.primaryCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Bank breakdown
    const bankBreakdown = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since }, 'classification.detectedBank': { $ne: null } } },
      { $group: { _id: '$classification.detectedBank', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Daily email volume
    const dailyVolume = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$receivedAt' } },
          count: { $sum: 1 },
          financial: { $sum: { $cond: ['$classification.isFinancial', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Transaction summary from emails
    const transactionSummary = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since }, 'extractedData.transactionCount': { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          totalTransactions: { $sum: '$extractedData.transactionCount' },
          totalCredits: { $sum: '$extractedData.totalCredits' },
          totalDebits: { $sum: '$extractedData.totalDebits' },
        },
      },
    ]);

    // Top senders
    const topSenders = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since } } },
      { $group: { _id: '$from.email', name: { $first: '$from.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Monthly trends
    const monthlyTrends = await GmailEmail.aggregate([
      { $match: { userId, receivedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$receivedAt' } },
          total: { $sum: 1 },
          financial: { $sum: { $cond: ['$classification.isFinancial', 1, 0] } },
          withTransactions: { $sum: { $cond: [{ $gt: ['$extractedData.transactionCount', 0] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalEmails = await GmailEmail.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        overview: {
          totalEmails,
          periodEmails: categoryBreakdown.reduce((s, c) => s + c.count, 0),
          financialEmails: categoryBreakdown.find(c => c._id === 'banking')?.count || 0,
          transactionSummary: transactionSummary[0] || { totalEmails: 0, totalTransactions: 0, totalCredits: 0, totalDebits: 0 },
        },
        categoryBreakdown,
        bankBreakdown,
        dailyVolume,
        topSenders,
        monthlyTrends,
      },
    });
  } catch (error) {
    logger.error('Analytics error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
});

/**
 * GET /api/gmail-enhanced/transactions
 * Get all extracted transactions from Gmail emails
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, dateFrom, dateTo } = req.query;

    const match = {
      userId: req.user._id,
      'extractedData.transactionCount': { $gt: 0 },
    };

    if (dateFrom || dateTo) {
      match.receivedAt = {};
      if (dateFrom) match.receivedAt.$gte = new Date(dateFrom);
      if (dateTo) match.receivedAt.$lte = new Date(dateTo);
    }

    const emails = await GmailEmail.find(match)
      .sort('-receivedAt')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('subject from receivedAt extractedData classification')
      .lean();

    // Flatten transactions with email context
    let transactions = [];
    for (const email of emails) {
      const txns = email.extractedData?.transactions || [];
      for (const txn of txns) {
        if (type && txn.type !== type) continue;
        transactions.push({
          ...txn,
          emailId: email._id,
          emailSubject: email.subject,
          emailFrom: email.from,
          emailDate: email.receivedAt,
          bank: email.classification?.detectedBank,
        });
      }
    }

    const total = await GmailEmail.countDocuments(match);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
  } catch (error) {
    logger.error('Get transactions error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/gmail-enhanced/attachments
 * List all stored attachments
 */
router.get('/attachments', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (type) query.mimeType = { $regex: type, $options: 'i' };

    const [attachments, total] = await Promise.all([
      GmailAttachment.find(query)
        .sort('-createdAt')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('-contentBase64 -rawContent')
        .populate('emailId', 'subject from receivedAt')
        .lean(),
      GmailAttachment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        attachments,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
  } catch (error) {
    logger.error('List attachments error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list attachments' });
  }
});

/**
 * POST /api/gmail-enhanced/attachments/:id/process
 * Process an attachment (parse bank statement, extract data)
 */
router.post('/attachments/:id/process', authenticate, async (req, res) => {
  try {
    const attachment = await GmailAttachment.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    // Try bank statement parsing
    let result = { parsed: false };
    try {
      const parser = getParser();
      if (parser.parse && attachment.contentBase64) {
        const content = Buffer.from(attachment.contentBase64, 'base64');
        const parsed = await parser.parse(content, attachment.filename, attachment.mimeType);
        if (parsed?.transactions?.length > 0) {
          attachment.extractedTransactions = parsed.transactions;
          attachment.status = 'processed';
          attachment.processingResult = {
            transactionCount: parsed.transactions.length,
            bank: parsed.bank || 'unknown',
            statementPeriod: parsed.period || null,
          };
          result = { parsed: true, transactionCount: parsed.transactions.length };
        }
      }
    } catch (parseErr) {
      logger.warn('Bank statement parse failed:', parseErr.message);
      attachment.status = 'failed';
      attachment.processingError = parseErr.message;
    }

    await attachment.save();

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Process attachment error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process attachment' });
  }
});

// ═══════════════════════════════════════════════════════════════
// AI ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/gmail-enhanced/analyze
 * Run AI analysis on stored emails
 */
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 90 } = req.body;
    const since = new Date(Date.now() - days * 86400000);

    const emails = await GmailEmail.find({
      userId,
      receivedAt: { $gte: since },
    })
      .sort('-receivedAt')
      .limit(500)
      .lean();

    if (emails.length === 0) {
      return res.json({
        success: true,
        data: { message: 'No emails found to analyze. Sync Gmail first.', insights: [] },
      });
    }

    // Build analysis
    const analysis = {
      totalEmails: emails.length,
      financialEmails: emails.filter(e => e.classification?.isFinancial).length,
      categories: {},
      banks: {},
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0,
      insights: [],
      spendingByBank: {},
      topMerchants: {},
    };

    for (const email of emails) {
      // Category counts
      const cat = email.classification?.primaryCategory || 'other';
      analysis.categories[cat] = (analysis.categories[cat] || 0) + 1;

      // Bank counts
      const bank = email.classification?.detectedBank;
      if (bank) {
        analysis.banks[bank] = (analysis.banks[bank] || 0) + 1;
      }

      // Transaction aggregation
      const txns = email.extractedData?.transactions || [];
      for (const txn of txns) {
        analysis.transactionCount++;
        if (txn.type === 'credit') analysis.totalCredits += txn.amount || 0;
        if (txn.type === 'debit') analysis.totalDebits += txn.amount || 0;

        if (bank && txn.type === 'debit') {
          analysis.spendingByBank[bank] = (analysis.spendingByBank[bank] || 0) + (txn.amount || 0);
        }

        if (txn.merchant) {
          analysis.topMerchants[txn.merchant] = (analysis.topMerchants[txn.merchant] || 0) + (txn.amount || 0);
        }
      }
    }

    // Generate insights
    if (analysis.totalDebits > 0) {
      analysis.insights.push({
        type: 'spending',
        message: `Total spending detected from ${analysis.transactionCount} transactions: ₹${analysis.totalDebits.toLocaleString('en-IN')}`,
        severity: analysis.totalDebits > 100000 ? 'warning' : 'info',
      });
    }

    if (analysis.totalCredits > 0) {
      analysis.insights.push({
        type: 'income',
        message: `Total income detected: ₹${analysis.totalCredits.toLocaleString('en-IN')}`,
        severity: 'info',
      });
    }

    const topBank = Object.entries(analysis.banks).sort((a, b) => b[1] - a[1])[0];
    if (topBank) {
      analysis.insights.push({
        type: 'bank',
        message: `Most emails from ${topBank[0]} (${topBank[1]} emails)`,
        severity: 'info',
      });
    }

    // Top merchants
    const sortedMerchants = Object.entries(analysis.topMerchants).sort((a, b) => b[1] - a[1]).slice(0, 5);
    analysis.topMerchants = sortedMerchants.map(([name, total]) => ({ name, total }));

    // Spending by bank
    analysis.spendingByBank = Object.entries(analysis.spendingByBank).map(([bank, total]) => ({ bank, total }));

    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('AI analysis error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to run analysis' });
  }
});

/**
 * GET /api/gmail-enhanced/report
 * Generate a comprehensive email-based financial report
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    const { days = 30, format = 'json' } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const emails = await GmailEmail.find({
      userId: req.user._id,
      receivedAt: { $gte: since },
      'classification.isFinancial': true,
    })
      .sort('-receivedAt')
      .lean();

    const report = {
      period: { from: since.toISOString(), to: new Date().toISOString(), days: parseInt(days) },
      summary: {
        totalFinancialEmails: emails.length,
        banks: {},
        categories: {},
        totalCredits: 0,
        totalDebits: 0,
        netFlow: 0,
      },
      transactions: [],
    };

    for (const email of emails) {
      const bank = email.classification?.detectedBank || 'Unknown';
      report.summary.banks[bank] = (report.summary.banks[bank] || 0) + 1;

      const cat = email.classification?.primaryCategory || 'other';
      report.summary.categories[cat] = (report.summary.categories[cat] || 0) + 1;

      for (const txn of (email.extractedData?.transactions || [])) {
        report.transactions.push({
          date: txn.date || email.receivedAt,
          description: txn.description || email.subject,
          amount: txn.amount,
          type: txn.type,
          bank,
          emailSubject: email.subject,
        });

        if (txn.type === 'credit') report.summary.totalCredits += txn.amount || 0;
        if (txn.type === 'debit') report.summary.totalDebits += txn.amount || 0;
      }
    }

    report.summary.netFlow = report.summary.totalCredits - report.summary.totalDebits;

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Report generation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS & CLEANUP
// ═══════════════════════════════════════════════════════════════

/**
 * DELETE /api/gmail-enhanced/data
 * Clear all stored Gmail data for the user
 */
router.delete('/data', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const [emailResult, attResult] = await Promise.all([
      GmailEmail.deleteMany({ userId }),
      GmailAttachment.deleteMany({ userId }),
    ]);

    res.json({
      success: true,
      message: `Cleared ${emailResult.deletedCount} emails and ${attResult.deletedCount} attachments`,
    });
  } catch (error) {
    logger.error('Clear data error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to clear data' });
  }
});

/**
 * GET /api/gmail-enhanced/stats
 * Quick stats widget data
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [total, recent, financial, withTxns, attachments] = await Promise.all([
      GmailEmail.countDocuments({ userId }),
      GmailEmail.countDocuments({ userId, receivedAt: { $gte: thirtyDaysAgo } }),
      GmailEmail.countDocuments({ userId, 'classification.isFinancial': true }),
      GmailEmail.countDocuments({ userId, 'extractedData.transactionCount': { $gt: 0 } }),
      GmailAttachment.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      data: {
        totalEmails: total,
        recentEmails: recent,
        financialEmails: financial,
        emailsWithTransactions: withTxns,
        totalAttachments: attachments,
      },
    });
  } catch (error) {
    logger.error('Stats error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

module.exports = router;
