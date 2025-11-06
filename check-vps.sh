#!/bin/bash

# === Настройки ===
SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"

echo "🔍 Проверка состояния VPS..."
echo "================================"
echo ""

echo "📋 1. Информация о Git репозитории:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo "Текущая директория: $(pwd)"
  if [ -d ".git" ]; then
    echo "Ветка: $(git branch --show-current 2>/dev/null || git branch | grep '*' | sed 's/* //')"
    echo "Последний коммит: $(git log -1 --oneline 2>/dev/null || echo 'Не удалось получить')"
    echo "Хеш коммита: $(git rev-parse HEAD 2>/dev/null || echo 'Не удалось получить')"
  else
    echo "⚠️  Git репозиторий не найден (возможно, файлы скопированы через rsync)"
  fi
EOF

echo ""
echo "🐳 2. Статус Docker контейнеров:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  docker-compose ps 2>/dev/null || docker ps --filter "name=sender" 2>/dev/null || echo "Docker не запущен или контейнеры не найдены"
EOF

echo ""
echo "📁 3. Структура файлов на сервере:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  echo "Содержимое директории:"
  ls -la 2>/dev/null | head -20 || echo "Директория не найдена"
EOF

echo ""
echo "🔐 4. Переменные окружения (без значений):"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  if [ -f "backend/.env" ]; then
    echo "Переменные в backend/.env:"
    grep -E "^[A-Z_]+=" backend/.env 2>/dev/null | cut -d'=' -f1 | sort || echo "Файл .env не найден или пуст"
  else
    echo "⚠️  Файл backend/.env не найден"
  fi
EOF

echo ""
echo "📊 5. Логи последних запусков:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  if [ -d "backend/logs" ]; then
    echo "Последние логи:"
    ls -lth backend/logs/*.log 2>/dev/null | head -5 || echo "Логи не найдены"
  else
    echo "Директория логов не найдена"
  fi
EOF

echo ""
echo "🌐 6. Проверка доступности сервисов:"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  echo "Проверка портов:"
  netstat -tuln | grep -E ":(80|3000|8080)" || ss -tuln | grep -E ":(80|3000|8080)" || echo "Не удалось проверить порты"
EOF

echo ""
echo "✅ Проверка завершена"

