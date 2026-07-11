import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CircularProgress, Box } from '@mui/material';

import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import { SidebarProvider } from './context/SidebarContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { EnterpriseErrorBoundary } from './components/enterprise/ErrorBoundary';
import { ToastProvider } from './components/notifications/EnterpriseNotifications';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { initializeStorage } from './services/storage';
import SmartAssistant from './components/ai/SmartAssistant';

// Import enhanced styles
import './styles/theme-variables.css';
import './styles/advanced-animations.css';
import './styles/enterprise-animations.css';
import './styles/enterprise-design-system.css';
import './styles/enterprise-animations-v2.css';

// Retry wrapper for lazy imports - handles Vite HMR "Failed to fetch dynamically imported module" errors
const lazyRetry = (importFn, retries = 3, delay = 1000) =>
  lazy(() =>
    new Promise((resolve, reject) => {
      const attempt = (remaining) => {
        importFn().then(resolve).catch((err) => {
          if (remaining > 0) {
            setTimeout(() => attempt(remaining - 1), delay);
          } else {
            reject(err);
          }
        });
      };
      attempt(retries);
    })
  );

// Eager load auth pages (small, frequently used)
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Analyzer = lazy(() => import('./pages/Analyzer'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const CreditScoreDetail = lazy(() => import('./pages/CreditScoreDetail'));
const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'));
const EMITracker = lazy(() => import('./pages/EMITracker'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const TransactionSearch = lazy(() => import('./components/TransactionSearch'));
const CSVImportExport = lazy(() => import('./components/CSVImportExport'));
const LenderDashboard = lazy(() => import('./pages/LenderDashboardEnhanced'));
const InvestmentPortfolio = lazy(() => import('./pages/InvestmentPortfolio'));
const FinancialGoals = lazy(() => import('./pages/FinancialGoals'));
const NetWorthTracker = lazy(() => import('./pages/NetWorthTracker'));
const BillReminders = lazy(() => import('./pages/BillReminders'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));

// New feature components
const MLDashboard = lazy(() => import('./components/ml/MLDashboard'));
const TaxPlanner = lazy(() => import('./components/tax/TaxPlanner'));
const InsuranceDashboard = lazy(() => import('./components/insurance/InsuranceDashboard'));
const RetirementPlanner = lazy(() => import('./components/retirement/RetirementPlanner'));
const RealEstateDashboard = lazy(() => import('./components/realEstate/RealEstateDashboard'));
const BusinessDashboard = lazy(() => import('./components/business/BusinessDashboard'));
const NotificationCenter = lazy(() => import('./components/notifications/NotificationCenter'));
const AdvancedSearch = lazy(() => import('./components/search/AdvancedSearch'));
const FinancialHealthDashboard = lazyRetry(() => import('./pages/FinancialHealthDashboard'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const AIInsightsHub = lazy(() => import('./pages/AIInsightsHub'));
const SpendingInsights = lazy(() => import('./pages/SpendingInsights'));
const DebtManagementDashboard = lazy(() => import('./pages/DebtManagementDashboard'));
const DebtSpiralMonitor = lazy(() => import('./pages/DebtSpiralMonitor'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Billing = lazy(() => import('./pages/Billing'));
const PortfolioAnalyticsDashboard = lazy(() => import('./pages/PortfolioAnalyticsDashboard'));
const CompanyExpensesDashboard = lazy(() => import('./pages/CompanyExpensesDashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const NotFound = lazy(() => import('./pages/NotFound'));

// ========== NEW ENHANCED PAGES ==========
// Dashboard & Transactions
const EnhancedDashboardV2 = lazyRetry(() => import('./pages/EnhancedDashboardV2'));
const TransactionManager = lazy(() => import('./pages/TransactionManager'));
const EnhancedNetWorthTracker = lazy(() => import('./pages/EnhancedNetWorthTracker'));

// Budgeting & Planning
const BudgetPlanner = lazy(() => import('./pages/BudgetPlanner'));
const SmartBudgetWizard = lazy(() => import('./pages/SmartBudgetWizard'));
const CashFlowForecast = lazy(() => import('./pages/CashFlowForecast'));
const FinancialCalendar = lazy(() => import('./pages/FinancialCalendar'));

// Income & Expenses
const IncomeTracker = lazy(() => import('./pages/IncomeTracker'));
const RecurringPayments = lazy(() => import('./pages/RecurringPayments'));
const SplitExpenses = lazy(() => import('./pages/SplitExpenses'));
const SubscriptionManager = lazy(() => import('./pages/SubscriptionManager'));
const BillTracker = lazy(() => import('./pages/BillTracker'));

// Investments & Markets
const FundsInvestments = lazy(() => import('./pages/FundsInvestments'));
const InvestmentAnalyzer = lazy(() => import('./pages/InvestmentAnalyzer'));
const MutualFunds = lazy(() => import('./pages/MutualFunds'));
const CryptoPortfolio = lazy(() => import('./pages/CryptoPortfolio'));
const FixedDeposits = lazy(() => import('./pages/FixedDeposits'));
const GoldTracker = lazy(() => import('./pages/GoldTracker'));
const SIPCalculator = lazy(() => import('./pages/SIPCalculator'));
const WatchlistDashboard = lazy(() => import('./pages/WatchlistDashboard'));
const MarketInsights = lazy(() => import('./pages/MarketInsights'));

// Banking & Accounts
const BankAccountManager = lazy(() => import('./pages/BankAccountManager'));
const CreditCardManager = lazy(() => import('./pages/CreditCardManager'));
const NetBanking = lazy(() => import('./pages/NetBanking'));
const CurrencyConverter = lazy(() => import('./pages/CurrencyConverter'));

// Tax & Insurance
const TaxEstimator = lazy(() => import('./pages/TaxEstimator'));
const TaxPlannerPage = lazy(() => import('./pages/TaxPlanner'));
const InsurancePlanner = lazy(() => import('./pages/InsurancePlanner'));

// Retirement & Long-term
const RetirementPlannerPage = lazy(() => import('./pages/RetirementPlanner'));
const PPFTracker = lazy(() => import('./pages/PPFTracker'));
const EPFTracker = lazy(() => import('./pages/EPFTracker'));
const NPS = lazy(() => import('./pages/NPS'));

// Debt & Loans
const DebtPayoff = lazy(() => import('./pages/DebtPayoff'));
const LoanCalculator = lazy(() => import('./pages/LoanCalculator'));
const EmergencyFund = lazy(() => import('./pages/EmergencyFund'));

// Goals & Savings
const GoalTimeline = lazy(() => import('./pages/GoalTimeline'));
const SavingsChallenges = lazy(() => import('./pages/SavingsChallenges'));

// Property & Assets
const PropertyManager = lazy(() => import('./pages/PropertyManager'));

// Reports & Analytics
const FinancialReportsHub = lazy(() => import('./pages/FinancialReportsHub'));
const DataVisualizationLab = lazy(() => import('./pages/DataVisualizationLab'));
const ExportCenter = lazy(() => import('./pages/ExportCenter'));
const ComparisonTool = lazy(() => import('./pages/ComparisonTool'));
const FinancialScorecard = lazy(() => import('./pages/FinancialScorecard'));

// Education & Engagement
const FinancialEducation = lazy(() => import('./pages/FinancialEducation'));
const FinancialQuiz = lazy(() => import('./pages/FinancialQuiz'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const Milestones = lazy(() => import('./pages/Milestones'));

// Tools & Utilities
const ReceiptScanner = lazy(() => import('./pages/ReceiptScanner'));
const FinancialDocuments = lazy(() => import('./pages/FinancialDocuments'));
const FinancialTemplate = lazy(() => import('./pages/FinancialTemplate'));
const BillOfMaterials = lazy(() => import('./pages/BillOfMaterials'));
const AutomationRules = lazy(() => import('./pages/AutomationRules'));
const AICommandCenter = lazy(() => import('./pages/AICommandCenter'));
const FinancialInsightsDashboard = lazy(() => import('./pages/FinancialInsightsDashboard'));
const SystemDashboard = lazy(() => import('./pages/SystemDashboard'));
const FeatureExplorer = lazy(() => import('./pages/FeatureExplorer'));
const CloudBackup = lazy(() => import('./pages/CloudBackup'));
const AITrainingDashboard = lazy(() => import('./pages/AITrainingDashboard'));
const SelfTrainingPage = lazy(() => import('./pages/SelfTrainingPage'));
const SmartBudgetOptimizer = lazy(() => import('./pages/SmartBudgetOptimizer'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));

// ========== NEW COMPREHENSIVE MODULES ==========
const WealthManagement = lazy(() => import('./pages/WealthManagement'));
const FinancialWellness = lazy(() => import('./pages/FinancialWellness'));
const SmartInvestmentAdvisor = lazy(() => import('./pages/SmartInvestmentAdvisor'));
const TaxOptimizationCenter = lazy(() => import('./pages/TaxOptimizationCenter'));
const ExpenseIntelligence = lazy(() => import('./pages/ExpenseIntelligence'));
const FIRETracker = lazy(() => import('./pages/FIRETracker'));
const PersonalBorrowings = lazy(() => import('./pages/PersonalBorrowings'));

// Social & Communication
const FamilyFinance = lazy(() => import('./pages/FamilyFinance'));
const FinancialChat = lazy(() => import('./pages/FinancialChat'));
const SmartNotifications = lazy(() => import('./pages/SmartNotifications'));

// Settings & Security
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const DarkModeSettings = lazy(() => import('./pages/DarkModeSettings'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));

// Risk & Dashboard
const RiskDashboard = lazy(() => import('./pages/RiskDashboard'));
const EnhancedDashboard = lazy(() => import('./pages/EnhancedDashboard'));

// Enhanced V2 Pages (Enterprise)
const EnhancedFinancialHealthV2 = lazy(() => import('./pages/EnhancedFinancialHealthV2'));
const EnhancedFinancialChat = lazy(() => import('./pages/EnhancedFinancialChat'));
const EnhancedSpendingInsightsV2 = lazy(() => import('./pages/EnhancedSpendingInsightsV2'));
const EnhancedInvestmentPortfolioV2 = lazy(() => import('./pages/EnhancedInvestmentPortfolioV2'));
const EnhancedBudgetPlannerV2 = lazy(() => import('./pages/EnhancedBudgetPlannerV2'));
const EnhancedDebtManagementV2 = lazy(() => import('./pages/EnhancedDebtManagementV2'));
const EnhancedTransactionManagerV2 = lazy(() => import('./pages/EnhancedTransactionManagerV2'));
const EnhancedFinancialGoalsV2 = lazy(() => import('./pages/EnhancedFinancialGoalsV2'));
const EnhancedFinancialPlanningV2 = lazy(() => import('./pages/EnhancedFinancialPlanningV2'));
const EnhancedSettingsV2 = lazy(() => import('./pages/EnhancedSettingsV2'));
const EnhancedReportsV2 = lazy(() => import('./pages/EnhancedReportsV2'));

// Enterprise V3 Pages
const EnterpriseDashboardV3 = lazyRetry(() => import('./pages/enterprise/EnterpriseDashboardV3'));
const EnterpriseTransactionManager = lazyRetry(() => import('./pages/enterprise/EnterpriseTransactionManager'));
const EnterpriseBudgetIntelligence = lazyRetry(() => import('./pages/enterprise/EnterpriseBudgetIntelligence'));
const EnterpriseInvestmentAdvisor = lazyRetry(() => import('./pages/enterprise/EnterpriseInvestmentAdvisor'));
const EnterpriseGoalsTracker = lazyRetry(() => import('./pages/enterprise/EnterpriseGoalsTracker'));
const EnterpriseDebtManagement = lazyRetry(() => import('./pages/enterprise/EnterpriseDebtManagement'));
const EnterpriseFinancialHealth = lazyRetry(() => import('./pages/enterprise/EnterpriseFinancialHealth'));
const EnterpriseAnalytics = lazyRetry(() => import('./pages/enterprise/EnterpriseAnalytics'));
const EnterpriseReports = lazyRetry(() => import('./pages/enterprise/EnterpriseReports'));
const EnterpriseSettings = lazyRetry(() => import('./pages/enterprise/EnterpriseSettings'));
const EnterpriseAIChat = lazyRetry(() => import('./pages/enterprise/EnterpriseAIChat'));
const EnterpriseCashflowForecaster = lazyRetry(() => import('./pages/enterprise/EnterpriseCashflowForecaster'));
const EnterpriseGmailBrowser = lazyRetry(() => import('./pages/enterprise/EnterpriseGmailBrowser'));
const GmailInboxPage = lazyRetry(() => import('./pages/GmailInboxPage'));
const GmailAnalyticsDashboard = lazyRetry(() => import('./pages/GmailAnalyticsDashboard'));

// AI-Powered Feature Pages
const MerchantIntelligence = lazy(() => import('./pages/MerchantIntelligence'));
const LifestyleAnalytics = lazy(() => import('./pages/LifestyleAnalytics'));
const SpendingForecast = lazy(() => import('./pages/SpendingForecast'));
const SentimentDashboard = lazy(() => import('./pages/SentimentDashboard'));
const IncomeForecast = lazy(() => import('./pages/IncomeForecast'));
const GoalForecaster = lazy(() => import('./pages/GoalForecaster'));
const AnomalyDetector = lazy(() => import('./pages/AnomalyDetector'));

// Enhanced AI Pages (Local ML modules)
const EnhancedAICommandCenter = lazy(() => import('./pages/EnhancedAICommandCenter'));
const EnhancedAIChatbot = lazy(() => import('./pages/EnhancedAIChatbot'));
const RLOptimizerPage = lazy(() => import('./pages/RLOptimizerPage'));
const AIModelObservatory = lazy(() => import('./pages/AIModelObservatory'));
const AdvancedAnomalyDetectorPage = lazy(() => import('./pages/AdvancedAnomalyDetectorPage'));
const SmartFinancialPlannerPage = lazy(() => import('./pages/SmartFinancialPlannerPage'));
const SpendingIntelligencePage = lazy(() => import('./pages/SpendingIntelligencePage'));
const PortfolioOptimizerPage = lazy(() => import('./pages/PortfolioOptimizerPage'));
const CreditScorePredictorPage = lazy(() => import('./pages/CreditScorePredictorPage'));
const CashFlowIntelligencePage = lazy(() => import('./pages/CashFlowIntelligencePage'));
const SubscriptionManagerPage = lazy(() => import('./pages/SubscriptionManagerPage'));
const GoalAndTaxPage = lazy(() => import('./pages/GoalAndTaxPage'));
const FinancialWellnessPage = lazy(() => import('./pages/FinancialWellnessPage'));

// Loading component with accessibility
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}
    role="status"
    aria-label="Loading page content"
  >
    <CircularProgress size={60} aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </Box>
);

function App() {
  // Initialize storage on app startup
  useEffect(() => {
    initializeStorage().then((storageType) => {
      console.log(`App initialized with ${storageType} storage`);
    }).catch((error) => {
      console.error('Failed to initialize storage:', error);
    });
  }, []);

  return (
    <EnterpriseErrorBoundary>
    <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <SidebarProvider>
              <CurrencyProvider>
              <FeatureFlagProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <KeyboardShortcutsProvider>
                  <KeyboardShortcutsHelp />
                  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
                    <ErrorBoundary message="Failed to load page content. Please try again.">
                    <Suspense fallback={<LoadingFallback />}>
                    <Routes>
              {/* ========== PUBLIC ROUTES ========== */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* ========== CORE DASHBOARD ========== */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard-v2" element={<ProtectedRoute><EnhancedDashboardV2 /></ProtectedRoute>} />
              <Route path="/enhanced-dashboard" element={<ProtectedRoute><EnhancedDashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/analyze" element={<ProtectedRoute><Analyzer /></ProtectedRoute>} />
              
              {/* ========== TRANSACTIONS & BANKING ========== */}
              <Route path="/transactions" element={<ProtectedRoute><TransactionManager /></ProtectedRoute>} />
              <Route path="/bank-accounts" element={<ProtectedRoute><BankAccountManager /></ProtectedRoute>} />
              <Route path="/credit-cards" element={<ProtectedRoute><CreditCardManager /></ProtectedRoute>} />
              <Route path="/net-banking" element={<ProtectedRoute><NetBanking /></ProtectedRoute>} />
              <Route path="/currency-converter" element={<ProtectedRoute><CurrencyConverter /></ProtectedRoute>} />
              
              {/* ========== BUDGETING & PLANNING ========== */}
              <Route path="/budget-planner" element={<ProtectedRoute><BudgetPlanner /></ProtectedRoute>} />
              <Route path="/budget-wizard" element={<ProtectedRoute><SmartBudgetWizard /></ProtectedRoute>} />
              <Route path="/cash-flow" element={<ProtectedRoute><CashFlowForecast /></ProtectedRoute>} />
              <Route path="/financial-calendar" element={<ProtectedRoute><FinancialCalendar /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><FinancialTemplate /></ProtectedRoute>} />
              <Route path="/bill-of-materials" element={<ProtectedRoute><BillOfMaterials /></ProtectedRoute>} />
              
              {/* ========== INCOME & EXPENSES ========== */}
              <Route path="/income-tracker" element={<ProtectedRoute><IncomeTracker /></ProtectedRoute>} />
              <Route path="/recurring-payments" element={<ProtectedRoute><RecurringPayments /></ProtectedRoute>} />
              <Route path="/split-expenses" element={<ProtectedRoute><SplitExpenses /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManager /></ProtectedRoute>} />
              <Route path="/bill-tracker" element={<ProtectedRoute><BillTracker /></ProtectedRoute>} />
              <Route path="/receipt-scanner" element={<ProtectedRoute><ReceiptScanner /></ProtectedRoute>} />
              
              {/* ========== INVESTMENTS & MARKETS ========== */}
              <Route path="/funds-investments" element={<ProtectedRoute><FundsInvestments /></ProtectedRoute>} />
              <Route path="/investments" element={<ProtectedRoute><InvestmentPortfolio /></ProtectedRoute>} />
              <Route path="/investment-analyzer" element={<ProtectedRoute><InvestmentAnalyzer /></ProtectedRoute>} />
              <Route path="/mutual-funds" element={<ProtectedRoute><MutualFunds /></ProtectedRoute>} />
              <Route path="/crypto" element={<ProtectedRoute><CryptoPortfolio /></ProtectedRoute>} />
              <Route path="/fixed-deposits" element={<ProtectedRoute><FixedDeposits /></ProtectedRoute>} />
              <Route path="/gold" element={<ProtectedRoute><GoldTracker /></ProtectedRoute>} />
              <Route path="/sip-calculator" element={<ProtectedRoute><SIPCalculator /></ProtectedRoute>} />
              <Route path="/watchlist" element={<ProtectedRoute><WatchlistDashboard /></ProtectedRoute>} />
              <Route path="/market-insights" element={<ProtectedRoute><MarketInsights /></ProtectedRoute>} />
              <Route path="/portfolio-analytics" element={<ProtectedRoute><PortfolioAnalyticsDashboard /></ProtectedRoute>} />
              
              {/* ========== NET WORTH & ASSETS ========== */}
              <Route path="/networth" element={<ProtectedRoute><NetWorthTracker /></ProtectedRoute>} />
              <Route path="/networth-enhanced" element={<ProtectedRoute><EnhancedNetWorthTracker /></ProtectedRoute>} />
              <Route path="/property" element={<ProtectedRoute><PropertyManager /></ProtectedRoute>} />
              
              {/* ========== TAX & INSURANCE ========== */}
              <Route path="/tax-planner" element={<ProtectedRoute><TaxPlanner /></ProtectedRoute>} />
              <Route path="/tax-planner-v2" element={<ProtectedRoute><TaxPlannerPage /></ProtectedRoute>} />
              <Route path="/tax-estimator" element={<ProtectedRoute><TaxEstimator /></ProtectedRoute>} />
              <Route path="/insurance" element={<ProtectedRoute><InsuranceDashboard /></ProtectedRoute>} />
              <Route path="/insurance-planner" element={<ProtectedRoute><InsurancePlanner /></ProtectedRoute>} />
              
              {/* ========== RETIREMENT & LONG-TERM ========== */}
              <Route path="/retirement" element={<ProtectedRoute><RetirementPlanner /></ProtectedRoute>} />
              <Route path="/retirement-planner" element={<ProtectedRoute><RetirementPlannerPage /></ProtectedRoute>} />
              <Route path="/ppf" element={<ProtectedRoute><PPFTracker /></ProtectedRoute>} />
              <Route path="/epf" element={<ProtectedRoute><EPFTracker /></ProtectedRoute>} />
              <Route path="/nps" element={<ProtectedRoute><NPS /></ProtectedRoute>} />
              
              {/* ========== DEBT & LOANS ========== */}
              <Route path="/debt-management" element={<ProtectedRoute><DebtManagementDashboard /></ProtectedRoute>} />
              <Route path="/debt-spiral" element={<ProtectedRoute><DebtSpiralMonitor /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/debt-payoff" element={<ProtectedRoute><DebtPayoff /></ProtectedRoute>} />
              <Route path="/loan-calculator" element={<ProtectedRoute><LoanCalculator /></ProtectedRoute>} />
              <Route path="/emergency-fund" element={<ProtectedRoute><EmergencyFund /></ProtectedRoute>} />
              <Route path="/emi-tracker" element={<ProtectedRoute><EMITracker /></ProtectedRoute>} />
              <Route path="/personal-borrowings" element={<ProtectedRoute><PersonalBorrowings /></ProtectedRoute>} />
              
              {/* ========== GOALS & SAVINGS ========== */}
              <Route path="/goals" element={<ProtectedRoute><FinancialGoals /></ProtectedRoute>} />
              <Route path="/goal-timeline" element={<ProtectedRoute><GoalTimeline /></ProtectedRoute>} />
              <Route path="/savings-challenges" element={<ProtectedRoute><SavingsChallenges /></ProtectedRoute>} />
              
              {/* ========== REPORTS & ANALYTICS ========== */}
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
              <Route path="/reports-hub" element={<ProtectedRoute><FinancialReportsHub /></ProtectedRoute>} />
              <Route path="/data-lab" element={<ProtectedRoute><DataVisualizationLab /></ProtectedRoute>} />
              <Route path="/export-center" element={<ProtectedRoute><ExportCenter /></ProtectedRoute>} />
              <Route path="/comparison" element={<ProtectedRoute><ComparisonTool /></ProtectedRoute>} />
              <Route path="/scorecard" element={<ProtectedRoute><FinancialScorecard /></ProtectedRoute>} />
              <Route path="/credit-score-detail" element={<ProtectedRoute><CreditScoreDetail /></ProtectedRoute>} />
              <Route path="/advanced-analytics" element={<ProtectedRoute><AdvancedAnalytics /></ProtectedRoute>} />
              <Route path="/risk-dashboard" element={<ProtectedRoute><RiskDashboard /></ProtectedRoute>} />
              
              {/* ========== AI & ML INSIGHTS ========== */}
              <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
              <Route path="/ai-hub" element={<ProtectedRoute><AIInsightsHub /></ProtectedRoute>} />
              <Route path="/ai-command-center" element={<ProtectedRoute><AICommandCenter /></ProtectedRoute>} />
              <Route path="/financial-insights-dashboard" element={<ProtectedRoute><FinancialInsightsDashboard /></ProtectedRoute>} />
              <Route path="/ml-dashboard" element={<ProtectedRoute><MLDashboard /></ProtectedRoute>} />
              <Route path="/financial-health" element={<ProtectedRoute><FinancialHealthDashboard /></ProtectedRoute>} />
              <Route path="/spending-insights" element={<ProtectedRoute><SpendingInsights /></ProtectedRoute>} />
              <Route path="/financial-chat" element={<ProtectedRoute><FinancialChat /></ProtectedRoute>} />
              <Route path="/ai-training" element={<ProtectedRoute><AITrainingDashboard /></ProtectedRoute>} />
              <Route path="/self-training" element={<ProtectedRoute><SelfTrainingPage /></ProtectedRoute>} />
              <Route path="/smart-budget-optimizer" element={<ProtectedRoute><SmartBudgetOptimizer /></ProtectedRoute>} />
              <Route path="/risk-assessment" element={<ProtectedRoute><RiskAssessment /></ProtectedRoute>} />
              
              {/* ========== ENHANCED V2 PAGES ========== */}
              <Route path="/financial-health-v2" element={<ProtectedRoute><EnhancedFinancialHealthV2 /></ProtectedRoute>} />
              <Route path="/financial-chat-v2" element={<ProtectedRoute><EnhancedFinancialChat /></ProtectedRoute>} />
              <Route path="/spending-insights-v2" element={<ProtectedRoute><EnhancedSpendingInsightsV2 /></ProtectedRoute>} />
              <Route path="/investment-portfolio-v2" element={<ProtectedRoute><EnhancedInvestmentPortfolioV2 /></ProtectedRoute>} />
              <Route path="/budget-planner-v2" element={<ProtectedRoute><EnhancedBudgetPlannerV2 /></ProtectedRoute>} />
              <Route path="/debt-management-v2" element={<ProtectedRoute><EnhancedDebtManagementV2 /></ProtectedRoute>} />
              <Route path="/transactions-v2" element={<ProtectedRoute><EnhancedTransactionManagerV2 /></ProtectedRoute>} />
              <Route path="/goals-v2" element={<ProtectedRoute><EnhancedFinancialGoalsV2 /></ProtectedRoute>} />
              <Route path="/planning-v2" element={<ProtectedRoute><EnhancedFinancialPlanningV2 /></ProtectedRoute>} />
              <Route path="/settings-v2" element={<ProtectedRoute><EnhancedSettingsV2 /></ProtectedRoute>} />
              <Route path="/reports-v2" element={<ProtectedRoute><EnhancedReportsV2 /></ProtectedRoute>} />
              
              {/* ========== SYSTEM & ADMIN ========== */}
              <Route path="/system-dashboard" element={<ProtectedRoute><SystemDashboard /></ProtectedRoute>} />
              <Route path="/features" element={<ProtectedRoute><FeatureExplorer /></ProtectedRoute>} />
              <Route path="/cloud-backup" element={<ProtectedRoute><CloudBackup /></ProtectedRoute>} />
              
              {/* ========== EDUCATION & GAMIFICATION ========== */}
              <Route path="/education" element={<ProtectedRoute><FinancialEducation /></ProtectedRoute>} />
              <Route path="/quiz" element={<ProtectedRoute><FinancialQuiz /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
              <Route path="/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
              
              {/* ========== TOOLS & UTILITIES ========== */}
              <Route path="/financial-documents" element={<ProtectedRoute><FinancialDocuments /></ProtectedRoute>} />
              <Route path="/automation" element={<ProtectedRoute><AutomationRules /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><TransactionSearch /></ProtectedRoute>} />
              <Route path="/advanced-search" element={<ProtectedRoute><AdvancedSearch /></ProtectedRoute>} />
              <Route path="/import-export" element={<ProtectedRoute><CSVImportExport /></ProtectedRoute>} />
              
              {/* ========== SOCIAL & FAMILY ========== */}
              <Route path="/family-finance" element={<ProtectedRoute><FamilyFinance /></ProtectedRoute>} />
              <Route path="/smart-notifications" element={<ProtectedRoute><SmartNotifications /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
              
              {/* ========== SETTINGS & SECURITY ========== */}
              <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/appearance" element={<ProtectedRoute><DarkModeSettings /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute><SecurityCenter /></ProtectedRoute>} />
              
              {/* ========== EXISTING FEATURE ROUTES ========== */}
              <Route path="/bill-reminders" element={<ProtectedRoute><BillReminders /></ProtectedRoute>} />
              <Route path="/company-expenses" element={<ProtectedRoute><CompanyExpensesDashboard /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/lender-dashboard" element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
              <Route path="/real-estate" element={<ProtectedRoute><RealEstateDashboard /></ProtectedRoute>} />
              <Route path="/business" element={<ProtectedRoute><BusinessDashboard /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
              <Route path="/contact" element={<ProtectedRoute><ContactSupport /></ProtectedRoute>} />
              <Route path="/docs" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              
              {/* ========== ENTERPRISE V3 PAGES ========== */}
              <Route path="/dashboard-v3" element={<ProtectedRoute><EnterpriseDashboardV3 /></ProtectedRoute>} />
              <Route path="/transactions-v3" element={<ProtectedRoute><EnterpriseTransactionManager /></ProtectedRoute>} />
              <Route path="/budget-intelligence" element={<ProtectedRoute><EnterpriseBudgetIntelligence /></ProtectedRoute>} />
              <Route path="/investment-advisor" element={<ProtectedRoute><EnterpriseInvestmentAdvisor /></ProtectedRoute>} />
              <Route path="/goals-v3" element={<ProtectedRoute><EnterpriseGoalsTracker /></ProtectedRoute>} />
              <Route path="/debt-management-v3" element={<ProtectedRoute><EnterpriseDebtManagement /></ProtectedRoute>} />
              <Route path="/financial-health-v3" element={<ProtectedRoute><EnterpriseFinancialHealth /></ProtectedRoute>} />
              <Route path="/analytics-v3" element={<ProtectedRoute><EnterpriseAnalytics /></ProtectedRoute>} />
              <Route path="/reports-v3" element={<ProtectedRoute><EnterpriseReports /></ProtectedRoute>} />
              <Route path="/settings-v3" element={<ProtectedRoute><EnterpriseSettings /></ProtectedRoute>} />
              <Route path="/ai-chat-v3" element={<ProtectedRoute><EnterpriseAIChat /></ProtectedRoute>} />
              <Route path="/cashflow-forecaster" element={<ProtectedRoute><EnterpriseCashflowForecaster /></ProtectedRoute>} />
              <Route path="/gmail-browser" element={<ProtectedRoute><EnterpriseGmailBrowser /></ProtectedRoute>} />
              <Route path="/gmail-inbox" element={<ProtectedRoute><GmailInboxPage /></ProtectedRoute>} />
              <Route path="/gmail-analytics" element={<ProtectedRoute><GmailAnalyticsDashboard /></ProtectedRoute>} />

              {/* ========== AI-POWERED FEATURE ROUTES ========== */}
              <Route path="/merchant-intelligence" element={<ProtectedRoute><MerchantIntelligence /></ProtectedRoute>} />
              <Route path="/lifestyle-analytics" element={<ProtectedRoute><LifestyleAnalytics /></ProtectedRoute>} />
              <Route path="/spending-forecast" element={<ProtectedRoute><SpendingForecast /></ProtectedRoute>} />
              <Route path="/sentiment" element={<ProtectedRoute><SentimentDashboard /></ProtectedRoute>} />
              <Route path="/income-forecast" element={<ProtectedRoute><IncomeForecast /></ProtectedRoute>} />
              <Route path="/goal-forecaster" element={<ProtectedRoute><GoalForecaster /></ProtectedRoute>} />
              <Route path="/anomaly-detector" element={<ProtectedRoute><AnomalyDetector /></ProtectedRoute>} />
              
              {/* ========== NEW COMPREHENSIVE MODULES ========== */}
              <Route path="/wealth-management" element={<ProtectedRoute><WealthManagement /></ProtectedRoute>} />
              <Route path="/financial-wellness" element={<ProtectedRoute><FinancialWellness /></ProtectedRoute>} />
              <Route path="/smart-advisor" element={<ProtectedRoute><SmartInvestmentAdvisor /></ProtectedRoute>} />
              <Route path="/tax-optimization" element={<ProtectedRoute><TaxOptimizationCenter /></ProtectedRoute>} />
              <Route path="/expense-intelligence" element={<ProtectedRoute><ExpenseIntelligence /></ProtectedRoute>} />
              <Route path="/fire-tracker" element={<ProtectedRoute><FIRETracker /></ProtectedRoute>} />

              {/* ========== ENHANCED AI PAGES (Local ML) ========== */}
              <Route path="/ai-command-center-v3" element={<ProtectedRoute><EnhancedAICommandCenter /></ProtectedRoute>} />
              <Route path="/ai-chatbot" element={<ProtectedRoute><EnhancedAIChatbot /></ProtectedRoute>} />
              <Route path="/rl-optimizer" element={<ProtectedRoute><RLOptimizerPage /></ProtectedRoute>} />
              <Route path="/ai-observatory" element={<ProtectedRoute><AIModelObservatory /></ProtectedRoute>} />
              <Route path="/advanced-anomaly-detector" element={<ProtectedRoute><AdvancedAnomalyDetectorPage /></ProtectedRoute>} />
              <Route path="/smart-financial-planner" element={<ProtectedRoute><SmartFinancialPlannerPage /></ProtectedRoute>} />
              <Route path="/spending-intelligence" element={<ProtectedRoute><SpendingIntelligencePage /></ProtectedRoute>} />
              <Route path="/portfolio-optimizer" element={<ProtectedRoute><PortfolioOptimizerPage /></ProtectedRoute>} />
              <Route path="/credit-score-predictor" element={<ProtectedRoute><CreditScorePredictorPage /></ProtectedRoute>} />
              <Route path="/cashflow-intelligence" element={<ProtectedRoute><CashFlowIntelligencePage /></ProtectedRoute>} />
              <Route path="/subscription-manager" element={<ProtectedRoute><SubscriptionManagerPage /></ProtectedRoute>} />
              <Route path="/goal-tax-optimizer" element={<ProtectedRoute><GoalAndTaxPage /></ProtectedRoute>} />
              <Route path="/financial-wellness-ai" element={<ProtectedRoute><FinancialWellnessPage /></ProtectedRoute>} />

              {/* ========== 404 CATCH-ALL ========== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          
          {/* AI Smart Assistant — floating panel available across all pages */}
          <SmartAssistant />
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </div>
              </KeyboardShortcutsProvider>
            </Router>
          </FeatureFlagProvider>
          </CurrencyProvider>
          </SidebarProvider>
        </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
    </ErrorBoundary>
    </EnterpriseErrorBoundary>
  );
}

export default App;
