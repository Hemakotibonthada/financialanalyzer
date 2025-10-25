// Debug test to check token generation and usage
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function debugAuth() {
    try {
        console.log('🔍 Debugging authentication process...\n');

        // Test login and examine the response
        console.log('1️⃣ Testing login to get token details...');
        const loginData = {
            email: 'testuser@example.com',
            password: 'testpassword123'
        };

        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('✅ Login response received');
        console.log('Response data keys:', Object.keys(loginResponse.data));
        console.log('Data object keys:', Object.keys(loginResponse.data.data || {}));
        console.log('Token exists:', !!loginResponse.data.data?.token);
        console.log('Token type:', typeof loginResponse.data.data?.token);
        
        if (loginResponse.data.data?.token) {
            const token = loginResponse.data.data.token;
            console.log('Token length:', token.length);
            console.log('Token preview:', token.substring(0, 20) + '...');
            
            // Try to use the token immediately
            console.log('\n2️⃣ Testing token immediately after login...');
            try {
                const profileResponse = await axios.get(`${BASE_URL}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('✅ Profile accessed successfully with fresh token');
                console.log('Profile data keys:', Object.keys(profileResponse.data));
            } catch (tokenError) {
                console.error('❌ Token failed immediately:', tokenError.response?.data?.message || tokenError.message);
                console.error('Status:', tokenError.response?.status);
            }
        } else {
            console.error('❌ No token in login response');
        }

    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.message || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the debug
debugAuth();