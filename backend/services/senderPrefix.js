const Campaign = require("../models/Campaign");

/**
 * Генерирует префикс отправителя из имени
 * @param {string} sender - Имя отправителя
 * @returns {string} Префикс в формате "имя.фамилия" или "имя"
 */
function senderPrefix(sender) {
   if (!sender) {
      return "";
   }

   const [firstNameRaw, lastNameRaw] = sender.trim().split(/\s+/);
   const firstName = firstNameRaw?.toLowerCase() || "";
   const lastName = lastNameRaw?.toLowerCase();

   const prefix = lastName ? `${firstName}.${lastName}` : firstName;

   return prefix;
}

/**
 * Создает уникальный алиас для кампании и сохраняет её в БД
 * @param {string} clientName - Имя клиента
 * @param {string[]} recipients - Список email адресов получателей
 * @param {string} clientEmail - Email адрес клиента (опционально)
 * @returns {Promise<string>} Сгенерированный алиас
 */
async function createAlias(clientName, recipients = [], clientEmail = null) {
   // Генерируем базовый алиас из имени клиента
   let alias = "client_" + clientName.toLowerCase().replace(/\s+/g, "_");

   // Проверяем уникальность и добавляем суффикс при необходимости
   let counter = 1;
   let uniqueAlias = alias;
   let existingCampaign = await Campaign.findOne({ alias: uniqueAlias });

   while (existingCampaign) {
      uniqueAlias = `${alias}_${counter}`;
      existingCampaign = await Campaign.findOne({ alias: uniqueAlias });
      counter++;
   }

   // Создаем и сохраняем кампанию
   const campaign = new Campaign({
      clientName,
      alias: uniqueAlias,
      recipients,
      clientEmail,
      status: "pending",
   });

   await campaign.save();

   return uniqueAlias;
}

module.exports = {
   senderPrefix,
   createAlias,
};
