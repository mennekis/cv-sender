const { google } = require("googleapis");
const Campaign = require("../models/Campaign");
const { sendEmail } = require("./sendgridService");

// Настройка Gmail API
const SCOPES = [
   "https://www.googleapis.com/auth/gmail.readonly",
   "https://www.googleapis.com/auth/gmail.modify", // Для пометки писем как прочитанных
];
const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_service_email@example.com";
const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 часов в миллисекундах

let gmail = null;
let checkInterval = null;

/**
 * Инициализация Gmail API
 */
async function initGmail() {
   try {
      // Приоритет 1: OAuth2 с Client ID/Secret и Refresh Token
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
         const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI ||
               "http://localhost:3000/api/auth/google/callback"
         );

         // Если есть refresh token, используем его для автоматического обновления
         if (process.env.GMAIL_REFRESH_TOKEN) {
            oauth2Client.setCredentials({
               refresh_token: process.env.GMAIL_REFRESH_TOKEN,
            });

            // Автоматически обновляем access token при необходимости
            try {
               const { credentials } = await oauth2Client.refreshAccessToken();
               oauth2Client.setCredentials(credentials);
               console.log("✅ Access token refreshed successfully");
            } catch (refreshError) {
               console.warn(
                  "⚠️  Failed to refresh access token:",
                  refreshError.message
               );
               // Продолжаем с refresh_token, библиотека обновит токен автоматически при необходимости
            }
         } else if (process.env.GMAIL_ACCESS_TOKEN) {
            // Fallback: используем access token напрямую (временное решение)
            oauth2Client.setCredentials({
               access_token: process.env.GMAIL_ACCESS_TOKEN,
            });
            console.warn(
               "⚠️  Using access token directly. Consider using refresh token for automatic renewal."
            );
         } else {
            throw new Error(
               "GMAIL_REFRESH_TOKEN or GMAIL_ACCESS_TOKEN required when using OAuth2"
            );
         }

         gmail = google.gmail({ version: "v1", auth: oauth2Client });
      }
      // Приоритет 2: Service Account
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
         const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
            scopes: SCOPES,
         });
         gmail = google.gmail({ version: "v1", auth });
      } else {
         throw new Error(
            "Gmail authentication not configured. Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or GOOGLE_SERVICE_ACCOUNT_KEY_FILE"
         );
      }

      console.log("✅ Gmail API initialized");
   } catch (err) {
      console.error("❌ Failed to initialize Gmail API:", err.message);
      throw err;
   }
}

/**
 * Извлекает alias из email адреса
 * @param {string} email - Email адрес вида seafarer_X@your_sendgrid_api_key
 * @returns {string|null} - Извлеченный alias или null
 */
function extractAliasFromEmail(email) {
   if (!email || typeof email !== "string") return null;

   // Ищем паттерн seafarer_*@your_sendgrid_api_key
   const match = email.match(/^(seafarer_[^@]+)@seafarer-cv\.com$/i);
   return match ? match[1] : null;
}

/**
 * Получает список непрочитанных писем за последние 12 часов
 */
async function getUnreadEmails() {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      // Получаем письма за последние 12 часов
      const twelveHoursAgo = new Date(Date.now() - CHECK_INTERVAL);
      const query = `to:${SERVICE_EMAIL} after:${Math.floor(
         twelveHoursAgo.getTime() / 1000
      )} is:unread`;

      const response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 50,
      });

      return response.data.messages || [];
   } catch (err) {
      console.error("❌ Error fetching emails:", err.message);
      throw err;
   }
}

/**
 * Получает полную информацию о письме
 */
async function getEmailDetails(messageId) {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      const response = await gmail.users.messages.get({
         userId: "me",
         id: messageId,
         format: "full",
      });

      return response.data;
   } catch (err) {
      console.error(`❌ Error fetching email ${messageId}:`, err.message);
      throw err;
   }
}

/**
 * Парсит email и извлекает текст и тему
 */
function parseEmailMessage(message) {
   const headers = message.payload.headers;
   const subject = headers.find((h) => h.name === "Subject")?.value || "";
   const from = headers.find((h) => h.name === "From")?.value || "";
   const to = headers.find((h) => h.name === "To")?.value || "";
   const date = headers.find((h) => h.name === "Date")?.value || "";

   // Извлекаем текст письма
   let text = "";
   let html = "";

   if (message.payload.body?.data) {
      text = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
   } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
         if (part.mimeType === "text/plain" && part.body?.data) {
            text = Buffer.from(part.body.data, "base64").toString("utf-8");
         } else if (part.mimeType === "text/html" && part.body?.data) {
            html = Buffer.from(part.body.data, "base64").toString("utf-8");
         }
      }
   }

   return {
      subject,
      from,
      to,
      date,
      text,
      html,
   };
}

/**
 * Обрабатывает одно письмо
 */
async function processEmail(messageId) {
   try {
      const message = await getEmailDetails(messageId);
      const emailData = parseEmailMessage(message);

      // Извлекаем alias из адреса получателя
      const alias = extractAliasFromEmail(emailData.to);

      if (!alias) {
         console.log(`⚠️  No alias found in email to: ${emailData.to}`);
         return;
      }

      // Ищем кампанию по alias
      const campaign = await Campaign.findOne({ alias });

      if (!campaign) {
         console.log(`⚠️  Campaign not found for alias: ${alias}`);
         return;
      }

      // Если у кампании нет email клиента, используем ADMIN_EMAIL
      const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;

      if (!clientEmail) {
         console.log(`⚠️  No client email found for campaign: ${alias}`);
         return;
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
         `✅ Forwarded email from ${emailData.from} to ${clientEmail} (alias: ${alias})`
      );

      // Помечаем письмо как прочитанное
      if (gmail) {
         await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
               removeLabelIds: ["UNREAD"],
            },
         });
      }
   } catch (err) {
      console.error(`❌ Error processing email ${messageId}:`, err.message);
   }
}

/**
 * Проверяет почту и обрабатывает ответы
 */
async function checkAndProcessReplies() {
   try {
      console.log("📧 Checking for new email replies...");

      if (!gmail) {
         await initGmail();
      }

      const messages = await getUnreadEmails();

      if (messages.length === 0) {
         console.log("✅ No new replies found");
         return;
      }

      console.log(`📬 Found ${messages.length} new email(s)`);

      // Обрабатываем каждое письмо
      for (const message of messages) {
         await processEmail(message.id);
      }

      console.log("✅ Email processing completed");
   } catch (err) {
      console.error("❌ Error in checkAndProcessReplies:", err.message);
   }
}

/**
 * Запускает периодическую проверку почты
 */
function startEmailChecker() {
   if (checkInterval) {
      console.log("⚠️  Email checker is already running");
      return;
   }

   // Первая проверка сразу
   checkAndProcessReplies().catch((err) => {
      console.error("❌ Initial email check failed:", err.message);
   });

   // Затем каждые 12 часов
   checkInterval = setInterval(() => {
      checkAndProcessReplies();
   }, CHECK_INTERVAL);

   console.log(
      `✅ Email checker started (checking every ${
         CHECK_INTERVAL / 1000 / 60 / 60
      } hours)`
   );
}

/**
 * Останавливает периодическую проверку почты
 */
function stopEmailChecker() {
   if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
      console.log("✅ Email checker stopped");
   }
}

module.exports = {
   initGmail,
   checkAndProcessReplies,
   startEmailChecker,
   stopEmailChecker,
};
