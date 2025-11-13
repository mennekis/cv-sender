/**
 * Утилиты для формирования email шаблонов
 * Централизованная логика создания HTML и текстовых версий писем
 */

const constants = require("../config/constants");

/**
 * Экранирует HTML символы для предотвращения XSS
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
   if (!text) return "";
   return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

/**
 * Конвертирует переносы строк в HTML <br>
 * @param {string} text - Текст с переносами строк
 * @returns {string} Текст с HTML переносами
 */
function nl2br(text) {
   if (!text) return "";
   return String(text).replace(/\n/g, "<br>");
}

/**
 * Формирует HTML шапку письма
 * @param {string} subject - Тема письма
 * @returns {string} HTML шапка
 */
function createEmailHeader(subject) {
   const safeSubject = escapeHtml(subject || constants.DEFAULTS.EMAIL_SUBJECT);
   return `<h1 style="color:#333;font-size:32px;margin-left:auto;margin-right:auto">${safeSubject}</h1>
   <br>
   <hr>`;
}

/**
 * Формирует HTML футер с информацией об отправителе и unsubscribe
 * @param {string} senderName - Имя отправителя
 * @param {string} contactPhone - Телефон для связи
 * @param {string} messengersStr - Строка с мессенджерами
 * @returns {string} HTML футер
 */
function createEmailFooter(senderName, contactPhone, messengersStr = "") {
   const safeName = escapeHtml(senderName || "Not provided");
   const safePhone = escapeHtml(contactPhone || "Not provided");
   const messengers = messengersStr ? ` (${escapeHtml(messengersStr)})` : "";

   return `
         <br>
         <i>Best regards, ${safeName}</i>
         <br>
         <phone style="color:#839;font-size:12px;">
            <i>Phone: ${safePhone}${messengers}</i>
         </phone>
         <br>
          <hr>
          <p style="color:#888;font-size:12px;">
            If you do not wish to receive such emails, simply reply to this email or write to
            <a href="mailto:${constants.DEFAULTS.UNSUBSCRIBE_EMAIL}">${constants.DEFAULTS.UNSUBSCRIBE_EMAIL}</a>
            <br>Seafarer CV Team
          </p>
   `;
}

/**
 * Формирует текстовый футер
 * @param {string} senderName - Имя отправителя
 * @param {string} contactPhone - Телефон для связи
 * @param {string} messengersStr - Строка с мессенджерами
 * @returns {string} Текстовый футер
 */
function createEmailFooterText(senderName, contactPhone, messengersStr = "") {
   const messengers = messengersStr ? ` (${messengersStr})` : "";
   return `
         \nBest regards, ${senderName || "Not provided"}.\n
         \nPhone: ${contactPhone || "Not provided"}${messengers}\n
         \n---\nIf you do not wish to receive such emails, simply reply to this email or write to ${
            constants.DEFAULTS.UNSUBSCRIBE_EMAIL
         }\nSeafarer CV Team`;
}

/**
 * Формирует полный HTML контент письма
 * @param {string} subject - Тема письма
 * @param {string} coverLetterText - Текст письма
 * @param {string} senderName - Имя отправителя
 * @param {string} contactPhone - Телефон для связи
 * @param {string} messengersStr - Строка с мессенджерами
 * @returns {string} Полный HTML контент
 */
function createEmailHtml(
   subject,
   coverLetterText,
   senderName,
   contactPhone,
   messengersStr = ""
) {
   const header = createEmailHeader(subject);
   const footer = createEmailFooter(senderName, contactPhone, messengersStr);

   // Экранируем и конвертируем текст письма
   const safeText = escapeHtml(coverLetterText);
   const formattedText = nl2br(safeText);

   return (
      header +
      `<div style="font-size:18px; line-height:1.5; color:#222;">${formattedText}</div>` +
      footer
   );
}

/**
 * Формирует полный текстовый контент письма
 * @param {string} coverLetterText - Текст письма
 * @param {string} senderName - Имя отправителя
 * @param {string} contactPhone - Телефон для связи
 * @param {string} messengersStr - Строка с мессенджерами
 * @returns {string} Полный текстовый контент
 */
function createEmailText(
   coverLetterText,
   senderName,
   contactPhone,
   messengersStr = ""
) {
   const footer = createEmailFooterText(
      senderName,
      contactPhone,
      messengersStr
   );
   return coverLetterText + footer;
}

module.exports = {
   escapeHtml,
   nl2br,
   createEmailHeader,
   createEmailFooter,
   createEmailFooterText,
   createEmailHtml,
   createEmailText,
};
