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
