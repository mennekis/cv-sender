/**
 * Скрипт для обработки всех писем (включая прочитанные) для алиаса
 */

require("dotenv").config();
const { google } = require("googleapis");
const Campaign = require("./models/Campaign");
const { sendEmail } = require("./services/sendgridService");
const { connectDB } = require("./services/db");
const {
   parseEmailMessage,
   extractAliasFromEmail,
} = require("./services/gmailReplyService");

const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_secret_value";
// Можно указать конкретный алиас или оставить пустым для проверки всех
const ALIAS_TO_CHECK = process.argv[2] || "";

async function processAllEmails() {
   console.log("=".repeat(60));
   if (ALIAS_TO_CHECK) {
      console.log("🔍 Обработка всех писем для алиаса:", ALIAS_TO_CHECK);
   } else {
      console.log("🔍 Обработка всех писем для всех алиасов");
   }
   console.log("=".repeat(60));
   console.log();

   try {
      await connectDB();
      console.log("✅ Подключено к MongoDB");
      console.log();

      // Проверяем кампанию
      const campaign = await Campaign.findOne({ alias: ALIAS_TO_CHECK });
      if (!campaign) {
         console.error(`❌ Кампания не найдена для алиаса: ${ALIAS_TO_CHECK}`);
         process.exit(1);
      }

      console.log("✅ Кампания найдена:");
      console.log(`   Client Name: ${campaign.clientName}`);
      console.log(
         `   Client Email: ${
            campaign.clientEmail || "не указан (будет использован ADMIN_EMAIL)"
         }`
      );
      console.log(`   Status: ${campaign.status}`);
      console.log();

      const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;
      if (!clientEmail) {
         console.error("❌ Client email не указан и ADMIN_EMAIL не установлен");
         process.exit(1);
      }

      console.log(`📧 Email для пересылки: ${clientEmail}`);
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

      // Ищем все письма за последние 24 часа (включая прочитанные)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Ищем все письма с seafarer_ в адресе (для всех алиасов)
      let query = `seafarer_ after:${Math.floor(oneDayAgo.getTime() / 1000)}`;

      // Если указан конкретный алиас, ищем только его
      if (ALIAS_TO_CHECK) {
         query = `to:${ALIAS_TO_CHECK}@your_sendgrid_api_key after:${Math.floor(
            oneDayAgo.getTime() / 1000
         )}`;
      }

      console.log(`📧 Поиск писем: ${query}`);
      console.log();

      let response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 50,
      });

      let messages = response.data.messages || [];

      // Если не найдено и указан конкретный алиас, ищем все письма с seafarer_
      if (messages.length === 0 && ALIAS_TO_CHECK) {
         console.log(
            `⚠️  Писем на ${ALIAS_TO_CHECK}@your_sendgrid_api_key не найдено`
         );
         console.log("🔍 Ищем все письма с seafarer_ в адресе...");
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
         console.log("⚠️  Писем не найдено");
         console.log();
         console.log("Попробуйте проверить:");
         console.log("1. Пришли ли письма на your_service_email@example.com");
         console.log("2. Настройки SendGrid Inbound Parse");
         console.log("3. Задержку синхронизации Gmail API");
         process.exit(0);
      }

      console.log(`📬 Найдено писем: ${messages.length}`);
      console.log();

      let processedCount = 0;

      // Обрабатываем каждое письмо
      for (const messageRef of messages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "full",
            });

            const emailData = parseEmailMessage(message.data);

            // Извлекаем alias из различных заголовков (приоритет: To, Reply-To, X-Original-To, Delivered-To, Envelope-To)
            let alias = extractAliasFromEmail(emailData.to);

            if (!alias && emailData.replyTo) {
               alias = extractAliasFromEmail(emailData.replyTo);
            }
            if (!alias && emailData.xOriginalTo) {
               alias = extractAliasFromEmail(emailData.xOriginalTo);
            }
            if (!alias && emailData.deliveredTo) {
               alias = extractAliasFromEmail(emailData.deliveredTo);
            }
            if (!alias && emailData.envelopeTo) {
               alias = extractAliasFromEmail(emailData.envelopeTo);
            }

            if (!alias) {
               console.log(`   ⚠️  Алиас не найден в заголовках письма`);
               console.log(`      To: ${emailData.to}`);
               console.log();
               continue;
            }

            // Если указан конкретный алиас, проверяем его
            if (ALIAS_TO_CHECK && alias !== ALIAS_TO_CHECK) {
               continue;
            }

            console.log(`   🔍 Найден алиас: ${alias}`);

            // Ищем кампанию для этого алиаса
            const campaign = await Campaign.findOne({ alias });
            if (!campaign) {
               console.log(`   ⚠️  Кампания не найдена для алиаса: ${alias}`);
               console.log();
               continue;
            }

            const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;
            if (!clientEmail) {
               console.log(
                  `   ⚠️  Client email не указан для кампании: ${alias}`
               );
               console.log();
               continue;
            }

            console.log("-".repeat(60));
            console.log(`📧 Обработка письма ID: ${messageRef.id}`);
            console.log(`   От: ${emailData.from}`);
            console.log(`   Кому: ${emailData.to}`);
            console.log(`   Тема: ${emailData.subject}`);
            console.log(`   Алиас: ${alias}`);
            console.log(`   Client Email: ${clientEmail}`);
            console.log();

            // Формируем тему для пересылки
            const forwardSubject = `Re: ${emailData.subject} [from ${emailData.from}]`;

            // Формируем тело письма
            const forwardBody = `
Original from: ${emailData.from}
Original date: ${emailData.date}
Original subject: ${emailData.subject}

--- Original Message ---
${emailData.html || emailData.text}
            `.trim();

            // Пересылаем письмо клиенту
            await sendEmail({
               to: clientEmail,
               from: process.env.SENDGRID_FROM || SERVICE_EMAIL,
               subject: forwardSubject,
               text: emailData.text || forwardBody,
               html: emailData.html || forwardBody.replace(/\n/g, "<br>"),
            });

            console.log(`✅ Письмо переслано на ${clientEmail}`);
            processedCount++;

            // Помечаем письмо как прочитанное
            await gmail.users.messages.modify({
               userId: "me",
               id: messageRef.id,
               requestBody: {
                  removeLabelIds: ["UNREAD"],
               },
            });

            console.log(`✅ Письмо помечено как прочитанное`);
            console.log();
         } catch (err) {
            console.error(
               `❌ Ошибка обработки письма ${messageRef.id}:`,
               err.message
            );
            console.log();
         }
      }

      console.log("=".repeat(60));
      console.log(`✅ Обработано писем: ${processedCount}`);
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

processAllEmails();
