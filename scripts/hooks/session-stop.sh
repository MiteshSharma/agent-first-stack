#!/bin/bash
REPO=$(git rev-parse --show-toplevel)
OUT="$REPO/.agents/last-session.md"
cat > "$OUT" << EOF
# Last Session Summary
Date: $(date)
Branch: $(git branch --show-current)

## Git diff stat
$(git diff HEAD --stat | head -30)

## Last 10 commits
$(git log --oneline -10)

## TypeScript status
$(npx tsc --noEmit 2>&1 | grep 'error TS' | head -10 || echo 'Clean')

## Test results
$(cd $REPO && pnpm test --reporter=verbose 2>&1 | tail -20 || echo 'Tests not run this session')
EOF
echo "Session summary written to .agents/last-session.md"
