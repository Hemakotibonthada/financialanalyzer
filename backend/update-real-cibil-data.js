const axios = require('axios');

/**
 * Script to update your profile with REAL CIBIL data
 * Replace the values below with your actual credit information
 */

async function updateRealCibilData() {
    try {
        // STEP 1: Login first (replace with your actual credentials)
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'your-email@example.com', // REPLACE WITH YOUR EMAIL
            password: 'your-password' // REPLACE WITH YOUR PASSWORD
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        // STEP 2: Define YOUR REAL credit card data
        const yourRealCreditCards = [
            {
                cardName: 'HDFC Regalia',
                provider: 'HDFC Bank',
                cardType: 'Premium',
                cardNumber: '****-****-****-1234',
                status: 'Active',
                creditLimit: 500000, // ₹5L - ADJUST TO YOUR ACTUAL LIMIT
                currentBalance: 125000, // ₹1.25L - YOUR CURRENT BALANCE
                availableLimit: 375000, // ₹3.75L
                utilizationPercent: '25.0',
                interestRate: '13.99',
                rewardPoints: 45000,
                annualFee: 2500,
                issueDate: new Date('2020-01-15'),
                expiryDate: new Date('2026-01-31'),
                minAmountDue: 6250,
                dueDate: new Date('2025-11-05'),
                lastPaymentDate: new Date('2025-10-03'),
                lastPaymentAmount: 15000
            },
            {
                cardName: 'SBI Card ELITE',
                provider: 'State Bank of India',
                cardType: 'Premium',
                cardNumber: '****-****-****-5678',
                status: 'Active',
                creditLimit: 400000, // ₹4L
                currentBalance: 80000, // ₹80K
                availableLimit: 320000,
                utilizationPercent: '20.0',
                interestRate: '14.49',
                rewardPoints: 32000,
                annualFee: 4999,
                issueDate: new Date('2021-03-20'),
                expiryDate: new Date('2027-03-31'),
                minAmountDue: 4000,
                dueDate: new Date('2025-11-10'),
                lastPaymentDate: new Date('2025-10-08'),
                lastPaymentAmount: 20000
            },
            {
                cardName: 'ICICI Amazon Pay',
                provider: 'ICICI Bank',
                cardType: 'Rewards',
                cardNumber: '****-****-****-9012',
                status: 'Active',
                creditLimit: 300000, // ₹3L
                currentBalance: 45000, // ₹45K
                availableLimit: 255000,
                utilizationPercent: '15.0',
                interestRate: '11.99',
                rewardPoints: 18000,
                annualFee: 0,
                issueDate: new Date('2019-07-10'),
                expiryDate: new Date('2025-07-31'),
                minAmountDue: 2250,
                dueDate: new Date('2025-11-15'),
                lastPaymentDate: new Date('2025-10-12'),
                lastPaymentAmount: 10000
            },
            {
                cardName: 'Axis Magnus',
                provider: 'Axis Bank',
                cardType: 'Super Premium',
                cardNumber: '****-****-****-3456',
                status: 'Active',
                creditLimit: 800000, // ₹8L
                currentBalance: 160000, // ₹1.6L
                availableLimit: 640000,
                utilizationPercent: '20.0',
                interestRate: '15.99',
                rewardPoints: 75000,
                annualFee: 10000,
                issueDate: new Date('2022-06-01'),
                expiryDate: new Date('2028-06-30'),
                minAmountDue: 8000,
                dueDate: new Date('2025-11-20'),
                lastPaymentDate: new Date('2025-10-18'),
                lastPaymentAmount: 25000
            },
            {
                cardName: 'HDFC MoneyBack+',
                provider: 'HDFC Bank',
                cardType: 'Cashback',
                cardNumber: '****-****-****-7890',
                status: 'Active',
                creditLimit: 200000, // ₹2L
                currentBalance: 30000, // ₹30K
                availableLimit: 170000,
                utilizationPercent: '15.0',
                interestRate: '12.99',
                rewardPoints: 8500,
                annualFee: 500,
                issueDate: new Date('2018-11-25'),
                expiryDate: new Date('2024-11-30'),
                minAmountDue: 1500,
                dueDate: new Date('2025-11-25'),
                lastPaymentDate: new Date('2025-10-20'),
                lastPaymentAmount: 8000
            }
            // ADD MORE CARDS IF YOU HAVE THEM
        ];

        // STEP 3: Your real credit history (12 months)
        const yourCreditHistory = [
            { month: 'Nov 2024', score: 760, inquiries: 0, utilization: 22.5 },
            { month: 'Dec 2024', score: 762, inquiries: 1, utilization: 21.8 },
            { month: 'Jan 2025', score: 763, inquiries: 0, utilization: 20.5 },
            { month: 'Feb 2025', score: 764, inquiries: 0, utilization: 19.2 },
            { month: 'Mar 2025', score: 765, inquiries: 0, utilization: 18.8 },
            { month: 'Apr 2025', score: 765, inquiries: 0, utilization: 19.5 },
            { month: 'May 2025', score: 766, inquiries: 0, utilization: 20.1 },
            { month: 'Jun 2025', score: 767, inquiries: 0, utilization: 19.8 },
            { month: 'Jul 2025', score: 765, inquiries: 0, utilization: 21.0 },
            { month: 'Aug 2025', score: 765, inquiries: 0, utilization: 20.5 },
            { month: 'Sep 2025', score: 765, inquiries: 0, utilization: 19.8 },
            { month: 'Oct 2025', score: 765, inquiries: 0, utilization: 19.5 }
        ];

        // STEP 4: Update with your REAL data
        console.log('📊 Updating your profile with REAL CIBIL data...\n');
        
        const totalCreditLimit = yourRealCreditCards.reduce((sum, card) => sum + card.creditLimit, 0);
        
        const updateResponse = await axios.post(
            'http://localhost:5001/api/real-cibil/update-profile',
            {
                actualScore: 765, // YOUR ACTUAL SCORE
                actualCreditLimit: totalCreditLimit,
                actualCreditCards: yourRealCreditCards,
                neverMissedPayment: true, // YOU NEVER MISSED ANY EMI
                creditHistory: yourCreditHistory
            },
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (updateResponse.data.success) {
            console.log('✅ SUCCESS! Your REAL CIBIL data has been updated!\n');
            console.log('📈 Summary:');
            console.log(`   Credit Score: ${updateResponse.data.data.score} (${updateResponse.data.data.grade})`);
            console.log(`   Total Credit Cards: ${yourRealCreditCards.length}`);
            console.log(`   Total Credit Limit: ₹${(totalCreditLimit / 100000).toFixed(2)}L`);
            console.log(`   Never Missed Payment: ✅ YES`);
            console.log(`   Payment History Score: ${updateResponse.data.data.factors.paymentHistory}/100 (Perfect!)`);
            console.log('\n🌐 Now refresh your dashboard and credit score detail page to see your REAL data!');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the update
console.log('='.repeat(70));
console.log('🔧 REAL CIBIL DATA UPDATE SCRIPT');
console.log('='.repeat(70));
console.log('\n⚠️  IMPORTANT: Edit this file first!');
console.log('   1. Replace email/password with your actual credentials');
console.log('   2. Update the credit card data with YOUR actual cards');
console.log('   3. Adjust credit limits, balances, and card details');
console.log('   4. Then run: node update-real-cibil-data.js\n');

updateRealCibilData();
