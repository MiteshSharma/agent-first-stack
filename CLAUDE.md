# Project: Node App

## Stack
Backend: Node.js 22 + Fastify + Drizzle ORM + PostgreSQL 17 + Redis (optional) + Pino
Frontend: React 19 + Vite + TypeScript + Ant Design + Zustand + React Query
Monorepo: pnpm workspaces + Turborepo
Tests: Vitest (unit) + Playwright (E2E)
Validation: Zod (shared between backend and frontend)
API Docs: @fastify/swagger (auto-generated from Zod schemas)

## Hard Rules — Never Violate
1. API contracts live ONLY in packages/shared/src/types.ts
2. All fetch calls live ONLY in packages/frontend/src/api/client.ts
3. Business logic lives ONLY in services/ — never in route handlers
4. All DB queries live ONLY in repositories/ — never in services directly
5. Frontend NEVER imports from backend packages
6. Routes are thin: parse input → call service → return result
7. Services call repositories only — no Drizzle in services
8. Styles use CSS Modules (.module.css) — no inline styles, no styled-components
9. Server state in React Query — UI state in Zustand — never mix
10. Redis is OPTIONAL — all Redis code must have a no-op/in-memory fallback

## Implementation Order (always)
1. Add types to packages/shared/src/types.ts (commit)
2. Implement repository → service → route (backend)
3. Add method to api/client.ts → React Query hook → component (frontend)

## Drizzle Rules
- Schema defined ONLY in src/db/schema.ts — single source of truth for tables and types
- DB connection exported from src/db/index.ts — never instantiate Pool elsewhere
- Queries ONLY through repository classes in src/repositories/
- No Drizzle imports in services — only repository method calls
- Migrations are additive — never modify existing migration files in drizzle/
- Generate migrations with: pnpm db:generate (reads schema diff)
- Apply migrations with: pnpm db:migrate

## Endpoints Required
GET /health   → { status, database, redis, uptime, responseTime, memory }
GET /metrics  → { database counts, process info, cache stats }

## Commit Format
feat: | fix: | types: | test: | chore: | docs: | refactor:

## Before Asking a Question
Read: PLANS.md, .agents/[feature]/PLAN.md, existing similar files
Resolve ambiguity in Decision Log section of the plan. Do not ask.
