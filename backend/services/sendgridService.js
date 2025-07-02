const sgMail = require("@sendgrid/mail");
const path = require("path");
const fs = require("fs");

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

module.exports = {
   sendEmail,
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
