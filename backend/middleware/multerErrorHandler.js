/**
 * Middleware для обработки ошибок Multer
 * Централизованная обработка ошибок загрузки файлов
 */

const constants = require("../config/constants");

const multerErrorHandler = (err, req, res, next) => {
   if (err) {
      // Ошибки Multer
      if (err.code === "LIMIT_FILE_SIZE") {
         return res.status(400).json({
            error: "File Too Large",
            message: `File size exceeds the maximum allowed size of ${
               constants.FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024
            }MB`,
         });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
         return res.status(400).json({
            error: "Too Many Files",
            message: `Maximum ${constants.FILE_LIMITS.MAX_FILES} files allowed`,
         });
      }

      if (err.code === "LIMIT_UNEXPECTED_FILE") {
         return res.status(400).json({
            error: "Unexpected File",
            message: `Unexpected file field: ${err.field}`,
         });
      }

      if (err.code === "LIMIT_PART_COUNT") {
         return res.status(400).json({
            error: "Too Many Parts",
            message: "Too many parts in the multipart request",
         });
      }

      if (err.code === "LIMIT_FIELD_KEY") {
         return res.status(400).json({
            error: "Field Name Too Long",
            message: "Field name is too long",
         });
      }

      if (err.code === "LIMIT_FIELD_VALUE") {
         return res.status(400).json({
            error: "Field Value Too Long",
            message: "Field value is too long",
         });
      }

      if (err.code === "LIMIT_FIELD_COUNT") {
         return res.status(400).json({
            error: "Too Many Fields",
            message: "Too many fields in the form",
         });
      }

      // Общие ошибки Multer
      return res.status(400).json({
         error: "File Upload Error",
         message: err.message || "An error occurred while uploading files",
      });
   }

   next();
};

module.exports = multerErrorHandler;
