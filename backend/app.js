const express = require("express");
const cors = require("cors");
const app = express();
const mailRoutes = require("./routes/mailRoutes");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

// CORS настройки для production
const corsOptions = {
   origin: process.env.CORS_ORIGIN || "*",
   credentials: true,
   optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Middleware для обработки JSON и URL-кодированных данных
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting для всех API endpoints
app.use("/api/", apiLimiter);

// Маршруты
app.use("/", mailRoutes);

// Health check endpoint
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
