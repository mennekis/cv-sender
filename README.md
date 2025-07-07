<pre> <code> 
# 🚢 Seafarer Resume Sender

Сервис для автоматической массовой рассылки резюме моряков в крюинговые агентства с логированием, отчётами и возможностью подмены контента.

## ⚙️ Стек

- Backend: Node.js + Express
- Email: SendGrid API
- Frontend: HTML + JS
- Хранилище: Cloudflare + локальный сервер или VPS
- Вспомогательные библиотеки: `multer`, `csv-parse`, `nodemailer`, `dotenv`

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
