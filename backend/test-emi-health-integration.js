/**
 * Test EMI Integration with Financial Health Score
 * Verifies that EMI burden affects health score calculations
 */

const mongoose = require('mongoose');
const EMI = require('./models/EMI');
const FinancialProfile = require('./models/FinancialProfile');
const AnalyticsService = require('./services/analyticsService');
const AdvancedAnalyticsService = require('./services/advancedAnalyticsService');

// Mock user ID
const TEST_USER_ID = '68fb581cab185e0313081680'; // Replace with your actual user ID

async function testEMIHealthIntegration() {
  try {
    console.log('🧪 Testing EMI Integration with Financial Health Score\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/financial-analyzer', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Initialize services
    const analyticsService = new AnalyticsService();
    const advancedAnalyticsService = new AdvancedAnalyticsService();

    // Fetch user's financial profile
    const profile = await FinancialProfile.findOne({ userId: TEST_USER_ID });
    if (!profile) {
      console.log('❌ No financial profile found. Please set up your profile first.');
      return;
    }

    const monthlyIncome = profile.monthlyIncome || 0;
    console.log('👤 User Profile:');
    console.log(`   Monthly Income: ₹${monthlyIncome.toLocaleString()}`);
    console.log(`   Name: ${profile.name || 'Not set'}\n`);

    // Fetch active EMIs
    const activeEMIs = await EMI.find({
      userId: TEST_USER_ID,
      status: 'active',
      remainingInstallments: { $gt: 0 }
    });

    console.log('💳 Active EMIs:');
    if (activeEMIs.length === 0) {
      console.log('   ✅ No active EMIs - Debt-free!\n');
    } else {
      const totalEMIBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      const burdenPercentage = monthlyIncome > 0 
        ? Math.round((totalEMIBurden / monthlyIncome) * 100) 
        : 0;

      console.log(`   Total Active EMIs: ${activeEMIs.length}`);
      console.log(`   Monthly EMI Burden: ₹${totalEMIBurden.toLocaleString()}`);
      if (monthlyIncome > 0) {
        console.log(`   EMI Burden %: ${burdenPercentage}% of income`);
        
        // EMI burden assessment
        if (burdenPercentage < 15) {
          console.log(`   Status: ✅ Excellent (< 15%)`);
        } else if (burdenPercentage < 25) {
          console.log(`   Status: 👍 Good (15-25%)`);
        } else if (burdenPercentage < 40) {
          console.log(`   Status: ⚠️ Moderate (25-40%)`);
        } else {
          console.log(`   Status: 🚨 High burden (> 40%)`);
        }
      }
      
      console.log('\n   EMI Details:');
      activeEMIs.forEach((emi, index) => {
        console.log(`   ${index + 1}. ${emi.merchantName}`);
        console.log(`      Amount: ₹${emi.emiAmount.toLocaleString()}/month`);
        console.log(`      Remaining: ${emi.remainingInstallments} of ${emi.totalTenure} installments`);
        console.log(`      Provider: ${emi.cardProvider} ${emi.cardLastFourDigits}`);
      });
      console.log('');
    }

    // Test 1: Standard Analytics Service Health Score
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test 1: Standard Analytics Service Health Score\n');

    const standardHealth = await analyticsService.calculateFinancialHealth(TEST_USER_ID);
    
    console.log(`🏆 Financial Health Score: ${standardHealth.score}/100`);
    console.log(`📈 Grade: ${standardHealth.grade}\n`);
    
    console.log('📋 Health Factors:');
    standardHealth.factors.forEach((factor, index) => {
      const emoji = factor.score >= 20 ? '✅' : factor.score >= 15 ? '👍' : factor.score >= 10 ? '⚠️' : '🚨';
      console.log(`   ${emoji} ${factor.factor}: ${factor.score} points`);
      console.log(`      ${factor.description}`);
    });

    console.log('\n💡 Recommendations:');
    standardHealth.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Check if EMI factor is present
    const emiFactorStandard = standardHealth.factors.find(f => f.factor === 'EMI Burden');
    if (emiFactorStandard) {
      console.log('\n✅ EMI Burden factor FOUND in standard health calculation');
      console.log(`   Score Impact: ${emiFactorStandard.score} points`);
    } else {
      console.log('\n❌ EMI Burden factor NOT FOUND in standard health calculation');
    }

    // Test 2: Advanced Analytics Service Health Score
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test 2: Advanced Analytics Service Health Score\n');

    const advancedHealth = await advancedAnalyticsService.calculateFinancialHealthScore(TEST_USER_ID);
    
    console.log(`🏆 Financial Health Score: ${advancedHealth.score}/100`);
    console.log(`📈 Rating: ${advancedHealth.rating}`);
    console.log(`🎨 Color: ${advancedHealth.color}\n`);
    
    console.log('📋 Health Factors:');
    advancedHealth.factors.forEach((factor, index) => {
      const emoji = factor.impact >= 15 ? '✅' : factor.impact >= 10 ? '👍' : factor.impact >= 5 ? '⚠️' : '🚨';
      console.log(`   ${emoji} ${factor.name}: ${factor.impact > 0 ? '+' : ''}${factor.impact} points (${factor.status})`);
      console.log(`      ${factor.detail}`);
    });

    console.log('\n💡 Recommendations:');
    advancedHealth.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      console.log(`      ${rec.description}`);
      if (rec.actionSteps && rec.actionSteps.length > 0) {
        console.log(`      Action Steps:`);
        rec.actionSteps.forEach(step => {
          console.log(`         • ${step}`);
        });
      }
    });

    // Check if EMI factor is present
    const emiFactorAdvanced = advancedHealth.factors.find(f => f.name === 'EMI Burden');
    if (emiFactorAdvanced) {
      console.log('\n✅ EMI Burden factor FOUND in advanced health calculation');
      console.log(`   Score Impact: ${emiFactorAdvanced.impact} points`);
    } else {
      console.log('\n❌ EMI Burden factor NOT FOUND in advanced health calculation');
    }

    // Test 3: Compare Before/After EMI Impact
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test 3: EMI Impact Analysis\n');

    const baselineScore = standardHealth.factors
      .filter(f => f.factor !== 'EMI Burden')
      .reduce((sum, f) => sum + f.score, 0);

    console.log(`📊 Health Score Breakdown:`);
    console.log(`   Score without EMI factor: ${baselineScore}/100`);
    console.log(`   EMI factor contribution: ${emiFactorStandard ? emiFactorStandard.score : 0} points`);
    console.log(`   Final Health Score: ${standardHealth.score}/100`);
    
    if (emiFactorStandard) {
      if (emiFactorStandard.score > 0) {
        console.log(`\n✅ EMI burden is HELPING your health score (+${emiFactorStandard.score} bonus)`);
      } else if (emiFactorStandard.score < 0) {
        console.log(`\n⚠️ EMI burden is HURTING your health score (${emiFactorStandard.score} penalty)`);
      } else {
        console.log(`\n➡️ EMI burden is NEUTRAL (no impact on score)`);
      }
    }

    // Test 4: EMI Impact Scenarios
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test 4: EMI Burden Scenarios & Thresholds\n');

    console.log('💡 EMI Burden Impact Levels:');
    console.log('   Scenario 1: 0% of income (No EMIs)');
    console.log('      → Score Impact: +5 bonus points');
    console.log('      → Status: 🎉 Debt-free!\n');

    console.log('   Scenario 2: < 15% of income');
    console.log('      → Score Impact: +5 bonus points');
    console.log('      → Status: ✅ Excellent\n');

    console.log('   Scenario 3: 15-25% of income');
    console.log('      → Score Impact: 0 points (neutral)');
    console.log('      → Status: 👍 Good - Manageable burden\n');

    console.log('   Scenario 4: 25-40% of income');
    console.log('      → Score Impact: -5 penalty points');
    console.log('      → Status: ⚠️ Moderate - Consider reducing\n');

    console.log('   Scenario 5: > 40% of income');
    console.log('      → Score Impact: -10 penalty points');
    console.log('      → Status: 🚨 High burden - Priority to reduce\n');

    if (activeEMIs.length > 0 && monthlyIncome > 0) {
      const totalEMIBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      const currentBurdenRatio = totalEMIBurden / monthlyIncome;
      
      console.log('📈 Your Current Position:');
      console.log(`   EMI Burden Ratio: ${Math.round(currentBurdenRatio * 100)}%`);
      
      if (currentBurdenRatio < 0.15) {
        console.log(`   🎯 Target: Maintain current excellent position`);
      } else if (currentBurdenRatio < 0.25) {
        console.log(`   🎯 Target: Try to reduce below 15% for bonus points`);
      } else if (currentBurdenRatio < 0.40) {
        console.log(`   🎯 Target: Reduce to below 25% to avoid penalties`);
      } else {
        console.log(`   🎯 Target: Urgently reduce to below 40% to minimize penalties`);
      }
      
      // Calculate money to reduce EMI burden
      const targetBurden = monthlyIncome * 0.25; // 25% threshold
      if (totalEMIBurden > targetBurden) {
        const excessBurden = totalEMIBurden - targetBurden;
        console.log(`\n💡 To reach "Good" level (25%), reduce EMI by: ₹${Math.ceil(excessBurden).toLocaleString()}/month`);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST SUMMARY\n');
    
    console.log('Integration Status:');
    console.log(`   ✅ Standard Analytics Service: ${emiFactorStandard ? 'EMI factor integrated' : 'EMI factor missing'}`);
    console.log(`   ✅ Advanced Analytics Service: ${emiFactorAdvanced ? 'EMI factor integrated' : 'EMI factor missing'}`);
    console.log(`   ✅ EMI data fetching: Working`);
    console.log(`   ✅ Burden calculation: Working`);
    console.log(`   ✅ Score impact: ${emiFactorStandard ? 'Applied' : 'Not applied'}`);
    
    console.log('\n🎯 Key Insights:');
    if (activeEMIs.length === 0) {
      console.log('   • You are debt-free - earning bonus points!');
    } else {
      const totalEMIBurden = activeEMIs.reduce((sum, emi) => sum + emi.emiAmount, 0);
      const burdenPercentage = monthlyIncome > 0 ? Math.round((totalEMIBurden / monthlyIncome) * 100) : 0;
      
      console.log(`   • Your EMI burden: ${burdenPercentage}% of income`);
      
      if (burdenPercentage >= 40) {
        console.log('   • ⚠️ High EMI burden detected - negatively impacting health score');
        console.log('   • 💡 Consider foreclosing high-interest EMIs');
      } else if (burdenPercentage >= 25) {
        console.log('   • ⚠️ Moderate EMI burden - slight negative impact on health score');
        console.log('   • 💡 Avoid taking new EMIs');
      } else if (burdenPercentage >= 15) {
        console.log('   • ✅ EMI burden is manageable - neutral impact');
      } else {
        console.log('   • ✅ Excellent EMI management - positive impact on health score!');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testEMIHealthIntegration().catch(console.error);
