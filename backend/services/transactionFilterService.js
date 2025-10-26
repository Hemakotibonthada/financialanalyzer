/**
 * Transaction Filter Service
 * Advanced filtering and querying for transactions
 */

class TransactionFilterService {
  /**
   * Build MongoDB query from filter parameters
   * @param {string} userId - User ID to filter by
   * @param {Object} filters - Filter parameters
   * @returns {Object} MongoDB query object
   */
  static buildQuery(userId, filters = {}) {
    const query = { userId };

    // Date range filters
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    // Quick date range presets
    if (filters.dateRange) {
      const now = new Date();
      query.date = {};

      switch (filters.dateRange) {
        case 'today':
          query.date.$gte = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          query.date.$gte = new Date(yesterday.setHours(0, 0, 0, 0));
          query.date.$lte = new Date(yesterday.setHours(23, 59, 59, 999));
          break;
        case 'last7days':
          query.date.$gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'last30days':
          query.date.$gte = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'last90days':
          query.date.$gte = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'thisMonth':
          query.date.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          query.date.$gte = lastMonth;
          query.date.$lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'thisYear':
          query.date.$gte = new Date(now.getFullYear(), 0, 1);
          break;
        case 'lastYear':
          query.date.$gte = new Date(now.getFullYear() - 1, 0, 1);
          query.date.$lte = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
      }
    }

    // Amount range filters
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) {
        query.amount.$gte = parseFloat(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query.amount.$lte = parseFloat(filters.maxAmount);
      }
    }

    // Transaction type filter
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query.type = { $in: filters.type };
      } else {
        query.type = filters.type;
      }
    }

    // Category filter (supports multiple categories)
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        query.category = { $in: filters.category };
      } else {
        query.category = filters.category;
      }
    }

    // Subcategory filter
    if (filters.subcategory) {
      if (Array.isArray(filters.subcategory)) {
        query.subcategory = { $in: filters.subcategory };
      } else {
        query.subcategory = filters.subcategory;
      }
    }

    // Payment method filter
    if (filters.paymentMethod) {
      if (Array.isArray(filters.paymentMethod)) {
        query.paymentMethod = { $in: filters.paymentMethod };
      } else {
        query.paymentMethod = filters.paymentMethod;
      }
    }

    // Merchant name filter
    if (filters.merchantName) {
      query.merchantName = { $regex: filters.merchantName, $options: 'i' };
    }

    // Source filter
    if (filters.source) {
      if (Array.isArray(filters.source)) {
        query.source = { $in: filters.source };
      } else {
        query.source = filters.source;
      }
    }

    // Recurring transactions filter
    if (filters.isRecurring !== undefined) {
      query.isRecurring = filters.isRecurring === 'true' || filters.isRecurring === true;
    }

    // Verified transactions filter
    if (filters.isVerified !== undefined) {
      query.isVerified = filters.isVerified === 'true' || filters.isVerified === true;
    }

    // Text search (searches in description, merchant, category)
    if (filters.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: 'i' } },
        { merchantName: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
        { referenceNumber: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Location filter
    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    // Account number filter
    if (filters.accountNumber) {
      query.accountNumber = filters.accountNumber;
    }

    // Confidence score filter (for AI-categorized transactions)
    if (filters.minConfidence !== undefined) {
      query.confidence = { $gte: parseFloat(filters.minConfidence) };
    }

    // Tags filter (if transactions have tags)
    if (filters.tags) {
      if (Array.isArray(filters.tags)) {
        query.tags = { $in: filters.tags };
      } else {
        query.tags = filters.tags;
      }
    }

    return query;
  }

  /**
   * Get sort options from parameters
   * @param {Object} sortParams - Sort parameters
   * @returns {Object} MongoDB sort object
   */
  static buildSort(sortParams = {}) {
    const { sortBy = 'date', sortOrder = 'desc' } = sortParams;
    const order = sortOrder === 'asc' ? 1 : -1;

    const sortOptions = {};
    sortOptions[sortBy] = order;

    // Add secondary sort by date if primary sort is not date
    if (sortBy !== 'date') {
      sortOptions.date = -1;
    }

    return sortOptions;
  }

  /**
   * Get pagination options
   * @param {Object} paginationParams - Pagination parameters
   * @returns {Object} Pagination options
   */
  static buildPagination(paginationParams = {}) {
    const page = parseInt(paginationParams.page) || 1;
    const limit = Math.min(parseInt(paginationParams.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Get available filter values for a user
   * @param {Object} Transaction - Transaction model
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Available filter values
   */
  static async getAvailableFilters(Transaction, userId) {
    const [
      categories,
      paymentMethods,
      sources,
      merchantNames
    ] = await Promise.all([
      Transaction.distinct('category', { userId }),
      Transaction.distinct('paymentMethod', { userId }),
      Transaction.distinct('source', { userId }),
      Transaction.distinct('merchantName', { userId, merchantName: { $ne: null, $ne: '' } })
    ]);

    // Get amount range
    const amountStats = await Transaction.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get date range
    const dateStats = await Transaction.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      }
    ]);

    return {
      categories: categories.filter(c => c && c !== 'other').sort(),
      paymentMethods: paymentMethods.filter(p => p && p !== 'other').sort(),
      sources: sources.filter(s => s).sort(),
      merchantNames: merchantNames.slice(0, 50).sort(), // Limit to top 50
      amountRange: amountStats[0] || { minAmount: 0, maxAmount: 0, avgAmount: 0 },
      dateRange: dateStats[0] || { minDate: null, maxDate: null }
    };
  }

  /**
   * Build aggregation pipeline for advanced analytics
   * @param {string} userId - User ID
   * @param {Object} filters - Filter parameters
   * @returns {Array} MongoDB aggregation pipeline
   */
  static buildAnalyticsPipeline(userId, filters = {}) {
    const pipeline = [
      { $match: this.buildQuery(userId, filters) }
    ];

    // Group by requested dimension
    if (filters.groupBy) {
      const groupStage = {
        $group: {
          _id: `$${filters.groupBy}`,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      };

      pipeline.push(groupStage);
      pipeline.push({ $sort: { totalAmount: -1 } });
      
      if (filters.limit) {
        pipeline.push({ $limit: parseInt(filters.limit) });
      }
    }

    return pipeline;
  }
}

module.exports = TransactionFilterService;
