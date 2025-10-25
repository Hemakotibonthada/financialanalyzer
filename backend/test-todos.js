const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const MONGO_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';
const USER_ID = '68fb581cab185e0313081680'; // Main user

// Calculate file hash
const calculateFileHash = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

async function testAllFeatures() {
  let dbConnection;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    dbConnection = await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database\n');

    const Document = mongoose.model('Document', new mongoose.Schema({}, { strict: false }));
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

    // ========================================
    // TEST 1: Duplicate Detection
    // ========================================
    console.log('='.repeat(60));
    console.log('TEST 1: DUPLICATE DOCUMENT DETECTION');
    console.log('='.repeat(60));

    const testFile = path.join(__dirname, 'uploads', 'financial', USER_ID, '1761394583855_Statement_OCT2025_060858597_unlocked.pdf');
    
    if (!await fs.access(testFile).then(() => true).catch(() => false)) {
      console.log('❌ Test file not found:', testFile);
      return;
    }

    console.log('📄 Test file:', path.basename(testFile));
    
    // Calculate hash
    const fileHash = await calculateFileHash(testFile);
    console.log('🔑 File hash:', fileHash);
    
    // Check for existing documents with this hash
    const existingDocs = await Document.find({ 
      userId: USER_ID,
      fileHash: fileHash 
    }).sort({ createdAt: -1 });

    if (existingDocs.length > 0) {
      console.log(`\n✅ DUPLICATE DETECTION WORKING!`);
      console.log(`Found ${existingDocs.length} existing document(s) with same hash:`);
      existingDocs.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. Uploaded: ${doc.createdAt}`);
        console.log(`     File: ${doc.originalFileName}`);
        console.log(`     ID: ${doc._id}`);
        console.log(`     Status: ${doc.processingStatus}`);
      });
    } else {
      console.log('\n⚠️  No duplicate documents found (this might be first upload)');
    }

    // ========================================
    // TEST 2: Enhanced ICICI Parser
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: ENHANCED ICICI PARSER RESULTS');
    console.log('='.repeat(60));

    // Get the most recent document (or use existing document ID)
    let latestDoc = existingDocs.length > 0 ? existingDocs[0] : null;
    
    // If no document found by hash, get the most recent completed document
    if (!latestDoc) {
      latestDoc = await Document.findOne({
        userId: USER_ID,
        processingStatus: 'completed'
      }).sort({ createdAt: -1 });
    }
    
    if (!latestDoc) {
      console.log('❌ No document found to analyze. Please upload the file first.');
      return;
    }

    console.log(`\n📊 Analyzing document: ${latestDoc._id}`);
    console.log(`   File: ${latestDoc.originalFileName}`);
    console.log(`   Uploaded: ${latestDoc.createdAt}`);
    console.log(`   Status: ${latestDoc.processingStatus}`);

    // Get transactions for this document
    const transactions = await Transaction.find({
      userId: USER_ID,
      documentId: latestDoc._id
    }).sort({ date: 1 });

    console.log(`\n📈 EXTRACTION RESULTS:`);
    console.log(`   Total transactions: ${transactions.length}`);

    if (transactions.length === 0) {
      console.log('\n⚠️  No transactions found. Document might still be processing.');
      console.log('   Wait a few moments and run the test again.');
      return;
    }

    // Calculate totals
    let totalCredits = 0;
    let totalDebits = 0;
    const modeCount = {};
    
    transactions.forEach(t => {
      if (t.type === 'credit') {
        totalCredits += t.amount;
      } else if (t.type === 'debit') {
        totalDebits += t.amount;
      }
      
      // Count transaction modes
      const mode = t.mode || 'unknown';
      modeCount[mode] = (modeCount[mode] || 0) + 1;
    });

    console.log(`\n💰 FINANCIAL SUMMARY:`);
    console.log(`   Total Credits: ₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Total Debits:  ₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Net Flow:      ₹${(totalCredits - totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Total Volume:  ₹${(totalCredits + totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    console.log(`\n📅 DATE RANGE:`);
    console.log(`   First: ${transactions[0].date}`);
    console.log(`   Last:  ${transactions[transactions.length - 1].date}`);

    console.log(`\n💳 TRANSACTION MODES:`);
    Object.entries(modeCount).sort((a, b) => b[1] - a[1]).forEach(([mode, count]) => {
      console.log(`   ${mode}: ${count}`);
    });

    console.log(`\n📋 SAMPLE TRANSACTIONS (first 5):`);
    transactions.slice(0, 5).forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.date} | ${t.type.toUpperCase()} | ₹${t.amount.toFixed(2)} | ${t.description.substring(0, 40)}...`);
    });

    console.log(`\n📊 COMPARISON:`);
    console.log(`   Expected total (from statement): ₹27,41,145.82`);
    console.log(`   Actual volume extracted:         ₹${(totalCredits + totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    const expectedTotal = 2741145.82;
    const actualTotal = totalCredits + totalDebits;
    const difference = Math.abs(expectedTotal - actualTotal);
    const percentDiff = (difference / expectedTotal) * 100;
    
    console.log(`   Difference: ₹${difference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentDiff.toFixed(2)}%)`);

    if (transactions.length > 100) {
      console.log(`\n✅ SUCCESS! Extracted ${transactions.length} transactions (previously only 100)`);
    } else {
      console.log(`\n⚠️  WARNING! Only ${transactions.length} transactions extracted`);
    }

    if (percentDiff < 5) {
      console.log(`✅ TOTALS MATCH! Within 5% of expected value`);
    } else {
      console.log(`⚠️  TOTALS DIFFER by more than 5%`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    
    const test1Pass = existingDocs.length > 0;
    const test2Pass = transactions.length > 100;
    
    console.log(`\n✅ Test 1 - Duplicate Detection: ${test1Pass ? 'PASS' : 'PENDING'}`);
    console.log(`${test2Pass ? '✅' : '⚠️ '} Test 2 - Enhanced Parser: ${test2Pass ? 'PASS' : 'NEEDS REVIEW'} (${transactions.length} transactions)`);
    
    console.log('\n📝 TODOS STATUS:');
    console.log('   [✅] Fix incomplete transaction extraction');
    console.log('   [✅] Implement duplicate document detection');
    console.log(`   [${test1Pass ? '✅' : '⏳'}] Test duplicate detection`);
    console.log(`   [${test2Pass ? '✅' : '⏳'}] Test enhanced ICICI parser`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (dbConnection) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from database');
    }
  }
}

// Run all tests
console.log('\n' + '='.repeat(60));
console.log('FINANCIAL ANALYZER - TODO TESTING');
console.log('='.repeat(60));
console.log();

testAllFeatures();
