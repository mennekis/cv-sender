# API Документация - Sender App

**Base URL:** `https://sender.your_sendgrid_api_key/api`  
**Version:** 1.0.0

---

## 📋 Содержание

-  [Общая информация](#общая-информация)
-  [Аутентификация](#аутентификация)
-  [Rate Limiting](#rate-limiting)
-  [Endpoints](#endpoints)
   -  [Health Check](#health-check)
   -  [Email](#email)
   -  [Campaigns](#campaigns)
-  [Модели данных](#модели-данных)
-  [Коды ошибок](#коды-ошибок)

---

## Общая информация

API для отправки email рассылок с резюме и управления кампаниями.

**Формат ответов:** JSON  
**Кодировка:** UTF-8

---

## Аутентификация

В текущей версии API не требует аутентификации. Все endpoints доступны публично.

⚠️ **Важно:** Rate limiting применяется ко всем запросам для защиты от
злоупотреблений.

---

## Rate Limiting

### Общие ограничения

-  **100 запросов** в течение **15 минут** с одного IP

### Специальные ограничения

-  **Email отправка:** 10 запросов в час
-  **Отчеты об ошибках:** 50 запросов в 15 минут

При превышении лимита возвращается статус `429 Too Many Requests`.

---

## Endpoints

### Health Check

#### GET `/health`

Проверка состояния сервиса.

**Ответ:**

```json
{
   "status": "ok",
   "timestamp": "2025-12-04T12:00:00.000Z",
   "uptime": 3600
}
```

---

### Email

#### POST `/send`

Отправка email рассылки с резюме.

**Content-Type:** `multipart/form-data`

**Параметры:**

| Параметр       | Тип    | Обязательный | Описание                                                     |
| -------------- | ------ | ------------ | ------------------------------------------------------------ |
| `subject`      | string | Да           | Тема письма                                                  |
| `emailText`    | string | Да           | Текст письма (HTML)                                          |
| `senderName`   | string | Да           | Имя отправителя                                              |
| `senderEmail`  | string | Да           | Email отправителя                                            |
| `contactPhone` | string | Нет          | Контактный телефон                                           |
| `messengers`   | string | Нет          | Список мессенджеров (через запятую: Viber,WhatsApp,Telegram) |
| `resume`       | file   | Да           | PDF файл с резюме (макс. 5MB)                                |
| `emails`       | file   | Да           | CSV/Excel файл с email адресами (макс. 5MB)                  |

**Поддерживаемые форматы файлов:**

-  Resume: PDF
-  Emails: CSV, XLS, XLSX

**Пример запроса:**

```bash
curl -X POST https://sender.your_sendgrid_api_key/api/send \
  -F "subject=Seafarer Resume" \
  -F "emailText=<h1>Hello</h1>" \
  -F "senderName=John Doe" \
  -F "senderEmail=john@example.com" \
  -F "contactPhone=+1234567890" \
  -F "messengers=Viber,WhatsApp" \
  -F "resume=@resume.pdf" \
  -F "emails=@emails.csv"
```

**Успешный ответ (200):**

```json
{
   "message": "Mailing completed. Successful: 10, Failed: 0",
   "alias": "seafarer_john_doe_abc123",
   "total": 10,
   "success": 10,
   "failed": 0
}
```

**Ошибки:**

-  `400 Bad Request` - Неверные параметры или файлы
-  `429 Too Many Requests` - Превышен лимит запросов
-  `500 Internal Server Error` - Ошибка сервера

---

#### POST `/client-error`

Отправка отчета об ошибке на клиенте.

**Content-Type:** `application/json`

**Тело запроса:**

```json
{
   "message": "Описание ошибки",
   "stack": "Stack trace (опционально)",
   "url": "URL страницы",
   "userAgent": "User Agent браузера"
}
```

**Ответ (200):**

```json
{
   "message": "Error report received"
}
```

---

### Campaigns

#### POST `/campaign/start`

Запуск новой кампании рассылки.

**Content-Type:** `multipart/form-data`

**Параметры:**

| Параметр       | Тип    | Обязательный | Описание                            |
| -------------- | ------ | ------------ | ----------------------------------- |
| `clientName`   | string | Да           | Имя клиента                         |
| `clientEmail`  | string | Нет          | Email клиента                       |
| `subject`      | string | Да           | Тема письма                         |
| `body`         | string | Да           | HTML содержимое письма              |
| `text`         | string | Нет          | Текстовая версия письма             |
| `senderName`   | string | Да           | Имя отправителя                     |
| `contactPhone` | string | Нет          | Контактный телефон                  |
| `messengers`   | string | Нет          | Список мессенджеров (через запятую) |
| `emails`       | file   | Да           | CSV/Excel файл с email адресами     |

**Пример запроса:**

```bash
curl -X POST https://sender.your_sendgrid_api_key/api/campaign/start \
  -F "clientName=John Doe" \
  -F "clientEmail=john@example.com" \
  -F "subject=Seafarer Resume" \
  -F "body=<h1>Hello</h1>" \
  -F "senderName=John Doe" \
  -F "emails=@emails.csv"
```

**Успешный ответ (200):**

```json
{
   "message": "Campaign started successfully",
   "alias": "seafarer_john_doe_abc123",
   "recipientsCount": 10,
   "status": "sending"
}
```

---

#### GET `/campaigns`

Получение списка кампаний.

**Query параметры:**

| Параметр | Тип    | Обязательный | Описание                                          |
| -------- | ------ | ------------ | ------------------------------------------------- |
| `limit`  | number | Нет          | Количество записей (по умолчанию: 50, макс: 1000) |
| `skip`   | number | Нет          | Количество пропущенных записей (по умолчанию: 0)  |
| `status` | string | Нет          | Фильтр по статусу (pending, sending, completed)   |

**Пример запроса:**

```bash
curl "https://sender.your_sendgrid_api_key/api/campaigns?limit=10&skip=0&status=completed"
```

**Успешный ответ (200):**

```json
{
   "campaigns": [
      {
         "_id": "507f1f77bcf86cd799439011",
         "clientName": "John Doe",
         "alias": "seafarer_john_doe_abc123",
         "status": "completed",
         "recipientsCount": 10,
         "successCount": 10,
         "errorCount": 0,
         "createdAt": "2025-12-04T12:00:00.000Z"
      }
   ],
   "total": 1,
   "limit": 10,
   "skip": 0
}
```

---

#### GET `/campaign/:alias`

Получение деталей кампании по алиасу.

**Параметры пути:**

| Параметр | Тип    | Описание                  |
| -------- | ------ | ------------------------- |
| `alias`  | string | Уникальный алиас кампании |

**Пример запроса:**

```bash
curl "https://sender.your_sendgrid_api_key/api/campaign/seafarer_john_doe_abc123"
```

**Успешный ответ (200):**

```json
{
   "_id": "507f1f77bcf86cd799439011",
   "clientName": "John Doe",
   "alias": "seafarer_john_doe_abc123",
   "clientEmail": "john@example.com",
   "status": "completed",
   "recipientsCount": 10,
   "subject": "Seafarer Resume",
   "senderName": "John Doe",
   "contactPhone": "+1234567890",
   "messengers": ["Viber", "WhatsApp"],
   "attachments": [
      {
         "filename": "resume.pdf",
         "size": 102400,
         "type": "application/pdf"
      }
   ],
   "successCount": 10,
   "errorCount": 0,
   "createdAt": "2025-12-04T12:00:00.000Z"
}
```

**Ошибки:**

-  `404 Not Found` - Кампания не найдена

---

#### GET `/campaigns/stats`

Получение статистики по всем кампаниям.

**Пример запроса:**

```bash
curl "https://sender.your_sendgrid_api_key/api/campaigns/stats"
```

**Успешный ответ (200):**

```json
{
   "total": 10,
   "pending": 2,
   "sending": 1,
   "completed": 7,
   "totalRecipients": 150,
   "totalSuccess": 145,
   "totalErrors": 5
}
```

---

## Модели данных

### Campaign

```json
{
   "_id": "string (MongoDB ObjectId)",
   "clientName": "string",
   "alias": "string (unique)",
   "clientEmail": "string | null",
   "recipientsCount": "number",
   "status": "pending | sending | completed",
   "subject": "string | null",
   "body": "string | null",
   "text": "string | null",
   "senderName": "string | null",
   "contactPhone": "string | null",
   "messengers": ["string"],
   "attachments": [
      {
         "filename": "string",
         "size": "number",
         "type": "string"
      }
   ],
   "successCount": "number",
   "errorCount": "number",
   "createdAt": "string (ISO 8601)"
}
```

---

## Коды ошибок

### 400 Bad Request

Неверные параметры запроса или файлы.

```json
{
   "error": "Validation Error",
   "message": "Описание ошибки",
   "details": {}
}
```

### 404 Not Found

Ресурс не найден.

```json
{
   "error": "Not Found",
   "message": "Campaign not found"
}
```

### 409 Conflict

Конфликт данных (например, дубликат).

```json
{
   "error": "Duplicate Entry",
   "message": "A record with this value already exists"
}
```

### 429 Too Many Requests

Превышен лимит запросов.

```json
{
   "error": "Too Many Requests",
   "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error

Внутренняя ошибка сервера.

```json
{
   "error": "Internal Server Error",
   "message": "Internal Server Error"
}
```

---

## Примеры использования

### JavaScript (Fetch API)

```javascript
// Отправка email рассылки
const formData = new FormData();
formData.append("subject", "Seafarer Resume");
formData.append("emailText", "<h1>Hello</h1>");
formData.append("senderName", "John Doe");
formData.append("senderEmail", "john@example.com");
formData.append("resume", resumeFile);
formData.append("emails", emailsFile);

fetch("https://sender.your_sendgrid_api_key/api/send", {
   method: "POST",
   body: formData,
})
   .then((response) => response.json())
   .then((data) => console.log(data))
   .catch((error) => console.error("Error:", error));
```

### Python (requests)

```python
import requests

url = 'https://sender.your_sendgrid_api_key/api/send'
files = {
    'resume': open('resume.pdf', 'rb'),
    'emails': open('emails.csv', 'rb')
}
data = {
    'subject': 'Seafarer Resume',
    'emailText': '<h1>Hello</h1>',
    'senderName': 'John Doe',
    'senderEmail': 'john@example.com'
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

### cURL

```bash
# Получение списка кампаний
curl "https://sender.your_sendgrid_api_key/api/campaigns?limit=10"

# Получение статистики
curl "https://sender.your_sendgrid_api_key/api/campaigns/stats"

# Получение деталей кампании
curl "https://sender.your_sendgrid_api_key/api/campaign/seafarer_john_doe_abc123"
```

---

## Ограничения

-  **Максимальный размер файла:** 5MB
-  **Максимальное количество файлов:** 2 (resume + emails)
-  **Поддерживаемые форматы резюме:** PDF
-  **Поддерживаемые форматы списка email:** CSV, XLS, XLSX
-  **Максимальное количество записей в ответе:** 1000

---

## Поддержка

При возникновении проблем обращайтесь:

-  Email: admin@example.com
-  Документация: https://sender.your_sendgrid_api_key/api-docs

---

**Последнее обновление:** 2025-12-04
