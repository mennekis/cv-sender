# 🚢 Seafarer Resume Sender

Сервис для автоматической массовой рассылки резюме моряков в крюинговые
агентства с логированием, отчётами и возможностью подмены контента.

## ⚙️ Стек

-  **Backend**: Node.js + Express 5.x
-  **Database**: MongoDB (Mongoose)
-  **Email**: SendGrid API
-  **Gmail Integration**: Google APIs (для обработки ответов)
-  **Frontend**: Vanilla HTML/CSS/JS
-  **Reverse Proxy**: Nginx
-  **Containerization**: Docker + Docker Compose
-  **Process Manager**: PM2

## 📁 Структура проекта

```
Sender_App2/
│
├── cv-sender/                    # Основная рабочая директория проекта
│   ├── backend/                  # Backend приложение
│   │   ├── config/              # Конфигурационные файлы
│   │   │   └── constants.js     # Централизованные константы
│   │   ├── controllers/         # Контроллеры (бизнес-логика)
│   │   │   ├── mailController.js
│   │   │   └── campaignController.js
│   │   ├── middleware/          # Express middleware
│   │   │   ├── errorHandler.js
│   │   │   ├── validation.js
│   │   │   ├── rateLimiter.js
│   │   │   └── multerErrorHandler.js
│   │   ├── models/              # Mongoose модели
│   │   │   └── Campaign.js
│   │   ├── routes/              # API маршруты
│   │   │   └── mailRoutes.js
│   │   ├── services/            # Сервисы
│   │   │   ├── sendgridService.js
│   │   │   ├── parseEmailsFromFile.js
│   │   │   ├── senderPrefix.js
│   │   │   ├── clearUploads.js
│   │   │   ├── db.js
│   │   │   └── gmailReplyService.js
│   │   ├── utils/               # Утилиты
│   │   │   └── emailTemplates.js
│   │   ├── uploads/             # Временное хранение загруженных файлов
│   │   ├── logs/                # Логи приложения
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frontend/                # Frontend приложение
│   │   ├── index.html
│   │   ├── campaigns.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   ├── docker-compose.yml       # Docker Compose конфигурация
│   ├── nginx.conf               # Nginx конфигурация (reverse proxy)
│   ├── mime.types               # MIME типы для Nginx
│   ├── deploy.sh                # Скрипт деплоя на VPS
│   ├── globaly.md               # Документация по email-связке
│   ├── README.md                # Документация проекта
│   └── PROJECT_CONTEX.md        # Контекст проекта
│
├── README.md                    # Общая документация репозитория (этот файл)
└── PROJECT_DESCRIPTION.md       # Подробное описание проекта
```

## 🚀 Быстрый старт

1. Перейдите в директорию проекта:

   ```bash
   cd cv-sender
   ```

2. Настройте переменные окружения:

   ```bash
   cd backend
   # Создайте файл .env и заполните необходимые переменные
   # Обязательные: SENDGRID_API_KEY, SENDGRID_FROM, MONGO_URI
   # Подробнее см. PROJECT_DESCRIPTION.md
   ```

3. Запустите через Docker Compose:

   ```bash
   docker-compose up -d --build
   ```

4. Приложение будет доступно по адресу: `http://localhost`

## 📝 Основные возможности

-  ✅ **Управление кампаниями** - создание, отслеживание статусов, статистика
-  ✅ **Массовая рассылка email** - отправка резюме через SendGrid API
-  ✅ **Хранение данных** - MongoDB для метаданных кампаний
-  ✅ **Обработка файлов** - парсинг CSV/Excel с email адресами
-  ✅ **Динамические отправители** - генерация уникальных email адресов
   (client23@your_sendgrid_api_key)
-  ✅ **Gmail интеграция** - обработка ответов на письма
-  ✅ **Автоматическое обновление токенов** - автоматическое обновление Gmail
   access token при истечении
-  ✅ **Уведомления администратора** - автоматические email уведомления при
   проблемах с токенами
-  ✅ **Безопасность** - rate limiting, валидация данных
-  ✅ **Мониторинг** - health check endpoint, логирование, статистика

## 🔧 Деплой

Для деплоя на VPS используйте скрипт из директории `cv-sender/`:

```bash
cd cv-sender
./deploy.sh
```

Скрипт автоматически:

-  Копирует файлы из `cv-sender/` на сервер через rsync
-  Исключает `node_modules`, `.git`, `package-lock.json`
-  Перезапускает Docker Compose контейнеры (MongoDB, Backend, Nginx)

### Требования для деплоя:

-  VPS с установленными Docker и Docker Compose
-  Настроенный SSH доступ к серверу
-  Файл `.env` в `cv-sender/backend/` с необходимыми переменными

## 📚 Дополнительная документация

-  **PROJECT_DESCRIPTION.md** - подробное описание проекта, архитектуры и
   переменных окружения
-  **cv-sender/globaly.md** - документация по email-связке (SendGrid + ImprovMX)
-  **cv-sender/README.md** - документация внутри рабочей директории
