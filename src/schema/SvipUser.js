const mongoose = require("mongoose");

const svipUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  boostCount: { type: Number, default: 0 },
  boostStartDate: { type: Date, default: null },
  lastBoostUpdate: { type: Date, default: Date.now },
  graceExpirationDate: { type: Date, default: null }, // 7-day grace period when boost is removed
  hasCustomRole: { type: Boolean, default: false },
  customRoleId: { type: String, default: null },
  notificationsSent: {
    graceWarning: { type: Boolean, default: false },
    finalWarning: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SvipUser", svipUserSchema);
