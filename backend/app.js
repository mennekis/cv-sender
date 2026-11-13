const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const app = express();
const mailRoutes = require("./routes/mailRoutes");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

// CORS настройки для production
const corsOptions = {
   origin: process.env.CORS_ORIGIN || "*",
   // Credentialed requests require a specific trusted origin, not a wildcard.
   credentials: Boolean(process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*"),
   optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Middleware для обработки JSON и URL-кодированных данных
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Swagger UI для документации API
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rate limiting для всех API endpoints
app.use("/api/", apiLimiter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Проверка состояния сервиса
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
app.get("/health", (req, res) => {
   res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
   });
});

// Маршруты
app.use("/", mailRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Проверка состояния сервиса (API endpoint)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Сервис работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
app.get("/api/health", (req, res) => {
   res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
   });
});

// Централизованный обработчик ошибок (должен быть последним)
app.use(errorHandler);

module.exports = app;
