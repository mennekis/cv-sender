const mongoose = require("mongoose");

/**
 * Подключение к MongoDB через Mongoose
 * Использует переменную окружения MONGO_URI
 */
async function connectDB() {
   try {
      // В Mongoose 8.x useNewUrlParser и useUnifiedTopology включены по умолчанию
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected");
   } catch (err) {
      console.error("❌ MongoDB connection error:", err.message);
      process.exit(1);
   }
}

module.exports = { connectDB };
