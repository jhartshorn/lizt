FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy application files
COPY server.js ./
COPY public ./public
COPY data ./data

# Set permissions and create data directory
RUN mkdir -p data && chown -R node:node /app

EXPOSE 3737

USER node

CMD ["npm", "start"]
