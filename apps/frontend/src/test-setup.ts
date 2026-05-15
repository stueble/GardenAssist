import "@testing-library/jest-dom";
import "./i18n/index";

// jsdom does not implement window.matchMedia — stub it globally so any hook
// or component that calls matchMedia works in tests without errors.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches:           false,
    media:             query,
    onchange:          null,
    addEventListener:  () => {},
    removeEventListener: () => {},
    dispatchEvent:     () => false,
  }),
});
