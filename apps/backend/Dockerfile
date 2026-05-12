# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (backend only, hoisted so node_modules contains real files not symlinks)
RUN pnpm install --frozen-lockfile --filter backend --node-linker=hoisted

# Copy source
COPY apps/backend ./apps/backend
COPY docs/api ./docs/api
COPY examples ./examples
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter backend build

# ── Run stage ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV EXAMPLES_DIR=/app/examples

# Copy compiled output (rootDir=../.. means output mirrors the monorepo structure)
COPY --from=builder /app/apps/backend/dist ./dist
# Migration SQL files are needed at runtime by drizzle-orm/better-sqlite3/migrator
COPY --from=builder /app/apps/backend/drizzle ./drizzle
# With --node-linker=hoisted, node_modules contains real files (no symlinks)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./package.json
# Example assets — seed() copies these into the data volume on first start
COPY --from=builder /app/examples ./examples

# Create data directory for SQLite and static files
RUN mkdir -p /data/static/attachments /data/static/garden

EXPOSE 3000

CMD ["node", "dist/apps/backend/src/server.js"]
