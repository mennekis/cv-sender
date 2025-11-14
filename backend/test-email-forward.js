/**
 * Тестовый скрипт для ручной проверки пересылки почты
 *
 * Использование:
 *   node test-email-forward.js
 *
 * Скрипт:
 * 1. Инициализирует Gmail API
 * 2. Проверяет непрочитанные письма за последние 12 часов
 * 3. Обрабатывает найденные письма и пересылает их клиентам
 * 4. Показывает детальную информацию о процессе
 */

require("dotenv").config();
const {
   checkAndProcessReplies,
   initGmail,
} = require("./services/gmailReplyService");

async function testEmailForward() {
   console.log("=".repeat(60));
   console.log("🧪 Тест пересылки почты");
   console.log("=".repeat(60));
   console.log();

   // Проверка переменных окружения
   if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.error("❌ GMAIL_REFRESH_TOKEN не установлен в .env");
      console.error("   Запустите: node get-refresh-token.js");
      process.exit(1);
   }

   if (!process.env.ENABLE_GMAIL_REPLY_CHECKER) {
      console.warn("⚠️  ENABLE_GMAIL_REPLY_CHECKER не установлен");
   }

   const serviceEmail =
      process.env.GMAIL_SERVICE_EMAIL || "your_service_email@example.com";
   console.log(`📧 Проверка почты: ${serviceEmail}`);
   console.log();

   try {
      // Инициализация Gmail API
      console.log("🔄 Инициализация Gmail API...");
      await initGmail();
      console.log("✅ Gmail API инициализирован");
      console.log();

      // Запуск проверки и обработки писем
      console.log("📬 Запуск проверки почты...");
      console.log();
      await checkAndProcessReplies();
      console.log();

      console.log("=".repeat(60));
      console.log("✅ Тест завершен");
      console.log("=".repeat(60));
   } catch (error) {
      console.error();
      console.error("=".repeat(60));
      console.error("❌ Ошибка при тестировании:");
      console.error("=".repeat(60));
      console.error(error.message);
      if (error.stack) {
         console.error();
         console.error("Stack trace:");
         console.error(error.stack);
      }
      process.exit(1);
   }
}

// Запуск теста
testEmailForward();
