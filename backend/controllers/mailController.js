/**
 * Контроллер для обработки отправки email
 * Содержит бизнес-логику для endpoint /send
 */

const parseEmailsFromFile = require("../services/parseEmailsFromFile");
const { createAlias } = require("../services/senderPrefix");
const { sendEmails, makeAttachment } = require("../services/sendgridService");
const { createEmailHtml, createEmailText } = require("../utils/emailTemplates");
const Campaign = require("../models/Campaign");
const constants = require("../config/constants");
const clearUploads = require("../services/clearUploads");

/**
 * Обработка отправки email рассылки
 * POST /api/send
 */
async function sendEmailCampaign(req, res, next) {
   try {
      // Проверка наличия файлов
      if (!req.files || !req.files.emails || !req.files.resume) {
         return res.status(400).json({
            error: "Missing Files",
            message: "Both resume and emails files are required",
         });
      }

      const emailsFile = req.files.emails[0];
      const resumeFile = req.files.resume[0];

      // Проверка формата файла emails
      const ext = emailsFile.originalname.split(".").pop().toLowerCase();
      if (!constants.ALLOWED_EMAIL_FILE_EXTENSIONS.includes(`.${ext}`)) {
         return res.status(400).json({
            error: "Invalid File Format",
            message: `Unsupported file format: .${ext}. Supported formats are: ${constants.ALLOWED_EMAIL_FILE_EXTENSIONS.join(
               ", "
            )}`,
         });
      }

      // Парсинг email адресов из файла
      const emails = parseEmailsFromFile(
         emailsFile.path,
         emailsFile.originalname
      );

      if (emails.length === 0) {
         return res.status(400).json({
            error: "No Valid Emails",
            message: "No valid emails found in the file",
         });
      }

      // Парсинг messengers
      let messengers = [];
      try {
         messengers = JSON.parse(req.body.messengers || "[]");
      } catch (e) {
         messengers = [];
      }
      const messengersStr = messengers.length ? messengers.join("/") : "";

      // Формирование email контента
      const coverLetterText = req.body.coverLetter;
      const subjectWithEmoji =
         "🧑 " +
         (req.body.subject || constants.DEFAULTS.EMAIL_SUBJECT) +
         " ⚓️";

      const emailHtml = createEmailHtml(
         req.body.subject || constants.DEFAULTS.EMAIL_SUBJECT,
         coverLetterText,
         req.body.senderName,
         req.body.contactPhone,
         messengersStr
      );

      const emailText = createEmailText(
         coverLetterText,
         req.body.senderName,
         req.body.contactPhone,
         messengersStr
      );

      // Создание алиаса и кампании
      const alias = await createAlias(
         req.body.senderName,
         emails,
         req.body.clientEmail
      );

      // Находим созданную кампанию
      const campaign = await Campaign.findOne({ alias });
      if (!campaign) {
         throw new Error("Failed to create campaign");
      }

      // Сохранение метаданных кампании
      campaign.subject = subjectWithEmoji;
      campaign.body = emailHtml;
      campaign.text = emailText;
      campaign.senderName = req.body.senderName;
      campaign.contactPhone = req.body.contactPhone;
      campaign.messengers = messengers;
      campaign.attachments = [
         {
            filename: resumeFile.originalname,
            size: resumeFile.size,
            type: resumeFile.mimetype,
         },
      ];
      await campaign.save();

      // Формирование вложения
      const resumeAttachment = makeAttachment(resumeFile);

      // Отправка писем
      await sendEmails(alias, emails, subjectWithEmoji, emailHtml, emailText, [
         resumeAttachment,
      ]);

      // Получение обновленной статистики
      const updatedCampaign = await Campaign.findOne({ alias });

      res.json({
         message: `Mailing completed. Successful: ${
            updatedCampaign.successCount || 0
         }, Failed: ${updatedCampaign.errorCount || 0}`,
         alias: alias,
         total: emails.length,
         success: updatedCampaign.successCount || 0,
         failed: updatedCampaign.errorCount || 0,
      });
   } catch (error) {
      next(error);
   } finally {
      // Очистка загруженных файлов
      try {
         clearUploads();
      } catch (clearError) {
         console.error("Error clearing uploads:", clearError.message);
      }
   }
}

/**
 * Обработка клиентских ошибок
 * POST /api/client-error
 */
async function handleClientError(req, res, next) {
   try {
      const errorInfo = req.body;
      console.error("Client error:", errorInfo);

      // Отправка уведомления администратору (опционально)
      if (process.env.ADMIN_EMAIL) {
         try {
            const { sendEmail } = require("../services/sendgridService");
            await sendEmail({
               to: process.env.ADMIN_EMAIL,
               from: process.env.SENDGRID_FROM,
               subject: "Client-side JS Error",
               text: JSON.stringify(errorInfo, null, 2),
            });
         } catch (e) {
            console.error("Ошибка отправки письма об ошибке:", e.message);
         }
      }

      res.json({ status: "received" });
   } catch (error) {
      next(error);
   }
}

module.exports = {
   sendEmailCampaign,
   handleClientError,
};
