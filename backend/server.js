const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const websocketService = require('./services/websocketService');
const jwt = require('jsonwebtoken');

// Load environment variables
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Add QPDF to PATH if configured (must happen before requiring any modules that use qpdf)
if (process.env.QPDF_PATH) {
  const qpdfDir = path.dirname(process.env.QPDF_PATH);
  process.env.PATH = `${qpdfDir}${path.delimiter}${process.env.PATH}`;
  logger.info(`✅ QPDF binary directory added to PATH: ${qpdfDir}`);
} else {
  logger.warn('⚠️ QPDF_PATH not configured in environment variables');
}

// Ensure required directories exist
const dirs = ['uploads/financial', 'uploads/receipts', 'logs'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Connect to MongoDB
connectDB();

// Initialize Cache Service
const cacheService = require('./services/cacheService');
cacheService.initialize().catch(err => {
  logger.warn('Cache service initialization failed:', err.message);
});

// Initialize Bill Reminder Service
const billReminderService = require('./services/billReminderService');
billReminderService.initialize().catch(err => {
  logger.warn('Bill Reminder service initialization failed:', err.message);
});

const app = express();

// Security: Helmet middleware for security headers
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

// Security: Rate limiting (FIXED: was 15*60*100000 = 25h, now correct 15min window)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Build allowed origins list once at startup (avoid rebuilding per-request)
const buildAllowedOrigins = () => {
  const frontendPorts = [3000, 3001, 3002, 3003, 3004, 3005, 5173, 5174, 5175];
  const origins = new Set();
  for (const port of frontendPorts) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }
  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        for (const port of frontendPorts) {
          origins.add(`http://${iface.address}:${port}`);
        }
      }
    }
  }
  return origins;
};
const allowedOrigins = buildAllowedOrigins();

// Middleware - CORS Configuration (FIXED: removed origin.includes('localhost') bypass)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Body parsing with size limits to prevent DoS via large payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ success: false, message: 'Request timeout' });
  });
  next();
});

// Activity logging middleware (after auth, before routes)
const { activityLogger } = require('./middleware/activityLogger');
app.use(activityLogger({
  excludePaths: ['/api/health', '/api/auth/refresh'],
  excludeSuccessful: false,
  logRequestBody: false
}));

// Static files for uploads (protected with auth - financial docs should not be public)
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static('uploads'));

// API Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes')); // Apply stricter rate limit to auth
app.use('/api/2fa', authLimiter, require('./routes/twoFactorAuthRoutes')); // 2FA management
app.use('/api/health', require('./routes/healthRoutes')); // Health checks (no auth required)
app.use('/api/export', require('./routes/exportRoutes')); // Export functionality
app.use('/api/budgets', require('./routes/budgetRoutes')); // Budget tracking
app.use('/api/bill-reminders', require('./routes/billReminderRoutes')); // Bill reminders & auto-payment
app.use('/api/activity-logs', require('./routes/activityLogRoutes')); // Activity logging
app.use('/api/search', require('./routes/searchRoutes')); // Search functionality
app.use('/api/csv', require('./routes/csvRoutes')); // CSV import/export
app.use('/api/notifications', require('./routes/notificationRoutes')); // Notifications
app.use('/api/cache', require('./routes/cacheRoutes')); // Cache management
app.use('/api/recurring', require('./routes/recurringRoutes')); // Recurring transactions
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/financial', require('./routes/financialRoutes'));
app.use('/api/gmail', require('./routes/gmailRoutes'));
app.use('/api/drive', require('./routes/googleDriveRoutes')); // Google Drive backup/sync
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/real-cibil', require('./routes/realCibilRoutes'));
app.use('/api/emi', require('./routes/emiRoutes'));
app.use('/api/loans-given', require('./routes/loansGivenRoutes'));
app.use('/api/personal-loans', require('./routes/personalLoanRoutes'));
app.use('/api/lenders', require('./routes/lenderRoutes'));
app.use('/api/lender-loans', require('./routes/lenderLoanRoutes'));
app.use('/api/lender-payments', require('./routes/lenderPaymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes')); // Investment portfolio tracking
app.use('/api/goals', require('./routes/goalRoutes')); // Financial goals management
app.use('/api/networth', require('./routes/netWorthRoutes')); // Net worth tracking
app.use('/api/insights', require('./routes/insights')); // Financial insights & behavior analysis
app.use('/api/banking', require('./routes/banking')); // Banking integration
app.use('/api/currency', require('./routes/currency')); // Currency conversion
app.use('/api/security', require('./routes/security')); // Security features
app.use('/api/company-expenses', require('./routes/companyExpenseRoutes')); // Company expenses tracking

// ========== NEW ENHANCED ROUTES ==========
// Split Expenses & Groups
app.use('/api/split-expenses', require('./routes/splitExpenseRoutes'));
// Receipt Scanning & OCR
app.use('/api/receipts', require('./routes/receiptRoutes'));
// Goal Tracking & Milestones
app.use('/api/goal-tracking', require('./routes/goalTrackingRoutes'));
// Bank Account Management
app.use('/api/bank-accounts', require('./routes/bankAccountRoutes'));
// Automation Rules Engine
app.use('/api/automation', require('./routes/automationRoutes'));
// Family Finance Management
app.use('/api/family', require('./routes/familyRoutes'));
// Financial Templates
app.use('/api/templates', require('./routes/templateRoutes'));
// AI Financial Chat
app.use('/api/chat', require('./routes/chatRoutes'));
// Market Data & Watchlist
app.use('/api/market', require('./routes/marketRoutes'));
// Currency Conversion & Alerts
app.use('/api/currency-v2', require('./routes/currencyRoutes'));
// Security Management
app.use('/api/security-v2', require('./routes/securityRoutes'));
// Smart Notifications
app.use('/api/smart-notifications', require('./routes/notificationRoutes'));
// Achievement System
app.use('/api/achievements', require('./routes/achievements'));
// Data Aggregation
app.use('/api/aggregation', require('./routes/aggregation'));
// Budget Optimization
app.use('/api/budget-optimization', require('./routes/budgetOptimization'));
// Smart Categorization
app.use('/api/categorize', require('./routes/categorize'));
// Financial Forecasting
app.use('/api/forecast', require('./routes/forecast'));
// Financial Reports
app.use('/api/financial-reports', require('./routes/reports'));
// Risk Assessment
app.use('/api/risk-assessment', require('./routes/riskAssessment'));
// Tax Optimization
app.use('/api/tax-optimization', require('./routes/taxOptimization'));
// Webhooks
app.use('/api/webhooks', require('./routes/webhooks'));

// ========== PREVIOUSLY UNREGISTERED ROUTES ==========
// Business Management (Invoices, Clients, Projects, Vendors, Contracts)
app.use('/api/business', require('./routes/business'));
// Data Management (Import/Export/Backup)
app.use('/api/data-management', require('./routes/dataManagement'));
// Debt Management
app.use('/api/debt', require('./routes/debt'));
// Insurance Management
app.use('/api/insurance', require('./routes/insurance'));
// Machine Learning Models & Predictions
app.use('/api/ml', require('./routes/ml'));
// Portfolio Analytics
app.use('/api/portfolio', require('./routes/portfolio'));
// Real Estate Management
app.use('/api/real-estate', require('./routes/realEstate'));
// Retirement Planning
app.use('/api/retirement', require('./routes/retirement'));
// Advanced Search
app.use('/api/advanced-search', require('./routes/search'));
// Subscription Management
app.use('/api/subscriptions', require('./routes/subscription'));
// Tax Management
app.use('/api/tax', require('./routes/tax'));
// Support Tickets
app.use('/api/support', require('./routes/support'));
// Database Backup & Restore
app.use('/api/backup', require('./routes/backup'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5001;

// Get network IPs from pre-computed allowedOrigins
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true); // Allow all in development
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST']
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required for WebSocket'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Invalid WebSocket authentication token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id} (user: ${socket.userId})`);
  
  // Auto-join user-specific room based on authenticated user
  socket.join(`user-${socket.userId}`);
  logger.info(`User ${socket.userId} joined room user-${socket.userId}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes and initialize WebSocket service
app.set('io', io);
websocketService.initialize(io);

// Start backup scheduler after MongoDB is connected
const backupScheduler = require('./services/backupScheduler');
mongoose.connection.once('open', () => {
  backupScheduler.start();
});

// Handle EADDRINUSE: kill stale process and retry once
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`⚠️ Port ${PORT} is in use. Attempting to free it...`);
    
    const { execSync } = require('child_process');
    try {
      // Try to find and kill the process using the port
      if (process.platform === 'win32') {
        const result = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf8', timeout: 5000 });
        const lines = result.trim().split('\n');
        for (const line of lines) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== '0' && parseInt(pid) !== process.pid) {
            logger.info(`Killing stale process PID ${pid} on port ${PORT}`);
            try { execSync(`taskkill /F /PID ${pid}`, { timeout: 5000 }); } catch (e) { /* ignore */ }
          }
        }
      } else {
        execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { timeout: 5000 });
      }
      
      // Wait and retry
      logger.info(`Retrying server start on port ${PORT} in 2 seconds...`);
      setTimeout(() => {
        server.listen(PORT, '0.0.0.0');
      }, 2000);
    } catch (killErr) {
      logger.error(`Could not free port ${PORT}. Try manually: taskkill /F /PID <pid>`);
      process.exit(1);
    }
  } else {
    logger.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const networkIPs = getNetworkIPs();
  
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`🏠 Local: http://localhost:${PORT}`);
  logger.info(`💾 Backup Scheduler: Active`);
  
  if (networkIPs.length > 0) {
    networkIPs.forEach(ip => {
      logger.info(`🌐 Network: http://${ip}:${PORT}`);
    });
  }
  
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'Not configured'}`);
  logger.info(`🔌 WebSocket: Enabled`);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop backup scheduler
  backupScheduler.stop();
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed.');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  // EADDRINUSE is handled by server.on('error') — don't double-handle
  if (err.code === 'EADDRINUSE') return;
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
