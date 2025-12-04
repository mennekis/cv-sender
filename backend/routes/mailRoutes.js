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
 * @swagger
 * /api/send:
 *   post:
 *     summary: Отправка email рассылки с резюме
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - emailText
 *               - senderName
 *               - senderEmail
 *               - resume
 *               - emails
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Тема письма
 *               emailText:
 *                 type: string
 *                 description: HTML содержимое письма
 *               senderName:
 *                 type: string
 *                 description: Имя отправителя
 *               senderEmail:
 *                 type: string
 *                 format: email
 *                 description: Email отправителя
 *               contactPhone:
 *                 type: string
 *                 description: Контактный телефон
 *               messengers:
 *                 type: string
 *                 description: Список мессенджеров через запятую (Viber,WhatsApp,Telegram)
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: PDF файл с резюме (макс. 5MB)
 *               emails:
 *                 type: string
 *                 format: binary
 *                 description: CSV/Excel файл с email адресами (макс. 5MB)
 *     responses:
 *       200:
 *         description: Рассылка завершена успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 alias:
 *                   type: string
 *                 total:
 *                   type: number
 *                 success:
 *                   type: number
 *                 failed:
 *                   type: number
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Превышен лимит запросов
 *       500:
 *         description: Внутренняя ошибка сервера
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
 * @swagger
 * /api/client-error:
 *   post:
 *     summary: Отправка отчета об ошибке на клиенте
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               stack:
 *                 type: string
 *               url:
 *                 type: string
 *               userAgent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Отчет получен
 *       429:
 *         description: Превышен лимит запросов
 */
router.post("/client-error", errorReportingLimiter, handleClientError);

/**
 * @swagger
 * /api/campaign/start:
 *   post:
 *     summary: Запуск новой кампании рассылки
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - clientName
 *               - subject
 *               - body
 *               - senderName
 *               - emails
 *             properties:
 *               clientName:
 *                 type: string
 *               clientEmail:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               text:
 *                 type: string
 *               senderName:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               messengers:
 *                 type: string
 *               emails:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Кампания запущена успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 alias:
 *                   type: string
 *                 recipientsCount:
 *                   type: number
 *                 status:
 *                   type: string
 *       400:
 *         description: Ошибка валидации
 *       429:
 *         description: Превышен лимит запросов
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
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Получение списка кампаний
 *     tags: [Campaigns]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 1000
 *         description: Количество записей
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Количество пропущенных записей
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sending, completed]
 *         description: Фильтр по статусу
 *     responses:
 *       200:
 *         description: Список кампаний
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *                 total:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 skip:
 *                   type: number
 */
router.get("/campaigns", validateCampaignsQuery, getCampaigns);

/**
 * @swagger
 * /api/campaign/{alias}:
 *   get:
 *     summary: Получение деталей кампании по алиасу
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         schema:
 *           type: string
 *         description: Уникальный алиас кампании
 *     responses:
 *       200:
 *         description: Детали кампании
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Кампания не найдена
 */
router.get("/campaign/:alias", getCampaignByAlias);

/**
 * @swagger
 * /api/campaigns/stats:
 *   get:
 *     summary: Получение статистики по всем кампаниям
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: Статистика кампаний
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     sending:
 *                       type: number
 *                     pending:
 *                       type: number
 *                 emails:
 *                   type: object
 *                   properties:
 *                     totalSuccess:
 *                       type: number
 *                     totalErrors:
 *                       type: number
 *                     totalRecipients:
 *                       type: number
 */
router.get("/campaigns/stats", getCampaignsStats);

module.exports = router;
