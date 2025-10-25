/**
 * Test Repayment Types Feature
 * Demonstrates:
 * 1. MONTHLY - Regular EMI with fixed monthly installments
 * 2. ON_REQUEST - Personal loan that can be paid back anytime
 */

const mongoose = require('mongoose');
const EMI = require('./models/EMI');

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testRepaymentTypes() {
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
    console.log('📊 REPAYMENT TYPES COMPARISON');
    console.log('═══════════════════════════════════════════════════════\n');

    // Fetch all EMIs grouped by repayment type
    const allEMIs = await EMI.find({ userId: user._id }).sort({ createdAt: -1 });
    
    const monthlyEMIs = allEMIs.filter(emi => emi.repaymentType === 'MONTHLY' || !emi.repaymentType);
    const onRequestEMIs = allEMIs.filter(emi => emi.repaymentType === 'ON_REQUEST');

    console.log('📅 MONTHLY EMI TYPE');
    console.log('─────────────────────────────────────────────────────');
    console.log('✨ Features:');
    console.log('   • Fixed monthly installments');
    console.log('   • Defined tenure (e.g., 12, 24, 36 months)');
    console.log('   • Scheduled due dates');
    console.log('   • Interest calculated per month');
    console.log('   • Automatic progress tracking\n');
    
    if (monthlyEMIs.length > 0) {
      console.log(`Found ${monthlyEMIs.length} Monthly EMI(s):\n`);
      
      monthlyEMIs.slice(0, 5).forEach((emi, index) => {
        console.log(`${index + 1}. 📦 ${emi.merchantName || 'Unknown'}`);
        console.log(`   Provider: ${emi.cardProvider}`);
        console.log(`   Principal: ₹${emi.principalAmount.toLocaleString('en-IN')}`);
        console.log(`   Monthly EMI: ₹${emi.emiAmount.toLocaleString('en-IN')}`);
        console.log(`   Tenure: ${emi.totalTenure} months`);
        console.log(`   Progress: ${emi.paidInstallments}/${emi.totalTenure}`);
        console.log(`   Next Due: ${emi.nextDueDate ? emi.nextDueDate.toDateString() : 'N/A'}`);
        console.log(`   Total Payable: ₹${(emi.emiAmount * emi.totalTenure).toLocaleString('en-IN')}\n`);
      });
    } else {
      console.log('   ℹ️  No Monthly EMIs found\n');
    }

    console.log('\n🤝 ON REQUEST TYPE (Personal Loans)');
    console.log('─────────────────────────────────────────────────────');
    console.log('✨ Features:');
    console.log('   • Pay back anytime when requested');
    console.log('   • No fixed monthly installments');
    console.log('   • No defined tenure');
    console.log('   • Flexible repayment');
    console.log('   • Perfect for loans from friends/family\n');
    
    if (onRequestEMIs.length > 0) {
      console.log(`Found ${onRequestEMIs.length} On-Request Loan(s):\n`);
      
      onRequestEMIs.forEach((emi, index) => {
        console.log(`${index + 1}. 📦 ${emi.merchantName || 'Unknown'}`);
        console.log(`   Provider: ${emi.cardProvider}`);
        console.log(`   Loan Amount: ₹${emi.principalAmount.toLocaleString('en-IN')}`);
        console.log(`   Repayment: On Request (Pay Anytime)`);
        console.log(`   Started: ${emi.startDate.toDateString()}`);
        console.log(`   Status: ${emi.status}`);
        console.log(`   Notes: ${emi.notes || 'No notes'}\n`);
      });
    } else {
      console.log('   ℹ️  No On-Request loans found\n');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💡 USE CASES');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📅 MONTHLY EMI - Best for:');
    console.log('   • Credit card EMIs');
    console.log('   • Bank loans with fixed tenure');
    console.log('   • Buy-now-pay-later services');
    console.log('   • Structured payment plans\n');
    
    console.log('🤝 ON REQUEST - Best for:');
    console.log('   • Loans from friends or family');
    console.log('   • Informal lending');
    console.log('   • Emergency loans');
    console.log('   • Flexible repayment arrangements\n');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📈 SUMMARY STATISTICS');
    console.log('═══════════════════════════════════════════════════════\n');

    const monthlyTotal = monthlyEMIs.reduce((sum, emi) => sum + emi.principalAmount, 0);
    const onRequestTotal = onRequestEMIs.reduce((sum, emi) => sum + emi.principalAmount, 0);
    const monthlyBurden = monthlyEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);

    console.log(`📅 Monthly EMIs:`);
    console.log(`   Count: ${monthlyEMIs.length}`);
    console.log(`   Total Principal: ₹${monthlyTotal.toLocaleString('en-IN')}`);
    console.log(`   Monthly Burden: ₹${monthlyBurden.toLocaleString('en-IN')}/month\n`);

    console.log(`🤝 On-Request Loans:`);
    console.log(`   Count: ${onRequestEMIs.length}`);
    console.log(`   Total Outstanding: ₹${onRequestTotal.toLocaleString('en-IN')}`);
    console.log(`   Monthly Burden: ₹0 (Pay when requested)\n`);

    console.log(`💰 Grand Total:`);
    console.log(`   Total Debt: ₹${(monthlyTotal + onRequestTotal).toLocaleString('en-IN')}`);
    console.log(`   Active Monthly Burden: ₹${monthlyBurden.toLocaleString('en-IN')}`);

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testRepaymentTypes();
