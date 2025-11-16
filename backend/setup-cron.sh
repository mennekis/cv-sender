#!/bin/bash

# Скрипт для настройки cron-задачи на VPS
# Использование: ./setup-cron.sh

echo "🔧 Настройка cron-задачи для обработки писем"
echo "============================================================"
echo ""

# Путь к скрипту на сервере
CRON_SCRIPT="/root/sender-app/backend/process-all-emails-cron.js"
CRON_LOG="/root/sender-app/backend/logs/cron.log"

# Создаем cron-задачу (каждый час)
CRON_JOB="0 * * * * cd /root/sender-app && docker-compose exec -T backend node process-all-emails-cron.js >> $CRON_LOG 2>&1"

echo "📋 Cron-задача будет запускаться каждый час"
echo "   Команда: $CRON_JOB"
echo ""
echo "📝 Логи будут сохраняться в: $CRON_LOG"
echo ""

# Проверяем, существует ли уже такая задача
if crontab -l 2>/dev/null | grep -q "process-all-emails-cron.js"; then
   echo "⚠️  Cron-задача уже существует"
   echo ""
   echo "Текущие cron-задачи:"
   crontab -l | grep "process-all-emails-cron"
   echo ""
   read -p "Заменить существующую задачу? (y/n): " -n 1 -r
   echo ""
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Отменено"
      exit 0
   fi
   # Удаляем старую задачу
   crontab -l 2>/dev/null | grep -v "process-all-emails-cron.js" | crontab -
fi

# Добавляем новую задачу
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron-задача добавлена!"
echo ""
echo "📋 Текущие cron-задачи:"
crontab -l
echo ""
echo "💡 Для проверки логов выполните:"
echo "   tail -f $CRON_LOG"
echo ""

