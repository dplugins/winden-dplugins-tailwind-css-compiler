import { loader } from '@monaco-editor/react';
// Full Monaco entry. We previously trimmed this to a slim subset for
// bundle-size reasons, but losing the CSS LSP also lost property-name
// autocomplete (padding, position, ...) which users expect inside
// rule bodies. `editor.main` registers every basic language and every
// built-in LSP (CSS/SCSS/LESS, HTML, JSON, TypeScript). Bundle grows
// by ~1.5 MB but the editor matches Monaco's documented baseline.
//
// AMD-shim guard: one of the LSP contributions contains a dead
// `if (false) __require(...)` AMD fallback. esbuild still emits the
// `__require` reference at bundle init; pre-defining a no-op `require`
// keeps that resolve harmless under our IIFE bundle. The actual code
// path always uses dynamic ESM `import()`.
(globalThis as any).require = (globalThis as any).require || function () { /* AMD-shim no-op (#7 / monaco) */ };

import * as monaco from 'monaco-editor/esm/vs/editor/editor.main';
import { registerPlainJSLanguage } from '@/utils/monacoPlainJS';
import '@/types/global.d.ts';

/**
 * Configure Monaco Environment for web workers (CSS/SCSS only).
 *
 * Workers are served same-origin from the plugin URL, so we hand the URL
 * directly to `new Worker(url)` — no `Blob` + `importScripts` wrap needed.
 * The blob wrap was historically there for cross-origin / Bricks iframe
 * loading, but the admin context (toplevel_page_winden) is same-origin.
 * Saves a Blob construction + revoke per worker (~5–10 ms each).
 *
 * Preloaded by `SettingsPage::preload_monaco_workers` so the fetch starts
 * in parallel with the admin bundle.
 */
export function setupMonacoEnvironment(): void {
    window.MonacoEnvironment = {
        getWorker: function (_workerId: string, label: string) {
            const buildUrl = window.windenData?.buildUrl || '';
            // Map each LSP to its dedicated worker. Falling through to
            // editor.worker silently breaks autocomplete for that language.
            let workerPath: string;
            switch (label) {
                case 'css':
                case 'scss':
                case 'less':
                    workerPath = 'admin/css.worker.js';
                    break;
                case 'html':
                case 'handlebars':
                case 'razor':
                    workerPath = 'admin/html.worker.js';
                    break;
                case 'json':
                    workerPath = 'admin/json.worker.js';
                    break;
                case 'typescript':
                case 'javascript':
                    workerPath = 'admin/ts.worker.js';
                    break;
                default:
                    workerPath = 'admin/editor.worker.js';
            }

            return new Worker(`${buildUrl}${workerPath}`, { name: label });
        }
    };
}

/**
 * Tell the CSS/SCSS/LESS LSP not to flag Tailwind's at-rules
 * (@apply, @theme, @layer, @variant, @config, @plugin, @source,
 * @utility, @custom-variant, @reference, @tailwind). Without this the
 * linter underlines every Tailwind directive as "Unknown at-rule".
 * Mirrors what Tailwind Play / VS Code's Tailwind extension do.
 *
 * Read from the instance the loader resolves with: the `editor.main`
 * namespace import re-exports the API but the `languages.css` defaults
 * are populated as a side-effect during the LSP contribution's bootstrap,
 * which lands after `loader.init()` resolves — not at the import boundary.
 */
function silenceUnknownAtRules(m: any): void {
    const css = m?.languages?.css;
    if (!css) return;
    const opts = {
        validate: true,
        lint: { unknownAtRules: 'ignore' as const },
    };
    css.cssDefaults?.setOptions?.(opts);
    css.scssDefaults?.setOptions?.(opts);
    css.lessDefaults?.setOptions?.(opts);
}

/**
 * Initialize Monaco loader with configuration
 */
export function initializeMonaco(): void {
    loader.config({ monaco });
    loader.init().then((m: any) => {
        silenceUnknownAtRules(m);
        registerPlainJSLanguage(m);
    });
}

/**
 * Full Monaco setup - call once at app initialization
 */
export function setupMonaco(): void {
    setupMonacoEnvironment();
    initializeMonaco();
}
