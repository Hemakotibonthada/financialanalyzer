const mongoose = require('mongoose');
const path = require('path');
const documentProcessor = require('./services/documentProcessor');
const logger = require('./utils/logger');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financialanalyzer';

async function testICICIStatement() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');
    
    // Path to your ICICI statement
    const statementPath = path.join(__dirname, 'uploads', 'financial', '68fb581cab185e0313081680', '1761377580732_Statement_OCT2025_060858597.pdf');
    
    // Password for the document
    const password = 'BONT0906';
    
    logger.info('🔐 Processing password-protected ICICI bank statement...');
    logger.info(`File: ${statementPath}`);
    logger.info(`Password: ${password}`);
    
    // Process the PDF with password
    const result = await documentProcessor.processDocumentFile(
      statementPath,
      'pdf',
      password
    );
    
    logger.info('\n📊 Processing Results:');
    logger.info(`✅ Successfully extracted text (${result.extractedText.length} characters)`);
    logger.info(`✅ Found ${result.transactions.length} transactions`);
    
    if (result.transactions.length > 0) {
      logger.info('\n💰 Transaction Summary:');
      
      // Group by type
      const credits = result.transactions.filter(t => t.type === 'credit');
      const debits = result.transactions.filter(t => t.type === 'debit');
      
      const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
      const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
      
      logger.info(`📥 Credits: ${credits.length} transactions, Total: ₹${totalCredits.toFixed(2)}`);
      logger.info(`📤 Debits: ${debits.length} transactions, Total: ₹${totalDebits.toFixed(2)}`);
      
      logger.info('\n📋 Sample Transactions (first 10):');
      result.transactions.slice(0, 10).forEach((txn, idx) => {
        const icon = txn.type === 'credit' ? '💰' : '💸';
        const sign = txn.type === 'credit' ? '+' : '-';
        logger.info(`${idx + 1}. ${icon} ${txn.date.toISOString().split('T')[0]} | ${sign}₹${txn.amount.toFixed(2)} | ${txn.description.substring(0, 60)}`);
      });
      
      // Show payment methods
      const paymentMethods = {};
      result.transactions.forEach(t => {
        const method = t.paymentMethod || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      
      logger.info('\n💳 Payment Methods:');
      Object.entries(paymentMethods).forEach(([method, count]) => {
        logger.info(`  - ${method}: ${count} transactions`);
      });
      
      // Show date range
      const dates = result.transactions.map(t => t.date).sort((a, b) => a - b);
      if (dates.length > 0) {
        logger.info('\n📅 Date Range:');
        logger.info(`  From: ${dates[0].toISOString().split('T')[0]}`);
        logger.info(`  To: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
      }
      
      // Show balance info
      const lastTxn = result.transactions[result.transactions.length - 1];
      if (lastTxn && lastTxn.balance) {
        logger.info(`\n💵 Final Balance: ₹${lastTxn.balance.toFixed(2)}`);
      }
    } else {
      logger.warn('⚠️  No transactions extracted. Showing raw text sample:');
      logger.info(result.extractedText.substring(0, 500));
    }
    
    logger.info('\n✅ Test completed successfully!');
    
  } catch (error) {
    logger.error('❌ Error processing ICICI statement:', error);
    logger.error(error.stack);
  } finally {
    await mongoose.disconnect();
    logger.info('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testICICIStatement();
