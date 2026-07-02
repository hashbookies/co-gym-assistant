// Global test setup. jsdom-matchers only load when a DOM is present (smoke test).
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement window.matchMedia, which motion/react's
// useReducedMotion needs. Polyfill a minimal, controllable version: tests can
// flip reduced motion on via __setReducedMotion(true) and back off again.
if (typeof window !== "undefined" && !window.matchMedia) {
  let reducedMotion = false;
  (globalThis as Record<string, unknown>).__setReducedMotion = (v: boolean) => { reducedMotion = v; };
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
