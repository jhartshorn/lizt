FROM node:18-alpine

# Create app directory and set ownership first
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app
USER node

# Copy package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm install --only=production

# Copy application files and create data directory
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public
RUN mkdir -p data

EXPOSE 3737

CMD ["npm", "start"]
