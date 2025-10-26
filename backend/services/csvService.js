const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const stream = require('stream');
const Transaction = require('../models/Transaction');

/**
 * CSV Import/Export Service
 * Supports multiple bank formats and custom column mapping
 */
class CSVService {
  /**
   * Bank format configurations
   * Define column mappings for different banks
   */
  static BANK_FORMATS = {
    icici: {
      name: 'ICICI Bank',
      dateFormat: 'DD/MM/YYYY',
      columns: {
        date: ['Date', 'Transaction Date', 'Value Date'],
        description: ['Description', 'Narration', 'Transaction Details'],
        amount: ['Amount', 'Withdrawal Amt', 'Deposit Amt'],
        type: ['Type', 'Transaction Type'],
        balance: ['Balance', 'Closing Balance'],
        referenceNumber: ['Cheque No', 'Reference No', 'Transaction ID']
      }
    },
    hdfc: {
      name: 'HDFC Bank',
      dateFormat: 'DD/MM/YY',
      columns: {
        date: ['Date', 'Transaction Date'],
        description: ['Narration', 'Description'],
        amount: ['Debit', 'Credit', 'Amount'],
        balance: ['Balance'],
        referenceNumber: ['Chq./Ref.No.', 'Reference Number']
      }
    },
    sbi: {
      name: 'State Bank of India',
      dateFormat: 'DD MMM YYYY',
      columns: {
        date: ['Txn Date', 'Transaction Date', 'Value Date'],
        description: ['Description', 'Narration'],
        amount: ['Debit', 'Credit', 'Amount'],
        balance: ['Balance'],
        referenceNumber: ['Ref No./Cheque No.']
      }
    },
    axis: {
      name: 'Axis Bank',
      dateFormat: 'DD-MM-YYYY',
      columns: {
        date: ['Tran Date', 'Transaction Date'],
        description: ['Particulars', 'Description'],
        amount: ['Withdrawal Amt', 'Deposit Amt'],
        balance: ['Balance'],
        referenceNumber: ['Chq/Ref Number']
      }
    },
    generic: {
      name: 'Generic Format',
      dateFormat: 'YYYY-MM-DD',
      columns: {
        date: ['date', 'Date', 'transaction_date', 'Transaction Date'],
        description: ['description', 'Description', 'narration', 'Narration', 'details', 'Details'],
        amount: ['amount', 'Amount', 'value', 'Value'],
        type: ['type', 'Type', 'transaction_type', 'Transaction Type'],
        category: ['category', 'Category'],
        merchantName: ['merchant', 'Merchant', 'merchant_name', 'Merchant Name'],
        balance: ['balance', 'Balance'],
        referenceNumber: ['reference', 'Reference', 'ref_no', 'Reference Number']
      }
    }
  };

  /**
   * Parse CSV file and map to transaction format
   * @param {string} filePath - Path to CSV file
   * @param {string} bankFormat - Bank format identifier
   * @param {Object} customMapping - Custom column mapping
   * @returns {Promise<Array>} Parsed transactions
   */
  static async parseCSV(filePath, bankFormat = 'generic', customMapping = {}) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      const format = this.BANK_FORMATS[bankFormat] || this.BANK_FORMATS.generic;
      const mapping = { ...format.columns, ...customMapping };

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const transaction = this.mapRowToTransaction(row, mapping, format.dateFormat);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            console.error('Error parsing row:', error, row);
          }
        })
        .on('end', () => {
          resolve(transactions);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Map CSV row to transaction object
   * @param {Object} row - CSV row
   * @param {Object} mapping - Column mapping
   * @param {string} dateFormat - Date format
   * @returns {Object} Transaction object
   */
  static mapRowToTransaction(row, mapping, dateFormat) {
    const transaction = {};

    // Map date
    const dateValue = this.findValueByMapping(row, mapping.date);
    if (dateValue) {
      transaction.date = this.parseDate(dateValue, dateFormat);
    }

    // Map description
    transaction.description = this.findValueByMapping(row, mapping.description) || 'No description';

    // Map amount and determine type
    const amountValue = this.findValueByMapping(row, mapping.amount);
    if (amountValue) {
      const { amount, type } = this.parseAmount(amountValue, row, mapping);
      transaction.amount = Math.abs(amount);
      transaction.type = type;
    } else {
      return null; // Skip rows without amount
    }

    // Map optional fields
    transaction.balance = this.parseFloat(this.findValueByMapping(row, mapping.balance));
    transaction.referenceNumber = this.findValueByMapping(row, mapping.referenceNumber);
    transaction.category = this.findValueByMapping(row, mapping.category) || 'other';
    transaction.merchantName = this.findValueByMapping(row, mapping.merchantName);

    // Determine type from explicit column if available
    const typeValue = this.findValueByMapping(row, mapping.type);
    if (typeValue) {
      transaction.type = this.normalizeType(typeValue);
    }

    // Set metadata
    transaction.source = 'upload';
    transaction.extractionMethod = 'csv_parse';
    transaction.confidence = 0.9;
    transaction.isVerified = false;

    return transaction;
  }

  /**
   * Find value in row by trying multiple column names
   * @param {Object} row - CSV row
   * @param {Array} possibleNames - Possible column names
   * @returns {string} Value found
   */
  static findValueByMapping(row, possibleNames) {
    if (!possibleNames) return null;

    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return row[name];
      }
    }
    return null;
  }

  /**
   * Parse date from various formats
   * @param {string} dateStr - Date string
   * @param {string} format - Expected format
   * @returns {Date} Parsed date
   */
  static parseDate(dateStr, format) {
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Handle common formats
    const parts = dateStr.split(/[\/\-\s]/);
    
    if (format.includes('DD/MM/YYYY') || format.includes('DD-MM-YYYY')) {
      // DD/MM/YYYY or DD-MM-YYYY
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else if (format.includes('MM/DD/YYYY')) {
      // MM/DD/YYYY
      return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
    } else if (format.includes('DD MMM YYYY')) {
      // DD MMM YYYY (e.g., "15 Jan 2024")
      return new Date(dateStr);
    }

    // Default to ISO parse
    return new Date(dateStr);
  }

  /**
   * Parse amount and determine transaction type
   * @param {string} amountStr - Amount string
   * @param {Object} row - Full row for context
   * @param {Object} mapping - Column mapping
   * @returns {Object} { amount, type }
   */
  static parseAmount(amountStr, row, mapping) {
    // Remove currency symbols and commas
    let cleanAmount = amountStr.toString().replace(/[₹$,\s]/g, '');
    
    // Check if amount is in separate debit/credit columns
    const debitCol = this.findValueByMapping(row, ['Debit', 'Withdrawal', 'Dr', 'Withdrawal Amt']);
    const creditCol = this.findValueByMapping(row, ['Credit', 'Deposit', 'Cr', 'Deposit Amt']);

    if (debitCol && debitCol !== '' && debitCol !== '0') {
      return {
        amount: Math.abs(this.parseFloat(debitCol)),
        type: 'debit'
      };
    } else if (creditCol && creditCol !== '' && creditCol !== '0') {
      return {
        amount: Math.abs(this.parseFloat(creditCol)),
        type: 'credit'
      };
    }

    // Single amount column - determine type by sign or context
    const amount = this.parseFloat(cleanAmount);
    const type = amount < 0 ? 'debit' : 'credit';

    return { amount: Math.abs(amount), type };
  }

  /**
   * Parse float from string
   * @param {string} str - String to parse
   * @returns {number} Parsed float
   */
  static parseFloat(str) {
    if (!str) return 0;
    const cleaned = str.toString().replace(/[₹$,\s]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Normalize transaction type
   * @param {string} typeStr - Type string
   * @returns {string} Normalized type
   */
  static normalizeType(typeStr) {
    const lower = typeStr.toLowerCase();
    if (lower.includes('debit') || lower.includes('dr') || lower.includes('withdrawal')) {
      return 'debit';
    } else if (lower.includes('credit') || lower.includes('cr') || lower.includes('deposit')) {
      return 'credit';
    } else if (lower.includes('transfer')) {
      return 'transfer';
    }
    return 'debit'; // Default
  }

  /**
   * Import transactions from CSV
   * @param {string} userId - User ID
   * @param {string} filePath - CSV file path
   * @param {Object} options - Import options
   * @returns {Object} Import results
   */
  static async importTransactions(userId, filePath, options = {}) {
    try {
      const {
        bankFormat = 'generic',
        customMapping = {},
        skipDuplicates = true,
        validateData = true
      } = options;

      // Parse CSV
      const parsedTransactions = await this.parseCSV(filePath, bankFormat, customMapping);

      // Add userId to all transactions
      parsedTransactions.forEach(t => {
        t.userId = userId;
      });

      // Validate transactions
      const validTransactions = validateData
        ? parsedTransactions.filter(t => this.validateTransaction(t))
        : parsedTransactions;

      // Remove duplicates if requested
      let transactionsToImport = validTransactions;
      if (skipDuplicates) {
        transactionsToImport = await this.removeDuplicates(userId, validTransactions);
      }

      // Import to database
      let imported = [];
      if (transactionsToImport.length > 0) {
        imported = await Transaction.insertMany(transactionsToImport, { ordered: false });
      }

      return {
        success: true,
        total: parsedTransactions.length,
        valid: validTransactions.length,
        imported: imported.length,
        skipped: validTransactions.length - imported.length,
        errors: parsedTransactions.length - validTransactions.length
      };
    } catch (error) {
      console.error('CSV import error:', error);
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  }

  /**
   * Validate transaction data
   * @param {Object} transaction - Transaction object
   * @returns {boolean} Valid or not
   */
  static validateTransaction(transaction) {
    return (
      transaction.date &&
      transaction.description &&
      transaction.amount !== undefined &&
      transaction.amount > 0 &&
      transaction.type
    );
  }

  /**
   * Remove duplicate transactions
   * @param {string} userId - User ID
   * @param {Array} transactions - Transactions to check
   * @returns {Array} Non-duplicate transactions
   */
  static async removeDuplicates(userId, transactions) {
    const unique = [];

    for (const transaction of transactions) {
      // Check if similar transaction exists
      const exists = await Transaction.findOne({
        userId,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description
      });

      if (!exists) {
        unique.push(transaction);
      }
    }

    return unique;
  }

  /**
   * Export transactions to CSV
   * @param {Array} transactions - Transactions to export
   * @param {Object} options - Export options
   * @returns {string} CSV string
   */
  static exportToCSV(transactions, options = {}) {
    try {
      const {
        fields = [
          'date',
          'description',
          'amount',
          'type',
          'category',
          'merchantName',
          'paymentMethod',
          'balance',
          'referenceNumber',
          'notes'
        ],
        includeHeaders = true
      } = options;

      // Transform transactions for export
      const data = transactions.map(t => ({
        date: new Date(t.date).toISOString().split('T')[0],
        description: t.description || '',
        amount: t.amount || 0,
        type: t.type || '',
        category: t.category || '',
        merchantName: t.merchantName || '',
        paymentMethod: t.paymentMethod || '',
        balance: t.balance || '',
        referenceNumber: t.referenceNumber || '',
        notes: t.notes || ''
      }));

      const parser = new Parser({ fields, header: includeHeaders });
      return parser.parse(data);
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  }

  /**
   * Get preview of CSV file
   * @param {string} filePath - CSV file path
   * @param {number} rows - Number of rows to preview
   * @returns {Promise<Object>} Preview data
   */
  static async previewCSV(filePath, rows = 10) {
    return new Promise((resolve, reject) => {
      const headers = [];
      const preview = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          if (rowCount < rows) {
            preview.push(row);
            rowCount++;
          } else {
            this.destroy();
          }
        })
        .on('end', () => {
          resolve({ headers, preview, totalRows: rowCount });
        })
        .on('error', reject);
    });
  }

  /**
   * Detect bank format from CSV headers
   * @param {Array} headers - CSV headers
   * @returns {string} Detected bank format
   */
  static detectBankFormat(headers) {
    const headerStr = headers.join(',').toLowerCase();

    // Check for bank-specific patterns
    if (headerStr.includes('icici') || (headerStr.includes('value date') && headerStr.includes('transaction details'))) {
      return 'icici';
    } else if (headerStr.includes('hdfc') || headerStr.includes('chq./ref.no.')) {
      return 'hdfc';
    } else if (headerStr.includes('sbi') || headerStr.includes('ref no./cheque no.')) {
      return 'sbi';
    } else if (headerStr.includes('axis') || headerStr.includes('tran date')) {
      return 'axis';
    }

    return 'generic';
  }
}

module.exports = CSVService;
