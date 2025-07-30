// master-api/config/firebase-admin.js
const admin = require('firebase-admin');

let isInitialized = false;

const initializeFirebaseAdmin = () => {
  if (isInitialized) {
    return admin;
  }

  try {
    // Pobierz dane z zmiennych środowiskowych
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️ Firebase Admin credentials not found in environment variables');
      console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return null;
    }

    // Inicjalizuj Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n') // Zamień \n na prawdziwe nowe linie
      })
    });

    isInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
    console.log('📱 Using project:', projectId);
    return admin;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    return null;
  }
};

// Eksportuj funkcję inicjalizacji i instancję admin
module.exports = {
  initializeFirebaseAdmin,
  admin: initializeFirebaseAdmin()
};