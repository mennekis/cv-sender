FROM node:20

WORKDIR /usr/src/app

# Копируем package.json и package-lock.json из backend
COPY package*.json ./

# Устанавливаем зависимости и pm2
RUN npm install && npm install pm2 -g

# Копируем весь backend-код
COPY . .

# Копируем ecosystem.config.js из корня проекта
COPY ecosystem.config.js ./ecosystem.config.js

# Открываем порт (по умолчанию 3000)
EXPOSE 3000

# Запуск через pm2-runtime
CMD ["pm2-runtime", "ecosystem.config.js"]