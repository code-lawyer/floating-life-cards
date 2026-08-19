import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
