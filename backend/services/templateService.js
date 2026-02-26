/**
 * @fileoverview Financial Template Service
 * Manages financial templates for budgets, goals, and savings plans.
 * Users can browse system-provided templates or create custom ones,
 * rate them, and apply them to their accounts.
 * @module services/templateService
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ---------- Mongoose Schema ---------- */

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'budget',
        'savings',
        'investment',
        'debt-payoff',
        'emergency-fund',
        'retirement',
        'education',
        'wedding',
        'travel',
        'custom',
      ],
    },
    type: {
      type: String,
      enum: ['system', 'custom'],
      default: 'custom',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    config: {
      categories: [
        {
          name: String,
          percentage: Number,
          amount: Number,
        },
      ],
      totalAmount: { type: Number, default: 0 },
      period: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
      goals: [
        {
          name: String,
          targetAmount: Number,
          timelineMonths: Number,
        },
      ],
      rules: [
        {
          field: String,
          operator: String,
          value: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 5 },
        review: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    tags: [String],
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

templateSchema.index({ category: 1, type: 1 });
templateSchema.index({ averageRating: -1, usageCount: -1 });

const Template = mongoose.models.Template || mongoose.model('Template', templateSchema);

/* ============================================================
 *  Template Service
 * ============================================================ */
const templateService = {
  /* ----------------------------------------------------------
   *  getTemplates
   * ---------------------------------------------------------- */
  /**
   * List templates with optional filtering, sorting, and pagination.
   * @param {Object} filters
   * @param {string} [filters.category] - Filter by category.
   * @param {string} [filters.type] - system | custom
   * @param {string} [filters.search] - Text search on name / description.
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=20]
   * @param {string} [pagination.sortBy='averageRating']
   * @param {string} [pagination.sortOrder='desc']
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getTemplates(filters = {}, pagination = {}) {
    try {
      const { category, type, search } = filters;
      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const sortBy = pagination.sortBy || 'averageRating';
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

      const query = { isActive: true };
      if (category) query.category = category;
      if (type) query.type = type;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ];
      }

      const [templates, total] = await Promise.all([
        Template.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Template.countDocuments(query),
      ]);

      return {
        success: true,
        data: {
          templates,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      logger.error(`getTemplates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getTemplateById
   * ---------------------------------------------------------- */
  /**
   * Retrieve a single template by its ID.
   * @param {string} id - Template document ID.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getTemplateById(id) {
    try {
      if (!id) throw new Error('Template ID is required');

      const template = await Template.findOne({ _id: id, isActive: true }).lean();
      if (!template) throw new Error('Template not found');

      return { success: true, data: template };
    } catch (error) {
      logger.error(`getTemplateById error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  createTemplate
   * ---------------------------------------------------------- */
  /**
   * Create a custom template.
   * @param {string} userId - Creator's user ID.
   * @param {Object} templateData
   * @param {string} templateData.name
   * @param {string} templateData.description
   * @param {string} templateData.category
   * @param {Object} templateData.config
   * @param {Array<string>} [templateData.tags]
   * @param {boolean} [templateData.isPublic=true]
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createTemplate(userId, templateData) {
    try {
      if (!userId) throw new Error('userId is required');
      if (!templateData?.name) throw new Error('Template name is required');
      if (!templateData?.category) throw new Error('Category is required');

      // Validate category percentages sum to 100 if provided
      if (templateData.config?.categories?.length) {
        const totalPct = templateData.config.categories.reduce(
          (s, c) => s + (c.percentage || 0),
          0
        );
        if (Math.abs(totalPct - 100) > 0.5) {
          throw new Error('Category percentages should sum to approximately 100%');
        }
      }

      const template = new Template({
        ...templateData,
        type: 'custom',
        createdBy: userId,
        isPublic: templateData.isPublic !== false,
      });

      await template.save();
      logger.info(`Template created: ${template.name} by user ${userId}`);
      return { success: true, data: template.toObject() };
    } catch (error) {
      logger.error(`createTemplate error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  applyTemplate
   * ---------------------------------------------------------- */
  /**
   * Apply a template's configuration to the user's budgets or goals.
   * Increments the template's usageCount.
   * @param {string} userId
   * @param {string} templateId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async applyTemplate(userId, templateId) {
    try {
      if (!userId || !templateId) throw new Error('userId and templateId are required');

      const template = await Template.findOne({ _id: templateId, isActive: true });
      if (!template) throw new Error('Template not found');

      // Increment usage count
      template.usageCount += 1;
      await template.save();

      // Build the applied configuration object for the caller to persist
      const appliedConfig = {
        templateId: template._id,
        templateName: template.name,
        category: template.category,
        period: template.config?.period || 'monthly',
        categories: (template.config?.categories || []).map((c) => ({
          name: c.name,
          percentage: c.percentage,
          allocatedAmount: c.amount || 0,
        })),
        goals: (template.config?.goals || []).map((g) => ({
          name: g.name,
          targetAmount: g.targetAmount,
          timelineMonths: g.timelineMonths,
          monthlyContribution: g.timelineMonths
            ? +(g.targetAmount / g.timelineMonths).toFixed(2)
            : 0,
        })),
        appliedAt: new Date(),
      };

      logger.info(`Template ${templateId} applied by user ${userId}`);
      return { success: true, data: appliedConfig };
    } catch (error) {
      logger.error(`applyTemplate error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  rateTemplate
   * ---------------------------------------------------------- */
  /**
   * Add or update a user's rating on a template.
   * @param {string} userId
   * @param {string} templateId
   * @param {number} rating - 1-5 score.
   * @param {string} [review] - Optional text review.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async rateTemplate(userId, templateId, rating, review = '') {
    try {
      if (!userId || !templateId) throw new Error('userId and templateId are required');
      if (!rating || rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

      const template = await Template.findOne({ _id: templateId, isActive: true });
      if (!template) throw new Error('Template not found');

      // Upsert user's rating
      const existingIdx = template.ratings.findIndex(
        (r) => r.userId && r.userId.toString() === userId.toString()
      );

      if (existingIdx >= 0) {
        template.ratings[existingIdx].score = rating;
        template.ratings[existingIdx].review = review;
        template.ratings[existingIdx].createdAt = new Date();
      } else {
        template.ratings.push({ userId, score: rating, review, createdAt: new Date() });
      }

      // Recalculate average
      const totalScore = template.ratings.reduce((s, r) => s + r.score, 0);
      template.averageRating = +(totalScore / template.ratings.length).toFixed(2);

      await template.save();
      logger.info(`Template ${templateId} rated ${rating} by user ${userId}`);
      return {
        success: true,
        data: {
          averageRating: template.averageRating,
          totalRatings: template.ratings.length,
        },
      };
    } catch (error) {
      logger.error(`rateTemplate error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  deleteTemplate
   * ---------------------------------------------------------- */
  /**
   * Soft-delete a template. Only the creator can delete custom templates.
   * @param {string} userId
   * @param {string} templateId
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async deleteTemplate(userId, templateId) {
    try {
      if (!userId || !templateId) throw new Error('userId and templateId are required');

      const template = await Template.findOne({
        _id: templateId,
        createdBy: userId,
        type: 'custom',
        isActive: true,
      });

      if (!template) throw new Error('Template not found or you do not have permission to delete it');

      template.isActive = false;
      await template.save();

      logger.info(`Template ${templateId} deleted by user ${userId}`);
      return { success: true, data: { id: templateId, deletedAt: new Date() } };
    } catch (error) {
      logger.error(`deleteTemplate error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getPopularTemplates
   * ---------------------------------------------------------- */
  /**
   * Retrieve most popular templates ranked by usage and rating.
   * @param {number} [limit=10]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getPopularTemplates(limit = 10) {
    try {
      const safeLimit = Math.min(50, Math.max(1, limit));

      const templates = await Template.find({ isActive: true, isPublic: true })
        .sort({ usageCount: -1, averageRating: -1 })
        .limit(safeLimit)
        .lean();

      return { success: true, data: templates };
    } catch (error) {
      logger.error(`getPopularTemplates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  getSystemTemplates
   * ---------------------------------------------------------- */
  /**
   * Retrieve pre-built system templates, optionally filtered by category.
   * @param {string} [category]
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getSystemTemplates(category) {
    try {
      const query = { type: 'system', isActive: true };
      if (category) query.category = category;

      const templates = await Template.find(query).sort({ name: 1 }).lean();
      return { success: true, data: templates };
    } catch (error) {
      logger.error(`getSystemTemplates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /* ----------------------------------------------------------
   *  seedDefaultTemplates
   * ---------------------------------------------------------- */
  /**
   * Seed initial system templates into the database if they don't exist.
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async seedDefaultTemplates() {
    try {
      const existing = await Template.countDocuments({ type: 'system' });
      if (existing > 0) {
        logger.info(`System templates already seeded (${existing} found). Skipping.`);
        return { success: true, data: { seeded: 0, existing } };
      }

      const defaults = [
        {
          name: '50/30/20 Budget',
          description: 'Classic budgeting rule: 50% needs, 30% wants, 20% savings.',
          category: 'budget',
          type: 'system',
          config: {
            period: 'monthly',
            categories: [
              { name: 'Needs', percentage: 50, amount: 0 },
              { name: 'Wants', percentage: 30, amount: 0 },
              { name: 'Savings & Investments', percentage: 20, amount: 0 },
            ],
          },
          tags: ['beginner', 'budgeting', 'popular'],
        },
        {
          name: 'Emergency Fund Builder',
          description: 'Build a 6-month emergency fund at a steady pace.',
          category: 'emergency-fund',
          type: 'system',
          config: {
            period: 'monthly',
            goals: [{ name: 'Emergency Fund', targetAmount: 300000, timelineMonths: 12 }],
            categories: [
              { name: 'Emergency Savings', percentage: 20, amount: 0 },
              { name: 'Living Expenses', percentage: 80, amount: 0 },
            ],
          },
          tags: ['emergency', 'safety-net'],
        },
        {
          name: 'Aggressive Debt Payoff',
          description: 'Snowball method to aggressively pay down debt.',
          category: 'debt-payoff',
          type: 'system',
          config: {
            period: 'monthly',
            categories: [
              { name: 'Debt Repayment', percentage: 40, amount: 0 },
              { name: 'Essentials', percentage: 45, amount: 0 },
              { name: 'Discretionary', percentage: 15, amount: 0 },
            ],
            rules: [
              { field: 'debtBalance', operator: 'gt', value: 0 },
            ],
          },
          tags: ['debt', 'snowball', 'aggressive'],
        },
        {
          name: 'Retirement Saver (NPS + PPF)',
          description: 'Long-term retirement savings with NPS and PPF.',
          category: 'retirement',
          type: 'system',
          config: {
            period: 'monthly',
            categories: [
              { name: 'NPS Contribution', percentage: 10, amount: 0 },
              { name: 'PPF Contribution', percentage: 10, amount: 0 },
              { name: 'Living Expenses', percentage: 60, amount: 0 },
              { name: 'Short-term Savings', percentage: 20, amount: 0 },
            ],
            goals: [{ name: 'Retirement Corpus', targetAmount: 10000000, timelineMonths: 300 }],
          },
          tags: ['retirement', 'nps', 'ppf', 'long-term'],
        },
        {
          name: 'Education Fund',
          description: 'Plan for a child\'s higher education.',
          category: 'education',
          type: 'system',
          config: {
            period: 'monthly',
            goals: [{ name: 'Education Fund', targetAmount: 2000000, timelineMonths: 120 }],
            categories: [
              { name: 'Education Savings', percentage: 15, amount: 0 },
              { name: 'Other Expenses', percentage: 85, amount: 0 },
            ],
          },
          tags: ['education', 'children', 'planning'],
        },
        {
          name: 'Wedding Planner Budget',
          description: 'Budget template for planning a wedding.',
          category: 'wedding',
          type: 'system',
          config: {
            period: 'monthly',
            goals: [{ name: 'Wedding Fund', targetAmount: 1500000, timelineMonths: 18 }],
            categories: [
              { name: 'Venue & Catering', percentage: 40, amount: 0 },
              { name: 'Outfits & Jewelry', percentage: 20, amount: 0 },
              { name: 'Decorations & Photography', percentage: 15, amount: 0 },
              { name: 'Miscellaneous', percentage: 25, amount: 0 },
            ],
          },
          tags: ['wedding', 'event', 'planning'],
        },
        {
          name: 'SIP Investment Starter',
          description: 'Start with SIP investments in diversified mutual funds.',
          category: 'investment',
          type: 'system',
          config: {
            period: 'monthly',
            categories: [
              { name: 'Large Cap Fund', percentage: 40, amount: 0 },
              { name: 'Mid Cap Fund', percentage: 30, amount: 0 },
              { name: 'Small Cap / ELSS', percentage: 20, amount: 0 },
              { name: 'Debt Fund', percentage: 10, amount: 0 },
            ],
            goals: [{ name: 'Wealth Creation', targetAmount: 5000000, timelineMonths: 120 }],
          },
          tags: ['investment', 'sip', 'mutual-funds'],
        },
        {
          name: 'Travel Savings Plan',
          description: 'Save systematically for your dream vacation.',
          category: 'travel',
          type: 'system',
          config: {
            period: 'monthly',
            goals: [{ name: 'Travel Fund', targetAmount: 200000, timelineMonths: 12 }],
            categories: [
              { name: 'Travel Savings', percentage: 15, amount: 0 },
              { name: 'Regular Expenses', percentage: 85, amount: 0 },
            ],
          },
          tags: ['travel', 'vacation', 'savings'],
        },
      ];

      await Template.insertMany(defaults);

      logger.info(`Seeded ${defaults.length} default system templates`);
      return { success: true, data: { seeded: defaults.length } };
    } catch (error) {
      logger.error(`seedDefaultTemplates error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = templateService;
