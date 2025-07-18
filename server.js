const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import route handlers
const scanner = require('./api/scanner');
const recipeGenerator = require('./api/recipe-generator');
const mybar = require('./api/mybar');

// Routes
app.post('/api/scanner', scanner);
app.post('/api/recipe-generator', recipeGenerator);
app.post('/api/mybar', mybar);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'DrinkMaster API is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍹 API running on http://localhost:${PORT}`);
});
