const express = require("express");
const app = express();
const cors = require("cors");
const mailRoutes = require("./routes/mailRoutes");

// Middleware для обработки JSON и URL-кодированных данных
app.use(cors());
app.use(express.json());
app.use("/", mailRoutes);

module.exports = app;
