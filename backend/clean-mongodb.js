/**
 * Скрипт для разовой очистки MongoDB
 * Удаляет все данные из коллекций campaigns и processed_emails
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./services/db");
const Campaign = require("./models/Campaign");

async function cleanMongoDB() {
   console.log("🧹 Очистка MongoDB...");
   console.log();

   try {
      await connectDB();
      const db = mongoose.connection.db;

      // Показываем статистику до очистки
      const campaignsCount = await Campaign.countDocuments();
      let processedEmailsCount = 0;
      try {
         const processedEmailsCollection = db.collection("processed_emails");
         processedEmailsCount =
            await processedEmailsCollection.countDocuments();
      } catch (err) {
         // Коллекция может не существовать
      }

      console.log(`📊 Найдено:`);
      console.log(`   - campaigns: ${campaignsCount} документов`);
      console.log(`   - processed_emails: ${processedEmailsCount} документов`);
      console.log();

      if (campaignsCount === 0 && processedEmailsCount === 0) {
         console.log("✅ База данных уже пуста.");
         await mongoose.connection.close();
         process.exit(0);
      }

      // Удаляем все кампании
      if (campaignsCount > 0) {
         const deleteResult = await Campaign.deleteMany({});
         console.log(`✅ Удалено ${deleteResult.deletedCount} кампаний`);
      }

      // Удаляем все обработанные письма
      if (processedEmailsCount > 0) {
         const processedEmailsCollection = db.collection("processed_emails");
         const deleteResult = await processedEmailsCollection.deleteMany({});
         console.log(
            `✅ Удалено ${deleteResult.deletedCount} записей processed_emails`
         );
      }

      console.log();
      console.log("✅ MongoDB очищена!");
   } catch (error) {
      console.error("❌ Ошибка:", error.message);
      process.exit(1);
   } finally {
      await mongoose.connection.close();
      process.exit(0);
   }
}

cleanMongoDB();
