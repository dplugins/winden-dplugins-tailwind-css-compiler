/**
 * Vitest global setup.
 *
 * Referenced by `setupFiles` in vitest.config.ts. Runs before every test file.
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

declare global {
  interface Window {
    ajaxUrl?: string;
    windenAutoCompile?: { ajaxUrl?: string };
  }
}

/*
 * The builder integrations read React off WordPress's globals rather than
 * importing it (esbuild maps `react` to `window.React` for those bundles), and
 * they destructure `wp.element` at module scope. The stub therefore has to be
 * in place before any component module is imported — which is what this setup
 * file guarantees.
 */
(globalThis as any).React = React;
(globalThis as any).wp = {
    ...((globalThis as any).wp ?? {}),
    element: React,
};

/*
 * WordPress localises these onto `window` via wp_localize_script.
 * Tests must start from a clean slate so one test cannot leak a URL into the next.
 */
function clearWordPressGlobals(): void {
  delete (window as Window).ajaxUrl;
  delete (window as Window).windenAutoCompile;
}

beforeEach(() => {
  clearWordPressGlobals();
});

afterEach(() => {
  clearWordPressGlobals();
  vi.restoreAllMocks();
});
