// master-api/api/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Tylko import, bez tworzenia modelu!

// Sync user from Firebase
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, photoURL } = req.body;
    
    console.log('🔄 Syncing user:', email);
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      // Create new user with 3-day trial
      user = await User.create({
        firebaseUid,
        email,
        displayName,
        photoURL,
        subscription: {
          type: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dni
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
        favorites: [] // Używamy nowej struktury
      });
      console.log('✅ New user created:', email);
    } else {
      // Update existing user
      user.lastActive = new Date();
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      
      // Ensure arrays exist for existing users
      if (!user.scanHistory) user.scanHistory = [];
      if (!user.recipeHistory) user.recipeHistory = [];
      if (!user.myBarHistory) user.myBarHistory = [];
      if (!user.favorites) user.favorites = [];
      
      // Migracja ze starego favoriteRecipes do nowego favorites
      if (user.favoriteRecipes && user.favoriteRecipes.length > 0 && user.favorites.length === 0) {
        console.log('🔄 Migrating old favorites structure...');
        user.favorites = user.favoriteRecipes.map(recipe => ({
          recipe: recipe,
          addedAt: new Date()
        }));
        user.favoriteRecipes = undefined; // Usuń stare pole
      }
      
      // Reset daily stats if needed
      if (user.resetDailyStats) {
        user.resetDailyStats();
      }
      
      await user.save();
      console.log('✅ User updated:', email);
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        subscription: user.subscription,
        stats: user.stats,
        hasHistory: {
          scans: user.scanHistory.length > 0,
          recipes: user.recipeHistory.length > 0,
          myBar: user.myBarHistory.length > 0,
          favorites: user.favorites.length > 0
        }
      }
    });
  } catch (error) {
    console.error('❌ User sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user profile
router.get('/profile/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        subscription: user.subscription,
        stats: user.stats,
        createdAt: user.createdAt,
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
      error: error.message 
    });
  }
});

// Get user stats
router.get('/stats/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      const wasReset = user.resetDailyStats();
      if (wasReset) {
        await user.save();
      }
    }
    
    res.json({ 
      success: true, 
      stats: {
        ...user.stats,
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favorites?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update subscription
router.post('/subscription/:firebaseUid', async (req, res) => {
  try {
    const { type, endDate, stripeCustomerId, stripeSubscriptionId } = req.body;
    
    const updateData = {
      'subscription.type': type,
      'subscription.startDate': new Date(),
      lastActive: new Date()
    };
    
    if (endDate) updateData['subscription.endDate'] = new Date(endDate);
    if (stripeCustomerId) updateData['subscription.stripeCustomerId'] = stripeCustomerId;
    if (stripeSubscriptionId) updateData['subscription.stripeSubscriptionId'] = stripeSubscriptionId;
    
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { $set: updateData },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    console.log(`✅ Subscription updated for ${user.email}: ${type}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        email: user.email,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('❌ Update subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update user settings
router.patch('/settings/:firebaseUid', async (req, res) => {
  try {
    const { language, notifications, theme } = req.body;
    
    const updateData = {};
    if (language) updateData['settings.language'] = language;
    if (notifications !== undefined) updateData['settings.notifications'] = notifications;
    if (theme) updateData['settings.theme'] = theme;
    
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { $set: updateData },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      settings: user.settings
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete user (for GDPR compliance)
router.delete('/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ firebaseUid: req.params.firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    console.log(`✅ User deleted: ${user.email}`);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;