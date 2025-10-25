const logger = require('../utils/logger');

/**
 * Middleware to check if user is an admin
 * Must be used after authenticate middleware
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt by user ${req.user._id}`);
      return res.status(403).json({
        success: false,
        message: 'Admin access required. You do not have permission to access this resource.'
      });
    }

    logger.info(`Admin access granted to user ${req.user._id}`);
    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

module.exports = { isAdmin };
