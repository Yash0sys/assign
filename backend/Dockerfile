FROM node:20-slim

# Install Playwright system dependencies
RUN npx -y playwright@1.48.0 install --with-deps chromium

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
