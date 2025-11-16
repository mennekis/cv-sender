# Анализ обработки Reply писем

## Как работает обработка Reply писем

### ✅ Да, логика работает для Reply писем!

Система специально разработана для обработки писем-ответов (Reply). Вот как это
работает:

## 1. Поиск писем в Gmail

### Автоматический checker (каждые 5 минут):

```javascript
// Ищет письма по нескольким критериям:
const query = `(to:seafarer_@your_sendgrid_api_key OR cc:seafarer_@your_sendgrid_api_key OR seafarer_@your_sendgrid_api_key) after:... is:unread`;
```

**Важно**: Поиск использует `seafarer_@your_sendgrid_api_key` без указания конкретного
алиаса, что позволяет находить письма даже если они пришли как Reply.

### Cron-задача (каждый час):

```javascript
// Ищет все письма с seafarer_ в адресе:
const query = `seafarer_ after:...`;
```

Это находит письма независимо от того, как они пришли (прямое письмо или Reply).

## 2. Извлечение алиаса из заголовков

При Reply письме алиас может находиться в разных заголовках. Система проверяет
их в следующем порядке:

### Приоритет проверки заголовков:

1. **`To`** - основное поле получателя

   -  В Reply письме может содержать адрес отправителя оригинального письма
   -  Но если письмо пришло на алиас, алиас будет здесь

2. **`Reply-To`** - адрес для ответа

   -  В Reply письме часто содержит алиас, если он был в оригинальном письме

3. **`X-Original-To`** - оригинальный получатель (добавляется почтовым сервером)

   -  Очень надежный источник алиаса для Reply писем
   -  Добавляется при пересылке через SendGrid Inbound Parse

4. **`Delivered-To`** - адрес доставки

   -  Также надежный источник для Reply писем

5. **`Envelope-To`** - адрес в конверте
   -  Еще один надежный источник

### Код извлечения алиаса:

```javascript
// Извлекаем alias из различных заголовков (приоритет: To, Reply-To, X-Original-To, Delivered-To, Envelope-To)
let alias = extractAliasFromEmail(emailData.to);

if (!alias && emailData.replyTo) {
   alias = extractAliasFromEmail(emailData.replyTo);
}
if (!alias && emailData.xOriginalTo) {
   alias = extractAliasFromEmail(emailData.xOriginalTo);
}
if (!alias && emailData.deliveredTo) {
   alias = extractAliasFromEmail(emailData.deliveredTo);
}
if (!alias && emailData.envelopeTo) {
   alias = extractAliasFromEmail(emailData.envelopeTo);
}
```

## 3. Как работает при Reply

### Сценарий 1: Прямой Reply на алиас

**Оригинальное письмо:**

-  От: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key`
-  Кому: `recipient@example.com`

**Reply письмо:**

-  От: `recipient@example.com`
-  Кому: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key` ← **алиас здесь**
-  Reply-To: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key` ← **или здесь**

**Результат**: ✅ Алиас найден в поле `To` или `Reply-To`

### Сценарий 2: Reply через почтовый сервер (SendGrid Inbound Parse)

**Оригинальное письмо:**

-  От: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key`
-  Кому: `recipient@example.com`

**Reply письмо:**

-  От: `recipient@example.com`
-  Кому: `your_secret_value` (основной ящик)
-  X-Original-To: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key` ← **алиас
   здесь**
-  Delivered-To: `seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key` ← **или
   здесь**

**Результат**: ✅ Алиас найден в заголовках `X-Original-To` или `Delivered-To`

## 4. Функция извлечения алиаса

```javascript
function extractAliasFromEmail(email) {
   if (!email || typeof email !== "string") return null;

   // Ищем паттерн seafarer_*@your_sendgrid_api_key в строке (может быть несколько адресов)
   const match = email.match(/(seafarer_[^@\s<>]+)@seafarer-cv\.com/gi);
   if (match && match.length > 0) {
      const fullMatch = match[0];
      const aliasMatch = fullMatch.match(/(seafarer_[^@]+)@seafarer-cv\.com$/i);
      return aliasMatch ? aliasMatch[1] : null;
   }
   return null;
}
```

**Особенности**:

-  ✅ Работает с несколькими адресами в одном поле
-  ✅ Игнорирует регистр (`gi` флаги)
-  ✅ Находит алиас даже если он не первый в списке адресов

## 5. Примеры работы

### Пример 1: Простой Reply

```
To: seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key
→ ✅ Алиас найден: seafarer_oleksiy_nikolayenko_7
```

### Пример 2: Reply с несколькими адресами

```
To: "Name" <name@example.com>, seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key
→ ✅ Алиас найден: seafarer_oleksiy_nikolayenko_7
```

### Пример 3: Reply через почтовый сервер

```
To: your_secret_value
X-Original-To: seafarer_oleksiy_nikolayenko_7@your_sendgrid_api_key
→ ✅ Алиас найден в X-Original-To: seafarer_oleksiy_nikolayenko_7
```

## 6. Защита от ошибок

Если алиас не найден, система логирует все проверенные заголовки:

```javascript
if (!alias) {
   console.log(`⚠️  No alias found in email headers:`);
   console.log(`   To: ${emailData.to}`);
   console.log(`   Reply-To: ${emailData.replyTo || "не указан"}`);
   console.log(`   X-Original-To: ${emailData.xOriginalTo || "не указан"}`);
   console.log(`   Delivered-To: ${emailData.deliveredTo || "не указан"}`);
   return;
}
```

Это помогает диагностировать проблемы, если алиас не найден.

## 7. Выводы

### ✅ Система полностью поддерживает Reply письма:

1. **Поиск**: Находит Reply письма через поиск по `seafarer_`
2. **Извлечение алиаса**: Проверяет 5 различных заголовков
3. **Надежность**: Работает даже если алиас в разных заголовках
4. **Обработка**: Пересылает Reply письма так же, как и обычные

### 🔍 Что происходит при Reply:

1. Пользователь отвечает на письмо от `seafarer_XXX@your_sendgrid_api_key`
2. Письмо приходит на Gmail ящик (`your_secret_value`)
3. Система находит письмо через поиск `seafarer_`
4. Извлекает алиас из заголовков (To, Reply-To, X-Original-To, и т.д.)
5. Находит кампанию по алиасу в MongoDB
6. Пересылает письмо на `clientEmail` из кампании

## 8. Рекомендации

### Если Reply письма не обрабатываются:

1. **Проверьте заголовки письма**:

   ```bash
   node test-reply-headers.js
   ```

2. **Проверьте логи**:

   ```bash
   docker-compose logs backend | grep -E "(No alias found|Found alias)"
   ```

3. **Проверьте, что SendGrid Inbound Parse настроен правильно**:

   -  Должен добавлять заголовки `X-Original-To` или `Delivered-To`

4. **Убедитесь, что письмо содержит алиас**:
   -  Алиас должен быть в формате `seafarer_XXX@your_sendgrid_api_key`

## 9. Тестирование

Для тестирования Reply писем:

1. Отправьте письмо на алиас (например, `seafarer_test@your_sendgrid_api_key`)
2. Ответьте на это письмо через Reply
3. Проверьте логи через 5 минут (автоматический checker) или сразу:
   ```bash
   node process-all-emails.js seafarer_test
   ```

---

**Статус**: ✅ **СИСТЕМА ПОЛНОСТЬЮ ПОДДЕРЖИВАЕТ REPLY ПИСЬМА**
