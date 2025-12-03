# 🔐 Настройка HTTPS для поддомена sender.your_sendgrid_api_key

## Предварительные требования

1. ✅ DNS запись типа A для `sender.your_sendgrid_api_key` настроена в Cloudflare
2. ✅ DNS указывает на IP VPS: `your_vps_ip`
3. ✅ Порты 80 и 443 открыты в firewall на VPS

## Шаги настройки

### 1. Деплой обновленной конфигурации

Сначала задеплойте обновленные файлы на VPS:

```bash
cd cv-sender
./deploy.sh
```

### 2. Получение SSL сертификатов

Подключитесь к VPS и запустите скрипт настройки SSL:

```bash
ssh root@your_vps_ip
cd /root/sender-app
chmod +x setup-ssl.sh
./setup-ssl.sh
```

Скрипт автоматически:

-  Установит certbot (если не установлен)
-  Проверит DNS резолвинг
-  Остановит nginx контейнер
-  Получит SSL сертификат от Let's Encrypt
-  Настроит автообновление сертификатов
-  Запустит nginx обратно

### 3. Проверка работоспособности

После выполнения скрипта проверьте:

```bash
# Проверка HTTPS
curl -I https://sender.your_sendgrid_api_key

# Проверка редиректа HTTP -> HTTPS
curl -I http://sender.your_sendgrid_api_key
```

Должен быть редирект 301 с HTTP на HTTPS.

### 4. Проверка в браузере

Откройте в браузере:

-  `https://sender.your_sendgrid_api_key` - должен открыться с зеленым замочком
-  `http://sender.your_sendgrid_api_key` - должен автоматически перенаправить на HTTPS

## Структура конфигурации

### Nginx конфигурация

-  **HTTP сервер (порт 8080 → 80)**: Редиректит все запросы на HTTPS
-  **HTTPS сервер (порт 8443 → 443)**: Основной сервер с SSL
   -  Раздает фронтенд из `/usr/share/nginx/html`
   -  Проксирует `/api/*` на backend:3000
   -  Включает security headers (HSTS, X-Frame-Options и т.д.)

### Docker Compose

-  Порт 80 → 8080 (HTTP)
-  Порт 443 → 8443 (HTTPS)
-  Монтирует SSL сертификаты из `/etc/letsencrypt/live/sender.your_sendgrid_api_key/`

## Автообновление сертификатов

Сертификаты Let's Encrypt действительны 90 дней. Скрипт настраивает
автоматическое обновление через cron:

-  Скрипт: `/etc/cron.monthly/renew-sender-ssl.sh`
-  Запускается каждый месяц
-  Автоматически перезапускает nginx после обновления

## Устранение проблем

### Ошибка: "Domain does not point to this server"

Убедитесь, что:

1. DNS запись в Cloudflare настроена правильно
2. DNS уже распространился (может занять до 5 минут)
3. Проверьте: `dig sender.your_sendgrid_api_key` должен вернуть IP `your_vps_ip`

### Ошибка: "Port 80 is already in use"

Остановите nginx контейнер перед получением сертификата:

```bash
cd /root/sender-app
docker-compose stop nginx
```

### Ошибка: "Permission denied" при монтировании сертификатов

Убедитесь, что путь `/etc/letsencrypt/live/sender.your_sendgrid_api_key/` существует и
доступен:

```bash
ls -la /etc/letsencrypt/live/sender.your_sendgrid_api_key/
```

### Сертификат не обновляется автоматически

Проверьте cron задачу:

```bash
ls -la /etc/cron.monthly/renew-sender-ssl.sh
cat /etc/cron.monthly/renew-sender-ssl.sh
```

## Ручное обновление сертификата

Если нужно обновить сертификат вручную:

```bash
ssh root@your_vps_ip
cd /root/sender-app
docker-compose stop nginx
certbot renew
docker-compose up -d nginx
```

## Проверка статуса сертификата

```bash
certbot certificates
```

Покажет информацию о всех сертификатах, включая дату истечения.
