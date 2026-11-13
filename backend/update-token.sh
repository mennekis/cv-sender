#!/bin/bash

# Скрипт для обновления Gmail refresh token на VPS
# Использование: ./update-token.sh (интерактивно или через stdin)

echo "🔐 Обновление Gmail Refresh Token"
echo "=================================="

ENV_FILE="${ENV_FILE:-/usr/src/app/.env}"
umask 077
# Prefer stdin to avoid exposing secrets in shell history and process arguments.
if [ "$#" -gt 0 ]; then
    echo "Warning: command-line tokens may be exposed in process listings." >&2
    TOKEN="$1"
elif [ -t 0 ]; then
    read -r -s -p "Gmail refresh token: " TOKEN
    printf '\n'
else
    IFS= read -r TOKEN
fi

if [ -z "$TOKEN" ] || [[ "$TOKEN" == *
    echo ""
    echo "📋 Инструкция:"
    echo "1. Запустите скрипт получения токена:"
    echo "   docker-compose exec backend node get-refresh-token.js"
    echo ""
    echo "2. Или передайте токен напрямую:"
    echo "   Run ./update-token.sh interactively or provide token via stdin."
    echo ""
    exit 1
fi

# Проверяем существование .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env файл не найден. Создаю новый..."
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
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
chmod 600 "$ENV_FILE"
unset TOKEN
echo "✅ Token value hidden (not printed to console)."
echo ""
echo "✅ Готово! Перезапустите контейнер для применения изменений:"
echo "   docker-compose restart backend"

\n'* ]] || [[ "$TOKEN" == *
    echo ""
    echo "📋 Инструкция:"
    echo "1. Запустите скрипт получения токена:"
    echo "   docker-compose exec backend node get-refresh-token.js"
    echo ""
    echo "2. Или передайте токен напрямую:"
    echo "   Run ./update-token.sh interactively or provide token via stdin."
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
echo "✅ Token value hidden (not printed to console)."
echo ""
echo "✅ Готово! Перезапустите контейнер для применения изменений:"
echo "   docker-compose restart backend"

\r'* ]]; then
    echo ""
    echo "📋 Инструкция:"
    echo "1. Запустите скрипт получения токена:"
    echo "   docker-compose exec backend node get-refresh-token.js"
    echo ""
    echo "2. Или передайте токен напрямую:"
    echo "   Run ./update-token.sh interactively or provide token via stdin."
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
echo "✅ Token value hidden (not printed to console)."
echo ""
echo "✅ Готово! Перезапустите контейнер для применения изменений:"
echo "   docker-compose restart backend"

