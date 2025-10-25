// Test to refresh credit score data with new enhanced features
const axios = require('axios');
const FinancialProfile = require('./models/FinancialProfile');
const connectDB = require('./config/database');

const BASE_URL = 'http://localhost:5001/api';

async function resetAndFetchCreditScore() {
    try {
        console.log('🔄 Resetting and fetching enhanced credit score...\n');

        // Login
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testuser@example.com',
            password: 'testpassword123'
        });
        const token = loginResponse.data.data.token;
        console.log('✅ Logged in successfully');

        // Connect to database to manually reset credit score
        console.log('🔌 Connecting to database...');
        await connectDB();
        
        // Find and reset the user's credit score
        const profile = await FinancialProfile.findOne({ userId: '68fb8357b1da093136e00d4b' });
        if (profile && profile.creditScore) {
            console.log('🗑️ Removing existing credit score to allow fresh fetch...');
            profile.creditScore = {
                factors: [],
                recommendations: []
            };
            await profile.save();
            console.log('✅ Credit score reset');
        }

        // Fetch fresh credit score with enhanced features
        console.log('\n📊 Fetching fresh credit score with credit cards...');
        const creditResponse = await axios.post(`${BASE_URL}/financial/credit-score`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (creditResponse.data.success) {
            console.log('✅ Credit score fetched successfully!');
            console.log('\n📋 Credit Score Summary:');
            console.log('Score:', creditResponse.data.data.score);
            console.log('Grade:', creditResponse.data.data.grade);
            console.log('Total Credit Limit:', `₹${(creditResponse.data.data.totalCreditLimit / 100000).toFixed(1)}L`);
            console.log('Credit Utilization:', `${creditResponse.data.data.creditUtilization}%`);
            
            if (creditResponse.data.data.creditCards) {
                console.log(`\n💳 Credit Cards: ${creditResponse.data.data.creditCards.length} cards found`);
                creditResponse.data.data.creditCards.forEach((card, index) => {
                    console.log(`  ${index + 1}. ${card.cardName} (${card.bank})`);
                    console.log(`     Limit: ₹${(card.creditLimit / 100000).toFixed(1)}L | Balance: ₹${Math.floor(card.currentBalance/1000)}K | Utilization: ${card.utilizationPercent}%`);
                });
                
                console.log(`\n📊 Credit Card Summary:`);
                console.log(`Total Cards: ${creditResponse.data.data.creditCardSummary.totalCards}`);
                console.log(`Total Limit: ₹${(creditResponse.data.data.creditCardSummary.totalCreditLimit / 100000).toFixed(1)}L`);
                console.log(`Average Utilization: ${creditResponse.data.data.creditCardSummary.averageUtilization}%`);
                console.log(`Total Reward Points: ${creditResponse.data.data.creditCardSummary.totalRewardPoints.toLocaleString()}`);
            }
            
            console.log('\n🎉 Now refresh your browser to see the updated data!');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
    
    process.exit(0);
}

resetAndFetchCreditScore();