#!/bin/bash
FILE="${CLAUDE_TOOL_RESULT:-$1}"
REPO=$(git rev-parse --show-toplevel)
[[ "$FILE" =~ \.(ts|tsx)$ ]] || exit 0

if   [[ "$FILE" =~ packages/backend ]];  then PKG="$REPO/packages/backend"
elif [[ "$FILE" =~ packages/frontend ]]; then PKG="$REPO/packages/frontend"
elif [[ "$FILE" =~ packages/shared ]];   then PKG="$REPO/packages/shared"
else exit 0; fi

echo "=== post-write: $FILE ==="

# ── Track write count for TypeScript debounce ──
COUNTER_FILE="/tmp/post-write-counter-$(echo $PKG | md5sum | cut -c1-8 2>/dev/null || echo $PKG | md5 -q | cut -c1-8)"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# 1. Prettier format (fast — single file, always run)
cd "$REPO" && npx prettier --write "$FILE" --log-level warn 2>&1 || true
echo "Prettier: formatted"

# 2. ESLint auto-fix (fast — single file, always run)
cd "$REPO" && npx eslint "$FILE" --fix --quiet 2>&1 | head -5 || true
echo "ESLint: auto-fixed"

# 3. TypeScript check (debounced — every 3rd write per package)
if [ $((COUNT % 3)) -eq 0 ]; then
  echo "--- TypeScript (debounced check #$COUNT) ---"
  TS_OUTPUT=$(cd "$PKG" && npx tsc --noEmit 2>&1)
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c 'error TS' || echo 0)
  if [ "$TS_ERRORS" -gt 0 ]; then
    echo "FAIL: $TS_ERRORS TypeScript errors"
    echo "$TS_OUTPUT" | grep 'error TS' | head -10
  else
    echo "PASS: TypeScript clean"
  fi
else
  echo "TypeScript: skipped (next check at write #$(( (COUNT/3+1)*3 )))"
fi

# 4. Co-located unit test (only if test file exists)
BASENAME=$(basename "$FILE" .ts); BASENAME=$(basename "$BASENAME" .tsx)
TESTFILE=$(find "$PKG" -name "${BASENAME}.test.ts" -o -name "${BASENAME}.test.tsx" 2>/dev/null | head -1)
if [ -n "$TESTFILE" ]; then
  echo "--- Unit Test: $(basename $TESTFILE) ---"
  TEST_OUTPUT=$(cd "$PKG" && npx vitest run "$TESTFILE" 2>&1)
  PASS=$(echo "$TEST_OUTPUT" | grep -c 'passed' || echo 0)
  FAIL=$(echo "$TEST_OUTPUT" | grep -c 'failed' || echo 0)
  echo "Result: $PASS passed, $FAIL failed"
  [ "$FAIL" -gt 0 ] && echo "$TEST_OUTPUT" | tail -20
fi
echo "=== post-write done ==="
