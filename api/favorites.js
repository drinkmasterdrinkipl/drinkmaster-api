// master-api/api/favorites.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Dodaj do ulubionych
router.post('/add', async (req, res) => {
  try {
    const { firebaseUid, recipe } = req.body;
    
    console.log('💛 Adding to favorites for user:', firebaseUid);
    console.log('📖 Recipe:', recipe.name);
    
    if (!firebaseUid || !recipe) {
      return res.status(400).json({
        success: false,
        error: 'Missing firebaseUid or recipe'
      });
    }
    
    // Znajdź użytkownika
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Sprawdź czy już nie jest w ulubionych
    const existingIndex = user.favorites.findIndex(
      fav => fav.recipe && fav.recipe.id === recipe.id
    );
    
    if (existingIndex !== -1) {
      return res.json({
        success: true,
        message: 'Recipe already in favorites'
      });
    }
    
    // Dodaj do ulubionych
    user.favorites.push({
      recipe: recipe,
      addedAt: new Date()
    });
    
    await user.save();
    
    console.log('✅ Added to favorites successfully');
    
    res.json({
      success: true,
      message: 'Added to favorites',
      favoritesCount: user.favorites.length
    });
    
  } catch (error) {
    console.error('❌ Add to favorites error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Usuń z ulubionych
router.delete('/remove/:firebaseUid/:recipeId', async (req, res) => {
  try {
    const { firebaseUid, recipeId } = req.params;
    
    console.log('💔 Removing from favorites for user:', firebaseUid);
    console.log('📖 Recipe ID:', recipeId);
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Znajdź i usuń z ulubionych
    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(
      fav => !fav.recipe || fav.recipe.id !== recipeId
    );
    
    if (user.favorites.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found in favorites'
      });
    }
    
    await user.save();
    
    console.log('✅ Removed from favorites successfully');
    
    res.json({
      success: true,
      message: 'Removed from favorites',
      favoritesCount: user.favorites.length
    });
    
  } catch (error) {
    console.error('❌ Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pobierz wszystkie ulubione
router.get('/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    console.log('📚 Getting favorites for user:', firebaseUid);
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Sortuj po dacie dodania (najnowsze pierwsze)
    const favorites = user.favorites
      .filter(fav => fav.recipe) // Tylko te które mają przepis
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .map(fav => ({
        ...fav.recipe,
        addedAt: fav.addedAt
      }));
    
    console.log(`✅ Found ${favorites.length} favorites`);
    
    res.json({
      success: true,
      data: {
        favorites: favorites,
        count: favorites.length
      }
    });
    
  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sprawdź czy jest w ulubionych
router.get('/check/:firebaseUid/:recipeId', async (req, res) => {
  try {
    const { firebaseUid, recipeId } = req.params;
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.json({
        success: true,
        isFavorite: false
      });
    }
    
    const isFavorite = user.favorites.some(
      fav => fav.recipe && fav.recipe.id === recipeId
    );
    
    res.json({
      success: true,
      isFavorite: isFavorite
    });
    
  } catch (error) {
    console.error('❌ Check favorite error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Migracja z AsyncStorage (opcjonalne)
router.post('/migrate', async (req, res) => {
  try {
    const { firebaseUid, favorites } = req.body;
    
    console.log('🔄 Migrating favorites for user:', firebaseUid);
    console.log('📦 Favorites to migrate:', favorites.length);
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Zastąp wszystkie ulubione nowymi
    user.favorites = favorites.map(recipe => ({
      recipe: recipe,
      addedAt: recipe.addedAt || new Date()
    }));
    
    await user.save();
    
    console.log('✅ Migration completed');
    
    res.json({
      success: true,
      message: 'Favorites migrated successfully',
      count: user.favorites.length
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;