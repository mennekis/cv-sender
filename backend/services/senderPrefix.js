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
 * @throws {Error} Если не удалось создать кампанию
 */
async function createAlias(clientName, recipients = [], clientEmail = null) {
   if (!clientName || typeof clientName !== "string") {
      throw new Error("clientName is required and must be a string");
   }

   if (!Array.isArray(recipients)) {
      throw new Error("recipients must be an array");
   }

   // Генерируем базовый алиас из имени клиента
   let alias = "client_" + clientName.toLowerCase().replace(/\s+/g, "_");

   // Очищаем алиас от недопустимых символов
   alias = alias.replace(/[^a-z0-9_]/g, "");

   if (alias.length === 7) {
      // Если после очистки остался только "client_", добавляем "user"
      alias = "client_user";
   }

   // Проверяем уникальность и добавляем суффикс при необходимости
   let counter = 1;
   let uniqueAlias = alias;
   let existingCampaign = await Campaign.findOne({ alias: uniqueAlias });

   // Максимум 100 попыток найти уникальный алиас
   const maxAttempts = 100;
   let attempts = 0;

   while (existingCampaign && attempts < maxAttempts) {
      uniqueAlias = `${alias}_${counter}`;
      existingCampaign = await Campaign.findOne({ alias: uniqueAlias });
      counter++;
      attempts++;
   }

   if (attempts >= maxAttempts) {
      throw new Error(
         `Failed to generate unique alias after ${maxAttempts} attempts`
      );
   }

   // Создаем и сохраняем кампанию
   try {
      const campaign = new Campaign({
         clientName,
         alias: uniqueAlias,
         recipients,
         clientEmail,
         status: "pending",
      });

      await campaign.save();
      return uniqueAlias;
   } catch (err) {
      // Обработка ошибки дублирования (если произошла гонка)
      if (err.code === 11000) {
         // Duplicate key error - пробуем еще раз с другим суффиксом
         console.warn(
            `Duplicate alias detected: ${uniqueAlias}, retrying with new suffix`
         );
         // Рекурсивный вызов с увеличенным счетчиком
         return await createAlias(
            clientName + "_" + Date.now(),
            recipients,
            clientEmail
         );
      }
      console.error("Error creating campaign:", err);
      throw new Error(`Failed to create campaign: ${err.message}`);
   }
}

module.exports = {
   senderPrefix,
   createAlias,
};
