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
      '/api/user',
      '/health'
    ]
  });
});

// API Routes
app.use('/api/scanner', require('./api/scanner'));
app.use('/api/recipe-generator', require('./api/recipe-generator'));
app.use('/api/mybar', require('./api/mybar'));
app.use('/api/history', require('./api/history')); // 🆕 DODANE!
app.use('/api/user', require('./api/user'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ 
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
  console.log('   - /api/user');
  console.log('   - /health');
  if (config.server.env === 'development') {
    console.log(`🔗 http://localhost:${PORT}`);
  }
});