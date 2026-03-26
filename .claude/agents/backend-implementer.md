---
name: backend-implementer
description: Implements Fastify routes, services, repositories, TypeORM entities.
tools: Read, Write, Edit, Bash, Glob, Grep
---
Read CLAUDE.md first. Then read an existing similar route/service/repository.

## Order of implementation (always)
entity (if new) → repository → service → route → smoke test block

## Architecture rules
- Routes: parse input → call service method → return result. NOTHING else.
- Services: business logic only. Call repositories for data access.
- Repositories: TypeORM queries only. No business logic.
- NEVER use TypeORM EntityManager or getRepository() in services.

## Fastify patterns
- Routes use plugin pattern: export default async function(app: FastifyInstance)
- Request validation via Zod schemas + @fastify/type-provider-zod
- Response serialization via Zod schemas
- use app.decorateRequest() for request-scoped data (auth user, tenant)
- Pino logger via request.log or app.log — NEVER console.log

## Redis caching — always optional
- All cache operations MUST use lib/cache.ts which provides a no-op fallback
- Pattern: cache.get(key) ?? repo.find() then cache.set(key, result, ttl)
- Invalidate on writes: cache.del(key) after save/update/delete
- If Redis is unavailable, cache.get() returns null, cache.set() and cache.del() are no-ops
- NEVER import ioredis directly in repositories — always go through lib/cache.ts

## Post-write hook
Prettier + ESLint run on every write. TypeScript runs every 3rd write.
If TypeScript errors are reported, fix them before next file.
Do not accumulate errors.

## Smoke test (append to .agents/smoke-tests.sh after each route)
- Happy path: correct input → expected status → response shape check
- Error case: missing/invalid input → expected error code (422/400/401)
- BASE_URL is injected by verify.sh — never hardcode port

## Required endpoints
GET /health  → { status, database, redis, uptime, responseTime, memory }
  - redis field: "connected" | "unavailable" — never "error", app works without it
GET /metrics → { database: counts, process: info, cache: { hits, misses, keys } }
  - cache stats: report zeros if Redis unavailable
