import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CircularProgress, Box } from '@mui/material';

import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import { SidebarProvider } from './context/SidebarContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { initializeStorage } from './services/storage';

// Root redirect component
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  // If authenticated, redirect to dashboard
  // If not authenticated, redirect to landing page
  return <Navigate to={isAuthenticated ? '/dashboard' : '/landing'} replace />;
};

// Eager load auth pages (small, frequently used)
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';

// Preload Dashboard for faster navigation
const Dashboard = lazy(() => import(/* webpackPreload: true */ './pages/Dashboard'));

// Lazy load all other pages for code splitting
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
const FinancialHealthDashboard = lazy(() => import('./pages/FinancialHealthDashboard'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const SpendingInsights = lazy(() => import('./pages/SpendingInsights'));
const DebtManagementDashboard = lazy(() => import('./pages/DebtManagementDashboard'));
const PortfolioAnalyticsDashboard = lazy(() => import('./pages/PortfolioAnalyticsDashboard'));
const CompanyExpensesDashboard = lazy(() => import('./pages/CompanyExpensesDashboard'));
const Documents = lazy(() => import('./pages/Documents'));

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}
  >
    <CircularProgress size={60} />
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

  // Preload Dashboard component when authenticated
  useEffect(() => {
    const preloadDashboard = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        // Dynamically import to start loading in background
        import('./pages/Dashboard');
      }
    };
    preloadDashboard();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <SidebarProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <KeyboardShortcutsProvider>
                  <KeyboardShortcutsHelp />
                  <div className="min-h-screen bg-gray-50">
                    <Suspense fallback={<LoadingFallback />}>
                    <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/home" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/analyze" element={
                <ProtectedRoute>
                  <Analyzer />
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              
              <Route path="/reports/:id" element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/credit-score-detail" element={
                <ProtectedRoute>
                  <CreditScoreDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/advanced-analytics" element={
                <ProtectedRoute>
                  <AdvancedAnalytics />
                </ProtectedRoute>
              } />
              
              <Route path="/emi-tracker" element={
                <ProtectedRoute>
                  <EMITracker />
                </ProtectedRoute>
              } />
              
              <Route path="/lender-dashboard" element={
                <ProtectedRoute>
                  <LenderDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/investments" element={
                <ProtectedRoute>
                  <InvestmentPortfolio />
                </ProtectedRoute>
              } />
              
              <Route path="/goals" element={
                <ProtectedRoute>
                  <FinancialGoals />
                </ProtectedRoute>
              } />
              
              <Route path="/networth" element={
                <ProtectedRoute>
                  <NetWorthTracker />
                </ProtectedRoute>
              } />
              
              <Route path="/bill-reminders" element={
                <ProtectedRoute>
                  <BillReminders />
                </ProtectedRoute>
              } />
              
              <Route path="/company-expenses" element={
                <ProtectedRoute>
                  <CompanyExpensesDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/documents" element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/search" element={
                <ProtectedRoute>
                  <TransactionSearch />
                </ProtectedRoute>
              } />
              
              <Route path="/import-export" element={
                <ProtectedRoute>
                  <CSVImportExport />
                </ProtectedRoute>
              } />
              
              <Route path="/help" element={
                <ProtectedRoute>
                  <HelpCenter />
                </ProtectedRoute>
              } />
              
              <Route path="/contact" element={
                <ProtectedRoute>
                  <ContactSupport />
                </ProtectedRoute>
              } />
              
              <Route path="/docs" element={
                <ProtectedRoute>
                  <HelpCenter />
                </ProtectedRoute>
              } />
              
              {/* New Feature Routes */}
              <Route path="/ml-dashboard" element={
                <ProtectedRoute>
                  <MLDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/tax-planner" element={
                <ProtectedRoute>
                  <TaxPlanner />
                </ProtectedRoute>
              } />
              
              <Route path="/insurance" element={
                <ProtectedRoute>
                  <InsuranceDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/retirement" element={
                <ProtectedRoute>
                  <RetirementPlanner />
                </ProtectedRoute>
              } />
              
              <Route path="/real-estate" element={
                <ProtectedRoute>
                  <RealEstateDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/business" element={
                <ProtectedRoute>
                  <BusinessDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationCenter />
                </ProtectedRoute>
              } />
              
              <Route path="/advanced-search" element={
                <ProtectedRoute>
                  <AdvancedSearch />
                </ProtectedRoute>
              } />
              
              <Route path="/financial-health" element={
                <ProtectedRoute>
                  <FinancialHealthDashboard />
                </ProtectedRoute>
              } />
              <Route path="/ai-insights" element={
                <ProtectedRoute>
                  <AIInsights />
                </ProtectedRoute>
              } />
              
              <Route path="/spending-insights" element={
                <ProtectedRoute>
                  <SpendingInsights />
                </ProtectedRoute>
              } />
              
              <Route path="/debt-management" element={
                <ProtectedRoute>
                  <DebtManagementDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/portfolio-analytics" element={
                <ProtectedRoute>
                  <PortfolioAnalyticsDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          
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
          />
        </div>
              </KeyboardShortcutsProvider>
            </Router>
          </SidebarProvider>
        </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
