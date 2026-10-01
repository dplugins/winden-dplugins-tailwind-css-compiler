/**
 * The colour a class paints, for the swatch beside a suggestion.
 *
 * It cannot be read off the page: Tailwind v4 emits a theme variable only where
 * a utility uses it, so `var(--color-red-500)` resolves to nothing in a
 * document that happens not to use red — the site's own palette included. The
 * compiler owns the design system and is asked instead.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { clearColorCache, resolveColors } from '../src/winden-classes/core/class-colors';

beforeEach(() => {
    clearColorCache();
    delete (globalThis as Record<string, unknown>).windenResolveColors;
    (globalThis as Record<string, unknown>).tailwind_compiler_options = { custom_css: '@theme {}' };
});

describe('resolveColors', () => {
    test('returns a colour for the classes that paint one', async () => {
        (globalThis as Record<string, unknown>).windenResolveColors = vi.fn(async () => ({
            colors: { 'bg-red-500': 'oklch(0.637 0.237 25.331)', 'p-4': undefined },
        }));

        const colours = await resolveColors(['bg-red-500', 'p-4']);
        expect(colours.get('bg-red-500')).toBe('oklch(0.637 0.237 25.331)');
        expect(colours.has('p-4')).toBe(false);
    });

    test('asks once per class, including the ones with no colour', async () => {
        const spy = vi.fn(async () => ({ colors: { 'bg-red-500': 'red' } }));
        (globalThis as Record<string, unknown>).windenResolveColors = spy;

        await resolveColors(['bg-red-500', 'p-4']);
        await resolveColors(['bg-red-500', 'p-4']);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('only unseen classes are sent', async () => {
        const spy = vi.fn(async (names: string[]) => ({
            colors: Object.fromEntries(names.map((name) => [name, 'red'])),
        }));
        (globalThis as Record<string, unknown>).windenResolveColors = spy;

        await resolveColors(['bg-red-500']);
        await resolveColors(['bg-red-500', 'bg-blue-500']);
        expect(spy).toHaveBeenLastCalledWith(['bg-blue-500'], expect.any(String), expect.any(String));
    });

    test('no compiler means no swatches, not a guess', async () => {
        expect((await resolveColors(['bg-red-500'])).size).toBe(0);
    });

    test('a throwing compiler is silent', async () => {
        (globalThis as Record<string, unknown>).windenResolveColors = vi.fn(async () => {
            throw new Error('compiler exploded');
        });
        expect((await resolveColors(['bg-red-500'])).size).toBe(0);
    });

    test('an empty request never calls the compiler', async () => {
        const spy = vi.fn(async () => ({ colors: {} }));
        (globalThis as Record<string, unknown>).windenResolveColors = spy;
        expect((await resolveColors([])).size).toBe(0);
        expect(spy).not.toHaveBeenCalled();
    });
});
