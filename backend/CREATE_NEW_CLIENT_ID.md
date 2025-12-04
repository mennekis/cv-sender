# Создание нового Desktop Client ID

## ❌ Проблема

Ошибка: `Error 401: deleted_client`

Это означает, что Client ID в `.env` был удален из Google Cloud Console.

## ✅ Решение: Создать новый Desktop Client ID

### Шаг 1: Откройте Google Cloud Console

1. Перейдите: https://console.cloud.google.com/
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**

### Шаг 2: Создайте новый Desktop Client ID

1. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Если появится запрос на настройку Consent Screen:
   -  Выберите **External** (для тестирования)
   -  Заполните обязательные поля
   -  Сохраните и продолжите
3. В форме создания OAuth Client:
   -  **Application type**: выберите **Desktop app**
   -  **Name**: например, "Gmail Desktop Client" или "Sender App Desktop"
4. Нажмите **CREATE**

### Шаг 3: Скопируйте Client ID и Client Secret

После создания вы увидите:

-  **Client ID** (например:
   `your_gmail_client_id.apps.googleusercontent.com`)
-  **Client Secret** (например: `your_gmail_client_secret`)

**⚠️ ВАЖНО:** Client Secret показывается только один раз! Скопируйте его сразу.

### Шаг 4: Обновите .env на VPS

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
nano .env
```

Обновите следующие строки:

```
GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=your_secret_value
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X)

### Шаг 5: Получите новый токен

```bash
cd /root/sender-app/backend
./update-gmail-token-quick.sh
```

Или напрямую:

```bash
docker-compose exec backend node get-refresh-token.js
```

Следуйте инструкциям:

1. Откройте URL в браузере
2. Авторизуйтесь
3. Скопируйте код
4. Вставьте код в терминал

### Шаг 6: Перезапустите backend

```bash
cd /root/sender-app
docker-compose restart backend
```

### Шаг 7: Проверьте логи

```bash
docker-compose logs --tail=30 backend | grep -E "Gmail|Token|✅|❌"
```

Должны увидеть:

-  ✅ `Gmail API initialized` (без ошибок)
-  ❌ НЕ должно быть `deleted_client` или `invalid_client`

## 📋 Текущий Client ID в .env

Проверьте текущий Client ID:

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
grep GMAIL_CLIENT_ID .env
```

Если он был удален, создайте новый по инструкции выше.

## ⚠️ Важно

-  **Desktop Client ID** (не Web Client!)
-  **Redirect URI**: `your_secret_value` (для Desktop apps)
-  После создания Client ID получите новый токен с этим Client ID
