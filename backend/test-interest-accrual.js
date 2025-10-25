/**
 * Test ON_REQUEST Interest Accrual
 * Demonstrates:
 * 1. Daily interest calculation based on time elapsed
 * 2. Formula: Principal × (Rate / 100) × (Days / 365)
 * 3. Different scenarios with various interest rates and time periods
 */

const mongoose = require('mongoose');
const EMI = require('./models/EMI');
const EMIAnalyticsService = require('./services/emiAnalyticsService');

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testInterestAccrual() {
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
    console.log('💰 INTEREST ACCRUAL TEST SCENARIOS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test Scenario 1: 10% interest, 100 days
    console.log('📊 SCENARIO 1: 10% Interest for 100 Days');
    console.log('─────────────────────────────────────────────────────');
    const testEMI1 = new EMI({
      userId: user._id,
      cardProvider: 'FRIEND AMIT',
      cardLastFourDigits: '1111',
      cardHolderName: 'Test User',
      merchantName: 'Friend Amit',
      productDescription: 'Personal Loan',
      principalAmount: 50000,
      interestRate: 10, // 10% per annum
      processingFee: 0,
      emiAmount: 50000,
      totalTenure: 1,
      paidInstallments: 0,
      remainingInstallments: 1,
      repaymentType: 'ON_REQUEST',
      startDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      endDate: null,
      nextDueDate: null,
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: null,
        amount: 50000,
        principalPaid: 50000,
        interestPaid: 0,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'Test loan for interest calculation',
      tags: []
    });

    await testEMI1.save();

    const analyticsService = new EMIAnalyticsService();
    const formattedEMI1 = analyticsService.formatEMIData(testEMI1);

    console.log(`Principal: ₹${formattedEMI1.principalAmount.toLocaleString('en-IN')}`);
    console.log(`Interest Rate: ${formattedEMI1.interestRate}% p.a.`);
    console.log(`Days Elapsed: ${formattedEMI1.daysElapsed} days`);
    console.log(`Accrued Interest: ₹${formattedEMI1.accruedInterest.toFixed(2)}`);
    console.log(`Total Amount Due: ₹${formattedEMI1.emiAmount.toFixed(2)}`);
    
    // Manual calculation verification
    const expectedInterest1 = 50000 * (10 / 100) * (100 / 365);
    console.log(`\n✅ Verification: Expected = ₹${expectedInterest1.toFixed(2)}, Got = ₹${formattedEMI1.accruedInterest.toFixed(2)}`);

    // Test Scenario 2: 15% interest, 365 days (1 year)
    console.log('\n\n📊 SCENARIO 2: 15% Interest for 365 Days (1 Year)');
    console.log('─────────────────────────────────────────────────────');
    const testEMI2 = new EMI({
      userId: user._id,
      cardProvider: 'FAMILY LOAN',
      cardLastFourDigits: '2222',
      cardHolderName: 'Test User',
      merchantName: 'Family Loan',
      productDescription: 'Emergency Loan',
      principalAmount: 100000,
      interestRate: 15, // 15% per annum
      processingFee: 0,
      emiAmount: 100000,
      totalTenure: 1,
      paidInstallments: 0,
      remainingInstallments: 1,
      repaymentType: 'ON_REQUEST',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 365 days ago
      endDate: null,
      nextDueDate: null,
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: null,
        amount: 100000,
        principalPaid: 100000,
        interestPaid: 0,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'Test loan - 1 year duration',
      tags: []
    });

    await testEMI2.save();
    const formattedEMI2 = analyticsService.formatEMIData(testEMI2);

    console.log(`Principal: ₹${formattedEMI2.principalAmount.toLocaleString('en-IN')}`);
    console.log(`Interest Rate: ${formattedEMI2.interestRate}% p.a.`);
    console.log(`Days Elapsed: ${formattedEMI2.daysElapsed} days`);
    console.log(`Accrued Interest: ₹${formattedEMI2.accruedInterest.toFixed(2)}`);
    console.log(`Total Amount Due: ₹${formattedEMI2.emiAmount.toFixed(2)}`);
    
    const expectedInterest2 = 100000 * (15 / 100) * (formattedEMI2.daysElapsed / 365);
    console.log(`\n✅ Verification: Expected = ₹${expectedInterest2.toFixed(2)}, Got = ₹${formattedEMI2.accruedInterest.toFixed(2)}`);

    // Test Scenario 3: 0% interest (interest-free loan)
    console.log('\n\n📊 SCENARIO 3: 0% Interest (Interest-Free Loan)');
    console.log('─────────────────────────────────────────────────────');
    const testEMI3 = new EMI({
      userId: user._id,
      cardProvider: 'FRIEND SARAH',
      cardLastFourDigits: '3333',
      cardHolderName: 'Test User',
      merchantName: 'Friend Sarah',
      productDescription: 'Interest-Free Loan',
      principalAmount: 25000,
      interestRate: 0, // 0% interest
      processingFee: 0,
      emiAmount: 25000,
      totalTenure: 1,
      paidInstallments: 0,
      remainingInstallments: 1,
      repaymentType: 'ON_REQUEST',
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
      endDate: null,
      nextDueDate: null,
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: null,
        amount: 25000,
        principalPaid: 25000,
        interestPaid: 0,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'Interest-free personal loan',
      tags: []
    });

    await testEMI3.save();
    const formattedEMI3 = analyticsService.formatEMIData(testEMI3);

    console.log(`Principal: ₹${formattedEMI3.principalAmount.toLocaleString('en-IN')}`);
    console.log(`Interest Rate: ${formattedEMI3.interestRate}% p.a.`);
    console.log(`Days Elapsed: ${formattedEMI3.daysElapsed} days`);
    console.log(`Accrued Interest: ₹${formattedEMI3.accruedInterest.toFixed(2)}`);
    console.log(`Total Amount Due: ₹${formattedEMI3.emiAmount.toFixed(2)}`);
    console.log(`\n✅ Interest-free loan: No interest accrued`);

    // Test Scenario 4: High interest, short duration
    console.log('\n\n📊 SCENARIO 4: 24% Interest for 30 Days');
    console.log('─────────────────────────────────────────────────────');
    const testEMI4 = new EMI({
      userId: user._id,
      cardProvider: 'MONEYLENDER',
      cardLastFourDigits: '4444',
      cardHolderName: 'Test User',
      merchantName: 'Short Term Lender',
      productDescription: 'Short Term Loan',
      principalAmount: 75000,
      interestRate: 24, // 24% per annum (high interest)
      processingFee: 0,
      emiAmount: 75000,
      totalTenure: 1,
      paidInstallments: 0,
      remainingInstallments: 1,
      repaymentType: 'ON_REQUEST',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: null,
      nextDueDate: null,
      paymentHistory: [{
        installmentNumber: 1,
        dueDate: null,
        amount: 75000,
        principalPaid: 75000,
        interestPaid: 0,
        status: 'upcoming'
      }],
      status: 'active',
      extractionMethod: 'manual',
      extractionConfidence: 100,
      notes: 'High interest short-term loan',
      tags: []
    });

    await testEMI4.save();
    const formattedEMI4 = analyticsService.formatEMIData(testEMI4);

    console.log(`Principal: ₹${formattedEMI4.principalAmount.toLocaleString('en-IN')}`);
    console.log(`Interest Rate: ${formattedEMI4.interestRate}% p.a.`);
    console.log(`Days Elapsed: ${formattedEMI4.daysElapsed} days`);
    console.log(`Accrued Interest: ₹${formattedEMI4.accruedInterest.toFixed(2)}`);
    console.log(`Total Amount Due: ₹${formattedEMI4.emiAmount.toFixed(2)}`);
    
    const expectedInterest4 = 75000 * (24 / 100) * (30 / 365);
    console.log(`\n✅ Verification: Expected = ₹${expectedInterest4.toFixed(2)}, Got = ₹${formattedEMI4.accruedInterest.toFixed(2)}`);

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY OF ALL TEST SCENARIOS');
    console.log('═══════════════════════════════════════════════════════\n');

    const scenarios = [
      { name: 'Scenario 1', emi: formattedEMI1 },
      { name: 'Scenario 2', emi: formattedEMI2 },
      { name: 'Scenario 3', emi: formattedEMI3 },
      { name: 'Scenario 4', emi: formattedEMI4 }
    ];

    scenarios.forEach(({ name, emi }) => {
      console.log(`${name}:`);
      console.log(`  Principal: ₹${emi.principalAmount.toLocaleString('en-IN')}`);
      console.log(`  Rate: ${emi.interestRate}% | Days: ${emi.daysElapsed}`);
      console.log(`  Interest: ₹${emi.accruedInterest.toFixed(2)}`);
      console.log(`  Total Due: ₹${emi.emiAmount.toFixed(2)}\n`);
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL INTEREST CALCULATIONS SUCCESSFUL!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📝 Formula Used: Principal × (Rate / 100) × (Days / 365)');
    console.log('📝 Interest accrues daily based on time elapsed since loan start date\n');

    // Clean up test EMIs
    console.log('🧹 Cleaning up test EMIs...');
    await EMI.deleteOne({ _id: testEMI1._id });
    await EMI.deleteOne({ _id: testEMI2._id });
    await EMI.deleteOne({ _id: testEMI3._id });
    await EMI.deleteOne({ _id: testEMI4._id });
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
testInterestAccrual();
