const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
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

const app = express();

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

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/financial', require('./routes/financialRoutes'));
app.use('/api/gmail', require('./routes/gmailRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/real-cibil', require('./routes/realCibilRoutes'));
app.use('/api/emi', require('./routes/emiRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Financial Analyzer API is running',
    timestamp: new Date().toISOString()
  });
});

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
