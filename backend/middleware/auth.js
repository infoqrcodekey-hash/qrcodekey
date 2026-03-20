// ============================================
// middleware/auth.js - JWT Authentication
// ============================================
// This middleware checks on every protected route
// whether the user is logged in or not

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ====== Protect Routes (Login Required) ======
exports.protect = async (req, res, next) => {
  let token;

  // Check token - from Header or Cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Token not found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Please login first'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact admin'
      });
    }

    // Add user info to request
    req.user = user;
    next();

  } catch (error) {
    // Token expired or invalid
    const message = error.name === 'TokenExpiredError' 
      ? 'Session expired. Please login again'
      : 'Invalid token. Please login again';
    
    return res.status(401).json({
      success: false,
      message
    });
  }
};

// ====== Role-based Authorization ======
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`
      });
    }
    next();
  };
};

// ====== Admin Only ======
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access only'
    });
  }
  next();
};

// ====== Premium Only ======
exports.premiumOnly = (req, res, next) => {
  if (!req.user.isPremium()) {
    return res.status(403).json({
      success: false,
      message: 'This feature is for Premium users only. Please upgrade',
      upgradeUrl: '/pricing'
    });
  }
  next();
};

// ====== Optional Auth (Login optional, but info available if logged in) ======
exports.optionalAuth = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (err) {
      // Ignore if token is invalid, continue without login
    }
  }
  
  next();
};
