# Заполнение полей для OAuth Scopes в Google Cloud Console

## Проблема
Google требует заполнить следующие поля для scopes:
- Scope justification (обоснование scope)
- Intended data usage (предполагаемое использование данных)
- Demo video (демо видео) - опционально, но рекомендуется

## Где заполнять
1. Откройте: https://console.cloud.google.com/apis/credentials/consent?project=gmail-forwarder-478218
2. Перейдите на вкладку "Scopes"
3. Для каждого scope заполните поля

## Для scope: gmail.readonly

### Scope justification (обоснование):
```
This application needs read-only access to Gmail messages to:
- Process email replies sent to campaign aliases
- Identify and forward replies to the appropriate recipients
- Track email campaign responses
```

### Intended data usage (предполагаемое использование):
```
We use Gmail read-only access to:
1. Check for unread emails sent to campaign-specific email aliases (seafarer_*@your_sendgrid_api_key)
2. Identify reply emails that need to be forwarded
3. Extract email metadata (sender, subject, date) for campaign tracking
4. Mark processed emails as read to avoid duplicate processing

We do NOT:
- Store email content on our servers
- Share email data with third parties
- Use email data for advertising or marketing purposes
- Access emails outside of campaign-related aliases
```

## Для scope: gmail.modify

### Scope justification (обоснование):
```
This application needs modify access to Gmail to:
- Mark processed emails as read to prevent duplicate processing
- Manage email labels for campaign organization
- Ensure efficient email processing workflow
```

### Intended data usage (предполагаемое использование):
```
We use Gmail modify access to:
1. Mark processed reply emails as read after forwarding
2. Apply labels to organize campaign-related emails
3. Ensure each email is processed only once

We do NOT:
- Delete any emails
- Modify email content
- Send emails on behalf of users
- Access or modify emails outside of campaign workflow
```

## Demo Video (опционально)

### Вариант 1: Пропустить (не рекомендуется)
- Можно оставить пустым, но Google может запросить позже

### Вариант 2: Создать простое видео (рекомендуется)
- Записать 2-3 минуты демонстрации работы приложения
- Показать: отправку email, получение reply, обработку
- Загрузить на YouTube (unlisted) и указать ссылку

### Вариант 3: Использовать скриншоты
- Создать GIF или короткое видео со скриншотами
- Показать основной workflow приложения

## Пошаговая инструкция

1. Откройте OAuth Consent Screen:
   https://console.cloud.google.com/apis/credentials/consent?project=gmail-forwarder-478218

2. Перейдите на вкладку "Scopes"

3. Для каждого scope (gmail.readonly и gmail.modify):
   - Нажмите "Edit" или "Add justification"
   - Заполните "Scope justification" (текст выше)
   - Заполните "Intended data usage" (текст выше)
   - Для Demo video: либо загрузите, либо оставьте пустым (может потребоваться позже)

4. Нажмите "Save"

5. Вернитесь на вкладку "Publishing status" и нажмите "PUBLISH APP"

## Важно
- Будьте конкретны в описании использования данных
- Укажите, что данные НЕ используются для рекламы
- Укажите, что данные НЕ передаются третьим лицам
- Укажите конкретные случаи использования
