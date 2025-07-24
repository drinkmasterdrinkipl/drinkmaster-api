const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
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
  bottleInfo: {
    name: String,
    brand: String,
    type: String,
    alcoholContent: Number,
    country: String,
    description: String,
    servingSuggestions: [String],
    cocktailSuggestions: [String]
  },
  imageData: String,
  aiResponse: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

scanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Scan', scanSchema);
