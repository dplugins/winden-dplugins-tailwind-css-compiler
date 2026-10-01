/**
 * Component classes read back out of the user's CSS.
 *
 * Tailwind reports these as unknown — `getClassList()` lists utilities only —
 * so this is the only place that knows `card` exists.
 */

import { describe, test, expect } from 'vitest';
import { findComponentClasses, componentClassNames } from '../src/winden-classes/core/component-classes';

const STYLE_TAB = `
/* Tab: Main Style (@layer components) */
@layer components {
  .card {
    @apply rounded-lg shadow-md p-6;
  }

  .btn-primary {
    @apply bg-brand-500 text-white;
    letter-spacing: 0.02em;
  }
}
`;

describe('findComponentClasses', () => {
    test('reads the classes a components layer declares', () => {
        expect(componentClassNames(STYLE_TAB)).toEqual(['card', 'btn-primary']);
    });

    test('keeps what each one applies and sets', () => {
        const [card, button] = findComponentClasses(STYLE_TAB);
        expect(card.applies).toEqual(['rounded-lg', 'shadow-md', 'p-6']);
        expect(button.applies).toEqual(['bg-brand-500', 'text-white']);
        expect(button.declarations).toContain('letter-spacing: 0.02em');
    });

    test('ignores everything outside a components layer', () => {
        const css = `
            @layer utilities { .not-a-component { color: red } }
            @layer base { .also-not { color: red } }
            .bare-rule { color: red }
        `;
        expect(componentClassNames(css)).toEqual([]);
    });

    test('a layer list containing components counts', () => {
        expect(componentClassNames('@layer base, components { .shared { color: red } }'))
            .toEqual(['shared']);
    });

    test('nested rules belong to the class around them, not beside it', () => {
        const css = `@layer components {
            .card {
                @apply p-6;
                &:hover { @apply shadow-lg; }
                .title { @apply font-bold; }
            }
        }`;
        // `.title` is a descendant selector inside the rule, so it is found too,
        // but `card` must not be lost to the nesting
        expect(componentClassNames(css)).toContain('card');
    });

    test('a rule after a nested block is still seen', () => {
        const css = `@layer components {
            .first { &:hover { color: red } }
            .second { color: blue }
        }`;
        expect(componentClassNames(css)).toEqual(expect.arrayContaining(['first', 'second']));
    });

    test('several selectors on one rule each define a class', () => {
        expect(componentClassNames('@layer components { .a, .b { color: red } }'))
            .toEqual(['a', 'b']);
    });

    test('an escaped class name is read as one name', () => {
        expect(componentClassNames('@layer components { .card\\/2 { color: red } }'))
            .toEqual(['card']);
    });

    test('the same class declared twice appears once', () => {
        const css = `@layer components {
            .card { @apply p-6; }
            .card { @apply shadow-md; }
        }`;
        expect(componentClassNames(css)).toEqual(['card']);
        expect(findComponentClasses(css)[0].applies).toEqual(['p-6', 'shadow-md']);
    });

    test('empty input is not an error', () => {
        expect(componentClassNames('')).toEqual([]);
        expect(findComponentClasses('')).toEqual([]);
    });
});
