// master-api/scripts/migrate-trial-to-free.js
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function migrateTrial() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Count users with trial subscription
    const trialCount = await User.countDocuments({ 'subscription.type': 'trial' });
    console.log(`📊 Found ${trialCount} users with trial subscription`);
    
    if (trialCount > 0) {
      // Update all trial users to free
      const result = await User.updateMany(
        { 'subscription.type': 'trial' },
        { 
          $set: { 
            'subscription.type': 'free',
            'subscription.startDate': new Date()
          },
          $unset: {
            'subscription.endDate': 1 // Remove end date for free users
          }
        }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} users from trial to free`);
    }
    
    // Verify no trial users remain
    const remainingTrial = await User.countDocuments({ 'subscription.type': 'trial' });
    console.log(`📊 Remaining trial users: ${remainingTrial}`);
    
    // Show distribution
    const distribution = await User.aggregate([
      {
        $group: {
          _id: '$subscription.type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Subscription distribution:');
    distribution.forEach(d => {
      console.log(`  ${d._id}: ${d.count} users`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Migration completed');
  }
}

// Run migration
migrateTrial();