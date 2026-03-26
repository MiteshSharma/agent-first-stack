# Usage: /check-health
No code changes. Report only.

1. pnpm typecheck  2. pnpm test  3. pnpm lint  4. pnpm build
5. git: branch, uncommitted, ahead/behind
6. Active ExecPlans: list .agents/*/PLAN.md

If backend running:
7. curl /health — status, database, redis connectivity
8. curl /metrics — counts, process info, cache stats
