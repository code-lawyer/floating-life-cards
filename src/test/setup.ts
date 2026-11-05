/// <reference types="vitest/jsdom" />

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 26 exposes its own Web Storage globals. Browser tests must use the
// current jsdom window's storage so availability and isolation match the app.
for (const key of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: jsdom.window[key],
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
