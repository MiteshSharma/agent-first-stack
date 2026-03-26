# Usage: /implement <feature-name>
Read .agents/$ARGUMENTS/PLAN.md. If not found: stop, tell human to create it.

## Phase 1 — Types Contract
backend-implementer, restricted to packages/shared/src/types.ts only.
Add DTOs + request/response interfaces from ExecPlan Interfaces section.
Commit: 'types: <feature-name> contract'

## Phase 2 — Backend
backend-implementer, full access.
entity → repository → service → route.
After EACH route: append test block to .agents/smoke-tests.sh.
Fix post-write errors before proceeding to next file.
Commit: 'feat(backend): <feature-name>'

## Phase 3 — Frontend
frontend-implementer, full access.
api/client.ts method → React Query hook → component.
Fix post-write errors before proceeding to next file.
Commit: 'feat(frontend): <feature-name>'

## Phase 4 — Review (max 3 cycles)
code-reviewer reviews all files since Phase 1 commit.
Severity thresholds:
- 0 CRITICAL + any WARNING → proceed with warnings logged
- Any CRITICAL → relevant implementer fixes → reviewer re-runs
- Still CRITICAL after 3 cycles → STOP. Full report to human for decision.
- If plan has "# Known Exceptions" section, patterns listed there are not CRITICAL.

## Phase 5 — Verify
bash scripts/hooks/verify.sh
Read .agents/verify-report.md.
Exit 0: run /ship.
Exit 1: read FAIL lines, fix, run verify once more.
Still failing: STOP. Show verify-report.md to human. Do not retry again.

## Phase 6 — Ship
Run /ship.
