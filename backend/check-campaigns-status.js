/**
 * Скрипт для проверки статуса всех рассылок
 * Определяет, можно ли безопасно делать деплой на VPS
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./services/db");
const Campaign = require("./models/Campaign");
const constants = require("./config/constants");

async function checkCampaignsStatus() {
   console.log("🔍 Проверка статуса всех рассылок...");
   console.log("=".repeat(60));
   console.log();

   try {
      await connectDB();

      // Получаем статистику по статусам
      const totalCampaigns = await Campaign.countDocuments();
      const pendingCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.PENDING,
      });
      const sendingCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.SENDING,
      });
      const completedCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.COMPLETED,
      });

      console.log("📊 Общая статистика:");
      console.log(`   Всего кампаний: ${totalCampaigns}`);
      console.log(`   ✅ Завершено (completed): ${completedCampaigns}`);
      console.log(`   ⏳ Ожидают отправки (pending): ${pendingCampaigns}`);
      console.log(`   📤 В процессе отправки (sending): ${sendingCampaigns}`);
      console.log();

      // Проверяем незавершенные кампании
      const activeCampaigns = await Campaign.find({
         status: {
            $in: [
               constants.CAMPAIGN_STATUS.PENDING,
               constants.CAMPAIGN_STATUS.SENDING,
            ],
         },
      })
         .sort({ createdAt: -1 })
         .select(
            "clientName alias status recipientsCount successCount errorCount createdAt"
         );

      if (activeCampaigns.length > 0) {
         console.log("⚠️  НАЙДЕНЫ НЕЗАВЕРШЕННЫЕ РАССЫЛКИ:");
         console.log("=".repeat(60));
         activeCampaigns.forEach((campaign, index) => {
            const statusIcon =
               campaign.status === constants.CAMPAIGN_STATUS.SENDING
                  ? "📤"
                  : "⏳";
            console.log(
               `   ${index + 1}. ${statusIcon} ${campaign.clientName} (${
                  campaign.alias
               })`
            );
            console.log(`      Статус: ${campaign.status}`);
            console.log(
               `      Получателей: ${
                  campaign.recipientsCount || 0
               } | Успешно: ${campaign.successCount || 0} | Ошибок: ${
                  campaign.errorCount || 0
               }`
            );
            console.log(`      Создано: ${campaign.createdAt.toISOString()}`);
            console.log();
         });
      } else {
         console.log("✅ Все рассылки завершены!");
         console.log();
      }

      // Проверяем кампании в статусе "sending" - они могут быть "зависшими"
      const stuckCampaigns = await Campaign.find({
         status: constants.CAMPAIGN_STATUS.SENDING,
      })
         .sort({ createdAt: -1 })
         .select("clientName alias createdAt");

      if (stuckCampaigns.length > 0) {
         console.log("🔴 ВНИМАНИЕ: Найдены кампании в статусе 'sending':");
         console.log("=".repeat(60));
         stuckCampaigns.forEach((campaign, index) => {
            const hoursAgo = Math.floor(
               (Date.now() - campaign.createdAt.getTime()) / (1000 * 60 * 60)
            );
            console.log(
               `   ${index + 1}. ${campaign.clientName} (${campaign.alias})`
            );
            console.log(
               `      В статусе 'sending' уже ${hoursAgo} часов (создано: ${campaign.createdAt.toISOString()})`
            );
            console.log();
         });
         console.log(
            "   💡 Рекомендация: Проверьте логи и процессы. Возможно, рассылка зависла."
         );
         console.log();
      }

      // Итоговая рекомендация
      console.log("=".repeat(60));
      console.log("🎯 РЕКОМЕНДАЦИЯ ПО ДЕПЛОЮ:");
      console.log("=".repeat(60));

      if (activeCampaigns.length === 0) {
         console.log("✅ ВСЕ РАССЫЛКИ ЗАВЕРШЕНЫ");
         console.log("✅ Можно безопасно делать деплой на VPS");
         console.log();
      } else {
         console.log("⚠️  ОБНАРУЖЕНЫ АКТИВНЫЕ РАССЫЛКИ");
         console.log(
            `   Найдено ${activeCampaigns.length} незавершенных кампаний:`
         );
         console.log(
            `   - ${pendingCampaigns} в статусе 'pending' (ожидают отправки)`
         );
         console.log(
            `   - ${sendingCampaigns} в статусе 'sending' (в процессе отправки)`
         );
         console.log();
         console.log("❌ НЕ РЕКОМЕНДУЕТСЯ делать деплой сейчас");
         console.log(
            "   Дождитесь завершения всех рассылок или проверьте их статус"
         );
         console.log();
      }

      // Дополнительная информация о последних кампаниях
      const recentCampaigns = await Campaign.find({})
         .sort({ createdAt: -1 })
         .limit(5)
         .select(
            "clientName alias status recipientsCount successCount errorCount createdAt"
         );

      console.log("📋 Последние 5 кампаний:");
      recentCampaigns.forEach((campaign, index) => {
         const statusIcon =
            campaign.status === constants.CAMPAIGN_STATUS.COMPLETED
               ? "✅"
               : campaign.status === constants.CAMPAIGN_STATUS.SENDING
               ? "📤"
               : "⏳";
         console.log(
            `   ${index + 1}. ${statusIcon} ${campaign.clientName} (${
               campaign.alias
            }) - ${campaign.status}`
         );
      });
      console.log();
   } catch (error) {
      console.error("❌ Ошибка:", error.message);
      console.error(error);
      process.exit(1);
   } finally {
      await mongoose.connection.close();
      process.exit(0);
   }
}

checkCampaignsStatus();
