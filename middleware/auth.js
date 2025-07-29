// master-api/middleware/auth.js
const admin = require('../config/firebase-admin');

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For backward compatibility, check if firebaseUid is provided
      if (req.body.firebaseUid || req.params.firebaseUid) {
        console.warn('⚠️ Request without token, using firebaseUid for backward compatibility');
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      ...decodedToken
    };
    
    // Log successful auth
    console.log('✅ Token verified for user:', req.user.email || req.user.uid);
    
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please sign in again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid authorization token' 
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        ...decodedToken
      };
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without auth
    console.warn('⚠️ Optional auth failed:', error.message);
    next();
  }
};

module.exports = {
  verifyToken,
  optionalAuth
};