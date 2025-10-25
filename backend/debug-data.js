// Debug script to check the actual profile and credit score data
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function debugDataRendering() {
    try {
        console.log('🔍 Debugging data rendering issues...\n');

        // Step 1: Login to get token
        console.log('1️⃣ Getting authentication token...');
        const loginData = {
            email: 'testuser@example.com',
            password: 'testpassword123'
        };

        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        const token = loginResponse.data.data.token;
        console.log('✅ Token obtained successfully');

        // Step 2: Check profile data
        console.log('\n2️⃣ Checking profile data...');
        try {
            const profileResponse = await axios.get(`${BASE_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Profile data retrieved:');
            console.log('Profile keys:', Object.keys(profileResponse.data));
            console.log('Full profile:', JSON.stringify(profileResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Profile fetch failed:', error.response?.data?.message || error.message);
            if (error.response?.status === 404) {
                console.log('ℹ️ Profile doesn\'t exist - this might be why data isn\'t rendering');
                
                // Try to create profile
                console.log('\n📝 Creating profile...');
                const createProfileData = {
                    fullName: 'Test User',
                    phoneNumber: '8765432109',
                    panNumber: 'ABCDE1234F',
                    address: 'Test Address 123',
                    dateOfBirth: '1990-01-01'
                };
                
                const createResponse = await axios.post(`${BASE_URL}/profile`, createProfileData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('✅ Profile created successfully');
                console.log('Created profile:', JSON.stringify(createResponse.data, null, 2));
            }
        }

        // Step 3: Check credit score data
        console.log('\n3️⃣ Checking credit score data...');
        try {
            const creditResponse = await axios.post(`${BASE_URL}/financial/credit-score`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Credit score data retrieved:');
            console.log('Credit score keys:', Object.keys(creditResponse.data));
            console.log('Credit score data:', JSON.stringify(creditResponse.data, null, 2));
            
            // Check specific values that should display
            const creditScore = creditResponse.data.creditScore;
            if (creditScore) {
                console.log('\n📊 Credit Score Analysis:');
                console.log('Score:', creditScore.score);
                console.log('Total Credit Limit:', creditScore.totalCreditLimit);
                console.log('Credit Utilization:', creditScore.creditUtilization);
                console.log('Grade:', creditScore.grade);
                
                // Check if values are valid numbers
                console.log('\n🧮 Value Validation:');
                console.log('totalCreditLimit is number:', typeof creditScore.totalCreditLimit === 'number');
                console.log('totalCreditLimit is NaN:', isNaN(creditScore.totalCreditLimit));
                console.log('creditUtilization is number:', typeof creditScore.creditUtilization === 'number');
                console.log('creditUtilization is NaN:', isNaN(creditScore.creditUtilization));
                
                // Show formatted display values
                console.log('\n💰 Display Format:');
                console.log('Credit Limit Display:', creditScore.totalCreditLimit ? `₹${(creditScore.totalCreditLimit / 100000).toFixed(1)}L` : '₹0.0L');
                console.log('Utilization Display:', creditScore.creditUtilization ? `${Math.round(creditScore.creditUtilization)}%` : '0%');
            } else {
                console.log('❌ No creditScore object in response');
            }
        } catch (error) {
            console.log('❌ Credit score fetch failed:', error.response?.data?.message || error.message);
            console.log('Status:', error.response?.status);
            if (error.response?.data) {
                console.log('Error details:', JSON.stringify(error.response.data, null, 2));
            }
        }

        // Step 4: Check profile status endpoint
        console.log('\n4️⃣ Checking profile status endpoint...');
        try {
            const profileStatusResponse = await axios.get(`${BASE_URL}/financial/profile-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Profile status retrieved:');
            console.log('Profile status data:', JSON.stringify(profileStatusResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Profile status fetch failed:', error.response?.data?.message || error.message);
        }

        // Step 5: Check dashboard data
        console.log('\n5️⃣ Checking dashboard data...');
        try {
            const dashboardResponse = await axios.get(`${BASE_URL}/analytics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Dashboard data retrieved');
            console.log('Dashboard summary:', dashboardResponse.data.data?.summary || 'No summary found');
        } catch (error) {
            console.log('❌ Dashboard fetch failed:', error.response?.data?.message || error.message);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the debug
debugDataRendering();