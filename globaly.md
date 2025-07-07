#✉️ Email-связка через SendGrid + ImprovMX Проект использует домен
your_sendgrid_api_key для отправки и приёма служебной почты:

#📤 Отправка писем — SendGrid Отправитель: your_sendgrid_api_key можешь
динамически формировать имя отправителя, например: client23@your_sendgrid_api_key
crew.hr@your_sendgrid_api_key

И это не требует реального создания ящиков

Используется SendGrid API (/v3/mail/send)

Настроены SPF и DKIM-записи в DNS для подтверждения права отправки от имени
домена.

Отправка автоматизированных писем пользователям и администраторам.

#📥 Приём писем — ImprovMX Настроен Catch-all: все письма на \*@your_sendgrid_api_key
переадресуются на личный Gmail. (your_secret_value)

Используется только для верификации и административных уведомлений.

Бесплатный тариф ImprovMX (до 25 перенаправлений в день).

#🔐 Безопасность Все ключи (SENDGRID_API_KEY, SENDGRID_FROM, SENDGRID_TO)
хранятся в .env.

DNS-записи хранятся и управляются через Cloudflare.
