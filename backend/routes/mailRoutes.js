const fs = require("fs");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { senderPrefix, createAlias } = require("../services/senderPrefix");

const clearUploads = require("../services/clearUploads");
const parseEmailsFromFile = require("../services/parseEmailsFromFile");
const {
   sendEmail,
   sendEmails,
   makeAttachment,
} = require("../services/sendgridService");

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Заглушка-контроллер (позже добавим обработку)
router.post(
   "/send",
   upload.fields([
      { name: "resume", maxCount: 1 },
      // { name: "coverLetter", maxCount: 1 },
      { name: "emails", maxCount: 1 },
   ]),

   async (req, res) => {
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
         const prefixSender = senderPrefix(
            req.body.senderName || process.env.FROM_NAME
         );
         // Отправляем email каждому получателю
         // Отправляем письма
         let success = 0,
            failed = 0;
         console.warn(prefixSender);
         for (const to of emails) {
            try {
               const subjectWithEmoji =
                  "🧑 " +
                  (req.body.subject ||
                     process.env.EMAIL_SUBJECT ||
                     "Seafarer Resume") +
                  " ⚓️";
               console.log({
                  to,
                  from: prefixSender
                     ? `${prefixSender}_${process.env.SENDGRID_FROM}`
                     : process.env.SENDGRID_FROM,
                  subject: process.env.EMAIL_SUBJECT || "Seafarer Resume",
                  text: coverLetterTextWithUnsub,
                  html: coverLetterHtml,
                  attachments: [resumeAttachment.filename],
               });
               console.log(`Отправка письма на ${to}...`);
               await sendEmail({
                  to,
                  from:
                     `${prefixSender}_${process.env.SENDGRID_FROM}` ||
                     process.env.SENDGRID_FROM,
                  subject: subjectWithEmoji,
                  text: coverLetterTextWithUnsub,
                  html: coverLetterHtml,
                  attachments: [resumeAttachment],
               });
               success++;
            } catch (e) {
               failed++;
               console.error(`Ошибка отправки на ${to}:`, e.message);
            }
         }
         res.json({
            message: `Mailing completed. Successful: ${success}, Failed: ${failed}`,
            total: emails.length,
            success,
            failed,
         });
         clearUploads();
      } catch (error) {
         return res.status(500).json({ message: error.message });
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

module.exports = router;
