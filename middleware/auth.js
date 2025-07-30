// master-api/middleware/auth.js
const { admin } = require('../config/firebase-admin');

// Verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    // Sprawdź czy Firebase Admin jest zainicjalizowany
    if (!admin) {
      console.warn('⚠️ Firebase Admin not initialized - skipping auth');
      req.user = { uid: req.params.firebaseUid || req.body.firebaseUid };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Jeśli brak tokenu, spróbuj użyć firebaseUid z params lub body
      const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
      if (firebaseUid) {
        console.log('⚠️ No auth token, using firebaseUid:', firebaseUid);
        req.user = { uid: firebaseUid };
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Weryfikuj token
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      
      // Fallback do firebaseUid jeśli token jest nieprawidłowy
      const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
      if (firebaseUid) {
        console.log('⚠️ Invalid token, using firebaseUid as fallback:', firebaseUid);
        req.user = { uid: firebaseUid };
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid authorization token' 
      });
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    // W przypadku błędu, spróbuj użyć firebaseUid
    const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
    if (firebaseUid) {
      req.user = { uid: firebaseUid };
      return next();
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

// Optional auth - nie wymaga tokenu
const optionalAuth = async (req, res, next) => {
  try {
    // Jeśli nie ma Firebase Admin, użyj firebaseUid
    if (!admin) {
      const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
      if (firebaseUid) {
        req.user = { uid: firebaseUid };
      }
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Brak tokenu - to jest OK dla optional auth
      const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
      if (firebaseUid) {
        req.user = { uid: firebaseUid };
      }
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) {
      console.warn('⚠️ Optional auth - invalid token, continuing without auth');
      // Nie zwracaj błędu - to jest optional
      const firebaseUid = req.params.firebaseUid || req.body.firebaseUid;
      if (firebaseUid) {
        req.user = { uid: firebaseUid };
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Optional auth error:', error);
    // Kontynuuj bez autoryzacji
    next();
  }
};

module.exports = { verifyToken, optionalAuth };