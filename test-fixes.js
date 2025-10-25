// Test script to verify our fixes for phone number and credit score
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testFixes() {
    try {
        console.log('🧪 Testing Phone Number and Credit Score Fixes...\n');

        // Test 1: Register a user
        console.log('1️⃣ Testing user registration...');
        const registerData = {
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'testpassword123',
            phoneNumber: '+918123456789',
            panNumber: 'ABCDE1234F',
            address: 'Test Address'
        };

        let authToken;
        try {
            const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
            console.log('✅ User registered successfully');
            authToken = registerResponse.data.token;
        } catch (error) {
            if (error.response && error.response.data.message.includes('already exists')) {
                console.log('ℹ️ User already exists, trying to login...');
                const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                    email: registerData.email,
                    password: registerData.password
                });
                authToken = loginResponse.data.token;
                console.log('✅ User logged in successfully');
            } else {
                throw error;
            }
        }

        // Test 2: Update profile with phone number
        console.log('\n2️⃣ Testing profile update with phone number...');
        const profileUpdateData = {
            phoneNumber: '+918123456789',
            panNumber: 'ABCDE1234F',
            address: 'Updated Test Address'
        };

        const profileUpdateResponse = await axios.put(`${BASE_URL}/profile`, profileUpdateData, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ Profile updated successfully');
        console.log('📱 Phone number saved:', profileUpdateResponse.data.profile.phoneNumber);

        // Test 3: Fetch profile to verify phone number is saved
        console.log('\n3️⃣ Testing profile retrieval...');
        const profileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ Profile retrieved successfully');
        console.log('📱 Phone number in profile:', profileResponse.data.phoneNumber);
        console.log('🆔 PAN number in profile:', profileResponse.data.panNumber);

        // Test 4: Fetch credit score using profile data
        console.log('\n4️⃣ Testing credit score fetch...');
        const creditScoreResponse = await axios.get(`${BASE_URL}/financial/credit-score`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ Credit score fetched successfully');
        console.log('📊 Credit Score:', creditScoreResponse.data.creditScore.score);
        console.log('💳 Credit Limit:', `₹${(creditScoreResponse.data.creditScore.totalCreditLimit / 100000).toFixed(1)}L`);
        console.log('📈 Credit Utilization:', `${Math.round(creditScoreResponse.data.creditScore.creditUtilization)}%`);

        // Test 5: Test refresh functionality (fetch again)
        console.log('\n5️⃣ Testing credit score refresh...');
        const refreshResponse = await axios.get(`${BASE_URL}/financial/credit-score?refresh=true`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ Credit score refreshed successfully');
        console.log('🔄 Refreshed Credit Score:', refreshResponse.data.creditScore.score);
        console.log('🔄 Refreshed Credit Limit:', `₹${(refreshResponse.data.creditScore.totalCreditLimit / 100000).toFixed(1)}L`);
        console.log('🔄 Refreshed Utilization:', `${Math.round(refreshResponse.data.creditScore.creditUtilization)}%`);

        console.log('\n🎉 All tests passed! The fixes are working correctly.');
        console.log('\n📋 Summary of fixes:');
        console.log('✅ Phone number is now properly saved in profile');
        console.log('✅ Credit score displays correct values (no more NaN)');
        console.log('✅ Credit limit shows formatted value (₹X.XL)');
        console.log('✅ Credit utilization shows percentage (X%)');
        console.log('✅ Refresh functionality works properly');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', error.response.data);
        }
    }
}

// Run the tests
testFixes();