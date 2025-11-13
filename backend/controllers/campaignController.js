/**
 * Контроллер для работы с кампаниями
 * Содержит бизнес-логику для endpoints /campaign/*
 */

const fs = require("fs");
const { createAlias } = require("../services/senderPrefix");
const { sendEmails } = require("../services/sendgridService");
const parseEmailsFromFile = require("../services/parseEmailsFromFile");
const Campaign = require("../models/Campaign");
const constants = require("../config/constants");

/**
 * Запуск новой кампании
 * POST /api/campaign/start
 */
async function startCampaign(req, res, next) {
   try {
      if (!req.file) {
         return res.status(400).json({
            error: "Missing File",
            message: "CSV file with emails is required",
         });
      }

      // Проверка формата файла
      const allowedExt = constants.ALLOWED_EMAIL_FILE_EXTENSIONS;
      const ext = req.file.originalname.split(".").pop().toLowerCase();
      if (!allowedExt.includes(`.${ext}`)) {
         // Удаляем файл перед возвратом ошибки
         try {
            fs.unlinkSync(req.file.path);
         } catch (err) {
            console.warn("Failed to delete uploaded file:", err.message);
         }

         return res.status(400).json({
            error: "Invalid File Format",
            message: `Unsupported file format: .${ext}. Supported formats are: ${allowedExt.join(
               ", "
            )}`,
         });
      }

      // Парсинг email адресов
      const recipients = parseEmailsFromFile(
         req.file.path,
         req.file.originalname
      );

      if (recipients.length === 0) {
         // Удаляем файл перед возвратом ошибки
         try {
            fs.unlinkSync(req.file.path);
         } catch (err) {
            console.warn("Failed to delete uploaded file:", err.message);
         }

         return res.status(400).json({
            error: "No Valid Emails",
            message: "No valid emails found in the file",
         });
      }

      // Создание алиаса и кампании
      const alias = await createAlias(req.body.clientName, recipients);

      // Запуск рассылки
      await sendEmails(alias, recipients, req.body.subject, req.body.body);

      // Очистка загруженного файла
      try {
         fs.unlinkSync(req.file.path);
      } catch (err) {
         console.warn("Failed to delete uploaded file:", err.message);
      }

      res.json({
         message: "Campaign started successfully",
         alias,
         recipientsCount: recipients.length,
      });
   } catch (error) {
      // Очистка файла в случае ошибки
      if (req.file && req.file.path) {
         try {
            fs.unlinkSync(req.file.path);
         } catch (err) {
            console.warn("Failed to delete uploaded file:", err.message);
         }
      }
      next(error);
   }
}

/**
 * Получение списка кампаний
 * GET /api/campaigns
 */
async function getCampaigns(req, res, next) {
   try {
      const limit = req.query.limit || constants.PAGINATION.DEFAULT_LIMIT;
      const skip = req.query.skip || constants.PAGINATION.DEFAULT_SKIP;
      const status = req.query.status;

      const query = {};
      if (status && Object.values(constants.CAMPAIGN_STATUS).includes(status)) {
         query.status = status;
      }

      const campaigns = await Campaign.find(query)
         .sort({ createdAt: -1 })
         .limit(limit)
         .skip(skip)
         .select("-body -text"); // Исключаем большие поля для списка

      const total = await Campaign.countDocuments(query);

      res.json({
         campaigns,
         total,
         limit,
         skip,
      });
   } catch (error) {
      next(error);
   }
}

/**
 * Получение деталей кампании по алиасу
 * GET /api/campaign/:alias
 */
async function getCampaignByAlias(req, res, next) {
   try {
      const campaign = await Campaign.findOne({ alias: req.params.alias });

      if (!campaign) {
         return res.status(404).json({
            error: "Not Found",
            message: "Campaign not found",
         });
      }

      res.json(campaign);
   } catch (error) {
      next(error);
   }
}

/**
 * Получение статистики по всем кампаниям
 * GET /api/campaigns/stats
 */
async function getCampaignsStats(req, res, next) {
   try {
      const totalCampaigns = await Campaign.countDocuments();
      const completedCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.COMPLETED,
      });
      const sendingCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.SENDING,
      });
      const pendingCampaigns = await Campaign.countDocuments({
         status: constants.CAMPAIGN_STATUS.PENDING,
      });

      // Агрегация для подсчета общей статистики отправок
      const stats = await Campaign.aggregate([
         {
            $group: {
               _id: null,
               totalSuccess: { $sum: "$successCount" },
               totalErrors: { $sum: "$errorCount" },
               totalRecipients: { $sum: { $size: "$recipients" } },
            },
         },
      ]);

      const result = {
         campaigns: {
            total: totalCampaigns,
            completed: completedCampaigns,
            sending: sendingCampaigns,
            pending: pendingCampaigns,
         },
         emails: stats[0] || {
            totalSuccess: 0,
            totalErrors: 0,
            totalRecipients: 0,
         },
      };

      res.json(result);
   } catch (error) {
      next(error);
   }
}

module.exports = {
   startCampaign,
   getCampaigns,
   getCampaignByAlias,
   getCampaignsStats,
};
