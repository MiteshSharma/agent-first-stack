AGENTIC DEVELOPMENT SYSTEM
Implementation Brief for Claude Code CLI
Node.js + TypeScript + React Monorepo with Full Agentic Workflow




1. Philosophy & Design Decisions
This document describes a system where humans write intent and agents write code. The boundary between those two things is the most important design decision in this system. Getting it wrong means either micromanaging agents (no leverage) or losing control of what gets built (no trust).

1.1 Ownership Model


1.2 Core Design Decisions
Smoke tests written during implementation, not during verify
The backend-implementer agent writes the smoke test for each endpoint immediately after implementing it. At that moment the agent has peak context — it knows the exact request shape, exact status codes, exact error cases the code handles. Writing tests later (cold start) would produce inferred tests. Writing them now produces precise ones. The verify step then runs pre-written tests deterministically — no agent judgment needed during verify.

App runs only during verify
During the code loop, all feedback comes from static checks (TypeScript, lint, unit tests via post-write hook). The app starts only in the ~60s verify window at the end. This keeps the code loop fast — every file write gets immediate static feedback, no server startup overhead.

ExecPlan is human intent, not auto-injected
Session start injects environment state only (git status, TS errors, last session summary). It does NOT auto-inject open ExecPlans. You hand the plan to the agent explicitly when starting a feature. This keeps you in control of what the agent focuses on.

DevContainer is the sandbox
The devcontainer with a network firewall script restricts outbound connections to an allowlist. This makes --dangerously-skip-permissions safe for daily work. Docker Sandbox (hypervisor isolation) is reserved for reviewing untrusted packages or running agents on sensitive changes overnight.

Code reviewer runs after both implementers complete
The code-reviewer agent is read-only (no Write or Edit tools). It runs after both backend and frontend are done and reports CRITICAL / WARNING / NOTE with file:line references. Hard cap at 3 review cycles — unresolvable issues surface to human. Severity thresholds: 0 CRITICAL + any WARNING = proceed with warnings logged. CRITICAL after 3 cycles = stop with full report for human decision.

api-designer is a phase, not an agent
There is no separate api-designer agent. The backend-implementer does a types-only pass first (touching only packages/shared/src/types.ts), commits it, then does the full implementation pass. This is enforced by the /implement command structure, not by agent roster.

TypeORM over Prisma
The project uses TypeORM. Rationale: existing team familiarity, decorator-based entity definitions, flexible QueryBuilder for complex queries. Enforcement: all DB queries go through repository classes in src/repositories/.

Fastify over Express
Fastify is the backend framework. Rationale: 2-3x faster than Express, native TypeScript support, built-in schema validation via Zod + @fastify/type-provider-zod, plugin architecture that aligns with agentic modularity, Pino logger included. Express is legacy — no reason to carry it forward for new projects.

Pino over Winston
Fastify ships with Pino as its native logger. Pino is 5x faster than Winston, outputs structured JSON by default, and has zero-config integration with Fastify. No need for a separate logging library. Never use console.log — always request.log or app.log.

React Query over SWR
React Query (TanStack Query) for server state management. Rationale: better devtools, built-in mutation support, optimistic updates, infinite queries, prefetching — all needed for production apps. SWR is simpler but less capable for complex data flows.

Vite over CRA
Create React App is deprecated. Vite is the modern standard — faster dev server (native ESM), faster builds (Rollup), native TypeScript support, and the Vitest testing framework is built on the same config.

Native fetch over Axios
Node 22 and modern browsers have native fetch. With React Query handling caching/retries/deduplication, Axios adds unnecessary bundle weight. The api/client.ts wrapper uses fetch directly.

CSS Modules over styled-components
CSS Modules are zero-runtime, co-located with components, and natively supported by Vite. styled-components adds ~12KB runtime and forces a CSS-in-JS paradigm. For Ant Design customization, use CSS Modules + AntD's ConfigProvider theming.

Redis is optional — never a blocker
Redis is used for response caching, rate limiting state, and session management when available. However, the app MUST start and function fully without Redis. All Redis-dependent code uses a graceful fallback pattern: try Redis, fall back to in-process (single-instance) behavior. The /health endpoint reports Redis connectivity status but never fails due to Redis being down. Rate limiting falls back to @fastify/rate-limit in-memory mode. Caching falls back to no-cache (direct DB reads). This means: no Redis in dev is fine, no Redis in CI is fine, Redis outage in prod degrades performance but never breaks functionality.



2. Complete File Structure
Everything listed here must exist before any product code is written. This is the day-0 commit.

2.1 Root Level
project-root/
├── CLAUDE.md                    # Project constitution — <50 lines, agent reads first
├── AGENTS.md                    # Universal agent config (fallback for non-Claude agents)
├── PLANS.md                     # ExecPlan format definition — agents reference this
├── CHANGELOG.md                 # Agents write entries here on /ship
├── .claude/                     # Claude Code config
│   ├── settings.json            # Hook registrations
│   ├── commands/                # Slash commands (.md files)
│   └── agents/                  # Specialist agent definitions (.md files)
├── .agents/                     # Runtime state — partially gitignored
│   ├── [feature-name]/PLAN.md   # One per active feature (human-written)
│   ├── smoke-tests.sh           # Written by agent during implementation
│   ├── verify-report.md         # Written by verify hook
│   ├── last-session.md          # Written by stop hook
│   └── archive/                 # Completed plans
├── .devcontainer/               # Container definition
│   ├── devcontainer.json
│   ├── docker-compose.dev.yml
│   ├── Dockerfile
│   └── init-firewall.sh
├── scripts/
│   └── hooks/                   # Hook shell scripts
│       ├── session-start.sh
│       ├── pre-bash.sh
│       ├── post-write.sh
│       ├── session-stop.sh
│       └── verify.sh
├── packages/
│   ├── backend/
│   ├── frontend/
│   └── shared/
├── .mcp.json                    # MCP server registrations
├── .gitignore
├── eslint.config.js             # Flat config (ESLint 9)
├── .prettierrc                  # Prettier config
├── pnpm-workspace.yaml
├── turbo.json
└── package.json

2.2 Backend Package
packages/backend/
├── AGENTS.md                    # Package-level agent rules
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Entry point — starts Fastify, registers plugins
│   ├── app.ts                   # App factory (testable without starting server)
│   ├── plugins/                 # Fastify plugins (auth, cors, rate-limit, swagger)
│   │   ├── auth.ts              # @fastify/jwt + auth decorators
│   │   ├── cors.ts              # @fastify/cors config
│   │   ├── rate-limit.ts        # @fastify/rate-limit config (in-memory fallback)
│   │   ├── swagger.ts           # @fastify/swagger + zod schema integration
│   │   └── redis.ts             # Redis connection plugin (ioredis) — optional
│   ├── routes/                  # Thin: validate → call service → respond
│   │   ├── index.ts             # Registers all route plugins
│   │   ├── health.ts            # GET /health, GET /metrics
│   │   └── [feature].ts         # One file per resource group
│   ├── services/                # ALL business logic lives here
│   │   └── [feature].service.ts
│   ├── repositories/            # ALL TypeORM queries live here
│   │   └── [feature].repository.ts
│   ├── entities/                # TypeORM entity definitions
│   │   └── [Entity].ts
│   ├── middleware/
│   │   ├── error-handler.ts     # Centralized error handling
│   │   └── request-context.ts   # Request-scoped context (correlation IDs)
│   ├── lib/
│   │   ├── encryption.ts        # AES-256-GCM credential encryption
│   │   └── cache.ts             # Redis cache helpers with no-op fallback
│   └── types/                   # Backend-only types (not in shared)
├── migrations/                  # TypeORM migration files
│   └── [timestamp]-[name].ts
└── __tests__/                   # Co-located Vitest tests mirror src/ structure

2.3 Frontend Package
packages/frontend/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   └── client.ts            # ALL fetch calls in the entire app — nowhere else
│   ├── hooks/                   # React Query hooks (use[Resource] naming)
│   │   └── use[Resource].ts
│   ├── store/                   # Zustand — UI state only, NOT server state
│   │   ├── index.ts
│   │   └── [feature].slice.ts
│   ├── components/              # Reusable, no page context
│   │   └── [Component]/
│   │       ├── index.tsx
│   │       ├── [Component].module.css   # CSS Modules for component styles
│   │       └── [Component].test.tsx
│   ├── pages/                   # One per route, thin orchestrators
│   │   └── [Page]/
│   │       ├── index.tsx
│   │       ├── [Page].module.css
│   │       └── [Page].test.tsx
│   └── e2e/                     # Playwright tests
│       └── [feature].spec.ts
└── index.html

2.4 Shared Package
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    └── types.ts                 # Single source of truth for all API contracts
                                 # DTOs, request/response interfaces
                                 # Both backend and frontend import from here



3. CLAUDE.md — Project Constitution
This is the first file the agent reads in every session. Keep it under 50 lines. Every rule here must be a hard constraint, not a preference. Preferences belong in agent definitions.

# Project: [Your Project Name]

## Stack
Backend: Node.js 22 + Fastify + TypeORM + PostgreSQL 17 + Redis (optional) + Pino
Frontend: React 19 + Vite + TypeScript + Ant Design + Zustand + React Query
Monorepo: pnpm workspaces + Turborepo
Tests: Vitest (unit) + Playwright (E2E)
Validation: Zod (shared between backend and frontend)
API Docs: @fastify/swagger (auto-generated from Zod schemas)

## Hard Rules — Never Violate
1. API contracts live ONLY in packages/shared/src/types.ts
2. All fetch calls live ONLY in packages/frontend/src/api/client.ts
3. Business logic lives ONLY in services/ — never in route handlers
4. All DB queries live ONLY in repositories/ — never in services directly
5. Frontend NEVER imports from backend packages
6. Routes are thin: parse input → call service → return result
7. Services call repositories only — no TypeORM in services
8. Styles use CSS Modules (.module.css) — no inline styles, no styled-components
9. Server state in React Query — UI state in Zustand — never mix
10. Redis is OPTIONAL — all Redis code must have a no-op/in-memory fallback

## Implementation Order (always)
1. Add types to packages/shared/src/types.ts (commit)
2. Implement repository → service → route (backend)
3. Add method to api/client.ts → React Query hook → component (frontend)

## TypeORM Rules
- Entities in src/entities/ with decorators
- Queries ONLY through repository classes in src/repositories/
- No raw SQL in services
- Migrations are additive — never modify existing migration files

## Endpoints Required
GET /health   → { status, database, redis, uptime, responseTime, memory }
GET /metrics  → { database counts, process info, cache stats }

## Commit Format
feat: | fix: | types: | test: | chore: | docs: | refactor:

## Before Asking a Question
Read: PLANS.md, .agents/[feature]/PLAN.md, existing similar files
Resolve ambiguity in Decision Log section of the plan. Do not ask.



4. DevContainer
The devcontainer is both the development environment and the agent sandbox. The network firewall is what makes it safe to run Claude Code with --dangerously-skip-permissions. Without the firewall, that flag is a significant risk. With it, it is safe for daily work.

4.1 devcontainer.json
{
  "name": "[Project] Dev",
  "dockerComposeFile": "docker-compose.dev.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "mounts": [
    "source=claude-config,target=/root/.claude,type=volume",
    "source=claude-json,target=/root/.claude.json,type=volume"
  ],
  "postStartCommand": "bash .devcontainer/init-firewall.sh",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next"
      ]
    }
  }
}

4.2 docker-compose.dev.yml
version: '3.9'
services:
  app:
    build: { context: .., dockerfile: .devcontainer/Dockerfile }
    volumes:
      - ..:/workspace:cached
      - node_modules:/workspace/node_modules
    ports: ["3001:3001", "5173:5173"]
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://dev:dev@db:5432/appdb
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]
    command: sleep infinity

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: appdb
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

volumes:
  node_modules:
  postgres_data:
  redis_data:
  claude-config:
  claude-json:

4.3 Dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Install tools
RUN apt-get update && apt-get install -y \
    postgresql-client redis-tools jq ripgrep iptables iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm + global tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g turbo typescript tsx @anthropic-ai/claude-code

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

WORKDIR /workspace

4.4 init-firewall.sh — Network Allowlist
This script runs on container start via postStartCommand. It blocks all outbound by default, then opens only required domains. This is what makes --dangerously-skip-permissions safe.

#!/bin/bash
# Runs as root inside devcontainer

# Flush existing rules
iptables -F OUTPUT
iptables -F FORWARD

# Allow loopback and established connections
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (required for name resolution)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allowlisted domains — resolve and allow by IP
ALLOWED_DOMAINS=(
  "registry.npmjs.org"        # npm packages
  "github.com"                # git operations
  "api.anthropic.com"         # Claude API
  "cdn.jsdelivr.net"          # CDN resources
  "api.yourdomain.com"        # Your API — change this
)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  for ip in $(dig +short "$domain" A); do
    iptables -A OUTPUT -d "$ip" -j ACCEPT
  done
done

# Allow internal Docker network (db + redis containers)
iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT

# Block everything else
iptables -A OUTPUT -j DROP
echo "Firewall active. Allowed: ${ALLOWED_DOMAINS[*]}"



5. Hooks — Lifecycle Quality Gates
Hooks are shell scripts that fire at lifecycle events. They are deterministic — not prompts, not suggestions. They block, enforce, and report. The agent cannot skip them.

5.1 .claude/settings.json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "bash scripts/hooks/session-start.sh" }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "bash scripts/hooks/pre-bash.sh" }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "bash scripts/hooks/post-write.sh", "timeout": 60 }]
    }],
    "Stop": [{
      "hooks": [{ "type": "command", "command": "bash scripts/hooks/session-stop.sh" }]
    }]
  }
}

5.2 session-start.sh
Injects environment state at session start. Does NOT inject ExecPlans — those are provided explicitly by the human.

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

5.3 pre-bash.sh — Block Unsafe Commands
Uses actual branch detection instead of regex string matching on commands to avoid false positives.

#!/bin/bash
CMD="${CLAUDE_TOOL_INPUT:-$*}"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")

block() { echo "BLOCKED: $1"; echo "Reason: $2"; exit 1; }
warn()  { echo "WARNING: $1 — $2"; }

# ── Git safety ──
[[ "$CMD" =~ git.*push.*--force ]]        && block "force push" "Use --force-with-lease, ask human"
[[ "$CMD" =~ git.*--no-verify ]]           && block "--no-verify" "Never bypass hooks"

# Branch-based checks — detect actual branch, not string in command
if [[ "$CMD" =~ git.*commit ]] && [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  block "commit to main/master" "All work on feature branches"
fi
if [[ "$CMD" =~ git.*push ]] && [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  block "push to main/master" "PRs only — never direct push"
fi

[[ "$CMD" =~ git.*commit.*--amend ]]       && block "amend" "Never amend already-pushed commits"

# ── Filesystem safety ──
if [[ "$CMD" =~ rm.*-rf ]]; then
  SAFE_DIRS="node_modules|dist|build|coverage|\.worktrees|\.next|\.turbo"
  [[ "$CMD" =~ ($SAFE_DIRS) ]] || block "rm -rf outside safe dirs" "Only safe in: node_modules, dist, build, coverage"
fi
[[ "$CMD" =~ >\.env ]] && block "write .env" "Use .env.example, never write .env directly"

# ── Database safety ──
if [[ "$CMD" =~ DROP.*(DATABASE|TABLE) ]]; then
  [[ "$CMD" =~ test|_test|testing ]] || block "DROP outside test" "Destructive DB ops only in test databases"
fi
[[ "$CMD" =~ migration.*reset ]] && warn "migration reset" "This destroys data — are you in dev?"

# ── Process safety ──
[[ "$CMD" =~ killall.*node ]] && block "killall node" "Use kill \$PID with specific PID"
[[ "$CMD" =~ kill.*-9.*1 ]]   && block "kill process 1" "Never kill init"

# ── Supply chain safety ──
[[ "$CMD" =~ curl.*\|.*(bash|sh) ]] && block "curl | bash" "Supply chain risk"
[[ "$CMD" =~ wget.*\|.*(bash|sh) ]] && block "wget | bash"  "Supply chain risk"

# ── Global installs (warn only) ──
[[ "$CMD" =~ npm.*install.*-g ]] && warn "npm install -g" "Prefer local installation"

exit 0

5.4 post-write.sh — Static Quality Gate
Fires after every file write or edit. Runs Prettier + ESLint on every write (fast, single-file). TypeScript full check is debounced — runs only every 3rd write to avoid 50 full compilations in a session. Unit tests run only when a co-located test file exists.

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
COUNTER_FILE="/tmp/post-write-counter-$(echo $PKG | md5sum | cut -c1-8)"
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

5.5 session-stop.sh — Session Summary
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



6. Verify Script — Deterministic Integration Test
The verify script runs the pre-written smoke tests. No agent judgment. It starts the app, runs the script, captures output, stops the app. The agent reads the report and decides what to do.

6.1 Worktree-Safe Port Assignment
When running multiple Claude Code sessions with git worktrees in parallel, each worktree needs its own port. Uses a larger port range (1000 instead of 100) to avoid birthday-problem collisions, plus a fallback check for port availability.

# Port assignment (in verify.sh and smoke-tests.sh)
WORKTREE=$(basename $(git rev-parse --show-toplevel))
WORKTREE_HASH=$(echo "$WORKTREE" | cksum | cut -f1 -d' ')
PORT=$((3000 + (WORKTREE_HASH % 1000)))    # Deterministic: 3000-3999
DB_PORT=$((5432 + (WORKTREE_HASH % 1000))) # Deterministic: 5432-6431

# Fallback: if port is in use, increment until free
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done

# Docker compose project is also namespaced
docker compose -p "$WORKTREE" up -d db redis

6.2 scripts/hooks/verify.sh
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

6.3 Smoke Test Format (Written by backend-implementer)
After implementing each route, the backend-implementer appends this pattern to .agents/smoke-tests.sh. The BASE_URL is injected by verify.sh — tests never hardcode a port.

#!/bin/bash
# .agents/smoke-tests.sh — written by backend-implementer, run by verify.sh
BASE="${BASE_URL:-http://localhost:3001}"
TOKEN="${TEST_JWT:-test-token}"
FAIL_COUNT=0

check() {
  local desc=$1 expected=$2 actual=$3
  [ "$actual" = "$expected" ] && echo "PASS: $desc" \
    || { echo "FAIL: $desc — expected $expected got $actual"; FAIL_COUNT=$((FAIL_COUNT+1)); }
}

# ─── POST /api/users ───────────────────────────────────────────────
echo "--- POST /api/users ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/users" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}')
check "POST /api/users 201" "201" "$STATUS"

BODY=$(curl -sf -X POST "$BASE/api/users" -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","name":"Test 2"}')
echo "$BODY" | jq -e '.id' > /dev/null 2>&1 && echo "PASS: has id" \
  || { echo "FAIL: missing id"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# Error case — always include at least one per endpoint
STATUS_BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/users" \
  -H "Content-Type: application/json" -d '{}')
check "POST /api/users validates input" "422" "$STATUS_BAD"

exit $FAIL_COUNT



7. Agent Definitions
Each agent is a markdown file in .claude/agents/. The tool restriction in each definition is enforced by Claude Code. A reviewer with no Write tool cannot accidentally modify code.

7.1 backend-implementer.md
---
name: backend-implementer
description: Implements Fastify routes, services, repositories, TypeORM entities.
tools: Read, Write, Edit, Bash, Glob, Grep
---
Read CLAUDE.md first. Then read an existing similar route/service/repository.

## Order of implementation (always)
entity (if new) → repository → service → route → smoke test block

## Architecture rules
- Routes: parse input → call service method → return result. NOTHING else.
- Services: business logic only. Call repositories for data access.
- Repositories: TypeORM queries only. No business logic.
- NEVER use TypeORM EntityManager or getRepository() in services.

## Fastify patterns
- Routes use plugin pattern: export default async function(app: FastifyInstance)
- Request validation via Zod schemas + @fastify/type-provider-zod
- Response serialization via Zod schemas
- use app.decorateRequest() for request-scoped data (auth user, tenant)
- Pino logger via request.log or app.log — NEVER console.log

## Redis caching — always optional
- All cache operations MUST use lib/cache.ts which provides a no-op fallback
- Pattern: cache.get(key) ?? repo.find() then cache.set(key, result, ttl)
- Invalidate on writes: cache.del(key) after save/update/delete
- If Redis is unavailable, cache.get() returns null, cache.set() and cache.del() are no-ops
- NEVER import ioredis directly in repositories — always go through lib/cache.ts

## Post-write hook
Prettier + ESLint run on every write. TypeScript runs every 3rd write.
If TypeScript errors are reported, fix them before next file.
Do not accumulate errors.

## Smoke test (append to .agents/smoke-tests.sh after each route)
- Happy path: correct input → expected status → response shape check
- Error case: missing/invalid input → expected error code (422/400/401)
- BASE_URL is injected by verify.sh — never hardcode port

## Required endpoints
GET /health  → { status, database, redis, uptime, responseTime, memory }
  - redis field: "connected" | "unavailable" — never "error", app works without it
GET /metrics → { database: counts, process: info, cache: { hits, misses, keys } }
  - cache stats: report zeros if Redis unavailable

7.2 frontend-implementer.md
---
name: frontend-implementer
description: Implements React components, hooks, and Zustand store slices.
tools: Read, Write, Edit, Bash, Glob, Grep
---
Read CLAUDE.md first. Read packages/shared/src/types.ts for existing types.

## Order of implementation
api/client.ts method → React Query hook → Zustand slice (if UI state) → component

## Hard rules
- NEVER call fetch() outside packages/frontend/src/api/client.ts
- NEVER import from packages/backend
- React Query = server state. Zustand = UI state only. Never mix.
- Use native fetch in api/client.ts — no Axios

## API client pattern
- Base URL: import.meta.env.VITE_API_URL
- Auth token from localStorage injected in headers
- Parse response.json() with Zod for type safety
- Throw on non-2xx with structured error

## Ant Design + CSS Modules
- AntD components as baseline: Table, Form, Modal, Button, Space
- Override styles via [Component].module.css — never inline styles
- Theme via AntD ConfigProvider — no styled-components
- Form validation via AntD Form rules

## Component structure
- index.tsx + [Component].module.css + [Component].test.tsx co-located
- Add data-testid to interactive elements for Playwright

## Post-write hook
Prettier + ESLint run on every write. TypeScript runs every 3rd write.
If TypeScript errors are reported, fix them before next file.

7.3 code-reviewer.md
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
- TypeORM query in a service (use repository)
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

7.4 test-writer.md
---
name: test-writer
description: Writes Vitest unit and integration tests. Never touches production code.
tools: Read, Write, Edit, Bash, Glob, Grep
---
You write tests only. Never modify production code.

## Test placement
src/routes/users.ts → __tests__/routes/users.test.ts  (or .test.ts suffix)

## Patterns
- Table-driven for multiple input/output combinations
- Mock TypeORM: const mockRepo = { findOne: vi.fn(), save: vi.fn(), find: vi.fn() }
  as unknown as Repository<Entity>
- Test service layer separately from route layer
- One describe block per exported function
- Run vitest before marking done — tests must pass

7.5 e2e-test-writer.md
---
name: e2e-test-writer
description: Writes Playwright E2E tests. Inspects real DOM before writing selectors.
tools: Read, Write, Edit, Bash, Glob, Grep
---
NEVER guess selectors.

## Process
1. Ensure app is running (pnpm dev)
2. Use Playwright MCP to navigate to the page
3. Read actual DOM to find stable locators
4. Write tests using only: getByRole, getByLabel, getByText, getByTestId
5. Run tests — must pass before done

## Selector priority
1. getByRole  2. getByLabel  3. getByTestId  4. getByText (static only)
NEVER CSS selectors, XPath, nth-child

## Coverage per test
Happy path + error state + loading state

7.6 db-migrator.md
---
name: db-migrator
description: Handles TypeORM entity changes and migrations safely.
tools: Read, Write, Edit, Bash, Glob
---

## Rules
- ADDITIVE only. Never remove a column or table.
- Never modify an existing migration file.
- Always show SQL before running it.

## Process
1. Modify entity
2. typeorm migration:generate src/migrations/MigrationName
3. Show generated SQL to human — wait for confirmation
4. typeorm migration:run
5. typeorm schema:log — must show no pending changes
6. Commit entity + migration together

7.7 log-analyzer.md
---
name: log-analyzer
description: Reads logs, verify reports, metrics to diagnose runtime issues. No writes.
tools: Read, Bash, Glob, Grep
---
You diagnose. You do not write code.

## When you run
- After verify.sh exits 1 and the failure is ambiguous
- During /fix-bug investigation
- When verify-report shows unexpected metrics

## Inputs
- .agents/verify-report.md
- docker compose logs (db + redis)
- Application Pino JSON log files
- GET /metrics (includes cache stats)
- GET /health (includes redis status)

## Report format
Root cause: [file:line if identifiable]
Pattern: [N+1 / missing index / unhandled promise / cache miss storm / etc]
Evidence: [specific log lines or metric values]
Fix: [specific action for implementer]

## Patterns
- N+1: repository inside forEach/map
- Memory leak: heap growing with no release
- Unhandled rejection: 'UnhandledPromiseRejection' in logs
- Missing await: sync response before async completes
- Connection pool exhaustion: too many DB connections
- Cache miss storm: high miss rate on hot keys — check TTL and warming
- Redis timeout: check REDIS_URL and container health — app should still work without Redis



8. Slash Commands
Commands live in .claude/commands/. They are the entry points for all work. The human types /command-name and the agent executes the defined workflow.

8.1 /implement — Main Orchestrator
# .claude/commands/implement.md   Usage: /implement <feature-name>
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
- Still CRITICAL after 3 cycles → STOP. Full report to human for decision (may be false positive).
- If plan has "# Known Exceptions" section, patterns listed there are not CRITICAL.

## Phase 5 — Verify
bash scripts/hooks/verify.sh
Read .agents/verify-report.md.
Exit 0: run /ship.
Exit 1: read FAIL lines, fix, run verify once more.
Still failing: STOP. Show verify-report.md to human. Do not retry again.

## Phase 6 — Ship
Run /ship.

8.2 /ship — Pre-PR Checklist
# .claude/commands/ship.md   Usage: /ship
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

8.3 /review
# .claude/commands/review.md   Usage: /review
code-reviewer reviews all files changed since last commit.
CRITICAL / WARNING / NOTE format with file:line.
Severity thresholds:
- 0 CRITICAL: 'CLEAN'
- 0 CRITICAL + WARNINGs: 'WARNINGS ONLY — safe to proceed'
- Any CRITICAL: 'CRITICAL — must fix'
Report only. Do not fix anything.

8.4 /fix-bug
# .claude/commands/fix-bug.md   Usage: /fix-bug <description>

1. Reproduce the failing behavior
2. Diagnose — use log-analyzer if runtime error
3. Write a failing Vitest test
4. Fix minimal code to make test pass
5. pnpm test — all tests must pass
6. Commit: 'fix: <description>'

Rules: fix root cause not symptom. No unrelated changes. No test regressions.

8.5 /check-health
# .claude/commands/check-health.md   Usage: /check-health
No code changes. Report only.

1. pnpm typecheck  2. pnpm test  3. pnpm lint  4. pnpm build
5. git: branch, uncommitted, ahead/behind
6. Active ExecPlans: list .agents/*/PLAN.md

If backend running:
7. curl /health — status, database, redis connectivity
8. curl /metrics — counts, process info, cache stats

8.6 /write-tests
# .claude/commands/write-tests.md   Usage: /write-tests <file-path>
test-writer agent writes tests for $ARGUMENTS.
Read file → identify exports → write co-located test → vitest run → must pass.

8.7 /db-migrate
# .claude/commands/db-migrate.md   Usage: /db-migrate <description>
db-migrator agent.

1. Read entities. 2. Modify entity (additive). 3. Generate migration.
4. STOP — show SQL to human. 5. Wait for confirmation.
6. migration:run. 7. schema:log — no pending. 8. Commit both files.

8.8 /write-e2e
# .claude/commands/write-e2e.md   Usage: /write-e2e <feature>
e2e-test-writer agent.

1. Ensure app running (pnpm dev).
2. Playwright MCP to navigate.
3. Read real DOM — never guess.
4. Write to packages/frontend/src/e2e/<feature>.spec.ts.
5. playwright test — must pass.



9. ExecPlan Format (PLANS.md)
Put this content in PLANS.md at the repo root. Agents reference this when reading plans.

# ExecPlan Format

An ExecPlan is a single markdown file at .agents/<feature-name>/PLAN.md.
Written by human before implementation begins.
Agent reads, executes, and updates Progress inline.
Must be restartable — if context resets, agent resumes from plan alone.

# [Feature Name]

## Purpose
What this enables. Why it matters. What the user can do after this ships.

## Context
Files to read before starting:
- packages/shared/src/types.ts
- packages/backend/src/routes/[similar-route].ts
- packages/backend/src/services/[similar-service].ts

## Milestones
### M1: [Name]
Goal: ...   Work: ...   Result: ...   Verify: ...

## Interfaces
// In packages/shared/src/types.ts
export interface CreateUserRequest { ... }
export interface UserResponse { ... }
// Backend route: POST /api/users — body: CreateUserRequest → UserResponse

## Verification Scope
- POST /api/users — happy path + missing fields
- GET /api/users/:id — happy path + not found

## Known Exceptions
Patterns the code-reviewer should NOT flag as CRITICAL for this feature.
Example: "type: any on legacy adapter return — will be typed in follow-up"

## Progress
- [ ] Types contract committed
- [ ] Repository implemented
- [ ] Service implemented
- [ ] Route implemented
- [ ] smoke-tests.sh written
- [ ] Frontend client method added
- [ ] React Query hook implemented
- [ ] Component implemented
- [ ] Code review clean
- [ ] Verify passed

## Decision Log
Agent: record any ambiguity resolved here with date and rationale.

## Rollback
Each phase commits separately. To revert:
- Frontend only: git revert <phase-3-commit>
- Backend only: git revert <phase-2-commit>
- Full revert: git revert <phase-1-commit>..<latest>

## Outcomes
Filled when complete. Used for CHANGELOG and PR description.



10. Monorepo Config Files

10.1 pnpm-workspace.yaml
packages:
  - 'packages/*'

10.2 turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test":      { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "lint":      {},
    "dev":       { "cache": false, "persistent": true }
  }
}

10.3 Root package.json
{
  "name": "@project/root",
  "private": true,
  "scripts": {
    "dev": "turbo dev", "build": "turbo build",
    "typecheck": "turbo typecheck", "test": "turbo test", "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest", "typescript": "^5.7.0",
    "prettier": "^3.4.0", "eslint": "^9.17.0"
  }
}

10.4 Backend package.json
{
  "name": "@project/backend",
  "dependencies": {
    "fastify": "^5.2.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.2.0",
    "@fastify/swagger": "^9.4.0",
    "@fastify/swagger-ui": "^5.2.0",
    "@fastify/type-provider-zod": "^4.0.0",
    "typeorm": "^0.3.21",
    "reflect-metadata": "^0.2.2",
    "pg": "^8.13.0",
    "ioredis": "^5.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0", "@types/node": "^22.10.0"
  },
  "scripts": {
    "build": "tsc", "typecheck": "tsc --noEmit",
    "test": "vitest run", "dev": "tsx watch src/index.ts"
  }
}

10.5 Backend tsconfig.json
TypeORM requires experimentalDecorators and emitDecoratorMetadata. Also add import 'reflect-metadata' as the first line of src/index.ts.

{
  "compilerOptions": {
    "target": "ES2022", "module": "commonjs", "lib": ["ES2022"],
    "outDir": "./dist", "rootDir": "./src",
    "strict": true, "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true, "skipLibCheck": true,
    "paths": { "@project/shared": ["../shared/src"] }
  },
  "include": ["src/**/*"], "exclude": ["node_modules", "dist"],
  "references": [{ "path": "../shared" }]
}

10.6 Frontend package.json
{
  "name": "@project/frontend",
  "dependencies": {
    "react": "^19.1.0", "react-dom": "^19.1.0",
    "antd": "^5.23.0", "@ant-design/icons": "^5.6.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-query-devtools": "^5.62.0",
    "react-router-dom": "^7.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vite": "^6.0.0", "@vitejs/plugin-react": "^4.3.0",
    "@playwright/test": "^1.50.0", "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0", "jsdom": "^26.0.0"
  },
  "scripts": {
    "dev": "vite", "build": "tsc && vite build",
    "typecheck": "tsc --noEmit", "test": "vitest run",
    "test:e2e": "playwright test"
  }
}

10.7 Shared package.json and tsconfig.json
packages/shared/package.json:
{
  "name": "@project/shared",
  "main": "./dist/types.js",
  "types": "./dist/types.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}

packages/shared/tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

10.8 ESLint and Prettier configs
eslint.config.js (flat config, ESLint 9):
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  }
);

.prettierrc:
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}

10.9 .mcp.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}



11. Required Endpoints
These endpoints must exist from day 0. The verify hook polls /health to know the app is ready. Agents use /metrics to detect problems.

11.1 GET /health
{
  "status": "ok",
  "database": "connected",       // or 'error: <message>'
  "redis": "connected",          // or 'unavailable' — never causes health to fail
  "uptime": 142.3,               // process.uptime() in seconds
  "responseTime": 12,            // ms to generate this response
  "memory": {
    "heapUsed": 45.2,            // MB
    "heapTotal": 67.1,           // MB
    "rss": 89.4                  // MB (resident set size)
  }
}

Note: redis "unavailable" is NOT an error state. The app is healthy without Redis. Only database connectivity affects overall health status.

11.2 GET /metrics
{
  "database": {
    "users": 142                 // one count per entity
  },
  "cache": {
    "hits": 1234,                // 0 if Redis unavailable
    "misses": 56,                // 0 if Redis unavailable
    "keys": 89                   // 0 if Redis unavailable
  },
  "process": {
    "pid": 1234,
    "uptime": 142.3,
    "nodeVersion": "v22.0.0"
  }
}



12. Parallel Work with Git Worktrees
Git worktrees let you run multiple Claude Code sessions simultaneously on different features. Each worktree gets its own port, its own Docker Compose project, its own PID file. No interference.

12.1 Setting up a worktree
# From project root
git worktree add .worktrees/feature-name -b feature/feature-name

# Open new terminal in that worktree
cd .worktrees/feature-name

# Start a new Claude Code session
claude --dangerously-skip-permissions

# session-start hook shows which worktree you're in
# verify.sh auto-assigns a unique port based on worktree name
# docker compose is namespaced — no container collisions

12.2 .gitignore
# Worktrees — local only
.worktrees/

# Agent runtime state
.agents/smoke-tests.sh
.agents/verify-report.md
.agents/last-session.md

# Keep these in git
!.agents/archive/
!.agents/*/PLAN.md

# Build outputs
dist/  build/  .next/  .turbo/  coverage/  node_modules/



13. Day-0 Execution Order for Claude Code
Run this in order. Everything before Phase C is scaffolding. Phase C is when you hand off to the agent for the first time.

Phase A: Bootstrap (human, ~1 hour)
Create repo, init pnpm workspace, add turbo
Create packages/backend, packages/frontend, packages/shared with package.json files
Add root tsconfig.json, turbo.json, .gitignore, pnpm-workspace.yaml
Add eslint.config.js and .prettierrc at root
Add packages/shared/tsconfig.json with composite: true + declaration: true
Create .devcontainer/ with all 4 files (devcontainer.json, docker-compose.dev.yml, Dockerfile, init-firewall.sh)
Open repo in DevContainer — verify container starts, Postgres 17 + Redis accessible
Create .claude/settings.json with hook registrations
Create scripts/hooks/ with all 5 scripts (session-start, pre-bash, post-write, session-stop, verify)
chmod +x scripts/hooks/*.sh

Phase B: Agent constitution (human, ~30 min)
Write CLAUDE.md — fill in project name and your API domain (section 3 template)
Write PLANS.md — use ExecPlan template from section 9
Create .claude/commands/ with all 8 command files
Create .claude/agents/ with all 7 agent files
Create .mcp.json
git commit -m 'chore: agent-first scaffolding'

Phase C: First agent session (agent-driven)
Open Claude Code: claude --dangerously-skip-permissions
Verify session-start.sh output is injected (git status, TS errors)
Tell agent: 'Implement the health and metrics endpoints. No plan file needed — this is the foundation.'
Agent implements GET /health (with Redis optional check) and GET /metrics following CLAUDE.md
Verify post-write hooks fire after each file write (Prettier + ESLint every time, TypeScript every 3rd)
Run /check-health — should show all green
Run: bash scripts/hooks/verify.sh — verify it starts app (Postgres + Redis), runs basic check, stops cleanly

Phase D: First feature (full workflow)
Human writes .agents/first-feature/PLAN.md using the ExecPlan template (include Known Exceptions and Rollback sections)
Open Claude Code session
Type: /implement first-feature
Agent executes phases 1-6 from the command definition
Review the PR the agent opens
Merge — the system is working



End of implementation brief. All code shown is production-ready and immediately usable.
