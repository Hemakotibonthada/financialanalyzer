const fs = require('fs').promises;
const fsSync = require('fs');
const pdfParse = require('pdf-parse');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const path = require('path');
const sharp = require('sharp');
const mammoth = require('mammoth');
const { PDFDocument } = require('pdf-lib');
// node-qpdf2 is ESM-only — use dynamic import() instead of require()
let _qpdf = null;
async function getQpdf() {
  if (!_qpdf) { _qpdf = await import('node-qpdf2'); }
  return _qpdf.default || _qpdf;
}
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
    
    // If password provided, decrypt the PDF first using qpdf
    if (password) {
      try {
        logger.info(`Attempting to decrypt PDF with password using qpdf...`);
        
        // Create temporary output path
        const tempDir = path.join(path.dirname(filePath), 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        const decryptedPath = path.join(tempDir, `decrypted_${Date.now()}.pdf`);
        
        try {
          // Use qpdf to decrypt the PDF
          // node-qpdf2 syntax: decrypt(input, password, output)
          const qpdf = await getQpdf();
          await qpdf.decrypt(filePath, password, decryptedPath);
          
          logger.info(`✅ PDF decrypted successfully with qpdf`);
          
          // Parse the decrypted PDF
          const decryptedBuffer = await fs.readFile(decryptedPath);
          const data = await pdfParse(decryptedBuffer);
          
          // Clean up temp file
          try {
            await fs.unlink(decryptedPath);
          } catch (cleanupError) {
            logger.warn('Could not delete temp file:', cleanupError.message);
          }
          
          logger.info(`✅ Extracted ${data.text.length} characters from decrypted PDF`);
          return {
            text: data.text,
            pages: data.numpages,
            info: data.info,
            passwordUsed: password
          };
        } catch (qpdfError) {
          logger.error('QPDF decryption error:');
          logger.error('  Error type:', typeof qpdfError);
          logger.error('  Error value:', qpdfError);
          logger.error('  Error message:', qpdfError.message || qpdfError || 'No error message');
          logger.error('  Error stack:', qpdfError.stack || 'No stack trace');
          logger.error('  Password tried:', password ? password.substring(0, 4) + '***' : 'None');
          
          // Check if qpdf is installed
          const errorStr = String(qpdfError);
          if (!qpdfError || errorStr.includes('ENOENT') || errorStr.includes('spawn')) {
            logger.error('⚠️ QPDF binary not found or cannot be executed!');
            logger.error('Please verify QPDF installation and PATH configuration');
          }
          
          logger.info(`QPDF stderr output: ${errorStr}`);
          
          // Fallback to pdf-lib if qpdf fails
          logger.info('Trying fallback method with pdf-lib...');
          try {
            const pdfDoc = await PDFDocument.load(dataBuffer, { 
              password: password,
              ignoreEncryption: false,
              updateMetadata: false
            });
            const pdfBytes = await pdfDoc.save();
            const data = await pdfParse(Buffer.from(pdfBytes));
            logger.info(`✅ PDF decrypted with pdf-lib fallback, extracted ${data.text.length} characters`);
            return {
              text: data.text,
              pages: data.numpages,
              info: data.info,
              passwordUsed: password
            };
          } catch (pdfLibError) {
            logger.error('PDF-lib fallback error:');
            logger.error('  Error message:', pdfLibError.message || 'No error message');
            logger.error('  Error code:', pdfLibError.code || 'No error code');
            logger.error('  Password tried:', password ? password.substring(0, 4) + '***' : 'None');
            
            // If both fail, the PDF might use unsupported encryption
            throw new Error(`Could not decrypt PDF. QPDF not installed and pdf-lib failed. Please install QPDF or check if the PDF uses supported encryption.`);
          }
        }
      } catch (passwordError) {
        logger.error('PDF password error:', passwordError.message);
        throw new Error('Invalid password for PDF file or unsupported encryption');
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
      if (parseError.message.includes('password') || 
          parseError.message.includes('encrypted') ||
          parseError.message.includes('Encrypted')) {
        throw new Error('PDF_PASSWORD_REQUIRED');
      }
      throw parseError;
    }
  } catch (error) {
    logger.error('PDF parse error:', error);
    if (error.message === 'PDF_PASSWORD_REQUIRED') {
      throw error;
    }
    throw new Error(`Failed to parse PDF file: ${error.message}`);
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
  
  logger.info(`Generating password combinations...`);
  logger.info(`Password hints: ${JSON.stringify(passwordHints)}`);
  logger.info(`User profile: ${userProfile ? userProfile.fullName : 'Not available'}`);
  
  // Direct password hints from email or upload (HIGHEST PRIORITY)
  passwordHints.forEach(hint => {
    if (hint.hint && hint.hint.length >= 4) {
      passwords.push(hint.hint);
      passwords.push(hint.hint.toUpperCase());
      passwords.push(hint.hint.toLowerCase());
      logger.info(`Added password hint: ${hint.hint.substring(0, 4)}***`);
    }
  });
  
  if (userProfile) {
    const dob = userProfile.dateOfBirth;
    const pan = userProfile.panNumber;
    const name = userProfile.fullName;
    
    // ICICI Bank Pattern: First 4 letters of first name + DDMM from DOB
    if (name && dob) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const dobDate = new Date(dob);
      const ddmm = dobDate.getDate().toString().padStart(2, '0') + 
                   (dobDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Generate ICICI pattern variations
      const first4Upper = firstName.substring(0, 4).toUpperCase();
      const first4Lower = firstName.substring(0, 4).toLowerCase();
      const first4Title = firstName.substring(0, 1).toUpperCase() + firstName.substring(1, 4).toLowerCase();
      
      // Add all variations of ICICI pattern at the beginning
      passwords.unshift(first4Upper + ddmm);  // BONT0906
      passwords.unshift(first4Title + ddmm);  // Bont0906
      passwords.unshift(first4Lower + ddmm);  // bont0906
    }
    
    // Date of birth combinations
    if (dob) {
      const dobDate = new Date(dob);
      const dd = dobDate.getDate().toString().padStart(2, '0');
      const mm = (dobDate.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = dobDate.getFullYear().toString();
      const yy = yyyy.substring(2);
      
      passwords.push(dd + mm + yyyy);  // DDMMYYYY
      passwords.push(yyyy + mm + dd);  // YYYYMMDD
      passwords.push(dd + mm + yy);    // DDMMYY
      passwords.push(mm + dd + yyyy);  // MMDDYYYY
      passwords.push(yyyy);            // YYYY only
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
  const uniquePasswords = [...new Set(passwords)].filter(p => p && p.length >= 4);
  logger.info(`Generated ${uniquePasswords.length} unique password combinations`);
  if (uniquePasswords.length > 0) {
    logger.info(`First 5 passwords: ${uniquePasswords.slice(0, 5).map(p => p.substring(0, 4) + '***').join(', ')}`);
  }
  return uniquePasswords;
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
  const lines = text.split('\n');
  
  // Detect ICICI bank statement format
  const isICICIFormat = lines.some(line => 
    /DATE\s+MODE\*?\*?\s+PARTICULARS\s+DEPOSITS?\s+WITHDRAWALS?\s+BALANCE/i.test(line) ||
    /\d{2}-\d{2}-\d{4}\s+.+\s+\d+[,\d]*\.\d{2}\s+\d+[,\d]*\.\d{2}/i.test(line)
  );

  if (isICICIFormat) {
    logger.info('Detected ICICI bank statement format');
    const result = extractICICIBankTransactions(text);
    return {
      transactions: result.transactions,
      statementPeriod: result.statementPeriod
    };
  }
  
  // Detect HDFC bank statement format
  const isHDFCFormat = lines.some(line => 
    /Statement From\s*:\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+TO\s*:\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line) ||
    (/Date\s+Narration/i.test(line) && /Chq.*Ref.*No/i.test(line) && /Value Date/i.test(line)) ||
    (/Withdrawal Amount/i.test(line) && /Deposit Amount/i.test(line) && /Closing Balance/i.test(line))
  );

  if (isHDFCFormat) {
    logger.info('Detected HDFC bank statement format');
    const result = extractHDFCBankTransactions(text);
    return {
      transactions: result.transactions,
      statementPeriod: result.statementPeriod
    };
  }
  
  const transactions = [];
  
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
  
  return { transactions, statementPeriod: null };
};

/**
 * Extract transactions from ICICI bank statement format
 * Format: DATE MODE** PARTICULARS DEPOSITS WITHDRAWALS BALANCE
 */
const extractICICIBankTransactions = (text) => {
  const transactions = [];
  const lines = text.split('\n');
  
  logger.info(`\n${'='.repeat(70)}`);
  logger.info(`📄 STARTING ICICI BANK STATEMENT PROCESSING`);
  logger.info(`${'='.repeat(70)}`);
  logger.info(`Total lines in document: ${lines.length}`);
  
  // Extract statement period from header
  let statementPeriod = null;
  
  // Try multiple patterns for statement period
  const patterns = [
    // Pattern 1: "13Oct2024 TO 12Oct2025"
    {
      regex: /(\d{1,2}[A-Za-z]{3}\d{4})\s+(?:TO|to|-)\s+(\d{1,2}[A-Za-z]{3}\d{4})/,
      parser: (dateStr) => {
        const match = dateStr.match(/(\d{1,2})([A-Za-z]{3})(\d{4})/);
        if (match) {
          const day = match[1].padStart(2, '0');
          const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const month = monthMap[match[2]];
          const year = match[3];
          return new Date(`${year}-${month}-${day}`);
        }
        return null;
      }
    },
    // Pattern 2: "13/10/24 TO 12/10/25" (DD/MM/YY format)
    {
      regex: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:TO|to|To|-)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      parser: (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          // Handle 2-digit year
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            year = currentCentury + parseInt(year);
            // If year is more than 10 years in future, assume previous century
            if (year - currentYear > 10) {
              year -= 100;
            }
          }
          return new Date(`${year}-${month}-${day}`);
        }
        return null;
      }
    },
    // Pattern 3: "October 13, 2024 - October 13, 2025" (Full text format)
    {
      regex: /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/,
      parser: (dateStr, match) => {
        // For this pattern, we'll parse from the full match
        return null; // Will be handled specially below
      }
    }
  ];
  
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    for (const pattern of patterns) {
      const periodMatch = lines[i].match(pattern.regex);
      if (periodMatch) {
        let startDate, endDate;
        
        if (pattern.regex.source.includes('January|February')) {
          // Full month name format
          const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          const startMonth = monthMap[periodMatch[1]];
          const startDay = periodMatch[2].padStart(2, '0');
          const startYear = periodMatch[3];
          startDate = new Date(`${startYear}-${startMonth}-${startDay}`);
          
          const endMonth = monthMap[periodMatch[4]];
          const endDay = periodMatch[5].padStart(2, '0');
          const endYear = periodMatch[6];
          endDate = new Date(`${endYear}-${endMonth}-${endDay}`);
        } else {
          startDate = pattern.parser(periodMatch[1]);
          endDate = pattern.parser(periodMatch[2]);
        }
        
        if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
          statementPeriod = { startDate, endDate };
          logger.info(`📅 Statement Period Found: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
          logger.info(`   Pattern matched: "${lines[i].trim()}"`);
          break;
        }
      }
    }
    if (statementPeriod) break;
  }
  
  // Statistics tracking
  const stats = {
    totalLines: lines.length,
    emptyLines: 0,
    headerLines: 0,
    depositTransactions: 0,
    withdrawalTransactions: 0,
    balanceForwardMatches: 0,
    skippedPotentialTransactions: 0,
    validTransactionsExtracted: 0,
    invalidDates: 0,
    processingErrors: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    statementPeriod: statementPeriod
  };
  
  /**
   * ICICI Statement Format:
   * DATE | MODE | PARTICULARS | DEPOSITS | WITHDRAWALS | BALANCE
   * 
   * Pattern variations:
   * 1. DATE MODE DESCRIPTION DEPOSIT_AMOUNT BALANCE (withdrawal column empty)
   * 2. DATE MODE DESCRIPTION WITHDRAWAL_AMOUNT BALANCE (deposit column empty)
   * 3. DATE MODE DESCRIPTION DEPOSIT_AMOUNT WITHDRAWAL_AMOUNT BALANCE (rare, both columns)
   * 
   * Key: Look at the statement to determine column positions
   * - If amount appears before balance and increases balance → DEPOSIT
   * - If amount appears before balance and decreases balance → WITHDRAWAL
   */
  
  // Pattern 1: Transaction with 3 amounts (Date, Description, Amt1, Amt2, Amt3)
  // This captures: DATE DESCRIPTION DEPOSITS WITHDRAWALS BALANCE
  const threeAmountPattern = /^(\d{2}-\d{2}-\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
  
  // Pattern 2: Transaction with 2 amounts (Date, Description, Amt1, Amt2)
  // This could be: DATE DESCRIPTION DEPOSIT BALANCE or DATE DESCRIPTION WITHDRAWAL BALANCE
  const twoAmountPattern = /^(\d{2}-\d{2}-\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
  
  // Pattern 3: Transaction with 1 amount (just balance, rare)
  const oneAmountPattern = /^(\d{2}-\d{2}-\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s*$/;
  
  // Pattern 4: Balance brought forward
  const balanceForwardPattern = /^(\d{2}-\d{2}-\d{4})\s+B\/F\s+([\d,]+\.\d{2})\s*$/;
  
  let currentBalance = null;
  const skippedLinesSample = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track empty lines
    if (!line || line.length < 10) {
      stats.emptyLines++;
      continue;
    }
    
    // Skip headers, footers, page numbers
    if (/^DATE\s+|^MODE\s+|^PARTICULARS\s+|^DEPOSITS\s+|^WITHDRAWALS\s+|^BALANCE\s+/i.test(line) ||
        /^Page\s+\d+|^Statement\s+|^Account\s+/i.test(line) ||
        /^Opening\s+Balance|^Closing\s+Balance/i.test(line) ||
        /^TOTAL\s+|^Sub\s+Total/i.test(line)) {
      stats.headerLines++;
      continue;
    }
    
    try {
      // Check for balance brought forward
      const bfMatch = line.match(balanceForwardPattern);
      if (bfMatch) {
        currentBalance = parseFloat(bfMatch[2].replace(/,/g, ''));
        stats.balanceForwardMatches++;
        logger.info(`✓ Balance brought forward: ₹${currentBalance.toLocaleString('en-IN')}`);
        continue;
      }
      
      // Try three-amount pattern first (DATE DESC DEPOSIT WITHDRAWAL BALANCE)
      let match3 = line.match(threeAmountPattern);
      if (match3) {
        const [, dateStr, description, amt1, amt2, amt3] = match3;
        
        // Parse amounts
        const amount1 = parseFloat(amt1.replace(/,/g, ''));
        const amount2 = parseFloat(amt2.replace(/,/g, ''));
        const balance = parseFloat(amt3.replace(/,/g, ''));
        
        // Determine which is deposit and which is withdrawal
        // Usually: amt1 = deposit, amt2 = withdrawal, amt3 = balance
        // But we need to verify with balance calculation
        
        let depositAmt = 0;
        let withdrawalAmt = 0;
        
        if (currentBalance !== null) {
          // Check if amt1 is deposit (balance increases)
          if (Math.abs((currentBalance + amount1 - amount2) - balance) < 0.01) {
            depositAmt = amount1;
            withdrawalAmt = amount2;
          } else if (Math.abs((currentBalance + amount2 - amount1) - balance) < 0.01) {
            depositAmt = amount2;
            withdrawalAmt = amount1;
          } else {
            // Can't determine precisely, use heuristic
            depositAmt = amount1;
            withdrawalAmt = amount2;
          }
        } else {
          // No previous balance, assume standard format
          depositAmt = amount1;
          withdrawalAmt = amount2;
        }
        
        // Parse date with enhanced validation
        const [day, month, year] = dateStr.split('-');
        const transactionDate = new Date(`${year}-${month}-${day}`);
        
        if (isNaN(transactionDate.getTime())) {
          logger.warn(`Invalid date: ${dateStr}`);
          stats.invalidDates++;
          continue;
        }
        
        // Validate date is within reasonable range
        const now = new Date();
        const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
        const oneYearAhead = new Date(now.getFullYear() + 1, 11, 31);
        
        if (transactionDate < threeYearsAgo || transactionDate > oneYearAhead) {
          logger.warn(`Date ${dateStr} outside reasonable range (3 years ago to 1 year ahead)`);
          stats.invalidDates++;
          continue;
        }
        
        // If statement period is known, validate transaction date is within it (with 1 day tolerance)
        if (stats.statementPeriod) {
          const { startDate, endDate } = stats.statementPeriod;
          const oneDayBefore = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          const oneDayAfter = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
          if (transactionDate < oneDayBefore || transactionDate > oneDayAfter) {
            logger.warn(`Date ${dateStr} outside statement period (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()})`);
            stats.invalidDates++;
            continue;
          }
        }
        
        // Create transactions for both if amounts > 0
        if (depositAmt > 0) {
          const transactionDetails = extractTransactionDetails(description);
          transactions.push({
            date: transactionDate,
            description: transactionDetails.cleanDescription,
            amount: depositAmt,
            type: 'credit',
            balance: balance,
            paymentMethod: transactionDetails.mode,
            referenceNumber: transactionDetails.referenceNumber,
            upi: transactionDetails.upiInfo,
            rawLine: line,
            source: 'bank_statement'
          });
          stats.depositTransactions++;
          stats.totalDeposits += depositAmt;
        }
        
        if (withdrawalAmt > 0) {
          const transactionDetails = extractTransactionDetails(description);
          transactions.push({
            date: transactionDate,
            description: transactionDetails.cleanDescription,
            amount: withdrawalAmt,
            type: 'debit',
            balance: balance,
            paymentMethod: transactionDetails.mode,
            referenceNumber: transactionDetails.referenceNumber,
            upi: transactionDetails.upiInfo,
            rawLine: line,
            source: 'bank_statement'
          });
          stats.withdrawalTransactions++;
          stats.totalWithdrawals += withdrawalAmt;
        }
        
        currentBalance = balance;
        stats.validTransactionsExtracted++;
        
        if (stats.validTransactionsExtracted % 50 === 0) {
          logger.info(`  ⏳ Progress: ${stats.validTransactionsExtracted} transaction lines processed...`);
        }
        continue;
      }
      
      // Try two-amount pattern (DATE DESC AMOUNT BALANCE)
      let match2 = line.match(twoAmountPattern);
      if (match2) {
        const [, dateStr, description, amt1, amt2] = match2;
        
        const amount = parseFloat(amt1.replace(/,/g, ''));
        const balance = parseFloat(amt2.replace(/,/g, ''));
        
        // Determine if deposit or withdrawal based on balance change
        let type = 'debit';
        
        if (currentBalance !== null) {
          // If balance increased, it's a deposit
          if (balance > currentBalance) {
            type = 'credit';
            // Verify: currentBalance + amount = balance
            if (Math.abs((currentBalance + amount) - balance) < 0.01) {
              type = 'credit';
            }
          } else {
            type = 'debit';
            // Verify: currentBalance - amount = balance
            if (Math.abs((currentBalance - amount) - balance) < 0.01) {
              type = 'debit';
            }
          }
        } else {
          // No previous balance, assume based on description keywords
          const desc = description.toLowerCase();
          if (desc.includes('deposit') || desc.includes('credit') || desc.includes('received')) {
            type = 'credit';
          } else if (desc.includes('withdrawal') || desc.includes('debit') || desc.includes('paid') || desc.includes('transfer')) {
            type = 'debit';
          } else {
            // Default: check if balance went up or down (need to guess)
            type = 'debit'; // Conservative default
          }
        }
        
        // Parse date with enhanced validation
        const [day, month, year] = dateStr.split('-');
        const transactionDate = new Date(`${year}-${month}-${day}`);
        
        if (isNaN(transactionDate.getTime())) {
          logger.warn(`Invalid date: ${dateStr}`);
          stats.invalidDates++;
          continue;
        }
        
        // Validate date is within reasonable range
        const now = new Date();
        const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
        const oneYearAhead = new Date(now.getFullYear() + 1, 11, 31);
        
        if (transactionDate < threeYearsAgo || transactionDate > oneYearAhead) {
          logger.warn(`Date ${dateStr} outside reasonable range (${dateStr})`);
          stats.invalidDates++;
          continue;
        }
        
        // If statement period is known, validate transaction date is within it (with 1 day tolerance)
        if (stats.statementPeriod) {
          const { startDate, endDate } = stats.statementPeriod;
          const oneDayBefore = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          const oneDayAfter = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
          if (transactionDate < oneDayBefore || transactionDate > oneDayAfter) {
            logger.warn(`Date ${dateStr} outside statement period (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()})`);
            stats.invalidDates++;
            continue;
          }
        }
        
        const transactionDetails = extractTransactionDetails(description);
        
        transactions.push({
          date: transactionDate,
          description: transactionDetails.cleanDescription,
          amount: amount,
          type: type,
          balance: balance,
          paymentMethod: transactionDetails.mode,
          referenceNumber: transactionDetails.referenceNumber,
          upi: transactionDetails.upiInfo,
          rawLine: line,
          source: 'bank_statement'
        });
        
        if (type === 'credit') {
          stats.depositTransactions++;
          stats.totalDeposits += amount;
        } else {
          stats.withdrawalTransactions++;
          stats.totalWithdrawals += amount;
        }
        
        currentBalance = balance;
        stats.validTransactionsExtracted++;
        
        if (stats.validTransactionsExtracted % 50 === 0) {
          logger.info(`  ⏳ Progress: ${stats.validTransactionsExtracted} transaction lines processed...`);
        }
        continue;
      }
      
      // Try one-amount pattern (rare, just balance)
      let match1 = line.match(oneAmountPattern);
      if (match1 && currentBalance !== null) {
        const [, dateStr, description, balance] = match1;
        const balanceNum = parseFloat(balance.replace(/,/g, ''));
        
        // Calculate transaction from balance difference
        const diff = balanceNum - currentBalance;
        const amount = Math.abs(diff);
        const type = diff > 0 ? 'credit' : 'debit';
        
        if (amount > 0.01) {
          const [day, month, year] = dateStr.split('-');
          const transactionDate = new Date(`${year}-${month}-${day}`);
          
          if (!isNaN(transactionDate.getTime())) {
            const transactionDetails = extractTransactionDetails(description);
            
            transactions.push({
              date: transactionDate,
              description: transactionDetails.cleanDescription,
              amount: amount,
              type: type,
              balance: balanceNum,
              paymentMethod: transactionDetails.mode,
              referenceNumber: transactionDetails.referenceNumber,
              upi: transactionDetails.upiInfo,
              rawLine: line,
              source: 'bank_statement'
            });
            
            if (type === 'credit') {
              stats.depositTransactions++;
              stats.totalDeposits += amount;
            } else {
              stats.withdrawalTransactions++;
              stats.totalWithdrawals += amount;
            }
            
            currentBalance = balanceNum;
            stats.validTransactionsExtracted++;
            
            if (stats.validTransactionsExtracted % 50 === 0) {
              logger.info(`  ⏳ Progress: ${stats.validTransactionsExtracted} transaction lines processed...`);
            }
          }
        } else {
          currentBalance = balanceNum;
        }
        continue;
      }
      
      // If line contains date and numbers but didn't match, log for debugging
      if (/^\d{2}-\d{2}-\d{4}/.test(line) && /\d+\.\d{2}/.test(line)) {
        stats.skippedPotentialTransactions++;
        if (skippedLinesSample.length < 10) {
          skippedLinesSample.push(line.substring(0, 100));
        }
      }
    } catch (error) {
      stats.processingErrors++;
      logger.error(`Error processing line ${i}: ${error.message}`);
      logger.debug(`Problematic line: ${line.substring(0, 100)}`);
    }
  }
  
  // Comprehensive logging summary
  logger.info(`\n${'='.repeat(70)}`);
  logger.info(`📊 ICICI BANK STATEMENT PROCESSING COMPLETE`);
  logger.info(`${'='.repeat(70)}`);
  logger.info(`✅ Successfully extracted: ${transactions.length} transactions`);
  logger.info(`\n📈 DETAILED STATISTICS:`);
  logger.info(`  Total lines processed: ${stats.totalLines}`);
  logger.info(`  Empty/short lines: ${stats.emptyLines}`);
  logger.info(`  Header/footer lines: ${stats.headerLines}`);
  logger.info(`  Balance forward entries: ${stats.balanceForwardMatches}`);
  logger.info(`  Transaction lines processed: ${stats.validTransactionsExtracted}`);
  logger.info(`  Deposit transactions: ${stats.depositTransactions}`);
  logger.info(`  Withdrawal transactions: ${stats.withdrawalTransactions}`);
  logger.info(`  Invalid dates encountered: ${stats.invalidDates}`);
  logger.info(`  Skipped potential transactions: ${stats.skippedPotentialTransactions}`);
  logger.info(`  Processing errors: ${stats.processingErrors}`);
  
  if (skippedLinesSample.length > 0) {
    logger.warn(`\n⚠️  SAMPLE OF SKIPPED LINES (first 10):`);
    skippedLinesSample.forEach((line, idx) => {
      logger.warn(`  ${idx + 1}. ${line}`);
    });
  }
  
  // Calculate transaction summary - properly separated
  const depositTransactions = transactions.filter(t => t.type === 'credit');
  const withdrawalTransactions = transactions.filter(t => t.type === 'debit');
  const totalDeposits = depositTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = withdrawalTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netFlow = totalDeposits - totalWithdrawals;
  
  logger.info(`\n💰 FINANCIAL SUMMARY:`);
  logger.info(`  📥 DEPOSITS (Credits):`);
  logger.info(`     Count: ${depositTransactions.length}`);
  logger.info(`     Total: ₹${totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  logger.info(`  📤 WITHDRAWALS (Debits):`);
  logger.info(`     Count: ${withdrawalTransactions.length}`);
  logger.info(`     Total: ₹${totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  logger.info(`  💵 NET FLOW: ₹${netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  logger.info(`  📊 TOTAL VOLUME: ₹${(totalDeposits + totalWithdrawals).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  
  if (currentBalance !== null) {
    logger.info(`  💼 FINAL BALANCE: ₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  
  logger.info(`${'='.repeat(70)}\n`);
  
  return {
    transactions,
    statementPeriod: stats.statementPeriod
  };
};

/**
 * Extract transactions from HDFC bank statement format
 * Format: Date | Narration | Chq./Ref No. | Value Date | Withdrawal Amount | Deposit Amount | Closing Balance
 */
const extractHDFCBankTransactions = (text) => {
  const transactions = [];
  const lines = text.split('\n');
  
  logger.info(`\n${'='.repeat(70)}`);
  logger.info(`📄 STARTING HDFC BANK STATEMENT PROCESSING`);
  logger.info(`${'='.repeat(70)}`);
  logger.info(`Total lines in document: ${lines.length}`);
  
  // Extract statement period from header (Statement From : 13/10/24 TO : 12/10/25)
  let statementPeriod = null;
  
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    const line = lines[i];
    // Match: "Statement From : 13/10/24    TO : 12/10/25"
    const periodMatch = line.match(/Statement From\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+TO\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (periodMatch) {
      const parseDate = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            year = currentCentury + parseInt(year);
            if (year - currentYear > 10) year -= 100;
          }
          return new Date(`${year}-${month}-${day}`);
        }
        return null;
      };
      
      const startDate = parseDate(periodMatch[1]);
      const endDate = parseDate(periodMatch[2]);
      if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
        statementPeriod = { startDate, endDate };
        logger.info(`📅 Statement Period Found: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
        logger.info(`   Pattern matched: "${line.trim()}"`);
        break;
      }
    }
  }
  
  // Extract total summary (Debits, Credits, etc.)
  let totalDebits = null;
  let totalCredits = null;
  let openingBalance = null;
  let closingBalance = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match Opening Balance
    if (/Opening Balance/i.test(line)) {
      const amountMatch = line.match(/([\d,]+\.\d{2})/);
      if (amountMatch) {
        openingBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
        logger.info(`💼 Opening Balance: ₹${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      }
    }
    
    // Match Closing Balance
    if (/Closing Balance/i.test(line)) {
      const amountMatch = line.match(/([\d,]+\.\d{2})/);
      if (amountMatch) {
        closingBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
        logger.info(`💼 Closing Balance: ₹${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      }
    }
    
    // Match Debits
    if (/^\s*Debits\s*$/i.test(line)) {
      // Look in next few lines for amount
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const amountMatch = lines[j].match(/^\s*([\d,]+\.\d{2})\s*$/);
        if (amountMatch) {
          totalDebits = parseFloat(amountMatch[1].replace(/,/g, ''));
          logger.info(`📤 Total Debits: ₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
          break;
        }
      }
    }
    
    // Match Credits
    if (/^\s*Credits\s*$/i.test(line)) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const amountMatch = lines[j].match(/^\s*([\d,]+\.\d{2})\s*$/);
        if (amountMatch) {
          totalCredits = parseFloat(amountMatch[1].replace(/,/g, ''));
          logger.info(`📥 Total Credits: ₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
          break;
        }
      }
    }
  }
  
  // Statistics tracking
  const stats = {
    totalLines: lines.length,
    emptyLines: 0,
    headerLines: 0,
    validTransactionsExtracted: 0,
    depositTransactions: 0,
    withdrawalTransactions: 0,
    invalidDates: 0,
    processingErrors: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    statementPeriod: statementPeriod
  };
  
  // Transaction patterns for HDFC
  // Format: Date | Narration | Ref No | Value Date | Withdrawal | Deposit | Balance
  // Example: 13/10/2024 | UPI-KOTTHA MANOJ... | 428763826830 | 13/10/2024 | 20.00 | 0.00 | 2,336.72
  
  let currentLine = '';
  let currentDate = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line || line.length < 5) {
      stats.emptyLines++;
      continue;
    }
    
    // Skip header lines
    if (/^Date\s+Narration|^Chq\.?\s*\/\s*Ref|^Value Date|^Withdrawal Amount|^Deposit Amount|^Closing Balance/i.test(line) ||
        /^STATEMENT SUMMARY|^Opening Balance|^Dr Count|^Cr Count|^Debits|^Credits|^\*\*END OF STATEMENT\*\*/i.test(line) ||
        /^Page\s+\d+|^Statement From/i.test(line)) {
      stats.headerLines++;
      continue;
    }
    
    try {
      // Check if line starts with a date (DD/MM/YYYY format)
      const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);
      
      if (dateMatch) {
        // New transaction starts
        currentDate = dateMatch[1];
        currentLine = line;
        
        // Try to extract full transaction from current and next few lines
        let fullTransaction = line;
        let lookAhead = 1;
        
        // HDFC transactions can span multiple lines
        // Keep appending until we find amounts or next date
        while (i + lookAhead < lines.length && lookAhead < 10) {
          const nextLine = lines[i + lookAhead].trim();
          if (!nextLine) break;
          
          // Check if next line starts with a date (new transaction)
          if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(nextLine)) {
            break;
          }
          
          fullTransaction += ' ' + nextLine;
          lookAhead++;
          
          // Check if we have all required fields (amounts and balance)
          const amountCount = (fullTransaction.match(/\d+[,\d]*\.\d{2}/g) || []).length;
          if (amountCount >= 3) { // Ref No, Withdrawal, Deposit, Balance (or at least amounts)
            i += lookAhead - 1;
            break;
          }
        }
        
        // Parse the full transaction line
        // Expected format has: Date Narration RefNo ValueDate Withdrawal Deposit Balance
        // Extract all numbers (amounts) - look for amounts with exactly 2 decimal places
        const amounts = fullTransaction.match(/\d+[,\d]*\.\d{2}/g);
        
        if (amounts && amounts.length >= 3) {
          // Last 3 numbers should be: Withdrawal, Deposit, Balance
          // Convert to actual numbers for validation
          const potentialAmounts = amounts.map(a => parseFloat(a.replace(/,/g, '')));
          
          // Get last 3 amounts
          const withdrawalStr = amounts[amounts.length - 3];
          const depositStr = amounts[amounts.length - 2];
          const balanceStr = amounts[amounts.length - 1];
          
          const withdrawal = parseFloat(withdrawalStr.replace(/,/g, ''));
          const deposit = parseFloat(depositStr.replace(/,/g, ''));
          const balance = parseFloat(balanceStr.replace(/,/g, ''));
          
          // Validate amounts are reasonable (not ridiculously large)
          const MAX_REASONABLE_AMOUNT = 10000000; // 1 crore max per transaction
          if (withdrawal > MAX_REASONABLE_AMOUNT || deposit > MAX_REASONABLE_AMOUNT) {
            logger.warn(`Skipping transaction with unreasonable amount: W=${withdrawal}, D=${deposit}`);
            logger.warn(`Line: ${fullTransaction.substring(0, 100)}`);
            continue;
          }
          
          // Extract date
          const [day, month, year] = currentDate.split('/');
          const transactionDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          
          if (isNaN(transactionDate.getTime())) {
            logger.warn(`Invalid date: ${currentDate}`);
            stats.invalidDates++;
            continue;
          }
          
          // Extract narration (between date and amounts)
          let narration = fullTransaction.replace(/^\d{1,2}\/\d{1,2}\/\d{4}/, '').trim();
          // Remove amounts from narration
          amounts.forEach(amt => {
            const idx = narration.lastIndexOf(amt);
            if (idx !== -1) {
              narration = narration.substring(0, idx).trim();
            }
          });
          
          // Create transaction for withdrawal
          if (withdrawal > 0) {
            transactions.push({
              date: transactionDate,
              description: narration.substring(0, 200) || 'Withdrawal',
              amount: withdrawal,
              type: 'debit',
              balance: balance,
              paymentMethod: extractPaymentMethod(narration),
              referenceNumber: extractReferenceNumber(fullTransaction),
              upi: extractUPIInfo(narration),
              rawLine: fullTransaction.substring(0, 200),
              source: 'bank_statement'
            });
            stats.withdrawalTransactions++;
            stats.totalWithdrawals += withdrawal;
          }
          
          // Create transaction for deposit
          if (deposit > 0) {
            transactions.push({
              date: transactionDate,
              description: narration.substring(0, 200) || 'Deposit',
              amount: deposit,
              type: 'credit',
              balance: balance,
              paymentMethod: extractPaymentMethod(narration),
              referenceNumber: extractReferenceNumber(fullTransaction),
              upi: extractUPIInfo(narration),
              rawLine: fullTransaction.substring(0, 200),
              source: 'bank_statement'
            });
            stats.depositTransactions++;
            stats.totalDeposits += deposit;
          }
          
          stats.validTransactionsExtracted++;
          
          if (stats.validTransactionsExtracted % 50 === 0) {
            logger.info(`  ⏳ Progress: ${stats.validTransactionsExtracted} transaction lines processed...`);
          }
        }
      }
    } catch (error) {
      stats.processingErrors++;
      logger.error(`Error processing line ${i}: ${error.message}`);
      logger.debug(`Problematic line: ${line.substring(0, 100)}`);
    }
  }
  
  // Comprehensive logging summary
  logger.info(`\n${'='.repeat(70)}`);
  logger.info(`📊 HDFC BANK STATEMENT PROCESSING COMPLETE`);
  logger.info(`${'='.repeat(70)}`);
  logger.info(`✅ Successfully extracted: ${transactions.length} transactions`);
  logger.info(`\n📈 DETAILED STATISTICS:`);
  logger.info(`  Total lines processed: ${stats.totalLines}`);
  logger.info(`  Empty/short lines: ${stats.emptyLines}`);
  logger.info(`  Header/footer lines: ${stats.headerLines}`);
  logger.info(`  Transaction lines processed: ${stats.validTransactionsExtracted}`);
  logger.info(`  Deposit transactions: ${stats.depositTransactions}`);
  logger.info(`  Withdrawal transactions: ${stats.withdrawalTransactions}`);
  logger.info(`  Invalid dates encountered: ${stats.invalidDates}`);
  logger.info(`  Processing errors: ${stats.processingErrors}`);
  
  logger.info(`\n💰 FINANCIAL SUMMARY:`);
  logger.info(`  📥 DEPOSITS (Credits):`);
  logger.info(`     Count: ${stats.depositTransactions}`);
  logger.info(`     Total: ₹${stats.totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  if (totalCredits) {
    logger.info(`     Statement Total: ₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  logger.info(`  📤 WITHDRAWALS (Debits):`);
  logger.info(`     Count: ${stats.withdrawalTransactions}`);
  logger.info(`     Total: ₹${stats.totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  if (totalDebits) {
    logger.info(`     Statement Total: ₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  
  if (openingBalance !== null) {
    logger.info(`  💼 Opening Balance: ₹${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  if (closingBalance !== null) {
    logger.info(`  💼 Closing Balance: ₹${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  
  logger.info(`${'='.repeat(70)}\n`);
  
  return {
    transactions,
    statementPeriod: stats.statementPeriod
  };
};

// Helper functions for HDFC parsing
const extractPaymentMethod = (narration) => {
  const upperNarration = narration.toUpperCase();
  if (upperNarration.includes('UPI')) return 'UPI';
  if (upperNarration.includes('NEFT')) return 'NEFT';
  if (upperNarration.includes('RTGS')) return 'RTGS';
  if (upperNarration.includes('IMPS')) return 'IMPS';
  if (upperNarration.includes('ATM')) return 'ATM';
  if (upperNarration.includes('MOBILE BANKING')) return 'Mobile Banking';
  if (upperNarration.includes('INTERNET BANKING')) return 'Internet Banking';
  if (upperNarration.includes('CASH')) return 'Cash';
  if (upperNarration.includes('CHEQUE')) return 'Cheque';
  return 'Other';
};

const extractReferenceNumber = (text) => {
  // Extract reference numbers from patterns like: 428763826830, 465408357405
  const refMatch = text.match(/\b\d{12,}\b/);
  return refMatch ? refMatch[0] : null;
};

const extractUPIInfo = (narration) => {
  // Extract UPI ID from patterns like: PAYTMQR5543JU@PAYTM, HEMAKOTIBONTHADA@IBL
  const upiMatch = narration.match(/([A-Z0-9]+@[A-Z]+)/i);
  if (upiMatch) {
    return {
      id: upiMatch[0],
      provider: upiMatch[0].split('@')[1]
    };
  }
  return null;
};

/**
 * Helper function to extract transaction details from description
 */
const extractTransactionDetails = (description) => {
  const cleanDesc = description.trim();
  
  // Determine payment mode
  let mode = 'unknown';
  if (cleanDesc.includes('ICICI CRM CAM') || cleanDesc.includes('CASH DEP')) {
    mode = 'cash_deposit';
  } else if (cleanDesc.includes('MOBILE BANKING') || cleanDesc.includes('IMPS') || cleanDesc.includes('MMT')) {
    mode = 'mobile_banking_-_imps';
  } else if (cleanDesc.includes('UPI')) {
    mode = 'upi';
  } else if (cleanDesc.includes('NEFT')) {
    mode = 'neft';
  } else if (cleanDesc.includes('RTGS')) {
    mode = 'rtgs';
  } else if (cleanDesc.includes('ATM')) {
    mode = 'atm';
  } else if (cleanDesc.includes('POS') || cleanDesc.includes('POINT OF SALE')) {
    mode = 'pos';
  } else if (cleanDesc.includes('CHEQUE') || cleanDesc.includes('CHQ')) {
    mode = 'cheque';
  } else if (cleanDesc.includes('ONLINE')) {
    mode = 'online';
  }
  
  // Extract reference number (sequence of 10+ digits)
  let referenceNumber = null;
  const refMatch = cleanDesc.match(/\d{10,}/);
  if (refMatch) {
    referenceNumber = refMatch[0];
  }
  
  // Extract UPI/IMPS details
  let upiInfo = null;
  const impsMatch = cleanDesc.match(/MMT\/IMPS\/(\d+)\/(.*?)\/(.*?)(?:\s|$)/);
  if (impsMatch) {
    upiInfo = {
      transactionId: impsMatch[1],
      beneficiaryName: impsMatch[2],
      bankCode: impsMatch[3]
    };
  }
  
  return {
    cleanDescription: cleanDesc,
    mode: mode,
    referenceNumber: referenceNumber,
    upiInfo: upiInfo
  };
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
    
    // Log password information for debugging
    logger.info(`Processing document ${document.originalFileName}`);
    logger.info(`Password provided: ${password ? 'YES' : 'NO'}`);
    logger.info(`Password hints available: ${document.passwordHints ? document.passwordHints.length : 0}`);
    if (document.passwordHints && document.passwordHints.length > 0) {
      logger.info(`Password hints: ${JSON.stringify(document.passwordHints)}`);
    }
    if (userProfile) {
      logger.info(`User profile found: ${userProfile.fullName}, DOB: ${userProfile.dateOfBirth}`);
    }
    
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
  
  logger.info(`Processing file type: ${fileExtension}`);
  logger.info(`Password provided: ${password ? 'YES' : 'NO'}`);
  logger.info(`Password hints count: ${passwordHints ? passwordHints.length : 0}`);
  
  try {
    if (fileExtension === '.pdf') {
      let pdfData;
      
      if (password || (passwordHints && passwordHints.length > 0)) {
        // Try with provided password or hints
        if (password) {
          logger.info('Trying with provided password');
          logger.info(`Password value: "${password}"`);
          logger.info(`Password length: ${password.length}`);
          logger.info(`Password type: ${typeof password}`);
          try {
            pdfData = await parsePDF(filePath, password);
          } catch (pwdError) {
            logger.warn(`Direct password failed: ${pwdError.message}`);
            // If direct password fails and we have hints, try combinations
            if (passwordHints && passwordHints.length > 0) {
              logger.info('Direct password failed, trying password combinations from hints');
              pdfData = await tryPasswordCombinations(filePath, passwordHints, userProfile);
            } else {
              throw pwdError;
            }
          }
        } else {
          // Only hints available
          logger.info('Trying password combinations from hints');
          pdfData = await tryPasswordCombinations(filePath, passwordHints, userProfile);
        }
      } else {
        try {
          // Try without password first
          logger.info('Trying without password first');
          pdfData = await parsePDF(filePath);
        } catch (error) {
          if (error.message === 'PDF_PASSWORD_REQUIRED' && passwordHints && passwordHints.length > 0) {
            // Try password combinations
            logger.info(`PDF requires password, trying ${passwordHints.length} password hints`);
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
      const extractionResult = extractTransactionsFromText(pdfData.text);
      transactions = extractionResult.transactions || extractionResult; // Handle both array and object return
      if (extractionResult.statementPeriod) {
        metadata.statementPeriod = extractionResult.statementPeriod;
      }
      
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
      const extractionResult = extractTransactionsFromText(wordData.text);
      transactions = extractionResult.transactions || extractionResult;
      if (extractionResult.statementPeriod) {
        metadata.statementPeriod = extractionResult.statementPeriod;
      }
      
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      const ocrData = await parseImageWithOCR(filePath);
      extractedText = ocrData.text;
      metadata = {
        type: 'image',
        confidence: ocrData.confidence
      };
      const extractionResult = extractTransactionsFromText(ocrData.text);
      transactions = extractionResult.transactions || extractionResult;
      if (extractionResult.statementPeriod) {
        metadata.statementPeriod = extractionResult.statementPeriod;
      }
      
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
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  
  for (const txnData of transactionData) {
    try {
      // ── Validation: reject bad data ──
      // Skip future-dated transactions (likely misparsed)
      if (txnData.date) {
        const txnDate = new Date(txnData.date);
        if (txnDate > tomorrow) {
          logger.debug(`Skipping future-dated transaction: ${txnData.description} @ ${txnDate.toISOString()}`);
          continue;
        }
      }

      // Skip suspiciously small amounts likely from promotional text (e.g., "Rs 5 Lakh offer")
      if (txnData.amount != null && Math.abs(txnData.amount) < 1) {
        logger.debug(`Skipping near-zero transaction: ${txnData.description} amount=${txnData.amount}`);
        continue;
      }

      // Skip duplicates: same userId + same date + same amount + same description
      const existingDup = await Transaction.findOne({
        userId: document.userId,
        amount: Math.abs(txnData.amount),
        description: txnData.description,
        date: txnData.date,
      });
      if (existingDup) {
        logger.debug(`Skipping duplicate transaction: ${txnData.description} ${txnData.amount}`);
        continue;
      }

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
    'EMI': ['emi', 'equated monthly installment', 'monthly installment', 'emi payment', 'installment payment', 'emi debit', 'emi due'],
    'Loan': ['loan', 'home loan', 'personal loan', 'car loan', 'vehicle loan', 'education loan', 'business loan', 'gold loan', 'loan repayment', 'loan disbursement', 'bajaj finserv', 'tata capital', 'hdfc loan', 'sbi loan', 'icici loan', 'axis loan', 'credit line', 'line of credit'],
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

  // Find date range with validation
  const validDates = transactions
    .filter(t => t.date)
    .map(t => new Date(t.date))
    .filter(d => {
      const now = new Date();
      const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
      const twoYearsAhead = new Date(now.getFullYear() + 2, 11, 31);
      return d >= threeYearsAgo && d <= twoYearsAhead && !isNaN(d.getTime());
    });
    
  if (validDates.length > 0) {
    insights.dateRange.earliest = new Date(Math.min(...validDates));
    insights.dateRange.latest = new Date(Math.max(...validDates));
    
    // Additional validation: if date range is more than 3 years, cap it
    const daysDiff = (insights.dateRange.latest - insights.dateRange.earliest) / (1000 * 60 * 60 * 24);
    if (daysDiff > 1095) { // More than 3 years
      logger.warn(`Date range is ${Math.round(daysDiff)} days, which seems unrealistic. Capping to 1 year.`);
      // Cap to 1 year from earliest date
      insights.dateRange.latest = new Date(insights.dateRange.earliest.getTime() + (365 * 24 * 60 * 60 * 1000));
    }
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
  extractICICIBankTransactions,
  extractTransactionsFromCSV,
  extractTransactionsFromJSON,
  tryPasswordCombinations,
  generatePasswordCombinations,
  parseWordDocument,
  parseImageWithOCR,
  saveTransactions,
  generateCategoryInsights
};
