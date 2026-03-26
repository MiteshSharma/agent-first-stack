# ExecPlan Format

An ExecPlan is a single markdown file at .agents/<feature-name>/PLAN.md.
Written by human before implementation begins.
Agent reads, executes, and updates Progress inline.
Must be restartable — if context resets, agent resumes from plan alone.

## Template

```markdown
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
```
