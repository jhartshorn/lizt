FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY server.js ./
COPY public/ ./public/

RUN mkdir -p data && chown -R node:node /app

EXPOSE 3000

USER node

CMD ["npm", "start"]