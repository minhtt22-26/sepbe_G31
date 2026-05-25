# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: Full build (install all deps, generate Prisma, compile TypeScript) ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

# ── Stage 3: Production runtime ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Production node_modules (no devDeps)
COPY --from=deps /app/node_modules ./node_modules
# Compiled app — Prisma 7.x prisma-client provider embeds WASM in JS, no separate binary needed
COPY --from=builder /app/dist ./dist
# Prisma config for migrations — ESM file provides DATABASE_URL to prisma migrate deploy
COPY prisma.config.mjs ./prisma.config.mjs
# Prisma schema (needed for migrations at startup)
COPY prisma ./prisma

EXPOSE 4000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
