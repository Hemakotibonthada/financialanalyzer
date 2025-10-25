/**
 * EMI Extraction Service
 * Extracts EMI details from credit card statements
 */

const pdf = require('pdf-parse');
const fs = require('fs').promises;
const fse = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const logger = require('../utils/logger');
const EMI = require('../models/EMI');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');

class EMIExtractionService {
  constructor() {
    // EMI-related patterns for different credit card providers
    this.emiPatterns = {
      // EMI transaction pattern
      emiTransaction: /EMI[\s-]*(?:TXNS?|TRANSACTION|PURCHASE)?[\s]*[:\-]?\s*([A-Za-z0-9\s.&,']+?)(?:\s+(?:TXNS|PENDING|CURRENT|EMI|OF))?\s+(\d+)[\s\/]*OF[\s\/]*(\d+)\s*(?:@|AT)?\s*([\d,.]+)%?\s*(?:AMOUNT|AMT|RS\.?|₹)?\s*([\d,.]+)/i,
      
      // EMI details in statement
      emiDetails: /(?:EMI|EASY\s+PAY|FLEXI\s+PAY|INSTALLMENT)[\s\-:]*([A-Za-z0-9\s.&,']+?)[\s]+(?:INSTL|INST|EMI)[\s]*(\d+)[\s\/]*OF[\s\/]*(\d+)/i,
      
      // EMI amount pattern
      emiAmount: /EMI[\s\-:]+(?:AMOUNT|AMT|RS\.?|₹)?\s*([\d,.]+)/i,
      
      // Interest rate pattern
      interestRate: /(?:INTEREST|INT|RATE|ROI)[\s\-:]*@?\s*([\d,.]+)%/i,
      
      // Principal amount pattern
      principalAmount: /(?:PRINCIPAL|ORIGINAL|PURCHASE)[\s\-:]+(?:AMOUNT|AMT|RS\.?|₹)?\s*([\d,.]+)/i,
      
      // EMI start date
      startDate: /(?:START|FROM|SINCE)[\s\-:]+(\d{2}[-/]\d{2}[-/]\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4})/i,
      
      // Processing fee
      processingFee: /(?:PROCESSING|PROC)[\s\-]+FEE[\s\-:]+(?:RS\.?|₹)?\s*([\d,.]+)/i,
      
      // ICICI specific patterns
      icici: {
        emiLine: /(\d{2}-\d{2}-\d{4})\s+(.*?EMI.*?)\s+([\d,.]+)\s+([\d,.]+)\s*$/i,
        emiDetails: /EMI.*?(\d+)\/(\d+)\s+@\s*([\d.]+)%/i,
        merchantName: /EMI[\s-]*(?:PURCHASE|TXN)?[\s-]*(.+?)(?:\s+\d+\/\d+|\s+EMI)/i
      },
      
      // HDFC specific patterns
      hdfc: {
        emiLine: /(\d{2}\/\d{2}\/\d{2,4})\s+(.*?EMI.*?)\s+([\d,.]+)(?:\s+Cr|\s+Dr)?/i,
        emiDetails: /SMART\s+EMI.*?(\d+)\/(\d+)/i,
        merchantName: /SMART\s+EMI\s+(.+?)(?:\s+\d+\/\d+)/i
      },
      
      // AXIS specific patterns
      axis: {
        emiLine: /(\d{2}-[A-Z]{3}-\d{4})\s+(.*?EMI.*?)\s+([\d,.]+)/i,
        emiDetails: /EASY\s+PAY.*?(\d+)\/(\d+)/i,
        merchantName: /EASY\s+PAY\s+(.+?)(?:\s+\d+\/\d+)/i
      },
      
      // SBI specific patterns
      sbi: {
        emiLine: /(\d{2}-\d{2}-\d{4})\s+(.*?EMI.*?)\s+([\d,.]+)/i,
        emiDetails: /FLEXIPAY.*?(\d+)\/(\d+)/i,
        merchantName: /FLEXIPAY\s+(.+?)(?:\s+\d+\/\d+)/i
      }
    };
    
    // Date patterns
    this.datePatterns = [
      /(\d{2})[-/](\d{2})[-/](\d{4})/,  // DD-MM-YYYY or DD/MM/YYYY
      /(\d{2})[-/](\d{2})[-/](\d{2})/,   // DD-MM-YY or DD/MM/YY
      /(\d{2})\s+([A-Z]{3})\s+(\d{4})/i, // DD MMM YYYY
      /([A-Z]{3})\s+(\d{2}),?\s+(\d{4})/i // MMM DD, YYYY
    ];
  }

  /**
   * Extract EMIs from credit card statement
   */
  async extractEMIsFromStatement(documentId, userId, password = null) {
    try {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`📄 EXTRACTING EMI DATA FROM STATEMENT`);
      logger.info(`${'='.repeat(80)}`);
      
      // Get document
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      logger.info(`Document: ${document.originalFileName}`);
      logger.info(`Provider: ${document.metadata?.cardProvider || 'UNKNOWN'}`);
      logger.info(`Card: XXXX-${document.metadata?.cardLastFourDigits || 'XXXX'}`);

      // Read PDF file
      const filepath = document.filePath;
      let pdfBuffer = await fs.readFile(filepath);

      // Try to unlock PDF if password is provided
      if (password) {
        try {
          logger.info(`🔓 Attempting to unlock PDF with password...`);
          pdfBuffer = await this.unlockPDF(pdfBuffer, password);
          logger.info(`✅ PDF unlocked successfully`);
        } catch (error) {
          logger.warn(`⚠️ Could not unlock PDF: ${error.message}`);
        }
      }

      // Parse PDF
      logger.info(`📖 Parsing PDF...`);
      const pdfData = await pdf(pdfBuffer);
      const text = pdfData.text;
      
      logger.info(`Pages: ${pdfData.numpages}`);
      logger.info(`Text length: ${text.length} characters`);

      // Extract card details from statement
      const cardDetails = this.extractCardDetails(text, document);
      logger.info(`\n💳 Card Details Extracted:`);
      logger.info(`  Card Holder: ${cardDetails.cardHolderName}`);
      logger.info(`  Statement Period: ${cardDetails.statementPeriod}`);
      logger.info(`  Statement Date: ${cardDetails.statementDate}`);

      // Extract EMI transactions
      const emiTransactions = this.extractEMITransactions(
        text,
        document.metadata?.cardProvider || 'OTHER'
      );

      logger.info(`\n📊 Found ${emiTransactions.length} EMI transactions`);

      // Save EMIs to database
      const savedEMIs = [];
      for (let i = 0; i < emiTransactions.length; i++) {
        const emiData = emiTransactions[i];
        logger.info(`\n${i + 1}. Processing EMI: ${emiData.merchantName}`);
        logger.info(`   Amount: ₹${emiData.emiAmount} x ${emiData.totalTenure} months`);
        logger.info(`   Progress: ${emiData.paidInstallments}/${emiData.totalTenure}`);
        
        try {
          const emi = await this.saveEMI(userId, documentId, cardDetails, emiData);
          savedEMIs.push(emi);
          logger.info(`   ✅ Saved to database with ID: ${emi._id}`);
        } catch (error) {
          logger.error(`   ❌ Error saving EMI: ${error.message}`);
        }
      }

      // Update document status
      document.processingStatus = 'completed';
      document.metadata = {
        ...document.metadata,
        emiCount: savedEMIs.length,
        processedAt: new Date()
      };
      await document.save();

      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`✅ EMI EXTRACTION COMPLETE`);
      logger.info(`   Total EMIs extracted: ${savedEMIs.length}`);
      logger.info(`${'='.repeat(80)}\n`);

      return {
        document: documentId,
        cardDetails,
        emis: savedEMIs,
        count: savedEMIs.length
      };
      
    } catch (error) {
      logger.error('Error extracting EMIs:', error);
      throw error;
    }
  }

  /**
   * Unlock password-protected PDF
   */
  async unlockPDF(pdfBuffer, password) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        password,
        ignoreEncryption: false
      });
      
      // Save as unlocked PDF
      const unlockedPdfBytes = await pdfDoc.save();
      return Buffer.from(unlockedPdfBytes);
    } catch (error) {
      throw new Error(`Failed to unlock PDF: ${error.message}`);
    }
  }

  /**
   * Extract card details from statement
   */
  extractCardDetails(text, document) {
    const lines = text.split('\n');
    
    // Extract card holder name
    let cardHolderName = 'Unknown';
    const namePatterns = [
      /(?:CARD\s+HOLDER|NAME)[:\s]*([A-Z][A-Z\s.]{5,})/i,
      /Dear\s+([A-Z][A-Z\s.]{5,})/i,
      /Mr\.?\s+([A-Z][A-Z\s.]{5,})/i,
      /Ms\.?\s+([A-Z][A-Z\s.]{5,})/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        cardHolderName = match[1].trim();
        break;
      }
    }

    // Extract statement period
    let statementPeriod = 'Unknown';
    const periodPattern = /(?:STATEMENT\s+PERIOD|BILLING\s+PERIOD|FROM)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})\s+(?:TO|[-])\s+(\d{2}[-/]\d{2}[-/]\d{4})/i;
    const periodMatch = text.match(periodPattern);
    if (periodMatch) {
      statementPeriod = `${periodMatch[1]} to ${periodMatch[2]}`;
    }

    // Extract statement date
    let statementDate = new Date();
    const datePattern = /(?:STATEMENT\s+DATE|DATE\s+OF\s+STATEMENT)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      statementDate = this.parseDate(dateMatch[1]);
    }

    return {
      cardHolderName,
      cardProvider: document.metadata?.cardProvider || 'OTHER',
      cardLastFourDigits: document.metadata?.cardLastFourDigits || '0000',
      statementPeriod,
      statementDate,
      statementId: document.sourceMessageId
    };
  }

  /**
   * Extract EMI transactions from statement text
   */
  extractEMITransactions(text, provider) {
    const emis = [];
    const lines = text.split('\n');
    
    logger.info(`\n🔍 Scanning ${lines.length} lines for EMI transactions...`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Check if line contains EMI keyword
      if (!/EMI|INSTALLMENT|FLEXI|EASY\s+PAY|SMART\s+EMI/i.test(line)) {
        continue;
      }

      // Try provider-specific patterns first
      const providerPattern = this.emiPatterns[provider.toLowerCase()];
      let emiData = null;
      
      if (providerPattern) {
        emiData = this.extractWithProviderPattern(line, providerPattern, provider);
      }
      
      // Fallback to generic patterns
      if (!emiData) {
        emiData = this.extractWithGenericPattern(line);
      }

      if (emiData) {
        // Look for additional details in surrounding lines
        const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
        emiData = this.enrichEMIData(emiData, context);
        
        emis.push(emiData);
        logger.info(`  ✓ Found EMI: ${emiData.merchantName} (${emiData.paidInstallments}/${emiData.totalTenure})`);
      }
    }

    return emis;
  }

  /**
   * Extract EMI data using provider-specific pattern
   */
  extractWithProviderPattern(line, providerPattern, provider) {
    if (!providerPattern.emiLine) return null;

    const match = line.match(providerPattern.emiLine);
    if (!match) return null;

    const transactionDate = this.parseDate(match[1]);
    const description = match[2];
    const amount = parseFloat(match[3].replace(/,/g, ''));

    // Extract EMI details (current/total)
    let paidInstallments = 0;
    let totalTenure = 0;
    
    if (providerPattern.emiDetails) {
      const detailsMatch = description.match(providerPattern.emiDetails);
      if (detailsMatch) {
        paidInstallments = parseInt(detailsMatch[1]);
        totalTenure = parseInt(detailsMatch[2]);
      }
    }

    // Extract merchant name
    let merchantName = 'Unknown Merchant';
    if (providerPattern.merchantName) {
      const merchantMatch = description.match(providerPattern.merchantName);
      if (merchantMatch) {
        merchantName = merchantMatch[1].trim();
      }
    }

    // Extract interest rate if available
    let interestRate = 0;
    const rateMatch = description.match(this.emiPatterns.interestRate);
    if (rateMatch) {
      interestRate = parseFloat(rateMatch[1]);
    }

    return {
      transactionDate,
      merchantName,
      emiAmount: amount,
      totalTenure,
      paidInstallments,
      remainingInstallments: totalTenure - paidInstallments,
      interestRate,
      principalAmount: amount * totalTenure, // Approximate
      productDescription: description
    };
  }

  /**
   * Extract EMI data using generic patterns
   */
  extractWithGenericPattern(line) {
    // Try main EMI transaction pattern
    let match = line.match(this.emiPatterns.emiTransaction);
    
    if (match) {
      const merchantName = match[1].trim();
      const paidInstallments = parseInt(match[2]);
      const totalTenure = parseInt(match[3]);
      const interestRate = parseFloat(match[4] || 0);
      const emiAmount = parseFloat(match[5].replace(/,/g, ''));

      return {
        merchantName,
        emiAmount,
        totalTenure,
        paidInstallments,
        remainingInstallments: totalTenure - paidInstallments,
        interestRate,
        principalAmount: emiAmount * totalTenure,
        productDescription: line.trim()
      };
    }

    // Try simpler EMI details pattern
    match = line.match(this.emiPatterns.emiDetails);
    if (match) {
      const merchantName = match[1].trim();
      const paidInstallments = parseInt(match[2]);
      const totalTenure = parseInt(match[3]);
      
      // Try to find amount in the line
      const amountMatch = line.match(/([\d,.]+)/);
      const emiAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

      return {
        merchantName,
        emiAmount,
        totalTenure,
        paidInstallments,
        remainingInstallments: totalTenure - paidInstallments,
        interestRate: 0,
        principalAmount: emiAmount * totalTenure,
        productDescription: line.trim()
      };
    }

    return null;
  }

  /**
   * Enrich EMI data with additional information from context
   */
  enrichEMIData(emiData, context) {
    // Try to extract principal amount if not set
    if (!emiData.principalAmount || emiData.principalAmount === emiData.emiAmount * emiData.totalTenure) {
      const principalMatch = context.match(this.emiPatterns.principalAmount);
      if (principalMatch) {
        emiData.principalAmount = parseFloat(principalMatch[1].replace(/,/g, ''));
      }
    }

    // Try to extract interest rate if not set
    if (!emiData.interestRate || emiData.interestRate === 0) {
      const rateMatch = context.match(this.emiPatterns.interestRate);
      if (rateMatch) {
        emiData.interestRate = parseFloat(rateMatch[1]);
      }
    }

    // Try to extract processing fee
    const feeMatch = context.match(this.emiPatterns.processingFee);
    if (feeMatch) {
      emiData.processingFee = parseFloat(feeMatch[1].replace(/,/g, ''));
    } else {
      emiData.processingFee = 0;
    }

    // Calculate dates
    if (!emiData.transactionDate) {
      emiData.transactionDate = new Date();
    }

    return emiData;
  }

  /**
   * Save EMI to database
   */
  async saveEMI(userId, documentId, cardDetails, emiData) {
    // Calculate dates
    const startDate = emiData.transactionDate || new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + emiData.totalTenure);
    
    const nextDueDate = new Date(startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + emiData.paidInstallments + 1);

    // Check if EMI already exists
    const existing = await EMI.findOne({
      userId,
      cardProvider: cardDetails.cardProvider,
      cardLastFourDigits: cardDetails.cardLastFourDigits,
      merchantName: emiData.merchantName,
      emiAmount: emiData.emiAmount,
      totalTenure: emiData.totalTenure
    });

    if (existing) {
      // Update existing EMI
      existing.paidInstallments = emiData.paidInstallments;
      existing.remainingInstallments = emiData.remainingInstallments;
      existing.nextDueDate = nextDueDate;
      existing.lastSyncedAt = new Date();
      
      if (emiData.remainingInstallments === 0) {
        existing.status = 'completed';
      }
      
      await existing.save();
      return existing;
    }

    // Create new EMI record
    const emi = new EMI({
      userId,
      cardProvider: cardDetails.cardProvider,
      cardLastFourDigits: cardDetails.cardLastFourDigits,
      cardHolderName: cardDetails.cardHolderName,
      merchantName: emiData.merchantName,
      productDescription: emiData.productDescription,
      principalAmount: emiData.principalAmount,
      interestRate: emiData.interestRate,
      processingFee: emiData.processingFee || 0,
      emiAmount: emiData.emiAmount,
      totalTenure: emiData.totalTenure,
      paidInstallments: emiData.paidInstallments,
      remainingInstallments: emiData.remainingInstallments,
      startDate,
      endDate,
      nextDueDate,
      transactionDate: emiData.transactionDate,
      statementId: cardDetails.statementId,
      statementDate: cardDetails.statementDate,
      statementPeriod: cardDetails.statementPeriod,
      documentId,
      status: emiData.remainingInstallments > 0 ? 'active' : 'completed',
      extractionMethod: 'auto',
      extractionConfidence: 85,
      lastSyncedAt: new Date()
    });

    await emi.save();
    return emi;
  }

  /**
   * Parse date from string
   */
  parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    for (const pattern of this.datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let parsedDate;
        
        if (pattern.toString().includes('MMM')) {
          // Handle month name format
          const monthMap = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11,
            'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4, 'JUNE': 5,
            'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
          };
          
          // Check if first capture is a digit (DD MMM YYYY) or letter (MMM DD, YYYY)
          let day, month, year;
          if (/^\d+$/.test(match[1])) {
            // Pattern: DD MMM YYYY (match[1]=day, match[2]=month, match[3]=year)
            day = parseInt(match[1]);
            month = monthMap[match[2].toUpperCase()];
            year = parseInt(match[3]);
          } else {
            // Pattern: MMM DD, YYYY (match[1]=month, match[2]=day, match[3]=year)
            month = monthMap[match[1].toUpperCase()];
            day = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          parsedDate = new Date(year, month, day);
        } else {
          // Handle numeric format (DD-MM-YYYY or DD/MM/YYYY)
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          let year = parseInt(match[3]);
          
          // Handle 2-digit year
          if (year < 100) {
            // Assume years 00-50 are 2000-2050, 51-99 are 1951-1999
            year += (year <= 50) ? 2000 : 1900;
          }
          
          parsedDate = new Date(year, month, day);
        }
        
        // Validate the parsed date is reasonable (within past 3 years to 2 years future)
        const currentDate = new Date();
        const minDate = new Date(currentDate.getFullYear() - 3, 0, 1);
        const maxDate = new Date(currentDate.getFullYear() + 2, 11, 31);
        
        if (parsedDate >= minDate && parsedDate <= maxDate && !isNaN(parsedDate.getTime())) {
          return parsedDate;
        } else {
          logger.warn(`Parsed date ${parsedDate.toISOString()} from "${dateStr}" is out of valid range. Skipping this pattern.`);
          continue; // Try next pattern
        }
      }
    }
    
    // Fallback: try native Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      const currentDate = new Date();
      const minDate = new Date(currentDate.getFullYear() - 3, 0, 1);
      const maxDate = new Date(currentDate.getFullYear() + 2, 11, 31);
      
      if (fallbackDate >= minDate && fallbackDate <= maxDate) {
        return fallbackDate;
      }
    }
    
    // If all else fails, return current date
    logger.warn(`Could not parse valid date from "${dateStr}", using current date`);
    return new Date();
  }
}

module.exports = EMIExtractionService;
