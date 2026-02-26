const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');

/**
 * Receipt Processing Service
 * Handles OCR text extraction simulation, categorization, and analytics
 */
class ReceiptProcessingService {
  constructor() {
    // Vendor-to-category mapping for auto-categorization
    this.vendorCategoryMap = {
      groceries: [
        'bigbasket', 'grofers', 'blinkit', 'dmart', 'reliance fresh', 'more',
        'supermarket', 'grocery', 'fresh', 'market', 'kirana', 'vegetables'
      ],
      dining: [
        'swiggy', 'zomato', 'restaurant', 'cafe', 'hotel', 'dhaba', 'pizza',
        'burger', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'chaayos'
      ],
      fuel: [
        'indian oil', 'bharat petroleum', 'hp', 'shell', 'petrol', 'diesel',
        'fuel station', 'gas station', 'iocl', 'bpcl', 'hpcl'
      ],
      medical: [
        'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'pharmacy',
        'hospital', 'clinic', 'diagnostic', 'lab', 'medical', 'doctor'
      ],
      electronics: [
        'croma', 'reliance digital', 'vijay sales', 'amazon', 'flipkart',
        'electronics', 'apple', 'samsung', 'mi store'
      ],
      clothing: [
        'myntra', 'ajio', 'pantaloons', 'shoppers stop', 'westside', 'zara',
        'h&m', 'lifestyle', 'max fashion', 'allen solly'
      ],
      utilities: [
        'electricity', 'water', 'gas bill', 'internet', 'broadband', 'airtel',
        'jio', 'vodafone', 'bsnl', 'tata power', 'bescom'
      ],
      entertainment: [
        'pvr', 'inox', 'bookmyshow', 'netflix', 'hotstar', 'spotify',
        'cinema', 'theatre', 'amusement', 'game'
      ],
      travel: [
        'uber', 'ola', 'rapido', 'irctc', 'makemytrip', 'goibibo',
        'cleartrip', 'redbus', 'airlines', 'railway', 'metro'
      ]
    };

    // Common date formats in receipts
    this.datePatterns = [
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,           // DD/MM/YYYY or DD-MM-YYYY
      /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,           // YYYY/MM/DD or YYYY-MM-DD
      /(\d{2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i, // DD Mon YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/     // D/M/YY
    ];

    // Amount patterns
    this.amountPatterns = [
      /(?:total|grand total|net amount|amount|amt|payable|due)[:\s]*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
      /(?:rs\.?|₹|inr)\s*([\d,]+\.?\d*)/i,
      /(?:total|grand total)[:\s]*([\d,]+\.?\d*)/i
    ];
  }

  /**
   * Main function: Process a receipt from raw text
   */
  async processReceipt(userId, rawText, imageUrl = null) {
    try {
      const amount = this.extractAmount(rawText);
      const date = this.extractDate(rawText);
      const vendor = this.extractVendor(rawText);
      const items = this.extractItems(rawText);
      const category = this.categorizeExpense(vendor, items);

      const confidence = this._calculateConfidence(amount, date, vendor, items);

      const receipt = new Receipt({
        userId,
        imageUrl,
        vendor,
        amount,
        date: date || new Date(),
        items,
        category,
        raw_text: rawText,
        status: amount ? 'completed' : 'failed',
        confidence,
        currency: 'INR'
      });

      await receipt.save();
      logger.info(`Receipt processed for user ${userId}: vendor=${vendor}, amount=${amount}`);

      return {
        success: true,
        data: {
          receipt,
          extraction: {
            amount,
            date,
            vendor,
            items,
            category,
            confidence
          }
        },
        message: receipt.status === 'completed'
          ? 'Receipt processed successfully'
          : 'Receipt processing failed - could not extract amount'
      };
    } catch (error) {
      logger.error('Process receipt error:', error);
      throw error;
    }
  }

  /**
   * Extract total amount from receipt text
   */
  extractAmount(text) {
    if (!text) return null;

    for (const pattern of this.amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0 && amount < 10000000) {
          return amount;
        }
      }
    }

    // Fallback: find the largest number that looks like a total
    const allNumbers = text.match(/[\d,]+\.\d{2}/g);
    if (allNumbers && allNumbers.length > 0) {
      const amounts = allNumbers
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);
      if (amounts.length > 0) {
        return Math.max(...amounts);
      }
    }

    return null;
  }

  /**
   * Extract date from receipt text
   */
  extractDate(text) {
    if (!text) return null;

    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    // Try DD/MM/YYYY or DD-MM-YYYY
    let match = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (match) {
      const date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      if (!isNaN(date.getTime())) return date;
    }

    // Try YYYY/MM/DD or YYYY-MM-DD
    match = text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
    if (match) {
      const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD Mon YYYY
    match = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i);
    if (match) {
      const month = monthMap[match[2].toLowerCase().substring(0, 3)];
      if (month !== undefined) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[1]));
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  }

  /**
   * Extract vendor/store name from receipt text
   */
  extractVendor(text) {
    if (!text) return 'Unknown';

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // First non-empty line is usually the vendor name
    if (lines.length > 0) {
      let vendor = lines[0];

      // Clean up common prefixes/suffixes
      vendor = vendor.replace(/^(welcome to|thank you for|receipt from|invoice from)\s*/i, '');
      vendor = vendor.replace(/\s*(pvt\.?\s*ltd\.?|limited|inc\.?|llp|llc)$/i, '').trim();

      // Also check for known vendor patterns
      for (const [, vendors] of Object.entries(this.vendorCategoryMap)) {
        for (const v of vendors) {
          if (text.toLowerCase().includes(v)) {
            return v.charAt(0).toUpperCase() + v.slice(1);
          }
        }
      }

      if (vendor.length > 2 && vendor.length < 100) {
        return vendor;
      }
    }

    return 'Unknown';
  }

  /**
   * Extract line items from receipt text
   */
  extractItems(text) {
    if (!text) return [];

    const items = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Pattern: item name followed by quantity and price
    const itemPatterns = [
      /^(.+?)\s+(\d+)\s*[xX×]\s*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)\s*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)$/,
      /^(.+?)\s+(?:rs\.?|₹)?\s*([\d,]+\.?\d*)$/,
      /^(\d+)\s*[xX×]\s*(.+?)\s+(?:rs\.?|₹)?\s*([\d,]+\.?\d*)$/
    ];

    for (const line of lines) {
      // Skip header/footer lines
      if (/total|subtotal|tax|gst|cgst|sgst|discount|grand|net|amount due|thank you|welcome/i.test(line)) {
        continue;
      }

      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
        if (match) {
          if (match.length >= 5) {
            // Name, qty, unit price, total
            items.push({
              name: match[1].trim(),
              quantity: parseInt(match[2]) || 1,
              price: parseFloat(match[4].replace(/,/g, '')) || 0
            });
          } else if (match.length >= 3) {
            items.push({
              name: match[1].trim(),
              quantity: 1,
              price: parseFloat(match[2].replace(/,/g, '')) || 0
            });
          }
          break;
        }
      }
    }

    return items;
  }

  /**
   * Categorize expense based on vendor and items
   */
  categorizeExpense(vendor, items = []) {
    const textToSearch = [
      (vendor || '').toLowerCase(),
      ...items.map(i => (i.name || '').toLowerCase())
    ].join(' ');

    for (const [category, keywords] of Object.entries(this.vendorCategoryMap)) {
      for (const keyword of keywords) {
        if (textToSearch.includes(keyword)) {
          return category;
        }
      }
    }

    return 'other';
  }

  /**
   * Batch process multiple receipts
   */
  async batchProcess(userId, receipts) {
    try {
      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const receiptData of receipts) {
        try {
          const result = await this.processReceipt(
            userId,
            receiptData.rawText || receiptData.raw_text,
            receiptData.imageUrl
          );
          results.push(result);
          if (result.success && result.data.receipt.status === 'completed') {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          results.push({
            success: false,
            message: error.message
          });
        }
      }

      logger.info(`Batch processed ${receipts.length} receipts: ${successCount} success, ${failCount} failed`);

      return {
        success: true,
        data: {
          results,
          summary: {
            total: receipts.length,
            successful: successCount,
            failed: failCount
          }
        }
      };
    } catch (error) {
      logger.error('Batch process error:', error);
      throw error;
    }
  }

  /**
   * Get receipt analytics for a user
   */
  async receiptAnalytics(userId, options = {}) {
    try {
      const { startDate, endDate } = options;
      const query = { userId, status: 'completed' };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const receipts = await Receipt.find(query).sort({ date: -1 });

      // Total by vendor
      const byVendor = {};
      for (const r of receipts) {
        const vendor = r.vendor || 'Unknown';
        if (!byVendor[vendor]) {
          byVendor[vendor] = { count: 0, total: 0 };
        }
        byVendor[vendor].count++;
        byVendor[vendor].total += r.amount || 0;
      }

      // Total by category
      const byCategory = {};
      for (const r of receipts) {
        const cat = r.category || 'other';
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, total: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].total += r.amount || 0;
      }

      // Total by date (daily aggregation)
      const byDate = {};
      for (const r of receipts) {
        const dateKey = r.date ? r.date.toISOString().split('T')[0] : 'unknown';
        if (!byDate[dateKey]) {
          byDate[dateKey] = { count: 0, total: 0 };
        }
        byDate[dateKey].count++;
        byDate[dateKey].total += r.amount || 0;
      }

      const totalAmount = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

      return {
        success: true,
        data: {
          totalReceipts: receipts.length,
          totalAmount,
          averageAmount: receipts.length > 0 ? parseFloat((totalAmount / receipts.length).toFixed(2)) : 0,
          byVendor,
          byCategory,
          byDate
        }
      };
    } catch (error) {
      logger.error('Receipt analytics error:', error);
      throw error;
    }
  }

  /**
   * Get user's receipts with pagination
   */
  async getUserReceipts(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status, category } = options;
      const query = { userId };

      if (status) query.status = status;
      if (category) query.category = category;

      const receipts = await Receipt.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Receipt.countDocuments(query);

      return {
        success: true,
        data: {
          receipts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Get user receipts error:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Calculate extraction confidence score (0-1)
   */
  _calculateConfidence(amount, date, vendor, items) {
    let score = 0;
    let factors = 0;

    if (amount !== null && amount > 0) { score += 0.4; }
    factors += 0.4;

    if (date !== null) { score += 0.2; }
    factors += 0.2;

    if (vendor && vendor !== 'Unknown') { score += 0.2; }
    factors += 0.2;

    if (items && items.length > 0) { score += 0.2; }
    factors += 0.2;

    return factors > 0 ? parseFloat((score / factors).toFixed(2)) : 0;
  }
}

module.exports = new ReceiptProcessingService();
