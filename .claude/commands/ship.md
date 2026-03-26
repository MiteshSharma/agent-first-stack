# Usage: /ship
Run in order. Stop if any fail.

1. pnpm typecheck
2. pnpm lint
3. pnpm test
4. pnpm build
5. Update CHANGELOG.md: add entry under ## Unreleased with date
   Format: '- feat: description'  Source: ExecPlan Outcomes section
6. Archive ExecPlan: move .agents/<feature>/PLAN.md to .agents/archive/<feature>-<date>.md
7. git add -A && git commit -m 'feat: <feature-name>\n\n<ExecPlan outcomes>'
8. gh pr create --title '<feature-name>' --body '<ExecPlan outcomes section>'
Report: all steps passed / which step failed.
