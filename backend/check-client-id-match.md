# Проверка соответствия Client ID и токена

## 🔍 Проблема

Если у вас несколько Client ID в Google Cloud Console, важно использовать **тот
же Client ID**, с которым был получен refresh token.

## 📋 Как проверить все Client ID

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите все **OAuth 2.0 Client IDs**

## 🎯 Какой Client ID использовать?

### Важно:

-  ✅ **Desktop Client ID** (тип: "Desktop app")
-  ✅ **Redirect URI**: `your_secret_value`
-  ❌ **НЕ** Web Client ID (тип: "Web application")

## 🔧 Решение: Определить правильный Client ID

### Вариант 1: Использовать существующий Desktop Client ID

Если у вас уже есть Desktop Client ID:

1. Скопируйте его **Client ID** и **Client Secret**
2. Обновите `.env` на VPS:

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
nano .env
```

Обновите:

```
GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=your_secret_value
```

3. Перезапустите backend:

```bash
cd /root/sender-app
docker-compose restart backend
```

4. **Получите новый токен** с этим Client ID:

```bash
cd /root/sender-app/backend
./update-gmail-token-quick.sh
```

### Вариант 2: Создать новый Desktop Client ID

Если у вас нет Desktop Client ID или хотите создать новый:

1. В Google Cloud Console → **APIs & Services** → **Credentials**
2. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Выберите тип: **Desktop app**
4. Название: например, "Gmail Desktop Client"
5. Нажмите **CREATE**
6. Скопируйте **Client ID** и **Client Secret**
7. Обновите `.env` на VPS (как в Варианте 1)
8. Получите новый токен с этим Client ID

## ⚠️ Важно

-  **Один токен = один Client ID**: Токен работает только с тем Client ID, с
   которым был получен
-  **Нельзя смешивать**: Если токен получен с Client ID #1, нельзя использовать
   Client ID #2
-  **Решение**: Либо обновить Client ID в `.env` и получить новый токен, либо
   использовать существующий Client ID и получить новый токен

## 🔍 Проверка соответствия

После обновления проверьте логи:

```bash
docker-compose logs --tail=30 backend | grep -E "Gmail|Token|mismatch"
```

Должны увидеть:

-  ✅ `Gmail API initialized` (без ошибок)
-  ❌ НЕ должно быть `Gmail OAuth client mismatch`

## 📝 Текущая ситуация

**Текущий Client ID на VPS:** `447293311328-rp2hne0neoepppab4t3moadrk1h...`

**Текущий токен:** `1//03cFrARovdqNbCgYI...`

Если токен был получен с другим Client ID, нужно:

1. Либо обновить Client ID в `.env` на тот, с которым был получен токен
2. Либо получить новый токен с текущим Client ID
