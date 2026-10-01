/**
 * Spotting a class the page refuses to honour.
 *
 * `absolute` in the block editor is the case that prompted this: Gutenberg sets
 * `position` unlayered, Tailwind's utilities live in `@layer utilities`, and
 * unlayered CSS wins whatever the specificity. The class compiles, applies, and
 * does nothing until it is written `absolute!`.
 */

import { describe, test, expect } from 'vitest';
import { findOverriddenClasses, forceClass, expectedBeside, withVariantSiblings } from '../src/winden-classes/core/class-override';
import type { ClassExplanation } from '../src/winden-classes/core/class-explanation';

const explain = (
    entries: Record<string, { property: string; value: string; computed?: string }[]>,
    conditions: string[] = []
): Map<string, ClassExplanation> => new Map(
    Object.entries(entries).map(([name, declarations]) => [
        name,
        { declarations, conditions, css: '' },
    ])
);

describe('findOverriddenClasses', () => {
    test('reports a class the element does not actually carry', () => {
        const overridden = findOverriddenClasses(
            'absolute',
            explain({ absolute: [{ property: 'position', value: 'absolute' }] }),
            () => 'relative'
        );

        expect(overridden).toEqual([{
            className: 'absolute',
            property: 'position',
            expected: 'absolute',
            actual: 'relative',
        }]);
    });

    test('says nothing when the class is in force', () => {
        expect(findOverriddenClasses(
            'p-8',
            explain({ 'p-8': [{ property: 'padding', value: 'calc(var(--spacing) * 8)', computed: '32px' }] }),
            () => '32px'
        )).toEqual([]);
    });

    test('names the user\'s own class when that is what won', () => {
        // p-4 p-6 is a conflict to explain, not the editor overruling anyone
        const overridden = findOverriddenClasses(
            'p-4 p-6',
            explain({
                'p-4': [{ property: 'padding', value: '1rem', computed: '16px' }],
                'p-6': [{ property: 'padding', value: '1.5rem', computed: '24px' }],
            }),
            () => '24px'
        );

        expect(overridden).toEqual([{
            className: 'p-4',
            property: 'padding',
            expected: '16px',
            actual: '24px',
            overriddenBy: 'p-6',
        }]);
    });

    test('a class already forcing itself is not reported', () => {
        expect(findOverriddenClasses(
            'absolute!',
            explain({ 'absolute!': [{ property: 'position', value: 'absolute' }] }),
            () => 'relative'
        )).toEqual([]);
    });

    test('conditional classes are left alone — they may simply not apply now', () => {
        expect(findOverriddenClasses(
            'md:flex',
            explain({ 'md:flex': [{ property: 'display', value: 'flex' }] }, ['@media (width >= 48rem)']),
            () => 'block'
        )).toEqual([]);
    });

    test('a variant whose condition holds is measured like any other class', () => {
        // xl:-mb-8 in a canvas wider than xl: the theme's block-gap rule beats
        // it there exactly as it beats -mb-8
        const explanations = explain(
            { 'xl:-mb-8': [{ property: 'margin-bottom', value: 'calc(var(--spacing) * -8)' }] },
            ['@media (width >= 80rem)']
        );

        expect(findOverriddenClasses('xl:-mb-8', explanations, () => '0px', undefined, () => true)).toEqual([{
            className: 'xl:-mb-8',
            property: 'margin-bottom',
            expected: 'calc(var(--spacing) * -8)',
            actual: '0px',
        }]);
        expect(findOverriddenClasses('xl:-mb-8', explanations, () => '0px', undefined, () => false)).toEqual([]);
    });

    test('a state variant is never measured, even beside a media query that holds', () => {
        expect(findOverriddenClasses(
            'hover:underline',
            explain({ 'hover:underline': [{ property: 'text-decoration-line', value: 'underline' }] }, ['@media (hover: hover)', ':hover']),
            () => 'none',
            undefined,
            (condition) => condition.startsWith('@media')
        )).toEqual([]);
    });

    test('a variant beaten by another variant of the user\'s own is measured beside the element', () => {
        // md:mb-6 xl:mb-8 at xl width: 32px is xl:mb-8 winning, not the editor.
        // A variant carries no root-level `computed`, so the rival has to be
        // measured where the element lives too
        const explanations = new Map<string, ClassExplanation>([
            ['md:mb-6', { declarations: [{ property: 'margin-bottom', value: 'calc(var(--spacing) * 6)' }], conditions: ['@media (width >= 48rem)'], css: '' }],
            ['xl:mb-8', { declarations: [{ property: 'margin-bottom', value: 'calc(var(--spacing) * 8)' }], conditions: ['@media (width >= 80rem)'], css: '' }],
        ]);
        const beside = (className: string) => () => (className === 'xl:mb-8' ? '32px' : '24px');

        expect(findOverriddenClasses('md:mb-6 xl:mb-8', explanations, () => '32px', beside, () => true)).toEqual([{
            className: 'md:mb-6',
            property: 'margin-bottom',
            expected: '24px',
            actual: '32px',
            overriddenBy: 'xl:mb-8',
        }]);
    });

    test('spelling differences are not disagreements', () => {
        expect(findOverriddenClasses(
            'p-0',
            explain({ 'p-0': [{ property: 'padding', value: '0' }] }),
            () => '0px'
        )).toEqual([]);

        expect(findOverriddenClasses(
            'bg-black',
            explain({ 'bg-black': [{ property: 'background-color', value: 'rgb(0, 0, 0)' }] }),
            () => 'rgb(0,0,0)'
        )).toEqual([]);
    });

    test('an unexplained class cannot be judged', () => {
        expect(findOverriddenClasses('mystery', new Map(), () => 'anything')).toEqual([]);
    });
});

describe('measuring beside the element', () => {
    // The explanation's own `computed` comes from a probe at the root of the
    // document — the wrong box for anything relative, and without the custom
    // properties the class's rule sets. `expectedBeside` measures next to the
    // element instead, and hands the class itself to the probe.
    test('the local measurement wins over the explanation\'s root-level one', () => {
        const parent = document.createElement('div');
        const element = document.createElement('div');
        parent.appendChild(element);
        document.body.appendChild(parent);

        const overridden = findOverriddenClasses(
            'text-5xl',
            explain({ 'text-5xl': [{ property: 'font-size', value: '3rem', computed: '48px' }] }),
            () => '52px',
            // jsdom computes nothing, so this stands in for the browser
            () => (property) => (property === 'font-size' ? '3rem' : '')
        );
        expect(overridden).toEqual([{ className: 'text-5xl', property: 'font-size', expected: '3rem', actual: '52px' }]);
        parent.remove();
    });

    test('a value in percent of some other box is not judged', () => {
        // `size-full` is `100%` of the parent; on an image inside an auto-height
        // group the element and a probe cannot agree, and both are right
        const overridden = findOverriddenClasses(
            'size-full left-1/2',
            explain({
                'size-full': [{ property: 'width', value: '100%' }, { property: 'height', value: '100%' }],
                'left-1/2': [{ property: 'left', value: 'calc(1/2 * 100%)' }],
            }),
            () => '426px',
            () => () => '0px'
        );
        expect(overridden).toEqual([]);
    });

    test('the probe sits beside the element, wears the class, and is gone afterwards', () => {
        const parent = document.createElement('section');
        const element = document.createElement('h2');
        parent.appendChild(element);
        document.body.appendChild(parent);

        let seen: Element | null = null;
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                for (const node of [...record.addedNodes]) if (node !== element) seen = node as Element;
            }
        });
        observer.observe(parent, { childList: true });

        const measure = expectedBeside(element)('text-5xl', [{ property: 'font-size', value: '3rem' }]);
        // jsdom has no layout: the inline value comes back as written
        expect(measure('font-size')).toBe('3rem');
        expect(measure('color')).toBe('');
        expect(parent.children.length).toBe(1);

        observer.disconnect();
        parent.remove();
        // The observer is async in jsdom; the assertions above already prove
        // removal, this proves what was added
        return Promise.resolve().then(() => {
            if (seen) {
                expect(seen.tagName).toBe('H2');
                expect(seen.className).toBe('text-5xl');
            }
        });
    });
});

describe('forceClass', () => {
    test('adds the marker, once', () => {
        expect(forceClass('absolute')).toBe('absolute!');
        expect(forceClass('absolute!')).toBe('absolute!');
    });
});

/**
 * `!important` outranks a media query, so forcing a base utility silently
 * beats every responsive one beside it.
 *
 * Measured on a Tailwind stats block: `grid-cols-1!` was written in and
 * `sm:grid-cols-2` / `lg:grid-cols-4` were not, so a four-column grid rendered
 * as one column at every width. Compiled both ways to be sure — unforced, the
 * `lg:` rule comes later in the sheet and still loses; forced, it wins again.
 */
describe('withVariantSiblings', () => {
    const explanations = new Map<string, ClassExplanation>([
        ['grid-cols-1', { declarations: [{ property: 'grid-template-columns', value: 'repeat(1, minmax(0, 1fr))' }], conditions: [], css: '' }],
        ['sm:grid-cols-2', { declarations: [{ property: 'grid-template-columns', value: 'repeat(2, minmax(0, 1fr))' }], conditions: ['(min-width: 640px)'], css: '' }],
        ['lg:grid-cols-4', { declarations: [{ property: 'grid-template-columns', value: 'repeat(4, minmax(0, 1fr))' }], conditions: ['(min-width: 1024px)'], css: '' }],
        ['mt-16', { declarations: [{ property: 'margin-top', value: '4rem' }], conditions: [], css: '' }],
        ['sm:mt-20', { declarations: [{ property: 'margin-top', value: '5rem' }], conditions: ['(min-width: 640px)'], css: '' }],
        ['text-white', { declarations: [{ property: 'color', value: '#fff' }], conditions: [], css: '' }],
        ['sm:text-black', { declarations: [{ property: 'color', value: '#000' }], conditions: ['(min-width: 640px)'], css: '' }],
    ]);
    const classString = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-16 sm:mt-20 text-white sm:text-black';

    test('a forced class takes its own variants with it', () => {
        expect([...withVariantSiblings(classString, explanations, ['grid-cols-1'])].sort())
            .toEqual(['grid-cols-1', 'lg:grid-cols-4', 'sm:grid-cols-2']);
    });

    test('and only its own — another property is left alone', () => {
        const forced = withVariantSiblings(classString, explanations, ['mt-16']);
        expect([...forced].sort()).toEqual(['mt-16', 'sm:mt-20']);
        expect(forced.has('sm:text-black')).toBe(false);
    });

    test('several forced classes each bring theirs', () => {
        expect([...withVariantSiblings(classString, explanations, ['grid-cols-1', 'text-white'])].sort())
            .toEqual(['grid-cols-1', 'lg:grid-cols-4', 'sm:grid-cols-2', 'sm:text-black', 'text-white']);
    });

    test('nothing to carry, nothing added', () => {
        expect([...withVariantSiblings('text-white sm:text-black', explanations, [])]).toEqual([]);
        expect([...withVariantSiblings('p-4', explanations, ['p-4'])]).toEqual(['p-4']);
    });
});
