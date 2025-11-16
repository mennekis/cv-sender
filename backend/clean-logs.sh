#!/bin/bash

# Скрипт для очистки старых логов на сервере
# Использование: ./clean-logs.sh [days]
# По умолчанию удаляет логи старше 7 дней

DAYS=${1:-7}
LOG_DIR="/root/sender-app/backend/logs"

echo "🧹 Очистка логов старше $DAYS дней в $LOG_DIR"

if [ ! -d "$LOG_DIR" ]; then
   echo "❌ Директория логов не найдена: $LOG_DIR"
   exit 1
fi

# Находим и удаляем старые логи
find "$LOG_DIR" -name "*.log" -type f -mtime +$DAYS -delete

echo "✅ Очистка завершена"

# Показываем размер оставшихся логов
echo ""
echo "📊 Размер оставшихся логов:"
du -sh "$LOG_DIR"/*.log 2>/dev/null || echo "Логи не найдены"

