const { performFinancialAnalysis } = require('./financialAIService');
const logger = require('../utils/logger');
const websocketService = require('./websocketService');

/**
 * Enhanced AI-powered document processing with confidence scoring
 */
class AIDocumentProcessor {
  constructor() {
    this.supportedFormats = {
      'bank_statement': {
        confidence: 0.8,
        patterns: {
          date: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g,
          amount: /(\$|₹|€|£)?\s*(\d+[,\d]*\.?\d*)/g,
          transaction: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(.+?)\s+(\$?[\d,]+\.?\d*)/g
        },
        requiredFields: ['date', 'description', 'amount']
      },
      'credit_card': {
        confidence: 0.85,
        patterns: {
          date: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
          merchant: /([\w\s&.-]+)\s+\$?[\d,]+\.?\d*/g,
          amount: /\$?([\d,]+\.?\d*)/g
        },
        requiredFields: ['date', 'merchant', 'amount']
      },
      'receipt': {
        confidence: 0.75,
        patterns: {
          total: /(total|amount|sum)[\s:]*\$?([\d,]+\.?\d*)/gi,
          date: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
          merchant: /^([A-Z][A-Za-z\s&.-]{2,50})/m
        },
        requiredFields: ['merchant', 'total']
      },
      'invoice': {
        confidence: 0.8,
        patterns: {
          invoice_no: /(invoice|inv)[#\s]*([A-Z0-9-]+)/gi,
          date: /(date|issued)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
          amount: /(amount|total)[\s:]*\$?([\d,]+\.?\d*)/gi
        },
        requiredFields: ['invoice_no', 'amount']
      }
    };
  }

  /**
   * Process document with AI enhancement and confidence scoring
   */
  async processDocumentWithAI(text, documentType, userId = null, documentId = null) {
    try {
      // Step 1: Detect document type if not provided
      if (!documentType || documentType === 'other') {
        documentType = await this.detectDocumentType(text);
      }

      // Emit progress update
      if (userId && documentId) {
        websocketService.emitDocumentStatus(userId, documentId, 'processing', {
          stage: 'Analyzing document structure...',
          progress: 25
        });
      }

      // Step 2: Extract structured data with confidence scoring
      const extractionResult = await this.extractStructuredData(text, documentType);

      // Emit progress update
      if (userId && documentId) {
        websocketService.emitDocumentStatus(userId, documentId, 'processing', {
          stage: 'Extracting transactions...',
          progress: 50
        });
      }

      // Step 3: Validate and enhance extracted data
      const validatedData = await this.validateAndEnhanceData(extractionResult, documentType);

      // Emit progress update
      if (userId && documentId) {
        websocketService.emitDocumentStatus(userId, documentId, 'processing', {
          stage: 'Applying AI enhancements...',
          progress: 75
        });
      }

      // Step 4: Apply AI-powered categorization and enrichment
      const enhancedTransactions = await this.enhanceTransactionsWithAI(validatedData.transactions, documentType);

      // Calculate overall confidence score
      const overallConfidence = this.calculateOverallConfidence(validatedData, enhancedTransactions);

      return {
        success: true,
        documentType: validatedData.documentType,
        confidence: overallConfidence,
        transactions: enhancedTransactions,
        metadata: {
          originalText: text.substring(0, 1000), // First 1000 chars for debugging
          extractionMethod: 'ai_enhanced',
          patterns_used: this.supportedFormats[documentType]?.patterns || {},
          validation_results: validatedData.validation,
          processing_timestamp: new Date()
        },
        statistics: {
          total_transactions: enhancedTransactions.length,
          high_confidence: enhancedTransactions.filter(t => t.confidence >= 0.8).length,
          medium_confidence: enhancedTransactions.filter(t => t.confidence >= 0.6 && t.confidence < 0.8).length,
          low_confidence: enhancedTransactions.filter(t => t.confidence < 0.6).length
        }
      };

    } catch (error) {
      logger.error('AI document processing error:', error);
      
      if (userId && documentId) {
        websocketService.emitDocumentStatus(userId, documentId, 'failed', {
          error: `AI processing failed: ${error.message}`
        });
      }

      return {
        success: false,
        error: error.message,
        fallback: true // Indicates should fall back to basic processing
      };
    }
  }

  /**
   * Detect document type using AI and pattern analysis
   */
  async detectDocumentType(text) {
    const textLower = text.toLowerCase();
    const scores = {};

    // Score each document type based on keywords and patterns
    for (const [type, config] of Object.entries(this.supportedFormats)) {
      scores[type] = 0;

      // Keyword scoring
      const keywords = {
        'bank_statement': ['bank', 'statement', 'balance', 'account', 'deposit', 'withdrawal'],
        'credit_card': ['credit', 'card', 'visa', 'mastercard', 'amex', 'payment', 'purchase'],
        'receipt': ['receipt', 'thank you', 'customer copy', 'subtotal', 'tax', 'total'],
        'invoice': ['invoice', 'bill to', 'due date', 'payment terms', 'invoice number']
      };

      if (keywords[type]) {
        const matchedKeywords = keywords[type].filter(keyword => textLower.includes(keyword));
        scores[type] += matchedKeywords.length * 0.2;
      }

      // Pattern scoring
      for (const [patternName, pattern] of Object.entries(config.patterns)) {
        const matches = text.match(pattern);
        if (matches) {
          scores[type] += Math.min(matches.length * 0.1, 0.5);
        }
      }

      // Required fields bonus
      const requiredFieldsFound = config.requiredFields.filter(field => {
        const fieldPattern = config.patterns[field];
        return fieldPattern && text.match(fieldPattern);
      });

      scores[type] += (requiredFieldsFound.length / config.requiredFields.length) * 0.3;
    }

    // Return the type with highest score
    const bestMatch = Object.entries(scores).reduce((max, [type, score]) => 
      score > max.score ? { type, score } : max, 
      { type: 'other', score: 0 }
    );

    logger.info(`Document type detection: ${bestMatch.type} (confidence: ${bestMatch.score.toFixed(2)})`);
    
    return bestMatch.score > 0.5 ? bestMatch.type : 'other';
  }

  /**
   * Extract structured data based on document type
   */
  async extractStructuredData(text, documentType) {
    const config = this.supportedFormats[documentType];
    const extractedData = {
      documentType,
      transactions: [],
      metadata: {},
      validation: {
        patterns_matched: {},
        confidence_factors: {}
      }
    };

    if (!config) {
      // Fallback to generic extraction
      return this.genericDataExtraction(text);
    }

    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Extract based on document type
    switch (documentType) {
      case 'bank_statement':
        extractedData.transactions = this.extractBankStatementData(lines, config);
        break;
      case 'credit_card':
        extractedData.transactions = this.extractCreditCardData(lines, config);
        break;
      case 'receipt':
        extractedData.transactions = this.extractReceiptData(lines, config);
        break;
      case 'invoice':
        extractedData.transactions = this.extractInvoiceData(lines, config);
        break;
      default:
        extractedData.transactions = this.genericDataExtraction(text).transactions;
    }

    // Validate pattern matches
    for (const [patternName, pattern] of Object.entries(config.patterns)) {
      const matches = text.match(pattern);
      extractedData.validation.patterns_matched[patternName] = matches ? matches.length : 0;
    }

    return extractedData;
  }

  /**
   * Extract bank statement transactions
   */
  extractBankStatementData(lines, config) {
    const transactions = [];
    const transactionPattern = config.patterns.transaction;

    lines.forEach((line, index) => {
      const match = line.match(transactionPattern);
      if (match) {
        const [, date, description, amount] = match;
        
        transactions.push({
          date: this.parseDate(date),
          description: this.cleanDescription(description),
          amount: this.parseAmount(amount),
          type: this.determineTransactionType(description, amount),
          confidence: 0.8,
          source_line: index + 1,
          raw_text: line
        });
      }
    });

    return transactions;
  }

  /**
   * Extract credit card transactions
   */
  extractCreditCardData(lines, config) {
    const transactions = [];
    
    lines.forEach((line, index) => {
      const dateMatch = line.match(config.patterns.date);
      const amountMatch = line.match(config.patterns.amount);
      const merchantMatch = line.match(config.patterns.merchant);

      if (dateMatch && amountMatch) {
        const description = merchantMatch ? merchantMatch[1] : 
          line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();

        transactions.push({
          date: this.parseDate(dateMatch[0]),
          description: this.cleanDescription(description),
          amount: this.parseAmount(amountMatch[1]),
          type: 'debit', // Credit card purchases are debits
          confidence: 0.85,
          source_line: index + 1,
          raw_text: line
        });
      }
    });

    return transactions;
  }

  /**
   * Extract receipt data
   */
  extractReceiptData(lines, config) {
    const transactions = [];
    const allText = lines.join(' ');

    // Extract merchant name (usually at the top)
    const merchantMatch = lines.slice(0, 5).find(line => 
      line.match(config.patterns.merchant)
    );

    // Extract total amount
    const totalMatch = allText.match(config.patterns.total);
    
    // Extract date
    const dateMatch = allText.match(config.patterns.date);

    if (totalMatch) {
      transactions.push({
        date: dateMatch ? this.parseDate(dateMatch[1]) : new Date(),
        description: merchantMatch ? this.cleanDescription(merchantMatch) : 'Purchase',
        amount: this.parseAmount(totalMatch[2]),
        type: 'debit',
        confidence: 0.75,
        source_line: 'receipt_total',
        raw_text: allText.substring(0, 200)
      });
    }

    return transactions;
  }

  /**
   * Extract invoice data
   */
  extractInvoiceData(lines, config) {
    const transactions = [];
    const allText = lines.join(' ');

    const invoiceMatch = allText.match(config.patterns.invoice_no);
    const dateMatch = allText.match(config.patterns.date);
    const amountMatch = allText.match(config.patterns.amount);

    if (amountMatch) {
      transactions.push({
        date: dateMatch ? this.parseDate(dateMatch[2]) : new Date(),
        description: `Invoice ${invoiceMatch ? invoiceMatch[2] : 'Payment'}`,
        amount: this.parseAmount(amountMatch[2]),
        type: 'debit',
        confidence: 0.8,
        source_line: 'invoice_total',
        raw_text: allText.substring(0, 200)
      });
    }

    return transactions;
  }

  /**
   * Generic data extraction fallback
   */
  genericDataExtraction(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    const amountPattern = /(\$|₹|€|£)?\s*(\d+[,\d]*\.?\d*)/;
    
    lines.forEach((line, index) => {
      const dateMatch = line.match(datePattern);
      const amountMatches = line.match(new RegExp(amountPattern.source, 'g'));
      
      if (dateMatch && amountMatches) {
        const amounts = amountMatches.map(a => this.parseAmount(a));
        let description = line.replace(dateMatch[0], '').trim();
        amountMatches.forEach(a => {
          description = description.replace(a, '').trim();
        });
        
        if (amounts.length > 0 && description) {
          transactions.push({
            date: this.parseDate(dateMatch[0]),
            description: this.cleanDescription(description),
            amount: amounts[0],
            type: this.determineTransactionType(description, amounts[0]),
            confidence: 0.6, // Lower confidence for generic extraction
            source_line: index + 1,
            raw_text: line
          });
        }
      }
    });

    return {
      documentType: 'other',
      transactions,
      metadata: { extraction_method: 'generic' }
    };
  }

  /**
   * Validate and enhance extracted data
   */
  async validateAndEnhanceData(extractionResult, documentType) {
    const { transactions } = extractionResult;
    const validatedTransactions = [];
    const validationResults = {
      valid: 0,
      invalid: 0,
      enhanced: 0,
      issues: []
    };

    for (const transaction of transactions) {
      const validation = this.validateTransaction(transaction);
      
      if (validation.isValid) {
        // Enhance the transaction
        const enhancedTransaction = await this.enhanceTransaction(transaction, documentType);
        validatedTransactions.push(enhancedTransaction);
        validationResults.valid++;
        
        if (enhancedTransaction.enhanced) {
          validationResults.enhanced++;
        }
      } else {
        validationResults.invalid++;
        validationResults.issues.push({
          transaction: transaction.description,
          issues: validation.issues
        });
      }
    }

    return {
      ...extractionResult,
      transactions: validatedTransactions,
      validation: validationResults
    };
  }

  /**
   * Validate individual transaction
   */
  validateTransaction(transaction) {
    const issues = [];
    let isValid = true;

    // Check required fields
    if (!transaction.date || isNaN(new Date(transaction.date))) {
      issues.push('Invalid or missing date');
      isValid = false;
    }

    if (!transaction.description || transaction.description.trim().length < 2) {
      issues.push('Invalid or missing description');
      isValid = false;
    }

    if (!transaction.amount || isNaN(transaction.amount) || transaction.amount === 0) {
      issues.push('Invalid or missing amount');
      isValid = false;
    }

    // Check for suspicious patterns
    if (transaction.amount && Math.abs(transaction.amount) > 1000000) {
      issues.push('Suspiciously large amount');
    }

    if (transaction.date && new Date(transaction.date) > new Date()) {
      issues.push('Future date detected');
    }

    return { isValid, issues };
  }

  /**
   * Enhance individual transaction with additional data
   */
  async enhanceTransaction(transaction, documentType) {
    const enhanced = { ...transaction };
    
    // Add category based on description
    enhanced.category = this.categorizeTransaction(transaction.description);
    
    // Add merchant detection
    enhanced.merchant = this.extractMerchant(transaction.description);
    
    // Add confidence adjustment based on patterns
    enhanced.confidence = this.adjustConfidenceScore(transaction, documentType);
    
    // Mark as enhanced
    enhanced.enhanced = true;
    enhanced.enhancement_timestamp = new Date();
    
    return enhanced;
  }

  /**
   * Enhance transactions with AI-powered analysis
   */
  async enhanceTransactionsWithAI(transactions, documentType) {
    // This could integrate with external AI services for advanced analysis
    return transactions.map(transaction => ({
      ...transaction,
      ai_category: this.categorizeTransaction(transaction.description),
      ai_confidence: this.adjustConfidenceScore(transaction, documentType),
      ai_merchant: this.extractMerchant(transaction.description),
      ai_tags: this.generateTags(transaction.description)
    }));
  }

  /**
   * Calculate overall confidence score for the document processing
   */
  calculateOverallConfidence(validatedData, enhancedTransactions) {
    if (enhancedTransactions.length === 0) return 0;

    const avgTransactionConfidence = enhancedTransactions.reduce(
      (sum, t) => sum + (t.confidence || 0), 0
    ) / enhancedTransactions.length;

    const validationScore = validatedData.validation.valid / 
      (validatedData.validation.valid + validatedData.validation.invalid);

    return Math.min((avgTransactionConfidence * 0.7 + validationScore * 0.3), 1.0);
  }

  // Helper methods
  parseDate(dateStr) {
    return new Date(dateStr.replace(/[-\/]/g, '/'));
  }

  parseAmount(amountStr) {
    return parseFloat(amountStr.replace(/[^\d.-]/g, ''));
  }

  cleanDescription(description) {
    return description.trim().substring(0, 100);
  }

  determineTransactionType(description, amount) {
    const creditKeywords = ['deposit', 'credit', 'salary', 'refund', 'interest'];
    const descLower = description.toLowerCase();
    
    if (creditKeywords.some(keyword => descLower.includes(keyword)) || amount > 0) {
      return 'credit';
    }
    return 'debit';
  }

  categorizeTransaction(description) {
    const categories = {
      'food_dining': ['restaurant', 'food', 'cafe', 'dining', 'starbucks', 'mcdonald', 'zomato', 'swiggy'],
      'groceries': ['grocery', 'supermarket', 'bigbasket', 'dmart', 'reliance fresh', 'more'],
      'shopping': ['amazon', 'store', 'shop', 'retail', 'walmart', 'flipkart', 'myntra'],
      'transportation': ['uber', 'taxi', 'gas', 'fuel', 'parking', 'ola', 'rapido', 'metro'],
      'utilities': ['electric', 'water', 'internet', 'phone', 'utility', 'electricity', 'broadband'],
      'healthcare': ['hospital', 'doctor', 'pharmacy', 'medical', 'apollo', 'fortis', 'medlife'],
      'entertainment': ['movie', 'netflix', 'spotify', 'games', 'prime', 'hotstar', 'youtube'],
      'education': ['school', 'college', 'university', 'course', 'tuition', 'byju', 'unacademy'],
      'travel': ['flight', 'hotel', 'booking', 'makemytrip', 'goibibo', 'airbnb'],
      'subscriptions': ['subscription', 'membership', 'recurring', 'monthly plan'],
      'investment': ['mutual fund', 'stocks', 'shares', 'sip', 'zerodha', 'groww', 'investment'],
      'emi': ['emi', 'equated monthly', 'loan installment', 'monthly installment', 'emi payment'],
      'loan': ['loan', 'credit', 'lending', 'borrowed', 'bajaj', 'hdfc loan', 'personal loan', 'home loan', 'car loan']
    };

    const descLower = description.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }

  extractMerchant(description) {
    // Extract potential merchant name from description
    const words = description.split(/\s+/);
    return words.slice(0, 3).join(' '); // Take first 3 words as potential merchant
  }

  adjustConfidenceScore(transaction, documentType) {
    let confidence = transaction.confidence || 0.5;
    
    // Boost confidence based on document type reliability
    const typeBoost = this.supportedFormats[documentType]?.confidence || 0.5;
    confidence *= typeBoost;
    
    // Adjust based on transaction completeness
    if (transaction.date && transaction.description && transaction.amount) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  generateTags(description) {
    const tags = [];
    const descLower = description.toLowerCase();
    
    // Common transaction tags
    const tagPatterns = {
      'online': ['online', 'web', 'internet'],
      'recurring': ['monthly', 'subscription', 'auto'],
      'cash': ['cash', 'atm', 'withdrawal'],
      'international': ['foreign', 'international', 'overseas']
    };

    for (const [tag, keywords] of Object.entries(tagPatterns)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }
}

module.exports = new AIDocumentProcessor();