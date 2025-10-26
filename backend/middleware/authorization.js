// Middleware to check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Middleware to check if user is lender or admin
const isLenderOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (req.user.role !== 'lender' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Lender or Admin privileges required.'
    });
  }

  next();
};

// Middleware to check if user is the owner or admin
const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user._id.toString() !== resourceUserId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  }

  next();
};

module.exports = {
  authorize,
  isAdmin,
  isLenderOrAdmin,
  isOwnerOrAdmin
};
