# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (backend only)
RUN pnpm install --frozen-lockfile --filter backend

# Copy source
COPY apps/backend ./apps/backend
COPY docs/api ./docs/api
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter backend build

# ── Run stage ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./

# Create data directory for SQLite and attachments
RUN mkdir -p /data/attachments

EXPOSE 3000

CMD ["node", "dist/index.js"]
