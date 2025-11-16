/**
 * Тестовый скрипт для проверки заголовков Reply писем
 * Показывает все заголовки письма для анализа
 */

require("dotenv").config();
const { google } = require("googleapis");
const { connectDB } = require("./services/db");
const {
   parseEmailMessage,
   extractAliasFromEmail,
} = require("./services/gmailReplyService");

async function testReplyHeaders() {
   console.log("=".repeat(60));
   console.log("🔍 Тест заголовков Reply писем");
   console.log("=".repeat(60));
   console.log();

   try {
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

      // Ищем письма с "Re:" в теме (Reply письма)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `seafarer_ subject:"Re:" after:${Math.floor(
         oneDayAgo.getTime() / 1000
      )}`;

      console.log(`📧 Поиск Reply писем: ${query}`);
      console.log();

      const response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 10,
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
         console.log("⚠️  Reply писем не найдено");
         console.log("Попробуем найти любые письма с seafarer_...");
         console.log();

         const query2 = `seafarer_ after:${Math.floor(
            oneDayAgo.getTime() / 1000
         )}`;
         const response2 = await gmail.users.messages.list({
            userId: "me",
            q: query2,
            maxResults: 5,
         });

         const messages2 = response2.data.messages || [];
         if (messages2.length === 0) {
            console.log("⚠️  Писем не найдено");
            process.exit(0);
         }
         messages.push(...messages2);
      }

      console.log(`📬 Найдено писем: ${messages.length}`);
      console.log();

      // Анализируем каждое письмо
      for (const messageRef of messages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "full",
            });

            const headers = message.data.payload.headers;
            const emailData = parseEmailMessage(message.data);

            console.log("=".repeat(60));
            console.log(`📧 Письмо ID: ${messageRef.id}`);
            console.log(`   Тема: ${emailData.subject}`);
            console.log(`   От: ${emailData.from}`);
            console.log();

            // Показываем все заголовки, связанные с адресами
            console.log("📋 Заголовки письма:");
            const relevantHeaders = [
               "To",
               "From",
               "Reply-To",
               "Return-Path",
               "X-Original-To",
               "Delivered-To",
               "Envelope-To",
               "References",
               "In-Reply-To",
               "Message-ID",
            ];

            relevantHeaders.forEach((headerName) => {
               const header = headers.find((h) => h.name === headerName);
               if (header) {
                  console.log(`   ${headerName}: ${header.value}`);
               }
            });

            console.log();

            // Пытаемся извлечь алиас из всех заголовков
            console.log("🔍 Поиск алиаса:");
            let alias = extractAliasFromEmail(emailData.to);
            console.log(`   To: ${emailData.to} → ${alias || "не найден"}`);

            if (!alias && emailData.replyTo) {
               alias = extractAliasFromEmail(emailData.replyTo);
               console.log(
                  `   Reply-To: ${emailData.replyTo} → ${alias || "не найден"}`
               );
            }

            if (!alias && emailData.xOriginalTo) {
               alias = extractAliasFromEmail(emailData.xOriginalTo);
               console.log(
                  `   X-Original-To: ${emailData.xOriginalTo} → ${
                     alias || "не найден"
                  }`
               );
            }

            if (!alias && emailData.deliveredTo) {
               alias = extractAliasFromEmail(emailData.deliveredTo);
               console.log(
                  `   Delivered-To: ${emailData.deliveredTo} → ${
                     alias || "не найден"
                  }`
               );
            }

            if (!alias && emailData.envelopeTo) {
               alias = extractAliasFromEmail(emailData.envelopeTo);
               console.log(
                  `   Envelope-To: ${emailData.envelopeTo} → ${
                     alias || "не найден"
                  }`
               );
            }

            // Проверяем другие заголовки
            const returnPath = headers.find(
               (h) => h.name === "Return-Path"
            )?.value;
            if (!alias && returnPath) {
               alias = extractAliasFromEmail(returnPath);
               console.log(
                  `   Return-Path: ${returnPath} → ${alias || "не найден"}`
               );
            }

            if (alias) {
               console.log(`   ✅ Алиас найден: ${alias}`);
            } else {
               console.log(`   ❌ Алиас не найден ни в одном заголовке`);
            }

            console.log();
         } catch (err) {
            console.error(`❌ Ошибка обработки письма: ${err.message}`);
            console.log();
         }
      }

      console.log("=".repeat(60));
      console.log("✅ Анализ завершен");
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

testReplyHeaders();
