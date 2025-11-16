/**
 * Диагностический скрипт для проверки почему письма не пересылаются
 * Показывает все письма и их статус обработки
 */

require("dotenv").config();
const { google } = require("googleapis");
const Campaign = require("./models/Campaign");
const { connectDB } = require("./services/db");
const {
   parseEmailMessage,
   extractAliasFromEmail,
} = require("./services/gmailReplyService");

async function diagnoseEmailIssue() {
   console.log("=".repeat(60));
   console.log("🔍 Диагностика проблемы с пересылкой писем");
   console.log("=".repeat(60));
   console.log();

   try {
      await connectDB();
      console.log("✅ Подключено к MongoDB");
      console.log();

      // Проверка переменных окружения
      console.log("📋 Проверка переменных окружения:");
      console.log(
         `   ENABLE_GMAIL_REPLY_CHECKER: ${
            process.env.ENABLE_GMAIL_REPLY_CHECKER || "не установлен"
         }`
      );
      console.log(
         `   GMAIL_REFRESH_TOKEN: ${
            process.env.GMAIL_REFRESH_TOKEN
               ? "✅ установлен"
               : "❌ не установлен"
         }`
      );
      console.log(
         `   GMAIL_CLIENT_ID: ${
            process.env.GMAIL_CLIENT_ID ? "✅ установлен" : "❌ не установлен"
         }`
      );
      console.log(
         `   GMAIL_CLIENT_SECRET: ${
            process.env.GMAIL_CLIENT_SECRET
               ? "✅ установлен"
               : "❌ не установлен"
         }`
      );
      console.log();

      // Инициализация Gmail API
      const oauth2Client = new google.auth.OAuth2(
         process.env.GMAIL_CLIENT_ID,
         process.env.GMAIL_CLIENT_SECRET,
         process.env.GMAIL_REDIRECT_URI ||
            "http://localhost:3000/api/auth/google/callback"
      );

      if (!process.env.GMAIL_REFRESH_TOKEN) {
         console.error("❌ GMAIL_REFRESH_TOKEN не установлен");
         process.exit(1);
      }

      oauth2Client.setCredentials({
         refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      console.log("✅ Gmail API инициализирован");
      console.log();

      // Ищем все письма за последние 7 дней (включая прочитанные)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Пробуем разные варианты поиска
      const queries = [
         {
            name: "Поиск по to:seafarer_@your_sendgrid_api_key (непрочитанные)",
            query: `to:seafarer_@your_sendgrid_api_key after:${Math.floor(
               sevenDaysAgo.getTime() / 1000
            )} is:unread`,
         },
         {
            name: "Поиск по to:seafarer_@your_sendgrid_api_key (все)",
            query: `to:seafarer_@your_sendgrid_api_key after:${Math.floor(
               sevenDaysAgo.getTime() / 1000
            )}`,
         },
         {
            name: "Поиск по seafarer_ (все)",
            query: `seafarer_ after:${Math.floor(
               sevenDaysAgo.getTime() / 1000
            )}`,
         },
         {
            name: "Поиск всех писем за последние 7 дней",
            query: `after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`,
         },
      ];

      let allMessages = [];
      const messageMap = new Map();

      for (const { name, query } of queries) {
         console.log(`📧 ${name}:`);
         console.log(`   Запрос: ${query}`);
         try {
            const response = await gmail.users.messages.list({
               userId: "me",
               q: query,
               maxResults: 50,
            });

            const messages = response.data.messages || [];
            console.log(`   Найдено: ${messages.length} писем`);

            // Добавляем уникальные сообщения
            for (const msg of messages) {
               if (!messageMap.has(msg.id)) {
                  messageMap.set(msg.id, msg);
                  allMessages.push(msg);
               }
            }
            console.log();
         } catch (err) {
            console.error(`   ❌ Ошибка: ${err.message}`);
            console.log();
         }
      }

      if (allMessages.length === 0) {
         console.log("⚠️  Писем не найдено ни одним из запросов");
         console.log();
         console.log("Возможные причины:");
         console.log("1. Письма еще не пришли на your_secret_value");
         console.log("2. Письма старше 7 дней");
         console.log("3. Письма не содержат 'seafarer_' в адресе");
         process.exit(0);
      }

      console.log(`📬 Всего найдено уникальных писем: ${allMessages.length}`);
      console.log();
      console.log("=".repeat(60));
      console.log("Детальная информация о письмах:");
      console.log("=".repeat(60));
      console.log();

      // Получаем все кампании из MongoDB
      const campaigns = await Campaign.find({});
      const aliasMap = new Map();
      campaigns.forEach((c) => {
         aliasMap.set(c.alias, c);
      });

      console.log(`📋 Найдено кампаний в MongoDB: ${campaigns.length}`);
      if (campaigns.length > 0) {
         console.log("   Алиасы:");
         campaigns.forEach((c) => {
            console.log(
               `      - ${c.alias} -> ${
                  c.clientEmail || process.env.ADMIN_EMAIL || "не указан"
               }`
            );
         });
      }
      console.log();

      let processedCount = 0;
      let unreadCount = 0;
      let aliasNotFoundCount = 0;
      let campaignNotFoundCount = 0;
      let noClientEmailCount = 0;

      // Обрабатываем каждое письмо
      for (const messageRef of allMessages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "full",
            });

            const emailData = parseEmailMessage(message.data);
            const labelIds = message.data.labelIds || [];
            const isUnread = labelIds.includes("UNREAD");

            console.log("-".repeat(60));
            console.log(`📧 Письмо ID: ${messageRef.id}`);
            console.log(`   От: ${emailData.from}`);
            console.log(`   Кому: ${emailData.to}`);
            console.log(`   Тема: ${emailData.subject}`);
            console.log(`   Дата: ${emailData.date}`);
            console.log(
               `   Статус: ${isUnread ? "📬 Непрочитано" : "✅ Прочитано"}`
            );

            // Проверяем все заголовки для поиска алиаса
            const headers = message.data.payload.headers;
            const allToHeaders = headers.filter(
               (h) => h.name.toLowerCase() === "to"
            );
            const allCcHeaders = headers.filter(
               (h) => h.name.toLowerCase() === "cc"
            );
            const allReplyToHeaders = headers.filter(
               (h) => h.name.toLowerCase() === "reply-to"
            );

            console.log(`   Заголовок To: ${emailData.to}`);
            if (allToHeaders.length > 1) {
               console.log(`   ⚠️  Найдено несколько заголовков To:`);
               allToHeaders.forEach((h) => console.log(`      - ${h.value}`));
            }
            if (allCcHeaders.length > 0) {
               console.log(
                  `   Cc: ${allCcHeaders.map((h) => h.value).join(", ")}`
               );
            }
            if (allReplyToHeaders.length > 0) {
               console.log(
                  `   Reply-To: ${allReplyToHeaders
                     .map((h) => h.value)
                     .join(", ")}`
               );
            }

            // Извлекаем алиас
            const alias = extractAliasFromEmail(emailData.to);

            if (!alias) {
               console.log(`   ❌ Алиас не найден в адресе: ${emailData.to}`);
               console.log(
                  `   ⚠️  Письмо не будет обработано автоматическим checker'ом`
               );
               aliasNotFoundCount++;
               console.log();
               continue;
            }

            console.log(`   ✅ Найден алиас: ${alias}`);

            // Ищем кампанию
            const campaign = await Campaign.findOne({ alias });
            if (!campaign) {
               console.log(`   ❌ Кампания не найдена для алиаса: ${alias}`);
               console.log(`   ⚠️  Письмо не будет переслано`);
               campaignNotFoundCount++;
               console.log();
               continue;
            }

            console.log(`   ✅ Кампания найдена:`);
            console.log(`      Client Name: ${campaign.clientName}`);
            console.log(
               `      Client Email: ${
                  campaign.clientEmail || process.env.ADMIN_EMAIL || "не указан"
               }`
            );

            const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;
            if (!clientEmail) {
               console.log(
                  `   ❌ Client email не указан и ADMIN_EMAIL не установлен`
               );
               console.log(`   ⚠️  Письмо не будет переслано`);
               noClientEmailCount++;
               console.log();
               continue;
            }

            if (!isUnread) {
               console.log(
                  `   ⚠️  Письмо уже прочитано - автоматический checker его пропустит`
               );
               console.log(
                  `   💡 Используйте process-all-emails.js для обработки прочитанных писем`
               );
            } else {
               console.log(
                  `   ✅ Письмо непрочитано - будет обработано автоматическим checker'ом`
               );
               unreadCount++;
            }

            processedCount++;
            console.log();
         } catch (err) {
            console.error(`   ❌ Ошибка обработки письма: ${err.message}`);
            console.log();
         }
      }

      console.log("=".repeat(60));
      console.log("📊 Статистика:");
      console.log("=".repeat(60));
      console.log(`   Всего писем: ${allMessages.length}`);
      console.log(`   ✅ Могут быть обработаны: ${processedCount}`);
      console.log(`   📬 Непрочитанных: ${unreadCount}`);
      console.log(`   ❌ Алиас не найден: ${aliasNotFoundCount}`);
      console.log(`   ❌ Кампания не найдена: ${campaignNotFoundCount}`);
      console.log(`   ❌ Client email не указан: ${noClientEmailCount}`);
      console.log();

      if (unreadCount === 0 && processedCount > 0) {
         console.log("⚠️  ВНИМАНИЕ: Все письма уже прочитаны!");
         console.log(
            "   Автоматический checker обрабатывает только непрочитанные письма."
         );
         console.log("   Запустите: node process-all-emails.js [alias]");
         console.log();
      }

      if (process.env.ENABLE_GMAIL_REPLY_CHECKER !== "true") {
         console.log(
            "⚠️  ВНИМАНИЕ: ENABLE_GMAIL_REPLY_CHECKER не установлен в 'true'"
         );
         console.log("   Автоматический checker не запущен!");
         console.log("   Добавьте в .env: ENABLE_GMAIL_REPLY_CHECKER=true");
         console.log();
      }
   } catch (error) {
      console.error();
      console.error("=".repeat(60));
      console.error("❌ Ошибка:");
      console.error("=".repeat(60));
      console.error(error.message);
      if (error.stack) {
         console.error();
         console.error("Stack trace:");
         console.error(error.stack);
      }
      process.exit(1);
   } finally {
      process.exit(0);
   }
}

diagnoseEmailIssue();
