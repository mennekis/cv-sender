const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const Campaign = require("../models/Campaign");

if (!process.env.SENDGRID_API_KEY) {
   throw new Error("SENDGRID_API_KEY is not set in environment variables");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ВАЖНО: Не отключайте проверку SSL даже в development
// Если возникают проблемы с SSL, проверьте сертификаты или используйте правильный CA bundle
// Для локальной разработки с самоподписанными сертификатами используйте NODE_EXTRA_CA_CERTS

/**
 * Отправка email с использованием SendGrid
 * @param {string} to - Получатель
 * @param {string} from - Отправитель
 * @param {string} subject - Тема письма
 * @param {string} text - Текст письма
 * @param {string} html - HTML-содержимое письма
 * @param {Array} attachments - Массив объектов вложений
 * @throws {Error} Если отправка не удалась
 */
async function sendEmail({ to, from, subject, text, html, attachments = [] }) {
   if (!to || !from || !subject) {
      throw new Error("Missing required email parameters: to, from, subject");
   }

   try {
      const msg = {
         to,
         from,
         subject,
         text,
         html,
         attachments,
      };
      await sgMail.send(msg);
      console.log(`✅ Email sent to ${to} with subject "${subject}"`);
   } catch (err) {
      console.error(`❌ Failed to send email to ${to}:`, err.message);
      if (err.response) {
         console.error("SendGrid API Error:", err.response.body);
      }
      throw err; // Пробрасываем ошибку дальше для обработки
   }
}
function makeAttachment(file) {
   if (!file || !file.path) {
      throw new Error("Invalid file object for attachment");
   }

   try {
      const content = fs.readFileSync(file.path).toString("base64");
      return {
         content,
         filename: file.originalname || "attachment",
         type: file.mimetype || "application/octet-stream",
         disposition: "attachment",
      };
   } catch (err) {
      console.error("Error reading file for attachment:", err.message);
      throw new Error(`Failed to read attachment file: ${err.message}`);
   }
}

/**
 * Массовая рассылка email с обновлением статуса кампании в БД
 * @param {string} alias - Алиас кампании
 * @param {string[]} recipients - Список email адресов получателей
 * @param {string} subject - Тема письма
 * @param {string} body - HTML содержимое письма
 * @param {string} text - Текстовая версия письма (опционально)
 * @param {Array} attachments - Массив вложений (опционально)
 */
async function sendEmails(
   alias,
   recipients,
   subject,
   body,
   text = null,
   attachments = []
) {
   if (
      !alias ||
      !recipients ||
      !Array.isArray(recipients) ||
      recipients.length === 0
   ) {
      throw new Error("Invalid parameters for sendEmails");
   }

   const campaign = await Campaign.findOne({ alias });
   if (!campaign) {
      throw new Error(`Campaign not found for alias: ${alias}`);
   }

   // Обновляем статус на "sending"
   campaign.status = "sending";
   await campaign.save();
   console.log(`📤 Campaign "${alias}" status updated to "sending"`);

   let successCount = 0;
   let errorCount = 0;
   const errors = []; // Сохраняем детали ошибок

   // Отправляем email каждому получателю
   for (const email of recipients) {
      try {
         const msg = {
            to: email,
            from: `${alias}@${
               process.env.SENDGRID_DOMAIN || "your_sendgrid_api_key"
            }`,
            subject,
            html: body,
            ...(text && { text }),
            ...(attachments.length > 0 && { attachments }),
         };

         await sgMail.send(msg);
         console.log(`✅ Sent to ${email}`);
         successCount++;
      } catch (err) {
         console.error(`❌ Error sending to ${email}:`, err.message);
         errorCount++;
         errors.push({
            email,
            error: err.message,
            timestamp: new Date(),
         });
      }
   }

   // Обновляем статус на "completed" после завершения рассылки и сохраняем статистику
   campaign.status = "completed";
   campaign.successCount = successCount;
   campaign.errorCount = errorCount;
   await campaign.save();
   console.log(
      `✅ Campaign "${alias}" completed. Success: ${successCount}, Errors: ${errorCount}`
   );

   // Логируем ошибки, если есть
   if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} emails failed to send`);
   }
}

module.exports = {
   sendEmail,
   sendEmails,
   makeAttachment,
};
