const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const path = require('path');
const sharp = require('sharp');
const mammoth = require('mammoth');
const { PDFDocument } = require('pdf-lib');
const logger = require('../utils/logger');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');
const FinancialProfile = require('../models/FinancialProfile');
const aiDocumentProcessor = require('./aiDocumentProcessor');

/**
 * Extract text from PDF with password support
 */
const parsePDF = async (filePath, password = null) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // If password provided, try to decrypt first
    if (password) {
      try {
        const pdfDoc = await PDFDocument.load(dataBuffer, { password });
        const pdfBytes = await pdfDoc.save();
        const data = await pdfParse(Buffer.from(pdfBytes));
        return {
          text: data.text,
          pages: data.numpages,
          info: data.info,
          passwordUsed: password
        };
      } catch (passwordError) {
        logger.error('PDF password error:', passwordError);
        throw new Error('Invalid password for PDF file');
      }
    }
    
    // Try without password first
    try {
      const data = await pdfParse(dataBuffer);
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (parseError) {
      // Check if it's a password-protected PDF
      if (parseError.message.includes('password') || parseError.message.includes('encrypted')) {
        throw new Error('PDF_PASSWORD_REQUIRED');
      }
      throw parseError;
    }
  } catch (error) {
    logger.error('PDF parse error:', error);
    if (error.message === 'PDF_PASSWORD_REQUIRED') {
      throw error;
    }
    throw new Error('Failed to parse PDF file');
  }
};

/**
 * Try multiple password combinations for PDF
 */
const tryPasswordCombinations = async (filePath, passwordHints, userProfile) => {
  const passwords = await generatePasswordCombinations(passwordHints, userProfile);
  
  for (const password of passwords) {
    try {
      logger.info(`Trying password: ${password.substring(0, 2)}***`);
      const result = await parsePDF(filePath, password);
      logger.info(`Successfully unlocked PDF with password`);
      return { ...result, passwordUsed: password };
    } catch (error) {
      if (!error.message.includes('Invalid password')) {
        throw error;
      }
      // Continue to next password
    }
  }
  
  throw new Error('Could not unlock PDF with any generated passwords');
};

/**
 * Generate password combinations based on hints and user profile
 */
const generatePasswordCombinations = async (passwordHints, userProfile) => {
  const passwords = [];
  
  // Direct password hints from email
  passwordHints.forEach(hint => {
    if (hint.hint && hint.hint.length >= 4) {
      passwords.push(hint.hint);
      passwords.push(hint.hint.toUpperCase());
      passwords.push(hint.hint.toLowerCase());
    }
  });
  
  if (userProfile) {
    const dob = userProfile.dateOfBirth;
    const pan = userProfile.panNumber;
    const name = userProfile.fullName;
    
    // Date of birth combinations
    if (dob) {
      const dobDate = new Date(dob);
      passwords.push(dobDate.getDate().toString().padStart(2, '0') + (dobDate.getMonth() + 1).toString().padStart(2, '0') + dobDate.getFullYear());
      passwords.push(dobDate.getFullYear().toString());
      passwords.push(dobDate.getDate().toString() + (dobDate.getMonth() + 1).toString() + dobDate.getFullYear().toString().substring(2));
    }
    
    // PAN number combinations
    if (pan) {
      passwords.push(pan);
      passwords.push(pan.substring(5, 9)); // Numbers from PAN
      passwords.push(pan.substring(0, 5)); // Letters from PAN
    }
    
    // Name combinations
    if (name) {
      const nameParts = name.split(' ');
      passwords.push(nameParts[0].toLowerCase());
      passwords.push(nameParts[0].toUpperCase());
      if (nameParts.length > 1) {
        passwords.push(nameParts[0].toLowerCase() + nameParts[nameParts.length - 1].toLowerCase());
        passwords.push((nameParts[0].charAt(0) + nameParts[nameParts.length - 1]).toLowerCase());
      }
    }
  }
  
  // Common password patterns
  const commonPatterns = [
    '123456', '1234', '0000', '1111', '2222', '9999',
    'password', 'admin', 'user', 'guest',
    new Date().getFullYear().toString()
  ];
  
  passwords.push(...commonPatterns);
  
  // Remove duplicates and return
  return [...new Set(passwords)].filter(p => p && p.length >= 4);
};

/**
 * Extract text from Word documents
 */
const parseWordDocument = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      text: result.value,
      messages: result.messages
    };
  } catch (error) {
    logger.error('Word document parse error:', error);
    throw new Error('Failed to parse Word document');
  }
};

/**
 * Extract text from images using OCR (simplified version)
 */
const parseImageWithOCR = async (filePath) => {
  try {
    // Convert image to buffer for processing
    const imageBuffer = await sharp(filePath)
      .resize(1200, null, { withoutEnlargement: true })
      .png()
      .toBuffer();
    
    // For now, return a placeholder - OCR libraries like Tesseract would go here
    // This would require additional setup and dependencies
    return {
      text: 'OCR processing not fully implemented - image detected',
      confidence: 0.1
    };
  } catch (error) {
    logger.error('Image OCR error:', error);
    throw new Error('Failed to process image file');
  }
};

/**
 * Parse CSV file
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse JSON file
 */
const parseJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('JSON parse error:', error);
    throw new Error('Failed to parse JSON file');
  }
};

/**
 * Extract transactions from text (PDF or plain text)
 */
const extractTransactionsFromText = (text) => {
  const transactions = [];
  const lines = text.split('\n');
  
  // Common patterns for transaction data
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
  const amountPattern = /(\$|₹|€|£)?\s*(\d+[,\d]*\.?\d*)/;
  
  lines.forEach(line => {
    const dateMatch = line.match(datePattern);
    const amountMatches = line.match(new RegExp(amountPattern.source, 'g'));
    
    if (dateMatch && amountMatches) {
      const date = dateMatch[0];
      const amounts = amountMatches.map(a => parseFloat(a.replace(/[^\d.-]/g, '')));
      
      // Extract description (everything between date and amount)
      let description = line.replace(dateMatch[0], '').trim();
      amountMatches.forEach(a => {
        description = description.replace(a, '').trim();
      });
      
      if (amounts.length > 0 && description) {
        transactions.push({
          date: new Date(date),
          description: description.substring(0, 100),
          amount: amounts[0],
          rawLine: line
        });
      }
    }
  });
  
  return transactions;
};

/**
 * Extract transactions from CSV data
 */
const extractTransactionsFromCSV = (csvData) => {
  const transactions = [];
  
  // Common CSV column names
  const dateColumns = ['date', 'transaction date', 'posted date', 'Date', 'Transaction Date'];
  const descColumns = ['description', 'desc', 'narration', 'particulars', 'Description', 'Merchant'];
  const amountColumns = ['amount', 'debit', 'credit', 'Amount', 'Debit', 'Credit'];
  const typeColumns = ['type', 'transaction type', 'Type'];
  
  csvData.forEach(row => {
    const transaction = {};
    
    // Find date
    const dateKey = Object.keys(row).find(key => 
      dateColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))
    );
    if (dateKey) transaction.date = new Date(row[dateKey]);
    
    // Find description
    const descKey = Object.keys(row).find(key => 
      descColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))
    );
    if (descKey) transaction.description = row[descKey];
    
    // Find amount
    const amountKey = Object.keys(row).find(key => 
      amountColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))
    );
    if (amountKey) {
      const amountStr = row[amountKey].toString().replace(/[^\d.-]/g, '');
      transaction.amount = parseFloat(amountStr);
    }
    
    // Find type
    const typeKey = Object.keys(row).find(key => 
      typeColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))
    );
    if (typeKey) transaction.type = row[typeKey].toLowerCase().includes('credit') ? 'credit' : 'debit';
    
    // Add raw data
    transaction.rawData = row;
    
    if (transaction.date && transaction.description && transaction.amount) {
      transactions.push(transaction);
    }
  });
  
  return transactions;
};

/**
 * Extract transactions from JSON data
 */
const extractTransactionsFromJSON = (jsonData) => {
  let transactions = [];
  
  // Handle different JSON structures
  if (Array.isArray(jsonData)) {
    transactions = jsonData;
  } else if (jsonData.transactions) {
    transactions = jsonData.transactions;
  } else if (jsonData.data) {
    transactions = jsonData.data;
  }
  
  // Normalize transaction structure
  return transactions.map(t => ({
    date: new Date(t.date || t.transactionDate || t.Date),
    description: t.description || t.desc || t.narration || t.particulars || 'Unknown',
    amount: parseFloat(t.amount || t.debit || t.credit || 0),
    type: t.type || (t.amount < 0 ? 'debit' : 'credit'),
    category: t.category || 'Uncategorized',
    merchant: t.merchant || t.vendor || '',
    rawData: t
  }));
};

/**
 * Process document by ID from database
 */
const processDocumentById = async (documentId, password = null) => {
  try {
    const document = await Document.findById(documentId).populate('userId');
    if (!document) {
      throw new Error('Document not found');
    }

    const userProfile = await FinancialProfile.findOne({ userId: document.userId });
    
    // Update processing status
    document.processingStatus = 'processing';
    await document.save();

    let result;
    try {
      // Step 1: Basic file processing to extract text
      const basicResult = await processDocumentFile(document.filePath, document.fileType, password, document.passwordHints, userProfile);
      
      // Step 2: Enhanced AI processing with confidence scoring
      const aiResult = await aiDocumentProcessor.processDocumentWithAI(
        basicResult.extractedText, 
        document.category || 'other',
        document.userId?._id || document.userId,
        documentId
      );
      
      if (aiResult.success) {
        // Use AI-enhanced results
        result = {
          extractedText: basicResult.extractedText,
          transactions: aiResult.transactions,
          metadata: {
            ...basicResult.metadata,
            ai_processing: aiResult.metadata,
            confidence_score: aiResult.confidence,
            statistics: aiResult.statistics,
            document_type_detected: aiResult.documentType
          },
          passwordUsed: basicResult.passwordUsed
        };
        
        logger.info(`AI processing successful for ${document.originalFileName}: confidence ${aiResult.confidence.toFixed(2)}, ${aiResult.transactions.length} transactions`);
      } else if (aiResult.fallback) {
        // Fall back to basic processing
        result = basicResult;
        result.metadata.ai_processing = { fallback: true, error: aiResult.error };
        logger.warn(`AI processing failed for ${document.originalFileName}, using basic processing: ${aiResult.error}`);
      } else {
        throw new Error(aiResult.error);
      }
      
      // Save extracted data
      document.extractedText = result.extractedText;
      document.extractedData = result.metadata;
      document.transactionCount = result.transactions.length;
      document.isProcessed = true;
      document.processingStatus = 'completed';
      
      if (result.passwordUsed) {
        document.isPasswordProtected = true;
        document.passwordHints.push({
          source: 'successful_unlock',
          hint: result.passwordUsed,
          extractedDate: new Date()
        });
      }
      
      await document.save();

      // Save transactions
      const transactions = await saveTransactions(result.transactions, document);
      
      logger.info(`Successfully processed document ${document.originalFileName}: ${transactions.length} transactions`);
      
      return {
        document,
        transactions,
        extractedText: result.extractedText,
        metadata: result.metadata
      };

    } catch (error) {
      if (error.message === 'PDF_PASSWORD_REQUIRED') {
        document.processingStatus = 'password_required';
        document.isPasswordProtected = true;
      } else {
        document.processingStatus = 'failed';
        document.processingError = error.message;
      }
      await document.save();
      throw error;
    }

  } catch (error) {
    logger.error(`Error processing document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Process document file based on type
 */
const processDocumentFile = async (filePath, fileType, password = null, passwordHints = [], userProfile = null) => {
  let extractedText = '';
  let metadata = {};
  let transactions = [];

  const fileExtension = '.' + fileType.toLowerCase();
  
  try {
    if (fileExtension === '.pdf') {
      let pdfData;
      
      if (password) {
        // Try with provided password
        pdfData = await parsePDF(filePath, password);
      } else {
        try {
          // Try without password first
          pdfData = await parsePDF(filePath);
        } catch (error) {
          if (error.message === 'PDF_PASSWORD_REQUIRED' && passwordHints.length > 0) {
            // Try password combinations
            pdfData = await tryPasswordCombinations(filePath, passwordHints, userProfile);
          } else {
            throw error;
          }
        }
      }
      
      extractedText = pdfData.text;
      metadata = {
        type: 'pdf',
        pages: pdfData.pages,
        info: pdfData.info,
        passwordUsed: pdfData.passwordUsed
      };
      transactions = extractTransactionsFromText(pdfData.text);
      
    } else if (fileExtension === '.csv') {
      const csvData = await parseCSV(filePath);
      metadata = {
        type: 'csv',
        rows: csvData.length
      };
      transactions = extractTransactionsFromCSV(csvData);
      extractedText = JSON.stringify(csvData, null, 2);
      
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      // For Excel files, we'll treat them as CSV for now
      // A proper Excel parser could be added later
      const csvData = await parseCSV(filePath);
      metadata = {
        type: 'excel',
        rows: csvData.length
      };
      transactions = extractTransactionsFromCSV(csvData);
      extractedText = JSON.stringify(csvData, null, 2);
      
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      const wordData = await parseWordDocument(filePath);
      extractedText = wordData.text;
      metadata = {
        type: 'word',
        messages: wordData.messages
      };
      transactions = extractTransactionsFromText(wordData.text);
      
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      const ocrData = await parseImageWithOCR(filePath);
      extractedText = ocrData.text;
      metadata = {
        type: 'image',
        confidence: ocrData.confidence
      };
      transactions = extractTransactionsFromText(ocrData.text);
      
    } else if (fileExtension === '.json') {
      const jsonData = await parseJSON(filePath);
      extractedText = JSON.stringify(jsonData, null, 2);
      metadata = {
        type: 'json'
      };
      transactions = extractTransactionsFromJSON(jsonData);
      
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return {
      extractedText,
      metadata,
      transactions,
      passwordUsed: metadata.passwordUsed
    };

  } catch (error) {
    logger.error(`Error processing ${fileType} file:`, error);
    throw error;
  }
};

/**
 * Save transactions to database
 */
const saveTransactions = async (transactionData, document) => {
  const savedTransactions = [];
  
  for (const txnData of transactionData) {
    try {
      // Enhanced transaction data with AI processing support
      const transactionDoc = new Transaction({
        userId: document.userId,
        documentId: document._id,
        date: txnData.date,
        description: txnData.description,
        amount: Math.abs(txnData.amount),
        type: txnData.type || (txnData.amount > 0 ? 'credit' : 'debit'),
        category: txnData.ai_category || categorizeTransaction(txnData.description),
        merchantName: txnData.ai_merchant || extractMerchantName(txnData.description),
        referenceNumber: txnData.referenceNumber || txnData.txnId,
        balance: txnData.balance,
        paymentMethod: txnData.paymentMethod || (txnData.ai_category === 'UPI Payments' ? 'upi' : undefined),
        source: txnData.source || (document.source === 'gmail_email' ? 'gmail_email' : document.source === 'gmail' ? 'gmail_attachment' : 'upload'),
        upi: txnData.upi,
        emailMetadata: txnData.emailMetadata,
        extractionMethod: txnData.enhanced ? 'ai_enhanced' : getExtractionMethod(document.fileType),
        confidence: txnData.ai_confidence || txnData.confidence || calculateConfidence(txnData),
        aiProcessed: !!txnData.enhanced,
        tags: txnData.ai_tags || [],
        
        // AI enhancement fields
        aiEnhancements: txnData.enhanced ? {
          detectedCategory: txnData.ai_category,
          detectedMerchant: txnData.ai_merchant,
          confidenceScore: txnData.ai_confidence,
          tags: txnData.ai_tags || [],
          enhancementTimestamp: txnData.enhancement_timestamp,
          sourceLine: txnData.source_line,
          rawText: txnData.raw_text
        } : undefined,
        
        // Processing metadata
        processingMetadata: {
          documentType: document.category,
          extractionPatterns: txnData.patterns_used || [],
          validationIssues: txnData.validation_issues || [],
          enhancementApplied: !!txnData.enhanced
        }
      });

      const savedTransaction = await transactionDoc.save();
      savedTransactions.push(savedTransaction);
      
    } catch (error) {
      logger.error(`Error saving transaction: ${error.message}`, txnData);
      // Continue with other transactions
    }
  }

  return savedTransactions;
};

/**
 * Get extraction method based on file type
 */
const getExtractionMethod = (fileType) => {
  const methods = {
    'pdf': 'pdf_text',
    'csv': 'csv_parse',
    'xlsx': 'csv_parse',
    'xls': 'csv_parse',
    'json': 'csv_parse',
    'jpg': 'ocr',
    'jpeg': 'ocr',
    'png': 'ocr',
    'doc': 'pdf_text',
    'docx': 'pdf_text'
  };
  
  return methods[fileType.toLowerCase()] || 'manual';
};

/**
 * Calculate confidence score for transaction extraction
 */
const calculateConfidence = (transactionData) => {
  let confidence = 0.5;
  
  // Has valid date
  if (transactionData.date && !isNaN(new Date(transactionData.date).getTime())) {
    confidence += 0.2;
  }
  
  // Has meaningful description
  if (transactionData.description && transactionData.description.length > 5) {
    confidence += 0.2;
  }
  
  // Has valid amount
  if (transactionData.amount && !isNaN(transactionData.amount) && transactionData.amount > 0) {
    confidence += 0.2;
  }
  
  // Has reference number or ID
  if (transactionData.referenceNumber || transactionData.txnId) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
};

/**
 * Extract merchant name from transaction description
 */
const extractMerchantName = (description) => {
  if (!description) return null;
  
  // Remove common banking terms
  const cleanDesc = description
    .replace(/\b(POS|ATM|UPI|NEFT|IMPS|RTGS|CHQ|DD|FT|TRANSFER)\b/gi, '')
    .replace(/\b\d{2,}\b/g, '') // Remove numbers
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .trim();
  
  // Take first few meaningful words
  const words = cleanDesc.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ').trim() || null;
};

/**
 * Process uploaded document and extract transactions
 */
const processDocument = async (file, options = {}) => {
  try {
    let filePath, originalname, fileSize;
    
    // Handle both file objects and file paths
    if (typeof file === 'string') {
      // File path provided directly (from Gmail download)
      filePath = file;
      originalname = path.basename(file);
      fileSize = (await fs.stat(file)).size;
    } else {
      // File upload object
      filePath = file.path;
      originalname = file.originalname;
      fileSize = file.size;
    }
    
    logger.info(`Processing document: ${originalname}`, {
      category: options.category,
      priority: options.priority,
      confidence: options.confidence
    });
    
    const fileExtension = path.extname(originalname).substring(1);
    const result = await processDocumentFile(filePath, fileExtension, null, [], null);
    
    // Enhance results with options metadata
    const enhancedResult = {
      ...result,
      filename: originalname,
      fileSize: fileSize,
      processedAt: new Date(),
      processingOptions: options
    };

    // Add email metadata to transactions if available
    if (options.emailMetadata && result.transactions) {
      enhancedResult.transactions = result.transactions.map(transaction => ({
        ...transaction,
        emailMetadata: options.emailMetadata,
        extractionSource: 'gmail',
        processingCategory: options.category,
        processingConfidence: options.confidence
      }));
    }

    // Add financial insights based on category and priority
    if (options.category) {
      enhancedResult.insights = generateCategoryInsights(result.transactions, options.category);
    }
    
    logger.info(`Extracted ${result.transactions.length} transactions from ${originalname}`, {
      category: options.category,
      insights: !!enhancedResult.insights
    });
    
    return enhancedResult;
  } catch (error) {
    logger.error('Document processing error:', error);
    throw error;
  }
};

/**
 * Process multiple documents
 */
const processMultipleDocuments = async (files) => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await processDocument(file);
      results.push(result);
    } catch (error) {
      logger.error(`Failed to process ${file.originalname}:`, error);
      results.push({
        filename: file.originalname,
        error: error.message,
        success: false
      });
    }
  }
  
  // Combine all transactions
  const allTransactions = results
    .filter(r => r.transactions)
    .flatMap(r => r.transactions);
  
  return {
    results,
    totalTransactions: allTransactions.length,
    transactions: allTransactions
  };
};

/**
 * Categorize transaction based on description
 */
const categorizeTransaction = (description, customCategories = []) => {
  const desc = description.toLowerCase();
  
  // Check custom categories first
  for (const custom of customCategories) {
    if (custom.keywords && custom.keywords.some(kw => desc.includes(kw.toLowerCase()))) {
      return custom.name;
    }
  }
  
  // Default categories with keywords (enhanced with UPI and digital payments)
  const categories = {
    'UPI Payments': ['upi', 'paytm', 'phonepe', 'googlepay', 'gpay', 'bharatpe', 'cred', 'mobikwik', 'freecharge', 'amazonpay', 'jiopay', 'airtel money', 'ybl', 'okhdfcbank', 'okaxis', 'oksbi', 'okicici', 'digital payment', 'wallet transfer'],
    'Mobile Recharge & Bills': ['mobile recharge', 'recharge', 'prepaid', 'postpaid', 'bill payment', 'electricity bill', 'water bill', 'gas bill', 'broadband bill', 'dth recharge', 'fastag recharge'],
    'Peer-to-Peer Transfer': ['money transfer', 'sent to', 'received from', 'split bill', 'request money', 'collect request', 'p2p transfer', 'friend payment', 'family transfer'],
    'QR Code Payments': ['qr payment', 'qr code', 'scan and pay', 'merchant payment', 'store payment', 'pos payment'],
    'Food & Dining': ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'starbucks', 'dining', 'zomato', 'swiggy', 'ubereats', 'foodpanda', 'dominos', 'mcdonalds', 'kfc'],
    'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus', 'train', 'ola', 'rapido', 'auto', 'petrol', 'diesel'],
    'Shopping': ['amazon', 'flipkart', 'walmart', 'target', 'mall', 'store', 'shop', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'paytm mall'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'theater', 'gaming', 'prime', 'hotstar', 'youtube', 'disney', 'sony liv', 'zee5', 'bookmyshow'],
    'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'mobile', 'broadband', 'wifi', 'electricity', 'telephone', 'cable tv'],
    'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medical', 'clinic', 'medicine', 'health', '1mg', 'pharmeasy', 'netmeds', 'apollo'],
    'Education': ['school', 'college', 'university', 'course', 'tuition', 'book', 'udemy', 'coursera', 'byjus', 'unacademy', 'exam fee'],
    'Insurance': ['insurance', 'policy', 'premium', 'lic', 'health insurance', 'term insurance', 'motor insurance'],
    'Investment': ['mutual fund', 'stock', 'sip', 'investment', 'zerodha', 'groww', 'upstox', 'angel', 'icicidirect', 'kuvera', 'etmoney'],
    'Cryptocurrency': ['wazirx', 'coindcx', 'binance', 'coinbase', 'bitcoin', 'crypto', 'ethereum', 'trading'],
    'Loans & EMI': ['loan', 'emi', 'installment', 'home loan', 'personal loan', 'car loan', 'credit card bill', 'bajaj finserv'],
    'Rent & Housing': ['rent', 'lease', 'housing', 'apartment', 'maintenance', 'society fee'],
    'Salary': ['salary', 'payroll', 'income', 'wages', 'bonus', 'pf', 'provident fund'],
    'Government & Taxes': ['tax', 'income tax', 'gst', 'tds', 'government fee', 'challan', 'fine'],
    'Cashback & Rewards': ['cashback', 'reward', 'points', 'offer', 'discount', 'refund'],
    'Other Income': ['refund', 'interest', 'dividend', 'fd interest', 'rd maturity', 'bonus shares']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  
  return 'Uncategorized';
};

/**
 * Detect recurring transactions
 */
const detectRecurringTransactions = (transactions) => {
  const grouped = {};
  
  // Group similar transactions
  transactions.forEach(t => {
    const key = `${t.description.toLowerCase()}_${Math.abs(t.amount)}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(t);
  });
  
  // Find recurring patterns
  const recurring = [];
  
  Object.entries(grouped).forEach(([key, txns]) => {
    if (txns.length >= 2) {
      // Sort by date
      txns.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate intervals
      const intervals = [];
      for (let i = 1; i < txns.length; i++) {
        const days = Math.round((new Date(txns[i].date) - new Date(txns[i-1].date)) / (1000 * 60 * 60 * 24));
        intervals.push(days);
      }
      
      // Check if intervals are consistent (within 7 days variance)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const isConsistent = intervals.every(i => Math.abs(i - avgInterval) <= 7);
      
      if (isConsistent) {
        recurring.push({
          description: txns[0].description,
          amount: txns[0].amount,
          frequency: avgInterval < 10 ? 'weekly' : avgInterval < 35 ? 'monthly' : 'yearly',
          occurrences: txns.length,
          averageInterval: Math.round(avgInterval)
        });
      }
    }
  });
  
  return recurring;
};

/**
 * Generate category-specific financial insights
 */
const generateCategoryInsights = (transactions, category) => {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const insights = {
    category: category,
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
    averageAmount: 0,
    dateRange: {
      earliest: null,
      latest: null
    },
    patterns: {},
    recommendations: []
  };

  // Calculate averages
  insights.averageAmount = insights.totalAmount / insights.totalTransactions;

  // Find date range
  const validDates = transactions.filter(t => t.date).map(t => new Date(t.date));
  if (validDates.length > 0) {
    insights.dateRange.earliest = new Date(Math.min(...validDates));
    insights.dateRange.latest = new Date(Math.max(...validDates));
  }

  // Category-specific insights
  switch (category.toLowerCase()) {
    case 'banking':
      insights.patterns = {
        accountTypes: [...new Set(transactions.map(t => 
          t.description?.toLowerCase().includes('saving') ? 'savings' : 
          t.description?.toLowerCase().includes('current') ? 'current' : 'unknown'
        ))],
        transactionTypes: [...new Set(transactions.map(t => t.type).filter(Boolean))]
      };
      insights.recommendations.push('Monitor account fees and maintain minimum balance');
      break;

    case 'creditcards':
      const creditLimit = Math.max(...transactions.map(t => Math.abs(t.amount || 0)));
      insights.patterns = {
        estimatedCreditLimit: creditLimit,
        utilizationPattern: insights.totalAmount / creditLimit,
        paymentFrequency: detectPaymentPattern(transactions)
      };
      insights.recommendations.push('Keep credit utilization below 30% for better credit score');
      break;

    case 'investments':
      insights.patterns = {
        investmentTypes: [...new Set(transactions.map(t => 
          categorizeInvestment(t.description || '')
        ))],
        totalInvestment: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
      };
      insights.recommendations.push('Diversify investments across different asset classes');
      break;

    case 'utilities':
      insights.patterns = {
        utilityTypes: [...new Set(transactions.map(t => 
          categorizeUtility(t.description || '')
        ))],
        monthlyAverage: insights.totalAmount / Math.max(1, getMonthSpan(transactions))
      };
      insights.recommendations.push('Consider energy-efficient appliances to reduce utility costs');
      break;

    default:
      insights.patterns = {
        transactionFrequency: calculateTransactionFrequency(transactions),
        commonMerchants: getTopMerchants(transactions, 5)
      };
  }

  return insights;
};

/**
 * Helper functions for category insights
 */
const detectPaymentPattern = (transactions) => {
  const payments = transactions.filter(t => t.amount > 0);
  if (payments.length < 2) return 'insufficient_data';
  
  const intervals = [];
  payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (let i = 1; i < payments.length; i++) {
    const days = Math.round((new Date(payments[i].date) - new Date(payments[i-1].date)) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  
  if (avgInterval <= 7) return 'weekly';
  if (avgInterval <= 35) return 'monthly';
  return 'irregular';
};

const categorizeInvestment = (description) => {
  const desc = description.toLowerCase();
  if (desc.includes('mutual fund') || desc.includes('sip')) return 'Mutual Funds';
  if (desc.includes('stock') || desc.includes('equity')) return 'Stocks';
  if (desc.includes('bond') || desc.includes('debt')) return 'Bonds';
  if (desc.includes('fd') || desc.includes('fixed deposit')) return 'Fixed Deposits';
  return 'Other';
};

const categorizeUtility = (description) => {
  const desc = description.toLowerCase();
  if (desc.includes('electric') || desc.includes('power')) return 'Electricity';
  if (desc.includes('water')) return 'Water';
  if (desc.includes('gas')) return 'Gas';
  if (desc.includes('internet') || desc.includes('broadband')) return 'Internet';
  if (desc.includes('mobile') || desc.includes('phone')) return 'Mobile';
  return 'Other';
};

const calculateTransactionFrequency = (transactions) => {
  if (transactions.length === 0) return 0;
  
  const validDates = transactions.filter(t => t.date).map(t => new Date(t.date));
  if (validDates.length < 2) return 0;
  
  const days = (Math.max(...validDates) - Math.min(...validDates)) / (1000 * 60 * 60 * 24);
  return Math.round(transactions.length / Math.max(1, days / 30)); // per month
};

const getTopMerchants = (transactions, limit = 5) => {
  const merchants = {};
  
  transactions.forEach(t => {
    const merchant = extractMerchantName(t.description || '');
    if (merchant) {
      merchants[merchant] = (merchants[merchant] || 0) + 1;
    }
  });
  
  return Object.entries(merchants)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
};

const getMonthSpan = (transactions) => {
  const validDates = transactions.filter(t => t.date).map(t => new Date(t.date));
  if (validDates.length < 2) return 1;
  
  const months = (Math.max(...validDates) - Math.min(...validDates)) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(1, Math.round(months));
};

module.exports = {
  parsePDF,
  parseCSV,
  parseJSON,
  processDocument,
  processDocumentById,
  processDocumentFile,
  processMultipleDocuments,
  categorizeTransaction,
  detectRecurringTransactions,
  extractTransactionsFromText,
  extractTransactionsFromCSV,
  extractTransactionsFromJSON,
  tryPasswordCombinations,
  generatePasswordCombinations,
  parseWordDocument,
  parseImageWithOCR,
  saveTransactions,
  generateCategoryInsights
};
