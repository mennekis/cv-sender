const form = document.getElementById("sendForm");
const status = document.getElementById("status");

form.addEventListener("submit", async (e) => {
   e.preventDefault();
   status.textContent = "";
   status.className = "";
   const checkboxes = document.querySelectorAll(
      'input[name="messengers"]:checked'
   );
   const messengers = Array.from(checkboxes).map((cb) => cb.value);

   // Валидация формы
   if (!form.subject.value.trim()) {
      status.textContent = "Please enter the subject line of your email.";
      status.className = "error";
      return;
   }
   if (!form.coverLetter.value.trim()) {
      status.textContent = "Please enter the text of the email.";
      status.className = "error";
      return;
   }
   if (!form.senderName.value.trim()) {
      status.textContent = "Please enter the sender's full name.";
      status.className = "error";
      return;
   }
   if (!form.clientEmail.value.trim()) {
      status.textContent = "Please enter the sender's email address.";
      status.className = "error";
      return;
   }
   if (!form.contactPhone.value.trim()) {
      status.textContent = "Please enter the sender's phone number.";
      status.className = "error";
      return;
   }
   if (form.resume.files.length === 0) {
      status.textContent = "Please select a PDF file.";
      status.className = "error";
      return;
   }
   if (form.emails.files.length === 0) {
      status.textContent = "Please select the email address file.";
      status.className = "error";
      return;
   }

   // Формируем FormData
   const formData = new FormData();
   formData.append("subject", form.subject.value.trim());
   formData.append("coverLetter", form.coverLetter.value.trim());
   formData.append("senderName", form.senderName.value.trim());
   formData.append("clientEmail", form.clientEmail.value.trim());
   formData.append("contactPhone", form.contactPhone.value.trim());
   formData.append("resume", form.resume.files[0]);
   formData.append("emails", form.emails.files[0]);
   formData.append("messengers", JSON.stringify(messengers));

   status.textContent = "Sending...";

   try {
      // Отправляем запрос через nginx (относительный путь)
      const response = await fetch("/api/send", {
         method: "POST",
         body: formData,
      });

      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(errorText || "Server Error. Please try again later.");
      }

      status.textContent = "✅ The newsletter has been successfully sent!";
      status.className = "success";
      form.reset();
   } catch (err) {
      status.textContent = "❌ Sending error: " + err.message;
      status.className = "error";
   }
});

window.addEventListener("error", async (event) => {
   await fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         message: event.message,
         filename: event.filename,
         lineno: event.lineno,
         colno: event.colno,
         stack: event.error?.stack,
         userAgent: navigator.userAgent,
         url: window.location.href,
         time: new Date().toISOString(),
      }),
   });
});

window.addEventListener("unhandledrejection", async (event) => {
   await fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         message: event.reason?.message || String(event.reason),
         stack: event.reason?.stack,
         userAgent: navigator.userAgent,
         url: window.location.href,
         time: new Date().toISOString(),
      }),
   });
});
