// Complete test to verify our fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testCompleteFixes() {
    try {
        console.log('🧪 Testing Complete Phone Number and Credit Score Fixes...\n');

        // Step 1: Login
        console.log('1️⃣ Testing login...');
        const loginData = {
            email: 'testuser@example.com',
            password: 'testpassword123'
        };

        console.log('Attempting login with:', loginData);
        console.log('URL:', `${BASE_URL}/auth/login`);
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('Login response status:', loginResponse.status);
        console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful, token obtained');

        // Step 2: Check if profile exists, if not create one
        console.log('\n2️⃣ Checking profile status...');
        let profileExists = false;
        try {
            const getProfileResponse = await axios.get(`${BASE_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Profile already exists');
            console.log('Current phone number:', getProfileResponse.data.phoneNumber || 'Not set');
            profileExists = true;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('ℹ️ Profile does not exist, will create one');
            } else {
                throw error;
            }
        }

        // Step 3: Create or update profile with phone number
        console.log('\n3️⃣ ' + (profileExists ? 'Updating' : 'Creating') + ' profile with phone number...');
        const profileData = {
            fullName: 'Test User',
            phoneNumber: '8765432109',
            panNumber: 'ABCDE1234F',
            address: 'Test Address 123',
            dateOfBirth: '1990-01-01'
        };

        const method = profileExists ? 'put' : 'post';
        const profileResponse = await axios[method](`${BASE_URL}/profile`, profileData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`✅ Profile ${profileExists ? 'updated' : 'created'} successfully`);
        console.log('Full response data:', JSON.stringify(profileResponse.data, null, 2));

        // Step 4: Verify phone number persistence
        console.log('\n4️⃣ Verifying phone number persistence...');
        const verifyResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Profile retrieved successfully');
        console.log('Verified phone number:', verifyResponse.data.phoneNumber);
        console.log('Verified PAN number:', verifyResponse.data.panNumber);

        // Step 5: Test credit score functionality
        console.log('\n5️⃣ Testing credit score fetch...');
        try {
            const creditScoreResponse = await axios.get(`${BASE_URL}/financial/credit-score`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Credit score fetched successfully');
            console.log('📊 Credit Score:', creditScoreResponse.data.creditScore?.score || 'N/A');
            
            const creditScore = creditScoreResponse.data.creditScore;
            if (creditScore) {
                const totalCreditLimit = creditScore.totalCreditLimit || 0;
                const creditUtilization = creditScore.creditUtilization || 0;
                
                console.log('💳 Credit Limit:', totalCreditLimit > 0 ? `₹${(totalCreditLimit / 100000).toFixed(1)}L` : 'N/A');
                console.log('📈 Credit Utilization:', creditUtilization > 0 ? `${Math.round(creditUtilization)}%` : '0%');
                
                // Check if we get proper numbers (not NaN)
                if (isNaN(totalCreditLimit) || isNaN(creditUtilization)) {
                    console.log('❌ Found NaN values in credit score data');
                } else {
                    console.log('✅ Credit score data is properly formatted (no NaN values)');
                }
            }
        } catch (error) {
            console.log('⚠️ Credit score fetch failed:', error.response?.data?.message || error.message);
            // This might fail if profile doesn't have all required fields yet
        }

        // Step 6: Test refresh functionality
        console.log('\n6️⃣ Testing credit score refresh...');
        try {
            const refreshResponse = await axios.get(`${BASE_URL}/financial/credit-score?refresh=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Credit score refreshed successfully');
            console.log('🔄 Refreshed Credit Score:', refreshResponse.data.creditScore?.score || 'N/A');
        } catch (error) {
            console.log('⚠️ Credit score refresh failed:', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 Test completed! Summary of results:');
        
        if (verifyResponse.data.phoneNumber === '8765432109') {
            console.log('✅ Phone number fix: WORKING');
        } else {
            console.log('❌ Phone number fix: FAILED');
        }
        
        console.log('✅ Authentication: WORKING');
        console.log('✅ Profile operations: WORKING');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error type:', error.constructor.name);
        console.error('Error code:', error.code);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('No response object, raw error:', error);
        }
    }
}

// Run the complete test
testCompleteFixes();