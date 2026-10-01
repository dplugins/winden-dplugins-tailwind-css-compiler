/**
 * What the class autocomplete offers, and in what order.
 *
 * The first suggestion is the preselected one — Enter takes it — so ranking is
 * not cosmetic. Typing `m-20` used to drop the exact match as redundant and
 * leave `-m-20` at the top, one keystroke from the opposite margin.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createTailwindAutocomplete, getSuggestions, parseInput } from '../src/winden-classes/core';

const CLASSES = [
    'm-20', '-m-20', 'scroll-m-20', '-scroll-m-20', 'm-24', 'm-2',
    'p-4', 'p-40', '-p-4', 'flex', 'flex-1', 'inline-flex',
];

const suggest = (typed: string, existing = '') => {
    const value = existing ? `${existing} ${typed}` : typed;
    const parsed = parseInput(value, value.length);
    return getSuggestions(parsed, { classes: CLASSES, breakpoints: ['sm', 'md'], variants: [] }, 10)
        .map((suggestion) => suggestion.value);
};

describe('getSuggestions', () => {
    test('what was typed comes first, negatives after', () => {
        expect(suggest('m-20')[0]).toBe('m-20');
        expect(suggest('m-20')).toContain('-m-20');
    });

    test('a partial query still prefers what starts with it', () => {
        expect(suggest('m-2').slice(0, 3)).toEqual(['m-2', 'm-20', 'm-24']);
    });

    test('an exact match wins over longer classes that start the same', () => {
        expect(suggest('p-4')[0]).toBe('p-4');
        expect(suggest('flex')[0]).toBe('flex');
    });

    test('classes already in the string are not offered again', () => {
        expect(suggest('m-2', 'm-20')).not.toContain('m-20');
    });
});

/**
 * The list is redrawn on a debounce, and Enter/Tab/the arrows act on that
 * list — so a completion accepted in the same breath as the last keystroke
 * used to take the top match for the *previous* prefix. Typing `p-4` and
 * hitting Enter inserted `p-0`.
 */
describe('completing before the list has caught up', () => {
    const CLASS_DATA = { classes: ['p-0', 'p-1', 'p-40'], breakpoints: [], variants: [] };

    const mount = () => {
        document.body.innerHTML = '<div id="host"><textarea id="field"></textarea></div>';
        const input = document.getElementById('field') as HTMLTextAreaElement;
        const container = document.getElementById('host') as HTMLElement;
        const accepted: string[] = [];

        createTailwindAutocomplete({
            container,
            input,
            classData: CLASS_DATA,
            maxSuggestions: 12,
            debounceMs: 50,
            onChange: (value) => accepted.push(value),
        });

        input.focus();
        return { input, accepted };
    };

    const type = (input: HTMLTextAreaElement, text: string) => {
        input.value += text;
        input.selectionStart = input.selectionEnd = input.value.length;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const press = (input: HTMLTextAreaElement, key: string) => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };

    const dropdown = () =>
        document.querySelector<HTMLElement>('.winden-autocomplete-dropdown');

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    test.each(['Enter', 'Tab'])('%s completes what is in the field, not the keystroke before', (key) => {
        const { input, accepted } = mount();

        type(input, 'p-');
        vi.advanceTimersByTime(50); // the list settles on `p-`, top match `p-0`

        type(input, '4');
        press(input, key); // no time passes: the redraw for `p-4` is still queued

        expect(input.value.trim()).toBe('p-40');
        expect(accepted).toEqual(['p-40']);
    });

    test('the arrows step through the list for the current input', () => {
        const { input, accepted } = mount();

        type(input, 'p-');
        vi.advanceTimersByTime(50);

        type(input, '4');
        press(input, 'ArrowDown'); // only `p-40` matches, so this wraps onto it
        press(input, 'Enter');

        expect(accepted).toEqual(['p-40']);
    });

    test('an accepted class leaves room for the next one', () => {
        const { input, accepted } = mount();

        type(input, 'p-4');
        vi.advanceTimersByTime(50);
        press(input, 'Enter');

        // The caret sits past a real space, so the next class does not arrive
        // glued to this one.
        expect(input.value).toBe('p-40 ');
        expect(input.selectionStart).toBe('p-40 '.length);

        type(input, 'p-1');
        vi.advanceTimersByTime(50);
        press(input, 'Enter');

        expect(input.value.trim()).toBe('p-40 p-1');
        expect(accepted).toEqual(['p-40', 'p-40 p-1']);
    });

    test('a dismissed list stays dismissed', () => {
        const { input } = mount();

        type(input, 'p-');
        vi.advanceTimersByTime(50);
        press(input, 'Escape');

        expect(dropdown()?.style.display).toBe('none');

        vi.advanceTimersByTime(200); // a queued redraw would reopen it here

        expect(dropdown()?.style.display).toBe('none');
    });
});
