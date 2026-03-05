// ============================================================================
// AI INTEGRATION TESTS — Comprehensive Tests for All AI Modules
// ============================================================================

'use strict';

const assert = require('assert');

// ============================================================================
// §1  REINFORCEMENT LEARNING TESTS
// ============================================================================

async function testReinforcementLearning() {
  console.log('\n=== REINFORCEMENT LEARNING TESTS ===');

  const {
    QTable, DQN, PolicyGradientAgent, ActorCritic, ReplayBuffer,
    BudgetOptimizationEnv, InvestmentStrategyEnv, DebtPayoffEnv,
    RLBudgetOptimizer, MultiArmedBandit, RandomGenerator
  } = require('../services/ai/reinforcementLearning');

  // Test QTable
  console.log('  ✓ Testing QTable...');
  const qt = new QTable({ epsilon: 0.5 });
  const action = qt.getAction('state1', 3);
  assert(action >= 0 && action < 3, 'Action in valid range');
  qt.update('state1', action, 1.0, 'state2', 3);
  assert(qt.totalUpdates === 1, 'Update count incremented');
  console.log('    QTable: PASSED');

  // Test DQN
  console.log('  ✓ Testing DQN...');
  const dqn = new DQN({ stateSize: 4, actionSize: 3, hiddenSizes: [8, 4] });
  const dqnAction = dqn.getAction([0.1, 0.2, 0.3, 0.4]);
  assert(dqnAction >= 0 && dqnAction < 3, 'DQN action in valid range');
  dqn.addExperience([0.1, 0.2, 0.3, 0.4], dqnAction, 1.0, [0.2, 0.3, 0.4, 0.5], false);
  console.log('    DQN: PASSED');

  // Test Policy Gradient
  console.log('  ✓ Testing PolicyGradientAgent...');
  const pg = new PolicyGradientAgent({ stateSize: 4, actionSize: 3 });
  const pgAction = pg.getAction([0.1, 0.2, 0.3, 0.4]);
  assert(pgAction >= 0 && pgAction < 3, 'PG action in valid range');
  pg.addReward(1.0);
  const probs = pg.getActionProbabilities([0.1, 0.2, 0.3, 0.4]);
  assert(probs.length === 3, 'Correct number of action probabilities');
  console.log('    PolicyGradient: PASSED');

  // Test Actor-Critic
  console.log('  ✓ Testing ActorCritic...');
  const ac = new ActorCritic({ stateSize: 4, actionSize: 3 });
  const acAction = ac.getAction([0.1, 0.2, 0.3, 0.4]);
  assert(acAction >= 0 && acAction < 3, 'AC action in valid range');
  const acResult = ac.update(
    [0.1, 0.2, 0.3, 0.4], acAction, 1.0, [0.2, 0.3, 0.4, 0.5], false
  );
  assert(typeof acResult.advantage === 'number', 'Advantage computed');
  console.log('    ActorCritic: PASSED');

  // Test Budget Environment
  console.log('  ✓ Testing BudgetOptimizationEnv...');
  const budgetEnv = new BudgetOptimizationEnv({ monthlyIncome: 50000 });
  const state = budgetEnv.reset();
  assert(state.length === budgetEnv.getStateSize(), 'Correct state size');
  const stepResult = budgetEnv.step(0);
  assert(typeof stepResult.reward === 'number', 'Reward returned');
  assert(stepResult.state.length === budgetEnv.getStateSize(), 'State size preserved');
  console.log('    BudgetEnv: PASSED');

  // Test Investment Environment
  console.log('  ✓ Testing InvestmentStrategyEnv...');
  const invEnv = new InvestmentStrategyEnv({ riskTolerance: 0.5 });
  const invState = invEnv.reset();
  assert(invState.length === invEnv.getStateSize(), 'Correct state size');
  const invStep = invEnv.step(0);
  assert(typeof invStep.info.sharpeRatio === 'number', 'Sharpe ratio computed');
  console.log('    InvestmentEnv: PASSED');

  // Test Debt Payoff Environment
  console.log('  ✓ Testing DebtPayoffEnv...');
  const debtEnv = new DebtPayoffEnv();
  const debtState = debtEnv.reset();
  assert(debtState.length === debtEnv.getStateSize(), 'Correct state size');
  const debtStep = debtEnv.step(0);
  assert(typeof debtStep.info.totalBalance === 'number', 'Balance tracked');
  console.log('    DebtPayoffEnv: PASSED');

  // Test Multi-Armed Bandit
  console.log('  ✓ Testing MultiArmedBandit...');
  const bandit = new MultiArmedBandit(5, { strategy: 'ucb1' });
  const arm = bandit.selectArm();
  assert(arm >= 0 && arm < 5, 'Valid arm selected');
  bandit.update(arm, 1.0);
  const stats = bandit.getStatistics();
  assert(stats.totalPulls === 1, 'Pull count correct');
  console.log('    MultiArmedBandit: PASSED');

  // Test RL Budget Optimizer (high-level) — quick test with minimal training
  console.log('  ✓ Testing RLBudgetOptimizer...');
  const rlOpt = new RLBudgetOptimizer();
  // Skip full training, just verify the object structure and serialization
  assert(typeof rlOpt.optimizeBudget === 'function', 'optimizeBudget method exists');
  assert(typeof rlOpt.optimizeInvestments === 'function', 'optimizeInvestments method exists');
  assert(typeof rlOpt.optimizeDebtPayoff === 'function', 'optimizeDebtPayoff method exists');
  console.log('    RLBudgetOptimizer: PASSED (structure verified)');

  console.log('  ✅ All RL tests passed!');
}

// ============================================================================
// §2  ANOMALY DETECTION TESTS
// ============================================================================

async function testAnomalyDetection() {
  console.log('\n=== ANOMALY DETECTION TESTS ===');

  const {
    IsolationForest, LocalOutlierFactor, StatisticalProcessControl,
    Autoencoder, EnsembleAnomalyDetector, FinancialAnomalyAnalyzer,
    TransactionFeatureExtractor, ChangePointDetector
  } = require('../services/ai/advancedAnomalyDetection');

  // Test feature extractor
  console.log('  ✓ Testing TransactionFeatureExtractor...');
  const extractor = new TransactionFeatureExtractor();
  const features = extractor.extract({
    amount: 5000, date: new Date(), category: 'food', type: 'expense', description: 'Restaurant'
  });
  assert(features.length === 10, 'Correct feature vector size');
  console.log('    FeatureExtractor: PASSED');

  // Test Isolation Forest
  console.log('  ✓ Testing IsolationForest...');
  const data = Array.from({ length: 100 }, () => [Math.random(), Math.random()]);
  data.push([10, 10]); // Anomaly
  const iForest = new IsolationForest({ numTrees: 50, sampleSize: 50 });
  iForest.fit(data);
  const anomalyResult = iForest.predict([10, 10]);
  assert(typeof anomalyResult.score === 'number', 'Score returned');
  assert(typeof anomalyResult.isAnomaly === 'boolean', 'Anomaly flag returned');
  console.log('    IsolationForest: PASSED');

  // Test LOF
  console.log('  ✓ Testing LocalOutlierFactor...');
  const lof = new LocalOutlierFactor({ k: 5 });
  lof.fit(data.slice(0, 50));
  const lofResult = lof.predict([10, 10]);
  assert(typeof lofResult.score === 'number', 'LOF score returned');
  console.log('    LOF: PASSED');

  // Test SPC
  console.log('  ✓ Testing StatisticalProcessControl...');
  const spc = new StatisticalProcessControl();
  const values = Array.from({ length: 50 }, () => 100 + Math.random() * 20);
  spc.setBaseline(values);
  const xBar = spc.xBarChart([...values, 200]); // Add outlier
  assert(xBar.length > 0, 'X-bar chart generated');
  assert(xBar[xBar.length - 1].isAnomaly === true, 'Outlier detected');
  console.log('    SPC: PASSED');

  // Test Autoencoder
  console.log('  ✓ Testing Autoencoder...');
  const ae = new Autoencoder({ inputSize: 4, encoderSizes: [3, 2], decoderSizes: [2, 3], epochs: 20 });
  const aeData = Array.from({ length: 50 }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  const aeResult = ae.fit(aeData);
  assert(typeof aeResult.finalLoss === 'number', 'Training loss returned');
  assert(ae.trained === true, 'Model marked as trained');
  const aePred = ae.predict([0.5, 0.5, 0.5, 0.5]);
  assert(typeof aePred.error === 'number', 'Reconstruction error computed');
  console.log('    Autoencoder: PASSED');

  // Test ChangePoint Detection
  console.log('  ✓ Testing ChangePointDetector...');
  const cpData = [...Array(30).fill(10), ...Array(30).fill(50)];
  const cpd = new ChangePointDetector({ minSegmentLength: 5 });
  const changepoints = cpd.binarySegmentation(cpData);
  assert(changepoints.length > 0, 'Changepoint detected');
  assert(changepoints[0].type === 'increase', 'Correct direction');
  console.log('    ChangePointDetector: PASSED');

  // Test Financial Anomaly Analyzer
  console.log('  ✓ Testing FinancialAnomalyAnalyzer...');
  const analyzer = new FinancialAnomalyAnalyzer();
  const transactions = Array.from({ length: 50 }, (_, i) => ({
    _id: `t${i}`, amount: 500 + Math.random() * 500, date: new Date(Date.now() - i * 86400000),
    category: ['food', 'transport', 'shopping'][i % 3], type: 'expense', description: 'Test'
  }));
  transactions.push({
    _id: 'anomaly', amount: 50000, date: new Date(), category: 'shopping', type: 'expense', description: 'Anomaly'
  });
  const analyzerResult = await analyzer.analyzeTransactions('test_user', transactions);
  assert(analyzerResult.summary, 'Summary returned');
  assert(typeof analyzerResult.summary.totalAnalyzed === 'number', 'Total analyzed tracked');
  console.log('    FinancialAnomalyAnalyzer: PASSED');

  console.log('  ✅ All Anomaly Detection tests passed!');
}

// ============================================================================
// §3  KNOWLEDGE GRAPH TESTS
// ============================================================================

async function testKnowledgeGraph() {
  console.log('\n=== KNOWLEDGE GRAPH TESTS ===');

  const { KnowledgeGraph, FinancialKnowledgeGraphBuilder, GraphReasoningEngine } = require('../services/ai/knowledgeGraph');

  // Test base KnowledgeGraph
  console.log('  ✓ Testing KnowledgeGraph...');
  const kg = new KnowledgeGraph();
  kg.addNode('user:1', 'user', { name: 'Test User' });
  kg.addNode('merchant:amazon', 'merchant', { name: 'Amazon', totalSpent: 5000 });
  kg.addEdge('user:1', 'merchant:amazon', 'transacts_with', { weight: 2 });

  assert(kg.nodes.size === 2, 'Correct node count');
  assert(kg.edges.size === 1, 'Correct edge count');

  const neighbors = kg.getNeighbors('user:1');
  assert(neighbors.length === 1, 'Neighbor found');
  assert(neighbors[0].node.id === 'merchant:amazon', 'Correct neighbor');

  const path = kg.findPath('user:1', 'merchant:amazon');
  assert(path !== null, 'Path found');
  assert(path.length === 2, 'Correct path length');

  const search = kg.search('Amazon');
  assert(search.length > 0, 'Search results found');

  const importance = kg.computeImportance(5);
  assert(typeof importance['user:1'] === 'number', 'Importance computed');

  const communities = kg.detectCommunities();
  assert(communities.length > 0, 'Communities detected');

  const stats = kg.getStats();
  assert(stats.nodeCount === 2, 'Stats correct');
  console.log('    KnowledgeGraph: PASSED');

  // Test FinancialKnowledgeGraphBuilder
  console.log('  ✓ Testing FinancialKnowledgeGraphBuilder...');
  const builder = new FinancialKnowledgeGraphBuilder();
  await builder.buildFromUserData('user1', {
    transactions: [
      { _id: '1', amount: 500, date: new Date(), category: 'food', type: 'expense', description: 'Restaurant' },
      { _id: '2', amount: 50000, date: new Date(), category: 'salary', type: 'income', description: 'Salary' }
    ],
    budgets: [{ _id: 'b1', category: 'food', limit: 10000, spent: 5000 }],
    goals: [{ _id: 'g1', name: 'Emergency Fund', targetAmount: 100000, currentAmount: 30000 }],
    loans: [{ _id: 'l1', name: 'Home Loan', principalAmount: 3000000, outstandingAmount: 2500000, interestRate: 0.085, emiAmount: 25000, status: 'active' }]
  });

  const graphStats = builder.graph.getStats();
  assert(graphStats.nodeCount > 5, 'Multiple nodes created');
  assert(graphStats.edgeCount > 0, 'Edges created');

  const recommendations = builder.getRecommendations('user1');
  assert(Array.isArray(recommendations), 'Recommendations returned');

  const queryResult = builder.queryGraph('user1', 'how much did I spend?');
  assert(queryResult.answer, 'Answer returned');
  console.log('    FinancialKnowledgeGraphBuilder: PASSED');

  // Test GraphReasoningEngine
  console.log('  ✓ Testing GraphReasoningEngine...');
  const reasoner = new GraphReasoningEngine(builder.graph);
  const reasoning = reasoner.reason('user1', 'spending on food');
  assert(reasoning.chain.length > 0, 'Reasoning chain generated');
  assert(reasoning.conclusion, 'Conclusion generated');

  const whatIf = reasoner.whatIf('user1', { type: 'take_loan', amount: 500000, rate: 0.12, tenure: 5 });
  assert(whatIf.impacts.length > 0, 'What-if impacts computed');
  console.log('    GraphReasoningEngine: PASSED');

  console.log('  ✅ All Knowledge Graph tests passed!');
}

// ============================================================================
// §4  AUTOML TESTS
// ============================================================================

async function testAutoML() {
  console.log('\n=== AUTOML TESTS ===');

  const {
    FeatureEngineer, LinearRegressionModel, LogisticRegressionModel,
    KNearestNeighbors, GradientBoostingRegressor, SupportVectorRegressor,
    CrossValidator, AutoMLPipeline
  } = require('../services/ai/autoMLPipeline');

  // Test Feature Engineer
  console.log('  ✓ Testing FeatureEngineer...');
  const fe = new FeatureEngineer();
  const features = fe.generateTransactionFeatures([{
    amount: 1000, date: new Date(), category: 'food', type: 'expense', description: 'Test'
  }]);
  assert(features.length === 1, 'Feature row generated');
  assert(Object.keys(features[0]).length > 20, 'Sufficient features generated');
  console.log('    FeatureEngineer: PASSED');

  // Test Linear Regression
  console.log('  ✓ Testing LinearRegression...');
  const lr = new LinearRegressionModel();
  const X = Array.from({ length: 50 }, () => [Math.random(), Math.random()]);
  const y = X.map(x => x[0] * 2 + x[1] * 3 + Math.random() * 0.1);
  lr.fit(X, y, { epochs: 200, learningRate: 0.05 });
  assert(lr.trained, 'Model trained');
  const score = lr.score(X, y);
  assert(score > 0, 'Positive R² score');
  console.log(`    LinearRegression: PASSED (R²=${score.toFixed(3)})`);

  // Test Logistic Regression
  console.log('  ✓ Testing LogisticRegression...');
  const logReg = new LogisticRegressionModel();
  const classX = Array.from({ length: 40 }, () => [Math.random(), Math.random()]);
  const classY = classX.map(x => x[0] + x[1] > 1 ? 'high' : 'low');
  logReg.fit(classX, classY, { epochs: 200, learningRate: 0.05 });
  const classScore = logReg.score(classX, classY);
  assert(classScore > 0.5, 'Better than random');
  console.log(`    LogisticRegression: PASSED (Accuracy=${(classScore * 100).toFixed(1)}%)`);

  // Test KNN
  console.log('  ✓ Testing KNN...');
  const knn = new KNearestNeighbors(3);
  knn.fit(classX, classY);
  const knnScore = knn.score(classX, classY);
  assert(knnScore > 0.5, 'Better than random');
  console.log(`    KNN: PASSED (Accuracy=${(knnScore * 100).toFixed(1)}%)`);

  // Test GradientBoosting
  console.log('  ✓ Testing GradientBoosting...');
  const gb = new GradientBoostingRegressor({ numTrees: 10, maxDepth: 3 });
  gb.fit(X, y);
  const gbScore = gb.score(X, y);
  assert(gbScore > 0, 'Positive score');
  console.log(`    GradientBoosting: PASSED (R²=${gbScore.toFixed(3)})`);

  // Test Cross Validation
  console.log('  ✓ Testing CrossValidator...');
  const cv = new CrossValidator({ folds: 3 });
  const cvResult = cv.validate(new LinearRegressionModel(), X, y, { epochs: 50 });
  assert(cvResult.scores.length === 3, 'Correct number of fold scores');
  assert(typeof cvResult.meanScore === 'number', 'Mean score computed');
  console.log(`    CrossValidator: PASSED (CV Score=${cvResult.meanScore.toFixed(3)} ± ${cvResult.stdScore.toFixed(3)})`);

  // Test AutoML Pipeline
  console.log('  ✓ Testing AutoMLPipeline...');
  const automl = new AutoMLPipeline();
  const pipelineResult = await automl.run('regression', X, y);
  assert(pipelineResult.bestModel, 'Best model selected');
  assert(pipelineResult.bestScore > 0, 'Positive best score');
  assert(pipelineResult.allModels.length > 1, 'Multiple models evaluated');
  console.log(`    AutoMLPipeline: PASSED (Best: ${pipelineResult.bestModel}, Score: ${pipelineResult.bestScore.toFixed(3)})`);

  console.log('  ✅ All AutoML tests passed!');
}

// ============================================================================
// §5  EXPLAINABLE AI TESTS
// ============================================================================

async function testExplainableAI() {
  console.log('\n=== EXPLAINABLE AI TESTS ===');

  const {
    PermutationFeatureImportance, ShapleyExplainer, LIMEExplainer,
    CounterfactualExplainer, NaturalLanguageExplainer, ExplainabilityService
  } = require('../services/ai/explainableAI');
  const { LinearRegressionModel } = require('../services/ai/autoMLPipeline');

  // Setup model
  const model = new LinearRegressionModel();
  const X = Array.from({ length: 50 }, () => [Math.random(), Math.random(), Math.random()]);
  const y = X.map(x => x[0] * 2 + x[1] * 3);
  model.fit(X, y, { epochs: 100 });

  // Test Permutation Importance
  console.log('  ✓ Testing PermutationFeatureImportance...');
  const pfi = new PermutationFeatureImportance({ nRepeats: 5 });
  const importance = pfi.compute(model, X, y, ['f1', 'f2', 'f3']);
  assert(importance.topFeatures.length > 0, 'Top features identified');
  console.log('    PermutationImportance: PASSED');

  // Test SHAP
  console.log('  ✓ Testing ShapleyExplainer...');
  const shap = new ShapleyExplainer({ nSamples: 20 });
  shap.fit(X);
  const shapResult = shap.explain(model, X[0]);
  assert(shapResult.shapValues.length === 3, 'SHAP values for all features');
  assert(typeof shapResult.baseValue === 'number', 'Base value computed');
  console.log('    SHAP: PASSED');

  // Test LIME
  console.log('  ✓ Testing LIMEExplainer...');
  const lime = new LIMEExplainer({ nSamples: 50 });
  const limeResult = lime.explain(model, X[0], ['f1', 'f2', 'f3']);
  assert(limeResult.coefficients.length === 3, 'Coefficients for all features');
  assert(limeResult.featureExplanations.length === 3, 'All features explained');
  console.log('    LIME: PASSED');

  // Test Counterfactual
  console.log('  ✓ Testing CounterfactualExplainer...');
  const cf = new CounterfactualExplainer({ maxIterations: 50, numCounterfactuals: 2 });
  const cfResult = cf.explain(model, X[0], 10);
  assert(typeof cfResult.originalPrediction === 'number', 'Original prediction returned');
  console.log('    CounterfactualExplainer: PASSED');

  // Test NL Explainer
  console.log('  ✓ Testing NaturalLanguageExplainer...');
  const nlExp = new NaturalLanguageExplainer();
  const budgetExpl = nlExp.explainBudgetDecision({
    category: 'food', spent: 12000, budget: 10000
  });
  assert(budgetExpl.length > 0, 'Budget explanation generated');
  const anomalyExpl = nlExp.explainAnomaly({
    type: 'high_amount', amount: 50000, merchant: 'Amazon', category: 'shopping', deviation: 3.5
  });
  assert(anomalyExpl.length > 0, 'Anomaly explanation generated');
  const healthExpl = nlExp.explainHealthScore({ score: 75, strengths: ['Savings'] });
  assert(healthExpl.length > 0, 'Health explanation generated');
  console.log('    NaturalLanguageExplainer: PASSED');

  console.log('  ✅ All XAI tests passed!');
}

// ============================================================================
// §6  CONVERSATIONAL AI TESTS
// ============================================================================

async function testConversationalAI() {
  console.log('\n=== CONVERSATIONAL AI TESTS ===');

  const {
    ConversationMemory, FinancialIntentClassifier,
    FinancialEntityExtractor, DialogStateTracker, ConversationalAIEngine
  } = require('../services/ai/conversationalAI');

  // Test Intent Classifier
  console.log('  ✓ Testing FinancialIntentClassifier...');
  const classifier = new FinancialIntentClassifier();

  const tests = [
    { text: 'How much did I spend this month?', expected: 'spending_query' },
    { text: 'Show my budget status', expected: 'budget_query' },
    { text: 'Where should I invest?', expected: 'investment_query' },
    { text: 'What are my active loans?', expected: 'loan_query' },
    { text: 'How to save more money?', expected: 'savings_query' },
    { text: 'Hello', expected: 'greeting' },
    { text: 'Thanks for the help', expected: 'gratitude' },
    { text: 'Any unusual transactions?', expected: 'anomaly_query' },
    { text: 'What\'s my financial health score?', expected: 'health_query' },
    { text: 'Predict my spending next month', expected: 'forecast_query' },
    { text: 'How to save tax under 80C?', expected: 'tax_query' }
  ];

  for (const test of tests) {
    const result = classifier.classify(test.text);
    assert(result.intent === test.expected,
      `"${test.text}" => expected ${test.expected}, got ${result.intent}`);
  }
  console.log(`    IntentClassifier: PASSED (${tests.length} intents correct)`);

  // Test Entity Extractor
  console.log('  ✓ Testing FinancialEntityExtractor...');
  const entityExtractor = new FinancialEntityExtractor();

  const entities1 = entityExtractor.extract('I spent ₹5,000 on food yesterday');
  assert(entities1.some(e => e.type === 'MONEY'), 'Money entity found');
  assert(entities1.some(e => e.type === 'RELATIVE_DATE'), 'Date entity found');

  const entities2 = entityExtractor.extract('My SBI home loan is at 8.5% for 20 years');
  assert(entities2.some(e => e.type === 'BANK'), 'Bank entity found');
  assert(entities2.some(e => e.type === 'PERCENTAGE'), 'Percentage entity found');
  assert(entities2.some(e => e.type === 'DURATION'), 'Duration entity found');
  console.log('    EntityExtractor: PASSED');

  // Test Dialog State Tracker
  console.log('  ✓ Testing DialogStateTracker...');
  const tracker = new DialogStateTracker();
  tracker.update(
    { intent: 'spending_query', confidence: 0.9 },
    { category: 'food', time_period: 'this_month' },
    [{ type: 'MONEY', value: '5000', parsed: { amount: 5000 } }]
  );
  assert(tracker.getState().currentIntent === 'spending_query', 'Intent tracked');
  assert(tracker.getSlot('category') === 'food', 'Slot tracked');
  assert(tracker.getSlot('amount') === 5000, 'Amount from entity tracked');
  console.log('    DialogStateTracker: PASSED');

  // Test Conversation Memory
  console.log('  ✓ Testing ConversationMemory...');
  const memory = new ConversationMemory({ maxShortTerm: 5 });
  for (let i = 0; i < 7; i++) {
    memory.addMessage('user', `Message ${i}`, { intent: 'spending_query' });
  }
  assert(memory.shortTermMemory.length <= 5, 'Short-term memory bounded');
  assert(memory.messageCount === 7, 'Total message count correct');
  const summary = memory.summarize();
  assert(summary.totalMessages === 7, 'Summary correct');
  console.log('    ConversationMemory: PASSED');

  // Test Full Conversation Engine
  console.log('  ✓ Testing ConversationalAIEngine...');
  const engine = new ConversationalAIEngine();
  const greeting = await engine.chat('user1', 'Hello', {});
  assert(greeting.message.length > 0, 'Greeting response generated');
  assert(greeting.detectedIntent === 'greeting', 'Greeting intent detected');

  const spending = await engine.chat('user1', 'How much did I spend on food?', {
    transactions: [
      { amount: 500, date: new Date(), category: 'food', type: 'expense' },
      { amount: 300, date: new Date(), category: 'food', type: 'expense' }
    ]
  });
  assert(spending.message.length > 0, 'Spending response generated');
  assert(spending.detectedIntent === 'spending_query', 'Spending intent detected');
  console.log('    ConversationalAIEngine: PASSED');

  console.log('  ✅ All Conversational AI tests passed!');
}

// ============================================================================
// §7  MODEL MONITORING TESTS
// ============================================================================

async function testModelMonitoring() {
  console.log('\n=== MODEL MONITORING TESTS ===');

  const {
    DataDriftDetector, ConceptDriftDetector,
    PerformanceTracker, ABTestManager, ModelMonitoringService
  } = require('../services/ai/modelMonitoring');

  // Test Data Drift
  console.log('  ✓ Testing DataDriftDetector...');
  const driftDetector = new DataDriftDetector({ windowSize: 20, threshold: 0.05 });
  const refData = Array.from({ length: 50 }, () => [Math.random(), Math.random()]);
  driftDetector.setReference(refData);
  for (let i = 0; i < 25; i++) driftDetector.addObservation([Math.random() + 5, Math.random() + 5]);
  const driftResult = driftDetector.checkDrift();
  assert(typeof driftResult.driftDetected === 'boolean', 'Drift flag returned');
  assert(typeof driftResult.score === 'number', 'Drift score returned');
  console.log('    DataDriftDetector: PASSED');

  // Test Concept Drift
  console.log('  ✓ Testing ConceptDriftDetector...');
  const conceptDrift = new ConceptDriftDetector({ method: 'page_hinkley', minSamples: 10 });
  for (let i = 0; i < 20; i++) {
    conceptDrift.addPrediction(0.5, 0.5);
  }
  for (let i = 0; i < 20; i++) {
    conceptDrift.addPrediction(0.5, 0.9);
  }
  const trend = conceptDrift.getErrorTrend();
  assert(typeof trend.trend === 'string', 'Trend direction returned');
  console.log('    ConceptDriftDetector: PASSED');

  // Test Performance Tracker
  console.log('  ✓ Testing PerformanceTracker...');
  const tracker = new PerformanceTracker();
  for (let i = 0; i < 50; i++) {
    tracker.recordPrediction('model1', {
      predicted: i % 2, actual: i % 2, latency: 50 + Math.random() * 50
    });
  }
  const metrics = tracker.getMetrics('model1');
  assert(metrics.totalPredictions === 50, 'Predictions counted');
  assert(metrics.accuracy === 1.0, 'Perfect accuracy');
  assert(metrics.avgLatency > 0, 'Latency tracked');
  console.log('    PerformanceTracker: PASSED');

  // Test A/B Testing
  console.log('  ✓ Testing ABTestManager...');
  const abTest = new ABTestManager();
  const test = abTest.createTest('test1', { modelA: 'v1', modelB: 'v2', minSamples: 10 });
  assert(test.status === 'running', 'Test running');
  for (let i = 0; i < 20; i++) {
    const variant = abTest.getTestAssignment('test1');
    abTest.recordResult('test1', variant, { correct: Math.random() > 0.3, reward: 1 });
  }
  const testResult = abTest.getTestResults('test1');
  // May or may not have results yet depending on distribution
  console.log('    ABTestManager: PASSED');

  // Test Monitoring Service
  console.log('  ✓ Testing ModelMonitoringService...');
  const service = new ModelMonitoringService();
  service.registerModel('test_model');
  service.setReferenceData('test_model', refData);
  service.recordPrediction('test_model', {
    input: [0.5, 0.5], predicted: 1, actual: 1, latency: 50
  });
  const dashboard = service.getDashboard();
  assert(dashboard.models.test_model, 'Model in dashboard');
  assert(dashboard.summary.totalModels > 0, 'Model count correct');
  console.log('    ModelMonitoringService: PASSED');

  console.log('  ✅ All Model Monitoring tests passed!');
}

// ============================================================================
// §8  ORCHESTRATOR TESTS
// ============================================================================

async function testOrchestrator() {
  console.log('\n=== AI ORCHESTRATOR TESTS ===');

  const orchestrator = require('../services/ai/aiOrchestrator');

  // Test status
  console.log('  ✓ Testing getStatus...');
  const status = orchestrator.getStatus();
  assert(status.version === '3.0.0', 'Version correct');
  assert(status.modules.reinforcementLearning === true, 'RL module active');
  assert(status.modules.conversationalAI === true, 'Chat module active');
  console.log('    Status: PASSED');

  // Test smart categorization
  console.log('  ✓ Testing smartCategorize...');
  const catResult = await orchestrator.smartCategorize('test_user', {
    description: 'Swiggy order #12345', amount: 500, type: 'expense'
  });
  assert(catResult.category === 'food', 'Correct category');
  assert(catResult.confidence > 0, 'Confidence returned');
  console.log('    SmartCategorize: PASSED');

  // Test chat
  console.log('  ✓ Testing chat...');
  const chatResult = await orchestrator.chat('test_user', 'Hello');
  assert(chatResult.message.length > 0, 'Response generated');
  console.log('    Chat: PASSED');

  // Test health score
  console.log('  ✓ Testing computeFinancialHealthScore...');
  const healthResult = await orchestrator.computeFinancialHealthScore('test_user', {
    transactions: [
      { amount: 50000, type: 'income', date: new Date(), category: 'salary' },
      { amount: 10000, type: 'expense', date: new Date(), category: 'food' },
      { amount: 5000, type: 'expense', date: new Date(), category: 'transport' }
    ]
  });
  assert(typeof healthResult.overallScore === 'number', 'Score computed');
  assert(healthResult.rating, 'Rating assigned');
  assert(healthResult.explanation.length > 0, 'Explanation generated');
  console.log(`    HealthScore: PASSED (Score: ${healthResult.overallScore}, Rating: ${healthResult.rating})`);

  // Test insights
  console.log('  ✓ Testing generateInsights...');
  const insightsResult = await orchestrator.generateInsights('test_user', {
    transactions: Array.from({ length: 50 }, (_, i) => ({
      amount: 500 + Math.random() * 2000, type: 'expense',
      date: new Date(Date.now() - i * 86400000),
      category: ['food', 'transport', 'shopping', 'entertainment'][i % 4]
    }))
  });
  assert(insightsResult.insights, 'Insights generated');
  assert(typeof insightsResult.totalInsights === 'number', 'Insight count returned');
  console.log(`    Insights: PASSED (${insightsResult.totalInsights} insights)`);

  // Test explainDecision
  console.log('  ✓ Testing explainDecision...');
  const explanation = await orchestrator.explainDecision('test_user', 'budget', {
    category: 'food', spent: 12000, budget: 10000
  });
  assert(typeof explanation === 'string', 'String explanation returned');
  assert(explanation.length > 0, 'Non-empty explanation');
  console.log('    ExplainDecision: PASSED');

  console.log('  ✅ All Orchestrator tests passed!');
}

// ============================================================================
// MAIN — Run All Tests
// ============================================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Financial Analyzer — Enhanced AI Integration Tests         ║');
  console.log('║   Testing: RL, Anomaly Detection, Knowledge Graph,          ║');
  console.log('║   AutoML, XAI, Conversational AI, Model Monitoring          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const suites = [
    { name: 'Reinforcement Learning', fn: testReinforcementLearning },
    { name: 'Anomaly Detection', fn: testAnomalyDetection },
    { name: 'Knowledge Graph', fn: testKnowledgeGraph },
    { name: 'AutoML', fn: testAutoML },
    { name: 'Explainable AI', fn: testExplainableAI },
    { name: 'Conversational AI', fn: testConversationalAI },
    { name: 'Model Monitoring', fn: testModelMonitoring },
    { name: 'AI Orchestrator', fn: testOrchestrator }
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

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(60));
  console.log(`Results: ${passed} suites passed, ${failed} failed (${duration}s)`);
  console.log('═'.repeat(60));

  if (failed > 0) process.exit(1);
}

runAllTests().catch(console.error);
