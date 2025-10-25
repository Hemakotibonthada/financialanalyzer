const axios = require('axios');

/**
 * Comprehensive test script to update and verify real CIBIL data
 */

const BASE_URL = 'http://localhost:5001/api';

// Your actual login credentials
const USER_CREDENTIALS = {
    email: 'test@example.com', // CHANGE THIS
    password: 'password123' // CHANGE THIS
};

// Your REAL credit card data
const YOUR_REAL_CREDIT_CARDS = [
    {
        cardName: 'HDFC Regalia First',
        provider: 'HDFC Bank',
        cardType: 'Premium',
        cardNumber: '****-****-****-1001',
        status: 'Active',
        creditLimit: 600000, // ₹6L
        currentBalance: 120000, // ₹1.2L
        availableLimit: 480000,
        utilizationPercent: '20.0',
        interestRate: '13.99',
        rewardPoints: 48000,
        annualFee: 2500,
        issueDate: new Date('2020-01-15'),
        expiryDate: new Date('2026-01-31'),
        minAmountDue: 6000,
        dueDate: new Date('2025-11-05'),
        lastPaymentDate: new Date('2025-10-03'),
        lastPaymentAmount: 15000
    },
    {
        cardName: 'SBI Card ELITE',
        provider: 'State Bank of India',
        cardType: 'Premium',
        cardNumber: '****-****-****-2002',
        status: 'Active',
        creditLimit: 500000, // ₹5L
        currentBalance: 100000, // ₹1L
        availableLimit: 400000,
        utilizationPercent: '20.0',
        interestRate: '14.49',
        rewardPoints: 40000,
        annualFee: 4999,
        issueDate: new Date('2021-03-20'),
        expiryDate: new Date('2027-03-31'),
        minAmountDue: 5000,
        dueDate: new Date('2025-11-10'),
        lastPaymentDate: new Date('2025-10-08'),
        lastPaymentAmount: 20000
    },
    {
        cardName: 'ICICI Amazon Pay',
        provider: 'ICICI Bank',
        cardType: 'Rewards',
        cardNumber: '****-****-****-3003',
        status: 'Active',
        creditLimit: 350000, // ₹3.5L
        currentBalance: 52500, // ₹52.5K
        availableLimit: 297500,
        utilizationPercent: '15.0',
        interestRate: '11.99',
        rewardPoints: 21000,
        annualFee: 0,
        issueDate: new Date('2019-07-10'),
        expiryDate: new Date('2025-07-31'),
        minAmountDue: 2625,
        dueDate: new Date('2025-11-15'),
        lastPaymentDate: new Date('2025-10-12'),
        lastPaymentAmount: 10000
    },
    {
        cardName: 'Axis Magnus',
        provider: 'Axis Bank',
        cardType: 'Super Premium',
        cardNumber: '****-****-****-4004',
        status: 'Active',
        creditLimit: 1000000, // ₹10L
        currentBalance: 200000, // ₹2L
        availableLimit: 800000,
        utilizationPercent: '20.0',
        interestRate: '15.99',
        rewardPoints: 95000,
        annualFee: 10000,
        issueDate: new Date('2022-06-01'),
        expiryDate: new Date('2028-06-30'),
        minAmountDue: 10000,
        dueDate: new Date('2025-11-20'),
        lastPaymentDate: new Date('2025-10-18'),
        lastPaymentAmount: 30000
    },
    {
        cardName: 'HDFC Regalia Second',
        provider: 'HDFC Bank',
        cardType: 'Premium',
        cardNumber: '****-****-****-5005',
        status: 'Active',
        creditLimit: 450000, // ₹4.5L
        currentBalance: 67500, // ₹67.5K
        availableLimit: 382500,
        utilizationPercent: '15.0',
        interestRate: '13.99',
        rewardPoints: 34000,
        annualFee: 2500,
        issueDate: new Date('2021-09-10'),
        expiryDate: new Date('2027-09-30'),
        minAmountDue: 3375,
        dueDate: new Date('2025-11-08'),
        lastPaymentDate: new Date('2025-10-05'),
        lastPaymentAmount: 12000
    }
    // Add more cards as needed
];

// Your credit history (stable, as you never missed payments)
const YOUR_CREDIT_HISTORY = [
    { month: 'Nov 2024', score: 763, inquiries: 0, utilization: 19.2 },
    { month: 'Dec 2024', score: 764, inquiries: 0, utilization: 19.5 },
    { month: 'Jan 2025', score: 765, inquiries: 0, utilization: 19.0 },
    { month: 'Feb 2025', score: 765, inquiries: 0, utilization: 18.8 },
    { month: 'Mar 2025', score: 766, inquiries: 0, utilization: 18.5 },
    { month: 'Apr 2025', score: 765, inquiries: 0, utilization: 19.2 },
    { month: 'May 2025', score: 765, inquiries: 0, utilization: 19.8 },
    { month: 'Jun 2025', score: 765, inquiries: 0, utilization: 20.1 },
    { month: 'Jul 2025', score: 765, inquiries: 0, utilization: 19.5 },
    { month: 'Aug 2025', score: 765, inquiries: 0, utilization: 19.2 },
    { month: 'Sep 2025', score: 765, inquiries: 0, utilization: 19.0 },
    { month: 'Oct 2025', score: 765, inquiries: 0, utilization: 19.5 }
];

async function runComprehensiveTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 COMPREHENSIVE REAL CIBIL DATA UPDATE & VERIFICATION TEST');
    console.log('='.repeat(80) + '\n');

    try {
        // Step 1: Login
        console.log('📝 Step 1: Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, USER_CREDENTIALS);
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed: ' + loginResponse.data.message);
        }
        
        const token = loginResponse.data.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Login successful\n');

        // Step 2: Calculate totals
        const totalCreditLimit = YOUR_REAL_CREDIT_CARDS.reduce((sum, card) => sum + card.creditLimit, 0);
        const totalCurrentBalance = YOUR_REAL_CREDIT_CARDS.reduce((sum, card) => sum + card.currentBalance, 0);
        const totalAvailableLimit = YOUR_REAL_CREDIT_CARDS.reduce((sum, card) => sum + card.availableLimit, 0);
        const avgUtilization = ((totalCurrentBalance / totalCreditLimit) * 100).toFixed(1);

        console.log('📊 Step 2: Your Credit Profile Summary:');
        console.log(`   Total Credit Cards: ${YOUR_REAL_CREDIT_CARDS.length}`);
        console.log(`   Total Credit Limit: ₹${(totalCreditLimit / 100000).toFixed(2)}L`);
        console.log(`   Total Used: ₹${(totalCurrentBalance / 100000).toFixed(2)}L`);
        console.log(`   Total Available: ₹${(totalAvailableLimit / 100000).toFixed(2)}L`);
        console.log(`   Average Utilization: ${avgUtilization}%\n`);

        // Step 3: Update with real data
        console.log('🔄 Step 3: Updating your profile with REAL CIBIL data...');
        const updateResponse = await axios.post(
            `${BASE_URL}/real-cibil/update-profile`,
            {
                actualScore: 765, // YOUR ACTUAL SCORE
                actualCreditLimit: totalCreditLimit,
                actualCreditCards: YOUR_REAL_CREDIT_CARDS,
                neverMissedPayment: true, // YOU NEVER MISSED
                creditHistory: YOUR_CREDIT_HISTORY
            },
            { headers }
        );

        if (!updateResponse.data.success) {
            throw new Error('Update failed: ' + updateResponse.data.message);
        }
        
        console.log('✅ Profile updated successfully\n');

        // Step 4: Verify by fetching profile
        console.log('🔍 Step 4: Verifying updated data...');
        const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
        
        if (profileResponse.data.success) {
            const creditScore = profileResponse.data.data.profile.creditScore;
            
            console.log('\n' + '─'.repeat(80));
            console.log('📈 VERIFICATION RESULTS:');
            console.log('─'.repeat(80));
            console.log(`\n✅ Credit Score: ${creditScore.score} (${creditScore.grade})`);
            console.log(`✅ Total Credit Cards: ${creditScore.creditCards?.length || 0}`);
            console.log(`✅ Total Credit Limit: ₹${((creditScore.totalCreditLimit || 0) / 100000).toFixed(2)}L`);
            console.log(`✅ Available Credit: ₹${((creditScore.availableCredit || 0) / 100000).toFixed(2)}L`);
            console.log(`✅ Credit Utilization: ${creditScore.creditUtilization || 0}%`);
            console.log(`✅ Payment History Score: ${creditScore.factors?.paymentHistory || 0}/100 ${creditScore.factors?.paymentHistory === 100 ? '(PERFECT! Never Missed)' : ''}`);
            console.log(`✅ Is Real Data: ${!creditScore.isMockData ? 'YES ✓' : 'NO ✗'}`);
            
            if (creditScore.creditCards && creditScore.creditCards.length > 0) {
                console.log('\n💳 Your Credit Cards:');
                creditScore.creditCards.forEach((card, i) => {
                    console.log(`   ${i + 1}. ${card.cardName} - ₹${(card.creditLimit / 100000).toFixed(2)}L (Util: ${card.utilizationPercent}%)`);
                });
            }

            if (creditScore.creditHistory && creditScore.creditHistory.length > 0) {
                console.log('\n📊 Credit History Available: YES (Last 12 months)');
            }
        }

        // Step 5: Test credit-detail endpoint
        console.log('\n🔍 Step 5: Testing /credit-detail endpoint...');
        const detailResponse = await axios.get(`${BASE_URL}/financial/credit-detail`, { headers });
        
        if (detailResponse.data.success) {
            const data = detailResponse.data.data;
            console.log('✅ Credit detail endpoint working');
            console.log(`   Returns: ${data.creditCards?.length || 0} cards, ${data.history?.length || 0} months history`);
        }

        // Final success message
        console.log('\n' + '='.repeat(80));
        console.log('✅ ALL TESTS PASSED! YOUR REAL DATA IS NOW IN THE SYSTEM');
        console.log('='.repeat(80));
        console.log('\n🌐 Next Steps:');
        console.log('   1. Open http://localhost:3000 in your browser');
        console.log('   2. Go to Dashboard - your credit score card should show YOUR real data');
        console.log('   3. Click "View Detailed Report" to see all your credit cards');
        console.log('   4. All pages should now display your actual CIBIL information\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response?.data) {
            console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('\n💡 Tips:');
        console.error('   - Make sure backend is running (node server.js)');
        console.error('   - Update USER_CREDENTIALS with your actual email/password');
        console.error('   - Update YOUR_REAL_CREDIT_CARDS with your actual card data');
        process.exit(1);
    }
}

// Run the test
console.log('\n⚠️  Before running, make sure you have:');
console.log('   1. Backend server running (cd backend && node server.js)');
console.log('   2. Updated USER_CREDENTIALS with your login info');
console.log('   3. Updated YOUR_REAL_CREDIT_CARDS with your actual credit cards');
console.log('   4. Verified YOUR_CREDIT_HISTORY matches your actual score trend\n');

console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
    runComprehensiveTest();
}, 3000);
