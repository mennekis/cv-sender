/**
 * Скрипт для миграции данных: удаление массива recipients и сохранение только recipientsCount
 * Обновляет существующие записи в MongoDB
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./services/db");
const Campaign = require("./models/Campaign");

async function migrateRecipientsToCount() {
   console.log("🔄 Миграция данных: recipients -> recipientsCount");
   console.log("=".repeat(60));
   console.log();

   try {
      await connectDB();
      console.log("✅ Подключено к MongoDB");
      console.log();

      // Находим все кампании, у которых есть поле recipients (массив)
      const campaignsWithRecipients = await Campaign.find({
         recipients: { $exists: true, $type: "array" },
      });

      console.log(
         `📊 Найдено кампаний с массивом recipients: ${campaignsWithRecipients.length}`
      );
      console.log();

      if (campaignsWithRecipients.length === 0) {
         console.log("✅ Нет кампаний для миграции");
         await mongoose.connection.close();
         process.exit(0);
      }

      let updatedCount = 0;
      let skippedCount = 0;

      // Обновляем каждую кампанию
      for (const campaign of campaignsWithRecipients) {
         try {
            const recipientsCount = Array.isArray(campaign.recipients)
               ? campaign.recipients.length
               : 0;

            // Обновляем кампанию: устанавливаем recipientsCount и удаляем recipients
            await Campaign.updateOne(
               { _id: campaign._id },
               {
                  $set: { recipientsCount },
                  $unset: { recipients: "" },
               }
            );

            updatedCount++;
            console.log(
               `✅ Обновлена кампания "${campaign.alias}": ${recipientsCount} получателей`
            );
         } catch (err) {
            console.error(
               `❌ Ошибка при обновлении кампании "${campaign.alias}":`,
               err.message
            );
            skippedCount++;
         }
      }

      console.log();
      console.log("=".repeat(60));
      console.log(`✅ Обновлено: ${updatedCount} кампаний`);
      if (skippedCount > 0) {
         console.log(`⚠️  Пропущено: ${skippedCount} кампаний`);
      }
      console.log("=".repeat(60));

      // Проверяем результат
      const remainingWithRecipients = await Campaign.countDocuments({
         recipients: { $exists: true },
      });

      if (remainingWithRecipients > 0) {
         console.log();
         console.log(
            `⚠️  Внимание: осталось ${remainingWithRecipients} кампаний с полем recipients`
         );
      } else {
         console.log();
         console.log("✅ Все кампании успешно мигрированы!");
      }
   } catch (error) {
      console.error();
      console.error("=".repeat(60));
      console.error("❌ Ошибка миграции:");
      console.error("=".repeat(60));
      console.error(error.message);
      if (error.stack) {
         console.error();
         console.error("Stack trace:");
         console.error(error.stack);
      }
      process.exit(1);
   } finally {
      await mongoose.connection.close();
      process.exit(0);
   }
}

migrateRecipientsToCount();
