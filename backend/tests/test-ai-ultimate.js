// ============================================================================
// AI ULTIMATE TESTS — Goal Achievement, Data Pipeline, Integration
// ============================================================================

'use strict';

const assert = require('assert');

// ============================================================================
// §1  GOAL ACHIEVEMENT ENGINE TESTS
// ============================================================================

async function testGoalAchievement() {
  console.log('\n=== GOAL ACHIEVEMENT ENGINE TESTS ===');

  const {
    GoalFeasibilityAnalyzer, MultiGoalOptimizer,
    GoalProgressTracker, GoalRecommendationEngine,
    GoalAchievementService
  } = require('../services/ai/goalAchievementEngine');

  // Test Feasibility Analyzer
  console.log('  ✓ Testing GoalFeasibilityAnalyzer...');
  const analyzer = new GoalFeasibilityAnalyzer();

  const easyGoal = analyzer.analyze({
    name: 'Emergency Fund',
    targetAmount: 300000,
    currentAmount: 100000,
    deadline: new Date(Date.now() + 365 * 86400000).toISOString(),
    priority: 'critical',
    monthlyContribution: 20000
  }, { monthlyIncome: 80000, totalExpenses: 50000 });

  assert(easyGoal.feasibilityScore > 0, 'Feasibility computed');
  assert(easyGoal.requiredMonthlySIP >= 0, 'Required SIP computed');
  assert(easyGoal.inflatedTarget > easyGoal.originalTarget, 'Inflation applied');
  assert(easyGoal.milestones.length > 0, 'Milestones generated');
  assert(easyGoal.alternatives.length > 0, 'Alternatives suggested');
  assert(easyGoal.recommendation, 'Recommendation provided');
  console.log(`    Feasibility: PASSED (score=${easyGoal.feasibilityScore}, SIP=₹${easyGoal.requiredMonthlySIP}, risk=${easyGoal.riskLevel})`);

  // Test with difficult goal
  const hardGoal = analyzer.analyze({
    name: 'Buy House',
    targetAmount: 5000000,
    currentAmount: 100000,
    deadline: new Date(Date.now() + 365 * 2 * 86400000).toISOString(),
    priority: 'high'
  }, { monthlyIncome: 50000, totalExpenses: 40000 });

  assert(hardGoal.feasibilityScore < easyGoal.feasibilityScore, 'Hard goal scores lower');
  assert(hardGoal.riskLevel === 'high' || hardGoal.riskLevel === 'medium', 'Risk is elevated');
  console.log(`    Hard goal: PASSED (score=${hardGoal.feasibilityScore}, risk=${hardGoal.riskLevel})`);

  // Test Multi-Goal Optimizer
  console.log('  ✓ Testing MultiGoalOptimizer...');
  const optimizer = new MultiGoalOptimizer();
  const multiResult = optimizer.optimize([
    { name: 'Emergency Fund', targetAmount: 300000, currentAmount: 50000,
      deadline: new Date(Date.now() + 365 * 86400000).toISOString(), priority: 'critical' },
    { name: 'Vacation', targetAmount: 100000, currentAmount: 20000,
      deadline: new Date(Date.now() + 180 * 86400000).toISOString(), priority: 'low' },
    { name: 'Car Fund', targetAmount: 500000, currentAmount: 100000,
      deadline: new Date(Date.now() + 365 * 3 * 86400000).toISOString(), priority: 'medium' }
  ], { monthlyIncome: 75000, totalExpenses: 50000, existingCommitments: 5000 });

  assert(multiResult.goals.length === 3, 'All goals processed');
  assert(multiResult.summary.totalRequired > 0, 'Total required computed');
  assert(multiResult.summary.totalAvailable > 0, 'Available budget computed');
  assert(multiResult.summary.fullyFunded >= 0, 'Funded count computed');
  assert(multiResult.recommendation, 'Overall recommendation');
  assert(multiResult.scenarioAnalysis, 'Scenario analysis included');
  // Priority ordering: critical > medium > low
  assert(multiResult.goals[0].priority === 'critical', 'Critical goal first');
  console.log(`    MultiGoal: PASSED (${multiResult.summary.fullyFunded}/${multiResult.goals.length} funded, ₹${multiResult.summary.totalAllocated}/mo)`);

  // Test Progress Tracker
  console.log('  ✓ Testing GoalProgressTracker...');
  const tracker = new GoalProgressTracker();
  for (let i = 0; i < 6; i++) {
    tracker.trackProgress('user1', 'goal1', {
      currentAmount: 50000 + i * 20000,
      contribution: 15000 + i * 1000,
      returns: 500 + i * 200
    });
  }
  const progress = tracker.trackProgress('user1', 'goal1', {
    currentAmount: 170000, contribution: 21000, returns: 1700
  });
  assert(progress.trend, 'Trend detected');
  assert(progress.contributionStreak >= 0, 'Streak tracked');
  assert(progress.totalContributed > 0, 'Contributions summed');
  assert(progress.motivation, 'Motivation message');
  const history = tracker.getHistory('user1', 'goal1');
  assert(history.length === 7, 'History tracked');
  console.log(`    ProgressTracker: PASSED (trend=${progress.trend}, streak=${progress.contributionStreak}, ${history.length} points)`);

  // Test Goal Recommendation Engine
  console.log('  ✓ Testing GoalRecommendationEngine...');
  const recEngine = new GoalRecommendationEngine();

  const recs1 = recEngine.suggestGoals({
    age: 28, monthlyIncome: 60000, hasEmergencyFund: false,
    hasInsurance: false, hasRetirementPlan: false
  });
  assert(recs1.suggestions.length >= 2, 'Multiple goals suggested');
  assert(recs1.topPriority, 'Top priority identified');
  assert(recs1.topPriority.priority === 'critical', 'Emergency fund is critical');

  const recs2 = recEngine.suggestGoals({
    age: 35, monthlyIncome: 150000, hasEmergencyFund: true,
    hasInsurance: true, hasRetirementPlan: false, hasKids: true
  });
  assert(recs2.suggestions.length >= 2, 'More goals suggested for higher income');
  assert(recs2.suggestions.some(s => s.category === 'retirement'), 'Retirement suggested');
  assert(recs2.suggestions.some(s => s.category === 'education'), 'Education suggested for parents');
  console.log(`    GoalRecommendations: PASSED (${recs1.suggestions.length} for young, ${recs2.suggestions.length} for parent)`);

  // Test Unified Service
  console.log('  ✓ Testing GoalAchievementService...');
  const service = new GoalAchievementService();
  const comprehensive = service.getComprehensiveAnalysis(
    [
      { name: 'Emergency Fund', targetAmount: 300000, currentAmount: 100000, deadline: '2027-03-01', priority: 'critical' },
      { name: 'Vacation', targetAmount: 150000, currentAmount: 30000, deadline: '2026-12-01', priority: 'low' }
    ],
    { monthlyIncome: 80000, totalExpenses: 55000, existingCommitments: 5000, age: 30 }
  );
  assert(comprehensive.optimization, 'Optimization included');
  assert(comprehensive.suggestions, 'Suggestions included');
  assert(comprehensive.overallHealth, 'Overall health computed');
  assert(comprehensive.overallHealth.goalsCount === 2, 'Goal count correct');
  console.log(`    GoalService: PASSED (health avg=${comprehensive.overallHealth.averageFeasibility})`);

  console.log('  ✅ All Goal Achievement tests passed!');
}

// ============================================================================
// §2  AI DATA PIPELINE TESTS
// ============================================================================

async function testAIDataPipeline() {
  console.log('\n=== AI DATA PIPELINE TESTS ===');

  const {
    FinancialDataPreprocessor, FinancialFeatureStore,
    AIBatchProcessor, DataQualityChecker,
    AIDataPipelineService
  } = require('../services/ai/aiDataPipeline');

  // Generate test data
  const rawTransactions = Array.from({ length: 100 }, (_, i) => ({
    _id: `txn_${i}`,
    amount: (i % 3 === 0) ? (50000 + Math.random() * 30000) : -(200 + Math.random() * 5000),
    type: i % 3 === 0 ? 'income' : 'expense',
    category: i % 3 === 0 ? 'salary' : ['food', 'transport', 'shopping', 'entertainment', 'utilities'][i % 5],
    description: i % 3 === 0 ? 'Monthly Salary' : ['Swiggy Order', 'Uber Ride', 'Amazon Purchase', 'Netflix Sub', 'Electricity Bill'][i % 5],
    date: new Date(Date.now() - i * 2 * 86400000)
  }));

  // Test Data Preprocessor
  console.log('  ✓ Testing FinancialDataPreprocessor...');
  const preprocessor = new FinancialDataPreprocessor();
  const { processed, stats } = preprocessor.process(rawTransactions);
  assert(processed.length > 0, 'Transactions processed');
  assert(processed[0].dayOfWeek !== undefined, 'Temporal features added');
  assert(processed[0].amountLog > 0, 'Log amount computed');
  assert(processed[0].amountBucket, 'Amount bucket assigned');
  assert(processed[0].merchant, 'Merchant extracted');
  assert(stats.totalTransactions > 0, 'Stats computed');
  assert(stats.categories > 0, 'Categories counted');
  console.log(`    Preprocessor: PASSED (${processed.length} processed, ${stats.categories} categories)`);

  // Test Feature Store
  console.log('  ✓ Testing FinancialFeatureStore...');
  const featureStore = new FinancialFeatureStore();
  const features = featureStore.computeFeatures('user1', processed);
  assert(features.monthly_income > 0, 'Monthly income computed');
  assert(features.monthly_expense >= 0, 'Monthly expense computed');
  assert(typeof features.savings_rate === 'number', 'Savings rate computed');
  assert(typeof features.weekend_spend_ratio === 'number', 'Weekend ratio computed');
  assert(typeof features.impulse_score === 'number', 'Impulse score computed');
  assert(features.category_diversity > 0, 'Category diversity computed');
  assert(features.peak_spending_hour >= 0, 'Peak hour computed');
  assert(features.salary_day >= 0, 'Salary day detected');

  const stored = featureStore.getFeatures('user1');
  assert(stored, 'Features cached');
  assert(stored.transactionCount === processed.length, 'Transaction count stored');

  const vector = featureStore.getFeatureVector('user1');
  assert(Array.isArray(vector), 'Vector is array');
  assert(vector.length === featureStore.getFeatureNames().length, 'Vector matches feature count');
  console.log(`    FeatureStore: PASSED (${Object.keys(features).length} features, vector dim=${vector.length})`);

  // Test Data Quality Checker
  console.log('  ✓ Testing DataQualityChecker...');
  const checker = new DataQualityChecker();

  // Good data
  const goodQuality = checker.check(rawTransactions);
  assert(goodQuality.score > 0, 'Score computed');
  assert(goodQuality.rating, 'Rating assigned');
  assert(typeof goodQuality.aiReadiness === 'boolean', 'AI readiness determined');
  console.log(`    Good data quality: score=${goodQuality.score} (${goodQuality.rating})`);

  // Bad data
  const badData = [
    { amount: 0 },
    { amount: 500 },
    { amount: 500, description: 'test' }
  ];
  const badQuality = checker.check(badData);
  assert(badQuality.score < goodQuality.score, 'Bad data scores lower');
  assert(badQuality.issues.length > 0, 'Issues identified');
  console.log(`    Bad data quality: score=${badQuality.score} (${badQuality.issues.length} issues)`);

  // Empty data
  const emptyQuality = checker.check([]);
  assert(emptyQuality.score === 0, 'Empty data scores 0');
  console.log('    DataQualityChecker: PASSED');

  // Test Batch Processor
  console.log('  ✓ Testing AIBatchProcessor...');
  const batch = new AIBatchProcessor();
  batch.addTask('task1', async () => ({ result: 'done1' }), 1);
  batch.addTask('task2', async () => ({ result: 'done2' }), 2);
  batch.addTask('fail_task', async () => { throw new Error('intentional'); }, 3);

  const batchResult = await batch.processAll();
  assert(batchResult.tasksProcessed === 3, 'All tasks processed');
  assert(batchResult.results.task1.success, 'Task 1 succeeded');
  assert(batchResult.results.task2.success, 'Task 2 succeeded');
  assert(!batchResult.results.fail_task.success, 'Failed task tracked');
  assert(batchResult.failures === 1, 'Failure counted');
  console.log(`    BatchProcessor: PASSED (${batchResult.tasksProcessed} tasks, ${batchResult.failures} failures)`);

  // Test Full Pipeline
  console.log('  ✓ Testing AIDataPipelineService...');
  const pipeline = new AIDataPipelineService();
  const pipeResult = await pipeline.runPipeline('user1', rawTransactions);

  assert(pipeResult.pipeline.success, 'Pipeline succeeded');
  assert(pipeResult.pipeline.steps.length >= 3, 'Multiple steps executed');
  assert(pipeResult.processedData.length > 0, 'Data processed');
  assert(pipeResult.features, 'Features extracted');
  assert(pipeResult.quality.score > 0, 'Quality checked');
  assert(pipeResult.stats, 'Stats computed');
  assert(pipeResult.pipeline.totalDuration >= 0, 'Duration tracked');

  // Verify feature retrieval
  const cachedFeatures = pipeline.getFeatures('user1');
  assert(cachedFeatures, 'Features retrievable after pipeline');
  const cachedVector = pipeline.getFeatureVector('user1');
  assert(cachedVector, 'Feature vector retrievable');

  // Check pipeline history
  const history = pipeline.getPipelineHistory();
  assert(history.length === 1, 'History tracked');
  console.log(`    Pipeline: PASSED (${pipeResult.pipeline.steps.length} steps, ${pipeResult.pipeline.totalDuration}ms)`);

  console.log('  ✅ All Data Pipeline tests passed!');
}

// ============================================================================
// §3  CROSS-MODULE INTEGRATION TESTS
// ============================================================================

async function testCrossModuleIntegration() {
  console.log('\n=== CROSS-MODULE INTEGRATION TESTS ===');

  // Test: Pipeline -> Features -> Anomaly Detection
  console.log('  ✓ Testing Pipeline -> Features flow...');
  const { AIDataPipelineService } = require('../services/ai/aiDataPipeline');
  const pipeline = new AIDataPipelineService();

  const txns = Array.from({ length: 60 }, (_, i) => ({
    amount: i % 4 === 0 ? 75000 : -(500 + Math.random() * 3000),
    type: i % 4 === 0 ? 'income' : 'expense',
    category: i % 4 === 0 ? 'salary' : ['food', 'transport', 'shopping'][i % 3],
    description: i % 4 === 0 ? 'Salary' : 'Expense',
    date: new Date(Date.now() - i * 2 * 86400000)
  }));

  const pipeResult = await pipeline.runPipeline('integration_user', txns);
  assert(pipeResult.features.monthly_income > 0, 'Income feature from pipeline');
  assert(pipeResult.features.savings_rate !== undefined, 'Savings rate from pipeline');
  console.log(`    Pipeline->Features: PASSED (income=₹${Math.round(pipeResult.features.monthly_income)})`);

  // Test: Features -> Credit Score
  console.log('  ✓ Testing Features -> Credit Score...');
  const { CreditScoreService } = require('../services/ai/creditScorePredictor');
  const creditService = new CreditScoreService();
  const score = creditService.getScore('integration_user', {
    monthlyIncome: pipeResult.features.monthly_income,
    loans: [],
    creditCards: []
  });
  assert(score.score >= 300 && score.score <= 900, 'Credit score in range');
  console.log(`    Features->Credit: PASSED (score=${score.score})`);

  // Test: Features -> Goal Achievement
  console.log('  ✓ Testing Features -> Goals...');
  const { GoalAchievementService } = require('../services/ai/goalAchievementEngine');
  const goalService = new GoalAchievementService();
  const goalAnalysis = goalService.analyzeGoal(
    { name: 'Test Goal', targetAmount: 500000, deadline: '2028-01-01' },
    {
      monthlyIncome: pipeResult.features.monthly_income,
      totalExpenses: pipeResult.features.monthly_expense
    }
  );
  assert(goalAnalysis.feasibilityScore >= 0, 'Goal feasibility from features');
  console.log(`    Features->Goals: PASSED (feasibility=${goalAnalysis.feasibilityScore})`);

  // Test: Features -> Cash Flow
  console.log('  ✓ Testing Features -> Cash Flow...');
  const { CashFlowForecaster } = require('../services/ai/cashFlowIntelligence');
  const forecaster = new CashFlowForecaster();
  const forecast = forecaster.forecast(txns, 30, pipeResult.features.monthly_income * 3);
  assert(forecast.daily.length === 30, 'Forecast generated from features');
  console.log(`    Features->CashFlow: PASSED (${forecast.daily.length} days forecast)`);

  // Test: Full orchestrator integration
  console.log('  ✓ Testing Orchestrator status...');
  const orchestrator = require('../services/ai/aiOrchestrator');
  const status = orchestrator.getStatus();
  assert(status.version === '3.0.0', 'Orchestrator version');
  assert(Object.keys(status.modules).length >= 7, 'Multiple modules active');
  console.log(`    Orchestrator: PASSED (${Object.keys(status.modules).length} modules, v${status.version})`);

  console.log('  ✅ All Integration tests passed!');
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllUltimateTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Financial Analyzer — Ultimate AI Tests                     ║');
  console.log('║   Goal Achievement, Data Pipeline, Cross-Module Integration ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const suites = [
    { name: 'Goal Achievement', fn: testGoalAchievement },
    { name: 'AI Data Pipeline', fn: testAIDataPipeline },
    { name: 'Cross-Module Integration', fn: testCrossModuleIntegration }
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

runAllUltimateTests().catch(console.error);
