/**
 * Quick script to check database status
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./models/Document');
const Transaction = require('./models/Transaction');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';

async function checkDocuments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const allDocs = await Document.find({});
    console.log(`📄 Total documents: ${allDocs.length}`);
    
    const completedDocs = await Document.find({ processingStatus: 'completed' });
    console.log(`✅ Completed documents: ${completedDocs.length}`);
    
    if (completedDocs.length > 0) {
      console.log('\nCompleted Documents:');
      for (const doc of completedDocs) {
        const txCount = await Transaction.countDocuments({ documentId: doc._id });
        console.log(`  - ${doc.originalFileName} (${doc.createdAt.toLocaleDateString()}): ${txCount} transactions`);
      }
    }
    
    const allTransactions = await Transaction.find({});
    console.log(`\n💰 Total transactions: ${allTransactions.length}`);
    
    const credits = allTransactions.filter(t => t.type === 'credit');
    const debits = allTransactions.filter(t => t.type === 'debit');
    
    console.log(`  📥 Credits: ${credits.length}`);
    console.log(`  📤 Debits: ${debits.length}`);
    
    if (allDocs.length === 0) {
      console.log('\n⚠️  No documents found. Please upload a bank statement at http://localhost:3001');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDocuments();
