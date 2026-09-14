/*
  Test setup — runs before the smoke tests.
  jsdom (the fake browser used in tests) lacks a couple of browser APIs that
  the charts rely on. We provide harmless stand-ins so rendering doesn't crash.
*/

// Recharts' ResponsiveContainer measures its box with ResizeObserver.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
