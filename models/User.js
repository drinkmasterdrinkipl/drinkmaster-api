// master-api/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  photoURL: String,
  
  // Subscription data
  subscriptionType: {
    type: String,
    enum: ['free', 'monthly', 'annual'],
    default: 'free'
  },
  trialStartDate: Date,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  
  // Usage stats
  stats: {
    totalScans: { type: Number, default: 0 },
    totalRecipes: { type: Number, default: 0 },
    totalMyBar: { type: Number, default: 0 }
  },
  
  // History arrays
  scanHistory: [{
    timestamp: { type: Date, default: Date.now },
    bottleInfo: mongoose.Schema.Types.Mixed, // Poprawione - bez { type: ... }
    imageData: String,
    aiResponse: mongoose.Schema.Types.Mixed,
    confidence: Number
  }],
  
  recipeHistory: [{
    timestamp: { type: Date, default: Date.now },
    name: String,
    nameEn: String,
    category: String,
    ingredients: [{
      name: String,
      amount: String,
      unit: String,
      optional: Boolean
    }],
    instructions: [String],
    difficulty: String,
    prepTime: Number,
    glassType: String,
    ice: String,
    garnish: String,
    alcoholContent: String,
    servingTemp: String,
    method: String,
    history: String,
    funFact: String,
    abv: Number,
    flavor: String,
    occasion: String,
    tags: [String],
    tips: [String],
    proTip: String
  }],
  
  myBarHistory: [{
    timestamp: { type: Date, default: Date.now },
    ingredients: [{
      name: String,
      category: String,
      inStock: Boolean
    }],
    ingredientsCount: Number,
    analysis: mongoose.Schema.Types.Mixed
  }],
  
  // Favorites
  favoriteRecipes: [{
    recipeId: String,
    name: String,
    nameEn: String,
    category: String,
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Other
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'scanHistory.timestamp': -1 });
userSchema.index({ 'recipeHistory.timestamp': -1 });
userSchema.index({ 'myBarHistory.timestamp': -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;