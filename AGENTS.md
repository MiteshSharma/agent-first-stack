# Agent Configuration

Universal agent config — fallback for non-Claude agents.

## Available Agents
1. **backend-implementer** — Implements Fastify routes, services, repositories, Drizzle schema
2. **frontend-implementer** — Implements React components, hooks, and Zustand store slices
3. **code-reviewer** — Read-only review with CRITICAL/WARNING/NOTE severity levels
4. **test-writer** — Writes Vitest unit and integration tests
5. **e2e-test-writer** — Writes Playwright E2E tests with real DOM inspection
6. **db-migrator** — Handles Drizzle schema changes and migrations safely
7. **log-analyzer** — Diagnoses runtime issues from logs, metrics, and verify reports

## Rules for All Agents
- Read CLAUDE.md before starting any work
- Follow the implementation order defined in CLAUDE.md
- Never use console.log — use Pino (request.log or app.log)
- Redis is optional — all cache code must have no-op fallback
- API contracts live only in packages/shared/src/types.ts
- Business logic lives only in services/ — never in route handlers
- All DB queries live only in repositories/ — never in services
