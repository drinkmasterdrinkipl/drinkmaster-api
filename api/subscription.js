// master-api/api/subscription.js - NOWY PLIK
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to verify Firebase token (dodaj to jeśli nie masz)
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'No authorization token provided' 
    });
  }
  
  // Tu normalnie weryfikujesz token Firebase
  // Dla uproszczenia pomijam tę część
  next();
};

// Get subscription status
router.get('/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    console.log('📱 Getting subscription status for:', firebaseUid);
    
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      console.log('👤 User not found, returning free status');
      return res.json({ 
        success: true,
        subscriptionType: 'free',
        usage: {
          scans: 0,
          recipes: 0,
          homeBar: 0
        },
        isNewUser: true
      });
    }
    
    // Determine current usage based on subscription type
    let currentUsage = {
      scans: 0,
      recipes: 0,
      homeBar: 0
    };
    
    if (user.subscription.type === 'monthly' || user.subscription.type === 'yearly') {
      // For premium users, use daily stats
      currentUsage = {
        scans: user.stats.dailyScans || 0,
        recipes: user.stats.dailyRecipes || 0,
        homeBar: user.stats.dailyHomeBar || 0
      };
      
      // Check if daily reset is needed
      const lastReset = user.stats.lastResetDate;
      const now = new Date();
      
      if (!lastReset || 
          now.getDate() !== lastReset.getDate() || 
          now.getMonth() !== lastReset.getMonth() || 
          now.getFullYear() !== lastReset.getFullYear()) {
        
        console.log('🔄 Daily reset needed for premium user');
        user.stats.dailyScans = 0;
        user.stats.dailyRecipes = 0;
        user.stats.dailyHomeBar = 0;
        user.stats.lastResetDate = now;
        await user.save();
        
        currentUsage = {
          scans: 0,
          recipes: 0,
          homeBar: 0
        };
      }
    } else {
      // For free users, use total stats
      currentUsage = {
        scans: user.stats.totalScans || 0,
        recipes: user.stats.totalRecipes || 0,
        homeBar: user.stats.totalHomeBarAnalyses || 0
      };
    }
    
    console.log('✅ Returning subscription status:', {
      type: user.subscription.type,
      usage: currentUsage
    });
    
    res.json({ 
      success: true,
      subscriptionType: user.subscription.type,
      subscription: user.subscription,
      usage: currentUsage,
      lastReset: user.stats.lastResetDate,
      limits: {
        scans: user.subscription.type === 'free' ? 2 : 50,
        recipes: user.subscription.type === 'free' ? 2 : 50,
        homeBar: user.subscription.type === 'free' ? 2 : 50
      }
    });
  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get subscription status'
    });
  }
});

// Update subscription (upgrade/downgrade)
router.post('/upgrade', verifyToken, async (req, res) => {
  try {
    const { userId, subscriptionType, startDate } = req.body;
    
    if (!userId || !subscriptionType) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and subscription type are required' 
      });
    }
    
    if (!['monthly', 'yearly'].includes(subscriptionType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid subscription type. Must be monthly or yearly' 
      });
    }
    
    console.log(`🎉 Upgrading user ${userId} to ${subscriptionType}`);
    
    const user = await User.findOne({ firebaseUid: userId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Update subscription
    user.subscription = {
      type: subscriptionType,
      startDate: new Date(startDate || Date.now()),
      endDate: null, // Premium subscriptions don't expire
      stripeCustomerId: user.subscription.stripeCustomerId,
      stripeSubscriptionId: user.subscription.stripeSubscriptionId
    };
    
    // Reset daily stats for premium
    user.stats.dailyScans = 0;
    user.stats.dailyRecipes = 0;
    user.stats.dailyHomeBar = 0;
    user.stats.lastResetDate = new Date();
    
    user.lastActive = new Date();
    await user.save();
    
    console.log(`✅ User upgraded to ${subscriptionType}`);
    
    res.json({ 
      success: true,
      subscription: user.subscription,
      message: `Successfully upgraded to ${subscriptionType}`
    });
  } catch (error) {
    console.error('❌ Upgrade subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upgrade subscription'
    });
  }
});

// Sync subscription status (called from app)
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, subscriptionType, usage, lastReset } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    console.log('🔄 Syncing subscription from app:', {
      uid: firebaseUid,
      type: subscriptionType,
      usage
    });
    
    let user = await User.findOne({ firebaseUid });
    
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        firebaseUid,
        email: `${firebaseUid}@temp.com`,
        subscription: {
          type: subscriptionType || 'free',
          startDate: new Date()
        },
        stats: {
          totalScans: usage?.scans || 0,
          totalRecipes: usage?.recipes || 0,
          totalHomeBarAnalyses: usage?.homeBar || 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        }
      });
    }
    
    // Update subscription type if different
    if (subscriptionType && user.subscription.type !== subscriptionType) {
      console.log(`📱 Updating subscription type: ${user.subscription.type} → ${subscriptionType}`);
      user.subscription.type = subscriptionType;
      user.subscription.startDate = new Date();
    }
    
    // Update usage stats
    if (usage) {
      if (subscriptionType === 'monthly' || subscriptionType === 'yearly') {
        // For premium, update daily stats
        user.stats.dailyScans = usage.scans || 0;
        user.stats.dailyRecipes = usage.recipes || 0;
        user.stats.dailyHomeBar = usage.homeBar || 0;
        
        if (lastReset) {
          user.stats.lastResetDate = new Date(lastReset);
        }
      } else {
        // For free, update total stats
        user.stats.totalScans = usage.scans || 0;
        user.stats.totalRecipes = usage.recipes || 0;
        user.stats.totalHomeBarAnalyses = usage.homeBar || 0;
      }
    }
    
    user.lastActive = new Date();
    await user.save();
    
    console.log('✅ Subscription synced successfully');
    
    res.json({ 
      success: true,
      subscription: user.subscription,
      usage: {
        scans: subscriptionType === 'free' ? user.stats.totalScans : user.stats.dailyScans,
        recipes: subscriptionType === 'free' ? user.stats.totalRecipes : user.stats.dailyRecipes,
        homeBar: subscriptionType === 'free' ? user.stats.totalHomeBarAnalyses : user.stats.dailyHomeBar
      }
    });
  } catch (error) {
    console.error('❌ Sync subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    console.log('🚫 Cancelling subscription for:', firebaseUid);
    
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Downgrade to free
    user.subscription = {
      type: 'free',
      startDate: new Date(),
      endDate: null,
      stripeCustomerId: user.subscription.stripeCustomerId
    };
    
    user.lastActive = new Date();
    await user.save();
    
    console.log('✅ Subscription cancelled, user downgraded to free');
    
    res.json({ 
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to cancel subscription'
    });
  }
});

// Check and reset daily limits for premium users
router.post('/check-reset', async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase UID is required' 
      });
    }
    
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Only check for premium users
    if (user.subscription.type === 'monthly' || user.subscription.type === 'yearly') {
      const now = new Date();
      const lastReset = user.stats.lastResetDate;
      
      if (!lastReset || 
          now.getDate() !== lastReset.getDate() || 
          now.getMonth() !== lastReset.getMonth() || 
          now.getFullYear() !== lastReset.getFullYear()) {
        
        console.log('🔄 Resetting daily limits for premium user:', user.email);
        
        user.stats.dailyScans = 0;
        user.stats.dailyRecipes = 0;
        user.stats.dailyHomeBar = 0;
        user.stats.lastResetDate = now;
        
        await user.save();
        
        return res.json({ 
          success: true,
          reset: true,
          message: 'Daily limits reset'
        });
      }
    }
    
    res.json({ 
      success: true,
      reset: false,
      message: 'No reset needed'
    });
  } catch (error) {
    console.error('❌ Check reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to check reset'
    });
  }
});

module.exports = router;