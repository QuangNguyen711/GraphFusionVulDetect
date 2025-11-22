# Production optimized frontend dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY web_react/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY web_react/ ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
