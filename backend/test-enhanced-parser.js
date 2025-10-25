const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5001';
const MONGO_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';

// Using main user account
const TEST_USER = {
  email: 'hemakotibonthada@gmail.com',
  password: 'Hemakoti@003'  // UPDATE THIS!
};

async function testEnhancedParser() {
  let dbConnection;
  
  try {
    console.log('🔐 Step 1: Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log('✅ Logged in successfully');
    console.log('User ID:', userId);

    // Connect to MongoDB
    console.log('\n🔌 Step 2: Connecting to MongoDB...');
    dbConnection = await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');

    const testFile = path.join(__dirname, 'uploads', 'financial', '1761394583855_Statement_OCT2025_060858597_unlocked.pdf');
    
    if (!fs.existsSync(testFile)) {
      console.log('⚠️  Test file not found. Please provide the correct path.');
      console.log('Expected location:', testFile);
      return;
    }

    console.log('\n📤 Step 3: Uploading ICICI statement...');
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testFile));
    
    const uploadRes = await axios.post(`${API_URL}/api/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    const documentId = uploadRes.data.documents[0]._id;
    console.log('✅ Document uploaded');
    console.log('Document ID:', documentId);

    console.log('\n⏳ Step 4: Waiting for processing to complete (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('\n📊 Step 5: Checking extracted transactions...');
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
    
    const transactions = await Transaction.find({ 
      userId: userId,
      documentId: documentId 
    }).sort({ date: 1 });

    console.log('\n=== EXTRACTION RESULTS ===');
    console.log(`Total transactions extracted: ${transactions.length}`);
    
    if (transactions.length > 0) {
      // Calculate totals
      let totalCredits = 0;
      let totalDebits = 0;
      
      transactions.forEach(t => {
        if (t.type === 'credit') {
          totalCredits += t.amount;
        } else {
          totalDebits += t.amount;
        }
      });
      
      console.log(`\nTotal Credits: ₹${totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`Total Debits: ₹${totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`Net Flow: ₹${(totalCredits - totalDebits).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      
      console.log('\n📅 Date Range:');
      console.log(`First transaction: ${transactions[0].date}`);
      console.log(`Last transaction: ${transactions[transactions.length - 1].date}`);
      
      console.log('\n💳 Transaction Types:');
      const types = {};
      transactions.forEach(t => {
        types[t.type] = (types[t.type] || 0) + 1;
      });
      console.log(types);
      
      console.log('\n💰 Sample Transactions (first 5):');
      transactions.slice(0, 5).forEach(t => {
        console.log(`${t.date} | ${t.type} | ₹${t.amount} | ${t.description.substring(0, 50)}`);
      });
      
      console.log('\n📈 Expected vs Actual:');
      console.log('Expected total (from statement): ₹27,41,145.82');
      console.log(`Actual total extracted: ₹${(totalCredits + totalDebits).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      
      if (transactions.length > 100) {
        console.log('\n✅ SUCCESS! Extracted more than the previous 100 transactions');
      } else {
        console.log('\n⚠️  WARNING! Only extracted', transactions.length, 'transactions (expected more)');
      }
    } else {
      console.log('❌ No transactions found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    if (dbConnection) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from database');
    }
  }
}

// Run the test
testEnhancedParser();
