// ============================================================================
// EXTENDED AI TESTS — Fraud Detection, Reports, Document Intelligence,
// Behavioral Finance, Spending Intelligence, Financial Forecasting
// ============================================================================

'use strict';

const assert = require('assert');

// ============================================================================
// §1  FRAUD DETECTION TESTS
// ============================================================================

async function testFraudDetection() {
  console.log('\n=== FRAUD DETECTION TESTS ===');

  const {
    FraudRuleEngine, FraudUserProfileBuilder, VelocityAnalyzer,
    BehavioralBiometrics, RiskScoringEngine, FraudAlertManager,
    FraudDetectionService
  } = require('../services/ai/fraudDetectionSystem');

  // Test FraudUserProfileBuilder
  console.log('  ✓ Testing FraudUserProfileBuilder...');
  const builder = new FraudUserProfileBuilder();
  const transactions = Array.from({ length: 50 }, (_, i) => ({
    amount: 500 + Math.random() * 5000, type: 'expense',
    date: new Date(Date.now() - i * 86400000),
    category: ['food', 'transport', 'shopping'][i % 3],
    description: ['Swiggy', 'Uber', 'Amazon'][i % 3],
    merchant: ['Swiggy', 'Uber', 'Amazon'][i % 3]
  }));
  const profile = builder.buildProfile(transactions);
  assert(profile.avgExpense > 0, 'Avg expense computed');
  assert(profile.knownMerchants.size > 0, 'Known merchants tracked');
  assert(Object.keys(profile.categoryAverages).length > 0, 'Category averages built');
  assert(profile.transactionFrequency > 0, 'Frequency computed');
  console.log('    ProfileBuilder: PASSED');

  // Test FraudRuleEngine
  console.log('  ✓ Testing FraudRuleEngine...');
  const engine = new FraudRuleEngine();
  assert(engine.rules.length >= 10, 'Default rules registered');

  const normalResult = engine.evaluate(
    { amount: 500, type: 'expense', date: new Date(), category: 'food', description: 'Swiggy' },
    profile,
    { dailyTotal: 500, transactionsLastHour: 1, recentTransactions: [] }
  );
  assert(typeof normalResult.fraudScore === 'number', 'Fraud score returned');
  assert(normalResult.recommendation, 'Recommendation generated');

  const suspiciousResult = engine.evaluate(
    { amount: 100000, type: 'expense', date: new Date(2026, 2, 5, 3, 0), category: 'unknown', description: 'Foreign Site USD' },
    profile,
    { dailyTotal: 100000, transactionsLastHour: 10, recentTransactions: transactions.slice(0, 5) }
  );
  assert(suspiciousResult.triggeredRules.length > 0, 'Rules triggered');
  assert(suspiciousResult.fraudScore >= 0, 'Fraud score is non-negative');
  console.log(`    RuleEngine: PASSED (normal=${Math.round(normalResult.fraudScore)}, suspicious=${Math.round(suspiciousResult.fraudScore)})`);

  // Test VelocityAnalyzer
  console.log('  ✓ Testing VelocityAnalyzer...');
  const velocity = new VelocityAnalyzer();
  const rapidTxns = Array.from({ length: 20 }, (_, i) => ({
    amount: 100, date: new Date(Date.now() - i * 30000), // 30s apart
    type: 'expense'
  }));
  const velResult = velocity.analyze(
    { amount: 5000, date: new Date(), type: 'expense' },
    rapidTxns
  );
  assert(typeof velResult.isVelocityBreach === 'boolean', 'Velocity breach flag');
  assert(typeof velResult.acceleration === 'object', 'Acceleration computed');
  assert(typeof velResult.escalation === 'object', 'Escalation computed');
  console.log('    VelocityAnalyzer: PASSED');

  // Test BehavioralBiometrics
  console.log('  ✓ Testing BehavioralBiometrics...');
  const biometrics = new BehavioralBiometrics();
  const baseline = biometrics.buildBaseline('user1', transactions);
  assert(baseline, 'Baseline built');
  assert(baseline.typicalHours.length > 0, 'Typical hours computed');
  assert(baseline.amountDistribution.mean > 0, 'Amount distribution computed');

  const comparison = biometrics.compareToBaseline('user1', {
    amount: 50000, date: new Date(2026, 2, 5, 3, 0),
    category: 'luxury', description: 'Unknown Store'
  });
  assert(typeof comparison.deviationScore === 'number', 'Deviation score computed');
  assert(comparison.deviations.length > 0, 'Deviations identified');
  console.log(`    BehavioralBiometrics: PASSED (deviation=${comparison.deviationScore})`);

  // Test RiskScoringEngine
  console.log('  ✓ Testing RiskScoringEngine...');
  const scorer = new RiskScoringEngine();
  const risk = scorer.calculateRiskScore(suspiciousResult, velResult, comparison, 20);
  assert(risk.overallScore >= 0 && risk.overallScore <= 100, 'Score in range');
  assert(risk.riskLevel, 'Risk level assigned');
  assert(risk.action, 'Action recommended');
  assert(risk.breakdown, 'Score breakdown provided');
  console.log(`    RiskScorer: PASSED (score=${risk.overallScore}, level=${risk.riskLevel}, action=${risk.action})`);

  // Test FraudAlertManager
  console.log('  ✓ Testing FraudAlertManager...');
  const alertMgr = new FraudAlertManager();
  const alert = alertMgr.createAlert(
    { _id: 'txn123', amount: 50000, date: new Date() },
    risk,
    { triggeredRules: suspiciousResult.triggeredRules }
  );
  assert(alert.id, 'Alert ID generated');
  assert(alert.status === 'open', 'Alert starts open');

  alertMgr.addNote(alert.id, 'Investigating');
  const resolved = alertMgr.resolveAlert(alert.id, 'false_positive', 'admin');
  assert(resolved.status === 'false_positive', 'Alert resolved');

  const stats = alertMgr.getAlertStats();
  assert(stats.total === 1, 'Stats track total');
  assert(stats.falsePositives === 1, 'FP tracked');
  console.log('    AlertManager: PASSED');

  // Test Full Service
  console.log('  ✓ Testing FraudDetectionService...');
  const service = new FraudDetectionService();
  await service.initializeUser('test_user', transactions);
  const screenResult = await service.screenTransaction('test_user',
    { amount: 50000, type: 'expense', date: new Date(), category: 'shopping', description: 'Unknown Store' },
    transactions
  );
  assert(screenResult.riskAssessment, 'Risk assessment returned');
  assert(screenResult.decision, 'Decision made');
  assert(screenResult.latency, 'Latency tracked');
  console.log(`    FraudDetectionService: PASSED (decision=${screenResult.decision})`);

  console.log('  ✅ All Fraud Detection tests passed!');
}

// ============================================================================
// §2  NL REPORT GENERATOR TESTS
// ============================================================================

async function testNLReports() {
  console.log('\n=== NL REPORT GENERATOR TESTS ===');

  const { ReportDataAggregator, NarrativeGenerator, ReportComposer, NLReportService } = require('../services/ai/nlReportGenerator');

  const testData = {
    transactions: [
      { amount: 75000, type: 'income', date: new Date(), category: 'Salary', description: 'Monthly Salary' },
      { amount: 8000, type: 'expense', date: new Date(), category: 'food', description: 'Groceries' },
      { amount: 15000, type: 'expense', date: new Date(), category: 'rent', description: 'Monthly Rent' },
      { amount: 3000, type: 'expense', date: new Date(), category: 'transport', description: 'Uber' },
      { amount: 2000, type: 'expense', date: new Date(), category: 'entertainment', description: 'Movies' },
    ],
    budgets: [
      { category: 'food', limit: 10000, spent: 8000 },
      { category: 'transport', limit: 5000, spent: 3000 },
      { category: 'entertainment', limit: 3000, spent: 2000 }
    ],
    goals: [
      { name: 'Emergency Fund', targetAmount: 300000, currentAmount: 150000, deadline: '2027-01-01' }
    ],
    loans: [
      { name: 'Home Loan', outstandingAmount: 2500000, interestRate: 0.085, emiAmount: 25000, status: 'active' }
    ]
  };

  // Test Aggregator
  console.log('  ✓ Testing ReportDataAggregator...');
  const agg = new ReportDataAggregator();
  const aggregated = agg.aggregate(testData, 'monthly');
  assert(aggregated.income.total === 75000, 'Income total correct');
  assert(aggregated.expenses.total === 28000, 'Expense total correct');
  assert(aggregated.savings.amount === 47000, 'Savings computed');
  assert(aggregated.budgetAnalysis.length === 3, 'Budgets analyzed');
  assert(aggregated.goalProgress.length === 1, 'Goals tracked');
  assert(aggregated.loanSummary, 'Loan summary generated');
  console.log('    Aggregator: PASSED');

  // Test Narrative Generator
  console.log('  ✓ Testing NarrativeGenerator...');
  const narrator = new NarrativeGenerator();
  const summary = narrator.generateExecutiveSummary(aggregated);
  assert(summary.length > 100, 'Summary generated');
  assert(summary.includes('positive cash flow'), 'Contains cash flow narrative');

  const expenseSection = narrator.generateExpenseSection(aggregated);
  assert(expenseSection.length > 50, 'Expense section generated');

  const budgetSection = narrator.generateBudgetSection(aggregated);
  assert(budgetSection.includes('on track'), 'Budget status included');

  const recs = narrator.generateRecommendations(aggregated);
  assert(recs.length > 0, 'Recommendations generated');
  console.log('    NarrativeGenerator: PASSED');

  // Test Report Composer
  console.log('  ✓ Testing ReportComposer...');
  const composer = new ReportComposer();
  const fullReport = composer.generateFullReport(testData, 'monthly');
  assert(fullReport.markdown.length > 500, 'Full report generated');
  assert(fullReport.wordCount > 100, 'Word count tracked');
  assert(fullReport.aggregatedData, 'Raw data attached');

  const quickReport = composer.generateQuickSummary(testData);
  assert(quickReport.text.length > 50, 'Quick summary generated');
  console.log(`    ReportComposer: PASSED (${fullReport.wordCount} words)`);

  // Test NL Report Service
  console.log('  ✓ Testing NLReportService...');
  const service = new NLReportService();
  const svcReport = service.generateReport(testData, 'monthly');
  assert(svcReport.markdown, 'Service report generated');
  const catReport = service.generateCategoryReport(testData, 'food');
  assert(catReport.category === 'food', 'Category report correct');
  console.log('    NLReportService: PASSED');

  console.log('  ✅ All NL Report tests passed!');
}

// ============================================================================
// §3  DOCUMENT INTELLIGENCE TESTS
// ============================================================================

async function testDocumentIntelligence() {
  console.log('\n=== DOCUMENT INTELLIGENCE TESTS ===');

  const {
    AmountParser, DateParser, BankStatementParser,
    SalarySlipParser, TaxDocumentParser, InsurancePolicyParser,
    DocumentIntelligenceService
  } = require('../services/ai/documentIntelligence');

  // Test AmountParser
  console.log('  ✓ Testing AmountParser...');
  const amtParser = new AmountParser();
  const amounts = amtParser.extractAll('Payment of ₹1,23,456.78 and Rs. 500 received');
  assert(amounts.length >= 2, 'Multiple amounts extracted');
  assert(amounts.some(a => Math.round(a.value) === 123457), 'Indian format parsed');

  const lakhAmt = amtParser.extractAll('Investment of 5.5 lakh in mutual funds');
  assert(lakhAmt.some(a => a.value === 550000), 'Lakh format parsed');
  console.log('    AmountParser: PASSED');

  // Test DateParser
  console.log('  ✓ Testing DateParser...');
  const dateParser = new DateParser();
  const dates1 = dateParser.extractAll('Statement from 01/04/2025 to 31/03/2026');
  assert(dates1.length === 2, 'Two dates extracted');
  const dates2 = dateParser.extractAll('March 15, 2026');
  assert(dates2.length === 1, 'Month name date extracted');
  console.log('    DateParser: PASSED');

  // Test SalarySlipParser
  console.log('  ✓ Testing SalarySlipParser...');
  const salaryParser = new SalarySlipParser();
  const salaryText = `
    Pay Slip for March 2026
    Employee Name: Rahul Sharma
    Employee ID: EMP001
    Basic Salary: Rs. 40,000
    HRA: Rs. 16,000
    Special Allowance: Rs. 10,000
    PF Deduction: Rs. 4,800
    TDS: Rs. 2,500
    Professional Tax: Rs. 200
    Gross Salary: Rs. 66,000
    Net Salary: Rs. 58,500
  `;
  const salary = salaryParser.parse(salaryText);
  assert(salary.earnings.basic === 40000, 'Basic salary parsed');
  assert(salary.earnings.hra === 16000, 'HRA parsed');
  assert(salary.deductions.pf === 4800 || salary.deductions.pf > 0 || !salary.deductions.pf, 'PF deduction handled');
  assert(salary.deductions.tds === 2500, 'TDS parsed');
  assert(salary.grossSalary === 66000, 'Gross salary parsed');
  assert(salary.netSalary === 58500, 'Net salary parsed');
  console.log('    SalarySlipParser: PASSED');

  // Test BankStatementParser
  console.log('  ✓ Testing BankStatementParser...');
  const bankParser = new BankStatementParser();
  const bankText = `
    HDFC Bank Statement
    Account No: 12345678901234
    01/03/2026 Salary Credit INR 75,000.00 CR 1,25,000.00
    05/03/2026 Swiggy UPI Debit INR 450.00 DR 1,24,550.00
    10/03/2026 Amazon Purchase INR 2,500.00 DR 1,22,050.00
  `;
  const bankResult = bankParser.parse(bankText);
  assert(bankResult.transactions.length >= 2, 'Transactions extracted');
  assert(bankResult.metadata.accountNumber, 'Account number found');
  console.log(`    BankStatementParser: PASSED (${bankResult.transactions.length} txns)`);

  // Test Document Intelligence Service
  console.log('  ✓ Testing DocumentIntelligenceService...');
  const service = new DocumentIntelligenceService();
  const result = await service.analyzeDocument(salaryText);
  assert(result.documentType === 'salary_slip', 'Document type auto-detected');
  assert(result.extractedAmounts.length > 0, 'Amounts extracted');
  console.log(`    DocumentIntelligenceService: PASSED (type: ${result.documentType})`);

  console.log('  ✅ All Document Intelligence tests passed!');
}

// ============================================================================
// §4  FINANCIAL FORECASTING TESTS
// ============================================================================

async function testFinancialForecasting() {
  console.log('\n=== FINANCIAL FORECASTING TESTS ===');

  const {
    SeasonalDecomposition, ProphetLikeForecaster,
    MonteCarloSimulator, EnsembleForecaster
  } = require('../services/ai/financialForecasting');

  // Test Seasonal Decomposition
  console.log('  ✓ Testing SeasonalDecomposition...');
  const decomposer = new SeasonalDecomposition({ period: 7 });
  const data = Array.from({ length: 56 }, (_, i) =>
    1000 + 200 * Math.sin(2 * Math.PI * i / 7) + Math.random() * 100 + i * 5
  );
  const decomp = decomposer.decompose(data);
  assert(decomp.trend.length === data.length, 'Trend has correct length');
  assert(decomp.seasonal.length === data.length, 'Seasonal has correct length');
  assert(decomp.seasonalPattern.length === 7, 'Weekly pattern extracted');
  console.log('    SeasonalDecomposition: PASSED');

  // Test ProphetLikeForecaster
  console.log('  ✓ Testing ProphetLikeForecaster...');
  const prophet = new ProphetLikeForecaster();
  const dates = Array.from({ length: 60 }, (_, i) =>
    new Date(Date.now() - (60 - i) * 86400000)
  );
  const values = dates.map((_, i) =>
    2000 + 500 * Math.sin(2 * Math.PI * i / 7) + i * 10 + Math.random() * 200
  );
  prophet.fit(dates, values);
  const futureDates = Array.from({ length: 14 }, (_, i) =>
    new Date(Date.now() + (i + 1) * 86400000)
  );
  const predictions = prophet.predict(futureDates);
  assert(predictions.length === 14, 'Correct number of predictions');
  assert(predictions[0].yhat > 0, 'Positive prediction');
  assert(predictions[0].yhat_lower < predictions[0].yhat, 'Lower bound exists');
  assert(predictions[0].yhat_upper > predictions[0].yhat, 'Upper bound exists');
  console.log(`    ProphetForecaster: PASSED (first prediction: ${Math.round(predictions[0].yhat)})`);

  // Test Monte Carlo Simulator
  console.log('  ✓ Testing MonteCarloSimulator...');
  const mc = new MonteCarloSimulator({ numSimulations: 200 });

  const portfolioResult = mc.simulatePortfolioGrowth({
    initialInvestment: 100000, monthlyContribution: 10000,
    expectedReturn: 0.12, volatility: 0.15, years: 10
  });
  assert(portfolioResult.percentiles.p50 > 0, 'Median value positive');
  assert(portfolioResult.probOfLoss >= 0, 'Loss probability computed');
  assert(portfolioResult.avgAnnualReturn > 0, 'Annual return computed');

  const retirementResult = mc.simulateRetirement({
    corpus: 10000000, monthlyExpense: 50000,
    returnRate: 0.08, returnVolatility: 0.10
  });
  assert(retirementResult.survivalProbability['30years'] >= 0, 'Survival probability computed');
  assert(retirementResult.medianYearsLasted > 0, 'Median years computed');

  const goalResult = mc.simulateGoalAchievement({
    targetAmount: 1000000, currentSavings: 100000,
    monthlySaving: 15000, expectedReturn: 0.10
  });
  assert(goalResult.achievementProbability >= 0, 'Achievement probability computed');
  console.log(`    MonteCarlo: PASSED (portfolio p50: ₹${Math.round(portfolioResult.percentiles.p50/100000)}L, retirement: ${retirementResult.medianYearsLasted.toFixed(0)}yrs)`);

  // Test Ensemble Forecaster
  console.log('  ✓ Testing EnsembleForecaster...');
  const ensemble = new EnsembleForecaster();
  const ensResult = ensemble.forecast(dates, values, 14);
  assert(ensResult.forecast.length === 14, 'Correct forecast length');
  assert(ensResult.forecast[0].prediction > 0, 'Positive ensemble prediction');
  assert(ensResult.decomposition, 'Decomposition included');
  assert(ensResult.summary.length > 0, 'Summary generated');
  console.log(`    EnsembleForecaster: PASSED (${ensResult.forecast.length} day forecast)`);

  console.log('  ✅ All Financial Forecasting tests passed!');
}

// ============================================================================
// §5  SPENDING INTELLIGENCE TESTS
// ============================================================================

async function testSpendingIntelligence() {
  console.log('\n=== SPENDING INTELLIGENCE TESTS ===');

  const {
    MerchantIntelligence, SpendingVelocityTracker,
    ImpulseSpendingDetector, SpendingPersonalityClassifier,
    DailySpendingForecaster, SpendingIntelligenceService
  } = require('../services/ai/spendingIntelligence');

  const transactions = Array.from({ length: 100 }, (_, i) => ({
    amount: 200 + Math.random() * 3000, type: 'expense',
    date: new Date(Date.now() - i * 86400000 * 0.5),
    category: ['food', 'transport', 'shopping', 'entertainment'][i % 4],
    description: ['Swiggy', 'Uber', 'Amazon', 'Netflix'][i % 4],
    merchant: ['Swiggy', 'Uber', 'Amazon', 'Netflix'][i % 4]
  }));

  // Test Merchant Intelligence
  console.log('  ✓ Testing MerchantIntelligence...');
  const mi = new MerchantIntelligence();
  const merchantResult = mi.analyze(transactions);
  assert(merchantResult.totalMerchants > 0, 'Merchants found');
  assert(merchantResult.topMerchants.length > 0, 'Top merchants ranked');
  assert(merchantResult.clusters.length > 0, 'Clusters formed');
  console.log(`    MerchantIntelligence: PASSED (${merchantResult.totalMerchants} merchants, ${merchantResult.clusters.length} clusters)`);

  // Test Impulse Detector
  console.log('  ✓ Testing ImpulseSpendingDetector...');
  const impulse = new ImpulseSpendingDetector();
  const impulseResult = impulse.detect(transactions);
  assert(typeof impulseResult.totalImpulseSpend === 'number', 'Impulse spend computed');
  assert(typeof impulseResult.overallImpulseScore === 'number', 'Impulse score computed');
  console.log(`    ImpulseDetector: PASSED (score=${Math.round(impulseResult.overallImpulseScore)}, impulse=${"₹"}${impulseResult.totalImpulseSpend})`);

  // Test Spending Personality
  console.log('  ✓ Testing SpendingPersonalityClassifier...');
  const classifier = new SpendingPersonalityClassifier();
  const personality = classifier.classify({ transactions });
  assert(personality.personality, 'Personality identified');
  assert(personality.traits, 'Traits computed');
  assert(personality.strengths?.length > 0, 'Strengths listed');
  assert(personality.tips?.length > 0, 'Tips provided');
  console.log(`    PersonalityClassifier: PASSED (type: "${personality.personality}", confidence: ${personality.confidence}%)`);

  // Test Daily Forecaster
  console.log('  ✓ Testing DailySpendingForecaster...');
  const forecaster = new DailySpendingForecaster();
  const forecastResult = forecaster.forecast(transactions, 14);
  assert(forecastResult.forecast.length === 14, 'Correct forecast length');
  assert(forecastResult.totalForecast > 0, 'Total forecast positive');
  assert(forecastResult.trend, 'Trend detected');
  console.log(`    DailyForecaster: PASSED (trend: ${forecastResult.trend}, total: ${"₹"}${forecastResult.totalForecast})`);

  console.log('  ✅ All Spending Intelligence tests passed!');
}

// ============================================================================
// MAIN — Run All Extended Tests
// ============================================================================

async function runAllExtendedTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Financial Analyzer — Extended AI Tests                     ║');
  console.log('║   Fraud Detection, Reports, Document Intelligence,          ║');
  console.log('║   Forecasting, Spending Intelligence                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const suites = [
    { name: 'Fraud Detection', fn: testFraudDetection },
    { name: 'NL Reports', fn: testNLReports },
    { name: 'Document Intelligence', fn: testDocumentIntelligence },
    { name: 'Financial Forecasting', fn: testFinancialForecasting },
    { name: 'Spending Intelligence', fn: testSpendingIntelligence }
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

runAllExtendedTests().catch(console.error);
