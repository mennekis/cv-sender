# 🚀 Быстрая настройка HTTPS

## Что уже готово ✅

1. ✅ Nginx настроен для HTTPS с редиректом HTTP → HTTPS
2. ✅ Docker Compose настроен для порта 443
3. ✅ Скрипт автоматической настройки SSL создан
4. ✅ DNS запись `sender.your_sendgrid_api_key` → `your_vps_ip` настроена в
   Cloudflare

## Что нужно сделать на VPS

### Шаг 1: Деплой обновленной конфигурации

```bash
cd cv-sender
./deploy.sh
```

### Шаг 2: Настройка SSL сертификатов

Подключитесь к VPS и запустите:

```bash
ssh root@your_vps_ip
cd /root/sender-app
chmod +x setup-ssl.sh
./setup-ssl.sh
```

Скрипт автоматически:

-  Установит certbot
-  Получит SSL сертификат от Let's Encrypt
-  Настроит автообновление
-  Перезапустит nginx

### Шаг 3: Проверка

Откройте в браузере: `https://sender.your_sendgrid_api_key`

Должен открыться сайт с зеленым замочком 🔒

## Важно ⚠️

-  Убедитесь, что порты **80** и **443** открыты в firewall на VPS
-  DNS запись должна быть настроена в Cloudflare с **Proxy status: DNS only**
   (серое облачко)
-  После настройки SSL, HTTP запросы автоматически перенаправляются на HTTPS

## Подробная документация

См. `SSL_SETUP.md` для детальной информации и решения проблем.
