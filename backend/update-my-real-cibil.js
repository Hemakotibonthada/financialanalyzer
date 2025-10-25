const axios = require('axios');

/**
 * Quick script to update YOUR profile with YOUR REAL CIBIL data
 * This uses your ACTUAL credentials from the database
 */

async function updateMyRealData() {
    console.log('\n🔧 Updating YOUR profile with REAL CIBIL data...\n');

    try {
        // Use your actual email - check in the database or your last login
        const email = 'test@example.com'; // CHANGE TO YOUR EMAIL
        const password = 'password123'; // CHANGE TO YOUR PASSWORD

        console.log(`📝 Logging in as: ${email}`);
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            email,
            password
        });

        const token = loginRes.data.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Logged in successfully\n');

        // YOUR ACTUAL CREDIT CARDS (edit these with your real data)
        const myRealCards = [
            {
                cardName: 'HDFC Regalia',
                provider: 'HDFC Bank',
                cardType: 'Premium',
                cardNumber: '****-****-****-1234',
                status: 'Active',
                creditLimit: 600000, // ₹6L - YOUR ACTUAL LIMIT
                currentBalance: 120000, // ₹1.2L - YOUR ACTUAL BALANCE
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
                cardNumber: '****-****-****-5678',
                status: 'Active',
                creditLimit: 500000,
                currentBalance: 100000,
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
                cardNumber: '****-****-****-9012',
                status: 'Active',
                creditLimit: 350000,
                currentBalance: 52500,
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
                cardNumber: '****-****-****-3456',
                status: 'Active',
                creditLimit: 1000000,
                currentBalance: 200000,
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
                cardName: 'HDFC MoneyBack+',
                provider: 'HDFC Bank',
                cardType: 'Cashback',
                cardNumber: '****-****-****-7890',
                status: 'Active',
                creditLimit: 250000,
                currentBalance: 37500,
                availableLimit: 212500,
                utilizationPercent: '15.0',
                interestRate: '12.99',
                rewardPoints: 12000,
                annualFee: 500,
                issueDate: new Date('2018-11-25'),
                expiryDate: new Date('2024-11-30'),
                minAmountDue: 1875,
                dueDate: new Date('2025-11-25'),
                lastPaymentDate: new Date('2025-10-20'),
                lastPaymentAmount: 8000
            }
            // Add more cards if you have them
        ];

        const totalLimit = myRealCards.reduce((sum, c) => sum + c.creditLimit, 0);
        
        console.log('📊 Your Real Data:');
        console.log(`   Credit Score: 765`);
        console.log(`   Total Cards: ${myRealCards.length}`);
        console.log(`   Total Credit Limit: ₹${(totalLimit / 100000).toFixed(2)}L`);
        console.log(`   Never Missed Payment: YES ✓\n`);

        console.log('🔄 Updating profile...');
        const updateRes = await axios.post(
            'http://localhost:5001/api/real-cibil/update-profile',
            {
                actualScore: 765,
                actualCreditLimit: totalLimit,
                actualCreditCards: myRealCards,
                neverMissedPayment: true,
                creditHistory: [
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
                ]
            },
            { headers }
        );

        if (updateRes.data.success) {
            console.log('\n✅ SUCCESS! Your real data is now in the system!\n');
            console.log('🌐 Now do this:');
            console.log('   1. Open http://localhost:3000');
            console.log('   2. Refresh the Dashboard page');
            console.log('   3. Your Credit Score Card should show 765');
            console.log('   4. Click "View Detailed Report"');
            console.log(`   5. You should see all ${myRealCards.length} credit cards\n`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data?.message || error.message);
        console.error('\n💡 Fix:');
        console.error('   1. Update email/password in this script');
        console.error('   2. Make sure backend is running');
        console.error('   3. Edit myRealCards with your actual credit cards\n');
    }
}

updateMyRealData();
