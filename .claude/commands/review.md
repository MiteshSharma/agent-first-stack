# Usage: /review
code-reviewer reviews all files changed since last commit.
CRITICAL / WARNING / NOTE format with file:line.
Severity thresholds:
- 0 CRITICAL: 'CLEAN'
- 0 CRITICAL + WARNINGs: 'WARNINGS ONLY — safe to proceed'
- Any CRITICAL: 'CRITICAL — must fix'
Report only. Do not fix anything.
