FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

RUN mkdir -p data && \
    ls -la /app && \
    ls -la /app/public && \
    chown -R node:node /app

EXPOSE 3000

USER node

CMD ["npm", "start"]