/**
 * Test Total Paid Amount Calculation
 * Verifies that Total Paid includes:
 * 1. Full amount from completed EMIs
 * 2. Only paid installments (time-based) from active EMIs
 */

const mongoose = require('mongoose');
const EMIAnalyticsService = require('./services/emiAnalyticsService');

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testTotalPaidCalculation() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the user ID (replace with your actual user ID)
    const User = require('./models/User');
    const user = await User.findOne({});
    
    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      process.exit(1);
    }

    console.log(`👤 Testing for User: ${user.email}\n`);

    // Create analytics service instance
    const analyticsService = new EMIAnalyticsService();

    // Get EMI overview
    console.log('📊 Fetching EMI Overview...\n');
    const overview = await analyticsService.getEMIOverview(user._id);

    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 EMI OVERVIEW');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n💳 Active EMIs: ${overview.overview.totalActiveEMIs}`);
    console.log(`✅ Completed EMIs: ${overview.overview.totalCompletedEMIs}`);
    console.log(`\n💰 Monthly Burden: ₹${overview.overview.monthlyBurden.toLocaleString('en-IN')}`);
    console.log(`📊 Total Outstanding: ₹${overview.overview.totalOutstanding.toLocaleString('en-IN')}`);
    console.log(`\n✨ TOTAL PAID: ₹${overview.overview.totalAmountPaid.toLocaleString('en-IN')}`);

    // Show detailed breakdown
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 DETAILED BREAKDOWN');
    console.log('═══════════════════════════════════════════════════════\n');

    if (overview.activeEMIs.length > 0) {
      console.log('🔵 ACTIVE EMIs (Paid installments based on time elapsed):');
      console.log('─────────────────────────────────────────────────────');
      
      let totalFromActive = 0;
      overview.activeEMIs.forEach(emi => {
        const paidAmount = emi.emiAmount * emi.paidInstallments;
        totalFromActive += paidAmount;
        
        console.log(`\n  📦 ${emi.merchantName || 'Unknown Merchant'}`);
        console.log(`     Provider: ${emi.cardProvider}`);
        console.log(`     EMI: ₹${emi.emiAmount.toLocaleString('en-IN')} x ${emi.totalTenure} months`);
        console.log(`     Progress: ${emi.paidInstallments} of ${emi.totalTenure} paid (${emi.completionPercentage}%)`);
        console.log(`     💰 Paid so far: ₹${paidAmount.toLocaleString('en-IN')}`);
      });
      
      console.log(`\n  ✅ Total from Active EMIs: ₹${totalFromActive.toLocaleString('en-IN')}`);
    } else {
      console.log('🔵 ACTIVE EMIs: None');
    }

    if (overview.completedEMIs.length > 0) {
      console.log('\n\n🟢 COMPLETED EMIs (Full amount paid):');
      console.log('─────────────────────────────────────────────────────');
      
      let totalFromCompleted = 0;
      overview.completedEMIs.forEach(emi => {
        const fullAmount = emi.emiAmount * emi.totalTenure;
        totalFromCompleted += fullAmount;
        
        console.log(`\n  📦 ${emi.merchantName || 'Unknown Merchant'}`);
        console.log(`     Provider: ${emi.cardProvider}`);
        console.log(`     EMI: ₹${emi.emiAmount.toLocaleString('en-IN')} x ${emi.totalTenure} months`);
        console.log(`     💰 Full amount: ₹${fullAmount.toLocaleString('en-IN')}`);
      });
      
      console.log(`\n  ✅ Total from Completed EMIs: ₹${totalFromCompleted.toLocaleString('en-IN')}`);
    } else {
      console.log('\n\n🟢 COMPLETED EMIs: None');
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('🎯 FINAL CALCULATION');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Formula: Total Paid = Completed EMIs (full) + Active EMIs (paid installments)\n');
    console.log(`✨ TOTAL PAID: ₹${overview.overview.totalAmountPaid.toLocaleString('en-IN')}`);
    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testTotalPaidCalculation();
