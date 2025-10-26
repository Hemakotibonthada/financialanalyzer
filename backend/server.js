const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const websocketService = require('./services/websocketService');

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

// Security: Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and network IPs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL
    ];
    
    // Add network IPs dynamically
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          allowedOrigins.push(`http://${iface.address}:3000`);
        }
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Activity logging middleware (after auth, before routes)
const { activityLogger } = require('./middleware/activityLogger');
app.use(activityLogger({
  excludePaths: ['/api/health', '/api/auth/refresh'],
  excludeSuccessful: false,
  logRequestBody: false
}));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes')); // Apply stricter rate limit to auth
app.use('/api/2fa', authLimiter, require('./routes/twoFactorAuthRoutes')); // 2FA management
app.use('/api/health', require('./routes/healthRoutes')); // Health checks (no auth required)
app.use('/api/export', require('./routes/exportRoutes')); // Export functionality
app.use('/api/budgets', require('./routes/budgetRoutes')); // Budget tracking
app.use('/api/activity-logs', require('./routes/activityLogRoutes')); // Activity logging
app.use('/api/search', require('./routes/searchRoutes')); // Search functionality
app.use('/api/csv', require('./routes/csvRoutes')); // CSV import/export
app.use('/api/notifications', require('./routes/notificationRoutes')); // Notifications
app.use('/api/cache', require('./routes/cacheRoutes')); // Cache management
app.use('/api/recurring', require('./routes/recurringRoutes')); // Recurring transactions
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/financial', require('./routes/financialRoutes'));
app.use('/api/gmail', require('./routes/gmailRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/real-cibil', require('./routes/realCibilRoutes'));
app.use('/api/emi', require('./routes/emiRoutes'));
app.use('/api/loans-given', require('./routes/loansGivenRoutes'));
app.use('/api/personal-loans', require('./routes/personalLoanRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

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
const os = require('os');

// Get network interfaces to display IP addresses
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
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
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow localhost and network IPs
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        process.env.FRONTEND_URL
      ];
      
      // Add network IPs dynamically
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            allowedOrigins.push(`http://${iface.address}:3000`);
          }
        }
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for development
      }
    },
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  
  // Join user-specific room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`👤 User ${userId} joined room user-${userId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes and initialize WebSocket service
app.set('io', io);
websocketService.initialize(io);

server.listen(PORT, '0.0.0.0', () => {
  const networkIPs = getNetworkIPs();
  
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`🏠 Local: http://localhost:${PORT}`);
  
  if (networkIPs.length > 0) {
    networkIPs.forEach(ip => {
      logger.info(`� Network: http://${ip}:${PORT}`);
    });
  }
  
  logger.info(`�📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'Not configured'}`);
  logger.info(`🔌 WebSocket: Enabled`);
});

module.exports = app;
