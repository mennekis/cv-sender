const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
   clientName: {
      type: String,
      required: true,
   },
   alias: {
      type: String,
      required: true,
   },
   clientEmail: {
      type: String,
      default: null,
   },
   recipients: {
      type: [String],
      default: [],
   },
   status: {
      type: String,
      enum: ["pending", "sending", "completed"],
      default: "pending",
   },
   createdAt: {
      type: Date,
      default: Date.now,
   },
});

module.exports = mongoose.model("Campaign", CampaignSchema);
