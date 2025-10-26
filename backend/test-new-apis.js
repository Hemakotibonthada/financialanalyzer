/**
 * API Testing Script for New Features
 * Tests all 35 new endpoints (Investments, Goals, Net Worth)
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
let authToken = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(endpoint, method, status) {
  const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  console.log(`${color}[${status}]${colors.reset} ${method} ${endpoint}`);
}

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
}

// Login to get auth token
async function login() {
  console.log(`\n${colors.blue}=== Authentication ===${colors.reset}\n`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'test123'
    });
    
    authToken = response.data.token;
    logTest('/auth/login', 'POST', 'PASS');
    console.log(`${colors.green}✓ Authentication successful${colors.reset}\n`);
    return true;
  } catch (error) {
    logTest('/auth/login', 'POST', 'FAIL');
    console.log(`${colors.red}✗ Authentication failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Please ensure you have a test user or set TEST_EMAIL and TEST_PASSWORD env variables${colors.reset}\n`);
    return false;
  }
}

// Test Investment APIs
async function testInvestmentAPIs() {
  console.log(`\n${colors.blue}=== Testing Investment APIs (15 endpoints) ===${colors.reset}\n`);
  
  let investmentId = null;
  
  // 1. Create Investment
  const createResult = await apiRequest('POST', '/investments', {
    type: 'stock',
    name: 'Test Stock',
    symbol: 'TEST',
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    purchaseDate: new Date().toISOString(),
    category: 'equity',
    riskLevel: 'medium'
  });
  
  if (createResult.success) {
    investmentId = createResult.data.data._id;
    logTest('/investments', 'POST', 'PASS');
    results.passed++;
  } else {
    logTest('/investments', 'POST', 'FAIL');
    results.failed++;
    results.errors.push(`Create Investment: ${createResult.error}`);
  }
  
  // 2. Get All Investments
  const getAllResult = await apiRequest('GET', '/investments');
  logTest('/investments', 'GET', getAllResult.success ? 'PASS' : 'FAIL');
  getAllResult.success ? results.passed++ : results.failed++;
  
  // 3. Get Portfolio Summary
  const portfolioResult = await apiRequest('GET', '/investments/portfolio');
  logTest('/investments/portfolio', 'GET', portfolioResult.success ? 'PASS' : 'FAIL');
  portfolioResult.success ? results.passed++ : results.failed++;
  
  // 4. Get Performance Metrics
  const performanceResult = await apiRequest('GET', '/investments/performance');
  logTest('/investments/performance', 'GET', performanceResult.success ? 'PASS' : 'FAIL');
  performanceResult.success ? results.passed++ : results.failed++;
  
  // 5. Get Upcoming Maturities
  const maturitiesResult = await apiRequest('GET', '/investments/maturities?days=30');
  logTest('/investments/maturities', 'GET', maturitiesResult.success ? 'PASS' : 'FAIL');
  maturitiesResult.success ? results.passed++ : results.failed++;
  
  // 6. Get Asset Allocation
  const allocationResult = await apiRequest('GET', '/investments/analytics/allocation');
  logTest('/investments/analytics/allocation', 'GET', allocationResult.success ? 'PASS' : 'FAIL');
  allocationResult.success ? results.passed++ : results.failed++;
  
  if (investmentId) {
    // 7. Get Single Investment
    const getOneResult = await apiRequest('GET', `/investments/${investmentId}`);
    logTest(`/investments/${investmentId}`, 'GET', getOneResult.success ? 'PASS' : 'FAIL');
    getOneResult.success ? results.passed++ : results.failed++;
    
    // 8. Update Investment
    const updateResult = await apiRequest('PUT', `/investments/${investmentId}`, {
      currentPrice: 115
    });
    logTest(`/investments/${investmentId}`, 'PUT', updateResult.success ? 'PASS' : 'FAIL');
    updateResult.success ? results.passed++ : results.failed++;
    
    // 9. Update Price
    const priceResult = await apiRequest('PUT', `/investments/${investmentId}/price`, {
      currentPrice: 120
    });
    logTest(`/investments/${investmentId}/price`, 'PUT', priceResult.success ? 'PASS' : 'FAIL');
    priceResult.success ? results.passed++ : results.failed++;
    
    // 10. Record Transaction
    const transactionResult = await apiRequest('POST', `/investments/${investmentId}/transaction`, {
      type: 'buy',
      quantity: 5,
      price: 110,
      date: new Date().toISOString(),
      amount: 550
    });
    logTest(`/investments/${investmentId}/transaction`, 'POST', transactionResult.success ? 'PASS' : 'FAIL');
    transactionResult.success ? results.passed++ : results.failed++;
    
    // 11. Delete Investment
    const deleteResult = await apiRequest('DELETE', `/investments/${investmentId}`);
    logTest(`/investments/${investmentId}`, 'DELETE', deleteResult.success ? 'PASS' : 'FAIL');
    deleteResult.success ? results.passed++ : results.failed++;
  } else {
    // Skip dependent tests
    console.log(`${colors.yellow}[SKIP]${colors.reset} Skipping tests that require investmentId`);
    results.failed += 5;
  }
  
  // 12. Sync Prices (placeholder)
  const syncResult = await apiRequest('POST', '/investments/sync-prices');
  logTest('/investments/sync-prices', 'POST', syncResult.success ? 'PASS' : 'FAIL');
  syncResult.success ? results.passed++ : results.failed++;
}

// Test Financial Goals APIs
async function testGoalAPIs() {
  console.log(`\n${colors.blue}=== Testing Financial Goals APIs (10 endpoints) ===${colors.reset}\n`);
  
  let goalId = null;
  
  // 1. Create Goal
  const createResult = await apiRequest('POST', '/goals', {
    name: 'Test Emergency Fund',
    description: 'Test goal',
    category: 'emergency_fund',
    targetAmount: 100000,
    currentAmount: 25000,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    savingsStrategy: 'monthly',
    monthlySavingsTarget: 10000
  });
  
  if (createResult.success) {
    goalId = createResult.data.data._id;
    logTest('/goals', 'POST', 'PASS');
    results.passed++;
  } else {
    logTest('/goals', 'POST', 'FAIL');
    results.failed++;
    results.errors.push(`Create Goal: ${createResult.error}`);
  }
  
  // 2. Get All Goals
  const getAllResult = await apiRequest('GET', '/goals');
  logTest('/goals', 'GET', getAllResult.success ? 'PASS' : 'FAIL');
  getAllResult.success ? results.passed++ : results.failed++;
  
  // 3. Get Goals Summary
  const summaryResult = await apiRequest('GET', '/goals/summary');
  logTest('/goals/summary', 'GET', summaryResult.success ? 'PASS' : 'FAIL');
  summaryResult.success ? results.passed++ : results.failed++;
  
  // 4. Get Upcoming Goals
  const upcomingResult = await apiRequest('GET', '/goals/upcoming?months=12');
  logTest('/goals/upcoming', 'GET', upcomingResult.success ? 'PASS' : 'FAIL');
  upcomingResult.success ? results.passed++ : results.failed++;
  
  if (goalId) {
    // 5. Get Single Goal
    const getOneResult = await apiRequest('GET', `/goals/${goalId}`);
    logTest(`/goals/${goalId}`, 'GET', getOneResult.success ? 'PASS' : 'FAIL');
    getOneResult.success ? results.passed++ : results.failed++;
    
    // 6. Update Goal
    const updateResult = await apiRequest('PUT', `/goals/${goalId}`, {
      currentAmount: 30000
    });
    logTest(`/goals/${goalId}`, 'PUT', updateResult.success ? 'PASS' : 'FAIL');
    updateResult.success ? results.passed++ : results.failed++;
    
    // 7. Add Contribution
    const contributeResult = await apiRequest('POST', `/goals/${goalId}/contribute`, {
      amount: 5000,
      source: 'Salary',
      notes: 'Test contribution'
    });
    logTest(`/goals/${goalId}/contribute`, 'POST', contributeResult.success ? 'PASS' : 'FAIL');
    contributeResult.success ? results.passed++ : results.failed++;
    
    // 8. Add Milestone
    const milestoneResult = await apiRequest('POST', `/goals/${goalId}/milestone`, {
      name: '50% Complete',
      amount: 50000,
      date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    });
    logTest(`/goals/${goalId}/milestone`, 'POST', milestoneResult.success ? 'PASS' : 'FAIL');
    milestoneResult.success ? results.passed++ : results.failed++;
    
    // 9. Project Completion
    const projectResult = await apiRequest('POST', `/goals/${goalId}/project`);
    logTest(`/goals/${goalId}/project`, 'POST', projectResult.success ? 'PASS' : 'FAIL');
    projectResult.success ? results.passed++ : results.failed++;
    
    // 10. Delete Goal
    const deleteResult = await apiRequest('DELETE', `/goals/${goalId}`);
    logTest(`/goals/${goalId}`, 'DELETE', deleteResult.success ? 'PASS' : 'FAIL');
    deleteResult.success ? results.passed++ : results.failed++;
  } else {
    // Skip dependent tests
    console.log(`${colors.yellow}[SKIP]${colors.reset} Skipping tests that require goalId`);
    results.failed += 6;
  }
}

// Test Net Worth APIs
async function testNetWorthAPIs() {
  console.log(`\n${colors.blue}=== Testing Net Worth APIs (10 endpoints) ===${colors.reset}\n`);
  
  let snapshotId = null;
  
  // 1. Create Manual Snapshot
  const createResult = await apiRequest('POST', '/networth/snapshot', {
    period: 'monthly',
    assets: {
      cash: 10000,
      bankSavings: 50000,
      stocks: 100000,
      mutualFunds: 150000
    },
    liabilities: {
      creditCardDues: 5000,
      personalLoan: 50000
    },
    notes: 'Test snapshot'
  });
  
  if (createResult.success) {
    snapshotId = createResult.data.data._id;
    logTest('/networth/snapshot', 'POST', 'PASS');
    results.passed++;
  } else {
    logTest('/networth/snapshot', 'POST', 'FAIL');
    results.failed++;
    results.errors.push(`Create Snapshot: ${createResult.error}`);
  }
  
  // 2. Auto-Generate Snapshot
  const autoGenResult = await apiRequest('POST', '/networth/auto-generate', {
    period: 'monthly'
  });
  logTest('/networth/auto-generate', 'POST', autoGenResult.success ? 'PASS' : 'FAIL');
  autoGenResult.success ? results.passed++ : results.failed++;
  
  // 3. Get Latest Snapshot
  const latestResult = await apiRequest('GET', '/networth/latest');
  logTest('/networth/latest', 'GET', latestResult.success ? 'PASS' : 'FAIL');
  latestResult.success ? results.passed++ : results.failed++;
  
  // 4. Get History
  const historyResult = await apiRequest('GET', '/networth/history?months=12');
  logTest('/networth/history', 'GET', historyResult.success ? 'PASS' : 'FAIL');
  historyResult.success ? results.passed++ : results.failed++;
  
  // 5. Get Trend
  const trendResult = await apiRequest('GET', '/networth/trend?period=monthly&count=12');
  logTest('/networth/trend', 'GET', trendResult.success ? 'PASS' : 'FAIL');
  trendResult.success ? results.passed++ : results.failed++;
  
  // 6. Get Comparison
  const comparisonResult = await apiRequest('GET', '/networth/comparison');
  logTest('/networth/comparison', 'GET', comparisonResult.success ? 'PASS' : 'FAIL');
  comparisonResult.success ? results.passed++ : results.failed++;
  
  // 7. Get Projections
  const projectionsResult = await apiRequest('GET', '/networth/projections?months=12');
  logTest('/networth/projections', 'GET', projectionsResult.success ? 'PASS' : 'FAIL');
  projectionsResult.success ? results.passed++ : results.failed++;
  
  if (snapshotId) {
    // 8. Get Single Snapshot
    const getOneResult = await apiRequest('GET', `/networth/${snapshotId}`);
    logTest(`/networth/${snapshotId}`, 'GET', getOneResult.success ? 'PASS' : 'FAIL');
    getOneResult.success ? results.passed++ : results.failed++;
    
    // 9. Update Snapshot
    const updateResult = await apiRequest('PUT', `/networth/${snapshotId}`, {
      assets: { bankSavings: 55000 }
    });
    logTest(`/networth/${snapshotId}`, 'PUT', updateResult.success ? 'PASS' : 'FAIL');
    updateResult.success ? results.passed++ : results.failed++;
    
    // 10. Delete Snapshot
    const deleteResult = await apiRequest('DELETE', `/networth/${snapshotId}`);
    logTest(`/networth/${snapshotId}`, 'DELETE', deleteResult.success ? 'PASS' : 'FAIL');
    deleteResult.success ? results.passed++ : results.failed++;
  } else {
    // Skip dependent tests
    console.log(`${colors.yellow}[SKIP]${colors.reset} Skipping tests that require snapshotId`);
    results.failed += 3;
  }
}

// Print summary
function printSummary() {
  console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}\n`);
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\n${passRate === '100.0' ? colors.green + '✓ All tests passed!' : colors.yellow + '⚠ Some tests failed'}${colors.reset}\n`);
}

// Main test execution
async function runTests() {
  console.log(`${colors.magenta}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║   API Testing - New Features (v1.0)    ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════╝${colors.reset}`);
  
  // Login first
  const authenticated = await login();
  if (!authenticated) {
    console.log(`${colors.red}✗ Cannot proceed without authentication${colors.reset}\n`);
    process.exit(1);
  }
  
  // Run all tests
  await testInvestmentAPIs();
  await testGoalAPIs();
  await testNetWorthAPIs();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
