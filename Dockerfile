FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy application files and create data directory as root
COPY server.js ./
COPY public ./public
RUN mkdir -p data

# Change ownership of only necessary files/directories to node user
RUN chown -R node:node server.js public data

EXPOSE 3737

USER node

CMD ["npm", "start"]
