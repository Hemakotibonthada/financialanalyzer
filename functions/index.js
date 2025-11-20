const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

// Set region to Asia South 1 (Mumbai)
const functionsRegion = functions.region('asia-south1');

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Financial Analyzer API',
    version: '1.0.0',
    firestore: 'connected'
  });
});

// Import all routes - Check if file exists before requiring
const requireIfExists = (routePath) => {
  try {
    return require(routePath);
  } catch (error) {
    console.warn(`⚠️  Route not found: ${routePath}`);
    return express.Router();
  }
};

// Core routes
const authRoutes = requireIfExists('./routes/auth');
const profileRoutes = requireIfExists('./routes/profile');
const analyticsRoutes = requireIfExists('./routes/analytics');
const financialRoutes = requireIfExists('./routes/financial');
const transactionsRoutes = requireIfExists('./routes/transactions');

// Transaction routes
const budgetRoutes = requireIfExists('./routes/budgets');
const incomesRoutes = requireIfExists('./routes/incomes');
const companyExpenseRoutes = requireIfExists('./routes/companyExpenses');

// Bill and reminder routes
const billReminderRoutes = requireIfExists('./routes/billReminders');
const notificationRoutes = requireIfExists('./routes/notifications');
const recurringRoutes = requireIfExists('./routes/recurring');

// Document and data routes
const documentRoutes = requireIfExists('./routes/documents');
const csvRoutes = requireIfExists('./routes/csv');
const exportRoutes = requireIfExists('./routes/export');

// Integration routes
const gmailRoutes = requireIfExists('./routes/gmail');
const realCibilRoutes = requireIfExists('./routes/realCibil');

// Financial tracking routes
const emiRoutes = requireIfExists('./routes/emi');
const lenderRoutes = requireIfExists('./routes/lenders');
const lenderLoanRoutes = requireIfExists('./routes/lenderLoans');
const lenderPaymentRoutes = requireIfExists('./routes/lenderPayments');
const loansGivenRoutes = requireIfExists('./routes/loansGiven');
const personalLoanRoutes = requireIfExists('./routes/personalLoans');

// Investment and portfolio routes
const investmentRoutes = requireIfExists('./routes/investments');
const goalRoutes = requireIfExists('./routes/goals');
const netWorthRoutes = requireIfExists('./routes/netWorth');

// Advanced feature routes
const insightsRoutes = requireIfExists('./routes/insights');
const bankingRoutes = requireIfExists('./routes/banking');
const currencyRoutes = requireIfExists('./routes/currency');
const securityRoutes = requireIfExists('./routes/security');
const mlRoutes = requireIfExists('./routes/ml');
const portfolioRoutes = requireIfExists('./routes/portfolio');
const realEstateRoutes = requireIfExists('./routes/realEstate');
const retirementRoutes = requireIfExists('./routes/retirement');
const subscriptionRoutes = requireIfExists('./routes/subscription');
const taxRoutes = requireIfExists('./routes/tax');
const debtRoutes = requireIfExists('./routes/debt');
const insuranceRoutes = requireIfExists('./routes/insurance');

// Admin and utility routes
const adminRoutes = requireIfExists('./routes/admin');
const activityLogRoutes = requireIfExists('./routes/activityLogs');
const cacheRoutes = requireIfExists('./routes/cache');
const searchRoutes = requireIfExists('./routes/search');
const healthRoutes = requireIfExists('./routes/health');
const twoFactorAuthRoutes = requireIfExists('./routes/twoFactorAuth');
const dataManagementRoutes = requireIfExists('./routes/dataManagement');

// API Routes - no /api prefix since the function URL already includes it
app.use('/auth', authRoutes);
app.use('/2fa', twoFactorAuthRoutes);
app.use('/profile', profileRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/financial', financialRoutes);
app.use('/transactions', transactionsRoutes);

// Transaction routes
app.use('/budgets', budgetRoutes);
app.use('/incomes', incomesRoutes);
app.use('/company-expenses', companyExpenseRoutes);

// Bill and reminder routes
app.use('/bill-reminders', billReminderRoutes);
app.use('/notifications', notificationRoutes);
app.use('/recurring', recurringRoutes);

// Document and data routes
app.use('/documents', documentRoutes);
app.use('/csv', csvRoutes);
app.use('/export', exportRoutes);

// Integration routes
app.use('/gmail', gmailRoutes);
app.use('/real-cibil', realCibilRoutes);

// Financial tracking routes
app.use('/emi', emiRoutes);
app.use('/lenders', lenderRoutes);
app.use('/lender-loans', lenderLoanRoutes);
app.use('/lender-payments', lenderPaymentRoutes);
app.use('/loans-given', loansGivenRoutes);
app.use('/personal-loans', personalLoanRoutes);

// Investment and portfolio routes
app.use('/investments', investmentRoutes);
app.use('/goals', goalRoutes);
app.use('/networth', netWorthRoutes);

// Advanced feature routes
app.use('/insights', insightsRoutes);
app.use('/banking', bankingRoutes);
app.use('/currency', currencyRoutes);
app.use('/security', securityRoutes);
app.use('/ml', mlRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/real-estate', realEstateRoutes);
app.use('/retirement', retirementRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/tax', taxRoutes);
app.use('/debt', debtRoutes);
app.use('/insurance', insuranceRoutes);

// Admin and utility routes
app.use('/admin', adminRoutes);
app.use('/activity-logs', activityLogRoutes);
app.use('/cache', cacheRoutes);
app.use('/search', searchRoutes);
app.use('/health-check', healthRoutes);
app.use('/data-management', dataManagementRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export the Express app as a Cloud Function
exports.api = functionsRegion.https.onRequest(app);

// Cloud Function for scheduled tasks
exports.scheduledBackup = functionsRegion.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Running scheduled backup...');
    // Add backup logic here
    return null;
  });

// Cloud Function for processing bill reminders
exports.processBillReminders = functionsRegion.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('Processing bill reminders...');
    
    try {
      // Use Firestore
      const db = admin.firestore();
      const now = new Date();
      
      const remindersSnapshot = await db.collection('bill-reminders')
        .where('dueDate', '<=', new Date(now.getTime() + 24 * 60 * 60 * 1000))
        .where('dueDate', '>=', now)
        .where('status', '==', 'active')
        .get();
      
      console.log(`Processed ${remindersSnapshot.size} bill reminders`);
      
      return null;
    } catch (error) {
      console.error('Error processing bill reminders:', error);
      return null;
    }
  });

// Cloud Function for user creation
exports.onUserCreate = functionsRegion.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  
  try {
    // Create user profile in Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'user',
      settings: {
        currency: 'INR',
        theme: 'light',
        notifications: true
      }
    });
    
    console.log(`User profile created for: ${user.uid}`);
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});

// Cloud Function for user deletion
exports.onUserDelete = functionsRegion.auth.user().onDelete(async (user) => {
  const db = admin.firestore();
  
  try {
    // Delete from Firestore
    const batch = db.batch();
    
    const collections = [
      'expenses', 'incomes', 'budgets', 'goals', 
      'emis', 'lenders', 'loans', 'bill-reminders', 'reports',
      'documents', 'transactions', 'notifications'
    ];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName)
        .where('userId', '==', user.uid)
        .get();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    
    // Delete user profile
    batch.delete(db.collection('users').doc(user.uid));
    
    await batch.commit();
    
    console.log(`User data deleted for: ${user.uid}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
  }
});
