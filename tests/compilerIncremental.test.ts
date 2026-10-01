/**
 * `tailwindify(..., { incremental: true })` reuses one parsed compiler per
 * CSS/config pair and only feeds it candidates. Two things must hold:
 *
 * 1. Incremental output is a superset — a class seen earlier stays in the CSS
 *    (that is what makes it cheap; the live watcher does not care).
 * 2. The default, exact path never inherits that superset, even when the same
 *    class set was compiled incrementally a moment ago in the same window
 *    (Gutenberg's parent window runs both paths). output.css must shrink.
 *
 * Runs against the built bundle in build/compiler, i.e. what ships.
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
    options?: { incremental?: boolean } | string,
) => Promise<Result>;

const CSS = '@import "tailwindcss";';

let tailwindify: Tailwindify;

beforeAll(() => {
    const bundle = readFileSync(resolve(__dirname, '../build/compiler/tailwindcss-compiler.js'), 'utf8');
    // The bundle is a classic script that hangs its API off `window`.
    (0, eval)(bundle);
    tailwindify = (window as any).tailwindify;
    expect(typeof tailwindify).toBe('function');
    (window as any).clearTailwindCache();
});

describe('tailwindify incremental mode', () => {
    test('exact mode (default) emits only the classes passed', async () => {
        const first = await tailwindify(['p-4', 'text-red-500'], CSS, '', 'css');
        expect(first.error).toBeUndefined();
        expect(first.css).toContain('.p-4');
        expect(first.css).toContain('.text-red-500');

        const second = await tailwindify(['p-4'], CSS, '', 'css');
        expect(second.css).toContain('.p-4');
        expect(second.css).not.toContain('.text-red-500');
    });

    test('incremental mode accumulates candidates across calls', async () => {
        const first = await tailwindify(['mt-2'], CSS, '', 'css', { incremental: true });
        expect(first.error).toBeUndefined();
        expect(first.css).toContain('.mt-2');
        expect(first.css).not.toContain('.mb-8');

        const second = await tailwindify(['mb-8'], CSS, '', 'css', { incremental: true });
        expect(second.css).toContain('.mb-8');
        // superset: the earlier candidate is still there
        expect(second.css).toContain('.mt-2');
    });

    test('exact mode never returns an incremental superset for the same class set', async () => {
        await tailwindify(['flex', 'gap-3'], CSS, '', 'css', { incremental: true });
        // same compiler, now knows flex + gap-3; ask incrementally for just gap-3
        const inc = await tailwindify(['gap-3'], CSS, '', 'css', { incremental: true });
        expect(inc.css).toContain('.flex');

        // exact request for the identical set must not be served from that cache
        const exact = await tailwindify(['gap-3'], CSS, '', 'css');
        expect(exact.css).toContain('.gap-3');
        expect(exact.css).not.toContain('.flex');
    });

    test('a legacy 5th string argument does not switch on incremental mode', async () => {
        await tailwindify(['italic', 'underline'], CSS, '', 'css', 'important-string-that-used-to-be-ignored');
        const again = await tailwindify(['underline'], CSS, '', 'css', 'important-string-that-used-to-be-ignored');
        expect(again.css).not.toContain('.italic');
    });

    test('incremental rebuild is cheaper than a fresh compile', async () => {
        const css = '@import "tailwindcss";\n@theme { --color-brand: #123456; }';
        (window as any).clearTailwindCache();

        const t0 = performance.now();
        await tailwindify(['bg-brand'], css, '', 'css', { incremental: true });
        const cold = performance.now() - t0;

        const t1 = performance.now();
        await tailwindify(['bg-brand', 'text-brand'], css, '', 'css', { incremental: true });
        const warm = performance.now() - t1;

        // cold pays the stylesheet parse; warm only compiles one new candidate
        expect(warm).toBeLessThan(cold / 2);
    });
});
