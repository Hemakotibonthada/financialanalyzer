/**
 * Debug script to examine transaction data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Document = require('./models/Document');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';

async function debugTransactions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const recentDoc = await Document.findOne({ 
      processingStatus: 'completed' 
    }).sort({ createdAt: -1 });

    console.log(`📄 Document: ${recentDoc.originalFileName}\n`);

    const transactions = await Transaction.find({ 
      documentId: recentDoc._id 
    }).sort({ date: 1 }).limit(20);

    console.log('Sample Transactions (first 20):');
    console.log('='.repeat(100));
    
    transactions.forEach((t, i) => {
      console.log(`\n${i + 1}. Transaction ID: ${t._id}`);
      console.log(`   Date: ${t.date.toLocaleDateString()}`);
      console.log(`   Description: ${t.description}`);
      console.log(`   Amount: ₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Category: ${t.category || 'uncategorized'}`);
    });

    console.log('\n' + '='.repeat(100));
    console.log('\nAmount Statistics:');
    
    const amounts = transactions.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    console.log(`Average: ₹${avgAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`Maximum: ₹${maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`Minimum: ₹${minAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    
    // Check for suspiciously large amounts (likely balance amounts)
    const suspiciouslyLarge = transactions.filter(t => Math.abs(t.amount) > 100000);
    console.log(`\n⚠️  Suspiciously large amounts (> ₹1,00,000): ${suspiciouslyLarge.length}`);
    
    if (suspiciouslyLarge.length > 0) {
      console.log('\nLarge Amount Transactions:');
      suspiciouslyLarge.slice(0, 5).forEach((t, i) => {
        console.log(`${i + 1}. ${t.date.toLocaleDateString()} - ${t.description?.substring(0, 40)} - ₹${Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

debugTransactions();
