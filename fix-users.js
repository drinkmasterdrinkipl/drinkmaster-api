// master-api/fix-users.js - Skrypt migracyjny do naprawienia użytkowników
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const User = require('./models/User');

async function fixUsers() {
  try {
    console.log('🔄 Starting user migration...');
    
    // Znajdź wszystkich użytkowników
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users to check`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      let needsSave = false;
      
      // 1. Napraw brakujące pola email
      if (!user.email && user.firebaseUid) {
        console.log(`📧 Fixing missing email for user: ${user.firebaseUid}`);
        user.email = `${user.firebaseUid}@temp.com`;
        needsSave = true;
      }
      
      // 2. Upewnij się że stats istnieją
      if (!user.stats) {
        console.log(`📊 Adding missing stats for user: ${user.email}`);
        user.stats = {
          totalScans: 0,
          totalRecipes: 0,
          totalHomeBarAnalyses: 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        };
        needsSave = true;
      } else {
        // Upewnij się że wszystkie pola stats istnieją
        const defaultStats = {
          totalScans: 0,
          totalRecipes: 0,
          totalHomeBarAnalyses: 0,
          dailyScans: 0,
          dailyRecipes: 0,
          dailyHomeBar: 0,
          lastResetDate: new Date()
        };
        
        for (const [key, value] of Object.entries(defaultStats)) {
          if (user.stats[key] === undefined) {
            console.log(`📊 Adding missing stat ${key} for user: ${user.email}`);
            user.stats[key] = value;
            needsSave = true;
          }
        }
      }
      
      // 3. Upewnij się że history arrays istnieją
      if (!user.scanHistory) {
        console.log(`📱 Adding scanHistory for user: ${user.email}`);
        user.scanHistory = [];
        needsSave = true;
      }
      
      if (!user.recipeHistory) {
        console.log(`📖 Adding recipeHistory for user: ${user.email}`);
        user.recipeHistory = [];
        needsSave = true;
      }
      
      if (!user.myBarHistory) {
        console.log(`🍹 Adding myBarHistory for user: ${user.email}`);
        user.myBarHistory = [];
        needsSave = true;
      }
      
      if (!user.favorites) {
        console.log(`💛 Adding favorites for user: ${user.email}`);
        user.favorites = [];
        needsSave = true;
      }
      
      // 4. Upewnij się że favorites jest tablicą
      if (user.favorites && !Array.isArray(user.favorites)) {
        console.log(`💛 Converting favorites to array for user: ${user.email}`);
        user.favorites = [];
        needsSave = true;
      }
      
      // 5. Upewnij się że subscription istnieje
      if (!user.subscription) {
        console.log(`💳 Adding subscription for user: ${user.email}`);
        user.subscription = {
          type: 'trial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        needsSave = true;
      }
      
      // 6. Upewnij się że settings istnieją
      if (!user.settings) {
        console.log(`⚙️ Adding settings for user: ${user.email}`);
        user.settings = {
          language: 'pl',
          notifications: true,
          theme: 'dark'
        };
        needsSave = true;
      }
      
      // 7. Migracja ze starych favoriteRecipes do nowego favorites
      if (user.favoriteRecipes && user.favoriteRecipes.length > 0 && user.favorites.length === 0) {
        console.log(`🔄 Migrating favoriteRecipes to favorites for user: ${user.email}`);
        user.favorites = user.favoriteRecipes.map(recipe => ({
          recipe: recipe,
          addedAt: new Date()
        }));
        user.favoriteRecipes = undefined; // Usuń stare pole
        needsSave = true;
      }
      
      // Zapisz jeśli coś się zmieniło
      if (needsSave) {
        await user.save();
        fixedCount++;
        console.log(`✅ Fixed user: ${user.email}`);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`👥 Total users: ${users.length}`);
    console.log(`🔧 Fixed users: ${fixedCount}`);
    console.log(`✅ Users already OK: ${users.length - fixedCount}`);
    
    // Test konkretnego użytkownika z logów
    const testUser = await User.findOne({ firebaseUid: "nJiKs1fULidGPz93jCCNiQ4zjNQ2" });
    if (testUser) {
      console.log(`\n🧪 Test user (${testUser.email}) stats:`, testUser.stats);
      console.log(`🧪 Test user favorites count:`, testUser.favorites?.length || 0);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

fixUsers();