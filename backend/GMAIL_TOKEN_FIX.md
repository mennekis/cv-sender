# Исправление предупреждения о Gmail токене

## 🔍 Проблема

В логах появляется предупреждение:

```
⚠️ Failed to refresh access token: unauthorized_client
❌ Gmail OAuth client mismatch. Client ID/Secret may be incorrect.
```

## 🔧 Причина

Ошибка `unauthorized_client` означает, что:

-  Refresh token был получен с одним Client ID
-  Но сейчас используется другой Client ID
-  Или токен был отозван в Google Account

## ✅ Решение

### Вариант 1: Быстрое обновление (рекомендуется)

1. Подключитесь к VPS:

```bash
ssh root@your_vps_ip
```

2. Перейдите в директорию backend:

```bash
cd /root/sender-app/backend
```

3. Запустите скрипт быстрого обновления:

```bash
./update-gmail-token-quick.sh
```

Скрипт автоматически:

-  Скопирует get-refresh-token.js в контейнер
-  Запустит скрипт получения токена
-  Обновит .env файл
-  Перезапустит backend
-  Проверит логи

### Вариант 2: Ручное обновление

1. Скопируйте get-refresh-token.js в контейнер:

```bash
cd /root/sender-app/backend
docker cp get-refresh-token.js $(docker-compose ps -q backend):/usr/src/app/get-refresh-token.js
```

2. Запустите скрипт:

```bash
docker-compose exec backend node get-refresh-token.js
```

3. Следуйте инструкциям:

   -  Откройте URL в браузере
   -  Авторизуйтесь
   -  Скопируйте код
   -  Вставьте в терминал

4. Скрипт автоматически обновит .env

5. Перезапустите backend:

```bash
cd /root/sender-app
docker-compose restart backend
```

## 🔄 Автоматическое обнаружение обновлений

Система автоматически:

-  ✅ Проверяет изменения токена каждые **10 минут**
-  ✅ Перезагружает .env при ошибке `unauthorized_client`
-  ✅ Проактивно обновляет токен каждые **24 часа**
-  ✅ Обновляет access token при каждой проверке email (каждые 5 минут)

**После обновления токена в .env система автоматически подхватит его в течение
10 минут.**

## 📋 Проверка после обновления

```bash
# Проверка токена в .env
grep GMAIL_REFRESH_TOKEN /root/sender-app/backend/.env

# Проверка логов
docker-compose logs --tail=30 backend | grep -E "Gmail|Token|✅"
```

Должны увидеть:

```
✅ Gmail API initialized
✅ Access token refreshed successfully
```

## ⚠️ Важно

1. **Client ID и Secret должны совпадать** с теми, что использовались для
   получения токена
2. **Токен должен быть получен с Desktop Client** (не Web Client)
3. **После обновления токена** система автоматически подхватит его

## 🎯 Минимизация использования get-refresh-token

Система настроена так, чтобы **минимизировать** необходимость ручного
обновления:

1. **Проактивное обновление:** каждые 24 часа
2. **Автоматическое обновление:** при каждой проверке email (каждые 5 минут)
3. **Быстрое обнаружение:** проверка изменений токена каждые 10 минут
4. **Автоматическая перезагрузка:** при ошибке `unauthorized_client`

**В результате:** Токен должен работать **неограниченно долго**, если система
активна.

---

**Последнее обновление:** 2025-12-04
