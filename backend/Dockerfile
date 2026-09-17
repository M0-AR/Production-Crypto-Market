# builder compiles TS + generates Prisma; runner is prod-only, non-root
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl wget

FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma downloads engines at generate-time; flaky egress must not fail the build
# on the first dropped packet. Bounded retries, still fails loud if truly offline.
RUN ok=0; for i in 1 2 3 4 5; do \
      if npx prisma generate; then ok=1; break; fi; \
      echo "prisma generate failed (try $i/5), retrying..."; sleep 8; \
    done; \
    [ "$ok" = "1" ] && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
USER nestjs
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/main.js"]

FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
EXPOSE 4000 9229
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]
