const axios = require('axios');

async function testCreditCards() {
    try {
        console.log('🔄 Testing credit card generation...\n');
        
        // Register and login
        const testUser = {
            name: 'Credit Card Test',
            email: `cardtest${Date.now()}@example.com`,
            password: 'password123'
        };
        
        console.log('1. Setting up user...');
        await axios.post('http://localhost:5001/api/auth/register', testUser);
        
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            email: testUser.email,
            password: testUser.password
        });
        
        const token = loginRes.data.data.token;
        
        await axios.post('http://localhost:5001/api/profile', {
            fullName: testUser.name,
            panNumber: 'ABCDE1234F',
            phoneNumber: '9876543210',
            income: 80000,
            expenses: 45000,
            savings: 25000,
            investments: 50000
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('2. Fetching credit score with full details...');
        const response = await axios.post('http://localhost:5001/api/financial/credit-score', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            console.log('\n📊 Credit Score Response:');
            console.log(`   Score: ${data.score}`);
            console.log(`   Total Credit: ₹${data.totalCredit/100000}L`);
            console.log(`   Available Credit: ₹${data.availableCredit/100000}L`);
            console.log(`   Credit Cards: ${data.creditCards?.length || 0}`);
            
            if (data.creditCards && data.creditCards.length > 0) {
                console.log('\n💳 Credit Card Details:');
                data.creditCards.forEach((card, i) => {
                    console.log(`   ${i+1}. ${card.cardName} (${card.provider})`);
                    console.log(`      Limit: ₹${card.creditLimit/100000}L, Balance: ₹${card.currentBalance}`);
                });
            } else {
                console.log('\n⚠️ No credit cards generated!');
            }
            
            if (data.creditCardSummary) {
                console.log('\n📈 Credit Card Summary:');
                console.log(`   Total Cards: ${data.creditCardSummary.totalCards}`);
                console.log(`   Total Limit: ₹${data.creditCardSummary.totalCreditLimit/100000}L`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testCreditCards();