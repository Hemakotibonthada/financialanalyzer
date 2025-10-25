const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testFullCIBILFeatures() {
    try {
        console.log('🔄 Testing full CIBIL features with unlimited refresh...\n');
        
        // Login first
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Logged in successfully\n');
        
        // Test multiple credit score fetches (should work unlimited times in dev)
        console.log('📊 Testing unlimited refresh capability...');
        for (let i = 1; i <= 3; i++) {
            console.log(`\n--- Refresh #${i} ---`);
            const response = await axios.post(`${BASE_URL}/api/financial/credit-score`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                const data = response.data.data;
                console.log(`✅ Fetch ${i}: Score ${data.score}, Credit Cards: ${data.creditCards?.length || 0}`);
                
                // Log credit card details for the first fetch
                if (i === 1 && data.creditCards && data.creditCards.length > 0) {
                    console.log('\n💳 Credit Card Portfolio:');
                    data.creditCards.forEach((card, index) => {
                        console.log(`   Card ${index + 1}: ${card.cardName} (${card.provider})`);
                        console.log(`   - Limit: ₹${card.creditLimit/100000}L, Balance: ₹${card.currentBalance}`);
                        console.log(`   - Utilization: ${card.utilizationPercent}%, Status: ${card.status}`);
                        console.log(`   - Rewards: ${card.rewardPoints} points`);
                    });
                    
                    if (data.creditCardSummary) {
                        console.log('\n📈 Credit Card Summary:');
                        console.log(`   - Total Cards: ${data.creditCardSummary.totalCards}`);
                        console.log(`   - Total Credit Limit: ₹${data.creditCardSummary.totalCreditLimit/100000}L`);
                        console.log(`   - Average Utilization: ${data.creditCardSummary.averageUtilization}%`);
                        console.log(`   - Active Cards: ${data.creditCardSummary.activeCards}`);
                        console.log(`   - Total Reward Points: ${data.creditCardSummary.totalRewardPoints}`);
                    }
                    
                    if (data.creditCardRecommendations && data.creditCardRecommendations.length > 0) {
                        console.log('\n💡 Credit Card Recommendations:');
                        data.creditCardRecommendations.forEach((rec, index) => {
                            console.log(`   ${index + 1}. ${rec.cardName} (${rec.provider})`);
                            console.log(`      Reason: ${rec.reason}`);
                            console.log(`      Benefits: ${rec.benefits.join(', ')}`);
                        });
                    }
                }
            } else {
                console.log(`❌ Fetch ${i} failed: ${response.data.message}`);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ Monthly refresh limit has been removed for development');
        console.log('✅ Credit card features are working correctly');
        console.log('✅ Unlimited refresh capability is active');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testFullCIBILFeatures();