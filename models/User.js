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
  
  // NOWE: Providers dla social login
  providers: [{
    type: String,
    enum: ['password', 'google.com', 'apple.com'],
    default: ['password']
  }],
  
  // Subscription data - BEZ TRIAL!
  subscription: {
    type: {
      type: String,
      enum: ['free', 'monthly', 'yearly'], // USUNIĘTE 'trial'
      default: 'free'
    },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    revenueCatCustomerId: String
  },
  
  // Usage stats - UJEDNOLICONE
  stats: {
    // Total stats (dla FREE - max 2 każdej funkcji)
    totalScans: { type: Number, default: 0 },
    totalRecipes: { type: Number, default: 0 },
    totalHomeBarAnalyses: { type: Number, default: 0 },
    
    // Daily stats (dla PREMIUM - max 50 dziennie)
    dailyScans: { type: Number, default: 0 },
    dailyRecipes: { type: Number, default: 0 },
    dailyHomeBar: { type: Number, default: 0 },
    
    // Last reset date
    lastResetDate: { type: Date, default: Date.now }
  },
  
  // History arrays
  scanHistory: [{
    timestamp: { type: Date, default: Date.now },
    bottleInfo: mongoose.Schema.Types.Mixed,
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
  favorites: [{
    recipe: {
      id: String,
      name: String,
      nameEn: String,
      category: String,
      difficulty: String,
      prepTime: Number,
      history: String,
      ingredients: [{
        name: String,
        amount: String,
        unit: String,
        optional: Boolean
      }],
      instructions: [String],
      glassType: String,
      garnish: String,
      tips: [String],
      alcoholContent: String,
      tags: [String],
      method: String,
      ice: String,
      servingTemp: String,
      abv: Number,
      flavor: String,
      occasion: String,
      proTip: String,
      funFact: String
    },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Settings
  settings: {
    language: { type: String, default: 'pl' },
    notifications: { type: Boolean, default: true },
    theme: { type: String, default: 'dark' }
  },
  
  // Other
  lastActive: { type: Date, default: Date.now },
  isNewUser: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Method to reset daily stats
userSchema.methods.resetDailyStats = function() {
  const now = new Date();
  const lastReset = this.stats.lastResetDate;
  
  // Check if it's a new day
  if (!lastReset || 
      now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    
    // Reset daily stats
    this.stats.dailyScans = 0;
    this.stats.dailyRecipes = 0;
    this.stats.dailyHomeBar = 0;
    this.stats.lastResetDate = now;
    
    console.log('📅 Daily stats reset for user:', this.email);
    return true;
  }
  
  return false;
};

// Method to check if user can use feature
userSchema.methods.canUseFeature = function(feature) {
  const statMap = {
    'scanner': { total: 'totalScans', daily: 'dailyScans' },
    'recipe': { total: 'totalRecipes', daily: 'dailyRecipes' },
    'mybar': { total: 'totalHomeBarAnalyses', daily: 'dailyHomeBar' }
  };
  
  const stat = statMap[feature];
  if (!stat) return false;
  
  // Check daily reset first
  this.resetDailyStats();
  
  if (this.subscription.type === 'free') {
    // FREE users: max 2 lifetime uses per feature
    return this.stats[stat.total] < 2;
  } else {
    // PREMIUM users: max 50 daily uses per feature
    return this.stats[stat.daily] < 50;
  }
};

// Method to increment usage
userSchema.methods.incrementUsage = function(feature) {
  const statMap = {
    'scanner': { total: 'totalScans', daily: 'dailyScans' },
    'recipe': { total: 'totalRecipes', daily: 'dailyRecipes' },
    'mybar': { total: 'totalHomeBarAnalyses', daily: 'dailyHomeBar' }
  };
  
  const stat = statMap[feature];
  if (!stat) return;
  
  // Always increment total
  this.stats[stat.total]++;
  
  // Increment daily for all users (important for premium)
  this.stats[stat.daily]++;
  
  this.lastActive = new Date();
};

// Indexes for performance
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'scanHistory.timestamp': -1 });
userSchema.index({ 'recipeHistory.timestamp': -1 });
userSchema.index({ 'myBarHistory.timestamp': -1 });
userSchema.index({ 'favorites.addedAt': -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;