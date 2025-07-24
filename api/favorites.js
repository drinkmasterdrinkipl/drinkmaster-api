// master-api/api/favorites.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Dodaj do ulubionych
router.post('/add', async (req, res) => {
  try {
    const { firebaseUid, recipe } = req.body;
    
    console.log('💛 Adding to favorites for user:', firebaseUid);
    console.log('📖 Recipe:', recipe?.name);
    
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
    
    // Upewnij się, że favorites istnieje i jest tablicą
    if (!user.favorites) {
      user.favorites = [];
    }
    
    // Upewnij się, że favorites jest tablicą
    if (!Array.isArray(user.favorites)) {
      console.warn('Favorites was not an array, converting...');
      user.favorites = [];
    }
    
    // Sprawdź czy już nie jest w ulubionych
    const existingIndex = user.favorites.findIndex(
      fav => fav && fav.recipe && fav.recipe.id === recipe.id
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
    
    // Upewnij się, że favorites istnieje i jest tablicą
    if (!user.favorites) {
      user.favorites = [];
    }
    
    if (!Array.isArray(user.favorites)) {
      console.warn('Favorites was not an array, converting...');
      user.favorites = [];
    }
    
    // Znajdź i usuń z ulubionych
    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(
      fav => !fav || !fav.recipe || fav.recipe.id !== recipeId
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
    
    // Upewnij się, że favorites istnieje i jest tablicą
    if (!user.favorites) {
      user.favorites = [];
      await user.save();
    }
    
    if (!Array.isArray(user.favorites)) {
      console.warn('Favorites was not an array, converting...');
      user.favorites = [];
      await user.save();
    }
    
    // Debug
    console.log('User favorites field exists?', !!user.favorites);
    console.log('User favorites is array?', Array.isArray(user.favorites));
    console.log('User favorites length:', user.favorites.length);
    
    // Sortuj po dacie dodania (najnowsze pierwsze)
    const favorites = user.favorites
      .filter(fav => fav && fav.recipe) // Tylko te które mają przepis
      .sort((a, b) => {
        const dateA = new Date(a.addedAt || 0);
        const dateB = new Date(b.addedAt || 0);
        return dateB - dateA;
      })
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
    
    console.log('🔍 Checking favorite for user:', firebaseUid, 'recipe:', recipeId);
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.json({
        success: true,
        isFavorite: false
      });
    }
    
    // Upewnij się, że favorites istnieje i jest tablicą
    if (!user.favorites || !Array.isArray(user.favorites)) {
      return res.json({
        success: true,
        isFavorite: false
      });
    }
    
    const isFavorite = user.favorites.some(
      fav => fav && fav.recipe && fav.recipe.id === recipeId
    );
    
    console.log('Is favorite?', isFavorite);
    
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
    console.log('📦 Favorites to migrate:', favorites?.length || 0);
    
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Walidacja danych wejściowych
    if (!favorites || !Array.isArray(favorites)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid favorites data'
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