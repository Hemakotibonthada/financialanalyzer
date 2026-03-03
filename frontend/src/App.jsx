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
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { initializeStorage } from './services/storage';

// Import enhanced styles
import './styles/theme-variables.css';
import './styles/advanced-animations.css';

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
const SpendingInsights = lazy(() => import('./pages/SpendingInsights'));
const DebtManagementDashboard = lazy(() => import('./pages/DebtManagementDashboard'));
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
const AITrainingDashboard = lazy(() => import('./pages/AITrainingDashboard'));
const SmartBudgetOptimizer = lazy(() => import('./pages/SmartBudgetOptimizer'));
const RiskAssessment = lazy(() => import('./pages/RiskAssessment'));

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
    <ErrorBoundary>
    <ThemeProvider>
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
              <Route path="/debt-payoff" element={<ProtectedRoute><DebtPayoff /></ProtectedRoute>} />
              <Route path="/loan-calculator" element={<ProtectedRoute><LoanCalculator /></ProtectedRoute>} />
              <Route path="/emergency-fund" element={<ProtectedRoute><EmergencyFund /></ProtectedRoute>} />
              <Route path="/emi-tracker" element={<ProtectedRoute><EMITracker /></ProtectedRoute>} />
              
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
              <Route path="/ai-command-center" element={<ProtectedRoute><AICommandCenter /></ProtectedRoute>} />
              <Route path="/financial-insights-dashboard" element={<ProtectedRoute><FinancialInsightsDashboard /></ProtectedRoute>} />
              <Route path="/ml-dashboard" element={<ProtectedRoute><MLDashboard /></ProtectedRoute>} />
              <Route path="/financial-health" element={<ProtectedRoute><FinancialHealthDashboard /></ProtectedRoute>} />
              <Route path="/spending-insights" element={<ProtectedRoute><SpendingInsights /></ProtectedRoute>} />
              <Route path="/financial-chat" element={<ProtectedRoute><FinancialChat /></ProtectedRoute>} />
              <Route path="/ai-training" element={<ProtectedRoute><AITrainingDashboard /></ProtectedRoute>} />
              <Route path="/smart-budget-optimizer" element={<ProtectedRoute><SmartBudgetOptimizer /></ProtectedRoute>} />
              <Route path="/risk-assessment" element={<ProtectedRoute><RiskAssessment /></ProtectedRoute>} />
              
              {/* ========== SYSTEM & ADMIN ========== */}
              <Route path="/system-dashboard" element={<ProtectedRoute><SystemDashboard /></ProtectedRoute>} />
              
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
              
              {/* ========== 404 CATCH-ALL ========== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          
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
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
