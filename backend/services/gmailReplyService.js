const { google } = require("googleapis");
const Campaign = require("../models/Campaign");
const { sendEmail } = require("./sendgridService");
const mongoose = require("mongoose");

// Настройка Gmail API
const SCOPES = [
   "https://www.googleapis.com/auth/gmail.readonly",
   "https://www.googleapis.com/auth/gmail.modify", // Для пометки писем как прочитанных
];
const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_secret_value";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 минут в миллисекундах (для тестирования, потом можно увеличить)

let gmail = null;
let checkInterval = null;

// Схема для отслеживания обработанных писем (защита от дубликатов)
const ProcessedEmailSchema = new mongoose.Schema(
   {
      messageId: { type: String, required: true, unique: true },
      processedAt: { type: Date, default: Date.now, expires: 86400 }, // Автоудаление через 24 часа
   },
   { collection: "processed_emails" }
);

let ProcessedEmail = null;

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
               // console.log("✅ Access token refreshed successfully"); // Для отладки
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

      // console.log("✅ Gmail API initialized"); // Для отладки
   } catch (err) {
      console.error("❌ Failed to initialize Gmail API:", err.message);
      throw err;
   }
}

/**
 * Извлекает alias из email адреса или строки с несколькими адресами
 * @param {string} email - Email адрес вида seafarer_X@your_sendgrid_api_key или строка с несколькими адресами
 * @returns {string|null} - Извлеченный alias или null
 */
function extractAliasFromEmail(email) {
   if (!email || typeof email !== "string") return null;

   // Ищем паттерн seafarer_*@your_sendgrid_api_key в строке (может быть несколько адресов)
   // Паттерн: seafarer_любые_символы@your_sendgrid_api_key
   const match = email.match(/(seafarer_[^@\s<>]+)@seafarer-cv\.com/gi);
   if (match && match.length > 0) {
      // Берем первый найденный алиас и извлекаем только часть до @
      const fullMatch = match[0];
      const aliasMatch = fullMatch.match(/(seafarer_[^@]+)@seafarer-cv\.com$/i);
      return aliasMatch ? aliasMatch[1] : null;
   }
   return null;
}

/**
 * Получает список непрочитанных писем за последние 24 часа
 * ВАЖНО: Ищет только непрочитанные, чтобы не обрабатывать письма повторно
 */
async function getUnreadEmails() {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      // Получаем все непрочитанные письма за последние 24 часа
      // Gmail API не поддерживает поиск по подстроке seafarer_, поэтому
      // получаем все письма и фильтруем их в коде
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `after:${Math.floor(
         twentyFourHoursAgo.getTime() / 1000
      )} is:unread`;

      const response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 100, // Увеличиваем лимит, чтобы не пропустить письма
      });

      const allMessages = response.data.messages || [];

      // Фильтруем письма, проверяя заголовки на наличие seafarer_
      const filteredMessages = [];
      for (const messageRef of allMessages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "metadata",
               metadataHeaders: [
                  "To",
                  "Reply-To",
                  "X-Original-To",
                  "Delivered-To",
                  "Envelope-To",
               ],
            });

            const headers = message.data.payload.headers || [];
            const to = headers.find((h) => h.name === "To")?.value || "";
            const replyTo =
               headers.find((h) => h.name === "Reply-To")?.value || "";
            const xOriginalTo =
               headers.find((h) => h.name === "X-Original-To")?.value || "";
            const deliveredTo =
               headers.find((h) => h.name === "Delivered-To")?.value || "";
            const envelopeTo =
               headers.find((h) => h.name === "Envelope-To")?.value || "";

            // Проверяем, есть ли seafarer_ в любом из заголовков
            const allHeaders = [
               to,
               replyTo,
               xOriginalTo,
               deliveredTo,
               envelopeTo,
            ].join(" ");
            if (allHeaders.toLowerCase().includes("seafarer_")) {
               filteredMessages.push(messageRef);
            }
         } catch (err) {
            // Пропускаем письма, которые не удалось получить
            // console.warn(`⚠️  Failed to get message ${messageRef.id}:`, err.message); // Для отладки
         }
      }

      return filteredMessages;
   } catch (err) {
      console.error("❌ Error fetching emails:", err.message);
      throw err;
   }
}

/**
 * Получает список прочитанных писем за последние 24 часа
 * Используется для обработки писем, которые были прочитаны до запуска checker'а
 * ВАЖНО: Ищет за 24 часа, чтобы не пропустить письма, которые были прочитаны ранее
 */
async function getRecentReadEmails() {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      // Получаем все прочитанные письма за последние 24 часа
      // Gmail API не поддерживает поиск по подстроке seafarer_, поэтому
      // получаем все письма и фильтруем их в коде
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `after:${Math.floor(
         twentyFourHoursAgo.getTime() / 1000
      )} -is:unread`;

      const response = await gmail.users.messages.list({
         userId: "me",
         q: query,
         maxResults: 100, // Увеличиваем лимит, чтобы не пропустить письма
      });

      const allMessages = response.data.messages || [];

      // Фильтруем письма, проверяя заголовки на наличие seafarer_
      const filteredMessages = [];
      for (const messageRef of allMessages) {
         try {
            const message = await gmail.users.messages.get({
               userId: "me",
               id: messageRef.id,
               format: "metadata",
               metadataHeaders: [
                  "To",
                  "Reply-To",
                  "X-Original-To",
                  "Delivered-To",
                  "Envelope-To",
               ],
            });

            const headers = message.data.payload.headers || [];
            const to = headers.find((h) => h.name === "To")?.value || "";
            const replyTo =
               headers.find((h) => h.name === "Reply-To")?.value || "";
            const xOriginalTo =
               headers.find((h) => h.name === "X-Original-To")?.value || "";
            const deliveredTo =
               headers.find((h) => h.name === "Delivered-To")?.value || "";
            const envelopeTo =
               headers.find((h) => h.name === "Envelope-To")?.value || "";

            // Проверяем, есть ли seafarer_ в любом из заголовков
            const allHeaders = [
               to,
               replyTo,
               xOriginalTo,
               deliveredTo,
               envelopeTo,
            ].join(" ");
            if (allHeaders.toLowerCase().includes("seafarer_")) {
               filteredMessages.push(messageRef);
            }
         } catch (err) {
            // Пропускаем письма, которые не удалось получить
            // console.warn(`⚠️  Failed to get message ${messageRef.id}:`, err.message); // Для отладки
         }
      }

      return filteredMessages;
   } catch (err) {
      console.error("❌ Error fetching recent read emails:", err.message);
      throw err;
   }
}

/**
 * Проверяет, было ли письмо уже обработано
 */
async function isEmailProcessed(messageId) {
   try {
      if (!ProcessedEmail) {
         // Инициализируем модель, если еще не инициализирована
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }
      const exists = await ProcessedEmail.findOne({ messageId });
      return !!exists;
   } catch (err) {
      console.error("❌ Error checking processed email:", err.message);
      // В случае ошибки считаем, что письмо не обработано (безопаснее)
      return false;
   }
}

/**
 * Помечает письмо как обработанное
 */
async function markEmailAsProcessed(messageId) {
   try {
      if (!ProcessedEmail) {
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }
      await ProcessedEmail.findOneAndUpdate(
         { messageId },
         { messageId, processedAt: new Date() },
         { upsert: true }
      );
   } catch (err) {
      console.error("❌ Error marking email as processed:", err.message);
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

   // Дополнительные заголовки для поиска алиаса
   const replyTo = headers.find((h) => h.name === "Reply-To")?.value || "";
   const xOriginalTo =
      headers.find((h) => h.name === "X-Original-To")?.value || "";
   const deliveredTo =
      headers.find((h) => h.name === "Delivered-To")?.value || "";
   const envelopeTo =
      headers.find((h) => h.name === "Envelope-To")?.value || "";

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
      replyTo,
      xOriginalTo,
      deliveredTo,
      envelopeTo,
      allHeaders: headers, // Сохраняем все заголовки для отладки
   };
}

/**
 * Обрабатывает одно письмо
 */
async function processEmail(messageId, skipDuplicateCheck = false) {
   try {
      // Проверяем, не было ли письмо уже обработано (если не пропущена проверка)
      if (!skipDuplicateCheck && (await isEmailProcessed(messageId))) {
         // console.log(`⏭️  Email ${messageId} already processed, skipping`); // Для отладки
         return;
      }

      const message = await getEmailDetails(messageId);
      const emailData = parseEmailMessage(message);

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
         // console.log(`⚠️  No alias found in email headers:`); // Для отладки
         // console.log(`   To: ${emailData.to}`);
         // console.log(`   Reply-To: ${emailData.replyTo || "не указан"}`);
         // console.log(`   X-Original-To: ${emailData.xOriginalTo || "не указан"}`);
         // console.log(`   Delivered-To: ${emailData.deliveredTo || "не указан"}`);
         return;
      }

      // console.log(`✅ Found alias: ${alias} in email from ${emailData.from}`); // Для отладки

      // Ищем кампанию по alias
      const campaign = await Campaign.findOne({ alias });

      if (!campaign) {
         // console.log(`⚠️  Campaign not found for alias: ${alias}`); // Для отладки
         return;
      }

      // Если у кампании нет email клиента, используем ADMIN_EMAIL
      const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;

      if (!clientEmail) {
         // console.log(`⚠️  No client email found for campaign: ${alias}`); // Для отладки
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

      // Помечаем письмо как обработанное в базе данных
      await markEmailAsProcessed(messageId);

      // Помечаем письмо как прочитанное в Gmail
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
      // console.log("📧 Checking for new email replies..."); // Избыточный лог (каждые 5 минут)

      if (!gmail) {
         await initGmail();
      }

      // Инициализируем модель ProcessedEmail, если еще не инициализирована
      if (!ProcessedEmail && mongoose.connection.readyState === 1) {
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }

      // 1. Проверяем непрочитанные письма (основной поток)
      let unreadMessages = [];
      try {
         unreadMessages = await getUnreadEmails();
      } catch (err) {
         console.error("❌ Error fetching unread emails:", err.message);
         // Продолжаем работу, даже если не удалось получить непрочитанные
      }

      let processedCount = 0;

      if (unreadMessages.length > 0) {
         console.log(`📬 Found ${unreadMessages.length} unread email(s)`);
         for (const message of unreadMessages) {
            try {
               await processEmail(message.id);
               processedCount++;
            } catch (err) {
               console.error(
                  `❌ Error processing unread email ${message.id}:`,
                  err.message
               );
               // Продолжаем обработку следующих писем
            }
         }
      }

      // 2. Проверяем прочитанные письма за последние 24 часа (для пропущенных писем)
      let recentReadMessages = [];
      try {
         recentReadMessages = await getRecentReadEmails();
      } catch (err) {
         console.error("❌ Error fetching recent read emails:", err.message);
         // Продолжаем работу, даже если не удалось получить прочитанные
      }

      if (recentReadMessages.length > 0) {
         console.log(
            `📬 Found ${recentReadMessages.length} recent read email(s) from last 24h (checking for missed ones)...`
         );
         let recentProcessed = 0;
         for (const message of recentReadMessages) {
            try {
               // Проверяем дубликаты для прочитанных писем
               if (!(await isEmailProcessed(message.id))) {
                  await processEmail(message.id);
                  recentProcessed++;
               }
            } catch (err) {
               console.error(
                  `❌ Error processing recent read email ${message.id}:`,
                  err.message
               );
               // Продолжаем обработку следующих писем
            }
         }
         if (recentProcessed > 0) {
            console.log(
               `✅ Processed ${recentProcessed} missed email(s) from recent read`
            );
            processedCount += recentProcessed;
         }
      }

      if (processedCount === 0) {
         // console.log("✅ No new replies found"); // Избыточный лог
      } else {
         console.log(
            `✅ Email processing completed. Total processed: ${processedCount}`
         );
      }
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

   const intervalMinutes = CHECK_INTERVAL / 1000 / 60;
   const intervalHours = intervalMinutes / 60;
   const intervalText =
      intervalHours >= 1
         ? `${intervalHours} hours`
         : `${intervalMinutes} minutes`;
   console.log(`✅ Email checker started (checking every ${intervalText})`);
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
   parseEmailMessage,
   extractAliasFromEmail,
};
