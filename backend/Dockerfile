FROM node:20-bookworm-slim AS deps

WORKDIR /app

ARG APT_MIRROR=mirrors.aliyun.com
ARG NPM_REGISTRY=https://registry.npmjs.org/

RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -Ei "s|https?://deb.debian.org/debian|http://${APT_MIRROR}/debian|g" /etc/apt/sources.list.d/debian.sources && \
    sed -Ei "s|https?://security.debian.org/debian-security|http://${APT_MIRROR}/debian-security|g" /etc/apt/sources.list.d/debian.sources; \
  fi \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm config set registry ${NPM_REGISTRY} \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm ci --no-audit --no-fund

FROM deps AS builder

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run prisma:generate && npm run build

FROM deps AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
