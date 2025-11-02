const { Schema, model } = require("mongoose");

/**
 * Schema for storing the permanent SVIP menu message ID
 */
const SvipMenuMessageSchema = new Schema({
  messageId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = model("SvipMenuMessage", SvipMenuMessageSchema);
