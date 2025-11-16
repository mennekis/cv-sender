#!/bin/bash

# Упрощенный скрипт для проверки логов на VPS
# Использование: ./check-vps-logs-simple.sh

SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"

echo "🔍 Проверка логов на VPS (your_vps_ip)..."
echo ""

# Команды для выполнения на сервере
COMMANDS="
echo '=== Статус контейнеров ==='
cd $REMOTE_PATH && docker-compose ps
echo ''
echo '=== Последние 100 строк логов backend ==='
cd $REMOTE_PATH && docker-compose logs --tail=100 backend 2>&1 | grep -E '(Gmail|email|checker|alias|ERROR|WARN|✅|❌|📧|📬)' || docker-compose logs --tail=100 backend
echo ''
echo '=== Проверка ENABLE_GMAIL_REPLY_CHECKER ==='
cd $REMOTE_PATH && grep ENABLE_GMAIL_REPLY_CHECKER backend/.env 2>/dev/null || echo 'ENABLE_GMAIL_REPLY_CHECKER не найден в .env'
echo ''
echo '=== Проверка GMAIL_REFRESH_TOKEN ==='
cd $REMOTE_PATH && if grep -q GMAIL_REFRESH_TOKEN backend/.env 2>/dev/null; then echo 'GMAIL_REFRESH_TOKEN: ✅ установлен'; else echo 'GMAIL_REFRESH_TOKEN: ❌ не установлен'; fi
"

ssh ${SERVER_USER}@${SERVER_HOST} "$COMMANDS"

