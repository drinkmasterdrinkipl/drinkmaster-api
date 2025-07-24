const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Sync user from Firebase
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, photoURL } = req.body;
    
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
          trialStartedAt: new Date(),
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('✅ New user created:', email);
    } else {
      // Update existing user
      user.lastActive = new Date();
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      await user.save();
      console.log('✅ User updated:', email);
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        subscription: user.subscription,
        preferences: user.preferences,
        stats: user.stats
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
        email: user.email,
        displayName: user.displayName,
        subscription: user.subscription,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
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

module.exports = router;
