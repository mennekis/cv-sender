require("dotenv").config();
const app = require("./app");
const { sendEmail } = require("./services/sendgridService");
const { connectDB } = require("./services/db");

// Валидация обязательных переменных окружения
const requiredEnvVars = [
   "SENDGRID_API_KEY",
   "SENDGRID_FROM",
   "ADMIN_EMAIL",
   "MONGO_URI",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
   console.error(
      "❌ Missing required environment variables:",
      missingVars.join(", ")
   );
   console.error("Please check your .env file or environment configuration.");
   process.exit(1);
}

// Проверка опциональных переменных с предупреждениями
if (!process.env.SENDGRID_DOMAIN) {
   console.warn("⚠️  SENDGRID_DOMAIN not set, using default: your_sendgrid_api_key");
}

process.on("uncaughtException", async (err) => {
   // Логируем в консоль в любом случае
   console.error("❌ Uncaught Exception:", err);
   console.error("Stack:", err.stack);

   // Пытаемся отправить email уведомление
   try {
      await sendEmail({
         to: process.env.ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM,
         subject: "Node.js uncaughtException",
         text: err.stack || err.message,
      });
   } catch (e) {
      console.error("Ошибка отправки письма об uncaughtException:", e.message);
      // Fallback: записываем в файл, если email не отправился
      const fs = require("fs");
      const path = require("path");
      try {
         const logPath = path.join(
            __dirname,
            "logs",
            "uncaught-exceptions.log"
         );
         fs.appendFileSync(
            logPath,
            `[${new Date().toISOString()}] ${err.stack || err.message}\n`
         );
      } catch (logError) {
         console.error("Не удалось записать в лог файл:", logError.message);
      }
   }
   process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
   // Логируем в консоль в любом случае
   console.error("❌ Unhandled Rejection:", reason);
   if (reason && reason.stack) {
      console.error("Stack:", reason.stack);
   }

   // Пытаемся отправить email уведомление
   try {
      await sendEmail({
         to: process.env.ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM,
         subject: "Node.js unhandledRejection",
         text: reason?.stack || String(reason),
      });
   } catch (e) {
      console.error("Ошибка отправки письма об unhandledRejection:", e.message);
      // Fallback: записываем в файл, если email не отправился
      const fs = require("fs");
      const path = require("path");
      try {
         const logPath = path.join(
            __dirname,
            "logs",
            "unhandled-rejections.log"
         );
         fs.appendFileSync(
            logPath,
            `[${new Date().toISOString()}] ${reason?.stack || String(reason)}\n`
         );
      } catch (logError) {
         console.error("Не удалось записать в лог файл:", logError.message);
      }
   }
   process.exit(1);
});

const PORT = process.env.PORT || 3000;

// Подключение к MongoDB
connectDB();

// Инициализация и запуск Gmail reply checker (опционально)
if (process.env.ENABLE_GMAIL_REPLY_CHECKER === "true") {
   const { startEmailChecker } = require("./services/gmailReplyService");
   startEmailChecker();
}

app.listen(PORT, () => {
   console.log(`Server started on port ${PORT}`);
});
