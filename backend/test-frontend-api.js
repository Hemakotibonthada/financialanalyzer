// Test the exact same API call that the frontend is making
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testFrontendAPICall() {
    try {
        console.log('🔍 Testing exact frontend API call...\n');

        // Step 1: Login (same as frontend would do)
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testuser@example.com', // Make sure this matches your frontend login
            password: 'testpassword123'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        console.log('🆔 User ID:', loginResponse.data.data.user.id);
        console.log('📧 Email:', loginResponse.data.data.user.email);

        // Step 2: Make the exact same call the frontend makes
        console.log('\n📡 Making profile API call...');
        const profileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Profile API call successful');
        console.log('📋 Response structure:', Object.keys(profileResponse.data));

        if (profileResponse.data.success && profileResponse.data.data?.profile) {
            const profile = profileResponse.data.data.profile;
            console.log('\n🎯 Profile data:');
            console.log('   User ID:', profile.userId);
            console.log('   Full Name:', profile.fullName);
            console.log('   Phone:', profile.phoneNumber);

            if (profile.creditScore) {
                console.log('\n💳 Credit Score object exists:');
                console.log('   Score:', profile.creditScore.score);
                console.log('   Grade:', profile.creditScore.grade);
                console.log('   Total Credit Limit:', profile.creditScore.totalCreditLimit);
                console.log('   Credit Utilization:', profile.creditScore.creditUtilization);
                console.log('   Last Updated:', profile.creditScore.lastUpdated);

                // Show what the frontend would log
                console.log('\n🖥️ What frontend console should show:');
                console.log('Credit score found in profile:', {
                    score: profile.creditScore.score,
                    totalCreditLimit: profile.creditScore.totalCreditLimit,
                    creditUtilization: profile.creditScore.creditUtilization,
                    grade: profile.creditScore.grade
                });

                // Check if values are actually undefined
                if (profile.creditScore.totalCreditLimit === undefined) {
                    console.log('❌ totalCreditLimit is undefined in the API response');
                } else {
                    console.log(`✅ totalCreditLimit is valid: ${profile.creditScore.totalCreditLimit}`);
                }

                if (profile.creditScore.creditUtilization === undefined) {
                    console.log('❌ creditUtilization is undefined in the API response');
                } else {
                    console.log(`✅ creditUtilization is valid: ${profile.creditScore.creditUtilization}`);
                }
            } else {
                console.log('❌ No creditScore object found in profile');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testFrontendAPICall();