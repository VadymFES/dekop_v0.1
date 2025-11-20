# Webhook Relay для LiqPay/Monobank
# Простий Node.js сервіс що пересилає вебхуки на Vercel з bypass токеном

FROM node:18-alpine

WORKDIR /app

# Копіюємо package.json
COPY package.json ./

# Встановлюємо залежності
RUN npm install --production

# Копіюємо код
COPY server.js ./

# Порт
EXPOSE 3000

# Запуск
CMD ["node", "server.js"]
