# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (frontend only)
RUN pnpm install --frozen-lockfile --filter frontend

# Copy source
COPY apps/frontend ./apps/frontend
COPY docs/api ./docs/api
COPY tsconfig.base.json ./

# Build (outputs to apps/frontend/dist)
RUN pnpm --filter frontend build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Nginx config: serve SPA with fallback to index.html for client-side routing
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
