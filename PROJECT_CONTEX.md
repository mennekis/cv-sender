# Project: Email Campaign App for Seafarers

## Цель

Автоматическая рассылка резюме моряков в рекрутинговые агентства через SendGrid.

## Архитектура

-  Backend: Node.js + Express
-  Frontend: Vanilla JS или любой легковесный HTML-интерфейс
-  Email delivery: SendGrid (Essentials Plan)
-  Принимаются:
   -  CSV/Excel с базой email'ов
   -  PDF с резюме
   -  шаблон сопроводительного письма

## Особенности

-  Логгирование успешных/неуспешных писем
-  Проверка оставшегося лимита SendGrid
-  Отправка финального отчёта на email админа
-  Возможность использовать catch-all email
