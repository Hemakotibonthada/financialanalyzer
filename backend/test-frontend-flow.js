// Test to simulate exactly what the frontend CreditScoreCard should be doing
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function simulateFrontendFlow() {
    try {
        console.log('🎭 Simulating Frontend CreditScoreCard Flow...\n');

        // Step 1: Login (simulate existing login)
        const loginData = {
            email: 'testuser@example.com',
            password: 'testpassword123'
        };

        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        const token = loginResponse.data.data.token;
        console.log('✅ User authenticated');

        // Step 2: Check profile status (what frontend does on load)
        console.log('\n📋 Step 2: Checking profile status...');
        const statusResponse = await axios.get(`${BASE_URL}/financial/profile-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statusResponse.data.success) {
            const { canFetchCreditScore, hasProfile, missingFields, hasCreditScore, lastCreditUpdate } = statusResponse.data.data;
            
            console.log('Profile complete:', hasProfile && canFetchCreditScore);
            console.log('Has existing credit score:', hasCreditScore);
            console.log('Missing fields:', missingFields);

            if (!hasProfile || !canFetchCreditScore) {
                console.log(`❌ Profile incomplete: ${missingFields.join(', ')} required for credit score`);
                return;
            }

            // Step 3: Load existing credit score if available (what frontend should do)
            if (hasCreditScore) {
                console.log('\n📊 Step 3: Loading existing credit score from profile...');
                const profileResponse = await axios.get(`${BASE_URL}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (profileResponse.data.success && profileResponse.data.data?.profile?.creditScore) {
                    const creditScore = profileResponse.data.data.profile.creditScore;
                    console.log('✅ Credit score loaded from profile:');
                    
                    // Simulate frontend display logic
                    console.log('🏆 Credit Score:', creditScore.score);
                    console.log('📈 Grade:', creditScore.grade);
                    
                    const totalCreditLimit = creditScore.totalCreditLimit || 0;
                    const creditUtilization = creditScore.creditUtilization || 0;
                    
                    console.log('💳 Credit Limit Display:', totalCreditLimit > 0 ? `₹${(totalCreditLimit / 100000).toFixed(1)}L` : '₹0.0L');
                    console.log('📊 Utilization Display:', creditUtilization > 0 ? `${Math.round(creditUtilization)}%` : '0%');
                    console.log('📅 Last Updated:', new Date(creditScore.lastUpdated).toLocaleDateString());
                    
                    // Check monthly limit status
                    if (lastCreditUpdate) {
                        const lastUpdate = new Date(lastCreditUpdate);
                        const now = new Date();
                        const daysSinceLastFetch = (now - lastUpdate) / (1000 * 60 * 60 * 24);
                        const canFetchThisMonth = daysSinceLastFetch >= 30;
                        
                        console.log('🔄 Can refresh this month:', canFetchThisMonth ? 'Yes' : 'No');
                        if (!canFetchThisMonth) {
                            const nextFetchDate = new Date(lastUpdate.getTime() + 30 * 24 * 60 * 60 * 1000);
                            console.log('📅 Next refresh available:', nextFetchDate.toLocaleDateString());
                        }
                    }

                    console.log('\n🎉 SUCCESS: Credit score should display correctly!');
                    console.log('\nWhat you should see on the frontend:');
                    console.log(`• Credit Score: ${creditScore.score} (${creditScore.grade})`);
                    console.log(`• Credit Limit: ₹${(totalCreditLimit / 100000).toFixed(1)}L`);
                    console.log(`• Utilization: ${Math.round(creditUtilization)}%`);
                    console.log(`• Last Updated: ${new Date(creditScore.lastUpdated).toLocaleDateString()}`);

                } else {
                    console.log('❌ Credit score not found in profile data');
                }
            } else {
                console.log('ℹ️ No existing credit score - user needs to fetch first');
            }
        }

    } catch (error) {
        console.error('❌ Simulation failed:', error.response?.data?.message || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
    }
}

// Run the simulation
simulateFrontendFlow();