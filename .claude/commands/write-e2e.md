# Usage: /write-e2e <feature>
e2e-test-writer agent.

1. Ensure app running (pnpm dev).
2. Playwright MCP to navigate.
3. Read real DOM — never guess.
4. Write to packages/frontend/src/e2e/<feature>.spec.ts.
5. playwright test — must pass.
