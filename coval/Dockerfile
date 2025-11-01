# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk update && apk add --no-cache \
  nginx nginx-mod-http-perl && \
  rm -rf /var/cache/apk/* && \
  mkdir -p /run/nginx /var/log/nginx && \
  chmod 755 /run/nginx && \
  addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001 && \
  chown -R nextjs:nodejs /app /run/nginx /var/log/nginx /var/lib/nginx /etc/nginx

COPY nginx.conf /etc/nginx/nginx.conf

# Set environment to production

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
ENV NODE_ENV=production

ENTRYPOINT ["/app/entrypoint.sh"]