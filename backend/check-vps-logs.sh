#!/bin/bash

# Скрипт для проверки логов на VPS
# Использование: ./check-vps-logs.sh

SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"

echo "🔍 Проверка логов на VPS..."
echo "============================================================"
echo ""

# Проверка статуса контейнеров
echo "📦 Статус Docker контейнеров:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  docker-compose ps
  echo ""
EOF

echo ""
echo "============================================================"
echo "📋 Логи backend контейнера (последние 100 строк):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  docker-compose logs --tail=100 backend
  echo ""
EOF

echo ""
echo "============================================================"
echo "❌ Логи ошибок (err.log):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  if [ -f backend/logs/err.log ]; then
    tail -50 backend/logs/err.log
  else
    echo "Файл err.log не найден"
  fi
  echo ""
EOF

echo ""
echo "============================================================"
echo "📝 Логи вывода (out.log):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  if [ -f backend/logs/out.log ]; then
    tail -50 backend/logs/out.log
  else
    echo "Файл out.log не найден"
  fi
  echo ""
EOF

echo ""
echo "============================================================"
echo "📊 Объединенные логи (combined.log):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  if [ -f backend/logs/combined.log ]; then
    tail -50 backend/logs/combined.log
  else
    echo "Файл combined.log не найден"
  fi
  echo ""
EOF

echo ""
echo "============================================================"
echo "🔍 Проверка переменных окружения (.env):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  if [ -f backend/.env ]; then
    echo "ENABLE_GMAIL_REPLY_CHECKER:"
    grep ENABLE_GMAIL_REPLY_CHECKER backend/.env || echo "  не найден"
    echo ""
    echo "GMAIL_REFRESH_TOKEN:"
    if grep -q GMAIL_REFRESH_TOKEN backend/.env; then
      echo "  ✅ установлен"
    else
      echo "  ❌ не установлен"
    fi
    echo ""
    echo "GMAIL_CLIENT_ID:"
    if grep -q GMAIL_CLIENT_ID backend/.env; then
      echo "  ✅ установлен"
    else
      echo "  ❌ не установлен"
    fi
  else
    echo "Файл .env не найден"
  fi
  echo ""
EOF

echo ""
echo "============================================================"
echo "🗄️  Проверка MongoDB (количество кампаний):"
echo "============================================================"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo ""
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "db.campaigns.countDocuments()" 2>/dev/null || echo "Не удалось подключиться к MongoDB"
  echo ""
EOF

echo ""
echo "✅ Проверка завершена"

