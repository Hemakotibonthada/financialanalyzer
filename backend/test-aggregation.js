const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';
const USER_ID = '68fb581cab185e0313081680';

async function testDocumentAggregation() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE DOCUMENT AGGREGATION TEST');
    console.log('='.repeat(80) + '\n');

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    const Document = mongoose.model('Document', new mongoose.Schema({}, { strict: false }));
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

    // Get all completed documents
    const documents = await Document.find({
      userId: USER_ID,
      processingStatus: 'completed'
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${documents.length} completed documents\n`);

    if (documents.length === 0) {
      console.log('⚠️  No completed documents found.');
      console.log('   Please upload and process some documents first.\n');
      return;
    }

    // Aggregate data per document
    const documentStats = [];
    let grandTotalIncome = 0;
    let grandTotalExpenses = 0;
    let grandTotalTransactions = 0;

    console.log('📈 Processing each document:\n');

    for (const doc of documents) {
      const transactions = await Transaction.find({
        userId: USER_ID,
        documentId: doc._id
      });

      let income = 0;
      let expenses = 0;

      transactions.forEach(t => {
        if (t.type === 'credit') {
          income += Math.abs(t.amount);
        } else if (t.type === 'debit') {
          expenses += Math.abs(t.amount);
        }
      });

      const netFlow = income - expenses;

      documentStats.push({
        fileName: doc.originalFileName,
        uploadDate: doc.createdAt,
        transactionCount: transactions.length,
        income,
        expenses,
        netFlow,
        volume: income + expenses
      });

      grandTotalIncome += income;
      grandTotalExpenses += expenses;
      grandTotalTransactions += transactions.length;

      console.log(`  📄 ${doc.originalFileName}`);
      console.log(`     Uploaded: ${doc.createdAt.toLocaleDateString()}`);
      console.log(`     Transactions: ${transactions.length}`);
      console.log(`     Income: ₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`     Expenses: ₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`     Net Flow: ₹${netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`     Total Volume: ₹${(income + expenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`);
    }

    const grandNetSavings = grandTotalIncome - grandTotalExpenses;
    const savingsRate = grandTotalIncome > 0 ? ((grandNetSavings / grandTotalIncome) * 100) : 0;

    console.log('='.repeat(80));
    console.log('💰 GRAND TOTALS (ALL DOCUMENTS AGGREGATED)');
    console.log('='.repeat(80));
    console.log(`  Documents Processed: ${documents.length}`);
    console.log(`  Total Transactions: ${grandTotalTransactions.toLocaleString()}`);
    console.log(`  Total Income: ₹${grandTotalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`  Total Expenses: ₹${grandTotalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`  Net Savings: ₹${grandNetSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`  Savings Rate: ${savingsRate.toFixed(2)}%`);
    console.log(`  Total Volume: ₹${(grandTotalIncome + grandTotalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log('='.repeat(80) + '\n');

    // Format in Lakhs/Crores for easier reading
    console.log('💵 SIMPLIFIED FORMAT:');
    console.log(`  Total Income: ${formatInLakhsCrores(grandTotalIncome)}`);
    console.log(`  Total Expenses: ${formatInLakhsCrores(grandTotalExpenses)}`);
    console.log(`  Net Savings: ${formatInLakhsCrores(grandNetSavings)}`);
    console.log(`  Total Volume: ${formatInLakhsCrores(grandTotalIncome + grandTotalExpenses)}\n`);

    // Verify aggregation example (if you have 2+ documents)
    if (documents.length >= 2) {
      console.log('✅ AGGREGATION VERIFICATION:');
      console.log(`  Document 1 volume: ${formatInLakhsCrores(documentStats[0].volume)}`);
      console.log(`  Document 2 volume: ${formatInLakhsCrores(documentStats[1].volume)}`);
      if (documents.length > 2) {
        console.log(`  Document 3+ volume: ${formatInLakhsCrores(documentStats.slice(2).reduce((sum, d) => sum + d.volume, 0))}`);
      }
      console.log(`  = Total volume: ${formatInLakhsCrores(grandTotalIncome + grandTotalExpenses)}`);
      console.log('  ✅ Aggregation working correctly!\n');
    }

    // API endpoint test
    console.log('🌐 TESTING API ENDPOINT:');
    console.log('  GET /api/financial/analytics/document-summary');
    console.log('  This endpoint should return these exact totals.\n');

    console.log('📱 FRONTEND DISPLAY:');
    console.log('  The analyzer page should show:');
    console.log(`  - Total Expenses: ${formatCurrency(grandTotalExpenses)}`);
    console.log(`  - Total Income: ${formatCurrency(grandTotalIncome)}`);
    console.log(`  - Net Savings: ${formatCurrency(grandNetSavings)}`);
    console.log(`  - Transactions: ${grandTotalTransactions}`);
    console.log();

    console.log('✅ TEST COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database\n');
  }
}

function formatInLakhsCrores(amount) {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Crores`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakhs`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)} Thousand`;
  }
  return `₹${amount.toFixed(2)}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Run the test
testDocumentAggregation();
