const mongoose = require("mongoose");

/**
 * Подключение к MongoDB через Mongoose
 * Использует переменную окружения MONGO_URI
 */
async function connectDB() {
   try {
      await mongoose.connect(process.env.MONGO_URI, {
         useNewUrlParser: true,
         useUnifiedTopology: true,
      });
      console.log("✅ MongoDB connected");
   } catch (err) {
      console.error("❌ MongoDB connection error:", err.message);
      process.exit(1);
   }
}

module.exports = { connectDB };
