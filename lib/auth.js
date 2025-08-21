const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { authenticator } = require('otplib');
const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const OTP_EXPIRES_IN = 10 * 60 * 1000; // 10 minutes in milliseconds

// Generate JWT token
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Token generation failed');
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
};

// Generate OTP
const generateOTP = () => {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in database
const storeOTP = async (phone, otp) => {
  try {
    // Delete any existing OTPs for this phone number
    await query('DELETE FROM otp_tokens WHERE phone = $1', [phone]);
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN);
    
    // Store new OTP
    const result = await query(
      'INSERT INTO otp_tokens (phone, otp, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [phone, otp, expiresAt]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw error;
  }
};

// Verify OTP
const verifyOTP = async (phone, otp) => {
  try {
    const result = await query(
      'SELECT * FROM otp_tokens WHERE phone = $1 AND otp = $2 AND expires_at > NOW() AND used = FALSE',
      [phone, otp]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Mark OTP as used
    await query(
      'UPDATE otp_tokens SET used = TRUE WHERE id = $1',
      [result.rows[0].id]
    );
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// Clean up expired OTPs (should be run periodically)
const cleanupExpiredOTPs = async () => {
  try {
    const result = await query('DELETE FROM otp_tokens WHERE expires_at < NOW()');
    console.log(`Cleaned up ${result.rowCount} expired OTPs`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};

// Middleware to protect routes
const requireAuth = (handler) => {
  return async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }
      
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
      
      // Add user info to request
      req.user = decoded;
      
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  };
};

// Middleware to protect admin routes
const requireAdminAuth = (handler) => {
  return async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }
      
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.type !== 'admin') {
        return res.status(401).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      // Add admin info to request
      req.admin = decoded;
      
      return handler(req, res);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  };
};

// Extract token from request
const extractTokenFromRequest = (req) => {
  // Check Authorization header
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  
  // Check cookies (if using cookie-based auth)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};

// Get user from token
const getUserFromToken = async (token) => {
  try {
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return null;
    }
    
    if (decoded.type === 'user') {
      // Get user from database
      const User = require('./models/User');
      return await User.findById(decoded.id);
    } else if (decoded.type === 'admin') {
      // Get admin from database
      const Admin = require('./models/Admin');
      return await Admin.findById(decoded.id);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

// Send SMS using 2factor.in API
const sendSMS = async (phone, message) => {
  try {
    const twoFactorSMS = require('./2factorSMS');
    
    // For development mode, still log the message
    if (process.env.NODE_ENV === 'development') {
      console.log(`Development mode - SMS to ${phone}: ${message}`);
    }
    
    // If message contains "Your OTP is", extract the OTP and use 2factor.in
    const otpMatch = message.match(/Your OTP is (\d+)/);
    if (otpMatch) {
      // Use 2factor.in AUTOGEN which sends the OTP automatically
      const result = await twoFactorSMS.sendOTP(phone);
      return {
        success: result.success,
        messageId: result.sessionId,
        sessionId: result.sessionId,
        otp: result.otp
      };
    } else {
      // For non-OTP messages, fall back to console logging
      console.log(`Non-OTP SMS to ${phone}: ${message}`);
      return { success: true, messageId: 'logged-' + Date.now() };
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

// Format phone number (ensure consistent format)
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  } else if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return '+' + cleaned.substring(1);
  }
  
  return phone; // Return as-is if format is unclear
};

// Validate phone number
const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  const cleaned = phone.replace(/\D/g, '');
  return phoneRegex.test(cleaned) || phoneRegex.test('+91' + cleaned);
};

// Rate limiting for OTP requests
const otpRateLimit = new Map();
const OTP_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;

const checkOTPRateLimit = (phone) => {
  const now = Date.now();
  const key = phone;
  
  if (!otpRateLimit.has(key)) {
    otpRateLimit.set(key, { count: 1, resetTime: now + OTP_RATE_LIMIT_WINDOW });
    return true;
  }
  
  const limit = otpRateLimit.get(key);
  
  if (now > limit.resetTime) {
    // Reset the limit
    otpRateLimit.set(key, { count: 1, resetTime: now + OTP_RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  limit.count++;
  return true;
};

module.exports = {
  generateToken,
  verifyToken,
  generateOTP,
  storeOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  requireAuth,
  requireAdminAuth,
  extractTokenFromRequest,
  getUserFromToken,
  sendSMS,
  formatPhoneNumber,
  isValidPhoneNumber,
  checkOTPRateLimit,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  OTP_EXPIRES_IN
};
