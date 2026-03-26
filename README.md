# Node App — AI-First Full-Stack Application

A production-ready full-stack monorepo built for **AI-native development**. Humans write intent (plans, PRDs), agents write code. The entire codebase — from architecture rules to lifecycle hooks to slash commands — is designed so that an LLM can implement features end-to-end with minimal human intervention.

This is not a traditional starter kit. It is a **development system** where Claude Code (or any capable coding agent) is the primary developer, and you are the architect, reviewer, and decision-maker.

## Why This Exists

Most codebases fight AI agents. Conventions are implicit, architecture decisions are scattered across Slack threads, and there's no machine-readable boundary between "what to build" and "how to build it". Every agent session starts from scratch.

This project solves that. Every rule is in a file the agent reads. Every workflow is a command the agent executes. Every quality gate is a hook the agent cannot skip.

**The result**: You write a one-page plan. You type `/implement feature-name`. The agent writes types, backend, frontend, tests, runs review, verifies integration, and opens a PR. You review the PR.

## Tech Stack

### Why These Choices

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js 22 | LTS with native fetch, stable ES modules, largest package ecosystem |
| **Backend** | Fastify 5 | 2-3x faster than Express, native TypeScript, built-in schema validation, Pino logging included |
| **ORM** | TypeORM | Decorator-based entities, flexible QueryBuilder, migration system |
| **Database** | PostgreSQL 17 | Industry standard, JSONB, full-text search, rock-solid ACID |
| **Cache** | Redis 7 (optional) | Response caching + rate limit state. App works without it — all Redis code has no-op fallbacks |
| **Frontend** | React 19 + Vite 6 | Native ESM dev server, fast HMR, Rollup production builds |
| **UI Library** | Ant Design 5 | Enterprise-grade components, built-in form validation, consistent design system |
| **Server State** | TanStack React Query 5 | Caching, mutations, optimistic updates, devtools — handles all server data |
| **UI State** | Zustand 5 | Minimal, no boilerplate, only for client-side state (sidebar, modals, filters) |
| **Validation** | Zod | Shared between backend and frontend — single source of truth for API contracts |
| **Monorepo** | pnpm + Turborepo | Fast installs, workspace linking, parallel task execution with caching |
| **Tests** | Vitest + Playwright | Vitest for unit/integration (same config as Vite), Playwright for E2E |
| **Linting** | ESLint 9 + Prettier | Flat config, strict rules (`no-explicit-any: error`, `no-console: error`) |
| **API Docs** | @fastify/swagger | Auto-generated OpenAPI from Zod schemas — no manual docs |

### Architecture

```
packages/
├── shared/     # Zod schemas + TypeScript interfaces (single source of truth)
├── backend/    # Fastify API: routes → services → repositories → TypeORM
└── frontend/   # React SPA: API client → React Query hooks → components
```

**Hard rules enforced by linters and code review agent:**
- API contracts live ONLY in `packages/shared/src/types.ts`
- All fetch calls live ONLY in `packages/frontend/src/api/client.ts`
- Business logic ONLY in services — routes are thin (parse → call → respond)
- DB queries ONLY in repositories — services never touch TypeORM directly
- CSS Modules only — no inline styles, no styled-components
- Redis is optional — every cache operation has a no-op fallback

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 9.15
- PostgreSQL 17 (local or Docker)
- Docker (optional, for containerized setup)

### Option 1: Local Development

```bash
# Clone and install
git clone <repo-url> && cd node-app
pnpm install

# Ensure PostgreSQL is running with database "prod_data"
# Default credentials: postgres/postgres on localhost:5432

# Start both backend (port 3001) and frontend (port 5173)
pnpm dev
```

The backend connects to PostgreSQL and auto-creates tables in development mode (`synchronize: true`). Redis is optional — the app starts and works fully without it.

### Option 2: Docker — Development (hot-reload)

Everything runs in Docker with source code mounted for live editing:

```bash
pnpm docker:dev
```

This starts PostgreSQL, Redis, and the app with `pnpm dev` inside the container. Backend on port 3001, frontend on port 5173, both with hot-reload.

```bash
# Custom ports if defaults conflict
BACKEND_PORT=3002 FRONTEND_PORT=5174 pnpm docker:dev

# Stop
pnpm docker:dev:down
```

### Option 3: Docker — Production

Built images, nginx frontend, TypeORM migrations on startup:

```bash
# Build production images
JWT_SECRET=your-secret-min-32-chars pnpm docker:prod:build

# Start (runs migrations automatically on first boot)
JWT_SECRET=your-secret-min-32-chars pnpm docker:prod

# Frontend served at http://localhost:80 (nginx + reverse proxy)
# Backend API at http://localhost:3001
# Swagger docs at http://localhost:3001/docs
```

```bash
# Stop
pnpm docker:prod:down

# Tear down everything including database volumes
pnpm docker:reset
```

### All Scripts

| Script | What it does |
|--------|-------------|
| `pnpm dev` | Start backend + frontend with hot-reload |
| `pnpm build` | Build all packages (shared → backend → frontend) |
| `pnpm typecheck` | TypeScript strict check across all packages |
| `pnpm test` | Run all Vitest tests |
| `pnpm lint` | ESLint + auto-fix across all packages |
| `pnpm docker:dev` | Docker development stack (hot-reload) |
| `pnpm docker:prod` | Docker production stack (nginx + migrations) |
| `pnpm docker:prod:build` | Build production Docker images |
| `pnpm docker:logs` | Follow logs from all Docker services |
| `pnpm docker:reset` | Tear down Docker + destroy volumes |

## AI-Native Development Workflow

This is where this project differs from every other starter. The entire development lifecycle is designed for LLM agents.

### How It Works

```
You (architect)          Claude Code (developer)           Codebase (enforcer)
─────────────────        ──────────────────────           ─────────────────────
Write a plan (PRD)  ──→  /implement feature-name    ──→   Hooks enforce quality
Review the PR       ←──  Agent opens PR             ←──   Tests must pass
Merge               ──→  Done                             CHANGELOG updated
```

### Step 1: Write a Plan

Create a plan file at `.agents/<feature-name>/PLAN.md`. This is the only input the agent needs. Use the ExecPlan format defined in `PLANS.md`:

```bash
# Create feature directory
mkdir -p .agents/user-management

# Write your plan (or have Claude help you write it)
cat > .agents/user-management/PLAN.md << 'EOF'
# User Management

## Purpose
Allow admins to create, edit, and delete users from the dashboard.

## Interfaces
// In packages/shared/src/types.ts
export interface CreateUserRequest { email: string; name: string; }
export interface UserResponse { id: string; email: string; name: string; }

## Milestones
### M1: Backend CRUD
Goal: Full REST API for users
Work: entity → repository → service → routes
Verify: POST/GET/PUT/DELETE all return correct status codes

### M2: Frontend UI
Goal: User table with create/edit modal
Work: api client → React Query hooks → UserTable + UserForm components

## Progress
- [ ] Types contract committed
- [ ] Backend implemented
- [ ] Frontend implemented
- [ ] Code review clean
- [ ] Verify passed
EOF
```

### Step 2: Run the Agent

```bash
# Start Claude Code
claude

# Implement the feature (reads plan, executes all phases)
/implement user-management
```

The `/implement` command orchestrates the full workflow:
1. **Types** — Adds interfaces to `packages/shared/src/types.ts`, commits
2. **Backend** — Implements entity → repository → service → route, commits
3. **Frontend** — Implements API client → hooks → components, commits
4. **Review** — Code reviewer agent scans for violations (max 3 cycles)
5. **Verify** — Runs integration tests against a live server
6. **Ship** — Runs full pipeline, updates changelog, opens PR

### Available Slash Commands

| Command | What it does |
|---------|-------------|
| `/implement <feature>` | Full feature implementation from plan file |
| `/ship` | Pre-PR checklist: typecheck → lint → test → build → PR |
| `/review` | Code review (read-only): CRITICAL / WARNING / NOTE |
| `/fix-bug <description>` | Reproduce → failing test → fix → verify |
| `/check-health` | Full project health report (no code changes) |
| `/write-tests <file>` | Generate unit tests for a specific file |
| `/write-e2e <feature>` | Generate Playwright E2E tests |
| `/db-migrate <description>` | Safe migration: modify entity → generate SQL → confirm → run |

### Specialist Agents

Each agent has restricted tool access — a reviewer cannot accidentally write code:

| Agent | Role | Tools |
|-------|------|-------|
| `backend-implementer` | Routes, services, repositories, entities | Read, Write, Edit, Bash |
| `frontend-implementer` | Components, hooks, API client, stores | Read, Write, Edit, Bash |
| `code-reviewer` | Read-only review with severity levels | Read, Glob, Grep (no Write) |
| `test-writer` | Vitest unit and integration tests | Read, Write, Edit, Bash |
| `e2e-test-writer` | Playwright tests (inspects real DOM) | Read, Write, Edit, Bash |
| `db-migrator` | Entity changes + safe migrations | Read, Write, Edit, Bash |
| `log-analyzer` | Diagnoses runtime issues from logs | Read, Bash (no Write) |

### Lifecycle Hooks (Automatic Quality Gates)

These fire automatically — the agent cannot skip them:

| Hook | When | What it does |
|------|------|-------------|
| `session-start.sh` | Session begins | Injects git status, TS errors, last session summary |
| `pre-bash.sh` | Before any shell command | Blocks force push, commits to main, `rm -rf` outside safe dirs |
| `post-write.sh` | After every file write | Prettier + ESLint (every write), TypeScript (every 3rd write) |
| `session-stop.sh` | Session ends | Writes session summary for next session |
| `verify.sh` | During `/implement` | Starts app, runs smoke tests, captures metrics |

### Where to Put Plans and PRDs

```
.agents/
├── <feature-name>/
│   └── PLAN.md          # Your plan — agent reads this
├── smoke-tests.sh       # Written by agent during implementation
├── verify-report.md     # Written by verify hook
├── last-session.md      # Written by session-stop hook
└── archive/             # Completed plans moved here by /ship
```

- **PLANS.md** (root) — Defines the ExecPlan format template
- **CLAUDE.md** (root) — Project constitution: hard rules, stack, implementation order
- **AGENTS.md** (per-package) — Package-specific rules for agents
- **DECISIONS.md** (root) — All architectural decisions (29 documented)

### Recommended Development Patterns

**For a new feature:**
```
1. Write .agents/<feature>/PLAN.md
2. /implement <feature>
3. Review the PR
```

**For a bug fix:**
```
1. /fix-bug <description of the bug>
   (Agent: reproduces → writes failing test → fixes → verifies)
```

**For exploring / health check:**
```
1. /check-health
   (Runs typecheck, lint, test, build — reports status)
```

**For ad-hoc work:**
```
1. Just talk to Claude normally
2. The hooks still enforce quality on every file write
3. Use /review when done to catch any violations
4. Use /ship to open a PR
```

## Project Structure

```
node-app/
├── CLAUDE.md                    # Project constitution (agent reads first)
├── PLANS.md                     # ExecPlan format template
├── DECISIONS.md                 # 29 architectural decisions
├── CHANGELOG.md                 # Updated by /ship command
├── SETUP.md                     # Full implementation brief (detailed reference)
├── .claude/
│   ├── settings.json            # Hook registrations
│   ├── agents/                  # 7 specialist agent definitions
│   └── commands/                # 8 slash commands
├── .agents/                     # Runtime: plans, reports, session state
├── scripts/hooks/               # 5 lifecycle hook scripts
├── docker/                      # Docker configs (nginx, entrypoint, dev Dockerfile)
├── docker-compose.yml           # Base infrastructure (postgres + redis)
├── docker-compose.dev.yml       # Development overlay (hot-reload)
├── docker-compose.prod.yml      # Production overlay (nginx + migrations)
├── Dockerfile                   # Multi-stage production build
└── packages/
    ├── shared/                  # Zod schemas + TypeScript types
    ├── backend/                 # Fastify + TypeORM + PostgreSQL
    └── frontend/                # React + Vite + Ant Design
```

## Further Reading

- **[SETUP.md](SETUP.md)** — Full implementation brief: philosophy, design decisions, complete file structure, hook scripts, agent definitions, ExecPlan format, day-0 execution order
- **[DECISIONS.md](DECISIONS.md)** — All 29 architectural and implementation decisions with rationale
- **[PLANS.md](PLANS.md)** — ExecPlan template for writing feature plans
- **[CLAUDE.md](CLAUDE.md)** — Project constitution (hard rules the agent follows)

## License

MIT
