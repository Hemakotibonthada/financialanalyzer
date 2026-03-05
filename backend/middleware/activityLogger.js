const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Activity Logging Middleware
 * Logs user actions and API calls to database
 */

// Extract IP address from request
const getIpAddress = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         'unknown';
};

// Map HTTP methods to action types
const getActionFromMethod = (method, path) => {
  const methodMap = {
    GET: '_view',
    POST: '_create',
    PUT: '_update',
    PATCH: '_update',
    DELETE: '_delete'
  };
  
  return methodMap[method] || '_other';
};

// Extract resource from path
const getResourceFromPath = (path) => {
  const pathParts = path.split('/').filter(p => p);
  
  // Map API paths to resources
  const resourceMap = {
    // Core financial
    transactions: 'transaction',
    documents: 'document',
    profile: 'profile',
    emi: 'emi',
    emis: 'emi',
    budgets: 'budget',
    analytics: 'analytics',
    'analytics-v2': 'analytics',
    gmail: 'gmail',
    'real-cibil': 'cibil',
    auth: 'auth',
    '2fa': 'auth',
    admin: 'admin',
    // Investments & wealth
    investments: 'investment',
    portfolio: 'portfolio',
    goals: 'goal',
    'goal-tracking': 'goal',
    networth: 'networth',
    // Debt & loans
    debt: 'debt',
    debts: 'debt',
    'personal-loans': 'loan',
    'loans-given': 'loan',
    'cc-bills': 'credit_card',
    lenders: 'lender',
    'lender-loans': 'lender',
    'lender-payments': 'lender',
    // AI & ML
    ai: 'ai',
    'ai-training': 'ai',
    'ai-models': 'ai',
    'ai-intelligence': 'ai',
    'ai-enhanced': 'ai',
    'ai-extended': 'ai',
    'ai-advanced': 'ai',
    'ai-premium': 'ai',
    ml: 'ml',
    // Enterprise
    'company-expenses': 'company_expense',
    'split-expenses': 'split_expense',
    receipts: 'receipt',
    'bank-accounts': 'bank_account',
    automation: 'automation',
    family: 'family',
    templates: 'template',
    chat: 'chat',
    market: 'market',
    // Data & export
    export: 'export',
    'export-engine': 'export',
    'data-export': 'export',
    'data-management': 'data',
    csv: 'csv',
    backup: 'backup',
    'import-export': 'data',
    // Insurance, tax, real estate
    insurance: 'insurance',
    tax: 'tax',
    'tax-optimization': 'tax',
    'real-estate': 'real_estate',
    retirement: 'retirement',
    planning: 'planning',
    // Notifications & security
    notifications: 'notification',
    'smart-notifications': 'notification',
    'enterprise-notifications': 'notification',
    security: 'security',
    'security-v2': 'security',
    // Search & misc
    search: 'search',
    'advanced-search': 'search',
    insights: 'insight',
    'financial-insights': 'insight',
    'financial-reports': 'report',
    forecast: 'forecast',
    currency: 'currency',
    'currency-v2': 'currency',
    recurring: 'recurring',
    subscriptions: 'subscription',
    achievements: 'achievement',
    aggregation: 'aggregation',
    'budget-optimization': 'budget',
    categorize: 'categorization',
    'risk-assessment': 'risk',
    webhooks: 'webhook',
    support: 'support',
    jobs: 'jobs',
    cache: 'cache',
    'bill-reminders': 'bill_reminder',
    'activity-logs': 'activity_log',
    business: 'business',
    financial: 'financial',
    drive: 'drive',
    health: 'health',
  };

  // Find matching resource in path
  for (const [key, value] of Object.entries(resourceMap)) {
    if (pathParts.includes(key)) {
      return value;
    }
  }

  return 'other';
};

// Determine action from path and method
const determineAction = (method, path) => {
  // Special cases
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/register')) return 'register';
  if (path.includes('/analyze')) return 'analysis_run';
  if (path.includes('/sync')) return 'gmail_sync';
  if (path.includes('/upload')) return 'document_upload';
  if (path.includes('/export')) return 'export_data';
  if (path.includes('/import')) return 'import_data';
  if (path.includes('/refresh') && path.includes('cibil')) return 'cibil_refresh';
  if (path.includes('/train')) return 'ai_train';
  if (path.includes('/predict')) return 'ai_predict';
  if (path.includes('/forecast')) return 'forecast_generate';
  if (path.includes('/backup')) return 'backup_create';
  if (path.includes('/restore')) return 'backup_restore';
  if (path.includes('/password')) return 'password_change';
  if (path.includes('/2fa')) return '2fa_manage';
  if (path.includes('/categorize')) return 'categorization';
  if (path.includes('/optimize')) return 'optimization_run';
  if (path.includes('/download')) return 'file_download';
  
  // Generic action based on resource and method
  const resource = getResourceFromPath(path);
  const actionSuffix = getActionFromMethod(method, path);
  
  return `${resource}${actionSuffix}`;
};

// Determine severity based on status code
const getSeverity = (statusCode) => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  return 'info';
};

/**
 * Middleware to log activity after response is sent
 */
const activityLogger = (options = {}) => {
  const {
    excludePaths = ['/api/health', '/api/auth/refresh'],
    excludeSuccessful = false,
    logRequestBody = false,
    logResponseBody = false
  } = options;

  return (req, res, next) => {
    // Skip if path is excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if no user (public endpoints)
    if (!req.user) {
      return next();
    }

    const startTime = Date.now();

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody;

    // Override res.send to capture response
    res.send = function(body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Override res.json to capture response
    res.json = function(body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Log activity after response is finished
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const isSuccess = statusCode < 400;

        // Skip successful requests if configured
        if (excludeSuccessful && isSuccess) {
          return;
        }

        const action = determineAction(req.method, req.path);
        const resource = getResourceFromPath(req.path);
        const severity = getSeverity(statusCode);

        // Build log data
        const logData = {
          userId: req.user._id,
          action,
          resource,
          method: req.method,
          endpoint: req.path,
          statusCode,
          ipAddress: getIpAddress(req),
          userAgent: req.headers['user-agent'],
          severity,
          isSuccess,
          metadata: {
            duration
          }
        };

        // Add request details if configured
        if (logRequestBody && req.body) {
          logData.details = {
            request: req.body,
            query: req.query
          };
        }

        // Add response details if configured and failed
        if ((logResponseBody || !isSuccess) && responseBody) {
          try {
            const parsedBody = typeof responseBody === 'string' 
              ? JSON.parse(responseBody) 
              : responseBody;
            
            if (parsedBody.message) {
              logData.metadata.errorMessage = parsedBody.message;
            }
            
            if (!isSuccess && logResponseBody) {
              logData.details = {
                ...logData.details,
                response: parsedBody
              };
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        // Extract resource ID from params if available
        if (req.params.id) {
          logData.resourceId = req.params.id;
        }

        // Log to database (async, don't wait)
        ActivityLog.logActivity(logData).catch(err => {
          logger.error('Activity log save failed:', err.message);
        });

        // Also log to Winston file logs for persistent file-based audit trail
        const logMsg = `[${req.method}] ${req.path} → ${statusCode} (${duration}ms) user=${req.user._id} action=${action}`;
        if (statusCode >= 500) {
          logger.error(logMsg);
        } else if (statusCode >= 400) {
          logger.warn(logMsg);
        } else {
          logger.http(logMsg);
        }

      } catch (error) {
        logger.error('Activity logging error:', error);
      }
    });

    next();
  };
};

/**
 * Helper function to manually log specific activities
 */
const logActivity = async (userId, action, details = {}) => {
  try {
    await ActivityLog.logActivity({
      userId,
      action,
      resource: details.resource || 'other',
      resourceId: details.resourceId,
      details: details.data || {},
      isSuccess: details.isSuccess !== false,
      severity: details.severity || 'info'
    });
  } catch (error) {
    logger.error('Manual activity log failed:', error);
  }
};

/**
 * Helper to log changes to entities
 */
const logChange = async (userId, action, resource, resourceId, before, after) => {
  try {
    await ActivityLog.logActivity({
      userId,
      action,
      resource,
      resourceId,
      changes: { before, after },
      isSuccess: true,
      severity: 'info'
    });
  } catch (error) {
    logger.error('Change log failed:', error);
  }
};

module.exports = {
  activityLogger,
  logActivity,
  logChange
};
