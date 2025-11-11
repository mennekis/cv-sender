const fs = require("fs");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { senderPrefix, createAlias } = require("../services/senderPrefix");
const Campaign = require("../models/Campaign");

const clearUploads = require("../services/clearUploads");
const parseEmailsFromFile = require("../services/parseEmailsFromFile");
const {
   sendEmail,
   sendEmails,
   makeAttachment,
} = require("../services/sendgridService");

// Set up multer for file uploads с ограничениями
const upload = multer({
   dest: "uploads/",
   limits: {
      fileSize: 10 * 1024 * 1024, // 10MB максимум на файл
      files: 2, // максимум 2 файла (resume + emails)
   },
   fileFilter: (req, file, cb) => {
      // Проверка типа файла для resume
      if (file.fieldname === "resume") {
         if (file.mimetype === "application/pdf") {
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

// Заглушка-контроллер (позже добавим обработку)
router.post(
   "/send",
   upload.fields([
      { name: "resume", maxCount: 1 },
      // { name: "coverLetter", maxCount: 1 },
      { name: "emails", maxCount: 1 },
   ]),

   async (req, res) => {
      // Обработка ошибок multer
      if (req.fileValidationError) {
         return res.status(400).json({ message: req.fileValidationError });
      }

      // Обработка ошибок размера файла
      if (req.files) {
         for (const field in req.files) {
            for (const file of req.files[field]) {
               if (file.size > 10 * 1024 * 1024) {
                  return res.status(400).json({
                     message: `File ${file.originalname} is too large. Maximum size is 10MB.`,
                  });
               }
            }
         }
      }

      console.log("Получен запрос на отправку email");
      console.log("Тело запроса:", req.body);
      if (!req.files || !req.files.emails || !req.files.resume) {
         return res
            .status(400)
            .json({ message: "Not all files to be downloaded!" });
      }
      if (!req.body.coverLetter) {
         return res
            .status(400)
            .json({ message: "Letter field not filled in!" });
      }
      if (!req.body.subject) {
         return res
            .status(400)
            .json({ message: "The subject field is not filled in!" });
      }
      if (!req.body.contactPhone) {
         return res
            .status(400)
            .json({ message: "The contact phone field is not filled in!" });
      }
      if (!req.body.clientEmail) {
         return res
            .status(400)
            .json({ message: "The client email field is not filled in!" });
      }
      if (!req.body.senderName) {
         return res
            .status(400)
            .json({ message: "The sender name field is not filled in!" });
      }
      const emailsFile = req.files.emails[0];
      const allowedExt = [".csv", ".xls", ".xlsx"];
      const ext = emailsFile.originalname.split(".").pop().toLowerCase();
      if (!allowedExt.includes(`.${ext}`)) {
         return res.status(400).json({
            message: `Unsupported file format: .${ext}. Supported formats are: ${allowedExt.join(
               ", "
            )}`,
         });
      }
      try {
         const emails = parseEmailsFromFile(
            emailsFile.path,
            emailsFile.originalname
         );
         console.warn("Найденные email:", emails.length);

         if (emails.length === 0) {
            return res.status(400).json({
               message: "No valid emails found in the file",
            });
         }

         let messengers = [];
         try {
            messengers = JSON.parse(req.body.messengers || "[]");
         } catch (e) {
            messengers = [];
         }
         const messengersStr = messengers.length ? messengers.join("/") : "";

         // Для plain text
         const unsubscribePlain = `
         \nBest regards, ${req.body.senderName}.\n
         \nPhone: ${req.body.contactPhone}${
            messengersStr ? " (" + messengersStr + ")" : ""
         }\n
         \n---\nIf you do not wish to receive such emails, simply reply to this email or write to unsubscribe@your_sendgrid_api_key\nSeafarer CV Team`;

         // Формируем вложения
         const resumeAttachment = makeAttachment(req.files.resume[0]);
         // Если coverLetter — файл, читаем его как текст
         const coverLetterText = req.body.coverLetter;

         const unsubscribeHtml = `
         <br>
         <i>Best regards, ${req.body.senderName}</i>
         <br>
         <phone style="color:#839;font-size:12px;">
            <i>Phone: ${
               req.body.contactPhone || "Not provided"
            }<spanstyle="color:#263 >${
            messengersStr ? " (" + messengersStr + ")" : ""
         }<span></i>
         </phone>
         <br>
          <hr>
          <p style="color:#888;font-size:12px;">
            If you do not wish to receive such emails, simply reply to this email or write to
            <a href="mailto:unsubscribe@your_sendgrid_api_key">unsubscribe@your_sendgrid_api_key</a>
            <br>Seafarer CV Team
          </p>
   `;
         const header = `<h1 style="color:#333;font-size:32px;margin-left:auto;margin-right:auto">${
            req.body.subject || "Seafarer Resume"
         }</h1>
   <br>
   <hr>`;
         const coverLetterHtml =
            header +
            `<div style="font-size:18px; line-height:1.5; color:#222;">` +
            coverLetterText
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/\n/g, "<br>") +
            `</div>` +
            unsubscribeHtml;
         const coverLetterTextWithUnsub = coverLetterText + unsubscribePlain;

         // Создаем алиас и кампанию в MongoDB
         const alias = await createAlias(
            req.body.senderName,
            emails,
            req.body.clientEmail
         );
         console.log(`✅ Campaign created with alias: ${alias}`);

         // Находим созданную кампанию и обновляем метаданные
         const campaign = await Campaign.findOne({ alias });
         if (!campaign) {
            throw new Error("Failed to create campaign");
         }

         const subjectWithEmoji =
            "🧑 " +
            (req.body.subject ||
               process.env.EMAIL_SUBJECT ||
               "Seafarer Resume") +
            " ⚓️";

         // Сохраняем метаданные в кампанию
         campaign.subject = subjectWithEmoji;
         campaign.body = coverLetterHtml;
         campaign.text = coverLetterTextWithUnsub;
         campaign.senderName = req.body.senderName;
         campaign.contactPhone = req.body.contactPhone;
         campaign.messengers = messengers;
         campaign.attachments = [
            {
               filename: req.files.resume[0].originalname,
               size: req.files.resume[0].size,
               type: req.files.resume[0].mimetype,
            },
         ];
         await campaign.save();
         console.log(`✅ Campaign metadata saved for alias: ${alias}`);

         // Используем sendEmails для массовой рассылки с алиасом
         await sendEmails(
            alias,
            emails,
            subjectWithEmoji,
            coverLetterHtml,
            coverLetterTextWithUnsub,
            [resumeAttachment]
         );

         // Получаем обновленную статистику из кампании
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
         console.error("Error in /send endpoint:", error);
         return res.status(500).json({ message: error.message });
      } finally {
         // Всегда очищаем загруженные файлы
         try {
            clearUploads();
         } catch (clearError) {
            console.error("Error clearing uploads:", clearError.message);
         }
      }
      console.log("Загруженные файлы:", Object.keys(req.files).length);
   }
);
router.post("/client-error", async (req, res) => {
   const errorInfo = req.body;
   console.error("Client error:", errorInfo);

   // Если хочешь отправлять себе на почти:
   try {
      await sendEmail({
         to: process.env.ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM,
         subject: "Client-side JS Error",
         text: JSON.stringify(errorInfo, null, 2),
      });
   } catch (e) {
      console.error("Ошибка отправки письма об ошибке:", e.message);
   }

   res.json({ status: "received" });
});

/**
 * Новый endpoint для запуска кампании
 * POST /api/campaign/start
 * Принимает: clientName, subject, body и CSV-файл с email'ами
 */
router.post("/campaign/start", upload.single("emails"), async (req, res) => {
   try {
      // Валидация входных данных
      if (!req.body.clientName) {
         return res.status(400).json({ error: "clientName is required" });
      }
      if (!req.body.subject) {
         return res.status(400).json({ error: "subject is required" });
      }
      if (!req.body.body) {
         return res.status(400).json({ error: "body is required" });
      }
      if (!req.file) {
         return res
            .status(400)
            .json({ error: "CSV file with emails is required" });
      }

      // Проверка формата файла
      const allowedExt = [".csv", ".xls", ".xlsx"];
      const ext = req.file.originalname.split(".").pop().toLowerCase();
      if (!allowedExt.includes(`.${ext}`)) {
         return res.status(400).json({
            error: `Unsupported file format: .${ext}. Supported formats are: ${allowedExt.join(
               ", "
            )}`,
         });
      }

      // Парсинг email'ов из файла
      const recipients = parseEmailsFromFile(
         req.file.path,
         req.file.originalname
      );

      if (recipients.length === 0) {
         return res
            .status(400)
            .json({ error: "No valid emails found in the file" });
      }

      console.log(`📧 Found ${recipients.length} valid email addresses`);

      // Создание алиаса и сохранение кампании в БД
      const alias = await createAlias(req.body.clientName, recipients);
      console.log(`✅ Campaign created with alias: ${alias}`);

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
   } catch (err) {
      console.error("❌ Error starting campaign:", err);
      res.status(500).json({ error: err.message });
   }
});

/**
 * GET /api/campaigns - Получить список всех кампаний
 * Query параметры:
 *   - limit: количество записей (по умолчанию 50)
 *   - skip: пропустить N записей (для пагинации)
 *   - status: фильтр по статусу (pending, sending, completed)
 */
router.get("/campaigns", async (req, res) => {
   try {
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      const status = req.query.status;

      const query = {};
      if (status) {
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
   } catch (err) {
      console.error("❌ Error fetching campaigns:", err);
      res.status(500).json({ error: err.message });
   }
});

/**
 * GET /api/campaign/:alias - Получить детали конкретной кампании по алиасу
 */
router.get("/campaign/:alias", async (req, res) => {
   try {
      const campaign = await Campaign.findOne({ alias: req.params.alias });

      if (!campaign) {
         return res.status(404).json({ error: "Campaign not found" });
      }

      res.json(campaign);
   } catch (err) {
      console.error("❌ Error fetching campaign:", err);
      res.status(500).json({ error: err.message });
   }
});

/**
 * GET /api/campaigns/stats - Получить общую статистику по всем кампаниям
 */
router.get("/campaigns/stats", async (req, res) => {
   try {
      const totalCampaigns = await Campaign.countDocuments();
      const completedCampaigns = await Campaign.countDocuments({
         status: "completed",
      });
      const sendingCampaigns = await Campaign.countDocuments({
         status: "sending",
      });
      const pendingCampaigns = await Campaign.countDocuments({
         status: "pending",
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
   } catch (err) {
      console.error("❌ Error fetching stats:", err);
      res.status(500).json({ error: err.message });
   }
});

module.exports = router;
