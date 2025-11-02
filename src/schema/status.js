const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 128
  },
  type: {
    type: String,
    required: true,
    enum: ['Playing', 'Streaming', 'Listening', 'Watching', 'Custom', 'Competing']
  },
  url: {
    type: String,
    default: null // Only used for streaming type
  },
  status: {
    type: String,
    default: 'online',
    enum: ['online', 'idle', 'dnd', 'invisible']
  },
  enabled: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
statusSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Status', statusSchema);