/**
 * Test Custom Provider Name + On-Request EMI Fix
 * Verifies:
 * 1. Custom provider names (like "AKKA") can be stored in cardProvider
 * 2. ON_REQUEST type EMIs with null dueDate work correctly
 */

const mongoose = require('mongoose');
const EMI = require('./models/EMI');

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testCustomProviderFix() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the user ID
    const User = require('./models/User');
    const user = await User.findOne({});
    
    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      process.exit(1);
    }

    console.log(`👤 Testing for User: ${user.email}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST 1: Custom Provider Name (AKKA)');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test creating an EMI with custom provider name
    const testEMIMonthly = new EMI({
      userId: user._id,
      cardProvider: 'AKKA', // Custom provider name
      cardLastFourDigits: '9999',
      cardHolderName: 'Test User',
      merchantName: 'Akka',
      productDescription: 'Personal Loan',
      principalAmount: 150000,
      interestRate: 1.5,
      processingFee: 0,
      emiAmount: 5000,
      totalTenure: 36,
      paidInstallments: 0,
      remainingInstallments: 36,
      repaymentType: 'MONTHLY',
      startDate: new Date('2025-10-25'),
      endDate: new Date('2028-10-25'),
      nextDueDate: new Date('2025-11-25'),
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: new Date('2025-11-25'),
        amount: 5000,
        principalPaid: 4812.5,
        interestPaid: 187.5,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'Test EMI with custom provider',
      tags: []
    });

    await testEMIMonthly.save();
    console.log('✅ SUCCESS: Monthly EMI with custom provider "AKKA" created!');
    console.log(`   EMI ID: ${testEMIMonthly._id}`);
    console.log(`   Provider: ${testEMIMonthly.cardProvider}`);
    console.log(`   Amount: ₹${testEMIMonthly.emiAmount.toLocaleString('en-IN')}`);
    console.log(`   Tenure: ${testEMIMonthly.totalTenure} months\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST 2: ON_REQUEST Type with null dueDate');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test creating an ON_REQUEST EMI with null dueDate
    const testEMIOnRequest = new EMI({
      userId: user._id,
      cardProvider: 'FRIEND RAMESH', // Custom provider name
      cardLastFourDigits: '8888',
      cardHolderName: 'Test User',
      merchantName: 'Friend Ramesh',
      productDescription: 'Emergency Loan',
      principalAmount: 50000,
      interestRate: 0,
      processingFee: 0,
      emiAmount: 50000, // Full amount
      totalTenure: 1, // Single payment
      paidInstallments: 0,
      remainingInstallments: 1,
      repaymentType: 'ON_REQUEST',
      startDate: new Date('2025-10-25'),
      endDate: null, // No fixed end date
      nextDueDate: null, // No fixed due date
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: null, // No fixed due date
        amount: 50000,
        principalPaid: 50000,
        interestPaid: 0,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'Personal loan - pay back when requested',
      tags: []
    });

    await testEMIOnRequest.save();
    console.log('✅ SUCCESS: ON_REQUEST EMI with null dueDate created!');
    console.log(`   EMI ID: ${testEMIOnRequest._id}`);
    console.log(`   Provider: ${testEMIOnRequest.cardProvider}`);
    console.log(`   Loan Amount: ₹${testEMIOnRequest.principalAmount.toLocaleString('en-IN')}`);
    console.log(`   Repayment Type: ${testEMIOnRequest.repaymentType}`);
    console.log(`   Due Date: ${testEMIOnRequest.nextDueDate || 'None (pay anytime)'}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📝 Summary:');
    console.log('   ✅ Custom provider names work (no enum restriction)');
    console.log('   ✅ ON_REQUEST type with null dueDate works');
    console.log('   ✅ Both EMIs saved successfully to database\n');

    // Clean up test EMIs
    console.log('🧹 Cleaning up test EMIs...');
    await EMI.deleteOne({ _id: testEMIMonthly._id });
    await EMI.deleteOne({ _id: testEMIOnRequest._id });
    console.log('✅ Test EMIs deleted\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCustomProviderFix();
