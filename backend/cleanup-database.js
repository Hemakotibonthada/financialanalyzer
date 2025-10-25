/**
 * Cleanup script to remove incorrectly processed documents and transactions
 * This prepares the database for testing the new parser
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./models/Document');
const Transaction = require('./models/Transaction');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';

async function cleanupDatabase() {
  try {
    console.log('\n=================================');
    console.log('🧹 DATABASE CLEANUP');
    console.log('=================================\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count current data
    const docCount = await Document.countDocuments();
    const txCount = await Transaction.countDocuments();
    
    console.log(`Current database state:`);
    console.log(`  📄 Documents: ${docCount}`);
    console.log(`  💰 Transactions: ${txCount}\n`);

    // Ask for confirmation (we'll proceed automatically for this script)
    console.log('🗑️  Cleaning up old data...\n');

    // Delete all transactions
    const txResult = await Transaction.deleteMany({});
    console.log(`✅ Deleted ${txResult.deletedCount} transactions`);

    // Delete all documents
    const docResult = await Document.deleteMany({});
    console.log(`✅ Deleted ${docResult.deletedCount} documents\n`);

    console.log('=================================');
    console.log('✅ CLEANUP COMPLETE');
    console.log('=================================\n');
    console.log('Database is now ready for testing the new parser.');
    console.log('Please upload a bank statement at http://localhost:3001/analyze\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed\n');
    process.exit(0);
  }
}

cleanupDatabase();
