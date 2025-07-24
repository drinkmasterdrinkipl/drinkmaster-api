// master-api/api/history.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Recipe = require('../models/Recipe');

// Get user's scan history
router.get('/scans/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    console.log(`📚 Getting scan history for user: ${firebaseUid}`);
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID is required'
      });
    }

    // Find user first
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get scan history from user's scans array (if exists)
    // Or from separate Scans collection if you created one
    const scans = user.scanHistory || [];
    
    // Sort by date (newest first) and paginate
    const sortedScans = scans
      .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
      .slice((page - 1) * limit, page * limit);

    console.log(`📊 Found ${sortedScans.length} scans for user`);

    res.json({
      success: true,
      data: {
        scans: sortedScans,
        totalCount: scans.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(scans.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ History scans error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's recipe generation history
router.get('/recipes/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    console.log(`📖 Getting recipe history for user: ${firebaseUid}`);
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID is required'
      });
    }

    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recipe history (from user document or separate collection)
    const recipes = user.recipeHistory || [];
    
    // Sort by date (newest first) and paginate
    const sortedRecipes = recipes
      .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
      .slice((page - 1) * limit, page * limit);

    console.log(`📊 Found ${sortedRecipes.length} recipes for user`);

    res.json({
      success: true,
      data: {
        recipes: sortedRecipes,
        totalCount: recipes.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(recipes.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ History recipes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's MyBar history
router.get('/mybar/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    console.log(`🍹 Getting MyBar history for user: ${firebaseUid}`);
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID is required'
      });
    }

    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get MyBar history
    const myBarHistory = user.myBarHistory || [];
    
    // Sort by date (newest first) and paginate
    const sortedHistory = myBarHistory
      .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
      .slice((page - 1) * limit, page * limit);

    console.log(`📊 Found ${sortedHistory.length} MyBar entries for user`);

    res.json({
      success: true,
      data: {
        history: sortedHistory,
        totalCount: myBarHistory.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(myBarHistory.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ History MyBar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get combined history (all activities)
router.get('/all/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    console.log(`📋 Getting combined history for user: ${firebaseUid}`);
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID is required'
      });
    }

    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Combine all history types
    const allHistory = [];
    
    // Add scans
    if (user.scanHistory) {
      user.scanHistory.forEach(scan => {
        allHistory.push({
          ...scan,
          type: 'scan',
          timestamp: scan.timestamp || scan.createdAt,
          title: scan.bottleInfo?.name || 'Unknown Bottle',
          subtitle: scan.bottleInfo?.brand || ''
        });
      });
    }
    
    // Add recipes
    if (user.recipeHistory) {
      user.recipeHistory.forEach(recipe => {
        allHistory.push({
          ...recipe,
          type: 'recipe',
          timestamp: recipe.timestamp || recipe.createdAt,
          title: recipe.name || 'Generated Recipe',
          subtitle: recipe.category || 'Cocktail'
        });
      });
    }
    
    // Add MyBar activities
    if (user.myBarHistory) {
      user.myBarHistory.forEach(mybar => {
        allHistory.push({
          ...mybar,
          type: 'mybar',
          timestamp: mybar.timestamp || mybar.createdAt,
          title: 'Bar Analysis',
          subtitle: `${mybar.ingredientsCount || 0} ingredients`
        });
      });
    }
    
    // Sort by date (newest first) and paginate
    const sortedHistory = allHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice((page - 1) * limit, page * limit);

    console.log(`📊 Found ${sortedHistory.length} total activities for user`);

    res.json({
      success: true,
      data: {
        history: sortedHistory,
        totalCount: allHistory.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(allHistory.length / limit),
        stats: {
          totalScans: user.scanHistory?.length || 0,
          totalRecipes: user.recipeHistory?.length || 0,
          totalMyBar: user.myBarHistory?.length || 0,
          totalActivities: allHistory.length
        }
      }
    });

  } catch (error) {
    console.error('❌ History all error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear user's history (optional - for privacy)
router.delete('/clear/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { type } = req.query; // 'scans', 'recipes', 'mybar', or 'all'
    
    console.log(`🗑️ Clearing ${type || 'all'} history for user: ${firebaseUid}`);
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID is required'
      });
    }

    const updateQuery = {};
    
    switch (type) {
      case 'scans':
        updateQuery.scanHistory = [];
        break;
      case 'recipes':
        updateQuery.recipeHistory = [];
        break;
      case 'mybar':
        updateQuery.myBarHistory = [];
        break;
      default:
        // Clear all
        updateQuery.scanHistory = [];
        updateQuery.recipeHistory = [];
        updateQuery.myBarHistory = [];
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: updateQuery },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ History cleared for user: ${firebaseUid}`);

    res.json({
      success: true,
      message: `${type || 'All'} history cleared successfully`
    });

  } catch (error) {
    console.error('❌ Clear history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;