# 🚢 Seafarer Resume Sender

Сервис для автоматической массовой рассылки резюме моряков в крюинговые
агентства с логированием, отчётами и возможностью подмены контента.

## ⚙️ Стек

-  Backend: Node.js + Express
-  Database: MongoDB
-  Email: SendGrid API
-  Frontend: HTML + JavaScript
-  Reverse Proxy: Nginx
-  Containerization: Docker + Docker Compose
-  Process Manager: PM2

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
│   ├── nginx.conf               # Nginx конфигурация
│   ├── mime.types               # MIME типы для Nginx
│   └── deploy.sh                # Скрипт деплоя на VPS
│
├── deploy.sh                    # Основной скрипт деплоя
├── nginx.conf                   # Nginx конфигурация (для совместимости)
├── mime.types                   # MIME типы (для совместимости)
└── README.md                    # Документация
```

## 🚀 Быстрый старт

1. Перейдите в директорию проекта:

   ```bash
   cd cv-sender
   ```

2. Настройте переменные окружения:

   ```bash
   cd backend
   cp .env.example .env
   # Отредактируйте .env и заполните необходимые переменные
   ```

3. Запустите через Docker Compose:

   ```bash
   docker-compose up -d --build
   ```

4. Приложение будет доступно по адресу: `http://localhost`

## 📝 Основные возможности

-  ✅ Массовая рассылка email с резюме
-  ✅ Управление кампаниями через MongoDB
-  ✅ Отслеживание статистики отправок
-  ✅ Защита от злоупотреблений (rate limiting)
-  ✅ Централизованная обработка ошибок
-  ✅ Валидация входных данных
-  ✅ Health check endpoint для мониторинга

## 🔧 Деплой

Для деплоя на VPS используйте скрипт:

```bash
./deploy.sh
```

Скрипт автоматически:

-  Копирует файлы из `cv-sender/` на сервер
-  Перезапускает Docker контейнеры
-  Применяет обновления
