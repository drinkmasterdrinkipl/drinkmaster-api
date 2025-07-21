// master-api/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Import endpoints
const recipeGenerator = require('./api/recipe-generator');
const myBar = require('./api/mybar');
const scanner = require('./api/scanner');

// Routes
app.post('/api/recipe-generator', recipeGenerator);
app.post('/api/home-bar', myBar);
app.post('/api/scanner', scanner);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});