const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  displayName: String,
  photoURL: String,
  subscription: {
    type: {
      type: String,
      enum: ['free', 'trial', 'premium'],
      default: 'trial'
    },
    expiresAt: Date,
    trialStartedAt: {
      type: Date,
      default: Date.now
    }
  },
  preferences: {
    language: {
      type: String,
      enum: ['pl', 'en'],
      default: 'pl'
    },
    favoriteSpirits: [String],
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner'
    }
  },
  stats: {
    totalScans: { type: Number, default: 0 },
    totalRecipes: { type: Number, default: 0 },
    totalFavorites: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

userSchema.methods.isTrialExpired = function() {
  if (this.subscription.type !== 'trial') return false;
  const trialDays = 3;
  const expiryDate = new Date(this.subscription.trialStartedAt);
  expiryDate.setDate(expiryDate.getDate() + trialDays);
  return new Date() > expiryDate;
};

module.exports = mongoose.model('User', userSchema);
