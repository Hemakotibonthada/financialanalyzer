// Test fetching fresh credit score now that monthly limit is disabled
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testUnlimitedRefresh() {
    try {
        console.log('🔄 Testing unlimited credit score refresh...\n');

        // Login
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testuser@example.com',
            password: 'testpassword123'
        });
        const token = loginResponse.data.data.token;
        console.log('✅ Logged in successfully');

        // Try to fetch credit score (should work now)
        console.log('\n📊 Fetching fresh credit score...');
        const creditResponse = await axios.post(`${BASE_URL}/financial/credit-score`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (creditResponse.data.success) {
            console.log('✅ Credit score fetched successfully!');
            console.log('\n💳 Updated Credit Score:');
            console.log('   Score:', creditResponse.data.data.score);
            console.log('   Grade:', creditResponse.data.data.grade);
            console.log('   Total Credit Limit:', creditResponse.data.data.totalCreditLimit ? `₹${(creditResponse.data.data.totalCreditLimit / 100000).toFixed(1)}L` : 'N/A');
            console.log('   Credit Utilization:', creditResponse.data.data.creditUtilization ? `${creditResponse.data.data.creditUtilization}%` : 'N/A');
            console.log('   Last Updated:', new Date(creditResponse.data.data.lastUpdated).toLocaleString());

            if (creditResponse.data.data.creditCards) {
                console.log(`\n💳 Credit Cards: ${creditResponse.data.data.creditCards.length} cards`);
                creditResponse.data.data.creditCards.slice(0, 3).forEach((card, index) => {
                    console.log(`   ${index + 1}. ${card.cardName} - Limit: ₹${(card.creditLimit / 100000).toFixed(1)}L`);
                });
            }

            console.log('\n🎉 Monthly limit has been removed for development!');
            console.log('💡 You can now refresh the credit score as many times as needed.');
            console.log('🔄 Try clicking the Refresh button in your browser now.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        if (error.response?.status === 429) {
            console.log('⚠️ Monthly limit is still active - backend might need restart');
        }
    }
}

testUnlimitedRefresh();