# Управление Gmail токенами

## Обзор

Система автоматически управляет Gmail API токенами, обеспечивая непрерывную
работу проверки ответов на письма.

## Автоматическое обновление токенов

### Как это работает

1. **Access Token (краткосрочный):**

   -  Срок действия: ~1 час
   -  Автоматически обновляется через refresh token
   -  Обновление происходит прозрачно для пользователя

2. **Refresh Token (долгосрочный):**
   -  Срок действия: неограничен (пока не отозван)
   -  Используется для получения новых access token
   -  Хранится в переменной окружения `GMAIL_REFRESH_TOKEN`
   -  **Стабильность:** Система автоматически поддерживает активность refresh
      token:
      -  Access token обновляется при каждой проверке email (каждые 5 минут)
      -  Проактивное обновление каждые 3 дня
      -  Это предотвращает истечение refresh token из-за неактивности

### Процесс автоматического обновления

**Проактивное обновление (предотвращение истечения):**

```
1. При каждой проверке email (каждые 5 минут) → refreshAccessToken()
2. Проактивное обновление каждые 3 дня → refreshAccessToken()
3. Это поддерживает активность refresh token и предотвращает его истечение
```

**Реактивное обновление (при ошибках):**

```
1. Операция Gmail API → Ошибка invalid_grant
2. Система обнаруживает ошибку → isTokenExpiredError()
3. Попытка обновления → refreshAccessToken()
4. Если успешно → Повтор операции
5. Если refresh token истек → Отправка уведомления администратору
```

## Обработка ошибок

### Типы ошибок

1. **Access Token истек:**

   -  Ошибка: `invalid_grant` или `invalid_token`
   -  Действие: Автоматическое обновление через refresh token
   -  Результат: Операция повторяется автоматически

2. **Refresh Token истек:**
   -  Ошибка: `invalid_grant` при попытке обновления
   -  Действие: Отправка уведомления администратору
   -  Результат: Требуется ручное обновление refresh token

### Уведомления администратора

**Получатель:** `mennekis@gmail.com`

**Когда отправляется:**

-  Refresh token истек или недействителен
-  Автоматическое обновление не удалось

**Защита от спама:**

-  Уведомления отправляются не чаще одного раза в час
-  Если уведомление уже отправлялось, следующее будет пропущено

**Содержание уведомления:**

-  Детали ошибки
-  Пошаговые инструкции по исправлению
-  Время ошибки и информация о сервере
-  Предупреждение о временной недоступности функции

## Ручное обновление Refresh Token

Если автоматическое обновление не помогло, выполните следующие шаги:

### 1. Подключитесь к VPS

```bash
ssh root@your_vps_ip
```

### 2. Перейдите в директорию backend

```bash
cd /root/sender-app/backend
```

### 3. Запустите скрипт получения токена

```bash
node get-refresh-token.js
```

Скрипт:

-  Сгенерирует URL для авторизации
-  Покажет инструкции по получению кода
-  Запросит код авторизации
-  Сохранит новый refresh token в `.env`

### 4. Обновите переменную окружения

Если скрипт не обновил `.env` автоматически:

```bash
nano .env
# Найдите GMAIL_REFRESH_TOKEN и обновите значение
```

### 5. Перезапустите контейнер

```bash
cd /root/sender-app
docker-compose restart backend
```

## Проверка работы

### Проверка логов

```bash
# На VPS
docker-compose logs --tail=50 backend | grep -i "token\|refresh"
```

### Ожидаемые сообщения

**При успешном обновлении:**

```
✅ Access token refreshed successfully
✅ Token refreshed. Retrying [operation]...
```

**При ошибке refresh token:**

```
❌ Refresh token expired or invalid
✅ Token error notification sent to mennekis@gmail.com
```

### Проверка статуса

```bash
# Проверка переменных окружения
grep GMAIL_REFRESH_TOKEN /root/sender-app/backend/.env

# Проверка работы Gmail checker
docker-compose logs backend | grep "Email checker started"
```

## Переменные окружения

### Обязательные

-  `GMAIL_CLIENT_ID` - OAuth2 Client ID из Google Cloud Console
-  `GMAIL_CLIENT_SECRET` - OAuth2 Client Secret
-  `GMAIL_REFRESH_TOKEN` - Refresh token для автоматического обновления

### Опциональные

-  `GMAIL_REDIRECT_URI` - Redirect URI (по умолчанию:
   `http://localhost:3000/api/auth/google/callback`)
-  `GMAIL_SERVICE_EMAIL` - Email адрес для Gmail API (по умолчанию:
   `your_secret_value`)
-  `ENABLE_GMAIL_REPLY_CHECKER` - Включить автоматическую проверку ответов
   (`true`/`false`)

## Настройка в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите проект
3. Перейдите в "APIs & Services" → "Credentials"
4. Создайте OAuth 2.0 Client ID (тип: Web application)
5. Добавьте Authorized redirect URIs:
   -  `http://localhost:3000/api/auth/google/callback` (для разработки)
   -  `your_secret_value` (для получения токена напрямую)
6. Скачайте credentials или скопируйте Client ID и Client Secret

## Часто задаваемые вопросы

### Q: Как часто обновляется access token?

A: Автоматически при истечении (примерно каждый час) или при ошибке
`invalid_grant`.

### Q: Что делать, если получил уведомление об ошибке токена?

A: Следуйте инструкциям в письме или разделу "Ручное обновление Refresh Token"
выше.

### Q: Можно ли отключить автоматические уведомления?

A: Нет, уведомления встроены в систему для обеспечения надежности. Однако они
отправляются не чаще одного раза в час.

### Q: Как проверить, что токен работает?

A: Проверьте логи на наличие ошибок `invalid_grant`. Если их нет, токен работает
корректно.

### Q: Что делать, если refresh token не работает?

A: Получите новый refresh token через скрипт `get-refresh-token.js` и обновите
его в `.env`.

## Дополнительная информация

-  См. `TROUBLESHOOTING.md` для решения проблем
-  См. `get-refresh-token.js` для получения нового токена
-  См. `gmailReplyService.js` для деталей реализации
