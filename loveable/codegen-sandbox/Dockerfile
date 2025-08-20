FROM node:22-alpine

RUN apk update && apk add --no-cache \
  git \
  curl \
  netcat-openbsd \
  bash \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

RUN npx create-next-app@latest /app --use-npm --typescript --eslint --tailwind --src-dir --app --import-alias "@/*" --no-git --yes
RUN npm install @anthropic-ai/claude-code@latest

# Copy and run the pre-warm script to build .next cache
COPY prewarm-cache.sh /tmp/prewarm-cache.sh
RUN chmod +x /tmp/prewarm-cache.sh && \
    # Set timeout via environment variable (default 30s, can be overridden during build)
    PREWARM_TIMEOUT=${PREWARM_TIMEOUT:-30} /tmp/prewarm-cache.sh || \
    echo "Pre-warming completed (exit code: $?)" && \
    # Clean up the temporary script
    rm /tmp/prewarm-cache.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]