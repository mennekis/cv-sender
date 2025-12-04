/**
 * Swagger/OpenAPI конфигурация
 * Документация API доступна по адресу /api-docs
 */

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
   definition: {
      openapi: "3.0.0",
      info: {
         title: "Sender App API",
         version: "1.0.0",
         description:
            "API для отправки email рассылок с резюме и управления кампаниями",
         contact: {
            name: "API Support",
            email: process.env.ADMIN_EMAIL || "admin@example.com",
         },
         license: {
            name: "ISC",
         },
      },
      servers: [
         {
            url: process.env.API_BASE_URL || "http://localhost:3000",
            description: "Development server",
         },
         {
            url: "https://sender.your_sendgrid_api_key",
            description: "Production server",
         },
      ],
      components: {
         schemas: {
            Error: {
               type: "object",
               properties: {
                  error: {
                     type: "string",
                     description: "Тип ошибки",
                  },
                  message: {
                     type: "string",
                     description: "Описание ошибки",
                  },
                  details: {
                     type: "object",
                     description: "Дополнительные детали ошибки",
                  },
               },
            },
            Campaign: {
               type: "object",
               properties: {
                  _id: {
                     type: "string",
                     description: "ID кампании",
                  },
                  clientName: {
                     type: "string",
                     description: "Имя клиента",
                  },
                  alias: {
                     type: "string",
                     description: "Уникальный алиас кампании",
                  },
                  clientEmail: {
                     type: "string",
                     nullable: true,
                     description: "Email клиента",
                  },
                  recipientsCount: {
                     type: "number",
                     description: "Количество получателей",
                  },
                  status: {
                     type: "string",
                     enum: ["pending", "sending", "completed"],
                     description: "Статус кампании",
                  },
                  subject: {
                     type: "string",
                     nullable: true,
                     description: "Тема письма",
                  },
                  senderName: {
                     type: "string",
                     nullable: true,
                     description: "Имя отправителя",
                  },
                  contactPhone: {
                     type: "string",
                     nullable: true,
                     description: "Контактный телефон",
                  },
                  messengers: {
                     type: "array",
                     items: {
                        type: "string",
                     },
                     description: "Список мессенджеров",
                  },
                  attachments: {
                     type: "array",
                     items: {
                        type: "object",
                        properties: {
                           filename: { type: "string" },
                           size: { type: "number" },
                           type: { type: "string" },
                        },
                     },
                     description: "Вложения",
                  },
                  successCount: {
                     type: "number",
                     description: "Количество успешно отправленных писем",
                  },
                  errorCount: {
                     type: "number",
                     description: "Количество ошибок отправки",
                  },
                  createdAt: {
                     type: "string",
                     format: "date-time",
                     description: "Дата создания",
                  },
               },
            },
            CampaignStats: {
               type: "object",
               properties: {
                  total: {
                     type: "number",
                     description: "Общее количество кампаний",
                  },
                  pending: {
                     type: "number",
                     description: "Кампаний в ожидании",
                  },
                  sending: {
                     type: "number",
                     description: "Кампаний в процессе отправки",
                  },
                  completed: {
                     type: "number",
                     description: "Завершенных кампаний",
                  },
                  totalRecipients: {
                     type: "number",
                     description: "Общее количество получателей",
                  },
                  totalSuccess: {
                     type: "number",
                     description: "Общее количество успешных отправок",
                  },
                  totalErrors: {
                     type: "number",
                     description: "Общее количество ошибок",
                  },
               },
            },
         },
         securitySchemes: {
            // Пока API не требует аутентификации
            // Можно добавить в будущем
         },
      },
      tags: [
         {
            name: "Email",
            description: "Операции с отправкой email",
         },
         {
            name: "Campaigns",
            description: "Управление кампаниями",
         },
         {
            name: "Health",
            description: "Проверка состояния сервиса",
         },
      ],
   },
   apis: ["./routes/*.js", "./app.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
