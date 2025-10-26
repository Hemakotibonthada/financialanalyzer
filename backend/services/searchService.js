const Transaction = require('../models/Transaction');
const Document = require('../models/Document');
const EMI = require('../models/EMI');
const BillReminder = require('../models/BillReminder');

/**
 * Comprehensive search service for financial data
 * Provides full-text search, filters, and suggestions
 */
class SearchService {
  /**
   * Search transactions with full-text search and filters
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options (filters, pagination, sorting)
   * @returns {Object} Search results with pagination
   */
  static async searchTransactions(userId, query, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'date',
        sortOrder = 'desc',
        ...filters
      } = options;

      const skip = (page - 1) * limit;

      // If query is provided, use full-text search
      if (query && query.trim()) {
        return await Transaction.searchTransactions(userId, query, {
          limit,
          skip,
          sortBy,
          sortOrder,
          filters
        });
      }

      // Otherwise, use regular filtering
      const searchQuery = { userId };

      // Apply filters
      if (filters.type) searchQuery.type = filters.type;
      if (filters.category) searchQuery.category = filters.category;
      if (filters.paymentMethod) searchQuery.paymentMethod = filters.paymentMethod;
      if (filters.startDate || filters.endDate) {
        searchQuery.date = {};
        if (filters.startDate) searchQuery.date.$gte = new Date(filters.startDate);
        if (filters.endDate) searchQuery.date.$lte = new Date(filters.endDate);
      }
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        searchQuery.amount = {};
        if (filters.minAmount !== undefined) searchQuery.amount.$gte = filters.minAmount;
        if (filters.maxAmount !== undefined) searchQuery.amount.$lte = filters.maxAmount;
      }
      if (filters.merchantName) {
        searchQuery.merchantName = new RegExp(filters.merchantName, 'i');
      }
      if (filters.isRecurring !== undefined) {
        searchQuery.isRecurring = filters.isRecurring;
      }
      if (filters.isVerified !== undefined) {
        searchQuery.isVerified = filters.isVerified;
      }

      const results = await Transaction.find(searchQuery)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Transaction.countDocuments(searchQuery);

      return {
        results,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Transaction search error:', error);
      throw new Error('Failed to search transactions');
    }
  }

  /**
   * Search across multiple resource types
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Combined search results
   */
  static async globalSearch(userId, query, options = {}) {
    try {
      const { limit = 20, types = ['transactions', 'documents', 'emis', 'bills'] } = options;

      const results = {
        transactions: [],
        documents: [],
        emis: [],
        bills: [],
        total: 0
      };

      // Search transactions
      if (types.includes('transactions')) {
        const transactionResults = await this.searchTransactions(userId, query, { 
          limit, 
          sortBy: 'relevance' 
        });
        results.transactions = transactionResults.results;
        results.total += transactionResults.total;
      }

      // Search documents
      if (types.includes('documents')) {
        const documents = await Document.find({
          userId,
          $or: [
            { filename: new RegExp(query, 'i') },
            { originalFilename: new RegExp(query, 'i') },
            { source: new RegExp(query, 'i') }
          ]
        }).limit(limit);
        results.documents = documents;
        results.total += documents.length;
      }

      // Search EMIs
      if (types.includes('emis')) {
        const emis = await EMI.find({
          userId,
          $or: [
            { loanType: new RegExp(query, 'i') },
            { lender: new RegExp(query, 'i') },
            { description: new RegExp(query, 'i') }
          ]
        }).limit(limit);
        results.emis = emis;
        results.total += emis.length;
      }

      // Search bill reminders
      if (types.includes('bills')) {
        const bills = await BillReminder.find({
          userId,
          $or: [
            { name: new RegExp(query, 'i') },
            { category: new RegExp(query, 'i') },
            { description: new RegExp(query, 'i') }
          ]
        }).limit(limit);
        results.bills = bills;
        results.total += bills.length;
      }

      return results;
    } catch (error) {
      console.error('Global search error:', error);
      throw new Error('Failed to perform global search');
    }
  }

  /**
   * Get search suggestions/autocomplete
   * @param {string} userId - User ID
   * @param {string} prefix - Search prefix
   * @param {string} type - Type of suggestions (all, merchants, categories, descriptions)
   * @returns {Array} Suggestions array
   */
  static async getSuggestions(userId, prefix, type = 'all') {
    try {
      if (!prefix || prefix.length < 2) {
        return [];
      }

      const suggestions = new Set();
      const limit = 10;

      if (type === 'all' || type === 'merchants') {
        const merchants = await Transaction.distinct('merchantName', {
          userId,
          merchantName: new RegExp(`^${prefix}`, 'i')
        });
        merchants.slice(0, limit).forEach(m => {
          if (m) suggestions.add({ type: 'merchant', value: m });
        });
      }

      if (type === 'all' || type === 'categories') {
        const categories = await Transaction.distinct('category', {
          userId,
          category: new RegExp(`^${prefix}`, 'i')
        });
        categories.slice(0, limit).forEach(c => {
          if (c) suggestions.add({ type: 'category', value: c });
        });
      }

      if (type === 'all' || type === 'descriptions') {
        const descriptions = await Transaction.distinct('description', {
          userId,
          description: new RegExp(`^${prefix}`, 'i')
        });
        descriptions.slice(0, limit).forEach(d => {
          if (d) suggestions.add({ type: 'description', value: d });
        });
      }

      if (type === 'all' || type === 'tags') {
        const transactions = await Transaction.find({
          userId,
          tags: new RegExp(`^${prefix}`, 'i')
        }).select('tags').limit(100);
        
        transactions.forEach(t => {
          if (t.tags) {
            t.tags
              .filter(tag => tag.toLowerCase().startsWith(prefix.toLowerCase()))
              .forEach(tag => suggestions.add({ type: 'tag', value: tag }));
          }
        });
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Suggestions error:', error);
      throw new Error('Failed to get suggestions');
    }
  }

  /**
   * Get popular search terms for the user
   * @param {string} userId - User ID
   * @returns {Object} Popular merchants, categories, and tags
   */
  static async getPopularSearchTerms(userId) {
    try {
      // Get top merchants
      const topMerchants = await Transaction.aggregate([
        { $match: { userId, merchantName: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$merchantName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]);

      // Get top categories
      const topCategories = await Transaction.aggregate([
        { $match: { userId, category: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]);

      // Get top tags
      const topTags = await Transaction.aggregate([
        { $match: { userId, tags: { $exists: true, $not: { $size: 0 } } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]);

      return {
        merchants: topMerchants,
        categories: topCategories,
        tags: topTags
      };
    } catch (error) {
      console.error('Popular terms error:', error);
      throw new Error('Failed to get popular search terms');
    }
  }

  /**
   * Advanced search with complex queries
   * @param {string} userId - User ID
   * @param {Object} searchParams - Advanced search parameters
   * @returns {Object} Search results
   */
  static async advancedSearch(userId, searchParams) {
    try {
      const {
        query,
        exactMatch = false,
        dateRange = {},
        amountRange = {},
        types = [],
        categories = [],
        paymentMethods = [],
        tags = [],
        merchants = [],
        isRecurring,
        isVerified,
        hasNotes,
        sortBy = 'date',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = searchParams;

      const searchQuery = { userId };

      // Text search
      if (query) {
        if (exactMatch) {
          searchQuery.$or = [
            { description: new RegExp(`^${query}$`, 'i') },
            { merchantName: new RegExp(`^${query}$`, 'i') }
          ];
        } else {
          searchQuery.$text = { $search: query };
        }
      }

      // Date range
      if (dateRange.start || dateRange.end) {
        searchQuery.date = {};
        if (dateRange.start) searchQuery.date.$gte = new Date(dateRange.start);
        if (dateRange.end) searchQuery.date.$lte = new Date(dateRange.end);
      }

      // Amount range
      if (amountRange.min !== undefined || amountRange.max !== undefined) {
        searchQuery.amount = {};
        if (amountRange.min !== undefined) searchQuery.amount.$gte = amountRange.min;
        if (amountRange.max !== undefined) searchQuery.amount.$lte = amountRange.max;
      }

      // Multi-select filters
      if (types.length > 0) searchQuery.type = { $in: types };
      if (categories.length > 0) searchQuery.category = { $in: categories };
      if (paymentMethods.length > 0) searchQuery.paymentMethod = { $in: paymentMethods };
      if (tags.length > 0) searchQuery.tags = { $in: tags };
      if (merchants.length > 0) searchQuery.merchantName = { $in: merchants };

      // Boolean filters
      if (isRecurring !== undefined) searchQuery.isRecurring = isRecurring;
      if (isVerified !== undefined) searchQuery.isVerified = isVerified;
      if (hasNotes !== undefined) {
        searchQuery.notes = hasNotes ? { $exists: true, $ne: '' } : { $exists: false };
      }

      const skip = (page - 1) * limit;

      // Build sort options
      const sortOptions = query && !exactMatch && sortBy === 'relevance'
        ? { score: { $meta: 'textScore' } }
        : { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute query
      const results = await Transaction.find(
        searchQuery,
        query && !exactMatch ? { score: { $meta: 'textScore' } } : {}
      )
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      const total = await Transaction.countDocuments(searchQuery);

      // Get aggregated statistics for the search results
      const stats = await Transaction.aggregate([
        { $match: searchQuery },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        results,
        total,
        page,
        pages: Math.ceil(total / limit),
        stats: stats[0] || {
          totalAmount: 0,
          avgAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          count: 0
        }
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      throw new Error('Failed to perform advanced search');
    }
  }
}

module.exports = SearchService;
