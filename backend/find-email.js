require("dotenv").config();
const { google } = require("googleapis");

async function findEmail() {
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

   // Ищем письма от отправителя за последние 2 часа
   const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);
   const response = await gmail.users.messages.list({
      userId: "me",
      q: `from:alexey.nikolayenko.82@gmail.com after:${twoHoursAgo}`,
      maxResults: 10,
   });

   console.log("Найдено писем:", response.data.messages?.length || 0);
   console.log();

   if (response.data.messages) {
      for (const msg of response.data.messages.slice(0, 5)) {
         const m = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["To", "From", "Subject", "Date"],
         });
         const to = m.data.payload.headers.find((h) => h.name === "To")?.value;
         const from = m.data.payload.headers.find(
            (h) => h.name === "From"
         )?.value;
         const subject = m.data.payload.headers.find(
            (h) => h.name === "Subject"
         )?.value;
         const date = m.data.payload.headers.find(
            (h) => h.name === "Date"
         )?.value;
         const labels = m.data.labelIds || [];
         const isUnread = !labels.includes("UNREAD");

         console.log("---");
         console.log("ID:", msg.id);
         console.log("To:", to);
         console.log("From:", from);
         console.log("Subject:", subject);
         console.log("Date:", date);
         console.log("Status:", isUnread ? "Прочитано" : "Непрочитано");
         console.log();
      }
   }
}

findEmail().catch(console.error);
