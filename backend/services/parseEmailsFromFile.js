const fs = require("fs");
const path = require("path");
const csvParse = require("csv-parse/sync");
const xlsx = require("xlsx");

function isValidEmail(email) {
   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmailsFromFile(filePath, originalName) {
   const extens = path.extname(originalName).toLowerCase();

   let emails = [];

   if (extens === ".csv") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const records = csvParse.parse(fileContent, {
         columns: false,
         skip_empty_lines: true,
      });
      emails = records.map((row) => row[0]);
   } else if (extens === ".xls" || extens === ".xlsx") {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
         header: 1,
      });
      emails = data.map((row) => row[0]);
   } else {
      throw new Error("File format not supported: " + extens);
   }

   // Очистка, приведение к нижнему регистру, удаление пустых и невалидных
   const cleanedEmails = emails
      .filter(Boolean)
      .map((e) => String(e).trim().toLowerCase())
      .filter(isValidEmail);

   // Убираем дубли
   return [...new Set(cleanedEmails)];
}

module.exports = parseEmailsFromFile;
