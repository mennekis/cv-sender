FROM node:20

WORKDIR /usr/src/app

# Установка ca-certificates и очистка кэша в одной команде для уменьшения размера образа
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Копируем package файлы и устанавливаем зависимости
COPY package*.json ./
RUN npm install --production && \
    npm cache clean --force

# Копируем код приложения
COPY . .
COPY ecosystem.config.js ./ecosystem.config.js

EXPOSE 3000

# Используем локально установленный pm2
CMD ["npx", "pm2-runtime", "ecosystem.config.js"]