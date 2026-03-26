#!/bin/bash
REPO=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
BRANCH=$(git branch --show-current)
TRACKING=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo 'no upstream')
AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo '?')
BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo '?')
DIRTY=$(git diff --name-only HEAD 2>/dev/null | head -10)
WORKTREE=$(basename $REPO)

echo "=== Session Context ==="
echo "Worktree: $WORKTREE"
echo "Branch: $BRANCH (tracking: $TRACKING)"
echo "Ahead: $AHEAD | Behind: $BEHIND"
if [ -n "$DIRTY" ]; then
  echo "Uncommitted changes:"
  echo "$DIRTY" | sed 's/^/  /'
else
  echo "Working tree: clean"
fi

echo ""
echo "--- TypeScript Status ---"
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c 'error TS' || echo 0)
echo "TS errors: $TS_ERRORS"

echo ""
echo "--- Last Session ---"
if [ -f "$REPO/.agents/last-session.md" ]; then
  head -20 "$REPO/.agents/last-session.md"
else
  echo "No previous session summary found."
fi

echo ""
echo "--- Parallel Worktrees ---"
git worktree list 2>/dev/null | grep -v "$REPO" | head -5 || echo "None"
