#!/bin/bash

# Быстрое обновление Gmail токена на VPS
# Использование: ./update-gmail-token-quick.sh

echo "🔐 Быстрое обновление Gmail Refresh Token"
echo "=========================================="
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "get-refresh-token.js" ]; then
    echo "❌ Ошибка: get-refresh-token.js не найден"
    echo "   Перейдите в директорию /root/sender-app/backend"
    exit 1
fi

echo "📋 Текущие настройки:"
echo "   Client ID: your_token_value '^GMAIL_CLIENT_ID=' .env | sed 's/GMAIL_CLIENT_ID=\(.\{30\}\).*/GMAIL_CLIENT_ID=\1.../')"
echo ""

# Копируем файл в контейнер если нужно
if docker-compose ps backend > /dev/null 2>&1; then
    echo "📦 Копирую get-refresh-token.js в контейнер..."
    docker cp get-refresh-token.js $(docker-compose ps -q backend):/usr/src/app/get-refresh-token.js
    echo "✅ Файл скопирован"
    echo ""
fi

echo "🚀 Запускаю скрипт получения токена..."
echo "   (Следуйте инструкциям скрипта)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Запускаем скрипт
if docker-compose ps backend > /dev/null 2>&1; then
    docker-compose exec backend node get-refresh-token.js
else
    node get-refresh-token.js
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Синхронизируем .env из контейнера на хост (если токен был обновлен в контейнере)
echo ""
echo "🔄 Синхронизирую .env из контейнера на хост..."
if docker-compose ps backend > /dev/null 2>&1; then
    CONTAINER_ID=$(docker-compose ps -q backend)
    if [ -n "$CONTAINER_ID" ]; then
        # Копируем .env из контейнера
        docker cp ${CONTAINER_ID}:/usr/src/app/.env /tmp/container_env.txt 2>/dev/null
        if [ -f /tmp/container_env.txt ]; then
            # Проверяем, есть ли новый токен в контейнере
            CONTAINER_TOKEN=your_token_value '^GMAIL_REFRESH_TOKEN=' /tmp/container_env.txt | head -1 | cut -d'=' -f2-)
            HOST_TOKEN=your_token_value '^GMAIL_REFRESH_TOKEN=' .env | head -1 | cut -d'=' -f2-)
            
            if [ -n "$CONTAINER_TOKEN" ] && [ "$CONTAINER_TOKEN" != "$HOST_TOKEN" ]; then
                echo "✅ Найден новый токен в контейнере, синхронизирую на хост..."
                sed -i "s|^GMAIL_REFRESH_TOKEN=.*|GMAIL_REFRESH_TOKEN=${CONTAINER_TOKEN}|" .env
                echo "✅ .env на хосте обновлен"
            fi
            rm -f /tmp/container_env.txt
        fi
    fi
fi

# Проверяем, обновился ли токен
if grep -q "^GMAIL_REFRESH_TOKEN=" .env; then
    echo "✅ Токен обновлен в .env"
    echo ""
    echo "🔄 Перезапускаю backend для применения изменений..."
    cd ..
    docker-compose restart backend
    sleep 5
    echo ""
    echo "📋 Проверяю логи..."
    docker-compose logs --tail=25 backend | grep -E "Gmail|Token|✅|❌|mismatch|unauthorized|deleted" | tail -10 || echo "   (нет совпадений в последних 25 строках)"
    echo ""
    echo "✅ Готово! Система автоматически подхватит новый токен."
    echo "   Если в логах есть ошибки, проверьте, что Client ID/Secret правильные."
else
    echo "⚠️  Токен не был обновлен. Проверьте .env файл вручную."
fi

echo ""

