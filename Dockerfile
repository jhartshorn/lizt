FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Switch to node user before copying application files
USER node

# Copy application files
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public

# Create data directory
RUN mkdir -p data

EXPOSE 3737

CMD ["npm", "start"]
