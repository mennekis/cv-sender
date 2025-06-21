require("dotenv").config();
const app = require("./app");
const { sendEmail } = require("./services/sendgridService");

process.on("uncaughtException", async (err) => {
   try {
      await sendEmail({
         to: process.env.ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM,
         subject: "Node.js uncaughtException",
         text: err.stack || err.message,
      });
   } catch (e) {
      console.error("Ошибка отправки письма об uncaughtException:", e.message);
   }
   process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
   try {
      await sendEmail({
         to: process.env.ADMIN_EMAIL,
         from: process.env.SENDGRID_FROM,
         subject: "Node.js unhandledRejection",
         text: reason?.stack || String(reason),
      });
   } catch (e) {
      console.error("Ошибка отправки письма об unhandledRejection:", e.message);
   }
   process.exit(1);
});

const PORT = process.env.PORT || 3000;

// console.log(process.env.ADMIN_EMAIL + " admin email");

app.listen(PORT, () => {
   console.log(`Server started on port ${PORT}`);
});
