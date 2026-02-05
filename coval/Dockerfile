# Build stage
FROM oven/bun:alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

# Build the Next.js app
RUN bun run build

# Production stage
FROM oven/bun:alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001 && \
  chown -R nextjs:nodejs /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

ENTRYPOINT ["bun", "server.js"]
