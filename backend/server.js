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
const morgan = require('morgan');
const websocketService = require('./services/websocketService');
const jwt = require('jsonwebtoken');

// Load environment variables
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Validate environment before anything else starts (hard-fails in production)
require('./config/validateEnv')();

// Initialize error tracking (no-op unless SENTRY_DSN + @sentry/node present)
require('./config/sentry').init();

// Add QPDF to PATH if configured (must happen before requiring any modules that use qpdf)
if (process.env.QPDF_PATH) {
  const qpdfDir = path.dirname(process.env.QPDF_PATH);
  process.env.PATH = `${qpdfDir}${path.delimiter}${process.env.PATH}`;
  logger.info(`✅ QPDF binary directory added to PATH: ${qpdfDir}`);
} else {
  // Auto-detect qpdf on Mac/Linux
  const { execSync } = require('child_process');
  try {
    const detected = execSync('which qpdf 2>/dev/null || where qpdf 2>nul', { encoding: 'utf-8' }).trim().split('\n')[0];
    if (detected) {
      process.env.QPDF_PATH = detected;
      const qpdfDir = path.dirname(detected);
      process.env.PATH = `${qpdfDir}${path.delimiter}${process.env.PATH}`;
      logger.info(`✅ QPDF auto-detected: ${detected}`);
    } else {
      logger.warn('⚠️ QPDF not found. Password-protected PDF processing will be disabled.');
    }
  } catch {
    logger.warn('⚠️ QPDF not installed. Install with: brew install qpdf (Mac) or apt install qpdf (Linux) or winget install qpdf.qpdf (Windows)');
  }
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

// Connect to MongoDB (must complete before dependent services start)
connectDB().then(() => {
  // Initialize Cache Service (after DB is ready)
  const cacheService = require('./services/cacheService');
  cacheService.initialize().catch(err => {
    logger.warn('Cache service initialization failed:', err.message);
  });

  // Initialize Bill Reminder Service (after DB is ready)
  const billReminderService = require('./services/billReminderService');
  billReminderService.initialize().catch(err => {
    logger.warn('Bill Reminder service initialization failed:', err.message);
  });

  // Initialize GCP Cloud Storage Service
  const gcpStorageService = require('./services/gcpStorageService');
  const gcpReady = gcpStorageService.initialize();
  if (gcpReady) {
    gcpStorageService.ensureBucket().catch(err => {
      logger.warn('GCP Storage bucket check failed:', err.message);
    });
  }
}).catch(err => {
  logger.error('Failed to start — MongoDB connection could not be established');
  process.exit(1);
});

const app = express();

// Behind a reverse proxy (Caddy/nginx) in production, trust the first proxy hop
// so req.protocol/secure and client IPs (rate limiting) reflect the real request.
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

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
const parseOriginList = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Convert a narrow glob into an anchored RegExp.
 *
 * `*` matches within a single DNS label only ([^.]*), so
 * `financialanalyzer-web-*.vercel.app` matches this project's preview URLs but
 * NOT `evil.vercel.app`. That distinction matters: anyone can deploy to
 * *.vercel.app, so a bare suffix match would hand every Vercel user a
 * credentialed cross-origin channel to this API.
 */
const originGlobToRegExp = (pattern) => {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^.]*');
  return new RegExp(`^${escaped}$`);
};

const buildAllowedOrigins = () => {
  const frontendPorts = [3000, 3001, 3002, 3003, 3004, 3005, 5173, 5174, 5175];
  const origins = new Set();
  for (const port of frontendPorts) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }

  // Both accept a comma-separated list, so one deployment can serve several
  // front ends (e.g. the custom domain plus the platform URL).
  parseOriginList(process.env.FRONTEND_URL).forEach((o) => origins.add(o));
  parseOriginList(process.env.CORS_ORIGIN).forEach((o) => origins.add(o));

  // Firebase Hosting domains
  origins.add('https://finserveassist.web.app');
  origins.add('https://finserveassist.firebaseapp.com');

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

// Opt-in patterns for platform preview URLs, which get a new hostname on every
// deployment and so cannot be listed exactly. Example:
//   CORS_ORIGIN_PATTERNS=https://financialanalyzer-web-*.vercel.app
// Empty by default: no pattern matching happens unless it is configured.
const allowedOriginPatterns = parseOriginList(process.env.CORS_ORIGIN_PATTERNS).map(originGlobToRegExp);

const isOriginAllowed = (origin) => {
  if (allowedOrigins.has(origin)) return true;
  return allowedOriginPatterns.some((re) => re.test(origin));
};

// Middleware - CORS Configuration (FIXED: removed origin.includes('localhost') bypass)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
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
};

app.use(cors(corsOptions));

// Preflight uses the SAME allowlist. A bare cors() here would default to
// origin '*', which contradicts the allowlist above - preflight would approve
// an origin the actual request then rejects.
app.options('*', cors(corsOptions));

// Body parsing with size limits to prevent DoS via large payloads
app.use(express.json({
  limit: '10mb',
  // Preserve raw body for webhook signature verification (e.g., Razorpay).
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Correlation id + structured request logging
app.use(require('./middleware/requestContext'));

// HTTP request logging via morgan → pipes into Winston file logs
const morganStream = { write: (message) => logger.http(message.trim()) };
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

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

// Enterprise middleware suite (request IDs, perf monitoring, audit, response helpers)
const {
  requestIdMiddleware,
  performanceMiddleware,
  auditMiddleware,
  responseFormatterMiddleware,
  apiVersionMiddleware,
  globalErrorHandler,
  healthCheckHandler,
  adminAnalyticsHandler,
} = require('./middleware/enterpriseMiddleware');
app.use(requestIdMiddleware);
app.use(apiVersionMiddleware('2.0.0'));
app.use(performanceMiddleware);
app.use(responseFormatterMiddleware);
app.use(auditMiddleware);

// Static files for uploads (protected with auth - financial docs should not be public)
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static('uploads'));

// API Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes')); // Apply stricter rate limit to auth
app.use('/api/billing', require('./routes/billingRoutes')); // SaaS subscription & billing
app.use('/api/2fa', authLimiter, require('./routes/twoFactorAuthRoutes')); // 2FA management
app.use('/api/health', require('./routes/healthRoutes')); // Health checks (no auth required)
app.use('/api/public', require('./routes/publicRoutes')); // Public stats for landing page (no auth required)
app.use('/api/export', require('./routes/exportRoutes')); // Export functionality
app.use('/api/budgets', require('./routes/budgetRoutes')); // Budget tracking
app.use('/api/bill-reminders', require('./routes/billReminderRoutes')); // Bill reminders & auto-payment
app.use('/api/activity-logs', require('./routes/activityLogRoutes')); // Activity logging
app.use('/api/search', require('./routes/searchRoutes')); // Search functionality
app.use('/api/csv', require('./routes/csvRoutes')); // CSV import/export
app.use('/api/statements', require('./routes/statementImportRoutes')); // PDF/TXT/CSV statement import
app.use('/api/notifications', require('./routes/notificationRoutes')); // Notifications
app.use('/api/cache', require('./routes/cacheRoutes')); // Cache management
app.use('/api/recurring', require('./routes/recurringRoutes')); // Recurring transactions
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/financial', require('./routes/financialRoutes'));
app.use('/api/transactions', (() => {
  // Inline router for /api/transactions — provides a clean GET/POST /api/transactions
  // without double-prefix issues from mounting financialRoutes.
  const txnRouter = require('express').Router();
  const { authenticate } = require('./middleware/auth');
  const Transaction = require('./models/Transaction');
  const logger = require('./utils/logger');

  // GET /api/transactions — list transactions
  txnRouter.get('/', authenticate, async (req, res) => {
    try {
      const { limit = 50, sort = '-date', days, startDate, endDate, category, type } = req.query;
      const query = { userId: req.user._id };
      if (days) {
        const d = new Date(); d.setDate(d.getDate() - parseInt(days));
        query.date = { $gte: d };
      }
      if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      if (category) query.category = category;
      if (type) query.type = type;
      const sortObj = {};
      const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
      sortObj[sortField] = sort.startsWith('-') ? -1 : 1;
      const transactions = await Transaction.find(query).sort(sortObj).limit(parseInt(limit));
      res.json({ success: true, data: transactions, count: transactions.length });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
    }
  });

  // POST /api/transactions — create transaction with AI enrichment
  txnRouter.post('/', authenticate, async (req, res) => {
    try {
      let txnData = { ...req.body, userId: req.user._id };

      // AI auto-enrichment (non-blocking)
      try {
        const enrichment = require('./services/ai/transactionEnrichment');
        const enriched = await enrichment.enrich(txnData, req.user._id);
        // Merge AI data without overwriting user-provided fields
        if (!txnData.category || txnData.category === 'other') txnData.category = enriched.category;
        txnData.merchantNormalized = enriched.merchantNormalized;
        txnData.necessityType = enriched.necessityType;
        txnData.isTaxDeductible = enriched.isTaxDeductible;
        txnData.isRecurring = enriched.isRecurring;
        txnData.autoTags = enriched.autoTags;
        if (enriched.isAnomalous) {
          txnData.isAnomalous = true;
          txnData.anomalyScore = enriched.anomalyScore;
        }
      } catch (aiErr) {
        // AI enrichment is optional — don't block transaction creation
        logger.debug('AI enrichment skipped:', aiErr.message);
      }

      const txn = await Transaction.create(txnData);
      res.status(201).json({ success: true, data: txn });
    } catch (error) {
      logger.error('Create transaction error:', error);
      res.status(500).json({ success: false, message: 'Failed to create transaction', error: error.message });
    }
  });

  // GET /api/transactions/analytics
  txnRouter.get('/analytics', authenticate, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const since = new Date(); since.setDate(since.getDate() - parseInt(days));
      const transactions = await Transaction.find({ userId: req.user._id, date: { $gte: since } });
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      const byCategory = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
      });
      res.json({ success: true, data: { income, expenses, net: income - expenses, byCategory, count: transactions.length } });
    } catch (error) {
      logger.error('Transaction analytics error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
    }
  });

  return txnRouter;
})());
app.use('/api/gmail', require('./routes/gmailRoutes'));
app.use('/api/gmail-enhanced', require('./routes/gmailEnhancedRoutes'));
app.use('/api/drive', require('./routes/googleDriveRoutes')); // Google Drive backup/sync
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/analytics-v2', require('./routes/analyticsV2Routes')); // Enterprise Analytics V2
app.use('/api/real-cibil', require('./routes/realCibilRoutes'));
app.use('/api/emi', require('./routes/emiRoutes'));
app.use('/api/emis', require('./routes/emiRoutes')); // Alias: plural form used by some frontend pages
app.use('/api/cc-bills', require('./routes/creditCardBillRoutes'));
app.use('/api/loans-given', require('./routes/loansGivenRoutes'));
app.use('/api/personal-loans', require('./routes/personalLoanRoutes'));
app.use('/api/lenders', require('./routes/lenderRoutes'));
app.use('/api/lender-loans', require('./routes/lenderLoanRoutes'));
app.use('/api/lender-payments', require('./routes/lenderPaymentRoutes'));
app.use('/api/loan-intelligence', require('./routes/loanAppIntelligenceRoutes')); // Loan-app/NBFC EMI + overdue + debt-spiral detection from Gmail
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes')); // Investment portfolio tracking
app.use('/api/funders', require('./routes/funderRoutes')); // Funder/investor tracking
app.use('/api/goals', require('./routes/goalRoutes')); // Financial goals management
app.use('/api/networth', require('./routes/netWorthRoutes')); // Net worth tracking
app.use('/api/insights', require('./routes/insights')); // Financial insights & behavior analysis
app.use('/api/banking', require('./routes/banking')); // Banking integration
app.use('/api/currency', require('./routes/currency')); // Currency conversion
app.use('/api/security', require('./routes/security')); // Security features
app.use('/api/company-expenses', require('./routes/companyExpenseRoutes')); // Company expenses tracking
app.use('/api/gcp-storage', require('./routes/gcpStorageRoutes')); // GCP Cloud Storage backup/sync

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
app.use('/api/debts', require('./routes/debt')); // Alias: plural form used by some frontend pages
// Insurance Management
app.use('/api/insurance', require('./routes/insurance'));
// Machine Learning Models & Predictions
app.use('/api/ml', require('./routes/ml'));
// Local AI Engine
app.use('/api/ai', require('./routes/aiRoutes'));
// AI Model Training & NLP Chat
app.use('/api/ai-training', require('./routes/aiTrainingRoutes'));
// AI Model Manager — Enterprise Model Registry, Self-Training, Drift Detection, A/B Testing
app.use('/api/ai-models', require('./routes/aiModelRoutes'));
// AI Intelligence — Self-Learning Pipeline, Enrichment, Goals AI, Budget Optimizer, Debt Payoff, Cash Flow
app.use('/api/ai-intelligence', require('./routes/aiIntelligenceRoutes'));
// Enhanced AI — RL Optimization, Anomaly Detection, Knowledge Graph, AutoML, XAI, Conversational AI
app.use('/api/ai-enhanced', require('./routes/aiEnhancedRoutes'));
// Extended AI — Fraud Detection, NL Reports, Document Intelligence, Behavioral Finance
app.use('/api/ai-extended', require('./routes/aiExtendedRoutes'));
// Advanced AI — Portfolio Optimization, Credit Score, Smart Notifications, Peer Comparison, Semantic Search
app.use('/api/ai-advanced', require('./routes/aiAdvancedRoutes'));
// Premium AI — Cash Flow Intelligence, Subscription Manager, Tax Harvesting
app.use('/api/ai-premium', require('./routes/aiPremiumRoutes'));
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

// ========== ENTERPRISE SERVICES ==========
// Data Export (CSV/JSON) — transactions, budgets, EMIs, investments, goals, snapshots
app.use('/api/data-export', require('./routes/dataExportRoutes'));
// Scheduled Jobs Management — budget reset, EMI reminders, AI retraining
app.use('/api/jobs', require('./routes/scheduledJobsRoutes'));
// Financial Insights — trends, ratios, velocity, merchant analysis
app.use('/api/financial-insights', require('./routes/financialInsightsRoutes'));
// Enterprise Notification Engine — Smart alerts & AI-driven notifications
app.use('/api/enterprise-notifications', require('./routes/enterpriseNotificationRoutes'));
// Financial Planning — Retirement, SIP, Tax, Insurance, Wealth Projection
app.use('/api/planning', require('./routes/financialPlanningRoutes'));
// Data Export Engine — CSV/JSON export with templates & aggregation
const { createExportRoutes, exportEngine } = require('./services/dataExportEngine');
app.use('/api/export-engine', createExportRoutes(exportEngine));
// Enterprise AI Services (Prediction, Risk, Tax, Reports)
app.use('/api/enterprise', require('./routes/enterpriseRoutes'));

// ========== WEALTH & WELLNESS SERVICES ==========
// Wealth Management — net worth, assets, projections, FIRE
app.use('/api/wealth', require('./routes/wealthManagementRoutes'));
// Expense Intelligence — smart spending analysis, anomaly detection
app.use('/api/expense-intelligence', require('./routes/expenseIntelligenceRoutes'));
// Borrowing Intelligence — AI-powered loan analysis, predictions, self-training
app.use('/api/borrowing-intelligence', require('./routes/borrowingIntelligenceRoutes'));
// Local AI Engine — chat, categorization, alerts (works offline, Ollama optional)
app.use('/api/local-ai', require('./routes/localAIRoutes'));

// ---------------------------------------------------------------------------
// Legacy Guard — dormancy detection, welfare outreach, estate settlement.
// Support-facing routes gate on SUPPORT_ROLES inside each router. The nominee
// portal deliberately does NOT use `authenticate`: nominees have no platform
// account and are authenticated by a single-purpose signed token instead.
// See docs/features/legacy-guard.md
// ---------------------------------------------------------------------------
app.use('/api/nominees', require('./routes/nomineeRoutes'));
app.use('/api/legacy/dormancy', require('./routes/dormancyRoutes'));
app.use('/api/legacy/estate', require('./routes/estateCaseRoutes'));
app.use('/api/legacy/claims', require('./routes/recoveryClaimRoutes'));
app.use('/api/legacy/settlement', require('./routes/settlementRoutes'));
app.use('/api/legacy/admin', require('./routes/legacyAdminRoutes'));
app.use('/api/nominee-portal', require('./routes/nomineePortalRoutes'));

// Enterprise Health & Admin Analytics
app.get('/api/enterprise-health', healthCheckHandler);
app.get('/api/admin/system-analytics', adminAnalyticsHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler (Enterprise)
app.use(globalErrorHandler);

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

// Initialize Enterprise WebSocket Engine
const { wsEngine } = require('./services/websocketEngine');
wsEngine.initialize(io);
app.set('wsEngine', wsEngine);

// Start backup scheduler after MongoDB is connected
const backupScheduler = require('./services/backupScheduler');
const gmailAutoSync = require('./services/gmailAutoSync');

// AI Self-Training Scheduler — automated model retraining
let selfTrainingScheduler = null;
try {
  const schedulerModule = require('./services/selfTrainingScheduler');
  selfTrainingScheduler = schedulerModule.selfTrainingScheduler || schedulerModule;
} catch (err) {
  logger.warn('Self-training scheduler not available:', err.message);
}

mongoose.connection.once('open', () => {
  backupScheduler.start();
  gmailAutoSync.start();
  if (selfTrainingScheduler) {
    selfTrainingScheduler.start();
    logger.info('🤖 AI Self-Training Scheduler: Active');
  }

  // Legacy Guard — daily dormancy scan, hourly escalation ladder, SLA sweep.
  // Wrapped so a scheduler fault can never prevent the API from serving.
  try {
    const legacyScheduler = require('./services/legacy/legacyScheduler');
    legacyScheduler.start();
    logger.info('🛡️ Legacy Guard Scheduler: Active');
  } catch (err) {
    logger.warn('Legacy Guard scheduler not started:', err.message);
  }

  // Auto-train AI Intelligence Pipeline for all active users
  setTimeout(async () => {
    try {
      const User = require('./models/User');
      const { getPipeline } = require('./services/ai/selfLearningPipeline');
      const users = await User.find({ isActive: { $ne: false } }).select('_id').limit(50).lean();
      let trained = 0;
      for (const user of users) {
        try {
          const pipeline = getPipeline(user._id);
          const result = await pipeline.train(user._id);
          if (result.status === 'success') trained++;
        } catch {}
      }
      if (trained > 0) logger.info(`🧠 AI Intelligence: Auto-trained ${trained}/${users.length} user models`);
    } catch (err) {
      logger.warn('AI auto-training skipped:', err.message);
    }
  }, 10000); // Start 10s after DB connection
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
  logger.info(`🤖 AI Engine: Ready (7 modules loaded)`);
  logger.info(`📡 AI Model Routes: /api/ai-models`);
  
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
  
  // Stop schedulers
  backupScheduler.stop();
  if (selfTrainingScheduler) {
    try { selfTrainingScheduler.stop(); } catch (e) { /* ignore */ }
  }
  
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
