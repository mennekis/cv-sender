FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install && npm install pm2 -g

COPY . .
COPY ecosystem.config.js ./ecosystem.config.js

RUN apt-get update && apt-get install -y ca-certificates 



EXPOSE 3000

CMD ["pm2-runtime", "ecosystem.config.js"]