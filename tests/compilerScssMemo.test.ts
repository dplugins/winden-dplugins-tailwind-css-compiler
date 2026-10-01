/**
 * SCSS preprocessing is memoized on its input.
 *
 * Dart Sass runs synchronously on the main thread, and the live watcher calls
 * `tailwindify` with the *same* stylesheet on every class change. Without the
 * memo every keystroke in SCSS mode paid a full Sass compile — 50–200 ms for
 * an ordinary Style tab — while CSS mode paid nothing. With the watcher now
 * compiling once per animation frame rather than per 150 ms pause, that cost
 * would have been per frame.
 *
 * Runs against the built bundle in build/compiler, with a stand-in for Dart
 * Sass planted where `initializeDartSass` looks for one already loaded.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Result = { css: string; classes: string[]; error?: string };
type Tailwindify = (
    classes: string[],
    css: string,
    config: string,
    preprocessor: string,
    options?: { incremental?: boolean },
) => Promise<Result>;

const SCSS = '@import "tailwindcss";\n$pad: 2rem;\n.card { padding: $pad; }';
const OTHER = '@import "tailwindcss";\n$pad: 3rem;\n.card { padding: $pad; }';

let tailwindify: Tailwindify;
let sassCalls: string[] = [];

beforeAll(() => {
    // A Sass that only records what it was asked to compile and hands the
    // input back as CSS (the variable is never read by Tailwind, so the
    // output still compiles)
    (globalThis as any)._cliPkgExports = [{
        load: (_: unknown, exports: Record<string, unknown>) => {
            exports.compileString = (source: string) => {
                sassCalls.push(source);
                return { css: source.replace(/\$pad: [^;]+;\n/, '').replace('$pad', '2rem') };
            };
            exports.compile = () => { throw new Error('not used'); };
        },
    }];

    const bundle = readFileSync(resolve(__dirname, '../build/compiler/tailwindcss-compiler.js'), 'utf8');
    (0, eval)(bundle);
    tailwindify = (window as any).tailwindify;
    expect(typeof tailwindify).toBe('function');
    (window as any).clearTailwindCache();
});

describe('preprocessSCSS memo', () => {
    test('the same stylesheet is handed to Sass once, however many class changes follow', async () => {
        sassCalls = [];

        const first = await tailwindify(['p-4'], SCSS, '', 'scss', { incremental: true });
        expect(first.error).toBeUndefined();
        expect(first.css).toContain('.p-4');
        expect(sassCalls).toHaveLength(1);

        await tailwindify(['p-4', 'mt-2'], SCSS, '', 'scss', { incremental: true });
        await tailwindify(['p-4', 'mt-2', 'flex'], SCSS, '', 'scss', { incremental: true });
        expect(sassCalls).toHaveLength(1);

        // A different stylesheet is different input, and is compiled
        const other = await tailwindify(['p-4'], OTHER, '', 'scss', { incremental: true });
        expect(other.error).toBeUndefined();
        expect(sassCalls).toHaveLength(2);

        // Clearing the caches forgets the Sass output too
        (window as any).clearTailwindCache();
        await tailwindify(['p-4'], SCSS, '', 'scss', { incremental: true });
        expect(sassCalls).toHaveLength(3);
    });

    test('CSS mode never reaches Sass', async () => {
        sassCalls = [];
        await tailwindify(['p-4'], '@import "tailwindcss";', '', 'css');
        expect(sassCalls).toHaveLength(0);
    });
});
