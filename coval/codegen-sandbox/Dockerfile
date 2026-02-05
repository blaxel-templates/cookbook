FROM oven/bun:alpine

RUN apk update && apk add --no-cache \
  git \
  curl \
  netcat-openbsd \
  nodejs \
  npm \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

# Copy the pre-configured Astro app
COPY ./app /app

# Install dependencies
RUN bun install

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
