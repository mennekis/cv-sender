# Управление Gmail токенами

## Обзор

Система автоматически управляет Gmail API токенами, обеспечивая непрерывную
работу проверки ответов на письма.

## Автоматическое обновление токенов

### Как это работает

1. **Access Token (краткосрочный):**

   -  Срок действия: ~1 час
   -  Автоматически обновляется через refresh token
   -  Обновление происходит прозрачно для пользователя

2. **Refresh Token (долгосрочный):**
   -  Срок действия: неограничен (пока не отозван)
   -  Используется для получения новых access token
   -  Хранится в переменной окружения `GMAIL_REFRESH_TOKEN`
   -  **Стабильность:** Система автоматически поддерживает активность refresh
      token:
      -  Access token обновляется при каждой проверке email (каждые 5 минут)
      -  Проактивное обновление каждые 3 дня
      -  Это предотвращает истечение refresh token из-за неактивности

### Процесс автоматического обновления

**Проактивное обновление (предотвращение истечения):**

```
1. При каждой проверке email (каждые 5 минут) → refreshAccessToken()
2. Проактивное обновление каждые 3 дня → refreshAccessToken()
3. Это поддерживает активность refresh token и предотвращает его истечение
```

**Реактивное обновление (при ошибках):**

```
1. Операция Gmail API → Ошибка invalid_grant
2. Система обнаруживает ошибку → isTokenExpiredError()
3. Попытка обновления → refreshAccessToken()
4. Если успешно → Повтор операции
5. Если refresh token истек → Отправка уведомления администратору
```

## Обработка ошибок

### Типы ошибок

1. **Access Token истек:**

   -  Ошибка: `invalid_grant` или `invalid_token`
   -  Действие: Автоматическое обновление через refresh token
   -  Результат: Операция повторяется автоматически

2. **Refresh Token истек:**
   -  Ошибка: `invalid_grant` при попытке обновления
   -  Действие: Отправка уведомления администратору
   -  Результат: Требуется ручное обновление refresh token

### Уведомления администратора

**Получатель:** `mennekis@gmail.com`

**Когда отправляется:**

-  Refresh token истек или недействителен
-  Автоматическое обновление не удалось

**Защита от спама:**

-  Уведомления отправляются не чаще одного раза в час
-  Если уведомление уже отправлялось, следующее будет пропущено

**Содержание уведомления:**

-  Детали ошибки
-  Пошаговые инструкции по исправлению
-  Время ошибки и информация о сервере
-  Предупреждение о временной недоступности функции

## Пошаговый план: Создание нового OAuth клиента и активация

Полное руководство по созданию нового OAuth 2.0 клиента с нуля и его активации
для работы с Gmail API.

### Этап 1: Подготовка в Google Cloud Console

#### Шаг 1.1: Вход в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Войдите в аккаунт Google (тот, который будет использоваться для Gmail API)
3. Выберите проект или создайте новый:
   -  Если проекта нет: нажмите "Select a project" → "New Project"
   -  Введите название проекта (например, "Gmail Sender App")
   -  Нажмите "Create"

#### Шаг 1.2: Включение Gmail API

1. Перейдите в "APIs & Services" → "Library"
   -  Прямая ссылка:
      [https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)
2. В поиске введите "Gmail API"
3. Выберите "Gmail API" из результатов
4. Нажмите кнопку **"Enable"** (Включить)
5. Дождитесь активации API (обычно несколько секунд)

### Этап 2: Настройка OAuth Consent Screen

#### Шаг 2.1: Переход на страницу OAuth Consent Screen

1. Перейдите в "APIs & Services" → "OAuth consent screen"
   -  Прямая ссылка:
      [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
2. Выберите тип пользователей:
   -  **"External"** - для публичного использования (рекомендуется)
   -  **"Internal"** - только для Google Workspace (если у вас Workspace)

#### Шаг 2.2: Заполнение обязательных полей

1. **App information (Информация о приложении):**

   -  **App name**: Название приложения (например, "Gmail Sender App")
   -  **User support email**: Ваш email для поддержки
   -  **App logo** (опционально): Загрузите логотип, если есть
   -  **App domain** (опционально): Домен приложения
   -  **Application home page** (опционально): Главная страница
   -  **Privacy Policy link** (обязательно для публикации): URL политики
      конфиденциальности
   -  **Terms of Service link** (рекомендуется): URL условий использования
   -  **Authorized domains**: Добавьте домены, если используете

2. Нажмите **"SAVE AND CONTINUE"**

#### Шаг 2.3: Настройка Scopes (Области доступа)

1. На странице "Scopes" нажмите **"ADD OR REMOVE SCOPES"**
2. В поиске найдите и добавьте следующие scopes:
   -  `https://www.googleapis.com/auth/gmail.readonly`
   -  `https://www.googleapis.com/auth/gmail.modify`
3. Нажмите **"UPDATE"**, затем **"SAVE AND CONTINUE"**

#### Шаг 2.4: Добавление Test Users (для тестового режима)

1. На странице "Test users" добавьте email адреса:
   -  Email, который будет использоваться для Gmail API
   -  Ваш личный email для тестирования
2. Нажмите **"ADD USERS"**, введите email, нажмите **"ADD"**
3. Нажмите **"SAVE AND CONTINUE"**

#### Шаг 2.5: Просмотр Summary

1. Проверьте все настройки на странице "Summary"
2. Нажмите **"BACK TO DASHBOARD"**

### Этап 3: Создание OAuth 2.0 Client ID

#### Шаг 3.1: Переход на страницу Credentials

1. Перейдите в "APIs & Services" → "Credentials"
   -  Прямая ссылка:
      [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

#### Шаг 3.2: Создание OAuth Client ID

1. Нажмите **"CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Если появится предупреждение о настройке OAuth consent screen:

   -  Нажмите **"CONFIGURE CONSENT SCREEN"** и завершите настройку (см. Этап 2)
   -  Или вернитесь к Этапу 2 и завершите настройку

3. Выберите тип приложения:

   -  **"Web application"** (Веб-приложение)

4. Заполните форму:

   -  **Name**: Имя клиента (например, "Gmail Sender Client")
   -  **Authorized JavaScript origins** (опционально):
      -  `http://localhost:3000` (для разработки)
   -  **Authorized redirect URIs** (обязательно, добавьте оба):
      -  `http://localhost:3000/api/auth/google/callback` (для разработки)
      -  `your_secret_value` (для получения токена через скрипт)

5. Нажмите **"CREATE"**

#### Шаг 3.3: Сохранение Credentials

1. После создания вы увидите модальное окно с:

   -  **Your Client ID** (например: `123456789-abc...googleusercontent.com`)
   -  **Your Client Secret** (например: `GOCSPX-abc...xyz`)

2. **ВАЖНО: Скопируйте и сохраните эти значения!**

   -  Client ID будет показан только один раз
   -  Client Secret будет показан только один раз
   -  Сохраните их в безопасном месте

3. Нажмите **"OK"**

### Этап 4: Получение Refresh Token

#### Шаг 4.1: Подготовка на сервере

1. Подключитесь к VPS:

   ```bash
   ssh root@your_vps_ip
   ```

2. Перейдите в директорию backend:

   ```bash
   cd /root/sender-app/backend
   ```

3. Откройте файл `.env`:

   ```bash
   nano .env
   ```

4. Добавьте или обновите следующие переменные:

   ```env
   GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   GMAIL_REDIRECT_URI=your_secret_value
   ```

5. Сохраните файл (Ctrl+O, Enter, Ctrl+X)

#### Шаг 4.2: Запуск скрипта получения токена

1. Запустите скрипт:

   ```bash
   node get-refresh-token.js
   ```

2. Скрипт покажет URL для авторизации - **скопируйте его**

3. Откройте этот URL в браузере (где вы авторизованы в Google)

4. Войдите в Google аккаунт (тот, который будет использоваться для Gmail API)

5. Разрешите доступ приложению:

   -  Нажмите **"Разрешить"** или **"Allow"**
   -  Если видите предупреждение о неверифицированном приложении:
      -  Нажмите **"Advanced"** → **"Go to [App name] (unsafe)"**
      -  Это нормально для тестового режима

6. После авторизации вы увидите код на странице (например: `4/0AeanS...`)

7. Скопируйте этот код и вставьте в терминал, где запущен скрипт

8. Нажмите Enter

#### Шаг 4.3: Проверка результата

1. Скрипт автоматически сохранит `GMAIL_REFRESH_TOKEN` в `.env` файл
2. Вы увидите сообщение: `✅ GMAIL_REFRESH_TOKEN добавлен в .env файл`
3. Проверьте, что токен сохранен:
   ```bash
   grep GMAIL_REFRESH_TOKEN .env
   ```

### Этап 5: Публикация приложения (активация)

#### Шаг 5.1: Проверка текущего статуса

1. Перейдите в "APIs & Services" → "OAuth consent screen"

   -  Прямая ссылка:
      [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)

2. Проверьте статус вверху страницы:
   -  **"Testing"** - тестовый режим (нужно опубликовать)
   -  **"In production"** - уже опубликовано ✅

#### Шаг 5.2: Публикация приложения

1. Если статус **"Testing"**:

   -  Найдите кнопку **"PUBLISH APP"** вверху страницы
   -  Нажмите на неё

2. Подтвердите публикацию:

   -  Появится предупреждение о том, что приложение станет доступным всем
   -  Нажмите **"CONFIRM"**

3. Дождитесь изменения статуса:
   -  Статус изменится с "Testing" на **"In production"**
   -  Это может занять несколько минут

#### Шаг 5.3: Верификация приложения (если требуется)

⚠️ **Важно:** Google может потребовать верификацию приложения, если:

-  Используются чувствительные scopes (Gmail API относится к ним)
-  Приложение запрашивает доступ к данным пользователей

**Если требуется верификация:**

1. Google отправит уведомление о необходимости верификации
2. Заполните форму верификации:
   -  Описание использования API
   -  Privacy Policy URL (обязательно)
   -  Terms of Service URL (рекомендуется)
   -  Видео-демонстрация работы приложения (может потребоваться)
3. Отправьте на рассмотрение
4. Ожидайте ответа (обычно 1-2 недели)

**Альтернатива (для личного использования):**

-  Можно оставить приложение в режиме "Testing"
-  Добавить нужные email в "Test users"
-  Это работает для личного использования без верификации

### Этап 6: Обновление токена после публикации

#### Шаг 6.1: Получение нового токена (рекомендуется)

После публикации рекомендуется получить новый refresh token:

1. Отзовите старый токен (опционально):

   -  Перейдите в
      [Google Account Security](https://myaccount.google.com/permissions)
   -  Найдите ваше приложение и отзовите доступ

2. Запустите скрипт получения токена снова:

   ```bash
   cd /root/sender-app/backend
   node get-refresh-token.js
   ```

3. Следуйте инструкциям из Этапа 4.2

#### Шаг 6.2: Перезапуск приложения

1. Перезапустите контейнер:

   ```bash
   cd /root/sender-app
   docker-compose restart backend
   ```

2. Проверьте логи:

   ```bash
   docker-compose logs --tail=50 backend | grep -i "token\|refresh\|gmail"
   ```

3. Должны увидеть сообщения об успешной авторизации без ошибок

### Этап 7: Проверка работы

#### Шаг 7.1: Проверка логов

```bash
# На VPS
docker-compose logs --tail=100 backend | grep -i "gmail\|token\|refresh"
```

**Ожидаемые сообщения:**

-  `✅ Access token refreshed successfully`
-  `✅ Email checker started`
-  Нет ошибок `invalid_grant` или `invalid_token`

#### Шаг 7.2: Проверка переменных окружения

```bash
# Проверка всех Gmail переменных
grep GMAIL /root/sender-app/backend/.env
```

**Должны быть установлены:**

-  `GMAIL_CLIENT_ID`
-  `GMAIL_CLIENT_SECRET`
-  `GMAIL_REFRESH_TOKEN`
-  `GMAIL_REDIRECT_URI` (опционально)

### Чек-лист завершения

-  [ ] Gmail API включен в проекте
-  [ ] OAuth consent screen настроен
-  [ ] Scopes добавлены (gmail.readonly, gmail.modify)
-  [ ] OAuth 2.0 Client ID создан
-  [ ] Client ID и Client Secret сохранены в `.env`
-  [ ] Refresh token получен и сохранен в `.env`
-  [ ] Приложение опубликовано (статус "In production")
-  [ ] Приложение перезапущено
-  [ ] Логи показывают успешную работу без ошибок

### Возможные проблемы и решения

**Проблема: "redirect_uri_mismatch"**

-  **Решение:** Убедитесь, что в Google Cloud Console добавлен redirect URI:
   `your_secret_value`

**Проблема: "access_denied"**

-  **Решение:** Убедитесь, что приложение опубликовано или ваш email добавлен в
   Test users

**Проблема: Refresh token не получен**

-  **Решение:** Используйте параметр `prompt: "consent"` в скрипте (уже есть в
   `get-refresh-token.js`)

**Проблема: "invalid_grant" после публикации**

-  **Решение:** Получите новый refresh token после публикации приложения

## Ручное обновление Refresh Token

Если автоматическое обновление не помогло, выполните следующие шаги:

### Важно перед обновлением

⚠️ **Если приложение в тестовом режиме:**

-  Убедитесь, что ваш email добавлен в "Test users" в OAuth consent screen
-  Или опубликуйте приложение (см. раздел "Публикация OAuth приложения")

### 1. Подключитесь к VPS

```bash
ssh root@your_vps_ip
```

### 2. Перейдите в директорию backend

```bash
cd /root/sender-app/backend
```

### 3. (Опционально) Отзовите старый токен

Если хотите получить полностью новый токен:

1. Перейдите в
   [Google Account Security](https://myaccount.google.com/permissions)
2. Найдите ваше приложение (Gmail Sender App)
3. Нажмите "Remove access" или "Отозвать доступ"

### 4. Запустите скрипт получения токена

```bash
node get-refresh-token.js
```

Скрипт:

-  Сгенерирует URL для авторизации
-  Покажет инструкции по получению кода
-  Запросит код авторизации
-  Сохранит новый refresh token в `.env`

**Если получили ошибку "redirect_uri_mismatch":**

-  Убедитесь, что в Google Cloud Console добавлен redirect URI:
   `your_secret_value`
-  См. раздел "Настройка в Google Cloud Console"

**Если получили ошибку "access_denied":**

-  Убедитесь, что приложение опубликовано или ваш email в списке Test users
-  См. раздел "Публикация OAuth приложения"

### 5. Обновите переменную окружения

Если скрипт не обновил `.env` автоматически:

```bash
nano .env
# Найдите GMAIL_REFRESH_TOKEN и обновите значение
```

### 6. Перезапустите контейнер

```bash
cd /root/sender-app
docker-compose restart backend
```

### 7. Проверьте работу

```bash
# Проверьте логи
docker-compose logs --tail=50 backend | grep -i "token\|refresh\|gmail"

# Должны увидеть сообщения об успешной авторизации
```

## Проверка работы

### Проверка логов

```bash
# На VPS
docker-compose logs --tail=50 backend | grep -i "token\|refresh"
```

### Ожидаемые сообщения

**При успешном обновлении:**

```
✅ Access token refreshed successfully
✅ Token refreshed. Retrying [operation]...
```

**При ошибке refresh token:**

```
❌ Refresh token expired or invalid
✅ Token error notification sent to mennekis@gmail.com
```

### Проверка статуса

```bash
# Проверка переменных окружения
grep GMAIL_REFRESH_TOKEN /root/sender-app/backend/.env

# Проверка работы Gmail checker
docker-compose logs backend | grep "Email checker started"
```

## Переменные окружения

### Обязательные

-  `GMAIL_CLIENT_ID` - OAuth2 Client ID из Google Cloud Console
-  `GMAIL_CLIENT_SECRET` - OAuth2 Client Secret
-  `GMAIL_REFRESH_TOKEN` - Refresh token для автоматического обновления

### Опциональные

-  `GMAIL_REDIRECT_URI` - Redirect URI (по умолчанию:
   `http://localhost:3000/api/auth/google/callback`)
-  `GMAIL_SERVICE_EMAIL` - Email адрес для Gmail API (по умолчанию:
   `your_secret_value`)
-  `ENABLE_GMAIL_REPLY_CHECKER` - Включить автоматическую проверку ответов
   (`true`/`false`)

## Настройка в Google Cloud Console

### Как попасть в Google Cloud Console

**Способ 1: Прямая ссылка**

-  Откройте:
   [https://console.cloud.google.com/](https://console.cloud.google.com/)

**Способ 2: Через Google API Console (альтернативный путь)**

-  Откройте:
   [https://console.developers.google.com/](https://console.developers.google.com/)
-  Это перенаправит вас в Google Cloud Console

**Способ 3: Через поиск Google**

-  Введите в поиск: "Google Cloud Console" или "Google API Console"
-  Перейдите по первой ссылке

### Пошаговая инструкция

1. **Войдите в аккаунт Google**

   -  Используйте аккаунт, который будет использоваться для Gmail API
   -  Обычно это аккаунт `your_secret_value` или ваш личный аккаунт

2. **Выберите или создайте проект**

   -  Если проект уже существует, выберите его из выпадающего списка вверху
   -  Если проекта нет, нажмите "Create Project" и следуйте инструкциям

3. **Включите Gmail API**

   -  Перейдите в "APIs & Services" → "Library"
   -  Найдите "Gmail API" и нажмите "Enable"

4. **Создайте OAuth 2.0 Credentials**

   -  Перейдите в "APIs & Services" → "Credentials"
   -  Нажмите "Create Credentials" → "OAuth client ID"
   -  Если появится запрос на настройку OAuth consent screen, выполните его:
      -  Выберите "External" (для тестирования) или "Internal" (для Google
         Workspace)
      -  Заполните обязательные поля (App name, User support email, Developer
         contact)
      -  Сохраните и продолжите

5. **Настройте OAuth 2.0 Client ID**

   -  Тип приложения: "Web application"
   -  Имя: любое (например, "Gmail Sender App")
   -  Authorized redirect URIs (добавьте оба):
   -  `http://localhost:3000/api/auth/google/callback` (для разработки)
      -  `your_secret_value` (для получения токена напрямую через
         скрипт)

6. **Скопируйте credentials**
   -  После создания вы увидите "Client ID" и "Client Secret"
   -  Скопируйте их и сохраните в `.env` файл:
      -  `GMAIL_CLIENT_ID` = ваш Client ID
      -  `GMAIL_CLIENT_SECRET` = ваш Client Secret

### Быстрый доступ к Credentials

После первого входа, для быстрого доступа к credentials:

-  Прямая ссылка:
   [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
-  Или: Google Cloud Console → Ваш проект → APIs & Services → Credentials

## Публикация OAuth приложения (выход из тестового режима)

### Зачем публиковать приложение?

В тестовом режиме OAuth приложение имеет ограничения:

-  Максимум 100 пользователей могут авторизоваться
-  Требуется добавление каждого пользователя в список "Test users"
-  Токены могут истекать быстрее

После публикации:

-  Неограниченное количество пользователей
-  Не нужно добавлять пользователей вручную
-  Более стабильная работа токенов

### Пошаговая инструкция по публикации

#### Шаг 1: Настройка OAuth Consent Screen

1. **Перейдите в OAuth Consent Screen:**

   **Прямая ссылка (самый быстрый способ):**

   -  [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
   -  Или с указанием проекта:
      `https://console.cloud.google.com/apis/credentials/consent?project=ВАШ_ПРОЕКТ_ID`

   **Если вы на странице "OAuth Overview" или "Credentials":**

   -  В левом меню найдите раздел **"APIs & Services"** (может быть свернут)
   -  Раскройте его и нажмите **"OAuth consent screen"**
   -  Или используйте поиск вверху: введите "OAuth consent screen"

   **Альтернативный путь:**

   -  Google Cloud Console → APIs & Services → OAuth consent screen

2. **Проверьте текущий статус:**

   Статус отображается **вверху страницы**, рядом с названием приложения:

   -  🟡 **"Testing"** → приложение в тестовом режиме (нужно опубликовать)
   -  🟢 **"In production"** → приложение уже опубликовано ✅

   **Где искать:**

   -  Вверху страницы, под заголовком "OAuth consent screen"
   -  Обычно справа от названия приложения
   -  Может быть в виде бейджа или текста

3. Заполните обязательные поля (если еще не заполнены):

   -  **App name**: Название приложения (например, "Gmail Sender App")
   -  **User support email**: Ваш email для поддержки
   -  **Developer contact information**: Email разработчика
   -  **App logo** (опционально): Логотип приложения
   -  **App domain** (опционально): Домен приложения
   -  **Authorized domains**: Добавьте домены, если используете

4. Настройте Scopes (области доступа):

   -  Убедитесь, что добавлены:
      -  `https://www.googleapis.com/auth/gmail.readonly`
      -  `https://www.googleapis.com/auth/gmail.modify`
   -  Если scopes не добавлены, нажмите "ADD OR REMOVE SCOPES"

5. Добавьте Test users (временно, для тестирования):

   -  В разделе "Test users" добавьте email адреса, которые будут использовать
      приложение
   -  Это нужно для тестирования перед публикацией

6. Сохраните изменения:
   -  Нажмите "SAVE AND CONTINUE" на каждом шаге
   -  Дойдите до последнего шага "Summary"

#### Шаг 2: Публикация приложения

1. На странице OAuth consent screen найдите кнопку **"PUBLISH APP"**

   -  Она находится вверху страницы, рядом со статусом "Testing"

2. Подтвердите публикацию:

   -  Появится предупреждение о том, что приложение станет доступным всем
      пользователям
   -  Нажмите "CONFIRM"

3. Дождитесь изменения статуса:
   -  Статус изменится с "Testing" на "In production"
   -  Это может занять несколько минут

#### Шаг 3: Верификация приложения (если требуется)

**Важно:** Google может потребовать верификацию приложения, если:

-  Используются чувствительные scopes (например, Gmail API)
-  Приложение запрашивает доступ к данным пользователей

**Процесс верификации:**

1. Google отправит уведомление о необходимости верификации
2. Заполните форму верификации:
   -  Описание использования API
   -  Privacy Policy URL (обязательно)
   -  Terms of Service URL (рекомендуется)
   -  Видео-демонстрация работы приложения (может потребоваться)
3. Отправьте на рассмотрение
4. Ожидайте ответа (обычно 1-2 недели)

**Альтернатива:** Если верификация не требуется или вы хотите использовать
приложение только для себя:

-  Можно оставить приложение в режиме "Testing"
-  Добавить нужные email в "Test users"
-  Это работает для личного использования

### Обновление токена после публикации

После публикации приложения рекомендуется обновить refresh token:

1. **Отзовите старый токен (опционально):**

   -  Перейдите в
      [Google Account Security](https://myaccount.google.com/permissions)
   -  Найдите ваше приложение и отзовите доступ

2. **Получите новый токен:**

   ```bash
   # На VPS или локально
   cd /path/to/backend
   node get-refresh-token.js
   ```

3. **Следуйте инструкциям скрипта:**

   -  Откройте URL в браузере
   -  Авторизуйтесь (теперь без ограничений тестового режима)
   -  Скопируйте код и вставьте в консоль
   -  Токен автоматически сохранится в `.env`

4. **Перезапустите приложение:**
   ```bash
   # На VPS
   cd /root/sender-app
   docker-compose restart backend
   ```

### Проверка статуса публикации

1. **Перейдите в OAuth consent screen:**

   **Прямая ссылка (самый быстрый способ):**

   -  [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
   -  Или с указанием проекта:
      `https://console.cloud.google.com/apis/credentials/consent?project=ВАШ_ПРОЕКТ_ID`

   **Через меню:**

   -  В левом меню найдите раздел **"APIs & Services"** и нажмите **"OAuth
      consent screen"**
   -  Или используйте поиск вверху: введите "OAuth consent screen"

2. **Найдите статус на странице:**

   Статус находится **вверху страницы OAuth consent screen**:

   -  Обычно справа от названия приложения
   -  Может быть в виде цветного бейджа или текста
   -  Рядом может быть кнопка "PUBLISH APP" (если статус "Testing")

3. **Расшифровка статусов:**

   -  🟢 **"In production"** - приложение опубликовано ✅

      -  Доступно всем пользователям Google
      -  Неограниченное количество пользователей
      -  Не нужно добавлять пользователей вручную

   -  🟡 **"Testing"** - приложение в тестовом режиме ⚠️
      -  Максимум 100 пользователей
      -  Нужно добавлять пользователей в "Test users"
      -  Есть кнопка "PUBLISH APP" для публикации

4. **Дополнительная информация:**

   -  Количество пользователей отображается на той же странице
   -  В тестовом режиме: максимум 100 пользователей
   -  В production: неограниченно

### Важные замечания

⚠️ **После публикации:**

-  Приложение становится доступным всем пользователям Google
-  Убедитесь, что Privacy Policy и Terms of Service настроены
-  Регулярно проверяйте использование API в Google Cloud Console

✅ **Преимущества публикации:**

-  Не нужно добавлять пользователей вручную
-  Более стабильная работа токенов
-  Нет ограничения на количество пользователей
-  Профессиональный вид при авторизации

🔒 **Безопасность:**

-  Храните Client ID и Client Secret в безопасности
-  Не коммитьте `.env` файл в git
-  Регулярно проверяйте активность в Google Cloud Console

## Часто задаваемые вопросы

### Q: Как часто обновляется access token?

A: Автоматически при истечении (примерно каждый час) или при ошибке
`invalid_grant`.

### Q: Что делать, если получил уведомление об ошибке токена?

A: Следуйте инструкциям в письме или разделу "Ручное обновление Refresh Token"
выше.

### Q: Можно ли отключить автоматические уведомления?

A: Нет, уведомления встроены в систему для обеспечения надежности. Однако они
отправляются не чаще одного раза в час.

### Q: Как проверить, что токен работает?

A: Проверьте логи на наличие ошибок `invalid_grant`. Если их нет, токен работает
корректно.

### Q: Что делать, если refresh token не работает?

A: Получите новый refresh token через скрипт `get-refresh-token.js` и обновите
его в `.env`. Также убедитесь, что OAuth приложение опубликовано или ваш email
добавлен в Test users.

### Q: Как опубликовать OAuth приложение, чтобы выйти из тестового режима?

A: См. раздел "Публикация OAuth приложения" выше. Основные шаги: настройте OAuth
consent screen, заполните обязательные поля, и нажмите "PUBLISH APP" в Google
Cloud Console.

### Q: Нужно ли обновлять токен после публикации приложения?

A: Рекомендуется обновить refresh token после публикации, чтобы получить токен
без ограничений тестового режима. Используйте скрипт `get-refresh-token.js`.

## Дополнительная информация

-  См. `TROUBLESHOOTING.md` для решения проблем
-  См. `get-refresh-token.js` для получения нового токена
-  См. `gmailReplyService.js` для деталей реализации
