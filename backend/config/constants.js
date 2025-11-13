/**
 * Константы приложения
 * Централизованное хранение магических чисел и настроек
 */

module.exports = {
   // Ограничения файлов
   FILE_LIMITS: {
      MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
      MAX_FILES: 2, // Максимум 2 файла (resume + emails)
   },

   // Разрешенные форматы файлов
   ALLOWED_EMAIL_FILE_EXTENSIONS: [".csv", ".xls", ".xlsx"],
   ALLOWED_RESUME_MIME_TYPES: ["application/pdf"],

   // Настройки алиасов
   ALIAS: {
      MAX_ATTEMPTS: 100, // Максимум попыток найти уникальный алиас
      PREFIX: "client_",
      DEFAULT_FALLBACK: "client_user",
   },

   // Статусы кампаний
   CAMPAIGN_STATUS: {
      PENDING: "pending",
      SENDING: "sending",
      COMPLETED: "completed",
   },

   // Настройки по умолчанию
   DEFAULTS: {
      PORT: 3000,
      SENDGRID_DOMAIN: "your_sendgrid_api_key",
      EMAIL_SUBJECT: "Seafarer Resume",
      UNSUBSCRIBE_EMAIL: "unsubscribe@your_sendgrid_api_key",
   },

   // Настройки пагинации
   PAGINATION: {
      DEFAULT_LIMIT: 50,
      DEFAULT_SKIP: 0,
      MAX_LIMIT: 1000,
   },
};
