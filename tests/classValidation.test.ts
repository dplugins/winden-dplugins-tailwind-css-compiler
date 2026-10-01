/**
 * Unknown-class detection. The rule that matters most is the safe default:
 * when validation cannot run, nothing may be reported as unknown — a false
 * positive sends people hunting for a bug that is not there.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { findUnknownClasses, tokenizeClasses, clearValidationCache } from '../src/winden-classes/core/class-validation';

declare global {
    // eslint-disable-next-line no-var
    var windenValidateClasses: ((classNames: string[]) => Promise<{ unknown: string[] }>) | undefined;
}

/** A small stand-in for the autocomplete vocabulary the compiler ships */
const VOCABULARY = [
    'flex', 'grid', 'block', 'p-4', 'p-8', 'px-4', 'py-2', 'm-4', 'my-4',
    'bg-blue-500', 'bg-red-500', 'text-white', 'text-slate-900',
    'items-center', 'justify-between', 'rounded-xl', 'shadow-lg',
    // Utilities the user's own @theme generates — the list is the design
    // system's, not a stock Tailwind one
    'bg-brand-500', 'text-brand-500', 'rounded-card',
];

beforeEach(() => {
    clearValidationCache();
    delete (globalThis as Record<string, unknown>).windenValidateClasses;
    (globalThis as Record<string, unknown>).tailwind_compiler_options = { custom_css: '@theme {}' };
    (globalThis as Record<string, unknown>).winden_autocomplete = VOCABULARY;
});

describe('tokenizeClasses', () => {
    test('splits on any whitespace and drops empties', () => {
        expect(tokenizeClasses('  flex   p-4\n bg-red-500 ')).toEqual(['flex', 'p-4', 'bg-red-500']);
        expect(tokenizeClasses('')).toEqual([]);
    });
});

describe('findUnknownClasses', () => {
    test('reports what the compiler cannot build', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['bg-blu-500'],
        }));
        expect(await findUnknownClasses('flex bg-blu-500')).toEqual(['bg-blu-500']);
    });

    test('classes from outside Tailwind are left alone', async () => {
        // The field is Gutenberg's own "Additional CSS class(es)": a block style
        // variation, a theme class and a JS hook all live here legitimately.
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['is-style-outline', 'wp-block-button__link', 'has-text-align-center',
                'site-header', 'js-scroll-target'],
        }));
        expect(await findUnknownClasses('is-style-outline wp-block-button__link '
            + 'has-text-align-center site-header js-scroll-target')).toEqual([]);
    });

    test('a botched utility is still reported', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['bg-blu-500', 'p-4x', 'site-header'],
        }));
        expect(await findUnknownClasses('bg-blu-500 p-4x site-header'))
            .toEqual(['bg-blu-500', 'p-4x']);
    });

    test('a mistyped variant on a real utility is reported', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['hoverr:flex'],
        }));
        expect(await findUnknownClasses('hoverr:flex')).toEqual(['hoverr:flex']);
    });

    test('a class sharing a namespace but nothing else is left alone', async () => {
        // 'my-hero-section' starts with the margin-y namespace and still is not
        // a typo of anything — distance decides, not the prefix.
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['my-hero-section', 'text-brand-header-large'],
        }));
        expect(await findUnknownClasses('my-hero-section text-brand-header-large')).toEqual([]);
    });

    test('a typo of a class from the user\'s own theme is reported', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['bg-brnd-500'],
        }));
        expect(await findUnknownClasses('bg-brnd-500')).toEqual(['bg-brnd-500']);
    });

    test('a hand-written component class is not a typo of anything', async () => {
        // `.btn-primary` in @layer components compiles, so it never reaches this
        // filter — but a class from any other stylesheet must survive it too.
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['btn-primary', 'card-header'],
        }));
        expect(await findUnknownClasses('btn-primary card-header')).toEqual([]);
    });

    test('without a vocabulary nothing is reported', async () => {
        delete (globalThis as Record<string, unknown>).winden_autocomplete;
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({
            unknown: ['bg-blu-500'],
        }));
        expect(await findUnknownClasses('bg-blu-500')).toEqual([]);
    });

    test('an empty class string never calls the compiler', async () => {
        const spy = vi.fn(async () => ({ unknown: ['nope'] }));
        (globalThis as Record<string, unknown>).windenValidateClasses = spy;
        expect(await findUnknownClasses('   ')).toEqual([]);
        expect(spy).not.toHaveBeenCalled();
    });

    test('no compiler present reports nothing rather than everything', async () => {
        expect(await findUnknownClasses('flex bg-blu-500')).toEqual([]);
    });

    test('a throwing compiler reports nothing', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => {
            throw new Error('compiler exploded');
        });
        expect(await findUnknownClasses('flex bg-blu-500')).toEqual([]);
    });

    test('a malformed answer reports nothing', async () => {
        (globalThis as Record<string, unknown>).windenValidateClasses = vi.fn(async () => ({}) as never);
        expect(await findUnknownClasses('flex')).toEqual([]);
    });

    test('repeat lookups are served from cache', async () => {
        const spy = vi.fn(async () => ({ unknown: ['x-1'] }));
        (globalThis as Record<string, unknown>).windenValidateClasses = spy;

        await findUnknownClasses('flex x-1');
        await findUnknownClasses('flex x-1');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('the compiler receives the classes and the theme CSS', async () => {
        const spy = vi.fn(async (_classNames: string[], _css: string, _config?: string) => ({ unknown: [] as string[] }));
        (globalThis as Record<string, unknown>).windenValidateClasses = spy;
        (globalThis as Record<string, unknown>).tailwind_compiler_options = {
            custom_css: '@theme { --color-brand: #fff; }',
            style_css: '.card { color: red; }',
            config_content: 'cfg',
        };

        await findUnknownClasses('bg-brand');
        expect(spy).toHaveBeenCalledWith(
            ['bg-brand'],
            expect.stringContaining('--color-brand'),
            'cfg'
        );
        expect(String(spy.mock.calls[0]?.[1])).toContain('.card');
    });
});
