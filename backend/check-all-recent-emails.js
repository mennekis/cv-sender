/**
 * Скрипт для проверки всех недавних писем
 */

require("dotenv").config();
const { google } = require("googleapis");

async function checkAllRecentEmails() {
   const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
   );
   oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
   });
   const { credentials } = await oauth2Client.refreshAccessToken();
   oauth2Client.setCredentials(credentials);
   const gmail = google.gmail({ version: "v1", auth: oauth2Client });

   // Ищем все письма за последние 24 часа
   const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
   const query = `after:${Math.floor(oneDayAgo.getTime() / 1000)}`;

   console.log("Поиск всех писем за последние 24 часа...");
   console.log(`Query: ${query}`);
   console.log();

   const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
   });

   const messages = response.data.messages || [];
   console.log(`Найдено писем: ${messages.length}`);
   console.log();

   for (const msg of messages.slice(0, 10)) {
      const m = await gmail.users.messages.get({
         userId: "me",
         id: msg.id,
         format: "metadata",
         metadataHeaders: ["To", "From", "Subject", "Date"],
      });
      const to = m.data.payload.headers.find((h) => h.name === "To")?.value;
      const from = m.data.payload.headers.find((h) => h.name === "From")?.value;
      const subject = m.data.payload.headers.find(
         (h) => h.name === "Subject"
      )?.value;
      const date = m.data.payload.headers.find((h) => h.name === "Date")?.value;
      const labels = m.data.labelIds || [];
      const isUnread = !labels.includes("UNREAD");

      if (to && to.includes("seafarer_")) {
         console.log("---");
         console.log("ID:", msg.id);
         console.log("To:", to);
         console.log("From:", from);
         console.log("Subject:", subject);
         console.log("Date:", date);
         console.log("Status:", isUnread ? "Непрочитано" : "Прочитано");
         console.log();
      }
   }
}

checkAllRecentEmails().catch(console.error);
