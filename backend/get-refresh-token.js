/**
 * Скрипт для получения OAuth2 refresh token для Gmail API
 *
 * Использование:
 * 1. Убедитесь, что в .env или в этом файле указаны GMAIL_CLIENT_ID и GMAIL_CLIENT_SECRET
 * 2. Запустите: node get-refresh-token.js
 * 3. Откройте URL в браузере и авторизуйтесь
 * 4. Скопируйте код из URL и вставьте в консоль
 * 5. Сохраните полученный refresh_token в .env
 */

require("dotenv").config();
const { google } = require("googleapis");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Попытка загрузить credentials из client_secret JSON файла
let CLIENT_ID = process.env.GMAIL_CLIENT_ID;
let CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
let REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

// Если не заданы в .env, пытаемся найти client_secret JSON файл
if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
   const clientSecretFiles = fs
      .readdirSync(__dirname)
      .filter(
         (file) => file.startsWith("client_secret_") && file.endsWith(".json")
      );

   if (clientSecretFiles.length > 0) {
      const clientSecretPath = path.join(__dirname, clientSecretFiles[0]);
      console.log(`📁 Found client_secret file: ${clientSecretFiles[0]}`);
      try {
         const clientSecretData = JSON.parse(
            fs.readFileSync(clientSecretPath, "utf8")
         );
         if (clientSecretData.web) {
            if (!CLIENT_ID) {
               CLIENT_ID = clientSecretData.web.client_id;
            }
            if (!CLIENT_SECRET) {
               CLIENT_SECRET = your_gmail_client_secret
            }
            // Используем первый redirect URI из конфигурации, если не задан в .env
            if (
               !REDIRECT_URI &&
               clientSecretData.web.redirect_uris &&
               clientSecretData.web.redirect_uris.length > 0
            ) {
               REDIRECT_URI = clientSecretData.web.redirect_uris[0];
               console.log(
                  `✅ Using redirect URI from client_secret: ${REDIRECT_URI}`
               );
            }
            console.log("✅ Loaded credentials from client_secret file");
         }
      } catch (error) {
         console.error("❌ Error reading client_secret file:", error.message);
      }
   }
}

// Если redirect URI все еще не задан, используем стандартный для получения кода напрямую
if (!REDIRECT_URI) {
   // Используем специальный URI для desktop приложений (получение кода напрямую)
   REDIRECT_URI = "your_secret_value";
   console.log(
      "⚠️  Using default redirect URI for desktop apps: your_secret_value"
   );
   console.log("   Make sure this URI is added to Google Cloud Console!");
}

if (!CLIENT_ID || !CLIENT_SECRET) {
   console.error(
      "❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are required"
   );
   console.error(
      "Set them in .env file or place client_secret_*.json file in backend/ directory"
   );
   process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
   CLIENT_ID,
   CLIENT_SECRET,
   REDIRECT_URI
);

const SCOPES = [
   "https://www.googleapis.com/auth/gmail.readonly",
   "https://www.googleapis.com/auth/gmail.modify",
];

// Генерируем URL для авторизации
const authUrl = oauth2Client.generateAuthUrl({
   access_type: "offline", // Важно для получения refresh token
   scope: SCOPES,
   prompt: "consent", // Важно! Без этого refresh token не будет выдан повторно
   include_granted_scopes: true,
});

console.log("\n" + "=".repeat(60));
console.log("🔐 Gmail OAuth2 Refresh Token Generator");
console.log("=".repeat(60));
console.log(`\n📌 Используемый redirect URI: ${REDIRECT_URI}`);
console.log("\n⚠️  ВАЖНО: Если вы получили ошибку 400: invalid_request:");
console.log("   1. Убедитесь, что используется Desktop Client (не Web Client)");
console.log("   2. Перейдите в Google Cloud Console:");
console.log("      https://console.cloud.google.com/apis/credentials");
console.log("   3. Найдите ваш OAuth 2.0 Client ID (тип: Desktop app)");
console.log("   4. Если используете Web Client, добавьте redirect URI:");
console.log(`      ${REDIRECT_URI}`);
console.log("   5. Если приложение в режиме тестирования:");
console.log("      - Добавьте ваш email в 'Test users'");
console.log("      - Или опубликуйте приложение (для production)");
console.log("\n💡 Рекомендация: Создайте новый Desktop Client:");
console.log("   CREATE CREDENTIALS → OAuth client ID → Desktop app");
console.log("\n📋 Шаги для получения токена:");
console.log("1. Откройте этот URL в браузере:");
console.log("\n" + authUrl + "\n");
console.log("2. Войдите в Google аккаунт (тот, где находится Gmail ящик)");
console.log("3. Разрешите доступ приложению");
if (REDIRECT_URI === "your_secret_value") {
   console.log("4. После авторизации код будет показан на странице Google");
   console.log("5. Скопируйте код и вставьте его ниже");
} else {
   console.log("4. После авторизации вы будете перенаправлены");
   console.log("5. Скопируйте код из URL (параметр code=...)");
}
console.log("\n" + "=".repeat(60) + "\n");

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

rl.question(
   "📝 Вставьте код из URL (или нажмите Enter для выхода): ",
   async (code) => {
      if (!code || code.trim() === "") {
         console.log("❌ Код не введен. Выход.");
         rl.close();
         process.exit(0);
      }

      try {
         const { tokens } = await oauth2Client.getToken(code.trim());

         console.log("\n" + "=".repeat(60));
         console.log("✅ Успешно получены токены!");
         console.log("=".repeat(60) + "\n");

         // Путь к .env файлу
         const envPath = path.join(__dirname, ".env");
         let envContent = "";

         // Читаем существующий .env файл, если он есть
         if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, "utf8");
         }

         // Функция для обновления или добавления переменной в .env
         const updateEnvVar = (key, value) => {
            const regex = new RegExp(`^${key}=.*$`, "m");
            if (regex.test(envContent)) {
               envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
               // Добавляем в конец файла, если переменной нет
               if (envContent && !envContent.endsWith("\n")) {
                  envContent += "\n";
               }
               envContent += `${key}=${value}\n`;
            }
         };

         // Обновляем или добавляем переменные
         let updated = false;
         if (tokens.refresh_token) {
            updateEnvVar("GMAIL_REFRESH_TOKEN", tokens.refresh_token);
            updated = true;
            console.log("✅ GMAIL_REFRESH_TOKEN добавлен в .env файл");
         } else {
            console.log(
               "⚠️  Refresh token не получен. Возможно, токен уже был выдан ранее."
            );
            console.log(
               "    Попробуйте отозвать доступ приложению и запустить скрипт снова."
            );
         }

         // Также обновляем CLIENT_ID и CLIENT_SECRET, если их нет в .env
         if (!process.env.GMAIL_CLIENT_ID) {
            updateEnvVar("GMAIL_CLIENT_ID", CLIENT_ID);
            updated = true;
            console.log("✅ GMAIL_CLIENT_ID добавлен в .env файл");
         }
         if (!process.env.GMAIL_CLIENT_SECRET) {
            updateEnvVar("GMAIL_CLIENT_SECRET", CLIENT_SECRET);
            updated = true;
            console.log("✅ GMAIL_CLIENT_SECRET добавлен в .env файл");
         }

         // Сохраняем .env файл
         if (updated) {
            fs.writeFileSync(envPath, envContent, "utf8");
            console.log("\n✅ .env файл обновлен!");
         }

         console.log("\n📋 Значения в .env файле:");
         if (tokens.refresh_token) {
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
         }
         if (!process.env.GMAIL_CLIENT_ID) {
            console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
         }
         if (!process.env.GMAIL_CLIENT_SECRET) {
            console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
         }

         if (tokens.access_token) {
            console.log(
               "\n⚠️  Примечание: Access token имеет ограниченный срок действия."
            );
            console.log(
               "    Используйте refresh token для автоматического обновления."
            );
         }

         console.log("\n" + "=".repeat(60));
         console.log("✅ Готово! Refresh token сохранен в .env файл.");
         console.log("=".repeat(60) + "\n");

         rl.close();
      } catch (error) {
         console.error("\n❌ Ошибка при получении токена:", error.message);
         if (error.response) {
            console.error(
               "Детали:",
               JSON.stringify(error.response.data, null, 2)
            );
         }
         rl.close();
         process.exit(1);
      }
   }
);
