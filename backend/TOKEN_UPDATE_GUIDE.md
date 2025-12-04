# Простое обновление Gmail токена

## 🎯 Быстрый способ (рекомендуется)

### На VPS:

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
./update-gmail-token-quick.sh
```

Скрипт автоматически:

1. ✅ Скопирует `get-refresh-token.js` в контейнер
2. ✅ Запустит процесс получения токена
3. ✅ Покажет URL для авторизации
4. ✅ Обновит `.env` файл
5. ✅ Синхронизирует `.env` между контейнером и хостом
6. ✅ Перезапустит backend
7. ✅ Проверит логи

### Шаги:

1. **Запустите скрипт:**

   ```bash
   ./update-gmail-token-quick.sh
   ```

2. **Скрипт покажет URL** - откройте его в браузере

3. **Авторизуйтесь в Google** (аккаунт с Gmail ящиком)

4. **Скопируйте код авторизации** (будет показан на странице Google)

5. **Вставьте код в терминал**, когда скрипт попросит

6. **Скрипт автоматически:**

   -  Обработает код
   -  Обновит `.env` файл
   -  Синхронизирует между контейнером и хостом
   -  Перезапустит backend

7. **Готово!** Токен обновлен и применен

## ⚠️ Важно

-  **Коды авторизации одноразовые** - используйте код сразу после получения
-  **Коды имеют ограниченное время жизни** (несколько минут)
-  Если код истек, получите новый, запустив скрипт заново

## 🔍 Проверка после обновления

```bash
# Проверка токена в .env
grep GMAIL_REFRESH_TOKEN /root/sender-app/backend/.env

# Проверка логов
cd /root/sender-app
docker-compose logs --tail=30 backend | grep -E "Gmail|Token|✅|❌"
```

Должны увидеть:

-  ✅ `Gmail API initialized` (без ошибок)
-  ✅ `Token checker started`
-  ✅ `Email checker started`
-  ❌ НЕ должно быть `unauthorized_client`, `deleted_client`, `invalid_grant`

## 🔄 Автоматическое обновление

Система автоматически:

-  ✅ Проверяет токен каждые **30 минут**
-  ✅ Проактивно обновляет токен каждые **24 часа**
-  ✅ Обновляет access token при каждой проверке email (каждые 5 минут)
-  ✅ Автоматически обнаруживает изменения токена в `.env`

**В результате:** Токен должен работать **неограниченно долго**, если система
активна.

## 📝 Когда нужно обновлять токен вручную?

Только в следующих случаях:

1. **Client ID был удален** из Google Cloud Console
2. **Client ID был изменен** в Google Cloud Console
3. **Токен был отозван** вручную в Google Account
4. **Ошибка `unauthorized_client`** или `deleted_client` в логах

Во всех остальных случаях система обновляет токен автоматически.

## 🆘 Если что-то пошло не так

1. **Проверьте Client ID/Secret:**

   ```bash
   grep GMAIL_CLIENT_ID /root/sender-app/backend/.env
   grep GMAIL_CLIENT_SECRET /root/sender-app/backend/.env
   ```

2. **Проверьте, что Client ID существует в Google Cloud Console:**

   -  https://console.cloud.google.com/apis/credentials
   -  Убедитесь, что Client ID не удален
   -  Убедитесь, что тип: **Desktop app**

3. **Получите новый токен:**
   ```bash
   cd /root/sender-app/backend
   ./update-gmail-token-quick.sh
   ```

---

**Последнее обновление:** 2025-12-04
