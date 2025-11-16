# Настройка Cron-задачи для обработки писем

## Описание

Cron-задача запускается каждый час и обрабатывает все письма за последние 24
часа (включая прочитанные). Это резервный механизм для обработки писем, которые
могли быть пропущены автоматическим checker'ом.

## Автоматическая настройка (рекомендуется)

### На VPS:

1. Подключитесь к серверу:

   ```bash
   ssh root@your_vps_ip
   ```

2. Перейдите в директорию проекта:

   ```bash
   cd /root/sender-app/backend
   ```

3. Запустите скрипт настройки:
   ```bash
   chmod +x setup-cron.sh
   ./setup-cron.sh
   ```

## Ручная настройка

### 1. Создайте cron-задачу

Подключитесь к серверу и откройте crontab:

```bash
ssh root@your_vps_ip
crontab -e
```

### 2. Добавьте строку

Добавьте следующую строку для запуска каждый час:

```bash
0 * * * * cd /root/sender-app && docker-compose exec -T backend node process-all-emails-cron.js >> /root/sender-app/backend/logs/cron.log 2>&1
```

Или для запуска каждые 30 минут:

```bash
*/30 * * * * cd /root/sender-app && docker-compose exec -T backend node process-all-emails-cron.js >> /root/sender-app/backend/logs/cron.log 2>&1
```

Или для запуска каждые 15 минут:

```bash
*/15 * * * * cd /root/sender-app && docker-compose exec -T backend node process-all-emails-cron.js >> /root/sender-app/backend/logs/cron.log 2>&1
```

### 3. Сохраните и выйдите

-  В `nano`: `Ctrl+X`, затем `Y`, затем `Enter`
-  В `vi`: `:wq`

## Проверка работы

### Просмотр логов cron:

```bash
# Последние 50 строк
tail -50 /root/sender-app/backend/logs/cron.log

# В реальном времени
tail -f /root/sender-app/backend/logs/cron.log
```

### Проверка cron-задач:

```bash
# Показать все cron-задачи
crontab -l

# Проверка системных логов cron
grep CRON /var/log/syslog | tail -20
```

### Ручной запуск для тестирования:

```bash
cd /root/sender-app
docker-compose exec -T backend node process-all-emails-cron.js
```

## Удаление cron-задачи

```bash
# Открыть crontab
crontab -e

# Удалить строку с process-all-emails-cron.js
# Сохранить и выйти
```

Или удалить все задачи:

```bash
crontab -r
```

## Расписание cron

Формат: `минута час день месяц день_недели`

Примеры:

-  `0 * * * *` - каждый час в 0 минут
-  `*/30 * * * *` - каждые 30 минут
-  `*/15 * * * *` - каждые 15 минут
-  `0 */2 * * *` - каждые 2 часа
-  `0 9,17 * * *` - в 9:00 и 17:00 каждый день

## Защита от дубликатов

Скрипт использует MongoDB коллекцию `processed_emails` для отслеживания уже
обработанных писем. Письма автоматически удаляются из этой коллекции через 24
часа.

## Мониторинг

Рекомендуется периодически проверять логи:

```bash
# Проверка последних запусков
tail -100 /root/sender-app/backend/logs/cron.log | grep -E "(✅|❌|Обработано)"
```

## Улучшения автоматического checker'а

Автоматический checker теперь также:

1. Проверяет непрочитанные письма (каждые 5 минут)
2. Проверяет прочитанные письма за последний час (каждые 5 минут)
3. Использует защиту от дубликатов через MongoDB

Cron-задача является дополнительным уровнем защиты для обработки писем, которые
могли быть пропущены.
