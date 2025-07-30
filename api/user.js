// master-api/api/user.js - POPRAWIONY DLA SOCIAL LOGIN I FREE Z AUTORYZACJĄ
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, optionalAuth } = require('../middleware/auth');

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
        providers: ['password'], // Default provider
        subscription: {
          type: 'free', // ZMIANA: Nowi użytkownicy zaczynają jako FREE, nie TRIAL
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
        isNewUser: true,
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

// Create new user - endpoint for explicit user creation
router.post('/create', optionalAuth, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid || req.body.firebaseUid;
    const { email, displayName } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists',
        user: {
          id: existingUser._id.toString(),
          firebaseUid: existingUser.firebaseUid,
          email: existingUser.email,
          subscription: existingUser.subscription
        }
      });
    }
    
    // Create new user
    const user = await User.create({
      firebaseUid,
      email: email || `${firebaseUid}@temp.com`,
      displayName: displayName || 'User',
      providers: ['password'],
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
      isNewUser: true,
      createdAt: new Date(),
      lastActive: new Date()
    });
    
    console.log('✅ New user created:', user.email);
    
    res.status(201).json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        subscription: user.subscription,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create user'
    });
  }
});

// Sync user from Firebase - UPDATED FOR SOCIAL LOGIN WITH AUTH
router.post('/sync', optionalAuth, async (req, res) => {
  try {
    // Prefer user from token, fallback to request body for backward compatibility
    const firebaseUid = req.user?.uid || req.body.firebaseUid;
    const { email, displayName, photoURL, emailVerified, providers } = req.body;
    
    console.log('🔄 Syncing user:', email || firebaseUid);
    console.log('Providers:', providers);
    
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
      
      // Determine providers from request or default
      const userProviders = providers && providers.length > 0 ? providers : ['password'];
      
      user = new User({
        firebaseUid,
        email: email || `${firebaseUid}@temp.com`,
        displayName: displayName || 'User',
        photoURL,
        emailVerified,
        providers: userProviders, // NOWE: Zapisz providers
        subscription: {
          type: 'free', // WAŻNE: Zaczynamy jako FREE
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
        isNewUser: true,
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
      
      // NOWE: Update providers if provided
      if (providers && Array.isArray(providers) && providers.length > 0) {
        // Merge providers (don't replace, add new ones)
        const uniqueProviders = [...new Set([...(user.providers || []), ...providers])];
        user.providers = uniqueProviders;
        console.log('Updated providers:', uniqueProviders);
      }
      
      // Mark as not new user anymore
      if (user.isNewUser) {
        user.isNewUser = false;
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
        providers: user.providers, // NOWE: Return providers
        subscription: user.subscription,
        stats: user.stats,
        hasHistory: {
          scans: user.scanHistory.length > 0,
          recipes: user.recipeHistory.length > 0,
          myBar: user.myBarHistory.length > 0,
          favorites: user.favorites.length > 0
        },
        isNewUser: user.isNewUser,
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
            
            // Update providers if provided
            if (req.body.providers && Array.isArray(req.body.providers)) {
              const uniqueProviders = [...new Set([...(existingUser.providers || []), ...req.body.providers])];
              existingUser.providers = uniqueProviders;
            }
            
            await existingUser.save();
            
            return res.json({ 
              success: true, 
              user: {
                id: existingUser._id.toString(),
                firebaseUid: existingUser.firebaseUid,
                email: existingUser.email,
                displayName: existingUser.displayName,
                providers: existingUser.providers,
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
router.get('/profile/:firebaseUid', optionalAuth, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid || req.params.firebaseUid;
    
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
        providers: user.providers || ['password'], // NOWE: Include providers
        subscription: user.subscription,
        stats: user.stats,
        settings: user.settings,
        isNewUser: user.isNewUser,
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

// Get user stats - POPRAWIONE
router.get('/stats/:firebaseUid', optionalAuth, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid || req.params.firebaseUid;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Reset daily stats if needed (dla premium users)
    if (user.subscription?.type !== 'free' && user.resetDailyStats) {
      const wasReset = user.resetDailyStats();
      if (wasReset) {
        await user.save();
      }
    }
    
    // POPRAWKA: Frontend oczekuje subscription wewnątrz stats
    const response = {
      success: true,
      // Dla kompatybilności wstecznej - stare pola na głównym poziomie
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0,
      // Nowa struktura z subscription
      stats: {
        ...user.stats,
        // KLUCZOWE: Dodaj subscription do stats
        subscription: {
          type: user.subscription?.type || 'free',
          startDate: user.subscription?.startDate,
          endDate: user.subscription?.endDate
        },
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favorites?.length || 0
        }
      },
      // Również na głównym poziomie dla bezpieczeństwa
      subscription: {
        type: user.subscription?.type || 'free',
        startDate: user.subscription?.startDate,
        endDate: user.subscription?.endDate
      }
    };
    
    console.log('📊 Returning stats for user:', user.email);
    console.log('📊 Subscription type:', response.subscription.type);
    console.log('📊 Stats:', {
      totalScans: response.totalScans,
      totalRecipes: response.totalRecipes,
      totalHomeBar: response.totalMyBar,
      dailyScans: user.stats.dailyScans,
      dailyRecipes: user.stats.dailyRecipes,
      dailyHomeBar: user.stats.dailyHomeBar
    });
    
    res.json(response);
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get user stats'
    });
  }
});

// Increment usage stats with debouncing
router.post('/stats/increment/:firebaseUid', optionalAuth, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid || req.params.firebaseUid;
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
        stats: {
          ...user.stats,
          subscription: {
            type: user.subscription?.type || 'free',
            startDate: user.subscription?.startDate,
            endDate: user.subscription?.endDate
          }
        },
        subscription: user.subscription,
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
    
    // Reset daily stats if needed (dla premium users)
    if (user.subscription?.type !== 'free' && user.resetDailyStats) {
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
      totalHomeBar: user.stats.totalHomeBarAnalyses,
      subscription: user.subscription.type
    });
    
    // Return stats in compatible format
    const responseStats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0,
      stats: {
        ...user.stats,
        subscription: {
          type: user.subscription?.type || 'free',
          startDate: user.subscription?.startDate,
          endDate: user.subscription?.endDate
        }
      },
      subscription: user.subscription // NOWE: Include subscription
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
      stats: {
        ...user.stats,
        subscription: {
          type: user.subscription?.type || 'free',
          startDate: user.subscription?.startDate,
          endDate: user.subscription?.endDate
        }
      },
      subscription: user.subscription
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

// Update subscription - POPRAWIONE
router.post('/subscription/:firebaseUid', verifyToken, async (req, res) => {
  try {
    const firebaseUid = req.user.uid; // Always use token user
    const { type, endDate, stripeCustomerId, stripeSubscriptionId, revenueCatCustomerId, resetStats } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    // ZMIANA: Tylko free, monthly, yearly (bez trial)
    if (!type || !['free', 'monthly', 'yearly'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid subscription type is required (free, monthly, yearly)' 
      });
    }
    
    const user = await ensureUserExists(firebaseUid);
    
    // Store previous type to check if we're upgrading
    const previousType = user.subscription?.type || 'free';
    const isUpgradingToPremium = previousType === 'free' && (type === 'monthly' || type === 'yearly');
    
    // Update subscription
    user.subscription.type = type;
    user.subscription.startDate = new Date();
    
    if (endDate) {
      user.subscription.endDate = new Date(endDate);
    } else if (type === 'monthly') {
      // Auto-set end date for monthly
      user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (type === 'yearly') {
      // Auto-set end date for yearly
      user.subscription.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
    
    if (stripeCustomerId) {
      user.subscription.stripeCustomerId = stripeCustomerId;
    }
    
    if (stripeSubscriptionId) {
      user.subscription.stripeSubscriptionId = stripeSubscriptionId;
    }
    
    if (revenueCatCustomerId) {
      user.subscription.revenueCatCustomerId = revenueCatCustomerId;
    }
    
    // Reset daily stats if upgrading to premium or if explicitly requested
    if ((isUpgradingToPremium || resetStats) && type !== 'free') {
      console.log('🔄 Resetting daily stats for premium user');
      user.stats.dailyScans = 0;
      user.stats.dailyRecipes = 0;
      user.stats.dailyHomeBar = 0;
      user.stats.lastResetDate = new Date();
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`✅ Subscription updated for ${user.email}: ${previousType} → ${type}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        email: user.email,
        subscription: user.subscription,
        stats: user.stats
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