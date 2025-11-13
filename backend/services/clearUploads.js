const fs = require("fs");
const path = require("path");

/**
 * Очищает директорию uploads от всех файлов
 * Обрабатывает ошибки при удалении файлов
 */
const clearUploads = () => {
   const uploadDir = path.join(__dirname, "../uploads");

   if (!fs.existsSync(uploadDir)) {
      return;
   }

   try {
      const files = fs.readdirSync(uploadDir);

      files.forEach((file) => {
         const filePath = path.join(uploadDir, file);
         try {
            fs.unlinkSync(filePath);
         } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err.message);
         }
      });
   } catch (err) {
      console.error("Error reading uploads directory:", err.message);
   }
};

module.exports = clearUploads;
