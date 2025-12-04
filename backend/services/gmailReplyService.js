const { google } = require("googleapis");
const Campaign = require("../models/Campaign");
const { sendEmail } = require("./sendgridService");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Настройка Gmail API
const SCOPES = [
   "https://www.googleapis.com/auth/gmail.readonly",
   "https://www.googleapis.com/auth/gmail.modify", // Для пометки писем как прочитанных
];
const SERVICE_EMAIL =
   process.env.GMAIL_SERVICE_EMAIL || "your_secret_value";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 минут в миллисекундах (для тестирования, потом можно увеличить)

let gmail = null;
let checkInterval = null;
let oauth2Client = null; // Сохраняем ссылку на OAuth2 клиент для переинициализации
let lastTokenErrorNotification = null; // Время последнего уведомления об ошибке токена
let lastRefreshTokenValue = null; // Последнее значение refresh token для отслеживания изменений
let tokenCheckInterval = null; // Интервал для проверки токена
let lastProactiveRefresh = null; // Время последнего проактивного обновления токена
const TOKEN_ERROR_NOTIFICATION_INTERVAL = 60 * 60 * 1000; // 1 час между уведомлениями
const TOKEN_CHECK_INTERVAL = 10 * 60 * 1000; // Проверка токена каждые 10 минут (для быстрого обнаружения обновлений)
const PROACTIVE_REFRESH_INTERVAL = 1 * 24 * 60 * 60 * 1000; // Проактивное обновление каждые 1 день (для предотвращения истечения refresh token)
const ADMIN_EMAIL = "mennekis@gmail.com"; // Email для уведомлений об ошибках токена

// Схема для отслеживания обработанных писем (защита от дубликатов)
const ProcessedEmailSchema = new mongoose.Schema(
   {
      messageId: { type: String, required: true, unique: true },
      processedAt: { type: Date, default: Date.now, expires: 86400 }, // Автоудаление через 24 часа
   },
   { collection: "processed_emails" }
);

let ProcessedEmail = null;

/**
 * Проверяет, является ли ошибка ошибкой истечения токена
 */
function isTokenExpiredError(error) {
   if (!error) return false;
   const errorMessage = error.message || error.toString() || "";
   return (
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("Token has been expired") ||
      errorMessage.includes("invalid_token") ||
      errorMessage.includes("unauthorized_client") ||
      (error.response &&
         (error.response.data?.error === "invalid_grant" ||
            error.response.data?.error === "unauthorized_client" ||
            error.response.data?.error_description?.includes(
               "Token has been expired"
            )))
   );
}

/**
 * Отправляет уведомление администратору об ошибке токена
 * Защита от спама: отправляет не чаще раза в час
 */
async function sendTokenErrorNotification(errorDetails = {}) {
   const now = Date.now();

   // Проверяем, не отправляли ли мы уведомление недавно
   if (
      lastTokenErrorNotification &&
      now - lastTokenErrorNotification < TOKEN_ERROR_NOTIFICATION_INTERVAL
   ) {
      const minutesSinceLastNotification = Math.floor(
         (now - lastTokenErrorNotification) / (60 * 1000)
      );
      console.log(
         `⏭️  Skipping token error notification (sent ${minutesSinceLastNotification} minutes ago)`
      );
      return;
   }

   try {
      const subject = "⚠️ Gmail Token Error - Automatic Refresh Failed";
      const text = `
ВНИМАНИЕ: Проблема с Gmail токеном!

Gmail API токен истек и автоматическое обновление не сработало.

Детали ошибки:
${errorDetails.message || "Refresh token expired or invalid"}

═══════════════════════════════════════════════════════════════
ДЕЙСТВИЯ ДЛЯ ИСПРАВЛЕНИЯ:
═══════════════════════════════════════════════════════════════

1. Подключитесь к VPS:
   ssh root@your_vps_ip

2. Перейдите в директорию backend:
   cd /root/sender-app/backend

3. Запустите скрипт получения нового токена:
   docker-compose exec backend node get-refresh-token.js
   
   Или если скрипт на хосте:
   node get-refresh-token.js

4. Следуйте инструкциям скрипта:
   - Откройте URL в браузере
   - Авторизуйтесь в Google
   - Скопируйте код авторизации
   - Вставьте код в терминал
   - Скрипт автоматически обновит .env файл

5. Перезапустите контейнер:
   cd /root/sender-app
   docker-compose restart backend

6. Проверьте логи, что все работает:
   docker-compose logs --tail=50 backend | grep -i "token\|email checker"

═══════════════════════════════════════════════════════════════
ПРОВЕРКА ЛОГОВ (если нужно диагностировать проблему):
═══════════════════════════════════════════════════════════════

Просмотр последних логов:
  docker-compose logs --tail=100 backend

Поиск ошибок токена:
  docker-compose logs backend | grep -i "token\|refresh\|invalid_grant"

Проверка статуса сервисов:
  docker-compose ps
  docker-compose logs backend | grep "Email checker started"

Проверка текущего токена в .env:
  docker-compose exec backend grep GMAIL_REFRESH_TOKEN .env

═══════════════════════════════════════════════════════════════
ИНФОРМАЦИЯ:
═══════════════════════════════════════════════════════════════

Время ошибки: ${new Date().toISOString()}
Сервер: ${process.env.SERVER_NAME || "VPS (your_vps_ip)"}

⚠️ ВАЖНО: Проверка ответов на письма временно не работает до обновления токена.
Система автоматически возобновит работу после обновления GMAIL_REFRESH_TOKEN.
      `.trim();

      const html = `
<h2 style="color: #d32f2f;">⚠️ ВНИМАНИЕ: Проблема с Gmail токеном!</h2>
<p>Gmail API токен истек и автоматическое обновление не сработало.</p>

<h3>Детали ошибки:</h3>
<p style="background: #ffebee; padding: 10px; border-left: 4px solid #d32f2f;"><strong>${
         errorDetails.message || "Refresh token expired or invalid"
      }</strong></p>

<h3 style="color: #1976d2;">📋 Действия для исправления:</h3>
<ol style="line-height: 1.8;">
   <li><strong>Подключитесь к VPS:</strong><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">ssh root@your_vps_ip</code>
   </li>
   <li><strong>Перейдите в директорию backend:</strong><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">cd /root/sender-app/backend</code>
   </li>
   <li><strong>Запустите скрипт получения нового токена:</strong><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">docker-compose exec backend node get-refresh-token.js</code><br>
       <small>Или если скрипт на хосте: <code>node get-refresh-token.js</code></small>
   </li>
   <li><strong>Следуйте инструкциям скрипта:</strong>
       <ul>
          <li>Откройте URL в браузере</li>
          <li>Авторизуйтесь в Google</li>
          <li>Скопируйте код авторизации</li>
          <li>Вставьте код в терминал</li>
          <li>Скрипт автоматически обновит .env файл</li>
       </ul>
   </li>
   <li><strong>Перезапустите контейнер:</strong><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">cd /root/sender-app</code><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">docker-compose restart backend</code>
   </li>
   <li><strong>Проверьте логи, что все работает:</strong><br>
       <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px;">docker-compose logs --tail=50 backend | grep -i "token\\|email checker"</code>
   </li>
</ol>

<h3 style="color: #1976d2;">🔍 Проверка логов (если нужно диагностировать проблему):</h3>
<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;">
<strong>Просмотр последних логов:</strong><br>
docker-compose logs --tail=100 backend<br><br>

<strong>Поиск ошибок токена:</strong><br>
docker-compose logs backend | grep -i "token\\|refresh\\|invalid_grant"<br><br>

<strong>Проверка статуса сервисов:</strong><br>
docker-compose ps<br>
docker-compose logs backend | grep "Email checker started"<br><br>

<strong>Проверка текущего токена в .env:</strong><br>
docker-compose exec backend grep GMAIL_REFRESH_TOKEN .env
</div>

<h3 style="color: #1976d2;">ℹ️ Информация:</h3>
<p><strong>Время ошибки:</strong> ${new Date().toISOString()}</p>
<p><strong>Сервер:</strong> ${
         process.env.SERVER_NAME || "VPS (your_vps_ip)"
      }</p>

<p style="color: #d32f2f; font-weight: bold; padding: 10px; background: #ffebee; border-left: 4px solid #d32f2f;">
⚠️ ВАЖНО: Проверка ответов на письма временно не работает до обновления токена.<br>
Система автоматически возобновит работу после обновления GMAIL_REFRESH_TOKEN.
</p>
      `.trim();

      await sendEmail({
         to: ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM || SERVICE_EMAIL,
         subject,
         text,
         html,
      });

      lastTokenErrorNotification = now;
      console.log(`✅ Token error notification sent to ${ADMIN_EMAIL}`);
   } catch (err) {
      console.error(`❌ Failed to send token error notification:`, err.message);
      // Не пробрасываем ошибку дальше, чтобы не прерывать основную работу
   }
}

/**
 * Перезагружает переменные окружения из .env файла
 */
function reloadEnvVariables() {
   try {
      const envPath = path.join(__dirname, "../.env");
      if (fs.existsSync(envPath)) {
         const envContent = fs.readFileSync(envPath, "utf8");
         const envLines = envContent.split("\n");

         for (const line of envLines) {
            const trimmedLine = line.trim();
            // Пропускаем комментарии и пустые строки
            if (!trimmedLine || trimmedLine.startsWith("#")) {
               continue;
            }

            const equalIndex = trimmedLine.indexOf("=");
            if (equalIndex > 0) {
               const key = trimmedLine.substring(0, equalIndex).trim();
               let value = trimmedLine.substring(equalIndex + 1).trim();

               // Удаляем кавычки если есть
               if (
                  (value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))
               ) {
                  value = value.slice(1, -1);
               }

               // Обновляем только Gmail-related переменные
               if (key.startsWith("GMAIL_")) {
                  process.env[key] = value;
               }
            }
         }
         return true;
      }
   } catch (err) {
      console.warn("⚠️  Failed to reload .env file:", err.message);
   }
   return false;
}

/**
 * Проверяет, изменился ли refresh token в переменных окружения
 * и переинициализирует Gmail API если нужно
 * @param {boolean} forceReload - Принудительно перезагрузить .env файл
 */
async function checkAndReinitIfTokenChanged(forceReload = false) {
   // Перезагружаем переменные окружения из .env файла
   if (forceReload || !lastRefreshTokenValue) {
      reloadEnvVariables();
   } else {
      // Принудительно перезагружаем при ошибках токена
      reloadEnvVariables();
   }

   const currentToken = process.env.GMAIL_REFRESH_TOKEN;

   // Если токен отсутствует, но был ранее - это проблема
   if (!currentToken && lastRefreshTokenValue) {
      console.warn("⚠️  GMAIL_REFRESH_TOKEN отсутствует в .env файле");
      return false;
   }

   // Если токен изменился, переинициализируем
   if (currentToken && currentToken !== lastRefreshTokenValue) {
      console.log("🔄 Refresh token changed, reinitializing Gmail API...");
      console.log(
         `   Old token: ${
            lastRefreshTokenValue
               ? lastRefreshTokenValue.substring(0, 20) + "..."
               : "none"
         }`
      );
      console.log(`   New token: ${currentToken.substring(0, 20)}...`);
      lastRefreshTokenValue = currentToken;
      try {
         await initGmail();
         console.log("✅ Gmail API reinitialized with new refresh token");
         return true;
      } catch (err) {
         console.error("❌ Failed to reinitialize Gmail API:", err.message);
         return false;
      }
   }

   // Если токен не изменился, но мы принудительно проверяем, логируем
   if (forceReload && currentToken) {
      console.log("ℹ️  Refresh token unchanged, current token is valid");
   }

   return false;
}

/**
 * Периодически проверяет валидность токена и пытается обновить его
 * Также выполняет проактивное обновление раз в неделю для предотвращения истечения refresh token
 */
async function periodicTokenCheck() {
   try {
      // Проверяем, изменился ли refresh token
      await checkAndReinitIfTokenChanged();

      // Если Gmail API инициализирован, проверяем валидность токена
      if (gmail && oauth2Client && process.env.GMAIL_REFRESH_TOKEN) {
         const now = Date.now();
         const shouldProactivelyRefresh =
            !lastProactiveRefresh ||
            now - lastProactiveRefresh >= PROACTIVE_REFRESH_INTERVAL;

         try {
            // Проактивное обновление: обновляем access token каждые 3 дня,
            // даже если он еще не истек, чтобы сбросить таймер неактивности refresh token
            // Примечание: access token также обновляется при каждой проверке email (каждые 5 минут)
            if (shouldProactivelyRefresh) {
               const daysSinceLastRefresh = Math.floor(
                  (now - lastProactiveRefresh) / (24 * 60 * 60 * 1000)
               );
               console.log(
                  `🔄 Proactive token refresh (${daysSinceLastRefresh} days since last refresh, maintenance to prevent refresh token expiration)...`
               );
               const { credentials } = await oauth2Client.refreshAccessToken();
               oauth2Client.setCredentials(credentials);
               gmail = google.gmail({ version: "v1", auth: oauth2Client });
               lastProactiveRefresh = now;
               console.log(
                  "✅ Proactive access token refresh completed (refresh token activity timer reset)"
               );
            } else {
               // Обычная проверка: пытаемся обновить access token для проверки валидности refresh token
               const { credentials } = await oauth2Client.refreshAccessToken();
               oauth2Client.setCredentials(credentials);
               gmail = google.gmail({ version: "v1", auth: oauth2Client });
               // Если успешно, токен валиден
               const daysSinceLastRefresh = lastProactiveRefresh
                  ? Math.floor(
                       (now - lastProactiveRefresh) / (24 * 60 * 60 * 1000)
                    )
                  : 0;
               if (daysSinceLastRefresh > 0) {
                  console.log(
                     `ℹ️  Token check: last proactive refresh was ${daysSinceLastRefresh} day(s) ago`
                  );
               }
            }
         } catch (checkError) {
            if (isTokenExpiredError(checkError)) {
               console.warn(
                  "⚠️  Refresh token validation failed during periodic check"
               );

               // При ошибке unauthorized_client принудительно перезагружаем .env
               const errorMsg = checkError.message || "";
               if (errorMsg.includes("unauthorized_client")) {
                  console.log(
                     "🔄 Unauthorized client error detected, reloading .env..."
                  );
                  reloadEnvVariables();
               }

               // Принудительно проверяем изменения токена при ошибке
               const tokenUpdated = await checkAndReinitIfTokenChanged(true);

               // Если токен не был обновлен и это ошибка истечения, отправляем уведомление
               if (!tokenUpdated) {
                  // Отправляем уведомление только если прошло достаточно времени с последнего
                  const now = Date.now();
                  if (
                     !lastTokenErrorNotification ||
                     now - lastTokenErrorNotification >=
                        TOKEN_ERROR_NOTIFICATION_INTERVAL
                  ) {
                     await sendTokenErrorNotification({
                        message:
                           checkError.message ||
                           "Refresh token expired during periodic check",
                        error: checkError,
                     });
                  } else {
                     const minutesSinceLastNotification = Math.floor(
                        (now - lastTokenErrorNotification) / (60 * 1000)
                     );
                     console.log(
                        `⏭️  Skipping token error notification (sent ${minutesSinceLastNotification} minutes ago)`
                     );
                  }
               } else {
                  console.log(
                     "✅ Token was updated and Gmail API reinitialized successfully"
                  );
               }
            } else {
               // Если это не ошибка истечения токена, логируем предупреждение
               console.warn(
                  "⚠️  Error during token check:",
                  checkError.message
               );
            }
         }
      }
   } catch (err) {
      // Игнорируем ошибки периодической проверки, чтобы не прерывать работу
      console.warn("⚠️  Error during periodic token check:", err.message);
   }
}

/**
 * Обновляет access token через refresh token
 */
async function refreshAccessToken() {
   if (!oauth2Client || !process.env.GMAIL_REFRESH_TOKEN) {
      return false;
   }

   try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      // Обновляем gmail клиент с новыми credentials
      gmail = google.gmail({ version: "v1", auth: oauth2Client });
      console.log("✅ Access token refreshed successfully");

      // Обновляем последнее известное значение токена
      lastRefreshTokenValue = process.env.GMAIL_REFRESH_TOKEN;

      // Обновляем время последнего проактивного обновления
      // (даже если это не было проактивным обновлением, это сбрасывает таймер неактивности)
      lastProactiveRefresh = Date.now();

      return true;
   } catch (refreshError) {
      if (isTokenExpiredError(refreshError)) {
         console.error(
            "❌ Refresh token expired or invalid. Attempting to check for updated token..."
         );

         // Принудительно перезагружаем .env и проверяем изменения токена
         const tokenUpdated = await checkAndReinitIfTokenChanged(true);

         if (tokenUpdated) {
            console.log(
               "✅ Refresh token was updated, retrying access token refresh..."
            );
            // Пытаемся снова обновить access token с новым refresh token
            try {
               const { credentials } = await oauth2Client.refreshAccessToken();
               oauth2Client.setCredentials(credentials);
               gmail = google.gmail({ version: "v1", auth: oauth2Client });
               console.log(
                  "✅ Access token refreshed successfully with new refresh token"
               );
               // Обновляем время последнего проактивного обновления
               lastProactiveRefresh = Date.now();
               return true;
            } catch (retryError) {
               console.error(
                  "❌ Failed to refresh even with updated token:",
                  retryError.message
               );
               // Если даже с новым токеном не получилось, возможно проблема в другом
               if (isTokenExpiredError(retryError)) {
                  console.error(
                     "   The new refresh token also appears to be invalid. Please verify:"
                  );
                  console.error(
                     "   1. GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are correct"
                  );
                  console.error(
                     "   2. Refresh token was obtained with the same OAuth2 credentials"
                  );
                  console.error(
                     "   3. OAuth2 app is not in testing mode (or your account is added as test user)"
                  );
               }
            }
         } else {
            // Токен не обновился - отправляем уведомление
            console.error("   Please update GMAIL_REFRESH_TOKEN in .env file");
            console.error(
               "   Run: node get-refresh-token.js to get a new refresh token"
            );
            console.error(
               "   After updating, the system will automatically detect the change within 30 minutes"
            );
            console.error(
               "   Or restart the backend container to apply immediately: docker-compose restart backend"
            );

            // Отправляем уведомление администратору
            await sendTokenErrorNotification({
               message:
                  refreshError.message || "Refresh token expired or invalid",
               error: refreshError,
            });
         }
      } else {
         console.warn(
            "⚠️  Failed to refresh access token:",
            refreshError.message
         );
      }
      return false;
   }
}

/**
 * Обрабатывает ошибку Gmail API и пытается восстановить соединение
 */
async function handleGmailError(error, operation = "Gmail API operation") {
   if (isTokenExpiredError(error)) {
      console.warn(
         `⚠️  Token expired during ${operation}. Attempting to refresh...`
      );

      // Сначала проверяем, не обновился ли refresh token в .env
      const tokenUpdated = await checkAndReinitIfTokenChanged(true);
      if (tokenUpdated) {
         console.log(`✅ Refresh token was updated, retrying ${operation}...`);
         return true; // Токен обновлен, можно повторить операцию
      }

      // Если токен не обновился, пытаемся обновить access token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
         console.log(`✅ Token refreshed. Retrying ${operation}...`);
         return true; // Успешно обновили, можно повторить операцию
      } else {
         console.error(
            `❌ Failed to refresh token. ${operation} cannot be completed.`
         );
         // Уведомление уже отправлено в refreshAccessToken, если токен истек
         return false; // Не удалось обновить
      }
   }
   return false; // Не ошибка токена
}

/**
 * Инициализация Gmail API
 */
async function initGmail() {
   try {
      // Приоритет 1: OAuth2 с Client ID/Secret и Refresh Token
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
         oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            process.env.GMAIL_REDIRECT_URI ||
               "http://localhost:3000/api/auth/google/callback"
         );

         // Если есть refresh token, используем его для автоматического обновления
         if (process.env.GMAIL_REFRESH_TOKEN) {
            oauth2Client.setCredentials({
               refresh_token: process.env.GMAIL_REFRESH_TOKEN,
            });

            // Сохраняем текущее значение токена для отслеживания изменений
            lastRefreshTokenValue = process.env.GMAIL_REFRESH_TOKEN;

            // Автоматически обновляем access token при необходимости
            try {
               const { credentials } = await oauth2Client.refreshAccessToken();
               oauth2Client.setCredentials(credentials);
               // console.log("✅ Access token refreshed successfully"); // Для отладки
            } catch (refreshError) {
               if (isTokenExpiredError(refreshError)) {
                  const errorMsg = refreshError.message || "";
                  if (errorMsg.includes("unauthorized_client")) {
                     console.error(
                        "❌ Gmail OAuth client mismatch. Client ID/Secret may be incorrect."
                     );
                     console.error(
                        "   Please verify GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env"
                     );
                     console.error(
                        "   They must match the Desktop Client used to generate the refresh token"
                     );
                  } else {
                     console.error(
                        "❌ Refresh token expired or invalid during initialization."
                     );
                     console.error(
                        "   Please update GMAIL_REFRESH_TOKEN in .env file"
                     );
                  }
                  console.error(
                     "   Run: node get-refresh-token.js to get a new refresh token"
                  );
                  console.log(
                     "   System will automatically detect when token is updated"
                  );
               } else {
                  console.warn(
                     "⚠️  Failed to refresh access token:",
                     refreshError.message
                  );
               }
               // Продолжаем с refresh_token, библиотека обновит токен автоматически при необходимости
            }
         } else if (process.env.GMAIL_ACCESS_TOKEN) {
            // Fallback: используем access token напрямую (временное решение)
            oauth2Client.setCredentials({
               access_token: process.env.GMAIL_ACCESS_TOKEN,
            });
            console.warn(
               "⚠️  Using access token directly. Consider using refresh token for automatic renewal."
            );
         } else {
            throw new Error(
               "GMAIL_REFRESH_TOKEN or GMAIL_ACCESS_TOKEN required when using OAuth2"
            );
         }

         gmail = google.gmail({ version: "v1", auth: oauth2Client });
      }
      // Приоритет 2: Service Account
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
         const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
            scopes: SCOPES,
         });
         gmail = google.gmail({ version: "v1", auth });
      } else {
         throw new Error(
            "Gmail authentication not configured. Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or GOOGLE_SERVICE_ACCOUNT_KEY_FILE"
         );
      }

      // console.log("✅ Gmail API initialized"); // Для отладки
   } catch (err) {
      console.error("❌ Failed to initialize Gmail API:", err.message);
      throw err;
   }
}

/**
 * Извлекает alias из email адреса или строки с несколькими адресами
 * @param {string} email - Email адрес вида seafarer_X@your_sendgrid_api_key или строка с несколькими адресами
 * @returns {string|null} - Извлеченный alias или null
 */
function extractAliasFromEmail(email) {
   if (!email || typeof email !== "string") return null;

   // Ищем паттерн seafarer_*@your_sendgrid_api_key в строке (может быть несколько адресов)
   // Паттерн: seafarer_любые_символы@your_sendgrid_api_key
   const match = email.match(/(seafarer_[^@\s<>]+)@seafarer-cv\.com/gi);
   if (match && match.length > 0) {
      // Берем первый найденный алиас и извлекаем только часть до @
      const fullMatch = match[0];
      const aliasMatch = fullMatch.match(/(seafarer_[^@]+)@seafarer-cv\.com$/i);
      return aliasMatch ? aliasMatch[1] : null;
   }
   return null;
}

/**
 * Получает список непрочитанных писем за последние 24 часа
 * ВАЖНО: Ищет только непрочитанные, чтобы не обрабатывать письма повторно
 */
async function getUnreadEmails() {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      // Получаем все непрочитанные письма за последние 24 часа
      // Gmail API не поддерживает поиск по подстроке seafarer_, поэтому
      // получаем все письма и фильтруем их в коде
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `after:${Math.floor(
         twentyFourHoursAgo.getTime() / 1000
      )} is:unread`;

      let response;
      try {
         response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100, // Увеличиваем лимит, чтобы не пропустить письма
         });
      } catch (error) {
         // Пытаемся обработать ошибку токена
         const shouldRetry = await handleGmailError(
            error,
            "fetching unread emails"
         );
         if (shouldRetry) {
            // Повторяем попытку после обновления токена
            response = await gmail.users.messages.list({
               userId: "me",
               q: query,
               maxResults: 100,
            });
         } else {
            throw error; // Пробрасываем ошибку дальше, если не удалось обновить токен
         }
      }

      const allMessages = response.data.messages || [];

      // Фильтруем письма, проверяя заголовки на наличие seafarer_
      const filteredMessages = [];
      for (const messageRef of allMessages) {
         try {
            let message;
            try {
               message = await gmail.users.messages.get({
                  userId: "me",
                  id: messageRef.id,
                  format: "metadata",
                  metadataHeaders: [
                     "To",
                     "Reply-To",
                     "X-Original-To",
                     "Delivered-To",
                     "Envelope-To",
                  ],
               });
            } catch (error) {
               // Пытаемся обработать ошибку токена
               const shouldRetry = await handleGmailError(
                  error,
                  `fetching message ${messageRef.id}`
               );
               if (shouldRetry) {
                  // Повторяем попытку после обновления токена
                  message = await gmail.users.messages.get({
                     userId: "me",
                     id: messageRef.id,
                     format: "metadata",
                     metadataHeaders: [
                        "To",
                        "Reply-To",
                        "X-Original-To",
                        "Delivered-To",
                        "Envelope-To",
                     ],
                  });
               } else {
                  throw error; // Пробрасываем ошибку дальше
               }
            }

            const headers = message.data.payload.headers || [];
            const to = headers.find((h) => h.name === "To")?.value || "";
            const replyTo =
               headers.find((h) => h.name === "Reply-To")?.value || "";
            const xOriginalTo =
               headers.find((h) => h.name === "X-Original-To")?.value || "";
            const deliveredTo =
               headers.find((h) => h.name === "Delivered-To")?.value || "";
            const envelopeTo =
               headers.find((h) => h.name === "Envelope-To")?.value || "";

            // Проверяем, есть ли seafarer_ в любом из заголовков
            const allHeaders = [
               to,
               replyTo,
               xOriginalTo,
               deliveredTo,
               envelopeTo,
            ].join(" ");
            if (allHeaders.toLowerCase().includes("seafarer_")) {
               filteredMessages.push(messageRef);
            }
         } catch (err) {
            // Пропускаем письма, которые не удалось получить
            // console.warn(`⚠️  Failed to get message ${messageRef.id}:`, err.message); // Для отладки
         }
      }

      return filteredMessages;
   } catch (err) {
      console.error("❌ Error fetching emails:", err.message);
      throw err;
   }
}

/**
 * Получает список прочитанных писем за последние 24 часа
 * Используется для обработки писем, которые были прочитаны до запуска checker'а
 * ВАЖНО: Ищет за 24 часа, чтобы не пропустить письма, которые были прочитаны ранее
 */
async function getRecentReadEmails() {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      // Получаем все прочитанные письма за последние 24 часа
      // Gmail API не поддерживает поиск по подстроке seafarer_, поэтому
      // получаем все письма и фильтруем их в коде
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `after:${Math.floor(
         twentyFourHoursAgo.getTime() / 1000
      )} -is:unread`;

      let response;
      try {
         response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100, // Увеличиваем лимит, чтобы не пропустить письма
         });
      } catch (error) {
         // Пытаемся обработать ошибку токена
         const shouldRetry = await handleGmailError(
            error,
            "fetching recent read emails"
         );
         if (shouldRetry) {
            // Повторяем попытку после обновления токена
            response = await gmail.users.messages.list({
               userId: "me",
               q: query,
               maxResults: 100,
            });
         } else {
            throw error; // Пробрасываем ошибку дальше, если не удалось обновить токен
         }
      }

      const allMessages = response.data.messages || [];

      // Фильтруем письма, проверяя заголовки на наличие seafarer_
      const filteredMessages = [];
      for (const messageRef of allMessages) {
         try {
            let message;
            try {
               message = await gmail.users.messages.get({
                  userId: "me",
                  id: messageRef.id,
                  format: "metadata",
                  metadataHeaders: [
                     "To",
                     "Reply-To",
                     "X-Original-To",
                     "Delivered-To",
                     "Envelope-To",
                  ],
               });
            } catch (error) {
               // Пытаемся обработать ошибку токена
               const shouldRetry = await handleGmailError(
                  error,
                  `fetching recent read message ${messageRef.id}`
               );
               if (shouldRetry) {
                  // Повторяем попытку после обновления токена
                  message = await gmail.users.messages.get({
                     userId: "me",
                     id: messageRef.id,
                     format: "metadata",
                     metadataHeaders: [
                        "To",
                        "Reply-To",
                        "X-Original-To",
                        "Delivered-To",
                        "Envelope-To",
                     ],
                  });
               } else {
                  throw error; // Пробрасываем ошибку дальше
               }
            }

            const headers = message.data.payload.headers || [];
            const to = headers.find((h) => h.name === "To")?.value || "";
            const replyTo =
               headers.find((h) => h.name === "Reply-To")?.value || "";
            const xOriginalTo =
               headers.find((h) => h.name === "X-Original-To")?.value || "";
            const deliveredTo =
               headers.find((h) => h.name === "Delivered-To")?.value || "";
            const envelopeTo =
               headers.find((h) => h.name === "Envelope-To")?.value || "";

            // Проверяем, есть ли seafarer_ в любом из заголовков
            const allHeaders = [
               to,
               replyTo,
               xOriginalTo,
               deliveredTo,
               envelopeTo,
            ].join(" ");
            if (allHeaders.toLowerCase().includes("seafarer_")) {
               filteredMessages.push(messageRef);
            }
         } catch (err) {
            // Пропускаем письма, которые не удалось получить
            // console.warn(`⚠️  Failed to get message ${messageRef.id}:`, err.message); // Для отладки
         }
      }

      return filteredMessages;
   } catch (err) {
      console.error("❌ Error fetching recent read emails:", err.message);
      throw err;
   }
}

/**
 * Проверяет, было ли письмо уже обработано
 */
async function isEmailProcessed(messageId) {
   try {
      if (!ProcessedEmail) {
         // Инициализируем модель, если еще не инициализирована
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }
      const exists = await ProcessedEmail.findOne({ messageId });
      return !!exists;
   } catch (err) {
      console.error("❌ Error checking processed email:", err.message);
      // В случае ошибки считаем, что письмо не обработано (безопаснее)
      return false;
   }
}

/**
 * Помечает письмо как обработанное
 */
async function markEmailAsProcessed(messageId) {
   try {
      if (!ProcessedEmail) {
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }
      await ProcessedEmail.findOneAndUpdate(
         { messageId },
         { messageId, processedAt: new Date() },
         { upsert: true }
      );
   } catch (err) {
      console.error("❌ Error marking email as processed:", err.message);
   }
}

/**
 * Получает полную информацию о письме
 */
async function getEmailDetails(messageId) {
   if (!gmail) {
      throw new Error("Gmail API not initialized");
   }

   try {
      let response;
      try {
         response = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
         });
      } catch (error) {
         // Пытаемся обработать ошибку токена
         const shouldRetry = await handleGmailError(
            error,
            `fetching email details ${messageId}`
         );
         if (shouldRetry) {
            // Повторяем попытку после обновления токена
            response = await gmail.users.messages.get({
               userId: "me",
               id: messageId,
               format: "full",
            });
         } else {
            throw error; // Пробрасываем ошибку дальше
         }
      }

      return response.data;
   } catch (err) {
      console.error(`❌ Error fetching email ${messageId}:`, err.message);
      throw err;
   }
}

/**
 * Парсит email и извлекает текст и тему
 */
function parseEmailMessage(message) {
   const headers = message.payload.headers;
   const subject = headers.find((h) => h.name === "Subject")?.value || "";
   const from = headers.find((h) => h.name === "From")?.value || "";
   const to = headers.find((h) => h.name === "To")?.value || "";
   const date = headers.find((h) => h.name === "Date")?.value || "";

   // Дополнительные заголовки для поиска алиаса
   const replyTo = headers.find((h) => h.name === "Reply-To")?.value || "";
   const xOriginalTo =
      headers.find((h) => h.name === "X-Original-To")?.value || "";
   const deliveredTo =
      headers.find((h) => h.name === "Delivered-To")?.value || "";
   const envelopeTo =
      headers.find((h) => h.name === "Envelope-To")?.value || "";

   // Извлекаем текст письма
   let text = "";
   let html = "";

   if (message.payload.body?.data) {
      text = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
   } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
         if (part.mimeType === "text/plain" && part.body?.data) {
            text = Buffer.from(part.body.data, "base64").toString("utf-8");
         } else if (part.mimeType === "text/html" && part.body?.data) {
            html = Buffer.from(part.body.data, "base64").toString("utf-8");
         }
      }
   }

   return {
      subject,
      from,
      to,
      date,
      text,
      html,
      replyTo,
      xOriginalTo,
      deliveredTo,
      envelopeTo,
      allHeaders: headers, // Сохраняем все заголовки для отладки
   };
}

/**
 * Обрабатывает одно письмо
 */
async function processEmail(messageId, skipDuplicateCheck = false) {
   try {
      // Проверяем, не было ли письмо уже обработано (если не пропущена проверка)
      if (!skipDuplicateCheck && (await isEmailProcessed(messageId))) {
         // console.log(`⏭️  Email ${messageId} already processed, skipping`); // Для отладки
         return;
      }

      const message = await getEmailDetails(messageId);
      const emailData = parseEmailMessage(message);

      // Извлекаем alias из различных заголовков (приоритет: To, Reply-To, X-Original-To, Delivered-To, Envelope-To)
      let alias = extractAliasFromEmail(emailData.to);

      if (!alias && emailData.replyTo) {
         alias = extractAliasFromEmail(emailData.replyTo);
      }
      if (!alias && emailData.xOriginalTo) {
         alias = extractAliasFromEmail(emailData.xOriginalTo);
      }
      if (!alias && emailData.deliveredTo) {
         alias = extractAliasFromEmail(emailData.deliveredTo);
      }
      if (!alias && emailData.envelopeTo) {
         alias = extractAliasFromEmail(emailData.envelopeTo);
      }

      if (!alias) {
         // console.log(`⚠️  No alias found in email headers:`); // Для отладки
         // console.log(`   To: ${emailData.to}`);
         // console.log(`   Reply-To: ${emailData.replyTo || "не указан"}`);
         // console.log(`   X-Original-To: ${emailData.xOriginalTo || "не указан"}`);
         // console.log(`   Delivered-To: ${emailData.deliveredTo || "не указан"}`);
         return;
      }

      // console.log(`✅ Found alias: ${alias} in email from ${emailData.from}`); // Для отладки

      // Ищем кампанию по alias
      const campaign = await Campaign.findOne({ alias });

      if (!campaign) {
         // console.log(`⚠️  Campaign not found for alias: ${alias}`); // Для отладки
         return;
      }

      // Если у кампании нет email клиента, используем ADMIN_EMAIL
      const clientEmail = campaign.clientEmail || process.env.ADMIN_EMAIL;

      if (!clientEmail) {
         // console.log(`⚠️  No client email found for campaign: ${alias}`); // Для отладки
         return;
      }

      // Формируем тему для пересылки
      const forwardSubject = `Re: ${emailData.subject} [from ${emailData.from}]`;

      // Формируем тело письма
      const forwardBody = `
Original from: ${emailData.from}
Original date: ${emailData.date}
Original subject: ${emailData.subject}

--- Original Message ---
${emailData.html || emailData.text}
      `.trim();

      // Пересылаем письмо клиенту
      await sendEmail({
         to: clientEmail,
         from: process.env.SENDGRID_FROM || SERVICE_EMAIL,
         subject: forwardSubject,
         text: emailData.text || forwardBody,
         html: emailData.html || forwardBody.replace(/\n/g, "<br>"),
      });

      console.log(
         `✅ Forwarded email from ${emailData.from} to ${clientEmail} (alias: ${alias})`
      );

      // Помечаем письмо как обработанное в базе данных
      await markEmailAsProcessed(messageId);

      // Помечаем письмо как прочитанное в Gmail
      if (gmail) {
         try {
            await gmail.users.messages.modify({
               userId: "me",
               id: messageId,
               requestBody: {
                  removeLabelIds: ["UNREAD"],
               },
            });
         } catch (error) {
            // Пытаемся обработать ошибку токена
            const shouldRetry = await handleGmailError(
               error,
               `marking email ${messageId} as read`
            );
            if (shouldRetry) {
               // Повторяем попытку после обновления токена
               await gmail.users.messages.modify({
                  userId: "me",
                  id: messageId,
                  requestBody: {
                     removeLabelIds: ["UNREAD"],
                  },
               });
            }
            // Если не удалось, просто логируем, но не прерываем обработку
         }
      }
   } catch (err) {
      console.error(`❌ Error processing email ${messageId}:`, err.message);
   }
}

/**
 * Проверяет почту и обрабатывает ответы
 */
async function checkAndProcessReplies() {
   try {
      // console.log("📧 Checking for new email replies..."); // Избыточный лог (каждые 5 минут)

      if (!gmail) {
         await initGmail();
      }

      // Обновляем access token при каждой проверке email для поддержания активности refresh token
      // Это сбрасывает таймер неактивности Google и предотвращает истечение refresh token
      if (oauth2Client && process.env.GMAIL_REFRESH_TOKEN) {
         try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            gmail = google.gmail({ version: "v1", auth: oauth2Client });
            // Обновляем время последнего проактивного обновления
            lastProactiveRefresh = Date.now();
         } catch (tokenError) {
            // Если ошибка токена, обрабатываем через handleGmailError
            const shouldRetry = await handleGmailError(
               tokenError,
               "token refresh during email check"
            );
            if (!shouldRetry) {
               // Если не удалось обновить токен, пропускаем эту проверку
               console.warn(
                  "⚠️  Skipping email check due to token refresh failure"
               );
               return;
            }
         }
      }

      // Инициализируем модель ProcessedEmail, если еще не инициализирована
      if (!ProcessedEmail && mongoose.connection.readyState === 1) {
         ProcessedEmail =
            mongoose.models.ProcessedEmail ||
            mongoose.model("ProcessedEmail", ProcessedEmailSchema);
      }

      // 1. Проверяем непрочитанные письма (основной поток)
      let unreadMessages = [];
      try {
         unreadMessages = await getUnreadEmails();
      } catch (err) {
         // Логируем только если это не ошибка токена (она уже обработана в getUnreadEmails)
         if (!isTokenExpiredError(err)) {
            console.error("❌ Error fetching unread emails:", err.message);
         }
         // Продолжаем работу, даже если не удалось получить непрочитанные
      }

      let processedCount = 0;

      if (unreadMessages.length > 0) {
         console.log(`📬 Found ${unreadMessages.length} unread email(s)`);
         for (const message of unreadMessages) {
            try {
               await processEmail(message.id);
               processedCount++;
            } catch (err) {
               console.error(
                  `❌ Error processing unread email ${message.id}:`,
                  err.message
               );
               // Продолжаем обработку следующих писем
            }
         }
      }

      // 2. Проверяем прочитанные письма за последние 24 часа (для пропущенных писем)
      let recentReadMessages = [];
      try {
         recentReadMessages = await getRecentReadEmails();
      } catch (err) {
         // Логируем только если это не ошибка токена (она уже обработана в getRecentReadEmails)
         if (!isTokenExpiredError(err)) {
            console.error("❌ Error fetching recent read emails:", err.message);
         }
         // Продолжаем работу, даже если не удалось получить прочитанные
      }

      if (recentReadMessages.length > 0) {
         console.log(
            `📬 Found ${recentReadMessages.length} recent read email(s) from last 24h (checking for missed ones)...`
         );
         let recentProcessed = 0;
         for (const message of recentReadMessages) {
            try {
               // Проверяем дубликаты для прочитанных писем
               if (!(await isEmailProcessed(message.id))) {
                  await processEmail(message.id);
                  recentProcessed++;
               }
            } catch (err) {
               console.error(
                  `❌ Error processing recent read email ${message.id}:`,
                  err.message
               );
               // Продолжаем обработку следующих писем
            }
         }
         if (recentProcessed > 0) {
            console.log(
               `✅ Processed ${recentProcessed} missed email(s) from recent read`
            );
            processedCount += recentProcessed;
         }
      }

      if (processedCount === 0) {
         // console.log("✅ No new replies found"); // Избыточный лог
      } else {
         console.log(
            `✅ Email processing completed. Total processed: ${processedCount}`
         );
      }
   } catch (err) {
      console.error("❌ Error in checkAndProcessReplies:", err.message);
   }
}

/**
 * Запускает периодическую проверку почты
 */
function startEmailChecker() {
   if (checkInterval) {
      console.log("⚠️  Email checker is already running");
      return;
   }

   // Первая проверка сразу
   checkAndProcessReplies().catch((err) => {
      console.error("❌ Initial email check failed:", err.message);
   });

   // Затем каждые 5 минут (CHECK_INTERVAL)
   checkInterval = setInterval(() => {
      checkAndProcessReplies();
   }, CHECK_INTERVAL);

   // Запускаем периодическую проверку токена
   if (!tokenCheckInterval) {
      // Устанавливаем начальное время для проактивного обновления (через неделю)
      if (!lastProactiveRefresh) {
         lastProactiveRefresh = Date.now();
      }
      tokenCheckInterval = setInterval(() => {
         periodicTokenCheck();
      }, TOKEN_CHECK_INTERVAL);
      const proactiveDays = PROACTIVE_REFRESH_INTERVAL / (24 * 60 * 60 * 1000);
      console.log(
         `✅ Token checker started (checking every ${
            TOKEN_CHECK_INTERVAL / 1000 / 60
         } minutes, proactive refresh every ${proactiveDays} day(s))`
      );
      console.log(
         `ℹ️  Access token is also refreshed every ${
            CHECK_INTERVAL / 1000 / 60
         } minutes during email checks to maintain refresh token activity`
      );
   }

   const intervalMinutes = CHECK_INTERVAL / 1000 / 60;
   const intervalHours = intervalMinutes / 60;
   const intervalText =
      intervalHours >= 1
         ? `${intervalHours} hours`
         : `${intervalMinutes} minutes`;
   console.log(`✅ Email checker started (checking every ${intervalText})`);
}

/**
 * Останавливает периодическую проверку почты
 */
function stopEmailChecker() {
   if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
      console.log("✅ Email checker stopped");
   }

   if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval);
      tokenCheckInterval = null;
      console.log("✅ Token checker stopped");
   }
}

module.exports = {
   initGmail,
   checkAndProcessReplies,
   startEmailChecker,
   stopEmailChecker,
   parseEmailMessage,
   extractAliasFromEmail,
};
