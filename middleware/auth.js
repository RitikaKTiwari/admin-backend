const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, admin not found'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is disabled. Please contact support.'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
};

exports.superAdminAuth = async (req, res, next) => {
  try {
    await exports.adminAuth(req, res, () => {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Super admin access required'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Super admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
};