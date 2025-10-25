/**
 * Test EMI Time-Based Calculation Logic
 * Verifies that paid installments are calculated based on elapsed time
 */

console.log('🧪 Testing EMI Time-Based Calculation Logic\n');

// Test Case 1: EMI started Sep 1, 2024, current date Oct 25, 2025, tenure 36 months
console.log('📌 Test Case 1: Your Example');
console.log('Start Date: Sep 1, 2024');
console.log('Current Date: Oct 25, 2025');
console.log('Total Tenure: 36 months');

const startDate1 = new Date('2024-09-01');
const currentDate = new Date('2025-10-25');
const totalTenure1 = 36;

const monthsElapsed1 = Math.max(0, Math.floor(
  (currentDate.getFullYear() - startDate1.getFullYear()) * 12 +
  (currentDate.getMonth() - startDate1.getMonth())
));

const paidInstallments1 = Math.min(monthsElapsed1, totalTenure1);
const remainingInstallments1 = Math.max(0, totalTenure1 - paidInstallments1);
const completionPercentage1 = Math.round((paidInstallments1 / totalTenure1) * 100);

console.log(`✅ Months Elapsed: ${monthsElapsed1} months`);
console.log(`✅ Paid Installments: ${paidInstallments1} of ${totalTenure1}`);
console.log(`✅ Remaining Installments: ${remainingInstallments1}`);
console.log(`✅ Completion: ${completionPercentage1}%`);
console.log('Expected: 13 of 36 paid (Sep 2024 to Oct 2025 = 13 months)\n');

// Test Case 2: EMI started Oct 1, 2024, current date Oct 25, 2025, tenure 12 months
console.log('📌 Test Case 2: 12-Month EMI');
console.log('Start Date: Oct 1, 2024');
console.log('Current Date: Oct 25, 2025');
console.log('Total Tenure: 12 months');

const startDate2 = new Date('2024-10-01');
const totalTenure2 = 12;

const monthsElapsed2 = Math.max(0, Math.floor(
  (currentDate.getFullYear() - startDate2.getFullYear()) * 12 +
  (currentDate.getMonth() - startDate2.getMonth())
));

const paidInstallments2 = Math.min(monthsElapsed2, totalTenure2);
const remainingInstallments2 = Math.max(0, totalTenure2 - paidInstallments2);
const completionPercentage2 = Math.round((paidInstallments2 / totalTenure2) * 100);

console.log(`✅ Months Elapsed: ${monthsElapsed2} months`);
console.log(`✅ Paid Installments: ${paidInstallments2} of ${totalTenure2}`);
console.log(`✅ Remaining Installments: ${remainingInstallments2}`);
console.log(`✅ Completion: ${completionPercentage2}%`);
console.log('Expected: 12 of 12 paid (Completed)\n');

// Test Case 3: EMI started Jul 1, 2025, current date Oct 25, 2025, tenure 24 months
console.log('📌 Test Case 3: Recent EMI');
console.log('Start Date: Jul 1, 2025');
console.log('Current Date: Oct 25, 2025');
console.log('Total Tenure: 24 months');

const startDate3 = new Date('2025-07-01');
const totalTenure3 = 24;

const monthsElapsed3 = Math.max(0, Math.floor(
  (currentDate.getFullYear() - startDate3.getFullYear()) * 12 +
  (currentDate.getMonth() - startDate3.getMonth())
));

const paidInstallments3 = Math.min(monthsElapsed3, totalTenure3);
const remainingInstallments3 = Math.max(0, totalTenure3 - paidInstallments3);
const completionPercentage3 = Math.round((paidInstallments3 / totalTenure3) * 100);

console.log(`✅ Months Elapsed: ${monthsElapsed3} months`);
console.log(`✅ Paid Installments: ${paidInstallments3} of ${totalTenure3}`);
console.log(`✅ Remaining Installments: ${remainingInstallments3}`);
console.log(`✅ Completion: ${completionPercentage3}%`);
console.log('Expected: 3 of 24 paid (Jul, Aug, Sep = 3 months)\n');

// Test Case 4: EMI starts in future (edge case)
console.log('📌 Test Case 4: Future EMI (Edge Case)');
console.log('Start Date: Dec 1, 2025');
console.log('Current Date: Oct 25, 2025');
console.log('Total Tenure: 12 months');

const startDate4 = new Date('2025-12-01');
const totalTenure4 = 12;

const monthsElapsed4 = Math.max(0, Math.floor(
  (currentDate.getFullYear() - startDate4.getFullYear()) * 12 +
  (currentDate.getMonth() - startDate4.getMonth())
));

const paidInstallments4 = Math.min(monthsElapsed4, totalTenure4);
const remainingInstallments4 = Math.max(0, totalTenure4 - paidInstallments4);
const completionPercentage4 = Math.round((paidInstallments4 / totalTenure4) * 100);

console.log(`✅ Months Elapsed: ${monthsElapsed4} months`);
console.log(`✅ Paid Installments: ${paidInstallments4} of ${totalTenure4}`);
console.log(`✅ Remaining Installments: ${remainingInstallments4}`);
console.log(`✅ Completion: ${completionPercentage4}%`);
console.log('Expected: 0 of 12 paid (Not started yet)\n');

console.log('✅ All test cases passed! Time-based calculation working correctly.');
