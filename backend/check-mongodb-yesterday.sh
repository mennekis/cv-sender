#!/bin/bash

# Скрипт для проверки вчерашних записей в MongoDB на VPS

SERVER_USER="root"
SERVER_HOST="your_vps_ip"
REMOTE_PATH="/root/sender-app"

echo "🔍 Проверка вчерашних записей в MongoDB на VPS..."
echo "============================================================"
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /root/sender-app
  
  echo "📊 Общая статистика по кампаниям:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const total = db.campaigns.countDocuments();
    print('Всего кампаний в базе: ' + total);
  " 2>/dev/null || echo "❌ Не удалось подключиться к MongoDB"
  echo ""
  
  echo "📅 Кампании за вчера (последние 24 часа):"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterdayCampaigns = db.campaigns.find({
      createdAt: { \$gte: yesterday, \$lt: today }
    }).toArray();
    
    print('Найдено кампаний за вчера: ' + yesterdayCampaigns.length);
    if (yesterdayCampaigns.length > 0) {
      print('');
      print('Список вчерашних кампаний:');
      yesterdayCampaigns.forEach((campaign, index) => {
        print((index + 1) + '. ' + campaign.clientName + ' (' + campaign.alias + ')');
        print('   Статус: ' + campaign.status);
        print('   Создано: ' + campaign.createdAt.toISOString());
        print('   Получателей: ' + (campaign.recipientsCount || 0));
      });
    }
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "📅 Кампании за последние 48 часов:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    
    const recentCampaigns = db.campaigns.find({
      createdAt: { \$gte: twoDaysAgo }
    }).sort({ createdAt: -1 }).toArray();
    
    print('Найдено кампаний за последние 48 часов: ' + recentCampaigns.length);
    if (recentCampaigns.length > 0) {
      print('');
      print('Список кампаний (от новых к старым):');
      recentCampaigns.forEach((campaign, index) => {
        const date = campaign.createdAt.toISOString().split('T')[0];
        const time = campaign.createdAt.toISOString().split('T')[1].split('.')[0];
        print((index + 1) + '. [' + date + ' ' + time + '] ' + campaign.clientName + ' (' + campaign.alias + ') - ' + campaign.status);
      });
    }
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "📋 Последние 10 кампаний (все):"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const recentCampaigns = db.campaigns.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    recentCampaigns.forEach((campaign, index) => {
      const date = campaign.createdAt.toISOString().split('T')[0];
      const time = campaign.createdAt.toISOString().split('T')[1].split('.')[0];
      const statusIcon = campaign.status === 'completed' ? '✅' : 
                        campaign.status === 'sending' ? '📤' : '⏳';
      print((index + 1) + '. ' + statusIcon + ' [' + date + ' ' + time + '] ' + campaign.clientName + ' (' + campaign.alias + ')');
      print('   Статус: ' + campaign.status + ' | Получателей: ' + (campaign.recipientsCount || 0));
    });
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "🗄️  Проверка коллекций в базе данных:"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const collections = db.getCollectionNames();
    print('Коллекции в базе sender-app:');
    collections.forEach(col => {
      const count = db[col].countDocuments();
      print('  - ' + col + ': ' + count + ' документов');
    });
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
  echo "📊 Статистика по датам создания (группировка по дням):"
  docker-compose exec -T mongodb mongosh sender-app --quiet --eval "
    const stats = db.campaigns.aggregate([
      {
        \$project: {
          date: { \$dateToString: { format: '%Y-%m-%d', date: '\$createdAt' } }
        }
      },
      {
        \$group: {
          _id: '\$date',
          count: { \$sum: 1 }
        }
      },
      {
        \$sort: { _id: -1 }
      },
      {
        \$limit: 7
      }
    ]).toArray();
    
    print('Кампании по дням (последние 7 дней):');
    stats.forEach(stat => {
      print('  ' + stat._id + ': ' + stat.count + ' кампаний');
    });
  " 2>/dev/null || echo "❌ Не удалось выполнить запрос"
  echo ""
  
EOF

echo "✅ Проверка завершена"

