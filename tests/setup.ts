/**
 * Vitest global setup.
 *
 * Referenced by `setupFiles` in vitest.config.ts. Runs before every test file.
 */

import { afterEach, beforeEach, vi } from 'vitest';

declare global {
  interface Window {
    ajaxUrl?: string;
    windenAutoCompile?: { ajaxUrl?: string };
  }
}

/**
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
