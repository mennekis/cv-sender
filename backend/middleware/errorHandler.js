/**
 * Централизованный обработчик ошибок
 * Унифицирует формат ответов об ошибках
 */

const errorHandler = (err, req, res, next) => {
   // Логируем ошибку
   console.error("Error:", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
   });

   // Ошибки валидации
   if (err.name === "ValidationError") {
      return res.status(400).json({
         error: "Validation Error",
         message: err.message,
         details: err.errors,
      });
   }

   // Ошибки Multer (загрузка файлов)
   if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
         error: "File Too Large",
         message: `File size exceeds the maximum allowed size of ${err.limit} bytes`,
      });
   }

   if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
         error: "Too Many Files",
         message: `Maximum ${err.limit} files allowed`,
      });
   }

   if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
         error: "Unexpected File",
         message: `Unexpected file field: ${err.field}`,
      });
   }

   // Ошибки MongoDB
   if (err.name === "MongoError" || err.name === "MongoServerError") {
      if (err.code === 11000) {
         return res.status(409).json({
            error: "Duplicate Entry",
            message: "A record with this value already exists",
         });
      }
   }

   // Ошибки SendGrid
   if (err.response && err.response.body) {
      return res.status(err.response.statusCode || 500).json({
         error: "Email Service Error",
         message: err.message,
         details: err.response.body.errors || err.response.body,
      });
   }

   // Стандартная ошибка сервера
   const statusCode = err.statusCode || err.status || 500;
   const message =
      process.env.NODE_ENV === "production"
         ? "Internal Server Error"
         : err.message;

   res.status(statusCode).json({
      error: err.name || "Internal Server Error",
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
   });
};

module.exports = errorHandler;
