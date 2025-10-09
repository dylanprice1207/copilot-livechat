# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build frontend
RUN cd frontend && npm ci && npm run build && cd ..

# Create necessary directories
RUN mkdir -p /var/log/convoai \
    && mkdir -p uploads \
    && mkdir -p temp

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S convoai -u 1001

# Change ownership of app directory
RUN chown -R convoai:nodejs /app && \
    chown -R convoai:nodejs /var/log/convoai

# Switch to non-root user
USER convoai

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]