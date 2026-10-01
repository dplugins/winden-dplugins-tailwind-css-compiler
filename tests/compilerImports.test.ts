/**
 * `@import` is Tailwind's job now. The compiler hands Tailwind the raw CSS and
 * serves Tailwind's own stylesheets from strings inlined in the bundle through
 * `loadStylesheet` — no postcss-import pre-flattening in between. These pin the
 * shapes users actually write, the import modifiers Tailwind owns, and what
 * happens to an import nobody can serve.
 *
 * Runs against the built bundle in build/compiler, i.e. what ships.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Result = { css: string; classes: string[]; error?: string; errorDetails?: { phase?: string; code?: string } };
type Tailwindify = (classes: string[], css: string, config: string, preprocessor: string, options?: { incremental?: boolean; important?: boolean }) => Promise<Result>;
type TailwindifyClasses = (css: string, config?: string) => Promise<Result>;
type StyleGuide = (custom: string, wizard: string, styles: string) => Promise<{ success: boolean; config: { theme: { colors: Record<string, unknown> } } }>;

let tailwindify: Tailwindify;
let tailwindifyClasses: TailwindifyClasses;
let extractStyleGuideConfig: StyleGuide;

beforeAll(() => {
    const bundle = readFileSync(resolve(__dirname, '../build/compiler/tailwindcss-compiler.js'), 'utf8');
    (0, eval)(bundle);
    const w = window as any;
    tailwindify = w.tailwindify;
    tailwindifyClasses = w.tailwindifyClasses;
    extractStyleGuideConfig = w.extractStyleGuideConfig;
    w.clearTailwindCache();
});

describe('Tailwind resolves @import through loadStylesheet', () => {
    test('the bare `@import "tailwindcss"` compiles utilities and ships preflight', async () => {
        const r = await tailwindify(['p-4'], '@import "tailwindcss";', '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toContain('.p-4');
        expect(r.css).toContain('box-sizing');
    });

    test('the split form Winden writes — theme.css + utilities.css in layers — compiles', async () => {
        const css = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);`;
        const r = await tailwindify(['text-red-500'], css, '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toContain('.text-red-500');
        // no preflight was asked for, so none arrives
        expect(r.css).not.toContain('box-sizing');
    });

    test('an extension-less id (`tailwindcss/theme`) is served too', async () => {
        const r = await tailwindify(['mt-1'], '@import "tailwindcss/theme" layer(theme);\n@import "tailwindcss/utilities" layer(utilities);', '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toContain('.mt-1');
    });

    test('import modifiers reach Tailwind: prefix()', async () => {
        const r = await tailwindify(['tw:p-4', 'p-4'], '@import "tailwindcss" prefix(tw);', '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toContain('.tw\\:p-4');
        expect(r.css).not.toMatch(/(^|\n)\s*\.p-4/);
    });

    test('import modifiers reach Tailwind: important', async () => {
        const r = await tailwindify(['p-4'], '@import "tailwindcss" important;', '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toMatch(/\.p-4\s*\{[^}]*!important/);
    });

    test('import modifiers reach Tailwind: source(none) still compiles the classes we pass', async () => {
        const r = await tailwindify(['flex'], '@import "tailwindcss" source(none);', '', 'css');
        expect(r.error).toBeUndefined();
        expect(r.css).toContain('.flex');
    });

    test('a user @theme after the import extends the defaults', async () => {
        const r = await tailwindify(['bg-brand', 'bg-red-500'], '@import "tailwindcss";\n@theme { --color-brand: #123456; }', '', 'css');
        expect(r.css).toContain('.bg-brand');
        expect(r.css).toContain('.bg-red-500');
    });

    test('an import nobody can serve is reported as a stylesheet error, not a crash', async () => {
        const r = await tailwindify(['p-4'], '@import "tailwindcss";\n@import "./missing.css";', '', 'css');
        expect(r.error).toBeDefined();
        expect(r.errorDetails?.code).toBe('STYLESHEET_ERROR');
        expect(r.css).toBe('');
    });
});

describe('the callers that used to pre-flatten still work', () => {
    test('tailwindifyClasses returns the class list from the imported theme', async () => {
        const r = await tailwindifyClasses('@import "tailwindcss";\n@theme { --color-brand: #123456; }');
        expect(r.error).toBeUndefined();
        expect(r.classes).toContain('bg-brand');
        expect(r.classes).toContain('bg-red-500');
    });

    test('the style guide extractor still sees Tailwind default colors', async () => {
        const r = await extractStyleGuideConfig('', '@theme { --color-brand: #123456; }', '');
        expect(r.success).toBe(true);
        expect(r.config.theme.colors).toHaveProperty('red');
        expect(r.config.theme.colors).toHaveProperty('brand');
    });
});

describe('options.important — utilities with !important, nothing else', () => {
    const SPLIT = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
@layer components { .card { padding: 1rem; } }`;

    test('utilities and their variants become !important; preflight, components and --tw-* do not', async () => {
        const r = await tailwindify(['p-4', 'hover:m-2', 'card'], SPLIT, '', 'css', { important: true });
        expect(r.error).toBeUndefined();
        expect(r.css).toMatch(/\.p-4\s*\{[^}]*padding:[^;]*!important/);
        expect(r.css).toMatch(/\.hover\\:m-2:hover\s*\{[^}]*!important/);
        expect(r.css).not.toMatch(/box-sizing:[^;]*!important/);
        expect(r.css).not.toMatch(/\.card\s*\{[^}]*!important/);
        expect(r.css).not.toMatch(/--tw-[a-z-]+:[^;]*!important/);
    });

    test('the same CSS without the option compiles without !important, and neither result poisons the other', async () => {
        const plain = await tailwindify(['p-4'], SPLIT, '', 'css');
        expect(plain.css).toMatch(/\.p-4\s*\{[^}]*\}/);
        expect(plain.css).not.toMatch(/\.p-4\s*\{[^}]*!important/);
        const again = await tailwindify(['p-4'], SPLIT, '', 'css', { important: true });
        expect(again.css).toMatch(/\.p-4\s*\{[^}]*!important/);
    });

    test('a user import that already carries `important` still works', async () => {
        const r = await tailwindify(['p-4'], '@import "tailwindcss" important;', '', 'css', { important: true });
        expect(r.error).toBeUndefined();
        expect(r.css).toMatch(/\.p-4\s*\{[^}]*!important/);
    });
});

describe('screens — breakpoint names from the theme, not variant order numbers', () => {
    test('defaults plus a Wizzard --breakpoint-* come back, on both entry points', async () => {
        const css = '@import "tailwindcss";\n@theme { --breakpoint-tablet: 900px; }';
        const full = await tailwindify(['p-4'], css, '', 'css');
        const meta = await tailwindifyClasses(css);
        expect((full as any).screens).toEqual(['sm', 'md', 'lg', 'xl', '2xl', 'tablet']);
        expect((meta as any).screens).toEqual((full as any).screens);
    });

    test('a --breakpoint-*: initial reset leaves only the custom ones', async () => {
        const css = '@import "tailwindcss";\n@theme { --breakpoint-*: initial; --breakpoint-tab: 700px; --breakpoint-desk: 1200px; }';
        const r = await tailwindifyClasses(css);
        expect((r as any).screens).toEqual(['tab', 'desk']);
    });

    test('legacy @config theme.screens: raw and min/max entries map to their variant names', async () => {
        const config = `module.exports = { theme: { screens: { sm: '640px', wide: '1400px', print: { raw: 'print' }, tab: { min: '700px', max: '900px' } } } };`;
        const r = await tailwindifyClasses('@import "tailwindcss";', config);
        expect(r.error).toBeUndefined();
        expect((r as any).screens).toEqual(['sm', 'wide', 'print', 'tab']);
    });
});

describe('Style Guide tokens come from the resolved theme', () => {
    const IMPORTS = '@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);';

    test('Wizzard colors merge over defaults; a --color-*: initial reset drops the defaults', async () => {
        const merged = await extractStyleGuideConfig('', '@theme { --color-brand: #123456; --color-mint-500: #0f0; --color-mint-600: #0d0; }', IMPORTS);
        expect(merged.success).toBe(true);
        expect(merged.config.theme.colors).toMatchObject({ brand: '#123456', mint: { '500': '#0f0', '600': '#0d0' } });
        expect(merged.config.theme.colors).toHaveProperty('red');

        const reset = await extractStyleGuideConfig('', '@theme { --color-*: initial; --color-brand: #123456; }', IMPORTS);
        expect(Object.keys(reset.config.theme.colors)).toEqual(['brand']);
    });

    test('a JS @config reaches the theme through Tailwind, not through a regex', async () => {
        const js = `module.exports = { theme: { extend: { colors: { cfg: { DEFAULT: '#abc', 700: '#123' } }, screens: { wide: '1400px' } } } };`;
        const r = await extractStyleGuideConfig(js, '', IMPORTS);
        expect(r.success).toBe(true);
        expect((r.config.theme as any).colors.cfg).toEqual({ DEFAULT: '#abc', '700': '#123' });
        expect((r.config.theme as any).screens).toMatchObject({ sm: '40rem', wide: '1400px' });
    });

    test('flat namespaces are folded back into the Style Guide shape', async () => {
        const r = await extractStyleGuideConfig('', '@theme { --text-hero: 5rem; --text-hero--line-height: 1.1; --font-display: Georgia; --spacing-gutter: 2rem; }', IMPORTS);
        const t = r.config.theme as any;
        expect(t.fontSize.hero).toBe('5rem');
        expect(t.fontSize).not.toHaveProperty('hero--line-height');
        expect(t.fontSize).not.toHaveProperty('shadow-sm');
        expect(t.lineHeight.hero).toBe('1.1');
        expect(t.lineHeight.sm).toBe('calc(1.25 / 0.875)');
        expect(t.lineHeight.normal).toBe('1.5');
        expect(t.fontFamily.display).toBe('Georgia');
        expect(t.fontFamily).not.toHaveProperty('weight-bold');
        expect(t.fontWeight.bold).toBe('700');
        expect(t.spacing).toEqual({ gutter: '2rem' });
        expect(t.width.gutter).toBe('2rem');
        expect(t.width.xs).toBe('20rem');
        expect(t.borderRadius.md).toBe('0.375rem');
        expect(t.dropShadow).toHaveProperty('inner');
        expect(t.letterSpacing.wide).toBe('0.025em');
    });

    test('the extractor publishes the same screens the compiler reports', async () => {
        const r = await extractStyleGuideConfig('', '@theme { --breakpoint-tablet: 900px; }', IMPORTS);
        expect(Object.keys((r.config.theme as any).screens)).toEqual(['sm', 'md', 'lg', 'xl', '2xl', 'tablet']);
        expect((window as any).winden_autocomplete_screens).toEqual(['sm', 'md', 'lg', 'xl', '2xl', 'tablet']);
    });
});

describe('class APIs on the built bundle (validate / explain / resolve colors)', () => {
    const CSS = '@import "tailwindcss";\n@theme { --color-brand: #123456; }\n@layer components { .card { padding: 1rem; } }';

    test('windenValidateClasses knows utilities, theme colors and component classes; flags typos', async () => {
        const r = await (window as any).windenValidateClasses(['p-4', 'bg-brand', 'card', 'hover:card', 'p-4x', 'bg-nope-500'], CSS, '');
        expect(r.error).toBeUndefined();
        expect(r.unknown).toEqual(['p-4x', 'bg-nope-500']);
    });

    test('windenExplainClasses returns the CSS per candidate, null for unknown', async () => {
        const r = await (window as any).windenExplainClasses(['p-4', 'p-4x'], CSS, '');
        expect(r.error).toBeUndefined();
        expect(r.css['p-4']).toMatch(/padding/);
        expect(r.css['p-4x']).toBeNull();
    });

    test('windenResolveColors resolves theme variables to values', async () => {
        const r = await (window as any).windenResolveColors(['bg-brand', 'text-red-500', 'p-4'], CSS, '');
        expect(r.error).toBeUndefined();
        expect(r.colors['bg-brand']).toBe('#123456');
        expect(r.colors['text-red-500']).toMatch(/^oklch\(/);
        expect(r.colors).not.toHaveProperty('p-4');
    });

    test('a JS @config reaches the validator too', async () => {
        const js = `module.exports = { theme: { extend: { colors: { cfg: '#abc' } } } };`;
        const r = await (window as any).windenValidateClasses(['bg-cfg'], '@import "tailwindcss";', js);
        expect(r.unknown).toEqual([]);
    });
});

describe('@tailwindcss/container-queries is redundant in v4 and resolves as a no-op', () => {
    const CANDIDATES = ['@container', '@sm:p-4', '@lg/main:p-4', '@[400px]:p-4', '@min-[400px]:p-4', 'max-w-3xs', 'max-w-2xs', '@card:p-1'];
    const esc = (c: string) => '.' + c.replace(/[@\/\[\]:]/g, (m) => '\\' + m);

    test('without the plugin every container-query spelling compiles, and the native 2xs/3xs sizes exist', async () => {
        const r = await tailwindify(CANDIDATES, '@import "tailwindcss";\n@theme { --container-card: 30rem; }', '', 'css');
        expect(r.error).toBeUndefined();
        for (const c of CANDIDATES) expect(r.css, c).toContain(esc(c));
    });

    test('an old Style tab that still declares the plugin compiles the same — nothing lost, 2xs/3xs back', async () => {
        const r = await tailwindify(CANDIDATES, '@import "tailwindcss";\n@plugin "@tailwindcss/container-queries";\n@theme { --container-card: 30rem; }', '', 'css');
        expect(r.error).toBeUndefined();
        for (const c of CANDIDATES) expect(r.css, c).toContain(esc(c));
    });

    test('a v3-style JS config `theme.extend.containers` still works natively', async () => {
        const js = `module.exports = { theme: { extend: { containers: { card: '30rem' } } } };`;
        const r = await tailwindify(['@card:p-1', 'max-w-3xs'], '@import "tailwindcss";', js, 'css');
        expect(r.css).toContain(esc('@card:p-1'));
        expect(r.css).toContain('.max-w-3xs');
    });
});
