# Decisions Log

All architectural and implementation decisions made during project scaffolding.
Review these and override any you disagree with.

---

## D1: Package name `fastify-type-provider-zod` (not `@fastify/type-provider-zod`)
**Decision:** Use `fastify-type-provider-zod@5` (community package)
**Why:** The scoped `@fastify/type-provider-zod` does not exist on npm. The community package `fastify-type-provider-zod` is the correct one. Version 6 requires Zod v4 (breaking changes), so we pinned v5 which works with Zod v3.
**Impact:** If/when migrating to Zod v4, upgrade to `fastify-type-provider-zod@6`.

## D2: TypeORM `synchronize: true` in development
**Decision:** Enable `synchronize` in dev mode only.
**Why:** Auto-creates/updates tables from entity definitions. Removes the need to run migrations during development. In production, `synchronize` is always `false` — use migrations only.
**Risk:** Schema changes in dev happen automatically. Never enable this in production.

## D3: Redis is fully optional — no env var needed to start
**Decision:** If `REDIS_URL` is empty or unset, the app starts without Redis. No error, no crash.
**Why:** Redis adds caching and distributed rate limiting but is not required for core functionality. Development and CI environments should not need Redis running.
**Implementation:**
- `plugins/redis.ts` — logs a warning and sets client to `null`
- `lib/cache.ts` — all operations return no-op when client is `null`
- `plugins/rate-limit.ts` — falls back to in-memory when no Redis
- `routes/health.ts` — reports `"unavailable"` (not error), health stays `"ok"`
- `routes/metrics.ts` — cache stats return zeros

## D4: Compiled JS for production, tsx for development
**Decision:** `pnpm dev` uses `tsx watch` for hot reload. Production runs compiled `node dist/index.js`.
**Why:** tsx (esbuild-based) is fast for dev iteration but had a decorator compatibility issue with TypeORM. The `tsc`-compiled output works perfectly. The `--tsconfig` flag ensures tsx respects `experimentalDecorators`.
**Impact:** Always run `pnpm build` before production deployment.

## D5: Connection pool via `extra` field in TypeORM
**Decision:** Use `extra: { min: 2, max: 10, idleTimeoutMillis: 30000 }` instead of `pool: {}`.
**Why:** TypeORM's PostgresConnectionOptions doesn't have a `pool` property. Connection pool config for `pg` driver goes through the `extra` field which is passed directly to the underlying `pg.Pool`.

## D6: Vite proxy for API calls in development
**Decision:** Frontend `vite.config.ts` proxies `/api`, `/health`, `/metrics` to `http://localhost:3001`.
**Why:** Avoids CORS issues in development. The frontend makes relative requests (`/api/users`), Vite forwards them to the backend. In production, a reverse proxy (nginx/traefik) handles this.
**Impact:** `VITE_API_URL` env var is empty in dev (uses proxy). Set it to the backend URL in production.

## D7: Manual chunks in Vite build
**Decision:** Split bundles into `vendor` (react), `antd`, `query` (react-query), and app code.
**Why:** Ant Design is ~844KB minified. Separating it means users cache the antd chunk independently — it changes rarely. App code (192KB) changes frequently and re-downloads are small.
**Future:** Consider lazy-loading antd components with `React.lazy()` for pages that don't need the full library.

## D8: CSS Modules over global CSS
**Decision:** Every component uses `[Component].module.css` for styles.
**Why:** Scoped class names prevent style collisions. Zero runtime cost (unlike styled-components). Native Vite support. Co-located with component code.
**Exception:** The App shell uses inline styles for the layout skeleton (Ant Design Layout). This is a pragmatic choice for the shell — components use CSS Modules.

## D9: Zustand for UI state only
**Decision:** Zustand stores contain only UI state (sidebar collapsed, form open/closed, search query, selected item). Server state (users list, health data) lives exclusively in React Query.
**Why:** Mixing server state into Zustand creates synchronization issues. React Query handles caching, background refetch, optimistic updates natively. Zustand handles what React Query can't: UI toggles, form state, pagination position.

## D10: Single API client file
**Decision:** All `fetch()` calls live in `packages/frontend/src/api/client.ts`. No other file may call `fetch()`.
**Why:** Centralized auth token injection, base URL config, error handling, and response parsing. Makes it trivial to add request logging, retry logic, or switch to a different HTTP approach later. The code-reviewer agent enforces this as a CRITICAL violation.

## D11: Repository pattern with cache-through
**Decision:** Repositories own both database queries AND cache interactions.
**Why:** Services should not know about caching implementation. The cache is a repository concern — "how do I get this data fastest?" The service just calls `userRepo.findById(id)` and gets the result, regardless of whether it came from cache or DB.
**Pattern:** `cache.get(key) ?? db.find() → cache.set(key, result)`

## D12: Error handler hierarchy
**Decision:** Centralized error handler in `middleware/error-handler.ts` handles all error types.
**Priority order:**
1. Zod validation errors → 422 with field-level details
2. ServiceError (known business errors) → custom status code
3. Fastify validation errors → 422
4. Rate limit errors → 429
5. Unexpected errors → 500 (message hidden in production)
**Why:** Routes never catch errors themselves. Throw from services, let the handler format the response. Consistent error shape across all endpoints.

## D13: Correlation IDs for request tracing
**Decision:** Every request gets a correlation ID via `middleware/request-context.ts`.
**Implementation:** Use `x-correlation-id` header if provided (from upstream proxy/gateway), otherwise generate a UUID. ID is added to the Pino logger context and returned in the response header.
**Why:** Essential for debugging in production. Trace a request across logs without guessing.

## D14: Database name `prod_data` with user `postgres`
**Decision:** Use the existing database `prod_data` with credentials `postgres:postgres` as specified.
**Why:** User requirement. These credentials are for development only.
**Production:** Change credentials, use connection string from environment variable, never hardcode.

## D15: Graceful shutdown
**Decision:** The backend handles SIGINT and SIGTERM with graceful shutdown.
**Implementation:** Close Fastify server (drains in-flight requests), then close TypeORM connection (releases DB pool), then exit.
**Why:** Prevents connection leaks and request drops during deployments. Kubernetes sends SIGTERM before killing pods — this gives the app time to finish work.

## D16: Post-write hook TypeScript debouncing
**Decision:** Prettier and ESLint run on every file write. TypeScript `tsc --noEmit` runs every 3rd write.
**Why:** Full TypeScript compilation is slow (~2-4s per run). Running it on every file write during a 50-file implementation session would add 100-200s of overhead. Debouncing to every 3rd write catches errors quickly without blocking the agent.

## D17: Pre-bash branch detection uses `git branch --show-current`
**Decision:** Instead of regex-matching command strings for "main" or "master", check the actual current branch.
**Why:** Regex matching `git.*commit.*main` would false-positive on `git commit -m "fix main page bug"`. Checking `git branch --show-current` is accurate and has no false positives.

## D18: Port range for parallel worktrees
**Decision:** Use port range 3000-3999 (1000 ports) instead of 3001-3099 (100 ports).
**Why:** Birthday problem — with 100 ports and 3 worktrees, collision probability is ~4%. With 1000 ports, it drops to ~0.4%. Also added `lsof` fallback to increment port if collision occurs.

---

## How to override a decision
## D19: Multi-stage Dockerfile with separate backend/frontend targets
**Decision:** Single `Dockerfile` with 4 stages: base (deps), build (compile), backend (Node.js), frontend (nginx:alpine).
**Why:** Keeps the full monorepo build in one Dockerfile while producing two lean production images. Backend runs compiled JS via `node packages/backend/dist/index.js`. Frontend serves Vite's static build via nginx with reverse proxy to backend for `/api`, `/health`, `/metrics`, `/docs`.
**Trade-off:** Copying full `node_modules` from build stage instead of `pnpm install --prod` because pnpm workspace protocol (`workspace:*`) doesn't resolve correctly with `--prod` in an isolated stage. Image is ~250MB larger but avoids broken symlinks.

## D20: Docker Compose with configurable ports
**Decision:** All external ports are configurable via environment variables (`POSTGRES_PORT`, `BACKEND_PORT`) with sensible defaults.
**Why:** Local development may already have postgres/backend running on default ports. Avoids `bind: address already in use` conflicts. Default postgres port is 5433 (not 5432) to avoid conflict with local postgres.

## D21: Explicit `DATABASE_SSL` env var instead of `NODE_ENV` check
**Decision:** SSL is controlled by `DATABASE_SSL=true|false`, not inferred from `NODE_ENV=production`.
**Why:** Docker Compose runs `NODE_ENV=production` for optimized runtime, but the containerized postgres doesn't have SSL. Previously, production mode auto-enabled SSL which crashed the backend. An explicit flag gives full control.
**Impact:** Cloud deployments (RDS, Supabase) should set `DATABASE_SSL=true`.

## D22: `TYPEORM_SYNCHRONIZE` override for Docker
**Decision:** TypeORM `synchronize` can be forced on via `TYPEORM_SYNCHRONIZE=true`, even in production mode.
**Why:** Docker Compose needs to auto-create tables on first boot without running migrations. In a real production deployment (ECS, K8s), this should be `false` and migrations should be run explicitly.
**Risk:** Never enable in a real production environment with existing data.

## D23: Removed TypeScript project references from backend tsconfig
**Decision:** Backend tsconfig no longer uses `"references": [{ "path": "../shared" }]`. Relies on pnpm workspace symlinks + turbo build order.
**Why:** `tsc` without `-b` flag doesn't properly resolve project references in Docker. The `tsbuildinfo` caching also caused stale builds. Turbo already ensures shared builds before backend, and pnpm symlinks handle module resolution. Simpler, more reliable.

## D24: `*.tsbuildinfo` excluded from Docker and git
**Decision:** Added `*.tsbuildinfo` to both `.dockerignore` and `.gitignore`.
**Why:** Stale `tsbuildinfo` files from the host were being copied into Docker builds, causing TypeScript's incremental compiler to skip emitting `.js` and `.d.ts` files (it thought the output was up-to-date). This was a subtle, hard-to-debug build failure.

## D25: Three-file Docker Compose architecture (base + dev + prod)
**Decision:** `docker-compose.yml` is infrastructure-only (postgres + redis). Two overlays: `docker-compose.dev.yml` (source mount + `pnpm dev`) and `docker-compose.prod.yml` (built images + nginx + migrations).
**Why:** Follows Docker Compose's standard override pattern. No duplication of service definitions. Dev gets hot-reload (Vite HMR + tsx watch), prod gets optimized builds. Usage: `docker compose -f docker-compose.yml -f docker-compose.{dev|prod}.yml up`.
**Trade-off:** Slightly longer commands vs cleaner separation. Mitigated with `pnpm docker:dev` / `pnpm docker:prod` shortcuts.

## D26: Entrypoint-based migration runner for production
**Decision:** Backend Docker image uses `docker/entrypoint.sh` that runs TypeORM migrations when `RUN_MIGRATIONS=true` before starting the server.
**Why:** Production uses `TYPEORM_SYNCHRONIZE=false` — tables must be created via migrations. Running migrations at container startup ensures schema is always up-to-date on deploy. Can be disabled with `RUN_MIGRATIONS=false` once initial setup is done.
**Impact:** First deploy auto-creates tables. Subsequent deploys run any new migrations. Idempotent — safe to run multiple times.

## D27: Turbo `passThroughEnv` for dev task
**Decision:** Added explicit `passThroughEnv` list to turbo.json's `dev` task for all app env vars (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.).
**Why:** Turbo's strict env mode filters environment variables by default. Without this, Docker Compose's environment variables weren't reaching the backend process, causing it to fall back to localhost defaults.

## D28: Vite `host: true` for Docker compatibility
**Decision:** Added `host: true` to Vite's server config.
**Why:** By default, Vite only listens on `localhost`, which is inaccessible from outside a Docker container. `host: true` binds to `0.0.0.0`. No impact on local development (still accessible via localhost).

## D29: Migrations in `src/migrations/` (compiled with tsc)
**Decision:** Moved migrations from `migrations/` to `src/migrations/` so they're included in the TypeScript build.
**Why:** Production runs compiled JS. Keeping migrations outside `src/` meant they weren't compiled by `tsc` and weren't available in the Docker image's `dist/` directory.

---

If you disagree with any decision above:
1. Note which decision (D1-D29) you want to change
2. Describe the preferred approach
3. I'll update the implementation accordingly
