FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server.js ./

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "server.js"]

