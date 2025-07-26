// migrate-stats.js - uruchom w folderze master-api
const mongoose = require('mongoose');
require('dotenv').config();

// Połącz z MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drinkmaster');

const User = require('./models/User');

async function migrateStats() {
  try {
    console.log('🔄 Starting stats migration...');
    
    // Znajdź wszystkich użytkowników
    const users = await User.find({});
    
    for (const user of users) {
      let updated = false;
      
      // Sprawdź czy ma stare pole totalMyBar
      if (user.stats && typeof user.stats.totalMyBar !== 'undefined') {
        // Przenieś wartość do nowego pola
        user.stats.totalHomeBarAnalyses = user.stats.totalMyBar || 0;
        
        // Usuń stare pole
        user.stats.totalMyBar = undefined;
        
        updated = true;
        console.log(`✅ Migrated stats for ${user.email}: totalMyBar -> totalHomeBarAnalyses (${user.stats.totalHomeBarAnalyses})`);
      }
      
      // Upewnij się, że wszystkie pola istnieją
      if (!user.stats.totalHomeBarAnalyses) {
        user.stats.totalHomeBarAnalyses = 0;
        updated = true;
      }
      
      if (updated) {
        await user.save();
        console.log(`✅ Updated user: ${user.email}`);
      }
    }
    
    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateStats();
