const mongoose = require('mongoose');

const CustomRoleMessageSchema = new mongoose.Schema({
    messageId: {
    type: String,
    required: true,
  },
});


module.exports = mongoose.model('CustomRoleMessage', CustomRoleMessageSchema);