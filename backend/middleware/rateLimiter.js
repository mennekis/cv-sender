/**
 * Rate limiting middleware для защиты API
 * Ограничивает количество запросов от одного IP
 */

const rateLimit = require("express-rate-limit");

// Общий rate limiter для всех API endpoints
const apiLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 минут
   max: 100, // максимум 100 запросов с одного IP за окно
   message: {
      error: "Too Many Requests",
      message: "Too many requests from this IP, please try again later.",
   },
   standardHeaders: true, // Возвращает информацию о лимите в заголовках `RateLimit-*`
   legacyHeaders: false, // Отключает заголовки `X-RateLimit-*`
});

// Строгий rate limiter для endpoints отправки email
const emailLimiter = rateLimit({
   windowMs: 60 * 60 * 1000, // 1 час
   max: 10, // максимум 10 запросов в час
   message: {
      error: "Too Many Requests",
      message: "Too many email sending requests, please try again later.",
   },
   standardHeaders: true,
   legacyHeaders: false,
});

// Rate limiter для endpoint клиентских ошибок
const errorReportingLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 минут
   max: 50, // максимум 50 сообщений об ошибках за окно
   message: {
      error: "Too Many Requests",
      message: "Too many error reports, please try again later.",
   },
   standardHeaders: true,
   legacyHeaders: false,
});

module.exports = {
   apiLimiter,
   emailLimiter,
   errorReportingLimiter,
};
