const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
   clientName: {
      type: String,
      required: true,
   },
   alias: {
      type: String,
      required: true,
      unique: true,
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
   // Метаданные рассылки
   subject: {
      type: String,
      default: null,
   },
   body: {
      type: String,
      default: null,
   },
   text: {
      type: String,
      default: null,
   },
   senderName: {
      type: String,
      default: null,
   },
   contactPhone: {
      type: String,
      default: null,
   },
   messengers: {
      type: [String],
      default: [],
   },
   attachments: [
      {
         filename: String,
         size: Number,
         type: String,
      },
   ],
   // Статистика отправок
   successCount: {
      type: Number,
      default: 0,
   },
   errorCount: {
      type: Number,
      default: 0,
   },
   createdAt: {
      type: Date,
      default: Date.now,
   },
});

// Индексы для оптимизации запросов
CampaignSchema.index({ alias: 1 });
CampaignSchema.index({ createdAt: -1 });
CampaignSchema.index({ status: 1 });

module.exports = mongoose.model("Campaign", CampaignSchema);
