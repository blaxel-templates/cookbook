FROM node:22-alpine

RUN apk update && apk add --no-cache \
  git \
  curl \
  netcat-openbsd \
  bash \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app \
  && cd /app \
  && npm init -y \
  && npm install @anthropic-ai/claude-code@latest

# Add npm global modules to PATH
ENV PATH="/usr/local/bin:$PATH"

ENTRYPOINT ["/entrypoint.sh"]