#!/bin/bash

# === Настройки ===
SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"
LOCAL_PATH="./"

echo "📤 Копируем файлы на сервер (без node_modules)..."

rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "package-lock.json" \
  --exclude "deploy.sh" \
  $LOCAL_PATH ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}

echo "✅ Файлы скопированы."

echo "🔁 Перезапускаем Docker Compose на сервере..."

ssh ${SERVER_USER}@${SERVER_HOST} << EOF
  cd ${REMOTE_PATH}
  docker-compose down
  docker-compose up -d --build
  echo "✅ Контейнеры перезапущены."
EOF
