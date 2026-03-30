# ─── Stage 1: Base with dependencies ─────────────────────────────────────────
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace config first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

RUN pnpm install --frozen-lockfile

# Copy all source
COPY packages/ ./packages/

# ─── Stage 2: Build everything ───────────────────────────────────────────────
FROM base AS build

RUN pnpm build

# ─── Stage 3: Backend production image ───────────────────────────────────────
FROM node:22-alpine AS backend

WORKDIR /app

# Copy node_modules from build (includes workspace symlinks)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

# Copy built shared package
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built backend
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/package.json ./packages/backend/
COPY --from=build /app/packages/backend/node_modules ./packages/backend/node_modules
# Drizzle migration files must be present at runtime for the entrypoint migration runner
COPY --from=build /app/packages/backend/drizzle ./packages/backend/drizzle

# Entrypoint handles migrations + server start
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]

# ─── Stage 4: Frontend production image (nginx) ─────────────────────────────
FROM nginx:alpine AS frontend

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
