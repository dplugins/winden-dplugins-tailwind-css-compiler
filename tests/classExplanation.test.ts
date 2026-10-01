/**
 * What a class does, read back from the compiled rule.
 *
 * The fixtures are verbatim output from `window.windenExplainClasses` against a
 * real install — if the design system's formatting changes, these should be the
 * first thing that fails.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
    clearExplanationCache,
    explainClasses,
    formatRule,
    parseRule,
    resolveComputedValues,
} from '../src/winden-classes/core/class-explanation';

const RULES: Record<string, string> = {
    'p-4': '.p-4 {\n  padding: calc(var(--spacing) * 4);\n}\n',
    'bg-blue-500': '.bg-blue-500 {\n  background-color: var(--color-blue-500);\n}\n',
    'md:flex': '@media (width >= 48rem) {\n  .md\\:flex {\n    display: flex;\n  }\n}\n',
    'hover:underline': '@media (hover: hover) {\n  .hover\\:underline:hover {\n    text-decoration-line: underline;\n  }\n}\n',
    'p-[13px]': '.p-\\[13px\\] {\n  padding: 13px;\n}\n',
};

beforeEach(() => {
    clearExplanationCache();
    delete (globalThis as Record<string, unknown>).windenExplainClasses;
    (globalThis as Record<string, unknown>).tailwind_compiler_options = { custom_css: '@theme {}' };
});

describe('parseRule', () => {
    test('reads the declaration out of a plain utility', () => {
        expect(parseRule(RULES['p-4'])).toEqual({
            declarations: [{ property: 'padding', value: 'calc(var(--spacing) * 4)' }],
            conditions: [],
            css: RULES['p-4'].trim(),
        });
    });

    test('keeps the media query a responsive utility hides behind', () => {
        expect(parseRule(RULES['md:flex'])).toEqual({
            declarations: [{ property: 'display', value: 'flex' }],
            conditions: ['@media (width >= 48rem)'],
            css: RULES['md:flex'].trim(),
        });
    });

    test('reports the state a variant depends on', () => {
        const explained = parseRule(RULES['hover:underline']);
        expect(explained.declarations).toEqual([
            { property: 'text-decoration-line', value: 'underline' },
        ]);
        expect(explained.conditions).toContain(':hover');
    });

    test('drops the engine\'s own --tw-* plumbing', () => {
        const shadow = '.shadow-lg {\n  --tw-shadow: 0 10px 15px;\n  box-shadow: var(--tw-shadow);\n}\n';
        expect(parseRule(shadow).declarations).toEqual([
            { property: 'box-shadow', value: 'var(--tw-shadow)' },
        ]);
    });

    test('a class that builds nothing explains nothing', () => {
        expect(parseRule('')).toEqual({ declarations: [], conditions: [], css: '' });
    });
});

describe('resolveComputedValues', () => {
    /** jsdom computes nothing useful, so the document is faked at the seam */
    function fakeDocument(computed: Record<string, string>) {
        // The probe carries the declarations inline; jsdom computes nothing
        // useful, so the browser's answer is faked at that seam.
        const probe = {
            style: { cssText: '', setProperty: vi.fn() },
            remove: vi.fn(),
        };
        return {
            body: { appendChild: vi.fn() },
            createElement: () => probe,
            defaultView: {
                getComputedStyle: () => ({
                    getPropertyValue: (property: string) => computed[property] ?? '',
                }),
            },
        } as unknown as Document;
    }

    test('adds what the browser computes when it differs', () => {
        const explained = resolveComputedValues(
            parseRule(RULES['p-4']),
            'p-4',
            fakeDocument({ padding: '16px' })
        );
        expect(explained.declarations[0]).toEqual({
            property: 'padding',
            value: 'calc(var(--spacing) * 4)',
            computed: '16px',
        });
    });

    test('says nothing extra when the authored value is already the answer', () => {
        const explained = resolveComputedValues(
            parseRule(RULES['p-[13px]']),
            'p-[13px]',
            fakeDocument({ padding: '13px' })
        );
        expect(explained.declarations[0].computed).toBeUndefined();
    });

    test('a conditional rule is never measured', () => {
        // The canvas is whatever width it is; measuring md: there would report
        // the base value as if it were the utility's.
        const explained = resolveComputedValues(
            parseRule(RULES['md:flex']),
            'md:flex',
            fakeDocument({ display: 'block' })
        );
        expect(explained.declarations[0].computed).toBeUndefined();
    });

    test('the declaration is measured, not the class name', () => {
        // Tailwind only compiles classes a site uses, so a helper option nobody
        // has applied yet has no rule in the canvas stylesheet to read.
        const doc = fakeDocument({ padding: '16px' });
        const probe = doc.createElement('div') as unknown as { style: { setProperty: ReturnType<typeof vi.fn> } };

        resolveComputedValues(parseRule(RULES['p-4']), 'p-4', doc);
        expect(probe.style.setProperty).toHaveBeenCalledWith('padding', 'calc(var(--spacing) * 4)');
    });

    test('no document to measure in is not an error', () => {
        const parsed = parseRule(RULES['p-4']);
        expect(resolveComputedValues(parsed, 'p-4', null)).toEqual(parsed);
    });
});

describe('formatRule', () => {
    /** jsdom computes nothing useful, so the document is faked at the seam */
    function fakeDocument(computed: Record<string, string>) {
        const probe = { style: { cssText: '', setProperty: () => {} }, remove: () => {} };
        return {
            body: { appendChild: () => {} },
            createElement: () => probe,
            defaultView: {
                getComputedStyle: () => ({
                    getPropertyValue: (property: string) => computed[property] ?? '',
                }),
            },
        } as unknown as Document;
    }

    test('prints the whole rule, selector and braces included', () => {
        const explained = resolveComputedValues(parseRule(RULES['p-4']), 'p-4', fakeDocument({ padding: '16px' }));
        expect(formatRule(explained)).toBe('.p-4 {\n  padding: 16px;\n}');
    });

    test('keeps the media query wrapper of a responsive utility', () => {
        expect(formatRule(parseRule(RULES['md:flex']))).toBe(RULES['md:flex'].trim());
    });

    test('an unmeasured value is printed as the design system wrote it', () => {
        expect(formatRule(parseRule(RULES['p-4']))).toContain('calc(var(--spacing) * 4)');
    });
});

describe('explainClasses', () => {
    test('explains what the compiler builds and marks the rest empty', async () => {
        (globalThis as Record<string, unknown>).windenExplainClasses = vi.fn(async () => ({
            css: { 'p-4': RULES['p-4'], 'bg-blu-500': null },
        }));

        const explained = await explainClasses(['p-4', 'bg-blu-500']);
        expect(explained.get('p-4')?.declarations).toHaveLength(1);
        expect(explained.get('bg-blu-500')?.declarations).toEqual([]);
    });

    test('asks the compiler once per class', async () => {
        const spy = vi.fn(async () => ({ css: { 'p-4': RULES['p-4'] } }));
        (globalThis as Record<string, unknown>).windenExplainClasses = spy;

        await explainClasses(['p-4']);
        await explainClasses(['p-4']);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('only the classes it has not seen are sent', async () => {
        const spy = vi.fn(async (names: string[]) => ({
            css: Object.fromEntries(names.map((n) => [n, RULES[n] ?? null])),
        }));
        (globalThis as Record<string, unknown>).windenExplainClasses = spy;

        await explainClasses(['p-4']);
        await explainClasses(['p-4', 'bg-blue-500']);
        expect(spy).toHaveBeenLastCalledWith(['bg-blue-500'], expect.any(String), expect.any(String));
    });

    test('a component class explains itself from the CSS that declares it', async () => {
        // Tailwind reports these as unknown — they are plain rules, not
        // utilities — so the panel used to say a working class builds no CSS.
        (globalThis as Record<string, unknown>).tailwind_compiler_options = {
            custom_css: '@theme {}',
            style_css: '@layer components { .card { @apply rounded-lg p-6; letter-spacing: 0.02em; } }',
        };
        (globalThis as Record<string, unknown>).windenExplainClasses = vi.fn(async () => ({
            css: { card: null },
        }));

        const explained = (await explainClasses(['card'])).get('card')!;
        expect(explained.isComponent).toBe(true);
        expect(explained.css).toBe('.card {\n  @apply rounded-lg p-6;\n  letter-spacing: 0.02em;\n}');
    });

    test('a typo is still a typo, not a component', async () => {
        (globalThis as Record<string, unknown>).tailwind_compiler_options = {
            style_css: '@layer components { .card { @apply p-6; } }',
        };
        (globalThis as Record<string, unknown>).windenExplainClasses = vi.fn(async () => ({
            css: { 'bg-blu-500': null },
        }));

        expect((await explainClasses(['bg-blu-500'])).get('bg-blu-500')).toEqual({
            declarations: [], conditions: [], css: '',
        });
    });

    test('no compiler means no explanations, not an error', async () => {
        expect((await explainClasses(['p-4'])).size).toBe(0);
    });

    test('a throwing compiler explains nothing', async () => {
        (globalThis as Record<string, unknown>).windenExplainClasses = vi.fn(async () => {
            throw new Error('compiler exploded');
        });
        expect((await explainClasses(['p-4'])).size).toBe(0);
    });

    test('an empty request never calls the compiler', async () => {
        const spy = vi.fn(async () => ({ css: {} }));
        (globalThis as Record<string, unknown>).windenExplainClasses = spy;
        expect((await explainClasses([])).size).toBe(0);
        expect(spy).not.toHaveBeenCalled();
    });
});
