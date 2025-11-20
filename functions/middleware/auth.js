const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// MongoDB User model (will be loaded if MongoDB is connected)
let User;
try {
  User = require('../models/User');
} catch (error) {
  console.warn('MongoDB User model not available, using Firebase Auth only');
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Try Firebase ID token first
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      
      // If MongoDB is available, enrich user data
      if (User) {
        try {
          const mongoUser = await User.findById(decodedToken.uid || decodedToken.id).select('-password');
          if (mongoUser) {
            req.user = {
              ...decodedToken,
              _id: mongoUser._id,
              role: mongoUser.role,
              ...mongoUser.toObject()
            };
          }
        } catch (mongoError) {
          console.log('MongoDB user lookup failed, using Firebase token only');
        }
      }
      
      next();
    } catch (firebaseError) {
      // Fallback to JWT verification
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      
      if (User) {
        const user = await User.findById(decoded.id || decoded.uid).select('-password');
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User not found or inactive'
          });
        }
        req.user = user;
      } else {
        req.user = decoded;
      }
      
      next();
    }
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Legacy authentication function for backward compatibility
const authenticate = authenticateToken;

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        
        if (User) {
          const mongoUser = await User.findById(decodedToken.uid || decodedToken.id).select('-password');
          if (mongoUser) {
            req.user = mongoUser;
          }
        }
      } catch (firebaseError) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        if (User) {
          const user = await User.findById(decoded.id || decoded.uid).select('-password');
          if (user && user.isActive) {
            req.user = user;
          }
        } else {
          req.user = decoded;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = { authenticate, authenticateToken, optionalAuth, requireAdmin };
