import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CircularProgress, Box } from '@mui/material';

import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

// Eager load auth pages (small, frequently used)
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Analyzer = lazy(() => import('./pages/Analyzer'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const CreditScoreDetail = lazy(() => import('./pages/CreditScoreDetail'));
const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'));
const EMITracker = lazy(() => import('./pages/EMITracker'));
const FinancialInsuranceAnalyzer = lazy(() => import('./pages/FinancialInsuranceAnalyzer'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const TransactionSearch = lazy(() => import('./components/TransactionSearch'));
const CSVImportExport = lazy(() => import('./components/CSVImportExport'));
const LenderDashboard = lazy(() => import('./pages/LenderDashboardEnhanced'));
const InvestmentPortfolio = lazy(() => import('./pages/InvestmentPortfolio'));
const FinancialGoals = lazy(() => import('./pages/FinancialGoals'));
const NetWorthTracker = lazy(() => import('./pages/NetWorthTracker'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));

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
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
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
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
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
              
              <Route path="/financial-analyzer" element={
                <ProtectedRoute>
                  <FinancialInsuranceAnalyzer />
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
      </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
