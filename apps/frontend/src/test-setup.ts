import "@testing-library/jest-dom";
import "./i18n/index";

// jsdom does not implement Element.scrollIntoView — stub it globally so
// components that call scrollIntoView (e.g. SettingsSection) don't throw
// unhandled errors during tests.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
