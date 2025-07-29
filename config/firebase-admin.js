// master-api/config/firebase-admin.js
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'masterdrink-d5f9f',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    
    // Fallback - initialize without credentials for development
    admin.initializeApp();
    console.warn('⚠️ Firebase Admin initialized without credentials - auth verification will fail');
  }
}

module.exports = admin;