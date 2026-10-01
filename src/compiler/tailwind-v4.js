/**
 * Tailwind's own stylesheets, inlined at build time so `@import "tailwindcss"`
 * resolves inside the browser without a network request. Served through the
 * `loadStylesheet` callback that `compile()` / `__unstable__loadDesignSystem()`
 * call for every `@import` — Tailwind does the resolving, layering and
 * modifier handling (`layer()`, `prefix()`, `source()`, `theme()`, `important`)
 * itself. This is the same arrangement `@tailwindcss/browser` uses.
 *
 * Nothing here parses CSS. The old postcss + postcss-import pre-flattening
 * step duplicated Tailwind's import machinery, weighed ~400 KB minified, and
 * swallowed unknown/relative imports before Tailwind could see them.
 */

import tailwindTheme from 'inline:../../node_modules/tailwindcss/theme.css';
import tailwindPreflight from 'inline:../../node_modules/tailwindcss/preflight.css';
import tailwindUtilities from 'inline:../../node_modules/tailwindcss/utilities.css';
import tailwindIndex from 'inline:../../node_modules/tailwindcss/index.css';

/** Base every Tailwind-owned stylesheet reports, so relative ids inside them resolve back here. */
export const TAILWIND_VIRTUAL_BASE = 'virtual:tailwindcss';

const files = {
  'index.css': tailwindIndex,
  'theme.css': tailwindTheme,
  'preflight.css': tailwindPreflight,
  'utilities.css': tailwindUtilities,
};

/**
 * Map an `@import` id to one of Tailwind's own stylesheets, or `null` when the
 * id is not Tailwind's to serve.
 *
 * Accepts every spelling Tailwind may hand us:
 *   - `tailwindcss`, `tailwindcss/theme.css`, `tailwindcss/theme`
 *   - `/anything/tailwindcss/utilities.css` (a resolved path)
 *   - `./theme.css` (relative, from inside a Tailwind stylesheet — 4.0–4.1
 *     `index.css` imports its parts that way; 4.3's index is self-contained)
 *
 * @param {string} id
 * @param {string} [base]
 * @returns {{ path: string, base: string, content: string } | null}
 */
export function resolveTailwindStylesheet(id, base) {
  let file = null;

  if (id === 'tailwindcss') {
    file = 'index.css';
  } else {
    const match = id.match(/(?:^|\/)tailwindcss\/([^/]+?)(?:\.css)?$/);
    if (match) {
      file = `${match[1]}.css`;
    } else if (base === TAILWIND_VIRTUAL_BASE && /^\.\//.test(id)) {
      file = id.slice(2).replace(/(?:\.css)?$/, '.css');
    }
  }

  if (!file || !(file in files)) return null;

  return {
    path: `${TAILWIND_VIRTUAL_BASE}/${file}`,
    base: TAILWIND_VIRTUAL_BASE,
    content: files[file],
  };
}
