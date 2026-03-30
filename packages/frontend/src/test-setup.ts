import '@testing-library/jest-dom/vitest';

// Ant Design requires matchMedia for responsive breakpoints
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Ant Design uses getComputedStyle for scrollbar measurements.
// jsdom logs "Not implemented" to stderr before throwing when pseudoElt is passed,
// so we short-circuit before reaching jsdom's implementation for that case.
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration => {
  if (pseudoElt !== undefined) return {} as CSSStyleDeclaration;
  return originalGetComputedStyle(elt);
};
