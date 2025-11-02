const mongoose = require("mongoose");

const customRoleSchema = new mongoose.Schema({
  roleId: { type: String, required: true },
  roleName: String,
  roleColor: String,
  roleIcon: String,
  ownerId: String,
  admins: [{ type: String }], // SVIP admins who can manage the role
  trialUsers: [
    {
      userId: String,
      expiration: Date,
      addedBy: String, // Who added this trial user
      addedAt: { type: Date, default: Date.now }
    },
  ],
  permanentUsers: [
    {
      userId: String,
      addedBy: String, // Who added this permanent user
      addedAt: { type: Date, default: Date.now }
    },
  ],
  expirationDate: { type: Date, default: null },
  voiceChannelId: { type: String, default: null },
  expirationDateVoice: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  lastBoostCheck: { type: Date, default: Date.now },
  graceExpirationDate: { type: Date, default: null }, // 7-day grace period
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("customRole", customRoleSchema);
