let Client;
try {
  ({ Client } = require('@elastic/elasticsearch'));
} catch (e) {
  Client = null;
}
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const ClientModel = require('../models/Client');
const Project = require('../models/Project');

class AdvancedSearchService {
  constructor() {
    if (Client && process.env.ELASTICSEARCH_URL) {
      this.client = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
      });
      this.initializeIndices();
    } else {
      if (!Client) {
        console.warn('Elasticsearch package not installed. Search will use MongoDB queries.');
      } else {
        console.warn('Elasticsearch URL not configured. Search will use MongoDB queries.');
      }
      this.client = null;
    }
  }

  async initializeIndices() {
    try {
      const indices = ['transactions', 'invoices', 'clients', 'projects'];
      
      for (const index of indices) {
        const { body: exists } = await this.client.indices.exists({ index });
        if (!exists) {
          await this.client.indices.create({
            index,
            body: this.getIndexMapping(index)
          });
        }
      }
    } catch (error) {
      console.error('Error initializing Elasticsearch indices:', error);
    }
  }

  getIndexMapping(index) {
    const mappings = {
      transactions: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            type: { type: 'keyword' },
            category: { type: 'keyword' },
            amount: { type: 'float' },
            description: { type: 'text', analyzer: 'standard' },
            merchant: { type: 'text' },
            date: { type: 'date' },
            tags: { type: 'keyword' },
            notes: { type: 'text' }
          }
        }
      },
      invoices: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            invoiceNumber: { type: 'keyword' },
            clientId: { type: 'keyword' },
            status: { type: 'keyword' },
            totalAmount: { type: 'float' },
            description: { type: 'text' },
            date: { type: 'date' }
          }
        }
      },
      clients: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            companyName: { type: 'text' },
            contactPerson: { type: 'text' },
            email: { type: 'keyword' },
            phone: { type: 'keyword' },
            notes: { type: 'text' }
          }
        }
      },
      projects: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            projectName: { type: 'text' },
            projectType: { type: 'keyword' },
            status: { type: 'keyword' },
            description: { type: 'text' },
            budget: { type: 'float' }
          }
        }
      }
    };

    return mappings[index] || {};
  }

  // Universal search across all entities
  async universalSearch(userId, query, options = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;

    if (this.client) {
      return this.elasticsearchSearch(userId, query, filters, limit, offset);
    } else {
      return this.mongodbSearch(userId, query, filters, limit, offset);
    }
  }

  // Elasticsearch-powered search
  async elasticsearchSearch(userId, query, filters, limit, offset) {
    try {
      const searches = [];
      const indices = ['transactions', 'invoices', 'clients', 'projects'];

      for (const index of indices) {
        searches.push({ index });
        searches.push({
          query: {
            bool: {
              must: [
                { match: { userId } },
                {
                  multi_match: {
                    query,
                    fields: this.getSearchFields(index),
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                  }
                }
              ],
              filter: this.buildElasticsearchFilters(filters)
            }
          },
          size: limit,
          from: offset
        });
      }

      const { body } = await this.client.msearch({ body: searches });

      const results = {
        transactions: [],
        invoices: [],
        clients: [],
        projects: [],
        total: 0
      };

      body.responses.forEach((response, index) => {
        const type = indices[Math.floor(index / 2)];
        if (response.hits) {
          results[type] = response.hits.hits.map(hit => ({
            ...hit._source,
            _id: hit._id,
            _score: hit._score
          }));
          results.total += response.hits.total.value;
        }
      });

      return results;
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      return this.mongodbSearch(userId, query, filters, limit, offset);
    }
  }

  // MongoDB fallback search
  async mongodbSearch(userId, query, filters, limit, offset) {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      const [transactions, invoices, clients, projects] = await Promise.all([
        Transaction.find({
          userId,
          $or: [
            { description: searchRegex },
            { category: searchRegex },
            { merchant: searchRegex },
            { notes: searchRegex }
          ],
          ...this.buildMongoFilters(filters)
        })
          .limit(limit)
          .skip(offset)
          .lean(),

        Invoice.find({
          userId,
          $or: [
            { invoiceNumber: searchRegex },
            { description: searchRegex }
          ]
        })
          .limit(limit)
          .skip(offset)
          .lean(),

        ClientModel.find({
          userId,
          $or: [
            { 'companyDetails.name': searchRegex },
            { 'contactPersons.name': searchRegex },
            { 'companyDetails.email': searchRegex }
          ]
        })
          .limit(limit)
          .skip(offset)
          .lean(),

        Project.find({
          userId,
          $or: [
            { projectName: searchRegex },
            { description: searchRegex }
          ]
        })
          .limit(limit)
          .skip(offset)
          .lean()
      ]);

      return {
        transactions,
        invoices,
        clients,
        projects,
        total: transactions.length + invoices.length + clients.length + projects.length
      };
    } catch (error) {
      console.error('MongoDB search error:', error);
      throw error;
    }
  }

  // Natural language query processing
  async processNaturalLanguageQuery(userId, nlQuery) {
    const query = nlQuery.toLowerCase();
    let filters = {};

    // Date patterns
    if (query.includes('today')) {
      filters.startDate = new Date().setHours(0, 0, 0, 0);
      filters.endDate = new Date().setHours(23, 59, 59, 999);
    } else if (query.includes('this week')) {
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      filters.startDate = firstDay;
      filters.endDate = new Date();
    } else if (query.includes('this month')) {
      const today = new Date();
      filters.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      filters.endDate = new Date();
    }

    // Extract keywords
    const keywords = query
      .split(' ')
      .filter(word => word.length > 3)
      .join(' ');

    return this.universalSearch(userId, keywords, { filters });
  }

  // Helper methods
  getSearchFields(index) {
    const fields = {
      transactions: ['description^3', 'merchant^2', 'category^2', 'notes'],
      invoices: ['invoiceNumber^3', 'description^2'],
      clients: ['companyDetails.name^3', 'contactPersons.name^2', 'companyDetails.email'],
      projects: ['projectName^3', 'description^2']
    };
    return fields[index] || ['*'];
  }

  buildElasticsearchFilters(filters) {
    const elasticFilters = [];

    if (filters.startDate && filters.endDate) {
      elasticFilters.push({
        range: {
          date: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        }
      });
    }

    if (filters.type) {
      elasticFilters.push({ term: { type: filters.type } });
    }

    return elasticFilters;
  }

  buildMongoFilters(filters) {
    const mongoFilters = {};

    if (filters.startDate && filters.endDate) {
      mongoFilters.date = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.type) mongoFilters.type = filters.type;

    return mongoFilters;
  }
}

module.exports = new AdvancedSearchService();
