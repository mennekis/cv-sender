# Чеклист перед деплоем на VPS

**Дата проверки:** 2025-12-04  
**Версия:** 1.0.0

---

## ✅ Проверка кода

### Зависимости

-  [x] `swagger-jsdoc` добавлен в package.json
-  [x] `swagger-ui-express` добавлен в package.json
-  [x] Все зависимости актуальны
-  [x] package-lock.json обновлен

### Код

-  [x] Нет ошибок линтера
-  [x] Swagger конфигурация валидна
-  [x] Все импорты корректны
-  [x] Обработка ошибок улучшена (fallback логирование)

### Файлы

-  [x] `.env.example` создан
-  [x] `config/swagger.js` создан и работает
-  [x] Swagger аннотации добавлены ко всем endpoints
-  [x] `API_DOCUMENTATION.md` создан

---

## ✅ Проверка безопасности

-  [x] Удалена небезопасная проверка SSL (`NODE_TLS_REJECT_UNAUTHORIZED`)
-  [x] Rate limiting настроен
-  [x] Валидация входных данных
-  [x] Обработка ошибок без утечки информации

---

## ✅ Проверка Docker

### Dockerfile

-  [x] Правильно копирует все файлы
-  [x] `config/swagger.js` будет скопирован (не в .dockerignore)
-  [x] Зависимости установятся при сборке

### .dockerignore

-  [x] `config/swagger.js` НЕ исключен (должен быть в контейнере)
-  [x] `.env` исключен (правильно)
-  [x] Тестовые файлы исключены

### docker-compose.yml

-  [x] Конфигурация корректна
-  [x] Volumes настроены
-  [x] Environment variables настроены

---

## ⚠️ Что нужно сделать на VPS

### 1. Установить новые зависимости

```bash
ssh root@your_vps_ip
cd /root/sender-app/backend
npm install
```

Или пересобрать контейнер:

```bash
cd /root/sender-app
docker-compose build backend
docker-compose up -d backend
```

### 2. Проверить .env файл

Убедиться, что все переменные на месте:

```bash
cd /root/sender-app/backend
grep -E 'SENDGRID_API_KEY|SENDGRID_FROM|ADMIN_EMAIL|MONGO_URI|GMAIL_REFRESH_TOKEN' .env
```

### 3. Проверить работу Swagger

После деплоя проверить:

-  https://sender.your_sendgrid_api_key/api-docs
-  Должна открыться интерактивная документация

### 4. Проверить логи

```bash
docker-compose logs --tail=50 backend | grep -i "swagger\|api-docs\|error"
```

---

## 📋 Порядок деплоя

### Вариант 1: Обновление через git (если используется)

```bash
ssh root@your_vps_ip
cd /root/sender-app
git pull
cd backend
npm install
cd ..
docker-compose build backend
docker-compose restart backend
```

### Вариант 2: Ручное копирование файлов

```bash
# На локальной машине
cd /Users/alexey.nikolayenko/Desktop/Experiments/mail-sender/Sender_App2/cv-sender

# Копируем обновленные файлы
scp -r backend/config root@your_vps_ip:/root/sender-app/backend/
scp backend/app.js root@your_vps_ip:/root/sender-app/backend/
scp backend/routes/mailRoutes.js root@your_vps_ip:/root/sender-app/backend/routes/
scp backend/package.json root@your_vps_ip:/root/sender-app/backend/
scp backend/server.js root@your_vps_ip:/root/sender-app/backend/
scp backend/services/db.js root@your_vps_ip:/root/sender-app/backend/services/
scp backend/services/sendgridService.js root@your_vps_ip:/root/sender-app/backend/services/

# На VPS
ssh root@your_vps_ip
cd /root/sender-app/backend
npm install
cd ..
docker-compose build backend
docker-compose restart backend
```

---

## ✅ Проверка после деплоя

### 1. Health check

```bash
curl https://sender.your_sendgrid_api_key/health
```

Ожидаемый ответ:

```json
{"status":"ok","timestamp":"...","uptime":...}
```

### 2. Swagger UI

```bash
curl -I https://sender.your_sendgrid_api_key/api-docs
```

Должен вернуть `200 OK`

### 3. API endpoints

```bash
curl https://sender.your_sendgrid_api_key/api/health
curl https://sender.your_sendgrid_api_key/api/campaigns/stats
```

### 4. Логи

```bash
docker-compose logs --tail=100 backend | grep -E "Swagger|api-docs|Error|✅"
```

---

## 🔍 Потенциальные проблемы

### Проблема: Swagger не работает

**Причина:** Зависимости не установлены  
**Решение:**

```bash
cd /root/sender-app/backend
npm install
docker-compose restart backend
```

### Проблема: Ошибка require swagger-jsdoc

**Причина:** package.json не обновлен в контейнере  
**Решение:** Пересобрать контейнер:

```bash
docker-compose build backend
docker-compose up -d backend
```

### Проблема: 404 на /api-docs

**Причина:** Nginx не проксирует /api-docs  
**Решение:** Проверить nginx.conf (должен проксировать все запросы к backend)

---

## ✅ Итоговый статус

**Готовность к деплою:** ✅ ГОТОВО

Все проверки пройдены:

-  ✅ Код проверен
-  ✅ Зависимости добавлены
-  ✅ Безопасность улучшена
-  ✅ Docker конфигурация корректна
-  ✅ Документация создана

**Рекомендация:** Можно деплоить на VPS

---

## 📝 Примечания

1. После деплоя проверить работу Swagger UI
2. Убедиться, что все endpoints работают
3. Проверить логи на наличие ошибок
4. Обновить токен Gmail если нужно (уже настроен автоматический refresh)
