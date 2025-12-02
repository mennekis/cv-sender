# Инструкция: Обновление Refresh Token

## Проблема

Ошибка `redirect_uri_mismatch` возникает, потому что:
- Текущий OAuth клиент имеет тип **"Web application"**
- Redirect URI `your_secret_value` работает только для типа **"Desktop application"**

## Решение: Создать Desktop Application клиент

### Шаг 1: Создание нового OAuth клиента

1. Откройте [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Нажмите **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Выберите тип приложения: **"Desktop app"** (Desktop application)
4. Введите имя: "Gmail Sender Desktop Client" (или любое другое)
5. Нажмите **"CREATE"**

### Шаг 2: Сохранение новых credentials

1. Скопируйте **Client ID** и **Client Secret** из модального окна
2. Обновите `.env` файл:

```bash
cd /Users/alexey.nikolayenko/Desktop/Experiments/mail-sender/Sender_App2/cv-sender/backend
nano .env
```

3. Обновите или добавьте:
```env
GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=your_secret_value
```

4. Сохраните файл (Ctrl+O, Enter, Ctrl+X)

### Шаг 3: Получение нового refresh token

1. Запустите скрипт:
```bash
node get-refresh-token.js
```

2. Скопируйте URL из вывода скрипта

3. Откройте URL в браузере и авторизуйтесь

4. После авторизации скопируйте код с страницы

5. Вставьте код в терминал, где запущен скрипт

6. Скрипт автоматически сохранит новый `GMAIL_REFRESH_TOKEN` в `.env`

### Шаг 4: Обновление на VPS (если используется)

Если приложение работает на VPS, обновите `.env` там:

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
nano .env
# Обновите GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
cd /root/sender-app
docker-compose restart backend
```

## Альтернативное решение: Использовать Web application с localhost

Если не хотите создавать новый клиент, можно использовать существующий Web application:

1. Убедитесь, что в Google Cloud Console добавлен redirect URI:
   - `http://localhost:3000/api/auth/google/callback`

2. Запустите локальный сервер для получения кода (требует дополнительной настройки)

**Рекомендация:** Используйте первый вариант (Desktop application) - он проще и надежнее.

