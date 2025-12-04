# Как работает OAuth2 и формируется Refresh Token

## 🔐 Принцип работы OAuth2

OAuth2 - это протокол авторизации, который позволяет приложению получить доступ
к ресурсам пользователя (в данном случае Gmail) без передачи пароля.

## 📋 Процесс получения Refresh Token (шаг за шагом)

### Шаг 1: Генерация URL для авторизации

Скрипт `get-refresh-token.js` создает специальный URL:

```javascript
const authUrl = oauth2Client.generateAuthUrl({
   access_type: "offline", // ⚠️ ВАЖНО: это позволяет получить refresh token
   scope: SCOPES, // Права доступа (чтение и модификация Gmail)
   prompt: "consent", // ⚠️ ВАЖНО: заставляет Google выдать новый refresh token
});
```

**Что происходит:**

-  Используется `CLIENT_ID` и `CLIENT_SECRET` из `.env`
-  Указывается `redirect_uri` (для Desktop app: `your_secret_value`)
-  Параметр `access_type: "offline"` - ключевой! Без него refresh token не будет
   выдан
-  Параметр `prompt: "consent"` - заставляет Google показать экран согласия и
   выдать новый токен

### Шаг 2: Пользователь переходит по URL

Когда вы открываете URL в браузере:

1. **Google проверяет:**

   -  Существует ли Client ID
   -  Правильный ли redirect URI
   -  В каком режиме приложение (Testing/Production)
   -  Есть ли пользователь в списке Test users (если Testing)

2. **Google показывает экран согласия:**

   -  Какие права запрашивает приложение
   -  Какой аккаунт используется
   -  Кнопка "Разрешить"

3. **После нажатия "Разрешить":**
   -  Google генерирует **временный код авторизации** (authorization code)
   -  Этот код одноразовый и живет несколько минут
   -  Код показывается на странице или в URL

### Шаг 3: Обмен кода на токены

Когда вы вставляете код в скрипт:

```javascript
const { tokens } = await oauth2Client.getToken(code.trim());
```

**Что происходит внутри:**

1. **Скрипт отправляет запрос в Google:**

   ```
   POST https://oauth2.googleapis.com/token
   {
     code: "4/1Ab32j91WGhoBXI1xydfPRPPOFZW4_i-WcsMezYXWF4bCGXLZu5cxMh8PEHE",
     client_id: "447293311328-rnchclul2317fpfd4g9t04trqtpc1rhp...",
     client_secret: "your_gmail_client_secret",
     redirect_uri: "your_secret_value",
     grant_type: "authorization_code"
   }
   ```

2. **Google проверяет:**

   -  Код действителен (не использован, не истек)
   -  Client ID/Secret правильные
   -  Redirect URI совпадает
   -  Код был выдан для этого Client ID

3. **Google отвечает токенами:**
   ```json
   {
      "access_token": "ya29.a0AfH6SMC...", // Временный токен (живет ~1 час)
      "refresh_token": "1//03QNM70SwkOpoCgYI...", // Долгоживущий токен
      "expires_in": 3600,
      "token_type": "Bearer"
   }
   ```

### Шаг 4: Сохранение Refresh Token

Скрипт сохраняет `refresh_token` в `.env` файл:

```javascript
updateEnvVar("GMAIL_REFRESH_TOKEN", tokens.refresh_token);
fs.writeFileSync(envPath, envContent, "utf8");
```

## 🔄 Как работает Refresh Token

### Что такое Refresh Token?

**Refresh Token** - это долгоживущий токен, который используется для получения
новых **Access Token** без повторной авторизации.

### Формат Refresh Token

```
your_gmail_refresh_token...
```

**Структура:**

-  `1//` - префикс Google для refresh token
-  Остальная часть - уникальный идентификатор, сгенерированный Google

### Как Google формирует Refresh Token?

1. **Генерирует уникальный идентификатор:**

   -  Случайная строка символов
   -  Привязывается к Client ID
   -  Привязывается к аккаунту пользователя
   -  Сохраняется в базе данных Google

2. **Создает связь:**

   ```
   Refresh Token → Client ID → User Account → Scopes (права доступа)
   ```

3. **Возвращает токен:**
   -  Токен уникален для каждой пары (Client ID + User Account)
   -  Один пользователь может иметь несколько refresh token для разных Client ID

## 🔑 Ключевые моменты

### Почему `access_type: "offline"` важен?

-  **Без него:** Google выдает только `access_token` (живет ~1 час)
-  **С ним:** Google выдает и `access_token`, и `refresh_token` (долгоживущий)

### Почему `prompt: "consent"` важен?

-  **Без него:** Если токен уже был выдан ранее, Google может не выдать новый
-  **С ним:** Google всегда показывает экран согласия и выдает новый refresh
   token

### Почему код одноразовый?

-  **Безопасность:** Если код перехвачен, его можно использовать только один раз
-  **Время жизни:** Код действителен несколько минут
-  **После использования:** Код становится недействительным

## 🔄 Использование Refresh Token

Когда приложению нужен доступ к Gmail API:

1. **Используется Refresh Token для получения Access Token:**

   ```javascript
   const { credentials } = await oauth2Client.refreshAccessToken();
   ```

2. **Google проверяет:**

   -  Refresh Token действителен
   -  Client ID/Secret правильные
   -  Токен не был отозван

3. **Google выдает новый Access Token:**

   ```json
   {
      "access_token": "ya29.new_token...",
      "expires_in": 3600
   }
   ```

4. **Access Token используется для API запросов:**
   ```javascript
   const gmail = google.gmail({ version: "v1", auth: oauth2Client });
   const messages = await gmail.users.messages.list({ userId: "me" });
   ```

## ⚠️ Важные моменты

### Refresh Token может истечь, если:

1. **Не используется долгое время** (обычно 6 месяцев без активности)
2. **Был отозван пользователем** в Google Account
3. **Client ID был удален** из Google Cloud Console
4. **Пользователь изменил пароль** (в некоторых случаях)

### Как предотвратить истечение:

1. **Проактивное обновление:** Регулярно использовать refresh token для
   получения access token
2. **Автоматическое обновление:** Система автоматически обновляет access token
   каждые 5 минут
3. **Периодическая проверка:** Token checker проверяет токен каждые 10 минут

## 📊 Схема процесса

```
1. Скрипт → Генерирует URL с Client ID
                ↓
2. Пользователь → Открывает URL в браузере
                ↓
3. Google → Проверяет Client ID, показывает экран согласия
                ↓
4. Пользователь → Нажимает "Разрешить"
                ↓
5. Google → Генерирует временный код авторизации
                ↓
6. Пользователь → Копирует код
                ↓
7. Скрипт → Отправляет код + Client ID/Secret в Google
                ↓
8. Google → Проверяет код, выдает Access Token + Refresh Token
                ↓
9. Скрипт → Сохраняет Refresh Token в .env
                ↓
10. Приложение → Использует Refresh Token для получения Access Token
                ↓
11. Gmail API → Принимает Access Token, возвращает данные
```

## 💡 Итог

**Refresh Token** - это "ключ", который Google выдает один раз после
авторизации. Он позволяет получать новые Access Token без повторной авторизации
пользователя.

**Код авторизации** - это временный "билет", который обменивается на Refresh
Token. Он одноразовый и имеет короткое время жизни.

**Access Token** - это временный "пропуск" для доступа к API. Он обновляется
автоматически с помощью Refresh Token.

---

**Последнее обновление:** 2025-12-04
