// master-api/server.js - 🔧 POPRAWIONE ROUTING + STATS ENDPOINT

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const config = require('./config/config');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', async (req, res) => {
  const dbState = require('mongoose').connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({ 
    status: 'OK',
    database: states[dbState],
    environment: config.server.env,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DrinkMaster API', 
    version: '1.0.0',
    endpoints: [
      '/api/scanner',
      '/api/recipe-generator', 
      '/api/mybar',
      '/api/history',
      '/api/favorites',
      '/api/user',
      '/api/user/stats/increment/:firebaseUid', // 🆕 DODANE
      '/health'
    ]
  });
});

// API Routes - 🔧 POPRAWIONE KOLEJNOŚĆ
app.use('/api/scanner', require('./api/scanner'));
app.use('/api/recipe-generator', require('./api/recipe-generator'));
app.use('/api/mybar', require('./api/mybar'));
app.use('/api/history', require('./api/history'));
app.use('/api/favorites', require('./api/favorites'));
app.use('/api/user', require('./api/user')); // ✅ Ten endpoint zawiera stats/increment

// 🆕 DODATKOWY ENDPOINT STATS - dla kompatybilności jeśli app szuka bez /user
app.post('/api/stats/increment/:firebaseUid', async (req, res) => {
  console.log('📊 Legacy stats endpoint called - redirecting to /api/user/stats/increment');
  
  try {
    const { firebaseUid } = req.params;
    const { type } = req.body;
    
    console.log(`📊 Incrementing ${type} stats for user:`, firebaseUid);
    
    const User = require('./models/User');
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Zwiększ odpowiednie statystyki - OBSŁUGA WSZYSTKICH WARIANTÓW
    switch(type) {
      case 'scan':
      case 'scans':
        user.stats.totalScans = (user.stats.totalScans || 0) + 1;
        user.stats.dailyScans = (user.stats.dailyScans || 0) + 1;
        break;
      case 'recipe':
      case 'recipes':
        user.stats.totalRecipes = (user.stats.totalRecipes || 0) + 1;
        user.stats.dailyRecipes = (user.stats.dailyRecipes || 0) + 1;
        break;
      case 'homeBar':  // Frontend wysyła z dużą literą
      case 'mybar':    // Alternatywna nazwa
      case 'myBar':    // CamelCase wariant
      case 'homebar':  // Wszystko małymi
        user.stats.totalHomeBarAnalyses = (user.stats.totalHomeBarAnalyses || 0) + 1;
        user.stats.dailyHomeBar = (user.stats.dailyHomeBar || 0) + 1;
        break;
      default:
        console.warn(`⚠️ Unknown usage type: ${type}`);
        return res.status(400).json({ 
          success: false, 
          error: `Unknown usage type: ${type}` 
        });
    }
    
    await user.save();
    
    console.log('✅ Stats updated successfully via legacy endpoint');
    console.log('Current stats:', user.stats);
    
    res.json({ 
      success: true, 
      stats: user.stats
    });
  } catch (error) {
    console.error('❌ Legacy stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      '/api/scanner',
      '/api/recipe-generator', 
      '/api/mybar',
      '/api/history',
      '/api/favorites',
      '/api/user',
      '/api/user/stats/increment/:firebaseUid',
      '/api/stats/increment/:firebaseUid', // Legacy
      '/health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  const status = err.status || 500;
  res.status(status).json({ 
    success: false,
    error: config.server.env === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${config.server.env}`);
  console.log('📋 Available endpoints:');
  console.log('   - /api/scanner');
  console.log('   - /api/recipe-generator');
  console.log('   - /api/mybar');
  console.log('   - /api/history');
  console.log('   - /api/favorites');
  console.log('   - /api/user');
  console.log('   - /api/user/stats/increment/:firebaseUid'); // ✅ GŁÓWNY
  console.log('   - /api/stats/increment/:firebaseUid');      // 🆕 LEGACY
  console.log('   - /health');
  if (config.server.env === 'development') {
    console.log(`🔗 http://localhost:${PORT}`);
  }
});