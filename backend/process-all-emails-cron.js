/**
 * Скрипт для обработки всех писем (включая прочитанные) через cron
 * Используется как резервный механизм для обработки пропущенных писем
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
const mongoose = require("mongoose");

// Схема для отслеживания обработанных писем
const ProcessedEmailSchema = new mongoose.Schema(
   {
      messageId: { type: String, required: true, unique: true },
      processedAt: { type: Date, default: Date.now, expires: 86400 },
   },
   { collection: "processed_emails" }
);

const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_secret_value";

async function processAllEmailsCron() {
   console.log("=".repeat(60));
   console.log("🔄 Cron: Обработка всех писем за последние 24 часа");
   console.log("=".repeat(60));
   console.log();

   try {
      await connectDB();
      // console.log("✅ Подключено к MongoDB"); // Для отладки
      // console.log();

      // Инициализация модели ProcessedEmail
      const ProcessedEmail =
         mongoose.models.ProcessedEmail ||
         mongoose.model("ProcessedEmail", ProcessedEmailSchema);

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
      // console.log("✅ Gmail API инициализирован"); // Для отладки
      // console.log();

      // Ищем все письма за последние 24 часа (включая прочитанные)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `seafarer_ after:${Math.floor(oneDayAgo.getTime() / 1000)}`;

      // console.log(`📧 Поиск писем: ${query}`); // Для отладки
      // console.log();

      const response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 50,
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
         // console.log("⚠️  Писем не найдено"); // Для отладки
         process.exit(0);
      }

      // console.log(`📬 Найдено писем: ${messages.length}`); // Для отладки
      // console.log();

      let processedCount = 0;
      let skippedCount = 0;

      // Обрабатываем каждое письмо
      for (const messageRef of messages) {
         try {
            // Проверяем, не было ли письмо уже обработано
            const isProcessed = await ProcessedEmail.findOne({
               messageId: messageRef.id,
            });
            if (isProcessed) {
               skippedCount++;
               continue;
            }

            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "full",
            });

            const emailData = parseEmailMessage(message.data);

            // Извлекаем alias из различных заголовков
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
               continue;
            }

            // Ищем кампанию для этого алиаса
            const campaign = await Campaign.findOne({ alias });
            if (!campaign) {
               continue;
            }

            const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;
            if (!clientEmail) {
               continue;
            }

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

            console.log(
               `✅ Письмо переслано на ${clientEmail} (alias: ${alias})`
            );

            // Помечаем письмо как обработанное
            await ProcessedEmail.findOneAndUpdate(
               { messageId: messageRef.id },
               { messageId: messageRef.id, processedAt: new Date() },
               { upsert: true }
            );

            // Помечаем письмо как прочитанное
            await gmail.users.messages.modify({
               userId: "me",
               id: messageRef.id,
               requestBody: {
                  removeLabelIds: ["UNREAD"],
               },
            });

            processedCount++;
         } catch (err) {
            console.error(
               `❌ Ошибка обработки письма ${messageRef.id}:`,
               err.message
            );
         }
      }

      console.log("=".repeat(60));
      console.log(`✅ Обработано писем: ${processedCount}`);
      console.log(`⏭️  Пропущено (уже обработано): ${skippedCount}`);
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

processAllEmailsCron();
