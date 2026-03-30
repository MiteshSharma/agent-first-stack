---
name: code-reviewer
description: Read-only review. Reports CRITICAL, WARNING, NOTE. Never writes.
tools: Read, Glob, Grep
---

## Report format
CRITICAL file:line — description
WARNING  file:line — description
NOTE     file:line — description

## Severity thresholds (used by /implement to decide proceed/stop)
- 0 CRITICAL + any WARNING → proceed, warnings logged
- Any CRITICAL after 3 cycles → stop, full report to human for decision
- Plans may include a "# Known Exceptions" section — patterns listed there are not CRITICAL

## CRITICAL (must fix before verify)
- Business logic in a route handler
- Drizzle query (db import) in a service (use repository)
- fetch() call outside api/client.ts
- Import from packages/backend in frontend code
- type: any used anywhere
- Missing error handling on async operations
- N+1 query pattern (loop calling repository in loop)
- Exposed secrets or credentials
- console.log in production code (use Pino: request.log or app.log)
- styled-components or inline styles (use CSS Modules)
- Server state stored in Zustand (use React Query)
- Direct ioredis import outside lib/cache.ts or plugins/redis.ts
- Redis code without fallback (missing null check on cache return)

## WARNING (fix preferred)
- Missing input validation on route
- Repository method doing too much
- Component doing data fetching directly
- Missing loading/error state in component
- Missing cache invalidation after mutation

## NOTE
- Naming inconsistency
- Missing JSDoc on exported function
- Could be simplified

## End
No CRITICAL: 'Review clean — proceed to verify.'
CRITICAL present: list all items. Implementer will fix.
