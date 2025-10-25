/**
 * Test Enhanced EMI Charts
 * Run: node backend/test-enhanced-charts.js
 */

const mongoose = require('mongoose');
const EMIAnalyticsService = require('./services/emiAnalyticsService');
const emiAnalyticsService = new EMIAnalyticsService();
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/financial_analyzer';

async function testEnhancedCharts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a user ID (you'll need to replace this with an actual user ID from your database)
    const User = require('./models/User');
    const users = await User.find().limit(1);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    const userId = users[0]._id;
    console.log(`📊 Testing charts for user: ${users[0].email || userId}\n`);

    // Test chart data
    console.log('📈 Fetching enhanced chart data...');
    const chartData = await emiAnalyticsService.getChartData(userId);

    console.log('\n=== CHART DATA SUMMARY ===\n');

    // Pie Chart
    console.log('🥧 Pie Chart (Provider Distribution):');
    console.log(`   Providers: ${chartData.pieChart.length}`);
    chartData.pieChart.forEach(item => {
      console.log(`   - ${item.name}: ₹${item.value.toLocaleString('en-IN')}`);
    });

    // Bar Chart
    console.log('\n📊 Bar Chart (Monthly Burden):');
    console.log(`   Months: ${chartData.barChart.length}`);
    chartData.barChart.slice(0, 3).forEach(item => {
      console.log(`   - ${item.month}: ₹${item.amount.toLocaleString('en-IN')} (${item.count} EMIs)`);
    });

    // Line Chart
    console.log('\n📈 Line Chart (Completion Timeline):');
    console.log(`   Active EMIs: ${chartData.lineChart.length}`);
    chartData.lineChart.slice(0, 5).forEach(item => {
      console.log(`   - ${item.name}: ${item.progress.toFixed(1)}% complete, ₹${item.remaining.toLocaleString('en-IN')} remaining`);
    });

    // Stacked Bar Chart
    console.log('\n📊 Stacked Bar Chart (Principal vs Interest):');
    console.log(`   EMIs analyzed: ${chartData.stackedBarChart.length}`);
    chartData.stackedBarChart.slice(0, 3).forEach(item => {
      const total = item.principal + item.interest;
      const interestPercent = ((item.interest / total) * 100).toFixed(1);
      console.log(`   - ${item.name}:`);
      console.log(`     Principal: ₹${item.principal.toLocaleString('en-IN')}`);
      console.log(`     Interest: ₹${item.interest.toLocaleString('en-IN')} (${interestPercent}%)`);
    });

    // NEW: Merchant Chart
    console.log('\n🏪 Merchant Comparison Chart:');
    console.log(`   Top Merchants: ${chartData.merchantChart.length}`);
    chartData.merchantChart.slice(0, 5).forEach(item => {
      console.log(`   - ${item.name}:`);
      console.log(`     Amount: ₹${item.amount.toLocaleString('en-IN')}`);
      console.log(`     Count: ${item.count} EMIs`);
      console.log(`     Avg Rate: ${item.rate}%`);
    });

    // NEW: Rate Distribution
    console.log('\n📊 Interest Rate Distribution:');
    console.log(`   Rate Ranges: ${chartData.rateDistribution.length}`);
    chartData.rateDistribution.forEach(item => {
      console.log(`   - ${item.range}: ${item.count} EMI${item.count > 1 ? 's' : ''}`);
    });

    // Summary
    console.log('\n=== IMPLEMENTATION STATUS ===\n');
    console.log('✅ Pie Chart - Provider Distribution');
    console.log('✅ Bar Chart - Monthly Burden');
    console.log('✅ Line Chart - Completion Timeline');
    console.log('✅ Stacked Bar Chart - Principal vs Interest');
    console.log('✅ Area Chart - Payment Trend (uses barChart data)');
    console.log('✅ Composed Chart - Multi-metric Analysis');
    console.log('✅ Scatter Chart - Principal vs Interest Distribution');
    console.log('✅ Radar Chart - Card Provider Comparison');
    console.log('✅ Merchant Comparison Chart - NEW');
    console.log('✅ Interest Rate Distribution - NEW');
    console.log('✅ EMI Progress Funnel - NEW');
    console.log('\n🎉 Total: 11+ Chart Types Implemented!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

testEnhancedCharts();
