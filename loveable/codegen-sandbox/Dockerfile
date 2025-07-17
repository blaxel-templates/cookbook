FROM node:22-alpine

RUN apk update && apk add --no-cache \
  git \
  curl \
  netcat-openbsd \
  bash \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

RUN npx create-next-app@latest /app --use-npm --typescript --eslint --tailwind --src-dir --app --import-alias "@/*" --no-git --yes --no-turbopack
RUN npm install @anthropic-ai/claude-code@latest

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Add npm global modules to PATH
ENV PATH="/usr/local/bin:$PATH"

ENTRYPOINT ["/entrypoint.sh"]