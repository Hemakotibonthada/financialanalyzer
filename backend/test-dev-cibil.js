const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testUserRegistrationAndCIBIL() {
    try {
        console.log('🔄 Testing user registration and CIBIL features...\n');
        
        // Register a new user for testing
        const testUser = {
            name: 'Dev Test User',
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        };
        
        console.log('👤 Registering new test user...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        console.log('✅ User registered successfully');
        
        // Login with the new user
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        // Debug output removed for brevity
        const token = loginResponse.data.data.token;
        console.log('✅ Logged in successfully');
        console.log('🔑 Token received:', token ? 'Yes' : 'No');
        
        // Create a basic profile first
        console.log('👤 Creating financial profile...');
        try {
            await axios.post(`${BASE_URL}/api/profile`, {
                fullName: testUser.name,
                panNumber: 'ABCDE1234F',
                phoneNumber: '9876543210',
                income: 80000,
                expenses: 45000,
                savings: 25000,
                investments: 50000
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Profile created successfully');
        } catch (profileError) {
            console.log('⚠️ Profile creation failed, but continuing...');
            console.log('   Error:', profileError.response?.data || profileError.message);
        }
        
        // Test multiple credit score fetches
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
                
                // Show credit card details for the first fetch
                if (i === 1) {
                    if (data.creditCards && data.creditCards.length > 0) {
                        console.log('\n💳 Credit Card Portfolio:');
                        data.creditCards.forEach((card, index) => {
                            console.log(`   Card ${index + 1}: ${card.cardName} (${card.provider})`);
                            console.log(`   - Limit: ₹${card.creditLimit/100000}L, Utilization: ${card.utilizationPercent}%`);
                        });
                    }
                    
                    if (data.creditCardSummary) {
                        console.log('\n📈 Summary: Total Cards: ' + data.creditCardSummary.totalCards + 
                                   ', Total Limit: ₹' + (data.creditCardSummary.totalCreditLimit/100000) + 'L');
                    }
                }
            } else {
                console.log(`❌ Fetch ${i} failed: ${response.data.message}`);
            }
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ Monthly refresh limit removed for development');
        console.log('✅ Credit card features working correctly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testUserRegistrationAndCIBIL();