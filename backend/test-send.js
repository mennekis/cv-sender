require("dotenv").config();

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

const payload = {
   personalizations: [
      {
         to: [{ email: process.env.SENDGRID_TO }],
         subject: "🚢 Test email from Seafarer CV",
      },
   ],
   from: {
      email: process.env.SENDGRID_FROM,
      name: "Seafarer CV",
   },
   content: [
      {
         type: "text/plain",
         value: `Здравствуйте!

Во вложении — резюме моряка для рассмотрения в вашу компанию.

Если вы не хотите получать такие письма, просто ответьте на это письмо или напишите на unsubscribe@your_sendgrid_api_key`,
      },
      {
         type: "text/html",
         value: `
      <p>Здравствуйте!</p>
      <p>Во вложении — резюме моряка для рассмотрения в вашу компанию.</p>
      <p style="color:#888;font-size:12px;">
        Если вы не хотите получать такие письма, просто ответьте на это письмо или напишите на <a href="mailto:unsubscribe@your_sendgrid_api_key">unsubscribe@your_sendgrid_api_key</a>
      </p>
    `,
      },
   ],
};

fetch(SENDGRID_API, {
   method: "POST",
   headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
   },
   body: JSON.stringify(payload),
})
   .then((res) => {
      if (!res.ok) {
         return res.text().then((err) => {
            throw new Error(`SendGrid Error: ${res.status} ${err}`);
         });
      }
      console.log("✅ Email sent successfully!" + process.env.SENDGRID_TO);
   })
   .catch((err) => {
      console.error("❌ Failed to send email:", err.message);
   });
