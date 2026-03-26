# Usage: /fix-bug <description>

1. Reproduce the failing behavior
2. Diagnose — use log-analyzer if runtime error
3. Write a failing Vitest test
4. Fix minimal code to make test pass
5. pnpm test — all tests must pass
6. Commit: 'fix: <description>'

Rules: fix root cause not symptom. No unrelated changes. No test regressions.
