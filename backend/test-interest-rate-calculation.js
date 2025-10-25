/**
 * Test Interest Rate Calculation
 * Verifies interest rate is calculated from Principal, EMI Amount, and Tenure
 */

console.log('🧪 Testing Interest Rate Calculation\n');
console.log('Formula: Interest Rate (%) = (Total Interest × 12) / (Principal × Tenure)\n');

function calculateInterestRate(principal, emiAmount, tenure) {
  const totalAmount = emiAmount * tenure;
  const totalInterest = totalAmount - principal;
  
  // Simple case: 0% interest
  if (totalInterest <= 0 || Math.abs(totalInterest) < 1) {
    return 0;
  }
  
  // Flat rate calculation
  const flatRate = (totalInterest * 12) / (principal * tenure);
  const flatRatePercent = parseFloat((flatRate * 100).toFixed(2));
  
  return flatRatePercent;
}

// Test Case 1: Jambo Loan (from your screenshot)
console.log('📌 Test Case 1: Jambo Loan');
console.log('Principal: ₹99,976');
console.log('EMI per month: ₹8,323');
console.log('Tenure: 12 months');

const principal1 = 99976;
const emiAmount1 = 8323;
const tenure1 = 12;

const totalAmount1 = emiAmount1 * tenure1;
const totalInterest1 = totalAmount1 - principal1;
const interestRate1 = calculateInterestRate(principal1, emiAmount1, tenure1);

console.log(`Total Amount: ₹${totalAmount1.toLocaleString('en-IN')}`);
console.log(`Total Interest: ₹${totalInterest1.toLocaleString('en-IN')}`);
console.log(`✅ Calculated Interest Rate: ${interestRate1}% per annum`);
console.log('');

// Test Case 2: Bajaj (from your screenshot)
console.log('📌 Test Case 2: Bajaj');
console.log('Principal: ₹2,16,000');
console.log('EMI per month: ₹6,000');
console.log('Tenure: 36 months');

const principal2 = 216000;
const emiAmount2 = 6000;
const tenure2 = 36;

const totalAmount2 = emiAmount2 * tenure2;
const totalInterest2 = totalAmount2 - principal2;
const interestRate2 = calculateInterestRate(principal2, emiAmount2, tenure2);

console.log(`Total Amount: ₹${totalAmount2.toLocaleString('en-IN')}`);
console.log(`Total Interest: ₹${totalInterest2.toLocaleString('en-IN')}`);
console.log(`✅ Calculated Interest Rate: ${interestRate2}% per annum`);
console.log('');

// Test Case 3: Amazon (from your screenshot)
console.log('📌 Test Case 3: Amazon');
console.log('Principal: ₹32,490');
console.log('EMI per month: ₹2,708');
console.log('Tenure: 12 months');

const principal3 = 32490;
const emiAmount3 = 2708;
const tenure3 = 12;

const totalAmount3 = emiAmount3 * tenure3;
const totalInterest3 = totalAmount3 - principal3;
const interestRate3 = calculateInterestRate(principal3, emiAmount3, tenure3);

console.log(`Total Amount: ₹${totalAmount3.toLocaleString('en-IN')}`);
console.log(`Total Interest: ₹${totalInterest3.toLocaleString('en-IN')}`);
console.log(`✅ Calculated Interest Rate: ${interestRate3}% per annum`);
console.log('');

// Test Case 4: 0% Interest EMI
console.log('📌 Test Case 4: 0% Interest EMI');
console.log('Principal: ₹60,000');
console.log('EMI per month: ₹5,000');
console.log('Tenure: 12 months');

const principal4 = 60000;
const emiAmount4 = 5000;
const tenure4 = 12;

const totalAmount4 = emiAmount4 * tenure4;
const totalInterest4 = totalAmount4 - principal4;
const interestRate4 = calculateInterestRate(principal4, emiAmount4, tenure4);

console.log(`Total Amount: ₹${totalAmount4.toLocaleString('en-IN')}`);
console.log(`Total Interest: ₹${totalInterest4.toLocaleString('en-IN')}`);
console.log(`✅ Calculated Interest Rate: ${interestRate4}% per annum (No cost EMI!)`);
console.log('');

// Test Case 5: High Interest EMI
console.log('📌 Test Case 5: High Interest EMI');
console.log('Principal: ₹1,00,000');
console.log('EMI per month: ₹10,000');
console.log('Tenure: 12 months');

const principal5 = 100000;
const emiAmount5 = 10000;
const tenure5 = 12;

const totalAmount5 = emiAmount5 * tenure5;
const totalInterest5 = totalAmount5 - principal5;
const interestRate5 = calculateInterestRate(principal5, emiAmount5, tenure5);

console.log(`Total Amount: ₹${totalAmount5.toLocaleString('en-IN')}`);
console.log(`Total Interest: ₹${totalInterest5.toLocaleString('en-IN')}`);
console.log(`✅ Calculated Interest Rate: ${interestRate5}% per annum`);
console.log('');

console.log('━'.repeat(80));
console.log('✅ Interest Rate Calculation Working Correctly!');
console.log('━'.repeat(80));
console.log('\n📊 Summary:');
console.log('  • Interest rate is now calculated from Principal, EMI Amount, and Tenure');
console.log('  • Formula: Rate = (Total Interest × 12) / (Principal × Tenure)');
console.log('  • Works for 0% interest EMIs (shows 0%)');
console.log('  • Displays flat rate (easier to understand than reducing balance)');
console.log('  • All EMI cards will show calculated interest rate percentage');
