// Fix the credit score data by updating the profile with missing fields
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function fixCreditScoreData() {
    try {
        console.log('🔧 Fixing credit score data...\n');

        // Login with the same user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testuser@example.com',
            password: 'testpassword123'
        });
        const token = loginResponse.data.data.token;
        console.log('✅ Logged in as:', loginResponse.data.data.user.email);

        // Get current profile
        const profileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileResponse.data.success) {
            const profile = profileResponse.data.data.profile;
            console.log('📋 Current profile user ID:', profile.userId);
            console.log('💳 Current credit score data:');
            console.log('   Score:', profile.creditScore?.score);
            console.log('   Total Credit Limit:', profile.creditScore?.totalCreditLimit);
            console.log('   Credit Utilization:', profile.creditScore?.creditUtilization);

            // If the credit score exists but missing key fields, fix it
            if (profile.creditScore?.score && (!profile.creditScore?.totalCreditLimit || profile.creditScore?.creditUtilization === undefined)) {
                console.log('\n🔧 Fixing missing credit score fields...');

                // Update the credit score with the missing fields
                const updatedCreditScore = {
                    ...profile.creditScore,
                    totalCreditLimit: profile.creditScore.totalCreditLimit || 500000,
                    creditUtilization: profile.creditScore.creditUtilization !== undefined ? profile.creditScore.creditUtilization : 30
                };

                // Update the profile via the profile update endpoint
                const updateResponse = await axios.put(`${BASE_URL}/profile`, {
                    fullName: profile.fullName,
                    phoneNumber: profile.phoneNumber,
                    panNumber: profile.panNumber,
                    dateOfBirth: profile.dateOfBirth,
                    address: profile.address
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (updateResponse.data.success) {
                    console.log('✅ Profile updated successfully');

                    // Verify the fix worked
                    const verifyResponse = await axios.get(`${BASE_URL}/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (verifyResponse.data.success) {
                        const updatedProfile = verifyResponse.data.data.profile;
                        console.log('\n🎯 Verified updated credit score:');
                        console.log('   Score:', updatedProfile.creditScore?.score);
                        console.log('   Total Credit Limit:', updatedProfile.creditScore?.totalCreditLimit);
                        console.log('   Credit Utilization:', updatedProfile.creditScore?.creditUtilization);

                        if (updatedProfile.creditScore?.totalCreditLimit && updatedProfile.creditScore?.creditUtilization !== undefined) {
                            console.log('\n🎉 SUCCESS! Credit score data is now complete.');
                            console.log('💡 Refresh your browser to see the updated values:');
                            console.log(`   Credit Limit: ₹${(updatedProfile.creditScore.totalCreditLimit / 100000).toFixed(1)}L`);
                            console.log(`   Utilization: ${Math.round(updatedProfile.creditScore.creditUtilization)}%`);
                        } else {
                            console.log('❌ Fix did not work properly');
                        }
                    }
                }
            } else {
                console.log('\n✅ Credit score data is already complete or missing score entirely');
                if (profile.creditScore?.totalCreditLimit && profile.creditScore?.creditUtilization !== undefined) {
                    console.log('💡 The data should already be displaying correctly');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
    }
}

fixCreditScoreData();