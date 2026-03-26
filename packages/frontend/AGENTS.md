# Frontend Agent Rules

## Architecture
- ALL fetch calls in src/api/client.ts — nowhere else
- React Query for server state — Zustand for UI state only — never mix
- Native fetch — no Axios
- NEVER import from packages/backend

## Component Structure
- Components in src/components/[Name]/index.tsx
- Co-located CSS Modules: [Name].module.css
- Co-located tests: [Name].test.tsx
- Add data-testid to interactive elements for Playwright

## Styling
- Ant Design components as baseline
- Override via CSS Modules (.module.css) — never inline styles
- Theme via AntD ConfigProvider — no styled-components

## State Management
- React Query hooks in src/hooks/use[Resource].ts
- Zustand slices in src/store/[feature].slice.ts
- UI state: sidebar, forms, search — Zustand
- Server state: users, health, metrics — React Query

## Testing
- Vitest + React Testing Library for unit tests
- Playwright for E2E (src/e2e/)
- Never guess selectors — use getByRole, getByTestId
