const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const logger = require('../utils/logger');

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Service unavailable'
    });
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with all services
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = await checkDatabaseHealth();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Calculate system metrics
    const memoryInfo = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      systemTotal: Math.round(totalMemory / 1024 / 1024),
      systemFree: Math.round(freeMemory / 1024 / 1024),
      systemUsedPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
      unit: 'MB'
    };

    // CPU information
    const cpuInfo = {
      model: os.cpus()[0].model,
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    };

    // Overall health status
    const isHealthy = dbStatus.connected && memoryInfo.systemUsedPercent < 90;
    
    const health = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      platform: process.platform,
      services: {
        database: dbStatus,
        memory: memoryInfo,
        cpu: cpuInfo,
      },
      hostname: os.hostname(),
    };

    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: isHealthy,
      data: health
    });
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Service health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe (can server handle requests?)
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseHealth();
    
    if (dbStatus.connected) {
      res.json({
        success: true,
        ready: true,
        message: 'Service is ready to handle requests'
      });
    } else {
      res.status(503).json({
        success: false,
        ready: false,
        message: 'Service is not ready - database not connected'
      });
    }
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      success: false,
      ready: false,
      message: 'Service is not ready'
    });
  }
});

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe (is server running?)
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    alive: true,
    message: 'Service is alive'
  });
});

/**
 * Helper function to check database health
 */
async function checkDatabaseHealth() {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const status = {
      connected: state === 1,
      state: stateMap[state] || 'unknown',
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    };

    // Test a simple query if connected
    if (state === 1) {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      status.responseTime = Date.now() - startTime;
      status.responseTimeUnit = 'ms';
    }

    return status;
  } catch (error) {
    logger.error('Database health check error:', error);
    return {
      connected: false,
      state: 'error',
      error: error.message
    };
  }
}

/**
 * Helper function to format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;
