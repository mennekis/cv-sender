const sgMail = require("@sendgrid/mail");
const path = require("path");
const fs = require("fs");
const Campaign = require("../models/Campaign");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

if (process.env.NODE_ENV === "development") {
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

/**
 * Отправка email с использованием SendGrid
 * @param {string} to - Получатель
 * @param {string} subject - Тема письма
 * @param {string} text - Текст письма
 * @param {string} html - HTML-содержимое письма
 * @param {Array} attachments - Массив объектов вложений
 */
async function sendEmail({ to, from, subject, text, html, attachments = [] }) {
   const msg = {
      to,
      from, // укажи свой email-отправителя в .env
      subject,
      text,
      html,
      attachments,
   };
   await sgMail.send(msg);
   console.log(`Email sent to ${to} with subject "${subject}"`);
}
function makeAttachment(file) {
   const content = fs.readFileSync(file.path).toString("base64");
   return {
      content,
      filename: file.originalname,
      type: file.mimetype,
      disposition: "attachment",
   };
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
   const campaign = await Campaign.findOne({ alias });
   if (!campaign) {
      console.error("❌ Campaign not found for alias:", alias);
      return;
   }

   // Обновляем статус на "sending"
   campaign.status = "sending";
   await campaign.save();
   console.log(`📤 Campaign "${alias}" status updated to "sending"`);

   let successCount = 0;
   let errorCount = 0;

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
      }
   }

   // Обновляем статус на "completed" после завершения рассылки
   campaign.status = "completed";
   await campaign.save();
   console.log(
      `✅ Campaign "${alias}" completed. Success: ${successCount}, Errors: ${errorCount}`
   );
}

module.exports = {
   sendEmail,
   sendEmails,
   makeAttachment,
};
// Этот модуль предоставляет функции для отправки email через SendGrid
// и создания вложений из файлов. Используется в маршрутах для обработки
// отправки писем с вложениями, которые загружаются пользователем.
// Функция sendEmail принимает объект с параметрами письма и отправляет его через SendGrid.
// Функция makeAttachment принимает файл и возвращает объект вложения,
// который можно использовать в sendEmail для добавления вложений к письму.
// Этот файл является частью сервиса отправки email и используется в маршрутах
// для обработки отправки писем с вложениями, которые загружаются пользователем.
// Он позволяет отправлять письма с текстом, HTML-содержимым и вложениями,
