/**
 * Credit Card Statement Service
 * Handles fetching, downloading, and extracting credit card statements from Gmail
 * Supports automatic password extraction from email body
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const fse = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const Document = require('../models/Document');
const EMI = require('../models/EMI');

class CreditCardStatementService {
  constructor(oauth2Client) {
    this.oauth2Client = oauth2Client;
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Credit card providers and their email patterns
    this.creditCardProviders = {
      'ICICI': {
        senders: ['creditcards@icicibank.com', 'statements@icicibank.com', 'no-reply@icicibank.com'],
        subjectKeywords: ['credit card statement', 'card statement', 'monthly statement'],
        passwordPatterns: [
          /password(?:\s+is)?[\s:]*([A-Z0-9]{6,})/i,
          /statement password[\s:]*([A-Z0-9]{6,})/i,
          /(?:use|enter)[\s]+password[\s:]*([A-Z0-9]{6,})/i,
          /pan[\s]*card[\s]*(?:number|no\.?)[\s]*:?[\s]*([A-Z]{5}\d{4}[A-Z])/i,
          /date[\s]*of[\s]*birth[\s]*:?[\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
          /dob[\s]*:?[\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i
        ],
        cardNumberPattern: /(?:card[\s]*(?:number|no\.?)|xxxx)[\s]*[-:]?[\s]*(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'equated monthly', 'easy pay', 'flexi pay']
      },
      'HDFC': {
        senders: ['creditcards@hdfcbank.com', 'statements@hdfcbank.com', 'alerts@hdfcbank.com'],
        subjectKeywords: ['credit card statement', 'hdfc bank statement', 'card account statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i,
          /pan[\s]*card[\s]*:?[\s]*([A-Z]{5}\d{4}[A-Z])/i,
          /date[\s]*of[\s]*birth[\s]*:?[\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i
        ],
        cardNumberPattern: /(?:card[\s]*(?:ending|no\.?)[\s]*with)[\s]*(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'easy emi', 'smart emi']
      },
      'AXIS': {
        senders: ['creditcards@axisbank.com', 'statements@axisbank.com', 'alerts@axisbank.com'],
        subjectKeywords: ['credit card statement', 'axis bank statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i,
          /pan[\s]*:?[\s]*([A-Z]{5}\d{4}[A-Z])/i
        ],
        cardNumberPattern: /(?:card[\s]*no\.?)[\s]*(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'easy pay']
      },
      'SBI': {
        senders: ['sbicard@sbicard.com', 'statements@sbicard.com', 'care@sbicard.com'],
        subjectKeywords: ['credit card statement', 'sbi card statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i,
          /pan[\s]*:?[\s]*([A-Z]{5}\d{4}[A-Z])/i,
          /date[\s]*of[\s]*birth[\s]*:?[\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i
        ],
        cardNumberPattern: /(?:card[\s]*no\.?)[\s]*(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'flexipay']
      },
      'KOTAK': {
        senders: ['creditcard@kotak.com', 'statements@kotak.com'],
        subjectKeywords: ['credit card statement', 'kotak statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i
        ],
        cardNumberPattern: /(\d{4})/i,
        emiKeywords: ['emi', 'installment']
      },
      'CITI': {
        senders: ['citibank@citi.com', 'statements@citi.com'],
        subjectKeywords: ['credit card statement', 'citibank statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i
        ],
        cardNumberPattern: /(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'easy payment plan']
      },
      'AMEX': {
        senders: ['americanexpress@aexp.com', 'statements@aexp.com'],
        subjectKeywords: ['statement available', 'amex statement'],
        passwordPatterns: [
          /password[\s:]*([A-Z0-9]{6,})/i
        ],
        cardNumberPattern: /(\d{4})/i,
        emiKeywords: ['emi', 'installment', 'membership rewards']
      }
    };
  }

  /**
   * Fetch all credit card statements from Gmail
   */
  async fetchCreditCardStatements(userId, maxResults = 50, startDate = null) {
    try {
      logger.info(`Fetching credit card statements for user: ${userId}`);
      
      // Build search query for credit card statements
      const queries = [];
      
      // Add provider-specific queries
      for (const [provider, config] of Object.entries(this.creditCardProviders)) {
        const senderQuery = config.senders.map(s => `from:${s}`).join(' OR ');
        const subjectQuery = config.subjectKeywords.map(k => `"${k}"`).join(' OR ');
        queries.push(`(${senderQuery}) (${subjectQuery})`);
      }
      
      // Generic credit card statement query
      queries.push('(subject:"credit card statement" OR subject:"card statement") has:attachment');
      
      const finalQuery = `(${queries.join(' OR ')}) has:attachment newer_than:1y`;
      
      logger.info(`Gmail query: ${finalQuery}`);
      
      // Search for emails
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: finalQuery,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      logger.info(`Found ${messages.length} credit card statement emails`);

      const statements = [];
      
      for (const message of messages) {
        try {
          const statement = await this.processCreditCardEmail(message.id, userId);
          if (statement) {
            statements.push(statement);
          }
        } catch (error) {
          logger.error(`Error processing message ${message.id}:`, error);
        }
      }

      logger.info(`Successfully processed ${statements.length} credit card statements`);
      return statements;
      
    } catch (error) {
      logger.error('Error fetching credit card statements:', error);
      throw error;
    }
  }

  /**
   * Process a single credit card email
   */
  async processCreditCardEmail(messageId, userId) {
    try {
      // Get full message details
      const messageData = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = messageData.data;
      const headers = message.payload.headers;
      
      // Extract email metadata
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
      
      logger.info(`Processing: ${subject} from ${from}`);

      // Identify credit card provider
      const provider = this.identifyProvider(from, subject);
      if (!provider) {
        logger.warn(`Could not identify provider for email from ${from}`);
        return null;
      }

      // Extract email body
      const emailBody = this.extractEmailBody(message.payload);
      
      // Extract password from email body
      const password = this.extractPassword(emailBody, provider);
      
      // Extract card number
      const cardNumber = this.extractCardNumber(emailBody, subject, provider);

      // Process attachments
      const attachments = await this.processAttachments(
        message.payload,
        messageId,
        userId,
        provider,
        password,
        cardNumber,
        date
      );

      if (attachments.length === 0) {
        logger.warn(`No valid attachments found in email ${messageId}`);
        return null;
      }

      return {
        messageId,
        provider,
        subject,
        from,
        date: new Date(date),
        password,
        cardNumber,
        attachments,
        emailBody: emailBody.substring(0, 500) // Store snippet for debugging
      };
      
    } catch (error) {
      logger.error(`Error processing email ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Identify credit card provider from email
   */
  identifyProvider(from, subject) {
    from = from.toLowerCase();
    subject = subject.toLowerCase();
    
    for (const [provider, config] of Object.entries(this.creditCardProviders)) {
      // Check sender email
      if (config.senders.some(sender => from.includes(sender.toLowerCase()))) {
        return provider;
      }
      
      // Check subject keywords
      if (provider.toLowerCase() !== 'other' && 
          (from.includes(provider.toLowerCase()) || subject.includes(provider.toLowerCase()))) {
        return provider;
      }
    }
    
    return null;
  }

  /**
   * Extract email body text
   */
  extractEmailBody(payload) {
    let body = '';
    
    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body && part.body.data && !body) {
          // Fallback to HTML if no plain text
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          body += html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        }
        
        // Recursively check nested parts
        if (part.parts) {
          body += this.extractEmailBody(part);
        }
      }
    }
    
    return body;
  }

  /**
   * Extract password from email body using provider-specific patterns
   */
  extractPassword(emailBody, provider) {
    const config = this.creditCardProviders[provider];
    if (!config || !config.passwordPatterns) {
      return null;
    }

    logger.info(`Attempting to extract password for ${provider}...`);

    for (const pattern of config.passwordPatterns) {
      const match = emailBody.match(pattern);
      if (match && match[1]) {
        const password = match[1].trim();
        logger.info(`✅ Password extracted: ${password.substring(0, 2)}****`);
        return password;
      }
    }

    logger.warn(`⚠️ Could not extract password from email for ${provider}`);
    return null;
  }

  /**
   * Extract card number (last 4 digits)
   */
  extractCardNumber(emailBody, subject, provider) {
    const config = this.creditCardProviders[provider];
    const pattern = config?.cardNumberPattern;

    if (!pattern) {
      return null;
    }

    // Try email body first
    let match = emailBody.match(pattern);
    if (!match) {
      // Try subject line
      match = subject.match(pattern);
    }

    if (match && match[1]) {
      const cardNumber = match[1].trim();
      logger.info(`Card number extracted: XXXX-XXXX-XXXX-${cardNumber}`);
      return cardNumber;
    }

    return null;
  }

  /**
   * Process email attachments
   */
  async processAttachments(payload, messageId, userId, provider, password, cardNumber, emailDate) {
    const attachments = [];
    
    if (!payload.parts) {
      return attachments;
    }

    for (const part of payload.parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        const filename = part.filename;
        const ext = path.extname(filename).toLowerCase();
        
        // Only process PDF files (credit card statements are typically PDFs)
        if (ext === '.pdf') {
          try {
            const attachment = await this.downloadAttachment(
              messageId,
              part.body.attachmentId,
              filename,
              userId,
              provider,
              password,
              cardNumber,
              emailDate
            );
            
            if (attachment) {
              attachments.push(attachment);
            }
          } catch (error) {
            logger.error(`Error downloading attachment ${filename}:`, error);
          }
        }
      }
      
      // Check nested parts
      if (part.parts) {
        const nestedAttachments = await this.processAttachments(
          { parts: part.parts },
          messageId,
          userId,
          provider,
          password,
          cardNumber,
          emailDate
        );
        attachments.push(...nestedAttachments);
      }
    }
    
    return attachments;
  }

  /**
   * Download attachment and save to disk
   */
  async downloadAttachment(messageId, attachmentId, filename, userId, provider, password, cardNumber, emailDate) {
    try {
      logger.info(`Downloading attachment: ${filename}`);

      // Get attachment data
      const attachment = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      // Decode base64 data
      const data = Buffer.from(attachment.data.data, 'base64');

      // Create upload directory
      const uploadDir = path.join(__dirname, '..', 'uploads', 'credit-cards', userId.toString());
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-z0-9._-]/gi, '_');
      const filepath = path.join(uploadDir, `${timestamp}_${sanitizedFilename}`);

      // Save file
      await fs.writeFile(filepath, data);
      
      const fileSize = data.length;
      logger.info(`✅ Saved attachment: ${filepath} (${fileSize} bytes)`);

      // Create document record
      const document = new Document({
        userId,
        originalFileName: filename,
        storedFileName: `${timestamp}_${sanitizedFilename}`,
        filePath: filepath,
        fileSize,
        mimeType: 'application/pdf',
        source: 'gmail',
        sourceMessageId: messageId,
        sourceProvider: provider,
        documentType: 'credit_card_statement',
        processingStatus: 'pending',
        metadata: {
          emailDate,
          cardProvider: provider,
          cardLastFourDigits: cardNumber,
          extractedPassword: password ? '******' : null, // Don't store actual password
          hasPassword: !!password
        }
      });

      await document.save();
      logger.info(`Document record created: ${document._id}`);

      return {
        documentId: document._id,
        filename,
        filepath,
        fileSize,
        password,
        cardNumber,
        provider
      };
      
    } catch (error) {
      logger.error(`Error downloading attachment ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Check if email contains EMI information
   */
  hasEMIInformation(emailBody, subject, provider) {
    const config = this.creditCardProviders[provider];
    if (!config || !config.emiKeywords) {
      return false;
    }

    const combinedText = `${emailBody} ${subject}`.toLowerCase();
    return config.emiKeywords.some(keyword => combinedText.includes(keyword));
  }

  /**
   * Get statistics about credit card statements
   */
  async getStatistics(userId) {
    try {
      const documents = await Document.find({
        userId,
        documentType: 'credit_card_statement'
      });

      const byProvider = {};
      let totalStatements = 0;
      let processedStatements = 0;
      let pendingStatements = 0;

      for (const doc of documents) {
        totalStatements++;
        const provider = doc.metadata?.cardProvider || 'UNKNOWN';
        
        byProvider[provider] = (byProvider[provider] || 0) + 1;
        
        if (doc.processingStatus === 'completed') {
          processedStatements++;
        } else {
          pendingStatements++;
        }
      }

      return {
        totalStatements,
        processedStatements,
        pendingStatements,
        byProvider,
        lastSync: documents.length > 0 ? documents[0].createdAt : null
      };
      
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw error;
    }
  }
}

module.exports = CreditCardStatementService;
