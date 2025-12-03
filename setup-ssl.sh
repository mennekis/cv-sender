#!/bin/bash

# Скрипт для настройки SSL сертификатов через Let's Encrypt
# Запускать на VPS с правами root

DOMAIN="sender.your_sendgrid_api_key"
EMAIL="admin@your_sendgrid_api_key"  # Замените на ваш email для уведомлений Let's Encrypt

echo "🔐 Настройка SSL сертификатов для $DOMAIN"

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Пожалуйста, запустите скрипт с правами root (sudo)"
   exit 1
fi

# Проверка установки certbot
if ! command -v certbot &> /dev/null; then
   echo "📦 Устанавливаем certbot..."
   apt-get update
   apt-get install -y certbot
fi

# Проверка, что домен резолвится на этот сервер
echo "🔍 Проверяем DNS резолвинг для $DOMAIN..."

# Получаем IP домена
if command -v dig &> /dev/null; then
   DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
elif command -v nslookup &> /dev/null; then
   DOMAIN_IP=$(nslookup $DOMAIN | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | tail -n1)
else
   echo "⚠️  Не найдены команды dig/nslookup, пропускаем проверку DNS"
   DOMAIN_IP=""
fi

# Получаем IP сервера
if command -v curl &> /dev/null; then
   SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
elif command -v wget &> /dev/null; then
   SERVER_IP=$(wget -qO- ifconfig.me 2>/dev/null || echo "")
else
   echo "⚠️  Не найдены curl/wget, пропускаем проверку IP сервера"
   SERVER_IP=""
fi

if [ -n "$DOMAIN_IP" ] && [ -n "$SERVER_IP" ] && [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
   echo "⚠️  Внимание: IP домена ($DOMAIN_IP) не совпадает с IP сервера ($SERVER_IP)"
   echo "   Убедитесь, что DNS запись настроена правильно в Cloudflare"
   read -p "Продолжить? (y/n) " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
   fi
fi

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null; then
   echo "❌ docker-compose не найден. Установите docker-compose."
   exit 1
fi

# Останавливаем nginx контейнер временно для получения сертификата
echo "⏸️  Останавливаем nginx контейнер..."
cd /root/sender-app || { echo "❌ Не удалось перейти в /root/sender-app"; exit 1; }
docker-compose stop nginx

# Получаем сертификат через standalone режим
echo "📜 Получаем SSL сертификат от Let's Encrypt..."
certbot certonly --standalone \
   --non-interactive \
   --agree-tos \
   --email "$EMAIL" \
   -d "$DOMAIN"

if [ $? -eq 0 ]; then
   echo "✅ Сертификат успешно получен!"
   
   # Проверяем наличие сертификатов
   if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && \
      [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
      echo "✅ Сертификаты найдены в /etc/letsencrypt/live/$DOMAIN/"
      
      # Настраиваем автообновление сертификатов
      echo "🔄 Настраиваем автообновление сертификатов..."
      
      # Создаем скрипт для обновления сертификатов
      cat > /etc/cron.monthly/renew-sender-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet --post-hook "cd /root/sender-app && docker-compose restart nginx"
EOF
      chmod +x /etc/cron.monthly/renew-sender-ssl.sh
      
      echo "✅ Автообновление настроено (ежемесячно через cron)"
      
      # Запускаем nginx обратно
      echo "▶️  Запускаем nginx контейнер..."
      docker-compose up -d nginx
      
      echo ""
      echo "✅ SSL настроен успешно!"
      echo "🌐 Проверьте доступность: https://$DOMAIN"
      echo ""
      echo "📝 Важно:"
      echo "   - Сертификаты будут автоматически обновляться каждый месяц"
      echo "   - Убедитесь, что порты 80 и 443 открыты в firewall"
   else
      echo "❌ Ошибка: сертификаты не найдены"
      exit 1
   fi
else
   echo "❌ Ошибка при получении сертификата"
   echo "▶️  Запускаем nginx контейнер обратно..."
   docker-compose up -d nginx
   exit 1
fi

