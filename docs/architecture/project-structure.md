# Project Structure

> Complete file catalog for the FinancialAnalyzer application (~640+ source files)

---

## Root Directory

```
FinancialAnalyzer/
├── package.json                    # Root workspace config
├── firebase.json                   # Firebase hosting + functions config
├── firebase-storage.rules          # Storage security rules
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Firestore index definitions
├── README.md                       # Project readme
├── .gitignore                      # Git ignore rules
├── .firebaserc                     # Firebase project config
│
├── backend/                        # Express.js API server
├── frontend/                       # React SPA (Vite)
├── desktop/                        # Electron desktop app
├── mobile/                         # React Native mobile app
├── functions/                      # Firebase Cloud Functions
├── docs/                           # Documentation
├── scripts/                        # Utility scripts
├── Helper/                         # Helper utilities
└── uploads/                        # File uploads directory
```

---

## Backend Structure (282 files)

### Core Files
| File | Lines | Purpose |
|------|-------|---------|
| `server.js` | 599 | Express app, middleware pipeline, route mounting, WebSocket, startup |
| `package.json` | — | 48 production dependencies, scripts |
| `jest.config.js` | — | Test configuration |

### Routes (89 files)
```
backend/routes/
├── authRoutes.js              # Authentication (register, login, 2FA, token rotation)
├── profileRoutes.js           # User profile CRUD
├── financialRoutes.js         # Core financial operations (4120 lines — largest route file)
├── budgetRoutes.js            # Budget management
├── emiRoutes.js               # EMI tracking (4384 lines — 33 endpoints)
├── investmentRoutes.js        # Investment portfolio (22 endpoints)
├── netWorthRoutes.js          # Net worth tracking (16 endpoints)
├── goalRoutes.js              # Financial goals
├── debt.js                    # Debt management
│
├── aiRoutes.js                # Core AI (24 endpoints)
├── aiEnhancedRoutes.js        # Enhanced AI — RL, anomaly, knowledge graph, XAI (27 endpoints)
├── aiExtendedRoutes.js        # Extended AI — fraud, NL reports, behavioral (21 endpoints)
├── aiAdvancedRoutes.js        # Advanced AI — portfolio, credit score, peers (17 endpoints)
├── aiPremiumRoutes.js         # Premium AI — cashflow, subscriptions, tax (12 endpoints)
├── aiTrainingRoutes.js        # AI model training
├── aiModelRoutes.js           # Enterprise model registry
├── aiIntelligenceRoutes.js    # Self-learning pipeline
├── localAIRoutes.js           # Offline AI endpoints
│
├── analyticsRoutes.js         # Analytics V1
├── analyticsV2Routes.js       # Enterprise Analytics V2
├── enterpriseRoutes.js        # Enterprise services
├── enterpriseNotificationRoutes.js  # Smart notification engine
│
├── bankAccountRoutes.js       # Bank account management
├── creditCardBillRoutes.js    # Credit card bills
├── personalLoanRoutes.js      # Personal loans
├── loansGivenRoutes.js        # Loans given to others
├── lenderRoutes.js            # Lender management
├── lenderLoanRoutes.js        # Lender loan tracking
├── lenderPaymentRoutes.js     # Lender payments
│
├── recurringRoutes.js         # Recurring transactions
├── billReminderRoutes.js      # Bill reminders
├── subscription.js            # Subscription management
├── splitExpenseRoutes.js      # Split expenses / groups
├── companyExpenseRoutes.js    # Company expenses
├── familyRoutes.js            # Family finance
│
├── gmailRoutes.js             # Gmail integration
├── googleDriveRoutes.js       # Google Drive backup
├── csvRoutes.js               # CSV import/export
├── documentRoutes.js          # Document management
├── receiptRoutes.js           # Receipt scanning/OCR
│
├── insurance.js               # Insurance management
├── realEstate.js              # Real estate portfolio
├── retirement.js              # Retirement planning
├── tax.js                     # Tax management
├── taxOptimization.js         # Tax optimization
├── portfolio.js               # Portfolio analytics
│
├── notificationRoutes.js      # Notifications
├── searchRoutes.js            # Search functionality
├── search.js                  # Advanced search
├── cacheRoutes.js             # Cache management
├── security.js                # Security features
├── securityRoutes.js          # Security V2
├── twoFactorAuthRoutes.js     # 2FA management
├── adminRoutes.js             # Admin panel
│
├── achievements.js            # Achievement/gamification
├── aggregation.js             # Data aggregation
├── automationRoutes.js        # Automation rules
├── backup.js                  # Database backup
├── banking.js                 # Banking integration
├── budgetOptimization.js      # Budget optimization
├── business.js                # Business features (invoices, clients)
├── categorize.js              # Smart categorization
├── chatRoutes.js              # AI chat
├── currency.js                # Currency conversion
├── currencyRoutes.js          # Currency V2
├── dataExportRoutes.js        # Data export
├── dataManagement.js          # Import/export/backup
├── expenseIntelligenceRoutes.js  # Expense intelligence
├── borrowingIntelligenceRoutes.js  # Borrowing intelligence
├── exportRoutes.js            # Export functionality
├── financialInsightsRoutes.js # Financial insights
├── financialPlanningRoutes.js # Financial planning
├── forecast.js                # Forecasting
├── goalTrackingRoutes.js      # Goal milestones
├── healthRoutes.js            # Health checks
├── insights.js                # Financial insights
├── marketRoutes.js            # Market data
├── ml.js                      # ML models
├── reports.js                 # Financial reports
├── riskAssessment.js          # Risk assessment
├── scheduledJobsRoutes.js     # Scheduled jobs
├── support.js                 # Support tickets
├── templateRoutes.js          # Financial templates
├── wealthManagementRoutes.js  # Wealth management
├── webhooks.js                # Webhooks
└── activityLogRoutes.js       # Activity logs
```

### Controllers (4 files)
```
backend/controllers/
├── aiController.js               # AI orchestration controller
├── analyticsController.js        # Analytics controller
├── companyExpenseController.js    # Company expense controller
└── financialPlanningController.js # Financial planning controller
```

### Models (47 files)
```
backend/models/
├── User.js              # Users (auth, 2FA, roles)
├── Transaction.js       # Financial transactions (319 lines)
├── Budget.js            # Budget tracking (211 lines)
├── EMI.js               # EMI/installments (481 lines)
├── Investment.js        # Investment records
├── Debt.js              # Debt entries
├── FinancialGoal.js     # Financial goals
├── FinancialProfile.js  # User financial profiles
├── FinancialAnalysis.js # Analysis results
├── NetWorthSnapshot.js  # Net worth snapshots
├── Portfolio.js         # Portfolio holdings
│
├── BankAccount.js       # Bank accounts
├── CreditCardBill.js    # Credit card bills
├── PersonalLoan.js      # Personal loans
├── LoanGiven.js         # Loans given
├── Lender.js            # Lenders directory
├── LenderLoan.js        # Lender loan records
├── LenderPayment.js     # Lender payments
│
├── BillReminder.js      # Bill reminders
├── Subscription.js      # Subscriptions
├── SplitExpense.js      # Split expenses
├── CompanyExpense.js    # Company expenses
│
├── ChatMessage.js       # AI chat messages
├── Notification.js      # Notifications
├── Document.js          # Uploaded documents
├── Receipt.js           # Scanned receipts
├── Template.js          # Financial templates
│
├── InsurancePolicy.js   # Insurance policies
├── RealEstate.js        # Real estate properties
├── RetirementPlan.js    # Retirement plans
├── TaxRecord.js         # Tax records
├── Currency.js          # Currency rates
│
├── FamilyMember.js      # Family members
├── Group.js             # Expense groups
│
├── AutomationRule.js    # Automation rules
├── AutomationLog.js     # Automation logs
├── ActivityLog.js       # Activity logs
├── Analysis.js          # Analysis records
├── Anomaly.js           # Detected anomalies
├── MLModel.js           # ML model metadata
├── Prediction.js        # AI predictions
│
├── Client.js            # Business clients
├── Contract.js          # Business contracts
├── Invoice.js           # Business invoices
├── Project.js           # Business projects
├── Vendor.js            # Business vendors
└── RefreshToken.js      # JWT refresh tokens
```

### Services (82 general + 46 AI = 128 files)
```
backend/services/
├── localAIEngine.js              # All-in-one local ML engine (1524 lines)
├── aiModelTrainer.js             # Model training orchestrator (1822 lines)
├── financialForecastService.js   # Financial forecasting
├── financialHealthService.js     # Health score calculator
├── financialInsightsService.js   # Insights engine
├── financialPlanningService.js   # Financial planning
├── financialWellnessService.js   # Wellness scoring
├── financialAIService.js         # AI service layer
│
├── analyticsEngine.js            # Analytics computation
├── analyticsService.js           # Analytics API
├── advancedAnalyticsService.js   # Advanced analytics
├── dataAggregationService.js     # Data aggregation
│
├── gmailService.js               # Gmail API integration
├── gmailAutoSync.js              # Gmail auto-sync scheduler
├── googleDriveService.js         # Google Drive integration
├── bankingIntegrationService.js  # Plaid banking
│
├── budgetOptimizationService.js  # Budget optimization
├── debtManagementService.js      # Debt strategies
├── goalTrackingService.js        # Goal tracking
├── portfolioAnalyticsService.js  # Portfolio analytics
├── riskAssessmentService.js      # Risk assessment
├── taxOptimizationService.js     # Tax optimization
├── wealthManagementService.js    # Wealth management
│
├── notificationService.js        # Notifications
├── advancedNotificationService.js  # Advanced notifications
├── smartNotificationService.js   # Smart AI notifications
├── enterpriseNotificationEngine.js  # Enterprise notifications
│
├── cacheService.js               # Redis/in-memory cache
├── backupService.js              # Database backup
├── backupScheduler.js            # Backup scheduling
├── encryptionService.js          # AES-256-GCM encryption
├── securityService.js            # Security features
├── twoFactorAuthService.js       # 2FA (Speakeasy TOTP)
│
├── csvService.js                 # CSV processing
├── documentProcessor.js          # Document parser
├── aiDocumentProcessor.js        # AI document analysis
├── receiptProcessingService.js   # Receipt OCR
├── creditCardStatementService.js # CC statement parser
├── emailTransactionParser.js     # Email transaction extraction
│
├── chatService.js                # AI chat service
├── nlpChatEngine.js              # NLP chat engine
├── searchService.js              # Search service
├── advancedSearchService.js      # Advanced search
├── smartCategorizationService.js # Auto-categorization
│
├── achievementService.js         # Gamification
├── automationService.js          # Automation engine
├── billReminderService.js        # Bill reminders
├── currencyService.js            # Currency conversion
├── currencyConversionService.js  # Currency rates
├── dashboardService.js           # Dashboard data
├── emiAnalyticsService.js        # EMI analytics
├── emiExtractionService.js       # EMI extraction from docs
├── exportService.js              # Export functionality
├── advancedExportService.js      # Advanced exports
├── dataExportService.js          # Data export
├── dataExportEngine.js           # Export engine (CSV/JSON/templates)
├── dataImportExportService.js    # Import/export service
├── familyFinanceService.js       # Family finance
├── marketDataService.js          # Market data
├── mlService.js                  # ML service layer
├── bankAccountService.js         # Bank accounts
├── borrowingIntelligenceService.js  # Borrowing analysis
├── expenseIntelligenceService.js # Expense intelligence
│
├── reportGeneratorService.js     # Report generation
├── reportService.js              # Report management
├── enterpriseReportGenerator.js  # Enterprise reports
├── enterpriseAnalyticsV2.js      # Enterprise analytics V2
├── enterprisePredictionEngine.js # Enterprise predictions
├── enterpriseRiskAssessment.js   # Enterprise risk
├── enterpriseTaxEngine.js        # Enterprise tax
├── enterpriseTrainingPipeline.js # Enterprise ML training
│
├── recurringTransactionService.js # Recurring detection
├── scheduledJobsService.js       # Scheduled jobs
├── selfTrainingScheduler.js      # Self-training scheduler
├── spendingBehaviorService.js    # Spending behavior
├── splitExpenseService.js        # Split expenses
├── templateService.js            # Templates
├── transactionFilterService.js   # Transaction filters
├── webhookService.js             # Webhooks
├── websocketEngine.js            # WebSocket engine
└── websocketService.js           # WebSocket service
```

### AI Services (46 files)
```
backend/services/ai/
├── index.js                      # Barrel export (100+ exports)
│
│  ── CORE ML ──
├── neuralNetwork.js              # From-scratch neural networks (1459 lines)
├── decisionTree.js               # Decision trees, random forest, gradient boosting (953 lines)
├── clustering.js                 # K-Means, DBSCAN, hierarchical, PCA (1027 lines)
├── timeSeries.js                 # ARIMA, Holt-Winters, seasonal decomp (1210 lines)
│
│  ── TRAINING & ORCHESTRATION ──
├── trainingPipeline.js           # Model training orchestrator (1038 lines)
├── selfLearningPipeline.js       # Continuous learning (806 lines)
├── autoMLPipeline.js             # Automated ML pipeline (1258 lines)
├── aiOrchestrator.js             # Central AI hub (946 lines)
├── aiDataPipeline.js             # Data preprocessing (577 lines)
├── modelMonitoring.js            # Drift detection, A/B testing (853 lines)
├── modelManager.js               # Model lifecycle management
│
│  ── PREDICTION & FORECASTING ──
├── financialForecasting.js       # Ensemble forecasting, Monte Carlo (723 lines)
├── creditScorePredictor.js       # CIBIL score prediction (779 lines)
├── cashFlowIntelligence.js       # Cash flow analysis (858 lines)
├── cashFlowProjection.js         # Cash flow projection
├── predictiveAlerts.js           # Predictive alert system
│
│  ── ANOMALY DETECTION & FRAUD ──
├── advancedAnomalyDetection.js   # Isolation Forest, LOF, SPC (1208 lines)
├── fraudDetectionSystem.js       # Multi-layer fraud prevention (1300 lines)
│
│  ── NLP & CONVERSATIONAL AI ──
├── nlpEngine.js                  # Tokenizer, TF-IDF, NER, sentiment (852 lines)
├── conversationalAI.js           # Multi-turn chatbot (1291 lines)
├── nlReportGenerator.js          # Natural language reports (855 lines)
├── documentIntelligence.js       # Document parsing AI (610 lines)
├── semanticSearch.js             # Semantic search engine (663 lines)
├── advancedNLPChat.js            # Advanced NLP chat
│
│  ── OPTIMIZATION & PLANNING ──
├── reinforcementLearning.js      # Q-Learning, DQN, Actor-Critic (1586 lines)
├── portfolioOptimization.js      # Markowitz, Black-Litterman (1077 lines)
├── smartFinancialPlanner.js      # Multi-goal optimizer (796 lines)
├── goalAchievementEngine.js      # Goal feasibility analysis (621 lines)
├── taxHarvestingEngine.js        # Tax-loss harvesting (487 lines)
├── budgetOptimizerAI.js          # AI budget optimization
├── debtPayoffEngine.js           # Debt payoff strategies
├── financialGoalsAI.js           # Goal-based AI
├── smartInvestmentAdvisor.js     # Investment advice engine
│
│  ── BEHAVIORAL & SPENDING ANALYSIS ──
├── behavioralFinance.js          # Cognitive bias detection (881 lines)
├── spendingIntelligence.js       # Merchant-level insights (805 lines)
├── patternRecognition.js         # Spending pattern clustering (545 lines)
├── peerComparisonEngine.js       # Peer benchmarking (418 lines)
├── financialWellness.js          # 8-dimension wellness score (547 lines)
├── financialLiteracy.js          # Financial education AI
├── transactionEnrichment.js      # Transaction enrichment
│
│  ── RECOMMENDATIONS & NOTIFICATIONS ──
├── recommendationEngine.js       # Collaborative + content-based (899 lines)
├── smartNotificationAI.js        # Priority-based AI notifications (612 lines)
├── subscriptionManagerAI.js      # Subscription detection/optimization (457 lines)
│
│  ── EXPLAINABILITY & KNOWLEDGE ──
├── explainableAI.js              # SHAP, LIME, counterfactual (865 lines)
└── knowledgeGraph.js             # Financial knowledge graph (940 lines)
```

### Middleware (12 files)
```
backend/middleware/
├── auth.js                  # JWT authentication middleware
├── adminAuth.js             # Admin role authorization
├── authorization.js         # Role-based access control
├── validate.js              # Request validation (express-validator)
├── validation.js            # Custom validators
├── requestValidator.js      # Request validator
├── rateLimiter.js           # Rate limiting
├── activityLogger.js        # Activity logging
├── cacheMiddleware.js       # Response caching
├── uploadMiddleware.js      # File upload handling (Multer)
├── enterpriseMiddleware.js  # Request IDs, versioning, audit
└── enterpriseSecurity.js    # Enterprise security features
```

### Other Backend Directories
```
backend/config/
└── database.js              # MongoDB connection config

backend/utils/
├── helpers.js               # Utility functions
├── logger.js                # Winston logger
├── tokenUtils.js            # JWT token utilities
└── documentPasswordGenerator.js  # Document password generation

backend/scripts/
├── createIndexes.js         # MongoDB index creation
├── optimizeDatabase.js      # Database optimization
└── seed-demo-account.js     # Demo account seeder

backend/data/
├── conversations/           # AI chat conversation storage
├── models/                  # Trained ML model files (JSON)
└── rl-models/               # Reinforcement learning models
```

---

## Frontend Structure (253 files)

### Root Config
```
frontend/
├── index.html               # HTML entry point
├── package.json              # Dependencies (React 18, MUI 7, Vite 5)
├── vite.config.js            # Vite build configuration
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
└── vitest.config.js          # Test configuration
```

### Source
```
frontend/src/
├── main.jsx                  # React DOM entry point
├── App.jsx                   # Root component — routing, providers (509 lines)
├── index.css                 # Global styles
├── theme.js                  # MUI theme definitions
├── serviceWorkerRegistration.js  # PWA service worker
```

### Pages (146 files)
```
frontend/src/pages/
│
│  ── CORE ──
├── Dashboard.jsx              # Main dashboard
├── EnhancedDashboard.jsx      # Enhanced dashboard V1
├── EnhancedDashboardV2.jsx    # Enhanced dashboard V2
├── LandingPage.jsx            # Public landing page
├── Login.jsx                  # Login page
├── Register.jsx               # Registration page
├── Profile.jsx                # Profile & settings (2317 lines)
├── Analyzer.jsx               # Document analyzer
├── NotFound.jsx               # 404 page
│
│  ── TRANSACTIONS & BANKING ──
├── TransactionManager.jsx     # Transaction management
├── EnhancedTransactionManagerV2.jsx  # Enhanced V2
├── BankAccountManager.jsx     # Bank accounts
├── CreditCardManager.jsx      # Credit cards
├── NetBanking.jsx             # Net banking
├── CurrencyConverter.jsx      # Currency converter
│
│  ── BUDGETING & PLANNING ──
├── BudgetPlanner.jsx          # Budget planner V1
├── EnhancedBudgetPlannerV2.jsx  # Budget planner V2
├── SmartBudgetWizard.jsx      # Smart budget wizard
├── SmartBudgetOptimizer.jsx   # AI budget optimizer
├── CashFlowForecast.jsx       # Cash flow forecast
├── FinancialCalendar.jsx      # Financial calendar
├── FinancialTemplate.jsx      # Templates
├── BillOfMaterials.jsx        # Bill of materials
│
│  ── INCOME & EXPENSES ──
├── IncomeTracker.jsx          # Income tracking
├── RecurringPayments.jsx      # Recurring payments
├── SplitExpenses.jsx          # Split expenses
├── SubscriptionManager.jsx    # Subscriptions V1
├── BillTracker.jsx            # Bill tracking
├── BillReminders.jsx          # Bill reminders
├── ReceiptScanner.jsx         # Receipt scanner / OCR
│
│  ── INVESTMENTS & MARKETS ──
├── InvestmentPortfolio.jsx    # Investment portfolio V1
├── EnhancedInvestmentPortfolioV2.jsx  # Investment V2
├── InvestmentAnalyzer.jsx     # Investment analyzer
├── MutualFunds.jsx            # Mutual funds
├── CryptoPortfolio.jsx        # Crypto tracking
├── FixedDeposits.jsx          # Fixed deposits
├── GoldTracker.jsx            # Gold investments
├── SIPCalculator.jsx          # SIP calculator
├── WatchlistDashboard.jsx     # Market watchlist
├── MarketInsights.jsx         # Market data
├── PortfolioAnalyticsDashboard.jsx  # Portfolio analytics
│
│  ── NET WORTH & PROPERTY ──
├── NetWorthTracker.jsx        # Net worth V1
├── EnhancedNetWorthTracker.jsx  # Net worth V2
├── PropertyManager.jsx        # Property management
│
│  ── TAX & INSURANCE ──
├── TaxPlanner.jsx             # Tax planner V1
├── TaxEstimator.jsx           # Tax estimator
├── TaxOptimizationCenter.jsx  # Tax optimization
├── InsurancePlanner.jsx       # Insurance planner
│
│  ── RETIREMENT & LONG-TERM ──
├── RetirementPlanner.jsx      # Retirement planner
├── PPFTracker.jsx             # PPF tracker
├── EPFTracker.jsx             # EPF tracker
├── NPS.jsx                    # National Pension System
├── FIRETracker.jsx            # FIRE calculator
│
│  ── DEBT & LOANS ──
├── DebtManagementDashboard.jsx  # Debt V1
├── EnhancedDebtManagementV2.jsx  # Debt V2
├── DebtPayoff.jsx             # Debt payoff strategies
├── LoanCalculator.jsx         # Loan calculator
├── EmergencyFund.jsx          # Emergency fund
├── EMITracker.jsx             # EMI tracker
├── PersonalBorrowings.jsx     # Personal borrowings
│
│  ── GOALS & SAVINGS ──
├── FinancialGoals.jsx         # Goals V1
├── EnhancedFinancialGoalsV2.jsx  # Goals V2
├── GoalTimeline.jsx           # Goal timeline
├── SavingsChallenges.jsx      # Savings challenges
├── GoalForecaster.jsx         # AI goal forecasting
│
│  ── REPORTS & ANALYTICS ──
├── Reports.jsx                # Reports V1
├── EnhancedReportsV2.jsx      # Reports V2
├── ReportDetail.jsx           # Report detail view
├── FinancialReportsHub.jsx    # Reports hub
├── DataVisualizationLab.jsx   # Data viz lab
├── ExportCenter.jsx           # Export center
├── ComparisonTool.jsx         # Period comparison
├── FinancialScorecard.jsx     # Financial scorecard
├── CreditScoreDetail.jsx      # Credit score detail
├── AdvancedAnalytics.jsx      # Advanced analytics
├── RiskDashboard.jsx          # Risk dashboard
│
│  ── AI & ML INSIGHTS ──
├── AIInsights.jsx             # AI insights V1
├── AIInsightsHub.jsx          # AI insights hub
├── AICommandCenter.jsx        # AI command center V1
├── EnhancedAICommandCenter.jsx  # AI command center V3
├── FinancialInsightsDashboard.jsx  # Financial insights
├── FinancialHealthDashboard.jsx  # Health V1
├── EnhancedFinancialHealthV2.jsx  # Health V2
├── SpendingInsights.jsx       # Spending V1
├── EnhancedSpendingInsightsV2.jsx  # Spending V2
├── FinancialChat.jsx          # AI chat V1
├── EnhancedFinancialChat.jsx  # AI chat V2
├── AITrainingDashboard.jsx    # AI training dashboard
├── SelfTrainingPage.jsx       # Self-training monitor
├── RiskAssessment.jsx         # Risk assessment
│
│  ── AI LAB (LOCAL ML) ──
├── EnhancedAIChatbot.jsx      # AI chatbot
├── RLOptimizerPage.jsx        # Reinforcement learning optimizer
├── AIModelObservatory.jsx     # Model observatory
├── AdvancedAnomalyDetectorPage.jsx  # Anomaly detector
├── SmartFinancialPlannerPage.jsx  # Smart planner
├── SpendingIntelligencePage.jsx  # Spending intelligence
├── PortfolioOptimizerPage.jsx # Portfolio optimizer
├── CreditScorePredictorPage.jsx  # Credit score predictor
├── CashFlowIntelligencePage.jsx  # Cash flow intelligence
├── SubscriptionManagerPage.jsx  # Subscription AI manager
├── GoalAndTaxPage.jsx         # Goal & tax optimizer
├── FinancialWellnessPage.jsx  # Financial wellness AI
│
│  ── AI-POWERED FEATURE PAGES ──
├── MerchantIntelligence.jsx   # Merchant analysis
├── LifestyleAnalytics.jsx     # Lifestyle analytics
├── SpendingForecast.jsx       # Spending forecast
├── SentimentDashboard.jsx     # Sentiment analysis
├── IncomeForecast.jsx         # Income forecast
├── AnomalyDetector.jsx        # Anomaly detector V1
├── ExpenseIntelligence.jsx    # Expense intel
│
│  ── WEALTH & WELLNESS ──
├── WealthManagement.jsx       # Wealth management
├── FinancialWellness.jsx      # Financial wellness V1
├── SmartInvestmentAdvisor.jsx # Smart advisor
│
│  ── ENHANCED V2 PAGES ──
├── EnhancedFinancialPlanningV2.jsx  # Planning V2
├── EnhancedSettingsV2.jsx     # Settings V2
│
│  ── EDUCATION & GAMIFICATION ──
├── FinancialEducation.jsx     # Learning center
├── FinancialQuiz.jsx          # Financial quiz
├── AchievementsPage.jsx       # Achievement system
├── Milestones.jsx             # Milestones
│
│  ── TOOLS & UTILITIES ──
├── AutomationRules.jsx        # Automation rules
├── SmartNotifications.jsx     # Smart notifications
├── SystemDashboard.jsx        # System dashboard
├── DarkModeSettings.jsx       # Appearance settings
├── SecurityCenter.jsx         # Security center
├── AccountSettings.jsx        # Account settings
├── Documents.jsx              # Documents
├── FinancialDocuments.jsx     # Financial documents
│
│  ── SOCIAL & BUSINESS ──
├── FamilyFinance.jsx          # Family finance
├── CompanyExpensesDashboard.jsx  # Company expenses
├── LenderDashboard.jsx        # Lender dashboard V1
├── LenderDashboardEnhanced.jsx  # Lender dashboard V2
│
│  ── SUPPORT ──
├── HelpCenter.jsx             # Help center / docs
└── ContactSupport.jsx         # Contact support

frontend/src/pages/enterprise/ (13 files)
├── EnterpriseDashboardV3.jsx
├── EnterpriseTransactionManager.jsx
├── EnterpriseBudgetIntelligence.jsx
├── EnterpriseInvestmentAdvisor.jsx
├── EnterpriseGoalsTracker.jsx
├── EnterpriseDebtManagement.jsx
├── EnterpriseFinancialHealth.jsx
├── EnterpriseAnalytics.jsx
├── EnterpriseReports.jsx
├── EnterpriseSettings.jsx
├── EnterpriseAIChat.jsx
├── EnterpriseCashflowForecaster.jsx
└── EnterpriseGmailBrowser.jsx
```

### Components (67 files)
```
frontend/src/components/
├── MainLayout.jsx             # Page shell (header, sidebar, content)
├── Sidebar.jsx                # Navigation sidebar (499 lines)
├── ErrorBoundary.jsx          # Error boundary
├── NotificationBell.jsx       # Notification bell
├── NotificationToast.jsx      # Toast notifications
├── ThemeToggle.jsx            # Theme toggle button
├── ThemePicker.jsx            # Accent color picker
│
├── CreditScoreCard.jsx        # Credit score display
├── FinancialHealth.jsx        # Health metrics
├── FinancialSummary.jsx       # Financial summary
├── CategoryBreakdown.jsx      # Category breakdown
├── MonthlyTrends.jsx          # Monthly trends chart
├── SpendingDashboard.jsx      # Spending dashboard
├── SpendingPatterns.jsx       # Spending patterns
├── BudgetTracker.jsx          # Budget tracker
├── SavingsGoals.jsx           # Savings goals
├── RecurringTransactions.jsx  # Recurring transactions
├── RecommendationsPanel.jsx   # AI recommendations
├── DocumentSummary.jsx        # Document summary
├── EMIMonthlyTrends.jsx       # EMI trends
│
├── AIFinancialPredictions.jsx # AI predictions
├── TransactionFilters.jsx     # Transaction filter UI
├── TransactionSearch.jsx      # Search UI
├── QuickExpenseEntry.jsx      # Quick expense entry
├── QuickIncomeEntry.jsx       # Quick income entry
├── CurrencyInput.jsx          # Currency input field
├── CSVImportExport.jsx        # CSV import/export UI
├── CacheManagementPanel.jsx   # Cache management
├── AdminDashboard.jsx         # Admin dashboard
├── KeyboardShortcutsHelp.jsx  # Keyboard shortcuts dialog
├── NewFeaturesShowcase.jsx    # Feature showcase
│
├── ai/SmartAssistant.jsx      # Floating AI assistant
├── Auth/ProtectedRoute.jsx    # Auth route guard
├── business/BusinessDashboard.jsx  # Business dashboard
├── calculators/FinancialCalculatorSuite.jsx  # Calculator suite
│
├── charts/
│   ├── FinancialCharts.jsx    # Chart components
│   └── EnterpriseCharts.jsx   # Enterprise charts
│
├── dashboard/
│   ├── KPIDashboardCards.jsx  # KPI cards
│   ├── SpendingTrendsChart.jsx  # Spending trends
│   └── CategoryIntelligence.jsx  # Category intelligence
│
├── enterprise/
│   ├── EnterpriseAnimationSystem.jsx
│   ├── EnterpriseCharts.jsx
│   ├── EnterpriseNavSidebar.jsx
│   ├── EnterpriseNotificationSystem.jsx
│   └── ErrorBoundary.jsx
│
├── insurance/InsuranceDashboard.jsx
├── layout/
│   ├── EmptyState.jsx         # Empty state component
│   └── PageHeader.jsx         # Page header
├── ml/MLDashboard.jsx         # ML dashboard
├── notifications/
│   ├── EnterpriseNotifications.jsx
│   ├── NotificationBell.jsx
│   └── NotificationCenter.jsx
├── realEstate/RealEstateDashboard.jsx
├── retirement/RetirementPlanner.jsx
├── search/AdvancedSearch.jsx
├── tax/TaxPlanner.jsx
│
└── ui/                        # UI component library
    ├── ComponentLibrary.jsx   # AnimatedCard, Badge, Modal, etc.
    ├── AnimatedComponents.jsx # FadeIn, PageTransition, etc.
    ├── AnimatedCard.jsx       # Card animation
    ├── ChartComponents.jsx    # Chart wrappers
    ├── DashboardWidgets.jsx   # Dashboard widgets
    ├── DataTable.jsx          # Data table
    ├── EnterpriseComponents.jsx  # Enterprise UI kit
    ├── ErrorBoundary.jsx      # UI error boundary
    ├── Modal.jsx              # Modal dialog
    ├── ProgressRing.jsx       # Progress ring
    ├── StateComponents.jsx    # Loading/empty states
    ├── StatsCard.jsx          # Stats card
    ├── ThemePageComponents.jsx  # Theme-aware components
    ├── card.jsx               # Card component
    └── tabs.jsx               # Tab component
```

### Context, Services, Hooks, Styles
```
frontend/src/context/ (8 files)
├── AuthContext.jsx            # Auth state + dual backend
├── ThemeContext.jsx           # 3-mode theme + accents
├── CurrencyContext.jsx        # Currency preferences
├── NotificationContext.jsx    # Notification state
├── SidebarContext.jsx         # Sidebar collapse state
├── WebSocketContext.jsx       # WebSocket connection
├── FeatureFlagContext.jsx     # Feature flags
└── KeyboardShortcutsContext.jsx  # Keyboard shortcuts

frontend/src/services/ (8 files)
├── api.js                     # Axios client + all service modules
├── aiService.js               # AI service + React hooks
├── enhancedAIService.js       # Enhanced AI service
├── enterpriseAnalyticsService.js  # Enterprise analytics
├── firebase.js                # Firebase config
├── firebaseAuth.js            # Firebase auth adapter
├── storage.js                 # Local storage service
└── websocketClient.js         # Socket.IO client

frontend/src/hooks/ (7 files)
├── useAIFeatures.js           # AI feature hooks
├── useAnimations.js           # Animation hooks
├── useConfirm.jsx             # Confirmation dialog
├── useCustomHooks.js          # Custom hooks collection
├── useFinancialData.js        # Financial data hooks
├── useLocalStorage.js         # localStorage hook
└── useThemeStyles.js          # Theme style hooks

frontend/src/styles/ (12 files)
├── animations.css             # Base animations
├── advanced-animations.css    # Advanced animations
├── enterprise-animations.css  # Enterprise animation system
├── enterprise-animations-v2.css  # Enterprise V2 animations
├── enterprise-design-system.css  # Design system tokens
├── theme-variables.css        # CSS custom properties
├── landing.css                # Landing page styles
├── dashboard-mobile.css       # Dashboard mobile responsive
├── mobile-enhancements.css    # Mobile enhancements
├── mobile-responsive.css      # Mobile responsive
├── profile-mobile.css         # Profile mobile responsive
└── Documents.css              # Document page styles

frontend/src/utils/ (5 files)
├── currency.js                # Currency formatting
├── helpers.js                 # Utility functions
├── performanceUtils.js        # Performance optimization
├── themeUtils.js              # Theme utilities
└── documentPasswordNotification.js  # Doc password utils
```

---

## Desktop App Structure
```
desktop/
├── main.js                    # Electron main process
├── preload.js                 # Electron preload script
├── package.json               # Desktop dependencies
├── setup.html                 # Initial setup page
├── landing.html               # Landing page
├── build-installer.ps1        # Windows installer build script
├── LICENSE.txt                # Application license
├── README.md                  # Desktop documentation
├── DESKTOP_APP_GUIDE.md       # User guide
├── create-ico.js              # Icon generation scripts
├── create-icons-sharp.js
├── create-icons-simple.js
├── create-png-icons.js
├── generate-icons.js
└── assets/                    # App icons (16-256px PNGs, ICO, SVG)
```

## Firebase Functions Structure
```
functions/
├── index.js                   # Cloud Functions entry
├── package.json               # Dependencies
├── middleware/auth.js          # Auth middleware
└── routes/ (46 files)         # Mirrors backend routes for cloud deployment
```
