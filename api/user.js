// master-api/api/user.js - NAPRAWIONY SYNC
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Debouncing map to prevent duplicate increments
const recentIncrements = new Map();
const DEBOUNCE_TIME = 5000; // 5 seconds

// Cleanup old increment records every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentIncrements.entries()) {
    if (now - timestamp > 30000) { // 30 seconds
      recentIncrements.delete(key);
    }
  }
}, 30000);

// Helper function to normalize usage types
const normalizeUsageType = (type) => {
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
  
  return typeMap[type] || null;
};

// Helper function to ensure user exists
const ensureUserExists = async (firebaseUid, email = null) => {
  try {
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      console.log('👤 User not found, creating new user for:', firebaseUid);
      
      const defaultEmail = email || `${firebaseUid}@temp.com`;
      
      user = await User.create({
        firebaseUid,
        email: defaultEmail,
        displayName: 'User',
        subscription: {
          type: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        stats: {
          totalScans: 0,
          totalRecipes: 0,
          totalHomeBarAnalyses: 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        },
        scanHistory: [],
        recipeHistory: [],
        myBarHistory: [],
        favorites: [],
        settings: {
          language: 'pl',
          notifications: true,
          theme: 'dark'
        },
        createdAt: new Date(),
        lastActive: new Date()
      });
      
      console.log('✅ New user auto-created:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error ensuring user exists:', error);
    throw error;
  }
};

// Sync user from Firebase - FIXED VERSION
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, photoURL, emailVerified } = req.body;
    
    console.log('🔄 Syncing user:', email || firebaseUid);
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // First, try to find user by firebaseUid
    let user = await User.findOne({ firebaseUid });
    
    if (!user && email) {
      // If not found by UID, check if user exists with this email
      const existingUserWithEmail = await User.findOne({ email });
      
      if (existingUserWithEmail) {
        // Check if this email belongs to a different Firebase UID
        if (existingUserWithEmail.firebaseUid !== firebaseUid) {
          console.log('⚠️ Email already exists with different Firebase UID');
          console.log('Existing UID:', existingUserWithEmail.firebaseUid);
          console.log('New UID:', firebaseUid);
          
          // Update the existing user with new Firebase UID
          existingUserWithEmail.firebaseUid = firebaseUid;
          user = existingUserWithEmail;
          console.log('✅ Updated existing user with new Firebase UID');
        } else {
          user = existingUserWithEmail;
        }
      }
    }
    
    // If still no user found, create new one
    if (!user) {
      console.log('👤 Creating new user');
      user = new User({
        firebaseUid,
        email: email || `${firebaseUid}@temp.com`,
        displayName: displayName || 'User',
        photoURL,
        emailVerified,
        subscription: {
          type: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        stats: {
          totalScans: 0,
          totalRecipes: 0,
          totalHomeBarAnalyses: 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        },
        scanHistory: [],
        recipeHistory: [],
        myBarHistory: [],
        favorites: [],
        settings: {
          language: 'pl',
          notifications: true,
          theme: 'dark'
        },
        lastActive: new Date()
      });
    } else {
      // Update existing user fields
      if (email && user.email !== email) {
        // Check if another user has this email
        const otherUser = await User.findOne({ 
          email, 
          _id: { $ne: user._id } 
        });
        
        if (!otherUser) {
          user.email = email;
        } else {
          console.log('⚠️ Cannot update email - already used by another account');
        }
      }
      
      if (displayName !== undefined && displayName !== user.displayName) {
        user.displayName = displayName;
      }
      
      if (photoURL !== undefined && photoURL !== user.photoURL) {
        user.photoURL = photoURL;
      }
      
      if (emailVerified !== undefined && emailVerified !== user.emailVerified) {
        user.emailVerified = emailVerified;
      }
    }
    
    user.lastActive = new Date();
    
    // Ensure all arrays exist
    if (!user.scanHistory) user.scanHistory = [];
    if (!user.recipeHistory) user.recipeHistory = [];
    if (!user.myBarHistory) user.myBarHistory = [];
    if (!user.favorites) user.favorites = [];
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      user.resetDailyStats();
    }
    
    await user.save();
    console.log('✅ User synced successfully:', user.email);
    
    res.json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        subscription: user.subscription,
        stats: user.stats,
        hasHistory: {
          scans: user.scanHistory.length > 0,
          recipes: user.recipeHistory.length > 0,
          myBar: user.myBarHistory.length > 0,
          favorites: user.favorites.length > 0
        },
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }
    });
  } catch (error) {
    console.error('❌ User sync error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error - try to handle gracefully
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      console.log(`🔧 Attempting to fix duplicate ${duplicateField}: ${duplicateValue}`);
      
      try {
        // If it's email duplicate, find and update the existing user
        if (duplicateField === 'email') {
          const existingUser = await User.findOne({ email: duplicateValue });
          if (existingUser && existingUser.firebaseUid !== req.body.firebaseUid) {
            // Update Firebase UID
            existingUser.firebaseUid = req.body.firebaseUid;
            existingUser.lastActive = new Date();
            await existingUser.save();
            
            return res.json({ 
              success: true, 
              user: {
                id: existingUser._id.toString(),
                firebaseUid: existingUser.firebaseUid,
                email: existingUser.email,
                displayName: existingUser.displayName,
                subscription: existingUser.subscription,
                stats: existingUser.stats
              }
            });
          }
        }
      } catch (fixError) {
        console.error('❌ Failed to fix duplicate:', fixError);
      }
      
      return res.status(409).json({ 
        success: false, 
        error: `User with this ${duplicateField} already exists` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync user'
    });
  }
});

// Get user profile
router.get('/profile/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    res.json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        subscription: user.subscription,
        stats: user.stats,
        settings: user.settings,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favorites?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get user profile'
    });
  }
});

// Get user stats
router.get('/stats/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      const wasReset = user.resetDailyStats();
      if (wasReset) {
        await user.save();
      }
    }
    
    // Return stats in both formats for compatibility
    const stats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0,
      stats: {
        ...user.stats,
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favorites?.length || 0
        }
      }
    };
    
    console.log('📊 Returning stats for user:', user.email);
    
    res.json({ 
      success: true, 
      ...stats
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get user stats'
    });
  }
});

// Increment usage stats with debouncing
router.post('/stats/increment/:firebaseUid', async (req, res) => {
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
    
    console.log(`📊 Stats increment request - Type: ${type}, User: ${firebaseUid}`);
    
    // Normalize the type
    const normalizedType = normalizeUsageType(type);
    if (!normalizedType) {
      console.warn(`⚠️ Unknown usage type: ${type}`);
      return res.status(400).json({ 
        success: false, 
        error: `Unknown usage type: ${type}`,
        validTypes: ['scans', 'recipes', 'homeBar']
      });
    }
    
    // Check for debouncing
    const incrementKey = `${firebaseUid}-${normalizedType}`;
    const now = Date.now();
    const lastIncrement = recentIncrements.get(incrementKey);
    
    if (lastIncrement && (now - lastIncrement) < DEBOUNCE_TIME) {
      console.log('⏰ Debouncing: Increment too recent, returning current stats...');
      
      // Return current stats without incrementing
      const user = await ensureUserExists(firebaseUid);
      
      const responseStats = {
        totalMyBar: user.stats.totalHomeBarAnalyses || 0,
        totalRecipes: user.stats.totalRecipes || 0,
        totalScans: user.stats.totalScans || 0,
        stats: user.stats,
        debounced: true
      };
      
      return res.json({ 
        success: true, 
        ...responseStats
      });
    }
    
    // Record this increment
    recentIncrements.set(incrementKey, now);
    
    // Get or create user
    const user = await ensureUserExists(firebaseUid);
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      user.resetDailyStats();
    }
    
    // Increment appropriate stats
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
    
    console.log('✅ Stats incremented successfully');
    console.log('Current stats:', {
      totalScans: user.stats.totalScans,
      totalRecipes: user.stats.totalRecipes,
      totalHomeBar: user.stats.totalHomeBarAnalyses
    });
    
    // Return stats in compatible format
    const responseStats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0,
      stats: user.stats
    };
    
    res.json({ 
      success: true, 
      ...responseStats
    });
  } catch (error) {
    console.error('❌ Update stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update stats'
    });
  }
});

// Reset user stats (for debugging/admin)
router.post('/stats/reset/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { resetType = 'all' } = req.body; // 'all', 'daily', or 'total'
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Reset based on type
    if (resetType === 'daily' || resetType === 'all') {
      user.stats.dailyScans = 0;
      user.stats.dailyRecipes = 0;
      user.stats.dailyHomeBar = 0;
      user.stats.lastResetDate = new Date();
    }
    
    if (resetType === 'total' || resetType === 'all') {
      user.stats.totalScans = 0;
      user.stats.totalRecipes = 0;
      user.stats.totalHomeBarAnalyses = 0;
    }
    
    await user.save();
    
    console.log(`🔄 Stats reset (${resetType}) for user:`, user.email);
    
    const responseStats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0,
      stats: user.stats
    };
    
    res.json({ 
      success: true, 
      message: `Stats reset successfully (${resetType})`,
      ...responseStats
    });
  } catch (error) {
    console.error('❌ Reset stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to reset stats'
    });
  }
});

// Update subscription
router.post('/subscription/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { type, endDate, stripeCustomerId, stripeSubscriptionId } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    if (!type || !['trial', 'free', 'monthly', 'yearly'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid subscription type is required (trial, free, monthly, yearly)' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Update subscription
    user.subscription.type = type;
    user.subscription.startDate = new Date();
    
    if (endDate) {
      user.subscription.endDate = new Date(endDate);
    }
    
    if (stripeCustomerId) {
      user.subscription.stripeCustomerId = stripeCustomerId;
    }
    
    if (stripeSubscriptionId) {
      user.subscription.stripeSubscriptionId = stripeSubscriptionId;
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`✅ Subscription updated for ${user.email}: ${type}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        email: user.email,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('❌ Update subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update subscription'
    });
  }
});

// Update user settings
router.patch('/settings/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { language, notifications, theme } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Update only provided settings
    if (language && ['pl', 'en'].includes(language)) {
      user.settings.language = language;
    }
    
    if (notifications !== undefined) {
      user.settings.notifications = Boolean(notifications);
    }
    
    if (theme && ['dark', 'light'].includes(theme)) {
      user.settings.theme = theme;
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`⚙️ Settings updated for ${user.email}`);
    
    res.json({ 
      success: true, 
      settings: user.settings
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update settings'
    });
  }
});

// Delete user (GDPR compliance)
router.delete('/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await User.findOneAndDelete({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    console.log(`✅ User deleted: ${user.email}`);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedUser: {
        email: user.email,
        id: user._id.toString()
      }
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete user'
    });
  }
});

// Get user favorites
router.get('/favorites/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    res.json({ 
      success: true, 
      favorites: user.favorites || [],
      count: (user.favorites || []).length
    });
  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get favorites'
    });
  }
});

// Add favorite
router.post('/favorites/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { recipe } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    if (!recipe || !recipe.id || !recipe.name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid recipe object is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Check if already favorited
    const existingIndex = user.favorites.findIndex(f => f.recipe.id === recipe.id);
    if (existingIndex !== -1) {
      return res.status(409).json({ 
        success: false, 
        error: 'Recipe already in favorites' 
      });
    }
    
    // Add to favorites
    user.favorites.push({
      recipe: recipe,
      addedAt: new Date()
    });
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`⭐ Favorite added for ${user.email}: ${recipe.name}`);
    
    res.json({ 
      success: true, 
      message: 'Favorite added successfully',
      favoritesCount: user.favorites.length
    });
  } catch (error) {
    console.error('❌ Add favorite error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add favorite'
    });
  }
});

// Remove favorite
router.delete('/favorites/:firebaseUid/:recipeId', async (req, res) => {
  try {
    const { firebaseUid, recipeId } = req.params;
    
    if (!firebaseUid || !recipeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID and recipe ID are required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Remove from favorites
    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(f => f.recipe.id !== recipeId);
    
    if (user.favorites.length === initialLength) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recipe not found in favorites' 
      });
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`⭐ Favorite removed for ${user.email}`);
    
    res.json({ 
      success: true, 
      message: 'Favorite removed successfully',
      favoritesCount: user.favorites.length
    });
  } catch (error) {
    console.error('❌ Remove favorite error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to remove favorite'
    });
  }
});

module.exports = router;