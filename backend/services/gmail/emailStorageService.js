// ============================================================
// Email Storage, Indexing & Retrieval Service
// ============================================================
// Comprehensive service for storing, indexing, and retrieving
// parsed Gmail financial emails in MongoDB. Provides full-text
// search, timeline aggregation, bank/category grouping,
// attachment management, and export capabilities.
// ============================================================

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ─── Inline Schemas ────────────────────────────────────────────

const gmailEmailSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  threadId: { type: String, default: null },
  subject: { type: String, default: '' },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  date: { type: Date, default: Date.now, index: true },
  snippet: { type: String, default: '' },
  body: { type: String, default: '' },
  htmlBody: { type: String, default: '' },
  labels: { type: [String], default: [] },
  category: { type: String, default: 'uncategorized', index: true },
  subcategory: { type: String, default: '' },
  parsedTransaction: { type: mongoose.Schema.Types.Mixed, default: null },
  upiDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  bankAlertDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  amounts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  sentiment: { type: mongoose.Schema.Types.Mixed, default: null },
  isFinancial: { type: Boolean, default: false, index: true },
  isProcessed: { type: Boolean, default: false, index: true },
  isArchived: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
  attachments: [{
    filename: { type: String, default: '' },
    path: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 }
  }],
  aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'gmail_emails'
});

gmailEmailSchema.index({ userId: 1, messageId: 1 }, { unique: true });
gmailEmailSchema.index({ userId: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, category: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, isFinancial: 1, date: -1 });
gmailEmailSchema.index({ userId: 1, isProcessed: 1 });
gmailEmailSchema.index({ userId: 1, from: 1 });
gmailEmailSchema.index({ subject: 'text', body: 'text', snippet: 'text', from: 'text' });

let GmailEmail;
try {
  GmailEmail = mongoose.model('GmailEmail');
} catch (_) {
  GmailEmail = mongoose.model('GmailEmail', gmailEmailSchema);
}

const gmailEmailAttachmentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  emailId: { type: mongoose.Schema.Types.ObjectId, ref: 'GmailEmail', required: true, index: true },
  messageId: { type: String, default: '' },
  filename: { type: String, required: true },
  originalFilename: { type: String, default: '' },
  mimeType: { type: String, default: 'application/octet-stream' },
  size: { type: Number, default: 0 },
  storagePath: { type: String, default: '' },
  checksum: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'gmail_email_attachments'
});

gmailEmailAttachmentSchema.index({ userId: 1, emailId: 1 });
gmailEmailAttachmentSchema.index({ userId: 1, mimeType: 1 });

let GmailEmailAttachment;
try {
  GmailEmailAttachment = mongoose.model('GmailEmailAttachment');
} catch (_) {
  GmailEmailAttachment = mongoose.model('GmailEmailAttachment', gmailEmailAttachmentSchema);
}

// ─── Constants ─────────────────────────────────────────────────

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'email_attachments');
const BATCH_SIZE = 100;
const MAX_SEARCH_RESULTS = 500;
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'of', 'at', 'by',
  'for', 'with', 'about', 'against', 'between', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'because', 'as', 'until', 'while', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they',
  'them', 'their', 'what', 'which', 'who', 'whom', 'and', 'but',
  'or', 'if', 'dear', 'regards', 'thanks', 'thank', 'please'
]);

// ─── EmailStorageService ───────────────────────────────────────

class EmailStorageService {
  constructor() {
    this.model = GmailEmail;
  }

  // ── Store a single parsed email ──────────────────────────────

  async storeEmail(userId, emailData) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!emailData || !emailData.messageId) {
        throw new Error('emailData with messageId is required');
      }

      const existing = await this.model.findOne({
        userId,
        messageId: emailData.messageId,
        isDeleted: false
      }).lean();

      if (existing) {
        logger.info(`Email ${emailData.messageId} already stored for user ${userId}, updating`);
        const updated = await this.model.findOneAndUpdate(
          { userId, messageId: emailData.messageId },
          { $set: this._sanitizeEmailData(userId, emailData) },
          { new: true, lean: true }
        );
        return { action: 'updated', email: updated };
      }

      const doc = new this.model(this._sanitizeEmailData(userId, emailData));
      const saved = await doc.save();
      logger.info(`Stored email ${emailData.messageId} for user ${userId}`);
      return { action: 'created', email: saved.toObject() };
    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`Duplicate email ${emailData.messageId} for user ${userId}`);
        return { action: 'duplicate', email: null };
      }
      logger.error(`Error storing email for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Batch store multiple emails ──────────────────────────────

  async storeEmails(userId, emails) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!Array.isArray(emails) || emails.length === 0) {
        return { stored: 0, updated: 0, duplicates: 0, errors: 0 };
      }

      logger.info(`Batch storing ${emails.length} emails for user ${userId}`);

      const results = { stored: 0, updated: 0, duplicates: 0, errors: 0, details: [] };

      // Process in batches to avoid memory issues
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        const batchOps = [];

        for (const email of batch) {
          if (!email.messageId) {
            results.errors++;
            results.details.push({ messageId: null, error: 'Missing messageId' });
            continue;
          }

          batchOps.push({
            updateOne: {
              filter: { userId, messageId: email.messageId },
              update: { $set: this._sanitizeEmailData(userId, email) },
              upsert: true
            }
          });
        }

        if (batchOps.length > 0) {
          try {
            const bulkResult = await this.model.bulkWrite(batchOps, { ordered: false });
            results.stored += bulkResult.upsertedCount || 0;
            results.updated += bulkResult.modifiedCount || 0;
          } catch (bulkErr) {
            if (bulkErr.writeErrors) {
              results.errors += bulkErr.writeErrors.length;
              for (const we of bulkErr.writeErrors) {
                results.details.push({ index: we.index, error: we.errmsg });
              }
            }
            if (bulkErr.result) {
              results.stored += bulkErr.result.nUpserted || 0;
              results.updated += bulkErr.result.nModified || 0;
            }
            logger.warn(`Batch write partial failure: ${bulkErr.message}`);
          }
        }

        logger.debug(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(emails.length / BATCH_SIZE)}`);
      }

      logger.info(`Batch store complete for user ${userId}: ${results.stored} stored, ${results.updated} updated, ${results.errors} errors`);
      return results;
    } catch (err) {
      logger.error(`Error batch storing emails for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Get emails with advanced filtering ───────────────────────

  async getEmails(userId, filters = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const query = { userId, isDeleted: false };

      // Date range
      if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) query.date.$gte = new Date(filters.startDate);
        if (filters.endDate) query.date.$lte = new Date(filters.endDate);
      }

      // Category
      if (filters.category) {
        query.category = Array.isArray(filters.category)
          ? { $in: filters.category }
          : filters.category;
      }

      // Financial only
      if (filters.isFinancial !== undefined) {
        query.isFinancial = filters.isFinancial;
      }

      // Bank filter (from field contains bank name)
      if (filters.bank) {
        const bankPattern = filters.bank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.from = { $regex: bankPattern, $options: 'i' };
      }

      // Amount range
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        query['amounts.value'] = {};
        if (filters.minAmount !== undefined) query['amounts.value'].$gte = Number(filters.minAmount);
        if (filters.maxAmount !== undefined) query['amounts.value'].$lte = Number(filters.maxAmount);
      }

      // Labels filter
      if (filters.labels && filters.labels.length > 0) {
        query.labels = { $in: filters.labels };
      }

      // Search in subject
      if (filters.search) {
        const searchPattern = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { subject: { $regex: searchPattern, $options: 'i' } },
          { snippet: { $regex: searchPattern, $options: 'i' } },
          { from: { $regex: searchPattern, $options: 'i' } }
        ];
      }

      // Archive filter
      if (filters.isArchived !== undefined) {
        query.isArchived = filters.isArchived;
      }

      // Processed filter
      if (filters.isProcessed !== undefined) {
        query.isProcessed = filters.isProcessed;
      }

      // Type filter (debit/credit)
      if (filters.type) {
        query['parsedTransaction.type'] = filters.type.toLowerCase();
      }

      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(filters.limit, 10) || 50));
      const skip = (page - 1) * limit;

      const sortField = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortField]: sortOrder };

      const projection = filters.fields
        ? filters.fields.split(',').reduce((acc, f) => { acc[f.trim()] = 1; return acc; }, {})
        : { htmlBody: 0, body: 0 };

      const [emails, total] = await Promise.all([
        this.model.find(query).select(projection).sort(sort).skip(skip).limit(limit).lean(),
        this.model.countDocuments(query)
      ]);

      logger.debug(`Retrieved ${emails.length}/${total} emails for user ${userId} (page ${page})`);

      return {
        emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (err) {
      logger.error(`Error getting emails for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Get a single email by ID ─────────────────────────────────

  async getEmailById(userId, emailId) {
    try {
      if (!userId || !emailId) throw new Error('userId and emailId are required');

      const query = { userId, isDeleted: false };

      if (mongoose.Types.ObjectId.isValid(emailId)) {
        query._id = emailId;
      } else {
        query.messageId = emailId;
      }

      const email = await this.model.findOne(query).lean();

      if (!email) {
        logger.debug(`Email ${emailId} not found for user ${userId}`);
        return null;
      }

      logger.debug(`Retrieved email ${emailId} for user ${userId}`);
      return email;
    } catch (err) {
      logger.error(`Error getting email ${emailId} for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Get email statistics ─────────────────────────────────────

  async getEmailStats(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const baseMatch = { userId, isDeleted: false };

      const [
        totalCount,
        categoryAgg,
        bankAgg,
        monthlyAgg,
        financialSummary,
        processedCount,
        recentEmails
      ] = await Promise.all([
        // Total count
        this.model.countDocuments(baseMatch),

        // Count by category
        this.model.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Count by bank (extract domain from 'from')
        this.model.aggregate([
          { $match: { ...baseMatch, from: { $exists: true, $ne: '' } } },
          {
            $addFields: {
              bankDomain: {
                $arrayElemAt: [
                  { $split: [{ $arrayElemAt: [{ $split: ['$from', '@'] }, 1] }, '>'] },
                  0
                ]
              }
            }
          },
          { $group: { _id: '$bankDomain', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ]),

        // Count by month
        this.model.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 24 }
        ]),

        // Financial summary (total debits and credits)
        this.model.aggregate([
          { $match: { ...baseMatch, isFinancial: true, 'parsedTransaction.amount': { $exists: true } } },
          {
            $group: {
              _id: '$parsedTransaction.type',
              totalAmount: { $sum: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
              count: { $sum: 1 },
              avgAmount: { $avg: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } }
            }
          }
        ]),

        // Processed count
        this.model.countDocuments({ ...baseMatch, isProcessed: true }),

        // Most recent 5 emails
        this.model.find(baseMatch)
          .select({ subject: 1, from: 1, date: 1, category: 1, isFinancial: 1 })
          .sort({ date: -1 })
          .limit(5)
          .lean()
      ]);

      const categoryMap = {};
      for (const cat of categoryAgg) {
        categoryMap[cat._id || 'uncategorized'] = cat.count;
      }

      const bankMap = {};
      for (const bank of bankAgg) {
        if (bank._id) bankMap[bank._id] = bank.count;
      }

      const monthlyMap = monthlyAgg.map(m => ({
        year: m._id.year,
        month: m._id.month,
        label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        count: m.count
      }));

      const financials = { totalDebits: 0, totalCredits: 0, debitCount: 0, creditCount: 0, avgDebit: 0, avgCredit: 0 };
      for (const f of financialSummary) {
        if (f._id === 'debit') {
          financials.totalDebits = Math.round(f.totalAmount * 100) / 100;
          financials.debitCount = f.count;
          financials.avgDebit = Math.round(f.avgAmount * 100) / 100;
        } else if (f._id === 'credit') {
          financials.totalCredits = Math.round(f.totalAmount * 100) / 100;
          financials.creditCount = f.count;
          financials.avgCredit = Math.round(f.avgAmount * 100) / 100;
        }
      }

      const stats = {
        total: totalCount,
        processed: processedCount,
        unprocessed: totalCount - processedCount,
        byCategory: categoryMap,
        byBank: bankMap,
        byMonth: monthlyMap,
        financials,
        recentEmails
      };

      logger.debug(`Generated email stats for user ${userId}: ${totalCount} total`);
      return stats;
    } catch (err) {
      logger.error(`Error getting email stats for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Full-text search with relevance scoring ──────────────────

  async searchEmails(userId, query) {
    try {
      if (!userId || !query) throw new Error('userId and query are required');

      const searchTerm = String(query).trim();
      if (searchTerm.length < 2) {
        return { emails: [], total: 0, query: searchTerm };
      }

      // Try MongoDB text search first
      let results;
      try {
        results = await this.model.find(
          {
            userId,
            isDeleted: false,
            $text: { $search: searchTerm }
          },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .limit(MAX_SEARCH_RESULTS)
          .lean();
      } catch (textErr) {
        logger.warn(`Text search unavailable, falling back to regex: ${textErr.message}`);
        results = null;
      }

      // Fallback to regex if text search fails or returns nothing
      if (!results || results.length === 0) {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        results = await this.model.find({
          userId,
          isDeleted: false,
          $or: [
            { subject: { $regex: escaped, $options: 'i' } },
            { snippet: { $regex: escaped, $options: 'i' } },
            { body: { $regex: escaped, $options: 'i' } },
            { from: { $regex: escaped, $options: 'i' } }
          ]
        })
          .sort({ date: -1 })
          .limit(MAX_SEARCH_RESULTS)
          .select({ htmlBody: 0 })
          .lean();

        // Add basic relevance scoring for regex results
        const lowerQuery = searchTerm.toLowerCase();
        results = results.map(email => {
          let score = 0;
          if (email.subject && email.subject.toLowerCase().includes(lowerQuery)) score += 10;
          if (email.from && email.from.toLowerCase().includes(lowerQuery)) score += 8;
          if (email.snippet && email.snippet.toLowerCase().includes(lowerQuery)) score += 5;
          if (email.body && email.body.toLowerCase().includes(lowerQuery)) score += 2;
          return { ...email, score };
        });

        results.sort((a, b) => b.score - a.score);
      }

      logger.debug(`Search "${searchTerm}" returned ${results.length} results for user ${userId}`);
      return { emails: results, total: results.length, query: searchTerm };
    } catch (err) {
      logger.error(`Error searching emails for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Soft delete email ────────────────────────────────────────

  async deleteEmail(userId, emailId) {
    try {
      if (!userId || !emailId) throw new Error('userId and emailId are required');

      const query = { userId };
      if (mongoose.Types.ObjectId.isValid(emailId)) {
        query._id = emailId;
      } else {
        query.messageId = emailId;
      }

      const result = await this.model.findOneAndUpdate(
        query,
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true, lean: true }
      );

      if (!result) {
        logger.warn(`Email ${emailId} not found for soft delete (user ${userId})`);
        return null;
      }

      logger.info(`Soft-deleted email ${emailId} for user ${userId}`);
      return result;
    } catch (err) {
      logger.error(`Error deleting email ${emailId} for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Mark email as AI-processed ───────────────────────────────

  async markAsProcessed(userId, emailId, analysisResult = null) {
    try {
      if (!userId || !emailId) throw new Error('userId and emailId are required');

      const query = { userId };
      if (mongoose.Types.ObjectId.isValid(emailId)) {
        query._id = emailId;
      } else {
        query.messageId = emailId;
      }

      const updatePayload = {
        isProcessed: true,
        processedAt: new Date()
      };

      if (analysisResult) {
        updatePayload.aiAnalysis = analysisResult;
      }

      const result = await this.model.findOneAndUpdate(
        query,
        { $set: updatePayload },
        { new: true, lean: true }
      );

      if (!result) {
        logger.warn(`Email ${emailId} not found to mark as processed (user ${userId})`);
        return null;
      }

      logger.debug(`Marked email ${emailId} as processed for user ${userId}`);
      return result;
    } catch (err) {
      logger.error(`Error marking email ${emailId} as processed: ${err.message}`);
      throw err;
    }
  }

  // ── Get unprocessed emails ───────────────────────────────────

  async getUnprocessedEmails(userId, options = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const limit = Math.min(500, parseInt(options.limit, 10) || 100);
      const category = options.category || null;

      const query = {
        userId,
        isDeleted: false,
        isProcessed: false
      };

      if (category) {
        query.category = category;
      }

      if (options.financialOnly) {
        query.isFinancial = true;
      }

      const emails = await this.model.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .select({ htmlBody: 0 })
        .lean();

      logger.debug(`Found ${emails.length} unprocessed emails for user ${userId}`);
      return emails;
    } catch (err) {
      logger.error(`Error getting unprocessed emails for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Check for duplicate emails ───────────────────────────────

  async getDuplicateCheck(userId, messageId) {
    try {
      if (!userId || !messageId) throw new Error('userId and messageId are required');

      const existing = await this.model.findOne(
        { userId, messageId },
        { _id: 1, messageId: 1, subject: 1, date: 1, isDeleted: 1 }
      ).lean();

      return {
        isDuplicate: !!existing,
        existingEmail: existing || null
      };
    } catch (err) {
      logger.error(`Error checking duplicate for messageId ${messageId}: ${err.message}`);
      throw err;
    }
  }

  // ── Export emails to CSV or JSON ─────────────────────────────

  async exportEmails(userId, format = 'json', filters = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const query = { userId, isDeleted: false };

      if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) query.date.$gte = new Date(filters.startDate);
        if (filters.endDate) query.date.$lte = new Date(filters.endDate);
      }
      if (filters.category) query.category = filters.category;
      if (filters.isFinancial !== undefined) query.isFinancial = filters.isFinancial;

      const emails = await this.model.find(query)
        .sort({ date: -1 })
        .select({ htmlBody: 0, body: 0 })
        .lean();

      if (format === 'csv') {
        return this._convertToCSV(emails);
      }

      return { data: emails, format: 'json', count: emails.length };
    } catch (err) {
      logger.error(`Error exporting emails for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Email timeline aggregation ───────────────────────────────

  async getEmailTimeline(userId, groupBy = 'day') {
    try {
      if (!userId) throw new Error('userId is required');

      let dateGrouping;
      switch (groupBy) {
        case 'week':
          dateGrouping = {
            year: { $isoWeekYear: '$date' },
            week: { $isoWeek: '$date' }
          };
          break;
        case 'month':
          dateGrouping = {
            year: { $year: '$date' },
            month: { $month: '$date' }
          };
          break;
        case 'day':
        default:
          dateGrouping = {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          };
          break;
      }

      const pipeline = [
        { $match: { userId, isDeleted: false } },
        {
          $group: {
            _id: dateGrouping,
            count: { $sum: 1 },
            financialCount: {
              $sum: { $cond: ['$isFinancial', 1, 0] }
            },
            categories: { $addToSet: '$category' },
            totalAmount: {
              $sum: {
                $cond: [
                  { $ne: ['$parsedTransaction.amount', null] },
                  { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } },
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ];

      const timeline = await this.model.aggregate(pipeline);

      const formatted = timeline.map(entry => {
        let label;
        if (groupBy === 'day') {
          label = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}-${String(entry._id.day).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
          label = `${entry._id.year}-W${String(entry._id.week).padStart(2, '0')}`;
        } else {
          label = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`;
        }
        return {
          label,
          period: entry._id,
          count: entry.count,
          financialCount: entry.financialCount,
          categories: entry.categories,
          totalAmount: Math.round(entry.totalAmount * 100) / 100
        };
      });

      logger.debug(`Generated ${groupBy} timeline with ${formatted.length} entries for user ${userId}`);
      return formatted;
    } catch (err) {
      logger.error(`Error generating email timeline for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Group emails by bank ─────────────────────────────────────

  async getEmailsByBank(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const pipeline = [
        { $match: { userId, isDeleted: false, from: { $exists: true, $ne: '' } } },
        {
          $addFields: {
            bankDomain: {
              $arrayElemAt: [
                { $split: [{ $arrayElemAt: [{ $split: ['$from', '@'] }, 1] }, '>'] },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: '$bankDomain',
            count: { $sum: 1 },
            financialCount: { $sum: { $cond: ['$isFinancial', 1, 0] } },
            categories: { $addToSet: '$category' },
            latestDate: { $max: '$date' },
            earliestDate: { $min: '$date' },
            sampleSubjects: { $push: '$subject' },
            totalDebits: {
              $sum: {
                $cond: [
                  { $eq: ['$parsedTransaction.type', 'debit'] },
                  { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } },
                  0
                ]
              }
            },
            totalCredits: {
              $sum: {
                $cond: [
                  { $eq: ['$parsedTransaction.type', 'credit'] },
                  { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } },
                  0
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } },
        {
          $project: {
            _id: 1,
            count: 1,
            financialCount: 1,
            categories: 1,
            latestDate: 1,
            earliestDate: 1,
            sampleSubjects: { $slice: ['$sampleSubjects', 5] },
            totalDebits: { $round: ['$totalDebits', 2] },
            totalCredits: { $round: ['$totalCredits', 2] }
          }
        }
      ];

      const bankGroups = await this.model.aggregate(pipeline);

      logger.debug(`Found emails from ${bankGroups.length} banks for user ${userId}`);
      return bankGroups.map(g => ({
        bank: g._id || 'unknown',
        count: g.count,
        financialCount: g.financialCount,
        categories: g.categories,
        latestDate: g.latestDate,
        earliestDate: g.earliestDate,
        sampleSubjects: g.sampleSubjects,
        totalDebits: g.totalDebits,
        totalCredits: g.totalCredits
      }));
    } catch (err) {
      logger.error(`Error getting emails by bank for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Group emails by category ─────────────────────────────────

  async getEmailsByCategory(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const pipeline = [
        { $match: { userId, isDeleted: false } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            subcategories: { $addToSet: '$subcategory' },
            latestDate: { $max: '$date' },
            earliestDate: { $min: '$date' },
            financialCount: { $sum: { $cond: ['$isFinancial', 1, 0] } },
            processedCount: { $sum: { $cond: ['$isProcessed', 1, 0] } },
            totalAmount: {
              $sum: {
                $cond: [
                  { $ne: ['$parsedTransaction.amount', null] },
                  { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } },
                  0
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ];

      const categoryGroups = await this.model.aggregate(pipeline);

      logger.debug(`Found ${categoryGroups.length} categories for user ${userId}`);
      return categoryGroups.map(g => ({
        category: g._id || 'uncategorized',
        count: g.count,
        subcategories: (g.subcategories || []).filter(Boolean),
        latestDate: g.latestDate,
        earliestDate: g.earliestDate,
        financialCount: g.financialCount,
        processedCount: g.processedCount,
        totalAmount: Math.round(g.totalAmount * 100) / 100
      }));
    } catch (err) {
      logger.error(`Error getting emails by category for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Transaction summary for a period ─────────────────────────

  async getTransactionSummary(userId, period = 'monthly') {
    try {
      if (!userId) throw new Error('userId is required');

      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'monthly':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const matchStage = {
        userId,
        isDeleted: false,
        isFinancial: true,
        date: { $gte: startDate }
      };

      const pipeline = [
        { $match: matchStage },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: '$parsedTransaction.type',
                  totalAmount: { $sum: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
                  count: { $sum: 1 },
                  avgAmount: { $avg: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
                  maxAmount: { $max: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
                  minAmount: { $min: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } }
                }
              }
            ],
            byCategory: [
              {
                $group: {
                  _id: '$category',
                  totalAmount: { $sum: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
                  count: { $sum: 1 }
                }
              },
              { $sort: { totalAmount: -1 } }
            ],
            byDay: [
              {
                $group: {
                  _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' },
                    day: { $dayOfMonth: '$date' }
                  },
                  totalAmount: { $sum: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } } },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ],
            topTransactions: [
              {
                $addFields: {
                  txnAmount: { $toDouble: { $ifNull: ['$parsedTransaction.amount', 0] } }
                }
              },
              { $sort: { txnAmount: -1 } },
              { $limit: 10 },
              {
                $project: {
                  subject: 1, from: 1, date: 1, category: 1,
                  parsedTransaction: 1, txnAmount: 1
                }
              }
            ]
          }
        }
      ];

      const [result] = await this.model.aggregate(pipeline);

      const debits = result.summary.find(s => s._id === 'debit') || { totalAmount: 0, count: 0, avgAmount: 0, maxAmount: 0, minAmount: 0 };
      const credits = result.summary.find(s => s._id === 'credit') || { totalAmount: 0, count: 0, avgAmount: 0, maxAmount: 0, minAmount: 0 };

      const summary = {
        period,
        startDate,
        endDate: now,
        debits: {
          total: Math.round(debits.totalAmount * 100) / 100,
          count: debits.count,
          average: Math.round(debits.avgAmount * 100) / 100,
          max: Math.round(debits.maxAmount * 100) / 100,
          min: Math.round(debits.minAmount * 100) / 100
        },
        credits: {
          total: Math.round(credits.totalAmount * 100) / 100,
          count: credits.count,
          average: Math.round(credits.avgAmount * 100) / 100,
          max: Math.round(credits.maxAmount * 100) / 100,
          min: Math.round(credits.minAmount * 100) / 100
        },
        netFlow: Math.round((credits.totalAmount - debits.totalAmount) * 100) / 100,
        byCategory: result.byCategory.map(c => ({
          category: c._id || 'uncategorized',
          totalAmount: Math.round(c.totalAmount * 100) / 100,
          count: c.count
        })),
        dailyBreakdown: result.byDay.map(d => ({
          date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
          totalAmount: Math.round(d.totalAmount * 100) / 100,
          count: d.count
        })),
        topTransactions: result.topTransactions
      };

      logger.debug(`Generated ${period} transaction summary for user ${userId}`);
      return summary;
    } catch (err) {
      logger.error(`Error generating transaction summary for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Internal helpers ─────────────────────────────────────────

  _sanitizeEmailData(userId, data) {
    const sanitized = {
      userId,
      messageId: data.messageId,
      threadId: data.threadId || null,
      subject: String(data.subject || '').substring(0, 1000),
      from: String(data.from || '').substring(0, 500),
      to: String(data.to || '').substring(0, 500),
      date: data.date ? new Date(data.date) : new Date(),
      snippet: String(data.snippet || '').substring(0, 2000),
      body: data.body || '',
      htmlBody: data.htmlBody || '',
      labels: Array.isArray(data.labels) ? data.labels : [],
      category: data.category || 'uncategorized',
      subcategory: data.subcategory || '',
      parsedTransaction: data.parsedTransaction || null,
      upiDetails: data.upiDetails || null,
      bankAlertDetails: data.bankAlertDetails || null,
      amounts: Array.isArray(data.amounts) ? data.amounts : [],
      sentiment: data.sentiment || null,
      isFinancial: Boolean(data.isFinancial),
      isProcessed: Boolean(data.isProcessed),
      isArchived: Boolean(data.isArchived),
      attachments: Array.isArray(data.attachments) ? data.attachments.map(att => ({
        filename: att.filename || '',
        path: att.path || '',
        mimeType: att.mimeType || '',
        size: Number(att.size) || 0
      })) : [],
      aiAnalysis: data.aiAnalysis || null,
      metadata: data.metadata || {}
    };

    return sanitized;
  }

  _convertToCSV(emails) {
    if (!emails || emails.length === 0) {
      return { data: '', format: 'csv', count: 0 };
    }

    const headers = [
      'Date', 'From', 'Subject', 'Category', 'Subcategory',
      'Is Financial', 'Transaction Type', 'Transaction Amount',
      'Transaction Description', 'Bank', 'Labels', 'Message ID'
    ];

    const rows = emails.map(email => {
      const txn = email.parsedTransaction || {};
      const bankDomain = (email.from || '').includes('@')
        ? email.from.split('@')[1].replace('>', '').trim()
        : '';

      return [
        email.date ? new Date(email.date).toISOString() : '',
        this._csvEscape(email.from || ''),
        this._csvEscape(email.subject || ''),
        this._csvEscape(email.category || ''),
        this._csvEscape(email.subcategory || ''),
        email.isFinancial ? 'Yes' : 'No',
        txn.type || '',
        txn.amount || '',
        this._csvEscape(txn.description || ''),
        bankDomain,
        (email.labels || []).join('; '),
        email.messageId || ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    return { data: csv, format: 'csv', count: emails.length };
  }

  _csvEscape(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

// ─── EmailIndexService ─────────────────────────────────────────

class EmailIndexService {
  constructor() {
    this.model = GmailEmail;
    this.indices = new Map();    // userId -> index data
    this.vocabulary = new Map(); // userId -> { term -> { docFreq, docs } }
  }

  // ── Build search index for a user ────────────────────────────

  async buildIndex(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      logger.info(`Building search index for user ${userId}`);

      const emails = await this.model.find(
        { userId, isDeleted: false },
        { subject: 1, snippet: 1, body: 1, from: 1, category: 1, date: 1, messageId: 1 }
      ).lean();

      if (emails.length === 0) {
        logger.info(`No emails to index for user ${userId}`);
        this.indices.set(userId, { docCount: 0, terms: new Map(), built: new Date() });
        return { docCount: 0, termCount: 0 };
      }

      const terms = new Map();
      const docCount = emails.length;

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const docId = email._id.toString();
        const text = [
          email.subject || '',
          email.snippet || '',
          email.from || '',
          email.category || ''
        ].join(' ');

        const tokens = this._tokenize(text);
        const termFreqs = new Map();

        for (const token of tokens) {
          termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
        }

        for (const [term, tf] of termFreqs) {
          if (!terms.has(term)) {
            terms.set(term, { docFreq: 0, docs: new Map() });
          }
          const termData = terms.get(term);
          termData.docFreq++;
          termData.docs.set(docId, {
            tf,
            normalizedTf: tf / tokens.length,
            emailRef: {
              _id: email._id,
              messageId: email.messageId,
              subject: email.subject,
              from: email.from,
              date: email.date,
              category: email.category
            }
          });
        }
      }

      // Compute IDF for each term
      for (const [, termData] of terms) {
        termData.idf = Math.log(docCount / (termData.docFreq + 1)) + 1;
      }

      this.indices.set(userId, { docCount, terms, built: new Date() });
      this.vocabulary.set(userId, Array.from(terms.keys()));

      logger.info(`Index built for user ${userId}: ${docCount} docs, ${terms.size} unique terms`);
      return { docCount, termCount: terms.size };
    } catch (err) {
      logger.error(`Error building search index for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Search using TF-IDF scoring ──────────────────────────────

  async search(userId, query, filters = {}) {
    try {
      if (!userId || !query) throw new Error('userId and query are required');

      let index = this.indices.get(userId);
      if (!index || index.docCount === 0) {
        await this.buildIndex(userId);
        index = this.indices.get(userId);
      }

      if (!index || index.docCount === 0) {
        return { results: [], total: 0, query };
      }

      const queryTokens = this._tokenize(query);
      if (queryTokens.length === 0) {
        return { results: [], total: 0, query };
      }

      const docScores = new Map();

      for (const token of queryTokens) {
        const termData = index.terms.get(token);
        if (!termData) continue;

        for (const [docId, docData] of termData.docs) {
          const tfidf = docData.normalizedTf * termData.idf;
          const currentScore = docScores.get(docId) || { score: 0, emailRef: docData.emailRef, matchedTerms: [] };
          currentScore.score += tfidf;
          currentScore.matchedTerms.push(token);
          docScores.set(docId, currentScore);
        }
      }

      let results = Array.from(docScores.values());

      // Apply filters post-scoring
      if (filters.category) {
        results = results.filter(r => r.emailRef.category === filters.category);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        results = results.filter(r => new Date(r.emailRef.date) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        results = results.filter(r => new Date(r.emailRef.date) <= end);
      }

      // Sort by TF-IDF score descending
      results.sort((a, b) => b.score - a.score);

      const limit = Math.min(MAX_SEARCH_RESULTS, parseInt(filters.limit, 10) || 50);
      results = results.slice(0, limit);

      logger.debug(`TF-IDF search "${query}" returned ${results.length} results for user ${userId}`);
      return {
        results: results.map(r => ({
          email: r.emailRef,
          score: Math.round(r.score * 10000) / 10000,
          matchedTerms: [...new Set(r.matchedTerms)]
        })),
        total: docScores.size,
        query
      };
    } catch (err) {
      logger.error(`Error searching index for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Auto-complete suggestions ────────────────────────────────

  async getSuggestions(userId, partial) {
    try {
      if (!userId || !partial) return [];

      const vocab = this.vocabulary.get(userId);
      if (!vocab || vocab.length === 0) {
        await this.buildIndex(userId);
        const rebuilt = this.vocabulary.get(userId);
        if (!rebuilt) return [];
      }

      const vocabList = this.vocabulary.get(userId) || [];
      const lower = partial.toLowerCase().trim();

      if (lower.length < 2) return [];

      const suggestions = [];
      const index = this.indices.get(userId);

      for (const term of vocabList) {
        if (term.startsWith(lower) || term.includes(lower)) {
          const termData = index && index.terms ? index.terms.get(term) : null;
          const score = termData ? termData.docFreq : 0;
          const relevance = term.startsWith(lower) ? 2 : 1;
          suggestions.push({ term, score: score * relevance, docFreq: score });
        }
      }

      suggestions.sort((a, b) => b.score - a.score);
      const topSuggestions = suggestions.slice(0, 10).map(s => s.term);

      logger.debug(`Generated ${topSuggestions.length} suggestions for "${partial}" (user ${userId})`);
      return topSuggestions;
    } catch (err) {
      logger.error(`Error getting suggestions for user ${userId}: ${err.message}`);
      return [];
    }
  }

  // ── Rebuild index from scratch ───────────────────────────────

  async reindex(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      logger.info(`Reindexing emails for user ${userId}`);
      this.indices.delete(userId);
      this.vocabulary.delete(userId);
      const result = await this.buildIndex(userId);
      logger.info(`Reindex complete for user ${userId}: ${result.docCount} docs, ${result.termCount} terms`);
      return result;
    } catch (err) {
      logger.error(`Error reindexing for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Internal helpers ─────────────────────────────────────────

  _tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[₹$€£¥]/g, ' currency ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2 && t.length < 40 && !STOP_WORDS.has(t));
  }
}

// ─── EmailAttachmentService ────────────────────────────────────

class EmailAttachmentService {
  constructor() {
    this.model = GmailEmailAttachment;
    this.emailModel = GmailEmail;
    this.uploadsDir = UPLOADS_DIR;
  }

  // ── Ensure uploads directory exists ──────────────────────────

  async _ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        logger.error(`Failed to create directory ${dirPath}: ${err.message}`);
        throw err;
      }
    }
  }

  // ── Save attachment to filesystem + DB ───────────────────────

  async saveAttachment(userId, emailId, attachment) {
    try {
      if (!userId || !emailId) throw new Error('userId and emailId are required');
      if (!attachment || !attachment.filename) throw new Error('attachment with filename is required');

      // Build storage path: uploads/email_attachments/<userId>/<emailId>/
      const userDir = path.join(this.uploadsDir, userId);
      const emailDir = path.join(userDir, String(emailId));
      await this._ensureDir(emailDir);

      // Create a unique filename to avoid collisions
      const ext = path.extname(attachment.filename);
      const baseName = path.basename(attachment.filename, ext);
      const uniqueSuffix = crypto.randomBytes(4).toString('hex');
      const safeFilename = `${baseName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${uniqueSuffix}${ext}`;
      const filePath = path.join(emailDir, safeFilename);

      // Write file to disk
      const content = attachment.content || attachment.data || Buffer.alloc(0);
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, attachment.encoding || 'base64');
      await fs.writeFile(filePath, buffer);

      // Compute checksum
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Save metadata to DB
      const doc = new this.model({
        userId,
        emailId: mongoose.Types.ObjectId.isValid(emailId) ? emailId : undefined,
        messageId: attachment.messageId || '',
        filename: safeFilename,
        originalFilename: attachment.filename,
        mimeType: attachment.mimeType || this._guessMimeType(attachment.filename),
        size: buffer.length,
        storagePath: filePath,
        checksum,
        metadata: attachment.metadata || {}
      });

      const saved = await doc.save();

      // Also update the parent email document's attachments array
      if (mongoose.Types.ObjectId.isValid(emailId)) {
        await this.emailModel.findByIdAndUpdate(emailId, {
          $push: {
            attachments: {
              filename: safeFilename,
              path: filePath,
              mimeType: doc.mimeType,
              size: buffer.length
            }
          }
        });
      }

      logger.info(`Saved attachment "${attachment.filename}" for email ${emailId} (user ${userId}), size ${buffer.length}`);
      return saved.toObject();
    } catch (err) {
      logger.error(`Error saving attachment for email ${emailId} (user ${userId}): ${err.message}`);
      throw err;
    }
  }

  // ── Retrieve attachment ──────────────────────────────────────

  async getAttachment(userId, emailId, attachmentId) {
    try {
      if (!userId || !emailId || !attachmentId) {
        throw new Error('userId, emailId, and attachmentId are required');
      }

      const query = {
        userId,
        _id: attachmentId,
        isDeleted: false
      };

      if (mongoose.Types.ObjectId.isValid(emailId)) {
        query.emailId = emailId;
      }

      const record = await this.model.findOne(query).lean();
      if (!record) {
        logger.debug(`Attachment ${attachmentId} not found for email ${emailId} (user ${userId})`);
        return null;
      }

      // Read file from disk
      let fileContent = null;
      let fileExists = false;
      try {
        await fs.access(record.storagePath);
        fileExists = true;
        fileContent = await fs.readFile(record.storagePath);
      } catch (readErr) {
        logger.warn(`Attachment file not found on disk: ${record.storagePath}`);
      }

      return {
        ...record,
        content: fileContent,
        fileExists
      };
    } catch (err) {
      logger.error(`Error getting attachment ${attachmentId}: ${err.message}`);
      throw err;
    }
  }

  // ── List attachments with filtering ──────────────────────────

  async listAttachments(userId, filters = {}) {
    try {
      if (!userId) throw new Error('userId is required');

      const query = { userId, isDeleted: false };

      if (filters.emailId) {
        if (mongoose.Types.ObjectId.isValid(filters.emailId)) {
          query.emailId = filters.emailId;
        }
      }

      if (filters.mimeType) {
        if (filters.mimeType.includes('*')) {
          const prefix = filters.mimeType.replace('*', '');
          query.mimeType = { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
        } else {
          query.mimeType = filters.mimeType;
        }
      }

      if (filters.minSize !== undefined || filters.maxSize !== undefined) {
        query.size = {};
        if (filters.minSize !== undefined) query.size.$gte = Number(filters.minSize);
        if (filters.maxSize !== undefined) query.size.$lte = Number(filters.maxSize);
      }

      if (filters.filename) {
        const escaped = filters.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.originalFilename = { $regex: escaped, $options: 'i' };
      }

      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const [attachments, total] = await Promise.all([
        this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        this.model.countDocuments(query)
      ]);

      logger.debug(`Listed ${attachments.length}/${total} attachments for user ${userId}`);
      return {
        attachments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (err) {
      logger.error(`Error listing attachments for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Delete attachment from disk and DB ───────────────────────

  async deleteAttachment(userId, emailId, attachmentId) {
    try {
      if (!userId || !emailId || !attachmentId) {
        throw new Error('userId, emailId, and attachmentId are required');
      }

      const query = { userId, _id: attachmentId, isDeleted: false };
      if (mongoose.Types.ObjectId.isValid(emailId)) {
        query.emailId = emailId;
      }

      const record = await this.model.findOne(query).lean();
      if (!record) {
        logger.warn(`Attachment ${attachmentId} not found for deletion (user ${userId})`);
        return null;
      }

      // Delete file from disk
      try {
        await fs.access(record.storagePath);
        await fs.unlink(record.storagePath);
        logger.debug(`Deleted attachment file: ${record.storagePath}`);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') {
          logger.warn(`Error deleting attachment file ${record.storagePath}: ${unlinkErr.message}`);
        }
      }

      // Soft-delete in DB
      await this.model.findByIdAndUpdate(attachmentId, {
        $set: { isDeleted: true, deletedAt: new Date() }
      });

      // Remove from parent email's attachments array
      if (mongoose.Types.ObjectId.isValid(emailId)) {
        await this.emailModel.findByIdAndUpdate(emailId, {
          $pull: { attachments: { filename: record.filename } }
        });
      }

      // Try to clean up empty directories
      try {
        const emailDir = path.dirname(record.storagePath);
        const remaining = await fs.readdir(emailDir);
        if (remaining.length === 0) {
          await fs.rmdir(emailDir);
          logger.debug(`Removed empty directory: ${emailDir}`);
        }
      } catch (_) {
        // Ignore cleanup errors
      }

      logger.info(`Deleted attachment ${attachmentId} for email ${emailId} (user ${userId})`);
      return { deleted: true, filename: record.originalFilename };
    } catch (err) {
      logger.error(`Error deleting attachment ${attachmentId}: ${err.message}`);
      throw err;
    }
  }

  // ── Attachment statistics ────────────────────────────────────

  async getAttachmentStats(userId) {
    try {
      if (!userId) throw new Error('userId is required');

      const pipeline = [
        { $match: { userId, isDeleted: false } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalCount: { $sum: 1 },
                  totalSize: { $sum: '$size' },
                  avgSize: { $avg: '$size' },
                  maxSize: { $max: '$size' },
                  minSize: { $min: '$size' }
                }
              }
            ],
            byMimeType: [
              {
                $group: {
                  _id: '$mimeType',
                  count: { $sum: 1 },
                  totalSize: { $sum: '$size' }
                }
              },
              { $sort: { count: -1 } }
            ],
            byExtension: [
              {
                $addFields: {
                  extension: {
                    $arrayElemAt: [
                      { $split: ['$originalFilename', '.'] },
                      -1
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$extension',
                  count: { $sum: 1 },
                  totalSize: { $sum: '$size' }
                }
              },
              { $sort: { count: -1 } }
            ],
            recentAttachments: [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              {
                $project: {
                  filename: 1,
                  originalFilename: 1,
                  mimeType: 1,
                  size: 1,
                  createdAt: 1
                }
              }
            ]
          }
        }
      ];

      const [result] = await this.model.aggregate(pipeline);

      const totals = result.totals[0] || { totalCount: 0, totalSize: 0, avgSize: 0, maxSize: 0, minSize: 0 };

      const stats = {
        totalCount: totals.totalCount,
        totalSize: totals.totalSize,
        totalSizeFormatted: this._formatBytes(totals.totalSize),
        avgSize: Math.round(totals.avgSize || 0),
        avgSizeFormatted: this._formatBytes(Math.round(totals.avgSize || 0)),
        maxSize: totals.maxSize || 0,
        maxSizeFormatted: this._formatBytes(totals.maxSize || 0),
        minSize: totals.minSize || 0,
        minSizeFormatted: this._formatBytes(totals.minSize || 0),
        byMimeType: result.byMimeType.map(m => ({
          mimeType: m._id || 'unknown',
          count: m.count,
          totalSize: m.totalSize,
          totalSizeFormatted: this._formatBytes(m.totalSize)
        })),
        byExtension: result.byExtension.map(e => ({
          extension: e._id || 'none',
          count: e.count,
          totalSize: e.totalSize,
          totalSizeFormatted: this._formatBytes(e.totalSize)
        })),
        recentAttachments: result.recentAttachments
      };

      logger.debug(`Generated attachment stats for user ${userId}: ${stats.totalCount} attachments, ${stats.totalSizeFormatted}`);
      return stats;
    } catch (err) {
      logger.error(`Error getting attachment stats for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // ── Internal helpers ─────────────────────────────────────────

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
  }

  _guessMimeType(filename) {
    if (!filename) return 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.eml': 'message/rfc822'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}

// ─── Module Exports ────────────────────────────────────────────

const emailStorageService = new EmailStorageService();
const emailIndexService = new EmailIndexService();
const emailAttachmentService = new EmailAttachmentService();

module.exports = {
  EmailStorageService,
  EmailIndexService,
  EmailAttachmentService,
  emailStorageService,
  emailIndexService,
  emailAttachmentService,
  GmailEmail,
  GmailEmailAttachment
};
