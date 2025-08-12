// master-api/server.js - POPRAWIONA OBSŁUGA REVENUECAT
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const config = require('./config/config');

// Initialize Firebase Admin if auth middleware will be used
try {
  require('./config/firebase-admin');
} catch (error) {
  console.warn('⚠️ Firebase Admin not initialized - auth features will be limited');
}

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Set mongoose options for better timeout handling
mongoose.set('bufferTimeoutMS', 20000); // 20 seconds

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// Global timeout middleware
app.use((req, res, next) => {
  // Set longer timeout
  req.setTimeout(30000); // 30 seconds
  
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⏱️ Request timeout:', req.method, req.url);
      res.status(408).json({ 
        success: false, 
        error: 'Request timeout - please try again' 
      });
    }
  }, 30000);
  
  // Clear timeout when response finishes
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  res.on('close', () => {
    clearTimeout(timeout);
  });
  
  next();
});

// Rate limiting with different limits for different endpoints
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/status';
  }
});

// Stricter limit for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 AI requests per windowMs
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', defaultLimiter);
app.use('/api/scanner', aiLimiter);
app.use('/api/recipe-generator', aiLimiter);
app.use('/api/mybar', aiLimiter);

// Connect to MongoDB with retry logic
let retryCount = 0;
const maxRetries = 10;

const connectWithRetry = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    retryCount = 0; // Reset on success
  } catch (err) {
    retryCount++;
    console.error(`❌ MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, err.message);
    
    if (retryCount < maxRetries) {
      const delay = Math.min(retryCount * 2000, 10000); // Exponential backoff, max 10s
      console.log(`🔄 Retrying in ${delay/1000} seconds...`);
      setTimeout(connectWithRetry, delay);
    } else {
      console.error('❌ Max retries reached. MongoDB connection failed.');
      // Don't exit - let the app run and handle requests without DB
    }
  }
};

// Start MongoDB connection
connectWithRetry();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📗 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('📕 MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📙 MongoDB disconnected');
  // Attempt to reconnect
  if (retryCount < maxRetries) {
    setTimeout(connectWithRetry, 5000);
  }
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (config.server.env === 'development') {
      return callback(null, true);
    }
    
    // In production, check against whitelist
    const allowedOrigins = [
      'https://drinkmaster.app',
      'https://www.drinkmaster.app',
      'http://localhost:3000',
      'http://localhost:8081', // Expo
      'exp://192.168.1.', // Expo local network
    ];
    
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed) || origin.includes('exp://')
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks
  if (req.path === '/health' || req.path === '/api/status') {
    return next();
  }
  
  // Log request
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  
  // Log request body for debugging (be careful with sensitive data)
  if (config.server.env === 'development' && req.body && Object.keys(req.body).length > 0) {
    // Don't log sensitive keys
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
    if (sanitizedBody.receipt) sanitizedBody.receipt = '[HIDDEN]';
    console.log('📋 Request body:', JSON.stringify(sanitizedBody).substring(0, 200) + '...');
  }
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`📤 ${emoji} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check with detailed status
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  // Check if we can actually query the database
  let dbOperational = false;
  if (dbState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      dbOperational = true;
    } catch (error) {
      console.error('❌ DB ping failed:', error.message);
    }
  }
  
  const health = {
    status: dbOperational ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: process.env.npm_package_version || '1.0.0',
    database: {
      status: states[dbState],
      ready: dbState === 1,
      operational: dbOperational
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
      unit: 'MB'
    },
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage()
    }
  };
  
  res.status(dbOperational ? 200 : 503).json(health);
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      scanner: 'operational',
      recipeGenerator: 'operational',
      myBar: 'operational',
      user: 'operational',
      subscription: 'operational',
      favorites: 'operational',
      history: 'operational',
      revenueCat: 'operational'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DrinkMaster API', 
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    documentation: 'https://drinkmaster.app/api/docs',
    endpoints: {
      health: '/health',
      status: '/api/status',
      scanner: '/api/scanner',
      recipeGenerator: '/api/recipe-generator',
      myBar: '/api/mybar',
      user: {
        sync: '/api/user/sync',
        profile: '/api/user/profile/:firebaseUid',
        stats: '/api/user/stats/:firebaseUid',
        statsIncrement: '/api/user/stats/increment/:firebaseUid',
        subscription: '/api/user/subscription/:firebaseUid',
        settings: '/api/user/settings/:firebaseUid',
        delete: '/api/user/:firebaseUid'
      },
      subscription: {
        status: '/api/subscription/:firebaseUid',
        upgrade: '/api/subscription/upgrade',
        sync: '/api/subscription/sync',
        cancel: '/api/subscription/cancel',
        checkReset: '/api/subscription/check-reset'
      },
      revenueCat: {
        webhook: '/api/revenuecat/webhook',
        verify: '/api/revenuecat/verify',
        offerings: '/api/revenuecat/offerings'
      },
      favorites: {
        list: '/api/favorites/:firebaseUid',
        add: '/api/favorites/:firebaseUid',
        remove: '/api/favorites/:firebaseUid/:recipeId'
      },
      history: {
        scans: '/api/history/scans/:firebaseUid',
        recipes: '/api/history/recipes/:firebaseUid',
        myBar: '/api/history/mybar/:firebaseUid'
      }
    }
  });
});

// RevenueCat webhook endpoint - handles subscription events
app.post('/api/revenuecat/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    
    console.log('🪝 RevenueCat webhook received:', event.type);
    console.log('📦 Event data:', {
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      environment: event.environment
    });
    
    // Verify webhook authenticity (optional but recommended)
    const webhookAuth = req.headers['authorization'];
    const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
    
    if (expectedAuth && webhookAuth !== `Bearer ${expectedAuth}`) {
      console.warn('⚠️ Invalid webhook authorization');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Update user subscription in database
        const { app_user_id, product_id, purchased_at_ms, expiration_at_ms } = event;
        console.log(`💳 Subscription event for user ${app_user_id}: ${product_id}`);
        
        // Import User model and update
        const User = require('./models/User');
        const user = await User.findOne({ firebaseUid: app_user_id });
        
        if (user) {
          // Determine subscription type from product_id
          let subscriptionType = 'free';
          if (product_id.includes('annual') || product_id.includes('yearly')) {
            subscriptionType = 'yearly';
          } else if (product_id.includes('monthly')) {
            subscriptionType = 'monthly';
          } else if (product_id.includes('lifetime')) {
            subscriptionType = 'lifetime';
          }
          
          user.subscription.type = subscriptionType;
          user.subscription.startDate = new Date(parseInt(purchased_at_ms));
          
          if (expiration_at_ms) {
            user.subscription.endDate = new Date(parseInt(expiration_at_ms));
          }
          
          user.subscription.revenueCatCustomerId = app_user_id;
          user.subscription.productId = product_id;
          user.subscription.isActive = true;
          
          await user.save();
          console.log(`✅ User subscription updated: ${user.email} -> ${subscriptionType}`);
        } else {
          console.warn(`⚠️ User not found for Firebase UID: ${app_user_id}`);
        }
        break;
        
      case 'CANCELLATION':
        // User cancelled but subscription still active until end date
        console.log(`⚠️ Subscription cancelled for user ${event.app_user_id} (active until expiration)`);
        break;
        
      case 'EXPIRATION':
        // Subscription expired - downgrade to free
        console.log(`❌ Subscription expired for user ${event.app_user_id}`);
        
        const UserExp = require('./models/User');
        const expiredUser = await UserExp.findOne({ firebaseUid: event.app_user_id });
        
        if (expiredUser) {
          expiredUser.subscription.type = 'free';
          expiredUser.subscription.isActive = false;
          await expiredUser.save();
          console.log(`✅ User downgraded to free: ${expiredUser.email}`);
        }
        break;
        
      case 'BILLING_ISSUE':
        console.warn(`💳 Billing issue for user ${event.app_user_id}`);
        break;
        
      default:
        console.log('📝 Unhandled webhook event type:', event.type);
    }
    
    // Always return 200 to acknowledge receipt
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('❌ RevenueCat webhook error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ 
      success: false, 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
});

// Verify purchase with RevenueCat REST API
app.post('/api/revenuecat/verify', async (req, res) => {
  try {
    const { userId, receipt, productId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    // Get the SECRET key for server-side API calls
    const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY;
    
    if (!REVENUECAT_SECRET_KEY) {
      console.error('❌ REVENUECAT_SECRET_KEY not configured in environment');
      return res.status(500).json({ 
        success: false, 
        error: 'RevenueCat not configured on server' 
      });
    }
    
    // Verify the key is a SECRET key (for server-side use)
    if (!REVENUECAT_SECRET_KEY.startsWith('sk_')) {
      console.error('❌ Invalid RevenueCat key type - must be SECRET key (sk_) for server');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }
    
    console.log('🔐 Using RevenueCat SECRET key for server-side verification');
    
    // Get subscriber info from RevenueCat
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'ios'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ RevenueCat verification failed:', data);
      return res.status(400).json({ 
        success: false, 
        error: 'Purchase verification failed',
        details: data
      });
    }
    
    console.log('✅ Purchase verified for user:', userId);
    
    // Check active subscriptions
    const subscriber = data.subscriber;
    const hasActiveSubscription = Object.keys(subscriber.entitlements || {}).some(
      key => subscriber.entitlements[key].expires_date === null || 
             new Date(subscriber.entitlements[key].expires_date) > new Date()
    );
    
    res.json({ 
      success: true,
      hasActiveSubscription,
      subscriber: {
        originalAppUserId: subscriber.original_app_user_id,
        entitlements: subscriber.entitlements,
        subscriptions: subscriber.subscriptions
      }
    });
  } catch (error) {
    console.error('❌ Verify purchase error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify purchase',
      message: error.message
    });
  }
});

// Get RevenueCat offerings
app.get('/api/revenuecat/offerings', async (req, res) => {
  try {
    const { platform = 'ios', userId } = req.query;
    
    const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY;
    
    if (!REVENUECAT_SECRET_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'RevenueCat not configured' 
      });
    }
    
    // Note: Offerings should be fetched from the client SDK
    // This endpoint is for reference only
    res.json({
      success: true,
      message: 'Offerings should be fetched from the client SDK',
      info: {
        ios: {
          monthly: 'com.drinkmaster.monthly',
          yearly: 'com.drinkmaster.yearly',
          lifetime: 'com.drinkmaster.lifetime'
        },
        android: {
          monthly: 'monthly_subscription',
          yearly: 'yearly_subscription',
          lifetime: 'lifetime_purchase'
        }
      }
    });
  } catch (error) {
    console.error('❌ Get offerings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get offerings' 
    });
  }
});

// API Routes - Order matters!
app.use('/api/scanner', require('./api/scanner'));
app.use('/api/recipe-generator', require('./api/recipe-generator'));
app.use('/api/mybar', require('./api/mybar'));
app.use('/api/history', require('./api/history'));
app.use('/api/favorites', require('./api/favorites'));
app.use('/api/subscription', require('./api/subscription'));
app.use('/api/user', require('./api/user'));

// Legacy endpoints for backward compatibility
app.post('/api/stats/increment/:firebaseUid', async (req, res) => {
  console.log('📊 Legacy stats endpoint called - redirecting to /api/user/stats/increment');
  
  try {
    const { firebaseUid } = req.params;
    const { type } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    if (!type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Usage type is required' 
      });
    }
    
    console.log(`📊 Incrementing ${type} stats for user:`, firebaseUid);
    
    // Import User model
    const User = require('./models/User');
    
    // Ensure user exists
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      console.log('👤 User not found, creating new user for stats');
      user = await User.create({
        firebaseUid,
        email: `${firebaseUid}@temp.com`,
        subscription: {
          type: 'free',
          startDate: new Date()
        },
        stats: {
          totalScans: 0,
          totalRecipes: 0,
          totalHomeBarAnalyses: 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        }
      });
    }
    
    // Normalize type
    const typeMap = {
      'scan': 'scans',
      'scans': 'scans',
      'recipe': 'recipes',
      'recipes': 'recipes',
      'homeBar': 'homeBar',
      'homebar': 'homeBar',
      'mybar': 'homeBar',
      'myBar': 'homeBar',
      'bar': 'homeBar'
    };
    
    const normalizedType = typeMap[type];
    if (!normalizedType) {
      return res.status(400).json({ 
        success: false, 
        error: `Unknown usage type: ${type}`,
        validTypes: Object.keys(typeMap)
      });
    }
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      user.resetDailyStats();
    }
    
    // Update stats
    switch(normalizedType) {
      case 'scans':
        user.stats.totalScans = (user.stats.totalScans || 0) + 1;
        user.stats.dailyScans = (user.stats.dailyScans || 0) + 1;
        break;
      case 'recipes':
        user.stats.totalRecipes = (user.stats.totalRecipes || 0) + 1;
        user.stats.dailyRecipes = (user.stats.dailyRecipes || 0) + 1;
        break;
      case 'homeBar':
        user.stats.totalHomeBarAnalyses = (user.stats.totalHomeBarAnalyses || 0) + 1;
        user.stats.dailyHomeBar = (user.stats.dailyHomeBar || 0) + 1;
        break;
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log('✅ Stats updated successfully via legacy endpoint');
    
    res.json({ 
      success: true, 
      stats: user.stats,
      message: 'Stats updated successfully'
    });
  } catch (error) {
    console.error('❌ Legacy stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update stats'
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    suggestion: 'Please check the API documentation for available endpoints',
    availableEndpoints: [
      '/health',
      '/api/status',
      '/api/scanner',
      '/api/recipe-generator',
      '/api/mybar',
      '/api/user/*',
      '/api/subscription/*',
      '/api/revenuecat/*',
      '/api/favorites/*',
      '/api/history/*'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Don't log expected errors
  const expectedErrors = ['JsonWebTokenError', 'TokenExpiredError', 'ValidationError'];
  if (!expectedErrors.includes(err.name)) {
    console.error('❌ Server error:', err);
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      message: `A resource with this ${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }
  
  // Default error
  const status = err.status || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(status).json({ 
    success: false,
    error: config.server.env === 'production' ? 'Internal server error' : message,
    ...(config.server.env !== 'production' && { 
      stack: err.stack,
      details: err
    })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err);
  }
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  
  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

// Start server
const PORT = config.server.port || process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 DrinkMaster API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🔧 Environment: ${config.server.env}
🌐 URL: ${config.server.env === 'production' ? config.server.url : `http://localhost:${PORT}`}
📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}
🔐 Auth: ${process.env.FIREBASE_PROJECT_ID ? 'Firebase Admin Ready' : 'No Auth Configured'}
💳 RevenueCat: ${process.env.REVENUECAT_SECRET_KEY ? 'Configured (Server API)' : 'Not Configured'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Available Endpoints:
   • Health Check: /health
   • API Status: /api/status
   • Scanner: /api/scanner
   • Recipe Generator: /api/recipe-generator
   • My Bar: /api/mybar
   • User Management: /api/user/*
   • Subscription: /api/subscription/*
   • RevenueCat: /api/revenuecat/*
   • History: /api/history/*
   • Favorites: /api/favorites/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 RevenueCat Configuration:
   • Mobile App: Use PUBLIC keys (appl_/goog_)
   • Server API: Use SECRET key (sk_)
   • Webhook: /api/revenuecat/webhook
   • Verify: /api/revenuecat/verify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Security Notes:
   • PUBLIC keys (appl_) for mobile apps
   • SECRET keys (sk_) for server only
   • Never expose SECRET keys in client code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Rate Limits:
   • General API: 100 req/15min
   • AI Endpoints: 50 req/15min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  
  // Additional security check on startup
  if (process.env.REVENUECAT_SECRET_KEY && !process.env.REVENUECAT_SECRET_KEY.startsWith('sk_')) {
    console.error('⚠️ WARNING: REVENUECAT_SECRET_KEY should start with "sk_" for server use');
  }
  
  if (process.env.REVENUECAT_PUBLIC_KEY && process.env.REVENUECAT_PUBLIC_KEY.startsWith('sk_')) {
    console.error('❌ CRITICAL: SECRET KEY found in PUBLIC_KEY variable! This is a security risk!');
  }
});

// Server timeout
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 65000; // 65 seconds (higher than ALB timeout)
server.headersTimeout = 66000; // 66 seconds

module.exports = app;