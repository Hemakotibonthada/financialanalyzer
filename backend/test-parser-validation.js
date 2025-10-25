/**
 * Test Script: Validate Deposit/Withdrawal Parser
 * 
 * This script tests the new column-based parser implementation
 * to ensure deposits and withdrawals are correctly separated.
 * 
 * Expected Results (from statement):
 * - Total Deposits: ₹27,41,145.82
 * - Total Withdrawals: ₹26,72,243.25
 * - Final Balance: ₹44,488.82
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Document = require('./models/Document');
const Transaction = require('./models/Transaction');
const logger = require('./utils/logger');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testParserValidation() {
  try {
    logger.info('\n=================================');
    logger.info('🧪 PARSER VALIDATION TEST');
    logger.info('=================================\n');

    await mongoose.connect(MONGO_URI);
    logger.info('✅ Connected to MongoDB\n');

    // Find the most recent completed document
    const recentDoc = await Document.findOne({ 
      processingStatus: 'completed' 
    }).sort({ createdAt: -1 });

    if (!recentDoc) {
      logger.warn('⚠️  No completed documents found. Please upload a statement first.');
      process.exit(0);
    }

    logger.info(`📄 Testing Document: ${recentDoc.originalFileName}`);
    logger.info(`📅 Uploaded: ${recentDoc.createdAt.toLocaleDateString()}`);
    logger.info(`🆔 Document ID: ${recentDoc._id}\n`);

    // Get all transactions for this document
    const transactions = await Transaction.find({ 
      documentId: recentDoc._id 
    }).sort({ date: 1 });

    logger.info(`📊 Total Transactions Found: ${transactions.length}\n`);

    // Separate deposits and withdrawals
    const deposits = transactions.filter(t => t.type === 'credit');
    const withdrawals = transactions.filter(t => t.type === 'debit');

    // Calculate totals
    const totalDeposits = deposits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netFlow = totalDeposits - totalWithdrawals;

    // Expected values from statement
    const expectedDeposits = 2741145.82;
    const expectedWithdrawals = 2672243.25;
    const expectedBalance = 44488.82;

    // Display results
    logger.info('=================================');
    logger.info('📥 DEPOSITS (CREDITS - Money IN)');
    logger.info('=================================');
    logger.info(`Count: ${deposits.length} transactions`);
    logger.info(`Total: ₹${totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    logger.info(`Expected: ₹${expectedDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    const depositAccuracy = Math.min(totalDeposits, expectedDeposits) / Math.max(totalDeposits, expectedDeposits) * 100;
    logger.info(`Accuracy: ${depositAccuracy.toFixed(2)}%`);
    
    if (deposits.length > 0) {
      logger.info('\nSample Deposits:');
      deposits.slice(0, 3).forEach((t, i) => {
        logger.info(`  ${i + 1}. ${t.date.toLocaleDateString()} - ${t.description?.substring(0, 40)} - ₹${Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
    }

    logger.info('\n=================================');
    logger.info('📤 WITHDRAWALS (DEBITS - Money OUT)');
    logger.info('=================================');
    logger.info(`Count: ${withdrawals.length} transactions`);
    logger.info(`Total: ₹${totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    logger.info(`Expected: ₹${expectedWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    const withdrawalAccuracy = Math.min(totalWithdrawals, expectedWithdrawals) / Math.max(totalWithdrawals, expectedWithdrawals) * 100;
    logger.info(`Accuracy: ${withdrawalAccuracy.toFixed(2)}%`);
    
    if (withdrawals.length > 0) {
      logger.info('\nSample Withdrawals:');
      withdrawals.slice(0, 3).forEach((t, i) => {
        logger.info(`  ${i + 1}. ${t.date.toLocaleDateString()} - ${t.description?.substring(0, 40)} - ₹${Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
    }

    logger.info('\n=================================');
    logger.info('💰 FINANCIAL SUMMARY');
    logger.info('=================================');
    logger.info(`Net Flow: ₹${netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    logger.info(`Expected Balance: ₹${expectedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    const balanceAccuracy = Math.min(Math.abs(netFlow), expectedBalance) / Math.max(Math.abs(netFlow), expectedBalance) * 100;
    logger.info(`Balance Accuracy: ${balanceAccuracy.toFixed(2)}%`);

    logger.info('\n=================================');
    logger.info('✅ VALIDATION RESULTS');
    logger.info('=================================');
    
    const overallAccuracy = (depositAccuracy + withdrawalAccuracy) / 2;
    
    if (overallAccuracy > 99) {
      logger.info('🎉 EXCELLENT! Parser is working perfectly!');
    } else if (overallAccuracy > 95) {
      logger.info('✅ GOOD! Parser is working well with minor discrepancies.');
    } else if (overallAccuracy > 90) {
      logger.info('⚠️  FAIR - Some transactions may be missed or misclassified.');
    } else {
      logger.info('❌ POOR - Significant issues with transaction extraction.');
    }
    
    logger.info(`Overall Accuracy: ${overallAccuracy.toFixed(2)}%`);
    
    // Check for issues
    logger.info('\n=================================');
    logger.info('🔍 DIAGNOSTIC INFORMATION');
    logger.info('=================================');
    
    if (deposits.length === 0 && withdrawals.length === 0) {
      logger.warn('⚠️  NO TRANSACTIONS FOUND - Parser may have failed completely');
    } else if (deposits.length === 0) {
      logger.warn('⚠️  NO DEPOSITS FOUND - All transactions classified as withdrawals');
    } else if (withdrawals.length === 0) {
      logger.warn('⚠️  NO WITHDRAWALS FOUND - All transactions classified as deposits');
    }
    
    const depositRatio = (deposits.length / transactions.length * 100).toFixed(2);
    const withdrawalRatio = (withdrawals.length / transactions.length * 100).toFixed(2);
    
    logger.info(`Deposit Ratio: ${depositRatio}% of transactions`);
    logger.info(`Withdrawal Ratio: ${withdrawalRatio}% of transactions`);
    
    // Check for duplicate or missing types
    const missingType = transactions.filter(t => !t.type || (t.type !== 'credit' && t.type !== 'debit'));
    if (missingType.length > 0) {
      logger.warn(`⚠️  ${missingType.length} transactions have invalid or missing type`);
    }

    logger.info('\n=================================');
    logger.info('📊 TRANSACTION TYPE BREAKDOWN');
    logger.info('=================================');
    
    const typeBreakdown = transactions.reduce((acc, t) => {
      const type = t.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      logger.info(`${type}: ${count} transactions (${(count / transactions.length * 100).toFixed(2)}%)`);
    });

    // Test aggregation endpoint
    logger.info('\n=================================');
    logger.info('🔗 TESTING AGGREGATION API');
    logger.info('=================================');
    
    const user = await User.findOne({ _id: recentDoc.userId });
    if (user) {
      logger.info(`User: ${user.email}`);
      
      // Get all user transactions
      const allUserTransactions = await Transaction.find({ userId: user._id });
      const userDeposits = allUserTransactions.filter(t => t.type === 'credit');
      const userWithdrawals = allUserTransactions.filter(t => t.type === 'debit');
      
      const userTotalDeposits = userDeposits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const userTotalWithdrawals = userWithdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      logger.info(`\nAcross ALL documents:`);
      logger.info(`Total Income (Deposits): ₹${userTotalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      logger.info(`Total Expenses (Withdrawals): ₹${userTotalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      logger.info(`Net Savings: ₹${(userTotalDeposits - userTotalWithdrawals).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    }

    logger.info('\n=================================');
    logger.info('✅ TEST COMPLETE');
    logger.info('=================================\n');

  } catch (error) {
    logger.error('Test error:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('📊 MongoDB connection closed\n');
    process.exit(0);
  }
}

// Run the test
testParserValidation();
