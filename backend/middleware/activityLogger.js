const ActivityLog = require('../models/ActivityLog');

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
    transactions: 'transaction',
    documents: 'document',
    profile: 'profile',
    emi: 'emi',
    budgets: 'budget',
    analytics: 'analysis',
    gmail: 'gmail',
    'real-cibil': 'cibil',
    auth: 'user',
    admin: 'other'
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
  if (path.includes('/refresh') && path.includes('cibil')) return 'cibil_refresh';
  
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
          console.error('Activity log save failed:', err.message);
        });

      } catch (error) {
        console.error('Activity logging error:', error);
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
    console.error('Manual activity log failed:', error);
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
    console.error('Change log failed:', error);
  }
};

module.exports = {
  activityLogger,
  logActivity,
  logChange
};
