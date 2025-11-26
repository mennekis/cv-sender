#!/bin/bash

# Скрипт для проверки статуса всех рассылок на VPS
# Определяет, можно ли безопасно делать деплой

SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"

echo "🔍 Проверка статуса всех рассылок на VPS..."
echo "============================================================"
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  
  echo "📊 Общая статистика по статусам:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const total = db.campaigns.countDocuments();
    const completed = db.campaigns.countDocuments({ status: 'completed' });
    const pending = db.campaigns.countDocuments({ status: 'pending' });
    const sending = db.campaigns.countDocuments({ status: 'sending' });
    
    print('Всего кампаний: ' + total);
    print('✅ Завершено (completed): ' + completed);
    print('⏳ Ожидают отправки (pending): ' + pending);
    print('📤 В процессе отправки (sending): ' + sending);
  " 2>/dev/null || echo "❌ Не удалось подключиться к MongoDB"
  echo ""
  
  echo "⚠️  Проверка незавершенных рассылок:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const activeCampaigns = db.campaigns.find({
      status: { \$in: ['pending', 'sending'] }
    }).sort({ createdAt: -1 }).toArray();
    
    if (activeCampaigns.length === 0) {
      print('✅ Все рассылки завершены!');
    } else {
      print('Найдено незавершенных кампаний: ' + activeCampaigns.length);
      activeCampaigns.forEach((campaign, index) => {
        const statusIcon = campaign.status === 'sending' ? '📤' : '⏳';
        print((index + 1) + '. ' + statusIcon + ' ' + campaign.clientName + ' (' + campaign.alias + ')');
        print('   Статус: ' + campaign.status);
        print('   Получателей: ' + (campaign.recipientsCount || 0) + ' | Успешно: ' + (campaign.successCount || 0) + ' | Ошибок: ' + (campaign.errorCount || 0));
        print('   Создано: ' + campaign.createdAt.toISOString());
      });
    }
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "🔴 Проверка зависших рассылок (в статусе 'sending'):"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const stuckCampaigns = db.campaigns.find({
      status: 'sending'
    }).sort({ createdAt: -1 }).toArray();
    
    if (stuckCampaigns.length > 0) {
      print('Найдено кампаний в статусе sending: ' + stuckCampaigns.length);
      stuckCampaigns.forEach((campaign, index) => {
        const now = new Date();
        const hoursAgo = Math.floor((now - campaign.createdAt) / (1000 * 60 * 60));
        print((index + 1) + '. ' + campaign.clientName + ' (' + campaign.alias + ')');
        print('   В статусе sending уже ' + hoursAgo + ' часов');
        print('   Создано: ' + campaign.createdAt.toISOString());
      });
      print('💡 Рекомендация: Проверьте логи и процессы. Возможно, рассылка зависла.');
    } else {
      print('✅ Зависших рассылок не найдено');
    }
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "============================================================"
  echo "🎯 РЕКОМЕНДАЦИЯ ПО ДЕПЛОЮ:"
  echo "============================================================"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const pending = db.campaigns.countDocuments({ status: 'pending' });
    const sending = db.campaigns.countDocuments({ status: 'sending' });
    const activeCount = pending + sending;
    
    if (activeCount === 0) {
      print('✅ ВСЕ РАССЫЛКИ ЗАВЕРШЕНЫ');
      print('✅ Можно безопасно делать деплой на VPS');
    } else {
      print('⚠️  ОБНАРУЖЕНЫ АКТИВНЫЕ РАССЫЛКИ');
      print('   Найдено ' + activeCount + ' незавершенных кампаний:');
      print('   - ' + pending + ' в статусе pending (ожидают отправки)');
      print('   - ' + sending + ' в статусе sending (в процессе отправки)');
      print('');
      print('❌ НЕ РЕКОМЕНДУЕТСЯ делать деплой сейчас');
      print('   Дождитесь завершения всех рассылок или проверьте их статус');
    }
  " 2>/dev/null || echo "❌ Не удалось получить рекомендацию"
  echo ""
  
  echo "📋 Последние 5 кампаний:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const recentCampaigns = db.campaigns.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    recentCampaigns.forEach((campaign, index) => {
      const statusIcon = campaign.status === 'completed' ? '✅' : 
                        campaign.status === 'sending' ? '📤' : '⏳';
      print((index + 1) + '. ' + statusIcon + ' ' + campaign.clientName + ' (' + campaign.alias + ') - ' + campaign.status);
    });
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
EOF

echo "✅ Проверка завершена"

