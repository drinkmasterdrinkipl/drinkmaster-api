const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const User = require('./models/User');

async function fixStats() {
  try {
    console.log('🔄 Fixing stats for chwascinski@icloud.com...');
    
    const user = await User.findOne({ email: "chwascinski@icloud.com" });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('Current stats:', JSON.stringify(user.stats, null, 2));
    
    // Popraw statystyki
    user.stats.totalHomeBarAnalyses = user.stats.totalHomeBarAnalyses || 0;
    user.stats.totalRecipes = 12; // Przywróć właściwą wartość
    
    await user.save();
    
    console.log('✅ Fixed! New stats:', JSON.stringify(user.stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStats();
