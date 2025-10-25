import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Analyzer from './pages/Analyzer';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import CreditScoreDetail from './pages/CreditScoreDetail';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import EMITracker from './pages/EMITracker';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <NotificationProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
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
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
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
      </Router>
      </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
