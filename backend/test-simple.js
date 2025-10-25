// Simple test to verify the profile route fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testAuthAndProfile() {
    try {
        console.log('🔐 Testing authentication and profile fixes...\n');

        // Test user registration/login with phone number
        console.log('1️⃣ Testing login...');
        const loginData = {
            email: 'testuser@example.com',
            password: 'testpassword123'
        };

        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        const token = loginResponse.data.token;
        console.log('✅ Login successful, token obtained');

        // Test profile retrieval
        console.log('\n2️⃣ Testing profile retrieval...');
        const getProfileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Profile retrieved successfully');
        console.log('Current phone number:', getProfileResponse.data.phoneNumber || 'Not set');
        console.log('Current PAN number:', getProfileResponse.data.panNumber || 'Not set');

        // Test profile update with phone number
        console.log('\n3️⃣ Testing profile update...');
        const updateData = {
            phoneNumber: '+918765432109',
            panNumber: 'ABCDE1234F',
            address: 'Test Address 123'
        };

        const updateResponse = await axios.put(`${BASE_URL}/profile`, updateData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Profile update successful');
        console.log('Updated phone number:', updateResponse.data.profile.phoneNumber);

        // Verify the update persisted
        console.log('\n4️⃣ Verifying phone number was saved...');
        const verifyResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Profile re-fetched successfully');
        console.log('Verified phone number:', verifyResponse.data.phoneNumber);
        console.log('Verified PAN number:', verifyResponse.data.panNumber);

        if (verifyResponse.data.phoneNumber === '+918765432109') {
            console.log('\n🎉 SUCCESS: Phone number fix is working!');
        } else {
            console.log('\n❌ FAILURE: Phone number was not saved properly');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testAuthAndProfile();