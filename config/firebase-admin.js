// master-api/config/firebase-admin.js
const admin = require('firebase-admin');

let isInitialized = false;

const initializeFirebaseAdmin = () => {
  if (isInitialized) {
    return admin;
  }

  try {
    // Dla testów - użyj hardcoded credentials (TYLKO DLA DEVELOPMENT!)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Using hardcoded Firebase credentials - ONLY FOR TESTING!');
      
      const serviceAccount = {
        projectId: "masterdrink-d5f9f",
        clientEmail: "firebase-adminsdk-fbsvc@masterdrink-d5f9f.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEXTL6AxUG4wFw\ngZSTd7zFTseQEn9FItTmSNFoHuay5mzkgNDgN6vcLFQbombQAbVXtIwvuljvLICQ\nYCxlEwlnLlSGByrSZ4UDLi3M65Xg5Y1NW/+fHAvC0JtkBnsQ/kTRbHg3H0ThWLpJ\nftO5oKNLKNSwZPz8N37pYiocBpBUSFcHE0GNGovACTN6ARKzdAZGnpTDjkSjrNA7\nFnCvvD1XohVTn15YHuwP0UKIlo6LbKwKZw+fmwDDNPmapZ6FmCC5cRAFVVDU8DF5\n21saQ0q9O6ky/mC3Pgu6j2SjZLKtYRQghhKxd1ZanIexgxXlsGI/u2pPFOmaajcB\nirSK5z4LAgMBAAECggEAJxr2aXLOr7Hqmfi8WYfpeJPBS3Bbly2iH4BV77njsLIR\n8omyz0xW9gB/+Ybkmb0VW7ORjXm7d1ox+k6k2LYrU7iWzaBEx2UlSKZcKairDwA4\nHTVamVmw/+miYI+n15EDrH9BC503DveoFbXjvV5/1pp5jO13slTs+dZ6U119RcNO\n0WGnE4/z9rGw0hmC20XfHIBUX1ik+BuzK8W7oKbvv+fNYQHOXutgbqBjphkZjkZE\ncmM7NcxVB2gbDidsdScv7weB7mxBjtKboswi7GUdfIDtYicvvwyq4pfHWNV8Da1x\nqqwE94seg3SGkTb+IX+Ir2n3XCvj1d3NBSo22xN/rQKBgQDvB+LaL9yaRdF36LOZ\nZxMQs3EPaLiC5VnPR172pbWqt2TUDCEd2VwENXLLMO+7KAGDFIe44Kz3BMnB2LeW\nZcQbUa+TOwsVMNamHygB3gOs7Q/4t9/lmO7TxmoDwuiF8ce6HA9LJ5nLvHL5Wk9P\n5bgm4G1H6OHDfSB7ZaKIISPD/QKBgQDSTeSsMAoe+HlQVrKO/I16FXgPE0fUQ7XE\ngBcrJETNUOCon19uEzgsq7gb/NTHnLxmO8F5RFZ1tS19y9NnGMOcnq2HxpbFACNX\nuICIWViUD/gG16tQ1aEU1qR2bl7fay3gYAz8QGWvcVocjTW6ZeTKTg+eBH6bK1lZ\nKfsP2780pwKBgFswXQD0BWrte84M/odlZUaXzmgcgVeee7ax+a6K5VVthY/H2NJ0\nW8BXS6Xs02hJCNqi+Gw1eob6UqYbMV61EC2D6kF24vGAokLZ2/9qXWiZP+CY9Ve4\nElTEeylYMDD5XkLH9aWsQ+YPzKUIKP3IG4rpT4eBdq+Hit7IlUrtqaFZAoGAYnnW\n+koEczwmklgGhK3+EYy8C1Mb72lFVB4muyzgisO0b0ExjnmxdDl0nKZnfJEIJ1cT\n4ZT+Z1/PTXiEJWKTNmOXHlz/fH/0DL94cGBl+e8AVTPoJJHkO73GhS5pfnTRpp9T\ndUsyUlThvTziS8YqvBCRf4zbPA2waPAff+2GO0ECgYA71e0pUfGfDmJkT8Z4KmkJ\n3cXoui98/NF27eqpj6kUt3b6dPadws45rbs5PcN7VzHLRtT+KuEQ7t3Kbnmmpii9\nJsSJwF3STJBrPjEPyxWzfMiw5yTeGyVq/1lgYchcJG2O3wic4Z6qm78oRZoSXabv\nQaDuVePFfOAsl0L0PeGZlw==\n-----END PRIVATE KEY-----\n"
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      isInitialized = true;
      console.log('✅ Firebase Admin initialized with test credentials');
      return admin;
    }

    // Dla produkcji - użyj zmiennych środowiskowych
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