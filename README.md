<pre> <code> 
# 🚢 Seafarer Resume Sender

Сервис для автоматической массовой рассылки резюме моряков в крюинговые агентства с логированием, отчётами и возможностью подмены контента.

## ⚙️ Стек

- Backend: Node.js + Express
- Email: SendGrid API
- Gmail API: Google APIs для обработки ответов
- Frontend: HTML + JS
- Хранилище: Cloudflare + локальный сервер или VPS
- Вспомогательные библиотеки: `multer`, `csv-parse`, `googleapis`, `dotenv`

## 🆕 Новые возможности

- ✅ **Автоматическое обновление Gmail токенов** - система автоматически обновляет access token при истечении
- ✅ **Уведомления администратора** - автоматические email уведомления на `mennekis@gmail.com` при проблемах с токенами
- ✅ **Обработка ошибок токена** - автоматическое обнаружение и обработка ошибок `invalid_grant`
- ✅ **Оптимизация хранения данных** - вместо полного массива получателей сохраняется только количество (`recipientsCount`) для экономии места в БД

---

## 📁 Структура проекта
project-root/
│
├── backend/
│ ├── controllers/
│ │ └── mailController.js # Основная логика обработки и рассылки
│ ├── services/
│ │ ├── sendgridService.js # Логика отправки через SendGrid
│ │ ├── parseCSV.js # Парсинг базы емейлов
│ │ ├── logger.js # Логирование результатов
│ │ └── notifier.js # Отправка финального отчёта админу
│ ├── uploads/ # Временное хранение файлов
│ ├── logs/ # Логи рассылки
│ ├── config/
│ │ └── sendgrid.js # Конфигурация SendGrid
│ ├── routes/
│ │ └── mailRoutes.js # API endpoint
│ ├── middlewares/
│ │ └── upload.js # Обработка файлов от клиента
│ ├── app.js
│ └── server.js
│
├── frontend/
│ ├── public/
│ │ └── styles.css
│ ├── index.html # UI для загрузки PDF/CSV/шаблона
│ └── main.js # Отправка данных на бэкенд
│
├── .env
├── README.md
└── package.json

</code> </pre>

## 📚 Документация

### API Документация

-  **Swagger UI (интерактивная):** `https://sender.your_sendgrid_api_key/api-docs`
-  **Markdown документация:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Другая документация

-  **GMAIL_TOKEN_MANAGEMENT.md** - Подробное руководство по управлению Gmail
   токенами
-  **CRON_SETUP.md** - Настройка cron-задач для резервной обработки
-  **SSL_SETUP.md** - Настройка SSL сертификатов
-  **PROJECT_REVIEW.md** - Ревью проекта и рекомендации

## 🔄 Миграция данных

### Оптимизация хранения получателей

В версии 2.0 была проведена оптимизация модели `Campaign`: вместо хранения
полного массива получателей (`recipients`) теперь сохраняется только количество
(`recipientsCount`). Это значительно уменьшает размер документов в БД.

**Для миграции существующих данных:**

```bash
cd backend
node migrate-recipients-to-count.js
```

Скрипт автоматически:

-  Найдет все кампании с полем `recipients`
-  Вычислит количество получателей
-  Установит `recipientsCount`
-  Удалит поле `recipients`

**Примечание:** После миграции полный список получателей будет недоступен,
сохраняется только количество.
