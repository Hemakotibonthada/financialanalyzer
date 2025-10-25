const mongoose = require('mongoose');
const EMI = require('./models/EMI');
require('dotenv').config();

const debugUpcomingPayments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all active EMIs
    const activeEMIs = await EMI.find({
      status: 'active',
      remainingInstallments: { $gt: 0 }
    }).sort({ nextDueDate: 1 });

    console.log(`Found ${activeEMIs.length} active EMIs\n`);
    console.log('Current Date:', new Date().toISOString().split('T')[0]);
    console.log('='.repeat(100));

    activeEMIs.forEach((emi, index) => {
      console.log(`\n${index + 1}. ${emi.merchantName} (${emi.cardProvider} ${emi.cardLastFourDigits})`);
      console.log(`   EMI Amount: ₹${emi.emiAmount}`);
      console.log(`   Start Date: ${emi.startDate.toISOString().split('T')[0]}`);
      console.log(`   Next Due Date: ${emi.nextDueDate.toISOString().split('T')[0]}`);
      console.log(`   Paid Installments: ${emi.paidInstallments}`);
      console.log(`   Remaining Installments: ${emi.remainingInstallments}`);
      console.log(`   Total Tenure: ${emi.totalTenure}`);
      
      // Get upcoming payments for this EMI
      const upcomingPayments = emi.getUpcomingPayments(6);
      console.log(`   Upcoming Payments (next 6 months):`);
      upcomingPayments.forEach(payment => {
        const date = new Date(payment.dueDate);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        console.log(`     - Installment #${payment.installmentNumber}: ${date.toISOString().split('T')[0]} (${monthYear})`);
      });
    });

    console.log('\n' + '='.repeat(100));
    console.log('\nMonthly Breakdown:');
    
    const monthlyBreakdown = {};
    activeEMIs.forEach(emi => {
      const upcomingPayments = emi.getUpcomingPayments(6);
      upcomingPayments.forEach(payment => {
        const date = new Date(payment.dueDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = {
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            emis: []
          };
        }
        
        monthlyBreakdown[monthKey].emis.push({
          merchant: emi.merchantName,
          card: `${emi.cardProvider} ${emi.cardLastFourDigits}`,
          amount: payment.amount,
          installment: payment.installmentNumber
        });
      });
    });

    const sortedMonths = Object.keys(monthlyBreakdown).sort();
    sortedMonths.forEach(monthKey => {
      const data = monthlyBreakdown[monthKey];
      console.log(`\n${data.month}/${data.year} - ${data.emis.length} EMIs:`);
      data.emis.forEach(emi => {
        console.log(`  - ${emi.merchant} (${emi.card}): ₹${emi.amount} [#${emi.installment}]`);
      });
    });

    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugUpcomingPayments();
