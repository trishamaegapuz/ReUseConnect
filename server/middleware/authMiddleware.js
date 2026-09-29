const jwt = require('jsonwebtoken');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// Verifies JWT token
// ============================================================

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // --------------------------------------------------------
    // Check Authorization header
    // Expected:
    // Authorization: Bearer TOKEN
    // --------------------------------------------------------

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required.'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format.'
      });
    }

    const token = parts[1];

    // --------------------------------------------------------
    // Verify token
    // --------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // --------------------------------------------------------
    // Store authenticated user information in req.user
    // --------------------------------------------------------

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role
    };

    next();

  } catch (error) {
    console.error('AUTH MIDDLEWARE ERROR:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or unauthorized token.'
    });
  }
};

// ============================================================
// ADMIN ONLY
// ============================================================

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
};

// ============================================================
// SELLER ONLY
// ============================================================

const sellerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'SELLER') {
    return res.status(403).json({
      success: false,
      message: 'Seller access required.'
    });
  }

  next();
};

// ============================================================
// BUYER ONLY
// ============================================================

const buyerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'BUYER') {
    return res.status(403).json({
      success: false,
      message: 'Buyer access required.'
    });
  }

  next();
};

// ============================================================
// ADMIN OR SELLER
// ============================================================

const adminOrSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!['ADMIN', 'SELLER'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or seller access required.'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  adminOnly,
  sellerOnly,
  buyerOnly,
  adminOrSeller
};