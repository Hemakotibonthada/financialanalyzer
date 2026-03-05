// ============================================================================
// AI ADVANCED TESTS — Portfolio, Credit, Notifications, Peers, Search
// ============================================================================

'use strict';

const assert = require('assert');

// ============================================================================
// §1  PORTFOLIO OPTIMIZATION TESTS
// ============================================================================

async function testPortfolioOptimization() {
  console.log('\n=== PORTFOLIO OPTIMIZATION TESTS ===');

  const {
    AssetClassLibrary, MarkowitzOptimizer, RiskParityOptimizer,
    BlackLittermanModel, DynamicRebalancer, PortfolioAnalytics,
    PortfolioOptimizationService
  } = require('../services/ai/portfolioOptimization');

  // Test Asset Library
  console.log('  ✓ Testing AssetClassLibrary...');
  const lib = new AssetClassLibrary();
  const allAssets = lib.getAllAssets();
  assert(allAssets.length >= 20, 'At least 20 assets');
  const nifty = lib.getAsset('nifty50');
  assert(nifty, 'Nifty 50 exists');
  assert(nifty.expectedReturn === 0.12, 'Expected return correct');
  const corr = lib.getCorrelation('nifty50', 'gold');
  assert(typeof corr === 'number', 'Correlation is number');
  assert(corr < 0.5, 'Low equity-gold correlation');
  const covMatrix = lib.getCovarianceMatrix(['nifty50', 'gilt_10yr', 'gold']);
  assert(covMatrix.length === 3, 'Covariance matrix correct size');
  console.log(`    AssetLibrary: PASSED (${allAssets.length} assets)`);

  // Test Markowitz Optimizer
  console.log('  ✓ Testing MarkowitzOptimizer...');
  const markowitz = new MarkowitzOptimizer(lib);
  const result = markowitz.optimize(['nifty50', 'gilt_10yr', 'gold', 'ppf', 'elss']);
  assert(result.allocations, 'Allocations returned');
  assert(result.expectedReturn > 0, 'Positive expected return');
  assert(result.risk > 0, 'Positive risk');
  assert(result.sharpeRatio > 0, 'Positive Sharpe');
  console.log(`    Markowitz: PASSED (return=${(result.expectedReturn*100).toFixed(1)}%, risk=${(result.risk*100).toFixed(1)}%, sharpe=${result.sharpeRatio.toFixed(2)})`);

  // Test Efficient Frontier
  console.log('  ✓ Testing EfficientFrontier...');
  const frontier = markowitz.efficientFrontier(['nifty50', 'gilt_10yr', 'gold', 'elss'], 10);
  assert(frontier.points.length === 10, 'Correct number of points');
  assert(frontier.maxSharpePortfolio, 'Max Sharpe portfolio found');
  assert(frontier.minVariancePortfolio, 'Min variance portfolio found');
  console.log(`    EfficientFrontier: PASSED (${frontier.points.length} points)`);

  // Test Risk Parity
  console.log('  ✓ Testing RiskParityOptimizer...');
  const riskParity = new RiskParityOptimizer(lib);
  const rpResult = riskParity.optimize(['nifty50', 'gilt_10yr', 'gold']);
  assert(rpResult.allocations, 'RP allocations returned');
  assert(rpResult.method === 'risk_parity', 'Correct method');
  console.log(`    RiskParity: PASSED (return=${(rpResult.expectedReturn*100).toFixed(1)}%)`);

  // Test Black-Litterman
  console.log('  ✓ Testing BlackLittermanModel...');
  const bl = new BlackLittermanModel(lib);
  const blResult = bl.optimize(
    ['nifty50', 'gilt_10yr', 'gold'],
    [{ type: 'absolute', asset: 'nifty50', return: 0.15, confidence: 0.7 }]
  );
  assert(blResult.allocations, 'BL allocations returned');
  assert(blResult.posteriorReturns, 'Posterior returns computed');
  assert(blResult.method === 'black_litterman', 'Correct method');
  console.log(`    BlackLitterman: PASSED`);

  // Test Dynamic Rebalancer
  console.log('  ✓ Testing DynamicRebalancer...');
  const rebalancer = new DynamicRebalancer(lib);
  const rebalResult = rebalancer.analyzeRebalancing(
    { nifty50: 0.60, gilt_10yr: 0.20, gold: 0.20 },
    { nifty50: 0.50, gilt_10yr: 0.30, gold: 0.20 },
    { portfolioValue: 1000000 }
  );
  assert(typeof rebalResult.needsRebalancing === 'boolean', 'Rebalancing flag');
  assert(rebalResult.trades.length > 0, 'Trades generated');
  assert(rebalResult.recommendation, 'Recommendation provided');
  console.log(`    Rebalancer: PASSED (${rebalResult.trades.length} trades)`);

  // Test Portfolio Analytics
  console.log('  ✓ Testing PortfolioAnalytics...');
  const analytics = new PortfolioAnalytics(lib);
  const analysisResult = analytics.analyze({ nifty50: 0.5, gilt_10yr: 0.3, gold: 0.2 });
  assert(analysisResult.metrics.sharpeRatio > 0, 'Sharpe computed');
  assert(analysisResult.metrics.beta > 0, 'Beta computed');
  assert(analysisResult.styleAnalysis.category, 'Style categorized');
  assert(analysisResult.riskContributions, 'Risk contributions computed');
  console.log(`    Analytics: PASSED (style: ${analysisResult.styleAnalysis.category})`);

  // Test Stress Test
  console.log('  ✓ Testing StressTest...');
  const stressResult = analytics.stressTest({ nifty50: 0.6, gold: 0.2, gilt_10yr: 0.2 });
  assert(stressResult.scenarios.length >= 5, 'Multiple scenarios tested');
  assert(stressResult.worstCase, 'Worst case identified');
  assert(stressResult.recommendation, 'Recommendation generated');
  console.log(`    StressTest: PASSED (${stressResult.scenarios.length} scenarios)`);

  // Test Unified Service
  console.log('  ✓ Testing PortfolioOptimizationService...');
  const service = new PortfolioOptimizationService();
  const fullResult = service.optimizePortfolio({ riskProfile: 'moderate', method: 'markowitz' });
  assert(fullResult.allocations, 'Service allocations returned');
  assert(fullResult.analytics, 'Analytics included');
  assert(fullResult.stressTest, 'Stress test included');
  console.log(`    PortfolioService: PASSED (${fullResult.activeAssets} assets, sharpe=${fullResult.sharpeRatio?.toFixed(2)})`);

  console.log('  ✅ All Portfolio tests passed!');
}

// ============================================================================
// §2  CREDIT SCORE TESTS
// ============================================================================

async function testCreditScore() {
  console.log('\n=== CREDIT SCORE TESTS ===');

  const {
    CreditFactorAnalyzer, CreditScoreCalculator,
    CreditScoreSimulator, CreditHealthMonitor, CreditScoreService
  } = require('../services/ai/creditScorePredictor');

  const testData = {
    loans: [
      { loanType: 'home_loan', principalAmount: 3000000, outstandingAmount: 2500000,
        emiAmount: 25000, interestRate: 0.085, status: 'active', startDate: '2020-01-01',
        missedPayments: 0 },
      { loanType: 'personal_loan', principalAmount: 200000, outstandingAmount: 100000,
        emiAmount: 8000, status: 'active', startDate: '2023-06-01' }
    ],
    creditCards: [
      { name: 'HDFC', creditLimit: 200000, currentBalance: 45000, limit: 200000,
        totalPayments: 24, missedPayments: 0, latePayments: 1, openDate: '2019-03-01' }
    ],
    monthlyIncome: 80000,
    recentInquiries: 1
  };

  // Test Factor Analyzer
  console.log('  ✓ Testing CreditFactorAnalyzer...');
  const analyzer = new CreditFactorAnalyzer();
  const factors = analyzer.analyzeFactors(testData);

  assert(factors.paymentHistory, 'Payment history analyzed');
  assert(factors.paymentHistory.score > 0, 'Payment score positive');
  assert(factors.creditUtilization, 'Utilization analyzed');
  assert(factors.creditAge, 'Credit age analyzed');
  assert(factors.creditMix, 'Credit mix analyzed');
  assert(factors.recentInquiries, 'Inquiries analyzed');
  assert(factors.totalDebt, 'Total debt analyzed');

  const totalWeight = Object.values(factors).reduce((s, f) => s + f.weight, 0);
  assert(Math.abs(totalWeight - 1.0) < 0.01, 'Factor weights sum to 1');
  console.log(`    FactorAnalyzer: PASSED (6 factors, weights sum=${totalWeight.toFixed(2)})`);

  // Test Score Calculator
  console.log('  ✓ Testing CreditScoreCalculator...');
  const calculator = new CreditScoreCalculator();
  const scoreResult = calculator.calculateScore(testData);
  assert(scoreResult.score >= 300 && scoreResult.score <= 900, 'Score in valid range');
  assert(scoreResult.rating, 'Rating assigned');
  assert(scoreResult.weakestFactor, 'Weakest factor identified');
  assert(scoreResult.strongestFactor, 'Strongest factor identified');
  assert(scoreResult.recommendations.length > 0, 'Recommendations generated');
  console.log(`    ScoreCalculator: PASSED (score=${scoreResult.score}, rating=${scoreResult.category})`);

  // Test Simulator
  console.log('  ✓ Testing CreditScoreSimulator...');
  const simulator = new CreditScoreSimulator();

  const payOffSim = simulator.simulate(testData, { type: 'pay_off_card' });
  assert(payOffSim.currentScore, 'Current score in simulation');
  assert(payOffSim.newScore, 'New score computed');
  assert(typeof payOffSim.change === 'number', 'Change computed');
  assert(payOffSim.explanation, 'Explanation provided');

  const missedSim = simulator.simulate(testData, { type: 'missed_payment' });
  assert(missedSim.impact === 'negative', 'Missed payment is negative');

  const multiSim = simulator.simulateMultiple(testData, [
    { type: 'pay_off_card', description: 'Pay off card' },
    { type: 'increase_limit', description: 'Increase limit' },
    { type: 'missed_payment', description: 'Miss payment' }
  ]);
  assert(multiSim.simulations.length === 3, 'All scenarios simulated');
  assert(multiSim.bestScenario, 'Best scenario identified');
  assert(multiSim.worstScenario, 'Worst scenario identified');
  console.log(`    Simulator: PASSED (payoff: ${payOffSim.change > 0 ? '+' : ''}${payOffSim.change}pts, missed: ${missedSim.change}pts)`);

  // Test Health Monitor
  console.log('  ✓ Testing CreditHealthMonitor...');
  const monitor = new CreditHealthMonitor();
  for (let i = 0; i < 5; i++) {
    const modifiedData = { ...testData };
    if (modifiedData.creditCards?.[0]) modifiedData.creditCards[0].currentBalance -= i * 5000;
    monitor.trackScore('user1', modifiedData);
  }
  const history = monitor.getHistory('user1');
  assert(history.length === 5, 'History tracked');
  console.log(`    HealthMonitor: PASSED (${history.length} records)`);

  // Test Unified Service
  console.log('  ✓ Testing CreditScoreService...');
  const service = new CreditScoreService();
  const svcScore = service.getScore('user2', testData);
  assert(svcScore.score >= 300, 'Service score valid');
  const plan = service.getImprovementPlan(testData);
  assert(plan.steps.length > 0, 'Improvement steps generated');
  assert(plan.targetScore > plan.currentScore, 'Target higher than current');
  console.log(`    CreditService: PASSED (score=${svcScore.score}, target=${plan.targetScore})`);

  console.log('  ✅ All Credit Score tests passed!');
}

// ============================================================================
// §3  SMART NOTIFICATION TESTS
// ============================================================================

async function testSmartNotifications() {
  console.log('\n=== SMART NOTIFICATION TESTS ===');

  const {
    NotificationPriorityEngine, DeliveryTimingOptimizer,
    NotificationFatigueManager, NotificationContentGenerator,
    SmartNotificationService
  } = require('../services/ai/smartNotificationAI');

  // Test Priority Engine
  console.log('  ✓ Testing NotificationPriorityEngine...');
  const engine = new NotificationPriorityEngine();
  const triggered = engine.evaluate({
    fraudScore: 80,
    budgetUtilization: 0.95,
    savingsRate: 0.10,
    emiDueIn: 2,
    lastTransactionAmount: 50000,
    avgExpense: 2000
  });
  assert(triggered.length > 0, 'Notifications triggered');
  assert(triggered[0].priority <= triggered[triggered.length - 1].priority, 'Sorted by priority');
  console.log(`    PriorityEngine: PASSED (${triggered.length} notifications triggered)`);

  // Test Fatigue Manager
  console.log('  ✓ Testing NotificationFatigueManager...');
  const fatigue = new NotificationFatigueManager();
  const check1 = fatigue.canSend('user1', 'test_rule', 2);
  assert(check1.allowed, 'First notification allowed');
  fatigue.recordSent('user1', 'test_rule', 2, 60);
  const check2 = fatigue.canSend('user1', 'test_rule', 2);
  assert(!check2.allowed, 'Cooldown prevents re-send');
  const stats = fatigue.getDailyStats('user1');
  assert(stats.sent === 1, 'Stats track sent count');
  console.log('    FatigueManager: PASSED');

  // Test Content Generator
  console.log('  ✓ Testing NotificationContentGenerator...');
  const generator = new NotificationContentGenerator();
  const content = generator.generate('fraud_alert', { amount: 50000, merchant: 'Unknown', fraudScore: 85 });
  assert(content, 'Content generated');
  assert(content.title.includes('Suspicious'), 'Fraud title correct');
  assert(content.body.includes('50,000'), 'Amount in body');

  const emiContent = generator.generate('emi_due_today', { loanName: 'Home Loan', emiAmount: 25000 });
  assert(emiContent.title.includes('EMI'), 'EMI title correct');
  console.log('    ContentGenerator: PASSED');

  // Test Delivery Timing
  console.log('  ✓ Testing DeliveryTimingOptimizer...');
  const timing = new DeliveryTimingOptimizer();
  const immediate = timing.getOptimalDeliveryTime('user1', 0);
  assert(immediate.deliverNow, 'Critical = immediate delivery');
  const scheduled = timing.getOptimalDeliveryTime('user1', 3);
  assert(typeof scheduled.deliverNow === 'boolean', 'Low priority timing determined');
  console.log('    TimingOptimizer: PASSED');

  // Test Unified Service
  console.log('  ✓ Testing SmartNotificationService...');
  const service = new SmartNotificationService();
  const result = await service.processNotifications('user1', {
    fraudScore: 80, budgetUtilization: 0.95, savingsRate: 0.15
  });
  assert(result.notifications, 'Notifications returned');
  assert(typeof result.suppressed === 'number', 'Suppressed count tracked');
  console.log(`    NotifService: PASSED (${result.notifications.length} sent, ${result.suppressed} suppressed)`);

  console.log('  ✅ All Notification tests passed!');
}

// ============================================================================
// §4  PEER COMPARISON TESTS
// ============================================================================

async function testPeerComparison() {
  console.log('\n=== PEER COMPARISON TESTS ===');

  const {
    PeerCohortGenerator, PercentileCalculator, PeerComparisonAnalyzer
  } = require('../services/ai/peerComparisonEngine');

  // Test Cohort Generator
  console.log('  ✓ Testing PeerCohortGenerator...');
  const gen = new PeerCohortGenerator();
  const cohort = gen.getCohort(75000, 30);
  assert(cohort.bracket, 'Bracket assigned');
  assert(cohort.benchmarks.savingsRate > 0, 'Savings benchmark exists');
  const peers = gen.generateSyntheticPeers(75000, 30, 50);
  assert(peers.length === 50, 'Correct peer count');
  console.log(`    CohortGenerator: PASSED (bracket: ${cohort.bracket}, ${peers.length} peers)`);

  // Test Percentile Calculator
  console.log('  ✓ Testing PercentileCalculator...');
  const pCalc = new PercentileCalculator();
  const distribution = Array.from({ length: 100 }, (_, i) => i);
  const p50 = pCalc.calculatePercentile(50, distribution);
  assert(Math.abs(p50 - 50.5) < 2, 'Median percentile correct');
  const ranking = pCalc.calculateRanking(75, distribution);
  assert(ranking.percentile >= 70, 'High value = high percentile');
  console.log('    PercentileCalc: PASSED');

  // Test Peer Comparison
  console.log('  ✓ Testing PeerComparisonAnalyzer...');
  const analyzer = new PeerComparisonAnalyzer();
  const result = analyzer.compare({
    savingsRate: 0.25,
    investmentRate: 0.15,
    debtToIncome: 0.20,
    emergencyFundMonths: 6,
    categoryBreakdown: { food: 0.15, transport: 0.08, entertainment: 0.10 }
  }, { monthlyIncome: 80000, age: 30 });

  assert(result.cohort, 'Cohort info returned');
  assert(result.comparisons.savingsRate, 'Savings comparison');
  assert(result.comparisons.overallHealth, 'Overall health ranking');
  assert(result.topStrengths, 'Strengths identified');
  assert(result.improvementAreas !== undefined, 'Improvement areas');
  console.log(`    PeerComparison: PASSED (overall: ${result.comparisons.overallHealth.label}, percentile: ${result.comparisons.overallHealth.percentile})`);

  console.log('  ✅ All Peer Comparison tests passed!');
}

// ============================================================================
// §5  SEMANTIC SEARCH TESTS
// ============================================================================

async function testSemanticSearch() {
  console.log('\n=== SEMANTIC SEARCH TESTS ===');

  const {
    TFIDFIndex, FinancialQueryParser, TransactionSearchEngine,
    FuzzyMatcher, SemanticSearchService
  } = require('../services/ai/semanticSearch');

  // Test Query Parser
  console.log('  ✓ Testing FinancialQueryParser...');
  const parser = new FinancialQueryParser();

  const q1 = parser.parse('Show me food expenses over ₹500 last month');
  assert(q1.filters.category === 'food', 'Category extracted');
  assert(q1.filters.amount?.operator === 'gt', 'Amount operator correct');
  assert(q1.filters.amount?.value === 500, 'Amount value correct');
  assert(q1.filters.timePeriod?.label === 'last_month', 'Time period correct');

  const q2 = parser.parse('Total spending this week');
  assert(q2.intent === 'aggregate_amount', 'Aggregation intent detected');
  assert(q2.aggregation === 'sum', 'Sum aggregation');
  assert(q2.filters.timePeriod?.label === 'this_week', 'This week period');

  const q3 = parser.parse('Top 5 highest Amazon purchases');
  assert(q3.filters.merchant === 'amazon', 'Merchant extracted');
  assert(q3.sort === 'highest', 'Sort order correct');
  assert(q3.limit === 5, 'Limit extracted');

  const q4 = parser.parse('How many transactions between ₹1,000 and ₹5,000');
  assert(q4.aggregation === 'count', 'Count aggregation');
  assert(q4.filters.amount?.operator === 'between', 'Between operator');
  console.log('    QueryParser: PASSED (4 queries correctly parsed)');

  // Test TF-IDF Index
  console.log('  ✓ Testing TFIDFIndex...');
  const index = new TFIDFIndex();
  index.addDocument('d1', 'Swiggy food delivery dinner', { amount: 450 });
  index.addDocument('d2', 'Amazon shopping electronics', { amount: 15000 });
  index.addDocument('d3', 'Uber cab ride to office', { amount: 250 });
  index.addDocument('d4', 'Zomato food order lunch', { amount: 350 });
  index.buildIndex();

  const results = index.search('food order');
  assert(results.length >= 2, 'Food results found');
  assert(results[0].metadata.amount <= 500, 'Food items ranked higher');
  console.log(`    TFIDFIndex: PASSED (${results.length} results for "food order")`);

  // Test Fuzzy Matcher
  console.log('  ✓ Testing FuzzyMatcher...');
  const fuzzy = new FuzzyMatcher();
  const matches = fuzzy.match('swigy', ['Swiggy', 'Zomato', 'Uber', 'Amazon'], 0.5);
  assert(matches.length > 0, 'Fuzzy match found');
  assert(matches[0].item === 'Swiggy', 'Correct fuzzy match');
  console.log(`    FuzzyMatcher: PASSED`);

  // Test Transaction Search Engine
  console.log('  ✓ Testing TransactionSearchEngine...');
  const engine = new TransactionSearchEngine();
  const transactions = [
    { _id: '1', amount: 450, type: 'expense', category: 'food', description: 'Swiggy', date: new Date() },
    { _id: '2', amount: 15000, type: 'expense', category: 'shopping', description: 'Amazon', date: new Date() },
    { _id: '3', amount: 250, type: 'expense', category: 'transport', description: 'Uber', date: new Date() },
    { _id: '4', amount: 75000, type: 'income', category: 'salary', description: 'Monthly Salary', date: new Date() },
    { _id: '5', amount: 800, type: 'expense', category: 'food', description: 'Restaurant dinner', date: new Date() }
  ];

  const searchResult = engine.search('food expenses over 400', transactions);
  assert(searchResult.results.length > 0, 'Results found');
  assert(searchResult.naturalLanguageResponse, 'NL response generated');
  assert(searchResult.totalResults > 0, 'Total results counted');
  console.log(`    SearchEngine: PASSED (${searchResult.totalResults} results, "${searchResult.naturalLanguageResponse}")`);

  // Test Semantic Search Service
  console.log('  ✓ Testing SemanticSearchService...');
  const service = new SemanticSearchService();
  const suggestions = service.getSuggestions('food');
  assert(suggestions.length > 0, 'Suggestions provided');
  console.log(`    SemanticService: PASSED (${suggestions.length} suggestions)`);

  console.log('  ✅ All Semantic Search tests passed!');
}

// ============================================================================
// MAIN — Run All Advanced Tests
// ============================================================================

async function runAllAdvancedTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Financial Analyzer — Advanced AI Tests                     ║');
  console.log('║   Portfolio, Credit Score, Notifications, Peers, Search      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const suites = [
    { name: 'Portfolio Optimization', fn: testPortfolioOptimization },
    { name: 'Credit Score', fn: testCreditScore },
    { name: 'Smart Notifications', fn: testSmartNotifications },
    { name: 'Peer Comparison', fn: testPeerComparison },
    { name: 'Semantic Search', fn: testSemanticSearch }
  ];

  for (const suite of suites) {
    try {
      await suite.fn();
      passed++;
    } catch (error) {
      console.error(`\n  ❌ ${suite.name} FAILED:`, error.message);
      failed++;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(60));
  console.log(`Results: ${passed} suites passed, ${failed} failed (${duration}s)`);
  console.log('═'.repeat(60));

  if (failed > 0) process.exit(1);
}

runAllAdvancedTests().catch(console.error);
