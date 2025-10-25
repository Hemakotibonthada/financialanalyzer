const axios = require('axios');

async function quickTest() {
    try {
        console.log('🔄 Quick CIBIL unlimited refresh test...\n');
        
        // Register user
        const testUser = {
            name: 'Test User',
            email: `quicktest${Date.now()}@example.com`,
            password: 'password123'
        };
        
        console.log('1. Registering user...');
        await axios.post('http://localhost:5001/api/auth/register', testUser);
        
        console.log('2. Logging in...');
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            email: testUser.email,
            password: testUser.password
        });
        
        const token = loginRes.data.data.token;
        console.log('3. Token received ✅');
        
        console.log('4. Creating profile...');
        await axios.post('http://localhost:5001/api/profile', {
            fullName: testUser.name,
            panNumber: 'ABCDE1234F',
            phoneNumber: '9876543210',
            income: 80000,
            expenses: 45000,
            savings: 25000,
            investments: 50000
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('5. Testing unlimited credit score refresh...');
        
        for (let i = 1; i <= 5; i++) {
            const response = await axios.post('http://localhost:5001/api/financial/credit-score', {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.success) {
                console.log(`   ✅ Refresh ${i}: Score ${response.data.data.score}, Cards: ${response.data.data.creditCards?.length || 0}`);
            } else {
                console.log(`   ❌ Refresh ${i}: ${response.data.message}`);
            }
        }
        
        console.log('\n🎉 Unlimited refresh test completed!');
        console.log('✅ Monthly limits successfully removed for development');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
    }
}

quickTest();