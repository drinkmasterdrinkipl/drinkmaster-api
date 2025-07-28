// master-api/server.js - KOMPLETNA NAPRAWA Z TIMEOUT I ROUTING
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const config = require('./config/config');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Set mongoose options for better timeout handling
mongoose.set('bufferTimeoutMS', 20000); // 20 seconds
// mongoose.set('connectTimeoutMS', 30000); // REMOVED - not valid in newer versions

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// Global timeout middleware - Fixed to not interfere with normal requests
app.use((req, res, next) => {
  // Set longer timeout
  const timeout = setTimeout(() => {
    console.error('⏱️ Request timeout:', req.method, req.url);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        error: 'Request timeout - please try again' 
      });
    }
  }, 30000); // 30 seconds
  
  // Clear timeout when response finishes
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  // Continue to next middleware
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// Middleware
app.use(cors({
  ...config.cors,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`📥 ${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check with detailed status
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  const health = {
    status: dbState === 1 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    database: {
      status: states[dbState],
      ready: dbState === 1
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };
  
  res.status(dbState === 1 ? 200 : 503).json(health);
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DrinkMaster API', 
    version: '1.0.0',
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
        statsIncrement: '/api/user/stats/increment/:firebaseUid'
      },
      history: '/api/history',
      favorites: '/api/favorites'
    }
  });
});

// API Routes - Order matters!
app.use('/api/scanner', require('./api/scanner'));
app.use('/api/recipe-generator', require('./api/recipe-generator'));
app.use('/api/mybar', require('./api/mybar'));
app.use('/api/history', require('./api/history'));
app.use('/api/favorites', require('./api/favorites'));
app.use('/api/user', require('./api/user')); // This includes /api/user/stats/increment/:uid

// Legacy stats endpoint for backward compatibility
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
      'myBar': 'homeBar'
    };
    
    const normalizedType = typeMap[type];
    if (!normalizedType) {
      return res.status(400).json({ 
        success: false, 
        error: `Unknown usage type: ${type}` 
      });
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
    suggestion: 'Please check the API documentation for available endpoints'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
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
    return res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      details: 'This resource already exists'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  // Default error
  const status = err.status || 500;
  res.status(status).json({ 
    success: false,
    error: config.server.env === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(config.server.env !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);
  
  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err);
  }
  
  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.server.port || 3000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 DrinkMaster API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🔧 Environment: ${config.server.env}
🌐 URL: ${config.server.env === 'production' ? config.server.url : `http://localhost:${PORT}`}
📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Available Endpoints:
   • Health Check: /health
   • API Status: /api/status
   • Scanner: /api/scanner
   • Recipe Generator: /api/recipe-generator
   • My Bar: /api/mybar
   • User Management: /api/user/*
   • Stats Increment: /api/user/stats/increment/:uid
   • History: /api/history
   • Favorites: /api/favorites
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// Server timeout
server.timeout = 30000; // 30 seconds

module.exports = app;