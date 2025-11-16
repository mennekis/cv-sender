/**
 * Детальный тестовый скрипт для проверки пересылки почты
 * Проверяет все письма за последний час, включая прочитанные
 *
 * Использование:
 *   node test-email-forward-detailed.js
 */

require("dotenv").config();
const { google } = require("googleapis");
const Campaign = require("./models/Campaign");
const { sendEmail } = require("./services/sendgridService");
const { connectDB } = require("./services/db");

const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_secret_value";

async function testEmailForwardDetailed() {
   console.log("=".repeat(60));
   console.log("🔍 Детальная проверка почты");
   console.log("=".repeat(60));
   console.log();

   // Проверка переменных окружения
   if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.error("❌ GMAIL_REFRESH_TOKEN не установлен в .env");
      process.exit(1);
   }

   try {
      // Подключение к БД
      await connectDB();
      console.log("✅ Подключено к MongoDB");
      console.log();

      // Инициализация Gmail API
      const oauth2Client = new google.auth.OAuth2(
         process.env.GMAIL_CLIENT_ID,
         process.env.GMAIL_CLIENT_SECRET,
         process.env.GMAIL_REDIRECT_URI ||
            "http://localhost:3000/api/auth/google/callback"
      );

      oauth2Client.setCredentials({
         refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      console.log("✅ Gmail API инициализирован");
      console.log();

      // Проверяем письма за последние 24 часа (включая прочитанные)
      // Ищем письма, которые содержат alias в адресе получателя
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Сначала ищем по служебному ящику
      let query = `to:${SERVICE_EMAIL} after:${Math.floor(
         oneDayAgo.getTime() / 1000
      )}`;

      console.log(`📧 Поиск писем: ${query}`);
      console.log();

      let response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 50,
      });

      let messages = response.data.messages || [];

      // Если не найдено, ищем все письма с seafarer_ в адресе
      if (messages.length === 0) {
         console.log("⚠️  Писем на your_service_email@example.com не найдено");
         console.log("🔍 Ищем письма с seafarer_ в адресе...");
         console.log();

         query = `seafarer_ after:${Math.floor(oneDayAgo.getTime() / 1000)}`;
         console.log(`📧 Расширенный поиск: ${query}`);
         console.log();

         response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 50,
         });

         messages = response.data.messages || [];
      }

      if (messages.length === 0) {
         console.log("⚠️  Писем не найдено за последние 24 часа");
         console.log();
         console.log("Возможные причины:");
         console.log("1. Письмо еще не попало на your_service_email@example.com");
         console.log("2. Задержка в SendGrid Inbound Parse");
         console.log("3. Письмо отправлено не на правильный адрес");
         console.log("4. SendGrid Inbound Parse не настроен");
         process.exit(0);
      }

      console.log(`📬 Найдено писем: ${messages.length}`);
      console.log();

      // Обрабатываем каждое письмо
      for (const messageRef of messages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "full",
            });

            const headers = message.data.payload.headers;
            const subject =
               headers.find((h) => h.name === "Subject")?.value || "";
            const from = headers.find((h) => h.name === "From")?.value || "";
            const to = headers.find((h) => h.name === "To")?.value || "";
            const date = headers.find((h) => h.name === "Date")?.value || "";

            const labelIds = message.data.labelIds || [];
            const isUnread = !labelIds.includes("UNREAD");

            console.log("-".repeat(60));
            console.log(`📧 Письмо ID: ${messageRef.id}`);
            console.log(`   От: ${from}`);
            console.log(`   Кому: ${to}`);
            console.log(`   Тема: ${subject}`);
            console.log(`   Дата: ${date}`);
            console.log(
               `   Статус: ${isUnread ? "✅ Прочитано" : "📬 Непрочитано"}`
            );
            console.log();

            // Извлекаем alias
            const aliasMatch = to.match(/^(seafarer_[^@]+)@seafarer-cv\.com$/i);
            if (!aliasMatch) {
               console.log("   ⚠️  Алиас не найден в адресе получателя");
               console.log();
               continue;
            }

            const alias = aliasMatch[1];
            console.log(`   🔍 Найден алиас: ${alias}`);

            // Ищем кампанию
            const campaign = await Campaign.findOne({ alias });
            if (!campaign) {
               console.log(`   ⚠️  Кампания не найдена для алиаса: ${alias}`);
               console.log();
               continue;
            }

            console.log(`   ✅ Кампания найдена: ${campaign.clientName}`);
            const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;
            console.log(`   📧 Email клиента: ${clientEmail}`);

            if (isUnread) {
               console.log("   ℹ️  Письмо уже обработано (прочитано)");
            } else {
               console.log("   🔄 Письмо требует обработки...");
            }
            console.log();
         } catch (err) {
            console.error(
               `   ❌ Ошибка обработки письма ${messageRef.id}:`,
               err.message
            );
            console.log();
         }
      }

      console.log("=".repeat(60));
      console.log("✅ Проверка завершена");
      console.log("=".repeat(60));
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

testEmailForwardDetailed();
