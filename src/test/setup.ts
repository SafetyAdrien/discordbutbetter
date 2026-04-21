import "@testing-library/jest-dom";

// jsdom: matchMedia stub (used by useBreakpoint, theme, etc.)
Object.defineProperty(window, "matchMedia", {
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

// jsdom: ResizeObserver stub (Radix uses it internally)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - jsdom polyfill
global.ResizeObserver = ResizeObserverStub;

// jsdom: scrollIntoView stub
Element.prototype.scrollIntoView = function () {};

// jsdom: PointerEvent / hasPointerCapture stubs (Radix Select needs them)
if (!("PointerEvent" in window)) {
  // @ts-expect-error - polyfill
  window.PointerEvent = class PointerEvent extends Event {} as unknown as typeof PointerEvent;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
