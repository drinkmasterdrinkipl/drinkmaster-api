const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  ingredients: [{
    name: String,
    amount: String,
    unit: String
  }],
  instructions: [String],
  glassType: String,
  method: String,
  garnish: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: String,
  isFavorite: {
    type: Boolean,
    default: false
  },
  aiResponse: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

recipeSchema.index({ userId: 1, isFavorite: 1, createdAt: -1 });
recipeSchema.index({ userId: 1, name: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
