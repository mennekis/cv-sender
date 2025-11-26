#!/bin/bash

# Скрипт для обновления Gmail refresh token на VPS
# Использование: ./update-token.sh [refresh_token]

echo "🔐 Обновление Gmail Refresh Token"
echo "=================================="

ENV_FILE="/usr/src/app/.env"
TOKEN="${1}"

if [ -z "$TOKEN" ]; then
    echo ""
    echo "📋 Инструкция:"
    echo "1. Запустите скрипт получения токена:"
    echo "   docker-compose exec backend node get-refresh-token.js"
    echo ""
    echo "2. Или передайте токен напрямую:"
    echo "   docker-compose exec backend ./update-token.sh YOUR_REFRESH_TOKEN"
    echo ""
    exit 1
fi

# Проверяем существование .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env файл не найден. Создаю новый..."
    touch "$ENV_FILE"
fi

# Обновляем или добавляем GMAIL_REFRESH_TOKEN
if grep -q "^GMAIL_REFRESH_TOKEN=" "$ENV_FILE"; then
    # Обновляем существующую переменную
    sed -i "s|^GMAIL_REFRESH_TOKEN=.*|GMAIL_REFRESH_TOKEN=${TOKEN}|" "$ENV_FILE"
    echo "✅ GMAIL_REFRESH_TOKEN обновлен в .env"
else
    # Добавляем новую переменную
    echo "GMAIL_REFRESH_TOKEN=${TOKEN}" >> "$ENV_FILE"
    echo "✅ GMAIL_REFRESH_TOKEN добавлен в .env"
fi

echo ""
echo "📋 Текущее значение:"
grep "^GMAIL_REFRESH_TOKEN=" "$ENV_FILE"
echo ""
echo "✅ Готово! Перезапустите контейнер для применения изменений:"
echo "   docker-compose restart backend"

