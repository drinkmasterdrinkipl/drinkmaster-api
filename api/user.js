const express = require('express');
const router = express.Router();
const User = require('../models/User');

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
        subscriptionType: 'free', // Start with free, trial is handled separately
        trialStartDate: new Date(),
        stats: {
          totalScans: 0,
          totalRecipes: 0,
          totalMyBar: 0
        },
        scanHistory: [],
        recipeHistory: [],
        myBarHistory: [],
        favoriteRecipes: []
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
      if (!user.favoriteRecipes) user.favoriteRecipes = [];
      
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
        subscriptionType: user.subscriptionType,
        trialStartDate: user.trialStartDate,
        stats: user.stats,
        hasHistory: {
          scans: user.scanHistory.length > 0,
          recipes: user.recipeHistory.length > 0,
          myBar: user.myBarHistory.length > 0
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
        subscriptionType: user.subscriptionType,
        trialStartDate: user.trialStartDate,
        stats: user.stats,
        createdAt: user.createdAt,
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favoriteRecipes?.length || 0
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
    
    res.json({ 
      success: true, 
      stats: {
        ...user.stats,
        historyCount: {
          scans: user.scanHistory?.length || 0,
          recipes: user.recipeHistory?.length || 0,
          myBar: user.myBarHistory?.length || 0,
          favorites: user.favoriteRecipes?.length || 0
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

module.exports = router;