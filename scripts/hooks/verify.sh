#!/bin/bash
set -euo pipefail
REPO=$(git rev-parse --show-toplevel)
WORKTREE=$(basename $REPO)
WORKTREE_HASH=$(echo "$WORKTREE" | cksum | cut -f1 -d' ')
PORT=$((3000 + (WORKTREE_HASH % 1000)))
DB_PORT=$((5432 + (WORKTREE_HASH % 1000)))
PID_FILE="/tmp/agent-backend-${WORKTREE}.pid"
REPORT="$REPO/.agents/verify-report.md"
SMOKE="$REPO/.agents/smoke-tests.sh"

# Fallback: if port is in use, increment until free
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done

# ── Guaranteed cleanup on ANY exit ───────────────────────────────
cleanup() {
  if [ -f "$PID_FILE" ]; then
    kill "$(cat $PID_FILE)" 2>/dev/null || true
    wait "$(cat $PID_FILE)" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  docker compose -p "$WORKTREE" stop db redis 2>/dev/null || true
}
trap cleanup EXIT INT TERM ERR

echo "=== Verify: $WORKTREE port=$PORT ==="
echo "# Verify Report: $(date)" > "$REPORT"

# ── Preflight ─────────────────────────────────────────────────────
[ ! -f "$SMOKE" ] && echo "FAIL: no smoke-tests.sh" | tee -a "$REPORT" && exit 1
ENDPOINT_COUNT=$(grep -c 'echo "---' "$SMOKE" || echo 0)
echo "Smoke tests: $ENDPOINT_COUNT endpoints" | tee -a "$REPORT"

# ── Start services ────────────────────────────────────────────────
docker compose -p "$WORKTREE" -f $REPO/.devcontainer/docker-compose.dev.yml \
  up -d db redis 2>&1 | tail -3

# ── Wait for Postgres to be ready before starting app ─────────────
echo "Waiting for Postgres..."
for i in $(seq 1 30); do
  pg_isready -h localhost -p "$DB_PORT" -U dev > /dev/null 2>&1 && break
  sleep 1
  if [ $i -eq 30 ]; then
    echo "FAIL: Postgres not ready within 30s" | tee -a "$REPORT"
    exit 1
  fi
done
echo "Postgres ready in ${i}s"

# ── Build + start backend ─────────────────────────────────────────
cd "$REPO/packages/backend" && pnpm build 2>&1 | tail -5
PORT=$PORT \
  DATABASE_URL="postgresql://dev:dev@localhost:${DB_PORT}/appdb" \
  REDIS_URL="redis://localhost:6379" \
  node dist/index.js &
echo $! > "$PID_FILE"

# ── Wait for health ────────────────────────────────────────────────
for i in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  sleep 1
  if [ $i -eq 30 ]; then
    echo "FAIL: backend did not start within 30s" | tee -a "$REPORT"
    exit 1
  fi
done
echo "Backend started in ${i}s on port $PORT"

# ── Run smoke tests ────────────────────────────────────────────────
echo "## Smoke Tests" >> "$REPORT"
SMOKE_OUT=$(BASE_URL="http://localhost:$PORT" bash "$SMOKE" 2>&1)
echo "$SMOKE_OUT" | tee -a "$REPORT"
PASS=$(echo "$SMOKE_OUT" | grep -c '^PASS' || true)
FAIL=$(echo "$SMOKE_OUT" | grep -c '^FAIL' || true)

# ── Capture while live ─────────────────────────────────────────────
echo "## Runtime Capture" >> "$REPORT"
LOG_ERRORS=$(docker compose -p "$WORKTREE" logs db --since 120s 2>/dev/null \
  | grep -i 'error\|fatal' | head -10)
[ -n "$LOG_ERRORS" ] && echo "DB Errors:" >> "$REPORT" && echo "$LOG_ERRORS" >> "$REPORT" \
  || echo "DB Errors: none" >> "$REPORT"
curl -sf "http://localhost:$PORT/metrics" | jq '.' >> "$REPORT" 2>/dev/null || true
curl -sf "http://localhost:$PORT/health"  | jq '.memory' >> "$REPORT" 2>/dev/null || true

# ── Result ─────────────────────────────────────────────────────────
echo "## Result: $PASS passed, $FAIL failed" >> "$REPORT"
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
