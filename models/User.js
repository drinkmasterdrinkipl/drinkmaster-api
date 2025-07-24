// master-api/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    default: ''
  },
  photoURL: {
    type: String,
    default: ''
  },
  
  // User preferences
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    favoriteSpirits: [{
      type: String
    }],
    theme: {
      type: String,
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Usage statistics
  stats: {
    totalScans: {
      type: Number,
      default: 0
    },
    totalRecipes: {
      type: Number,
      default: 0
    },
    totalMyBarQueries: {
      type: Number,
      default: 0
    },
    favoriteRecipes: {
      type: Number,
      default: 0
    }
  },
  
  // Daily usage tracking
  dailyUsage: {
    date: {
      type: Date,
      default: Date.now
    },
    scans: {
      type: Number,
      default: 0
    },
    recipes: {
      type: Number,
      default: 0
    },
    homeBar: {
      type: Number,
      default: 0
    }
  },
  
  // Subscription info
  subscription: {
    type: {
      type: String,
      enum: ['free', 'trial', 'monthly', 'yearly'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // 🆕 SCAN HISTORY
  scanHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    bottleInfo: {
      name: String,
      brand: String,
      type: String,
      country: String,
      alcoholContent: Number,
      description: String,
      servingSuggestions: [String],
      cocktailSuggestions: [String]
    },
    imageData: String, // base64 image
    aiResponse: mongoose.Schema.Types.Mixed, // full AI response
    confidence: Number
  }],
  
  // 🆕 RECIPE HISTORY  
  recipeHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    name: String,
    nameEn: String,
    category: String,
    difficulty: String,
    ingredients: [{
      name: String,
      amount: String,
      unit: String,
      optional: Boolean
    }],
    instructions: [String],
    method: String,
    glassType: String,
    garnish: String,
    abv: Number,
    history: String,
    proTip: String
  }],
  
  // 🆕 MYBAR HISTORY
  myBarHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ingredients: [String],
    ingredientsCount: Number,
    foundCocktails: Number,
    almostPossible: Number,
    shoppingSuggestions: Number,
    cocktailsFound: [String], // names of cocktails found
    language: String
  }],
  
  // 🆕 FAVORITES (移动到这里，不再使用 AsyncStorage)
  favorites: [{
    recipeId: String,
    name: String,
    nameEn: String,
    category: String,
    ingredients: [{
      name: String,
      amount: String,
      unit: String
    }],
    instructions: [String],
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update lastActive on any update
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ 
    lastActive: Date.now(),
    updatedAt: Date.now() 
  });
  next();
});

// Index for better performance
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ lastActive: -1 });

module.exports = mongoose.model('User', userSchema);