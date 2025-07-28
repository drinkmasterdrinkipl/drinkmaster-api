// master-api/api/user.js - 🔧 NAPRAWIONY Z AUTO-TWORZENIEM UŻYTKOWNIKA
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 🆕 Helper function to ensure user exists
const ensureUserExists = async (firebaseUid, email = null) => {
  try {
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      console.log('👤 User not found, creating new user for:', firebaseUid);
      
      // Jeśli nie mamy email, używamy domyślnego wzorca
      const defaultEmail = email || `${firebaseUid}@temp.com`;
      
      user = await User.create({
        firebaseUid,
        email: defaultEmail,
        displayName: 'User',
        subscription: {
          type: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dni trial
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
        }
      });
      
      console.log('✅ New user auto-created:', defaultEmail);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error ensuring user exists:', error);
    throw error;
  }
};

// Sync user from Firebase
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, photoURL } = req.body;
    
    console.log('🔄 Syncing user:', email || firebaseUid);
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    // 🔧 NAPRAWIONE: Używamy helper function
    let user = await ensureUserExists(firebaseUid, email);
    
    // Update user data if provided
    if (email && user.email !== email) {
      user.email = email;
    }
    if (displayName) user.displayName = displayName;
    if (photoURL) user.photoURL = photoURL;
    
    user.lastActive = new Date();
    
    // Ensure arrays exist
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
    // 🔧 NAPRAWIONE: Zapewniamy że user istnieje
    const user = await ensureUserExists(req.params.firebaseUid);
    
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
    // 🔧 NAPRAWIONE: Zapewniamy że user istnieje
    const user = await ensureUserExists(req.params.firebaseUid);
    
    // Reset daily stats if needed
    if (user.resetDailyStats) {
      const wasReset = user.resetDailyStats();
      if (wasReset) {
        await user.save();
      }
    }
    
    // 🆕 DODANE: Zwracamy stats w formacie zgodnym z frontendem
    const stats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0
    };
    
    console.log('📊 Returning stats:', stats);
    
    res.json({ 
      success: true, 
      ...stats, // Bezpośrednio w response (jak oczekuje frontend)
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

// Increment usage stats - POPRAWIONE Z AUTO-TWORZENIEM UŻYTKOWNIKA
router.post('/stats/increment/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { type } = req.body;
    
    console.log(`📊 Incrementing ${type} stats for user:`, firebaseUid);
    
    // 🔧 NAPRAWIONE: Zapewniamy że user istnieje
    const user = await ensureUserExists(firebaseUid);
    
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
    
    user.lastActive = new Date();
    await user.save();
    
    console.log('✅ Stats updated successfully');
    console.log('Current stats:', user.stats);
    
    // 🆕 DODANE: Zwracamy w formacie zgodnym z frontendem
    const responseStats = {
      totalMyBar: user.stats.totalHomeBarAnalyses || 0,
      totalRecipes: user.stats.totalRecipes || 0,
      totalScans: user.stats.totalScans || 0
    };
    
    res.json({ 
      success: true, 
      ...responseStats, // Bezpośrednio w response
      stats: user.stats // I w nested stats
    });
  } catch (error) {
    console.error('❌ Update stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🆕 NOWY ENDPOINT: Auto-sync user from frontend
router.post('/auto-sync', async (req, res) => {
  try {
    const { firebaseUid, email } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    console.log('🔄 Auto-syncing user:', firebaseUid);
    
    const user = await ensureUserExists(firebaseUid, email);
    
    res.json({ 
      success: true,
      message: 'User auto-synced successfully',
      user: {
        id: user._id,
        email: user.email,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (error) {
    console.error('❌ Auto-sync error:', error);
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
    
    // 🔧 NAPRAWIONE: Zapewniamy że user istnieje
    const user = await ensureUserExists(req.params.firebaseUid);
    
    const updateData = {
      'subscription.type': type,
      'subscription.startDate': new Date(),
      lastActive: new Date()
    };
    
    if (endDate) updateData['subscription.endDate'] = new Date(endDate);
    if (stripeCustomerId) updateData['subscription.stripeCustomerId'] = stripeCustomerId;
    if (stripeSubscriptionId) updateData['subscription.stripeSubscriptionId'] = stripeSubscriptionId;
    
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { $set: updateData },
      { new: true }
    );
    
    console.log(`✅ Subscription updated for ${updatedUser.email}: ${type}`);
    
    res.json({ 
      success: true, 
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        subscription: updatedUser.subscription
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
    
    // 🔧 NAPRAWIONE: Zapewniamy że user istnieje
    await ensureUserExists(req.params.firebaseUid);
    
    const updateData = {};
    if (language) updateData['settings.language'] = language;
    if (notifications !== undefined) updateData['settings.notifications'] = notifications;
    if (theme) updateData['settings.theme'] = theme;
    updateData.lastActive = new Date();
    
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { $set: updateData },
      { new: true }
    );
    
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