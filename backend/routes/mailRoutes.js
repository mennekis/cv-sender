/**
 * Маршруты для работы с email и кампаниями
 * Содержит только маршрутизацию, бизнес-логика вынесена в контроллеры
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const constants = require("../config/constants");
const {
   emailLimiter,
   errorReportingLimiter,
} = require("../middleware/rateLimiter");
const multerErrorHandler = require("../middleware/multerErrorHandler");
const {
   validateSendEmail,
   validateCampaignStart,
   validateCampaignsQuery,
} = require("../middleware/validation");

// Импорт контроллеров
const {
   sendEmailCampaign,
   handleClientError,
} = require("../controllers/mailController");
const {
   startCampaign,
   getCampaigns,
   getCampaignByAlias,
   getCampaignsStats,
} = require("../controllers/campaignController");

// Настройка multer для загрузки файлов
const upload = multer({
   dest: "uploads/",
   limits: {
      fileSize: constants.FILE_LIMITS.MAX_FILE_SIZE,
      files: constants.FILE_LIMITS.MAX_FILES,
   },
   fileFilter: (req, file, cb) => {
      // Проверка типа файла для resume
      if (file.fieldname === "resume") {
         if (constants.ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
         } else {
            cb(new Error("Resume must be a PDF file"), false);
         }
      } else if (file.fieldname === "emails") {
         // Для emails файла проверяем расширение
         const allowedMimes = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         ];
         const allowedExts = /\.(csv|xls|xlsx)$/i;
         if (
            allowedMimes.includes(file.mimetype) ||
            allowedExts.test(file.originalname)
         ) {
            cb(null, true);
         } else {
            cb(new Error("Emails file must be CSV or Excel format"), false);
         }
      } else {
         cb(null, true);
      }
   },
});

/**
 * POST /api/send
 * Отправка email рассылки с резюме
 */
router.post(
   "/send",
   emailLimiter,
   upload.fields([
      { name: "resume", maxCount: 1 },
      { name: "emails", maxCount: 1 },
   ]),
   multerErrorHandler,
   validateSendEmail,
   sendEmailCampaign
);

/**
 * POST /api/client-error
 * Обработка клиентских ошибок
 */
router.post("/client-error", errorReportingLimiter, handleClientError);

/**
 * POST /api/campaign/start
 * Запуск новой кампании
 */
router.post(
   "/campaign/start",
   emailLimiter,
   upload.single("emails"),
   multerErrorHandler,
   validateCampaignStart,
   startCampaign
);

/**
 * GET /api/campaigns
 * Получение списка кампаний
 */
router.get("/campaigns", validateCampaignsQuery, getCampaigns);

/**
 * GET /api/campaign/:alias
 * Получение деталей кампании по алиасу
 */
router.get("/campaign/:alias", getCampaignByAlias);

/**
 * GET /api/campaigns/stats
 * Получение статистики по всем кампаниям
 */
router.get("/campaigns/stats", getCampaignsStats);

module.exports = router;
